import "server-only";
import { unstable_cache } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { CONTENT_OVERRIDES_TAG } from "./overrides";

// 전 화면 콘텐츠 편집(Phase 2): content_overrides → t() 가 소비할 { lang: { key: value } } 맵.
// 캐시(분당) + 저장 시 CONTENT_OVERRIDES_TAG 무효화로 즉시 반영(홈 병합과 태그 공유).
// ⚠️ 실패 시 빈 맵 → t() 는 기존 사전 동작(안 깨짐).

const getAllOverridesCached = unstable_cache(
  async () => {
    try {
      const supabase = createServiceRoleClient();
      const { data, error } = await supabase
        .from("content_overrides")
        .select("content_key, lang, value");
      if (error || !Array.isArray(data)) return [];
      return data;
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
