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
  MetadataSchema,
  type DocumentRecord,
} from "@/lib/document-policy";
export const dynamic = "force-dynamic";
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { db, uid } = await requireOwner(req);
    await consumeQuota(db, uid + ":edit", 100);
    const { id } = await params;
    IdSchema.parse(id);
    const meta = MetadataSchema.parse(
      JSON.parse((await limitedBody(req, 8192)).toString("utf8")),
    );
    const ref = db.collection("documents").doc(id);
    await db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      if (!doc.exists || doc.get("ownerUid") !== uid)
        throw new HttpError(404, "Document not found");
      tx.update(ref, { ...meta, updatedAt: new Date().toISOString() });
    });
    audit("document_metadata_updated", id);
    return Response.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { db, bucket, uid } = await requireOwner(req, { recent: true });
    await consumeQuota(db, uid + ":archive", 50);
    const { id } = await params;
    IdSchema.parse(id);
    const ref = db.collection("documents").doc(id);
    let publicPath: string | undefined;
    await db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      if (!doc.exists || doc.get("ownerUid") !== uid)
        throw new HttpError(404, "Document not found");
      const record = doc.data() as DocumentRecord;
      publicPath = record.publicPath;
      tx.update(ref, {
        archived: true,
        published: false,
        updatedAt: new Date().toISOString(),
      });
    });
    if (publicPath)
      await bucket.file(publicPath).delete({ ignoreNotFound: true });
    audit("document_archived_recoverable", id);
    return Response.json({
      ok: true,
      message: "Archived. Private original is retained.",
    });
  } catch (e) {
    return apiError(e);
  }
}
