import "server-only";
import { unstable_cache } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { CONTENT_OVERRIDES_TAG } from "./overrides";
import { fetchOverrideRows } from "./fetchOverrideRows";

// 전 화면 콘텐츠 편집(Phase 2): content_overrides → t() 가 소비할 { lang: { key: value } } 맵.
// 캐시(분당) + 저장 시 CONTENT_OVERRIDES_TAG 무효화로 즉시 반영(홈 병합과 태그 공유).
// ⚠️ 실패 시 빈 맵 → t() 는 기존 사전 동작(안 깨짐).

const getAllOverridesCached = unstable_cache(
  async () => {
    try {
      const supabase = createServiceRoleClient();
      // 끝까지 페이지로 읽는다 — 1,000행에서 조용히 잘리면 공개 화면의 사전 오버라이드가 일부 사라진다.
      return await fetchOverrideRows(supabase);
    } catch {
      return [];
    }
  },
  ["all-content-overrides"],
  { revalidate: 60, tags: [CONTENT_OVERRIDES_TAG] }
);

export async function getI18nOverrideMap() {
  const rows = await getAllOverridesCached();
  const map = {};
  for (const r of rows) {
    if (!r || !r.lang || !r.content_key) continue;
    if (!map[r.lang]) map[r.lang] = {};
    map[r.lang][r.content_key] = r.value;
  }
  return map;
}
