import { describe, it, expect, afterEach } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  ArticleSchema,
  ProjectSchema,
  SiteCopySchema,
  featuredSchema,
} from "../../src/lib/schemas";
import { groupExperience } from "../../src/lib/experience";
import {
  getArticles,
  getProjects,
  getSiteCopy,
  getFeaturedAchievements,
  parseArticle,
} from "../../src/lib/content.server";
import { renderHead } from "../../src/head";
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
