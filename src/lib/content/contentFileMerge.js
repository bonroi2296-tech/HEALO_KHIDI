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
 * 치료법 name 을 고치면 5축(ITCRN)·암종 안에서 «같은 객체를 참조하던» 요법 태그에도 번지게 한다 —
 * JSON 복제로 참조가 끊기므로, 원본 ko 문구가 같은 잎을 찾아 같은 값으로 맞춘다.
 *
 * @param {Array<{content_key:string, lang:string, value:string}>} rows
 * @param {{ roots: Record<string, object>, langs: string[] }} opt
 */
export function mergeContentFiles(rows, { roots, langs }) {
  const merged = {};
  for (const [prefix, root] of Object.entries(roots)) merged[prefix] = deepClone(root);
  const isLeaf = (n) => n && typeof n === "object" && !Array.isArray(n) && langs.some((l) => typeof n[l] === "string");

  // 원본 치료법 이름(ko) → 병합된 name 객체. 복제 «전» 원본 ko 로 찾아야 태그와 맞는다.
  const therapyByKo = new Map();
  for (const [id, t] of Object.entries(roots.therapy || {})) {
    if (t && isLeaf(t.name) && t.name.ko) therapyByKo.set(t.name.ko, merged.therapy[id].name);
  }

  for (const row of rows || []) {
    if (!row || typeof row.content_key !== "string" || !row.lang || typeof row.value !== "string") continue;
    if (!langs.includes(row.lang)) continue;
    const parts = row.content_key.split(".");
    const root = merged[parts[0]];
    if (!root) continue;
    setByPath(root, parts.slice(1), row.lang, row.value);
  }

  // 요법 태그 번짐: therapy 뿌리 밖에서 «원본 ko 가 치료법 이름과 같은 잎»을 병합된 name 으로 맞춘다.
  const propagate = (node, originalNode) => {
    if (node == null || typeof node !== "object" || originalNode == null || typeof originalNode !== "object") return;
    if (isLeaf(node)) {
      const hit = therapyByKo.get(originalNode.ko);
      if (hit && hit !== node) for (const l of langs) if (typeof hit[l] === "string") node[l] = hit[l];
      return;
    }
    for (const k of Object.keys(node)) propagate(node[k], originalNode[k]);
  };
  for (const prefix of Object.keys(roots)) {
    if (prefix === "therapy") continue;
    propagate(merged[prefix], roots[prefix]);
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
