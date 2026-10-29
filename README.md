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

In Word: **Insert → Mermaid Diagram** opens the task pane.

To sideload by hand instead: run `npm run dev-server`, then in Word use
**Insert → Add-ins → My Add-ins → Upload My Add-in** (Word on the web) or a
[shared-folder catalog](https://learn.microsoft.com/office/dev/add-ins/testing/create-a-network-shared-folder-catalog-for-task-pane-and-content-add-ins)
(Word on Windows) with `manifest.xml`.

## Host it (GitHub Pages or any HTTPS static host)

```sh
ADDIN_BASE_URL=https://<user>.github.io/<repo>/ npm run build
```

`dist/` is a static site. Publish its contents at that URL (for GitHub Pages: push `dist/` to a
`gh-pages` branch, or use a Pages workflow that uploads `dist/`). `dist/manifest.xml` points at the
hosted URL. Give that manifest to users, who install it as above. Bump `<Version>` in `manifest.xml`
when you publish changes to the manifest itself.

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
