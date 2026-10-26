import {
  requireOwner,
  limitedBody,
  consumeQuota,
  apiError,
  audit,
  HttpError,
} from "@/lib/admin";
import {
  ArticleUpdateSchema,
  defined,
  json,
  MAX_BODY,
  ownedDraft,
  SlugSchema,
  type ArticleDraft,
} from "../../_lib/content";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Params = { params: Promise<{ slug: string }> };
export async function GET(req: Request, { params }: Params) {
  try {
    const { db, uid } = await requireOwner(req, { service: "content" });
    await consumeQuota(db, uid + ":content-read", 1000);
    const slug = SlugSchema.parse((await params).slug);
    const ref = db.collection("articles").doc(slug);
    return json(await db.runTransaction((tx) => ownedDraft(tx, ref, uid)));
  } catch (error) {
    return apiError(error);
  }
}
// Saves the draft only; the public copy changes when the owner publishes again.
export async function PUT(req: Request, { params }: Params) {
  try {
    const { db, uid } = await requireOwner(req, { service: "content" });
    const slug = SlugSchema.parse((await params).slug);
    const input = ArticleUpdateSchema.parse(
      JSON.parse((await limitedBody(req, MAX_BODY * 4 + 8192)).toString("utf8")),
    );
    if (input.slug !== slug)
      throw new HttpError(400, "The slug cannot be changed");
    await consumeQuota(db, uid + ":content-write", 500);
    const ref = db.collection("articles").doc(slug);
    const saved = await db.runTransaction(async (tx) => {
      const current = await ownedDraft(tx, ref, uid);
      if (current.version !== input.version)
        throw new HttpError(
          409,
          "This article changed since you opened it. Reload to get the latest version.",
        );
      const next: ArticleDraft = defined({
        ...current,
        title: input.title,
        description: input.description,
        body: input.body,
        tags: input.tags,
        category: input.category || undefined,
        featured: input.featured,
        version: current.version + 1,
        modifiedAt: new Date().toISOString(),
      });
      tx.set(ref, { ...next, ownerUid: uid });
      return next;
    });
    audit("article_saved", slug);
    return json(saved);
  } catch (error) {
    return apiError(error);
  }
}
// Drafts only: a published article must be unpublished first.
export async function DELETE(req: Request, { params }: Params) {
  try {
    const { db, uid } = await requireOwner(req, {
      service: "content",
      recent: true,
    });
    await consumeQuota(db, uid + ":content-delete", 50);
    const slug = SlugSchema.parse((await params).slug);
    const ref = db.collection("articles").doc(slug);
    await db.runTransaction(async (tx) => {
      const current = await ownedDraft(tx, ref, uid);
      const published = await tx.get(db.collection("publicArticles").doc(slug));
      if (current.status === "published" || published.exists)
        throw new HttpError(409, "Unpublish this article before deleting it");
      tx.delete(ref);
    });
    audit("article_deleted", slug);
    return json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
