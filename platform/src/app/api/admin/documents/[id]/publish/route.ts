import { randomUUID } from "node:crypto";
import {
  requireOwner,
  apiError,
  HttpError,
  consumeQuota,
  audit,
  limitedBody,
} from "@/lib/admin";
import {
  IdSchema,
  PublicationSchema,
  canPublish,
  type DocumentRecord,
} from "@/lib/document-policy";
export const dynamic = "force-dynamic";
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { db, bucket, uid } = await requireOwner(req, { recent: true });
    await consumeQuota(db, uid + ":publish", 50);
    const { id } = await params;
    IdSchema.parse(id);
    const { action } = PublicationSchema.parse(
      JSON.parse((await limitedBody(req, 2048)).toString("utf8")),
    );
    const ref = db.collection("documents").doc(id);
    const snapshot = await ref.get();
    if (!snapshot.exists || snapshot.get("ownerUid") !== uid)
      throw new HttpError(404, "Document not found");
    const record = snapshot.data() as DocumentRecord;
    if (action === "unpublish") {
      await ref.update({
        published: false,
        updatedAt: new Date().toISOString(),
      });
      if (record.publicPath)
        await bucket.file(record.publicPath).delete({ ignoreNotFound: true });
      audit("document_unpublished", id);
      return Response.json({ ok: true });
    }
    if (!canPublish(record, uid))
      throw new HttpError(409, "This document is not ready to publish");
    const publicPath = `published/${id}/${record.sha256}/${randomUUID()}`;
    await bucket.file(record.privatePath).copy(bucket.file(publicPath));
    await bucket.file(publicPath).setMetadata({
      contentType: record.mime,
      cacheControl: "private,no-store",
      contentDisposition: `attachment; filename="${record.filename}"`,
    });
    let committed = false;
    try {
      await db.runTransaction(async (tx) => {
        const current = await tx.get(ref);
        if (
          !current.updateTime?.isEqual(snapshot.updateTime!) ||
          !canPublish(current.data() as DocumentRecord, uid) ||
          current.get("sha256") !== record.sha256
        )
          throw new HttpError(409, "Document changed during publication");
        tx.update(ref, {
          published: true,
          publicPath,
          publishedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });
      committed = true;
    } finally {
      if (!committed)
        await bucket.file(publicPath).delete({ ignoreNotFound: true });
    }
    audit("document_published", id);
    return Response.json({ ok: true, url: `/files/${id}` });
  } catch (e) {
    return apiError(e);
  }
}
