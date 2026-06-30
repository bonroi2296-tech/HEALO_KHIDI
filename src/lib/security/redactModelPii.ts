/**
 * healwith: AI(외부 LLM) 전송 전 PII 마스킹
 *
 * 왜:
 * - 환자 데이터는 한국 리전 + AES-256-GCM(우리 키)으로 저장(주권 확보)되지만,
 *   공개 채팅에서 환자가 직접 타이핑한 자유텍스트는 답변 생성을 위해 외부 LLM
 *   (Google Gemini)으로 전송된다 → DB는 한국·암호화인데 "AI 입력만 국외 평문"이라는
 *   비대칭이 존재했다(데이터 주권 빈틈).
 * - 이메일·전화·주민번호·여권번호 같은 "고신뢰 식별자"는 의료 질의응답에 전혀 필요 없으므로,
 *   모델로 보내기 직전에 가려서(redact) 외부로의 평문 반출을 차단한다.
 *
 * 범위(의도된 한계):
 * - 정규식으로 높은 신뢰도로 잡히는 "구조적 식별자"만 가린다(이메일·전화·주민번호·여권).
 * - 사람 이름은 자유텍스트에서 오탐 위험이 너무 커(병명·일반 단어와 구분 불가) 가리지 않는다.
 *   대신 이름은 의료 답변 품질에 영향이 적고, DB 저장 시점엔 암호화로 보호된다.
 *
 * 🔒 보안: 이 파일은 서버에서만 사용된다(외부 전송 직전 호출).
 */

import "server-only";

// 토큰(대체 문자열) — 모델이 "여기엔 연락처가 있었다"는 맥락은 알되 값은 모르게 한다.
const TOKENS = {
  email: "[연락처:이메일]",
  phone: "[연락처:전화]",
  rrn: "[식별번호]",
  passport: "[여권번호]",
} as const;

// 이메일: 표준 형태. 가장 먼저 가려야 전화/숫자 규칙이 이메일 일부를 오인하지 않는다.
const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

// 주민등록번호류: 6자리-7자리 (예: 900101-1234567)
const KR_RRN_RE = /\b\d{6}-\d{7}\b/g;

// 여권번호류: 영문 1~2자 + 숫자 7~8자 (예: M12345678) — 오탐 줄이려 경계 요구
const PASSPORT_RE = /\b[A-Za-z]{1,2}\d{7,8}\b/g;

// 국제 전화번호: + 로 시작, 구분자(공백·-·.·괄호) 허용, 총 8~16자리 범위.
// + 를 요구해 일반 숫자/금액 오탐을 막는다.
const INTL_PHONE_RE = /\+\d[\d\s().-]{6,16}\d/g;

// 국내(한국·CIS 등) 구분자 있는 전화번호: 0 시작 + (2~3)-(3~4)-(4) 형태.
// 구분자(-·.·공백)를 반드시 요구해 연속 숫자(금액·날짜)와 구분한다.
const LOCAL_PHONE_RE = /\b0\d{1,2}[-.\s]\d{3,4}[-.\s]\d{4}\b/g;

/**
 * 외부 LLM 전송 직전 텍스트에서 고신뢰 식별자(이메일·전화·주민번호·여권)를 토큰으로 치환.
 * 의료 질의의 본문(증상·암종·질문)은 그대로 보존한다.
 */
export function redactModelPii(text: string | null | undefined): string {
  if (!text || typeof text !== "string") return text ?? "";
  return text
    .replace(EMAIL_RE, TOKENS.email)
    .replace(KR_RRN_RE, TOKENS.rrn)
    .replace(INTL_PHONE_RE, TOKENS.phone)
    .replace(LOCAL_PHONE_RE, TOKENS.phone)
    .replace(PASSPORT_RE, TOKENS.passport);
}

type RoleMessage = { role: string; content: string };

/**
 * 대화 메시지 배열의 각 content를 마스킹한 새 배열 반환(원본 불변).
 * 모델로 보내는 messages 에 그대로 사용한다.
 */
export function redactMessagesForModel<T extends RoleMessage>(messages: T[]): T[] {
  if (!Array.isArray(messages)) return messages;
  return messages.map((m) => ({ ...m, content: redactModelPii(m.content) }));
}
