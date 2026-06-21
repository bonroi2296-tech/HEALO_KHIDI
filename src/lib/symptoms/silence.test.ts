import { describe, it, expect } from "vitest";
import { buildSilenceAlert, uniqueInquiryIds } from "./silence";

// 고정 기준 시각 (테스트 결정성)
const NOW = new Date("2026-06-21T00:00:00Z").getTime();
const daysAgo = (n: number) => new Date(NOW - n * 86400000);

describe("buildSilenceAlert", () => {
  it("마지막 입력이 없으면(null) 무시 — 처음부터 미사용 환자 전원 알림 폭주 방지", () => {
    expect(buildSilenceAlert({ inquiryId: 5 }, null, 3, NOW)).toBeNull();
  });

  it("식별자(patientId·inquiryId)가 둘 다 없으면 무시", () => {
    expect(buildSilenceAlert({}, daysAgo(10), 3, NOW)).toBeNull();
  });

  it("임계일 미만이면 무시", () => {
    expect(buildSilenceAlert({ inquiryId: 5 }, daysAgo(2), 3, NOW)).toBeNull();
  });

  it("임계일 이상이면 medium 알림 (inquiry_id 기준)", () => {
    const a = buildSilenceAlert({ inquiryId: 5 }, daysAgo(4), 3, NOW);
    expect(a).not.toBeNull();
    expect(a!.alert_type).toBe("silence_long");
    expect(a!.severity).toBe("medium");
    expect(a!.inquiry_id).toBe(5);
    expect(a!.patient_id).toBeNull();
    expect(a!.detected_by).toBe("rule");
    expect(a!.data.silence_days).toBe(4);
    expect(a!.data.threshold_days).toBe(3);
  });

  it("7일 이상이면 high", () => {
    const a = buildSilenceAlert({ inquiryId: 5 }, daysAgo(9), 3, NOW);
    expect(a!.severity).toBe("high");
    expect(a!.data.silence_days).toBe(9);
  });

  it("로그인 환자(patientId)면 patient_id 로 식별", () => {
    const a = buildSilenceAlert({ patientId: "uuid-1" }, daysAgo(5), 3, NOW);
    expect(a!.patient_id).toBe("uuid-1");
    expect(a!.inquiry_id).toBeNull();
  });

  it("경계값: 정확히 임계일이면 알림 발생", () => {
    expect(buildSilenceAlert({ inquiryId: 5 }, daysAgo(3), 3, NOW)).not.toBeNull();
  });
});

describe("uniqueInquiryIds", () => {
  it("중복 제거 + null 제외, 순서(최근 우선) 유지", () => {
    const out = uniqueInquiryIds([
      { inquiry_id: 7, updated_at: "c" },
      { inquiry_id: null, updated_at: "b" },
      { inquiry_id: 7, updated_at: "a" },
      { inquiry_id: 3, updated_at: "a" },
    ]);
    expect(out).toEqual([7, 3]);
  });

  it("빈 배열", () => {
    expect(uniqueInquiryIds([])).toEqual([]);
  });
});
