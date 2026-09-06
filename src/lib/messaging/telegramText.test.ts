/**
 * 계약 테스트 — 텔레그램 발신 텍스트 유틸
 *
 * 실기기(2026-07-23, PO): AI 답변의 **굵게** 별표가 텔레그램 말풍선에 기호 그대로 노출.
 * 발신 직전 마크다운을 평문으로 벗기는 계약을 잠근다.
 */

import { describe, it, expect } from "vitest";
import { stripMarkdownForTelegram, splitTelegramText, TG_MAX_LEN } from "./telegramText";

describe("stripMarkdownForTelegram", () => {
  it("실기기에서 나온 실제 답변 형태: **지점명** 별표 제거 (2026-07-23 재현)", () => {
    const raw =
      "면력한방병원은 총 3개 지점이 있습니다.\n\n1. **강서점**: 서울특별시 강서구 마곡중앙6로 93\n2. **광명점**: 경기도 광명시 철산로 10";
    const out = stripMarkdownForTelegram(raw);
    expect(out).not.toContain("**");
    expect(out).toContain("1. 강서점: 서울특별시 강서구 마곡중앙6로 93");
  });

  it("`코드`·### 제목·__굵게__·'* ' 불릿도 평문화", () => {
    const out = stripMarkdownForTelegram("### 안내\n__중요__ `비자` 관련:\n* 여권\n* 진단서");
    expect(out).toBe("안내\n중요 비자 관련:\n• 여권\n• 진단서");
  });

  it("마크다운이 아닌 문장(수식·별표 단독·하이픈 불릿)은 건드리지 않는다", () => {
    const plain = "비용은 3 * 4 만원 수준이며\n- 여권\n- 진단서 (별도 문의 *)";
    expect(stripMarkdownForTelegram(plain)).toBe(plain);
  });

  it("러시아어·카자흐어 본문에서도 안전", () => {
    const ru = "**Immune Hospital** — 3 филиала";
    expect(stripMarkdownForTelegram(ru)).toBe("Immune Hospital — 3 филиала");
  });
});

describe("splitTelegramText", () => {
  it("4096자 이하는 그대로 1조각", () => {
    expect(splitTelegramText("hello")).toEqual(["hello"]);
  });

  it("초과 시 줄 경계 우선으로 분할하고 내용을 잃지 않는다", () => {
    const line = "가".repeat(1000);
    const text = [line, line, line, line, line].join("\n");
    const parts = splitTelegramText(text);
    expect(parts.length).toBeGreaterThan(1);
    for (const p of parts) expect(p.length).toBeLessThanOrEqual(TG_MAX_LEN);
    // 공백을 제외한 내용이 한 글자도 유실되지 않아야 한다(분할 경계의 trim 만 허용)
    expect(parts.join("").replace(/\s/g, "")).toBe(text.replace(/\s/g, ""));
  });
});
