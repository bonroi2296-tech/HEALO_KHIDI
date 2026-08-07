/**
 * 받아쓰기 「지어냄」 거르개 — 같은 소리를 두 번 물어서 답이 닮았을 때만 채택한다.
 *
 * 왜 이런 방식인가 (2026-08-07 실측):
 *   프롬프트로 "지어내지 마라"를 넣는 방식은 8/03·8/04 두 번 시도해 안 줄었다(#1253·#1297).
 *   그런데 **창작은 부를 때마다 완전히 다른 문장이 나오고, 진짜 말은 매번 같은 문장이 나온다.**
 *   무에서 짓는 말에는 고정될 근거가 없기 때문이다. 이 차이는 실측에서 겹치지 않았다:
 *
 *     조각(각 5회 호출)        답이 서로 닮은 정도
 *     ─────────────────────────────────────────
 *     무음(앞)                 0.02   ← 전부 창작
 *     무음(문장 사이)           0.01   ← 전부 창작
 *     잡음(화면 문턱 통과)       0.01   ← 전부 창작
 *     말 "위암 수술…"           1.00
 *     말 "회복 기간…"           1.00
 *     잘린 말(앞 절반)          0.87   ← 진짜인데 답이 갈리는 최악의 경우
 *
 *   0.02 와 0.87 사이가 비어 있어 **0.5** 를 문턱으로 잡았다(양쪽에서 멀다).
 *   재현: `node --env-file=.env.local scripts/measure-stt-invention.mjs --repeat 5`
 *
 * ⚠️ 이건 «지어냄»을 거르는 것이지 «잘못 알아들음»은 못 거른다. 두 번 다 같게 잘못
 *    들으면 그대로 통과한다(실측: "위암"→"EMR" 이 매번 같이 나온 적 있음).
 */

/** 문장부호·공백은 무시 — "회복 기간이." 와 "회복 기간이" 는 같은 답이다. */
function normalize(text: string): string {
  return text.replace(/[\s.,!?…"'·]/g, "");
}

/**
 * 글자 두 개씩(bigram) 겹치는 비율 0~1.
 * 한국어는 띄어쓰기가 들쭉날쭉해 낱말 단위보다 글자쌍이 안정적이다.
 */
export function transcriptSimilarity(a: string, b: string): number {
  const A = normalize(a || "");
  const B = normalize(b || "");
  if (!A.length && !B.length) return 1; // 둘 다 «말 없음» = 완전 합의
  if (!A.length || !B.length) return 0; // 한쪽만 말했다 = 불일치
  if (A.length < 2 || B.length < 2) return A === B ? 1 : 0; // 한 글자짜리("네")는 정확히 같아야
  const bag = new Map<string, number>();
  for (let i = 0; i < A.length - 1; i++) {
    const k = A.slice(i, i + 2);
    bag.set(k, (bag.get(k) || 0) + 1);
  }
  let hit = 0;
  for (let i = 0; i < B.length - 1; i++) {
    const k = B.slice(i, i + 2);
    const n = bag.get(k) || 0;
    if (n > 0) {
      hit++;
      bag.set(k, n - 1);
    }
  }
  return (2 * hit) / (A.length - 1 + B.length - 1);
}

/** 실측으로 정한 문턱 — 위 표의 0.02 와 0.87 사이. */
export const AGREEMENT_MIN = 0.5;

/** 두 답이 «같은 말»이라고 볼 만큼 닮았나. */
export function transcriptsAgree(a: string, b: string): boolean {
  return transcriptSimilarity(a, b) >= AGREEMENT_MIN;
}
