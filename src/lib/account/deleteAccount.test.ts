import { describe, it, expect } from "vitest";
import { confirmMatchesEmail } from "./deleteAccount";

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


// 빈 userId 가 들어오면 «주인 없는 문의 전부»를 건드리게 된다. 반드시 막혀야 한다.
describe("deleteAccountCompletely 빈 값 방어", () => {
  it("userId 가 비면 아무것도 건드리지 않고 실패로 끝난다", async () => {
    const { deleteAccountCompletely } = await import("./deleteAccount");
    for (const bad of ["", "   ", null, undefined]) {
      const r = await deleteAccountCompletely(bad as unknown as string);
      expect(r.ok).toBe(false);
      expect(r.failedSteps).toContain("invalid_user_id");
      expect(r.anonymizedInquiries).toBe(0);
      expect(r.purgedRows).toBe(0);
    }
  });
});
