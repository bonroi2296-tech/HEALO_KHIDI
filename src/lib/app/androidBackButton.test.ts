import { describe, it, expect, beforeEach } from "vitest";
import { handleBackPress, __resetBackButtonState } from "./androidBackButton";

/**
 * 「뒤로가기 한 번에 앱이 꺼지던 것」의 기계 검사.
 *
 * 2026-08-19 PO 제보: *"모바일에서 뒤로가기 누르면 뒤로가는게 아니고 앱이 꺼진다"*.
 * 진짜 원인은 네이티브 부품 누락(스토어 판에 `@capacitor/app` 이 없었다)이라 이 시험으로는
 * 못 잡는다 — 그건 `npm run sweep` 의 «앱» 칸이 본다.
 * 여기서 잠그는 건 «부품이 들어간 뒤의 동작»이다: **첫 화면에서 한 번 눌렀다고 꺼지면 안 된다.**
 */
function harness() {
  const log: string[] = [];
  let clock = 1_000_000;
  const actions = {
    goBack: () => log.push("goBack"),
    exitApp: () => log.push("exitApp"),
    now: () => clock,
  };
  return {
    log,
    press: (canGoBack: boolean) => handleBackPress(canGoBack, actions),
    tick: (ms: number) => {
      clock += ms;
    },
  };
}

describe("안드로이드 뒤로가기", () => {
  beforeEach(() => __resetBackButtonState());

  it("앞 화면이 있으면 되돌아간다 (앱을 끄지 않는다)", () => {
    const h = harness();
    h.press(true);
    expect(h.log).toEqual(["goBack"]);
  });

  it("첫 화면에서 «한 번»으로는 절대 꺼지지 않는다", () => {
    const h = harness();
    h.press(false);
    expect(h.log).toEqual([]);
  });

  it("2초 안에 한 번 더 누르면 그때 꺼진다", () => {
    const h = harness();
    h.press(false);
    h.tick(500);
    h.press(false);
    expect(h.log).toEqual(["exitApp"]);
  });

  it("2초가 지나면 대기가 풀려 다시 한 번으로는 안 꺼진다", () => {
    const h = harness();
    h.press(false);
    h.tick(2_500);
    h.press(false);
    expect(h.log).toEqual([]);
  });

  it("사이에 뒤로 이동이 끼면 종료 대기가 풀린다", () => {
    const h = harness();
    h.press(false); // 대기 걸림
    h.press(true); // 앞 화면으로 이동 → 대기 해제
    h.press(false); // 다시 첫 화면 — 여기서 꺼지면 안 된다
    expect(h.log).toEqual(["goBack"]);
  });
});
