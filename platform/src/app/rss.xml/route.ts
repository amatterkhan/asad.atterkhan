import { getArticles } from "@/lib/content";
import { site, xml } from "@/lib/site";
export const dynamic = "force-static";
export async function GET() {
  const articles = await getArticles();
  const body = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${xml(site.name)} — The Lab</title><link>${site.url}/lab</link><description>${xml(site.description)}</description><language>en</language><atom:link href="${site.url}/rss.xml" rel="self" type="application/rss+xml"/>${articles.map((a) => `<item><title>${xml(a.title)}</title><link>${site.url}/lab/${a.slug}</link><guid isPermaLink="true">${site.url}/lab/${a.slug}</guid><description>${xml(a.description)}</description><pubDate>${new Date(a.publishedAt!).toUTCString()}</pubDate>${a.tags.map((t) => `<category>${xml(t)}</category>`).join("")}</item>`).join("")}</channel></rss>`;
  return new Response(body, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
