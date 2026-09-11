import { describe, it, expect } from "vitest";
import { buildRegisterRequest, shouldReportPermissionProblem } from "./registerPush";

const headersOf = (init: RequestInit) => init.headers as Record<string, string>;

describe("buildRegisterRequest", () => {
  it("로그인 상태면 Bearer 를 실어 보낸다 (서버가 user_id 를 채우는 유일한 조건)", () => {
    const init = buildRegisterRequest("tok123", "ios", "access-abc");
    expect(headersOf(init).Authorization).toBe("Bearer access-abc");
    expect(JSON.parse(init.body as string)).toEqual({ token: "tok123", platform: "ios" });
  });

  it("로그아웃 상태면 Authorization 을 아예 넣지 않는다 → 서버가 user_id 를 null 로 덮어씀", () => {
    for (const noToken of [undefined, null, ""]) {
      const init = buildRegisterRequest("tok123", "android", noToken);
      expect("Authorization" in headersOf(init)).toBe(false);
    }
  });
});

// 사용자가 거부한 것은 «우리 고장»이 아니다 — 오류 수집기에 쌓이면 목록이 무뎌진다.
// (실서비스 Sentry JAVASCRIPT-NEXTJS-G: iOS denied 1건이 미해결로 남아 있었다. 2026-09-11)
describe("shouldReportPermissionProblem", () => {
  it("denied = 사람이 거부 → 안 보낸다", () => {
    expect(shouldReportPermissionProblem("denied")).toBe(false);
  });
  it("granted = 정상 → 보낼 일 없음", () => {
    expect(shouldReportPermissionProblem("granted")).toBe(false);
  });
  it("물어본 뒤에도 prompt = OS 가 물음창을 안 띄운 것 → 보낸다(우리 쪽 결함 신호)", () => {
    for (const r of ["prompt", "prompt-with-rationale"]) {
      expect(shouldReportPermissionProblem(r)).toBe(true);
    }
  });
  it("모르는 값도 보낸다 — 새 상태가 생기면 조용히 묻히지 않아야 한다", () => {
    expect(shouldReportPermissionProblem("something-new")).toBe(true);
  });
});
