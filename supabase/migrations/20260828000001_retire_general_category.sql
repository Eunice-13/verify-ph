-- Retire "General" as a valid articles.category value.
--
-- OWNER ACTION REQUIRED: This migration has NOT been applied to the live
-- Supabase project. Please run this file against the production database
-- via the Supabase SQL Editor, AFTER running
-- scripts/reclassify-general-articles.mjs (or immediately before it, since
-- this migration itself also reclassifies any remaining 'General' rows —
-- see below — but running the script first gives better per-article
-- category choices using the full topic-matching logic, rather than this
-- migration's blunter one-shot reassignment).
--
-- WHY: "General" has been repurposed at the application level as the
-- "For You" home-embed slot (see FOR_YOU_CATEGORY in src/types/index.ts)
-- rather than a real content category. The ingestion pipeline
-- (src/lib/rss.ts / src/lib/sources.ts) no longer ever assigns it to new
-- articles. This migration brings the database's own check constraint in
-- sync with that: the four real categories are the only valid values.
--
-- SAFETY NET: if any 'General' rows still exist when this runs (e.g. the
-- reclassification script wasn't run first, or a new one snuck in via a
-- race with an in-flight ingestion run), they are reassigned to
-- 'News & Politics' here as a last-resort default — chosen because it's
-- already the fallbackCategory for the majority of ingested sources — so
-- the constraint change below never fails on leftover data. This is a
-- blunter reassignment than the reclassification script's keyword-based
-- matching, which is why running that script first is preferred.

update public.articles
set category = 'News & Politics'
where category = 'General';

alter table public.articles drop constraint articles_category_check;

alter table public.articles add constraint articles_category_check
  check (
    category in (
      'News & Politics',
      'Economy',
      'Health & Safety',
      'Lifestyle'
    )
  );

-- The column's default was 'General', which is no longer a valid value —
-- update it to a real category so any future insert that omits category
-- doesn't violate the new constraint above.
alter table public.articles alter column category set default 'News & Politics';
