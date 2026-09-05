/**
 * 자막 한 줄을 「어느 길이 만들었나」 — 값 정의의 단일 SoR.
 *
 * 왜 필요한가: 자막 경로가 3개인데 전부 `consultation_translations` 에 같은 모양으로
 * 저장돼 **길별 품질을 실사용에서 잴 수 없었다.** 2026-08-06 실측에서 서버 받아쓰기가
 * 조용한 구간에 없는 말을 지어내는 것이 확인됐는데, 정작 «전체 자막 중 그 길이 몇 %냐»를
 * 셀 수가 없었다(구분 칸 없음 · `confidence` 는 전 구간 0건).
 *
 * ⚠️ 이 값은 **클라이언트가 보낸다** → 서버에서 반드시 `normalizeSttEngine()` 로 거른 뒤
 *    DB 에 넣는다. 모르는 값은 저장하지 않는다(null) — 쓰레기 값이 섞이면 이 칸으로
 *    재는 모든 숫자가 못 쓰게 된다.
 */

export const STT_ENGINES = {
  /** 브라우저 Web Speech API 받아쓰기 → /translate-realtime 번역 */
  BROWSER: "browser_webspeech",
  /** 서버 받아쓰기(Gemini 멀티모달, 전사+번역 1회) → /[id]/stt */
  SERVER: "server_gemini",
  /** 서버 받아쓰기 «전용 모델» 실험(Gemini 3.5 Transcribe, 번역은 Flash) → /[id]/stt, env STT_TRANSCRIBE_MODEL (2026-09-05) */
  SERVER_TRANSCRIBE: "server_transcribe",
  /** 맞장구 사전(받아쓰기는 브라우저, 번역만 사전 매칭) → /[id]/translate */
  BACKCHANNEL: "backchannel_dict",
  /** 실시간 통역 모델의 원문 자막(agents/live-translate) — 아직 기본 꺼짐 */
  LIVE_TRANSLATE: "live_translate",
} as const;

export type SttEngine = (typeof STT_ENGINES)[keyof typeof STT_ENGINES];

const VALID: ReadonlySet<string> = new Set(Object.values(STT_ENGINES));

/** 아는 값이면 그대로, 아니면 null. DB 에 넣기 «전»에 반드시 통과시킬 것. */
export function normalizeSttEngine(raw: unknown): SttEngine | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim();
  return VALID.has(v) ? (v as SttEngine) : null;
}
