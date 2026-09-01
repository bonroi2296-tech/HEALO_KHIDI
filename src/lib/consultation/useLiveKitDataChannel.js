/**
 * LiveKit DataChannel 훅
 *
 * 자기 음성 STT 결과를 DataChannel로 다른 참가자에게 전송하고,
 * 상대방이 보낸 STT 결과를 수신해 콜백으로 전달합니다.
 *
 * 프로토콜: JSON { type: "subtitle", text, lang, role, name, ts, interim?, utter?, src?, srcLang? }
 *   src / srcLang = 화자가 «실제로 말한» 원문과 그 언어. 예전엔 번역문(text)만 보내서, 받는
 *   쪽 기록 패널의 원문 칸이 통째로 비었다 — 같은 회의에서 내 발화는 「원어+번역」 두 줄로,
 *   상대 발화는 「번역」 한 줄로 보여 표시가 들쭉날쭉했다(2026-09-01 PO 제보 «어떨 땐 원어
 *   없이 한글만, 어떨 땐 원어랑 섞여»). 구버전 클라는 이 필드를 안 보내므로 예전처럼 동작한다.
 *   name = 화자 표시 이름 (LiveKit 참가자 이름) — 같은 역할이 여럿이어도 자막에서 화자 구분
 *   interim = true 면 "말하는 중" 부분 자막 — 수신측은 화면 슬롯만 갱신하고 기록하지 않는다
 *   (확정 자막이 같은 화자 슬롯을 교체). 구버전 클라는 이 필드를 몰라 확정처럼 표시하지만
 *   해가 없고, 배포 전환기 혼재 시간만 존재하는 케이스.
 *   utter = 화자의 발화 세대 번호 — 번역 큐 밀림으로 '이전 발화 확정'이 '다음 발화 부분'보다
 *   늦게 도착하는 순서 역전을 수신측이 걸러내는 근거(없으면 항상 표시 = 구버전 호환).
 *
 * 사용처: consultation/[id]/page.jsx
 */

"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRoomContext } from "@livekit/components-react";

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
          // 화자 이름 — payload 우선, 없으면(구버전 클라) LiveKit 참가자 이름으로 폴백
          name: msg.name || participant?.name || undefined,
          ts: msg.ts,
          interim: !!msg.interim,
          utter: typeof msg.utter === "number" ? msg.utter : undefined,
          // 화자가 실제로 말한 원문(구버전 클라는 안 보냄 → undefined)
          src: typeof msg.src === "string" && msg.src.trim() ? msg.src : undefined,
          srcLang: typeof msg.srcLang === "string" ? msg.srcLang : undefined,
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
   * @param {object} [opts] — { interim?: boolean } 말하는 중 부분 자막이면 true
   *   { src, srcLang } 화자가 실제로 말한 원문·그 언어 — 받는 쪽 기록 패널의 원문 칸에 들어간다.
   */
  const publishSubtitle = useCallback(
    async (text, lang, role, opts = {}) => {
      if (!room || !ENCODER) return;
      if (!room.localParticipant?.permissions?.canPublishData) return;

      try {
        const msg = JSON.stringify({
          type: SUBTITLE_TYPE,
          text,
          lang,
          role,
          // 화자 이름 자동 첨부 — 게스트는 입장 폼 이름, 스태프는 계정 이름 (토큰에 설정됨)
          name: room.localParticipant?.name || undefined,
          ts: Date.now(),
          ...(opts.interim ? { interim: true } : {}),
          ...(typeof opts.utter === "number" ? { utter: opts.utter } : {}),
          // 원문도 같이 — 이게 없으면 받는 쪽 기록에 원문 칸이 빈 줄로 남는다.
          ...(opts.src ? { src: opts.src, srcLang: opts.srcLang || undefined } : {}),
        });
        const data = ENCODER.encode(msg);
        // ⚠️ livekit-client v2 의 DataPublishOptions 는 { reliable: boolean } 를 받는다.
        // 예전 { kind: DataPacket_Kind.RELIABLE } 형태는 이 버전에 'kind' 필드가 없어
        // 무시되고 reliable=undefined → LOSSY 로 전송됐다(불안정한 CIS 회선에서 자막
        // 패킷이 조용히 유실). 자막은 전달 보장이 필요하므로 reliable:true.
        await room.localParticipant.publishData(data, { reliable: true });
      } catch (err) {
        // DataChannel 실패는 자막 기능이 없는 것으로 graceful degradation
        console.warn("[DataChannel] publish failed:", err?.message);
      }
    },
    [room]
  );

  return { publishSubtitle };
}
