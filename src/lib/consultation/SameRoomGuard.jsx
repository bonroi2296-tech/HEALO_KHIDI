"use client";

/**
 * SameRoomGuard — "같은 공간에 다른 기기가 있어요" 감지 배너 (하울링 방지)
 *
 * 왜: 한 사무실에서 두 대의 PC 로 같은 상담에 들어오면 하울링이 난다(2026-07-20 PO 제보).
 *   WebRTC 에코 제거(AEC)로는 원리적으로 못 막는다 — AEC 는 "내 스피커 → 내 마이크"
 *   되돌이만 지우고, 옆 PC 스피커 소리는 내 마이크 입장에서 그냥 방에서 들린 진짜 소리다.
 *   구글미트도 소리로 풀지 않고 "같은 방인지 감지 → 한쪽 오디오를 끈다"로 푼다. 여기도 같다.
 *
 * 이 컴포넌트가 하는 일: 감지(useSameRoomDetect) + 안내 + **한 번 눌러 이 기기 소리 끄기**.
 *   자동으로 끄지는 않는다 — 오탐 시 사용자가 말 못 하는 상황이 되면 더 나쁘다.
 *   판단은 사람이, 감지와 실행은 기계가.
 *
 * ⚠️ LiveKitRoom 내부에서만 렌더할 것(useRoomContext 사용).
 */

import { useEffect, useMemo, useState } from "react";
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

  const { sameRoomWith } = useSameRoomDetect({
    localTrack,
    remoteTracks,
    enabled: !!localTrack && !dismissed,
  });

  if (!sameRoomWith || dismissed) return null;

  /** 이 기기를 "화면 전용"으로 — 마이크 끄고 상대 음성도 안 듣는다(양방향 차단해야 순환이 끊긴다). */
  const goScreenOnly = async () => {
    try {
      await room?.localParticipant?.setMicrophoneEnabled(false);
      for (const p of room?.remoteParticipants?.values?.() ?? []) {
        for (const pub of p.trackPublications?.values?.() ?? []) {
          if (pub.kind === "audio") pub.setEnabled?.(false);
        }
      }
    } catch {
      /* 실패해도 배너만 닫는다 — 사용자는 수동으로 끌 수 있다 */
    }
    setDismissed(true);
  };

  return (
    <div className="fixed left-1/2 -translate-x-1/2 top-4 z-50 max-w-md w-[92%] rounded-xl bg-amber-950/95 border border-amber-600 shadow-xl p-3 text-sm text-amber-50">
      <p className="font-semibold mb-1">{copy.sameRoomTitle}</p>
      <p className="text-amber-200/90 text-xs mb-2">{copy.sameRoomBody}</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={goScreenOnly}
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
