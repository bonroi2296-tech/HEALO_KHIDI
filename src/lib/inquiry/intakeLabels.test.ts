import { describe, it, expect } from "vitest";
import {
  CANCER_TYPES, TREATMENT_STATES, TRAVEL_TIMING, PRIORITIES, PRIORITIES_LEGACY,
  optLabel, labelOf,
} from "./intakeLabels";
import { getI18nValues } from "@/lib/i18n";

const EDIT_LANGS = ["ko", "en", "ru", "kz", "zh", "ja"] as const;
const ARRAYS = { CANCER_TYPES, TREATMENT_STATES, TRAVEL_TIMING, PRIORITIES, PRIORITIES_LEGACY };

describe("인테이크 선택지 라벨 이관 (2026-07-27) — 편집기에서 잡히는지", () => {
  // 왜: PO가 문의폼의 암종 버튼(«Грудь» 등)이 편집기에 안 잡힘을 지적 → 중앙 사전(intakeLabels.*)으로 이관.
  // 이 키들이 사라지거나 언어가 빠지면 그 선택지가 편집기 밖으로 다시 나가고, 화면엔 날키가 뜬다.
  it("모든 옵션 항목이 labelKey 를 갖고, 그 키가 6개어로 사전에 있다", () => {
    for (const [name, arr] of Object.entries(ARRAYS)) {
      for (const item of arr as Array<{ value: string; labelKey?: string }>) {
        expect(item.labelKey, `${name} ${item.value}: labelKey 없음`).toBeTruthy();
        const v = getI18nValues(item.labelKey!);
        expect(v, `${item.labelKey} 사전에 없음`).not.toBeNull();
        for (const l of EDIT_LANGS) expect((v as any)[l], `${item.labelKey}.${l} 빔`).toBeTruthy();
      }
    }
  });

  it("value·organ 코드(DB 저장값)는 그대로다 — 저장 흐름 불변", () => {
    expect(CANCER_TYPES.map((c) => c.value)).toEqual(
      ["stomach", "liver", "lung", "breast", "thyroid", "colorectal", "pancreatic", "other"]
    );
    expect((CANCER_TYPES.find((c) => c.value === "breast") as any).organ).toBe("breast");
    expect(TREATMENT_STATES.map((s) => s.value)).toContain("pre_surgery");
    expect(TRAVEL_TIMING.map((s) => s.value)).toContain("2weeks");
    expect(PRIORITIES.map((p) => p.value)).toContain("fast_start");
  });

  it("optLabel / labelOf 이 사전에서 라벨을 해석한다", () => {
    const breast = CANCER_TYPES.find((c) => c.value === "breast")!;
    expect(optLabel(breast, "ru")).toBe("Грудь");
    expect(optLabel(breast, "ko")).toBe("유방암");
    expect(labelOf(TREATMENT_STATES, "pre_surgery", "ko")).toBe("수술 전");
    // 목록에 없는 값은 원래 값 그대로(안전 폴백)
    expect(labelOf(PRIORITIES, "nonexistent", "ko")).toBe("nonexistent");
  });
});
