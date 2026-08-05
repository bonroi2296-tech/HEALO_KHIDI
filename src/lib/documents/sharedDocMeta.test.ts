/**
 * 언어 알아맞히기 시험 — 「반만 맞는 추측」이 제일 해로워서(환자가 못 읽는 언어를 자기 것으로
 * 착각한다) 사람 이름에 걸리는 오탐을 특히 잰다.
 */
import { describe, it, expect } from "vitest";
import { guessDocLang, docDisplayTitle } from "./sharedDocMeta";

describe("guessDocLang", () => {
  it("파일명의 언어 토막을 읽는다", () => {
    expect(guessDocLang("SECOND OPINION_RU_AMANOV_TULEGEN.docx")).toBe("ru");
    expect(guessDocLang("COVER LETTER_KZ_AMANOV TOLEGEN.docx")).toBe("kz");
    expect(guessDocLang("안내문-korean.pdf")).toBe("ko");
  });

  it("사람 이름 속 글자에는 안 걸린다", () => {
    // TULEGEN 안의 EN, ENGLISH 아닌 것들. 토막으로 떨어져 있을 때만 센다.
    expect(guessDocLang("AMANOV_TULEGEN.pdf")).toBeNull();
    expect(guessDocLang("KOREA_HOSPITAL_INTRO.pdf")).toBeNull();
  });

  it("언어가 둘 이상 섞였으면 포기한다", () => {
    expect(guessDocLang("OPINION_RU_KZ.docx")).toBeNull();
  });

  it("단서가 없으면 null", () => {
    expect(guessDocLang("소견서.pdf")).toBeNull();
  });
});

describe("docDisplayTitle", () => {
  it("코디가 붙인 이름이 우선", () => {
    expect(docDisplayTitle("의사 소견서", "SECOND_OPINION_RU.docx")).toBe("의사 소견서");
  });

  it("이름이 없으면 파일명에서 확장자만 뗀다", () => {
    expect(docDisplayTitle("", "SECOND_OPINION_RU.docx")).toBe("SECOND_OPINION_RU");
    expect(docDisplayTitle(null, "안내문.pdf")).toBe("안내문");
  });
});
