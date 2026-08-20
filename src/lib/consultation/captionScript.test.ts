import { describe, it, expect } from "vitest";
import { translatedInto } from "./captionScript";

// 야간 로봇 통화 시험이 「통역 자막이 실제로 떴나」를 이 판정기로 가른다.
// 여기서 틀리면 매일 밤 조용히 「자막 못 봄」으로 굳거나, 반대로 봇이 아무 말도
// 안 했는데 「자막 뜸」으로 통과한다. 둘 다 사람이 눈치채기 어렵다.
describe("translatedInto", () => {
  const ru = translatedInto("cyrillic");
  const en = translatedInto("latin");

  describe("러시아어로 통역된 자막", () => {
    it("진짜 러시아어 문장은 통과시킨다", () => {
      expect(ru("Здравствуйте, два месяца назад мне сделали операцию")).toBe(true);
      expect(ru("Меня интересует, сколько времени займёт восстановление")).toBe(true);
    });

    it("낱말 하나짜리 UI 라벨은 걸러낸다", () => {
      expect(ru("Чат")).toBe(false); // 채팅 버튼
      expect(ru("Русский")).toBe(false); // 언어 라벨
      expect(ru("E2E-ROBOT-B")).toBe(false); // 참가자 이름표
    });

    it("통역 «전» 한국어 원문은 걸러낸다", () => {
      expect(ru("안녕하세요. 위암 수술을 받았습니다.")).toBe(false);
      expect(ru("안녕하세요 Здравствуйте два месяца")).toBe(false); // 원문이 섞인 줄
    });

    it("다른 언어로 옮겨진 자막은 걸러낸다", () => {
      expect(ru("I had stomach cancer surgery two months ago")).toBe(false);
    });
  });

  describe("영어로 통역된 자막", () => {
    it("진짜 영어 문장은 통과시킨다", () => {
      expect(en("I had stomach cancer surgery two months ago.")).toBe(true);
      expect(en("How long is the recovery period?")).toBe(true);
    });

    it("낱말 하나짜리 UI 라벨은 걸러낸다", () => {
      expect(en("Chat")).toBe(false);
      expect(en("English")).toBe(false);
      expect(en("AI")).toBe(false);
    });

    it("한국어 원문과 러시아어 자막은 걸러낸다", () => {
      expect(en("안녕하세요. 위암 수술을 받았습니다.")).toBe(false);
      expect(en("Здравствуйте, два месяца назад")).toBe(false);
    });
  });
});
