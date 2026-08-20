import { describe, it, expect } from "vitest";
import { confirmMatchesEmail, fileLabel } from "./deleteAccount";

// 되돌릴 수 없는 삭제 앞의 관문. 느슨해지면 여기서 깨져야 한다.
describe("confirmMatchesEmail", () => {
  it("대소문자·앞뒤 공백만 눈감아 준다", () => {
    expect(confirmMatchesEmail("  A@B.com ", "a@b.com")).toBe(true);
  });

  it("다른 글자면 막는다", () => {
    expect(confirmMatchesEmail("a@b.co", "a@b.com")).toBe(false);
    expect(confirmMatchesEmail("", "a@b.com")).toBe(false);
    expect(confirmMatchesEmail(undefined, "a@b.com")).toBe(false);
  });

  // 소셜 로그인 계정 중 이메일이 없는 경우가 있다. 관문이 없는 셈이므로 무조건 막아야 한다.
  it("이메일이 없는 계정은 통과시키지 않는다", () => {
    expect(confirmMatchesEmail("", null)).toBe(false);
    expect(confirmMatchesEmail("anything", "")).toBe(false);
  });
});

// 첨부 파일 이름에 환자 실명이 박혀 있었다(문의 #93 실측). 이름표만 남아야 한다.
describe("fileLabel", () => {
  it("확장자만 남기고 이름 글자는 지운다", () => {
    expect(fileLabel("Заключение к МРТ Татепбаева Айгерим.pdf")).toBe("첨부파일.pdf");
    expect(fileLabel("신장 초음파 검사.JPG")).toBe("첨부파일.jpg");
  });

  it("확장자가 없거나 값이 없으면 이름표만", () => {
    expect(fileLabel("scan")).toBe("첨부파일");
    expect(fileLabel(null)).toBe("첨부파일");
    expect(fileLabel(undefined)).toBe("첨부파일");
  });
});
