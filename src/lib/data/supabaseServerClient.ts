/**
 * healwith: Supabase server-side client for API routes
 *
 * ⚠️ SERVER ONLY — SUPABASE_SERVICE_ROLE_KEY 가 RLS 를 우회하므로 클라이언트 번들 금지.
 *
 * 중복정리(3단계): 과거 이 파일은 자체적으로 service_role 클라이언트를 만들되
 * 키가 없으면 **anon 으로 폴백**(`SERVICE_ROLE_KEY || ANON_KEY`)했다 — 이는 위험했다:
 * service_role 전용 테이블을 다루는 호출부(KHIDI 라우트·livekit webhook·알림 등)가
 * 키 누락 시 조용히 anon 으로 떨어져 RLS 에 막히거나 권한이 어긋날 수 있었다.
 *
 * 이제 정본 service_role 싱글톤(`supabaseAdmin`, fail-closed)에 **위임**한다.
 * - 프로덕션 동작 동일(SERVICE_ROLE_KEY 설정 시 = 기존과 같은 service_role).
 * - env 누락 시 anon 으로 새지 않고 throw(fail-closed) → 조용한 권한 강등 차단.
 * - 호출부(`getSupabaseServerClient()`)는 무변경.
 */

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";

export type TypedSupabaseClient = SupabaseClient<Database>;

/**
 * service_role 서버 클라이언트(정본 supabaseAdmin 싱글톤 위임).
 * RLS 를 우회하므로 반드시 권한 체크 후 사용할 것.
 */
export function getSupabaseServerClient(): TypedSupabaseClient {
  return supabaseAdmin as unknown as TypedSupabaseClient;
}
