import {
  requireOwner,
  limitedBody,
  consumeQuota,
  apiError,
  audit,
} from "@/lib/admin";
import {
  achievements,
  FeaturedSchema,
  defaultFeatured,
} from "@/lib/achievements";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    const { db, uid } = await requireOwner(req, { service: "achievements" });
    await consumeQuota(db, uid + ":achievements-read", 500);
    const doc = await db.collection("siteSettings").doc("achievements").get();
    const settings = doc.exists
      ? FeaturedSchema.parse({ featuredIds: doc.get("featuredIds") })
      : defaultFeatured;
    return Response.json(
      { achievements, ...settings },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function PATCH(req: Request) {
  try {
    const { db, uid } = await requireOwner(req, { service: "achievements" });
    const settings = FeaturedSchema.parse(
      JSON.parse((await limitedBody(req, 4096)).toString()),
    );
    await consumeQuota(db, uid + ":achievements-write", 100);
    await db
      .collection("siteSettings")
      .doc("achievements")
      .set({ ...settings, ownerUid: uid, updatedAt: new Date().toISOString() });
    audit("experience_achievements_selected", "achievements");
    return Response.json(settings, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
