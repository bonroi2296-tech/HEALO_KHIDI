import { describe, it, expect } from "vitest";
import {
  CANCER_TYPES, STAGES, TREATMENT_STATES, TRAVEL_TIMING, PRIORITIES, PRIORITIES_LEGACY,
  optLabel, labelOf, stageLabel,
} from "./intakeLabels";
import { getI18nValues } from "@/lib/i18n";

const EDIT_LANGS = ["ko", "en", "ru", "kz", "zh", "ja"] as const;
const ARRAYS = { CANCER_TYPES, STAGES, TREATMENT_STATES, TRAVEL_TIMING, PRIORITIES, PRIORITIES_LEGACY };

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
      ["stomach", "liver", "lung", "breast", "thyroid", "colorectal", "pancreatic", "kidney", "other"]
    );
    expect((CANCER_TYPES.find((c) => c.value === "breast") as any).organ).toBe("breast");
    expect(TREATMENT_STATES.map((s) => s.value)).toContain("pre_surgery");
    expect(TRAVEL_TIMING.map((s) => s.value)).toContain("2weeks");
    expect(PRIORITIES.map((p) => p.value)).toContain("fast_start");
  });

  it("optLabel / labelOf 이 사전에서 라벨을 해석한다", () => {
    const breast = CANCER_TYPES.find((c) => c.value === "breast")!;
    // 2026-08-20: 「Грудь」(«가슴») 였던 것을 코디네이터 교정본 «Рак молочной железы»(유방암, 의학 표준)로
    // 되돌렸다. 구어체 신체 부위 이름이 암종 선택지에 나가고 있었다.
    expect(optLabel(breast, "ru")).toBe("Рак молочной железы");
    expect(optLabel(breast, "ko")).toBe("유방암");
    expect(labelOf(TREATMENT_STATES, "pre_surgery", "ko")).toBe("수술 전");
    // 목록에 없는 값은 원래 값 그대로(안전 폴백)
    expect(labelOf(PRIORITIES, "nonexistent", "ko")).toBe("nonexistent");
  });

  // 병기는 화면마다 저장값이 두 갈래다 — 문의폼 "I"~"IV", 비용계산기 "1"~"4".
  // 이 둘을 같은 사전으로 모아주는 게 stageLabel. 여기가 깨지면 화면에 날코드("III")가 다시 뜬다.
  it("stageLabel 이 «I~IV»·«1~4» 를 같은 라벨로 모아준다", () => {
    expect(STAGES.map((s) => s.value)).toEqual(["I", "II", "III", "IV"]); // DB 저장값 불변
    expect(stageLabel("III", "ko")).toBe("3기");
    expect(stageLabel("3", "ko")).toBe("3기"); // 비용계산기 저장값
    expect(stageLabel("iv", "en")).toBe("Stage IV"); // 대소문자 무관
    expect(stageLabel("III", "ru")).toBe("Стадия III");
    // 모르는 값·빈 값은 화면을 깨뜨리지 않는다
    expect(stageLabel("unknown", "ko")).toBe("unknown");
    expect(stageLabel(null, "ko")).toBe("");
    expect(stageLabel("", "ko")).toBe("");
  });
});
