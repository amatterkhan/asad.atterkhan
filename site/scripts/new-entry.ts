import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

// `npm run new-entry -- <slug> "<title>"` writes content/drafts/<slug>.md with valid frontmatter.
// Drafts are private (gitignored); move the file to content/articles/ when it is finished, set
// status and disclosure, and commit it.
const root = path.resolve(import.meta.dirname, "..");
export function entryTemplate(title: string, today = new Date().toISOString().slice(0, 10)) {
  return `---
title: ${JSON.stringify(title)}
date: "${today}"
section: notes
summary: "One sentence on what this entry covers."
tags: []
status: draft
# unresolved | disclosed | no-vulnerability | redacted. The CI gate refuses "unresolved".
disclosure: unresolved
---

Write here.
`;
}
export async function createEntry(slug: string, title: string, base = root) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error("The slug uses lowercase letters, digits and hyphens");
  const file = path.join(base, "content/drafts", `${slug}.md`);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, entryTemplate(title), { flag: "wx" }).catch((e) => {
    throw e.code === "EEXIST" ? new Error(`${path.relative(base, file)} already exists`) : e;
  });
  return file;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [slug, ...title] = process.argv.slice(2);
  if (!slug || !title.length) {
    console.error('usage: npm run new-entry -- <slug> "<title>"');
    process.exit(2);
  }
  try {
    console.log(`created ${path.relative(process.cwd(), await createEntry(slug, title.join(" ")))}`);
  } catch (e) {
    console.error((e as Error).message);
    process.exit(1);
  }
}
