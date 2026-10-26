import fs from "node:fs/promises";
import path from "node:path";
import { parseArticle, getArticles, ArticleSchema } from "../src/lib/content";
const [command, slug] = process.argv.slice(2);
if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  console.error("Usage: npm run content -- new|publish|validate slug");
  process.exit(1);
}
const privateDir = path.join(process.cwd(), ".private-content/articles");
const file = path.join(privateDir, slug + ".md");
if (command === "new") {
  await fs.mkdir(privateDir, { recursive: true });
  await fs.writeFile(
    file,
    `---\ntitle: "Untitled note"\ndescription: "Add a short description."\nslug: ${slug}\nstatus: draft\ntags: []\n---\n\n## Start here\n\n`,
    { flag: "wx" },
  );
  console.log(
    `Draft saved privately: ${file}\nPreview locally at /preview/${slug}. Never commit confidential drafts to this public repository.`,
  );
} else if (command === "validate") {
  const article = parseArticle(await fs.readFile(file, "utf8"));
  ArticleSchema.parse(article);
  console.log("Valid " + article.status + " content. No files published.");
} else if (command === "publish") {
  if (!process.argv.includes("--confirm-public")) {
    console.error(
      "Publication copies this draft into the PUBLIC Git content directory. Review it first, then add --confirm-public.",
    );
    process.exit(1);
  }
  const article = parseArticle(await fs.readFile(file, "utf8"));
  if (article.status !== "published")
    throw new Error("Set status: published and publishedAt after review");
  if ((await getArticles()).some((a) => a.slug === slug))
    throw new Error(
      "Slug exists. Edit the existing public article rather than replacing it",
    );
  const target = path.join(process.cwd(), "content/articles", slug + ".md");
  await fs.writeFile(target, await fs.readFile(file), { flag: "wx" });
  console.log(
    "Public source prepared. Review the Git diff and build before merging. Nothing deployed.",
  );
} else {
  throw new Error("Unknown command");
}
