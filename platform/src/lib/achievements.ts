import { z } from "zod";
import records from "../../content/achievements.json";
import defaults from "../../content/achievement-settings.json";
export const AchievementSchema = z.object({
  id: z.string().min(1).max(80),
  kind: z.enum(["certification", "badge", "award"]),
  title: z.string().min(1).max(200),
  issuer: z.string().min(1).max(160),
  link: z
    .url()
    .refine(
      (url) => url.startsWith("https://"),
      "Use an HTTPS credential link",
    ),
  earnedAt: z.iso.date().optional(),
});
export type Achievement = z.infer<typeof AchievementSchema>;
export const achievements = z.array(AchievementSchema).parse(records);
export const FeaturedSchema = z
  .object({
    featuredIds: z
      .array(z.string())
      .max(6)
      .refine(
        (ids) => new Set(ids).size === ids.length,
        "Choose each achievement once",
      )
      .refine(
        (ids) =>
          ids.every((id) => achievements.some((record) => record.id === id)),
        "Unknown achievement",
      ),
  })
  .strict();
export const defaultFeatured = FeaturedSchema.parse(defaults);
export function selectFeatured(ids: string[]) {
  return ids.flatMap((id) => {
    const found = achievements.find((a) => a.id === id);
    return found ? [found] : [];
  });
}
