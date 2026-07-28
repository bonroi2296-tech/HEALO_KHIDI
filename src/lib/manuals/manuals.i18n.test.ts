/**
 * 설명서 번역 드리프트 가드 (2026-07-28 신설).
 *
 * 왜: 코디 설명서에 「저장 전 확인」·「문구 중복」을 새로 설명해 넣으면서 **한국어만 고치고
 * en·ru 번역본을 그대로 뒀다**. 코디(어셀)는 화면 언어를 러시아어/영어로 볼 수 있어서
 * 새 기능을 설명 안 받는 상태가 될 뻔했다(PO가 "설명서에 들어갔지?" 라고 물어 발견).
 * → 코디가 실제로 보는 3개 언어에 핵심 기능 설명이 다 있는지 기계가 본다.
 *
 * 문구를 바꿔서 이 테스트가 깨지면 = 번역본도 같이 고치라는 신호다(끄지 말 것).
 */
import { describe, it, expect } from "vitest";
import { MANUALS, getManual } from "./index";

const 핵심표현 = [
  { 기능: "저장 전 확인", ko: "무엇으로 바꾸는지", en: "Save as is", ru: "Сохранить как есть" },
  { 기능: "문구 중복 경고", ko: "문구 중복", en: "Duplicate text", ru: "Дубликат текста" },
  { 기능: "변경 이력", ko: "변경 이력", en: "Change history", ru: "История изменений" },
];

describe("코디 설명서 — 번역본이 한국어와 같은 기능을 설명한다", () => {
  for (const row of 핵심표현) {
    it(`${row.기능}: ko·en·ru 모두 설명한다`, () => {
      for (const lang of ["ko", "en", "ru"] as const) {
        const text = JSON.stringify(getManual("coordinator", lang));
        expect(text, `${lang} 설명서에 「${row.기능}」 설명 없음`).toContain((row as any)[lang]);
      }
    });
  }
});

describe("설명서 기본 정합성", () => {
  it("모든 role 에 제목과 갱신일(YYYY-MM-DD)이 있다", () => {
    for (const [role, m] of Object.entries(MANUALS as any)) {
      expect((m as any).title, role).toBeTruthy();
      expect((m as any).updated, role).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
