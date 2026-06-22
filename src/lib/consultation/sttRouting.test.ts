import { describe, it, expect } from "vitest";
import {
  getEffectiveSttLang,
  isBrowserSttNative,
  LANG_MAP,
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

// 가드(영구 차단): LANG_MAP 에 '교차언어 폴백'(키와 다른 언어의 인식기를 매핑)을 새로
// 추가하면서 STT_FALLBACK_LANGS 등록을 깜빡하면 카자흐어 사고가 재발한다. 이 테스트가
// CI 매 PR 에서 그 부류를 자동 차단한다. POSTMORTEMS #16.
describe("STT 라우팅 가드 — 교차언어 폴백은 반드시 서버 STT 로 라우팅(미등록 차단)", () => {
  // 각 앱 언어코드의 '진짜' BCP-47 기본 서브태그. 브라우저 인식기가 이 서브태그를
  // 가져야 네이티브. (앱은 카자흐를 'kz'로 쓰지만 BCP-47 은 'kk'.)
  const NATIVE_SUBTAG: Record<string, string> = {
    ko: "ko",
    ru: "ru",
    en: "en",
    kz: "kk",
    zh: "zh",
    ja: "ja",
  };

  it("키와 다른 언어 로케일로 매핑된(폴백) 코드는 isBrowserSttNative=false 여야 함", () => {
    for (const [code, locale] of Object.entries(LANG_MAP)) {
      const localeSubtag = String(locale).split("-")[0];
      const nativeSubtag = NATIVE_SUBTAG[code] ?? code;
      const isFallback = localeSubtag !== nativeSubtag;
      if (isFallback) {
        expect(
          isBrowserSttNative(code),
          `LANG_MAP['${code}']='${locale}' 는 교차언어 폴백 → STT_FALLBACK_LANGS 에 '${code}' 등록 필요(서버 STT 라우팅)`
        ).toBe(false);
      }
    }
  });

  it("최소 1개(kz)는 폴백으로 감지돼 가드가 실제로 동작함을 보장", () => {
    const fallbacks = Object.entries(LANG_MAP).filter(([code, locale]) => {
      const nativeSubtag = NATIVE_SUBTAG[code] ?? code;
      return String(locale).split("-")[0] !== nativeSubtag;
    });
    expect(fallbacks.length).toBeGreaterThanOrEqual(1);
  });
});
