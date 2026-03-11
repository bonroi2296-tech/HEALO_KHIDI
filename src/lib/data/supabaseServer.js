import { createClient } from "@supabase/supabase-js";

// 빌드 시점에는 환경 변수가 없을 수 있으므로, 런타임에서만 체크
let supabaseServerInstance = null;

function getSupabaseServer() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    const missing = [];
    if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL/VITE_SUPABASE_URL");
    if (!supabaseKey)
      missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY/VITE_SUPABASE_KEY");
    throw new Error(
      `Supabase environment variables are missing: ${missing.join(", ")}`
    );
  }

  if (!supabaseServerInstance) {
    supabaseServerInstance = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
  }

  return supabaseServerInstance;
}

// 더미 Supabase 클라이언트 (빌드 시점 환경 변수 없을 때 사용)
// 모든 메서드 체이닝을 지원하도록 재귀적으로 자기 자신을 반환
const createDummyQuery = () => {
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
  return dummyQuery;
};

const createDummyClient = () => ({
  from: () => createDummyQuery(),
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
});

// Proxy를 사용하여 런타임에만 초기화 (빌드 시점에는 에러 발생하지 않음)
export const supabaseServer = new Proxy({}, {
  get(_target, prop) {
    try {
      const client = getSupabaseServer();
      const value = client[prop];
      if (typeof value === 'function') {
        return value.bind(client);
      }
      return value;
    } catch (_error) {
      // 빌드 시점에 환경 변수가 없으면 더미 클라이언트 반환
      const dummy = createDummyClient();
      const value = dummy[prop];
      if (typeof value === 'function') {
        return value.bind(dummy);
      }
      return value;
    }
  },
});
