import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
export default function robots(): MetadataRoute.Robots {
  return {
    rules:
      process.env.INDEX_SITE === "true"
        ? {
            userAgent: "*",
            allow: "/",
            disallow: ["/api/", "/manage", "/preview/", "/sprite-review/"],
          }
        : { userAgent: "*", disallow: "/" },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
