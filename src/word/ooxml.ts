// Builds a flat-OPC package (the format Word's insertOoxml expects) containing one picture.
// The picture uses a PNG blip with an SVG extension (Office 2016+ shows the SVG,
// older versions fall back to the PNG).

import { RenderResult } from "../render/mermaidRenderer";

export const DIAGRAM_TAG = "mermaid-diagram";
export const DIAGRAM_TITLE = "Mermaid diagram";

const EMU_PER_PX = 9525; // 914400 EMU per inch / 96 px per inch
const EMU_PER_INCH = 914400;

function escapeXml(text: string, attribute = false): string {
  let out = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    // Characters not allowed in XML 1.0.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, "");
  if (attribute) out = out.replace(/\r/g, "&#13;").replace(/\n/g, "&#10;").replace(/\t/g, "&#9;");
  return out;
}

function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export interface OoxmlOptions {
  altText: string;
  maxWidthIn: number;
  /** Wrap the paragraph in a block-level content control tagged as a Mermaid diagram. */
  wrapInContentControl: boolean;
}

export function pictureSizeEmu(result: RenderResult, maxWidthIn: number): { cx: number; cy: number } {
  let cx = result.width * EMU_PER_PX;
  let cy = result.height * EMU_PER_PX;
  const maxCx = maxWidthIn * EMU_PER_INCH;
  if (maxWidthIn > 0 && cx > maxCx) {
    cy = (cy * maxCx) / cx;
    cx = maxCx;
  }
  return { cx: Math.max(1, Math.round(cx)), cy: Math.max(1, Math.round(cy)) };
}

export function buildDiagramOoxml(result: RenderResult, options: OoxmlOptions): string {
  const { cx, cy } = pictureSizeEmu(result, options.maxWidthIn);
  const alt = escapeXml(options.altText, true);
  const hasSvg = !!result.svg;

  const svgExt = hasSvg
    ? `<a:extLst><a:ext uri="{96DAC541-7B7A-43D3-8B79-37D633B846F1}">` +
      `<asvg:svgBlip xmlns:asvg="http://schemas.microsoft.com/office/drawing/2016/SVG/main" r:embed="rIdSvg"/>` +
      `</a:ext></a:extLst>`
    : "";

  const run =
    `<w:r><w:drawing>` +
    `<wp:inline distT="0" distB="0" distL="0" distR="0">` +
    `<wp:extent cx="${cx}" cy="${cy}"/>` +
    `<wp:effectExtent l="0" t="0" r="0" b="0"/>` +
    `<wp:docPr id="1" name="${DIAGRAM_TITLE}" title="${DIAGRAM_TITLE}" descr="${alt}"/>` +
    `<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>` +
    `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:pic>` +
    `<pic:nvPicPr><pic:cNvPr id="0" name="mermaid.png" descr="${alt}"/><pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="rIdPng">${svgExt}</a:blip><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>` +
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
    `</pic:pic></a:graphicData></a:graphic>` +
    `</wp:inline></w:drawing></w:r>`;

  const paragraph = `<w:p>${run}</w:p>`;
  const body = options.wrapInContentControl
    ? `<w:sdt><w:sdtPr><w:alias w:val="${DIAGRAM_TITLE}"/><w:tag w:val="${DIAGRAM_TAG}"/></w:sdtPr>` +
      `<w:sdtContent>${paragraph}</w:sdtContent></w:sdt>`
    : paragraph;

  const svgRel = hasSvg
    ? `<Relationship Id="rIdSvg" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/mermaid.svg"/>`
    : "";
  const svgPart = hasSvg
    ? `<pkg:part pkg:name="/word/media/mermaid.svg" pkg:contentType="image/svg+xml" pkg:compression="store">` +
      `<pkg:binaryData>${utf8ToBase64(result.svg!)}</pkg:binaryData></pkg:part>`
    : "";

  return (
    `<pkg:package xmlns:pkg="http://schemas.microsoft.com/office/2006/xmlPackage">` +
    `<pkg:part pkg:name="/_rels/.rels" pkg:contentType="application/vnd.openxmlformats-package.relationships+xml" pkg:padding="512">` +
    `<pkg:xmlData><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
    `</Relationships></pkg:xmlData></pkg:part>` +
    `<pkg:part pkg:name="/word/_rels/document.xml.rels" pkg:contentType="application/vnd.openxmlformats-package.relationships+xml" pkg:padding="256">` +
    `<pkg:xmlData><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rIdPng" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/mermaid.png"/>` +
    svgRel +
    `</Relationships></pkg:xmlData></pkg:part>` +
    `<pkg:part pkg:name="/word/document.xml" pkg:contentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml">` +
    `<pkg:xmlData><w:document ` +
    `xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ` +
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ` +
    `xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ` +
    `xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ` +
    `xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<w:body>${body}</w:body></w:document></pkg:xmlData></pkg:part>` +
    `<pkg:part pkg:name="/word/media/mermaid.png" pkg:contentType="image/png" pkg:compression="store">` +
    `<pkg:binaryData>${result.pngBase64}</pkg:binaryData></pkg:part>` +
    svgPart +
    `</pkg:package>`
  );
}
