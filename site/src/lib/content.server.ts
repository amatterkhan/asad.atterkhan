import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  AchievementSchema,
  AchievementsSchema,
  ArticleSchema,
  ExperienceSchema,
  LabSchema,
  ProjectSchema,
  SiteCopySchema,
  ThoughtsSchema,
  ProfilesSchema,
  type Achievements,
  type Article,
  type Experience,
  type ArticleMeta,
  type Lab,
  type Profile,
  type Project,
  type SiteCopy,
} from "./schemas";
import { renderMarkdown, type TocEntry } from "./markdown";
import { EntryError, gateProblems, lintBody, parseEntry } from "./entries";
import { DEFAULT_OUTFIT, resolveOutfit } from "./outfits";
import type { PublicThought } from "./thoughts";

// Build-time content gateway (Node only). CONTENT_SOURCE=git (default) reads reviewed files in
// content/; CONTENT_SOURCE=firestore reads the snapshot written by `go run ./cmd/export` (published
// articles, projects, site copy, the Experience selection and Asad's outfit) and falls back to
// content/ for the rest, and the Lab map. Both go through the same zod schemas, so a bad record fails the build.

const root = process.env.SITE_ROOT || process.cwd();
const dir = (...p: string[]) => path.join(root, ...p);
const exportDir = () => path.resolve(root, process.env.CONTENT_EXPORT_DIR || ".content-export");
export const contentSource = () => (process.env.CONTENT_SOURCE === "firestore" ? "firestore" : "git");
/**
 * Where Lab articles come from, separate from CONTENT_SOURCE (ADR 0005). Unset, it follows
 * CONTENT_SOURCE, so nothing changes until ARTICLE_SOURCE is set: production can read articles
 * from Git while the rest still comes from Firestore.
 */
export const articleSource = (): "git" | "firestore" => {
  const v = process.env.ARTICLE_SOURCE;
  if (v === undefined || v === "") return contentSource();
  if (v !== "git" && v !== "firestore") throw new Error(`ARTICLE_SOURCE must be "git" or "firestore", not "${v}"`);
  return v;
};

const readJson = async (file: string) => JSON.parse(await fs.readFile(file, "utf8"));
const exists = (file: string) =>
  fs.access(file).then(
    () => true,
    () => false,
  );
const jsonFiles = async (folder: string) =>
  (await exists(folder)) ? (await fs.readdir(folder)).filter((f) => f.endsWith(".json")).sort() : [];

/** Adds reading time and search text to validated metadata (shared by every content source). */
export function withDerived(meta: ArticleMeta, content: string): Article {
  return {
    ...meta,
    body: content,
    readingMinutes: Math.max(1, Math.ceil(content.trim().split(/\s+/).length / 220)),
    searchText: content
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/[#*`\[\]>]/g, " ")
      .slice(0, 120000),
  };
}
/** One Markdown entry (frontmatter in the Lab entry format) as an Article. `file` names it in errors; its base name is the slug. */
export function parseArticle(source: string, file = "entry.md"): Article {
  const { entry, body, slug } = parseEntry(source, file);
  return withDerived(
    {
      title: entry.title,
      description: entry.summary,
      slug,
      status: entry.status,
      publishedAt: entry.date,
      updatedAt: entry.updated,
      tags: entry.tags,
      section: entry.section,
      category: entry.category,
      thumbnail: entry.thumbnail,
      featured: entry.featured,
      disclosure: entry.disclosure,
      series: entry.series,
      position: entry.position,
    },
    body,
  );
}

const markdownFiles = async (folder: string) =>
  (await exists(folder)) ? (await fs.readdir(folder)).filter((f) => f.endsWith(".md")).sort() : [];

/** Every tracked entry passes the gate and the lint here, so the build and CI cannot disagree. */
async function gitArticles(): Promise<Article[]> {
  const base = dir("content/articles");
  return Promise.all(
    (await markdownFiles(base)).map(async (f) => {
      const file = `content/articles/${f}`;
      const article = parseArticle(await fs.readFile(path.join(base, f), "utf8"), file);
      const problems = [...gateProblems({ status: article.status, disclosure: article.disclosure! }), ...lintBody(article.body)];
      if (problems.length) throw new EntryError(file, problems.join("; "));
      return article;
    }),
  );
}

/**
 * Private drafts for the development server: content/drafts/ is gitignored (a clone of the private
 * drafts repository). Only the dev routes call this; the production build never reads the folder.
 */
export async function getDraftArticles(): Promise<Article[]> {
  const base = dir("content/drafts");
  const lab = await getLab();
  const tracked = new Set((await markdownFiles(dir("content/articles"))).map((f) => f.replace(/\.md$/, "")));
  return Promise.all(
    (await markdownFiles(base)).map(async (f) => {
      const a = parseArticle(await fs.readFile(path.join(base, f), "utf8"), `content/drafts/${f}`);
      if (tracked.has(a.slug)) throw new EntryError(`content/drafts/${f}`, "the slug is already used by a tracked entry");
      return { ...a, shelf: resolveShelf(lab, a), thumb: await thumbnailUrl(a.thumbnail, dir("content/drafts")) };
    }),
  );
}
async function exportedArticles(): Promise<Article[]> {
  const base = path.join(exportDir(), "articles");
  return Promise.all(
    (await jsonFiles(base)).map(async (f) => {
      const { body, ...meta } = await readJson(path.join(base, f));
      if (typeof body !== "string") throw new Error(`publicArticles/${f} has no Markdown body`);
      return withDerived(ArticleSchema.parse(meta), body);
    }),
  );
}

export async function getArticles(): Promise<Article[]> {
  const articles = articleSource() === "firestore" ? await exportedArticles() : await gitArticles();
  const slugs = new Set<string>();
  for (const a of articles) {
    if (slugs.has(a.slug)) throw new Error("Duplicate article slug");
    slugs.add(a.slug);
  }
  const lab = await getLab();
  // Archived entries stay readable and in the ledger; feeds and Home leave them out (see `isCurrent`).
  const published = articles
    .filter((a) => a.status === "published" || a.status === "archived")
    .sort((a, b) => b.publishedAt!.localeCompare(a.publishedAt!));
  return Promise.all(published.map(async (a) => ({ ...a, shelf: resolveShelf(lab, a), thumb: await thumbnailUrl(a.thumbnail) })));
}

/** The Lab map: the exported siteSettings/lab when CONTENT_SOURCE=firestore, else content/lab.json. */
export async function getLab(): Promise<Lab> {
  const exported = path.join(exportDir(), "lab.json");
  const file = contentSource() === "firestore" && (await exists(exported)) ? exported : dir("content/lab.json");
  return LabSchema.parse(await readJson(file));
}
/**
 * Asad's Thoughts as the room gets them: the exported siteSettings/thoughts when
 * CONTENT_SOURCE=firestore, else content/thoughts.json. Only enabled lines reach the page, and the
 * featured id only if that line is enabled.
 */
export async function getThoughts(): Promise<{ thoughts: PublicThought[]; featured: string | null }> {
  const exported = path.join(exportDir(), "thoughts.json");
  const file = contentSource() === "firestore" && (await exists(exported)) ? exported : dir("content/thoughts.json");
  const all = ThoughtsSchema.parse(await readJson(file));
  const thoughts = all.thoughts.filter((t) => t.enabled).map(({ id, text, context }) => ({ id, text, context }));
  return { thoughts, featured: thoughts.some((t) => t.id === all.featured) ? all.featured : null };
}
/** The profile links: the exported siteSettings/profiles when CONTENT_SOURCE=firestore, else content/profiles.json. */
export async function getProfiles(): Promise<Profile[]> {
  const exported = path.join(exportDir(), "profiles.json");
  const file = contentSource() === "firestore" && (await exists(exported)) ? exported : dir("content/profiles.json");
  return ProfilesSchema.parse(await readJson(file)).profiles;
}
/** Where an article sits on the Lab map. A missing or removed section falls back to the last one;
 *  a category that is not in the section is dropped. */
export function resolveShelf(lab: Lab, a: { section?: string; category?: string }) {
  const section = lab.sections.find((s) => s.id === a.section) ?? lab.sections.at(-1)!;
  const category = section.categories.find((c) => c.id === a.category);
  return { section: section.id, sectionName: section.name, icon: section.icon, category: category?.id, categoryName: category?.name };
}
export type Shelf = ReturnType<typeof resolveShelf>;

// Thumbnails are published under a content hash (/lab-media/<16 hex>.<ext>) so Hosting can cache
// them for a year; the build copies each one from its source (thumbnailSources) into dist/.
const thumbDir = () => (articleSource() === "firestore" ? path.join(exportDir(), "thumbnails") : dir("content/thumbnails"));
const thumbs = new Map<string, string>();
export async function thumbnailUrl(file?: string, from?: string): Promise<string | undefined> {
  if (!file) return undefined;
  const source = path.join(from ?? thumbDir(), file);
  const bytes = await fs.readFile(source).catch(() => {
    throw new Error(`Thumbnail ${file} is missing from ${thumbDir()}`);
  });
  const name = createHash("sha256").update(bytes).digest("hex").slice(0, 16) + path.extname(file);
  thumbs.set(name, source);
  return `/lab-media/${name}`;
}
/** Public thumbnail name to source file, for every thumbnail resolved so far. */
export const thumbnailSources = () => thumbs;

/** Published and not archived: what feeds, Home and "latest" lists show. */
export const isCurrent = (a: { status: string }) => a.status === "published";

export function articleSummary(article: Article) {
  return { ...articleCard(article), updatedAt: article.updatedAt, searchText: article.searchText };
}
export type ArticleSummary = ReturnType<typeof articleSummary>;
/** What a Lab card needs. No body text: the search island fetches /search.json for that. */
export function articleCard(article: Article) {
  return {
    title: article.title,
    description: article.description,
    slug: article.slug,
    tags: article.tags,
    shelf: article.shelf!,
    thumb: article.thumb,
    featured: article.featured,
    publishedAt: article.publishedAt,
    readingMinutes: article.readingMinutes,
  };
}
export type ArticleCard = ReturnType<typeof articleCard>;

export async function getProjects(): Promise<Project[]> {
  const base = contentSource() === "firestore" ? path.join(exportDir(), "projects") : dir("content/projects");
  const files = await jsonFiles(base);
  // An export without projects (none written to Firestore yet) keeps the Git records.
  const from = files.length ? base : dir("content/projects");
  return Promise.all((await jsonFiles(from)).map(async (f) => ProjectSchema.parse(await readJson(path.join(from, f)))));
}

export async function projectWriteup(p: Project): Promise<{ html: string; toc: TocEntry[] } | null> {
  if (p.writeupBody) return renderMarkdown(p.writeupBody);
  if (!p.writeup) return null;
  if (!/^[a-z0-9-]+\.md$/.test(p.writeup)) throw new Error("Invalid project writeup path");
  return renderMarkdown(await fs.readFile(dir("content/case-studies", p.writeup), "utf8"));
}

/** Editable site copy: the exported siteSettings/public over content/site.json, field by field. */
export async function getSiteCopy(): Promise<SiteCopy> {
  const fallback = SiteCopySchema.parse(await readJson(dir("content/site.json")));
  if (contentSource() !== "firestore") return fallback;
  const file = path.join(exportDir(), "site.json");
  const stored = (await exists(file)) ? SiteCopySchema.partial().parse(await readJson(file)) : {};
  return SiteCopySchema.parse({ ...fallback, ...stored });
}

/**
 * The achievements and the ones pinned to Experience: the exported siteSettings/achievements when
 * CONTENT_SOURCE=firestore (its list when saved, else the Git list with the exported pins), else
 * content/achievements.json with content/achievement-settings.json.
 */
export async function getAchievementSettings(): Promise<Achievements> {
  const seed = z.array(AchievementSchema).parse(await readJson(dir("content/achievements.json")));
  const pins = z.object({ featuredIds: z.array(z.string()) }).parse(await readJson(dir("content/achievement-settings.json")));
  const exported = path.join(exportDir(), "achievements.json");
  const stored = contentSource() === "firestore" && (await exists(exported)) ? await readJson(exported) : {};
  return AchievementsSchema.parse({ achievements: seed, featuredIds: pins.featuredIds, ...stored });
}
export async function getAchievements() {
  return (await getAchievementSettings()).achievements;
}
/** Achievements pinned to Experience, in the order they were pinned. */
export async function getFeaturedAchievements() {
  const { achievements, featuredIds } = await getAchievementSettings();
  return featuredIds.flatMap((id) => achievements.filter((a) => a.id === id));
}

/** Work, education and skills: the exported siteSettings/experience when CONTENT_SOURCE=firestore,
 *  else content/experience.json. */
export async function getExperience(): Promise<Experience> {
  const exported = path.join(exportDir(), "experience.json");
  const file = contentSource() === "firestore" && (await exists(exported)) ? exported : dir("content/experience.json");
  return ExperienceSchema.parse(await readJson(file));
}

/** Asad's outfit: the exported siteSettings/wardrobe when CONTENT_SOURCE=firestore, else (or when
 *  missing or no longer in public/art/outfits/index.json) the wardrobe default. */
export async function getActiveOutfit(): Promise<string> {
  const exported = path.join(exportDir(), "wardrobe.json");
  if (contentSource() !== "firestore" || !(await exists(exported))) return DEFAULT_OUTFIT;
  return resolveOutfit((await readJson(exported)).activeOutfit);
}
