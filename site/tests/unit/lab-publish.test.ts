import { it, expect, vi, afterEach } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

// The Stage 3 outcome, end to end: one Markdown file committed to content/articles/ shows up on the
// index, in its filters, in search, in the feeds, in the sitemap and with a link preview, with no code change.
const entry = (slug: string, extra = "") => `---
title: "Placeholder entry ${slug}"
date: "2026-03-01"
section: writeups
category: ctf
summary: "Placeholder summary for ${slug}."
tags: [Placeholder Tag]
status: published
disclosure: no-vulnerability
${extra}---

## A heading

Sample body text, searchable word: zebracrossing.
`;
let tmp = "";
afterEach(async () => {
  vi.resetModules();
  delete process.env.SITE_ROOT;
  if (tmp) await fs.rm(tmp, { recursive: true, force: true });
});

it("publishes a fixture entry everywhere without a code change", async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), "asad-publish-"));
  await fs.cp(path.resolve(import.meta.dirname, "../../content"), path.join(tmp, "content"), { recursive: true });
  await fs.writeFile(path.join(tmp, "content/articles/placeholder-one.md"), entry("one", "series: placeholder-series\nposition: 1\n"));
  await fs.writeFile(path.join(tmp, "content/articles/placeholder-two.md"), entry("two", "series: placeholder-series\nposition: 2\n").replace("2026-03-01", "2026-03-05"));
  await fs.mkdir(path.join(tmp, "content/drafts"));
  await fs.writeFile(path.join(tmp, "content/drafts/secret-draft.md"), entry("draft").replace("status: published", "status: draft").replace("no-vulnerability", "unresolved").replace("Placeholder entry draft", "Private draft title"));
  process.env.SITE_ROOT = tmp;
  const server = await import("../../src/entry-server");
  const ctx = { dev: false, root: tmp };
  const assets = { tags: "" };

  // private drafts: on the development server only, never in a production render or the built paths
  expect((await server.render("/lab", { ...ctx, dev: true }, assets)).html).toContain("Private draft title");
  expect((await server.render("/preview/secret-draft", { ...ctx, dev: true }, assets)).status).toBe(200);
  expect((await server.render("/preview/secret-draft", ctx, assets)).status).toBe(404);
  const built = await server.render("/lab", ctx, assets);
  expect(built.html).not.toContain("Private draft title");
  expect((await server.prerenderPaths()).join()).not.toContain("secret-draft");

  const lab = built.html;
  expect(lab).toContain("Placeholder entry one");
  expect(lab).toContain('href="/lab/placeholder-one"');
  expect(lab).toContain('href="/lab/tag/placeholder-tag"');
  expect(await server.prerenderPaths()).toEqual(expect.arrayContaining(["/lab/placeholder-one", "/lab/tag/placeholder-tag", "/lab/section/writeups/ctf"]));

  const tag = (await server.render("/lab/tag/placeholder-tag", ctx, assets)).html;
  expect(tag).toContain("Placeholder entry two");
  const category = (await server.render("/lab/section/writeups/ctf", ctx, assets)).html;
  expect(category).toContain("Placeholder entry one");
  expect((await server.render("/lab/section/tooling", ctx, assets)).html).not.toContain("Placeholder entry one");

  const page = await server.render("/lab/placeholder-one", ctx, assets);
  expect(page.status).toBe(200);
  expect(page.html).toContain("No vulnerability described");
  expect(page.html).toContain("Part of the series");
  expect(page.html).toContain('href="/lab/placeholder-two"'); // the series and "newer"
  expect(page.html).toMatch(/og:image" content="[^"]*\/lab\/placeholder-one\/opengraph-image\.png/);

  const files = new Map<string, string>();
  const { feeds } = await import("../../scripts/feeds");
  await feeds(server as never, "/dist", async (f, body) => void files.set(f, body));
  expect(files.get("/dist/rss.xml")).toContain("Placeholder entry one");
  expect(files.get("/dist/lab/section/writeups/rss.xml")).toContain("Placeholder entry two");
  expect(files.get("/dist/lab/section/tooling/rss.xml")).not.toContain("Placeholder entry");
  expect(files.get("/dist/sitemap.xml")).toContain("/lab/tag/placeholder-tag");
  const search = JSON.parse(files.get("/dist/search.json")!);
  expect(search.find((a: { slug: string }) => a.slug === "placeholder-one").searchText).toContain("zebracrossing");
});
