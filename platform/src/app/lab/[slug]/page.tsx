import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getArticles, getArticle } from "@/lib/content";
import { Article } from "@/components/Article";
export const dynamicParams = false;
export async function generateStaticParams() {
  return (await getArticles()).map((a) => ({ slug: a.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: `/lab/${slug}` },
    openGraph: {
      type: "article",
      title: article.title,
      description: article.description,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      images: [`/lab/${slug}/opengraph-image`],
    },
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();
  const related = (await getArticles())
    .filter(
      (a) => a.slug !== slug && a.tags.some((t) => article.tags.includes(t)),
    )
    .slice(0, 3);
  return (
    <>
      <Article article={article} />
      {related.length > 0 && (
        <section className="related">
          <h2>Nearby in The Lab</h2>
          {related.map((a) => (
            <a key={a.slug} href={`/lab/${a.slug}`}>
              {a.title}
            </a>
          ))}
        </section>
      )}
    </>
  );
}
