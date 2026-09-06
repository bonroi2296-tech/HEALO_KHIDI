import "server-only";
import { unstable_cache } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { CONTENT_OVERRIDES_TAG } from "./overrides";
import { CONTENT_FILE_ROOTS, CONTENT_FILE_LANGS } from "./contentFiles";
import { mergeContentFiles } from "./contentFileMerge";

// 콘텐츠 파일 문구에 코디 편집(content_overrides)을 덮어씌운 사본(서버 전용).
// 홈(overrides.js)과 같은 캐시·같은 무효화 태그 — 저장 즉시 화면에 반영, 평소엔 분당 1회 조회.
// ⚠️ 어떤 실패(DB 오류·경로 없음)든 파일 기본값으로 폴백 → 화면이 절대 안 깨진다.

const PREFIXES = Object.keys(CONTENT_FILE_ROOTS);

const getRowsCached = unstable_cache(
  async () => {
    try {
      const supabase = createServiceRoleClient();
      const { data, error } = await supabase
        .from("content_overrides")
        .select("content_key, lang, value")
        .or(PREFIXES.map((p) => `content_key.like.${p}.%`).join(","));
      if (error || !Array.isArray(data)) return [];
      return data;
    } catch {
      return [];
    }
  },
  ["content-file-overrides"],
  { revalidate: 60, tags: [CONTENT_OVERRIDES_TAG] }
);

/**
 * @returns {{ therapies:object, itcrn:object, cancers:object, faq:object, care:object, hospitals:object }}
 */
export async function getMergedContentFiles() {
  const rows = await getRowsCached();
  return mergeContentFiles(rows, { roots: CONTENT_FILE_ROOTS, langs: CONTENT_FILE_LANGS });
}
