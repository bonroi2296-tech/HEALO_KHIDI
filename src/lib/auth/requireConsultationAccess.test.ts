/**
 * requireConsultationAccess — 보안 회귀 테스트
 *
 * 이 테스트는 IDOR / 비참가자 차단 / admin-only role 게이트가
 * 리팩터 중에 풀리지 않도록 회귀 방어한다.
 *
 * 실행: npm run test:run -- requireConsultationAccess
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ─── mock deps BEFORE importing SUT ───────────────────────────
// server-only 는 Next.js 가 주입하는 런타임 가드 — 테스트에서는 bypass
vi.mock("server-only", () => ({}));

// 각 테스트가 auth / DB 응답을 개별 재정의한다.
const mockCheckAdminAuth = vi.fn();
const mockRateLimit = vi.fn();

vi.mock("./checkAdminAuth", () => ({
  checkAdminAuth: (...args: any[]) => mockCheckAdminAuth(...args),
}));

const sessionSelectSingle = vi.fn();
const sessionSelectEq = vi.fn(() => ({ maybeSingle: sessionSelectSingle }));
const sessionSelect = vi.fn(() => ({ eq: sessionSelectEq }));
const sessionFrom = vi.fn(() => ({ select: sessionSelect }));
vi.mock("../rag/supabaseAdmin", () => ({
  supabaseAdmin: {
    from: (...args: any[]) => sessionFrom(...args),
  },
}));

vi.mock("../rateLimit", () => ({
  checkRateLimit: (...args: any[]) => mockRateLimit(...args),
  getClientIp: () => "127.0.0.1",
  getRateLimitHeaders: () => ({}),
}));

// SUT
import { requireConsultationAccess } from "./requireConsultationAccess";

function makeRequest(): NextRequest {
  // 실제 NextRequest 가 아니더라도 helper 에서 쓰이는 .headers / .cookies / .url 만 있으면 됨
  return {
    headers: { get: () => null },
    cookies: { getAll: () => [] },
    url: "https://example.com/api/khidi/consultation/abc",
    method: "GET",
  } as unknown as NextRequest;
}

const SESSION_BASE = {
  id: "sess-1",
  patient_id: null,
  doctor_id: null,
  coordinator_id: null,
  translator_id: null,
  patient_user_id: null,
  doctor_user_id: null,
  coordinator_user_id: null,
  livekit_room_name: "room-1",
  status: "scheduled",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockRateLimit.mockReturnValue({ allowed: true, resetAt: Date.now() + 60_000 });
});

describe("requireConsultationAccess — IDOR 방어", () => {
  it("미인증 사용자 → 401", async () => {
    mockCheckAdminAuth.mockResolvedValue({ isAdmin: false }); // userId 없음

    const result = await requireConsultationAccess(makeRequest(), "sess-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(401);
    }
    // DB 접근 자체가 안 되어야 함 — 익명에게 세션 존재 여부 알려주면 안됨
    expect(sessionFrom).not.toHaveBeenCalled();
  });

  it("rate limit 초과 → 429 (인증 검사 전)", async () => {
    mockRateLimit.mockReturnValue({ allowed: false, resetAt: Date.now() + 1_000 });

    const result = await requireConsultationAccess(makeRequest(), "sess-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(429);
    }
    expect(mockCheckAdminAuth).not.toHaveBeenCalled();
  });

  it("비참가자 로그인 사용자 → 403 (IDOR 차단)", async () => {
    mockCheckAdminAuth.mockResolvedValue({
      isAdmin: false,
      userId: "attacker-user-id",
      email: "attacker@evil.com",
    });
    sessionSelectSingle.mockResolvedValue({
      data: {
        ...SESSION_BASE,
        patient_user_id: "legit-patient-id",
        doctor_user_id: "legit-doctor-id",
      },
      error: null,
    });

    const result = await requireConsultationAccess(makeRequest(), "sess-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(403);
    }
  });

  it("존재하지 않는 세션 → 404 (인증 통과 후)", async () => {
    mockCheckAdminAuth.mockResolvedValue({
      isAdmin: false,
      userId: "user-x",
    });
    sessionSelectSingle.mockResolvedValue({ data: null, error: null });

    const result = await requireConsultationAccess(makeRequest(), "nonexistent");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(404);
    }
  });

  it("잘못된 consultationId → 400", async () => {
    mockCheckAdminAuth.mockResolvedValue({
      isAdmin: false,
      userId: "user-x",
    });

    // @ts-expect-error intentionally pass invalid type
    const result = await requireConsultationAccess(makeRequest(), null);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(400);
    }
  });
});

describe("requireConsultationAccess — 참가자 허용", () => {
  it("환자 본인 → role=patient 허용", async () => {
    mockCheckAdminAuth.mockResolvedValue({
      isAdmin: false,
      userId: "patient-1",
    });
    sessionSelectSingle.mockResolvedValue({
      data: { ...SESSION_BASE, patient_user_id: "patient-1" },
      error: null,
    });

    const result = await requireConsultationAccess(makeRequest(), "sess-1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.role).toBe("patient");
      expect(result.userId).toBe("patient-1");
      expect(result.isAdmin).toBe(false);
    }
  });

  it("의사 본인 → role=doctor 허용", async () => {
    mockCheckAdminAuth.mockResolvedValue({
      isAdmin: false,
      userId: "doctor-1",
    });
    sessionSelectSingle.mockResolvedValue({
      data: { ...SESSION_BASE, doctor_user_id: "doctor-1" },
      error: null,
    });

    const result = await requireConsultationAccess(makeRequest(), "sess-1");

    expect(result.success).toBe(true);
    if (result.success) expect(result.role).toBe("doctor");
  });

  it("코디네이터 본인 → role=coordinator 허용", async () => {
    mockCheckAdminAuth.mockResolvedValue({
      isAdmin: false,
      userId: "coord-1",
    });
    sessionSelectSingle.mockResolvedValue({
      data: { ...SESSION_BASE, coordinator_user_id: "coord-1" },
      error: null,
    });

    const result = await requireConsultationAccess(makeRequest(), "sess-1");

    expect(result.success).toBe(true);
    if (result.success) expect(result.role).toBe("coordinator");
  });

  it("통역사 본인 → role=translator 허용", async () => {
    mockCheckAdminAuth.mockResolvedValue({
      isAdmin: false,
      userId: "trans-1",
    });
    sessionSelectSingle.mockResolvedValue({
      data: { ...SESSION_BASE, translator_id: "trans-1" },
      error: null,
    });

    const result = await requireConsultationAccess(makeRequest(), "sess-1");

    expect(result.success).toBe(true);
    if (result.success) expect(result.role).toBe("translator");
  });

  it("admin → role=admin 허용 (참가자 아니어도)", async () => {
    mockCheckAdminAuth.mockResolvedValue({
      isAdmin: true,
      userId: "admin-1",
      email: "admin@healo.com",
    });
    sessionSelectSingle.mockResolvedValue({
      data: { ...SESSION_BASE, patient_user_id: "someone-else" },
      error: null,
    });

    const result = await requireConsultationAccess(makeRequest(), "sess-1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.role).toBe("admin");
      expect(result.isAdmin).toBe(true);
    }
  });
});

describe("requireConsultationAccess — requireRole 게이트", () => {
  it("환자가 admin-only 경로 접근 → 403", async () => {
    mockCheckAdminAuth.mockResolvedValue({
      isAdmin: false,
      userId: "patient-1",
    });
    sessionSelectSingle.mockResolvedValue({
      data: { ...SESSION_BASE, patient_user_id: "patient-1" },
      error: null,
    });

    const result = await requireConsultationAccess(makeRequest(), "sess-1", {
      requireRole: ["admin"],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(403);
    }
  });

  it("의사가 doctor-allowed 경로 접근 → 허용", async () => {
    mockCheckAdminAuth.mockResolvedValue({
      isAdmin: false,
      userId: "doctor-1",
    });
    sessionSelectSingle.mockResolvedValue({
      data: { ...SESSION_BASE, doctor_user_id: "doctor-1" },
      error: null,
    });

    const result = await requireConsultationAccess(makeRequest(), "sess-1", {
      requireRole: ["admin", "doctor", "coordinator"],
    });

    expect(result.success).toBe(true);
  });
});
