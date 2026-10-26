import { ArticleControls } from "@/components/ArticleControls";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getProjects, getProjectWriteup, renderArticle } from "@/lib/content";
// New records from the content source render on first request; unknown slugs still 404.
export const dynamicParams = true;
export async function generateStaticParams() {
  return (await getProjects()).map((p) => ({ slug: p.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = (await getProjects()).find((p) => p.slug === slug);
  return {
    title: p?.title,
    description: p?.description,
    alternates: { canonical: `/workbench/${slug}` },
  };
}
export default async function Project({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = (await getProjects()).find((p) => p.slug === slug);
  if (!p) notFound();
  const writeup = p.writeupBody
    ? await renderArticle(p.writeupBody)
    : p.writeup
      ? await getProjectWriteup(p.writeup)
      : null;
  return (
    <>
      <div className="path">
        <Link href="/workbench">Workbench</Link> · {p.categories[0]}
      </div>
      <h1>{p.title}</h1>
      <p className="opening">{p.description}</p>
      <div className="tags">{p.categories.join(" / ")}</div>
      <div className="text-links">
        {p.links.map((l) => (
          <a key={l.url} href={l.url} rel="noopener noreferrer">
            {l.type === "Code" ? "Source code" : l.type} ↗
          </a>
        ))}
      </div>
      <section className="section project-facts">
        <h2>Project notes</h2>
        <dl>
          <div>
            <dt>Technologies</dt>
            <dd>{p.tags.join(", ")}</dd>
          </div>
          <div>
            <dt>Type</dt>
            <dd>{p.categories[0]}</dd>
          </div>
        </dl>
      </section>
      {writeup && (
        <article className="prose project-writeup" data-article>
          <div dangerouslySetInnerHTML={{ __html: writeup.html }} />
          <ArticleControls />
        </article>
      )}
      <Link href="/workbench">← Back to the Workbench</Link>
    </>
  );
}
