/**
 * 공개 진행상황 화면이 이 함수에 기대는 3가지만 못박는다.
 * 버그였던 것: 화면이 저장값을 그대로 찍어 러시아어 화면에 "stomach"이 나왔다(67건 중 29건, 2026-08-04).
 */
import { describe, it, expect } from "vitest";
import { CANCER_TYPES } from "../inquiry/intakeLabels";
import { cancerTypeLabelL, icd10SuggestionFor, isDiagnosisIcdCode, startsWithEncounterCode, CANCER_TYPE_ICD10, CANCER_TYPE_LABELS, ICD10_PATTERN, normalizeCancerType } from "./medicalLabels";

describe("cancerTypeLabelL — 공개 진행상황 화면이 기대는 것", () => {
  it("영어 코드는 보는 사람 언어로 바뀐다", () => {
    expect(cancerTypeLabelL("stomach", "ru")).not.toBe("stomach");
    expect(cancerTypeLabelL("other", "ko")).toBe("기타");
  });

  it("자유입력(한글 등)은 원문 그대로 — 지어내지 않는다", () => {
    expect(cancerTypeLabelL("위암", "ru")).toBe("위암");
  });

  it("빈값이면 빈 문자열 — 화면이 그 칸을 통째로 숨길 수 있어야 한다", () => {
    expect(cancerTypeLabelL(null, "ko")).toBe("");
    expect(cancerTypeLabelL(undefined, "ko")).toBe("");
  });
});

describe("icd10SuggestionFor — 의뢰서 진단코드 추천", () => {
  it("추천 대상 암종은 모두 라벨 표에도 있어야 한다 (라벨 없는 추천이 뜨면 단추 글자가 빈다)", () => {
    for (const key of Object.keys(CANCER_TYPE_ICD10)) {
      expect(CANCER_TYPE_LABELS[key], `${key} 라벨 누락`).toBeTruthy();
    }
  });

  it("코드는 전부 ICD-10 악성신생물 형식(C + 두 자리)이다", () => {
    for (const [key, v] of Object.entries(CANCER_TYPE_ICD10)) {
      expect(v.code, `${key} 형식 이상`).toMatch(/^C\d{2}$/);
    }
  });

  it("「기타」에는 코드를 붙이지 않는다 — 틀린 코드를 권하게 된다", () => {
    expect(icd10SuggestionFor("other")).toBeNull();
  });

  it("모르는 값·빈값이면 추천하지 않는다", () => {
    expect(icd10SuggestionFor(null)).toBeNull();
    expect(icd10SuggestionFor("위암")).toBeNull();
  });

  it("위암은 C16 을 권한다 (WHO ICD-10 2019 판 조회로 확인한 값)", () => {
    expect(icd10SuggestionFor("stomach")?.code).toBe("C16");
  });
});

describe("ICD10_PATTERN — 코디가 손으로 넣는 값 거르기", () => {
  it("맞는 형식은 통과한다", () => {
    for (const ok of ["C16", "C18.2", "C50.911", "D05"]) {
      expect(ICD10_PATTERN.test(ok), ok).toBe(true);
    }
  });

  it("틀린 형식은 막는다 (자리수 부족·한글·주입 시도)", () => {
    for (const bad of ["abc", "C1", "위암", "C18.", "'; DROP TABLE inquiries;--", "U07"]) {
      expect(ICD10_PATTERN.test(bad), bad).toBe(false);
    }
  });

  it("추천 코드는 전부 이 형식을 통과한다", () => {
    for (const [key, v] of Object.entries(CANCER_TYPE_ICD10)) {
      expect(ICD10_PATTERN.test(v.code), key).toBe(true);
    }
  });
});

describe("normalizeCancerType — 자유 입력을 우리 키로 되돌리기", () => {
  it("키는 그대로 통과한다", () => {
    expect(normalizeCancerType("stomach")).toBe("stomach");
    expect(normalizeCancerType("  STOMACH  ")).toBe("stomach");
  });

  it("6개 언어 라벨이면 키로 되돌린다", () => {
    expect(normalizeCancerType("위암")).toBe("stomach");
    expect(normalizeCancerType("Рак желудка")).toBe("stomach");
    expect(normalizeCancerType("大腸がん")).toBe("colorectal");
  });

  it("⚠️ 짐작하지 않는다 — 정확히 안 맞으면 null (틀린 암종이 박히는 게 빈 칸보다 나쁘다)", () => {
    expect(normalizeCancerType("위암 의심")).toBeNull();
    expect(normalizeCancerType("stomach ca")).toBeNull();
    expect(normalizeCancerType("아무거나")).toBeNull();
    expect(normalizeCancerType("")).toBeNull();
    expect(normalizeCancerType(null)).toBeNull();
  });

  it("신장암도 목록에 있다 (실제 문의가 들어와 있었는데 빠져 있었다)", () => {
    expect(normalizeCancerType("kidney")).toBe("kidney");
    expect(cancerTypeLabelL("kidney", "ru")).toBe("Рак почки");
    expect(icd10SuggestionFor("kidney")?.code).toBe("C64");
  });
});

describe("두 암종 목록이 어긋나지 않는가", () => {
  // 왜: 환자가 고르는 목록(intakeLabels)에 kidney 가 있는데 코디가 보는 라벨 표에는 없어서
  // 화면에 "kidney" 가 영어 날것으로 떴다(2026-08-26). 한쪽만 늘리면 여기서 잡힌다.
  it("환자가 고를 수 있는 암종은 전부 코디 라벨 표에도 있어야 한다", () => {
    for (const t of CANCER_TYPES) {
      expect(CANCER_TYPE_LABELS[t.value], `${t.value} 가 코디 라벨 표에 없다`).toBeTruthy();
    }
  });
});

describe("isDiagnosisIcdCode — 검사 사유 코드(Z)를 진단코드 칸에 넣지 않는다", () => {
  // 2026-09-08 #316 실사고: 러시아 검사결과지 머리의 «МКБ-10: Z04» 를 판독기가 베껴 넣었다.
  it.each(["Z04", "Z03.8", "Z01", "Z12.11", "z04"])("검사·관찰 사유 코드는 거부: %s", (c) => {
    expect(isDiagnosisIcdCode(c)).toBe(false);
  });

  it.each(["C16", "C18.2", "C50.911", "C22", " c34 "])("진짜 진단코드는 통과: %s", (c) => {
    expect(isDiagnosisIcdCode(c)).toBe(true);
  });

  it("모양이 ICD-10 이 아니면 거부한다 — 판독기가 아무 문자열이나 줄 수 있다", () => {
    for (const bad of ["", null, undefined, "미상", "Рак желудка", "C1", "U07.1", "C16..2", "stage IV"]) {
      expect(isDiagnosisIcdCode(bad as any)).toBe(false);
    }
  });

  it("추천표의 값은 전부 진단코드다 — 우리가 권하는 코드가 걸러지면 안 된다", () => {
    for (const row of Object.values(CANCER_TYPE_ICD10)) expect(isDiagnosisIcdCode(row.code)).toBe(true);
  });
});

describe("startsWithEncounterCode — 진단명 칸에 들어온 «검사 사유»", () => {
  // #316 실측: diagnosisNameRaw 가 「Z04 Обследование и наблюдение с другими целями」였다.
  it.each([
    "Z04 Обследование и наблюдение с другими целями",
    "Z03.1 Наблюдение при подозрении на злокачественное новообразование",
    "  z12.5 Скрининг",
    "Z04",
  ])("검사 사유로 시작하면 거부: %s", (t) => {
    expect(startsWithEncounterCode(t)).toBe(true);
  });

  it.each([
    "C61 Злокачественное новообразование предстательной железы",
    "Рак желудка",
    "C61 … в анамнезе Z85.46",   // 진단명 «안»에 곁들여진 Z 코드까지 버리면 진단을 잃는다
    "", null, undefined,
  ])("진짜 진단명은 통과: %s", (t) => {
    expect(startsWithEncounterCode(t as any)).toBe(false);
  });
});
