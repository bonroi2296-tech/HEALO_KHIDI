"use client";

// ✅ OAuth callback과 동일한 쿠키 기반 세션 관리
import { createBrowserClient } from "@supabase/ssr";

// 런타임에만 초기화 (빌드 시점에는 에러 발생하지 않음)
// 환경 변수가 있으면 즉시 초기화, 없으면 나중에 초기화
let supabaseClientInstance = null;

function initSupabaseClient() {
  if (supabaseClientInstance) return supabaseClientInstance;
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    // 빌드 시점에는 더미 클라이언트 반환
    if (typeof window === 'undefined') {
      return createDummySupabaseClient();
    }
    // 런타임에는 에러
    throw new Error(`Supabase environment variables are missing: ${!supabaseUrl ? 'NEXT_PUBLIC_SUPABASE_URL' : ''} ${!supabaseKey ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY' : ''}`);
  }

  // ✅ 쿠키 기반 클라이언트로 변경 (OAuth callback과 동일한 세션 저장소)
  const client = createBrowserClient(supabaseUrl, supabaseKey);

  // ✅ 리프레시 토큰 무효 시 콘솔 에러 방지: 로그아웃 처리 후 null 세션 반환
  const originalGetSession = client.auth.getSession.bind(client.auth);
  client.auth.getSession = async function () {
    try {
      return await originalGetSession();
    } catch (e) {
      const msg = e?.message || String(e);
      if ((e?.name === "AuthApiError" || e?.message?.includes?.("Refresh Token")) && /Refresh Token.*Not Found|invalid.*refresh/i.test(msg)) {
        await client.auth.signOut({ scope: "local" }).catch(() => {});
        return { data: { session: null }, error: e };
      }
      throw e;
    }
  };

  supabaseClientInstance = client;
  return supabaseClientInstance;
}

// 더미 클라이언트 (빌드 시점용)
// 모든 메서드 체이닝을 지원하도록 재귀적으로 자기 자신을 반환
function createDummySupabaseClient() {
  const createDummyQuery = () => {
    const dummyQuery = {
      select: () => dummyQuery,
      eq: () => dummyQuery,
      neq: () => dummyQuery,
      ilike: () => dummyQuery,
      order: () => dummyQuery, // 중복 호출 지원
      limit: () => Promise.resolve({ data: [], error: null }),
      range: () => Promise.resolve({ data: [], error: null }),
      single: () => Promise.resolve({ data: null, error: null }),
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
    };
    return dummyQuery;
  };
  
  return {
    from: () => createDummyQuery(),
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: null } }),
      signOut: () => Promise.resolve({ error: null }),
    },
  };
}

// Proxy를 사용하여 런타임에만 초기화
export const supabaseClient = new Proxy({}, {
  get(_target, prop) {
    try {
      const client = initSupabaseClient();
      const value = client[prop];
      if (typeof value === 'function') {
        return value.bind(client);
      }
      return value;
    } catch (error) {
      // 환경 변수가 없을 때 더미 클라이언트 반환 (에러 방지)
      console.error('[supabaseClient] Environment variables missing:', error.message);
      const dummy = createDummySupabaseClient();
      const value = dummy[prop];
      if (typeof value === 'function') {
        return value.bind(dummy);
      }
      return value;
    }
  },
});
