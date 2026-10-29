// The Mermaid source and render options are stored in the picture's alt text:
//
//   %% mermaid-word {"v":1,"theme":"default",...,"src":"<base64 utf-8 source>"}
//   flowchart TD
//     A --> B
//
// `%%` lines are Mermaid comments, so the alt text stays readable and valid Mermaid.
// The base64 copy guards against hosts that mangle line breaks in alt text.

import { DEFAULT_OPTIONS, DiagramOptions } from "../options";

const MARKER = "%% mermaid-word ";

export interface DiagramData {
  source: string;
  options: DiagramOptions;
}

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function fromBase64(b64: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeAltText(source: string, options: DiagramOptions): string {
  const meta = { v: 1, ...options, src: toBase64(source) };
  return `${MARKER}${JSON.stringify(meta)}\n${source}`;
}

export function decodeAltText(altText: string | null | undefined): DiagramData | null {
  if (!altText) return null;
  const text = altText.replace(/\r\n?/g, "\n").replace(/^\s+/, "");
  if (!text.startsWith(MARKER.trim())) return null;

  const firstBreak = text.indexOf("\n");
  const header = firstBreak === -1 ? text : text.slice(0, firstBreak);
  const jsonStart = header.indexOf("{");
  const jsonEnd = header.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) return null;

  try {
    const meta = JSON.parse(header.slice(jsonStart, jsonEnd + 1));
    const source = meta.src ? fromBase64(meta.src) : firstBreak === -1 ? "" : text.slice(firstBreak + 1);
    const options: DiagramOptions = {
      theme: meta.theme ?? DEFAULT_OPTIONS.theme,
      scale: Number(meta.scale) || DEFAULT_OPTIONS.scale,
      maxWidthIn: Number(meta.maxWidthIn) || DEFAULT_OPTIONS.maxWidthIn,
      background: meta.background === "transparent" ? "transparent" : "white",
      pngOnly: !!meta.pngOnly,
    };
    return { source, options };
  } catch {
    return null;
  }
}
