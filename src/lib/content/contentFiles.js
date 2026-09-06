/**
 * 콘텐츠 «파일» 문구 등록부 — 치료법 카드·5축(ITCRN)·암종 상세·암종 FAQ·수술 후 관리·제휴 병원(정적).
 *
 * 왜 (2026-09-06): 이 문구들은 `src/lib/data/*.js` 안에 6개 언어로 박혀 있는데, 2026-09-05~06 에
 *   AI(세션)가 818문장을 채웠고 전부 «원어민 검수 전 제안»이다. 그런데 코디 콘텐츠 편집기는 사전(dictionary)과
 *   홈 문구만 알아서 **코디가 이 문구를 고칠 창구가 없었다** — `docs/rules/I18N_QUALITY.md` 가 1순위 원인으로
 *   꼽은 「코디가 고칠 창구 없음」이 그대로 남아 있던 자리다.
 *
 * 어떻게: 홈 문구(registry.js)와 같은 방식이다. 데이터 트리에서 {ko,en,ru,kz,zh,ja} 잎을 자동 수집해
 *   `content_overrides.content_key` 로 쓸 키(`therapy.thymosin.name` 등)를 만든다. 화면 쪽은
 *   `contentFileOverrides.js` 의 `getMergedContentFiles()` 가 코디 값을 덮어씌운 사본을 준다.
 *   파일에 문구를 추가하면 편집기에 자동으로 잡힌다(수동 목록 없음).
 *
 * 안 다루는 것(한계, 일부러): 언어별 «문자열 배열»(focusPrograms·specialties·highlights)은 잎이 아니라
 *   목록이라 편집기 한 칸에 안 맞는다. 필요해지면 배열 항목을 잎으로 펼치는 규칙을 따로 정한다.
 *
 * ⚠️ 5축(ITCRN) 안의 요법 태그 배열은 치료법 name 객체를 «그대로 참조»한다(같은 객체). 여기서는 그 참조를
 *   등록하지 않는다 — 같은 문구가 두 키로 뜨면 코디가 한쪽만 고치고 다른 쪽은 그대로 남는다. 병합 쪽에서
 *   치료법 name 을 고치면 5축 태그에도 같이 번지게 했다(contentFileOverrides.js).
 */
import { IMMUNE_THERAPIES } from "@/lib/data/immuneTherapies";
import {
  ITCRN_FRAMEWORK,
  CANCER_DETAILS,
  POST_SURGICAL_CARE,
  CANCER_FAQ,
  CANCER_THERAPY_KEYS,
} from "@/lib/data/immuneCancerDetails";
import { getAllPartnerHospitals, getAllPartnerSlugs } from "@/lib/data/partnerHospitals";

export const CONTENT_FILE_LANGS = ["ko", "en", "ru", "kz", "zh", "ja"];

// 앞머리 → 데이터 뿌리. ⚠️ 앞머리는 사전(dictionary.js)의 키 앞머리와 겹치면 안 된다 — 편집기·변경 이력이 층을 앞머리로
// 가른다(`faq.*` 는 사전에 옛 키가 있어 `cancerFaq`, eslint no-dupe-keys 가 keyLocation 에서 잡았다).
// 제휴 병원은 «실제로 200 을 내는 slug»(영구이동 대상 제외)만 — 면력 지점 4곳은 /hospitals/immune 으로 넘어가
// 이 파일 문구를 읽지 않는다(2026-09-06 리뷰).
const PARTNER_SLUGS = new Set(getAllPartnerSlugs());
export const CONTENT_FILE_ROOTS = {
  therapy: IMMUNE_THERAPIES,
  itcrn: ITCRN_FRAMEWORK,
  cancer: CANCER_DETAILS,
  cancerFaq: CANCER_FAQ,
  care: POST_SURGICAL_CARE,
  hospital: Object.fromEntries(getAllPartnerHospitals().filter((h) => PARTNER_SLUGS.has(h.slug)).map((h) => [h.slug, h])),
};

// «화면이 실제로 그리는 칸»만 편집기에 낸다 — 안 그리는 칸(therapy.category·mechanism, itcrn.chemoSupport, 병원 address·type)을
// 내면 코디가 고치고 «어디에도 안 나오네»가 된다(2026-09-06 리뷰). 화면이 새 칸을 그리게 되면 여기도 같이 연다.
//   therapy: CancerDetailClient 치료법 카드 = name·description·evidence
//   itcrn: 5축 아코디언 = title·desc·evidence + 요법 태그 배열(chemoSupport 는 ITCRN_KEYS 밖)
//   hospital: hospitals/[slug] 메타·JSON-LD·정적 폴백이 읽는 name·description (한국어는 DB 우선)
const FIELD_ALLOW = {
  therapy: (path) => ["name", "description", "evidence"].includes(path[2]),
  itcrn: (path) => path[1] !== "chemoSupport", // chemoSupport 는 축이 아니라 뿌리 바로 아래의 별도 묶음
  hospital: (path) => ["name", "description"].includes(path[2]),
};

export const CONTENT_FILE_SECTIONS = {
  therapy: "치료법 카드",
  itcrn: "5축(ITCRN) 설명",
  cancer: "암종 상세",
  cancerFaq: "암종 FAQ",
  care: "수술 후 관리",
  hospital: "제휴 병원 소개",
};

const FIELD_LABELS = {
  title: "제목",
  intro: "소개",
  name: "이름",
  desc: "설명",
  description: "설명",
  evidence: "근거",
  complications: "합병증",
  q: "질문",
  a: "답변",
  programs: "프로그램",
  cellular: "세포면역",
  humoral: "체액면역",
  methods: "방법",
  items: "항목",
};

const isLangLeaf = (n) =>
  n && typeof n === "object" && !Array.isArray(n) && CONTENT_FILE_LANGS.some((l) => typeof n[l] === "string");

// 치료법 name 객체 → 치료법 id. 5축 배열이 이 객체를 «참조»로 들고 있어, 다른 자리에서 만나면 등록 대신 참조 경로로 적는다.
const THERAPY_ID_BY_NAME_OBJECT = new Map(
  Object.entries(IMMUNE_THERAPIES).map(([id, t]) => [t && t.name, id]).filter(([n]) => n)
);

/**
 * 치료법 name 을 참조하는 자리(경로) — 병합 때 «정확히 이 경로»에 고친 이름을 번지게 한다.
 * ko 글자 맞추기로 찾지 않는다: 우연히 같은 글자인 독립 문구(코디가 따로 고친 것)를 덮어쓰게 된다(2026-09-06 리뷰).
 * @type {Array<{prefix:string, path:string[], therapyId:string}>}
 */
export const CONTENT_FILE_THERAPY_REFS = [];

function collectPaths(node, path, out, refs) {
  if (node == null || typeof node !== "object") return;
  if (isLangLeaf(node)) {
    const therapyId = THERAPY_ID_BY_NAME_OBJECT.get(node);
    const isTherapyNameSlot = path[0] === "therapy" && path[path.length - 1] === "name";
    if (therapyId && !isTherapyNameSlot) {
      refs.push({ prefix: path[0], path: path.slice(1), therapyId });
      return;
    }
    const allow = FIELD_ALLOW[path[0]];
    if (allow && !allow(path)) return;
    out.push(path);
    return;
  }
  for (const k of Object.keys(node)) collectPaths(node[k], [...path, k], out, refs);
}

// 개체(치료법·암종·병원)의 사람 이름 — 코디가 «어느 것의 문구인지» 바로 알게. 고유명사라 언어 상관없이 ko 를 쓴다.
function entityLabel(prefix, id) {
  const ent = CONTENT_FILE_ROOTS[prefix]?.[id];
  if (!ent || typeof ent !== "object") return id;
  const cand = ent.name || ent.title;
  if (isLangLeaf(cand) && cand.ko) return cand.ko;
  // FAQ 는 암종 slug 아래 배열이라 개체 자체엔 이름이 없다 → 암종 제목을 빌린다.
  if (prefix === "cancerFaq") return CANCER_DETAILS[id]?.title?.ko || id;
  return id;
}

// 「칸 이름」 조각 — 편집기가 코디 언어(ceFld_*)로 조립한다. 숫자는 앞 낱말에 번호로 붙고, 앞 낱말이 없으면 「항목」.
function wordsFor(rest) {
  const words = [];
  for (const p of rest) {
    if (/^\d+$/.test(p)) {
      if (words.length === 0) words.push({ f: "items" });
      words[words.length - 1] = { ...words[words.length - 1], n: Number(p) + 1 };
      continue;
    }
    words.push({ f: p });
  }
  return words;
}

const wordsToKo = (words) =>
  words.map((w) => `${FIELD_LABELS[w.f] || w.f}${w.n ? w.n : ""}`).join(" · ") || "문구";

/** 편집기에 노출할 문구 목록. { key, prefix, id, section, label, whereParts } */
export const CONTENT_FILE_REGISTRY = (() => {
  const out = [];
  for (const prefix of Object.keys(CONTENT_FILE_ROOTS)) {
    const paths = [];
    collectPaths(CONTENT_FILE_ROOTS[prefix], [prefix], paths, CONTENT_FILE_THERAPY_REFS);
    for (const p of paths) {
      const words = wordsFor(p.slice(2));
      const entity = entityLabel(prefix, p[1]);
      out.push({
        key: p.join("."),
        prefix,
        id: p[1],
        section: CONTENT_FILE_SECTIONS[prefix],
        label: `${entity} / ${wordsToKo(words)}`,
        // 편집기가 코디 언어로 조립하는 조각: 구역(ceSec_<prefix>) / 개체 이름(고유명사) / 칸(ceFld_<f>+번호)
        whereParts: { sectionKey: prefix, entity, words },
      });
    }
  }
  return out;
})();

export const CONTENT_FILE_KEYS = new Set(CONTENT_FILE_REGISTRY.map((r) => r.key));

/** key → 파일 기본값 객체({ko,en,…}). 등록부 밖 키·경로 없음이면 null. */
export function getContentFileDefault(key) {
  if (!CONTENT_FILE_KEYS.has(key)) return null;
  const parts = key.split(".");
  let node = CONTENT_FILE_ROOTS[parts[0]];
  for (const p of parts.slice(1)) {
    node = node?.[p];
    if (node == null) return null;
  }
  return isLangLeaf(node) ? node : null;
}

/** 등록부 키인가 (편집기·변경 이력이 「홈/사전/파일」 층을 가를 때 쓴다) */
export function isContentFileKey(key) {
  return CONTENT_FILE_KEYS.has(key);
}

/**
 * 치료법 문구가 «실제로 보이는» 암종 페이지 주소 — 카드는 암종마다 5개만 그리므로 첫 번째로 그 치료법을 그리는 페이지.
 * 어디에도 안 그리면 null(편집기가 「화면에서 보기」를 안 단다).
 */
export function therapyPagePath(therapyId) {
  for (const [slug, ids] of Object.entries(CANCER_THERAPY_KEYS)) {
    if (ids.includes(therapyId)) return `/treatments/${slug}`;
  }
  return null;
}
