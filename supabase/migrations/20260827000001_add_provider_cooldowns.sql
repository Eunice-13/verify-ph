-- Persists LLM provider cooldowns (see src/lib/llm-providers.ts) across
-- server restarts/redeploys.
--
-- OWNER ACTION REQUIRED: This migration has NOT been applied to the live
-- Supabase project. Please run this file against the production database
-- via the Supabase SQL Editor.
--
-- WHY: The multi-provider fallback pool for generateVerdict()/parseClaim()
-- tracks per-provider cooldowns (e.g. "gemini is rate-limited, skip it for
-- the next N minutes/hours") in memory. An in-memory-only map resets on
-- every server restart or redeploy — on Vercel specifically, serverless
-- function instances are also not guaranteed to be the same process
-- between invocations, so an in-memory map can't reliably persist a
-- cooldown across requests at all, let alone across a redeploy. Storing
-- cooldowns here means a genuinely daily-quota-exhausted provider (see the
-- 20260827 daily-quota vs per-minute distinction in llm-providers.ts) stays
-- skipped for the rest of the day even if the app redeploys or a different
-- serverless instance handles the next request.

create table public.provider_cooldowns (
  provider_name text primary key,
  cooldown_until timestamptz not null,
  reason text,
  updated_at timestamptz not null default now()
);

alter table public.provider_cooldowns enable row level security;

-- No public policy: only the server (service-role client, which bypasses
-- RLS) reads/writes this table. Mirrors the `claims` table's approach.
