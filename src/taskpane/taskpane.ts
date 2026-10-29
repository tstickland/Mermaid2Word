/* global Office */
import { DEFAULT_OPTIONS, DiagramOptions, MermaidTheme } from "../options";
import { renderPreview } from "../render/mermaidRenderer";
import { TEMPLATES } from "../templates";
import {
  BatchResult,
  convertCodeBlocks,
  getSelectedDiagram,
  insertDiagram,
  refreshAllDiagrams,
  updateSelectedDiagram,
} from "../word/diagrams";

const STORAGE_KEY = "mermaid-word-state";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const ui = {
  template: $<HTMLSelectElement>("template"),
  source: $<HTMLTextAreaElement>("source"),
  error: $<HTMLDivElement>("error"),
  preview: $<HTMLDivElement>("preview"),
  theme: $<HTMLSelectElement>("theme"),
  background: $<HTMLSelectElement>("background"),
  maxWidth: $<HTMLInputElement>("maxWidth"),
  scale: $<HTMLSelectElement>("scale"),
  pngOnly: $<HTMLInputElement>("pngOnly"),
  insert: $<HTMLButtonElement>("insert"),
  update: $<HTMLButtonElement>("update"),
  load: $<HTMLButtonElement>("load"),
  convert: $<HTMLButtonElement>("convert"),
  refresh: $<HTMLButtonElement>("refresh"),
  status: $<HTMLDivElement>("status"),
};

function readOptions(): DiagramOptions {
  const maxWidth = parseFloat(ui.maxWidth.value);
  return {
    theme: ui.theme.value as MermaidTheme,
    background: ui.background.value === "transparent" ? "transparent" : "white",
    maxWidthIn: maxWidth > 0 ? maxWidth : DEFAULT_OPTIONS.maxWidthIn,
    scale: Number(ui.scale.value) || DEFAULT_OPTIONS.scale,
    pngOnly: ui.pngOnly.checked,
  };
}

function writeOptions(options: DiagramOptions) {
  ui.theme.value = options.theme;
  ui.background.value = options.background;
  ui.maxWidth.value = String(options.maxWidthIn);
  ui.scale.value = String(options.scale);
  ui.pngOnly.checked = options.pngOnly;
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ source: ui.source.value, options: readOptions() }));
  } catch {
    // Storage can be unavailable in some hosts; persistence is optional.
  }
}

function loadState() {
  let source = TEMPLATES[0].source;
  let options = DEFAULT_OPTIONS;
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (saved?.source) source = saved.source;
    if (saved?.options) options = { ...DEFAULT_OPTIONS, ...saved.options };
  } catch {
    // Ignore corrupt or unavailable storage.
  }
  ui.source.value = source;
  writeOptions(options);
}

function setStatus(message: string, isError = false) {
  ui.status.textContent = message;
  ui.status.classList.toggle("error-text", isError);
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err && "message" in err) return String((err as { message: unknown }).message);
  return String(err);
}

function describeBatch(result: BatchResult, verb: string): string {
  const lines = [`${verb} ${result.converted} diagram${result.converted === 1 ? "" : "s"}.`];
  for (const f of result.failures) lines.push(`✗ ${f.label}: ${f.error.split("\n")[0]}`);
  return lines.join("\n");
}

// ---- Preview -------------------------------------------------------------

let previewTimer: number | undefined;
let previewToken = 0;

function schedulePreview() {
  window.clearTimeout(previewTimer);
  previewTimer = window.setTimeout(updatePreview, 300);
}

async function updatePreview() {
  const token = ++previewToken;
  const source = ui.source.value;
  if (!source.trim()) {
    ui.error.hidden = true;
    ui.preview.innerHTML = '<div class="placeholder">Type Mermaid code above to see a preview.</div>';
    return;
  }
  try {
    const options = readOptions();
    const svg = await renderPreview(source, options);
    if (token !== previewToken) return;
    ui.preview.innerHTML = svg;
    ui.preview.classList.toggle("dark-theme", options.theme === "dark" && options.background === "transparent");
    ui.error.hidden = true;
  } catch (err) {
    if (token !== previewToken) return;
    ui.error.textContent = errorMessage(err);
    ui.error.hidden = false;
  }
}

// ---- Actions -------------------------------------------------------------

async function runAction(button: HTMLButtonElement, busyText: string, action: () => Promise<string | void>) {
  const buttons = [ui.insert, ui.update, ui.load, ui.convert, ui.refresh];
  const previousDisabled = buttons.map((b) => b.disabled);
  buttons.forEach((b) => (b.disabled = true));
  setStatus(busyText);
  try {
    const message = await action();
    setStatus(message ?? "");
  } catch (err) {
    setStatus(errorMessage(err), true);
  } finally {
    buttons.forEach((b, i) => (b.disabled = previousDisabled[i]));
    if (button === ui.load || button === ui.insert || button === ui.update) void checkSelection();
  }
}

let selectionTimer: number | undefined;

async function checkSelection() {
  try {
    const data = await getSelectedDiagram();
    ui.update.disabled = !data;
    ui.update.title = data ? "Re-render the selected diagram with the code above" : "Select a Mermaid diagram first";
  } catch {
    ui.update.disabled = true;
  }
}

function wireEvents() {
  for (const t of TEMPLATES) {
    const option = document.createElement("option");
    option.value = t.id;
    option.textContent = t.name;
    ui.template.appendChild(option);
  }

  ui.template.addEventListener("change", () => {
    const template = TEMPLATES.find((t) => t.id === ui.template.value);
    if (!template) return;
    ui.source.value = template.source;
    ui.template.value = "";
    saveState();
    schedulePreview();
  });

  ui.source.addEventListener("input", () => {
    saveState();
    schedulePreview();
  });

  ui.source.addEventListener("keydown", (e) => {
    if (e.key !== "Tab" || e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;
    e.preventDefault();
    const { selectionStart: start, selectionEnd: end, value } = ui.source;
    ui.source.value = value.slice(0, start) + "    " + value.slice(end);
    ui.source.selectionStart = ui.source.selectionEnd = start + 4;
    ui.source.dispatchEvent(new Event("input"));
  });

  for (const el of [ui.theme, ui.background, ui.maxWidth, ui.scale, ui.pngOnly]) {
    el.addEventListener("change", () => {
      saveState();
      schedulePreview();
    });
  }

  ui.insert.addEventListener("click", () =>
    runAction(ui.insert, "Rendering…", async () => {
      await insertDiagram(ui.source.value, readOptions());
      return "Diagram inserted.";
    })
  );

  ui.update.addEventListener("click", () =>
    runAction(ui.update, "Updating…", async () => {
      const updated = await updateSelectedDiagram(ui.source.value, readOptions());
      return updated ? "Diagram updated." : "Select a Mermaid diagram in the document first.";
    })
  );

  ui.load.addEventListener("click", () =>
    runAction(ui.load, "Reading selection…", async () => {
      const data = await getSelectedDiagram();
      if (!data) return "No Mermaid diagram is selected. Click a diagram inserted by this add-in.";
      ui.source.value = data.source;
      writeOptions(data.options);
      saveState();
      schedulePreview();
      return "Loaded the selected diagram. Edit it, then click Update selected.";
    })
  );

  ui.convert.addEventListener("click", () =>
    runAction(ui.convert, "Converting code blocks…", async () => {
      const result = await convertCodeBlocks(readOptions());
      if (!result.converted && !result.failures.length) {
        return "No ```mermaid blocks found. Put ```mermaid on its own line, the code below it, then ``` on its own line.";
      }
      return describeBatch(result, "Converted");
    })
  );

  ui.refresh.addEventListener("click", () =>
    runAction(ui.refresh, "Re-rendering all diagrams…", async () => {
      const result = await refreshAllDiagrams(readOptions());
      if (!result.converted && !result.failures.length) return "No Mermaid diagrams found in the document.";
      return describeBatch(result, "Re-rendered") + "\n(Current options were applied to every diagram.)";
    })
  );

  Office.context.document.addHandlerAsync(Office.EventType.DocumentSelectionChanged, () => {
    window.clearTimeout(selectionTimer);
    selectionTimer = window.setTimeout(checkSelection, 250);
  });
}

Office.onReady((info) => {
  if (info.host !== Office.HostType.Word) {
    setStatus("This add-in only works in Microsoft Word.", true);
    return;
  }
  if (!Office.context.requirements.isSetSupported("WordApi", "1.3")) {
    setStatus("This version of Word is too old for this add-in (WordApi 1.3 is required).", true);
    return;
  }
  loadState();
  wireEvents();
  void updatePreview();
  void checkSelection();
});
