/**
 * 거르개가 «실제로 나온 답»에서 갈라내는지 확인한다.
 * 아래 문자열은 지어낸 예시가 아니라 2026-08-07 측정에서 모델이 실제로 뱉은 것들이다
 * (scripts/measure-stt-invention.mjs, gemini-flash-latest, temperature 0).
 */
import { describe, expect, it } from "vitest";
import { AGREEMENT_MIN, transcriptSimilarity, transcriptsAgree } from "./transcriptAgreement";

// 같은 «무음» 조각을 두 번 물었을 때 나온 답들 — 전부 아무도 안 한 말이다.
const 창작쌍 = [
  ["세 번째로 궁금하신 내용은 암 생존율인데요", "세브란스 병원에서"],
  ["그 다음에 세 번째로", "이 환자가 제 2차 유방암 수술을 받았는데"],
  ["네 그리고 드시는 일상의 고기라든지 야채라든지", "네 안녕하세요. 원장님 저는"],
  ["다만 몇 주 전에 항암 치료를 마치셨거나", "저희 한국에 오셔 가지고 치료를 하시는 걸"],
  ["어디 부위에 통증이 있으신가요?", "보통은 혈전이 생길 가능성은 수술 후에 몇 주 내거든요."],
  ["약은 잘 드시고 계시죠?", "한 달 치나 약 세 달 치"],
];

// 같은 «말» 조각을 두 번 물었을 때 나온 답들 — 진짜 발화다.
const 진짜쌍 = [
  // 매번 똑같이 나온 경우
  [
    "안녕하세요. 위암 수술을 받은 지 두 달 되었습니다.",
    "안녕하세요. 위암 수술을 받은 지 두 달 되었습니다.",
  ],
  // 문장부호·띄어쓰기만 다른 경우
  ["회복 기간이 얼마나 걸리는지 궁금합니다.", "회복 기간이 얼마나 걸리는지 궁금합니다"],
  // 한 글자만 잘못 들은 경우 (닮음 높음 — 통과해야 한다)
  ["회복 기간이 얼마나 걸리는지 궁금합니다.", "재복 기간이 얼마나 걸리는지 궁금합니다."],
  // 잘린 조각 — 진짜인데 끝이 갈리는 최악의 경우 (실측 닮음 0.87)
  ["안녕하세요. 위암 수술을 받", "안녕하세요. 위암 수술을"],
];

describe("받아쓰기 합의 거르개", () => {
  it("지어낸 답끼리는 안 닮는다 — 전부 걸러진다", () => {
    for (const [a, b] of 창작쌍) {
      expect(transcriptsAgree(a, b), `걸러야 하는데 통과함: "${a}" vs "${b}"`).toBe(false);
    }
  });

  it("진짜 말은 두 번 다 닮는다 — 전부 통과한다", () => {
    for (const [a, b] of 진짜쌍) {
      expect(transcriptsAgree(a, b), `통과해야 하는데 걸림: "${a}" vs "${b}"`).toBe(true);
    }
  });

  it("문턱이 창작(최대)과 진짜(최소) 사이에 있다", () => {
    const 창작최대 = Math.max(...창작쌍.map(([a, b]) => transcriptSimilarity(a, b)));
    const 진짜최소 = Math.min(...진짜쌍.map(([a, b]) => transcriptSimilarity(a, b)));
    expect(창작최대).toBeLessThan(AGREEMENT_MIN);
    expect(진짜최소).toBeGreaterThan(AGREEMENT_MIN);
    // 두 무리가 붙어 버리면 이 방식 자체가 못 쓴다 — 그때 알아채라고 간격도 지킨다.
    expect(진짜최소 - 창작최대).toBeGreaterThan(0.3);
  });

  it("둘 다 «말 없음»이면 합의로 본다 (빈 자막 = 정상)", () => {
    expect(transcriptsAgree("", "")).toBe(true);
  });

  it("한쪽만 말하면 불일치 — 한 번만 나온 문장은 안 믿는다", () => {
    expect(transcriptsAgree("", "안녕하세요")).toBe(false);
    expect(transcriptsAgree("안녕하세요", "")).toBe(false);
  });

  it("아주 짧은 답은 정확히 같아야 통과 — 「네」와 「예」는 다른 말이다", () => {
    expect(transcriptsAgree("네", "네")).toBe(true);
    expect(transcriptsAgree("네", "예")).toBe(false);
  });
});
