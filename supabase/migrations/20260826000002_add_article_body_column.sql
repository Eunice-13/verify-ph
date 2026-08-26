-- Add a `body` column to store full article text (not just the truncated
-- summary), for better evidence quality in the claim-checker.
--
-- OWNER ACTION REQUIRED: This migration has NOT been applied to the live
-- Supabase project. Please run this file against the production database
-- via the Supabase SQL Editor.
--
-- WHY: The claim-checker currently only has access to `title` and
-- `summary` (summary is truncated to 1000 characters from the RSS feed's
-- short description/snippet, see src/lib/rss.ts). This means claims can
-- only be verified against a headline and a couple of sentences, not the
-- full article — so specific figures, quotes, or secondary details
-- mentioned deeper in an article are often invisible to both search and
-- the verdict step, even when the article genuinely covers the claim.
--
-- IMPORTANT CAVEAT: Adding this column alone is not enough. The RSS feeds
-- currently ingested (see src/lib/sources.ts / src/lib/rss.ts) only provide
-- a short snippet, not full body text — RSS is not designed to carry full
-- article content. To actually populate `body`, the ingestion pipeline
-- would need to be extended to fetch and parse each article's full page
-- (e.g. via a headless fetch + HTML content extraction library), which is
-- a larger change than a schema migration and should be scoped/reviewed
-- separately, including checking each outlet's terms of service around
-- republishing full article text. This migration only adds the column so
-- that work can proceed independently once approved.

alter table public.articles
  add column if not exists body text;

comment on column public.articles.body is
  'Full article body text, if available. NULL for articles ingested before this column existed or where full-body scraping is not yet implemented for that source. Falls back to summary when NULL.';
