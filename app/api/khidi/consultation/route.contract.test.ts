/**
 * 계약 회귀 테스트 — 상담 생성 (POST /api/khidi/consultation)
 *
 * 목적: "어드민 폼이 실제로 보내는 필드 이름" 그대로 핸들러에 넣었을 때
 *       DB insert 에 올바른 컬럼이 채워지는지 검증한다.
 *
 * 과거 버그: 폼은 snake_case(session_type·scheduled_at·patient_user_id·
 *   selected_inquiry_id·hospital_id·partner_doctor_id)를 보내는데 API 는
 *   camelCase 만 읽어 상담 생성이 400 으로 실패하고 inquiry_id 등이 누락됐음.
 *   이 테스트가 그 부류(화면↔서버 필드 계약 어긋남)를 커밋 전에 잡는다.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── 인증: 어드민으로 통과 ──
vi.mock("@/lib/auth/requireConsultationAccess", () => ({
  requireAuthenticatedUser: vi.fn(async () => ({
    success: true,
    userId: "admin-uuid-0000",
    isAdmin: true,
  })),
}));

// ── supabaseAdmin: insert 페이로드 캡처 ──
const captured: { table?: string; insert?: any } = {};
vi.mock("@/lib/rag/supabaseAdmin", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      captured.table = table;
      return {
        insert: (rows: any[]) => {
          captured.insert = rows[0];
          return {
            select: () => ({
              single: async () => ({
                data: { id: "new-session-id", ...rows[0] },
                error: null,
              }),
            }),
          };
        },
      };
    },
  },
}));

import { POST } from "./route";

function makeReq(body: any): any {
  return { json: async () => body };
}

/** 어드민 상담 생성 폼이 실제로 보내는 본문 (snake_case) */
function adminFormBody(overrides: Record<string, any> = {}) {
  return {
    selected_inquiry_id: "3",
    patient_user_id: "patient-uuid-1234",
    doctor_user_id: "doctor-uuid-1",
    coordinator_user_id: "coord-uuid-1",
    session_type: "pre_consultation",
    scheduled_at: "2026-07-01T01:00:00.000Z",
    patient_language: "ru",
    doctor_language: "ko",
    hospital_id: "hospital-uuid-1",
    partner_doctor_id: "pd-uuid-1",
    notes: "테스트",
    ...overrides,
  };
}

describe("상담 생성 계약 — 어드민 폼(snake_case) → DB insert", () => {
  beforeEach(() => {
    captured.table = undefined;
    captured.insert = undefined;
  });

  it("폼 본문으로 생성 성공하고 consultation_sessions 에 insert 한다", async () => {
    const res = await POST(makeReq(adminFormBody()));
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(captured.table).toBe("consultation_sessions");
  });

  it("session_type·scheduled_at 가 누락 없이 저장된다 (과거 400 버그 회귀)", async () => {
    await POST(makeReq(adminFormBody()));
    expect(captured.insert.session_type).toBe("pre_consultation");
    expect(captured.insert.scheduled_at).toBe("2026-07-01T01:00:00.000Z");
  });

  it("selected_inquiry_id → inquiry_id 로 숫자 변환되어 연결된다 (깔때기 집계 핵심)", async () => {
    await POST(makeReq(adminFormBody()));
    expect(captured.insert.inquiry_id).toBe(3);
    expect(typeof captured.insert.inquiry_id).toBe("number");
  });

  it("hospital_id·partner_doctor_id 가 저장된다 (과거 누락 버그 회귀)", async () => {
    await POST(makeReq(adminFormBody()));
    expect(captured.insert.hospital_id).toBe("hospital-uuid-1");
    expect(captured.insert.partner_doctor_id).toBe("pd-uuid-1");
  });

  it("어드민이 지정한 환자계정이 patient_user_id 로 저장된다", async () => {
    await POST(makeReq(adminFormBody()));
    expect(captured.insert.patient_user_id).toBe("patient-uuid-1234");
  });

  it("camelCase 본문도 동일하게 수용한다 (양방향 호환)", async () => {
    await POST(
      makeReq({
        inquiryId: 7,
        sessionType: "follow_up",
        scheduledAt: "2026-08-01T02:00:00.000Z",
        patientId: "p-uuid-9",
      })
    );
    expect(captured.insert.inquiry_id).toBe(7);
    expect(captured.insert.session_type).toBe("follow_up");
    expect(captured.insert.scheduled_at).toBe("2026-08-01T02:00:00.000Z");
    expect(captured.insert.patient_user_id).toBe("p-uuid-9");
  });

  it("inquiry 미선택 시 inquiry_id 는 null", async () => {
    await POST(makeReq(adminFormBody({ selected_inquiry_id: "" })));
    expect(captured.insert.inquiry_id).toBeNull();
  });

  it("session_type 누락 시 400", async () => {
    const res = await POST(makeReq(adminFormBody({ session_type: undefined })));
    expect(res.status).toBe(400);
  });
});
