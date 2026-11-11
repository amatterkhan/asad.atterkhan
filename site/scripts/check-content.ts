import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { EntryError, gateProblems, lintBody, lintSvg, parseEntry } from "../src/lib/entries";

// The publication gate (docs/decisions/0005). Every Markdown file in content/articles/ is public, so
// each must parse, be published or archived, have its disclosure decided, and pass the content lint;
// every SVG under content/ and public/ must carry no script or external reference. Returns the
// problems (one line each, file first) instead of throwing so a run reports all of them.
export async function checkContent(root: string): Promise<string[]> {
  const problems: string[] = [];
  const articles = path.join(root, "content/articles");
  for (const f of (await fs.readdir(articles).catch(() => [] as string[])).filter((x) => x.endsWith(".md")).sort()) {
    const file = `content/articles/${f}`;
    try {
      const { entry, body } = parseEntry(await fs.readFile(path.join(articles, f), "utf8"), file);
      for (const p of [...gateProblems(entry), ...lintBody(body)]) problems.push(`${file}: ${p}`);
    } catch (e) {
      if (e instanceof EntryError) problems.push(e.message);
      else throw e;
    }
  }
  for (const top of ["content", "public"]) {
    for (const rel of await walk(path.join(root, top))) {
      if (!rel.endsWith(".svg") || rel.split(path.sep).includes("drafts")) continue;
      for (const p of lintSvg(await fs.readFile(path.join(root, top, rel), "utf8"))) problems.push(`${top}/${rel}: ${p}`);
    }
  }
  return problems;
}
async function walk(dir: string, rel = ""): Promise<string[]> {
  const out: string[] = [];
  for (const e of await fs.readdir(path.join(dir, rel), { withFileTypes: true }).catch(() => [])) {
    const r = path.join(rel, e.name);
    if (e.isDirectory()) out.push(...(await walk(dir, r)));
    else out.push(r);
  }
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const problems = await checkContent(path.resolve(import.meta.dirname, ".."));
  if (problems.length) {
    console.error(problems.join("\n"));
    console.error(`\ncontent check failed: ${problems.length} problem${problems.length === 1 ? "" : "s"}`);
    process.exit(1);
  }
  console.log("content check passed");
}
