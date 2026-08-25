// One-time backfill script: computes and stores embeddings for existing
// articles that don't have one yet (embedding IS NULL).
//
// RUN THIS AFTER applying supabase/migrations/20260826000003_add_article_embeddings.sql.
// Not part of the app's runtime — run manually from the command line:
//
//   node --env-file=.env.local scripts/backfill-embeddings.mjs
//
// Safe to re-run: only processes rows where embedding IS NULL, so it can
// be interrupted and resumed. Processes in small batches with a short
// delay to stay well under Gemini's embedding rate limits.

import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing required env vars. Run with --env-file=.env.local or export GEMINI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY first."
  );
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = 768;
const BATCH_SIZE = 20;
const DELAY_MS = 1500;

function normalize(values) {
  const norm = Math.sqrt(values.reduce((sum, v) => sum + v * v, 0));
  if (norm === 0) return values;
  return values.map((v) => v / norm);
}

async function embedArticle(article) {
  const text = `title: ${article.title} | text: ${article.summary ?? ""}`;
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
    config: {
      taskType: "RETRIEVAL_DOCUMENT",
      outputDimensionality: EMBEDDING_DIMENSIONS,
    },
  });
  const values = response.embeddings?.[0]?.values;
  if (!values) throw new Error("No embedding returned");
  return normalize(values);
}

async function main() {
  let totalProcessed = 0;
  let totalFailed = 0;

  while (true) {
    const { data: articles, error } = await db
      .from("articles")
      .select("id, title, summary")
      .is("embedding", null)
      .limit(BATCH_SIZE);

    if (error) {
      console.error("Failed to fetch articles needing embeddings:", error);
      process.exit(1);
    }

    if (!articles || articles.length === 0) {
      console.log(`Done. Total processed: ${totalProcessed}, failed: ${totalFailed}.`);
      break;
    }

    for (const article of articles) {
      try {
        const embedding = await embedArticle(article);
        const { error: updateError } = await db
          .from("articles")
          .update({ embedding })
          .eq("id", article.id);

        if (updateError) throw updateError;
        totalProcessed++;
        console.log(`[${totalProcessed}] Embedded: ${article.title.slice(0, 60)}`);
      } catch (err) {
        totalFailed++;
        console.error(`Failed to embed article ${article.id}:`, err.message ?? err);
      }

      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }
}

main();
