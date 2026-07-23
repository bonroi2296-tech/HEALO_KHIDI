import { HOME_CONTENT } from "./homeContent";

// 편집 백오피스에 노출할 "편집 가능한 홈 문구" 목록(MVP = 홈 핵심 문구).
// key = content_overrides.content_key 와 동일. section/label 은 편집기 UI 표시용.
// ⚠️ 여기 없는 키는 편집 대상 아님(코드값 그대로). 확대하려면 이 배열에 추가.
export const HOME_CONTENT_REGISTRY = [
  { section: "히어로", label: "배지", key: "home.hero.badge" },
  { section: "히어로", label: "제목", key: "home.hero.title" },
  { section: "히어로", label: "부제", key: "home.hero.subtitle" },
  { section: "히어로", label: "버튼", key: "home.hero.cta" },
  { section: "통계", label: "섹션 제목", key: "home.stats.title" },
  { section: "통계", label: "섹션 부제", key: "home.stats.subtitle" },
  { section: "서비스", label: "섹션 제목", key: "home.services.title" },
  { section: "서비스", label: "섹션 부제", key: "home.services.subtitle" },
  { section: "암종", label: "섹션 제목", key: "home.cancers.title" },
  { section: "파트너", label: "섹션 제목", key: "home.partners.title" },
  { section: "파트너", label: "섹션 부제", key: "home.partners.subtitle" },
  { section: "CTA(하단)", label: "제목", key: "home.bottomCta.title" },
  { section: "CTA(하단)", label: "설명", key: "home.bottomCta.desc" },
];

export const REGISTRY_KEYS = new Set(HOME_CONTENT_REGISTRY.map((r) => r.key));
export const EDITABLE_LANGS = ["ko", "en", "ru", "kz", "zh", "ja"];

// key → HOME_CONTENT 기본값 객체({ko,en,ru,kz,zh,ja}) 읽기
export function getDefaultValueObject(key) {
  const parts = key.split(".");
  if (parts[0] === "home") parts.shift();
  let node = HOME_CONTENT;
  for (const p of parts) {
    node = node?.[p];
    if (node == null) return null;
  }
  return node && typeof node === "object" ? node : null;
}
