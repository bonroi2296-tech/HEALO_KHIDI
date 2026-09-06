// 순수 병합 — DB·캐시 없이 시험할 수 있게 contentFileOverrides.js 에서 떼어 뒀다.

const deepClone = (o) => JSON.parse(JSON.stringify(o));

function setByPath(root, parts, lang, value) {
  let node = root;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (node == null || typeof node !== "object") return false; // 경로 없음 → 무시
    if (i === parts.length - 1) {
      if (node[p] && typeof node[p] === "object" && !Array.isArray(node[p])) {
        node[p][lang] = value;
        return true;
      }
      return false;
    }
    node = node[p];
  }
  return false;
}

/**
 * 파일 기본값 사본에 오버라이드 행을 덮어씌운다.
 * 치료법 name 을 고치면 5축(ITCRN) 등에서 «같은 객체를 참조하던» 요법 태그에도 번지게 한다 — JSON 복제로 참조가
 * 끊기므로 등록부가 적어 둔 참조 경로(therapyRefs)에 같은 값을 복사한다. ko 글자 맞추기는 쓰지 않는다:
 * 우연히 같은 글자인 독립 문구를 덮어쓴다(2026-09-06 리뷰).
 *
 * @param {Array<{content_key:string, lang:string, value:string}>} rows
 * @param {{ roots: Record<string, object>, langs: string[], therapyRefs?: Array<{prefix:string, path:string[], therapyId:string}> }} opt
 */
export function mergeContentFiles(rows, { roots, langs, therapyRefs = [] }) {
  const merged = {};
  for (const [prefix, root] of Object.entries(roots)) merged[prefix] = deepClone(root);

  for (const row of rows || []) {
    if (!row || typeof row.content_key !== "string" || !row.lang || typeof row.value !== "string") continue;
    if (!langs.includes(row.lang)) continue;
    const parts = row.content_key.split(".");
    const root = merged[parts[0]];
    if (!root) continue;
    setByPath(root, parts.slice(1), row.lang, row.value);
  }

  // 요법 태그 번짐 — 등록부가 적어 둔 «정확히 그 경로»에만.
  for (const ref of therapyRefs) {
    const src = merged.therapy?.[ref.therapyId]?.name;
    if (!src || typeof src !== "object") continue;
    let node = merged[ref.prefix];
    for (const p of ref.path) {
      node = node?.[p];
      if (node == null) break;
    }
    if (!node || typeof node !== "object" || Array.isArray(node)) continue;
    for (const l of langs) if (typeof src[l] === "string") node[l] = src[l];
  }

  return {
    therapies: merged.therapy,
    itcrn: merged.itcrn,
    cancers: merged.cancer,
    faq: merged.cancerFaq,
    care: merged.care,
    hospitals: merged.hospital,
  };
}
