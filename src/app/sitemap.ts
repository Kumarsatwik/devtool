import type { MetadataRoute } from "next";
import { TOOLS } from "@/lib/tools";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const toolEntries: MetadataRoute.Sitemap = TOOLS.map((tool) => ({
    url: `${SITE_URL}${tool.href}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...toolEntries,
  ];
}
