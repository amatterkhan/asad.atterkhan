import { requireOwner, consumeQuota, apiError, audit } from "@/lib/admin";
import {
  articlePaths,
  defined,
  json,
  ownedDraft,
  publicCopy,
  revalidate,
  SlugSchema,
  today,
  type ArticleDraft,
} from "../../../_lib/content";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Copies a validated snapshot of the draft to publicArticles/{slug}, in the same transaction that
// marks the draft published, so the public site never sees a half-published article.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { db, uid } = await requireOwner(req, {
      service: "content",
      recent: true,
    });
    await consumeQuota(db, uid + ":content-publish", 50);
    const slug = SlugSchema.parse((await params).slug);
    const ref = db.collection("articles").doc(slug);
    const published = await db.runTransaction(async (tx) => {
      const current = await ownedDraft(tx, ref, uid);
      const date = today();
      const publishedAt = current.publishedAt ?? date;
      const updatedAt =
        current.publishedAt && date > current.publishedAt
          ? date
          : current.updatedAt;
      const record = publicCopy(current, publishedAt, updatedAt);
      const version = current.version + 1;
      const next: ArticleDraft = defined({
        ...current,
        status: "published",
        publishedAt,
        updatedAt,
        version,
        publishedVersion: version,
        modifiedAt: new Date().toISOString(),
      });
      tx.set(db.collection("publicArticles").doc(slug), record);
      tx.set(ref, { ...next, ownerUid: uid });
      return next;
    });
    audit("article_published", slug);
    revalidate(articlePaths(slug));
    return json(published);
  } catch (error) {
    return apiError(error);
  }
}
