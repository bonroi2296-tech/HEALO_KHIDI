/**
 * 번역 전 «가르는 판정»의 시험.
 *
 * 왜 시험이 필요한가 (2026-09-04): 이 두 함수가 틀려도 창구는 200 을 주고 화면도 멀쩡하다.
 * 결과는 「러시아어 소견이 그대로 세브란스 의뢰서에 실려 나가는 것」인데, 아무 데도 빨간불이
 * 안 뜬다. 실제로 그렇게 한 번 새어 나갈 뻔했고 사람 눈으로만 잡혔다.
 */
import { describe, it, expect } from "vitest";
import { isMostlyKorean, splitByLines } from "./shortText";

describe("isMostlyKorean — 이미 우리말인가", () => {
  it("한국어 문장은 참", () => {
    expect(isMostlyKorean("간 실질의 미만성 변화. 담낭 부종.")).toBe(true);
  });

  it("한글이 하나도 없으면 거짓", () => {
    expect(isMostlyKorean("Диффузные изменения паренхимы печени.")).toBe(false);
    expect(isMostlyKorean("Abdominal CT. Contrast: Ultravist.")).toBe(false);
    expect(isMostlyKorean("")).toBe(false);
  });

  it("🛑 러시아어 소견에 한글이 한두 글자 섞여도 «우리말»이 아니다", () => {
    // 판독기가 실제로 만들어 낸 값이다 — 「Гепатомегалия」의 「то」가 「토」로 바뀌었다.
    // 이 한 글자 때문에 소견 전체가 번역에서 빠지면 병원에 러시아어가 나간다.
    const 실제값 =
      "17.08.2026 УЗИ органов брюшной полости: Диффузные изменения паренхимы печени. " +
      "Гепа토мегалия. Отёк желчного пузыря. Свободная жидкость в брюшной полости.";
    expect(isMostlyKorean(실제값)).toBe(false);
  });

  it("의학 용어가 원어로 남은 한국어 문장은 여전히 우리말", () => {
    expect(isMostlyKorean("복부 CT (조영제: Ultravist 370-100ml) 판독 결과입니다.")).toBe(true);
  });
});

describe("splitByLines — 긴 글을 조각으로", () => {
  const 원문 = ["첫째 줄", "둘째 줄", "셋째 줄"].join("\n");

  it("조각을 줄바꿈으로 다시 이으면 원문이 된다", () => {
    for (const limit of [5, 10, 12, 1000]) {
      expect(splitByLines(원문, limit).join("\n")).toBe(원문);
    }
  });

  it("상한이 넉넉하면 한 조각", () => {
    expect(splitByLines(원문, 1000)).toHaveLength(1);
  });

  it("한 줄이 상한보다 길어도 그 줄을 가운데서 자르지 않는다", () => {
    const 긴줄 = "가".repeat(50);
    const pieces = splitByLines(`짧은 줄\n${긴줄}\n또 짧은 줄`, 10);
    expect(pieces).toContain(긴줄);
    expect(pieces.join("\n")).toBe(`짧은 줄\n${긴줄}\n또 짧은 줄`);
  });
});
