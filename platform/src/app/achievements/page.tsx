import { achievements } from "@/lib/achievements";
import { AchievementCollection } from "@/components/AchievementCollection";
export const metadata = {
  title: "Achievements",
  description: "Certifications, badges, and other milestones — Asad Atterkhan.",
  alternates: { canonical: "/achievements" },
};
export default function Achievements() {
  return (
    <>
      <p className="eyebrow">Credentials &amp; milestones</p>
      <h1>Achievements</h1>
      <p className="page-intro">
        Certifications, badges, and milestones along the way.
        <br />A growing collection, with links to the original credentials.
      </p>
      <AchievementCollection records={achievements} />
    </>
  );
}
