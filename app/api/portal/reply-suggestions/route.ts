/**
 * healwith: 코디 답장 추천 칩 (staff 전용)
 *
 * GET  /api/portal/reply-suggestions?threadId=... → 승인된 playbook_patterns 상위 3개.
 *   상담 종료 시 자동 추출·승인되는 패턴(postResolveWorker)을 AI 챗봇만 쓰고 코디는 못 쓰던
 *   구멍을 메움 — 코디 메시지 입력창 위 칩으로 노출(클릭=입력창 채움, 자동 전송 아님).
 * POST /api/portal/reply-suggestions { patternId } → 사용 횟수 +1 ("단골" 정렬용).
 *
 * ponytail: 정렬은 언어 일치 + usage_count·quality_score 뿐 — 대화 내용 벡터 유사도 매칭은
 * 칩 클릭률이 낮으면 업그레이드(getEmbedding + rag_chunks 재사용 경로 있음).
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";

const SUGGESTION_LIMIT = 3;

async function threadLanguage(threadId: string): Promise<string | null> {
  const { data: thread } = await (supabaseAdmin as any)
    .from("chat_threads")
    .select("normalized_inquiry_id")
    .eq("id", threadId)
    .single();
  if (!thread?.normalized_inquiry_id) return null;
  const { data: ni } = await (supabaseAdmin as any)
    .from("normalized_inquiries")
    .select("language")
    .eq("id", thread.normalized_inquiry_id)
    .single();
  return ni?.language || null;
}

function baseQuery() {
  return (supabaseAdmin as any)
    .from("playbook_patterns")
    .select("id, user_intent, response_template, language, usage_count")
    .eq("status", "approved")
    .eq("is_active", true)
    .order("usage_count", { ascending: false })
    .order("quality_score", { ascending: false })
    .limit(SUGGESTION_LIMIT);
}

export async function GET(request: NextRequest) {
  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;

  try {
    const threadId = request.nextUrl.searchParams.get("threadId");
    const lang = threadId ? await threadLanguage(threadId) : null;

    // 언어를 알면 같은 언어 패턴 우선, 없거나 0건이면 전체에서 단골순.
    let items: any[] = [];
    if (lang) {
      const { data, error } = await baseQuery().eq("language", lang);
      if (error) throw error;
      items = data || [];
    }
    if (items.length === 0) {
      const { data, error } = await baseQuery();
      if (error) throw error;
      items = data || [];
    }

    return Response.json({
      ok: true,
      items: items.map((p) => ({
        id: p.id,
        user_intent: p.user_intent || "",
        response_template: p.response_template || "",
        language: p.language || "en",
        usage_count: p.usage_count ?? 0,
      })),
    });
  } catch (err: any) {
    console.error("[reply-suggestions] GET error:", err.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));
    const patternId = typeof body?.patternId === "string" ? body.patternId : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patternId)) {
      return Response.json({ ok: false, error: "invalid_pattern_id" }, { status: 400 });
    }

    const { error } = await (supabaseAdmin as any).rpc("increment_pattern_usage", {
      p_pattern_id: patternId,
    });
    if (error) throw error;

    return Response.json({ ok: true });
  } catch (err: any) {
    console.error("[reply-suggestions] POST error:", err.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
