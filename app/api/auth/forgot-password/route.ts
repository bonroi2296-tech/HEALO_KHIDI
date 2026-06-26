import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

// 비밀번호 재설정 메일 발송 — 스팸/폭탄 차단을 위해 ①같은 IP ②같은 이메일 횟수제한.
// 응답은 가입 여부와 무관하게 항상 동일(이메일 존재 노출 방지).
// 참고: 최종 방어선은 Supabase 자체의 recover 레이트리밋(주소당 발송 간격 제한).

export async function POST(request: Request) {
  const ip = getClientIp(request);

  // 같은 IP 1분당 5회
  const ipRl = checkRateLimit(ip, { windowMs: 60_000, maxRequests: 5, apiName: "forgot-password-ip" });
  if (!ipRl.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  // 같은 이메일 주소로의 폭탄 차단: 1분당 1회, (윈도우 기준) 시간당 3회 수준.
  // 누가 victim@x.com 으로 막 보내려 해도 1분에 1통만 나감 → 받은편지함 폭탄 불가.
  // ponytail: 인메모리(서버 인스턴스별). 분산환경 정밀제한은 Supabase recover 제한이 담당.
  const emailRl = checkRateLimit(email, { windowMs: 60_000, maxRequests: 1, apiName: "forgot-password-email" });
  if (!emailRl.allowed) {
    // 폭탄 시도여도 사용자에겐 동일 성공 응답(존재/빈도 노출 방지) — 단 메일은 안 보냄
    return NextResponse.json({ ok: true });
  }

  // implicit-flow 클라로 발송 → 메일 링크 token_hash가 pkce_ 없이 발급돼
  // /reset-password의 verifyOtp가 서버에서 바로 검증됨(#392와 동일 원리).
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    request.headers.get("origin") ||
    "https://healwith.co.kr";

  if (url && key) {
    const supabase = createClient(url, key, {
      auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    // 실패해도(가입 안 됨 등) 동일 응답 — 이메일 존재 여부 노출 방지
    await supabase.auth
      .resetPasswordForEmail(email, { redirectTo: `${siteUrl}/reset-password` })
      .catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
