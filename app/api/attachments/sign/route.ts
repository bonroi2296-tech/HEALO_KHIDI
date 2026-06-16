/**
 * healwith: Attachment Signed URL API (권한 검증 강화)
 * Storage 버킷을 private로 전환 후, 서버에서만 signed URL 발급
 * 만료 시간: 5분
 * 
 * 보안 요구사항:
 * - inquiryId, path, publicToken 검증
 * - path는 inquiry/로 시작해야 함
 * - inquiries 레코드 존재 및 public_token 일치 확인
 * - attachment 또는 attachments[*].path에 path 포함 여부 확인 (다중 첨부 지원)
 * 
 * ✅ P0 수정: 런타임 명시 (Node.js)
 * 
 * 이유:
 * - Signed URL 발급 (DB 관리자 접근)
 * - Storage API 사용
 * - Edge 런타임에서 발생할 수 있는 예측 불가 오류 방지
 */
export const runtime = "nodejs";

import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { NextRequest } from "next/server";
import { pathAuthorized } from "@/lib/security/attachmentAuth";
import { checkAdminAuth } from "@/lib/auth/checkAdminAuth";

export async function POST(request: NextRequest) {
  assertSupabaseEnv();
  try {
    const body = await request.json().catch(() => ({}));
    const inquiryId = body?.inquiryId != null ? (typeof body.inquiryId === "string" ? body.inquiryId : String(body.inquiryId)) : null;
    const path = body?.path ? String(body.path) : null;
    const publicToken = body?.publicToken ? String(body.publicToken) : null;

    // path 는 항상 필수. inquiryId·publicToken 은 비회원(공개 토큰) 경로에서만 필수.
    if (!path) {
      return Response.json(
        { ok: false, error: "path_required" },
        { status: 400 }
      );
    }

    // path 검증: inquiry/로 시작해야 함
    if (!path.startsWith("inquiry/")) {
      console.error("[api/attachments/sign] invalid path prefix:", path);
      return Response.json(
        { ok: false, error: "path_must_start_with_inquiry" },
        { status: 400 }
      );
    }

    // path 보안 검증 (상위 디렉토리 접근 방지)
    if (path.includes("..") || path.startsWith("/")) {
      console.error("[api/attachments/sign] path security violation:", path);
      return Response.json(
        { ok: false, error: "invalid_path" },
        { status: 400 }
      );
    }

    // 어드민 인증 시 공개 토큰 없이 바로 발급 (어드민은 모든 문의 첨부 열람 권한).
    // 과거엔 공개 토큰 경로만 있어 어드민 첨부 미리보기가 항상 400 이었음.
    const adminAuth = await checkAdminAuth(request);
    if (adminAuth.isAdmin) {
      const { data: signed, error: signErr } = await supabaseAdmin.storage
        .from("attachments")
        .createSignedUrl(path, 300);
      if (signErr) {
        console.error("[api/attachments/sign] admin signed URL error:", signErr);
        return Response.json({ ok: false, error: "signed_url_failed" }, { status: 500 });
      }
      return Response.json({ ok: true, signedUrl: signed.signedUrl });
    }

    // ── 비회원: inquiryId + publicToken 필수 ──
    if (!inquiryId || !publicToken) {
      return Response.json(
        { ok: false, error: "inquiryId_publicToken_required" },
        { status: 400 }
      );
    }

    const inquiryIdNum = Number(inquiryId);
    const inquiryIdVal = isNaN(inquiryIdNum) ? inquiryId : inquiryIdNum;

    const { data: inquiryData, error: inquiryError } = await supabaseAdmin
      .from("inquiries")
      .select("id, public_token, attachments")
      .eq("id", inquiryIdVal)
      .maybeSingle();

    if (inquiryError) {
      console.error("[api/attachments/sign] inquiry fetch error:", inquiryError);
      return Response.json(
        { ok: false, error: "inquiry_fetch_failed" },
        { status: 500 }
      );
    }

    if (!inquiryData) {
      console.error("[api/attachments/sign] inquiry not found:", inquiryId);
      return Response.json(
        { ok: false, error: "inquiry_not_found" },
        { status: 404 }
      );
    }

    const storedToken = inquiryData.public_token;
    const tokenMatch = storedToken != null && String(storedToken) === String(publicToken);
    if (!tokenMatch) {
      console.error("[api/attachments/sign] public_token mismatch:", { stored: String(storedToken ?? "").slice(0, 8), provided: String(publicToken).slice(0, 8) });
      return Response.json(
        { ok: false, error: "invalid_public_token" },
        { status: 403 }
      );
    }

    const ok = pathAuthorized(path, inquiryData.attachments ?? []);
    if (!ok) {
      console.error("[api/attachments/sign] path not authorized:", { attachments: inquiryData.attachments, requestedPath: path });
      return Response.json(
        { ok: false, error: "path_not_authorized" },
        { status: 403 }
      );
    }

    // 모든 검증 통과 → signed URL 발급 (만료 5분)
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from("attachments")
      .createSignedUrl(path, 300); // 5분 = 300초

    if (signedUrlError) {
      console.error("[api/attachments/sign] signed URL error:", signedUrlError);
      return Response.json(
        { ok: false, error: "signed_url_failed" },
        { status: 500 }
      );
    }

    console.log("[api/attachments/sign] success:", { inquiryId, path: path.substring(0, 30) + "..." });
    return Response.json({
      ok: true,
      signedUrl: signedUrlData.signedUrl,
    });
  } catch (error: any) {
    console.error("[api/attachments/sign] error:", error);
    return Response.json(
      { ok: false, error: "sign_failed" },
      { status: 500 }
    );
  }
}
