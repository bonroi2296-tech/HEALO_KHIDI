import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { HOME_CONTENT } from "./homeContent";
import { applyTenantBrand, isDefaultTenant, getTenant } from "@/lib/tenant";
import { fetchOverrideRows } from "./fetchOverrideRows";

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
      return await fetchOverrideRows(supabase, (q) => q.like("content_key", "home.%"));
    } catch {
      return [];
    }
  },
  ["home-content-overrides"],
  { revalidate: 60, tags: [CONTENT_OVERRIDES_TAG] }
);

export async function getMergedHomeContent() {
  const merged = deepClone(HOME_CONTENT);
  // 테넌트 전용 홈 이야기가 있으면 먼저 덮어쓴다(코디 편집보다 아래 — 편집이 항상 최우선).
  // 없는 섹션은 기본값이 그대로 남아 화면이 안 깨진다.
  const tenantHome = getTenant().homeContent;
  if (tenantHome) deepMerge(merged, tenantHome);
  const rows = await getHomeOverridesCached();
  for (const row of rows) {
    if (row?.content_key && row?.lang) setByPath(merged, row.content_key, row.lang, row.value);
  }
  // 홈 문구는 t() 사전이 아니라 자체 언어맵({ko,en,ru,…})이라 브랜드 치환이 안 걸린다
  // (2026-07-28 면력 목업 실험에서 «제목은 갈렸는데 본문은 healwith» 로 드러난 구멍).
  // healwith 테넌트면 아래 순회는 원본을 그대로 돌려준다.
  return isDefaultTenant() ? merged : brandifyLangMap(merged);
}

// 테넌트 콘텐츠를 기본 콘텐츠 위에 깊게 덮어쓴다.
// 배열(stats.items 등)은 «항목 수와 의미가 통째로 다르므로» 병합하지 않고 갈아끼운다.
function deepMerge(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (Array.isArray(value)) {
      target[key] = deepClone(value);
    } else if (value && typeof value === "object") {
      if (!target[key] || typeof target[key] !== "object" || Array.isArray(target[key])) {
        target[key] = {};
      }
      deepMerge(target[key], value);
    } else {
      target[key] = value;
    }
  }
  return target;
}

// { ko: "…", en: "…" } 꼴의 언어맵을 만나면 각 값에 그 언어로 브랜드 치환을 건다.
// ⚠️ 이건 **임시 다리**다. 병원이 바뀌면 브랜드명만이 아니라 «내용 자체»가 달라야 한다
//    (면력은 한방 면역치료 이야기를 해야지 컨시어지 소개를 하면 안 된다).
//    제대로 된 해법은 병원별 콘텐츠 씨앗 데이터 — 기획서 §10-6 「콘텐츠 공장」.
function brandifyLangMap(node) {
  if (Array.isArray(node)) return node.map(brandifyLangMap);
  if (!node || typeof node !== "object") return node;
  const out = {};
  for (const [key, value] of Object.entries(node)) {
    out[key] =
      typeof value === "string" && LANG_KEYS.has(key)
        ? applyTenantBrand(value, key)
        : brandifyLangMap(value);
  }
  return out;
}

const LANG_KEYS = new Set(["ko", "en", "ru", "kz", "zh", "ja"]);

// 저장 API 에서 호출 → 캐시 무효화(다음 요청부터 즉시 새 값)
export function invalidateContentCache() {
  revalidateTag(CONTENT_OVERRIDES_TAG);
}
