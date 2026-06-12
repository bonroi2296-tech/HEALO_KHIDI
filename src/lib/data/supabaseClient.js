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
    // env 미설정 — 빌드든 브라우저든 더미 반환 (빈 데이터로 강등).
    // 과거엔 브라우저에서 throw 해서 사용하는 컴포넌트가 전부 크래시했음
    // (CI E2E 다수 실패 원인) → 화면은 살리고 데이터만 비게 함.
    if (typeof window !== 'undefined') {
      console.error(`[supabaseClient] env 미설정 (${!supabaseUrl ? 'NEXT_PUBLIC_SUPABASE_URL ' : ''}${!supabaseKey ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY' : ''}) — 더미 클라이언트로 동작`);
    }
    return createDummySupabaseClient();
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

// 더미 클라이언트 (빌드 시점/env 미설정 환경용)
// 과거엔 메서드를 하나씩 나열했는데 .or/.in/.gte 등 누락분 호출 시 페이지가
// 통째로 죽는 사고가 있었음(CI E2E /search SSR 크래시) → Proxy 로
// "어떤 메서드를 어떤 순서로 불러도" 체이닝되고 await 하면 빈 결과를 주는
// 만능 쿼리로 교체. single/maybeSingle 은 data: null, 그 외 data: [].
function createDummySupabaseClient() {
  const createDummyQuery = () => {
    let singleMode = false;
    const proxy = new Proxy(function () {}, {
      get(_t, prop) {
        if (prop === "then") {
          const result = { data: singleMode ? null : [], error: null, count: 0 };
          return (resolve, reject) => Promise.resolve(result).then(resolve, reject);
        }
        if (prop === "single" || prop === "maybeSingle") {
          return () => {
            singleMode = true;
            return proxy;
          };
        }
        return () => proxy;
      },
    });
    return proxy;
  };

  return {
    from: () => createDummyQuery(),
    rpc: () => createDummyQuery(),
    storage: {
      from: () => ({
        getPublicUrl: () => ({ data: { publicUrl: "" } }),
        createSignedUrl: () => Promise.resolve({ data: null, error: null }),
      }),
    },
    channel: () => ({ on: function () { return this; }, subscribe: () => ({}) }),
    removeChannel: () => {},
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
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
