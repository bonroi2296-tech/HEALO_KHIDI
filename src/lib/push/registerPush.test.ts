import { describe, it, expect } from "vitest";
import { buildRegisterRequest } from "./registerPush";

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
