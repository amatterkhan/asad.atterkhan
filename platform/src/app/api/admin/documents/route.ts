import { randomUUID, createHash } from "node:crypto";
import { fileTypeFromBuffer } from "file-type";
import {
  requireOwner,
  apiError,
  limitedBody,
  HttpError,
  consumeQuota,
  audit,
} from "@/lib/admin";
import {
  MetadataSchema,
  MAX_FILE_BYTES,
  MAX_UPLOADS_PER_DAY,
  allowedTypes,
  safeName,
  type DocumentRecord,
} from "@/lib/document-policy";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    const { db, uid } = await requireOwner(req);
    await consumeQuota(db, uid + ":list", 500);
    const snapshot = await db
      .collection("documents")
      .where("ownerUid", "==", uid)
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();
    return Response.json(
      snapshot.docs.map((doc) => doc.data()),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(req: Request) {
  try {
    const { db, bucket, uid } = await requireOwner(req);
    await consumeQuota(db, uid + ":upload", MAX_UPLOADS_PER_DAY);
    if (!req.headers.get("content-type")?.startsWith("multipart/form-data;"))
      throw new HttpError(415, "Use a file upload");
    const raw = await limitedBody(req, MAX_FILE_BYTES + 65536);
    const form = await new Response(new Uint8Array(raw), {
      headers: { "Content-Type": req.headers.get("content-type")! },
    }).formData();
    const file = form.get("file");
    if (
      !(file instanceof File) ||
      file.size === 0 ||
      file.size > MAX_FILE_BYTES
    )
      throw new HttpError(400, "Choose a non-empty file up to 8 MiB");
    const meta = MetadataSchema.parse({
      title: form.get("title"),
      tags: JSON.parse(String(form.get("tags") || "[]")),
    });
    const bytes = Buffer.from(await file.arrayBuffer());
    const type = await fileTypeFromBuffer(bytes);
    if (!type || !allowedTypes.has(type.mime))
      throw new HttpError(
        415,
        "Only PDF, PNG, JPEG, and WebP files are supported",
      );
    const id = randomUUID();
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const privatePath = `private/${uid}/${id}/${sha256}.${type.ext}`;
    const now = new Date().toISOString();
    const record: DocumentRecord = {
      id,
      ownerUid: uid,
      ...meta,
      filename: safeName(file.name),
      mime: type.mime,
      size: bytes.length,
      sha256,
      privatePath,
      published: false,
      archived: false,
      createdAt: now,
      updatedAt: now,
    };
    await bucket.file(privatePath).save(bytes, {
      resumable: false,
      preconditionOpts: { ifGenerationMatch: 0 },
      metadata: {
        contentType: type.mime,
        cacheControl: "private,no-store",
        contentDisposition: `attachment; filename="${record.filename}"`,
      },
    });
    try {
      await db.collection("documents").doc(id).create(record);
    } catch (error) {
      await bucket
        .file(privatePath)
        .delete()
        .catch(() => {});
      throw error;
    }
    audit("document_uploaded_private", id);
    return Response.json(record, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return apiError(e);
  }
}
