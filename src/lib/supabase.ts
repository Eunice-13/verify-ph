import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function requiredServerEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY") {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is missing from .env.local`);
  }

  return value;
}

// ---------------------------------------------------------------------------
// Server client (service-role key) — use in API routes and server components.
// Never import into browser code.
// ---------------------------------------------------------------------------
export function createSupabaseServiceClient(): SupabaseClient {
  return createClient(
    requiredServerEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredServerEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

/** Alias used by the claim-checker route and other server code. */
export const supabaseServer = createSupabaseServiceClient;

// ---------------------------------------------------------------------------
// Shared column list for `public.articles` queries.
//
// Explicit metadata columns only — deliberately excludes `embedding`
// (vector(768), added by supabase/migrations/20260826102729_add_article_embeddings.sql).
// Every normal feed/claim-checker query should select this constant rather
// than "*", so the embedding vector is never fetched, serialized, or
// returned in any API response by accident.
// ---------------------------------------------------------------------------
export const ARTICLE_COLUMNS =
  "id, title, summary, source_url, source_name, published_at, category, image_url, created_at";

// ---------------------------------------------------------------------------
// Browser client (anon key) — safe for client components.
// ---------------------------------------------------------------------------
export function createSupabaseBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
