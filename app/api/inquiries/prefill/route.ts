/**
 * GET /api/inquiries/prefill — 로그인 사용자의 「지난 접수 정보」로 문의 폼 미리 채우기.
 *
 * 계정에 있는 것(이메일·이름)은 브라우저 세션에서 바로 읽으므로 여기선 다루지 않는다.
 * 국적·전화는 계정에 없고 inquiries 에만 있는데, 이 테이블은 RLS상 service_role 전용 +
 * 이름·전화는 암호화 컬럼이라 서버 경유가 필수다.
 *
 * ⚠️ 왜 「본인이 낸 문의」만 쓰는가 (2026-07-31 실측으로 발견):
 *    계정에 붙은 문의 6건을 전수 대조했더니 **6건 모두 문의서에 적힌 이메일이 계정 이메일과 달랐다**
 *    (코디 Assel 계정 밑에 test@test.com·bonroi2296@gmail.com, agency 계정 밑에 실고객
 *    medextravel.kg@gmail.com 등). 스태프·에이전시가 «환자 대신» 낸 접수라 그렇다.
 *    user_id 만 보고 채우면 **남의 환자 이름·전화가 새 폼에 미리 박힌다** → 두 겹으로 막는다.
 *      ① 스태프·에이전시 계정이면 자동채움 자체를 끈다(그들은 늘 남 대신 쓴다).
 *      ② 그래도 문의서 이메일 == 계정 이메일인 것만 쓴다.
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { resolveAgencyIdForUser } from "@/lib/auth/resolveAgencyIdForUser";
import { decryptStringNullable } from "@/lib/security/encryptionV2";
import { pickOwnInquiry } from "@/lib/inquiry/pickOwnInquiry";

const FIELDS = "first_name, last_name, phone, nationality, preferred_language, email, created_at";

function safeDecrypt(enc: any): string {
  try {
    return decryptStringNullable(enc) || "";
  } catch {
    return "";
  }
}

export async function GET(request: NextRequest) {
  const auth = await requirePortalAuth(request);
  if (!auth.success) return auth.response;

  const target = (auth.email || "").trim().toLowerCase();

  // ① 남 대신 접수하는 계정(관리자·코디·에이전시)은 자동채움 대상이 아니다.
  //    skip 을 내려주면 화면은 계정 이름·이메일도 안 채운다(코디 이름이 환자칸에 박히는 것 방지).
  // ponytail: hospital_users(국내 병원 계정)는 공개 폼으로 접수하는 동선이 없어 안 본다.
  //           그 동선이 생기면 여기에 한 줄 더 붙이면 된다 — ②의 이메일 대조가 이미 한 번 더 막는다.
  const agencyId = await resolveAgencyIdForUser(supabaseAdmin, auth.userId);
  if (auth.isStaff || auth.appRole || agencyId) {
    return Response.json({ ok: true, prefill: null, skip: "staff" });
  }
  if (!target) return Response.json({ ok: true, prefill: null });

  try {
    // 본인 계정에 붙은 접수 + 게스트로 낸 접수(가입 전 동선)를 같이 훑고,
    // ② 문의서에 적힌 이메일이 계정 이메일과 같은 것만 채택한다.
    const [mine, guest] = await Promise.all([
      supabaseAdmin
        .from("inquiries")
        .select(FIELDS)
        .eq("user_id", auth.userId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabaseAdmin
        .from("inquiries")
        .select(FIELDS)
        .is("user_id", null)
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

    const row = pickOwnInquiry([...(mine.data || []), ...(guest.data || [])], target, safeDecrypt);

    if (!row) return Response.json({ ok: true, prefill: null });

    const name = [safeDecrypt(row.first_name), safeDecrypt(row.last_name)]
      .filter(Boolean)
      .join(" ");

    return Response.json({
      ok: true,
      prefill: {
        name: name || null,
        phone: safeDecrypt(row.phone) || null,
        nationality: row.nationality || null,
        preferredLanguage: row.preferred_language || null,
      },
    });
  } catch (err: any) {
    console.error("[/api/inquiries/prefill] error:", err.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
