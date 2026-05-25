import type { MetadataRoute } from "next";

const SITE = "https://scopecreeper.ai";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${SITE}/`,                        lastModified, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${SITE}/scan`,                    lastModified, changeFrequency: "weekly",  priority: 0.85 },
    { url: `${SITE}/projects`,                lastModified, changeFrequency: "weekly",  priority: 0.9 },
    { url: `${SITE}/board`,                   lastModified, changeFrequency: "daily",   priority: 0.9 },
    { url: `${SITE}/about`,                   lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE}/faq`,                     lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/blog/built-in-public`,    lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/blog/mcp-launch`,         lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE}/github-app`,              lastModified, changeFrequency: "monthly", priority: 0.85 },
  ];
}
