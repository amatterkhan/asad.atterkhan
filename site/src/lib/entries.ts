import matter from "gray-matter";
import { EntrySchema, type Entry } from "./schemas";

// Pure checks on a Lab entry file: frontmatter, the publication gate, and the content lint. No file
// access here, so every rule has a small fixture in tests/unit/entries.test.ts. scripts/check-content.ts
// walks the tracked files and applies them; the build runs the same walk.

export class EntryError extends Error {
  constructor(
    readonly file: string,
    message: string,
  ) {
    super(`${file}: ${message}`);
  }
}

/** Frontmatter and body of one entry. Fails with the file name and the field. */
export function parseEntry(source: string, file: string): { entry: Entry; body: string; slug: string } {
  const slug = file.replace(/^.*\//, "").replace(/\.md$/, "");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new EntryError(file, `file name "${slug}" is not a valid slug (lowercase letters, digits, hyphens)`);
  let parsed;
  try {
    parsed = matter(source);
  } catch (e) {
    throw new EntryError(file, `frontmatter is not valid YAML (${(e as Error).message.split("\n")[0]})`);
  }
  // YAML reads an unquoted 2026-01-01 as a date; accept it as the ISO day it means.
  const data: Record<string, unknown> = { ...parsed.data };
  for (const k of ["date", "updated"]) if (data[k] instanceof Date) data[k] = (data[k] as Date).toISOString().slice(0, 10);
  const result = EntrySchema.safeParse(data);
  if (!result.success)
    throw new EntryError(
      file,
      result.error.issues.map((i) => `${i.path.join(".") || "frontmatter"}: ${i.message}`).join("; "),
    );
  return { entry: result.data, body: parsed.content, slug };
}

/** The CI gate. A tracked entry is public, so it must be finished and cleared for disclosure. */
export function gateProblems(entry: Pick<Entry, "status" | "disclosure">): string[] {
  const out: string[] = [];
  if (entry.status === "draft") out.push('status is "draft": drafts belong in content/drafts/ (private), not in the public repository');
  if (entry.disclosure === "unresolved") out.push('disclosure is "unresolved": decide it before the entry is committed here');
  return out;
}

const SCRIPTY = [
  [/<\s*script\b/i, "a <script> element"],
  [/\bjavascript\s*:/i, "a javascript: link"],
  [/\son[a-z]+\s*=/i, "an inline event handler"],
  [/<\s*(iframe|object|embed|link|meta|base|form)\b/i, "an element the CSP or the sanitiser would block"],
  [/\bdata\s*:\s*(text\/html|application\/)/i, "a data: document"],
] as const;

/** Content lint on a Markdown body: what the CSP (`img-src 'self' data: blob:`) or the sanitiser would break at runtime. */
export function lintBody(body: string): string[] {
  const out: string[] = [];
  // Ignore fenced and inline code: writing about `<script>` is fine.
  const prose = body.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, " ").replace(/`[^`\n]*`/g, " ");
  for (const m of prose.matchAll(/!\[[^\]]*\]\(\s*<?([^)\s>]+)/g)) if (isForeign(m[1])) out.push(`image from another origin: ${m[1]}`);
  for (const m of prose.matchAll(/<\s*img\b[^>]*\bsrc\s*=\s*["']?([^"'\s>]+)/gi)) if (isForeign(m[1])) out.push(`image from another origin: ${m[1]}`);
  for (const m of prose.matchAll(/^\s*\[[^\]]+\]:\s*(\S+)/gm)) if (/\.(png|jpe?g|gif|webp|svg|avif)(\?|$)/i.test(m[1]) && isForeign(m[1])) out.push(`image from another origin: ${m[1]}`);
  for (const [re, what] of SCRIPTY) if (re.test(prose)) out.push(`contains ${what}`);
  return [...new Set(out)];
}
const isForeign = (src: string) => /^(https?:)?\/\//i.test(src) || /^(ftp|file):/i.test(src);

/** Lint an SVG file: script, event handlers, foreign or external references. */
export function lintSvg(svg: string): string[] {
  const out: string[] = [];
  if (/<\s*script\b/i.test(svg)) out.push("SVG contains a <script> element");
  if (/\son[a-z]+\s*=/i.test(svg)) out.push("SVG contains an event handler");
  if (/<\s*foreignObject\b/i.test(svg)) out.push("SVG contains a foreignObject");
  if (/<\s*(iframe|object|embed|animate|set)\b/i.test(svg)) out.push("SVG contains an active element (iframe, object, embed, animate or set)");
  if (/\b(?:xlink:)?href\s*=\s*["']\s*javascript:/i.test(svg)) out.push("SVG contains a javascript: link");
  for (const m of svg.matchAll(/(?:xlink:)?href\s*=\s*["']([^"']+)["']/gi)) if (!m[1].startsWith("#")) out.push(`SVG references ${m[1]} (only #fragment references are allowed)`);
  for (const m of svg.matchAll(/url\(\s*["']?([^)"']+)/gi)) if (!m[1].startsWith("#")) out.push(`SVG references ${m[1]} through url()`);
  if (/@import/i.test(svg)) out.push("SVG imports a stylesheet");
  return [...new Set(out)];
}
