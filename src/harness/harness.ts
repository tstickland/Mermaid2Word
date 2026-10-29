// Test harness (not shipped): renders every template through the same pipeline the add-in uses.
// Driven by scripts/render-all.mjs.
import { DEFAULT_OPTIONS, DiagramOptions } from "../options";
import { renderDiagram, renderPreview } from "../render/mermaidRenderer";
import { TEMPLATES } from "../templates";
import { buildDiagramOoxml } from "../word/ooxml";
import { decodeAltText, encodeAltText } from "../word/sourceMeta";
import { findCodeBlocks } from "../word/diagrams";

interface HarnessResult {
  id: string;
  name: string;
  ok: boolean;
  error?: string;
  svg?: string | null;
  png?: string;
  ooxml?: string;
  ooxmlInner?: string;
  altText?: string;
  width?: number;
  height?: number;
  foreignObject?: boolean;
  styleBlock?: boolean;
}

async function renderAll(overrides: Partial<DiagramOptions> = {}): Promise<HarnessResult[]> {
  const options = { ...DEFAULT_OPTIONS, ...overrides };
  const results: HarnessResult[] = [];
  for (const t of TEMPLATES) {
    try {
      const r = await renderDiagram(t.source, options);
      results.push({
        id: t.id,
        name: t.name,
        ok: true,
        svg: r.svg,
        png: r.pngBase64,
        width: r.width,
        height: r.height,
        foreignObject: !!r.svg && r.svg.includes("<foreignObject"),
        styleBlock: !!r.svg && r.svg.includes("<style"),
        altText: encodeAltText(t.source, options),
        ooxml: buildDiagramOoxml(r, {
          altText: encodeAltText(t.source, options),
          maxWidthIn: options.maxWidthIn,
          wrapInContentControl: true,
        }),
        ooxmlInner: buildDiagramOoxml(r, {
          altText: encodeAltText(t.source, options),
          maxWidthIn: options.maxWidthIn,
          wrapInContentControl: false,
        }),
      });
    } catch (err) {
      results.push({ id: t.id, name: t.name, ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return results;
}

function selfTest(): string[] {
  const failures: string[] = [];
  const check = (cond: boolean, msg: string) => cond || failures.push(msg);

  // Alt text round trip, including unicode and line breaks mangled by the host.
  const src = 'flowchart TD\n  A["Ünïcødé ✓"] --> B\n  B --> C';
  const opts = { ...DEFAULT_OPTIONS, theme: "dark" as const, scale: 3 };
  const alt = encodeAltText(src, opts);
  const decoded = decodeAltText(alt);
  check(decoded?.source === src, "alt text round trip: source");
  check(decoded?.options.theme === "dark" && decoded?.options.scale === 3, "alt text round trip: options");
  check(decodeAltText(alt.replace(/\n/g, "\r"))?.source === src, "alt text with CR line breaks");
  check(decodeAltText("Some picture") === null, "non-mermaid alt text is ignored");

  // Code block detection.
  const paras = [
    "Intro text",
    "```mermaid",
    "flowchart LR",
    "  A ––> B[“Hi”]",
    "```",
    "Middle",
    "~~~mermaid\u000Bpie\u000B  \"A\": 1\u000B~~~",
    "```mermaid",
    "unterminated",
  ];
  const blocks = findCodeBlocks(paras);
  check(blocks.length === 2, `code blocks: expected 2, got ${blocks.length}`);
  check(blocks[0]?.startPara === 1 && blocks[0]?.endPara === 4, "code block 1 range");
  check(blocks[0]?.source === 'flowchart LR\n  A ----> B["Hi"]', `code block 1 source: ${JSON.stringify(blocks[0]?.source)}`);
  check(blocks[1]?.startPara === 6 && blocks[1]?.endPara === 6, "code block 2 (soft breaks) range");
  check(blocks[1]?.source === 'pie\n  "A": 1', "code block 2 source");
  return failures;
}

async function renderRaw(id: string, overrides: Partial<DiagramOptions> = {}): Promise<string> {
  const t = TEMPLATES.find((x) => x.id === id)!;
  return renderPreview(t.source, { ...DEFAULT_OPTIONS, ...overrides });
}

Object.assign(window, { __renderAll: renderAll, __renderRaw: renderRaw, __selfTest: selfTest, __ready: true });
