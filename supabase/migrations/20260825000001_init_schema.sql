-- VERIFY PH DATABASE SCHEMA
-- Current tables: articles and claims

create table public.articles (
  id uuid primary key default gen_random_uuid(),

  title text not null
    check (char_length(btrim(title)) > 0),

  summary text,

  source_url text not null unique
    check (char_length(btrim(source_url)) > 0),

  source_name text not null
    check (char_length(btrim(source_name)) > 0),

  published_at timestamptz not null,

  created_at timestamptz not null default now(),

  category text not null default 'General'
    check (
      category in (
        'News & Politics',
        'Economy',
        'Health & Safety',
        'Lifestyle',
        'General'
      )
    ),

  -- Optional publisher image link; not an uploaded image file.
  image_url text
);

create index articles_published_at_idx
  on public.articles (published_at desc);

create index articles_category_published_at_idx
  on public.articles (category, published_at desc);

alter table public.articles enable row level security;

create policy "Public can read articles"
on public.articles
for select
to anon, authenticated
using (true);


create table public.claims (
  id uuid primary key default gen_random_uuid(),

  -- Claim pasted by the user
  user_text text not null
    check (
      char_length(btrim(user_text)) >= 1
      and char_length(btrim(user_text)) <= 5000
    ),

  -- Must use one of these exact five labels only
  verdict text
    check (
      verdict in (
        'Officially Confirmed',
        'Corroborated',
        'Developing',
        'Insufficient Evidence',
        'Contradicted'
      )
    ),

  -- AI explanation based only on retrieved articles
  ai_explanation text,

  -- Array of evidence articles / source links used by the AI
  sources_used jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),

  status text not null default 'pending'
    check (status in ('pending', 'completed', 'failed')),

  confidence numeric(4,3)
    check (confidence is null or (confidence >= 0 and confidence <= 1)),

  processed_at timestamptz
);

create index claims_status_created_at_idx
  on public.claims (status, created_at desc);

alter table public.claims enable row level security;

-- There is intentionally no public policy for claims.
-- The server-side Claim Checker should create/update claim rows.
