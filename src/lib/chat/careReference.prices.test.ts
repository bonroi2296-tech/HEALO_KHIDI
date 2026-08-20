/**
 * AI 안내자료(careReference)의 달러 금액이 원화 정본과 어긋나지 않는지 대조한다.
 *
 * 왜 필요한가: 2026-08-20 에 같은 가격이 두 곳에 생겼다.
 *   · 원화 정본 = `@/lib/costs/*` — 환자 견적 화면·코디 견적서가 본다
 *   · 달러 표기 = careReference — AI 상담이 본다
 * 대학병원 수술 범위(A)는 자료에서 만들어내므로 어긋날 수 없다.
 * 면력 치료·검진(C·D)은 달러가 «문자열»이라 한쪽만 고치면 조용히 어긋난다.
 *
 * ⚠️ 짝을 «명시»한다. 본문에서 달러를 긁어 자동 대조하면 범위 표기($22–67)나
 *    안내자료에만 있는 값($8,900 실제 사례)까지 걸려 헛걸림이 난다(2026-08-20 실측).
 *    여기 적힌 항목만 재고, 안내자료가 개별 금액으로 적지 않는 항목은 애초에 넣지 않는다.
 */
import { describe, it, expect } from "vitest";
import { CARE_REFERENCE } from "./careReference";
import { IMMUNE_CLINIC_PRICES } from "@/lib/costs/immuneClinicPrices";
import { overallRange, toUsd, CANCER_ORDER, CANCER_EN } from "@/lib/costs/surgeryRanges";

const USD_RATE = 1350;
/** 안내자료의 달러는 보기 좋은 자리로 반올림돼 있다. 3% 안이면 같은 값으로 본다. */
const TOLERANCE = 0.03;

/** 안내자료가 «개별 금액»으로 적는 항목만. [가격표 코드, 안내자료에 적힌 달러] */
const PAIRS: [string, number][] = [
  ["hyperthermia", 185],
  ["hyperthermia35", 260],
  ["mistletoe", 75],
  ["thymosin", 155],
  ["immucothel", 310],
  ["immuncell", 3700],
  ["stem100", 740],
  ["stem200", 1480],
  ["customherb", 370],
  ["sansam", 75],
  ["nk", 75],
  ["room_rehab", 150],
  ["room_vip", 520],
  ["screen_basic", 330],
  ["screen_premium", 730],
];

function krwOf(code: string): number | null {
  for (const g of IMMUNE_CLINIC_PRICES) {
    const it = g.items.find((x) => x.code === code);
    if (it) return it.krw;
  }
  return null;
}

describe("AI 안내자료의 금액이 원화 정본과 맞는가", () => {
  it("대학병원 수술 범위(A)는 자료에서 만들어져 글자까지 일치한다", () => {
    for (const key of CANCER_ORDER) {
      const r = overallRange(key);
      expect(r, `${key} 범위가 없다`).toBeTruthy();
      const line = `- ${CANCER_EN[key]}: $${toUsd(r!.minKrw).toLocaleString("en-US")}`;
      expect(CARE_REFERENCE, `${key} 줄이 안내자료에 없다`).toContain(line);
    }
  });

  it("면력 치료·검진(C·D)의 달러가 원화 정본과 3% 안에서 맞는다", () => {
    const 어긋난것: string[] = [];
    for (const [code, 적힌달러] of PAIRS) {
      const krw = krwOf(code);
      if (krw == null) { 어긋난것.push(`가격표에 ${code} 가 없다`); continue; }
      const 기대 = krw / USD_RATE;
      if (Math.abs(적힌달러 - 기대) / 기대 > TOLERANCE) {
        어긋난것.push(`${code}: 원화 ${krw.toLocaleString("ko-KR")}원(≈$${Math.round(기대)}) 인데 안내자료엔 $${적힌달러}`);
      }
    }
    expect(어긋난것, `원화를 고쳤으면 careReference 의 달러도 같이 고쳐라:\n${어긋난것.join("\n")}`).toEqual([]);
  });

  it("짝지은 달러가 안내자료 본문에 실제로 적혀 있다", () => {
    const 없는것 = PAIRS
      .filter(([, d]) => !CARE_REFERENCE.includes(`$${d.toLocaleString("en-US")}`))
      .map(([code, d]) => `${code} → $${d} 가 본문에 없다`);
    expect(없는것, `안내자료 문구가 바뀌었다. 이 시험의 PAIRS 도 같이 고쳐라:\n${없는것.join("\n")}`).toEqual([]);
  });
});
