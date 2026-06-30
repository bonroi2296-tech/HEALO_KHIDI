/**
 * Cron 인증 — CRON_SECRET Bearer 토큰을 상수시간(timing-safe) 비교.
 *
 * 왜 공용화: 일부 cron 라우트가 `token !== secret` 단순비교(타이밍 사이드채널)였고,
 *   일부는 같은 timingSafeEqual 헬퍼를 각자 복붙해 갈라져 있었음 → 단일 소스로 통일(CISO-5).
 *
 * 사용:
 *   import { verifyCronSecret } from "@/lib/security/cronAuth";
 *   if (!verifyCronSecret(request.headers.get("authorization"))) return 401;
 */
import { timingSafeEqual } from "crypto";

export function verifyCronSecret(header: string | null): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  if (!header?.startsWith("Bearer ")) return false;
  const provided = header.slice(7);
  try {
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    // 길이 다르면 timingSafeEqual 이 throw → 길이 동일성 먼저 확인.
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
