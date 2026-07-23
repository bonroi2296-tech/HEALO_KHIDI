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
 *   - 하울링 즉발(양쪽 동시 큰 소리, 고신뢰): 구글미트처럼 '나중에 들어온' 쪽이 자동으로
 *     화면 전용 전환(2026-07-23 PO 요청). 오탐 위험 낮은 고신뢰일 때만 자동으로 끈다.
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

export function SameRoomGuard({ copy }) {
  const room = useRoomContext();
  const { localTrack, remoteTracks } = useAudioTracks(room);
  const [dismissed, setDismissed] = useState(false);
  const [screenOnly, setScreenOnly_] = useState(false);
  const autoMutedRef = useRef(false); // 이번 음소거가 자동(하울링)으로 걸린 것인가

  const { sameRoomWith, feedbackOnset } = useSameRoomDetect({
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

  // ── 구글미트식 자동 음소거 (하울링 즉발 시) ──
  // 양쪽이 같은 규칙으로 '나중에 들어온 쪽'을 계산해, 그 한 대만 스스로 화면 전용이 된다
  // (진행 중이던 대화는 살리고, 방금 들어와 하울링을 만든 기기를 끈다 → 중복 뮤트 방지).
  useEffect(() => {
    if (!feedbackOnset || !sameRoomWith || screenOnly || dismissed) return;
    const remote =
      room?.getParticipantByIdentity?.(sameRoomWith) ??
      [...(room?.remoteParticipants?.values?.() ?? [])].find(
        (p) => p.identity === sameRoomWith
      );
    const localJoin = room?.localParticipant?.joinedAt?.getTime?.();
    const remoteJoin = remote?.joinedAt?.getTime?.();
    let iAmNewer;
    if (
      typeof localJoin === "number" &&
      typeof remoteJoin === "number" &&
      localJoin !== remoteJoin
    ) {
      iAmNewer = localJoin > remoteJoin; // 내가 더 늦게 입장 = 하울링 유발한 쪽
    } else {
      // joinedAt 을 못 읽으면 identity 사전순으로 결정론적 타이브레이크(정확히 한쪽만 끔)
      iAmNewer = (room?.localParticipant?.identity ?? "") > sameRoomWith;
    }
    if (iAmNewer) {
      autoMutedRef.current = true;
      setScreenOnly(true);
    }
    // setScreenOnly 는 매 렌더 새로 생기지만 재실행 불필요 → deps 제외(기존 파일 관례)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedbackOnset, sameRoomWith, screenOnly, dismissed, room]);

  // 소리를 껐으면 "되돌리기" 막대를 계속 보여준다.
  // (독립리뷰 지적: 예전엔 끄고 배너가 사라져 **새로고침 말고는 소리를 되살릴 방법이 없었다** —
  //  오탐이거나 실제로는 다른 방이었으면 상담이 그대로 먹통이 된다.)
  if (screenOnly) {
    return (
      <div className="fixed left-1/2 -translate-x-1/2 top-4 z-50 max-w-md w-[92%] rounded-xl bg-gray-900/95 border border-gray-600 shadow-xl p-3 text-sm text-gray-100 flex items-center justify-between gap-3">
        <span className="text-xs text-gray-300">{copy.sameRoomMutedNote}</span>
        <button
          type="button"
          onClick={() => {
            setScreenOnly(false);
            // 자동으로 껐던 걸 사람이 되돌리면, 재판정으로 또 자동 음소거되는 루프를 막는다
            // (사용자가 "그래도 소리 켤래"라고 명시한 것 = 존중). 수동 음소거 되돌리기는 영향 없음.
            if (autoMutedRef.current) {
              autoMutedRef.current = false;
              setDismissed(true);
            }
          }}
          className="shrink-0 px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-600 text-white font-semibold text-xs"
        >
          {copy.sameRoomUndo}
        </button>
      </div>
    );
  }

  // 하울링 즉발(feedbackOnset)은 위 자동 음소거가 처리 중 → 수동 경고 배너는 띄우지 않는다
  // (양쪽 다 "끄세요" 배너가 뜨면 둘 다 꺼버릴 수 있다). 애매한 상관 감지일 때만 경고한다.
  if (!sameRoomWith || dismissed || feedbackOnset) return null;

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
