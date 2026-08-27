import type { TrustedRssSource, TrustedWebSource } from "@/types";

// Keep the allowlist in code so the cron route never fetches a URL supplied by
// a browser request. Categories are assigned per article in rss.ts, not per
// outlet, so every UI tab can contain articles from multiple publishers.
// fallbackCategory is used only when NO signal (RSS <category>, URL path,
// or title/summary keyword match — see mapCategory() in lib/rss.ts) points
// to a specific category. "General" is retired as a real category (see
// ArticleCategory in src/types/index.ts), so every fallback below is a
// real category — "News & Politics" for broad national outlets, since an
// uncategorized story from a general newsroom is most often a straight
// news piece rather than economy/health/lifestyle.
export const TRUSTED_RSS_SOURCES: readonly TrustedRssSource[] = [
  {
    id: "gma-news",
    name: "GMA News",
    feedUrl: "https://data.gmanetwork.com/gno/rss/news/feed.xml",
    fallbackCategory: "News & Politics",
  },
  {
    id: "inquirer",
    name: "Inquirer",
    feedUrl: "https://www.inquirer.net/fullfeed",
    fallbackCategory: "News & Politics",
  },
  {
    id: "rappler",
    name: "Rappler",
    feedUrl: "https://www.rappler.com/rss/",
    fallbackCategory: "News & Politics",
  },
  {
    id: "philstar",
    name: "Philstar",
    feedUrl: "https://www.philstar.com/rss/headlines",
    fallbackCategory: "News & Politics",
  },
  {
    id: "manila-bulletin",
    name: "Manila Bulletin",
    feedUrl: "https://mb.com.ph/rss/articles",
    fallbackCategory: "News & Politics",
  },
  {
    id: "businessworld",
    name: "BusinessWorld",
    feedUrl: "https://www.bworldonline.com/feed/",
    fallbackCategory: "Economy",
  },
];

// Trusted Philippine news outlets the AI is allowed to search the live web
// for, as a fallback when a claim isn't covered by any article already in
// our own database. This list intentionally includes the outlets above
// (already ingested via RSS) plus additional reputable, editorially
// independent Philippine outlets that are not yet part of the RSS
// ingestion pipeline. Kept as a strict allowlist so the AI never treats an
// arbitrary website, blog, or social media post as evidence.
export const TRUSTED_WEB_SOURCES: readonly TrustedWebSource[] = [
  // Outlets already ingested into our DB via RSS.
  { name: "GMA News", domain: "gmanetwork.com" },
  { name: "Philippine Daily Inquirer", domain: "inquirer.net" },
  { name: "Rappler", domain: "rappler.com" },
  { name: "Philippine Star", domain: "philstar.com" },
  { name: "Manila Bulletin", domain: "mb.com.ph" },
  { name: "BusinessWorld", domain: "bworldonline.com" },
  // Additional reputable, editorially independent PH outlets not yet
  // ingested via RSS, but reliable enough to accept as live evidence.
  { name: "ABS-CBN News", domain: "abs-cbn.com" },
  { name: "The Manila Times", domain: "manilatimes.net" },
  { name: "Philippine News Agency", domain: "pna.gov.ph" },
  { name: "CNN Philippines / RPTV", domain: "cnnphilippines.com" },
  { name: "GMA Integrated News (legacy domain)", domain: "gmanews.tv" },
  { name: "Sunstar Philippines", domain: "sunstar.com.ph" },
];
