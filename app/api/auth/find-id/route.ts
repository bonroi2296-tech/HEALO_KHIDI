import "server-only";
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

// 아이디(이메일) 찾기 — 이름 + 생년월일이 정확히 일치하는 계정이 "딱 1명"일 때만
// 가린 이메일을 돌려준다. 의료 플랫폼이라 동명이인·열거 공격에 특히 민감 → 보수적으로:
//  - 0명 또는 2명 이상이면 "못 찾음"(존재 여부 비노출)
//  - 가린 이메일만 반환(전체 주소 노출 안 함)
//  - IP 횟수제한으로 생년월일 무차별 대입 차단
// 생년월일은 가입 시 user_metadata.birthdate(YYYY-MM-DD)에 저장됨(2026-06 추가).

// kimchulsoo@gmail.com → kim***@gmail.com (로컬 앞 3자만, 짧으면 1자)
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const keep = local.length <= 3 ? 1 : 3;
  return local.slice(0, keep) + "***@" + domain;
}

const norm = (s: string) => s.trim().toLowerCase();

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(ip, { windowMs: 60_000, maxRequests: 10, apiName: "find-id" });
  if (!rl.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  let body: { firstName?: string; lastName?: string; birthdate?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const firstName = norm(body.firstName || "");
  const lastName = norm(body.lastName || "");
  const birthdate = (body.birthdate || "").trim(); // YYYY-MM-DD
  if (!firstName || !lastName || !birthdate) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  // service_role 로 계정 메타데이터 조회.
  // ponytail: listUsers 1페이지(perPage 1000) 스캔 — 사용자 수가 그 이하라 충분.
  //           1000명 초과 시 페이지네이션 필요(그땐 birthdate 컬럼+인덱스로 전환).
  const admin = createServiceRoleClient();
  let matches: { email: string; provider: string }[] = [];
  try {
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) {
      const m = (u.user_metadata || {}) as Record<string, unknown>;
      if (
        u.email &&
        norm(String(m.first_name || "")) === firstName &&
        norm(String(m.last_name || "")) === lastName &&
        String(m.birthdate || "").trim() === birthdate
      ) {
        const provider = (u.app_metadata?.provider as string) || "email";
        matches.push({ email: u.email, provider });
      }
    }
  } catch {
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }

  // 정확히 1명일 때만 알려줌 (동명이인·열거 방지)
  if (matches.length !== 1) {
    return NextResponse.json({ found: false });
  }
  return NextResponse.json({
    found: true,
    emailMasked: maskEmail(matches[0].email),
    provider: matches[0].provider, // 'google' 면 구글 로그인 안내
  });
}
