import type { Metadata } from "next";
import Link from "next/link";
import { getArticles, articleSummary } from "@/lib/content";
import { LabSearch } from "@/components/LabSearch";
import { StormSprite } from "@/components/Sprites";
import { RoomVignette, At } from "@/components/RoomVignette";
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
            Experiments, useful notes, and things I&apos;m figuring out. A
            technical journal, with room for the unfinished questions.
          </p>
        </div>
      </div>
      <RoomVignette corner="lab">
        <At x={236} y={66}>
          <div className="storm">
            <StormSprite animation="sleeping" size={64} />
            <span className="sleep-mark">z Z</span>
          </div>
        </At>
      </RoomVignette>
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
