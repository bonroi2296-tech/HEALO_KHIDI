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

/**
 * «내 말이 나갈 언어» 고르기 — 가장 많은 사람이 쓰는 언어, 동수면 언어 코드 사전순.
 * 사전순 고정이 중요하다: 모든 기기가 같은 답을 내야 자막 언어가 서로 어긋나지 않는다.
 * 단위시험 대상이라 export (실통화 없이 검증 가능한 층).
 * @param {Map<string, number>} counts 언어코드 → 그 언어를 쓰는 사람 수
 */
export function pickPartnerLang(counts) {
  let best = null;
  for (const [lang, n] of counts) {
    if (!best || n > best.n || (n === best.n && lang < best.lang)) best = { lang, n };
  }
  return best?.lang || null;
}

export function PartnerLangBridge({ myLang, onPartnerLang }) {
  const room = useRoomContext();

  useEffect(() => {
    if (!room || typeof onPartnerLang !== "function") return;

    const pick = () => {
      // ⚠️ 예전엔 «맨 먼저 발견되는 다른 언어»를 골랐다. 2:1 통화에선 맞지만 3명 이상이면
      //    깨진다(2026-07-29 자가감사): 참가자 목록의 순서는 보장이 없어서, 같은 방에
      //    러시아어·영어 사용자가 섞여 있으면 내 말이 나갈 언어가 **아무 때나 뒤바뀐다**.
      //    그날 회의 기록에도 러시아어와 영어가 같이 있었다(en 70줄 · ru 299줄).
      //    → «가장 많은 사람이 쓰는 다른 언어»를 고르고, 동수면 언어 코드 사전순으로
      //      고정한다(모든 기기가 같은 답을 내야 자막이 서로 어긋나지 않는다).
      const counts = new Map();
      for (const p of room.remoteParticipants?.values?.() ?? []) {
        // 사람 참가자만 — 통역 에이전트(agent-*)는 언어의 주인이 아니다.
        if (p.identity?.startsWith("agent-")) continue;
        const lang = p.attributes?.[PARTICIPANT_LANG_ATTR];
        if (!lang || lang === NATIVE_LANG || !SUPPORTED.has(lang)) continue;
        // 상대가 나와 같은 언어면 보낼 언어를 바꿀 이유가 없다(같은 언어끼리는 통역 불필요).
        if (lang === myLang) continue;
        counts.set(lang, (counts.get(lang) || 0) + 1);
      }
      const best = pickPartnerLang(counts);
      if (best) onPartnerLang(best);
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
