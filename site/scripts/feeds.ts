import path from "node:path";
import { site, xml } from "../src/lib/site";
import type { Article, Project } from "../src/lib/schemas";

type Server = { getArticles(): Promise<Article[]>; getProjects(): Promise<Project[]>; articleSummary(a: Article): unknown };
type Write = (file: string, body: string) => Promise<void>;

/** RSS, sitemap, robots and the search index, as the Next.js routes produced them. */
export async function feeds(server: Server, dist: string, write: Write) {
  const articles = await server.getArticles();
  const projects = await server.getProjects();
  await write(
    path.join(dist, "rss.xml"),
    `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${xml(site.name)} — The Lab</title><link>${site.url}/lab</link><description>${xml(site.description)}</description><language>en</language><atom:link href="${site.url}/rss.xml" rel="self" type="application/rss+xml"/>${articles
      .map(
        (a) =>
          `<item><title>${xml(a.title)}</title><link>${site.url}/lab/${a.slug}</link><guid isPermaLink="true">${site.url}/lab/${a.slug}</guid><description>${xml(a.description)}</description><pubDate>${new Date(a.publishedAt!).toUTCString()}</pubDate>${a.tags.map((t) => `<category>${xml(t)}</category>`).join("")}</item>`,
      )
      .join("")}</channel></rss>`,
  );
  const urls: { loc: string; lastmod?: string }[] = [
    ...["", "/lab", "/workbench", "/experience", "/achievements", "/about"].map((p) => ({ loc: site.url + p })),
    ...articles.map((a) => ({ loc: `${site.url}/lab/${a.slug}`, lastmod: a.updatedAt || a.publishedAt })),
    ...projects.map((p) => ({ loc: `${site.url}/workbench/${p.slug}` })),
  ];
  await write(
    path.join(dist, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map((u) => `<url>\n<loc>${xml(u.loc)}</loc>\n${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>\n` : ""}</url>`)
      .join("\n")}\n</urlset>\n`,
  );
  const index = process.env.INDEX_SITE === "true";
  await write(
    path.join(dist, "robots.txt"),
    (index
      ? "User-Agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin\nDisallow: /calendar\nDisallow: /preview/\n"
      : "User-Agent: *\nDisallow: /\n") + `\nSitemap: ${site.url}/sitemap.xml\n`,
  );
  await write(path.join(dist, "search.json"), JSON.stringify(articles.map(server.articleSummary)));
}
