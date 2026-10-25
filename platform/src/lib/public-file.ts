import { consumeQuota, HttpError } from "./admin";
import "server-only";
import { firebaseAdmin } from "./firebase-admin";
import {
  IdSchema,
  type DocumentRecord,
  MAX_FILE_BYTES,
  allowedTypes,
} from "./document-policy";
export async function publicFile(id: string, inline = false) {
  if (
    process.env.ENABLE_PUBLIC_FILES !== "true" ||
    !IdSchema.safeParse(id).success
  )
    return new Response("Not found", { status: 404 });
  try {
    const { db, bucket } = firebaseAdmin();
    const doc = await db.collection("documents").doc(id).get();
    const record = doc.data() as DocumentRecord | undefined;
    if (
      !record?.published ||
      record.archived ||
      !record.publicPath?.startsWith(`published/${id}/${record.sha256}/`) ||
      !IdSchema.safeParse(record.publicPath.split("/")[3]).success ||
      !allowedTypes.has(record.mime) ||
      record.size > MAX_FILE_BYTES ||
      (inline && !record.mime.startsWith("image/"))
    )
      return new Response("Not found", { status: 404 });
    await consumeQuota(
      db,
      "public-download-bytes",
      64 * 1024 * 1024,
      record.size,
    );
    const [bytes] = await bucket.file(record.publicPath).download();
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": record.mime,
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${record.filename}"`,
        "Cache-Control": "private,no-store",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof HttpError && error.status === 429)
      return new Response("Daily download limit reached", {
        status: 429,
        headers: { "Cache-Control": "no-store" },
      });
    return new Response("File temporarily unavailable", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
