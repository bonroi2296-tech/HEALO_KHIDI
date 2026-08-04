"use client";

/**
 * SameRoomGuard — "같은 공간에 다른 기기가 있어요" 감지 배너 (하울링 방지)
 *
 * 왜: 한 사무실에서 두 대의 PC 로 같은 상담에 들어오면 하울링이 난다(2026-07-20 PO 제보).
 *   WebRTC 에코 제거(AEC)로는 원리적으로 못 막는다 — AEC 는 "내 스피커 → 내 마이크"
 *   되돌이만 지우고, 옆 PC 스피커 소리는 내 마이크 입장에서 그냥 방에서 들린 진짜 소리다.
 *   구글미트도 소리로 풀지 않고 "같은 방인지 감지 → 한쪽 오디오를 끈다"로 푼다. 여기도 같다.
 *
 * 이 컴포넌트가 하는 일: 감지(useSameRoomDetect) + 상황별 대응.
 *   - 애매한 경우(느린 상관 감지): 경고 배너 + 사람이 눌러 끄기.
 *   - 하울링 즉발(양쪽이 '포화 수준'으로 동시에 큰 소리, 고신뢰): 구글미트처럼 identity 규칙으로
 *     정한 한 대가 자동으로 화면 전용 전환(2026-07-23 PO 요청). 겹발화·소음으로 인한 오작동을
 *     막으려 감지 문턱을 포화 근처로 높게 잡는다(독립리뷰 #1).
 *   되돌리기 막대는 항상 남긴다 — 오탐/실제 다른 방이면 소리를 즉시 되살릴 수 있어야 한다.
 *
 * ⚠️ LiveKitRoom 내부에서만 렌더할 것(useRoomContext 사용).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRoomContext } from "@livekit/components-react";
import { RoomEvent, Track } from "livekit-client";
import { useSameRoomDetect } from "./useSameRoomDetect";

/**
 * 「마이크가 실제로 올라오면 딱 한 번 끈다」 핸들러를 만든다.
 * 왜 따로 뽑았나: 이 한 번-만-끄기가 하울링 차단의 실제 동작이라 단위시험 대상이다
 * (이 저장소엔 리액트 렌더 시험 도구가 없어 효과 안에 두면 아무도 못 잰다).
 * @param {object} room — LiveKit Room
 * @returns {(pub?: {source?: string}) => void}
 */
export function createMicMuteOnce(room) {
  let done = false;
  return (pub) => {
    if (done) return;
    if (pub?.source && pub.source !== Track.Source.Microphone) return;
    done = true;
    room?.localParticipant?.setMicrophoneEnabled?.(false)?.catch?.(() => {});
  };
}

/** 방의 오디오 트랙(내 마이크 / 상대 마이크)을 모아 훅에 넘길 형태로. */
function useAudioTracks(room) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!room) return;
    const bump = () => setTick((t) => t + 1);
    const events = [
      RoomEvent.TrackSubscribed,
      RoomEvent.TrackUnsubscribed,
      RoomEvent.LocalTrackPublished,
      RoomEvent.LocalTrackUnpublished,
      RoomEvent.TrackMuted,
      RoomEvent.TrackUnmuted,
      RoomEvent.ParticipantDisconnected,
    ];
    events.forEach((e) => room.on(e, bump));
    return () => events.forEach((e) => room.off(e, bump));
  }, [room]);

  return useMemo(() => {
    if (!room) return { localTrack: null, remoteTracks: [] };

    const localPub = room.localParticipant?.getTrackPublication?.(Track.Source.Microphone);
    // ponytail: 내 마이크가 꺼지면 감지가 통째로 멈춘다 — 하울링은 «내 스피커 + 옆 기기 마이크»
    //   만으로도 계속 돌기 때문에 그 조합은 못 잡는 사각이다. 지금은 ①번 방어선(같은 회선이면
    //   입장 즉시 소리 끄기)이 사무실 경우를 덮어 실害가 작다. 사각이 실제로 물리면(한 대는
    //   사무실 와이파이, 한 대는 폰 데이터) 상대 마이크 «둘 사이»의 상관으로 넓혀라 —
    //   지금 넓히면 잴 방법 없이 오탐만 늘린다.
    const localTrack =
      localPub && !localPub.isMuted ? localPub.track?.mediaStreamTrack ?? null : null;

    const remoteTracks = [];
    for (const p of room.remoteParticipants?.values?.() ?? []) {
      // 통역 에이전트가 만든 합성 음성(tx:*)은 제외 — 사람 마이크가 아니라 비교 대상이 아니다.
      if (p.identity?.startsWith("agent-")) continue;
      for (const pub of p.trackPublications?.values?.() ?? []) {
        if (pub.kind !== "audio" || pub.isMuted) continue;
        if (pub.trackName?.startsWith("tx:")) continue;
        const t = pub.track?.mediaStreamTrack;
        if (t) remoteTracks.push({ identity: p.identity, track: t });
      }
    }
    return { localTrack, remoteTracks };
    // tick 으로 트랙 변화를 반영한다(트랙 객체는 mutable 이라 참조만으론 안 바뀜)
  }, [room, tick]);
}

/**
 * 이 참가자에게서 오는 «소리»의 크기를 바꾼다(수신은 그대로 — 자막이 살아 있어야 한다).
 * 마이크뿐 아니라 «화면 공유 소리»도 같이 — 그것도 스피커로 나가면 하울링을 만든다.
 * 새로 붙는 트랙에도 자동 적용된다(livekit 이 참가자별로 마지막 값을 기억한다).
 */
function silenceParticipant(p, volume) {
  try {
    p.setVolume?.(volume);
    p.setVolume?.(volume, Track.Source.ScreenShareAudio);
  } catch {
    /* 이 참가자만 실패 — 나머지는 계속 */
  }
}

/**
 * @param {object} props
 * @param {object} props.copy — 방 문구(6개 언어)
 * @param {number} [props.sameNetworkPeers] — 입장 시점에 «같은 인터넷 회선»으로 이미 방에
 *   들어와 있던 기기 수. 1 이상 = 거의 확실히 같은 사무실 → 소리를 안 내고 들어간다.
 */
export function SameRoomGuard({ copy, sameNetworkPeers = 0 }) {
  const room = useRoomContext();
  const { localTrack, remoteTracks } = useAudioTracks(room);
  const [dismissed, setDismissed] = useState(false);
  const [screenOnly, setScreenOnly_] = useState(false);
  // 이 조용히-들어가기가 «회선이 같아서» 걸린 것인가(소리로 잡은 게 아니라) — 안내 문구가 달라진다
  const [quietByNetwork, setQuietByNetwork] = useState(false);
  // 자동으로 껐을 때 마이크는 살려 뒀나(= 스피커만 끔). 안내 문구가 달라진다.
  const [micKept, setMicKept] = useState(false);
  const autoMutedRef = useRef(false); // 이번 음소거가 자동(하울링)으로 걸린 것인가
  // 사람이 자동 음소거를 한 번이라도 되돌렸나.
  //
  // ⚠️ 여기서 두 번 헤맸다. 처음엔 boolean 「되돌리면 그 회의 내내 자동 차단 정지」였다 —
  //    되돌리기는 말을 하려면 필수라 사실상 매 회의가 자동 차단 없이 돌았다.
  //    그다음엔 「1분 쿨다운」으로 바꿨는데 그것도 틀렸다 (2026-08-04 PO:
  //    *"웅웅웅웅 하울링을 1분이나 누가 기다려 차라리 나가버리고 말지"*). 맞는 말이다 —
  //    하울링은 초 단위로 못 견디는 소리다. 「기다림」이 답일 수가 없다.
  //
  // → 기다리지 않는다. 되돌린 뒤 하울링이 다시 확정되면 **즉시** 끄되,
  //   이번엔 **스피커만** 끄고 마이크는 살려 둔다. 되돌리기 버튼을 누른 사람의 뜻은
  //   «말을 하고 싶다»이지 «웅웅 소리를 듣고 싶다»가 아니기 때문이다.
  //   하울링 순환(내 스피커 → 방 공기 → 옆 기기 마이크)은 **스피커 한쪽만 빼도 끊긴다** —
  //   마이크를 살려 둬도 소리는 즉시 조용해지고, 조용해졌으니 다시 발동하지도 않는다
  //   (껐다 켰다 깜빡임 없음). 같은 방의 다른 기기 스피커로 상대 목소리는 계속 들린다.
  const undoneRef = useRef(false);

  const { sameRoomWith, feedbackOnset, feedbackPeers } = useSameRoomDetect({
    localTrack,
    remoteTracks,
    enabled: !!localTrack && !dismissed && !screenOnly,
  });

  /**
   * 이 기기를 "화면 전용"으로 — 내 마이크를 끄고 이 기기 스피커도 침묵시킨다.
   * (하울링 순환은 «내 마이크»와 «내 스피커»를 둘 다 빼야 끊긴다.)
   *
   * ⚠️ 스피커를 «소리 크기 0»으로 죽인다 — 트랙 수신 자체를 끊으면(setEnabled(false))
   *    안 된다. 그건 서버에 «이 트랙 보내지 마»라고 알리는 명령이라 소리 데이터가 아예
   *    안 온다 → 그 데이터로 만들던 **자막이 같이 죽는다**. 그런데 이 기기는 바로
   *    «소리는 끄고 자막만 읽는» 기기다(PO 실사용 방식). 소리 데이터는 계속 받고
   *    스피커만 침묵시켜야 «조용한데 자막은 나오는» 상태가 된다.
   *    (2026-07-29 자가감사에서 발견 — 예전 코드는 수신을 끊어 자막까지 죽였다.)
   * @param {boolean} off  true=끄기, false=되돌리기
   * @param {boolean} [keepMic]  true 면 스피커만 끄고 마이크는 살려 둔다(되돌린 뒤 재발동용).
   *   하울링 순환은 스피커 한쪽만 빼도 끊기므로, 말할 권리를 뺏지 않고도 소리는 잡힌다.
   */
  const setScreenOnly = async (off, keepMic = false) => {
    // ⚠️ 마이크와 스피커를 **각각** 감싼다. 예전엔 한 try 안에 둘 다 있어서
    //    setMicrophoneEnabled 이 튕기면(권한·기기 점유) 아래 스피커 침묵이 통째로 안 돌았다
    //    → 배너는 「소리 껐어요」라는데 스피커가 계속 울린다(2026-08-03 PO: "마이크는 끄는데
    //    정작 스피커를 꺼야 하울링이 없어지는 것 같다"). 하울링 순환은 스피커만 빼도 끊긴다.
    if (!(off && keepMic)) {
      try {
        await room?.localParticipant?.setMicrophoneEnabled(!off);
      } catch {
        /* 마이크 실패해도 스피커는 반드시 끈다 — 그쪽이 하울링을 끊는다 */
      }
    }
    try {
      for (const p of room?.remoteParticipants?.values?.() ?? []) {
        silenceParticipant(p, off ? 0 : 1);
      }
    } catch {
      /* 실패해도 상태만 바꾼다 — 사용자는 하단 버튼으로 수동 조작 가능 */
    }
    setMicKept(off ? keepMic : false);
    setScreenOnly_(off);
  };

  // 조용히 들어간 뒤 «나중에 들어온 사람»의 소리는 기본값(1)로 시작한다 → 그 사람 목소리만
  // 스피커로 새어 나와 하울링이 되살아난다. 침묵 상태인 동안엔 새로 붙는 사람에게도 0을 건다.
  useEffect(() => {
    if (!screenOnly || !room) return;
    const silence = () => {
      for (const p of room.remoteParticipants?.values?.() ?? []) silenceParticipant(p, 0);
    };
    silence();
    const events = [
      RoomEvent.ParticipantConnected,
      RoomEvent.TrackSubscribed,
      RoomEvent.Reconnected,
    ];
    events.forEach((e) => room.on(e, silence));
    return () => events.forEach((e) => room.off(e, silence));
  }, [screenOnly, room]);

  // ⚠️ 내 마이크는 «끄고 나서 도로 켜진다» — 그 자리를 막는다.
  // LiveKit 리액트 컴포넌트는 `audio={true}` 일 때 **접속이 끝난 뒤**(SignalConnected)에
  // `setMicrophoneEnabled(true)` 로 마이크를 올린다. 그런데 회선 판정(①번 방어선)은 방이
  // 붙기 «전»에 이미 돌아서 `setMicrophoneEnabled(false)` 를 부른다 — 그 시점엔 올라온 트랙이
  // 없어 아무 일도 안 일어나고(livekit 이 «끄고 싶다»를 기억하지 않는다), 잠시 뒤 마이크가
  // 그냥 켜진다. 결과: 배너는 「소리를 껐어요」라는데 **마이크는 살아서 송신 중** —
  // 하울링의 절반(내 마이크 → 상대 스피커)이 그대로 남고, 사용자는 꺼진 줄 안다(privacy).
  //   → 마이크가 «실제로 올라오는» 순간에 한 번 더 끈다.
  // ponytail: 딱 한 번만 끈다. 매번 끄면 사람이 마이크 버튼을 눌러도 그 자리에서 도로
  //   꺼져 버튼이 먹통이 된다. 천장: 재접속으로 마이크가 다시 올라오면 안 잡는다 —
  //   그때 필요해지면 「되돌리기 뒤 다시 끄기」가 아니라 여기에 재접속 이벤트를 더해라.
  useEffect(() => {
    if (!screenOnly || micKept || !room) return; // 마이크를 일부러 살려 둔 모드면 끄면 안 된다
    const muteOnce = createMicMuteOnce(room);
    room.on(RoomEvent.LocalTrackPublished, muteOnce);
    return () => room.off(RoomEvent.LocalTrackPublished, muteOnce);
  }, [screenOnly, micKept, room]);

  // ── ①번 방어선: 같은 인터넷 회선이면 «울리기 전에» 조용히 들어간다 ──
  // 하울링은 «마이크 하나 + 스피커 하나»가 같은 방에 있으면 난다 — 두 대로 충분하다
  // (A 마이크 → 인터넷 → B 스피커 → 방 공기 → 다시 A 마이크). 그래서 소리를 듣고 잡으려면
  // 이미 울린 뒤다. 회선이 같다는 건 입장하는 «순간» 알 수 있으니 그 앞에서 끊는다.
  // 한계: 한 대는 사무실 와이파이, 한 대는 폰 데이터면 회선이 갈려 이걸론 못 잡는다
  //   → 그 경우는 아래 소리 감지가 예비로 남는다.
  useEffect(() => {
    // 회선 판정은 «입장 순간의 한 번뿐인 판단»이다. 사람이 그걸 되돌렸으면 그 뜻을 존중하고
    // 다시 걸지 않는다(되돌리자마자 도로 꺼지면 버튼이 먹통으로 느껴진다). 그 뒤로는
    // 진짜 하울링이 났을 때만 아래 ②번이 잡는다.
    if (sameNetworkPeers < 1 || screenOnly || undoneRef.current) return;
    autoMutedRef.current = true;
    setQuietByNetwork(true);
    setScreenOnly(true);
    // setScreenOnly 는 매 렌더 새로 생기지만 재실행 불필요 → deps 제외(기존 파일 관례)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sameNetworkPeers, screenOnly]);

  // ── ②번 방어선: 구글미트식 자동 음소거 (소리로 하울링을 잡았을 때) ──
  // '남길 한 대'는 같은 방 그룹 전체에서 identity 사전순 **최소** 하나다 — 모든 기기가 같은
  // 그룹을 보고 같은 계산을 하므로 정확히 한 대만 남는다.
  //   ⚠️ 예전 규칙(`내 id > 상대 id` 하나만 비교)은 **두 대일 때만** 맞았다. 2026-07-29 실회의는
  //   같은 사무실에서 3대가 들어왔는데(admissions 로 확인: 같은 IP 3명), 그때 A<B<C 중 A 는
  //   «B 하나»만 감지하면 안 끄고, C 도 «A 하나»만 감지하면 끄는 식으로 판정이 감지 순서에
  //   좌우돼 두 대가 살아남을 수 있었다 → 하울링이 그대로 남는다("아직도 하울링이 개선 안 됨").
  // LiveKit joinedAt 은 participantInfo 가 잠깐 없을 때 'new Date()'(현재시각)를 돌려줘
  // 오판 소지가 있어 안 쓴다(독립리뷰 #2).
  //
  // 기다림은 없다. 하울링이 확정되면(1단 ~0.4초 / 2단 ~0.8초) 그 자리에서 끈다.
  // 되돌린 뒤 다시 확정되면 이번엔 스피커만 끈다 — 위 undoneRef 주석 참고.
  const peerKey = feedbackPeers.join(",");
  useEffect(() => {
    if (!feedbackOnset || screenOnly || dismissed) return;
    const myId = room?.localParticipant?.identity ?? "";
    const group = peerKey ? peerKey.split(",") : sameRoomWith ? [sameRoomWith] : [];
    if (!group.length) return;
    const keeper = [myId, ...group].sort()[0]; // 이 한 대만 소리를 유지한다
    if (myId !== keeper) {
      autoMutedRef.current = true;
      setScreenOnly(true, undoneRef.current);
    }
    // setScreenOnly 는 매 렌더 새로 생기지만 재실행 불필요 → deps 제외(기존 파일 관례)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedbackOnset, sameRoomWith, peerKey, screenOnly, dismissed, room]);

  // 소리를 껐으면 "되돌리기" 막대를 계속 보여준다.
  // (독립리뷰 지적: 예전엔 끄고 배너가 사라져 **새로고침 말고는 소리를 되살릴 방법이 없었다** —
  //  오탐이거나 실제로는 다른 방이었으면 상담이 그대로 먹통이 된다.)
  if (screenOnly) {
    return (
      <div className="fixed left-1/2 -translate-x-1/2 top-4 z-50 max-w-md w-[92%] rounded-xl bg-gray-900/95 border border-gray-600 shadow-xl p-3 text-sm text-gray-100 flex items-center justify-between gap-3">
        <span className="text-xs text-gray-300">
          {/* 왜 꺼졌는지를 같이 — 이유 없이 소리가 꺼져 있으면 고장으로 읽힌다.
              마이크를 살려 둔 모드는 «말은 되는데 소리만 껐다»를 분명히 알려야 한다. */}
          {micKept
            ? copy.speakerOnlyMutedNote
            : quietByNetwork
              ? copy.sameLineNote
              : copy.sameRoomMutedNote}
        </span>
        <button
          type="button"
          onClick={() => {
            setQuietByNetwork(false);
            setScreenOnly(false);
            // 사람이 한 번이라도 되돌렸다는 사실만 남긴다. 기다리지 않는다 —
            // 하울링이 또 나면 즉시 끄되, 그땐 스피커만 끄고 마이크는 살려 둔다.
            // 수동 경고 배너는 그대로 남아 사람이 언제든 직접 끌 수 있다(독립리뷰 #3/#4).
            if (autoMutedRef.current) {
              autoMutedRef.current = false;
              undoneRef.current = true;
            }
          }}
          className="shrink-0 px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs"
        >
          {copy.sameRoomUndo}
        </button>
      </div>
    );
  }

  // 같은 방 감지 시 경고 배너. 하울링 즉발이면 위 자동 음소거가 identity 로 정한 '끌 한 대'를 끄고,
  // 나머지 한 대(및 자동을 되돌린 기기)는 이 배너로 수동 컨트롤을 갖는다 — 자동이 못 껐을 때(백그라운드
  // 스로틀·되돌림) 무대응 사각을 없앤다(독립리뷰 #3/#4). 자동뮤트는 한 대뿐이라 자동 중복뮤트는 없다.
  if (!sameRoomWith || dismissed) return null;

  return (
    <div className="fixed left-1/2 -translate-x-1/2 top-4 z-50 max-w-md w-[92%] rounded-xl bg-amber-950/95 border border-amber-600 shadow-xl p-3 text-sm text-amber-50">
      <p className="font-semibold mb-1">{copy.sameRoomTitle}</p>
      <p className="text-amber-200/90 text-xs mb-2">{copy.sameRoomBody}</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setScreenOnly(true)}
          className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs"
        >
          {copy.sameRoomAction}
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="px-3 py-1.5 rounded-lg border border-amber-700 text-amber-200 text-xs"
        >
          {copy.sameRoomIgnore}
        </button>
      </div>
    </div>
  );
}
