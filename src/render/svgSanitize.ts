// Makes Mermaid's SVG output display correctly in Word.
//
// Mermaid styles diagrams with an id-scoped <style> block and CSS variables. Office's SVG
// renderer only partly supports CSS, so this module resolves every element's computed
// style into plain presentation attributes and then removes the stylesheet.

export interface SanitizedSvg {
  markup: string;
  width: number;
  height: number;
}

// Inherited properties and their initial values, as Chromium's computed style reports them.
const INHERITED: Record<string, string> = {
  fill: "rgb(0, 0, 0)",
  "fill-opacity": "1",
  "fill-rule": "nonzero",
  stroke: "none",
  "stroke-opacity": "1",
  "stroke-width": "1",
  "stroke-dasharray": "none",
  "stroke-dashoffset": "0",
  "stroke-linecap": "butt",
  "stroke-linejoin": "miter",
  "stroke-miterlimit": "4",
  "font-family": "",
  "font-size": "",
  "font-weight": "400",
  "font-style": "normal",
  "text-anchor": "start",
  "letter-spacing": "normal",
  "marker-start": "none",
  "marker-mid": "none",
  "marker-end": "none",
};

const NOT_INHERITED: Record<string, string> = {
  opacity: "1",
  display: "inline",
};

// Vertical shift, in em, that emulates each dominant-baseline value with the default
// alphabetic baseline (Office ignores dominant-baseline).
const BASELINE_SHIFT_EM: Record<string, number> = {
  central: 0.35,
  middle: 0.3,
  mathematical: 0.3,
  hanging: 0.75,
  "text-before-edge": 0.8,
  "before-edge": 0.8,
  "text-top": 0.8,
  "text-after-edge": -0.2,
  "after-edge": -0.2,
  ideographic: -0.2,
  "text-bottom": -0.2,
};

type AttrMap = Record<string, string>;

function parseColor(value: string): { color: string; alpha: number } | null {
  const m = value.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+%?))?\s*\)$/);
  if (!m) return null;
  const hex = [m[1], m[2], m[3]]
    .map((c) => Math.max(0, Math.min(255, Math.round(Number(c)))).toString(16).padStart(2, "0"))
    .join("");
  let alpha = 1;
  if (m[4] !== undefined) alpha = m[4].endsWith("%") ? Number(m[4].slice(0, -1)) / 100 : Number(m[4]);
  return { color: `#${hex}`, alpha };
}

function stripPx(value: string): string {
  return value.replace(/(-?[\d.]+)px/g, "$1");
}

function formatNumber(n: number): string {
  return String(Math.round(n * 1000) / 1000);
}

/** Converts computed style values into Word-friendly attribute values. */
function computeAttrs(style: CSSStyleDeclaration): AttrMap {
  const out: AttrMap = {};
  for (const prop of Object.keys(INHERITED)) out[prop] = style.getPropertyValue(prop).trim();
  for (const prop of Object.keys(NOT_INHERITED)) out[prop] = style.getPropertyValue(prop).trim();

  for (const [paint, opacityProp] of [
    ["fill", "fill-opacity"],
    ["stroke", "stroke-opacity"],
  ] as const) {
    const value = out[paint];
    if (value.startsWith("url(")) {
      out[paint] = value.replace(/url\(\s*["']?[^#"']*(#[^"')]+)["']?\s*\)/, "url($1)");
    } else if (value !== "none") {
      const parsed = parseColor(value);
      if (parsed) {
        if (parsed.alpha === 0) {
          out[paint] = "none";
        } else {
          out[paint] = parsed.color;
          out[opacityProp] = formatNumber(Number(out[opacityProp] || 1) * parsed.alpha);
        }
      }
    }
  }

  for (const marker of ["marker-start", "marker-mid", "marker-end"]) {
    out[marker] = out[marker].replace(/url\(\s*["']?[^#"']*(#[^"')]+)["']?\s*\)/, "url($1)");
  }
  for (const prop of ["stroke-width", "stroke-dashoffset", "font-size", "letter-spacing"]) {
    out[prop] = stripPx(out[prop]);
  }
  out["stroke-dasharray"] = stripPx(out["stroke-dasharray"]).replace(/,\s*/g, " ");
  if (out["font-weight"] === "normal") out["font-weight"] = "400";
  if (out["font-weight"] === "bold") out["font-weight"] = "700";
  if (out.display !== "none") out.display = "inline";
  return out;
}

const SKIP_TAGS = new Set(["style", "title", "desc", "metadata", "script"]);
const SVG_NS = "http://www.w3.org/2000/svg";

function isVisibleColor(value: string): boolean {
  const parsed = parseColor(value);
  return !!parsed && parsed.alpha > 0;
}

/**
 * Replaces HTML labels (<foreignObject>) with SVG <text>, keeping the line wrapping and
 * positions the browser laid out. Some diagram types ignore `htmlLabels: false`.
 */
function convertForeignObjects(svg: SVGSVGElement) {
  for (const fo of Array.from(svg.querySelectorAll("foreignObject"))) {
    const parent = fo.parentNode as SVGGraphicsElement;
    const ctm = parent.getScreenCTM?.();
    if (!ctm) {
      fo.remove();
      continue;
    }
    const toLocal = ctm.inverse();
    const point = (x: number, y: number) => new DOMPoint(x, y).matrixTransform(toLocal);
    const group = document.createElementNS(SVG_NS, "g");

    // Backgrounds of HTML elements (e.g. edge label boxes).
    for (const el of Array.from(fo.querySelectorAll<HTMLElement>("*"))) {
      const style = getComputedStyle(el);
      if (!isVisibleColor(style.backgroundColor)) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const p1 = point(r.left, r.top);
      const p2 = point(r.right, r.bottom);
      const rect = document.createElementNS(SVG_NS, "rect");
      rect.setAttribute("x", formatNumber(p1.x));
      rect.setAttribute("y", formatNumber(p1.y));
      rect.setAttribute("width", formatNumber(p2.x - p1.x));
      rect.setAttribute("height", formatNumber(p2.y - p1.y));
      rect.setAttribute("style", `fill:${style.backgroundColor};stroke:none;opacity:${style.opacity}`);
      group.appendChild(rect);
    }

    // Text, one <text> per laid-out line.
    const walker = document.createTreeWalker(fo, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
      const content = node.data;
      if (!content.trim() || !node.parentElement) continue;
      const style = getComputedStyle(node.parentElement);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const fontSize = parseFloat(style.fontSize) || 16;

      // Group words into lines by their vertical position.
      const lines: { text: string; left: number; top: number; bottom: number }[] = [];
      const range = document.createRange();
      const wordPattern = /\S+\s*/g;
      for (let m = wordPattern.exec(content); m; m = wordPattern.exec(content)) {
        range.setStart(node, m.index);
        range.setEnd(node, m.index + m[0].trimEnd().length);
        const rect = range.getBoundingClientRect();
        if (!rect.width && !rect.height) continue;
        const line = lines.find((l) => Math.abs(l.top - rect.top) < fontSize * 0.5);
        if (line) {
          line.text += (line.text && !/\s$/.test(line.text) ? " " : "") + m[0];
          line.left = Math.min(line.left, rect.left);
        } else {
          lines.push({ text: m[0], left: rect.left, top: rect.top, bottom: rect.bottom });
        }
      }

      for (const line of lines) {
        const p = point(line.left, (line.top + line.bottom) / 2);
        const text = document.createElementNS(SVG_NS, "text");
        text.setAttribute("x", formatNumber(p.x));
        text.setAttribute("y", formatNumber(p.y + fontSize * 0.35));
        text.setAttribute(
          "style",
          [
            `fill:${style.color}`,
            "stroke:none",
            `font-family:${style.fontFamily}`,
            `font-size:${style.fontSize}`,
            `font-weight:${style.fontWeight}`,
            `font-style:${style.fontStyle}`,
            "text-anchor:start",
            "dominant-baseline:auto",
          ].join(";")
        );
        text.textContent = line.text.trimEnd();
        group.appendChild(text);
      }
    }

    // Positions were mapped into the parent's coordinate space, so the group needs no transform.
    fo.replaceWith(group);
  }
}

export function sanitizeSvg(svg: SVGSVGElement, background: "white" | "transparent"): SanitizedSvg {
  // Size from the viewBox (Mermaid always sets one); fall back to the bounding box.
  let { x, y, width, height } = svg.viewBox.baseVal ?? { x: 0, y: 0, width: 0, height: 0 };
  if (!width || !height) {
    const box = svg.getBBox();
    ({ x, y, width, height } = box);
    svg.setAttribute("viewBox", `${x} ${y} ${width} ${height}`);
  }

  convertForeignObjects(svg);

  // Pass 1: read every element's computed style while the stylesheet is still active.
  const elements = [svg, ...Array.from(svg.querySelectorAll<SVGElement>("*"))].filter(
    (el) => !SKIP_TAGS.has(el.localName)
  );
  const computed = new Map<Element, AttrMap>();
  const baselineShift = new Map<SVGTextElement, number>();
  for (const el of elements) {
    const style = getComputedStyle(el);
    computed.set(el, computeAttrs(style));
    if (el.localName === "text") {
      let baseline = style.getPropertyValue("dominant-baseline").trim();
      if (!baseline || baseline === "auto") baseline = style.getPropertyValue("alignment-baseline").trim();
      const shift = BASELINE_SHIFT_EM[baseline];
      if (shift) baselineShift.set(el as SVGTextElement, shift * parseFloat(style.fontSize || "16"));
    }
  }

  // Pass 2: drop the stylesheet and write the resolved values as attributes.
  svg.querySelectorAll("style").forEach((s) => s.remove());
  for (const el of elements) {
    const attrs = computed.get(el)!;
    const parentAttrs = el === svg ? undefined : computed.get(el.parentElement as Element);
    el.removeAttribute("style");

    for (const [prop, initial] of Object.entries(INHERITED)) {
      const value = attrs[prop];
      const reference = parentAttrs ? parentAttrs[prop] : initial;
      if (value && value !== reference) el.setAttribute(prop, value);
      else el.removeAttribute(prop);
    }
    for (const [prop, initial] of Object.entries(NOT_INHERITED)) {
      const value = attrs[prop];
      if (value && value !== initial) el.setAttribute(prop, value);
      else el.removeAttribute(prop);
    }
    el.removeAttribute("dominant-baseline");
    el.removeAttribute("alignment-baseline");
  }
  // Office drops any element that references an SVG filter (Mermaid uses them for shadows).
  svg.querySelectorAll("[filter]").forEach((el) => el.removeAttribute("filter"));
  svg.querySelectorAll("filter").forEach((el) => el.remove());

  // Browsers collapse line breaks inside <text> to spaces; Office removes them instead.
  svg.querySelectorAll("text").forEach((t) => {
    const walker = document.createTreeWalker(t, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const node = n as Text;
      if (/[\r\n\t]/.test(node.data)) node.data = node.data.replace(/\s*[\r\n\t]+\s*/g, " ");
    }
  });

  for (const [text, shift] of baselineShift) {
    const existing = text.getAttribute("transform");
    const translate = `translate(0 ${formatNumber(shift)})`;
    text.setAttribute("transform", existing ? `${existing} ${translate}` : translate);
  }
  svg.querySelectorAll("tspan").forEach((t) => {
    t.removeAttribute("dominant-baseline");
    t.removeAttribute("alignment-baseline");
  });

  if (background === "white") {
    const rect = document.createElementNS(SVG_NS, "rect");
    rect.setAttribute("x", formatNumber(x));
    rect.setAttribute("y", formatNumber(y));
    rect.setAttribute("width", formatNumber(width));
    rect.setAttribute("height", formatNumber(height));
    rect.setAttribute("fill", "#ffffff");
    rect.setAttribute("stroke", "none");
    svg.insertBefore(rect, svg.firstChild);
  }

  const w = Math.ceil(width);
  const h = Math.ceil(height);
  svg.removeAttribute("style");
  svg.setAttribute("width", String(w));
  svg.setAttribute("height", String(h));
  svg.setAttribute("xmlns", SVG_NS);

  return { markup: new XMLSerializer().serializeToString(svg), width: w, height: h };
}
