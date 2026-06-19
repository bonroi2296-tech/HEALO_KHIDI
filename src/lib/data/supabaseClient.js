"use client";

/**
 * healwith: 브라우저 Supabase 클라이언트 (호환 별칭)
 *
 * (2026-06-19) 중복정리: 자체 createBrowserClient 구현·더미 로직을 제거하고
 *   단일 정본 `@/lib/supabase/browser` 싱글톤(createSupabaseBrowserClient)으로 위임.
 *   - 실제 브라우저 클라이언트가 1개로 통일됨 → "Multiple GoTrueClient instances" 경고 해소.
 *   - env 미설정 시 placeholder 클라이언트 처리도 browser.ts 가 담당(화면 안 죽음).
 *   - 기존 9개 import 호환을 위해 `supabaseClient` 프록시 이름은 그대로 유지
 *     (호출부 `supabaseClient.from(...)`/`.auth`/`.rpc` 등 변경 불필요).
 */

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export const supabaseClient = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = createSupabaseBrowserClient();
      const value = client[prop];
      return typeof value === "function" ? value.bind(client) : value;
    },
  }
);
