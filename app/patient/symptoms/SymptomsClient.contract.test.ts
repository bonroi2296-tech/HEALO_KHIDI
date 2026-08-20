/**
 * 환자 증상 화면 ↔ 분석 결과 «키 이름» 계약 검사.
 *
 * 왜 있나(2026-08-20 실측 사고): 서버(analyzeSymptoms)는 riskScore·urgencyLevel·
 * recommendedAction 을 주는데 화면은 risk_score·urgency_level·recommended_action 을 읽고 있었다.
 * 값이 통째로 undefined 로 떨어져
 *   - 위험도 95% 가 «0%» 로,
 *   - 긴급도 «응급» 이 «가장 낮음» 으로,
 *   - 응급 상황인데 국가별 응급번호 카드가 «아예 안 뜨는»
 * 상태였다. 빌드도 타입검사도 통과한다(jsx + strict:false). 사람 눈으로만 잡히던 것을 기계로 막는다.
 *
 * 검사 방법: 화면이 참조하는 result.<키> 를 전부 뽑아 SymptomAnalysis 가 실제로 돌려주는
 * 키 집합과 대조한다. 화면이 없는 키를 읽기 시작하면 여기서 먼저 깨진다.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// src/lib/followup/symptomAnalyzer.ts 의 SymptomAnalysis 와 같아야 한다.
const ANALYSIS_KEYS = new Set([
  "riskScore",
  "urgencyLevel",
  "assessment",
  "recommendedAction",
  "flaggedSymptoms",
  "requiresHumanReview",
]);

describe("환자 증상 화면 — 분석 결과 키 계약", () => {
  const src = fs.readFileSync(
    path.join(process.cwd(), "app/patient/symptoms/SymptomsClient.jsx"),
    "utf8"
  );

  it("화면이 읽는 result.<키> 는 전부 분석 결과가 실제로 주는 키다", () => {
    const used = [...src.matchAll(/\bresult\.([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1]);
    expect(used.length).toBeGreaterThan(0); // 참조가 0개면 정규식이 헛돈 것이다
    const unknown = [...new Set(used)].filter((k) => !ANALYSIS_KEYS.has(k));
    expect(unknown).toEqual([]);
  });

  it("응급 분기는 recommendedAction 의 실제 값('emergency_refer')과 비교한다", () => {
    // 'emergency' 로 비교하면 응급 환자에게 응급번호 카드가 안 뜬다(위 사고의 일부).
    expect(src).toContain("result.recommendedAction === 'emergency_refer'");
    expect(src).not.toContain("result.recommendedAction === 'emergency'");
  });
});
