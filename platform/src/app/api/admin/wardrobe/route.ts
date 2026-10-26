import {
  requireOwner,
  limitedBody,
  consumeQuota,
  apiError,
  audit,
} from "@/lib/admin";
import { DEFAULT_OUTFIT, outfits, resolveOutfit } from "@/lib/outfits";
import { json, revalidate, WARDROBE_PATHS, WardrobeInputSchema } from "../_lib/content";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Asad's active outfit in siteSettings/wardrobe (docs/admin-contract.md §4). Outfits themselves are
// files in public/art/outfits/; this only picks one. A stored id that is no longer in the index
// reads as the default.
export async function GET(req: Request) {
  try {
    const { db, uid } = await requireOwner(req, { service: "content" });
    await consumeQuota(db, uid + ":content-read", 1000);
    const doc = await db.collection("siteSettings").doc("wardrobe").get();
    const updatedAt = doc.get("updatedAt");
    return json({
      outfits,
      defaultOutfit: DEFAULT_OUTFIT,
      activeOutfit: resolveOutfit(doc.get("activeOutfit")),
      ...(typeof updatedAt === "string" ? { updatedAt } : {}),
    });
  } catch (error) {
    return apiError(error);
  }
}
export async function PUT(req: Request) {
  try {
    const { db, uid } = await requireOwner(req, { service: "content" });
    const { activeOutfit } = WardrobeInputSchema.parse(
      JSON.parse((await limitedBody(req, 4096)).toString("utf8")),
    );
    await consumeQuota(db, uid + ":content-write", 500);
    const updatedAt = new Date().toISOString();
    await db
      .collection("siteSettings")
      .doc("wardrobe")
      .set({ activeOutfit, ownerUid: uid, updatedAt });
    audit("wardrobe_outfit_selected", activeOutfit);
    revalidate(WARDROBE_PATHS);
    return json({ activeOutfit, updatedAt });
  } catch (error) {
    return apiError(error);
  }
}
