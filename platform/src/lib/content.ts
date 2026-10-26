import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSanitize from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import rehypePrettyCode from "rehype-pretty-code";
export const ArticleSchema = z
  .object({
    title: z.string().min(1).max(160),
    description: z.string().min(1).max(300),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    status: z.enum(["draft", "published"]),
    publishedAt: z.string().date().optional(),
    updatedAt: z.string().date().optional(),
    tags: z.array(z.string().min(1).max(40)).max(12).default([]),
    category: z.string().max(50).optional(),
    featured: z.boolean().default(false),
  })
  .superRefine((a, ctx) => {
    if (
      a.status === "published" &&
      (!a.publishedAt || new Date(a.publishedAt) > new Date())
    )
      ctx.addIssue({
        code: "custom",
        message: "Published articles need a non-future publication date",
      });
    if (a.updatedAt && a.publishedAt && a.updatedAt < a.publishedAt)
      ctx.addIssue({
        code: "custom",
        message: "Update cannot precede publication",
      });
  });
export type Article = z.infer<typeof ArticleSchema> & {
  body: string;
  readingMinutes: number;
  searchText: string;
};
export function parseArticle(source: string): Article {
  const { data, content } = matter(source);
  return withDerived(ArticleSchema.parse(data), content);
}
/** Adds reading time and search text to validated metadata (shared by every content source). */
export function withDerived(meta: z.infer<typeof ArticleSchema>, content: string): Article {
  return {
    ...meta,
    body: content,
    readingMinutes: Math.max(
      1,
      Math.ceil(content.trim().split(/\s+/).length / 220),
    ),
    searchText: content
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/[#*`\[\]>]/g, " ")
      .slice(0, 120000),
  };
}
/** Where public content comes from: "git" (default, reviewed files in content/) or "firestore". */
export const contentSource = () =>
  process.env.CONTENT_SOURCE === "firestore" ? "firestore" : "git";

export async function getArticles(): Promise<Article[]> {
  const articles =
    contentSource() === "firestore"
      ? await (await import("./content-firestore")).firestoreArticles()
      : await gitArticles();
  const slugs = new Set<string>();
  for (const a of articles) {
    if (slugs.has(a.slug)) throw new Error("Duplicate article slug");
    slugs.add(a.slug);
  }
  return articles
    .filter((a) => a.status === "published")
    .sort((a, b) => b.publishedAt!.localeCompare(a.publishedAt!));
}
async function gitArticles(): Promise<Article[]> {
  const base = path.join(process.cwd(), "content/articles");
  const files = (await fs.readdir(base)).filter((f) => f.endsWith(".md"));
  return Promise.all(
    files.map(async (f) =>
      parseArticle(await fs.readFile(path.join(base, f), "utf8")),
    ),
  );
}
export async function getArticle(slug: string) {
  return (await getArticles()).find((a) => a.slug === slug);
}
type Node = {
  type?: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: Node[];
};
const text = (n: Node): string =>
  n.value || (n.children || []).map(text).join("");
function enhance() {
  return (tree: Node) => {
    function walk(node: Node) {
      node.children = node.children?.map((child) => {
        if (child.tagName === "table")
          return {
            type: "element",
            tagName: "div",
            properties: {
              className: ["table-wrap"],
              tabIndex: 0,
              role: "region",
              ariaLabel: "Table, horizontally scrollable",
            },
            children: [child],
          };
        if (
          child.tagName === "pre" &&
          String(child.children?.[0]?.properties?.className).includes(
            "language-flow",
          )
        ) {
          const nodes = text(child)
            .trim()
            .split("->")
            .map((n) => n.trim());
          if (
            nodes.length > 1 &&
            nodes.length <= 10 &&
            nodes.every((n) => n.length <= 80)
          ) {
            return {
              type: "element",
              tagName: "figure",
              properties: {
                className: ["flow-diagram"],
                ariaLabel: "Flow diagram",
              },
              children: [
                {
                  type: "element",
                  tagName: "ol",
                  properties: {},
                  children: nodes.map((label) => ({
                    type: "element",
                    tagName: "li",
                    properties: {},
                    children: [{ type: "text", value: label }],
                  })),
                },
              ],
            };
          }
        }
        if (child.tagName === "img") {
          child.properties = {
            ...child.properties,
            loading: "lazy",
            decoding: "async",
          };
        }
        walk(child);
        return child;
      });
    }
    walk(tree);
  };
}
export async function renderArticle(body: string) {
  const toc: { id: string; title: string; depth: number }[] = [];
  const collect = () => (tree: Node) => {
    function walk(n: Node) {
      if (/^h[23]$/.test(n.tagName || ""))
        toc.push({
          id: String(n.properties?.id),
          title: text(n),
          depth: Number(n.tagName![1]),
        });
      n.children?.forEach(walk);
    }
    walk(tree);
  };
  const html = String(
    await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype)
      .use(rehypeSanitize)
      .use(rehypeSlug)
      .use(enhance)
      .use(collect)
      .use(rehypePrettyCode, {
        // follows the site theme: CSS picks --shiki-dark or --shiki-light per span
        theme: { dark: "everforest-dark", light: "everforest-light" },
        keepBackground: false,
      })
      .use(rehypeStringify)
      .process(body),
  );
  return { html, toc };
}
export async function getProjects(): Promise<(Project & { writeupBody?: string })[]> {
  if (contentSource() === "firestore")
    return (await import("./content-firestore")).firestoreProjects();
  const dir = path.join(process.cwd(), "content/projects");
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".json"));
  return Promise.all(
    files.map(async (f) => {
      const data = JSON.parse(await fs.readFile(path.join(dir, f), "utf8"));
      return ProjectSchema.parse(data);
    }),
  );
}
export const ProjectSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  description: z.string(),
  date: z.string().date(),
  categories: z.array(z.string()),
  tags: z.array(z.string()),
  featured: z.boolean(),
  writeup: z
    .string()
    .regex(/^[a-z0-9-]+\.md$/)
    .optional(),
  links: z.array(
    z.object({
      type: z.string(),
      url: z.url().refine((u) => u.startsWith("https://")),
    }),
  ),
});

export type Project = z.infer<typeof ProjectSchema>;

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

export async function getProjectWriteup(file: string) {
  if (!/^[a-z0-9-]+\.md$/.test(file))
    throw new Error("Invalid project writeup path");
  return renderArticle(
    await fs.readFile(
      path.join(process.cwd(), "content/case-studies", file),
      "utf8",
    ),
  );
}
