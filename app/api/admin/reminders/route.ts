/**
 * healwith: 리마인더 발송 큐 목록 — 어드민 전용
 *
 * GET /api/admin/reminders?status=pending|sent|failed|cancelled (생략=전체)
 *
 * 왜(2026-07-02 전수 감사): /admin/reminders 페이지가 브라우저 클라이언트로
 * reminders_scheduled(RLS on·정책 0 = deny-all)를 직접 조회해 영원히 빈 목록이었음.
 * 2026-06-10 P1 이관(브라우저 직쿼리 금지 → 서버 API 경유)에서 누락된 잔존분.
 */
export const runtime = "nodejs";

import { NextRequest, after } from "next/server";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";
import { logPiiAccess } from "@/lib/audit/logPiiAccess";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { decryptMaybe } from "@/lib/security/encryptionV2";

const STATUSES = new Set(["pending", "sent", "failed", "cancelled", "skipped"]);
// 종류 거르기(2026-09-06): 상담 알림·설문·교육·방문 전 케이던스가 한 표에 섞여 «무엇이 나갔나»를 못 봤다.
const TYPES = new Set(["consultation_reminder", "survey_request", "education_content", "pre_visit_followup"]);

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  try {
    let query = (supabaseAdmin as any)
      .from("reminders_scheduled")
      .select("*")
      .order("fire_at", { ascending: false })
      .limit(200);

    const status = request.nextUrl.searchParams.get("status");
    if (status && STATUSES.has(status)) {
      query = query.eq("status", status);
    }
    const type = request.nextUrl.searchParams.get("type");
    if (type && TYPES.has(type)) {
      query = query.eq("reminder_type", type);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[admin/reminders] query error:", error.message);
      return Response.json({ ok: false, error: "query_failed" }, { status: 500 });
    }
    // 저장은 암호문 — 화면(관리자)에서 마스킹해 보여주려면 여기서 풀어 준다.
    // (옛 평문 행은 decryptMaybe 가 그대로 돌려준다)
    const items = (data || []).map((r: any) => ({
      ...r,
      recipient_address: decryptMaybe(r.recipient_address),
    }));
    // 접속기록(법정 의무): 수신 주소(연락처 PII)를 복호화해 보여주는 목록이다.
    after(() =>
      logPiiAccess(request, auth, {
        action: "LIST_INQUIRIES",
        metadata: { screen: "reminders", count: items.length, decrypted: "recipient_address" },
      })
    );

    return Response.json({ ok: true, items });
  } catch (err: any) {
    console.error("[admin/reminders] error:", err.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
