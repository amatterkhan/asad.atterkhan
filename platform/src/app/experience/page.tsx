import Link from "next/link";
import { PrintButton } from "@/components/PrintButton";
import { groupExperience } from "@/lib/experience";
import { getAchievementSettings } from "@/lib/achievement-settings";
import { selectFeatured } from "@/lib/achievements";
import work from "../../../content/workExpData.json";
import education from "../../../content/educationData.json";
import skills from "../../../content/commandsData.json";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Experience",
  description:
    "Career, education, and selected certifications — Asad Atterkhan.",
  alternates: { canonical: "/experience" },
};
export default async function Experience() {
  const featured = selectFeatured((await getAchievementSettings()).featuredIds);
  return (
    <>
      <p className="eyebrow">Work &amp; education</p>
      <div className="section-head">
        <h1>Experience</h1>
        <PrintButton />
      </div>
      <p className="page-intro">
        From software and IT operations to security engineering. The work
        connects.
      </p>
      <section className="career-section">
        <h2>Where I’ve worked</h2>
        {groupExperience(work).map((group) => (
          <article className="company-group" key={group.roles[0].id}>
            <header>
              <h3>{group.company}</h3>
              <p className="meta">{group.dates}</p>
            </header>
            <ol className="role-timeline">
              {group.roles.map((role) => (
                <li
                  key={role.id}
                  className={role.isCurrent ? "current-role" : ""}
                >
                  <div className="role-heading">
                    <h4>{role.title}</h4>
                    {role.isCurrent && (
                      <span className="current-label">Current</span>
                    )}
                  </div>
                  <p className="meta">
                    {role.dateRange}
                    {role.promotionFrom !== undefined && (
                      <span className="progression-note"> · Internal move</span>
                    )}
                  </p>
                  <p className="role-summary">{role.responsibilities[0]}</p>
                  <details className="role-details">
                    <summary>More about this role</summary>
                    <ul>
                      {role.responsibilities.slice(1).map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </details>
                </li>
              ))}
            </ol>
          </article>
        ))}
      </section>
      <section className="resume-section education-section">
        <h2>Education</h2>
        {education.map((e) => (
          <article className="education-entry" key={e.degree}>
            <div>
              <h3>
                {e.degree} · {e.field}
              </h3>
              <p>
                <a href={e.degreeLink}>{e.university} ↗</a>
              </p>
            </div>
            <div>
              <p className="meta">
                {e.isGraduated ? e.graduationDate : "In progress"}
              </p>
              <p>{e.classification}</p>
            </div>
          </article>
        ))}
      </section>
      <section className="resume-section">
        <div className="section-head">
          <h2>Certifications</h2>
          <Link href="/achievements">All achievements →</Link>
        </div>
        {featured.length ? (
          <ul className="featured-credentials">
            {featured.map((c) => (
              <li key={c.id}>
                <a href={c.link}>{c.title} ↗</a>
                <span>{c.issuer}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="quiet-note">
            The full collection is on the achievements page.
          </p>
        )}
      </section>
      <section className="resume-section">
        <h2>Technical experience</h2>
        <dl className="skills">
          {skills.skills.map((s) => (
            <div key={s.category}>
              <dt>{s.category}</dt>
              <dd>{s.items}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
