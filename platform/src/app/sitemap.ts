import type { MetadataRoute } from "next";
import { getArticles, getProjects } from "@/lib/content";
import { site } from "@/lib/site";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return [
    ...[
      "",
      "/lab",
      "/workbench",
      "/experience",
      "/achievements",
      "/about",
    ].map((p) => ({
      url: site.url + p,
    })),
    ...(await getArticles()).map((a) => ({
      url: `${site.url}/lab/${a.slug}`,
      lastModified: a.updatedAt || a.publishedAt,
    })),
    ...(await getProjects()).map((p) => ({
      url: `${site.url}/workbench/${p.slug}`,
    })),
  ];
}
