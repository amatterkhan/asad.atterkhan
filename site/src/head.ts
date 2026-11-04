import { site, safeJson } from "./lib/site";

export type Head = {
  /** Page title; the site name is appended ("The Lab · Asad.exe"). Omit for the default. */
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

const POSTCARD_ALT = "A pixel-art room at night: Asad typing on his laptop, Storm the cat beside him, and a Nixie-tube meter reading 1.048596";

/** Where the page is and how to version its share image. */
export type HeadContext = {
  /** The page's own path, for og:url when it has no canonical. */
  path?: string;
  /** Content hash of each built Open Graph image by public path, appended as ?v= (platforms cache by URL). */
  imageVersions?: ReadonlyMap<string, string>;
};

/** Title template, Open Graph, Twitter and robots tags, all in the static HTML. */
export function renderHead(head: Head, indexSite: boolean, ctx: HeadContext = {}) {
  const title = head.title ? `${head.title} · ${site.title}` : `${site.title} — ${site.name}`;
  const description = head.description ?? site.description;
  const imagePath = head.image ?? "/opengraph-image.png";
  const version = ctx.imageVersions?.get(imagePath);
  const image = `${site.url}${imagePath}${version ? `?v=${version}` : ""}`;
  const alt = head.image ? title : POSTCARD_ALT;
  const here = head.canonical ?? ctx.path;
  const url = here === undefined ? undefined : site.url + (here === "/" ? "" : here);
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
    url ? meta("property", "og:url", url) : "",
    meta("property", "og:image", image),
    meta("property", "og:image:alt", alt),
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
    meta("name", "twitter:image:alt", alt),
    head.jsonLd ? `<script type="application/ld+json">${safeJson(head.jsonLd)}</script>` : "",
  ];
  return tags.filter(Boolean).join("\n    ");
}
