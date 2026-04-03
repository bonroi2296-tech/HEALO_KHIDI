/**
 * HEALO-KHIDI: Supabase server-side client for API routes
 *
 * supabaseAdmin (from rag/supabaseAdmin) requires SUPABASE_SERVICE_ROLE_KEY.
 * This helper provides a fallback using the anon key for development,
 * without the "server-only" import that blocks dynamic imports in API routes.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let instance: SupabaseClient | null = null;

export function getSupabaseServerClient(): SupabaseClient {
  if (instance) return instance;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      `[getSupabaseServerClient] Missing env: ${!url ? "NEXT_PUBLIC_SUPABASE_URL " : ""}${!key ? "SUPABASE_SERVICE_ROLE_KEY/ANON_KEY" : ""}`
    );
  }

  instance = createClient(url, key, {
    auth: { persistSession: false },
  });

  return instance;
}
