import mermaid from "mermaid";
import zenuml from "@mermaid-js/mermaid-zenuml";
import { DiagramOptions } from "../options";
import { sanitizeSvg } from "./svgSanitize";
import { rasterize } from "./rasterize";

export interface RenderResult {
  /** Word-safe SVG markup, or null when the diagram can only be inserted as PNG. */
  svg: string | null;
  /** PNG fallback, base64 without the data: prefix. */
  pngBase64: string;
  /** Natural size in CSS pixels (96 DPI). */
  width: number;
  height: number;
}

let setupDone: Promise<void> | null = null;
let queue: Promise<unknown> = Promise.resolve();
let renderCount = 0;

function setup(): Promise<void> {
  if (!setupDone) {
    setupDone = (async () => {
      await mermaid.registerExternalDiagrams([zenuml]);
      mermaid.registerIconPacks([
        { name: "logos", loader: () => import("@iconify-json/logos").then((m) => m.icons) },
      ]);
    })();
  }
  return setupDone;
}

function configure(options: DiagramOptions) {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: options.theme,
    // Plain SVG <text> labels instead of HTML in <foreignObject>, which Word can't display.
    htmlLabels: false,
  });
}

/** Host element where diagrams are laid out; must be in the DOM and not display:none. */
function getStage(): HTMLElement {
  let stage = document.getElementById("mermaid-stage");
  if (!stage) {
    stage = document.createElement("div");
    stage.id = "mermaid-stage";
    stage.setAttribute("aria-hidden", "true");
    stage.style.cssText = "position:absolute;left:-20000px;top:0;width:1200px;pointer-events:none;";
    document.body.appendChild(stage);
  }
  return stage;
}

/** Throws an Error with Mermaid's message if the source is invalid. */
export async function validate(source: string, options: DiagramOptions): Promise<void> {
  await setup();
  configure(options);
  await mermaid.parse(source);
}

async function renderNow(source: string, options: DiagramOptions): Promise<RenderResult> {
  await setup();
  configure(options);
  await mermaid.parse(source);

  const stage = getStage();
  const id = `mermaid-word-${++renderCount}`;
  const { svg } = await mermaid.render(id, source, stage);

  const host = document.createElement("div");
  stage.appendChild(host);
  try {
    host.innerHTML = svg;
    const svgEl = host.querySelector("svg");
    if (!svgEl) throw new Error("Mermaid did not return an SVG.");

    const sanitized = sanitizeSvg(svgEl, options.background);
    const pngBase64 = await rasterize(sanitized, options.scale, options.background);
    return {
      svg: options.pngOnly ? null : sanitized.markup,
      pngBase64,
      width: sanitized.width,
      height: sanitized.height,
    };
  } finally {
    host.remove();
  }
}

/** Renders Mermaid source. Calls are serialized because Mermaid keeps global state. */
export function renderDiagram(source: string, options: DiagramOptions): Promise<RenderResult> {
  const job = queue.then(() => renderNow(source, options));
  queue = job.catch(() => undefined);
  return job;
}

/** Renders for on-screen preview only (no sanitizing or rasterizing). */
export function renderPreview(source: string, options: DiagramOptions): Promise<string> {
  const job = queue.then(async () => {
    await setup();
    configure(options);
    await mermaid.parse(source);
    const { svg } = await mermaid.render(`mermaid-preview-${++renderCount}`, source, getStage());
    return svg;
  });
  queue = job.catch(() => undefined);
  return job;
}
