import { requireOwner, limitedBody, consumeQuota, apiError } from "@/lib/admin";
import { renderArticle } from "@/lib/content";
import { json, MAX_BODY, PreviewSchema } from "../_lib/content";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Renders Markdown with the site's own pipeline so the editor preview matches the article page.
export async function POST(req: Request) {
  try {
    const { db, uid } = await requireOwner(req, { service: "content" });
    const { body } = PreviewSchema.parse(
      JSON.parse((await limitedBody(req, MAX_BODY * 4 + 1024)).toString("utf8")),
    );
    await consumeQuota(db, uid + ":content-preview", 3000);
    return json(await renderArticle(body));
  } catch (error) {
    return apiError(error);
  }
}
