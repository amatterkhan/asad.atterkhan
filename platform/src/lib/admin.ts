import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { firebaseAdmin } from "./firebase-admin";
import { ownerAccessError } from "./owner-policy";
import { httpErrorCode, USER_ERRORS } from "./user-errors";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function requireOwner(
  request: Request,
  {
    recent = false,
    service = "documents",
  }: {
    recent?: boolean;
    service?: "documents" | "achievements" | "calendar" | "content";
  } = {},
) {
  const enabled = {
    documents: process.env.ENABLE_DOCUMENT_ADMIN,
    achievements: process.env.ENABLE_ACHIEVEMENT_ADMIN,
    calendar: process.env.ENABLE_PRIVATE_CALENDAR,
    content: process.env.ENABLE_CONTENT_ADMIN,
  }[service];
  if (enabled !== "true")
    throw new HttpError(503, "Content management is not enabled");
  return requireOwnerIdentity(request, recent);
}
export async function requireOwnerIdentity(request: Request, recent = false) {
  const bearer = request.headers.get("authorization");
  if (!bearer?.startsWith("Bearer ") || bearer.length > 9000)
    throw new HttpError(401, "Sign in required");
  if (!process.env.FIREBASE_OWNER_UID)
    throw new HttpError(503, "Owner setup is not complete yet");
  const services = firebaseAdmin();
  let token;
  try {
    token = await services.auth.verifyIdToken(bearer.slice(7), true);
  } catch {
    throw new HttpError(401, "Your session has expired. Sign in again.");
  }
  const accessError = ownerAccessError(
    token,
    process.env.FIREBASE_OWNER_UID,
    Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST),
  );
  if (accessError) throw new HttpError(403, accessError);
  if (recent && Date.now() / 1000 - token.auth_time > 300)
    throw new HttpError(401, "Sign in again before publishing or archiving");
  return { ...services, uid: token.uid };
}
export async function consumeQuota(
  db: ReturnType<typeof firebaseAdmin>["db"],
  key: string,
  limit: number,
  amount = 1,
) {
  const today = new Date().toISOString().slice(0, 10);
  const ref = db.collection("_quotas").doc(
    createHash("sha256")
      .update(key + today)
      .digest("hex"),
  );
  await db.runTransaction(async (tx) => {
    const existing = await tx.get(ref);
    const count = existing.get("count") || 0;
    if (count + amount > limit)
      throw new HttpError(429, "Daily operation limit reached");
    tx.set(ref, { count: count + amount, day: today });
  });
}
export async function limitedBody(req: Request, max: number) {
  const declared = Number(req.headers.get("content-length") || 0);
  if (declared > max) throw new HttpError(413, "File is too large");
  const reader = req.body?.getReader();
  if (!reader) throw new HttpError(400, "A request body is required");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      throw new HttpError(413, "File is too large");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
export function apiError(error: unknown) {
  if (error instanceof HttpError) {
    const code = httpErrorCode(error.status, error.message);
    return Response.json(
      { error: USER_ERRORS[code], code },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (
    error instanceof Error &&
    (error.name === "ZodError" || error instanceof SyntaxError)
  )
    return Response.json(
      { error: USER_ERRORS.invalid_input, code: "invalid_input" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  const requestId = randomUUID();
  console.error(
    JSON.stringify({
      event: "content_operation_failed",
      requestId,
      time: new Date().toISOString(),
      kind: error instanceof Error && ["Error", "TypeError", "RangeError", "FirebaseError"].includes(error.name)
        ? error.name : "UnknownError",
    }),
  );
  return Response.json(
    { error: USER_ERRORS.operation_failed, code: "operation_failed", requestId },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}
export function audit(event: string, id: string) {
  console.info(JSON.stringify({ event, id, time: new Date().toISOString() }));
}
