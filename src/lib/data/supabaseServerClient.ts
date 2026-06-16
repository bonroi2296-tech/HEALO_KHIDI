/**
 * healwith: Supabase server-side client for API routes
 *
 * ⚠️ SERVER ONLY — 이 파일은 절대 클라이언트 번들에 포함되면 안 됨.
 *    SUPABASE_SERVICE_ROLE_KEY 가 RLS 를 우회하기 때문.
 *    `import "server-only"` 가드로 빌드 시점에 번들링 차단.
 *
 * 과거 주석에 "server-only 가 dynamic import 를 막아서 뺀다" 고 적혀 있었으나,
 * 실제로 이 모듈을 쓰는 곳은 전부 app/api 하위 route.ts (서버 컨텍스트) 이므로
 * server-only 를 붙여도 문제 없음. 오히려 누가 실수로 client component 에서
 * import 하면 빌드가 즉시 터져서 유출 방지됨.
 */

import "server-only";

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export type TypedSupabaseClient = SupabaseClient<Database>;

let instance: TypedSupabaseClient | null = null;

export function getSupabaseServerClient(): TypedSupabaseClient {
  if (instance) return instance;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      `[getSupabaseServerClient] Missing env: ${!url ? "NEXT_PUBLIC_SUPABASE_URL " : ""}${!key ? "SUPABASE_SERVICE_ROLE_KEY/ANON_KEY" : ""}`
    );
  }

  instance = createClient<Database>(url, key, {
    auth: { persistSession: false },
  });

  return instance;
}
