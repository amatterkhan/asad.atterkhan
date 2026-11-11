import { describe, it, expect, afterEach } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { gateProblems, lintBody, lintSvg, parseEntry } from "../../src/lib/entries";
import { checkContent } from "../../scripts/check-content";
import { createEntry } from "../../scripts/new-entry";
import { articleSource, getArticles, getDraftArticles, parseArticle } from "../../src/lib/content.server";

const doc = (front: Record<string, string>, body = "Body.") =>
  `---\n${Object.entries(front)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n")}\n---\n${body}\n`;
const valid = {
  title: '"A title"',
  date: '"2026-01-01"',
  section: "notes",
  summary: '"A summary."',
  tags: "[a]",
  status: "published",
  disclosure: "no-vulnerability",
};
const without = (k: string) => Object.fromEntries(Object.entries(valid).filter(([x]) => x !== k));

describe("entry frontmatter", () => {
  it("accepts a complete entry and takes the slug from the file name", () => {
    const { entry, slug } = parseEntry(doc(valid), "content/articles/my-entry.md");
    expect(slug).toBe("my-entry");
    expect(entry.disclosure).toBe("no-vulnerability");
  });
  const bad: [string, Record<string, string>, RegExp][] = [
    ["a missing disclosure", without("disclosure"), /disclosure/],
    ["an unknown disclosure state", { ...valid, disclosure: "maybe" }, /disclosure/],
    ["a missing title", without("title"), /title/],
    ["a bad date", { ...valid, date: '"yesterday"' }, /date/],
    ["a future date on a published entry", { ...valid, date: '"2999-01-01"' }, /date: Published entries need a non-future date/],
    ["an update before the date", { ...valid, updated: '"2025-01-01"' }, /updated: Update cannot precede/],
    ["a series without a position", { ...valid, series: "intro" }, /position: Give both/],
    ["a position without a series", { ...valid, position: "2" }, /series: Give both/],
    ["an unknown field", { ...valid, publishedAt: '"2026-01-01"' }, /publishedAt/],
    ["an unknown status", { ...valid, status: "live" }, /status/],
  ];
  for (const [name, front, message] of bad)
    it(`rejects ${name} naming the file and the field`, () => {
      expect(() => parseEntry(doc(front), "content/articles/x.md")).toThrow(message);
      expect(() => parseEntry(doc(front), "content/articles/x.md")).toThrow(/^content\/articles\/x\.md: /);
    });
  it("rejects a file name that is not a slug", () => {
    expect(() => parseEntry(doc(valid), "content/articles/Bad_Name.md")).toThrow(/not a valid slug/);
  });
  it("rejects frontmatter that is not YAML", () => {
    expect(() => parseEntry("---\ntitle: [unclosed\n---\nx", "content/articles/x.md")).toThrow(/not valid YAML/);
  });
});

describe("publication gate", () => {
  it("fails a draft and an unresolved disclosure", () => {
    expect(gateProblems({ status: "draft", disclosure: "disclosed" })).toHaveLength(1);
    expect(gateProblems({ status: "published", disclosure: "unresolved" })).toHaveLength(1);
    expect(gateProblems({ status: "draft", disclosure: "unresolved" })).toHaveLength(2);
  });
  it("passes published and archived entries with a decided disclosure", () => {
    for (const status of ["published", "archived"] as const)
      for (const disclosure of ["disclosed", "no-vulnerability", "redacted"] as const) expect(gateProblems({ status, disclosure })).toEqual([]);
  });
});

describe("content lint", () => {
  const cases: [string, string][] = [
    ["a Markdown image from another origin", "![x](https://example.com/a.png)"],
    ["a protocol-relative image", "![x](//example.com/a.png)"],
    ["an HTML image from another origin", '<img src="http://example.com/a.png">'],
    ["a reference-style image from another origin", "![x][a]\n\n[a]: https://example.com/a.png"],
    ["a script element", "<script>alert(1)</script>"],
    ["an inline event handler", '<a href="/x" onclick="x()">x</a>'],
    ["a javascript: link", "[x](javascript:alert(1))"],
    ["an iframe", '<iframe src="/x"></iframe>'],
  ];
  for (const [name, body] of cases)
    it(`fails ${name}`, () => {
      expect(lintBody(body).length).toBeGreaterThan(0);
    });
  it("allows local images, links and code that mentions these things", () => {
    expect(lintBody("![x](/lab-media/a.png) [x](https://example.com)\n\n```html\n<script>alert(1)</script>\n```\n\nUse `<iframe>` carefully.")).toEqual([]);
  });
  const svgCases: [string, string][] = [
    ["a script", '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'],
    ["an event handler", '<svg xmlns="http://www.w3.org/2000/svg" onload="x()"></svg>'],
    ["an external reference", '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.com/a.png"/></svg>'],
    ["an external url()", '<svg xmlns="http://www.w3.org/2000/svg"><rect style="fill:url(https://example.com/x)"/></svg>'],
    ["a foreignObject", '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject/></svg>'],
    ["a stylesheet import", '<svg xmlns="http://www.w3.org/2000/svg"><style>@import "x.css";</style></svg>'],
  ];
  for (const [name, svg] of svgCases)
    it(`fails an SVG with ${name}`, () => {
      expect(lintSvg(svg).length).toBeGreaterThan(0);
    });
  it("allows an SVG with fragment references", () => {
    expect(lintSvg('<svg xmlns="http://www.w3.org/2000/svg"><defs><g id="a"/></defs><use href="#a"/><rect fill="url(#a)"/></svg>')).toEqual([]);
  });
});

let tmp: string | undefined;
afterEach(async () => {
  delete process.env.ARTICLE_SOURCE;
  delete process.env.CONTENT_SOURCE;
  if (tmp) await fs.rm(tmp, { recursive: true, force: true });
  tmp = undefined;
});
const site = async (files: Record<string, string>) => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), "asad-entries-"));
  for (const [f, c] of Object.entries(files)) {
    await fs.mkdir(path.dirname(path.join(tmp, f)), { recursive: true });
    await fs.writeFile(path.join(tmp, f), c);
  }
  return tmp;
};

describe("checkContent over a tree", () => {
  it("reports a draft, an unresolved entry, a lint failure and a bad SVG, each with its file", async () => {
    const root = await site({
      "content/articles/a-draft.md": doc({ ...valid, status: "draft" }),
      "content/articles/unresolved.md": doc({ ...valid, disclosure: "unresolved" }),
      "content/articles/remote-image.md": doc(valid, "![x](https://example.com/a.png)"),
      "content/articles/broken.md": doc(without("summary")),
      "content/articles/fine.md": doc(valid),
      "content/diagram.svg": "<svg xmlns='http://www.w3.org/2000/svg'><script>1</script></svg>",
    });
    const out = (await checkContent(root)).join("\n");
    expect(out).toMatch(/a-draft\.md: status is "draft"/);
    expect(out).toMatch(/unresolved\.md: disclosure is "unresolved"/);
    expect(out).toMatch(/remote-image\.md: image from another origin/);
    expect(out).toMatch(/broken\.md: summary/);
    expect(out).toMatch(/content\/diagram\.svg: SVG contains a <script>/);
    expect(out).not.toMatch(/fine\.md/);
  });
  it("passes a clean tree", async () => {
    expect(await checkContent(await site({ "content/articles/fine.md": doc(valid) }))).toEqual([]);
  });
  it("passes the repository's own content", async () => {
    expect(await checkContent(path.resolve(import.meta.dirname, "../.."))).toEqual([]);
  });
});

describe("article source and private drafts", () => {
  it("defaults to CONTENT_SOURCE, so production is unchanged until ARTICLE_SOURCE is set", () => {
    expect(articleSource()).toBe("git");
    process.env.CONTENT_SOURCE = "firestore";
    expect(articleSource()).toBe("firestore");
    process.env.ARTICLE_SOURCE = "git";
    expect(articleSource()).toBe("git");
    process.env.ARTICLE_SOURCE = "gti";
    expect(() => articleSource()).toThrow(/ARTICLE_SOURCE/);
  });
  it("reads Git articles while the rest of the content comes from Firestore", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "asad-split-"));
    try {
      await fs.mkdir(path.join(dir, "articles"));
      await fs.writeFile(path.join(dir, "articles/x.json"), JSON.stringify({ title: "X", description: "d", slug: "from-firestore", status: "published", publishedAt: "2025-01-01", body: "x" }));
      await fs.writeFile(path.join(dir, "site.json"), JSON.stringify({ heroTitle: "From the export" }));
      process.env.CONTENT_EXPORT_DIR = dir;
      process.env.CONTENT_SOURCE = "firestore";
      expect((await getArticles()).map((a) => a.slug)).toEqual(["from-firestore"]);
      process.env.ARTICLE_SOURCE = "git";
      const slugs = (await getArticles()).map((a) => a.slug);
      expect(slugs).toContain("lab-000");
      expect(slugs).not.toContain("from-firestore");
      const { getSiteCopy } = await import("../../src/lib/content.server");
      expect((await getSiteCopy()).heroTitle).toBe("From the export");
    } finally {
      delete process.env.CONTENT_EXPORT_DIR;
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
  it("keeps archived entries and never lists drafts in the production article list", async () => {
    expect(parseArticle(doc({ ...valid, status: "archived" }), "content/articles/old.md").status).toBe("archived");
    expect((await getArticles()).every((a) => a.status !== "draft")).toBe(true);
    expect(await getDraftArticles()).toEqual(expect.any(Array));
  });
  it("scaffolds a valid draft and refuses to overwrite", async () => {
    const root = await site({});
    const file = await createEntry("first-note", 'My "first" note', root);
    const { entry } = parseEntry(await fs.readFile(file, "utf8"), file);
    expect(entry).toMatchObject({ title: 'My "first" note', status: "draft", disclosure: "unresolved" });
    await expect(createEntry("first-note", "x", root)).rejects.toThrow(/already exists/);
    await expect(createEntry("Bad Slug", "x", root)).rejects.toThrow(/slug/);
  });
});
