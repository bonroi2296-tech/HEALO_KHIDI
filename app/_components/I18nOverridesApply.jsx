"use client";

import { applyI18nOverrides } from "@/lib/i18n";

// 서버가 로드한 오버라이드 맵을 클라이언트 t() 에 주입한다.
// 렌더 본문에서 동기 적용 → children 이 렌더되기 전에 반영(useEffect 아님 — 첫 렌더부터 맞음).
// 서버 SSR 시에도 이 본문이 돌지만 layout 이 이미 적용해 값이 동일(무해).
export default function I18nOverridesApply({ map, children }) {
  applyI18nOverrides(map || {});
  return children;
}
