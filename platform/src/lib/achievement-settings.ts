import "server-only";
import { firebaseAdmin } from "./firebase-admin";
import { defaultFeatured, FeaturedSchema } from "./achievements";
export async function getAchievementSettings() {
  if (process.env.ENABLE_ACHIEVEMENT_ADMIN !== "true") return defaultFeatured;
  const doc = await firebaseAdmin()
    .db.collection("siteSettings")
    .doc("achievements")
    .get();
  return doc.exists
    ? FeaturedSchema.parse({ featuredIds: doc.get("featuredIds") })
    : defaultFeatured;
}
