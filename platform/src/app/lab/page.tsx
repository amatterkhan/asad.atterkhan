import type { Metadata } from "next";
import Link from "next/link";
import { getArticles, articleSummary } from "@/lib/content";
import { LabSearch } from "@/components/LabSearch";
import { StormSprite } from "@/components/Sprites";
export const metadata: Metadata = {
  title: "The Lab",
  description: "Experiments, technical notes, and things Asad is figuring out.",
  alternates: { canonical: "/lab" },
};
export default async function Lab() {
  const articles = await getArticles();
  return (
    <>
      <div className="lab-heading">
        <div>
          <p className="eyebrow">Technical journal</p>
          <h1>The Lab</h1>
          <p>
            Experiments, useful notes, and things I&apos;m figuring out.
            <br />A technical journal, with room for the unfinished questions.
          </p>
        </div>
        <div className="lab-companion">
          <p className="scene-note">
            Good ideas are
            <br />
            better with coffee.
          </p>
          <StormSprite animation="sleeping" />
          <span className="sleep-mark" aria-hidden="true">
            z Z
          </span>
        </div>
      </div>
      <LabSearch articles={articles.map(articleSummary)}>
        {process.env.NODE_ENV === "development" && (
          <div className="local-drafts">
            <p className="draft-label">LOCAL PREVIEW · NOT PUBLISHED</p>
            <article className="entry lab-entry">
              <div className="project-mark" aria-hidden="true">
                <span>&gt;_</span>
                <small>Markdown</small>
              </div>
              <div>
                <h2>
                  <Link href="/preview/reading-layout">
                    A notebook needs room for the details →
                  </Link>
                </h2>
                <p>
                  An unpublished layout sample with code, tables, diagrams, and
                  technical notes.
                </p>
                <div className="tag-list">
                  <span>Draft</span>
                  <span>Code</span>
                  <span>Notes</span>
                </div>
              </div>
            </article>
            <p className="quiet-note">
              No published notes yet. This sample is only available in local
              development.
            </p>
          </div>
        )}
      </LabSearch>
    </>
  );
}
