import { describe, it, expect } from "vitest";
import { looksLikeLeakedTranslation } from "./translateOutputGuard";

describe("looksLikeLeakedTranslation", () => {
  // 실측으로 나온 실제 쓰레기 2형태(2026-07-23 gemini-flash, temp 0.1) — 반드시 폐기.
  it("실측 쓰레기: 후보 나열('…\" or \"…') → true", () => {
    expect(
      looksLikeLeakedTranslation(
        'да мы продолжим работу с этой суммой." or "Тогда мы работаем по'
      )
    ).toBe(true);
  });
  it("실측 쓰레기: 시스템 규칙 누출(불릿 포함) → true", () => {
    expect(
      looksLikeLeakedTranslation(
        "Concise for subtitles.\n    *   No fillers.\n    *   Output"
      )
    ).toBe(true);
  });
  it("규칙 누출 변종: 'Output ONLY the translated text' (ru 도착) → true", () => {
    expect(
      looksLikeLeakedTranslation("Output ONLY the translated text, nothing else", "ru")
    ).toBe(true);
  });

  // 실제 정상 러시아어 번역들(같은 실측 실행의 좋은 출력) — 절대 폐기하면 안 됨.
  it("정상 러시아어 번역들 → false", () => {
    const good = [
      "Здравствуйте, спасибо, что присоединились к сегодняшней встрече.",
      "Наша больница очень заинтересована в привлечении онкологических пациентов из Казахстана.",
      "Мы хотели бы обсудить подписание меморандума о сотрудничестве.",
      "По результатам биопсии у вас диагностирован рак молочной железы 2-й стадии.",
      "Вы можете сначала получить второе мнение с помощью дистанционной консультации.",
      "Простите?",
      "Да, хорошо.",
      "Тогда мы будем работать с этой суммой.",
      // 오라벨 러시아어 원문 유지 케이스
      "Здравствуйте, рад встрече.",
    ];
    for (const s of good) {
      expect(looksLikeLeakedTranslation(s), s).toBe(false);
    }
  });

  // 오탐 함정: 러시아어 접속사 'или'(=or)는 영어 or 가 아니고 따옴표도 없음 → false.
  it("러시아어 'или' 정상 문장 → false", () => {
    expect(
      looksLikeLeakedTranslation("Химиотерапия или лучевая терапия — на выбор.")
    ).toBe(false);
  });

  // 도착어=영어 오탐 방지(독립리뷰 #1): 정상 영어 번역의 따옴표-or·영어단어는 폐기 금지.
  it("영어 도착: 따옴표로 감싼 'or' 대안이 있는 정상 번역 → false", () => {
    expect(
      looksLikeLeakedTranslation("You can choose 'chemotherapy' or 'radiation'.", "en")
    ).toBe(false);
  });
  it("영어 도착: 'medical interpreter' 를 정상적으로 말한 번역 → false", () => {
    expect(looksLikeLeakedTranslation("I am the medical interpreter.", "en")).toBe(false);
  });
  // 단, 영어 도착이라도 불릿 목록 누출은 여전히 잡는다(불릿은 어느 언어에도 정상 자막에 없음).
  it("영어 도착이라도 불릿 규칙누출 → true", () => {
    expect(
      looksLikeLeakedTranslation("Fine.\n* No fillers\n* Output only", "en")
    ).toBe(true);
  });
  // 러시아어 도착: 같은 따옴표-or 는 누출 신호 → true (오늘 미팅 경로).
  it("러시아어 도착: 따옴표-'or' 후보 나열 → true", () => {
    expect(
      looksLikeLeakedTranslation('"да" or "нет"', "ru")
    ).toBe(true);
  });

  it("빈 문자열 → false", () => {
    expect(looksLikeLeakedTranslation("")).toBe(false);
  });
});
