import { describe, it, expect } from "vitest";
import { LOCALES, localeSwitchTarget, isLegacyLanding, LEGACY_LANDINGS } from "./config";

// 언어 스위처가 "없는 주소"로 보내면 사용자는 404 를 본다.
// 2026-07-22 실측: /ru/for-russian-patients 에서 언어를 바꾸면 /ko/for-russian-patients (404),
// /kk/for-kazakh-patients 에서는 kk 가 LOCALES 에 없어 아무 일도 안 일어났다.
describe("localeSwitchTarget", () => {
  it("일반 공개 경로는 언어 prefix 만 갈아끼운다", () => {
    expect(localeSwitchTarget("/ru/treatments", "", "ko")).toBe("/ko/treatments");
    expect(localeSwitchTarget("/ko/hospitals", "?p=2", "ru")).toBe("/ru/hospitals?p=2");
    expect(localeSwitchTarget("/ru", "", "ja")).toBe("/ja");
  });

  it("언어화 안 된 내부 경로는 null (호출부가 reload)", () => {
    expect(localeSwitchTarget("/admin/staff", "", "ko")).toBeNull();
  });

  it("러/카 랜딩은 번역판이 없으므로 그 언어 홈으로 — 절대 없는 주소로 보내지 않는다", () => {
    for (const landing of LEGACY_LANDINGS) {
      for (const code of LOCALES) {
        const target = localeSwitchTarget(landing, "", code);
        expect(target).toBe(`/${code}`);
      }
    }
  });

  it("isLegacyLanding 은 하위 경로까지 잡고 남의 경로는 안 잡는다", () => {
    expect(isLegacyLanding("/ru/for-russian-patients")).toBe(true);
    expect(isLegacyLanding("/ru/for-russian-patients/faq")).toBe(true);
    expect(isLegacyLanding("/ru/treatments")).toBe(false);
    expect(isLegacyLanding("/ru/for-russian-patients-other")).toBe(false);
  });
});
