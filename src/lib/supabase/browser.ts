/**
 * HEALO: Supabase Browser Client (SSR-safe)
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
import type { SupabaseClient } from '@supabase/supabase-js'

// 싱글톤 인스턴스
let browserClient: SupabaseClient | null = null

/**
 * ✅ 브라우저용 Supabase 클라이언트 생성
 * 
 * @returns Supabase client
 */
export function createSupabaseBrowserClient(): SupabaseClient {
  // 싱글톤: 이미 생성되었으면 재사용
  if (browserClient) {
    return browserClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // 빌드/SSR 시 env 없으면 더미 반환 (빌드 실패 방지). 브라우저에서는 없으면 throw.
  const isServer = typeof window === 'undefined'
  if (!supabaseUrl || !supabaseAnonKey) {
    if (isServer) {
      browserClient = createBrowserClient(
        'https://build-placeholder.supabase.co',
        'build-placeholder-anon-key'
      )
      return browserClient
    }
    throw new Error(
      '[supabase/browser] NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required'
    )
  }

  // @supabase/ssr의 createBrowserClient 사용
  const client = createBrowserClient(supabaseUrl, supabaseAnonKey)

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
