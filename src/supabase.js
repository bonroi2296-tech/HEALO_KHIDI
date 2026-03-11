// src/supabase.js
// ✅ OAuth callback과 동일한 쿠키 기반 세션 관리
import { createBrowserClient } from '@supabase/ssr';

// 빌드 시점에는 환경 변수가 없을 수 있으므로, 런타임에서만 체크
let supabaseInstance = null;

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // 환경 변수 검증 (런타임에서만 실행)
  if (!supabaseUrl || !supabaseKey) {
    const missing = [];
    if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!supabaseKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    
    throw new Error(
      `❌ Supabase 환경 변수가 설정되지 않았습니다!\n` +
      `누락된 변수: ${missing.join(', ')}\n` +
      `프로젝트 루트에 .env.local 파일을 생성하고 다음을 추가하세요:\n` +
      `NEXT_PUBLIC_SUPABASE_URL=your_url\n` +
      `NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key`
    );
  }

  if (!supabaseInstance) {
    // ✅ 쿠키 기반 클라이언트로 변경 (OAuth callback과 동일한 세션 저장소)
    supabaseInstance = createBrowserClient(supabaseUrl, supabaseKey);
  }

  return supabaseInstance;
}

// 더미 클라이언트 (빌드 시점용)
const createDummySupabaseClient = () => {
  const dummyQuery = {
    select: () => dummyQuery,
    eq: () => dummyQuery,
    neq: () => dummyQuery,
    ilike: () => dummyQuery,
    order: () => dummyQuery,
    limit: () => Promise.resolve({ data: [], error: null }),
    range: () => Promise.resolve({ data: [], error: null }),
    single: () => Promise.resolve({ data: null, error: null }),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
  };
  return {
    from: () => dummyQuery,
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: null } }),
      signOut: () => Promise.resolve({ error: null }),
    },
  };
};

// Proxy를 사용하여 런타임에만 초기화 (빌드 시점에는 에러 발생하지 않음)
export const supabase = new Proxy({}, {
  get(_target, prop) {
    try {
      const client = getSupabase();
      const value = client[prop];
      // 함수인 경우 this 바인딩 유지
      if (typeof value === 'function') {
        return value.bind(client);
      }
      return value;
    } catch (error) {
      // 환경 변수가 없을 때 더미 클라이언트 반환 (에러 방지)
      // 빌드 시점 또는 클라이언트에서 환경 변수가 없을 때
      if (typeof window === 'undefined' || process.env.NODE_ENV === 'development') {
        // 개발 환경에서는 콘솔에 경고만 출력
        if (typeof window !== 'undefined') {
          console.warn('[supabase] Environment variables missing, using dummy client:', error.message);
        }
      } else {
        // 프로덕션에서는 에러 로그만 출력
        console.error('[supabase] Environment variables missing:', error.message);
      }
      const dummy = createDummySupabaseClient();
      const value = dummy[prop];
      if (typeof value === 'function') {
        return value.bind(dummy);
      }
      return value;
    }
  },
});