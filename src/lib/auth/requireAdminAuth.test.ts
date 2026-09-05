/**
 * requireAdminAuth — 관리자 권한 회귀 테스트
 *
 * 방어 대상:
 * - user_metadata.role=admin 으로 권한 상승 시도 (→ 반드시 거부)
 * - app_metadata.role=admin 허용
 * - ADMIN_EMAIL_ALLOWLIST 허용
 * - Rate limit 작동
 * - 인증 실패 시 audit log 기록
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const mockCheckAdminAuth = vi.fn();
const mockRateLimit = vi.fn();
const mockLogAdminAction = vi.fn();

vi.mock("./checkAdminAuth", () => ({
  checkAdminAuth: (...args: any[]) => mockCheckAdminAuth(...args),
}));

vi.mock("../audit/adminAuditLog", () => ({
  logAdminAction: (...args: any[]) => {
    mockLogAdminAction(...args);
    return Promise.resolve();
  },
  getIpFromRequest: () => "127.0.0.1",
  getUserAgentFromRequest: () => "test-agent",
}));

vi.mock("../rateLimit", () => ({
  checkRateLimit: (...args: any[]) => mockRateLimit(...args),
  getClientIp: () => "127.0.0.1",
  RATE_LIMITS: {
    ADMIN: { windowMs: 60_000, maxRequests: 100, apiName: "admin" },
  },
}));

import { requireAdminAuth } from "./requireAdminAuth";

function makeRequest(pathname = "/api/admin/test"): NextRequest {
  return {
    headers: { get: () => null },
    cookies: { getAll: () => [] },
    url: `https://example.com${pathname}`,
    method: "GET",
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRateLimit.mockReturnValue({ allowed: true, resetAt: Date.now() + 60_000 });
});

describe("requireAdminAuth — 인증/권한", () => {
  it("app_metadata.role=admin → 통과", async () => {
    mockCheckAdminAuth.mockResolvedValue({
      isAdmin: true,
      userId: "admin-1",
      email: "admin@healo.com",
      reason: "app_metadata_role",
    });

    const result = await requireAdminAuth(makeRequest());

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.authResult.isAdmin).toBe(true);
      expect(result.authResult.reason).toBe("app_metadata_role");
    }
  });

  it("ADMIN_EMAIL_ALLOWLIST 포함 → 통과", async () => {
    mockCheckAdminAuth.mockResolvedValue({
      isAdmin: true,
      userId: "admin-2",
      email: "allowlist@healo.com",
      reason: "email_allowlist",
    });

    const result = await requireAdminAuth(makeRequest());

    expect(result.success).toBe(true);
  });

  it("일반 유저 → 403 + audit log 기록", async () => {
    mockCheckAdminAuth.mockResolvedValue({
      isAdmin: false,
      userId: "user-1",
      email: "user@example.com",
      error: "not_admin",
    });

    const result = await requireAdminAuth(makeRequest());

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(403);
    }
    expect(mockLogAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "UNAUTHORIZED_ADMIN_ACCESS",
        adminEmail: "user@example.com",
      })
    );
  });

  it("역할 확인 통로(/api/admin/whoami)는 403 이어도 감사기록을 남기지 않는다", async () => {
    // 로그인 화면이 「나 관리자인가?」를 모두에게 묻는다 → 코디·환자 정상 로그인마다 「무단 접근」이
    // 쌓여 진짜 침입 신호가 묻힌다(2026-07-31 실측 48시간 19건 전부 이 경로, 진짜 침입 0건).
    mockCheckAdminAuth.mockResolvedValue({
      isAdmin: false,
      userId: "user-1",
      email: "coordinator@healwith.co.kr",
      error: "not_admin",
    });

    const result = await requireAdminAuth(makeRequest("/api/admin/whoami"));

    expect(result.success).toBe(false); // 막는 건 그대로
    expect(mockLogAdminAction).not.toHaveBeenCalled(); // 기록만 안 남긴다
  });

  it("미인증 사용자 → 403", async () => {
    mockCheckAdminAuth.mockResolvedValue({
      isAdmin: false,
      error: "no_user",
    });

    const result = await requireAdminAuth(makeRequest());

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(403);
    }
    expect(mockLogAdminAction).toHaveBeenCalled();
  });
});

describe("requireAdminAuth — Rate limit", () => {
  it("rate limit 초과 → 429 (인증 검사 전)", async () => {
    mockRateLimit.mockReturnValue({ allowed: false, resetAt: Date.now() + 1_000 });

    const result = await requireAdminAuth(makeRequest());

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(429);
    }
    expect(mockCheckAdminAuth).not.toHaveBeenCalled();
  });

  it("skipRateLimit 옵션 → rate limit 스킵", async () => {
    mockCheckAdminAuth.mockResolvedValue({
      isAdmin: true,
      userId: "admin-1",
      email: "admin@healo.com",
    });

    const result = await requireAdminAuth(makeRequest(), { skipRateLimit: true });

    expect(result.success).toBe(true);
    expect(mockRateLimit).not.toHaveBeenCalled();
  });
});

describe("requireAdminAuth — 권한 상승 방어 (사전 회귀)", () => {
  // 이 테스트는 checkAdminAuth 의 내부 로직 변경을 감시.
  // checkAdminAuth 자체는 user_metadata.role 을 절대 보지 않아야 함.
  // (이 테스트 파일에선 checkAdminAuth mock — 실제 로직은 해당 파일 자체 테스트 필요)

  it("isAdmin=false 일 땐 어떤 상황이어도 거부", async () => {
    // 공격자가 user_metadata.role=admin 로 시도했을 때 checkAdminAuth 는
    // app_metadata 만 보고 isAdmin=false 반환해야 함 (이 behavior 는 내부 로직 테스트)
    mockCheckAdminAuth.mockResolvedValue({
      isAdmin: false,
      userId: "attacker-id",
      email: "attacker@evil.com",
      error: "not_admin",
    });

    const result = await requireAdminAuth(makeRequest("/api/admin/doctors"));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(403);
    }
  });
});

describe("requireAdminAuth — 거부 응답이 내부 정보를 흘리지 않는다", () => {
  // 2026-09-05 실서비스 실측: 거부 응답에 hint 로 «Vercel: ADMIN_EMAIL_ALLOWLIST 설정.
  // Supabase: app_metadata.role = admin» 이 나갔다. 이 헬퍼를 쓰는 라우트가 82개라
  // 미인증자가 아무 admin API 만 찔러도 호스팅·인증 백엔드·권한 환경변수 이름·판정 필드를
  // 전부 알 수 있었다. 운영에선 «코드형»만 나가야 한다(CLAUDE.md 보안 규칙).
  // NODE_ENV 는 그냥 대입이 안 먹는다(읽기 전용). vitest 의 stubEnv 를 쓴다.
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    mockRateLimit.mockReturnValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60_000 });
    mockCheckAdminAuth.mockResolvedValue({
      isAdmin: false,
      userId: "someone",
      email: "someone@example.com",
      error: "not_admin",
      debug: { probe: "should-not-leak" },
    });
  });

  it("운영(production)에선 hint·debug 를 내보내지 않는다", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const result = await requireAdminAuth(makeRequest());
    expect(result.success).toBe(false);
    if (result.success) return;

    const body = await result.response.json();
    expect(body.error).toBe("unauthorized");
    expect(body.hint).toBeUndefined();
    expect(body.debug).toBeUndefined();
    // 환경변수 이름·판정 필드가 본문 어디에도 없어야 한다.
    expect(JSON.stringify(body)).not.toMatch(/ADMIN_EMAIL_ALLOWLIST|app_metadata/);
  });

  it("개발에선 hint 를 남긴다(디버깅 편의)", async () => {
    vi.stubEnv("NODE_ENV", "development");

    const result = await requireAdminAuth(makeRequest());
    expect(result.success).toBe(false);
    if (result.success) return;

    const body = await result.response.json();
    expect(body.hint).toContain("ADMIN_EMAIL_ALLOWLIST");
  });
});
