-- Enable semantic/embedding-based search for the claim-checker, to
-- complement the existing keyword-based search (full-text + ILIKE
-- fallback). This is the fix for paraphrase: a claim like "DOH warns of
-- dengue surge in Metro Manila" should be able to match an article titled
-- "Cases of the mosquito-borne illness spike in NCR, health department
-- says" even though they share almost no literal words - no synonym
-- dictionary can be exhaustive enough to catch every possible paraphrase.
--
-- OWNER ACTION REQUIRED: This migration has NOT been applied to the live
-- Supabase project (no DDL access available when this was written). Please
-- run this file against the production database via the Supabase SQL
-- Editor. Supabase projects support pgvector by default as a Postgres
-- extension, no additional infrastructure is needed.
--
-- After running this migration, the application needs a one-time backfill
-- to compute and store embeddings for existing articles, plus an update to
-- the RSS ingestion pipeline (src/lib/rss.ts) so every newly ingested
-- article gets an embedding going forward. See the companion note in
-- src/lib/embeddings.ts (added alongside this migration) for the backfill
-- script and the reciprocal-rank-fusion combination logic used at query
-- time in src/app/api/claim-checker/route.ts.
--
-- Model: Gemini gemini-embedding-001 (text-only), output_dimensionality
-- truncated to 768 (recommended size — good quality/storage tradeoff, and
-- keeps the pgvector index performant). If you later want to use the
-- newer gemini-embedding-2 model, note its embedding space is NOT
-- compatible with gemini-embedding-001 — all existing embeddings would
-- need to be recomputed, not just new ones added.

create extension if not exists vector;

alter table public.articles
  add column if not exists embedding vector(768);

-- HNSW index for fast approximate nearest-neighbor search. Only useful
-- once a meaningful number of rows have embeddings populated — before the
-- backfill runs, cosine similarity queries will still work, just as a
-- (slower) full scan.
create index if not exists articles_embedding_hnsw_idx
  on public.articles
  using hnsw (embedding vector_cosine_ops);

comment on column public.articles.embedding is
  'Gemini gemini-embedding-001 text embedding (768 dimensions, truncated from the model''s native 3072) over title + summary. NULL until the backfill script (see src/lib/embeddings.ts) has run for that row, or for articles ingested before this column existed and not yet backfilled.';

-- RPC function used by src/lib/embeddings.ts (searchArticlesBySemanticSimilarity).
-- PostgREST/the Supabase JS client cannot express pgvector's cosine-distance
-- operator (<=>) directly, so this wraps it in a callable function.
create or replace function public.match_articles(
  query_embedding vector(768),
  match_count int default 8
)
returns setof public.articles
language sql stable
as $$
  select *
  from public.articles
  where embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;
