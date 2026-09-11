/**
 * 암종 검색어 — 「암종을 추가하면 검색어도 같이」를 기계로 강제한다.
 *
 * 왜 기계로 재나 (2026-09-10 실측): 신장암(#60)·전립선암(#316)이 실제 환자로 들어와
 *   CANCER_TYPE_LABELS 에는 추가됐는데 **검색어는 아무도 안 넣었다.** 화면은 멀쩡히 돌아서
 *   아무 신호도 안 났다 — 사람이 눈으로 대조하지 않으면 영영 모르는 종류의 누락이다.
 *   그래서 라벨 목록을 기준으로 삼아, 비면 빨간불이 나게 묶는다.
 */
import { describe, it, expect } from "vitest";
import { CANCER_SEARCH_TERMS, ALL_CANCER_SEARCH_TERMS } from "./cancerSearchTerms";
import { CANCER_TYPE_LABELS } from "@/lib/khidi/medicalLabels";

// 'other'(기타)는 검색어를 만들 수 없는 칸이라 뺀다.
const REAL_TYPES = Object.keys(CANCER_TYPE_LABELS).filter((k) => k !== "other");

describe("암종 검색어", () => {
  it("라벨에 있는 암종은 «전부» 검색어를 갖는다 — 새 암종을 넣고 여기를 빠뜨리면 여기서 걸린다", () => {
    const missing = REAL_TYPES.filter((k) => !CANCER_SEARCH_TERMS[k]);
    expect(missing, `검색어가 없는 암종: ${missing.join(", ")}`).toEqual([]);
  });

  it("암종마다 러시아어·카자흐어가 최소 한 줄씩 있다 (빈 배열로 때우는 것 차단)", () => {
    for (const key of REAL_TYPES) {
      const t = CANCER_SEARCH_TERMS[key];
      expect(t.ru.length, `${key} 의 러시아어 검색어`).toBeGreaterThan(0);
      expect(t.kz.length, `${key} 의 카자흐어 검색어`).toBeGreaterThan(0);
    }
  });

  it("검색어에 「Корея(한국)」가 들어 있다 — 안 들어가면 전 세계 경쟁이라 우리가 못 뜬다", () => {
    for (const [key, t] of Object.entries(CANCER_SEARCH_TERMS)) {
      for (const phrase of t.ru) expect(phrase, `${key}: ${phrase}`).toMatch(/Корее/);
      for (const phrase of t.kz) expect(phrase, `${key}: ${phrase}`).toMatch(/Кореяда/);
    }
  });

  it("중복 없이 펴진다", () => {
    expect(new Set(ALL_CANCER_SEARCH_TERMS).size).toBe(ALL_CANCER_SEARCH_TERMS.length);
  });

  it("실제 환자가 왔던 암종(전립선·신장)이 빠져 있지 않다 — 이번 누락의 재발 표식", () => {
    expect(CANCER_SEARCH_TERMS.prostate.ru[0]).toContain("предстательной");
    expect(CANCER_SEARCH_TERMS.kidney.ru[0]).toContain("почки");
  });
});
