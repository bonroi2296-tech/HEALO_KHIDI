/**
 * healwith: 스레드 상태 변경 — staff 전용
 *
 * PATCH /api/portal/threads/:id  Body: { status }
 */
export const runtime = "nodejs";

import { NextRequest, after } from "next/server";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { runPostResolve } from "@/lib/automation/postResolveWorker";
import type { TablesUpdate } from "@/types/database.types";

const VALID_STATUS = ["open", "waiting_coordinator", "waiting_patient", "resolved"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;

  const { id: threadId } = await params;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const status = body?.status;
  if (!status || !VALID_STATUS.includes(status)) {
    return Response.json({ ok: false, error: "invalid_status" }, { status: 400 });
  }

  try {
    // 실DB 표의 모양으로 못박는다 — 없는 칸이 섞이면 여기서 걸린다(Record<string, any> 면 안 걸린다)
    const update: TablesUpdate<"chat_threads"> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === "resolved") update.resolved_at = new Date().toISOString();

    const { error } = await supabaseAdmin
      .from("chat_threads")
      .update(update)
      .eq("id", threadId);

    if (error) {
      console.error("[portal/threads PATCH] error:", error.message);
      return Response.json({ ok: false, error: "update_failed" }, { status: 500 });
    }

    // 자동 패턴 추출 — 어드민 resolve 라우트에만 배선돼 있고 코디가 실제로 쓰는
    // 이 경로엔 빠져 있어 playbook_patterns 가 늘 0건이던 누락 보수(POSTMORTEMS #85).
    // after(): 응답 후에도 함수를 살려 LLM 추출이 잘리지 않게(서버리스 freeze 방지).
    // (postResolveWorker 는 스레드당 1회 중복가드가 있어 재-resolve 해도 안전)
    if (status === "resolved") {
      after(() =>
        runPostResolve(threadId).catch((err) => {
          console.error("[portal/threads PATCH] postResolve background error:", err.message);
        })
      );
    }

    return Response.json({ ok: true, status });
  } catch (err: any) {
    console.error("[portal/threads PATCH] error:", err.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
