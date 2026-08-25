// Supabase client setup.
//
// - `getSupabaseBrowser()`: safe to use in Client Components. Uses the public
//   anon key, subject to Row Level Security (RLS) policies.
// - `supabaseServer()`: for Route Handlers / Server Components only. Uses the
//   service role key, which bypasses RLS — never import this in client code.

import { createBrowserClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Browser/client-side Supabase client. Respects RLS policies.
 * Lazily instantiated so that importing this module (e.g. from a Route
 * Handler bundle during build-time page data collection) does not throw
 * when public env vars are not yet configured.
 */
export function getSupabaseBrowser() {
  if (browserClient) return browserClient;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables."
    );
  }

  browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return browserClient;
}

let serviceClient: SupabaseClient | null = null;

/**
 * Server-only Supabase client using the service role key.
 * Bypasses RLS — only call this from Route Handlers, Server Actions, or
 * other server-side code. Never expose the service role key to the client.
 */
export function supabaseServer(): SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error(
      "supabaseServer() must not be called from client-side code."
    );
  }

  if (serviceClient) return serviceClient;

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
    );
  }

  serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return serviceClient;
}
