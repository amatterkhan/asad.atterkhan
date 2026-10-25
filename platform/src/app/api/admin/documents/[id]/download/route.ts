import { requireOwner, apiError, HttpError } from "@/lib/admin";
import { IdSchema, type DocumentRecord } from "@/lib/document-policy";
export const dynamic = "force-dynamic";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { db, bucket, uid } = await requireOwner(req);
    const { id } = await params;
    IdSchema.parse(id);
    const doc = await db.collection("documents").doc(id).get();
    if (!doc.exists || doc.get("ownerUid") !== uid)
      throw new HttpError(404, "Document not found");
    const record = doc.data() as DocumentRecord;
    if (!record.privatePath.startsWith(`private/${uid}/${id}/`))
      throw new HttpError(403, "Invalid document path");
    const [bytes] = await bucket.file(record.privatePath).download();
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": record.mime,
        "Content-Disposition": `attachment; filename="${record.filename}"`,
        "Cache-Control": "private,no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return apiError(e);
  }
}
