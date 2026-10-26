import Link from "next/link";
import { getArticles, getProjects } from "@/lib/content";
import { Room } from "@/components/Room";
import { site, date } from "@/lib/site";
import work from "../../content/workExpData.json";
import type { Metadata } from "next";
export const metadata: Metadata = { alternates: { canonical: "/" } };
export default async function Home() {
  const articles = (await getArticles()).slice(0, 3);
  const projects = (await getProjects())
    .filter((p) => p.featured)
    .sort((a, b) => b.date.localeCompare(a.date));
  const current = work.find((w) => w.isCurrent);
  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">Security analyst · Mauritius</p>
          <h1>
            Hey, I&apos;m <em>Asad.</em>
          </h1>
        </div>
        <div>
          <p className="lede">
            I build things, break things, and try to understand how they work.
          </p>
          <p className="hero-sub">
            By day I&apos;m a {current?.title} at {current?.company}, chasing
            alerts until they make sense. Off the clock it&apos;s small tools,
            half-finished experiments and a CS master&apos;s at Georgia Tech.
            Storm supervises all of it.
          </p>
        </div>
      </section>

      <Room />

      <ul className="room-index" aria-label="Site sections">
        {[
          ["/lab", "The Lab"],
          ["/workbench", "Workbench"],
          ["/experience", "Experience"],
          ["/achievements", "Achievements"],
          ["/about", "About"],
        ].map(([h, l]) => (
          <li key={h}>
            <Link href={h}>{l}</Link>
          </li>
        ))}
      </ul>

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
            Nothing published yet. The first notes are being written:
            experiments, write-ups, and the occasional dead end worth keeping.
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
          Got a question about something here, or just want to talk shop?
          Write to me at{" "}
          <a href={`mailto:${site.email}`}>{site.email}</a>
        </p>
        <p className="closing-links">
          <a href={site.github}>GitHub ↗</a>
          <a href={site.linkedin}>LinkedIn ↗</a>
          <Link href="/experience">Experience</Link>
          <Link href="/achievements">Achievements</Link>
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
