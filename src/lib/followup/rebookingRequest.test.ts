import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/inquiry/followUps", () => ({ appendFollowUp: (raw: any, text: string) => [...(raw || []), { text }], BY_PATIENT_LINK: "환자(진행상황 링크)" }));
vi.mock("@/lib/notifications/inApp", () => ({ notifyStaffRebookingRequest: vi.fn(async () => {}) }));

import { buildRebookingRequestRow, isDuplicateRequest, REBOOKING_SOURCE_PATIENT, DUPLICATE_WINDOW_MS } from "./rebookingRequest";

describe("buildRebookingRequestRow — 환자 재진 요청 행", () => {
  it("희망 시점은 3일 뒤 10:00 KST(01:00 UTC), 상태는 pending, 출처는 patient_request", () => {
    const now = Date.UTC(2026, 8, 6, 12, 0, 0); // 2026-09-06 12:00Z = 21:00 KST
    const row = buildRebookingRequestRow({ inquiryId: 60, patientUserId: null, cancerType: "breast", note: " 통증이 심해졌어요 ", lang: "ru", nowMs: now });
    expect(row.status).toBe("pending");
    expect(row.cancer_type).toBe("breast");
    expect(row.next_action_at).toBe("2026-09-09T01:00:00.000Z");
    expect(row.schedule.source).toBe(REBOOKING_SOURCE_PATIENT);
    expect(row.schedule.reason).toBe("통증이 심해졌어요");
    expect(row.schedule.session_type).toBe("follow_up");
  });

  it("암종이 비면 NOT NULL 을 위해 unspecified, 메모가 비면 reason 은 null", () => {
    const row = buildRebookingRequestRow({ inquiryId: 1, patientUserId: "u1", cancerType: null, note: "", lang: "ko" });
    expect(row.cancer_type).toBe("unspecified");
    expect(row.schedule.reason).toBeNull();
    expect(row.patient_user_id).toBe("u1");
  });
});

describe("isDuplicateRequest — 연타·중복 클릭 방지", () => {
  const now = Date.now();
  it("6시간 안에 처리 안 된 환자 요청이 있으면 중복", () => {
    expect(isDuplicateRequest([{ status: "pending", schedule: { source: REBOOKING_SOURCE_PATIENT }, created_at: new Date(now - 60_000).toISOString() }], now)).toBe(true);
  });
  it("시스템 제안(source 다름)·처리된 요청·오래된 요청은 중복이 아니다", () => {
    expect(isDuplicateRequest([{ status: "pending", schedule: { source: "symptom" }, created_at: new Date(now - 60_000).toISOString() }], now)).toBe(false);
    expect(isDuplicateRequest([{ status: "confirmed", schedule: { source: REBOOKING_SOURCE_PATIENT }, created_at: new Date(now - 60_000).toISOString() }], now)).toBe(false);
    expect(isDuplicateRequest([{ status: "pending", schedule: { source: REBOOKING_SOURCE_PATIENT }, created_at: new Date(now - DUPLICATE_WINDOW_MS - 1).toISOString() }], now)).toBe(false);
  });
});
