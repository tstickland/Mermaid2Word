// Compares alt text read back from Word (word-alt-texts.json, written by word-com-test.ps1)
// with the originals, checking the embedded source survives exactly.
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const dir = resolve(import.meta.dirname, "..", "test-output");
const fromWord = JSON.parse(readFileSync(resolve(dir, "word-alt-texts.json"), "utf8").replace(/^﻿/, ""));
const originals = readdirSync(dir).filter((f) => f.endsWith(".alt.txt")).sort();

const srcOf = (alt) => {
  const header = alt.replace(/\r\n?/g, "\n").split("\n")[0];
  return Buffer.from(JSON.parse(header.slice(header.indexOf("{"))).src, "base64").toString("utf8");
};

let failed = 0;
originals.forEach((file) => {
  const original = readFileSync(resolve(dir, file), "utf8");
  const word = fromWord[file.replace(/\.alt\.txt$/, "")] ?? "";
  const exact = word === original;
  const sameLines = word.replace(/\r\n?/g, "\n") === original;
  const srcOk = !!word && srcOf(word) === srcOf(original);
  if (!srcOk) failed++;
  console.log(`${srcOk ? "ok  " : "FAIL"}  ${file.padEnd(22)} exact=${exact} sameAfterNewlineNormalize=${sameLines}`);
});
console.log(`${failed} problem(s)`);
process.exit(failed ? 1 : 0);
