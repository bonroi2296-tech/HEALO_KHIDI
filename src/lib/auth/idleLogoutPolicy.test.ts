/**
 * 무활동 자동 로그아웃 «어디서 도는가» 규칙 검증 (2026-08-04 PO 결정).
 *
 * 왜 테스트가 필요한가: 이 규칙은 «30분 뒤에 일어나는 일»이라 손으로 확인하려면 30분을
 * 기다려야 하고, 게다가 «폰 앱에서만 다르게 동작»해서 PC 브라우저로는 재현조차 안 된다.
 * 그래서 아무도 안 해보고 넘어가고, 예전처럼 앱에서도 10분마다 끊긴 채로 나간다.
 * 조건 판정만 순수 함수로 떼어내 못 박는다.
 */
import { describe, it, expect } from "vitest";
import { shouldRunIdleLogout, IDLE_LIMIT_MS, IDLE_WARNING_MS } from "./idleLogoutPolicy";

const base = {
  isPortalPage: true,
  pathname: "/coordinator/inbox",
  hasSession: true,
  isNativeApp: false,
};

describe("shouldRunIdleLogout", () => {
  it("PC·폰 브라우저의 포털에서는 돈다", () => {
    expect(shouldRunIdleLogout(base)).toBe(true);
  });

  it("스토어 앱 안에서는 돌지 않는다 — 폰 잠금이 대신한다 (2026-08-04 PO 결정)", () => {
    expect(shouldRunIdleLogout({ ...base, isNativeApp: true })).toBe(false);
  });

  it("환자 화면은 예전부터 제외 — 앱이든 브라우저든", () => {
    expect(shouldRunIdleLogout({ ...base, pathname: "/patient/documents" })).toBe(false);
    expect(
      shouldRunIdleLogout({ ...base, pathname: "/patient/documents", isNativeApp: true })
    ).toBe(false);
  });

  it("로그인 안 했거나 포털이 아니면 돌지 않는다", () => {
    expect(shouldRunIdleLogout({ ...base, hasSession: false })).toBe(false);
    expect(shouldRunIdleLogout({ ...base, isPortalPage: false, pathname: "/" })).toBe(false);
  });

  it("관리자·병원·에이전시·클리닉 포털은 전부 대상이다", () => {
    for (const p of ["/admin", "/hospital/cases", "/agency/patients", "/clinic/schedule"]) {
      expect(shouldRunIdleLogout({ ...base, pathname: p })).toBe(true);
    }
  });
});

describe("시간 값", () => {
  it("30분에 로그아웃, 28분에 경고 — 경고가 로그아웃보다 먼저다", () => {
    expect(IDLE_LIMIT_MS).toBe(30 * 60 * 1000);
    expect(IDLE_WARNING_MS).toBe(28 * 60 * 1000);
    expect(IDLE_WARNING_MS).toBeLessThan(IDLE_LIMIT_MS);
  });
});
