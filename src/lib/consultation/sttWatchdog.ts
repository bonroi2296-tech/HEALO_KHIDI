/**
 * 브라우저 받아쓰기 → 서버 받아쓰기로 «넘어갈지» 판정 (자막 경로 워치독).
 *
 * 왜 따로 뽑았나: 예전 규칙은 「자막 켜고 8초 안에 브라우저 결과가 없으면 서버 길로, 되돌림 없음」
 * 이었다. 그 8초 동안 **내가 말을 안 했으면**(회의에선 켜자마자 남 말 듣는 게 보통) 브라우저가
 * 멀쩡한데도 서버 길로 영영 넘어갔다. 서버 길은 실측상 조각 가위질로 문장이 잘리고(11~59%)
 * 무음에서 없는 말을 지어내는(83%) 길이라, «어떤 날은 괜찮고 어떤 날은 이상하다»의 유력 원인.
 * (2026-08-15 진단 — docs/PROJECT_CONTEXT.md 「화상상담 개선 착수」)
 *
 * 새 규칙: 「내가 실제로 말했는데(영상 서버가 잰 발화 시간) 브라우저 결과가 0」일 때만 넘어간다.
 * 삼성 인터넷처럼 브라우저 받아쓰기가 조용히 죽는 환경은 그래도 잡힌다 — 말을 하면 발화 시간은
 * 쌓이는데 결과는 안 오니까. 말을 안 한 동안은 절대 안 넘어간다.
 */

export const STT_WATCHDOG = {
  /** 켠 뒤 최소 이만큼은 기다린다(브라우저 첫 결과가 늦게 오는 경우 보호) */
  MIN_ELAPSED_MS: 8_000,
  /** 이만큼 «내가 말한» 시간이 쌓였는데도 결과 0 이면 죽은 것으로 본다 */
  MIN_SPOKEN_MS: 3_000,
} as const;

export function shouldSwitchToServerStt(input: {
  /** 자막 켠 뒤 지난 시간 */
  elapsedMs: number;
  /** 그 사이 내가 말한 누적 시간(영상 서버 isSpeaking 기준) */
  spokenMs: number;
  /** 브라우저 받아쓰기가 결과(중간자막 포함)를 한 번이라도 냈나 */
  browserSttAlive: boolean;
  /**
   * «내가 말했나» 신호를 받을 수 있는 상태인가(= 영상 서버 방에 붙어 있나). 방 없이 자막·채팅만
   * 쓰는 화면(영상 서버 미설정·방 없는 상담)에선 발화 시간이 영영 0 이라 예전 규칙(시간만 보고
   * 전환)으로 되돌아간다 — 안 그러면 그 화면에선 죽은 받아쓰기를 영영 못 구한다(독립 리뷰 지적).
   */
  speakingSignalAvailable?: boolean;
}): boolean {
  if (input.browserSttAlive) return false;
  if (input.elapsedMs < STT_WATCHDOG.MIN_ELAPSED_MS) return false;
  if (input.speakingSignalAvailable === false) return true; // 신호가 없으면 시간만으로(옛 규칙)
  return input.spokenMs >= STT_WATCHDOG.MIN_SPOKEN_MS;
}

/** 발화 on/off 신호를 받아 누적 발화 시간을 재는 작은 시계. */
export function createSpokenClock(now: () => number = Date.now) {
  let total = 0;
  let since: number | null = null;
  return {
    set(speaking: boolean) {
      const t = now();
      if (speaking && since === null) since = t;
      if (!speaking && since !== null) {
        total += t - since;
        since = null;
      }
    },
    /** 지금까지 말한 누적 ms (말하는 중이면 현재까지 포함) */
    spokenMs() {
      return total + (since !== null ? now() - since : 0);
    },
    /** 누적을 비운다. 말하는 «도중»이면 그 발화는 지금부터 다시 센다(끊지 않는다) — 안 그러면
     *  자막을 켜는 순간 진행 중이던 발화 한 토막이 통째로 빠져 전환이 그만큼 늦어진다. */
    reset() {
      total = 0;
      since = since !== null ? now() : null;
    },
  };
}
