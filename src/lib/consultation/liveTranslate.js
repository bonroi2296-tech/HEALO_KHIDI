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

// 참가자가 "나는 지금 통역을 원한다"를 방에 알리는 속성 키 (2026-07-28 신설).
// 봇 퇴장 판정에 쓴다 — 한 명이 껐다고 바로 내보내면 아직 듣고 있는 상대가 끊긴다.
export const INTERPRETER_WANT_ATTR = "voice";
export const INTERPRETER_WANT_ON = "on";

// 에이전트가 통역 음성 트랙에 붙이는 이름 접두사: `tx:<speaker_identity>:<target_lang>`
export const TRANSLATION_TRACK_PREFIX = "tx:";

// 에이전트가 통역 자막을 흘려보내는 LiveKit 텍스트 스트림 토픽.
export const TRANSLATION_TEXT_TOPIC = "lk.translation";

// 통역봇이 «지금 통역이 되고 있나»를 적는 참가자 속성.
// 짝: agents/live-translate/src/config.py 의 TRANSLATOR_STATUS_ATTR — 이름을 바꾸면 둘 다.
//
// 왜 필요한가 (2026-08-28 실측): 봇은 Gemini 연결이 끊기면 조용히 재연결만 반복한다.
// 열쇠를 일부러 망가뜨리고 30초를 돌렸더니 **15번 시도해 전부 실패했는데 화면은
// 「통역 켜짐」 그대로였다.** 사용자는 봇도 있고 스위치도 켜져 있으니 계속 기다린다.
export const TRANSLATOR_STATUS_ATTR = "tx_status";
export const TRANSLATOR_STATUS_FAILING = "failing";

/** 서버측 스위치 (토큰 발급에서 에이전트 디스패치 여부) */
export function isLiveTranslateEnabledServer() {
  return process.env.LIVE_TRANSLATE_ENABLED === "true";
}

/** 클라측 스위치 (상담방 프론트에서 통역 트랙·자막 구독 여부) */
export function isLiveTranslateEnabledClient() {
  return process.env.NEXT_PUBLIC_LIVE_TRANSLATE_ENABLED === "true";
}

// ⚠️ 방 수명 설정 상수(ROOM_EMPTY_TIMEOUT 60 · ROOM_DEPARTURE_TIMEOUT 30 ·
//    ROOM_MAX_PARTICIPANTS 1,000,000)는 2026-07-31 삭제했다. **선언만 돼 있고 저장소 어디서도
//    안 쓰였다** — 우리는 방을 직접 만들지 않고(첫 입장자가 들어올 때 LiveKit 이 자동 생성)
//    토큰에도 방 설정을 안 싣기 때문에, 실제로 적용되는 값은 처음부터 LiveKit 서버 기본값이었다.
//
//    남겨두면 안 되는 이유가 둘:
//    ① 「빈 방 60초」로 설정돼 있다고 읽히지만 사실이 아니다. 평가·인수인계 문서에 이 값을
//       인용하면 그대로 허위 서술이 된다.
//    ② 지금 와서 그대로 «켜면» 오히려 나빠진다 — 상담은 의사가 먼저 들어와 환자를 기다리는
//       구조인데 60초면 환자가 조금만 늦어도 방이 닫힌다. 기본값(더 김)이 우리 쓰임에 맞다.
//
//    방 수명을 정말 우리 값으로 정해야 할 때가 오면, 상수만 되살리지 말고 **토큰 발급 시
//    방 설정을 함께 싣는 경로까지** 만들어라. 그러지 않으면 같은 「죽은 설정」이 반복된다.
//    실제 기본값이 몇 초인지는 LiveKit 대시보드에서 확인할 것(코드에는 근거가 없다).
