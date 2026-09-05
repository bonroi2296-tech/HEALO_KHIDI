/**
 * 시크릿 문자열 상수시간(timing-safe) 비교.
 *
 * 왜 공용화: cronAuth.ts 가 CRON_SECRET 라우트만 통일(CISO-5)했고,
 *   INTERNAL_API_SECRET 계열 3개 라우트(translate · pdf/consent · pdf/quotation)는
 *   `!==`/`===` 단순비교(타이밍 사이드채널)로 남아 있었음 → 같은 원칙으로 단일 소스화.
 *   원본은 inquiries/rotate-token 라우트의 로컬 safeEqual 을 승격한 것 (그쪽도 이걸 쓴다).
 *
 * 사용:
 *   import { safeEqual } from "@/lib/security/safeEqual";
 *   if (!safeEqual(request.headers.get("x-internal-secret"), process.env.INTERNAL_API_SECRET)) → 403
 *
 * ※ `import "server-only"` 는 안 붙임 — 이 모듈 자체는 비밀키에 접근하지 않는다(비교만).
 */
import { timingSafeEqual } from "node:crypto";

export function safeEqual(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  // 한쪽이라도 비어 있으면(미설정 env·헤더 누락) 무조건 불일치 — 빈 값끼리 통과 방지.
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // 길이 다르면 timingSafeEqual 이 throw → 길이 동일성 먼저 확인.
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
