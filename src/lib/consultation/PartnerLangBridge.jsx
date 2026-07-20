"use client";

/**
 * PartnerLangBridge — 상대가 고른 언어를 따라가 "내 말이 나갈 언어"를 자동으로 맞춘다.
 *
 * 왜: 2026-07-20 PO 지적 — "통역은 나를 위한 기능인데 왜 내가 *상대에게 보일 언어*까지 고르나.
 *   상대는 상대가 알아서 설정하면 되는 것 아닌가." 맞는 말이고, 그래서 언어 선택을
 *   «내 언어» 하나로 줄였다. 그러면 **상대에게 보낼 언어는 상대에게서 알아내야** 한다.
 *
 * 출처 우선순위:
 *   ① 방에서 상대가 선언한 `lang` 속성 — 지금 이 순간의 진실. 상대가 도중에 바꿔도 따라간다.
 *   ② (없으면) 세션 DB 의 상대 언어 — 코디가 상담 만들 때 지정한 값. 페이지가 이미 초기값으로 씀.
 *   즉 이 컴포넌트는 ①이 생겼을 때만 덮어쓴다. 상대가 아직 입장 전이면 아무 것도 안 한다.
 *
 * 통역 에이전트(gemini-translator)와 같은 근거(`lang` 속성)를 쓰므로 두 경로가 어긋나지 않는다.
 *
 * ⚠️ LiveKitRoom 내부 전용. 렌더링 없음.
 */

import { useEffect } from "react";
import { useRoomContext } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import { PARTICIPANT_LANG_ATTR, NATIVE_LANG } from "./liveTranslate";

const SUPPORTED = new Set(["ko", "en", "ru", "kz", "zh", "ja"]);

export function PartnerLangBridge({ myLang, onPartnerLang }) {
  const room = useRoomContext();

  useEffect(() => {
    if (!room || typeof onPartnerLang !== "function") return;

    const pick = () => {
      // 사람 참가자만 — 통역 에이전트(agent-*)는 언어의 주인이 아니다.
      for (const p of room.remoteParticipants?.values?.() ?? []) {
        if (p.identity?.startsWith("agent-")) continue;
        const lang = p.attributes?.[PARTICIPANT_LANG_ATTR];
        if (!lang || lang === NATIVE_LANG || !SUPPORTED.has(lang)) continue;
        // 상대가 나와 같은 언어면 보낼 언어를 바꿀 이유가 없다(같은 언어끼리는 통역 불필요).
        if (lang === myLang) continue;
        onPartnerLang(lang);
        return;
      }
    };

    pick();
    const events = [
      RoomEvent.ParticipantAttributesChanged,
      RoomEvent.ParticipantConnected,
      RoomEvent.ParticipantDisconnected,
      RoomEvent.Connected,
    ];
    events.forEach((e) => room.on(e, pick));
    return () => events.forEach((e) => room.off(e, pick));
  }, [room, myLang, onPartnerLang]);

  return null;
}
