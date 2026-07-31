/**
 * GET /api/inquiries/prefill — 로그인 사용자의 「지난 접수 정보」로 문의 폼 미리 채우기.
 *
 * 계정에 있는 것(이메일·이름)은 브라우저 세션에서 바로 읽으므로 여기선 다루지 않는다.
 * 국적·전화는 계정에 없고 inquiries 에만 있는데, 이 테이블은 RLS상 service_role 전용 +
 * 이름·전화는 암호화 컬럼이라 서버 경유가 필수다.
 *
 * 본인 매칭 규약은 /api/portal/my-inquiries 와 동일: ① user_id ② 암호화 email 복호화-대조.
 * 표준 동선이 '게스트 접수 → 성공화면에서 가입'이라 지난 문의는 user_id 가 비어 있는 경우가 많다.
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { decryptStringNullable } from "@/lib/security/encryptionV2";

const FIELDS = "first_name, last_name, phone, nationality, preferred_language, created_at";

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
    const { data: byUid } = await supabaseAdmin
      .from("inquiries")
      .select(FIELDS)
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: false })
      .limit(1);

    let row: any = byUid?.[0] || null;

    // 이메일 복호화-대조 폴백 (IV 랜덤이라 eq 쿼리 불가 → 최근분을 끌어와 서버에서 대조, 파일럿 규모)
    const target = (auth.email || "").trim().toLowerCase();
    if (!row && target) {
      const { data: recent } = await supabaseAdmin
        .from("inquiries")
        .select(FIELDS + ", email")
        .is("user_id", null)
        .order("created_at", { ascending: false })
        .limit(500);
      row =
        (recent || []).find(
          (i: any) => safeDecrypt(i.email).trim().toLowerCase() === target
        ) || null;
    }

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
