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
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { withDownloadName } from "@/lib/documents/sharedDocMeta";
import { checkRateLimitPersistent, getClientIp, getRateLimitHeaders, RATE_LIMITS } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  assertSupabaseEnv();
  try {
    // 공개(비회원) 토큰으로도 닿는 경로인데 이 라우트만 상한이 없었다 (2026-09-04 감사:
    // 공개 도달 가능한 7개 중 유일하게 빠져 있었다). 다른 공개 라우트와 같은 DB 공유 카운터를 쓴다.
    const clientIp = getClientIp(request);
    const rl = await checkRateLimitPersistent(clientIp, RATE_LIMITS.ATTACHMENT_SIGN);
    if (!rl.allowed) {
      return Response.json(
        { ok: false, error: "rate_limited" },
        { status: 429, headers: getRateLimitHeaders(rl) }
      );
    }
    const body = await request.json().catch(() => ({}));
    const inquiryId = body?.inquiryId != null ? (typeof body.inquiryId === "string" ? body.inquiryId : String(body.inquiryId)) : null;
    const path = body?.path ? String(body.path) : null;
    const publicToken = body?.publicToken ? String(body.publicToken) : null;
    // download=원본파일명 이면 Content-Disposition: attachment 로 바로 다운로드(원본 이름 보존).
    // 없으면 종전대로 미리보기(새 탭). 헤더 인젝션 방지로 개행·따옴표 제거 + 길이 캡.
    const downloadName = body?.download ? String(body.download).replace(/[\r\n"\\]/g, "").slice(0, 200) : null;
    // ⚠️ supabase-js 의 `{ download: 이름 }` 옵션을 쓰면 안 된다 — 주소를 «두 번» 인코딩한다.
    //   러시아어 «История болезни.docx» 가 `%D0%98…` 라는 글자 그대로 저장됐다(2026-09-02 PO 제보).
    //   실측: 옵션을 쓰면 주소가 `download=%25D0%2598…`(`%` 가 `%25` 로 한 번 더) 가 되고,
    //   저장소는 그걸 그대로 `filename*=UTF-8` 에 넣어 브라우저가 퍼센트 문자열을 이름으로 쓴다.
    //   → 서명만 받고 이름은 우리가 붙인다(withDownloadName = URL.searchParams, 인코딩 1회).
    const withName = (url: string | null | undefined) =>
      (downloadName ? withDownloadName(url, downloadName) : url) as string;

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
      return Response.json({ ok: true, signedUrl: withName(signed.signedUrl) });
    }

    // staff(코디·의사) 도 모든 문의 첨부 열람 권한 — 인박스에서 에이전시/환자 첨부 조회.
    // 과거엔 admin 만 허용해 코디가 에이전시 의뢰 첨부를 못 봤음(public 토큰도 없어 항상 400).
    const portalAuth = await requirePortalAuth(request, { staffOnly: true });
    if (portalAuth.success) {
      const { data: signed, error: signErr } = await supabaseAdmin.storage
        .from("attachments")
        .createSignedUrl(path, 300);
      if (signErr) {
        console.error("[api/attachments/sign] staff signed URL error:", signErr);
        return Response.json({ ok: false, error: "signed_url_failed" }, { status: 500 });
      }
      return Response.json({ ok: true, signedUrl: withName(signed.signedUrl) });
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

    // 🛑 「없는 문의」와 「토큰 불일치」를 다르게 답하면 안 된다 — 문의 ID 가 순차라 1번부터
    //    훑으면 «어느 번호에 문의가 있는지»가 세어진다(= 접수 건수가 샌다).
    //    inquiries/claim 은 이미 전부 같은 답으로 통일해 뒀는데 여기만 갈라져 있었다.
    if (!inquiryData) {
      return Response.json(
        { ok: false, error: "invalid_public_token" },
        { status: 403 }
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
      // ⚠️ attachments 를 통째로 찍으면 «파일 이름»이 로그에 남는다 — 실제로 환자 이름·병명이
      //    든 이름이 올라온다(「История болезни.docx」). 진단에 필요한 건 개수뿐이다.
      console.error("[api/attachments/sign] path not authorized:", { attachmentCount: Array.isArray(inquiryData.attachments) ? inquiryData.attachments.length : 0 });
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
      signedUrl: withName(signedUrlData.signedUrl),
    });
  } catch (error: any) {
    console.error("[api/attachments/sign] error:", error);
    return Response.json(
      { ok: false, error: "sign_failed" },
      { status: 500 }
    );
  }
}
