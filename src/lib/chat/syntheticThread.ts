/**
 * «사람의 상담»이 아닌 대화(자동 점검·E2E)를 구분한다 — 판사(품질 채점)·코디 긴급알림에서 뺀다.
 *
 * 왜 (2026-09-06 실DB 30일 실측): 채점 83건 중 문제 표시 16건이었는데 **실환자 대화는 0건**이었다.
 *   · 11건 = 8/20 회귀 자가시험(그 뒤 isRegressionTest 로 이미 분리됨)
 *   · 4건  = 매일 도는 `scripts/smoke-chat.mjs` 의 고정 질문(「로그인 안 했는데 저장돼?」) —
 *            판사가 30일 재개(실제 구현)를 환각으로 오판해 **코디에게 긴급알림까지** 보냈다
 *   · 1건  = 야간 E2E `chat-resume-cookie.spec` 의 「E2E 복구 검사 <숫자>」(off_topic)
 *   어드민 품질 화면은 이걸 「문제율 19%」로 보여준다. 진짜 숫자는 0% 다.
 *
 * 식별 방법 둘:
 *   ① 시작 본문 `client_meta.smoke_test === true` — smoke-chat.mjs 가 이미 보낸다.
 *   ② 요청 헤더 `x-healwith-test: <표식>` — 브라우저 E2E 는 본문을 못 고치니(UI 가 만든다) 헤더로.
 *      /api/public/chat/start 가 이걸 `client_meta.synthetic_test` 에 옮겨 적는다.
 * 남이 이 헤더를 붙여도 손해는 「자기 대화가 채점에서 빠진다」뿐이다(비용·권한 무관).
 *
 * ⚠️ 회귀 자가시험(isRegressionTest)과 다르다: 그쪽은 비용 표면(regression_generate)까지 바꾼다.
 *    여기는 판사만 건너뛴다 — 점검 트래픽의 AI 비용은 실서비스 비용에 그대로 남긴다(실제로 실서비스 키로 나간 돈이다).
 */
export const SYNTHETIC_TEST_HEADER = "x-healwith-test";

/** 헤더 값을 표식으로 — 짧은 소문자 토큰만 받는다(로그·DB 에 남으므로 아무 문자열이나 저장하지 않는다). */
export function syntheticTestFromHeader(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  return /^[a-z0-9_-]{1,32}$/.test(v) ? v : null;
}

/** chat_threads.metadata 로 판정. smoke-chat 의 `client_meta.smoke_test` 와 헤더 경유 `synthetic_test` 둘 다. */
export function isSyntheticThread(meta: unknown): boolean {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return false;
  const cm = (meta as { client_meta?: unknown }).client_meta;
  if (!cm || typeof cm !== "object" || Array.isArray(cm)) return false;
  const c = cm as { smoke_test?: unknown; synthetic_test?: unknown };
  return c.smoke_test === true || (typeof c.synthetic_test === "string" && c.synthetic_test.length > 0);
}
