import { HOME_CONTENT } from "./homeContent";

// 편집 백오피스에 노출할 "편집 가능한 홈 문구" 목록.
// HOME_CONTENT 의 다국어 leaf({ko,en,...} 객체)를 전부 자동 등록 —
// 홈에 문구를 추가하면 편집기에 자동으로 잡힌다(수동 목록 유지 불필요).
// key = content_overrides.content_key 와 동일(예: "home.stats.items.0.label").
// 병합(setByPath)이 배열 인덱스까지 처리하므로 여기 나온 키는 전부 실제 반영됨.

const SECTION_LABELS = {
  hero: "히어로",
  stats: "통계",
  doctors: "의료진",
  services: "서비스",
  process: "절차",
  cancers: "암종",
  partners: "파트너",
  faq: "FAQ",
  emergency: "응급안내",
  bottomCta: "CTA(하단)",
  misc: "기타",
};

const FIELD_LABELS = {
  badge: "배지",
  title: "제목",
  subtitle: "부제",
  cta: "버튼",
  ctaSub: "버튼 소제목",
  desc: "설명",
  label: "문구",
  value: "수치",
  viewAll: "전체보기",
  name: "이름",
  items: "항목",
  steps: "단계",
  q: "질문",
  a: "답변",
  tabs: "탭",
  general: "일반",
  cost: "비용",
  consultation: "상담",
  badgePartner: "배지(파트너)",
  badgeUniversity: "배지(대학병원)",
  fast: "신속",
  free: "무료",
  noObligation: "부담없음",
  onlineInquiry: "온라인 문의",
  viewTreatments: "치료법 보기",
};

export const EDITABLE_LANGS = ["ko", "en", "ru", "kz", "zh", "ja"];

// {ko:"...", en:"..."} 모양의 다국어 leaf 인가
const isLangLeaf = (n) =>
  n && typeof n === "object" && !Array.isArray(n) && EDITABLE_LANGS.some((l) => typeof n[l] === "string");

function collectPaths(node, path, out) {
  if (node == null || typeof node !== "object") return; // 평문 문자열(수치·아이콘 등) = 편집 대상 아님
  if (isLangLeaf(node)) {
    out.push(path);
    return;
  }
  for (const k of Object.keys(node)) collectPaths(node[k], [...path, k], out);
}

// ["items","0","label"] → "항목1 · 문구" (숫자는 앞 단어에 붙임)
function labelFor(parts) {
  const words = [];
  for (const p of parts) {
    if (/^\d+$/.test(p)) {
      words[words.length - 1] = `${words[words.length - 1] || "항목"}${Number(p) + 1}`;
      continue;
    }
    words.push(FIELD_LABELS[p] || p);
  }
  return words.join(" · ") || "문구";
}

export const HOME_CONTENT_REGISTRY = (() => {
  const paths = [];
  collectPaths(HOME_CONTENT, [], paths);
  return paths.map((parts) => ({
    section: SECTION_LABELS[parts[0]] || parts[0],
    label: labelFor(parts.slice(1)),
    key: `home.${parts.join(".")}`,
  }));
})();

export const REGISTRY_KEYS = new Set(HOME_CONTENT_REGISTRY.map((r) => r.key));

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
