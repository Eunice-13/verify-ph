-- Enable semantic/embedding-based search for the claim-checker, to
-- complement the existing keyword-based search (full-text + ILIKE
-- fallback). Purely additive — does not modify or remove any existing
-- column, data, index, or function.
--
-- STATUS: Already applied to the live Supabase project as migration
-- version 20260826102729 ("add_article_embeddings"). This file reflects
-- the hardened schema exactly as it exists in production (verified via
-- service-role queries: embedding column present, match_articles RPC
-- callable by service_role, 522 articles present with embedding IS NULL
-- pending backfill). This filename replaces the earlier draft
-- (20260826000003_add_article_embeddings.sql, never merged to main) to
-- keep the repo's migration history in sync with production — do not
-- reapply this against production.
--
-- Model: Gemini gemini-embedding-001 (text-only), output_dimensionality
-- truncated to 768 (recommended size — good quality/storage tradeoff, and
-- keeps the pgvector index performant). If a newer embedding model is
-- ever adopted, note its embedding space is NOT compatible with
-- gemini-embedding-001 — all existing embeddings would need to be
-- recomputed, not just new ones added.

create extension if not exists vector with schema extensions;

alter table public.articles
  add column if not exists embedding extensions.vector(768);

-- HNSW index for fast approximate nearest-neighbor search via cosine
-- distance. Reported as "unused" by Supabase's advisor while every
-- embedding remains NULL (pre-backfill) — this is expected and not a
-- reason to drop the index.
create index if not exists articles_embedding_hnsw_idx
  on public.articles
  using hnsw (embedding extensions.vector_cosine_ops);

comment on column public.articles.embedding is
  'Gemini gemini-embedding-001 text embedding (768 dimensions, truncated from the model''s native 3072) over normalized title + summary. NULL until the backfill script (see scripts/backfill-embeddings.mjs) has run for that row, or for articles ingested before this column existed and not yet backfilled.';

-- RPC function used by src/lib/embeddings.ts (searchArticlesBySemanticSimilarity).
-- PostgREST/the Supabase JS client cannot express pgvector's cosine-distance
-- operator (<=>) directly, so this wraps it in a callable function.
--
-- Hardened per security review:
--   - SECURITY INVOKER (not DEFINER): runs with the caller's own
--     privileges rather than the function owner's, so it can't be used to
--     escalate access beyond what the calling role already has.
--   - Empty search_path: prevents search-path hijacking by requiring every
--     referenced object to be fully schema-qualified (public.articles,
--     extensions.vector, etc.) rather than resolved implicitly.
--   - match_count is clamped to [1, 50] server-side so a caller can't
--     request an unbounded/huge result set.
--   - Returns only article metadata columns, never the embedding vector
--     itself, so a caller can't exfiltrate raw embeddings through this RPC.
--   - EXECUTE is revoked from PUBLIC/anon/authenticated and granted only
--     to service_role, since this RPC is only ever called from trusted
--     server-side code (src/lib/embeddings.ts) using the service-role
--     client — never from the browser/anon client.
create or replace function public.match_articles(
  query_embedding extensions.vector(768),
  match_count int default 8
)
returns table (
  id uuid,
  title text,
  summary text,
  source_url text,
  source_name text,
  published_at timestamptz,
  created_at timestamptz,
  category text,
  image_url text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    a.id,
    a.title,
    a.summary,
    a.source_url,
    a.source_name,
    a.published_at,
    a.created_at,
    a.category,
    a.image_url
  from public.articles a
  where a.embedding is not null
  order by a.embedding <=> query_embedding
  limit greatest(least(match_count, 50), 1);
$$;

revoke all on function public.match_articles(extensions.vector(768), int) from public;
revoke all on function public.match_articles(extensions.vector(768), int) from anon;
revoke all on function public.match_articles(extensions.vector(768), int) from authenticated;
grant execute on function public.match_articles(extensions.vector(768), int) to service_role;
