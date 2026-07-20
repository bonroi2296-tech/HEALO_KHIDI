/**
 * LiveTranslateBridge — Gemini Live Translate 프론트 브릿지 (LiveKitRoom 내부 전용)
 *
 * 무엇: 파이썬 통역 에이전트(agents/live-translate)가 방에서 만든
 *   ① 통역 음성 트랙 `tx:<speaker>:<lang>` 중 "내 언어" 것만 듣고(나머지 언어 트랙·
 *      원음 화자는 음소거),
 *   ② 통역 자막 텍스트 스트림(`lk.translation`)을 기존 자막 UI 로 흘려보낸다.
 *   ③ 내가 말하는 언어를 방에 알린다(`lang` 속성) — 에이전트가 통역쌍을 만드는 근거.
 *
 * ⚠️ 스위치(`NEXT_PUBLIC_LIVE_TRANSLATE_ENABLED`)가 꺼져 있으면 즉시 null 반환 →
 *    렌더·구독·음소거 전부 안 함 = 기존 상담방 동작과 100% 동일. DataChannelBridge 와
 *    같은 패턴(렌더 없는 자식)으로, God 컴포넌트 본체는 거의 안 건드린다.
 *
 * 검증 메모(정직): 캡션(자막) 경로는 저위험. **통역 음성 라우팅(원음 음소거 ↔ 통역
 *    재생 전환)은 실제 2인 통화(아이폰 포함) 라이브 검증이 필요**하다. SETUP 문서 참고.
 */

"use client";

import { useEffect, useRef } from "react";
import { useRoomContext } from "@livekit/components-react";
import { RoomEvent, ConnectionState } from "livekit-client";
import {
  isLiveTranslateEnabledClient,
  PARTICIPANT_LANG_ATTR,
  NATIVE_LANG,
  TRANSLATION_TRACK_PREFIX,
  TRANSLATION_TEXT_TOPIC,
} from "@/lib/consultation/liveTranslate";

/**
 * `tx:<speaker_identity>:<target_lang>` 트랙 이름을 파싱.
 * @returns {{ speaker: string, lang: string } | null}
 */
function parseTxTrackName(name) {
  if (!name || !name.startsWith(TRANSLATION_TRACK_PREFIX)) return null;
  const rest = name.slice(TRANSLATION_TRACK_PREFIX.length); // "<speaker>:<lang>"
  const idx = rest.lastIndexOf(":");
  if (idx <= 0) return null;
  return { speaker: rest.slice(0, idx), lang: rest.slice(idx + 1) };
}

/**
 * @param {object} props
 * @param {string} props.myLang   — 내가 듣고 싶은 언어 (ko/ru/en/kz/zh/ja)
 * @param {string} [props.myRole] — 역할 라벨(자막 표시용)
 * @param {function} props.onRemoteSubtitle — ({ text, lang, role }) => void (기존 자막 UI 재사용)
 */
export function LiveTranslateBridge({ myLang, myRole, onRemoteSubtitle }) {
  const room = useRoomContext();
  const subtitleCbRef = useRef(onRemoteSubtitle);
  // 내 언어로 통역되고 있는 "원음 화자"들 — 이들은 원음을 음소거(통역과 이중 재생 방지).
  const mutedSpeakersRef = useRef(new Set());

  useEffect(() => {
    subtitleCbRef.current = onRemoteSubtitle;
  }, [onRemoteSubtitle]);

  // 가드: 스위치 꺼짐이면 아무 것도 안 함.
  const enabled = isLiveTranslateEnabledClient();

  // ── 1) 내 언어를 방에 알림 (lang 속성) ──
  // ⚠️ 반드시 **연결 완료 후에** 보낼 것. `setAttributes` 는 서버 ack 를 5초 기다리다
  //    타임아웃하는데, 연결 전에 부르면 그 ack 가 영영 안 와서 조용히 실패한다.
  //    → 그러면 에이전트가 이 사람의 언어를 몰라 **통역쌍 자체를 안 만든다**(기능 전체 무력화).
  //    2026-07-20 프로덕션 실측: 게스트 입장 시 "Request to update local metadata timed out"
  //    경고만 남고 서버 참가자에 attributes 가 통째로 비어 있었다(POSTMORTEMS #100).
  //    재연결 시에도 다시 알린다 — 재협상 과정에서 속성이 유실될 수 있다.
  useEffect(() => {
    if (!enabled || !room || !myLang) return;
    const apply = () => {
      const lp = room.localParticipant;
      if (!lp) return;
      lp.setAttributes({ [PARTICIPANT_LANG_ATTR]: myLang || NATIVE_LANG }).catch(
        (e) => console.warn("[LiveTranslate] setAttributes lang 실패:", e?.message)
      );
    };
    if (room.state === ConnectionState.Connected) apply();
    room.on(RoomEvent.Connected, apply);
    room.on(RoomEvent.Reconnected, apply);
    return () => {
      room.off(RoomEvent.Connected, apply);
      room.off(RoomEvent.Reconnected, apply);
    };
  }, [enabled, room, myLang]);

  // ── 2) 통역 자막(텍스트 스트림 lk.translation) 수신 → 기존 자막 UI 로 ──
  useEffect(() => {
    if (!enabled || !room) return;
    // livekit-client 2.x 텍스트 스트림 핸들러. 토픽 단위로 1개만 등록 가능.
    if (typeof room.registerTextStreamHandler !== "function") return;

    const handler = async (reader, participantInfo) => {
      try {
        const attrs = reader?.info?.attributes || {};
        // 에이전트가 자막에 붙인 대상 언어. 키 이름은 구현에 따라 다를 수 있어 폭넓게 탐색.
        const targetLang =
          attrs.target_lang || attrs.lang || attrs.targetLang || null;
        // 내 언어 자막만 표시 (대상 언어 정보가 없으면 일단 표시).
        if (targetLang && myLang && targetLang !== myLang) {
          // 다른 언어용 자막 — 스트림은 소비하되 화면엔 안 띄움.
          await reader.readAll().catch(() => {});
          return;
        }
        const text = await reader.readAll();
        if (!text || !String(text).trim()) return;
        subtitleCbRef.current?.({
          text: String(text),
          lang: targetLang || myLang,
          role: participantInfo?.identity || myRole || "interpreter",
        });
      } catch (e) {
        console.warn("[LiveTranslate] 자막 스트림 처리 실패:", e?.message);
      }
    };

    try {
      room.registerTextStreamHandler(TRANSLATION_TEXT_TOPIC, handler);
    } catch (e) {
      // 이미 등록돼 있으면(중복) 무시 — 기존 자막엔 영향 없음.
      console.warn("[LiveTranslate] 텍스트 스트림 핸들러 등록 실패:", e?.message);
      return;
    }
    return () => {
      try {
        room.unregisterTextStreamHandler?.(TRANSLATION_TEXT_TOPIC);
      } catch {
        /* noop */
      }
    };
  }, [enabled, room, myLang, myRole]);

  // ── 3) 통역 음성 트랙 라우팅 ──
  // 내 언어(`tx:*:<myLang>`) 트랙만 재생, 그 화자의 원음은 음소거.
  // 다른 언어용 `tx:*` 트랙은 구독 해제(불필요한 대역폭·이중 음성 방지).
  useEffect(() => {
    if (!enabled || !room) return;

    const muteSpeaker = (identity, mute) => {
      const p = room.getParticipantByIdentity?.(identity);
      if (!p || typeof p.setVolume !== "function") return;
      try {
        p.setVolume(mute ? 0 : 1);
      } catch {
        /* noop */
      }
    };

    const onSubscribed = (_track, publication, participant) => {
      const parsed = parseTxTrackName(publication?.trackName);
      if (!parsed) return; // 통역 트랙이 아니면 무시(원음·화면공유 등 기존대로).
      if (parsed.lang === myLang) {
        // 내 언어 통역 → 재생 유지(RoomAudioRenderer 가 출력). 그 화자 원음은 음소거.
        if (!mutedSpeakersRef.current.has(parsed.speaker)) {
          mutedSpeakersRef.current.add(parsed.speaker);
          muteSpeaker(parsed.speaker, true);
        }
      } else {
        // 다른 언어 통역 트랙 → 내겐 불필요. 구독 해제(이중 음성 방지).
        try {
          publication.setSubscribed?.(false);
        } catch {
          /* noop */
        }
        void participant;
      }
    };

    const onUnsubscribed = (_track, publication) => {
      const parsed = parseTxTrackName(publication?.trackName);
      if (!parsed || parsed.lang !== myLang) return;
      // 내 언어 통역이 끊기면 그 화자 원음 음소거 해제.
      if (mutedSpeakersRef.current.has(parsed.speaker)) {
        mutedSpeakersRef.current.delete(parsed.speaker);
        muteSpeaker(parsed.speaker, false);
      }
    };

    room.on(RoomEvent.TrackSubscribed, onSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, onUnsubscribed);
    return () => {
      room.off(RoomEvent.TrackSubscribed, onSubscribed);
      room.off(RoomEvent.TrackUnsubscribed, onUnsubscribed);
      // 정리: 음소거했던 화자 원음 복구.
      for (const id of mutedSpeakersRef.current) muteSpeaker(id, false);
      mutedSpeakersRef.current.clear();
    };
  }, [enabled, room, myLang]);

  return null; // 렌더링 없음 (DataChannelBridge 와 동일 패턴)
}
