import { describe, it, expect } from "vitest";
import {
  getEffectiveSttLang,
  isBrowserSttNative,
} from "./useSpeechRecognition";

// 화상방 통역 STT 라우팅의 순수 로직 잠금.
// 배경: 크롬은 카자흐어(kz) 인식기가 없어 ru-RU 로 폴백 → 카자흐 발화를 러시아어로
// 오인식. 그래서 kz 는 서버 STT(Gemini, kz 직접 지원)로 보내야 한다.
// 상세: docs/LIVE_TRANSLATE_EVAL.md §4
describe("STT 라우팅 — isBrowserSttNative", () => {
  it("카자흐어(kz)는 브라우저 네이티브가 아니다 → 서버 STT 로 라우팅돼야 함", () => {
    expect(isBrowserSttNative("kz")).toBe(false);
  });

  it("브라우저가 직접 지원하는 언어는 네이티브로 판정", () => {
    for (const lang of ["ko", "ru", "en", "zh", "ja"]) {
      expect(isBrowserSttNative(lang)).toBe(true);
    }
  });

  it("알 수 없는 언어 코드는 기본적으로 네이티브로 간주(폴백 목록에만 없으면)", () => {
    expect(isBrowserSttNative("fr")).toBe(true);
  });
});

describe("STT 라우팅 — getEffectiveSttLang (브라우저 폴백 매핑)", () => {
  it("카자흐어는 브라우저 STT 에서 러시아어로 폴백된다(폴백이 부정확한 이유)", () => {
    expect(getEffectiveSttLang("kz")).toBe("ru");
  });

  it("폴백 대상이 아닌 언어는 그대로 유지", () => {
    for (const lang of ["ko", "ru", "en", "zh", "ja"]) {
      expect(getEffectiveSttLang(lang)).toBe(lang);
    }
  });

  it("일관성: 브라우저 네이티브가 아닌 언어는 폴백된 코드와 원래 코드가 다르다", () => {
    // kz 는 네이티브가 아니므로(false) 폴백 코드(ru)가 원래 코드(kz)와 달라야 한다.
    expect(isBrowserSttNative("kz")).toBe(false);
    expect(getEffectiveSttLang("kz")).not.toBe("kz");
  });
});
