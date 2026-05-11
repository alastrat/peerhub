import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client for object storage.
 *
 * Uses the service-role key so server actions can write to buckets without
 * row-level-security policies getting in the way. Never imported from a
 * client component (the `server-only` directive enforces this at build time).
 */
export function createSupabaseStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase Storage is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export const SURVEY_ASSETS_BUCKET = "survey-assets";
