import { getArticles, articleSummary } from "@/lib/content";
export const dynamic = "force-static";
export async function GET() {
  return Response.json((await getArticles()).map(articleSummary), {
    headers: { "Cache-Control": "public,max-age=3600" },
  });
}
