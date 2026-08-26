-- Enable fuzzy/typo-tolerant text matching for the claim-checker's article
-- search fallback.
--
-- OWNER ACTION REQUIRED: This migration has NOT been applied to the live
-- Supabase project (no DDL access available when this was written - only
-- PostgREST via the service-role API key). Please run this file against
-- the production database via the Supabase SQL Editor.
--
-- WHY: Claims pasted from social media are full of typos and inconsistent
-- spelling (e.g. "Marikina" vs "Marikena", "Duterte" vs "Duterete"). Exact
-- ILIKE substring matching (what the app currently uses as a fallback)
-- misses these near-misses entirely. pg_trgm adds trigram similarity
-- scoring, which tolerates small spelling differences.
--
-- This migration only enables the extension and adds trigram indexes for
-- performance. No application code changes are included here — see
-- src/app/api/claim-checker/route.ts, which the app owner should update to
-- add a pg_trgm similarity fallback (e.g. using the `%` similarity operator
-- or `similarity()` function) once this migration is applied. Ask your dev
-- team / re-run the AI assistant once this is live so that follow-up code
-- can be written against the new capability.

create extension if not exists pg_trgm;

-- Trigram indexes speed up similarity searches on these columns. Without
-- an index, pg_trgm still works but does a full table scan per query.
create index if not exists articles_title_trgm_idx
  on public.articles using gin (title gin_trgm_ops);

create index if not exists articles_summary_trgm_idx
  on public.articles using gin (summary gin_trgm_ops);
