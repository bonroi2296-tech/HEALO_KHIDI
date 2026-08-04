/**
 * 채팅·자막기록 «맨 아래 붙어 있기» 판정 가드.
 * 2026-07-29 PO: "채팅창 닫고 다시 켰을때는 스크롤이 맨 위로" · "지멋대로 춤을 춘다".
 */
import { describe, it, expect } from "vitest";
import { shouldFollow, nextStick, STICK_THRESHOLD_PX } from "./useStickToBottom";

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

// ── 2026-08-04 PO 제보 ④ «스크롤이 올라가서 다시 내려야 한다 · 쌓일수록 심해진다» ──
// 원인: 스크롤 이벤트는 «우리가 직접 내린 것»에도 불리는데, 그때 자리가 안 잡힌 값을 읽어
// 따라가기를 꺼버렸다. 한 번 꺼지면 사람이 손으로 바닥까지 내려야만 다시 켜졌다.
describe("nextStick — 따라가기를 «사람이 올렸을 때만» 끈다", () => {
  it("사람이 위로 올리고 바닥에서 멀어지면 끈다", () => {
    expect(nextStick(true, true, false)).toBe(false);
  });
  it("바닥에 닿으면 다시 켠다", () => {
    expect(nextStick(false, false, true)).toBe(true);
    expect(nextStick(false, true, true)).toBe(true);
  });
  it("⚠️ 사람이 안 올렸는데 바닥에서 멀어진 것(높이 출렁임)은 무시한다 — 이게 그 버그였다", () => {
    expect(nextStick(true, false, false)).toBe(true);
  });
  it("이미 꺼진 상태는 사람이 바닥에 닿기 전까진 그대로", () => {
    expect(nextStick(false, false, false)).toBe(false);
  });
});
