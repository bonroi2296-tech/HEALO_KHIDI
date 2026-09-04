/**
 * healwith: Admin Chat Threads API
 *
 * POST /api/admin/chat/threads — 새 thread 생성
 * GET  /api/admin/chat/threads — thread 목록 조회
 */

export const runtime = "nodejs";

import { NextRequest, after } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { logPiiAccess } from "@/lib/audit/logPiiAccess";
import { decryptMaybe } from "@/lib/security/encryptionV2";

// AI상담(게스트) 리드의 이름·이메일·전화는 chat/start 에서 AES-256-GCM 암호화 저장된다
// (encryptStringNullable). 복호화 없이 그대로 내보내면 코디 인박스에 암호문이 떠 환자에게
// 연락할 수 없다 = 리드 유실(POSTMORTEMS #13 재발 부류). 읽기 경로에서 복호화한다
// (decryptMaybe: 옛 평문 행은 그대로 통과). 이 엔드포인트는 requireAdminAuth 로 게이트됨.
function decryptThreadGuestPii<T extends Record<string, any>>(row: T): T {
  if (!row) return row;
  return {
    ...row,
    guest_name: decryptMaybe(row.guest_name),
    guest_email: decryptMaybe(row.guest_email),
    guest_phone: decryptMaybe(row.guest_phone),
  };
}

export async function POST(request: NextRequest) {
  assertSupabaseEnv();
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const { inquiry_id, normalized_inquiry_id, subject, metadata = {} } = body;

    const row: Record<string, any> = {
      status: "open",
      subject: subject || null,
      metadata,
    };
    if (inquiry_id) row.inquiry_id = inquiry_id;
    if (normalized_inquiry_id) row.normalized_inquiry_id = normalized_inquiry_id;

    const { data, error } = await (supabaseAdmin as any)
      .from("chat_threads")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      console.error("[POST /api/admin/chat/threads]", error.message);
      return Response.json({ ok: false, error: "insert_failed" }, { status: 500 });
    }

    return Response.json({ ok: true, thread: data });
  } catch (err: any) {
    console.error("[POST /api/admin/chat/threads] Unexpected:", err.message);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  assertSupabaseEnv();
  // 읽기(목록 조회)는 코디네이터도 허용(staff) — AI 챗 리드 모니터. 생성(POST)은 admin 유지.
  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;

  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);
    const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);

    let query = (supabaseAdmin as any)
      .from("chat_threads")
      .select("*", { count: "exact" });

    if (status) query = query.eq("status", status);

    query = query
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) {
      console.error("[GET /api/admin/chat/threads]", error.message);
      return Response.json({ ok: false, error: "query_failed" }, { status: 500 });
    }

    const threads = Array.isArray(data) ? data.map(decryptThreadGuestPii) : data;

    // 접속기록(법정 의무): 게스트 이름·이메일을 복호화해 보여주는 목록이다.
    after(() =>
      logPiiAccess(request, auth, {
        action: "LIST_INQUIRIES",
        metadata: { screen: "chat_threads", count: Array.isArray(threads) ? threads.length : 0 },
      })
    );

    return Response.json({ ok: true, threads, total: count ?? 0 });
  } catch (err: any) {
    console.error("[GET /api/admin/chat/threads] Unexpected:", err.message);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
