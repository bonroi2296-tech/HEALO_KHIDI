/**
 * ✅ P0 수정: 런타임 명시 (Node.js)
 * 
 * 이유:
 * - DB 관리자 접근 (ingestSources 내부에서 사용)
 * - Edge 런타임에서 발생할 수 있는 예측 불가 오류 방지
 */
export const runtime = "nodejs";

import { ingestSources } from "../../../../src/lib/rag/ingest";

export async function POST(request: Request) {
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
