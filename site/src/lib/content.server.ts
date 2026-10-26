import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import {
  AchievementSchema,
  ArticleSchema,
  EducationSchema,
  ProjectSchema,
  RoleSchema,
  SiteCopySchema,
  SkillsSchema,
  featuredSchema,
  type Article,
  type ArticleMeta,
  type Project,
  type SiteCopy,
} from "./schemas";
import { renderMarkdown, type TocEntry } from "./markdown";

// Build-time content gateway (Node only). CONTENT_SOURCE=git (default) reads reviewed files in
// content/; CONTENT_SOURCE=firestore reads the snapshot written by `go run ./cmd/export` (published
// articles, projects, site copy and the Experience selection) and falls back to content/ for the
// rest. Both go through the same zod schemas, so a bad record fails the build.

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
  return articles
    .filter((a) => a.status === "published")
    .sort((a, b) => b.publishedAt!.localeCompare(a.publishedAt!));
}

export function articleSummary(article: Article) {
  return {
    title: article.title,
    description: article.description,
    slug: article.slug,
    tags: article.tags,
    category: article.category,
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt,
    readingMinutes: article.readingMinutes,
    searchText: article.searchText,
  };
}
export type ArticleSummary = ReturnType<typeof articleSummary>;

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
