/**
 * healwith: 환자 본인 문의 목록 — 로그인 사용자 전용
 *
 * GET /api/portal/my-inquiries → 본인 문의만.
 * inquiries 는 RLS상 service_role 전용 → 서버 경유 필수.
 * 본인 데이터라 PII 복호화 불필요(요약 필드만 반환).
 *
 * 본인 매칭: ① user_id == 로그인 uid ② 암호화 email 복호화-매칭 폴백.
 * 왜 ②가 필요한가(2026-07-02 전수 감사): 표준 동선이 '게스트로 문의 → 성공화면에서 가입'이라
 * 문의 대부분이 user_id=null. user_id 만 보면 방금 낸 문의가 '내 문의'에 안 떠서
 * 가입 유도 약속("진행 상황 추적")이 거짓이 됨. /api/portal/journey 와 동일 규약(동일인 키=이메일).
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { decryptStringNullable } from "@/lib/security/encryptionV2";

const SELECT_FIELDS =
  "id, nationality, cancer_type, preferred_language, match_accuracy, status, step1_completed_at, step2_completed_at, created_at";

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

  try {
    const { data: byUid, error } = await supabaseAdmin
      .from("inquiries")
      .select(SELECT_FIELDS)
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[portal/my-inquiries] query error:", error.message);
      return Response.json({ ok: false, error: "query_failed" }, { status: 500 });
    }

    // 이메일 복호화-매칭 폴백 (IV 랜덤이라 eq 쿼리 불가 → 최근분 끌어와 서버에서 대조, 파일럿 규모)
    const target = (auth.email || "").trim().toLowerCase();
    let byEmail: any[] = [];
    if (target) {
      const { data: recent } = await supabaseAdmin
        .from("inquiries")
        .select(SELECT_FIELDS + ", email, user_id")
        .is("user_id", null)
        .order("created_at", { ascending: false })
        .limit(500);
      byEmail = (recent || []).filter(
        (i: any) => safeDecrypt(i.email).trim().toLowerCase() === target
      );
    }

    // 병합·중복 제거(id)·최신순 — email/user_id 필드는 응답에서 제거
    const seen = new Set<number>();
    const items = [...(byUid || []), ...byEmail]
      .filter((i: any) => (seen.has(i.id) ? false : (seen.add(i.id), true)))
      .map(({ email: _e, user_id: _u, ...rest }: any) => rest)
      .sort((a: any, b: any) => String(b.created_at).localeCompare(String(a.created_at)))
      .slice(0, 50);

    return Response.json({ ok: true, items });
  } catch (err: any) {
    console.error("[portal/my-inquiries] error:", err.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
