import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimitPersistent, getClientIp } from "@/lib/rateLimit";
import { sendEmail } from "@/lib/email/sendEmail";
import { siteUrl } from "@/lib/siteUrl";

// 비밀번호 재설정 메일 발송 — 스팸/폭탄 차단을 위해 ①같은 IP ②같은 이메일 횟수제한.
// 응답은 가입 여부·가입수단과 무관하게 항상 동일(이메일 존재 노출 방지).
//
// 정교화(2026-06-26): 구글 등 소셜로만 가입한 계정은 비밀번호가 없어 재설정 메일이 무의미.
//   → 그런 계정엔 재설정 메일 대신 "소셜 로그인을 쓰세요" 안내 메일을 보낸다.
//   화면 응답은 동일하게 유지하므로 enumeration(계정 떠보기) 노출 없음 — 본인 메일함에서만 확인.

// 소셜(구글 등)로만 가입 = email 로그인수단(identity)이 없음 = 비밀번호 없음.
function isSocialOnly(identities: Array<{ provider?: string }> | null | undefined) {
  return !(identities || []).some((i) => i?.provider === "email");
}

// ⚠️ 이 안내가 가리키는 「Google로 로그인」 버튼은 **스토어 앱 안에서는 잠겨 있다**(2026-08-29).
//    앱은 구글을 앱 밖 브라우저로 내보내는데 PKCE 검증값이 안 따라가서 교환이 깨지기 때문이다
//    (이유·증거 = src/components/auth/GoogleInAppNotice.jsx). 메일은 앱/웹을 구분할 수 없으므로
//    «폰 브라우저에서 열어라»를 같이 적는다 — 안 그러면 앱 사용자는 잠긴 버튼 앞에서 끝난다.
//    네이티브 구글 로그인이 붙으면 이 경고 줄을 지워라.
function socialHintHtml(loginUrl: string) {
  return `<div style="font-family:system-ui,-apple-system,'Apple SD Gothic Neo',sans-serif;max-width:480px;margin:0 auto;color:#1f2937;line-height:1.6">
  <h2 style="font-size:18px;margin:0 0 12px">구글 계정으로 로그인해 주세요</h2>
  <p style="margin:0 0 8px">비밀번호 재설정을 요청하셨지만, 회원님은 <b>구글 계정으로 가입</b>하셔서 별도의 비밀번호가 없습니다.</p>
  <p style="margin:0 0 8px">로그인 화면에서 <b>'Google로 로그인'</b> 버튼을 눌러 그대로 들어오시면 됩니다.</p>
  <p style="margin:0 0 16px;color:#b45309;font-size:14px">⚠️ 힐위드 <b>앱</b>에서는 Google 로그인이 아직 안 됩니다 — 아래 버튼을 <b>폰 브라우저(크롬·사파리)</b>에서 열어 주세요.</p>
  <p style="margin:0 0 24px"><a href="${loginUrl}" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600">로그인하러 가기</a></p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
  <h3 style="font-size:15px;margin:0 0 8px;color:#374151">Sign in with Google</h3>
  <p style="margin:0 0 8px;color:#6b7280;font-size:14px">You requested a password reset, but your account was created with <b>Google sign-in</b>, so it has no password.</p>
  <p style="margin:0 0 8px;color:#6b7280;font-size:14px">Just click <b>"Sign in with Google"</b> on the login page: <a href="${loginUrl}" style="color:#0d9488">${loginUrl}</a></p>
  <p style="margin:0;color:#b45309;font-size:14px">⚠️ Google sign-in does not work inside the healwith <b>app</b> yet — please open the link in your phone's browser (Chrome/Safari).</p>
</div>`;
}

function socialHintText(loginUrl: string) {
  return [
    "구글 계정으로 로그인해 주세요",
    "",
    "비밀번호 재설정을 요청하셨지만, 회원님은 구글 계정으로 가입하셔서 별도의 비밀번호가 없습니다.",
    "로그인 화면에서 'Google로 로그인' 버튼을 눌러 들어오시면 됩니다.",
    "⚠️ 힐위드 앱에서는 Google 로그인이 아직 안 됩니다 — 아래 주소를 폰 브라우저(크롬·사파리)에서 열어 주세요.",
    loginUrl,
    "",
    "— Sign in with Google —",
    "Your account was created with Google sign-in, so it has no password.",
    `Click "Sign in with Google" on the login page: ${loginUrl}`,
    "Note: Google sign-in does not work inside the healwith app yet — open the link in your phone's browser.",
  ].join("\n");
}

export async function POST(request: Request) {
  const ip = getClientIp(request);

  // 같은 IP 1분당 5회 — DB 기반(cross-isolate). 인메모리는 서버 인스턴스마다
  // 카운터가 따로 돌아 인스턴스가 늘어난 만큼 상한이 곱해진다.
  const ipRl = await checkRateLimitPersistent(ip, { windowMs: 60_000, maxRequests: 5, apiName: "forgot-password-ip" });
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

  // 같은 이메일 주소로의 폭탄 차단: 1분당 1회.
  // 누가 victim@x.com 으로 막 보내려 해도 1분에 1통만 나감 → 받은편지함 폭탄 불가.
  // 2026-08-13: 인메모리(인스턴스별) → DB 기반으로 교체. 인스턴스가 N대면 1분에 N통까지
  // 나갈 수 있었다(상한 1회가 사실상 N회). 이제 몇 대가 뜨든 정확히 1분 1통.
  const emailRl = await checkRateLimitPersistent(email, { windowMs: 60_000, maxRequests: 1, apiName: "forgot-password-email" });
  if (!emailRl.allowed) {
    // 폭탄 시도여도 사용자에겐 동일 성공 응답(존재/빈도 노출 방지) — 단 메일은 안 보냄
    return NextResponse.json({ ok: true });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // 기준 주소는 siteUrl() 하나로 — origin/env 폴백 금지. 재설정 링크가 배포 임시주소
  // (.vercel.app)로 나가면 Supabase redirect 허용목록 밖이라 실패하거나 피싱처럼 보인다.
  const baseUrl = siteUrl();

  // 가입수단 판별(service_role). 실패하면 일반 재설정 흐름으로 폴백(안전).
  // ponytail: 수십명 규모라 전수 조회. 수천명 되면 auth.users 직접 조회 RPC로 교체.
  let socialOnly = false;
  if (url && serviceKey) {
    try {
      const admin = createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      // listUsers() user 항목이 never로 추론되는 Supabase 타입 이슈 회피(set-admin.ts와 동일)
      const u = (data?.users || []).find((x: any) => (x.email || "").toLowerCase() === email);
      if (u && isSocialOnly(u.identities)) socialOnly = true;
    } catch {
      /* 판별 실패 → 아래 일반 재설정 흐름 */
    }
  }

  if (socialOnly) {
    // 소셜 가입자 → 재설정 메일 대신 '소셜 로그인 쓰세요' 안내(본인 메일함에서만 확인)
    await sendEmail({
      to: email,
      subject: "[healwith] 비밀번호 없이 로그인하세요 / Sign in with Google",
      html: socialHintHtml(`${baseUrl}/login`),
      text: socialHintText(`${baseUrl}/login`),
      tags: { type: "forgot_password_social_hint" },
    }).catch(() => {});
    return NextResponse.json({ ok: true });
  }

  // 일반 이메일 계정(또는 미가입·판별불가) → 평소대로 재설정 메일.
  // 미가입이면 Supabase가 메일을 보내지 않음(존재 여부 노출 방지 유지).
  // implicit-flow 클라로 발송 → 메일 링크 token_hash가 pkce_ 없이 발급돼
  // /reset-password의 verifyOtp가 서버에서 바로 검증됨(#392와 동일 원리).
  if (url && anonKey) {
    const supabase = createClient(url, anonKey, {
      auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    await supabase.auth
      .resetPasswordForEmail(email, { redirectTo: `${baseUrl}/reset-password` })
      .catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
