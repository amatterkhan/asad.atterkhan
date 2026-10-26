import fs from "node:fs/promises";
import path from "node:path";
import {
  requireOwner,
  limitedBody,
  consumeQuota,
  apiError,
  audit,
} from "@/lib/admin";
import { SiteCopySchema } from "@/lib/content";
import {
  json,
  revalidate,
  SITE_PATHS,
  SiteCopyInputSchema,
} from "../_lib/content";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Editable site copy in siteSettings/public (docs/admin-contract.md §1). Until the owner saves,
// GET returns content/site.json so the editor starts from what the site shows.
export async function GET(req: Request) {
  try {
    const { db, uid } = await requireOwner(req, { service: "content" });
    await consumeQuota(db, uid + ":content-read", 1000);
    const fallback = SiteCopySchema.parse(
      JSON.parse(
        await fs.readFile(path.join(process.cwd(), "content/site.json"), "utf8"),
      ),
    );
    const doc = await db.collection("siteSettings").doc("public").get();
    const stored = doc.exists ? SiteCopySchema.partial().parse(doc.data()) : {};
    const updatedAt = doc.get("updatedAt");
    return json({
      ...fallback,
      ...stored,
      ...(typeof updatedAt === "string" ? { updatedAt } : {}),
    });
  } catch (error) {
    return apiError(error);
  }
}
export async function PUT(req: Request) {
  try {
    const { db, uid } = await requireOwner(req, { service: "content" });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { updatedAt: _ignored, ...copy } = SiteCopyInputSchema.parse(
      JSON.parse((await limitedBody(req, 64 * 1024)).toString("utf8")),
    );
    await consumeQuota(db, uid + ":content-write", 500);
    const updatedAt = new Date().toISOString();
    await db
      .collection("siteSettings")
      .doc("public")
      .set({ ...copy, ownerUid: uid, updatedAt });
    audit("site_copy_updated", "public");
    revalidate(SITE_PATHS);
    return json({ ...copy, updatedAt });
  } catch (error) {
    return apiError(error);
  }
}
