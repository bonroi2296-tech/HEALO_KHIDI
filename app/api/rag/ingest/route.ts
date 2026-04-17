/**
 * RAG 인덱싱 트리거 API (admin 전용)
 *
 * ⚠️ 과거 버전은 인증 없이 누구나 호출 가능 → embedding/LLM 비용 DoS + RAG 인덱스 오염.
 *   → requireAdminAuth 로 폐쇄.
 *
 * 런타임: Node.js
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { ingestSources } from "../../../../src/lib/rag/ingest";
import { requireAdminAuth } from "../../../../src/lib/auth/requireAdminAuth";

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));
    const sourceTypes = Array.isArray(body?.sourceTypes)
      ? body.sourceTypes
      : undefined;
    const sourceId = body?.source_id ? String(body.source_id) : undefined;
    const results = await ingestSources(sourceTypes, sourceId);
    return Response.json({ ok: true, results });
  } catch (error: any) {
    return Response.json(
      { ok: false, error: error?.message || "ingest_failed" },
      { status: 500 }
    );
  }
}
