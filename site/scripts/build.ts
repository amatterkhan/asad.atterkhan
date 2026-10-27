import fs from "node:fs/promises";
import path from "node:path";
import { build } from "vite";
import { feeds } from "./feeds";
import { ogImages } from "./og";

// Production build: client assets, then the server renderer, then every route prerendered to
// dist/<path>/index.html (plus 404.html, RSS, sitemap, robots, search index, Open Graph images).
const root = path.resolve(import.meta.dirname, "..");
const dist = path.join(root, "dist");
const ssrOut = path.join(root, "node_modules/.cache/site-ssr");

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
const assets = { tags, islandPreloads };
const write = async (file: string, body: string | Buffer) => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, body);
};
const paths: string[] = await server.prerenderPaths();
for (const p of paths) {
  const { status, html } = await server.render(p, ctx, assets);
  if (status !== 200) throw new Error(`${p} rendered ${status}`);
  await write(path.join(dist, p, "index.html"), html);
}
await write(path.join(dist, "404.html"), (await server.render("/404", ctx, assets)).html);
await feeds(server, dist, write);
await ogImages(server, root, dist, write);
for (const [name, source] of server.thumbnailSources() as Map<string, string>) await write(path.join(dist, "lab-media", name), await fs.readFile(source));
await fs.rm(path.join(dist, ".vite"), { recursive: true, force: true });
console.log(`prerendered ${paths.length} pages + 404 to ${path.relative(process.cwd(), dist) || "dist"}`);
