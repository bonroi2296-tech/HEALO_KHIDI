/**
 * healwith: 코디가 «환자 대신» 서류를 문의에 붙인다 (staff 전용)
 *
 * POST /api/coordinator/inquiries/[id]/attachments
 *   1) { phase: "sign",   name, type, size } → { signedUrl, path }
 *   2) { phase: "commit", path, name, type } → inquiries.attachments 에 append
 *
 * 왜 필요한가 (2026-08-03, 문의 #60):
 *   환자가 131MB PDF 를 못 올려 메일·왓츠앱으로 자료를 보내겠다고 했는데, 받아도 시스템에
 *   넣을 데가 없었다 — 코디·어드민 어느 화면에도 «환자 서류를 대신 붙이는» 통로가 없었다.
 *   (코디 화면의 파일 첨부는 «전문의 소견»용이라 환자 서류함이 아니다.)
 *
 * 기록의 정직성: 대신 올린 건은 uploaded_by_staff 로 표시한다. 나중에 «환자가 직접 낸 것»과
 * 구분이 안 되면 실적·근거 판단이 흐려진다.
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { issueUploadUrl, verifyUploaded, isOwnPath, normalizeMime } from "@/lib/storage/directUpload";

const BUCKET = "attachments";
const MAX_SIZE = 200 * 1024 * 1024;
const MAX_ATTACHMENTS = 20; // 환자 본인 업로드(10) + 코디 대리분 여유

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // 병원 CD 통째로 — 안에 든 CT(DICOM) 는 코디 화면의 영상 뷰어가 브라우저에서 풀어 보여준다.
  "application/zip",
  "application/x-zip-compressed",
  "application/vnd.rar",
  "application/x-rar-compressed",
  "application/dicom",
];

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await context.params;
  if (!rawId || !/^\d+$/.test(rawId)) {
    return Response.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }

  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;

  const id = Number(rawId);
  const dir = `inquiry/${id}/staff`;

  try {
    const body = await request.json();

    // ── 1단계: 서명 URL 발급 ──
    if (body.phase !== "commit") {
      const signed = await issueUploadUrl(body, {
        bucket: BUCKET,
        dir,
        allowed: ALLOWED_TYPES,
        maxBytes: MAX_SIZE,
      });
      if (!signed.ok) {
        return Response.json(
          { ok: false, error: signed.error, detail: signed.detail },
          { status: signed.status }
        );
      }
      return Response.json({
        ok: true,
        signedUrl: signed.signedUrl,
        path: signed.path,
        name: signed.name,
        type: signed.type,
      });
    }

    // ── 2단계: 올라간 파일 검증 후 문의에 append ──
    const path = String(body.path || "");
    if (!isOwnPath(dir, path)) {
      return Response.json({ ok: false, error: "invalid_path" }, { status: 400 });
    }
    const type = normalizeMime(path, String(body.type || ""));
    const verified = await verifyUploaded(BUCKET, path, type, MAX_SIZE);
    if (!verified.ok) {
      return Response.json({ ok: false, error: verified.error }, { status: 400 });
    }

    const { data: row, error: readErr } = await supabaseAdmin
      .from("inquiries")
      .select("id, attachments")
      .eq("id", id)
      .maybeSingle();
    if (readErr || !row) {
      await supabaseAdmin.storage.from(BUCKET).remove([path]);
      return Response.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    const existing = Array.isArray(row.attachments) ? row.attachments : [];
    if (existing.length >= MAX_ATTACHMENTS) {
      await supabaseAdmin.storage.from(BUCKET).remove([path]);
      return Response.json({ ok: false, error: "too_many_files" }, { status: 400 });
    }

    const entry = {
      path,
      name: String(body.name || path.split("/").pop() || "file").slice(0, 300),
      type,
      category: "other",
      // 환자 본인이 낸 것과 구분 — 실적·근거 판단이 흐려지지 않게.
      uploaded_by_staff: true,
      note: String(body.note || "").slice(0, 200) || null,
    };

    const { error: writeErr } = await supabaseAdmin
      .from("inquiries")
      .update({ attachments: [...existing, entry] })
      .eq("id", id);

    if (writeErr) {
      console.error("[coordinator/attachments] update:", writeErr.message);
      await supabaseAdmin.storage.from(BUCKET).remove([path]);
      return Response.json({ ok: false, error: "save_failed" }, { status: 500 });
    }

    return Response.json({ ok: true, attachment: entry });
  } catch (err) {
    console.error("[coordinator/attachments] exception:", err);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
