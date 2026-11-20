import { SanitizedSvg } from "./svgSanitize";

// Keep PNGs a reasonable size for very large diagrams. Browsers also refuse canvases with a
// side much over 16384 px (Chromium's hard limit is 32767), so cap each side too.
const MAX_PIXELS = 40_000_000;
const MAX_SIDE = 16384;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load the rendered SVG as an image."));
    img.src = url;
  });
}

/** Returns a PNG of the sanitized SVG, base64-encoded without the data: prefix. */
export async function rasterize(
  svg: SanitizedSvg,
  scale: number,
  background: "white" | "transparent"
): Promise<string> {
  const area = svg.width * svg.height;
  const s = Math.min(scale, Math.sqrt(MAX_PIXELS / area), MAX_SIDE / svg.width, MAX_SIDE / svg.height);

  const url = URL.createObjectURL(new Blob([svg.markup], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(svg.width * s));
    canvas.height = Math.max(1, Math.round(svg.height * s));
    const ctx = canvas.getContext("2d")!;
    if (background === "white") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/png");
    const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
    // An oversized or failed canvas gives "data:," rather than an error.
    if (!base64) throw new Error(`Could not create a ${canvas.width}×${canvas.height} PNG of the diagram.`);
    return base64;
  } finally {
    URL.revokeObjectURL(url);
  }
}
