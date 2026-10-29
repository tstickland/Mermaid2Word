# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Office.js task-pane add-in for Word that renders Mermaid (pinned `mermaid@12.2.0`) and inserts diagrams as SVG pictures with a PNG fallback. See README.md for user-facing setup and hosting.

## Commands

- `npm start` / `npm stop`: dev server on https://localhost:3000 plus sideload into Word desktop. The first run installs a localhost dev certificate, which prompts the user.
- `ADDIN_BASE_URL=https://host/path/ npm run build`: production `dist/`. Webpack rewrites `manifest.xml` for production: localhost URLs and the `AppDomain` origin become the hosted URL, the add-in `<Id>` becomes `PROD_ID`, and " (Dev)" is dropped from labels. It also fills the `__ADDIN_BASE_URL__`/`__ADDIN_ID__` placeholders in `install/` (the teammate install page and scripts). Validate with `npx office-addin-manifest validate dist/manifest.xml`. Pushing to `main` does this automatically and publishes to https://tstickland.github.io/Mermaid2Word/ (`.github/workflows/deploy-pages.yml`).
- `npm run validate`: validates the dev manifest.
- `npx tsc --noEmit -p .`: type-check.
- `npm run test:render`: builds the `--env harness` bundle into `test-build/`. It then renders every entry in `src/templates.ts` in headless **Edge** by default. `BROWSER=chrome` or `BROWSER=firefox` uses Playwright's own builds (the engines behind Word on the web), installed with `npx playwright install chromium firefox`; their output goes to `test-output/<browser>/`. and writes SVG/PNG/OOXML/alt text to `test-output/`. It also runs `__selfTest()` (alt-text round trip, code-block detection). `RAW=id1,id2` also saves Mermaid's unsanitized output as `raw-<id>.svg` for comparison. No single-test runner exists; to test one diagram, temporarily trim `TEMPLATES` or add a template.
- `npm run test:word` (Windows + Word installed): `scripts/word-com-test.ps1` inserts each `test-output/*.ooxml.xml` into a hidden Word instance via COM `Range.InsertXML`, the same import path as Office.js `insertOoxml`. It saves `all-diagrams.docx`/`.pdf` and tests in-place replace; then `check-alt-text.mjs` verifies alt text survived. Run `test:render` first.

## Architecture

Render pipeline: `mermaidRenderer.ts` → `svgSanitize.ts` → `rasterize.ts` → `word/ooxml.ts` → `word/diagrams.ts`. The task pane (`taskpane.ts`) only wires UI to `word/diagrams.ts`.

- **Rendering happens in an off-screen stage div**, `#mermaid-stage`. It must stay laid out: do **not** use `visibility:hidden` or `display:none`, because the sanitizer measures text with `getBoundingClientRect` and skips hidden text. Mermaid calls are serialized through a promise queue because Mermaid holds global config.
- **`svgSanitize.ts` exists because Office's SVG renderer is limited.** Each step works around something Word does:
  - CSS is only partly supported, so each element's computed style is written as presentation attributes (only where it differs from the parent) and `<style>` is removed.
  - `<foreignObject>` is not rendered, so HTML labels are converted to `<text>` per laid-out line. Swimlanes, Journey and Event Modeling ignore `htmlLabels: false`.
  - `dominant-baseline` is ignored, so it is emulated with a `translate`.
  - Any element with a `filter` attribute is **dropped entirely**, so filters are removed. Mermaid's "neo" drop shadows made sequence actor boxes vanish.
  - Newlines inside `<text>` are deleted rather than collapsed to spaces, so they are normalized.

  When a diagram looks wrong in Word but right in a browser, the cause is usually here. Check Word's actual rendering via `test:word`'s PDF.
- **Source of truth for editing is the picture's alt text** (`word/sourceMeta.ts`). The first line is `%% mermaid-word {json options + base64 "src"}`, followed by the raw source. The base64 copy guards against hosts mangling line breaks. Decoding works on any picture, wrapped or not, so diagrams pasted between documents remain editable.
- **OOXML shape** (`word/ooxml.ts`): a flat-OPC package with a PNG `a:blip` plus the `asvg:svgBlip` extension. New inserts are wrapped in a content control tagged `mermaid-diagram`. Updates replace only the picture's range with an **unwrapped** package, so the existing control is reused rather than nested. insertOoxml merges a single-paragraph package into the target paragraph, which is why `insertDiagram` first creates an empty paragraph when the cursor is inside text.
- `convertCodeBlocks` normalizes Word AutoFormat characters (smart quotes, en/em dashes, ellipsis, NBSP) before rendering. Fences must open at the start of a paragraph and close at the end of one; lines may be separate paragraphs or soft breaks.
- ZenUML is registered via `registerExternalDiagrams`. The `logos` icon pack (large JSON) is bundled and lazy-loaded.
- Other Iconify sets (`iconPacks.ts`): before each render, the source is scanned for `(prefix:name)` (Architecture) and `icon: "prefix:name"` (flowchart shapes). Only those icons are fetched from the Iconify API (with mirror hosts and an 8 s timeout). They are merged into a per-prefix cache and registered with `registerIconPacks({icons})`, which overwrites Mermaid's own cached copy of that set. Icons the API reports missing are not re-requested. Network failures are ignored (Mermaid draws "?") and retried on the next render. `test:render` therefore needs internet for the `architecture-icons` template.

## Gotchas

- Team distribution is by per-user sideload, because there is no M365 admin access. The Windows installer writes `HKCU\Software\Microsoft\Office\16.0\Wef\Developer\<PROD_ID>` = manifest path, the same mechanism `npm start` uses. The Mac installer copies the manifest into Word's `wef` folder. Changing `PROD_ID` would orphan existing installs.
- `typescript` is pinned to 5.x: ts-loader cannot use TypeScript 7 (it has no JS compiler API).
- The task pane stylesheet is copied as a static file (`taskpane.css`) and linked from `taskpane.html`, not imported.
- Word automation on this machine: exported PDFs are encrypted, so render them with pdf.js rather than reading them directly. `SaveAs2` has hung intermittently on a hidden prompt, so `word-com-test.ps1` runs Word in a job with a timeout. On timeout it stops only the WINWORD process it started. Never kill all WINWORD processes, because the user may have documents open.
