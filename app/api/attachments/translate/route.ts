/**
 * healwith: 첨부 의료서류 → 한국어 충실 번역 API (내부 도구·staff 전용)
 *
 * 코디/어드민이 인박스에서 외국 검사지를 한국 병원에 넘기기 전, 원문을 1:1 한국어로 옮긴다.
 * 번역 자체는 src/lib/documents/translateDoc.ts (Gemini 멀티모달). 이 라우트는 인증·검증만.
 *
 * 보안:
 * - path 는 inquiry/ 로 시작 + 상위경로(..) 차단.
 * - 어드민 또는 staff(코디) 인증 필수. 공개 토큰 경로는 미지원(내부 전용).
 * - 첨부 열람(/api/attachments/sign)과 동일한 신뢰 수준(staff 는 모든 문의 첨부 열람 권한).
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { checkAdminAuth } from "@/lib/auth/checkAdminAuth";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { translateMedicalDoc } from "@/lib/documents/translateDoc";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const path = body?.path ? String(body.path) : null;
    const name = body?.name ? String(body.name) : null;
    const lang = body?.lang ? String(body.lang) : "ko"; // 출력 언어(ko/en/ru). 엔진에서 정규화.

    if (!path) {
      return Response.json({ ok: false, error: "path_required" }, { status: 400 });
    }
    if (!path.startsWith("inquiry/") || path.includes("..") || path.startsWith("/")) {
      return Response.json({ ok: false, error: "invalid_path" }, { status: 400 });
    }

    // 인증: 어드민 또는 staff(코디)만.
    const adminAuth = await checkAdminAuth(request);
    let authorized = adminAuth.isAdmin;
    if (!authorized) {
      const portalAuth = await requirePortalAuth(request, { staffOnly: true });
      authorized = portalAuth.success;
    }
    if (!authorized) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const result = await translateMedicalDoc({ path, name, lang });
    if (!result.ok) {
      // error 는 코드형 문자열만(내용 누출 없음). 형식 미지원은 415, 그 외 상류 실패는 502.
      const status = result.error === "unsupported_type" ? 415 : 502;
      return Response.json({ ok: false, error: result.error }, { status });
    }

    return Response.json({ ok: true, doc: result.doc });
  } catch (e) {
    console.error("[api/attachments/translate] error:", e);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
