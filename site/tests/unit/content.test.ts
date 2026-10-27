import { describe, it, expect, afterEach } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  ArticleSchema,
  LabSchema,
  ProjectSchema,
  SiteCopySchema,
  ThoughtsSchema,
  featuredSchema,
} from "../../src/lib/schemas";
import { groupExperience } from "../../src/lib/experience";
import {
  getArticles,
  getProjects,
  getSiteCopy,
  getFeaturedAchievements,
  getActiveOutfit,
  getLab,
  getThoughts,
  parseArticle,
  resolveShelf,
} from "../../src/lib/content.server";
import { thumbnailPrompt, PROMPT_HEADER } from "../../src/lib/thumbnail-prompt";
import { DEFAULT_OUTFIT, isOutfit, outfitSheet, resolveOutfit } from "../../src/lib/outfits";
import { renderHead } from "../../src/head";
import { subtitles } from "../../src/lib/site";
import { ICONS, ICON_SOURCES } from "../../src/lib/icons";

afterEach(() => {
  delete process.env.CONTENT_SOURCE;
  delete process.env.CONTENT_EXPORT_DIR;
});
const published = {
  title: "Title",
  description: "Description",
  slug: "test-note",
  status: "published",
  publishedAt: "2025-01-01",
  tags: ["test"],
};
describe("content boundaries", () => {
  it("requires a publication date and ordered dates", () => {
    expect(
      ArticleSchema.safeParse({ ...published, publishedAt: undefined }).success,
    ).toBe(false);
    expect(
      ArticleSchema.safeParse({ ...published, publishedAt: "2999-01-01" })
        .success,
    ).toBe(false);
    expect(
      ArticleSchema.safeParse({ ...published, updatedAt: "2024-12-31" })
        .success,
    ).toBe(false);
    expect(
      ArticleSchema.safeParse({ ...published, slug: "../escape" }).success,
    ).toBe(false);
  });
  it("rejects unsafe project links and writeup paths", () => {
    const p = {
      id: 1,
      title: "x",
      slug: "x",
      description: "x",
      date: "2025-01-01",
      categories: [],
      tags: [],
      featured: false,
      links: [{ type: "demo", url: "javascript:alert(1)" }],
    };
    expect(ProjectSchema.safeParse(p).success).toBe(false);
    expect(
      ProjectSchema.safeParse({ ...p, links: [], writeup: "../secret.md" })
        .success,
    ).toBe(false);
  });
  it("checks site lengths and achievement identity", () => {
    expect(
      SiteCopySchema.safeParse({ heroTitle: "x".repeat(601) }).success,
    ).toBe(false);
    const schema = featuredSchema([
      {
        id: "a",
        kind: "badge",
        title: "A",
        issuer: "Issuer",
        link: "https://example.com",
      },
    ]);
    expect(schema.parse({ featuredIds: ["a"] })).toEqual({
      featuredIds: ["a"],
    });
    for (const featuredIds of [["unknown"], ["a", "a"]])
      expect(schema.safeParse({ featuredIds }).success).toBe(false);
  });
  it("derives article reading time and strips code from search", () => {
    const a = parseArticle(
      "---\ntitle: Test\ndescription: Description\nslug: test\nstatus: draft\n---\n## Hi\n```js\nsecretCode\n```",
    );
    expect(a.readingMinutes).toBe(1);
    expect(a.searchText).not.toContain("secretCode");
  });
  it("loads an exported publication snapshot and settings", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "asad-export-test-"));
    try {
      await fs.mkdir(path.join(dir, "articles"));
      await fs.mkdir(path.join(dir, "projects"));
      await fs.writeFile(
        path.join(dir, "articles/test.json"),
        JSON.stringify({ ...published, body: "Exported body" }),
      );
      await fs.writeFile(
        path.join(dir, "articles/draft.json"),
        JSON.stringify({
          ...published,
          slug: "hidden",
          status: "draft",
          body: "Hidden",
        }),
      );
      await fs.writeFile(
        path.join(dir, "site.json"),
        JSON.stringify({ heroTitle: "Exported title" }),
      );
      await fs.writeFile(
        path.join(dir, "achievements.json"),
        JSON.stringify({ featuredIds: ["5"] }),
      );
      process.env.CONTENT_SOURCE = "firestore";
      process.env.CONTENT_EXPORT_DIR = dir;
      expect((await getArticles()).map((a) => a.slug)).toEqual(["test-note"]);
      expect((await getSiteCopy()).heroTitle).toBe("Exported title");
      expect((await getFeaturedAchievements()).map((a) => a.id)).toEqual(["5"]);
      expect((await getProjects()).length).toBeGreaterThan(0);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});
it("reads Asad's outfit from the export and falls back to the wardrobe default", async () => {
  expect(await getActiveOutfit()).toBe(DEFAULT_OUTFIT);
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "asad-wardrobe-"));
  try {
    process.env.CONTENT_SOURCE = "firestore";
    process.env.CONTENT_EXPORT_DIR = dir;
    expect(await getActiveOutfit()).toBe(DEFAULT_OUTFIT);
    await fs.writeFile(path.join(dir, "wardrobe.json"), JSON.stringify({ activeOutfit: "classic" }));
    expect(await getActiveOutfit()).toBe("classic");
    await fs.writeFile(path.join(dir, "wardrobe.json"), JSON.stringify({ activeOutfit: "../sprites" }));
    expect(await getActiveOutfit()).toBe(DEFAULT_OUTFIT);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
  expect(outfitSheet("classic", "asad-idle")).toMatch(/^\/art\/outfits\/classic\/asad-idle\.png\?v=/);
  await fs.access(path.join("public", outfitSheet(DEFAULT_OUTFIT, "asad-typing").split("?")[0]));
});
it("lets a worldline dress Asad in the lab coat, but never makes it his outfit", async () => {
  // the room can show it...
  for (const state of ["asad-typing", "asad-coffee", "asad-idle", "asad-happy", "asad-stretch", "asad-look"] as const) {
    expect(outfitSheet("labcoat", state)).toMatch(new RegExp(`^/art/outfits/labcoat/${state}\\.png\\?v=`));
    await fs.access(path.join("public", outfitSheet("labcoat", state).split("?")[0]));
  }
  // ...but the wardrobe, the admin and the export never accept it as the saved outfit
  expect(isOutfit("labcoat")).toBe(false);
  expect(resolveOutfit("labcoat")).toBe(DEFAULT_OUTFIT);
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "asad-wardrobe-"));
  try {
    process.env.CONTENT_SOURCE = "firestore";
    process.env.CONTENT_EXPORT_DIR = dir;
    await fs.writeFile(path.join(dir, "wardrobe.json"), JSON.stringify({ activeOutfit: "labcoat" }));
    expect(await getActiveOutfit()).toBe(DEFAULT_OUTFIT);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
it("groups adjacent company roles without mutating source", () => {
  const roles = [
    {
      id: 1,
      title: "Junior",
      company: "A",
      dateRange: "2020 - 2021",
      responsibilities: ["one"],
    },
    {
      id: 2,
      title: "Senior",
      company: "A",
      dateRange: "2021 - Present",
      responsibilities: ["two"],
    },
  ];
  const groups = groupExperience(roles);
  expect(groups[0].dates).toBe("2020 — Present");
  expect(groups[0].roles.map((r) => r.id)).toEqual([2, 1]);
  expect(roles[0].id).toBe(1);
});
it("escapes head tags and keeps private pages out of indexing", () => {
  const html = renderHead(
    {
      title: "<script>",
      canonical: "/about",
      noindex: true,
      jsonLd: { name: "</script><script>alert(1)</script>" },
    },
    true,
  );
  expect(html).toContain("&lt;script&gt;");
  expect(html).toContain("noindex, nofollow");
  expect(html).not.toContain("</script><script>");
  expect(html).toContain("og:image");
  expect(html).toContain('rel="canonical"');
});
it("names the site Asad.exe, with the motto as its description", () => {
  const home = renderHead({ canonical: "/" }, true);
  expect(home).toContain("<title>Asad.exe — Asad Atterkhan</title>");
  expect(home).toContain('<meta property="og:site_name" content="Asad.exe">');
  expect(home).toContain('<meta property="og:description" content="Somewhere between cloud nine and layer seven.">');
  expect(renderHead({ title: "The Lab" }, true)).toContain("<title>The Lab · Asad.exe</title>");
  expect(subtitles).toEqual({
    home: "Human, allegedly.",
    about: "Still figuring out the source code.",
    lab: "Running experiments on reality.",
    notFound: "Lost in thought. Found in the logs.",
  });
});
it("uses exact pixelarticons package paths", async () => {
  for (const key of Object.keys(ICONS) as (keyof typeof ICONS)[]) {
    const svg = await fs.readFile(
      path.resolve(
        "node_modules/pixelarticons/svg",
        ICON_SOURCES[key] + ".svg",
      ),
      "utf8",
    );
    const paths = [...svg.matchAll(/<path[^>]* d="([^"]+)"/g)].map((m) => m[1]);
    expect([...ICONS[key]], key).toEqual(paths);
  }
});

describe("the Lab map", () => {
  const room = (id: string, icon = "flag") => ({ id, name: "Room", blurb: "", icon, categories: [] });
  it("validates sections, icons and ids", async () => {
    expect(LabSchema.safeParse({ sections: [] }).success).toBe(false);
    expect(LabSchema.safeParse({ sections: [room("a"), room("a")] }).success).toBe(false);
    expect(LabSchema.safeParse({ sections: [room("a", "rocket")] }).success).toBe(false);
    expect(LabSchema.safeParse({ sections: [room("../x")] }).success).toBe(false);
    const dupCats = { ...room("a"), categories: [{ id: "c", name: "C" }, { id: "c", name: "D" }] };
    expect(LabSchema.safeParse({ sections: [dupCats] }).success).toBe(false);
    expect((await getLab()).sections.map((s) => s.id)).toEqual(["writeups", "tooling", "notes"]);
  });
  it("files unknown sections under the last one and drops foreign categories", async () => {
    const lab = await getLab();
    expect(resolveShelf(lab, { section: "writeups", category: "ctf" })).toMatchObject({ section: "writeups", categoryName: "CTF" });
    expect(resolveShelf(lab, { section: "writeups", category: "nope" }).category).toBeUndefined();
    expect(resolveShelf(lab, { section: "gone", category: "ctf" })).toMatchObject({ section: "notes", category: undefined });
    expect(resolveShelf(lab, {}).section).toBe("notes");
    expect((await getArticles()).every((a) => a.shelf && lab.sections.some((s) => s.id === a.shelf!.section))).toBe(true);
  });
  it("only accepts plain thumbnail file names", () => {
    expect(ArticleSchema.safeParse({ ...published, thumbnail: "box.webp" }).success).toBe(true);
    expect(ArticleSchema.safeParse({ ...published, thumbnail: "../box.webp" }).success).toBe(false);
    expect(ArticleSchema.safeParse({ ...published, thumbnail: "box.svg" }).success).toBe(false);
  });
  it("publishes exported thumbnails under a content hash", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "asad-thumbs-"));
    try {
      await fs.mkdir(path.join(dir, "articles"));
      await fs.mkdir(path.join(dir, "thumbnails"));
      await fs.writeFile(path.join(dir, "thumbnails", "a".repeat(64) + ".webp"), "image bytes");
      await fs.writeFile(
        path.join(dir, "articles/test.json"),
        JSON.stringify({ ...published, section: "tooling", thumbnail: "a".repeat(64) + ".webp", body: "x" }),
      );
      await fs.writeFile(path.join(dir, "lab.json"), JSON.stringify({ sections: [room("tooling", "tools")] }));
      process.env.CONTENT_SOURCE = "firestore";
      process.env.CONTENT_EXPORT_DIR = dir;
      const [a] = await getArticles();
      expect(a.thumb).toMatch(/^\/lab-media\/[a-f0-9]{16}\.webp$/);
      expect(a.shelf).toMatchObject({ section: "tooling", icon: "tools" });
      await fs.writeFile(path.join(dir, "articles/test.json"), JSON.stringify({ ...published, thumbnail: "missing.webp", body: "x" }));
      await expect(getArticles()).rejects.toThrow(/missing/);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
  it("builds a thumbnail prompt from the article", () => {
    const prompt = thumbnailPrompt({
      title: "Cicada",
      description: "SMB to Administrator.",
      tags: ["windows"],
      section: { id: "writeups", name: "Writeups" },
      category: { id: "hackthebox", name: "Hack The Box" },
    });
    expect(prompt.startsWith(PROMPT_HEADER)).toBe(true);
    expect(prompt).toContain("Shelf: Writeups / Hack The Box.");
    expect(prompt).toContain("wireframe cube");
    expect(thumbnailPrompt({ title: "x", description: "y", tags: [] })).toContain("Scene idea: A single object");
  });
});

describe("Thoughts", () => {
  const line = (id: string, enabled = true, context = "general") => ({ id, text: "A line.", enabled, context });
  it("validates ids, text, contexts and the featured line", () => {
    expect(ThoughtsSchema.safeParse({ thoughts: [line("a")], featured: null }).success).toBe(true);
    expect(ThoughtsSchema.safeParse({ thoughts: [line("a"), line("a")], featured: null }).success).toBe(false);
    expect(ThoughtsSchema.safeParse({ thoughts: [line("a", true, "lab-coat")], featured: null }).success).toBe(false);
    expect(ThoughtsSchema.safeParse({ thoughts: [{ ...line("a"), text: "x".repeat(81) }], featured: null }).success).toBe(false);
    expect(ThoughtsSchema.safeParse({ thoughts: [line("a")], featured: "b" }).success).toBe(false);
  });
  it("ships the brief's sixteen lines, nothing featured", async () => {
    const { thoughts, featured } = await getThoughts();
    expect(thoughts).toHaveLength(16);
    expect(thoughts.filter((t) => t.context === "general")).toHaveLength(12);
    expect(thoughts[0]).toEqual({ id: "human-allegedly", text: "Human, allegedly.", context: "general" });
    expect(featured).toBeNull();
  });
  it("gives the page only enabled lines, and drops a disabled featured line", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "asad-thoughts-"));
    try {
      await fs.writeFile(
        path.join(dir, "thoughts.json"),
        JSON.stringify({ thoughts: [line("on"), line("off", false), line("night", true, "night")], featured: "off" }),
      );
      process.env.CONTENT_SOURCE = "firestore";
      process.env.CONTENT_EXPORT_DIR = dir;
      const { thoughts, featured } = await getThoughts();
      expect(thoughts.map((t) => t.id)).toEqual(["on", "night"]);
      expect(thoughts[0]).not.toHaveProperty("enabled");
      expect(featured).toBeNull();
      await fs.writeFile(path.join(dir, "thoughts.json"), JSON.stringify({ thoughts: [], featured: null }));
      expect((await getThoughts()).thoughts).toEqual([]);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});
