import { getSiteCopy } from "@/lib/content";
import { achievements } from "@/lib/achievements";
import { AchievementCollection } from "@/components/AchievementCollection";
import { RoomVignette } from "@/components/RoomVignette";
export const metadata = {
  title: "Achievements",
  description: "Certifications, badges, and other milestones — Asad Atterkhan.",
  alternates: { canonical: "/achievements" },
};
export default async function Achievements() {
  const copy = await getSiteCopy();
  return (
    <>
      <p className="eyebrow">Credentials &amp; milestones</p>
      <h1>Achievements</h1>
      <p className="page-intro">{copy.achievementsIntro}</p>
      <RoomVignette corner="awards" />
      <AchievementCollection records={achievements} />
    </>
  );
}
