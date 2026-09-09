import { describe, it, expect, beforeAll } from "vitest";
import { contactKey, RECENT_INQUIRY_WINDOW_HOURS } from "./contactKey";

/**
 * 이 시험이 지키는 것: 「같은 사람이 다시 접수했나」의 판정 기준.
 *
 * 2026-09-08 실사고에서 한 분이 25분 동안 네 번 접수했고, 같은 이메일인데도 매번
 * 새 건이 생겼다. 그 판정을 이 파일의 함수 하나가 맡는다 — 여기가 틀리면
 * 사람을 잘못 묶거나(더 위험) 아예 못 묶는다.
 */
beforeAll(() => {
  process.env.ENCRYPTION_KEY_V1 ??= "test-key-for-contact-key-0123456789";
});

describe("contactKey", () => {
  it("같은 주소면 언제 만들어도 같은 값이다", () => {
    expect(contactKey("a@b.com")).toBe(contactKey("a@b.com"));
  });

  it("앞뒤 공백과 대소문자는 같은 것으로 본다", () => {
    const base = contactKey("Anna@Example.COM");
    expect(contactKey("  anna@example.com  ")).toBe(base);
  });

  it("🛑 점·플러스는 «다른 사람»으로 남긴다 — 제공자마다 규칙이 달라 함부로 묶으면 안 된다", () => {
    expect(contactKey("a.b@gmail.com")).not.toBe(contactKey("ab@gmail.com"));
    expect(contactKey("a+tag@gmail.com")).not.toBe(contactKey("a@gmail.com"));
  });

  it("다른 주소는 다른 값이다", () => {
    expect(contactKey("a@b.com")).not.toBe(contactKey("c@d.com"));
  });

  it("이메일이 없거나 모양이 아니면 지문을 만들지 않는다(null)", () => {
    // null 이면 조회를 건너뛴다 — 빈 문자열로 뭉치면 «이메일 없는 사람»이 전부 한 명이 된다.
    for (const v of [null, undefined, "", "   ", "not-an-email"]) {
      expect(contactKey(v as string | null)).toBeNull();
    }
  });

  it("원래 주소가 값에 그대로 남지 않는다", () => {
    const k = contactKey("anna@example.com")!;
    expect(k).not.toContain("anna");
    expect(k).not.toContain("example.com");
    expect(k).toMatch(/^[0-9a-f]{64}$/);
  });

  it("합치는 시간 창은 하루다 — 몇 달 뒤 다시 연락하는 것은 새 건이어야 한다", () => {
    expect(RECENT_INQUIRY_WINDOW_HOURS).toBe(24);
  });
});
