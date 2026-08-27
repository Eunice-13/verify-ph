// One-time reclassification script: finds all existing articles still
// tagged category = 'General' and reassigns each to the best-fitting REAL
// category (News & Politics / Economy / Health & Safety / Lifestyle),
// using the same keyword topic-matching rules as the live ingestion
// pipeline's categoryFromText() (see mapCategory() in src/lib/rss.ts).
//
// RUN THIS BEFORE applying
// supabase/migrations/20260828000001_retire_general_category.sql, so
// existing articles get a properly topic-matched category rather than the
// migration's blunt "everything left over becomes News & Politics"
// fallback.
//
// RUN MANUALLY from the command line — not part of the app's runtime:
//
//   node --env-file=.env.local scripts/reclassify-general-articles.mjs
//
// Safe to re-run: only ever selects rows where category = 'General', and
// every row it touches is reassigned to a category in the allowed set, so
// a second run (e.g. after new 'General' rows appear from a stale
// pipeline elsewhere) simply finds zero rows and exits cleanly.
//
// Reclassification rule (matches categoryFromText() in lib/rss.ts exactly):
//   Score title + summary text against the same 4 keyword rule sets
//   (Health & Safety / Economy / Lifestyle / News & Politics). Highest
//   keyword-match count wins; ties keep rule-list order (Health & Safety
//   > Economy > Lifestyle > News & Politics). If NO keyword matches at
//   all (score 0 across every rule), default to 'News & Politics' — same
//   reasoning as sources.ts's fallbackCategory: an uncategorizable general
//   newsroom story is most often a straight news piece.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing required env vars. Run with --env-file=.env.local or export NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY first."
  );
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BATCH_SIZE = 200;

// Duplicated from CATEGORY_RULES in src/lib/rss.ts (plain Node script, no
// TS/path-alias resolution) — MUST stay in sync with that file's keyword
// lists so this one-time reclassification matches what the live pipeline
// would have assigned had these articles been ingested today.
const CATEGORY_RULES = [
  {
    category: "Health & Safety",
    keywords: [
      "health", "hospital", "medical", "disease", "outbreak", "dengue",
      "leptospirosis", "covid", "mpox", "vaccine", "weather", "typhoon",
      "storm", "flood", "rainfall", "earthquake", "volcano", "disaster",
      "emergency", "safety", "scam", "fraud", "environment", "climate",
      "nature", "wildlife", "pollution", "kalusugan", "bagyo", "baha",
      "lindol", "sakuna",
    ],
  },
  {
    category: "Economy",
    keywords: [
      "economy", "economic", "business", "money", "market", "markets",
      "trade", "finance", "financial", "stock", "stocks", "peso", "bank",
      "banking", "corporate", "company", "industry", "agribusiness",
      "property", "ekonomiya",
    ],
  },
  {
    category: "Lifestyle",
    keywords: [
      "sports", "sport", "basketball", "volleyball", "football", "boxing",
      "showbiz", "entertainment", "celebrity", "lifestyle", "technology",
      "tech", "gadget", "gadgets", "gaming", "esports", "travel", "food",
      "fashion", "music", "movie", "film", "television", "palakasan",
      // Additional lifestyle-adjacent terms called out in the product
      // request for reclassifying General articles (celebrity obituaries,
      // lotto results) that weren't already covered above.
      "lotto", "lottery", "obituary", "obit", "passes away", "dies at",
    ],
  },
  {
    category: "News & Politics",
    keywords: [
      "politics", "political", "election", "government", "senate",
      "congress", "nation", "national", "newsinfo", "globalnation",
      "crime", "police", "court", "justice", "world", "global",
      "philippines", "metro", "region", "topstories", "halalan",
      "gobyerno", "krimen",
      // Fact-check/misinformation pieces are civic/news content per the
      // product request's example ("fact-check/misinformation piece ->
      // NEWS & POLITICS").
      "fact-check", "fact check", "misinformation", "disinformation",
      "debunk", "debunked",
    ],
  },
];

const DEFAULT_CATEGORY = "News & Politics";

function normalizeText(value) {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function categoryFromText(text) {
  const normalized = normalizeText(text);
  if (!normalized) return null;

  const padded = ` ${normalized} `;
  let best = null;

  for (const rule of CATEGORY_RULES) {
    const score = rule.keywords.reduce(
      (total, keyword) => total + (padded.includes(` ${keyword} `) ? 1 : 0),
      0
    );
    if (score > 0 && (!best || score > best.score)) {
      best = { category: rule.category, score };
    }
  }

  return best?.category ?? null;
}

async function fetchGeneralBatch() {
  const { data, error } = await db
    .from("articles")
    .select("id, title, summary")
    .eq("category", "General")
    .limit(BATCH_SIZE);

  if (error) throw error;
  return data ?? [];
}

async function countRemaining() {
  const { count, error } = await db
    .from("articles")
    .select("*", { count: "exact", head: true })
    .eq("category", "General");
  if (error) throw error;
  return count ?? 0;
}

async function main() {
  console.log("Starting General -> real-category reclassification.");

  const perCategoryCount = {
    "News & Politics": 0,
    Economy: 0,
    "Health & Safety": 0,
    Lifestyle: 0,
  };
  let totalReclassified = 0;
  let totalFailed = 0;

  while (true) {
    const batch = await fetchGeneralBatch();
    if (batch.length === 0) break;

    for (const article of batch) {
      const matched = categoryFromText(`${article.title ?? ""} ${article.summary ?? ""}`);
      const newCategory = matched ?? DEFAULT_CATEGORY;

      const { error } = await db
        .from("articles")
        .update({ category: newCategory })
        .eq("id", article.id);

      if (error) {
        console.error(`[failed] ${article.id}: ${error.message}`);
        totalFailed++;
        continue;
      }

      perCategoryCount[newCategory]++;
      totalReclassified++;
      console.log(
        `[reclassified] ${article.id} -> ${newCategory}${matched ? "" : " (default, no keyword match)"}: ${(article.title ?? "").slice(0, 60)}`
      );
    }
  }

  const stillRemaining = await countRemaining();

  console.log("\n=== Reclassification report ===");
  console.log(`Total reclassified: ${totalReclassified}`);
  for (const [category, count] of Object.entries(perCategoryCount)) {
    console.log(`  -> ${category}: ${count}`);
  }
  console.log(`Failed (DB error, left as 'General'): ${totalFailed}`);
  console.log(`Still remaining as 'General': ${stillRemaining}`);
  console.log("================================");

  if (stillRemaining > 0) {
    console.log(
      "\nSome rows are still 'General' (DB errors during update — see [failed] lines above). Re-run this script, or the upcoming migration's own fallback will reassign any leftovers to 'News & Politics'."
    );
  } else {
    console.log(
      "\nAll articles reclassified. Safe to apply supabase/migrations/20260828000001_retire_general_category.sql now."
    );
  }
}

main().catch((err) => {
  console.error("Reclassification script crashed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
