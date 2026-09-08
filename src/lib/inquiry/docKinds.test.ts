import { describe, it, expect } from "vitest";
import { DOC_KINDS, NEEDED_KINDS, isKnownKind, kindLabel, missingKinds, docValueBeats } from "./docKinds";

describe("서류 종류 판별", () => {
  it("아무것도 안 올리면 대학병원이 요구하는 것 전부가 「아직 없는 것」", () => {
    expect(missingKinds([])).toEqual(NEEDED_KINDS);
    expect(NEEDED_KINDS.length).toBeGreaterThan(0);
  });

  it("올린 종류는 「아직 없는 것」에서 빠진다", () => {
    const left = missingKinds([{ kind: "pathology" }, { kind: "blood" }]);
    expect(left).not.toContain("pathology");
    expect(left).not.toContain("blood");
    expect(left).toContain("discharge");
  });

  it("판별 못 한 파일은 아무것도 채워주지 않는다 — 「있다」로 세면 안 된다", () => {
    expect(missingKinds([{ kind: "unknown" }])).toEqual(NEEDED_KINDS);
    expect(missingKinds([{ kind: null }])).toEqual(NEEDED_KINDS);
  });

  it("AI 가 목록에 없는 종류를 지어내면 걸러진다", () => {
    expect(isKnownKind("pathology")).toBe(true);
    expect(isKnownKind("초음파_아무말")).toBe(false);
    expect(isKnownKind(undefined)).toBe(false);
  });

  it("모든 종류에 한국어·영어·러시아어 이름이 있다", () => {
    for (const k of DOC_KINDS) {
      for (const l of ["ko", "en", "ru"]) {
        expect(kindLabel(k.value, l), `${k.value} / ${l}`).toBeTruthy();
      }
    }
  });

  it("사용자가 고른 값도 AI 판독과 똑같이 셈에 들어간다", () => {
    // 「제가 판독한 게 틀렸다면 직접 수정」 — 고친 값이 반영 안 되면 그 기능이 무의미하다.
    const before = missingKinds([{ kind: "unknown" }]);
    const after = missingKinds([{ kind: "discharge", corrected: true }]);
    expect(before).toContain("discharge");
    expect(after).not.toContain("discharge");
  });
});

describe("docValueBeats — 두 서류가 같은 칸을 다르게 말할 때", () => {
  // 2026-09-08 #316 실사고 재현: 조직검사 사진(180KB)이 먼저 끝나 C61 을 넣었는데,
  // 뒤늦게 끝난 MRI 판독지 PDF(4.1MB)가 Z04(검사를 받은 사유)로 덮어썼다.
  it("영상 판독지는 조직검사의 진단을 덮지 못한다", () => {
    expect(docValueBeats("icdCode", "imaging_report", "pathology")).toBe(false);
    expect(docValueBeats("diagnosisNameRaw", "imaging_report", "pathology")).toBe(false);
    expect(docValueBeats("stage", "imaging_report", "pathology")).toBe(false);
    expect(docValueBeats("diagnosisDate", "imaging_report", "pathology")).toBe(false);
  });

  it("조직검사는 영상 판독지를 덮는다 — 순서가 반대여도 결과는 같아야 한다", () => {
    expect(docValueBeats("icdCode", "pathology", "imaging_report")).toBe(true);
  });

  it("퇴원요약·수술기록은 영상보다 무겁고 조직검사보다 가볍다", () => {
    expect(docValueBeats("icdCode", "discharge", "imaging_report")).toBe(true);
    expect(docValueBeats("icdCode", "discharge", "pathology")).toBe(false);
    expect(docValueBeats("icdCode", "surgery_record", "imaging_report")).toBe(true);
    expect(docValueBeats("icdCode", "imaging_report", "surgery_record")).toBe(false);
  });

  it("신원의 정본은 여권이다 — 병원 기록의 표기가 여권을 덮으면 등록이 거부된다", () => {
    expect(docValueBeats("lastName", "discharge", "passport")).toBe(false);
    expect(docValueBeats("birthDate", "imaging_report", "passport")).toBe(false);
    expect(docValueBeats("passportNo", "passport", "discharge")).toBe(true);
  });

  it("같은 종류끼리는 나중 것이 이긴다 — 최신 서류가 반영돼야 한다", () => {
    expect(docValueBeats("icdCode", "pathology", "pathology")).toBe(true);
    expect(docValueBeats("lastName", "passport", "passport")).toBe(true);
  });

  it("순위를 안 두는 칸은 예전대로 나중 것이 이긴다", () => {
    expect(docValueBeats("chiefComplaint", "imaging_report", "pathology")).toBe(true);
    expect(docValueBeats("medications", "other", "discharge")).toBe(true);
  });

  it("종류를 모르면(판별 실패·null) 진단 칸을 덮지 않는다", () => {
    expect(docValueBeats("icdCode", null, "pathology")).toBe(false);
    expect(docValueBeats("icdCode", "unknown", "discharge")).toBe(false);
    // 반대로 «채워진 쪽»의 종류를 모르면 새 값이 들어갈 수 있어야 한다
    expect(docValueBeats("icdCode", "imaging_report", null)).toBe(true);
  });
});
