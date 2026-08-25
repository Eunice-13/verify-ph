import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function requiredServerEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY") {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is missing from .env.local`);
  }

  return value;
}

// This client is for server routes only. Never import it into a browser
// component or expose SUPABASE_SERVICE_ROLE_KEY with a NEXT_PUBLIC_ prefix.
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
