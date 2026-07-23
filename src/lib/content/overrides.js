import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { HOME_CONTENT } from "./homeContent";

// 코디 편집 오버라이드를 기본 콘텐츠에 병합한다(서버 전용).
// content_key 예: "home.stats.title" → HOME_CONTENT.stats.title 의 [lang] 을 덮어씀.
// 배열 항목도 인덱스로: "home.cancers.items.0.label".
// ⚠️ 어떤 실패(경로 없음·DB 오류)든 기본값으로 폴백 → 홈이 절대 안 깨진다.

export const CONTENT_OVERRIDES_TAG = "content-overrides";

function setByPath(root, dottedKey, lang, value) {
  const parts = dottedKey.split(".");
  if (parts[0] === "home") parts.shift();
  let node = root;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (node == null || typeof node !== "object") return; // 경로 없음 → 무시
    if (i === parts.length - 1) {
      if (node[p] && typeof node[p] === "object") node[p][lang] = value;
    } else {
      node = node[p];
    }
  }
}

const deepClone = (o) => JSON.parse(JSON.stringify(o));

// 오버라이드 조회는 캐시(분당 1회) — 홈 매 렌더마다 DB 안 때리게. 저장 시 태그 무효화로 즉시 반영.
const getHomeOverridesCached = unstable_cache(
  async () => {
    try {
      const supabase = createServiceRoleClient();
      const { data, error } = await supabase
        .from("content_overrides")
        .select("content_key, lang, value")
        .like("content_key", "home.%");
      if (error || !Array.isArray(data)) return [];
      return data;
    } catch {
      return [];
    }
  },
  ["home-content-overrides"],
  { revalidate: 60, tags: [CONTENT_OVERRIDES_TAG] }
);

export async function getMergedHomeContent() {
  const merged = deepClone(HOME_CONTENT);
  const rows = await getHomeOverridesCached();
  for (const row of rows) {
    if (row?.content_key && row?.lang) setByPath(merged, row.content_key, row.lang, row.value);
  }
  return merged;
}

// 저장 API 에서 호출 → 캐시 무효화(다음 요청부터 즉시 새 값)
export function invalidateContentCache() {
  revalidateTag(CONTENT_OVERRIDES_TAG);
}
