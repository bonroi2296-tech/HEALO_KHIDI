import { describe, it, expect } from "vitest";
import {
  OPINION_ROSTER,
  OPINION_OTHER_KEY,
  OPINION_OTHER_LABEL,
  rosterName,
  isValidOpinionDoctorKey,
} from "./roster";

describe("opinion roster", () => {
  it("명단 key → 이름 (원장 4분 + 협진 대학병원 2곳)", () => {
    expect(rosterName("hwang_ijun")).toBe("황이준 원장");
    expect(rosterName("kang_juan")).toBe("강주안 원장");
    expect(rosterName("ewha_seoul")).toBe("이대서울병원");
    expect(rosterName("ewha_mokdong")).toBe("이대목동병원");
    expect(OPINION_ROSTER).toHaveLength(6);
  });

  it("'other' → 그 외 의료진 라벨", () => {
    expect(rosterName(OPINION_OTHER_KEY)).toBe(OPINION_OTHER_LABEL);
  });

  it("미상 key → null (라벨 없음)", () => {
    expect(rosterName("nope")).toBeNull();
    expect(rosterName(null)).toBeNull();
    expect(rosterName(undefined)).toBeNull();
  });

  it("제출 검증: 명단에 있는 것 + 'other'만 허용, 임의값 차단", () => {
    expect(isValidOpinionDoctorKey("yoo_hyeongjin")).toBe(true);
    expect(isValidOpinionDoctorKey("ewha_seoul")).toBe(true);
    expect(isValidOpinionDoctorKey(OPINION_OTHER_KEY)).toBe(true);
    expect(isValidOpinionDoctorKey("hacker")).toBe(false);
    expect(isValidOpinionDoctorKey("")).toBe(false);
    expect(isValidOpinionDoctorKey(null)).toBe(false);
    expect(isValidOpinionDoctorKey(123)).toBe(false);
  });
});
