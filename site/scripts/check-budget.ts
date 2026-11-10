import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";

// Size budgets for the built site (run after `npm run build`). A page that grows past a budget
// fails CI, so weight is added on purpose and the number below is raised in the same commit.
const dist = path.resolve(import.meta.dirname, "../dist");
const KB = 1024;
const budgets = {
  /** The one stylesheet every page loads, gzipped. */
  css: 22 * KB,
  /** JavaScript a public page asks for up front (scripts and module preloads), gzipped. */
  pageJs: { "/": 48 * KB, "/lab": 42 * KB, "/about": 8 * KB } as Record<string, number>,
  /** Every JavaScript file in the build, admin included, uncompressed. */
  allJs: 330 * KB,
};

const gz = (file: string) => gzipSync(readFileSync(file)).length;
const assets = readdirSync(path.join(dist, "assets"));
const rows: [string, number, number][] = [];

const css = assets.filter((f) => f.endsWith(".css"));
if (css.length !== 1) throw new Error(`expected one stylesheet, found ${css.length}`);
rows.push(["stylesheet (gzip)", gz(path.join(dist, "assets", css[0])), budgets.css]);

for (const [route, budget] of Object.entries(budgets.pageJs)) {
  const html = readFileSync(path.join(dist, route, "index.html"), "utf8");
  const files = new Set([...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.js)"/g)].map((m) => m[1]));
  rows.push([`${route} JavaScript (gzip, ${files.size} files)`, [...files].reduce((n, f) => n + gz(path.join(dist, f)), 0), budget]);
}

rows.push([
  "all JavaScript (raw)",
  assets.filter((f) => f.endsWith(".js")).reduce((n, f) => n + readFileSync(path.join(dist, "assets", f)).length, 0),
  budgets.allJs,
]);

let failed = false;
for (const [name, size, budget] of rows) {
  const over = size > budget;
  failed ||= over;
  console.log(`${over ? "OVER" : "ok  "} ${name}: ${(size / KB).toFixed(1)} KB of ${(budget / KB).toFixed(0)} KB`);
}
if (failed) {
  console.error("\nA size budget was exceeded (scripts/check-budget.ts).");
  process.exit(1);
}
