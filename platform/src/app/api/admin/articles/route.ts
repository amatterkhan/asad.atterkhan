import {
  requireOwner,
  limitedBody,
  consumeQuota,
  apiError,
  audit,
  HttpError,
} from "@/lib/admin";
import {
  ArticleCreateSchema,
  json,
  toDraft,
  type ArticleDraft,
} from "../_lib/content";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Owner drafts in articles/{slug}; published copies live in publicArticles/{slug}.
export async function GET(req: Request) {
  try {
    const { db, uid } = await requireOwner(req, { service: "content" });
    await consumeQuota(db, uid + ":content-read", 1000);
    // One owner and a few hundred notes at most: sort in memory, no composite index.
    const snap = await db
      .collection("articles")
      .where("ownerUid", "==", uid)
      .get();
    const articles = snap.docs
      .map((doc) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { body, ...summary } = toDraft(doc.data());
        return summary;
      })
      .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
    return json({ articles });
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(req: Request) {
  try {
    const { db, uid } = await requireOwner(req, { service: "content" });
    const input = ArticleCreateSchema.parse(
      JSON.parse((await limitedBody(req, 4096)).toString("utf8")),
    );
    await consumeQuota(db, uid + ":content-write", 500);
    const draft: ArticleDraft = {
      ...input,
      body: "",
      tags: [],
      featured: false,
      status: "draft",
      version: 1,
      modifiedAt: new Date().toISOString(),
    };
    const ref = db.collection("articles").doc(input.slug);
    await db.runTransaction(async (tx) => {
      const [existing, published] = await Promise.all([
        tx.get(ref),
        tx.get(db.collection("publicArticles").doc(input.slug)),
      ]);
      if (existing.exists || published.exists)
        throw new HttpError(409, "An article with this slug already exists");
      tx.create(ref, { ...draft, ownerUid: uid });
    });
    audit("article_created", input.slug);
    return json(draft, 201);
  } catch (error) {
    return apiError(error);
  }
}
