import Link from "next/link";
import { getArticles, getProjects } from "@/lib/content";
import { SpriteScene } from "@/components/Sprites";
import { site, date } from "@/lib/site";
import work from "../../content/workExpData.json";
import { selectFeatured, defaultFeatured } from "@/lib/achievements";
import type { Metadata } from "next";
export const metadata: Metadata = { alternates: { canonical: "/" } };
export default async function Home() {
  const articles = (await getArticles()).slice(0, 3);
  const projects = (await getProjects())
    .filter((p) => p.featured)
    .sort((a, b) => b.date.localeCompare(a.date));
  const current = work.find((w) => w.isCurrent);
  const credentials = selectFeatured(defaultFeatured.featuredIds).slice(0, 2);
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Security analyst &amp; engineer · Mauritius</p>
          <h1>
            Hey, I&apos;m <em>Asad.</em>
          </h1>
          <p className="lede">
            I build things, break things, and try to understand how they work.
          </p>
          <p className="hero-sub">
            Most days that means security operations, cloud and infrastructure,
            and a lot of small tools. I write down what I learn in{" "}
            <Link href="/lab">The Lab</Link> and keep what I make on the{" "}
            <Link href="/workbench">Workbench</Link>.
          </p>
        </div>
        <SpriteScene />
      </section>

      <p className="now">
        <span className="now-dot" aria-hidden="true" />
        Right now: {current?.title} at {current?.company}, a Master&apos;s in
        Computer Science at Georgia Tech, and Storm supervising from the
        windowsill.
      </p>

      <section className="block">
        <header className="block-head">
          <h2>From The Lab</h2>
          <Link href="/lab">All notes →</Link>
        </header>
        {articles.length ? (
          <ul className="plain-list">
            {articles.map((a) => (
              <li key={a.slug}>
                <time dateTime={a.publishedAt}>{date(a.publishedAt!)}</time>
                <Link href={`/lab/${a.slug}`}>{a.title}</Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="quiet-note">
            The notebook is open, and the first notes are on the way. Experiments,
            write-ups and the occasional dead end.
          </p>
        )}
      </section>

      <section className="block">
        <header className="block-head">
          <h2>On the Workbench</h2>
          <Link href="/workbench">All projects →</Link>
        </header>
        <ol className="showcase">
          {projects.map((p, i) => (
            <li key={p.slug}>
              <span className="num" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3>
                  <Link href={`/workbench/${p.slug}`}>{p.title}</Link>
                </h3>
                <p>{p.description}</p>
                <p className="stack">{p.tags.join(" · ")}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="block closing">
        <h2>Say hello</h2>
        <p>
          If something here sparked a question, I&apos;d like to hear it.{" "}
          <a href={`mailto:${site.email}`}>{site.email}</a>
        </p>
        <p className="closing-links">
          <a href={site.github}>GitHub ↗</a>
          <a href={site.linkedin}>LinkedIn ↗</a>
          <Link href="/experience">Experience</Link>
          <Link href="/achievements">
            {credentials.length ? "Achievements" : "Achievements"}
          </Link>
        </p>
      </section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Person",
            name: site.name,
            url: site.url,
            sameAs: [site.github, site.linkedin],
          }).replace(/</g, "\\u003c"),
        }}
      />
    </>
  );
}
