"use client";

/**
 * useSameRoomDetect — "같은 공간에 다른 기기가 있나" 자동 감지 (하울링 방지)
 *
 * 문제: 한 사무실에서 두 대의 PC 로 같은 상담에 들어오면 하울링이 난다.
 *   WebRTC 의 에코 제거(AEC)로는 못 막는다 — AEC 는 "내 스피커 → 내 마이크" 되돌이만
 *   지운다. 옆 PC 스피커에서 나온 소리는 내 마이크 입장에선 그냥 방에서 들린 진짜 소리라
 *   지울 근거가 없다. 구글미트도 이걸 소리로 풀지 않고 "같은 방인지 감지 → 한쪽 끄기"로 푼다.
 *
 * 두 갈래로 감지한다:
 *   ① 느린 경로(상관) — 같은 공간이면 한 사람의 목소리를 두 마이크가 동시에 잡아 음량 파형이
 *      강하게 상관된다. 하울링이 '나기 전'의 애매한 같은-방 상황을 잡는다(경고용).
 *   ② 빠른 경로(동시 큰 소리) — 지속 하울링은 두 마이크 RMS 가 높고 평평해져 상관으로는
 *      못 잡는다(분산≈0 → correlate null). 대신 하울링의 진짜 지문 = "양쪽 마이크가 동시에
 *      계속 큰 소리". 이걸 짧은 창으로 잡아 4초 기다리지 않고 ~0.4초 안에 확정한다(입장 순간
 *      터지는 하울링용 → 배너가 자동 음소거로 대응).
 *
 * ⚠️ 설계 제약 — **getUserMedia 를 새로 부르지 않는다.**
 *   iOS Safari 는 2차 오디오 캡처가 1차(LiveKit 송출 마이크)를 *조용히* 빼앗아 마이크가
 *   죽는다(KNOWN_ISSUES «영상상담 iOS», 그래서 서버 STT 도 iOS 는 막아둠). 카자흐·러 환자
 *   대부분이 아이폰이라 이 경로는 절대 밟으면 안 된다.
 *   → 이미 방에 있는 LiveKit 트랙(내 마이크·상대 마이크)만 AnalyserNode 로 관찰한다.
 *     초음파 비콘 방식도 같은 이유로 배제(재생·수집에 별도 오디오 경로가 필요하고,
 *     우리 파이프라인의 noiseSuppression/voiceIsolation 이 초음파를 지워버린다).
 */

import { useEffect, useRef, useState } from "react";

const WINDOW_MS = 60;        // 음량 표본 간격
const BUFFER_LEN = 80;       // 표본 개수 ≈ 4.8초
const MIN_ACTIVE = 12;       // 이만큼은 "소리가 있는" 표본이어야 판정(정적에선 판정 보류)
const CORR_ON = 0.72;        // 이 이상이면 같은 공간 의심
const CORR_OFF = 0.5;        // 이 아래로 떨어지면 해제(히스테리시스 — 깜빡임 방지)
const SUSTAIN_MS = 4000;     // 의심이 이만큼 지속돼야 확정(기침·동시발화 오탐 방지)

// ── 빠른 경로(하울링 즉발) ── 상관계수는 지속 하울링(높고 평평한 파형)을 못 잡는다.
// 대신 하울링의 지문 = "양쪽 마이크가 동시에 계속 큰 소리". 짧은 창으로 잡아 ~1초 내 확정.
const FAST_LEN = 3;          // 최근 표본 개수 ≈ 0.18초(순간 스파이크만 평활 — 반응을 거의 즉각으로)
const HOWL_RMS = 0.45;       // 하울링 확정 문턱(0~1 RMS). 하울링은 마이크를 '포화'시켜 이 근처까지 치솟지만
                             //   일반 발화·소음은 여기까지 지속되지 않는다 → 같은 방이 아닌 정상 원격통화
                             //   (겹발화·환자쪽 소음)에서 오작동 자동뮤트를 막는다(독립리뷰 #1: 소리 크기만으론
                             //   같은-방 특정이 안 됨). 일부러 높게 잡음: 빗나가도 실패 방향이 '안 꺼짐'(안전).
const FAST_SUSTAIN_MS = 200; // 양쪽 동시 큰 소리가 이만큼 지속되면 확정 → 총 반응 ~0.4초(거의 즉각, 기침 등 단발 소음은 배제)

// ── 빠른 경로 2단(AGC 대응, 2026-07-24) ── 실전에서 0.45 단 하나로는 하울링이 샜다(PO 실테스트).
// 원인: 브라우저 자동게인(AGC)이 하울링 음량을 눌러 0.45 문턱을 영영 못 넘김(#922 독립리뷰가 경고한 그 경로).
// AGC 는 '크기'만 누르고 스펙트럼 '모양'은 못 바꾼다 → 하울링의 두 번째 지문(에너지가 한 주파수에
// 몰린 단일음)을 보조 판정으로 쓴다. 말소리는 포먼트로 에너지가 퍼져 이 비율이 안 나온다.
const HOWL_RMS_AGC = 0.22;    // 2단 문턱: 중간 음량 + 단일음(tonal)일 때만 하울링 인정
const TONAL_SUSTAIN_MS = 600; // 2단은 오탐 여지가 커서 1단(200ms)보다 길게 지속돼야 확정
const TONAL_WINDOW = 6;       // 단일음 판정 창: 최근 표본 6개(≈0.36초)
const TONAL_NEED = 4;         // 그중 4개 이상이 단일음이어야
const TONAL_PEAK_MIN = 110;   // 주파수 피크 최소 크기(0~255) — 이보다 작으면 배경음 수준
const TONAL_RATIO = 5;        // 피크/평균 비 문턱. ponytail: 실측 없는 휴리스틱 초기값 — 2단이 안 잡으면 4로, 오탐이면 6으로.

function rms(analyser, buf) {
  analyser.getByteTimeDomainData(buf);
  let sum = 0;
  for (let i = 0; i < buf.length; i++) {
    const v = (buf[i] - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / buf.length);
}

/**
 * 피어슨 상관계수. 표본이 부족하거나 한쪽이 무음이면 null(판정 보류).
 * export 이유: 이 판정이 기능의 전부라 단위시험 대상(useSameRoomDetect.test.js).
 */
export function correlate(a, b) {
  const n = Math.min(a.length, b.length);
  if (n < BUFFER_LEN / 2) return null;
  const active = a.filter((v, i) => v > 0.01 && b[i] !== undefined).length;
  if (active < MIN_ACTIVE) return null;
  let ma = 0, mb = 0;
  for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; }
  ma /= n; mb /= n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i] - ma, y = b[i] - mb;
    num += x * y; da += x * x; db += y * y;
  }
  // 부동소수점: 같은 값으로 채운 배열도 분산이 정확히 0 이 아니라 1e-17 쯤 나온다.
  // `=== 0` 으로 막으면 그 틈으로 새서 의미 없는 상관값이 나온다(단위시험이 잡음).
  // 변화가 사실상 없는 신호는 정보가 없으므로 판정 보류가 맞다.
  const EPS = 1e-9;
  if (da < EPS || db < EPS) return null;
  return num / Math.sqrt(da * db);
}

/** 최근 n개 표본의 평균 RMS. 표본이 모자라면 0(아직 판정 안 함). */
function meanOfLast(samples, n) {
  if (samples.length < n) return 0;
  let sum = 0;
  for (let i = samples.length - n; i < samples.length; i++) sum += samples[i];
  return sum / n;
}

/**
 * 주파수 스펙트럼 한 프레임이 '단일음'(하울링 지문)인가.
 * 하울링은 에너지가 한 주파수에 몰려 피크가 뾰족하고, 말소리는 여러 포먼트로 퍼진다.
 * AGC 가 음량을 눌러도 이 '모양'은 남는다 → 음량 문턱(HOWL_RMS)이 뚫린 상황의 보조 지문.
 * 단위시험 대상이라 export.
 * @param {Uint8Array|number[]} freqData — AnalyserNode.getByteFrequencyData 결과(0~255)
 */
export function isTonalFrame(freqData, peakMin = TONAL_PEAK_MIN, ratio = TONAL_RATIO) {
  let max = 0, sum = 0, n = 0;
  for (let i = 2; i < freqData.length; i++) { // 0~1번 빈(DC·초저역 럼블)은 제외
    const v = freqData[i];
    if (v > max) max = v;
    sum += v;
    n++;
  }
  if (!n) return false;
  return max >= peakMin && max / (sum / n + 1) >= ratio;
}

/** 양쪽 다 최근 창에서 단일음 프레임이 충분한가(2단 하울링 판정의 스펙트럼 조건). 단위시험 대상. */
export function tonalBoth(localTonals, remoteTonals, win = TONAL_WINDOW, need = TONAL_NEED) {
  const hits = (arr) => {
    if (arr.length < win) return 0;
    let c = 0;
    for (let i = arr.length - win; i < arr.length; i++) if (arr[i]) c++;
    return c;
  };
  return hits(localTonals) >= need && hits(remoteTonals) >= need;
}

/**
 * 하울링 즉발 신호: 내 마이크와 상대 마이크가 최근 창에서 '동시에' 큰 소리인가.
 * 지속 하울링은 상관계수로 못 잡으므로(분산≈0) 이 동시-큰소리로 잡는다. 단위시험 대상이라 export.
 */
export function bothLoud(localSamples, remoteSamples, n = FAST_LEN, thresh = HOWL_RMS) {
  return meanOfLast(localSamples, n) >= thresh && meanOfLast(remoteSamples, n) >= thresh;
}

/**
 * @param {object} opts
 * @param {MediaStreamTrack|null} opts.localTrack  — 내 마이크 트랙 (LiveKit 이 이미 만든 것)
 * @param {Array<{identity: string, track: MediaStreamTrack}>} opts.remoteTracks — 상대 마이크 트랙들
 * @param {boolean} opts.enabled — 내 마이크가 켜져 있을 때만 의미가 있다
 * @returns {{ sameRoomWith: string|null, feedbackOnset: boolean, feedbackPeers: string[] }}
 *   sameRoomWith: 같은 공간으로 판정된 상대 identity(배너 문구용 대표 1명).
 *   feedbackOnset: 그 판정이 '하울링 즉발'(양쪽 동시 큰 소리)로 잡힌 것 = 자동 음소거 대상.
 *   feedbackPeers: 하울링 즉발로 잡힌 상대 **전원**. 한 방에 기기가 3대 이상이면 «한 대만
 *     끄기»로는 나머지끼리 계속 하울링한다(2026-07-29 실회의: 같은 사무실 IP 로 3대 접속)
 *     → 그룹 전체를 보고 한 대만 남기는 판단을 하려면 목록이 필요하다.
 */
export function useSameRoomDetect({ localTrack, remoteTracks, enabled }) {
  const [sameRoomWith, setSameRoomWith] = useState(null);
  // 하울링 즉발(빠른 경로)로 확정됐는지 — 배너가 이걸 보고 '경고'가 아니라 '자동 음소거'로 대응.
  const [feedbackOnset, setFeedbackOnset] = useState(false);
  const [feedbackPeers, setFeedbackPeers] = useState([]);
  const suspectSinceRef = useRef({}); // identity → 상관 의심 시작 시각(느린 경로)
  const loudSinceRef = useRef({});    // identity → 양쪽 동시 큰 소리 시작 시각(빠른 경로)

  useEffect(() => {
    if (!enabled || !localTrack || !remoteTracks?.length) {
      setSameRoomWith(null);
      setFeedbackOnset(false);
      setFeedbackPeers((prev) => (prev.length ? [] : prev));
      suspectSinceRef.current = {};
      loudSinceRef.current = {};
      return;
    }

    // effect 가 다시 돌 때(마이크 토글·참가자 변동 등) 옛 의심 시각이 남아 있으면
    // SUSTAIN_MS(4초) 조건이 **즉시 참**이 되어 오탐이 튄다(독립리뷰 지적) → 매번 초기화.
    suspectSinceRef.current = {};
    loudSinceRef.current = {};

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return; // 지원 안 하면 조용히 포기(기능 없음 = 기존 동작)

    let ctx;
    try {
      ctx = new AudioCtx();
      // 브라우저 자동재생 정책상 suspended 로 시작하면 분석이 조용히 안 돈다(독립리뷰 지적).
      // 상담방은 사용자가 버튼을 눌러 입장하므로 대개 running 이지만 보장은 없다 → 깨워둔다.
      if (ctx.state === "suspended") ctx.resume?.().catch(() => {});
    } catch {
      return;
    }

    /** 트랙 하나를 관찰용으로 연결. 스피커로는 절대 보내지 않는다(destination 미연결). */
    const attach = (track) => {
      const stream = new MediaStream([track]);
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser); // → destination 으로 잇지 않음: 소리가 두 번 나면 안 된다
      return {
        src,
        analyser,
        buf: new Uint8Array(analyser.fftSize),
        freqBuf: new Uint8Array(analyser.frequencyBinCount), // 단일음(하울링 지문) 판정용 스펙트럼
        samples: [],
        tonals: [], // 프레임별 단일음 여부(boolean) — samples 와 같은 주기로 쌓임
      };
    };

    let nodes;
    try {
      nodes = {
        local: attach(localTrack),
        remotes: remoteTracks.map((r) => ({ identity: r.identity, ...attach(r.track) })),
      };
    } catch {
      ctx.close?.();
      return;
    }

    const timer = setInterval(() => {
      const push = (n) => {
        n.samples.push(rms(n.analyser, n.buf));
        if (n.samples.length > BUFFER_LEN) n.samples.shift();
        // 스펙트럼 단일음 여부도 같은 주기로 — 2단(AGC 대응) 하울링 판정 재료
        n.analyser.getByteFrequencyData(n.freqBuf);
        n.tonals.push(isTonalFrame(n.freqBuf));
        if (n.tonals.length > BUFFER_LEN) n.tonals.shift();
      };
      push(nodes.local);
      nodes.remotes.forEach(push);

      const now = Date.now();
      let confirmed = null; // 같은 공간으로 판정된 상대 identity
      let fast = false;     // 이번 확정이 하울링 즉발(빠른 경로)인가
      const fastPeers = []; // 하울링 즉발로 잡힌 상대 전원(3대 이상 대응)

      for (const r of nodes.remotes) {
        // ── 빠른 경로: 양쪽 마이크가 동시에 계속 큰 소리 = 하울링 즉발 ──
        //   지속 하울링은 RMS 가 높고 평평해 상관으로는 못 잡는다(분산≈0 → null).
        //   1단: 포화 수준(0.45) 동시 큰 소리 — AGC 없는 기기, 200ms 로 즉발.
        //   2단: AGC 가 눌러 중간 음량(0.22)이지만 양쪽 다 '단일음'(하울링 스펙트럼) — 600ms 지속 시 확정.
        //   (같은 하울링 증거라 시작 시각은 한 맵을 공유 — 단 유지 조건이 끊기면 리셋.)
        const saturated = bothLoud(nodes.local.samples, r.samples);
        const agcHowl =
          !saturated &&
          bothLoud(nodes.local.samples, r.samples, FAST_LEN, HOWL_RMS_AGC) &&
          tonalBoth(nodes.local.tonals, r.tonals);
        if (saturated || agcHowl) {
          const need = saturated ? FAST_SUSTAIN_MS : TONAL_SUSTAIN_MS;
          const since = loudSinceRef.current[r.identity];
          if (!since) loudSinceRef.current[r.identity] = now;
          else if (now - since >= need) {
            confirmed = r.identity;
            fast = true;
            fastPeers.push(r.identity);
          }
        } else {
          delete loudSinceRef.current[r.identity];
        }

        // ── 느린 경로: 같은 목소리 상관(하울링 전, 애매한 같은-방 감지) ──
        const c = correlate(nodes.local.samples, r.samples);
        if (c !== null) {
          const seen = suspectSinceRef.current[r.identity];
          if (c >= CORR_ON) {
            if (!seen) suspectSinceRef.current[r.identity] = now;
            else if (now - seen >= SUSTAIN_MS && !confirmed) confirmed = r.identity;
          } else if (c < CORR_OFF) {
            delete suspectSinceRef.current[r.identity];
          }
        }
      }

      setSameRoomWith((prev) => (prev === confirmed ? prev : confirmed));
      setFeedbackOnset((prev) => (prev === fast ? prev : fast));
      fastPeers.sort();
      setFeedbackPeers((prev) =>
        prev.length === fastPeers.length && prev.every((v, i) => v === fastPeers[i])
          ? prev
          : fastPeers
      );
    }, WINDOW_MS);

    return () => {
      clearInterval(timer);
      try {
        nodes.local.src.disconnect();
        nodes.remotes.forEach((r) => r.src.disconnect());
        ctx.close?.();
      } catch {
        /* 정리 실패는 무시 — 페이지 이동 중일 수 있다 */
      }
    };
  }, [enabled, localTrack, remoteTracks]);

  return { sameRoomWith, feedbackOnset, feedbackPeers };
}
