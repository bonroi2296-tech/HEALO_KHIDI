import { describe, it, expect } from "vitest";
import {
  normalizeSurveyLang,
  resolveSurveyRecipient,
} from "./resolveRecipient";

describe("normalizeSurveyLang", () => {
  it("지원 6언어는 그대로", () => {
    for (const l of ["ko", "en", "ru", "kk", "zh", "ja"]) {
      expect(normalizeSurveyLang(l)).toBe(l);
    }
  });

  it("앱 카자흐 코드 kz → 이메일 kk 로 매핑", () => {
    expect(normalizeSurveyLang("kz")).toBe("kk");
    expect(normalizeSurveyLang("KZ")).toBe("kk");
  });

  it("대소문자/공백 정규화", () => {
    expect(normalizeSurveyLang(" EN ")).toBe("en");
  });

  it("미지원·null·빈값 → ko", () => {
    expect(normalizeSurveyLang(null)).toBe("ko");
    expect(normalizeSurveyLang(undefined)).toBe("ko");
    expect(normalizeSurveyLang("")).toBe("ko");
    expect(normalizeSurveyLang("fr")).toBe("ko");
  });
});

describe("resolveSurveyRecipient", () => {
  const session = { patient_id: null, inquiry_id: 5, patient_language: null };

  it("patient_id 가 null 이어도 inquiry.email 로 폴백 (핵심 버그 수정)", () => {
    const r = resolveSurveyRecipient(
      session,
      null,
      { email: "patient@example.com", preferred_language: "ru", first_name: "Ivan", last_name: "Petrov" }
    );
    expect(r).toEqual({ email: "patient@example.com", lang: "ru", name: "Ivan Petrov" });
  });

  it("patients.email 이 있으면 우선", () => {
    const r = resolveSurveyRecipient(
      session,
      { email: "from-patients@example.com" },
      { email: "from-inquiry@example.com", preferred_language: "en" }
    );
    expect(r?.email).toBe("from-patients@example.com");
  });

  it("이메일이 어디에도 없으면 null (= skip)", () => {
    expect(resolveSurveyRecipient(session, null, { email: null })).toBeNull();
    expect(resolveSurveyRecipient(session, { email: "" }, null)).toBeNull();
    expect(resolveSurveyRecipient(session, null, null)).toBeNull();
  });

  it("'@' 없는 잘못된 이메일은 무시", () => {
    expect(
      resolveSurveyRecipient(session, null, { email: "not-an-email" })
    ).toBeNull();
  });

  it("언어 우선순위: session.patient_language > inquiry.preferred > spoken > ko", () => {
    expect(
      resolveSurveyRecipient(
        { ...session, patient_language: "ja" },
        null,
        { email: "a@b.com", preferred_language: "ru", spoken_language: "en" }
      )?.lang
    ).toBe("ja");
    expect(
      resolveSurveyRecipient(
        session,
        null,
        { email: "a@b.com", spoken_language: "zh" }
      )?.lang
    ).toBe("zh");
    expect(
      resolveSurveyRecipient(session, null, { email: "a@b.com" })?.lang
    ).toBe("ko");
  });

  it("카자흐 환자(kz) → 이메일 kk", () => {
    expect(
      resolveSurveyRecipient(session, null, { email: "a@b.com", preferred_language: "kz" })?.lang
    ).toBe("kk");
  });

  it("이름 없으면 name 생략", () => {
    const r = resolveSurveyRecipient(session, null, { email: "a@b.com" });
    expect(r?.name).toBeUndefined();
  });

  it("이메일 공백 트리밍", () => {
    expect(
      resolveSurveyRecipient(session, null, { email: "  a@b.com  " })?.email
    ).toBe("a@b.com");
  });
});
