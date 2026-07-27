/**
 * 자리 비움 자동 종료 타이머 규칙 검증 (2026-07-25, PO 지시)
 *
 * 왜 테스트가 필요한가: 이 로직은 «5분 뒤에 일어나는 일»이라 사람이 손으로 확인하려면
 * 실제로 5분을 기다려야 한다. 그래서 아무도 안 해보고 넘어가고, 틀린 채로 배포된다.
 * (실제로 초안은 «네, 있어요»를 누르면 타이머가 재무장되지 않는 결함이 있었다.)
 * 가짜 타이머로 시간을 돌려 규칙 자체를 못 박는다.
 *
 * 여기서 «종료» = 이 브라우저의 연결만 끊기(livekitToken 비우기). 상담 기록·상대 참가자·
 * 초대 링크는 안 건드린다.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// page.jsx 와 같은 값 — 바뀌면 이 테스트가 먼저 깨져서 알려준다.
const IDLE_RULES = {
  waiting: { ask: 5 * 60 * 1000, grace: 60 * 1000 },
  inRoom: { ask: 5 * 60 * 1000, grace: 60 * 1000 },
};

/** page.jsx 의 effect 와 같은 구조를 최소로 재현한 모형 */
function createIdleWatcher(mode, { onAsk, onClose }) {
  type Timer = ReturnType<typeof setTimeout> | null;
  let askTimer: Timer = null;
  let graceTimer: Timer = null;
  const clear = () => {
    if (askTimer) clearTimeout(askTimer);
    if (graceTimer) clearTimeout(graceTimer);
    askTimer = graceTimer = null;
  };
  const arm = () => {
    clear();
    if (!mode) return;
    const { ask, grace } = IDLE_RULES[mode];
    askTimer = setTimeout(() => {
      onAsk();
      graceTimer = setTimeout(onClose, grace);
    }, ask);
  };
  arm();
  return {
    stay: arm,            // «네, 있어요» → 처음부터 다시
    setMode: (m) => { mode = m; arm(); },
    stop: clear,          // 상대가 들어옴·화면 벗어남 등
  };
}

describe("자리 비움 자동 종료", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("대기 중: 5분 뒤 묻고, 1분 더 무응답이면 연결을 끊는다", () => {
    const onAsk = vi.fn(), onClose = vi.fn();
    createIdleWatcher("waiting", { onAsk, onClose });

    vi.advanceTimersByTime(5 * 60 * 1000 - 1);
    expect(onAsk).not.toHaveBeenCalled(); // 5분 전엔 안 물어봄

    vi.advanceTimersByTime(1);
    expect(onAsk).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();

    vi.advanceTimersByTime(60 * 1000 - 1);
    expect(onClose).not.toHaveBeenCalled(); // 1분 유예 안에는 안 끊음

    vi.advanceTimersByTime(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("통화 중 혼자: 5분 뒤 묻고, 1분 더 무응답이면 끊는다 (PO 지시 2026-07-27 — 대기와 동일)", () => {
    const onAsk = vi.fn(), onClose = vi.fn();
    createIdleWatcher("inRoom", { onAsk, onClose });

    vi.advanceTimersByTime(5 * 60 * 1000 - 1);
    expect(onAsk).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onAsk).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(60 * 1000);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("«네, 있어요»를 누르면 처음부터 다시 세고, 눌러둔 동안엔 안 끊긴다", () => {
    const onAsk = vi.fn(), onClose = vi.fn();
    const w = createIdleWatcher("inRoom", { onAsk, onClose });

    vi.advanceTimersByTime(5 * 60 * 1000);    // 1회차 질문
    expect(onAsk).toHaveBeenCalledTimes(1);
    w.stay();                                  // 사용자가 «있어요» 누름
    vi.advanceTimersByTime(60 * 1000);
    expect(onClose).not.toHaveBeenCalled();    // 유예 타이머가 취소됐어야 함

    // ⚠️ 초안의 실제 결함: 여기서 다시 안 물어봐 이후 자리를 떠도 영영 안 잡혔다.
    vi.advanceTimersByTime(4 * 60 * 1000);     // 누른 시점부터 5분
    expect(onAsk).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(60 * 1000);
    expect(onClose).toHaveBeenCalledTimes(1);  // 두 번째엔 무응답이라 끊김
  });

  it("상대가 들어오면(감시 해제) 타이머가 죽어 절대 안 끊긴다", () => {
    const onAsk = vi.fn(), onClose = vi.fn();
    const w = createIdleWatcher("inRoom", { onAsk, onClose });

    vi.advanceTimersByTime(4 * 60 * 1000);     // 아직 묻기 전(5분 미만)
    w.stop();                                  // 상대 입장 → 감시 중단
    vi.advanceTimersByTime(60 * 60 * 1000);    // 1시간 더 진행
    expect(onAsk).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();    // 진행 중인 상담은 말없이 있어도 안 끊김
  });

  it("대기 중이던 사람이 입장 승인되면 타이머가 그 시점부터 다시 시작한다", () => {
    // 두 규칙 값이 같아진 뒤(2026-07-27)에도 «모드가 바뀌면 재무장»은 지켜져야 한다.
    // 안 그러면 4분 기다리다 입장한 사람이 입장 1분 만에 «아직 계세요?»를 보게 된다.
    const onAsk = vi.fn(), onClose = vi.fn();
    const w = createIdleWatcher("waiting", { onAsk, onClose });

    vi.advanceTimersByTime(4 * 60 * 1000);     // 아직 5분 전
    w.setMode("inRoom");                        // 승인되어 입장
    vi.advanceTimersByTime(60 * 1000);         // 재무장 안 됐다면 여기서 물었을 시점
    expect(onAsk).not.toHaveBeenCalled();

    vi.advanceTimersByTime(4 * 60 * 1000);     // 입장 시점부터 5분
    expect(onAsk).toHaveBeenCalledTimes(1);
  });
});
