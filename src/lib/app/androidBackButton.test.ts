import { describe, it, expect, beforeEach } from "vitest";
import { handleBackPress, __resetBackButtonState } from "./androidBackButton";

/**
 * 「뒤로가기 한 번에 앱이 꺼지던 것」의 기계 검사.
 *
 * 2026-08-19 PO 제보: *"모바일에서 뒤로가기 누르면 뒤로가는게 아니고 앱이 꺼진다"*.
 * 진짜 원인은 네이티브 부품 누락(스토어 판에 `@capacitor/app` 이 없었다)이라 이 시험으로는
 * 못 잡는다 — 그건 `npm run sweep` 의 «앱» 칸이 본다.
 * 여기서 잠그는 건 «부품이 들어간 뒤의 동작»이다: **첫 화면에서 한 번 눌렀다고 꺼지면 안 된다.**
 *
 * 안내(화면 알약)는 주입해서 잰다 — 시험 환경이 노드(화면 없음)라 실제 DOM 을 안 그린다.
 */
function harness() {
  const log: string[] = [];
  let clock = 1_000_000;
  const actions = {
    goBack: () => log.push("goBack"),
    exitApp: () => log.push("exitApp"),
    showHint: () => log.push("안내표시"),
    hideHint: () => log.push("안내지움"),
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
    expect(h.log).toEqual(["안내지움", "goBack"]);
  });

  it("첫 화면에서 «한 번»으로는 절대 꺼지지 않는다 — 안내만 뜬다", () => {
    const h = harness();
    h.press(false);
    expect(h.log).toEqual(["안내표시"]);
  });

  it("2초 안에 한 번 더 누르면 그때 꺼진다", () => {
    const h = harness();
    h.press(false);
    h.tick(500);
    h.press(false);
    expect(h.log).toEqual(["안내표시", "안내지움", "exitApp"]);
  });

  it("2초가 지나면 대기가 풀려 다시 한 번으로는 안 꺼진다", () => {
    const h = harness();
    h.press(false);
    h.tick(2_500);
    h.press(false);
    expect(h.log).toEqual(["안내표시", "안내표시"]);
  });

  it("딱 2초에는 «안내가 사라진 뒤»라 안 꺼진다 (경계)", () => {
    const h = harness();
    h.press(false);
    h.tick(2_000); // 안내를 지우는 타이머와 같은 시각
    h.press(false);
    expect(h.log).toEqual(["안내표시", "안내표시"]);
  });

  it("사이에 뒤로 이동이 끼면 종료 대기가 풀리고 안내도 걷힌다", () => {
    const h = harness();
    h.press(false); // 대기 걸림 + 안내
    h.press(true); // 앞 화면으로 이동 → 대기 해제 + 안내 지움
    h.press(false); // 다시 첫 화면 — 여기서 꺼지면 안 된다
    expect(h.log).toEqual(["안내표시", "안내지움", "goBack", "안내표시"]);
  });

  it("시각이 0 이어도 대기가 풀리지 않는다 (0 을 «대기 없음»으로 읽으면 안 된다)", () => {
    const log: string[] = [];
    let clock = 0;
    const actions = {
      goBack: () => log.push("goBack"),
      exitApp: () => log.push("exitApp"),
      showHint: () => log.push("안내표시"),
      hideHint: () => log.push("안내지움"),
      now: () => clock,
    };
    handleBackPress(false, actions); // 0 시각에 대기 걸림
    clock = 300;
    handleBackPress(false, actions); // 0.3초 뒤 두 번째 → 꺼져야 한다
    expect(log).toEqual(["안내표시", "안내지움", "exitApp"]);
  });
});
