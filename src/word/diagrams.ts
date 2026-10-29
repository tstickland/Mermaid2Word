/* global Word */
import { DiagramOptions } from "../options";
import { renderDiagram } from "../render/mermaidRenderer";
import { buildDiagramOoxml, DIAGRAM_TAG } from "./ooxml";
import { DiagramData, decodeAltText, encodeAltText } from "./sourceMeta";

export interface BatchResult {
  converted: number;
  failures: { label: string; error: string }[];
}

async function renderOoxml(source: string, options: DiagramOptions, wrapInContentControl: boolean) {
  const result = await renderDiagram(source, options);
  return buildDiagramOoxml(result, {
    altText: encodeAltText(source, options),
    maxWidthIn: options.maxWidthIn,
    wrapInContentControl,
  });
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Inserts a new diagram at the cursor (or replaces the selected text). */
export async function insertDiagram(source: string, options: DiagramOptions): Promise<void> {
  const ooxml = await renderOoxml(source, options, true);
  await Word.run(async (context) => {
    const selection = context.document.getSelection();
    selection.load("text");
    const parent = selection.parentContentControlOrNullObject;
    parent.load("tag");
    const paragraph = selection.paragraphs.getFirst();
    paragraph.load("text");
    await context.sync();

    let target: Word.Range;
    if (!parent.isNullObject && parent.tag === DIAGRAM_TAG) {
      // Don't nest a diagram inside another diagram: add it on a new line after.
      target = parent.getRange("Whole").paragraphs.getLast().insertParagraph("", "After").getRange();
    } else if (!selection.text && paragraph.text.trim()) {
      // Cursor inside a paragraph of text: put the diagram on its own line below it.
      target = paragraph.insertParagraph("", "After").getRange();
    } else {
      target = selection;
    }
    target.insertOoxml(ooxml, "Replace");
    await context.sync();
  });
}

/** Finds the Mermaid picture in the current selection, if any. */
async function findSelectedPicture(context: Word.RequestContext) {
  const selection = context.document.getSelection();
  const parent = selection.parentContentControlOrNullObject;
  parent.load("tag");
  const selectedPictures = selection.inlinePictures;
  selectedPictures.load("items/altTextDescription");
  await context.sync();

  let picture: Word.InlinePicture | null = null;
  if (!parent.isNullObject && parent.tag === DIAGRAM_TAG) {
    const first = parent.inlinePictures.getFirstOrNullObject();
    first.load("altTextDescription");
    await context.sync();
    if (!first.isNullObject) picture = first;
  }
  if (!picture) {
    picture = selectedPictures.items.find((p) => decodeAltText(p.altTextDescription)) ?? null;
  }
  if (!picture) return null;

  const data = decodeAltText(picture.altTextDescription);
  return data ? { picture, data } : null;
}

/** Returns the source and options of the selected diagram, or null. */
export async function getSelectedDiagram(): Promise<DiagramData | null> {
  return Word.run(async (context) => (await findSelectedPicture(context))?.data ?? null);
}

/** Re-renders the selected diagram with new source and options. Returns false if none is selected. */
export async function updateSelectedDiagram(source: string, options: DiagramOptions): Promise<boolean> {
  const ooxml = await renderOoxml(source, options, false);
  return Word.run(async (context) => {
    const found = await findSelectedPicture(context);
    if (!found) return false;
    found.picture.getRange("Whole").insertOoxml(ooxml, "Replace");
    await context.sync();
    return true;
  });
}

/** Re-renders every Mermaid diagram in the document with the given options. */
export async function refreshAllDiagrams(options: DiagramOptions): Promise<BatchResult> {
  return Word.run(async (context) => {
    const pictures = context.document.body.inlinePictures;
    pictures.load("items/altTextDescription");
    await context.sync();

    const result: BatchResult = { converted: 0, failures: [] };
    const diagrams = pictures.items
      .map((picture) => ({ picture, data: decodeAltText(picture.altTextDescription) }))
      .filter((d): d is { picture: Word.InlinePicture; data: DiagramData } => d.data !== null);

    for (let i = diagrams.length - 1; i >= 0; i--) {
      const { picture, data } = diagrams[i];
      try {
        const ooxml = await renderOoxml(data.source, options, false);
        picture.getRange("Whole").insertOoxml(ooxml, "Replace");
        await context.sync();
        result.converted++;
      } catch (err) {
        result.failures.push({ label: `Diagram ${i + 1}`, error: errorMessage(err) });
      }
    }
    return result;
  });
}

// Word's AutoFormat replaces characters that Mermaid needs.
function normalizeTypedText(line: string): string {
  return line
    .replace(/ /g, " ")
    .replace(/[“”„‟]/g, '"')
    .replace(/[‘’‚‛]/g, "'")
    .replace(/—/g, "---")
    .replace(/–/g, "--")
    .replace(/…/g, "...");
}

const OPEN_FENCE = /^\s*(```|~~~)\s*mermaid\s*$/i;
const CLOSE_FENCE = /^\s*(```|~~~)\s*$/;

interface CodeBlock {
  startPara: number;
  endPara: number;
  source: string;
}

/** Finds ```mermaid fenced blocks. Lines may be separate paragraphs or soft line breaks. */
export function findCodeBlocks(paragraphTexts: string[]): CodeBlock[] {
  const lines: { text: string; para: number; first: boolean; last: boolean }[] = [];
  paragraphTexts.forEach((text, para) => {
    const parts = text.split(/\r\n|\r|\n|\u000B/);
    parts.forEach((part, i) =>
      lines.push({ text: normalizeTypedText(part), para, first: i === 0, last: i === parts.length - 1 })
    );
  });

  const blocks: CodeBlock[] = [];
  for (let i = 0; i < lines.length; i++) {
    const open = lines[i].text.match(OPEN_FENCE);
    if (!open || !lines[i].first) continue;
    for (let j = i + 1; j < lines.length; j++) {
      const close = lines[j].text.match(CLOSE_FENCE);
      if (close && close[1] === open[1]) {
        if (lines[j].last) {
          blocks.push({
            startPara: lines[i].para,
            endPara: lines[j].para,
            source: lines
              .slice(i + 1, j)
              .map((l) => l.text)
              .join("\n"),
          });
        }
        i = j;
        break;
      }
    }
  }
  return blocks;
}

/** Replaces each ```mermaid fenced block in the document with its rendered diagram. */
export async function convertCodeBlocks(options: DiagramOptions): Promise<BatchResult> {
  return Word.run(async (context) => {
    const paragraphs = context.document.body.paragraphs;
    paragraphs.load("items/text");
    await context.sync();

    const blocks = findCodeBlocks(paragraphs.items.map((p) => p.text));
    const result: BatchResult = { converted: 0, failures: [] };

    // Work from the end so earlier paragraph references stay valid.
    for (let b = blocks.length - 1; b >= 0; b--) {
      const block = blocks[b];
      try {
        const ooxml = await renderOoxml(block.source, options, true);
        const range = paragraphs.items[block.startPara]
          .getRange("Whole")
          .expandTo(paragraphs.items[block.endPara].getRange("Whole"));
        range.insertOoxml(ooxml, "Replace");
        await context.sync();
        result.converted++;
      } catch (err) {
        const firstLine = block.source.split("\n").find((l) => l.trim()) ?? "(empty)";
        result.failures.push({ label: `Block ${b + 1}: ${firstLine.trim()}`, error: errorMessage(err) });
      }
    }
    result.failures.reverse();
    return result;
  });
}
