/**
 * 채팅·자막기록 «맨 아래 붙어 있기» 판정 가드.
 * 2026-07-29 PO: "채팅창 닫고 다시 켰을때는 스크롤이 맨 위로" · "지멋대로 춤을 춘다".
 */
import { describe, it, expect } from "vitest";
import { shouldFollow, STICK_THRESHOLD_PX } from "./useStickToBottom";

describe("shouldFollow", () => {
  it("바닥에 붙어 있으면 새 줄을 따라간다", () => {
    expect(shouldFollow({ scrollHeight: 1000, scrollTop: 600, clientHeight: 400 })).toBe(true);
  });

  it("한 줄 정도 올라간 것은 아직 «읽는 중»이 아니다 (따라간다)", () => {
    // 바닥에서 60px — 새 줄이 붙는 순간 잠깐 벌어지는 정도라 여기서 멈추면 오히려 안 따라간다
    expect(shouldFollow({ scrollHeight: 1000, scrollTop: 540, clientHeight: 400 })).toBe(true);
  });

  it("위로 올려 읽는 중이면 끌어내리지 않는다", () => {
    expect(shouldFollow({ scrollHeight: 2000, scrollTop: 200, clientHeight: 400 })).toBe(false);
  });

  it("경계값: 문턱 바로 밖은 «읽는 중»", () => {
    const box = { scrollHeight: 1000, scrollTop: 600 - STICK_THRESHOLD_PX, clientHeight: 400 };
    expect(shouldFollow(box)).toBe(false);
  });

  it("내용이 화면보다 짧으면(스크롤 없음) 항상 따라간다", () => {
    expect(shouldFollow({ scrollHeight: 300, scrollTop: 0, clientHeight: 400 })).toBe(true);
  });

  it("아직 못 잰 상태(null)면 따라간다 — 첫 렌더에서 위에 머물지 않게", () => {
    expect(shouldFollow(null as any)).toBe(true);
  });
});
