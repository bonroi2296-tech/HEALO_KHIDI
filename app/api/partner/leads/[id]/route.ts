export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { checkHospitalAuth } from "@/lib/auth/checkHospitalAuth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { caseStatusOrder, outcomeForHospitalLeadStatus } from "@/lib/khidi/caseStatus";
import { decryptInquiryForAdmin } from "@/lib/security/decryptForAdmin";
import { logAdminAction, getIpFromRequest, getUserAgentFromRequest } from "@/lib/audit/adminAuditLog";

const VALID_STATUSES = ["sent", "viewed", "replied", "converted", "rejected"];

// 환자 이름은 노출(PO 결정 2026-06-24 — 병원이 식별 필요). 단 이메일·전화·연락처는 미노출(코디 중개).
function patientName(first?: string | null, last?: string | null): string {
  const n = `${(first || "").trim()} ${(last || "").trim()}`.trim();
  return n || "이름 미상";
}

// intake JSONB 에서 임상 판단에 필요한 안전 필드만 화이트리스트(신·구 키 둘 다). PII 키 제외.
const DETAIL_LABELS: Record<string, string> = {
  sex: "성별", age: "나이", birthYear: "출생연도", birth_year: "출생연도",
  stage: "병기", diagnosis_date: "진단일", diagnosisDate: "진단일",
  diagnosed_hospital: "진단 병원", diagnosedHospital: "진단 병원",
  treatment_state: "현재 치료상태", treatmentState: "현재 치료상태",
  prior_treatment: "기존 치료", priorTreatment: "기존 치료",
  travel_timing: "방한 가능 시기",
};
function pickDetail(intake: any): { label: string; value: string }[] {
  const o = intake && typeof intake === "object" && !Array.isArray(intake) ? intake : {};
  const out: { label: string; value: string }[] = [];
  const seen = new Set<string>();
  for (const [k, label] of Object.entries(DETAIL_LABELS)) {
    const v = o[k];
    if (v == null || String(v).trim() === "") continue;
    if (seen.has(label)) continue; // snake/camel 중복 라벨 한 번만
    seen.add(label);
    out.push({ label, value: String(v) });
  }
  return out;
}

async function signAttachments(supabase: any, atts: any): Promise<any[]> {
  if (!Array.isArray(atts) || atts.length === 0) return [];
  return Promise.all(
    atts.slice(0, 20).map(async (a: any) => {
      let url: string | null = null;
      if (a?.path) {
        const { data } = await supabase.storage.from("attachments").createSignedUrl(a.path, 3600);
        url = data?.signedUrl || null;
      }
      return { name: a?.name || "첨부파일", category: a?.category || "other", type: a?.type || null, url };
    })
  );
}

// 가능시간 슬롯 정제 — [{at: ISO, note?}]. 최대 5개, 유효 날짜만.
function cleanSlots(input: unknown): { at: string; note: string | null }[] {
  return (Array.isArray(input) ? input : [])
    .map((s: any) => {
      const at = s?.at ? new Date(String(s.at)) : null;
      if (!at || isNaN(at.getTime())) return null;
      return { at: at.toISOString(), note: s?.note ? String(s.note).slice(0, 200) : null };
    })
    .filter(Boolean)
    .slice(0, 5) as { at: string; note: string | null }[];
}

// 코디가 읽을 KST 문자열 ("2026-06-25 14:00 KST")
function fmtKst(iso: string): string {
  try {
    const s = new Date(iso).toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false,
    });
    return `${s} KST`;
  } catch { return iso; }
}

/**
 * GET — 병원이 견적·치료가능 여부를 판단할 임상 상세(원본 의뢰에서 복호화).
 * 환자 신원·연락처는 미노출(코디 중개). 첨부 의료기록은 signed URL.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkHospitalAuth(request);
  if (!auth.isHospitalUser || !auth.hospitalId) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 403 });
  }
  try {
    const { id } = await params;
    const supabase = createServiceRoleClient();

    const { data: lead } = await supabase
      .from("hospital_leads")
      .select("id, hospital_id, status, assigned_at, quoted_price_min, quoted_price_max, notes, metadata, normalized_inquiry_id")
      .eq("id", id)
      .maybeSingle();
    if (!lead) return Response.json({ ok: false, error: "lead_not_found" }, { status: 404 });
    if (lead.hospital_id !== auth.hospitalId) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 403 });
    }

    const { data: norm } = lead.normalized_inquiry_id
      ? await supabase
          .from("normalized_inquiries")
          .select("source_inquiry_id, objective, treatment_slug, country, language, source_type")
          .eq("id", lead.normalized_inquiry_id)
          .maybeSingle()
      : { data: null };

    let detail: any = {
      patient: "익명 환자",
      country: norm?.country || null,
      language: norm?.language || null,
      cancer_type: null,
      treatment_type: norm?.treatment_slug || null,
      objective: norm?.objective || null,
      source_type: norm?.source_type || null,
      preferred_date: null,
      preferred_date_flex: false,
      message: null,
      clinical: [],
      insurance: null,
      attachments: [],
    };

    if (norm?.source_inquiry_id != null) {
      // (supabase as any): 생성된 DB 타입이 일부 컬럼에 stale — 에이전시 라우트와 동일 우회.
      const { data: inqRaw } = await (supabase as any)
        .from("inquiries")
        .select("id, first_name, last_name, nationality, spoken_language, preferred_date, preferred_date_flex, treatment_type, cancer_type, message, intake, attachments, insurance_provider, insurance_coverage, insurance_status, lead_quality")
        .eq("id", norm.source_inquiry_id)
        .maybeSingle();
      if (inqRaw) {
        const inq = await decryptInquiryForAdmin(inqRaw).catch(() => inqRaw);
        detail = {
          patient: patientName(inq.first_name, inq.last_name),
          country: inq.nationality || detail.country,
          language: inq.spoken_language || detail.language,
          cancer_type: inq.cancer_type || null,
          treatment_type: inq.treatment_type || detail.treatment_type,
          objective: detail.objective,
          source_type: detail.source_type,
          preferred_date: inq.preferred_date || null,
          preferred_date_flex: !!inq.preferred_date_flex,
          message: typeof inq.message === "string" ? inq.message : null,
          clinical: pickDetail(inq.intake),
          insurance: inq.insurance_provider || inq.insurance_coverage || inq.insurance_status
            ? { provider: inq.insurance_provider || null, coverage: inq.insurance_coverage || null, status: inq.insurance_status || null }
            : null,
          lead_quality: inq.lead_quality || null,
          attachments: await signAttachments(supabase, inqRaw.attachments),
        };

        // 감사로그: 국내병원이 환자 PII(이름·의료상세·첨부 의료문서 서명URL)를 열람했음 기록.
        // 정부 의료데이터 과제 추적성(GDPR/PIPA·복호화 열람 감사). 실패해도 본 응답은 진행.
        void logAdminAction({
          adminEmail: auth.email || `hospital:${auth.hospitalId}`,
          adminUserId: auth.userId,
          action: "PARTNER_VIEW_CASES",
          inquiryIds: [Number(norm.source_inquiry_id)],
          ipAddress: getIpFromRequest(request),
          userAgent: getUserAgentFromRequest(request),
          metadata: { partner_type: "hospital", hospital_id: auth.hospitalId, lead_id: String(lead.id) },
        });
      }
    }

    return Response.json({
      ok: true,
      lead: {
        id: lead.id,
        status: lead.status,
        assigned_at: lead.assigned_at,
        quoted_price_min: lead.quoted_price_min,
        quoted_price_max: lead.quoted_price_max,
        notes: lead.notes,
        consult_slots: (lead.metadata as any)?.consult_slots || [],
      },
      detail,
    });
  } catch (err: any) {
    console.error("[partner/leads/id] GET error:", err?.message?.slice(0, 200));
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

/**
 * 병원의 리드 응답을 의뢰(case_status)로 되돌려 반영 — 코디·에이전시가 보게.
 * 병원 상태 → 케이스 단계/메모/이력. 코디가 이미 더 진행시킨 단계는 후퇴시키지 않는다.
 */
async function syncLeadStatusToCase(
  supabase: any,
  leadId: string,
  newStatus: string,
  hospitalId: string,
  userId: string | undefined,
  quote: { min?: number | null; max?: number | null },
  slots: { at: string; note: string | null }[]
) {
  try {
    // 리드 → normalized_inquiry → 원본 의뢰 id
    const { data: lead } = await supabase
      .from("hospital_leads")
      .select("normalized_inquiry_id")
      .eq("id", leadId)
      .maybeSingle();
    if (!lead?.normalized_inquiry_id) return;
    const { data: norm } = await supabase
      .from("normalized_inquiries")
      .select("source_inquiry_id")
      .eq("id", lead.normalized_inquiry_id)
      .maybeSingle();
    const inquiryId = norm?.source_inquiry_id;
    if (inquiryId == null) return;

    const { data: hosp } = await supabase.from("hospitals").select("name").eq("id", hospitalId).maybeSingle();
    const hName = hosp?.name || "병원";
    const { data: inq } = await supabase.from("inquiries").select("case_status").eq("id", inquiryId).maybeSingle();
    const curStatus: string | null = inq?.case_status ?? null;

    const slotText = slots.length
      ? ` · 📹 원격협진 가능시간: ${slots.map((s) => fmtKst(s.at) + (s.note ? `(${s.note})` : "")).join(", ")}`
      : "";

    let note = "";
    let targetStatus: string | null = curStatus;

    if (newStatus === "replied" || newStatus === "converted") {
      const q = quote.min != null || quote.max != null ? ` (견적 ${quote.min ?? "?"}~${quote.max ?? "?"})` : "";
      note = `🏥 ${hName} ${newStatus === "converted" ? "치료 확정" : "회신"}${q}${slotText}`;
      // 병원이 회신/확정하면 '치료 일정·견적 조율 중'으로 전진(이미 더 간 단계면 유지).
      if (caseStatusOrder(curStatus) < caseStatusOrder("scheduling")) targetStatus = "scheduling";
    } else if (newStatus === "rejected") {
      note = `🏥 ${hName} 거절`;
      // 다른 병원이 수락할 수 있으니 단계는 후퇴/변경하지 않음(메모·이력만).
      targetStatus = curStatus;
    } else {
      return; // viewed 등은 케이스 반영 안 함
    }

    const now = new Date().toISOString();
    const patch: any = { case_status_note: note, case_status_updated_at: now };
    if (targetStatus && targetStatus !== curStatus) patch.case_status = targetStatus;
    await supabase.from("inquiries").update(patch).eq("id", inquiryId);
    await supabase.from("case_status_history").insert({
      inquiry_id: inquiryId,
      status: targetStatus || curStatus || "hospital_review",
      note,
      created_by: userId ?? null,
    });

    // 병원이 '치료 확정'하면 실제 유치 → 유치 전환 점수판(KHIDI 평가 지표)에 자동 집계.
    //   (PO 결정 2026-06-21) 에이전시→병원 의뢰 경로 확정분이 유치 카운트에서 누락되던 구멍.
    //   단 '자동은 하되 되돌리기 가능': 코디가 이미 내린 결정(admitted/lost)은 절대 덮어쓰지
    //   않는다(outcome IS NULL 일 때만 자동 기록). 코디가 점수판에서 '유치 취소'(→null)/'이탈'
    //   하면 그게 유지된다(병원 상태가 다시 바뀌지 않는 한 재집계 안 함). 시스템 자동분은
    //   outcome_updated_by=null 로 표시해 점수판이 '자동' 배지로 구분·되돌리기 가능.
    const autoOutcome = outcomeForHospitalLeadStatus(newStatus);
    if (autoOutcome) {
      await supabase
        .from("inquiries")
        .update({
          outcome: autoOutcome,
          outcome_note: `🏥 ${hName} 치료 확정 (자동 유치 집계)`,
          outcome_updated_at: now,
          outcome_updated_by: null, // 시스템 자동 — 코디 수동분과 구분(되돌리기 UI에서 '자동' 배지)
        })
        .eq("id", inquiryId)
        .is("outcome", null); // 코디가 이미 정한 결정은 보존(되돌리기 우선)
    }
  } catch (e: any) {
    console.error("[partner/leads/id] case sync error:", e?.message?.slice(0, 200));
    // 케이스 반영 실패해도 리드 업데이트 자체는 성공 처리(베스트에포트).
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkHospitalAuth(request);
  if (!auth.isHospitalUser || !auth.hospitalId) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 403 });
  }

  if (auth.role === "viewer") {
    return Response.json({ ok: false, error: "viewer_cannot_update" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = createServiceRoleClient();

    // Verify lead belongs to this hospital
    const { data: existing, error: findErr } = await supabase
      .from("hospital_leads")
      .select("id, hospital_id, status, metadata")
      .eq("id", id)
      .single();

    if (findErr || !existing) {
      return Response.json({ ok: false, error: "lead_not_found" }, { status: 404 });
    }

    if (existing.hospital_id !== auth.hospitalId) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 403 });
    }

    const updates: any = { last_status_at: new Date().toISOString() };

    if (body.status && VALID_STATUSES.includes(body.status)) {
      updates.status = body.status;
      if (body.status === "replied" && !(existing as any).first_response_at) {
        updates.first_response_at = new Date().toISOString();
      }
    }

    if (body.quoted_price_min !== undefined) updates.quoted_price_min = body.quoted_price_min;
    if (body.quoted_price_max !== undefined) updates.quoted_price_max = body.quoted_price_max;
    if (body.notes !== undefined) updates.notes = body.notes;

    // 원격협진 가능시간 — metadata.consult_slots 에 보관
    let slots: { at: string; note: string | null }[] = [];
    if (body.consult_slots !== undefined) {
      slots = cleanSlots(body.consult_slots);
      updates.metadata = { ...((existing as any).metadata || {}), consult_slots: slots };
    } else {
      slots = ((existing as any).metadata?.consult_slots) || [];
    }

    const { data, error } = await supabase
      .from("hospital_leads")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[partner/leads/id] Update error:", error.message);
      return Response.json({ ok: false, error: "update_failed" }, { status: 500 });
    }

    // 역방향: 병원 응답을 의뢰 case_status 로 반영 → 코디·에이전시가 봄 (가능시간 포함)
    // 상태가 바뀔 때 + 이미 회신/확정 상태에서 가능시간만 갱신 저장해도 코디에게 다시 전달.
    const effStatus = updates.status || existing.status;
    const statusChanged = updates.status && updates.status !== existing.status;
    const slotsResaved = body.consult_slots !== undefined && ["replied", "converted"].includes(effStatus);
    if (statusChanged || slotsResaved) {
      await syncLeadStatusToCase(supabase, id, effStatus, auth.hospitalId, auth.userId, {
        min: data?.quoted_price_min ?? null,
        max: data?.quoted_price_max ?? null,
      }, slots);
    }

    return Response.json({ ok: true, lead: data });
  } catch (err: any) {
    console.error("[partner/leads/id] Exception:", err.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
