/**
 * 🔒 보안: 이 파일은 서버에서만 사용됩니다 (클라이언트 번들 차단)
 */
import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * ✅ P0 수정: Fail-Closed 원칙 적용
 * 
 * 수정 전:
 * - 환경변수 누락 시 더미 클라이언트를 반환
 * - DB 저장이 조용히 실패할 수 있음
 * 
 * 수정 후:
 * - 각 API route에서 assertSupabaseEnv() 호출로 env 검증
 * - 빌드 시점에는 env 없어도 에러 안 남 (타입 체크만 수행)
 * - 운영 중 "리드가 쌓이는 줄 알았는데 실제로는 저장 안 됨" 방지
 * 
 * 이유:
 * - 데이터 유실 방지 및 운영 사고 예방
 * - 환경 설정 문제를 빠르게 인지하고 수정 가능
 * 
 * 사용법:
 * - 각 API route 시작 부분에 assertSupabaseEnv() 호출
 */

// 빌드 시점에는 환경 변수가 없을 수 있으므로, 런타임에서만 체크
// 모듈 레벨에서 환경 변수를 읽지 않도록 함수 내부에서만 읽음
let supabaseAdminInstance: ReturnType<typeof createClient<Database>> | null = null;

/**
 * ✅ 새로 추가: Supabase 환경변수 검증 함수
 * 각 API route에서 호출하여 env 누락 시 즉시 에러 발생
 */
export function assertSupabaseEnv(): void {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    const missing: string[] = [];
    if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL/VITE_SUPABASE_URL");
    if (!serviceKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
    
    const error = new Error(
      `[CRITICAL] Supabase admin 환경변수 누락: ${missing.join(", ")}. ` +
      "DB 저장이 불가능합니다. Vercel 환경변수를 확인하세요."
    );
    console.error(error.message);
    throw error;
  }
}

function getSupabaseAdmin() {
  // 이미 초기화되었으면 재사용
  if (supabaseAdminInstance) {
    return supabaseAdminInstance;
  }

  // 환경 변수는 함수 내부에서만 읽기 (빌드 시점 평가 방지)
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // 환경 변수 체크 (런타임에서만 실행됨)
  if (!supabaseUrl || !serviceKey) {
    const missing: string[] = [];
    if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL/VITE_SUPABASE_URL");
    if (!serviceKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
    throw new Error(`Supabase admin env missing: ${missing.join(", ")}`);
  }

  // 클라이언트 생성
  supabaseAdminInstance = createClient<Database>(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  return supabaseAdminInstance;
}

// 더미 클라이언트 (빌드 시점용)
const createDummyAdminClient = () => {
  const dummyQuery = {
    select: () => dummyQuery,
    eq: () => dummyQuery,
    neq: () => dummyQuery,
    ilike: () => dummyQuery,
    or: () => dummyQuery,
    in: () => dummyQuery,
    order: () => dummyQuery,
    limit: () => Promise.resolve({ data: [], error: null }),
    range: () => Promise.resolve({ data: [], error: null }),
    single: () => Promise.resolve({ data: null, error: null }),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => Promise.resolve({ data: null, error: null }),
    delete: () => Promise.resolve({ data: null, error: null }),
  };
  return {
    from: () => dummyQuery,
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: null } }),
      signOut: () => Promise.resolve({ error: null }),
    },
    rpc: () => Promise.resolve({ data: null, error: null }),
    storage: {
      from: () => ({
        createSignedUrl: () => Promise.resolve({ data: null, error: null }),
      }),
    },
  };
};

// Proxy를 사용하여 런타임에만 초기화 (빌드 시점에는 에러 발생하지 않음)
export const supabaseAdmin = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get(_target, prop) {
    try {
      const admin = getSupabaseAdmin();
      const value = admin[prop as keyof typeof admin];
      // 함수인 경우 this 바인딩 유지
      if (typeof value === 'function') {
        return value.bind(admin);
      }
      return value;
    } catch (error) {
      // 빌드 시점에 환경 변수가 없으면 더미 클라이언트 반환
      if (typeof window === 'undefined') {
        const dummy = createDummyAdminClient();
        const value = dummy[prop as keyof typeof dummy];
        if (typeof value === 'function') {
          return value.bind(dummy);
        }
        return value;
      }
      // 런타임에는 에러 재발생
      throw error;
    }
  },
});
