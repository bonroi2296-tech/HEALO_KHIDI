export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { checkHospitalAuth } from "@/lib/auth/checkHospitalAuth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { syncLeadStatusToCase } from "@/lib/khidi/leadCaseSync";
import { decryptInquiryForAdmin } from "@/lib/security/decryptForAdmin";
import { logAdminAction, getIpFromRequest, getUserAgentFromRequest } from "@/lib/audit/adminAuditLog";
import { loadPostcare } from "@/lib/followup/postcareBoard";

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
      // 환자 최근 활동 요약(2026-09-06) — 병원이 «환자가 지금 어떤 상태인지» 알게. 증상 원문·판정 근거는 코디 몫이라 안 내린다.
      activity: null as null | { symptoms60d: number; latestUrgency: string | null; latestAt: string | null; openRequests: number },
    };

    if (norm?.source_inquiry_id != null) {
      // (supabase as any): 생성된 DB 타입이 일부 컬럼에 stale — 에이전시 라우트와 동일 우회.
      const { data: inqRaw } = await (supabase as any)
        .from("inquiries")
        .select("id, first_name, last_name, nationality, spoken_language, preferred_date, preferred_date_flex, treatment_type, cancer_type, message, intake, attachments, insurance_provider, insurance_coverage, insurance_status, lead_quality")
        .eq("id", norm.source_inquiry_id)
        .maybeSingle();
      let activity: any = null;
      try {
        const pc = await loadPostcare(supabase as any, { inquiryIds: [Number(norm.source_inquiry_id)], days: 60, includeAssessment: false });
        const latest = pc.symptoms[0] || null;
        activity = {
          symptoms60d: pc.symptoms.length,
          latestUrgency: latest?.urgency || null,
          latestAt: latest?.createdAt || null,
          openRequests: pc.requests.filter((r) => r.status === "pending" || r.status === "proposed").length,
        };
      } catch { /* 요약 하나가 상세를 죽이지 않게 */ }
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
          activity,
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
