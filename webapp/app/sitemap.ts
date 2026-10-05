import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { getCollectionStats } from "@/lib/chain";

/**
 * sitemap.xml — static pages plus one entry per minted token.
 *
 * Token URLs are clamped to totalMinted so the sitemap never advertises 404s;
 * the full 10 000-token supply fits in this single file (sitemaps.org limit is
 * 50k URLs per file).
 *
 * Note: Next's `generateSitemaps` multi-file mode was evaluated and dropped —
 * in Next 15.x it serves only `/sitemap/[id].xml` and returns 404 for the
 * `/sitemap.xml` index, breaking the robots.txt Sitemap reference.
 */
export const revalidate = 600;

const MAX_TOKEN_URLS = 45000; // safety ceiling below the 50k protocol limit

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/collection`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/mine`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/merge`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/stake`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/battle`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/points`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/stats`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/claim`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/docs`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/docs/agent-access`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/docs/verification`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/docs/stats`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/docs/game`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  try {
    const stats = await getCollectionStats();
    const total = Math.min(Number(stats.totalMinted), MAX_TOKEN_URLS);

    for (let id = 1; id <= total; id++) {
      entries.push({
        url: `${SITE_URL}/token/${id}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  } catch {
    // RPC hiccup — serve static entries; tokens are picked up on revalidation.
  }

  // ZH public layer: /zh mirrors of every public route that ships a ZH page.
  // Every pair carries hreflang alternates so Google pairs the EN and ZH
  // variants. Keep this list in sync with the routes that have a /zh/* page so
  // the sitemap never advertises a ZH URL without an EN counterpart.
  const zhPairs: Array<{
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
  }> = [
    { path: "/", changeFrequency: "hourly", priority: 1 },
    { path: "/collection", changeFrequency: "hourly", priority: 0.9 },
    { path: "/claim", changeFrequency: "weekly", priority: 0.8 },
    { path: "/docs", changeFrequency: "weekly", priority: 0.8 },
    { path: "/docs/agent-access", changeFrequency: "weekly", priority: 0.8 },
    { path: "/docs/game", changeFrequency: "weekly", priority: 0.8 },
    { path: "/docs/verification", changeFrequency: "weekly", priority: 0.8 },
    { path: "/docs/stats", changeFrequency: "weekly", priority: 0.8 },
  ];
  for (const { path, changeFrequency, priority } of zhPairs) {
    const enUrl = `${SITE_URL}${path}`;
    const zhUrl = path === "/" ? `${SITE_URL}/zh` : `${SITE_URL}/zh${path}`;
    const alternates = { languages: { en: enUrl, zh: zhUrl } };
    const en = entries.find((e) => e.url === enUrl);
    if (en) en.alternates = alternates;
    entries.push({
      url: zhUrl,
      lastModified: now,
      changeFrequency,
      priority,
      alternates,
    });
  }

  return entries;
}
