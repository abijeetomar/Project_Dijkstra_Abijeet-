/*
 * Turns dist-single/index.html into dist-single/artifact.html by dropping the
 * document wrapper: the Artifact host supplies <!doctype>, <html>, <head> and
 * <body> itself, so a page published there is written as bare content.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(here, "../dist-single/index.html");
const target = resolve(here, "../dist-single/artifact.html");

const html = readFileSync(source, "utf8");
const head = html.match(/<head>([\s\S]*?)<\/head>/i)?.[1] ?? "";
const body = html.match(/<body>([\s\S]*?)<\/body>/i)?.[1] ?? "";

const kept = head
  .replace(/<meta\s+charset[^>]*>/gi, "")   // the host sets these
  .trim();

writeFileSync(target, `${kept}\n${body.trim()}\n`);
console.log(`artifact.html written (${(readFileSync(target).length / 1024).toFixed(0)} kB)`);
