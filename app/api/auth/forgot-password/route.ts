import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

// 비밀번호 재설정 메일 발송 — 캡차(Turnstile) 게이트 + 레이트리밋을 거쳐서만 발송.
// 로그인/가입은 안 건드리고 '비번찾기'에만 캡차를 끼우기 위해 Supabase 프로젝트
// 캡차 대신 이 라우트에서 직접 토큰을 검증한다.
// 응답은 가입 여부와 무관하게 항상 동일(이메일 존재 노출 방지).

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY;

async function verifyTurnstile(token: string, ip: string | null): Promise<boolean> {
  if (!TURNSTILE_SECRET) return true; // 시크릿 미설정 = 캡차 비활성(키 넣기 전 호환)
  try {
    const form = new URLSearchParams({ secret: TURNSTILE_SECRET, response: token });
    if (ip) form.append("remoteip", ip);
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
    });
    const data = (await r.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const ip = getClientIp(request);

  // 같은 IP 1분당 5회 (정상 사용자 충분, 봇 차단)
  const rl = checkRateLimit(ip, { windowMs: 60_000, maxRequests: 5, apiName: "forgot-password" });
  if (!rl.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: { email?: string; captchaToken?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const email = (body.email || "").trim();
  if (!email) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  // 캡차 검증 (시크릿 있을 때만 실제 검증)
  const ok = await verifyTurnstile(body.captchaToken || "", ip);
  if (!ok) return NextResponse.json({ error: "captcha_failed" }, { status: 400 });

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
