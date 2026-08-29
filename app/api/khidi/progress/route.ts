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
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
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
        // 누가 올렸나 — 코디 화면이 「해외 의료기관 / 환자 본인」을 갈라 보여준다.
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

    const body = await request.json();
    const inquiryId = sanitizeString(body.inquiryId, 32);
    const recordType = normalizeRecordType(sanitizeString(body.recordType, 32));
    const note = sanitizeString(body.note, 1000);
    // 파일은 «선택» — 메모만 있는 경과도 허용. 파일이 있으면 브라우저가 Storage 로 직접 올린 뒤
    // 그 경로(path)만 여기로 보낸다(서버 경유 시 4.5MB 에서 끊기던 문제).
    const fileName = sanitizeString(body.name, 200);
    const fileType = normalizeMime(fileName, String(body.type || ""));
    // 검사는 단계별로 나눈다.
    //   ⚠️ 선언 크기(body.size)는 «서명 단계에서만» 본다. 2단계에서 또 보면 클라가 그 값을
    //   안 실어 보낸 순간 Number(undefined)=NaN → «파일이 너무 큼»으로 잘못 튕긴다(실제로 그랬다).
    //   2단계의 크기·형식 검사는 verifyUploaded 가 «저장된 실물»을 재서 한다.
    const idOk = Number.isInteger(Number(inquiryId)) && Number(inquiryId) > 0;
    if (body.phase === "sign") {
      const check = validateProgressUpload({
        inquiryId, hasFile: true, fileType, fileSize: Number(body.size), note,
      });
      if (!check.ok) return NextResponse.json({ ok: false, error: check.error }, { status: 400 });
    } else if (!body.path) {
      // 파일 없는 «메모형» 경과 — note 가 비어 있으면 의미가 없다.
      const check = validateProgressUpload({ inquiryId, hasFile: false, note });
      if (!check.ok) return NextResponse.json({ ok: false, error: check.error }, { status: 400 });
    } else if (!idOk) {
      return NextResponse.json({ ok: false, error: "invalid_inquiry" }, { status: 400 });
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

    const dir = `progress/${inquiryId}`;

    // ── 1단계(파일이 있을 때만): 서명 URL 발급 ──
    if (body.phase === "sign") {
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

    // ── 2단계: 올라간 파일(있으면) 검증 후 기록 저장 ──
    let storagePath: string | null = null;
    let fileSize: number | null = null;
    if (body.path) {
      storagePath = String(body.path);
      if (!isOwnPath(dir, storagePath)) {
        return NextResponse.json({ ok: false, error: "invalid_path" }, { status: 400 });
      }
      const verified = await verifyUploaded("documents", storagePath, fileType, PROGRESS_MAX_SIZE);
      if (!verified.ok) {
        return NextResponse.json({ ok: false, error: verified.error }, { status: 400 });
      }
      fileSize = verified.size; // 선언값이 아니라 실제 저장된 크기
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
        file_name: storagePath ? fileName : null,
        file_type: storagePath ? fileType : null,
        file_size: fileSize,
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
    const summary = storagePath ? `${label} 파일` : label;
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
    // 여기는 차단 게이트가 아니라 "누구로 볼 것인가" 분기(아니면 아래 admin fallback으로 계속)라
    // requirePartnerType(즉시 403 반환)을 쓰면 동작이 바뀜 — 수동 비교가 의도임(독립 리뷰 확인).
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

    // 2) 코디네이터 (inquiry별 검토) — 2026-08-25 신설.
    //    여태 열람 주체가 「해외 의료기관 본인」과 「관리자」뿐이라, 현지에서 올린 검사결과·영상을
    //    **케이스를 실제로 끌고 가는 코디가 볼 화면이 없었다**(올라오면 타임라인에 한 줄만 떴다).
    //    관리자 게이트(requireAdminAuth)는 app_metadata.role='admin'·허용목록만 통과시켜
    //    코디는 403 이므로, staff 게이트를 먼저 둔다(같은 판정 = 다른 코디 API 와 동일).
    const staff = await requirePortalAuth(request, { staffOnly: true });
    if (staff.success) {
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
        console.error("[khidi/progress] staff list:", error.message);
        return NextResponse.json({ ok: false, error: "list_failed" }, { status: 500 });
      }
      return NextResponse.json({ ok: true, records: await signRecords(data) });
    }

    // 3) 관리자 (inquiry별 검토) — 사후관리 검토 권한
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
