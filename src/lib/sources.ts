import type { TrustedRssSource, TrustedWebSource } from "@/types";

// Keep the allowlist in code so the cron route never fetches a URL supplied by
// a browser request. These are official publisher RSS URLs only. Categories
// are assigned per article in rss.ts, not per outlet, so every UI tab can
// contain articles from multiple publishers.
// fallbackCategory is used only when NO signal (RSS <category>, URL path,
// or title/summary keyword match — see mapCategory() in lib/rss.ts) points
// to a specific category. "General" is retired as a real category (see
// ArticleCategory in src/types/index.ts), so every fallback below is a
// real category — "News & Politics" for broad national outlets, since an
// uncategorized story from a general newsroom is most often a straight
// news piece rather than economy/health/lifestyle.
export const TRUSTED_RSS_SOURCES: readonly TrustedRssSource[] = [
  // GMA News publishes separate official feeds per section. A single broad
  // News feed misses stories such as Money/Economy, so ingest each section.
  {
    id: "gma-news-politics",
    name: "GMA News",
    feedUrl: "https://data.gmanetwork.com/gno/rss/news/feed.xml",
    fallbackCategory: "News & Politics",
  },
  {
    id: "gma-economy",
    name: "GMA News",
    feedUrl: "https://data.gmanetwork.com/gno/rss/money/economy/feed.xml",
    fallbackCategory: "Economy",
  },
  {
    id: "gma-weather",
    name: "GMA News",
    feedUrl: "https://data.gmanetwork.com/gno/rss/weather/feed.xml",
    fallbackCategory: "Health & Safety",
  },
  {
    id: "gma-sports",
    name: "GMA News",
    feedUrl: "https://data.gmanetwork.com/gno/rss/sports/feed.xml",
    fallbackCategory: "Lifestyle",
  },
  {
    id: "gma-lifestyle",
    name: "GMA News",
    feedUrl: "https://data.gmanetwork.com/gno/rss/lifestyle/feed.xml",
    fallbackCategory: "Lifestyle",
  },
  {
    id: "gma-showbiz",
    name: "GMA News",
    feedUrl: "https://data.gmanetwork.com/gno/rss/showbiz/feed.xml",
    fallbackCategory: "Lifestyle",
  },

  // Inquirer provides working feeds for each major editorial section.
  {
    id: "inquirer-news-politics",
    name: "Inquirer",
    feedUrl: "https://newsinfo.inquirer.net/feed",
    fallbackCategory: "News & Politics",
  },
  {
    id: "inquirer-economy",
    name: "Inquirer",
    feedUrl: "https://business.inquirer.net/feed",
    fallbackCategory: "Economy",
  },
  {
    id: "inquirer-lifestyle",
    name: "Inquirer",
    feedUrl: "https://lifestyle.inquirer.net/feed",
    fallbackCategory: "Lifestyle",
  },
  {
    id: "inquirer-sports",
    name: "Inquirer",
    feedUrl: "https://sports.inquirer.net/feed",
    fallbackCategory: "Lifestyle",
  },
  {
    id: "inquirer-entertainment",
    name: "Inquirer",
    feedUrl: "https://entertainment.inquirer.net/feed",
    fallbackCategory: "Lifestyle",
  },

  // Rappler currently exposes one reliable official all-sections RSS feed.
  // Its article-level category mapper distributes those stories across tabs.
  {
    id: "rappler",
    name: "Rappler",
    feedUrl: "https://www.rappler.com/rss/",
    fallbackCategory: "News & Politics",
  },

  // Philstar's targeted feeds provide political, business and lifestyle
  // coverage from one publisher without relying on a headline-only feed.
  {
    id: "philstar-news-politics",
    name: "Philstar",
    feedUrl: "https://www.philstar.com/rss/nation",
    fallbackCategory: "News & Politics",
  },
  {
    id: "philstar-economy",
    name: "Philstar",
    feedUrl: "https://www.philstar.com/rss/business",
    fallbackCategory: "Economy",
  },
  {
    id: "philstar-lifestyle",
    name: "Philstar",
    feedUrl: "https://www.philstar.com/rss/lifestyle",
    fallbackCategory: "Lifestyle",
  },
  {
    id: "philstar-sports",
    name: "Philstar",
    feedUrl: "https://www.philstar.com/rss/sports",
    fallbackCategory: "Lifestyle",
  },

  // Manila Bulletin offers reliable feeds for all of VerifyPH's real
  // content categories, including the Health & Safety tab.
  {
    id: "manila-bulletin-news-politics",
    name: "Manila Bulletin",
    feedUrl: "https://mb.com.ph/rss/national",
    fallbackCategory: "News & Politics",
  },
  {
    id: "manila-bulletin-economy",
    name: "Manila Bulletin",
    feedUrl: "https://mb.com.ph/rss/business",
    fallbackCategory: "Economy",
  },
  {
    id: "manila-bulletin-health-safety",
    name: "Manila Bulletin",
    feedUrl: "https://mb.com.ph/rss/health",
    fallbackCategory: "Health & Safety",
  },
  {
    id: "manila-bulletin-lifestyle",
    name: "Manila Bulletin",
    feedUrl: "https://mb.com.ph/rss/lifestyle",
    fallbackCategory: "Lifestyle",
  },
  {
    id: "manila-bulletin-sports",
    name: "Manila Bulletin",
    feedUrl: "https://mb.com.ph/rss/sports",
    fallbackCategory: "Lifestyle",
  },

  // BusinessWorld focuses on business and economic reporting.
  {
    id: "businessworld",
    name: "BusinessWorld",
    feedUrl: "https://www.bworldonline.com/feed/",
    fallbackCategory: "Economy",
  },

  // VERA Files publishes separate official feeds for its general reporting
  // and fact-checking desks. Keeping both ensures its fact checks are not
  // missed when they do not appear in the broader News archive.
  {
    id: "vera-files-news",
    name: "VERA Files",
    feedUrl: "https://verafiles.org/section/news/feed/",
    fallbackCategory: "News & Politics",
  },
  {
    id: "vera-files-fact-check",
    name: "VERA Files",
    feedUrl: "https://verafiles.org/section/fact-check/feed/",
    fallbackCategory: "News & Politics",
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
  { name: "VERA Files", domain: "verafiles.org" },
  // Additional reputable, editorially independent PH outlets not yet
  // ingested via RSS, but reliable enough to accept as live evidence.
  { name: "ABS-CBN News", domain: "abs-cbn.com" },
  { name: "The Manila Times", domain: "manilatimes.net" },
  { name: "Philippine News Agency", domain: "pna.gov.ph" },
  { name: "CNN Philippines / RPTV", domain: "cnnphilippines.com" },
  { name: "GMA Integrated News (legacy domain)", domain: "gmanews.tv" },
  { name: "Sunstar Philippines", domain: "sunstar.com.ph" },
];
