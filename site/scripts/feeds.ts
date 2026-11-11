import path from "node:path";
import { site, xml } from "../src/lib/site";
import { tagCounts } from "../src/lib/lab-index";
import type { Article, Lab, Project } from "../src/lib/schemas";

type Server = {
  getArticles(): Promise<Article[]>;
  getProjects(): Promise<Project[]>;
  getLab(): Promise<Lab>;
  articleSummary(a: Article): unknown;
  isCurrent(a: { status: string }): boolean;
};
type Write = (file: string, body: string) => Promise<void>;

/** RSS, sitemap, robots and the search index, as the Next.js routes produced them. */
export async function feeds(server: Server, dist: string, write: Write) {
  const articles = await server.getArticles();
  const projects = await server.getProjects();
  // The whole Lab at /rss.xml, each section at /lab/section/<id>/rss.xml. Archived entries are left out.
  const current = articles.filter(server.isCurrent);
  const rss = (title: string, link: string, self: string, items: Article[]) =>
    `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${xml(title)}</title><link>${link}</link><description>${xml(site.description)}</description><language>en</language><atom:link href="${self}" rel="self" type="application/rss+xml"/>${items
      .map(
        (a) =>
          `<item><title>${xml(a.title)}</title><link>${site.url}/lab/${a.slug}</link><guid isPermaLink="true">${site.url}/lab/${a.slug}</guid><description>${xml(a.description)}</description><pubDate>${new Date(a.publishedAt!).toUTCString()}</pubDate>${[a.shelf!.sectionName, ...(a.shelf!.categoryName ? [a.shelf!.categoryName] : []), ...a.tags].map((t) => `<category>${xml(t)}</category>`).join("")}</item>`,
      )
      .join("")}</channel></rss>`;
  await write(path.join(dist, "rss.xml"), rss(`${site.name} — The Lab`, `${site.url}/lab`, `${site.url}/rss.xml`, current));
  for (const s of (await server.getLab()).sections)
    await write(
      path.join(dist, "lab/section", s.id, "rss.xml"),
      rss(`${site.name} — The Lab: ${s.name}`, `${site.url}/lab/section/${s.id}`, `${site.url}/lab/section/${s.id}/rss.xml`, current.filter((a) => a.shelf!.section === s.id)),
    );
  const urls: { loc: string; lastmod?: string }[] = [
    ...["", "/lab", "/workbench", "/experience", "/achievements", "/about"].map((p) => ({ loc: site.url + p })),
    ...(await server.getLab()).sections.flatMap((s) => [
      { loc: `${site.url}/lab/section/${s.id}` },
      ...s.categories.map((c) => ({ loc: `${site.url}/lab/section/${s.id}/${c.id}` })),
    ]),
    ...tagCounts(articles).map((t) => ({ loc: `${site.url}/lab/tag/${t.slug}` })),
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
  // RFC 9116. Hosting ignores dot-directories, so the file is written at /security.txt and
  // firebase.json rewrites /.well-known/security.txt to it. Expires is renewed by every build;
  // the weekly site-watch workflow fails when the live file has under 30 days left.
  const expires = new Date(Date.now() + 300 * 86_400_000).toISOString().replace(/\.\d+Z$/, "Z");
  await write(
    path.join(dist, "security.txt"),
    `Contact: mailto:${site.email}\nExpires: ${expires}\nPreferred-Languages: en\nCanonical: ${site.url}/.well-known/security.txt\n`,
  );
  await write(path.join(dist, "search.json"), JSON.stringify(articles.map(server.articleSummary)));
}
