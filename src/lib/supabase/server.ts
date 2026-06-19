/**
 * healwith: Supabase Server Client (SSR-safe)
 * 
 * 목적:
 * - 서버(API Route, Server Component)에서 사용하는 Supabase 클라이언트
 * - @supabase/ssr의 createServerClient 사용
 * - Next.js cookies()를 통해 쿠키 읽기/쓰기
 * - Route Handler(/api/**)에서 세션 확인 가능
 * 
 * 사용법:
 * ```ts
 * import { createSupabaseServerClient } from '@/lib/supabase/server'
 * 
 * export async function GET(request: NextRequest) {
 *   const supabase = createSupabaseServerClient()
 *   const { data: { user } } = await supabase.auth.getUser()
 *   // ...
 * }
 * ```
 */

// ✅ SERVER ONLY — createServiceRoleClient() 는 SUPABASE_SERVICE_ROLE_KEY 를
//    사용하며 RLS 를 우회. 클라이언트 번들에 절대 포함되면 안 됨.
import 'server-only'

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

export type TypedSupabaseServerClient = SupabaseClient<Database>

/**
 * ✅ 서버용 Supabase 클라이언트 생성 (쿠키 기반, DB 타입 바인딩)
 *
 * ⚠️ Next.js 15: cookies()는 async 함수이므로 await 필요
 *
 * @returns Supabase client with Database types
 */
export async function createSupabaseServerClient(): Promise<TypedSupabaseServerClient> {
  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      '[supabase/server] NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required'
    )
  }

  // @supabase/ssr의 createServerClient 사용
  // cookies()를 통해 Next.js와 통합
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch {
          // Route Handler에서 set/remove는 실패할 수 있음 (읽기 전용)
          // middleware에서 쿠키 업데이트가 처리됨
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options })
        } catch {
          // Route Handler에서 set/remove는 실패할 수 있음
        }
      },
    },
  })
}

/**
 * ✅ API Route 전용: 요청의 Cookie 헤더로 Supabase 클라이언트 생성
 * Vercel 서버리스에서 next/headers cookies()가 요청 쿠키를 못 넘기는 경우 대비
 */
export function createSupabaseServerClientFromRequest(request: NextRequest): TypedSupabaseServerClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('[supabase/server] NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required')
  }
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll() {
        // API Route에서는 읽기만 (세션 갱신 쿠키는 미들웨어에서 처리)
      },
    },
  })
}

/**
 * ✅ Service Role 클라이언트 생성 (관리자 전용, DB 타입 바인딩)
 *
 * ⚠️ 주의: Service Role Key는 모든 RLS를 무시합니다.
 * 관리자 API에서만 사용하고, 반드시 권한 체크를 선행하세요.
 *
 * @returns Supabase client with service role key
 */
export function createServiceRoleClient(): TypedSupabaseServerClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      '[supabase/server] NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required'
    )
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * ✅ Anonymous(no-session) 서버 클라이언트 — 공개 읽기 전용 데이터(병원·시술 목록 등).
 *
 * 보안등급: **anon** (RLS 가 익명 사용자로 적용됨 — service_role 우회 아님).
 * 쿠키/세션 없음 → 공개 SSR 페이지·빌드 정적생성에서 사용.
 *
 * 중복정리(3단계): 옛 `src/lib/data/supabaseServer.js` 의 `supabaseServer` 를 이 정본으로 통합.
 * 동작은 그대로 보존(공개 페이지 무변화): env 누락 시 더미 클라이언트(빈 데이터)로 폴백해
 * 빌드/렌더가 깨지지 않게 한다. 공개·비민감 데이터라 service_role 의 fail-closed 와 달리 graceful.
 */
let anonServerInstance: TypedSupabaseServerClient | null = null

function buildAnonServerClient(): TypedSupabaseServerClient {
  if (anonServerInstance) return anonServerInstance

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      '[supabase/server] anon client env missing: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }

  anonServerInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  })
  return anonServerInstance
}

// 더미 쿼리(빌드 시점 env 없을 때) — 체이닝 전부 자기 자신 반환
const anonDummyQuery: any = {
  select: () => anonDummyQuery,
  eq: () => anonDummyQuery,
  neq: () => anonDummyQuery,
  ilike: () => anonDummyQuery,
  order: () => anonDummyQuery,
  limit: () => Promise.resolve({ data: [], error: null }),
  range: () => Promise.resolve({ data: [], error: null }),
  single: () => Promise.resolve({ data: null, error: null }),
  maybeSingle: () => Promise.resolve({ data: null, error: null }),
}

const createAnonDummyClient = (): any => ({
  from: () => anonDummyQuery,
  storage: {
    from: () => ({
      createSignedUrl: () => Promise.resolve({ data: { signedUrl: '' }, error: null }),
    }),
  },
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: null } }),
    signOut: () => Promise.resolve({ error: null }),
  },
})

/**
 * 공개 읽기 전용 anon 클라이언트(싱글톤 Proxy). env 누락 시 더미로 graceful 폴백.
 */
export const supabaseAnonServer = new Proxy({} as TypedSupabaseServerClient, {
  get(_target, prop) {
    try {
      const client = buildAnonServerClient()
      const value = (client as any)[prop]
      return typeof value === 'function' ? value.bind(client) : value
    } catch {
      const dummy = createAnonDummyClient()
      const value = dummy[prop]
      return typeof value === 'function' ? value.bind(dummy) : value
    }
  },
})
