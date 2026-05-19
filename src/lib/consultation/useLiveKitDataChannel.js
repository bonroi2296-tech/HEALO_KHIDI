/**
 * LiveKit DataChannel 훅
 *
 * 자기 음성 STT 결과를 DataChannel로 다른 참가자에게 전송하고,
 * 상대방이 보낸 STT 결과를 수신해 콜백으로 전달합니다.
 *
 * 프로토콜: JSON { type: "subtitle", text, lang, role, ts }
 *
 * 사용처: consultation/[id]/page.jsx
 */

"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRoomContext } from "@livekit/components-react";
import { DataPacket_Kind } from "livekit-client";

const SUBTITLE_TYPE = "subtitle";
const ENCODER = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;
const DECODER = typeof TextDecoder !== "undefined" ? new TextDecoder() : null;

/**
 * @param {object} opts
 * @param {function} opts.onRemoteSubtitle - ({ text, lang, role, ts }) => void  — 상대방 자막 수신 시
 */
export function useLiveKitDataChannel({ onRemoteSubtitle } = {}) {
  const room = useRoomContext();
  const callbackRef = useRef(onRemoteSubtitle);

  useEffect(() => {
    callbackRef.current = onRemoteSubtitle;
  }, [onRemoteSubtitle]);

  // 수신 리스너 등록
  useEffect(() => {
    if (!room) return;

    const handleData = (payload, participant) => {
      if (!DECODER) return;
      try {
        const str = DECODER.decode(payload);
        const msg = JSON.parse(str);
        if (msg.type !== SUBTITLE_TYPE) return;
        callbackRef.current?.({
          text: msg.text,
          lang: msg.lang,
          role: msg.role,
          ts: msg.ts,
          participantIdentity: participant?.identity,
        });
      } catch {
        // 파싱 실패는 무시 (다른 DataChannel 메시지일 수 있음)
      }
    };

    room.on("dataReceived", handleData);
    return () => {
      room.off("dataReceived", handleData);
    };
  }, [room]);

  /**
   * 내 STT 결과를 다른 참가자에게 전송
   * @param {string} text
   * @param {string} lang  — "ko" | "ru" | "en" etc.
   * @param {string} role  — "doctor" | "patient" | "coordinator"
   */
  const publishSubtitle = useCallback(
    async (text, lang, role) => {
      if (!room || !ENCODER) return;
      if (!room.localParticipant?.permissions?.canPublishData) return;

      try {
        const msg = JSON.stringify({
          type: SUBTITLE_TYPE,
          text,
          lang,
          role,
          ts: Date.now(),
        });
        const data = ENCODER.encode(msg);
        await room.localParticipant.publishData(data, {
          kind: DataPacket_Kind.RELIABLE,
        });
      } catch (err) {
        // DataChannel 실패는 자막 기능이 없는 것으로 graceful degradation
        console.warn("[DataChannel] publish failed:", err?.message);
      }
    },
    [room]
  );

  return { publishSubtitle };
}
