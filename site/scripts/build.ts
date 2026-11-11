import fs from "node:fs/promises";
import path from "node:path";
import { build } from "vite";
import { feeds } from "./feeds";
import { createHash } from "node:crypto";
import { ogImages } from "./og";
import { checkContent } from "./check-content";
import { createStyleExtractor, hasInlineStyle } from "./inline-styles";

// Production build: client assets, then the server renderer, then every route prerendered to
// dist/<path>/index.html (plus 404.html, RSS, sitemap, robots, search index, Open Graph images).
const root = path.resolve(import.meta.dirname, "..");
const dist = path.join(root, "dist");
const ssrOut = path.join(root, "node_modules/.cache/site-ssr");

// Tracked Markdown is public: refuse to build it unfinished, undisclosed or unsafe (scripts/check-content.ts).
if ((process.env.ARTICLE_SOURCE || process.env.CONTENT_SOURCE || "git") === "git") {
  const problems = await checkContent(root);
  if (problems.length) throw new Error(`content check failed:\n${problems.join("\n")}`);
}
await fs.rm(dist, { recursive: true, force: true });
await build({ root, logLevel: "warn" });
await build({ root, logLevel: "warn", build: { ssr: "src/entry-server.ts", outDir: ssrOut, emptyOutDir: true, manifest: false, rollupOptions: { input: "src/entry-server.ts" } } });

type Chunk = { file: string; css?: string[]; imports?: string[]; dynamicImports?: string[]; isEntry?: boolean };
const manifest: Record<string, Chunk> = JSON.parse(await fs.readFile(path.join(dist, ".vite/manifest.json"), "utf8"));
const app = manifest["src/entry-client.ts"];
const style = manifest["src/styles/app.css"];
const tags = [
  `<link rel="stylesheet" href="/${style.file}">`,
  `<script type="module" src="/${app.file}"></script>`,
].join("\n    ");
const preloadsFor = (key: string, seen = new Set<string>()): string[] => {
  const chunk = manifest[key];
  if (!chunk || seen.has(key)) return [];
  seen.add(key);
  return [
    `<link rel="modulepreload" href="/${chunk.file}">`,
    ...(chunk.css ?? []).map((c) => `<link rel="stylesheet" href="/${c}">`),
    ...(chunk.imports ?? []).flatMap((i) => preloadsFor(i, seen)),
  ];
};
const islandPreloads = (name: string) => "\n    " + [...new Set(preloadsFor(`src/islands/${name}.vue`))].join("\n    ");

const server = await import(path.join(ssrOut, "entry-server.js"));
const ctx = { dev: false, root };
const write = async (file: string, body: string | Buffer) => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, body);
};
// Share images first: each page links its image with the image's content hash (?v=…).
const imageVersions = await ogImages(server, root, dist, write);
const assets = { tags, islandPreloads, imageVersions };
const paths: string[] = await server.prerenderPaths();
// Pages are held until every one is rendered: their style attributes become rules appended to the
// main stylesheet (scripts/inline-styles.ts), whose file name then changes with its content.
const styles = createStyleExtractor();
const pages = new Map<string, string>();
for (const p of paths) {
  const { status, html } = await server.render(p, ctx, assets);
  if (status !== 200) throw new Error(`${p} rendered ${status}`);
  pages.set(path.join(dist, p, "index.html"), styles.extract(html));
}
pages.set(path.join(dist, "404.html"), styles.extract((await server.render("/404", ctx, assets)).html));
const sheet = (await fs.readFile(path.join(dist, style.file), "utf8")) + "\n" + styles.css() + "\n";
const sheetFile = `assets/style-${createHash("sha256").update(sheet).digest("hex").slice(0, 10)}.css`;
await fs.rm(path.join(dist, style.file));
await write(path.join(dist, sheetFile), sheet);
for (const [file, html] of pages) {
  if (hasInlineStyle(html)) throw new Error(`${path.relative(dist, file)} still has an inline style; the CSP would block it`);
  await write(file, html.replaceAll(`/${style.file}`, `/${sheetFile}`));
}
await feeds(server, dist, write);
for (const [name, source] of server.thumbnailSources() as Map<string, string>) await write(path.join(dist, "lab-media", name), await fs.readFile(source));
await fs.rm(path.join(dist, ".vite"), { recursive: true, force: true });
console.log(`prerendered ${paths.length} pages + 404 to ${path.relative(process.cwd(), dist) || "dist"}`);
