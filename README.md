# Mermaid Diagrams for Word

A Microsoft Word add-in that renders [Mermaid](https://mermaid.js.org/) diagrams (Mermaid 12.2)
and inserts them into your document as crisp, editable pictures.

- **Every diagram type** in the Mermaid docs: Flowchart, Swimlanes, Sequence, Class, State, ER,
  User Journey, Gantt, Pie, Quadrant, Requirement, Use Case, GitGraph, C4, Mindmap, Timeline,
  ZenUML, Sankey, XY Chart, Block, Packet, Kanban, Architecture, Radar, Event Modeling, Treemap,
  Venn, Ishikawa, Wardley, Cynefin and TreeView. The **Template** list has a starter for each.
- **SVG with PNG fallback**: Word 2016+ shows the vector SVG (sharp at any zoom or in print);
  older readers show the high-resolution PNG.
- **Editable**: the Mermaid source is stored in the picture's alt text. Click a diagram, then
  **Load selected**, edit, and **Update selected**. This also works on diagrams copied between documents.
- **Convert code blocks**: type a fenced block in the document and convert it in place:

  ````
  ```mermaid
  flowchart LR
    A --> B
  ```
  ````

- **Options**: theme (default, neutral, dark, forest, base), background, maximum width,
  PNG resolution, and a PNG-only mode. **Re-render all** applies the current options to every
  diagram in the document.

## Use it locally (Word desktop on Windows/Mac)

```sh
npm install
npm start        # trusts a localhost dev certificate (first run asks for confirmation),
                 # starts https://localhost:3000 and opens Word with the add-in sideloaded
npm stop         # when finished
```

In Word: **Home → Add-ins → Mermaid Diagrams (Dev)** (under Developer Add-ins) opens the task pane the first time; after that the **Insert → Mermaid Diagram** button appears.

To sideload by hand instead: run `npm run dev-server`, then in Word use
**Insert → Add-ins → My Add-ins → Upload My Add-in** (Word on the web) or a
[shared-folder catalog](https://learn.microsoft.com/office/dev/add-ins/testing/create-a-network-shared-folder-catalog-for-task-pane-and-content-add-ins)
(Word on Windows) with `manifest.xml`.

## Share it with your team

Every push to `main` builds the add-in and publishes it to GitHub Pages
(`.github/workflows/deploy-pages.yml`). This needs **Settings → Pages → Source: GitHub Actions**
on the repository. Teammates install from the published page:

**https://tstickland.github.io/Mermaid2Word/**

It has a one-line installer for Word on Windows (PowerShell) and Mac (Terminal), plus a manifest
download for Word on the web. No Microsoft 365 admin access is needed: the installers sideload the
add-in for the current user. Code changes reach everyone automatically on their next Word restart.
Only changes to `manifest.xml` (ribbon, name, permissions) require teammates to re-run the installer;
bump `<Version>` when you make one.

The shared build has a different add-in ID from the dev manifest (`webpack.config.js` swaps it), and
the dev copy is labelled "(Dev)", so both can be installed side by side. To host somewhere else, build
with `ADDIN_BASE_URL=https://your.host/path/ npm run build` and publish `dist/`.

## Tests

```sh
npm run test:render   # renders all 31 templates in headless Edge through the real pipeline;
                      # writes SVG/PNG/OOXML to test-output/
npm run test:word     # (Windows + Word) inserts every diagram into a real Word document via COM,
                      # saves test-output/all-diagrams.docx/.pdf, checks alt text and in-place update
```

## How it works

| File | Purpose |
| --- | --- |
| `src/render/mermaidRenderer.ts` | Configures Mermaid (plain-SVG labels, ZenUML, icon packs) and renders. |
| `src/render/svgSanitize.ts` | Makes the SVG Word-safe: resolves CSS into attributes, converts HTML labels to `<text>`, emulates `dominant-baseline`, removes filters. |
| `src/render/rasterize.ts` | Builds the PNG fallback. |
| `src/word/ooxml.ts` | Builds the OOXML package (PNG blip and `asvg:svgBlip` extension, tagged content control). |
| `src/word/diagrams.ts` | Insert, update, convert-code-blocks and re-render operations using Word's JavaScript API. |
| `src/word/sourceMeta.ts` | Encodes the source and options into alt text. |
| `src/templates.ts` | Starter templates. |

Requires WordApi 1.3: Word 2016+ on Windows/Mac, Microsoft 365, and Word on the web.
