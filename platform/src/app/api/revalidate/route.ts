import { createHash, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { apiError, HttpError } from "@/lib/admin";

// Backend → frontend hook: after content changes (Firestore write, Git deploy, document publish),
// the backend POSTs the public paths that changed and the pages are regenerated in the background.
//   POST /api/revalidate
//   Authorization: Bearer $REVALIDATE_SECRET
//   { "paths": ["/lab", "/lab/my-new-note", "/"] }
// Disabled (503) unless REVALIDATE_SECRET is set. Only public page paths are accepted.

const PUBLIC_PATH =
  /^\/(?:|lab|workbench|experience|achievements|about|calendar|rss\.xml|search\.json|sitemap\.xml|lab\/[a-z0-9]+(?:-[a-z0-9]+)*|workbench\/[a-z0-9-]+)$/;

const digest = (s: string) => createHash("sha256").update(s).digest();

export async function POST(request: Request) {
  try {
    const secret = process.env.REVALIDATE_SECRET;
    if (!secret || secret.length < 32)
      throw new HttpError(503, "Revalidation is not enabled");
    const given = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
    if (!timingSafeEqual(digest(given), digest(secret)))
      throw new HttpError(401, "Unauthorized");

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new HttpError(400, "Expected JSON");
    }
    const paths = (body as { paths?: unknown })?.paths;
    if (!Array.isArray(paths) || !paths.length || paths.length > 50)
      throw new HttpError(400, "Send 1–50 paths");
    const bad = paths.filter((p) => typeof p !== "string" || !PUBLIC_PATH.test(p));
    if (bad.length) throw new HttpError(400, "Not a public path");

    for (const p of paths as string[]) revalidatePath(p);
    return Response.json({ revalidated: paths, at: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
