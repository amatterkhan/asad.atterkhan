import { site, safeJson } from "./lib/site";

export type Head = {
  /** Page title; the site name is appended ("The Lab · Asad Atterkhan"). Omit for the default. */
  title?: string;
  description?: string;
  /** Canonical path, e.g. "/lab". */
  canonical?: string;
  /** Private and development pages are never indexed, whatever INDEX_SITE says. */
  noindex?: boolean;
  /** Path of a page-specific Open Graph image. */
  image?: string;
  article?: { publishedTime?: string; modifiedTime?: string };
  jsonLd?: unknown;
};

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const meta = (attr: "name" | "property", key: string, value: string) => `<meta ${attr}="${key}" content="${esc(value)}">`;

/** The same tags the Next.js metadata API produced (title template, OG, Twitter, robots). */
export function renderHead(head: Head, indexSite: boolean) {
  const title = head.title ? `${head.title} · ${site.name}` : `${site.name} — ${site.title}`;
  const description = head.description ?? site.description;
  const image = `${site.url}${head.image ?? "/opengraph-image.png"}`;
  const robots = indexSite && !head.noindex ? "index, follow" : "noindex, nofollow";
  const tags = [
    `<title>${esc(title)}</title>`,
    meta("name", "description", description),
    meta("name", "robots", robots),
    head.canonical !== undefined ? `<link rel="canonical" href="${esc(site.url + (head.canonical === "/" ? "" : head.canonical))}">` : "",
    meta("property", "og:title", title),
    meta("property", "og:description", description),
    meta("property", "og:site_name", site.title),
    meta("property", "og:locale", "en_GB"),
    head.canonical !== undefined ? meta("property", "og:url", site.url + (head.canonical === "/" ? "" : head.canonical)) : "",
    meta("property", "og:image", image),
    meta("property", "og:image:alt", head.image ? title : "Pixel-art room: Asad typing on his laptop while Storm the cat stands nearby"),
    meta("property", "og:image:type", "image/png"),
    meta("property", "og:image:width", "1200"),
    meta("property", "og:image:height", "630"),
    meta("property", "og:type", head.article ? "article" : "website"),
    head.article?.publishedTime ? meta("property", "article:published_time", head.article.publishedTime) : "",
    head.article?.modifiedTime ? meta("property", "article:modified_time", head.article.modifiedTime) : "",
    meta("name", "twitter:card", "summary_large_image"),
    meta("name", "twitter:title", title),
    meta("name", "twitter:description", description),
    meta("name", "twitter:image", image),
    meta("name", "twitter:image:alt", head.image ? title : "Pixel-art room: Asad typing on his laptop while Storm the cat stands nearby"),
    head.jsonLd ? `<script type="application/ld+json">${safeJson(head.jsonLd)}</script>` : "",
  ];
  return tags.filter(Boolean).join("\n    ");
}
