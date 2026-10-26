import {
  requireOwner,
  consumeQuota,
  apiError,
  audit,
  HttpError,
} from "@/lib/admin";
import {
  articlePaths,
  json,
  ownedDraft,
  revalidate,
  SlugSchema,
  type ArticleDraft,
} from "../../../_lib/content";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Removes the public copy and returns the article to draft. publishedAt is kept, so publishing
// again keeps the original date and records an update.
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
    const draft = await db.runTransaction(async (tx) => {
      const current = await ownedDraft(tx, ref, uid);
      const publicRef = db.collection("publicArticles").doc(slug);
      if (current.status !== "published" && !(await tx.get(publicRef)).exists)
        throw new HttpError(409, "This article is not published");
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { publishedVersion, ...rest } = current;
      const next: ArticleDraft = {
        ...rest,
        status: "draft",
        version: current.version + 1,
        modifiedAt: new Date().toISOString(),
      };
      tx.delete(publicRef);
      tx.set(ref, { ...next, ownerUid: uid });
      return next;
    });
    audit("article_unpublished", slug);
    revalidate(articlePaths(slug));
    return json(draft);
  } catch (error) {
    return apiError(error);
  }
}
