import { achievements } from "@/lib/achievements";
import { AchievementCollection } from "@/components/AchievementCollection";
import { RoomVignette } from "@/components/RoomVignette";
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
        Certifications and badges I&apos;ve picked up along the way, each
        linked to the original credential.
      </p>
      <RoomVignette corner="awards" />
      <AchievementCollection records={achievements} />
    </>
  );
}
