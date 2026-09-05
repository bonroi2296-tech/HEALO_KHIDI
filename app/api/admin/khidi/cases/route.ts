/**
 * healwith: 케이스(환자 유치) 관리 API — 코디/어드민
 *
 * GET   /api/admin/khidi/cases     → 케이스 목록 + 에이전시/상태 옵션
 * PATCH /api/admin/khidi/cases     → 진행상황(case_status)·보험·에이전시 배정 업데이트
 *
 * 진행상황은 변경 시 case_status_history 에 이력 기록. 보험 증번호는 암호화 저장.
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse, after } from "next/server";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { decryptInquiryForAdmin } from "@/lib/security/decryptForAdmin";
import { logPiiAccess } from "@/lib/audit/logPiiAccess";
import { encryptStringNullable, decryptStringNullable } from "@/lib/security/encryptionV2";
import { CASE_STATUS_KEYS, CASE_STATUS_STEPS, caseStatusOrder, outcomeForCaseStatus } from "@/lib/khidi/caseStatus";

// 케이스 보드는 관리자 + 코디네이터가 쓴다(의사 제외 — 보험 PII 쓰기 포함이라 범위 최소화).
async function requireCaseStaff(request: NextRequest) {
  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth;
  if (!(auth.isAdmin || auth.appRole === "coordinator")) {
    return { success: false as const, response: NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }) };
  }
  return auth;
}

function maskName(first?: string | null, last?: string | null): string {
  const n = `${(first || "").trim()} ${(last || "").trim()}`.trim();
  if (!n) return "(이름없음)";
  return `${[...n][0] || ""}***`;
}

export async function GET(request: NextRequest) {
  const auth = await requireCaseStaff(request);
  if (!auth.success) return auth.response;
  try {
    assertSupabaseEnv();
    const { data: rows, error } = await (supabaseAdmin as any)
      .from("inquiries")
      .select("id, created_at, nationality, cancer_type, first_name, last_name, agency_id, case_status, case_status_note, case_status_updated_at, insurance_provider, insurance_policy_no_encrypted, insurance_coverage, insurance_status, outcome")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      console.error("[cases] list error:", error.message);
      return NextResponse.json({ ok: false, error: "list_failed" }, { status: 500 });
    }
    const { data: agencies } = await (supabaseAdmin as any).from("agencies").select("id, name").eq("is_active", true);
    const aMap = new Map((agencies || []).map((a: any) => [a.id, a.name]));

    // 국내 병원(파트너) 목록 — 코디가 배정 대상으로 고름. 계정 있는 활성 병원만(시드/가짜 제외).
    const { data: hospitals } = await (supabaseAdmin as any).from("hospitals").select("id, name, slug").eq("is_active", true).order("name");
    const hMap = new Map<string, string>(
      (hospitals || []).map((h: any): [string, string] => [String(h.id), String(h.name)])
    );

    // 케이스별 "이미 배정된 병원" 매핑: inquiries → normalized_inquiries(source_inquiry_id) → hospital_leads
    const inquiryIds = (rows || []).map((r: any) => r.id);
    const assignedByInquiry = new Map<number, { id: string; name: string; status: string; quoted_price_min: number | null; quoted_price_max: number | null }[]>();
    if (inquiryIds.length > 0) {
      const { data: norms } = await (supabaseAdmin as any)
        .from("normalized_inquiries")
        .select("id, source_inquiry_id")
        .in("source_inquiry_id", inquiryIds);
      const normIdToInquiry = new Map<string, number>(
        (norms || []).map((n: any): [string, number] => [String(n.id), Number(n.source_inquiry_id)])
      );
      const normIds = (norms || []).map((n: any) => n.id);
      if (normIds.length > 0) {
        const { data: leads } = await (supabaseAdmin as any)
          .from("hospital_leads")
          .select("normalized_inquiry_id, hospital_id, status, quoted_price_min, quoted_price_max")
          .in("normalized_inquiry_id", normIds);
        for (const l of leads || []) {
          const inqId = normIdToInquiry.get(l.normalized_inquiry_id);
          if (inqId == null) continue;
          const arr = assignedByInquiry.get(inqId) || [];
          arr.push({
            id: l.hospital_id,
            name: hMap.get(l.hospital_id) || "(미상)",
            status: l.status || "sent",
            quoted_price_min: l.quoted_price_min ?? null,
            quoted_price_max: l.quoted_price_max ?? null,
          });
          assignedByInquiry.set(inqId, arr);
        }
      }
    }

    const cases = await Promise.all((rows || []).map(async (r: any) => {
      const dec = await decryptInquiryForAdmin(r).catch(() => r);
      let policyNo: string | null = null;
      try { policyNo = decryptStringNullable(r.insurance_policy_no_encrypted); } catch { policyNo = null; }
      return {
        id: r.id,
        name: maskName(dec?.first_name, dec?.last_name),
        nationality: r.nationality || "(미상)",
        cancer_type: r.cancer_type || "-",
        created_at: r.created_at,
        agency_id: r.agency_id,
        agency_name: r.agency_id ? aMap.get(r.agency_id) || "(미상)" : null,
        case_status: r.case_status,
        case_status_note: r.case_status_note,
        case_status_updated_at: r.case_status_updated_at,
        insurance_provider: r.insurance_provider,
        insurance_policy_no: policyNo,
        insurance_coverage: r.insurance_coverage,
        insurance_status: r.insurance_status,
        outcome: r.outcome,
        assigned_hospitals: assignedByInquiry.get(r.id) || [],
      };
    }));

    // 접속기록(법정 의무): 케이스 보드는 환자 이름·보험정보를 복호화해 담는다.
    after(() =>
      logPiiAccess(request, auth, {
        action: "LIST_INQUIRIES",
        inquiryIds: cases.map((c: any) => c.id),
        metadata: { screen: "case_board", count: cases.length },
      })
    );

    return NextResponse.json({
      ok: true,
      cases,
      agencies: agencies || [],
      hospitals: (hospitals || []).map((h: any) => ({ id: h.id, name: h.name })),
      statusSteps: CASE_STATUS_STEPS,
    });
  } catch (err: any) {
    console.error("[cases] GET error:", err?.message?.slice(0, 200));
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireCaseStaff(request);
  if (!auth.success) return auth.response;
  try {
    assertSupabaseEnv();
    const body = await request.json().catch(() => ({}));
    const id = body?.inquiry_id;
    if (!id) return NextResponse.json({ ok: false, error: "inquiry_id_required" }, { status: 400 });

    const patch: Record<string, any> = {};
    let statusChanged = false; // 값이 "실제로" 바뀐 경우만 true — 같은 상태 재저장 시 이력·유치집계 중복 방지

    if (body.case_status !== undefined) {
      if (body.case_status !== null && !CASE_STATUS_KEYS.includes(body.case_status)) {
        return NextResponse.json({ ok: false, error: "invalid_case_status" }, { status: 400 });
      }
      // 현재 상태와 비교: 같은 값으로 다시 저장(예: 노트만 수정)하면 타임라인에 같은 단계가
      // 중복으로 쌓이던 문제 차단. case_status_updated_at 은 저장 시각 반영 위해 계속 갱신하되,
      // 이력(case_status_history)·유치 자동집계는 값이 바뀐 경우에만.
      const { data: cur } = await (supabaseAdmin as any)
        .from("inquiries").select("case_status").eq("id", id).maybeSingle();
      // POSTMORTEM #80: 코디가 실수로 이전 단계 버튼을 눌러 저장하면 이 컬럼 하나가 그대로
      // 덮어써져 이미 진행된 단계가 사라져 보였다(이력엔 남는데 배지만 후퇴). on_hold(보류)는
      // 단계가 아니라 일시정지(순서 99는 비교용 편의값일 뿐)라 현재/목표 어느 쪽이든 예외 —
      // 아니면 보류 케이스를 재개할 때마다, 또는 재개 후 보류로 돌릴 때마다 오탐으로 막힌다.
      // 미설정(null)으로 초기화하는 것도 "이전 단계로 되돌림"이 아니라 명시적 리셋이라 예외.
      const isRealBackward =
        body.case_status !== "on_hold" &&
        body.case_status !== null &&
        cur?.case_status !== "on_hold" &&
        caseStatusOrder(body.case_status) < caseStatusOrder(cur?.case_status);
      if (isRealBackward && !body.force_backward) {
        return NextResponse.json(
          { ok: false, error: "status_would_go_backward", current: cur?.case_status ?? null },
          { status: 409 }
        );
      }
      patch.case_status = body.case_status;
      patch.case_status_updated_at = new Date().toISOString();
      statusChanged = (cur?.case_status ?? null) !== body.case_status;
    }
    if (body.case_status_note !== undefined)
      patch.case_status_note = typeof body.case_status_note === "string" ? body.case_status_note.slice(0, 500) : null;
    if (body.agency_id !== undefined) patch.agency_id = body.agency_id || null;
    if (body.insurance_provider !== undefined)
      patch.insurance_provider = typeof body.insurance_provider === "string" ? body.insurance_provider.slice(0, 200) : null;
    if (body.insurance_coverage !== undefined)
      patch.insurance_coverage = typeof body.insurance_coverage === "string" ? body.insurance_coverage.slice(0, 500) : null;
    if (body.insurance_status !== undefined)
      patch.insurance_status = typeof body.insurance_status === "string" ? body.insurance_status.slice(0, 100) : null;
    if (body.insurance_policy_no !== undefined)
      patch.insurance_policy_no_encrypted = body.insurance_policy_no
        ? encryptStringNullable(String(body.insurance_policy_no).slice(0, 100))
        : null;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: false, error: "no_updates" }, { status: 400 });
    }

    const { error } = await (supabaseAdmin as any).from("inquiries").update(patch).eq("id", id);
    if (error) {
      console.error("[cases] update error:", error.message);
      return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
    }

    // 진행상황 변경 시 이력 기록
    if (statusChanged && patch.case_status) {
      await (supabaseAdmin as any).from("case_status_history").insert({
        inquiry_id: id,
        status: patch.case_status,
        note: patch.case_status_note ?? body.case_status_note ?? null,
        created_by: auth.userId,
      });
    }

    // EDGE-2 (POSTMORTEM #17 잔여위험 → #19): 코디가 케이스를 입국·치료 이후 단계
    //   (treatment/follow_up/completed)로 전진시키면 = 실제 유치 → outcome='admitted' 집계.
    //   병원 'converted' 자동집계와 대칭. outcome IS NULL 가드로 코디가 이미 정한 결정
    //   (admitted/lost/취소)은 절대 덮지 않는다. 점수판 '유치 확정됨(되돌리기)'에서 되돌리기 가능.
    if (statusChanged && outcomeForCaseStatus(patch.case_status)) {
      const { error: outErr } = await (supabaseAdmin as any)
        .from("inquiries")
        .update({
          outcome: "admitted",
          outcome_note: `케이스 '${patch.case_status}' 전진 → 유치 자동 집계`,
          outcome_updated_at: new Date().toISOString(),
          outcome_updated_by: auth.userId, // 코디 행동분(병원 자동집계와 달리 '자동' 배지 아님)
        })
        .eq("id", id)
        .is("outcome", null);
      if (outErr) console.error("[cases] outcome auto-set error:", outErr.message);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[cases] PATCH error:", err?.message?.slice(0, 200));
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
