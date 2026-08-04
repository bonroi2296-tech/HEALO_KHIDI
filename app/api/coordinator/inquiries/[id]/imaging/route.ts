/**
 * healwith: 병원 CD(CT) 묶음 보기 — 코디(staff) 창구
 *
 * POST /api/coordinator/inquiries/[id]/imaging  { path }
 *   → { series, urls, docs, skipped, extras }   (두 번째부터는 만들어 둔 걸 그대로)
 *
 * 실제 준비는 src/lib/imaging/prepareStudy.ts 가 한다 — 의료진(소견 링크) 창구와 같은 부품이다.
 * 여기서 하는 일은 «누구인지»와 «자기 문의의 파일인지»를 가리는 것뿐.
 */
export const runtime = "nodejs";
export const maxDuration = 300;

import { NextRequest } from "next/server";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { prepareStudy } from "@/lib/imaging/prepareStudy";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!id || !/^\d+$/.test(id)) return Response.json({ ok: false, error: "invalid_id" }, { status: 400 });

  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;

  try {
    const { path, series } = await request.json();
    if (typeof path !== "string" || !path.startsWith(`inquiry/${id}/`)) {
      return Response.json({ ok: false, error: "invalid_path" }, { status: 400 });
    }

    const want = Number.isInteger(series) && series >= 0 && series < 50 ? series : 0;
    const r = await prepareStudy(path, want);
    if (!r.ok) return Response.json({ ok: false, error: r.error }, { status: r.status });
    return Response.json(r);
  } catch (err) {
    console.error("[imaging] exception:", err);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
