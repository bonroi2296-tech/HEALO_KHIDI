/**
 * healwith: Supabase Browser Client (SSR-safe)
 * 
 * 목적:
 * - 브라우저(클라이언트)에서 사용하는 Supabase 클라이언트
 * - @supabase/ssr의 createBrowserClient 사용
 * - 쿠키 기반 세션 관리 (localStorage 대신)
 * - 싱글톤 패턴으로 "Multiple GoTrueClient instances" 경고 방지
 * 
 * 사용법:
 * ```ts
 * import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
 * 
 * const supabase = createSupabaseBrowserClient()
 * const { data, error } = await supabase.auth.signInWithPassword(...)
 * ```
 */

import { createBrowserClient } from '@supabase/ssr'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

export type TypedSupabaseClient = SupabaseClient<Database>

// 싱글톤 인스턴스
let browserClient: TypedSupabaseClient | null = null

/**
 * ✅ 브라우저용 Supabase 클라이언트 생성 (DB 타입 바인딩)
 *
 * @returns Supabase client with Database types
 */
export function createSupabaseBrowserClient(): TypedSupabaseClient {
  // 싱글톤: 이미 생성되었으면 재사용
  if (browserClient) {
    return browserClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // env 없으면 placeholder 클라이언트 반환 (빌드/SSR/브라우저 공통).
  // 과거엔 브라우저에서 throw 했는데, 이 클라이언트를 쓰는 컴포넌트가 전부
  // 크래시해 페이지가 하얗게 죽었음(CI E2E 다수 실패 원인) → 네트워크 호출이
  // 에러 객체로 돌아오는 placeholder 로 강등해 화면은 살리고 데이터만 비게 함.
  if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window !== 'undefined') {
      console.error(
        '[supabase/browser] NEXT_PUBLIC_SUPABASE_URL/ANON_KEY 미설정 — placeholder 클라이언트로 동작 (데이터 빈 상태)'
      )
    }
    browserClient = createBrowserClient<Database>(
      'https://build-placeholder.supabase.co',
      'build-placeholder-anon-key'
    )
    return browserClient
  }

  // @supabase/ssr의 createBrowserClient 사용
  const client = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)

  // ✅ 리프레시 토큰 무효 시 콘솔 에러 방지: 로그아웃 처리 후 null 세션 반환
  const originalGetSession = client.auth.getSession.bind(client.auth)
  client.auth.getSession = async function () {
    try {
      return await originalGetSession()
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? String(e)
      if (
        ((e as { name?: string })?.name === "AuthApiError" || (e as { message?: string })?.message?.includes?.("Refresh Token")) &&
        /Refresh Token.*Not Found|invalid.*refresh/i.test(msg)
      ) {
        await client.auth.signOut({ scope: "local" }).catch(() => {})
        return { data: { session: null }, error: e }
      }
      throw e
    }
  }

  browserClient = client
  return browserClient
}

/**
 * ✅ 싱글톤 인스턴스 리셋 (테스트용)
 */
export function resetBrowserClient() {
  browserClient = null
}

/**
 * 이메일 링크 발송 전용 클라이언트 (implicit flow, 세션 저장 안 함).
 *
 * 왜 별도냐: 기본 SSR 클라이언트는 PKCE flow → resetPasswordForEmail이 만드는
 * 메일 링크의 token_hash에 `pkce_` 접두가 붙는다. 그 토큰은 검증 시 code_verifier
 * (요청한 그 브라우저의 쿠키)가 있어야 하고, verifyOtp는 verifier 교환을 안 하므로
 * /reset-password에서 항상 "유효하지 않음"으로 실패한다(+여러 번 요청·다른 기기에서 열면 무조건 깨짐).
 * implicit flow로 쏘면 평범한 token_hash가 발급돼 verifyOtp가 서버에서 바로 검증된다.
 */
export function createOtpEmailClient(): TypedSupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://build-placeholder.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'build-placeholder-anon-key'
  return createClient<Database>(url, key, {
    auth: { flowType: 'implicit', persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}
