import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import {
  AchievementSchema,
  ArticleSchema,
  EducationSchema,
  LabSchema,
  ProjectSchema,
  RoleSchema,
  SiteCopySchema,
  SkillsSchema,
  ThoughtsSchema,
  featuredSchema,
  type Article,
  type ArticleMeta,
  type Lab,
  type Project,
  type SiteCopy,
} from "./schemas";
import { renderMarkdown, type TocEntry } from "./markdown";
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
export function parseArticle(source: string): Article {
  const { data, content } = matter(source);
  return withDerived(ArticleSchema.parse(data), content);
}

async function gitArticles(): Promise<Article[]> {
  const base = dir("content/articles");
  const files = (await fs.readdir(base)).filter((f) => f.endsWith(".md")).sort();
  return Promise.all(files.map(async (f) => parseArticle(await fs.readFile(path.join(base, f), "utf8"))));
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
  const articles = contentSource() === "firestore" ? await exportedArticles() : await gitArticles();
  const slugs = new Set<string>();
  for (const a of articles) {
    if (slugs.has(a.slug)) throw new Error("Duplicate article slug");
    slugs.add(a.slug);
  }
  const lab = await getLab();
  const published = articles
    .filter((a) => a.status === "published")
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
const thumbDir = () => (contentSource() === "firestore" ? path.join(exportDir(), "thumbnails") : dir("content/thumbnails"));
const thumbs = new Map<string, string>();
export async function thumbnailUrl(file?: string): Promise<string | undefined> {
  if (!file) return undefined;
  const source = path.join(thumbDir(), file);
  const bytes = await fs.readFile(source).catch(() => {
    throw new Error(`Thumbnail ${file} is missing from ${thumbDir()}`);
  });
  const name = createHash("sha256").update(bytes).digest("hex").slice(0, 16) + path.extname(file);
  thumbs.set(name, source);
  return `/lab-media/${name}`;
}
/** Public thumbnail name to source file, for every thumbnail resolved so far. */
export const thumbnailSources = () => thumbs;

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

export async function getAchievements() {
  return z.array(AchievementSchema).parse(await readJson(dir("content/achievements.json")));
}

/** Achievements chosen for Experience: the exported siteSettings/achievements, else the Git seed. */
export async function getFeaturedAchievements() {
  const achievements = await getAchievements();
  const schema = featuredSchema(achievements);
  const exported = path.join(exportDir(), "achievements.json");
  const settings =
    contentSource() === "firestore" && (await exists(exported))
      ? schema.parse(await readJson(exported))
      : schema.parse(await readJson(dir("content/achievement-settings.json")));
  return settings.featuredIds.flatMap((id) => achievements.filter((a) => a.id === id));
}

export async function getExperience() {
  return {
    work: z.array(RoleSchema).parse(await readJson(dir("content/workExpData.json"))),
    education: z.array(EducationSchema).parse(await readJson(dir("content/educationData.json"))),
    skills: SkillsSchema.parse(await readJson(dir("content/commandsData.json"))).skills,
  };
}

/** Asad's outfit: the exported siteSettings/wardrobe when CONTENT_SOURCE=firestore, else (or when
 *  missing or no longer in public/art/outfits/index.json) the wardrobe default. */
export async function getActiveOutfit(): Promise<string> {
  const exported = path.join(exportDir(), "wardrobe.json");
  if (contentSource() !== "firestore" || !(await exists(exported))) return DEFAULT_OUTFIT;
  return resolveOutfit((await readJson(exported)).activeOutfit);
}
