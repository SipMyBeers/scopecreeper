import type { MetadataRoute } from "next";

const SITE = "https://scopecreeper.ai";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Keep ephemeral API + auth routes out of indexes; everything else is fair game.
      { userAgent: "*", allow: "/", disallow: ["/api/", "/t/", "/projects/", "/account"] },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
