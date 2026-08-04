/**
 * 공개 진행상황 화면은 단계값이 비었을 때 「문의·의뢰 접수」로 되돌아가 그린다
 * (app/api/inquiries/claim/route.ts 의 `inq.case_status || "intake"`).
 *
 * 버그였던 것: 접수 코드도 DB 기본값도 case_status 를 안 채워서, 링크를 받은 환자 10명 중 9명이
 * 「미지정」 + 텅 빈 막대 + 안내 없음을 봤다(2026-08-04 실측: 최근 30일 38건 중 34건).
 *
 * 여기서 지키는 것은 그 되돌림이 **6개 언어 모두에서 실제로 화면을 채우는가**다.
 * 이 셋 중 하나라도 비면 화면이 다시 백지가 된다.
 */
import { describe, it, expect } from "vitest";
import { caseStatusLabelL, caseStatusOrder } from "./caseStatus";
import { nextStepGuide } from "./nextStepGuide";

const LANGS = ["ko", "en", "ru", "kz", "zh", "ja"];

describe("단계값이 비었을 때 되돌아가는 「intake」", () => {
  it.each(LANGS)("%s — 단계 이름이 비어있지 않다", (lang) => {
    expect(caseStatusLabelL("intake", lang)).toBeTruthy();
  });

  it.each(LANGS)("%s — 다음 단계 안내가 비어있지 않다", (lang) => {
    expect(nextStepGuide("intake", lang)).toBeTruthy();
  });

  it("막대가 첫 칸 이상에 선다 — 0이면 텅 빈 막대로 보인다", () => {
    expect(caseStatusOrder("intake")).toBeGreaterThanOrEqual(1);
  });
});
