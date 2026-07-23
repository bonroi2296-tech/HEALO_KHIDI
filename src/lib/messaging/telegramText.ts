/**
 * healwith: 텔레그램 발신 텍스트 순수 유틸 (server-only 아님 → vitest 로 잠금)
 *
 * 왜 분리: messaging/telegram.ts 는 server-only(봇 토큰 접근)라 vitest import 불가 —
 * contactGate 분리와 같은 취지로 문자열 로직만 여기서 단위테스트한다.
 */

// AI 응답의 마크다운을 텔레그램용 평문으로 — 텔레그램은 parse_mode 없이 보내면
// **굵게**·`코드`·### 제목이 기호 그대로 노출된다(실기기 확인 2026-07-23, PO 지적).
// parse_mode 를 켜는 대신 벗겨내는 이유: 모델 출력의 비대칭 별표가 Markdown 파서를
// 400 으로 터뜨리는 사고 유형을 원천 회피(발신 실패보다 평문이 안전).
export function stripMarkdownForTelegram(text: string): string {
  return (text || "")
    .replace(/\*\*(.+?)\*\*/g, "$1") // **굵게**
    .replace(/__(.+?)__/g, "$1") // __굵게__
    .replace(/`{1,3}([^`]+?)`{1,3}/g, "$1") // `코드`
    .replace(/^#{1,6}\s+/gm, "") // ### 제목
    .replace(/^\s*\*\s+/gm, "• "); // "* " 불릿 → 가운뎃점(하이픈 불릿은 유지)
}

// 텔레그램 sendMessage 본문 하드 리밋(4096자) — 초과 시 분할 전송.
export const TG_MAX_LEN = 4096;

// 4096자 안전 분할 — 가급적 문단/줄 경계에서 자른다(말풍선 중간 절단 방지).
export function splitTelegramText(text: string): string[] {
  const t = (text || "").trim();
  if (!t) return [];
  if (t.length <= TG_MAX_LEN) return [t];
  const parts: string[] = [];
  let rest = t;
  while (rest.length > TG_MAX_LEN) {
    let cut = rest.lastIndexOf("\n", TG_MAX_LEN);
    if (cut < TG_MAX_LEN * 0.5) cut = rest.lastIndexOf(" ", TG_MAX_LEN);
    if (cut < TG_MAX_LEN * 0.5) cut = TG_MAX_LEN;
    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) parts.push(rest);
  return parts;
}
