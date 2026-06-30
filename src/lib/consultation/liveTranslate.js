/**
 * Gemini Live Translate — 설정 단일 SoR (single source of truth)
 *
 * 무엇: 원격협진방에 "실시간 말→말 통역"(Gemini 3.5 Live Translate)을 붙이기 위한
 *       스위치·상수. 별도 파이썬 통역 에이전트(agents/live-translate/)가 방에 합류해
 *       참가자 언어(`lang` 속성)를 보고 통역 음성 트랙(`tx:<speaker>:<lang>`)과
 *       자막 텍스트 스트림(`lk.translation`)을 만든다.
 *
 * ⚠️ 기본값 = 꺼짐. 이 스위치가 꺼져 있으면 토큰 발급·상담방은 기존과 100% 동일하게
 *    동작한다(기존 브라우저/서버 STT 자막 그대로). 켜는 순간에만 통역 에이전트가
 *    디스패치되고 프론트가 통역 트랙·자막을 구독한다.
 *
 * 오픈 전 "유료 전환만 하면 되게" 하는 3개의 손잡이:
 *   1) 서버 env `LIVE_TRANSLATE_ENABLED=true`  → 토큰 발급 시 통역 에이전트 자동 호출
 *   2) 클라 env `NEXT_PUBLIC_LIVE_TRANSLATE_ENABLED=true` → 상담방 프론트가 통역 구독
 *   3) 통역 에이전트(agents/live-translate)의 `GEMINI_API_KEY` 를 유료 결제된 키로
 *      (무료 키 = 구글 학습 리스크라 실환자 금지. 테스트는 무료 가능. SETUP 문서 참고)
 *
 * 상세 셋업: docs/LIVE_TRANSLATE_SETUP.md
 */

// 통역 에이전트 이름 — 파이썬 워커(agents/live-translate/src/agent.py)의
// agent_name 과 반드시 일치해야 한다. 토큰 발급 시 이 이름으로 디스패치한다.
export const TRANSLATOR_AGENT_NAME = "gemini-translator";

// 참가자가 자기 언어를 방에 알리는 속성 키 (에이전트가 이걸 읽어 통역쌍을 만든다).
export const PARTICIPANT_LANG_ATTR = "lang";

// "통역 불필요"(원음 그대로) 센티넬 — 참가자가 통역을 끄고 싶을 때.
export const NATIVE_LANG = "none";

// 에이전트가 통역 음성 트랙에 붙이는 이름 접두사: `tx:<speaker_identity>:<target_lang>`
export const TRANSLATION_TRACK_PREFIX = "tx:";

// 에이전트가 통역 자막을 흘려보내는 LiveKit 텍스트 스트림 토픽.
export const TRANSLATION_TEXT_TOPIC = "lk.translation";

/** 서버측 스위치 (토큰 발급에서 에이전트 디스패치 여부) */
export function isLiveTranslateEnabledServer() {
  return process.env.LIVE_TRANSLATE_ENABLED === "true";
}

/** 클라측 스위치 (상담방 프론트에서 통역 트랙·자막 구독 여부) */
export function isLiveTranslateEnabledClient() {
  return process.env.NEXT_PUBLIC_LIVE_TRANSLATE_ENABLED === "true";
}

// 방 수명 설정 (공식 예제 기준 — 우리 토큰 TTL(2h)보다 길지만 빈 방은 일찍 닫음).
export const ROOM_EMPTY_TIMEOUT = 60; // 빈 방 60초 후 종료
export const ROOM_DEPARTURE_TIMEOUT = 30; // 마지막 1명 퇴장 후 30초
// PO 결정(2026-07-03): 어떤 상황에서도 인원 제한 두지 않음. 과부하 발생 시 그때 가이드.
//   → 사실상 무제한(LiveKit 플랜 한도가 별개의 실제 천장 — 계정 설정이지 우리 코드 아님).
//   (이 값은 통역 에이전트 켤 때 RoomConfiguration.maxParticipants 로만 쓰임. 평소엔 미적용.)
export const ROOM_MAX_PARTICIPANTS = 1_000_000;
