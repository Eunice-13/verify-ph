import type { TrustedRssSource } from "@/types";

// Keep the allowlist in code so the cron route never fetches a URL supplied by
// a browser request. Categories are assigned per article in rss.ts, not per
// outlet, so every UI tab can contain articles from multiple publishers.
export const TRUSTED_RSS_SOURCES: readonly TrustedRssSource[] = [
  {
    id: "gma-news",
    name: "GMA News",
    feedUrl: "https://data.gmanetwork.com/gno/rss/news/feed.xml",
    fallbackCategory: "General",
  },
  {
    id: "inquirer",
    name: "Inquirer",
    feedUrl: "https://www.inquirer.net/fullfeed",
    fallbackCategory: "General",
  },
  {
    id: "rappler",
    name: "Rappler",
    feedUrl: "https://www.rappler.com/rss/",
    fallbackCategory: "General",
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
    fallbackCategory: "General",
  },
  {
    id: "businessworld",
    name: "BusinessWorld",
    feedUrl: "https://www.bworldonline.com/feed/",
    fallbackCategory: "Economy",
  },
];
