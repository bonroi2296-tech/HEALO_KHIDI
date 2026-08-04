import { describe, it, expect } from "vitest";
import {
  checkFacilitationFeeCap,
  resolveFeeCap,
  FEE_CAP_BY_GRADE,
  UNKNOWN_GRADE_CAP,
} from "./facilitationFeeCap";

/**
 * 유치수수료 법정 상한 검사 — 시험 목록
 *
 * 이 검사가 지키는 것은 «등록 취소»다(법 제24조제1항제6호). PO 가 상한을 꽉 채워 받기로 해서
 * 여유가 0이므로, «경계에서 어떻게 동작하는가»가 이 시험의 핵심이다.
 */

const item = (krw: number, payer?: "patient" | "hospital") => ({ label: "x", krw, payer });

describe("resolveFeeCap — 종별 → 상한", () => {
  it("종별을 알면 그 상한을 쓴다", () => {
    expect(resolveFeeCap("tertiary").cap).toBe(0.15);
    expect(resolveFeeCap("general").cap).toBe(0.2);
    expect(resolveFeeCap("hospital").cap).toBe(0.2);
    expect(resolveFeeCap("clinic").cap).toBe(0.3);
  });

  it("모르면(NULL·오타·빈값) 가장 엄격한 상한을 쓴다 — 틀리는 방향이 「법을 넘는다」면 안 된다", () => {
    for (const bad of [null, undefined, "", "상급종합", "TERTIARY", 15, {}]) {
      const r = resolveFeeCap(bad);
      expect(r.gradeKnown).toBe(false);
      expect(r.cap).toBe(UNKNOWN_GRADE_CAP);
      expect(r.cap).toBe(Math.min(...Object.values(FEE_CAP_BY_GRADE)));
    }
  });
});

describe("checkFacilitationFeeCap — 분모는 「환자 부담」이다", () => {
  it("수수료를 분모에 넣지 않는다 (넣으면 초과를 눈감는다)", () => {
    // 병원(20%) · 진료비 1,000만 · 수수료 250만
    //   올바른 계산: 250/1000 = 25% → 초과
    //   틀린 계산(분모에 수수료 포함): 250/1250 = 20% → 통과해버림
    const r = checkFacilitationFeeCap(
      [item(10_000_000, "patient"), item(2_500_000, "hospital")],
      "hospital"
    );
    expect(r.patientTotalKrw).toBe(10_000_000);
    expect(r.facilitationFeeKrw).toBe(2_500_000);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("over_cap");
  });

  it("payer 가 없거나 이상하면 환자 부담으로 본다 (견적서 PDF·환자 화면과 같은 식)", () => {
    const r = checkFacilitationFeeCap(
      [{ krw: 10_000_000 }, { krw: 500_000, payer: "" }, item(2_000_000, "hospital")],
      "hospital"
    );
    expect(r.patientTotalKrw).toBe(10_500_000);
    expect(r.facilitationFeeKrw).toBe(2_000_000);
    expect(r.ok).toBe(true);
  });
});

describe("경계 — 「딱 상한까지」가 목표라 1원이 갈린다", () => {
  it("정확히 상한이면 통과", () => {
    const r = checkFacilitationFeeCap(
      [item(10_000_000, "patient"), item(2_000_000, "hospital")],
      "hospital" // 20%
    );
    expect(r.maxAllowedKrw).toBe(2_000_000);
    expect(r.ok).toBe(true);
  });

  it("1원 넘으면 차단", () => {
    const r = checkFacilitationFeeCap(
      [item(10_000_000, "patient"), item(2_000_001, "hospital")],
      "hospital"
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("over_cap");
  });

  it("나누어떨어지지 않을 때 «올림»이 아니라 «내림»으로 상한을 잡는다", () => {
    // 진료비 3,333,333 × 20% = 666,666.6 → 허용 상한은 666,666 (666,667 이면 20% 초과)
    const r = checkFacilitationFeeCap(
      [item(3_333_333, "patient"), item(666_667, "hospital")],
      "hospital"
    );
    expect(r.maxAllowedKrw).toBe(666_666);
    expect(r.ok).toBe(false);
  });
});

describe("빠져나갈 구멍 막기", () => {
  it("수수료만 있고 진료비가 0이면 통과시키지 않는다 (비율이 무한대)", () => {
    const r = checkFacilitationFeeCap([item(3_000_000, "hospital")], "hospital");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("no_patient_total");
  });

  it("수수료 항목이 아예 없으면 통과 (검사할 대상이 없다)", () => {
    const r = checkFacilitationFeeCap([item(10_000_000, "patient")], "hospital");
    expect(r.ok).toBe(true);
    expect(r.facilitationFeeKrw).toBe(0);
  });

  it("병원 부담 항목이 여러 줄로 쪼개져 있어도 합쳐서 본다", () => {
    // 한 줄씩 보면 각각 상한 이내지만 합치면 초과 — 쪼개기로 못 빠져나가야 한다.
    const r = checkFacilitationFeeCap(
      [
        item(10_000_000, "patient"),
        item(1_500_000, "hospital"),
        item(1_000_000, "hospital"),
      ],
      "hospital"
    );
    expect(r.facilitationFeeKrw).toBe(2_500_000);
    expect(r.ok).toBe(false);
  });

  it("종별 미확인이면 20% 짜리도 15% 로 막힌다 (안전한 방향)", () => {
    const items = [item(10_000_000, "patient"), item(1_800_000, "hospital")];
    expect(checkFacilitationFeeCap(items, "hospital").ok).toBe(true); // 20% 이면 통과
    expect(checkFacilitationFeeCap(items, null).ok).toBe(false); // 모르면 15% 로 차단
  });

  it("숫자가 아닌 값·빈 값은 0으로 본다 (NaN 이 비율을 오염시키지 않게)", () => {
    const r = checkFacilitationFeeCap(
      [{ krw: "10000000" as any }, { krw: null, payer: "hospital" }, { krw: "abc" as any, payer: "hospital" }],
      "hospital"
    );
    expect(r.patientTotalKrw).toBe(10_000_000);
    expect(r.facilitationFeeKrw).toBe(0);
    expect(r.ok).toBe(true);
  });

  it("항목 자체가 없거나 배열이 아니면 통과 (저장 전 단계)", () => {
    expect(checkFacilitationFeeCap(null, "hospital").ok).toBe(true);
    expect(checkFacilitationFeeCap(undefined, null).ok).toBe(true);
  });
});
