-- Simplify claims.verdict from 5 categories down to 3, for simplicity.
--
-- OWNER ACTION REQUIRED: This migration has NOT been applied to the live
-- Supabase project yet (no dashboard/DB access available at the time this
-- was written). Please run this file against the production database via
-- the Supabase SQL Editor (or `supabase db push`) to bring the live schema
-- in sync with the application code, which already only reads/writes the
-- 3 new labels below.
--
-- Old labels: 'Officially Confirmed', 'Corroborated', 'Developing',
--             'Insufficient Evidence', 'Contradicted'
-- New labels: 'Verified', 'Insufficient Evidence', 'Contradicted'
--
-- Existing rows using a removed label are remapped to 'Verified' (closest
-- semantic equivalent — both meant "supported by evidence").

alter table public.claims drop constraint claims_verdict_check;

update public.claims
set verdict = 'Verified'
where verdict in ('Officially Confirmed', 'Corroborated', 'Developing');

alter table public.claims add constraint claims_verdict_check
  check (
    verdict in (
      'Verified',
      'Insufficient Evidence',
      'Contradicted'
    )
  );
