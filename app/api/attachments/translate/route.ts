/**
 * healwith: 첨부 의료서류 번역 도구 API (내부 도구·staff 전용)
 *
 * 한 라우트에서 첨부 번역 관련 동작을 action 으로 분기(인증·경로검증 공유):
 *  - translate : 대상 언어(ko/en/ru)로 원문 1:1 번역(캐시 우선, force 면 재변환)
 *  - verify    : 번역표 숫자를 원본 독립판독과 대조 → 확인 필요 숫자 반환
 *  - save      : 코디 수정본 저장
 *  - glossary  : 학습 용어사전에 (원문→대상언어) 등록
 * 번역/검증/저장 로직은 src/lib/documents/translateDoc.ts. 이 라우트는 인증·검증·분기만.
 *
 * 보안:
 * - path 는 inquiry/ 로 시작 + 상위경로(..) 차단(glossary 제외 — path 불필요).
 * - 어드민 또는 staff(코디) 인증 필수. 공개 토큰 경로는 미지원(내부 전용).
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { checkAdminAuth } from "@/lib/auth/checkAdminAuth";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import {
  translateMedicalDoc,
  verifyTranslationNumbers,
  saveTranslationEdit,
  addGlossaryTerm,
} from "@/lib/documents/translateDoc";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body?.action ? String(body.action) : "translate";
    const path = body?.path ? String(body.path) : null;
    const name = body?.name ? String(body.name) : null;
    const lang = body?.lang ? String(body.lang) : "ko";

    // path 검증(glossary 는 path 불필요).
    if (action !== "glossary") {
      if (!path) {
        return Response.json({ ok: false, error: "path_required" }, { status: 400 });
      }
      if (!path.startsWith("inquiry/") || path.includes("..") || path.startsWith("/")) {
        return Response.json({ ok: false, error: "invalid_path" }, { status: 400 });
      }
    }

    // 인증: 어드민 또는 staff(코디)만. 수정/등록 주체 기록용 userId 확보.
    const adminAuth = await checkAdminAuth(request);
    let authorized = adminAuth.isAdmin;
    let userId: string | null = adminAuth.userId || null;
    if (!authorized) {
      const portalAuth = await requirePortalAuth(request, { staffOnly: true });
      authorized = portalAuth.success;
      if (portalAuth.success) userId = portalAuth.userId;
    }
    if (!authorized) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    if (action === "translate") {
      const result = await translateMedicalDoc({ path: path!, name, lang, force: body?.force === true });
      if (!result.ok) {
        const status = result.error === "unsupported_type" ? 415 : 502;
        return Response.json({ ok: false, error: result.error }, { status });
      }
      return Response.json({ ok: true, doc: result.doc });
    }

    if (action === "verify") {
      const result = await verifyTranslationNumbers({ path: path!, name, doc: body?.doc });
      if (!result.ok) {
        const status = result.error === "unsupported_type" ? 415 : result.error === "invalid_doc" ? 400 : 502;
        return Response.json({ ok: false, error: result.error }, { status });
      }
      return Response.json({ ok: true, suspicious: result.suspicious, docCount: result.docCount, sourceCount: result.sourceCount });
    }

    if (action === "save") {
      const result = await saveTranslationEdit({ path: path!, lang, editedDoc: body?.doc, userId });
      if (!result.ok) {
        const status = result.error === "invalid_doc" ? 400 : 502;
        return Response.json({ ok: false, error: result.error }, { status });
      }
      return Response.json({ ok: true });
    }

    if (action === "glossary") {
      const result = await addGlossaryTerm({
        src: String(body?.src || ""),
        ko: body?.ko ?? null, en: body?.en ?? null, ru: body?.ru ?? null, note: body?.note ?? null,
        userId,
      });
      if (!result.ok) {
        const status = result.error === "invalid_term" ? 400 : 502;
        return Response.json({ ok: false, error: result.error }, { status });
      }
      return Response.json({ ok: true });
    }

    return Response.json({ ok: false, error: "unknown_action" }, { status: 400 });
  } catch (e) {
    console.error("[api/attachments/translate] error:", e);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
