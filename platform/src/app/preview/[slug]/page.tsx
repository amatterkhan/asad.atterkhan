import { notFound } from "next/navigation";
import fs from "node:fs/promises";
import path from "node:path";
import { parseArticle } from "@/lib/content";
import { Article } from "@/components/Article";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Local draft preview",
  robots: { index: false, follow: false },
};
export default async function Preview({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { slug } = await params;
  if (!/^[a-z0-9-]+$/.test(slug)) notFound();
  const file =
    slug === "reading-layout"
      ? path.join(process.cwd(), "tests/fixtures/article.md")
      : path.join(process.cwd(), ".private-content/articles", slug + ".md");
  let source;
  try {
    source = await fs.readFile(file, "utf8");
  } catch {
    notFound();
  }
  return <Article article={parseArticle(source)} draft />;
}
