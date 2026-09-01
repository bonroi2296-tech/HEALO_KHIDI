/**
 * 청취 모드(수신측 자막) 브릿지 — LiveKitRoom 내부 전용, 렌더링 없음
 *
 * 상대가 통역을 안 켜도, 듣는 쪽이 원격 참가자의 음성 트랙을 이쪽에서 직접
 * 전사·번역해 자막으로 본다. PO 실사용 시나리오(2026-07-11): PO 는 마이크·스피커를
 * 끄고 입장(하울링 방지, 동석한 코디 기기가 대표 마이크), 코디↔외국인의 ru/kz 대화를
 * 자기 화면에서 한국어 자막으로 따라감. 스피커를 꺼도 원격 트랙 데이터는 수신된다.
 *
 * 화자 구분: 원격 참가자별로 독립 파이프라인(믹스 안 함) — 각 자막에 참가자
 * 이름이 트랙 단위로 정확히 붙는다. 단, **한 공간에 기기가 여럿이면** 같은 목소리가
 * 여러 트랙에 잡혀 한 사람이 두세 명처럼 갈라진다 → 파이프라인 간 중복 억제(looksDuplicate).
 *
 * 지연: 확정 자막은 발화가 끝나야 나오므로, 3초를 넘긴 발화엔 지금까지 녹음분을 먼저
 * 올려 «말하는 중» 자막을 띄운다(partial=1, 기록·DB 저장 없음). 확정본이 제자리에서 교체.
 * 응답은 뒤섞여 도착하므로 조각마다 seq 를 붙여 수신측이 낡은 조각을 버린다.
 *
 * 중복 억제: 해당 참가자가 직접 통역을 켜서 DataChannel 자막을 보내는 중이면
 * (최근 60초, dcActivityRef) 그 참가자의 청취 모드 자막은 억제 — 화자 기기
 * 인식이 더 정확하므로 그쪽을 우선한다. (한계: 상대가 통역을 켠 뒤 '첫' 발화와
 * 60초 넘는 침묵 직후 발화는 양쪽이 한 번씩 겹칠 수 있음 — docs/KNOWN_ISSUES.md)
 *
 * 수명주기 설계(2026-07-11 독립 리뷰 반영):
 * - 파이프라인 정지는 「그 트랙이 사라졌을 때」와 「기능 꺼짐/언마운트」뿐 — 언어 변경·
 *   참가자 추가로 진행 중인 다른 파이프라인(녹음 중 문장)을 죽이지 않는다(증분 diff).
 *   언어·인증 헤더·문맥은 ref 로 읽어 파이프라인 재시작 없이 최신값 반영.
 * - AudioContext 는 브릿지당 1개 공유(Chrome 페이지당 ~6개 상한 방어) + resume 시도.
 * - VAD(analyser)를 못 만들면 그 트랙은 녹음 자체를 시작하지 않는다 — 무음 구간을
 *   4초마다 통째로 업로드하는 비용 폭주(시간당 수백 회 Gemini 호출)보다 기능 꺼짐이 낫다.
 *
 * 녹음 사이클(VAD·MediaRecorder)은 page.jsx 의 내 마이크 서버 STT 와 같은 패턴.
 * (마이크 경로는 라이브 검증 없이는 못 건드리는 코드라 공유 모듈화 대신 별도 구현
 *  — 통합은 후속 과제, docs/KNOWN_ISSUES.md)
 */

"use client";

import { useEffect, useRef } from "react";
import { useRoomContext, useTracks } from "@livekit/components-react";
import { RoomEvent, Track } from "livekit-client";

// DataChannel 자막 수신 후 이 시간 동안 청취 모드 억제.
//
// ⚠️ 2026-07-29 자가감사에서 **되돌린 값**이다. 같은 날 낮에 60초 → 20초로 줄였었다
//   ("상대 자막이 죽으면 1분간 무자막"이 싫어서). 그런데 다시 따져보니 손해가 더 크다:
//   이 창은 «저 사람이 지금 자기 기기로 자막을 보내는 중인가»를 재는 것이지 발화 하나를
//   재는 게 아니다. 20초로 줄이면 **20초 넘게 조용했던 사람이 다시 말할 때마다** 우리
//   전사와 상대 자막이 같이 떠서 같은 말이 두 줄로 뜬다 — 회의 중엔 흔한 간격이다.
//   반대로 60초의 손해는 «상대 자막 송신이 죽었을 때 한 번, 최대 1분»뿐이고 그 뒤엔
//   저절로 풀린다. 잦은 이중 자막(=PO 가 말한 «꼬인다»)보다 낫다.
const DC_SUPPRESS_MS = 60000;
const MIN_BLOB_BYTES = 4000;

// 「소리가 있었던 프레임」이 이만큼은 돼야 대화 문맥을 함께 보낸다(프레임 1개 = 0.1초 → 0.8초).
// 이보다 짧은 조각은 문맥 없이 «들린 것만» 받아쓰게 한다 — 지어냄의 재료를 없애는 장치.
// 왜 0.8초인가: 의미 있는 한 마디("네", "알겠습니다")는 그 아래로도 나오지만, 그런 짧은 말은
// 문맥이 없어도 정확히 받아쓴다. 반대로 «문장을 완성해 버리는» 사고는 이 아래에서 났다.
const VOICED_FOR_CONTEXT = 8;

// ── 화자 귀속: «화면 테두리와 같은 신호»를 쓴다 ──
// 왜: 참가자별로 트랙을 따로 전사하므로, 한 사무실에 기기가 여럿이면 같은 목소리를
//   여러 마이크가 잡는다. 예전 규칙은 «STT 응답이 먼저 도착한 트랙이 그 발화의 주인» —
//   도착 순서는 망·모델 지연이 정하는 사실상 난수다. 2026-07-29 실회의 기록에서
//   러시아어를 한 마디도 안 한 한국인 참가자 이름으로 러시아어 자막 8줄이 붙었다.
//   화면의 «말하는 사람 테두리»는 이미 정확하다 — LiveKit 서버가 오디오 레벨로 고른
//   활성 화자를 쓰기 때문. 자막도 같은 신호로 귀속한다.
const SPEAKER_LOG_MS = 60000;

/**
 * 발화 구간 [from, to] 동안 «말하는 사람»으로 가장 강하게 잡힌 참가자.
 * 단위시험 대상이라 export (실통화 없이 검증 가능한 유일한 층).
 * @param {Array<{at:number, identity:string, name:string, level:number}>} log
 */
export function dominantSpeaker(log, from, to) {
  // 녹음 시작 직전 1초 / 끝난 뒤 0.5초까지 인정 — VAD 가 말머리를 조금 늦게 잡는다.
  const score = new Map();
  for (const e of log) {
    if (e.at < from - 1000 || e.at > to + 500) continue;
    const cur = score.get(e.identity) || { n: 0, level: 0, name: e.name };
    cur.n += 1;
    cur.level += e.level || 0;
    score.set(e.identity, cur);
  }
  let best = null;
  for (const [identity, v] of score) {
    // 누적 오디오 레벨 우선, 동률이면 잡힌 횟수. (레벨을 안 주는 브라우저는 0 → 횟수로 갈린다)
    if (!best || v.level > best.level || (v.level === best.level && v.n > best.n)) {
      best = { identity, name: v.name, n: v.n, level: v.level };
    }
  }
  return best;
}

// ── 말하는 중 자막(부분 전사) ──
// 왜: 예전엔 「말 끝 → 1.2초 무음 확인 → 업로드 → Gemini」라서 5초 문장이면 말 시작 후
//   8~10초 뒤에야 자막이 떴다("자막만 켰을 때도 느리다" PO 2026-07-27). 송신 경로엔 이미
//   부분 자막이 있었는데 수신(청취모드)엔 없던 사각. 지금까지 녹음된 조각을 그대로
//   올려 먼저 띄우고, 발화가 끝나면 확정본이 제자리에서 교체한다.
// 비용 방어: ①이미 3초 넘게 이어진 발화만(짧은 문장은 확정본이 곧 오므로 부분 불필요)
//   ②동시 1건 ③최소 2.5초 간격 → 10초 발화당 부분 요청 2~3회.
// 2026-07-27 2차 조정(PO "지연 더 줄여줘"): 첫 부분 자막을 3초 → **1.2초**에 쏜다.
//   예전 값(조각 2.5초 · 최소 3초)이면 첫 요청이 실제로는 5초째에나 나갔다
//   (조각이 2.5/5.0/7.5초에 떨어지는데 2.5초는 «3초 미만»이라 걸러졌기 때문).
//   짧은 조각은 AI 응답도 빨라(출력 토큰이 적다) 첫 글자가 2~3초대에 보인다.
// 2026-07-29 3차 조정(PO "올라오는 속도가 너무 느려" · "타이핑하듯 실시간이 아니다"):
//   조각을 더 잘게 떠서 첫 자막을 앞당기고 갱신을 촘촘히 한다. 조각이 짧으면 출력 토큰도
//   적어 모델 왕복 자체가 빨라진다. ponytail: 비용은 조각 수에 비례 — 10초 발화당 부분
//   요청 3~5회. 더 못 줄인다(모델 왕복 1~2초가 하한이라 이 밑으론 요청만 겹친다).
const PARTIAL_SLICE_MS = 700; // MediaRecorder 조각 주기
const PARTIAL_MIN_SPEECH_MS = 700; // 이만큼 이어진 발화부터 부분 자막 시도
const PARTIAL_MIN_INTERVAL_MS = 900; // 갱신 주기(너무 잦으면 깜빡임·비용)
// ⚠️ 발화 하나가 쓸 수 있는 «말하는 중» 요청 상한.
// 왜 필요한가(2026-07-29 실측): 부분 요청은 매번 «발화 처음부터 지금까지» 오디오를 통째로
//   다시 올린다(이어붙인 webm 은 앞을 못 자른다). 그래서 발화가 길수록 같은 소리를 몇 번씩
//   다시 전사하고, 비용은 길이의 제곱으로 튄다. 갱신 주기를 1.5초 → 0.9초로 당기면서 이걸
//   안 막으면 12초 발화 하나가 요청 12번이 된다.
//   실측 근거: 오늘 31분 회의가 AI 호출 1,163회(분당 37.5회)를 썼고 상담 1건당 상한은
//   5,000회 — 상한까지 133분이었다. 상한을 넘기면 «회의 도중 자막이 죽는다».
//   4회면 짧은 발화(대부분)는 영향이 없고 긴 발화의 폭주만 잘린다. 뒷부분은 어차피
//   확정 자막이 곧 제자리에서 교체한다.
// 2026-08-04: 4 → 6. PO 제보 «길게 말하면 화면이 멈춘 것 같다» — 4회면 8초쯤부터 확정본이
// 올 때까지 화면이 안 움직였다. 호출 상한을 함께 올렸으므로(aiGuard) 감당된다.
const PARTIAL_MAX_PER_UTTERANCE = 6;

// ── 같은 목소리가 여러 마이크에 잡히는 것 억제 ──
// 왜: 참가자별로 트랙을 따로 듣기 때문에, 한 공간에 기기가 여럿이면 한 사람 발화가
//   여러 이름으로 갈라져 자막에 뜬다. 2026-07-27 실회의 로그에서 피크 분당 33건 ×
//   평균 3초 ≈ 100초 분량 = 1분에 100초어치가 기록됨(벽시계 초과) → 중복 전사 확정.
const CROSS_DUP_WINDOW_MS = 8000;
const CROSS_DUP_JACCARD = 0.6;

// ── «한 사람은 한 마이크가 맡는다» ──
// 위 looksDuplicate 는 **확정 자막**만 걸러낸다. 그런데 «말하는 중» 조각엔 그 검사가 없어서,
// 같은 방 마이크 둘이 같은 사람 말을 각자 조금씩 다르게 받아쓴 걸 **같은 자막 자리에**
// 번갈아 써넣는다 → 글자가 앞뒤로 튄다(2026-07-29 자가감사: 화자 귀속을 고치면서 두 줄이
// 한 자리로 합쳐지는 바람에 새로 생긴 증상).
// 그래서 보내기 «전»에 «이 사람은 지금 누구 마이크가 맡고 있나»를 확인하고, 남이 맡고
// 있으면 아예 안 보낸다 — 화면도 안 튀고 AI 호출도 안 나간다(비용도 같이 줄어든다).
// ponytail: 임자는 «먼저 보낸 쪽». 가장 가까운(=가장 잘 들리는) 마이크를 고르는 게 이상적이지만
//   그러려면 응답을 모아 비교하느라 자막이 늦어진다. 귀속(누가 말했나)은 이미 정확하므로
//   여기서 남는 손해는 «가끔 조금 먼 마이크의 소리로 받아쓴다» 정도다.
const OWNER_TTL_MS = 4000;

const normalizeWords = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);

/** 두 전사가 «같은 발화»로 보이는가 — 단어집합 겹침(Jaccard) 기준. */
export function looksDuplicate(a, b) {
  const wa = new Set(normalizeWords(a));
  const wb = new Set(normalizeWords(b));
  if (wa.size < 4 || wb.size < 4) return false; // 짧은 조각은 우연히 겹침 → 판정 안 함
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter += 1;
  return inter / (wa.size + wb.size - inter) >= CROSS_DUP_JACCARD;
}

// 통역 봇(agent-*)과 봇이 만든 통역 음성 트랙(tx:*)은 전사 대상이 아니다 —
// 봇 통역 음성을 여기서 또 STT 하면 같은 발화가 세 번 자막이 된다(2026-07-23 첫 라이브 사고).
const isHumanAudioTrack = (t) =>
  !t.participant?.identity?.startsWith("agent-") &&
  !t.publication?.trackName?.startsWith("tx:");

export function ListenModeBridge({
  enabled,
  langHint, // 상대가 말할 가능성이 높은 언어 (kz 면 서버가 Pro 모델 선택)
  targetLang, // 내 언어 — 이 언어로 번역된 자막을 받는다
  consultationId,
  getAuthHeaders,
  contextRef, // 대화 문맥 링버퍼 (page.jsx convoContextRef)
  dcActivityRef, // Map<identity, ts> — DataChannel 자막 최근 수신 시각
  onSubtitle, // ({ transcript, translated, lang, name, identity }) => void
  onAudioHealth, // ({ remoteAudioCount, contextState }) => void — "조용한 사망" 워치독용 (선택)
}) {
  // 원격 참가자 마이크 트랙 (본인 제외)
  const trackRefs = useTracks([Track.Source.Microphone]);
  const room = useRoomContext();
  // «지금 말하는 사람» 로그 — 화면 테두리를 만드는 그 신호. 화자 귀속에 쓴다.
  const speakerLogRef = useRef([]);
  const pipelinesRef = useRef(new Map()); // key → stop()
  const audioCtxRef = useRef(null); // 브릿지당 1개 공유
  // 최근 확정 전사 [{ identity, text, at }] — 파이프라인 간 중복(같은 목소리 여러 마이크) 억제용
  const recentRef = useRef([]);
  // identity → { pipeKey, at } : «이 사람은 지금 누구 마이크가 맡고 있나»
  const ownerRef = useRef(new Map());
  // 언어·콜백·헤더는 ref 로 — 값이 바뀌어도 진행 중인 녹음 파이프라인을 재시작하지 않고
  // 다음 전송 시점에 최신값을 읽는다 (재시작하면 녹음 중이던 문장이 통째로 유실됨)
  const liveRef = useRef({});
  liveRef.current = { langHint, targetLang, consultationId, getAuthHeaders, contextRef, dcActivityRef, onSubtitle };

  // ⚠️ 마이크 끈 사람의 트랙은 듣지 않는다 (2026-08-07 PO 제보: "마이크를 다 꺼놔도 자막이 올라온다").
  //
  //   왜 꺼도 소리가 오나 — livekit-client 기본값을 직접 읽어 확인했다
  //   (node_modules/livekit-client/dist/livekit-client.esm.mjs 의 publishDefaults):
  //     · `stopMicTrackOnMute: false` → 마이크를 꺼도 **통로를 안 닫는다.** 음소거 표시만 붙는다.
  //     · `dtx: true` → 조용할 때 소리를 안 보내는 대신, **받는 쪽 디코더가 「편안한 잡음」을
  //       만들어 낸다.** 즉 받는 쪽 트랙에서 나오는 건 «완전한 무음»이 아니다.
  //   그리고 이 파일엔 음소거 확인이 아예 없어서, 상대가 마이크를 꺼도 그 트랙에 녹음기를
  //   계속 물려 두고 있었다. 그 잡음이 아래 소리 문턱(rms>0.02)을 넘으면 서버로 가고,
  //   서버 받아쓰기는 말 없는 조각에서 100% 문장을 만들어낸다(2026-08-07 실측 15/15).
  //   = 「아무도 말 안 했는데 자막이 올라온다」의 완성된 사슬.
  //
  //   저장소의 다른 곳(SameRoomGuard·화면 타일)은 이미 isMuted 를 보고 거른다 — 여기만 빠져 있었다.
  //   ※ 더 근본은 `stopMicTrackOnMute: true`(끄면 마이크를 진짜 닫기)지만, 그건 다시 켤 때
  //     마이크를 새로 잡아야 하고 iOS 2차 마이크 문제와 얽힌다 — 받는 쪽에서 거르는 이 수리가
  //     같은 증상을 더 싸고 안전하게 닫는다.
  //
  // mediaStreamTrack.id 까지 키에 포함 — LiveKit 이 재연결·재발행으로 내부 트랙을
  // 갈아끼우면(참가자·trackSid 동일) 죽은 트랙을 계속 듣는 파이프라인을 교체하기 위함
  const remoteKeys = trackRefs
    // ⚠️ isMuted 를 «열쇠»에도 넣는다. 아래 필터에만 넣으면 음소거·해제가 이 문자열을 안 바꿔
    //    효과가 다시 안 돌고, 자막을 켤 때 음소거였던 사람은 마이크를 켜도 영영 자막이 안 나온다
    //    (2026-08-18 리뷰가 잡음 — 원격 음소거는 트랙 객체·id 를 안 바꾼다).
    .filter((t) => !t.participant?.isLocal && t.publication?.track?.mediaStreamTrack && isHumanAudioTrack(t))
    .map(
      (t) =>
        `${t.participant.identity}::${t.publication.trackSid}::${t.publication.track.mediaStreamTrack.id}::${t.publication.isMuted ? "m" : "u"}`
    )
    .sort()
    .join(",");

  // 트랙 증감에 따른 증분 시작/정지 — cleanup 은 반환하지 않는다(아래 언마운트 effect 가 담당).
  useEffect(() => {
    const pipelines = pipelinesRef.current;

    if (!enabled || typeof MediaRecorder === "undefined") {
      for (const stop of pipelines.values()) stop();
      pipelines.clear();
      return;
    }

    const active = trackRefs.filter(
      (t) =>
        !t.participant?.isLocal &&
        !t.publication?.isMuted && // 마이크 끈 사람 — 아래 참조
        t.publication?.track?.mediaStreamTrack &&
        isHumanAudioTrack(t)
    );
    const activeKeys = new Set(
      active.map(
        (t) =>
          `${t.participant.identity}::${t.publication.trackSid}::${t.publication.track.mediaStreamTrack.id}`
      )
    );

    // 사라진(교체된) 트랙 파이프라인만 정리
    for (const [key, stop] of pipelines) {
      if (!activeKeys.has(key)) {
        stop();
        pipelines.delete(key);
      }
    }

    // 새 트랙 파이프라인 시작
    for (const t of active) {
      const key = `${t.participant.identity}::${t.publication.trackSid}::${t.publication.track.mediaStreamTrack.id}`;
      if (pipelines.has(key)) continue;
      pipelines.set(
        key,
        startPipeline({
          mediaStreamTrack: t.publication.track.mediaStreamTrack,
          identity: t.participant.identity,
          name: t.participant.name || t.participant.identity,
          pipeKey: key,
          liveRef,
          audioCtxRef,
          recentRef,
          speakerLogRef,
          ownerRef,
        })
      );
    }
    // remoteKeys 문자열이 트랙 증감(교체 포함)을 대표 — trackRefs 배열 자체는 매 렌더 새 참조
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, remoteKeys]);

  // ── «말하는 사람» 기록 ── 화면 테두리와 같은 출처(LiveKit 활성 화자)를 쌓아둔다.
  useEffect(() => {
    if (!enabled || !room) return;
    const onSpeakers = (speakers) => {
      const now = Date.now();
      const log = speakerLogRef.current;
      while (log.length && now - log[0].at > SPEAKER_LOG_MS) log.shift();
      for (const p of speakers || []) {
        if (p?.isLocal || p?.identity?.startsWith("agent-")) continue;
        log.push({
          at: now,
          identity: p.identity,
          name: p.name || p.identity,
          level: p.audioLevel || 0,
        });
      }
    };
    room.on(RoomEvent.ActiveSpeakersChanged, onSpeakers);
    return () => room.off(RoomEvent.ActiveSpeakersChanged, onSpeakers);
  }, [enabled, room]);

  // 언마운트에만 전체 정리
  useEffect(() => {
    return () => {
      for (const stop of pipelinesRef.current.values()) stop();
      pipelinesRef.current.clear();
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
    };
  }, []);

  // ── 공유 AudioContext 를 사용자 제스처로 확실히 깨우기 (조용한 사망 근본 수리) ──
  // 배경(2026-07-24 실회의 진단): AudioContext 가 사용자 제스처 밖에서 생성되면 `suspended`
  //   로 시작한다 → VAD analyser 의 RMS 가 항상 0 → voicedFrames 가 3에 영영 못 미쳐 업로드
  //   자체가 안 일어남 → `/stt` 호출 0 = 자막이 조용히 안 나온다. 게다가 이 컨텍스트는
  //   자막 토글을 껐다 켜도 다시 안 살아난다(파이프라인만 재시작될 뿐 컨텍스트는 언마운트
  //   전까지 유지) → 사용자가 "껐다켰다 반복해도 안 나온다"고 겪는 정확한 패턴.
  //   startPipeline 의 1회성 resume() 는 제스처 밖이면 실패할 수 있으므로, 여기서 화면의 어떤
  //   탭/키 입력에도 resume 을 재시도한다(표준 Web Audio unlock 패턴). 이미 running 이면
  //   resume() 은 무해한 no-op → 잘 되던 경로(회의1)엔 영향 0.
  useEffect(() => {
    if (!enabled) return;
    const resume = () => {
      const ctx = audioCtxRef.current;
      if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
    };
    window.addEventListener("pointerdown", resume);
    window.addEventListener("touchstart", resume);
    window.addEventListener("keydown", resume);
    return () => {
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("touchstart", resume);
      window.removeEventListener("keydown", resume);
    };
  }, [enabled]);

  // ── 건강상태 보고 — 상위(page.jsx)가 "켜졌는데 자막이 안 나온다"를 눈에 띄게 알리는 근거 ──
  // 상대 오디오 트랙 수 + AudioContext 상태를 주기적으로 올린다. contextState 가 'suspended'
  // 인데 상대 오디오가 있으면 = 우리가 상대 발화를 물리적으로 감지 못 하는 상태(위 수리 전).
  // (트랙 상태는 렌더 없이도 바뀔 수 있어 interval 로 재확인 — remoteKeys 로 트랙 증감도 반영.)
  useEffect(() => {
    if (typeof onAudioHealth !== "function") return;
    const report = () => {
      // 사람 트랙만 센다(봇 tx:* 제외) — 워치독은 "전사할 상대 발화가 있는데 못 잡는가"를 봐야 한다.
      const remoteAudioCount = trackRefs.filter(
        (t) => !t.participant?.isLocal && t.publication?.track?.mediaStreamTrack && isHumanAudioTrack(t)
      ).length;
      onAudioHealth({
        remoteAudioCount,
        contextState: audioCtxRef.current?.state || "none",
      });
    };
    report();
    const id = setInterval(report, 2000);
    return () => clearInterval(id);
    // trackRefs 는 매 렌더 새 배열 → remoteKeys(트랙 증감 대표)로 재실행. enabled 로 온/오프 반영.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onAudioHealth, enabled, remoteKeys]);

  return null;
}

// 원격 트랙 1개에 대한 발화 단위 녹음 → 서버 STT → 자막 콜백. stop 함수를 반환.
function startPipeline({
  mediaStreamTrack,
  identity,
  name,
  pipeKey,
  liveRef,
  audioCtxRef,
  recentRef,
  speakerLogRef,
  ownerRef,
}) {
  let stopped = false;
  let recorder = null;
  let vadTimer = null;
  let analyser = null;
  let source = null;
  // 발화 세대 — 조각을 보내자마자 다음 녹음을 시작하므로 응답이 뒤섞여 도착한다.
  // 화면에는 «더 새 세대를 이미 본 뒤 도착한 낡은 조각»을 안 띄운다(DC 경로의 utter 필터와 같은 규칙).
  // 2026-07-27 PO: "이전 대화 자막이 뜬금없이 올라온다" 의 원인 — 청취모드엔 이 필터가 없었다.
  let seq = 0;
  // 직전 확정 전사 — 강제 컷으로 잘린 뒷조각이 앞 문장을 모른 채 번역되지 않게 문맥으로 넘긴다.
  let carryOver = "";
  // 침묵 환각 반복 필터 (파이프라인별 — 참가자 간 교차 억제 방지).
  // 억제 시 타임스탬프를 갱신하지 않는다(page.jsx isHallucinatedRepeat 와 동일 규칙 —
  // 갱신하면 창이 미끄러져 정당한 반복 발화가 영구 억제됨).
  let lastText = "";
  let lastAt = 0;

  const stream = new MediaStream([mediaStreamTrack]);

  const mime = MediaRecorder.isTypeSupported?.("audio/webm")
    ? "audio/webm"
    : MediaRecorder.isTypeSupported?.("audio/mp4")
    ? "audio/mp4"
    : "";

  // 공유 AudioContext 에 이 트랙 전용 analyser 연결. VAD 를 못 만들면 이 트랙은
  // 시작하지 않는다 — 무음 4초 청크를 무한 업로드하는 비용 폭주 방지(리뷰 반영).
  try {
    if (!audioCtxRef.current) {
      const AC = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new AC();
    }
    const ctx = audioCtxRef.current;
    // 사용자 제스처 밖에서 생성되면 suspended 로 시작해 RMS 가 항상 0 — resume 시도
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    source = ctx.createMediaStreamSource(stream);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
  } catch (e) {
    console.warn("[ListenMode] VAD unavailable — skipping track:", identity, e?.message);
    return () => {};
  }

  // 이 트랙에서 **실제로 들린** 언어(직전 조각의 감지 결과). 다음 조각의 힌트로 되먹인다.
  //
  // ⚠️ 2026-08-04 실회의(카자흐어 진행)에서 드러난 구멍:
  //   서버는 «카자흐어면 정확한 모델» 규칙을 갖고 있는데 그 판정을 **설정 언어**로만 한다.
  //   그날 카자흐 참가자들은 입장 화면에서 언어를 러시아어로 골랐고(방 기본값), 그래서
  //   lang=ru·targetLang=ko 로 요청이 나가 **카자흐어 발화 196줄(전체의 47%)이 전부 빠른
  //   모델로** 처리됐다. 결과: 같은 문장을 매번 다르게 받아썼다 —
  //     "아스타나에서 치료를 받지 않았다" ↔ "음식을 전혀 먹지 못한 지 일주일"
  //     치료 기간이 "일주일" ↔ "2주" 로 갈림.
  //   감지 결과는 응답이 와야 아니까 그 요청엔 못 쓴다. 대신 **다음 조각부터** 쓴다 —
  //   회의는 한 번 카자흐어로 말하면 계속 그 언어라 두 번째 조각부터 바로 맞는다.
  let detectedHint = null;

  // 조각 하나를 서버 STT 로 보낸다. partial=true 면 화면 표시 전용(기록·DB 저장 없음).
  const sendChunk = async ({ blob, partial, mySeq, startedAt, voiced = 99 }) => {
    const live = liveRef.current;
    // 화자 기기가 직접 자막을 보내는 중이면 스킵 (이중 자막 방지)
    const dcAt = live.dcActivityRef?.current?.get?.(identity) || 0;
    if (Date.now() - dcAt < DC_SUPPRESS_MS) return null;
    // 이 발화의 «말하는 사람»을 다른 마이크가 이미 맡고 있으면 보내지 않는다
    // (같은 말이 자막 한 자리에서 앞뒤로 튀는 것 + 같은 AI 호출 중복 방지).
    const dom0 = dominantSpeaker(speakerLogRef?.current || [], startedAt, Date.now());
    const who = dom0?.identity || identity;
    const owners = ownerRef?.current;
    if (owners) {
      const cur = owners.get(who);
      if (cur && cur.pipeKey !== pipeKey && Date.now() - cur.at < OWNER_TTL_MS) return null;
      owners.set(who, { pipeKey, at: Date.now() });
    }
    const headers = await live.getAuthHeaders();
    if (!headers) return null;
    // ── 소리가 거의 없는 조각엔 «대화 문맥»을 안 준다 ──
    // 2026-08-04 실회의: 「네」·「어머니」·「확인이」 같은 2~5글자 조각이 한국어 줄의 69% 였고,
    // 그 사이에 **아무도 안 한 완성 문장**이 끼어 저장됐다 —
    //   「치료 과정 중에 생긴 합병증으로 숨지셨습니다.」 (PO 확인: 의료진은 그런 말 한 적 없음)
    //   「일단은 세 번째 수술을 권장하지는 않는다고 하셨습니다.」
    // 살아 계신 환자 상담에서 «사망»이 기록에 남았다. 프롬프트엔 이미 「지어내지 마라」가
    // 있는데도 뚫렸다 — **금지를 더 세게 쓰는 대신 재료를 뺀다**(2026-08-03 과 같은 처방).
    // 소리가 짧을수록 모델은 «맥락에서 그럴듯한 문장»을 완성하려 든다. 그 맥락을 안 주면
    // 지어낼 재료가 없다. 문맥은 동음이의·대명사 해소용이라, 짧은 조각에선 어차피 이득이 적다.
    const tooQuietForContext = voiced < VOICED_FOR_CONTEXT;
    const ctx = tooQuietForContext
      ? []
      : (live.contextRef?.current || [])
          .slice(-6)
          .map(({ speaker, lang, text }) => ({ speaker, lang, text }));
    // 강제 컷으로 잘린 앞조각을 문맥 맨 뒤에 붙여 뒷조각이 문장을 이어받게 한다
    if (carryOver) ctx.push({ speaker: "other", lang: detectedHint || live.langHint, text: carryOver });
    const fd = new FormData();
    fd.append("audio", blob, "chunk.webm");
    // 이 트랙에서 실제로 들렸던 언어를 우선 — 설정 언어만 믿으면 카자흐어가 빠른 모델로 샌다(위 주석)
    fd.append("lang", detectedHint || live.langHint);
    fd.append("targetLang", live.targetLang);
    fd.append("context", JSON.stringify(ctx));
    fd.append("speakerName", name || "");
    // 이 소리는 «상대 참가자의 마이크»다 — 서버가 self 로 오해하면 상대 발화가 내 말로 남는다.
    fd.append("speakerRole", "other");
    if (partial) fd.append("partial", "1");
    // ponytail: 「기록은 먼저 들어온 한 대만」을 2026-08-04 에 넣었다가 **같은 날 되돌렸다.**
    //   자가감사에서 교환이 안 맞는 걸로 나왔다:
    //     · 잡는 것 — 같은 언어쌍 순수 중복 8줄 / 414줄 = **1.9%**
    //     · 새로 만드는 위험 — 「기록 담당」이 회의 중간에 나가면 **그 뒤 상대 말이 통째로 기록에서
    //       사라진다**(각 기기가 «자기 말»은 계속 남기므로 우리 쪽만 남고 상대는 빈다).
    //     · 게다가 절반만 잡았다 — 같은 회선 판정이 «게스트 입장»에서만 채워져서, 계정으로
    //       로그인해 들어온 기기와 서로 다른 회선의 기기(그날 카자흐 4명)는 애초에 못 잡는다.
    //   1.9% 를 지우려고 「기록 전체 소실」 위험을 사는 건 손해다.
    //   제대로 고치려면 **서버가 저장 직전에 중복을 접어야** 한다(같은 상담·최근 8초·비슷한 문장).
    //   암호문이라 SQL 비교가 안 되니 정규화 해시 컬럼이 필요 — 그건 따로 설계해서 하라.
    const res = await fetch(`/api/khidi/consultation/${live.consultationId}/stt`, {
      method: "POST",
      headers,
      body: fd,
    });
    const result = await res.json();
    // 감지 언어를 기억해 다음 조각의 힌트로 쓴다(성공한 응답만 — 빈 응답에 휘둘리지 않게).
    if (result?.ok && result.detectedLang) detectedHint = result.detectedLang;
    if (!result.ok || !result.transcript || !result.translated) return null;
    return { ...result, mySeq, startedAt, partial: !!partial };
  };

  const emit = (result) => {
    // 이 트랙이 잡은 소리지만, 발화 구간의 «말하는 사람»이 다른 참가자였다면 그 사람이 화자다
    // (같은 방 다른 기기의 마이크가 대신 잡은 것). 화면 테두리와 같은 판정 → 둘이 안 어긋난다.
    const dom = dominantSpeaker(speakerLogRef?.current || [], result.startedAt, Date.now());
    const speaker = dom || { identity, name };
    liveRef.current.onSubtitle?.({
      transcript: result.transcript,
      translated: result.translated,
      lang: result.detectedLang || liveRef.current.langHint,
      name: speaker.name,
      identity: speaker.identity,
      // 순서(늦게 온 옛 조각) 판정은 **파이프라인 단위**로 — seq 는 파이프라인마다 1부터
      // 세는 값이라, 귀속된 identity 로 묶으면 두 마이크의 카운터가 서로를 막아 자막이
      // 통째로 사라진다(2026-07-29 «자막이 꼬이더니 멈췄다»의 한 갈래).
      pipelineId: pipeKey || identity,
      seq: result.mySeq,
      startedAt: result.startedAt,
      interim: result.partial,
    });
  };

  // 마지막으로 녹음 사이클이 시작된 시각 — 아래 워치독이 «조용한 정지»를 되살리는 근거.
  let lastCycleAt = Date.now();

  const recordCycle = () => {
    if (stopped) return;
    lastCycleAt = Date.now();
    const chunks = [];
    let voicedFrames = 0;
    let silentStreak = 0;
    const startedAt = Date.now();
    const mySeq = ++seq;
    let partialInFlight = false;
    let lastPartialAt = 0;
    let partialCount = 0; // 이 발화가 쓴 «말하는 중» 요청 수 (PARTIAL_MAX_PER_UTTERANCE 상한)
    let cutting = false; // 컷 결정 후 들어오는 마지막 조각으로 부분 요청을 또 쏘지 않게

    try {
      recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    } catch {
      return; // 이 트랙은 녹음 불가 — 청취 모드 해당 참가자만 조용히 비활성
    }
    recorder.ondataavailable = (e) => {
      if (!e.data || e.data.size === 0) return;
      chunks.push(e.data);
      // ── 말하는 중 자막 ── 지금까지 조각을 이어붙이면 (첫 조각에 헤더가 있어) 그대로
      // 재생 가능한 webm 이다. 발화가 아직 안 끝났어도 먼저 띄운다.
      if (stopped || cutting) return;
      const now = Date.now();
      if (
        voicedFrames >= 3 &&
        now - startedAt >= PARTIAL_MIN_SPEECH_MS &&
        !partialInFlight &&
        partialCount < PARTIAL_MAX_PER_UTTERANCE &&
        now - lastPartialAt >= PARTIAL_MIN_INTERVAL_MS
      ) {
        const blob = new Blob(chunks, { type: mime || "audio/webm" });
        if (blob.size <= MIN_BLOB_BYTES) return;
        partialInFlight = true;
        partialCount += 1;
        lastPartialAt = now;
        sendChunk({ blob, partial: true, mySeq, startedAt, voiced: voicedFrames })
          .then((r) => r && emit(r))
          .catch(() => {})
          .finally(() => {
            partialInFlight = false;
          });
      }
    };
    recorder.onstop = async () => {
      clearInterval(vadTimer);
      const blob = new Blob(chunks, { type: mime || "audio/webm" });
      const hasSpeech = voicedFrames >= 3;
      if (!stopped) recordCycle();
      if (stopped || !hasSpeech || blob.size <= MIN_BLOB_BYTES) return;
      try {
        const result = await sendChunk({ blob, partial: false, mySeq, startedAt, voiced: voicedFrames });
        if (!result) return;
        // 같은 전사 30초 내 반복 = 침묵 환각 패턴 → 스킵 (억제 시 타임스탬프 미갱신)
        const now = Date.now();
        if (
          result.transcript.length >= 5 &&
          result.transcript === lastText &&
          now - lastAt < 30000
        ) {
          return;
        }
        // 다른 참가자 마이크가 방금 같은 말을 잡았으면 스킵 — 한 사람 발화가 두세 이름으로
        // 갈라져 뜨던 것(한 공간에 기기 여럿) 차단. 먼저 도착한 쪽이 그 발화의 주인이 된다.
        const recent = recentRef.current;
        while (recent.length && now - recent[0].at > CROSS_DUP_WINDOW_MS) recent.shift();
        if (
          recent.some((r) => r.identity !== identity && looksDuplicate(r.text, result.transcript))
        ) {
          return;
        }
        recent.push({ identity, text: result.transcript, at: now });
        lastText = result.transcript;
        lastAt = now;
        carryOver = result.transcript.slice(-300);
        emit(result);
      } catch {
        /* 조각 실패 무시 — 다음 사이클 */
      }
    };
    recorder.start(PARTIAL_SLICE_MS);

    const buf = new Uint8Array(analyser.fftSize);
    vadTimer = setInterval(() => {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / buf.length);
      if (rms > 0.02) {
        voicedFrames += 1;
        silentStreak = 0;
      } else if (voicedFrames >= 3) {
        silentStreak += 1;
      }
      const dur = Date.now() - startedAt;
      // 긴 발화를 «10초 정각»에 자르면 단어 한복판이 잘려 앞뒤 반쪽이 서로를 모른 채
      // 번역된다(2026-07-27 PO: "말을 길게 하니까 얘가 혼란스러워한다").
      // → 5초를 넘긴 뒤에는 0.3초짜리 숨쉬는 틈에서 끊고, 12초는 최후 안전장치로만 쓴다.
      // ⚠️ 이 문턱은 «말하는 쪽» 경로(page.jsx 서버 STT VAD)와 같아야 한다. 예전엔 여기만
      //    0.7초(+5초 뒤 0.3초 틈)로 짧았는데, 그건 말하는 쪽에서 **이미 한 번 겪고 되돌린 값**이다
      //    (page.jsx: "0.7초는 쉼표 호흡에도 끊겨 문장 중간 절단이 양산됨 — 7/10 로그 조각오류 52%").
      //    2026-08-03 실회의 434줄 실측: 자막의 **33~35%가 종결부호 없이 끝났고**(문장 뒤가 잘림)
      //    번역의 10~15%가 "…을"처럼 미완으로 남았다 — 반쪽 문장을 번역기에 넣으니 반쪽이 나온다.
      //    화면 속도는 «말하는 중» 부분 자막(0.7초)이 이미 담당하므로, 확정본까지 서두를 이유가 없다.
      const shouldCut =
        (voicedFrames >= 3 && silentStreak >= 12) || // 말 끝남(1.2초 무음 — 쉼표 호흡을 문장 끝으로 오인하지 않는 하한)
        (voicedFrames >= 3 && dur >= 8000 && silentStreak >= 6) || // 긴 발화 — 0.6초 숨쉬는 틈에서
        (voicedFrames >= 3 && dur >= 12000) || // 최후 강제 컷
        (voicedFrames < 3 && dur >= 5000); // 무음만 — 버리고 새 사이클
      if (shouldCut) {
        cutting = true;
        try {
          if (recorder.state !== "inactive") recorder.stop();
        } catch {
          /* ignore */
        }
      }
    }, 100);
  };

  recordCycle();

  // ── 파이프라인 워치독 ── 사이클이 한 번 끊기면 이 트랙 자막은 «영영» 안 나온다:
  //   MediaRecorder 생성 실패, onstop 미발화(탭 백그라운드 스로틀·기기 슬립 복귀) 등
  //   재시작 경로가 없는 구멍이 여럿이다. 실제로 2026-07-29 회의에서 "자막이 나오다 멈췄다".
  //   한 사이클은 길어야 12초이므로 20초 넘게 «새 사이클이 시작되지 않았다» = 확실히 멈춘 것.
  //
  // ⚠️ 처음엔 «녹음 중이면 건드리지 않는다»로 짰는데, 그러면 **정작 제일 위험한 멈춤을
  //    못 잡는다**: 트랙이 죽어도 MediaRecorder 는 «녹음 중» 상태로 남을 수 있어서
  //    조건이 영원히 참이 되고 워치독이 한 번도 안 돈다(2026-07-29 자가감사).
  //    → 20초를 넘겼으면 «녹음 중»이라도 일단 세운다. 세우면 onstop 이 다음 사이클을 연다.
  //      그 onstop 마저 안 오면(10초 더 기다려 확인) 직접 새로 건다.
  let stallStopAt = 0;
  const watchdog = setInterval(() => {
    if (stopped) return;
    if (Date.now() - lastCycleAt < 20000) return;
    if (recorder && recorder.state !== "inactive" && Date.now() - stallStopAt > 10000) {
      stallStopAt = Date.now();
      try {
        recorder.stop(); // onstop 이 다음 사이클을 시작한다
      } catch {
        /* 못 세우면 아래 직접 시작으로 넘어간다(다음 tick) */
      }
      return;
    }
    clearInterval(vadTimer);
    recordCycle();
  }, 5000);

  return () => {
    stopped = true;
    clearInterval(watchdog);
    clearInterval(vadTimer);
    try {
      if (recorder && recorder.state !== "inactive") recorder.stop();
    } catch {
      /* ignore */
    }
    try {
      source?.disconnect();
    } catch {
      /* ignore */
    }
    // 공유 AudioContext 는 닫지 않는다 (다른 파이프라인이 사용 중 — 브릿지 언마운트 시에만 close)
  };
}
