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
  const autoMutedRef = useRef(false);      // 이번 음소거가 자동(하울링)으로 걸린 것인가
  const autoMuteOptOutRef = useRef(false); // 자동 음소거를 사람이 되돌렸으면 재-자동뮤트 중단(무한루프 방지)

  const { sameRoomWith, feedbackOnset, feedbackPeers } = useSameRoomDetect({
    localTrack,
    remoteTracks,
    enabled: !!localTrack && !dismissed && !screenOnly,
  });

  /**
   * 이 기기를 "화면 전용"으로 — 마이크 끄고 상대 음성도 안 듣는다(양방향 차단해야 순환이 끊긴다).
   * @param {boolean} off  true=끄기, false=되돌리기
   */
  const setScreenOnly = async (off) => {
    try {
      await room?.localParticipant?.setMicrophoneEnabled(!off);
      for (const p of room?.remoteParticipants?.values?.() ?? []) {
        for (const pub of p.trackPublications?.values?.() ?? []) {
          if (pub.kind === "audio") pub.setEnabled?.(!off);
        }
      }
    } catch {
      /* 실패해도 상태만 바꾼다 — 사용자는 하단 버튼으로 수동 조작 가능 */
    }
    setScreenOnly_(off);
  };

  // ── ①번 방어선: 같은 인터넷 회선이면 «울리기 전에» 조용히 들어간다 ──
  // 하울링은 «마이크 하나 + 스피커 하나»가 같은 방에 있으면 난다 — 두 대로 충분하다
  // (A 마이크 → 인터넷 → B 스피커 → 방 공기 → 다시 A 마이크). 그래서 소리를 듣고 잡으려면
  // 이미 울린 뒤다. 회선이 같다는 건 입장하는 «순간» 알 수 있으니 그 앞에서 끊는다.
  // 한계: 한 대는 사무실 와이파이, 한 대는 폰 데이터면 회선이 갈려 이걸론 못 잡는다
  //   → 그 경우는 아래 소리 감지가 예비로 남는다.
  useEffect(() => {
    if (sameNetworkPeers < 1 || screenOnly || autoMuteOptOutRef.current) return;
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
  // 오판 소지가 있어 안 쓴다(독립리뷰 #2). 되돌리면 autoMuteOptOut 으로 재-자동뮤트를 멈춘다.
  const peerKey = feedbackPeers.join(",");
  useEffect(() => {
    if (!feedbackOnset || screenOnly || dismissed || autoMuteOptOutRef.current) return;
    const myId = room?.localParticipant?.identity ?? "";
    const group = peerKey ? peerKey.split(",") : sameRoomWith ? [sameRoomWith] : [];
    if (!group.length) return;
    const keeper = [myId, ...group].sort()[0]; // 이 한 대만 소리를 유지한다
    if (myId !== keeper) {
      autoMutedRef.current = true;
      setScreenOnly(true);
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
          {/* 회선이 같아서 끈 경우엔 «왜» 를 같이 — 이유 없이 소리가 꺼져 있으면 고장으로 읽힌다 */}
          {quietByNetwork ? copy.sameLineNote : copy.sameRoomMutedNote}
        </span>
        <button
          type="button"
          onClick={() => {
            setQuietByNetwork(false);
            setScreenOnly(false);
            // 자동으로 껐던 걸 사람이 되돌리면 재-자동뮤트만 멈춘다(수동 경고 배너는 남겨 컨트롤 유지 —
            // 되돌린 뒤 하울링이 계속돼도 사람이 다시 끌 수단이 있어야 한다, 독립리뷰 #3/#4).
            if (autoMutedRef.current) {
              autoMutedRef.current = false;
              autoMuteOptOutRef.current = true;
            }
          }}
          className="shrink-0 px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-600 text-white font-semibold text-xs"
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
