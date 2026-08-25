/**
 * healwith: 환자 본인 «경과·검사결과» 업로드/조회 (공고 ICT ④ — 검사결과·영상정보 전송·수집·저장)
 *
 * GET  /api/portal/progress            → 본인 케이스의 경과 기록(파일은 1시간 서명 링크)
 * POST /api/portal/progress            → 2단계 업로드(phase: sign → commit) 또는 메모만
 *
 * 왜 (2026-08-25): 경과 업로드 창구가 **해외 의료기관 포털에만** 있었다. 공고 ④의 정의는
 * 「검사결과·영상정보 전송·수집·저장」이고 현지 병원을 안 거치는 환자도 많다 — 환자가 올린
 * 서류는 /api/patient/documents(일반 서류함)로 가서 **경과기록으로는 안 쌓였다**.
 * 이 창구는 같은 표(progress_records)에 uploader_role='patient' 로 쌓아 코디 화면·타임라인이
 * 한곳을 보게 한다.
 *
 * 권한: 로그인 환자 본인만. 대상 케이스는 **서버가** 인증된 이메일로 판정한다
 * (클라가 보낸 inquiryId 를 그대로 믿으면 IDOR — portal/symptoms 와 같은 규칙).
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { findOwnInquiryIdsForUser } from "@/lib/portal/ownInquiries";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { uploadLimiter } from "@/lib/api/rateLimiter";
import { sanitizeString } from "@/lib/api/sanitize";
import {
  validateProgressUpload,
  normalizeRecordType,
  PROGRESS_ALLOWED_TYPES,
  PROGRESS_MAX_SIZE,
  type ProgressRecordType,
} from "@/lib/khidi/progressRecords";
import { issueUploadUrl, verifyUploaded, isOwnPath, normalizeMime } from "@/lib/storage/directUpload";

const RECORD_TYPE_LABEL: Record<ProgressRecordType, string> = {
  test_result: "검사결과",
  imaging: "영상정보",
  clinical_note: "임상소견",
  progress: "경과",
};

async function signRecords(rows: any[]): Promise<any[]> {
  return Promise.all(
    (rows || []).map(async (r) => {
      let url: string | null = null;
      if (r.storage_path) {
        const { data } = await supabaseAdmin.storage
          .from("documents")
          .createSignedUrl(r.storage_path, 3600);
        url = data?.signedUrl || null;
      }
      return {
        id: r.id,
        inquiry_id: r.inquiry_id,
        record_type: r.record_type,
        record_type_label: RECORD_TYPE_LABEL[r.record_type as ProgressRecordType] || "경과",
        uploader_role: r.uploader_role,
        note: r.note,
        file_name: r.file_name,
        file_type: r.file_type,
        file_size: r.file_size,
        created_at: r.created_at,
        url,
      };
    })
  );
}

export async function GET(request: NextRequest) {
  const auth = await requirePortalAuth(request);
  if (!auth.success) return auth.response;

  try {
    assertSupabaseEnv();
    const ids = await findOwnInquiryIdsForUser(auth.userId, auth.email);
    if (ids.length === 0) return NextResponse.json({ ok: true, records: [], inquiryId: null });

    const { data, error } = await (supabaseAdmin as any)
      .from("progress_records")
      .select("*")
      .in("inquiry_id", ids)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      console.error("[portal/progress] list:", error.message);
      return NextResponse.json({ ok: false, error: "list_failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, records: await signRecords(data), inquiryId: ids[0] });
  } catch (err: any) {
    console.error("[portal/progress] GET exception:", err?.message?.slice(0, 200));
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const limited = uploadLimiter.check(request);
  if (limited) return limited;

  const auth = await requirePortalAuth(request);
  if (!auth.success) return auth.response;

  try {
    assertSupabaseEnv();
    const body = await request.json();

    // 대상 케이스는 서버가 정한다 — 최근 본인 문의. (클라 입력 무시)
    const ids = await findOwnInquiryIdsForUser(auth.userId, auth.email);
    if (ids.length === 0) {
      return NextResponse.json({ ok: false, error: "no_case" }, { status: 403 });
    }
    const inquiryId = ids[0];

    const recordType = normalizeRecordType(sanitizeString(body.recordType, 32));
    const note = sanitizeString(body.note, 1000);
    const fileName = sanitizeString(body.name, 200);
    const fileType = normalizeMime(fileName, String(body.type || ""));
    const dir = `progress/${inquiryId}`;

    // ── 1단계: 서명 URL 발급 (파일이 있을 때만) ──
    if (body.phase === "sign") {
      const check = validateProgressUpload({
        inquiryId: String(inquiryId), hasFile: true, fileType, fileSize: Number(body.size), note,
      });
      if (!check.ok) return NextResponse.json({ ok: false, error: check.error }, { status: 400 });

      const signed = await issueUploadUrl(body, {
        bucket: "documents",
        dir,
        allowed: PROGRESS_ALLOWED_TYPES,
        maxBytes: PROGRESS_MAX_SIZE,
      });
      if (!signed.ok) {
        return NextResponse.json(
          { ok: false, error: signed.error, detail: signed.detail },
          { status: signed.status }
        );
      }
      return NextResponse.json({
        ok: true,
        signedUrl: signed.signedUrl,
        path: signed.path,
        name: signed.name,
        type: signed.type,
      });
    }

    // ── 2단계: 저장 ──
    let storagePath: string | null = null;
    let fileSize: number | null = null;
    if (body.path) {
      storagePath = String(body.path);
      // 남의 케이스 경로를 붙여 넣는 길 차단(첨부 소유검사와 같은 규칙).
      if (!isOwnPath(dir, storagePath)) {
        return NextResponse.json({ ok: false, error: "invalid_path" }, { status: 400 });
      }
      const verified = await verifyUploaded("documents", storagePath, fileType, PROGRESS_MAX_SIZE);
      if (!verified.ok) {
        return NextResponse.json({ ok: false, error: verified.error }, { status: 400 });
      }
      fileSize = verified.size; // 선언값이 아니라 실제 저장된 크기
    } else {
      // 파일 없는 메모형 경과
      const check = validateProgressUpload({ inquiryId: String(inquiryId), hasFile: false, note });
      if (!check.ok) return NextResponse.json({ ok: false, error: check.error }, { status: 400 });
    }

    const { data: rec, error: recErr } = await (supabaseAdmin as any)
      .from("progress_records")
      .insert({
        inquiry_id: inquiryId,
        agency_id: null, // 환자 본인 업로드 — 의뢰처 없음
        uploader_user_id: auth.userId,
        uploader_role: "patient",
        record_type: recordType,
        note: note || null,
        file_name: storagePath ? fileName : null,
        file_type: storagePath ? fileType : null,
        file_size: fileSize,
        storage_path: storagePath,
      })
      .select()
      .single();

    if (recErr) {
      console.error("[portal/progress] insert:", recErr.message);
      if (storagePath) await supabaseAdmin.storage.from("documents").remove([storagePath]);
      return NextResponse.json({ ok: false, error: "save_failed" }, { status: 500 });
    }

    // 닫힌 고리: 코디 타임라인에 반영(케이스 단계는 안 바꾼다 → KPI 영향 0).
    // 이력의 status 는 «지금 단계»를 그대로 적는다 — 'follow_up' 으로 박으면 아직 상담
    // 단계인 케이스가 타임라인에서 사후관리로 넘어간 것처럼 보인다.
    const { data: inqRow } = await (supabaseAdmin as any)
      .from("inquiries")
      .select("case_status")
      .eq("id", inquiryId)
      .maybeSingle();
    const label = RECORD_TYPE_LABEL[recordType];
    const summary = storagePath ? `${label} 파일` : label;
    await (supabaseAdmin as any).from("case_status_history").insert({
      inquiry_id: inquiryId,
      status: inqRow?.case_status || "follow_up",
      note: `📎 경과 업로드 (환자 본인) — ${summary}${note ? `: ${note.slice(0, 80)}` : ""}`,
      created_by: auth.userId || null,
    });

    return NextResponse.json({ ok: true, record: (await signRecords([rec]))[0] });
  } catch (err: any) {
    console.error("[portal/progress] POST exception:", err?.message?.slice(0, 200));
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
