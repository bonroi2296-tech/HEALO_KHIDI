/**
 * checkAdminAuth — 비활성(소프트삭제) 계정 차단 회귀 테스트
 *
 * 핵심 계약: app_metadata.disabled === true 인 계정은 '유효한 주체'가 아니므로
 *   checkAdminAuth 가 userId 를 비워 반환한다 → userId 만 검사하는 모든 인증 게이트
 *   (requireAuthenticatedUser / requireConsultationAccess / requirePortalAuth /
 *    cost·visa·followup·rebooking 등)가 자동으로 401 거부. (#677 후속)
 *   동시에 정상 계정(disabled 미설정/false)은 오탐으로 막히지 않아야 한다.
 *
 * 실행: npm run test:run -- checkAdminAuth
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// checkAdminAuth 가 유저를 읽는 두 경로(쿠키·Bearer)를 하나의 mock 으로 통일
const mockGetUser = vi.fn();

vi.mock("../supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser: mockGetUser } }),
  createSupabaseServerClientFromRequest: () => ({ auth: { getUser: mockGetUser } }),
}));

// Bearer 경로가 타더라도 안전하도록 supabaseAdmin 도 동일 mock
vi.mock("../rag/supabaseAdmin", () => ({
  supabaseAdmin: { auth: { getUser: mockGetUser } },
}));

import { checkAdminAuth } from "./checkAdminAuth";

function makeRequest(): NextRequest {
  return {
    headers: { get: () => null }, // Authorization 없음 → 쿠키 경로
    cookies: { getAll: () => [] },
    url: "https://example.com/api/x",
    method: "GET",
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.ADMIN_EMAIL_ALLOWLIST;
});

describe("checkAdminAuth — 비활성 계정 차단(소프트삭제 보장)", () => {
  it("disabled=true 인 admin → isAdmin:false + userId 비움(주체 무효) + reason=account_disabled", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "disabled-admin",
          email: "a@b.com",
          app_metadata: { role: "admin", disabled: true },
        },
      },
      error: null,
    });

    const r = await checkAdminAuth(makeRequest());

    expect(r.isAdmin).toBe(false);
    // 핵심: userId 가 없어야 모든 `if(!auth.userId)` 게이트가 401 로 거부한다
    expect(r.userId).toBeUndefined();
    expect(r.reason).toBe("account_disabled");
  });

  it("disabled=true 인 일반 계정 → userId 비움(consultation/portal 등 게이트 자동 차단)", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "disabled-user",
          email: "u@b.com",
          app_metadata: { disabled: true },
        },
      },
      error: null,
    });

    const r = await checkAdminAuth(makeRequest());

    expect(r.userId).toBeUndefined();
    expect(r.reason).toBe("account_disabled");
  });
});

describe("checkAdminAuth — 정상 계정 오탐 없음", () => {
  it("정상 admin(disabled 미설정) → isAdmin:true + userId 유지", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "ok-admin",
          email: "admin@healwith.co.kr",
          app_metadata: { role: "admin" },
        },
      },
      error: null,
    });

    const r = await checkAdminAuth(makeRequest());

    expect(r.isAdmin).toBe(true);
    expect(r.userId).toBe("ok-admin");
  });

  it("정상 일반 계정(disabled:false) → userId 유지(인증 게이트 정상 통과)", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "ok-user",
          email: "user@example.com",
          app_metadata: { disabled: false },
        },
      },
      error: null,
    });

    const r = await checkAdminAuth(makeRequest());

    expect(r.userId).toBe("ok-user");
    expect(r.isAdmin).toBe(false); // admin 은 아니지만 userId 는 살아있어 일반 게이트 통과
  });
});
