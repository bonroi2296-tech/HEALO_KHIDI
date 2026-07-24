/**
 * healwith: 경과 기록(progress_records) API — 사후관리(ICT ④경과 f/u) 업로드/조회
 *
 * POST /api/khidi/progress
 *   해외 의료기관(partner_type='medical_institution')이 자기가 의뢰한 케이스에
 *   검사결과·영상·임상소견을 업로드(파일 또는 메모). 검증 통과 시 progress_records 저장 +
 *   case_status_history 에 "경과 업로드" 이벤트를 남겨 코디·에이전시 타임라인에 반영(닫힌 고리).
 *
 * GET /api/khidi/progress?inquiryId=123
 *   - 관리자(requireAdminAuth): 해당 inquiry 의 모든 경과 기록 + signed URL (사후관리 검토)
 *   - 해외 의료기관: 본 의료기관이 의뢰한 케이스의 경과 기록(선택적으로 inquiryId 필터)
 *
 * 인증: checkAgencyAuth(medical_institution 한정) / requireAdminAuth. 환자 PII 미포함.
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { checkAgencyAuth, requirePartnerType } from "@/lib/auth/checkAgencyAuth";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { uploadLimiter } from "@/lib/api/rateLimiter";
import { sanitizeString } from "@/lib/api/sanitize";
import {
  validateProgressUpload,
  normalizeRecordType,
  progressStoragePath,
  type ProgressRecordType,
} from "@/lib/khidi/progressRecords";

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

// ─── POST: 해외 의료기관 경과 업로드 ───
export async function POST(request: NextRequest) {
  try {
    const limited = uploadLimiter.check(request);
    if (limited) return limited;

    const auth = await checkAgencyAuth(request);
    // 사후관리(경과 업로드)는 임상 행위 → 해외 의료기관만. 비의료 에이전시는 불가(기획안 §2).
    // 2026-07-24 권한 정비(D): 수동 if 비교 → 표준 게이트 헬퍼(requirePartnerType)로 통일.
    const gate = requirePartnerType(auth, "medical_institution");
    if (gate) return gate;

    assertSupabaseEnv();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const inquiryId = sanitizeString(formData.get("inquiryId") as string, 32);
    const recordType = normalizeRecordType(sanitizeString(formData.get("recordType") as string, 32));
    const note = sanitizeString(formData.get("note") as string, 1000);

    const check = validateProgressUpload({
      inquiryId,
      hasFile: !!file,
      fileType: file?.type ?? null,
      fileSize: file?.size ?? null,
      note,
    });
    if (!check.ok) {
      return NextResponse.json({ ok: false, error: check.error }, { status: 400 });
    }

    // 본 의료기관이 의뢰한 케이스인지 확인 (권한 경계)
    const { data: inq, error: inqErr } = await (supabaseAdmin as any)
      .from("inquiries")
      .select("id, agency_id, case_status")
      .eq("id", Number(inquiryId))
      .maybeSingle();
    if (inqErr) {
      console.error("[khidi/progress] inquiry lookup:", inqErr.message);
      return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
    }
    if (!inq || inq.agency_id !== auth.agencyId) {
      return NextResponse.json({ ok: false, error: "not_your_case" }, { status: 403 });
    }

    // 파일 업로드(있으면) — documents 버킷
    let storagePath: string | null = null;
    if (file) {
      const uniq = `${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
      storagePath = progressStoragePath(inquiryId, file.name, uniq);
      const buffer = Buffer.from(await file.arrayBuffer());
      const { error: upErr } = await supabaseAdmin.storage
        .from("documents")
        .upload(storagePath, buffer, { contentType: file.type, upsert: false });
      if (upErr) {
        console.error("[khidi/progress] upload:", upErr.message);
        return NextResponse.json({ ok: false, error: "upload_failed" }, { status: 500 });
      }
    }

    const { data: rec, error: recErr } = await (supabaseAdmin as any)
      .from("progress_records")
      .insert({
        inquiry_id: Number(inquiryId),
        agency_id: auth.agencyId,
        uploader_user_id: auth.userId,
        uploader_role: "medical_institution",
        record_type: recordType,
        note: note || null,
        file_name: file?.name || null,
        file_type: file?.type || null,
        file_size: file?.size || null,
        storage_path: storagePath,
      })
      .select()
      .single();

    if (recErr) {
      console.error("[khidi/progress] insert:", recErr.message);
      if (storagePath) await supabaseAdmin.storage.from("documents").remove([storagePath]);
      return NextResponse.json({ ok: false, error: "save_failed" }, { status: 500 });
    }

    // 닫힌 고리: 코디·에이전시 타임라인에 경과 업로드 이벤트 반영 (case_status 는 변경 안 함 → KPI 영향 0)
    const label = RECORD_TYPE_LABEL[recordType];
    const summary = file?.name ? `${label} 파일` : label;
    await (supabaseAdmin as any).from("case_status_history").insert({
      inquiry_id: Number(inquiryId),
      status: inq.case_status || "follow_up",
      note: `📎 경과 업로드 (해외 의료기관) — ${summary}${note ? `: ${note.slice(0, 80)}` : ""}`,
      created_by: auth.userId || null,
    });

    return NextResponse.json({ ok: true, record: (await signRecords([rec]))[0] });
  } catch (err: any) {
    console.error("[khidi/progress] POST exception:", err?.message?.slice(0, 200));
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

// ─── GET: 경과 기록 조회 (관리자 = inquiry별 / 해외 의료기관 = 본인 케이스) ───
export async function GET(request: NextRequest) {
  try {
    assertSupabaseEnv();
    const inquiryIdParam = new URL(request.url).searchParams.get("inquiryId");

    // 1) 해외 의료기관 우선 (자기 케이스)
    const agency = await checkAgencyAuth(request);
    if (agency.isAgencyUser && agency.partnerType === "medical_institution" && agency.agencyId) {
      let q = (supabaseAdmin as any)
        .from("progress_records")
        .select("*")
        .eq("agency_id", agency.agencyId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (inquiryIdParam) q = q.eq("inquiry_id", Number(inquiryIdParam));
      const { data, error } = await q;
      if (error) {
        console.error("[khidi/progress] agency list:", error.message);
        return NextResponse.json({ ok: false, error: "list_failed" }, { status: 500 });
      }
      return NextResponse.json({ ok: true, records: await signRecords(data) });
    }

    // 2) 관리자 (inquiry별 검토) — 사후관리 검토 권한
    const admin = await requireAdminAuth(request);
    if (!admin.success) return admin.response;
    if (!inquiryIdParam) {
      return NextResponse.json({ ok: false, error: "inquiry_required" }, { status: 400 });
    }
    const { data, error } = await (supabaseAdmin as any)
      .from("progress_records")
      .select("*")
      .eq("inquiry_id", Number(inquiryIdParam))
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      console.error("[khidi/progress] admin list:", error.message);
      return NextResponse.json({ ok: false, error: "list_failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, records: await signRecords(data) });
  } catch (err: any) {
    console.error("[khidi/progress] GET exception:", err?.message?.slice(0, 200));
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
