// Renders every template through the add-in's pipeline in headless Edge (same engine as
// Word's WebView2) and writes SVG, PNG and OOXML files to test-output/.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(import.meta.dirname, "..");
const outDir = resolve(root, "test-output");
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const channel = process.env.PLAYWRIGHT_CHANNEL ?? "msedge";
const browser = await chromium.launch({ channel });
const page = await browser.newPage();
const consoleErrors = [];
page.on("pageerror", (e) => consoleErrors.push(e.message));

await page.goto(pathToFileURL(resolve(root, "test-build/harness.html")).href);
await page.waitForFunction(() => window.__ready === true);

let failed = 0;
const selfTest = await page.evaluate(() => window.__selfTest());
for (const f of selfTest) {
  console.log(`SELFTEST FAIL  ${f}`);
  failed++;
}
if (!selfTest.length) console.log("self-test     ok");

const results = await page.evaluate(() => window.__renderAll());
for (const r of results) {
  if (!r.ok) {
    console.log(`FAIL  ${r.id.padEnd(14)} ${r.error.split("\n")[0]}`);
    failed++;
    continue;
  }
  const png = Buffer.from(r.png, "base64");
  writeFileSync(resolve(outDir, `${r.id}.png`), png);
  if (r.svg) writeFileSync(resolve(outDir, `${r.id}.svg`), r.svg);
  writeFileSync(resolve(outDir, `${r.id}.ooxml.xml`), r.ooxml);
  writeFileSync(resolve(outDir, `${r.id}.inner.ooxml.xml`), r.ooxmlInner);
  writeFileSync(resolve(outDir, `${r.id}.alt.txt`), r.altText);

  const problems = [];
  if (png.length < 1000) problems.push("tiny PNG");
  if (r.foreignObject) problems.push("SVG contains foreignObject");
  if (r.styleBlock) problems.push("SVG still has <style>");
  const mode = r.svg ? "svg+png" : "png-only";
  if (problems.length) failed++;
  console.log(
    `${problems.length ? "WARN" : "ok  "}  ${r.id.padEnd(14)} ${mode.padEnd(9)} ${r.width}x${r.height}` +
      `  png=${(png.length / 1024).toFixed(0)}KB${problems.length ? "  " + problems.join(", ") : ""}`
  );
}

if (process.env.RAW) {
  for (const id of process.env.RAW.split(",")) {
    const raw = await page.evaluate((i) => window.__renderRaw(i), id);
    writeFileSync(resolve(outDir, `raw-${id}.svg`), raw);
  }
}

if (consoleErrors.length) console.log("Page errors:\n  " + consoleErrors.join("\n  "));
await browser.close();
console.log(`\n${results.length} templates, ${failed} problem(s). Output: ${outDir}`);
process.exit(failed ? 1 : 0);
