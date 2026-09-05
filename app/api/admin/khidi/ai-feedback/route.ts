/**
 * healwith: AI 피드백 어드민 API
 *
 * GET /api/admin/khidi/ai-feedback
 * - 통계: 👍/👎 비율, 최근 7일 추이, 사유 분포
 * - 👎 메시지 목록 (최신순)
 */

export const runtime = "nodejs";

import { NextRequest, after } from "next/server";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { decryptMaybe } from "@/lib/security/encryptionV2";
import { logPiiAccess } from "@/lib/audit/logPiiAccess";

export async function GET(request: NextRequest) {
  assertSupabaseEnv();

  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  try {
    // 1. 전체 통계
    const { data: stats, error: statsError } = await (supabaseAdmin as any)
      .from("chat_feedback")
      .select("rating, reason_category, created_at");

    if (statsError) {
      console.error("[ai-feedback] stats 조회 실패:", statsError.message);
      return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
    }

    const total = stats?.length ?? 0;
    const positive = stats?.filter((r: any) => r.rating === 1).length ?? 0;
    const negative = stats?.filter((r: any) => r.rating === -1).length ?? 0;

    // 사유 분포 (👎만)
    const reasonCounts: Record<string, number> = {};
    stats?.filter((r: any) => r.rating === -1).forEach((r: any) => {
      const key = r.reason_category || "other";
      reasonCounts[key] = (reasonCounts[key] || 0) + 1;
    });

    // 최근 7일 추이
    const now = new Date();
    const daily7: { date: string; positive: number; negative: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayItems = stats?.filter((r: any) => r.created_at?.startsWith(dateStr)) ?? [];
      daily7.push({
        date: dateStr,
        positive: dayItems.filter((r: any) => r.rating === 1).length,
        negative: dayItems.filter((r: any) => r.rating === -1).length,
      });
    }

    // 2. 👎 메시지 목록 (최근 50건, 메시지 내용 포함)
    const { data: negativeList, error: listError } = await (supabaseAdmin as any)
      .from("chat_feedback")
      .select(`
        id,
        thread_id,
        message_id,
        reason_category,
        comment,
        created_at,
        guest_email
      `)
      .eq("rating", -1)
      .order("created_at", { ascending: false })
      .limit(50);

    if (listError) {
      console.error("[ai-feedback] negative list 조회 실패:", listError.message);
    }

    // 메시지 내용 조회 (message_id 기준)
    const messageIds = (negativeList ?? []).map((f: any) => f.message_id).filter(Boolean);
    const messageContents: Record<string, string> = {};

    if (messageIds.length > 0) {
      // 메시지는 chat_messages 테이블(컬럼: message_text). 과거 코드가 존재하지 않는
      // inquiry_messages(content/role)를 조회해 어드민 화면에 메시지 내용이 통째로
      // 안 떴음 — 조용한 실패(POSTMORTEMS #35 S2). 실재 테이블/컬럼으로 교정 + 에러 표면화.
      const { data: msgData, error: msgError } = await (supabaseAdmin as any)
        .from("chat_messages")
        .select("id, message_text")
        .in("id", messageIds);

      if (msgError) {
        console.error("[ai-feedback] 메시지 내용 조회 실패:", msgError.message);
      }

      (msgData ?? []).forEach((m: any) => {
        messageContents[m.id] = m.message_text ?? "";
      });
    }

    const enrichedList = (negativeList ?? []).map((f: any) => ({
      ...f,
      guest_email: decryptMaybe(f.guest_email),
      message_content: messageContents[f.message_id] ?? null,
    }));

    // 접속기록(법정 의무): 게스트 이메일을 복호화해 보여준다.
    after(() =>
      logPiiAccess(request, auth, {
        action: "LIST_INQUIRIES",
        metadata: { screen: "ai_feedback", decrypted: "guest_email" },
      })
    );

    return Response.json({
      ok: true,
      stats: { total, positive, negative },
      reasonCounts,
      daily7,
      negativeList: enrichedList,
    });
  } catch (err: any) {
    console.error("[ai-feedback] 예외:", err.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
