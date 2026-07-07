import { describe, it, expect, vi } from "vitest";
import { resolveAgencyIdForUser } from "./resolveAgencyIdForUser";

// agency_users 조회를 흉내내는 최소 fake 빌더 체인.
// .from().select().eq().eq().limit().maybeSingle() 을 지원하고, maybeSingle 이 주어진 결과를 돌려준다.
function fakeClient(result: { data?: any; error?: any } | (() => never)) {
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    limit: () => chain,
    maybeSingle: typeof result === "function" ? result : () => Promise.resolve(result),
  };
  return { from: () => chain };
}

describe("resolveAgencyIdForUser", () => {
  it("userId 없으면 조회 없이 null", async () => {
    const spy = vi.fn();
    const client = { from: spy };
    expect(await resolveAgencyIdForUser(client, null)).toBeNull();
    expect(await resolveAgencyIdForUser(client, undefined)).toBeNull();
    expect(await resolveAgencyIdForUser(client, "")).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it("활성 에이전시 멤버면 agency_id 반환", async () => {
    const client = fakeClient({ data: { agency_id: "71ce80fb" }, error: null });
    expect(await resolveAgencyIdForUser(client, "user-1")).toBe("71ce80fb");
  });

  it("에이전시 미소속(행 없음)이면 null", async () => {
    const client = fakeClient({ data: null, error: null });
    expect(await resolveAgencyIdForUser(client, "user-2")).toBeNull();
  });

  it("조회가 던져도 접수는 진행되도록 null (fail-safe)", async () => {
    const client = fakeClient(() => { throw new Error("db down"); });
    expect(await resolveAgencyIdForUser(client, "user-3")).toBeNull();
  });
});
