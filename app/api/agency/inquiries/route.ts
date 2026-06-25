/**
 * healwith: 에이전시 포털 — 내 에이전시가 의뢰한 환자들의 진행 상황 조회
 *
 * GET /api/agency/inquiries
 *   → 본 에이전시(agency_id)에 배정된 inquiries 의 진행상황·보험상태 + 단계 이력.
 *
 * 인증: checkAgencyAuth. 환자 PII 는 마스킹, 보험 증권번호 등 민감정보는 미노출.
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { checkAgencyAuth } from "@/lib/auth/checkAgencyAuth";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { decryptInquiryForAdmin } from "@/lib/security/decryptForAdmin";
import { caseStatusLabel, CASE_STATUS_STEPS } from "@/lib/khidi/caseStatus";

function maskName(first?: string | null, last?: string | null): string {
  const n = `${(first || "").trim()} ${(last || "").trim()}`.trim();
  if (!n) return "(이름없음)";
  return `${[...n][0] || ""}***`;
}

// 첨부서류(attachments 버킷) → signed URL.
// 전 케이스의 첨부 path 를 한 번의 createSignedUrls(복수형) 로 묶어 서명한다. (이전엔 첨부당 개별 호출 →
// 다수 케이스·다수 첨부 시 서명 요청이 수십 개 동시에 터져 storage 504/지연 발생.) path→url 맵을 만들어 동기 매핑.
async function buildAttachmentUrlMap(rows: any[]): Promise<Map<string, string>> {
  const paths = Array.from(new Set(
    (rows || []).flatMap((r: any) => (Array.isArray(r.attachments) ? r.attachments : []))
      .map((a: any) => a?.path).filter((p: any): p is string => typeof p === "string" && p.length > 0)
  ));
  const map = new Map<string, string>();
  if (paths.length === 0) return map;
  const { data } = await supabaseAdmin.storage.from("attachments").createSignedUrls(paths, 3600);
  (data || []).forEach((s: any) => { if (s?.path && s?.signedUrl) map.set(s.path, s.signedUrl); });
  return map;
}

function mapAttachments(atts: any, urlByPath: Map<string, string>): any[] {
  return (Array.isArray(atts) ? atts : []).map((a: any) => ({
    name: a?.name || null,
    category: a?.category || "other",
    type: a?.type || null,
    url: a?.path ? (urlByPath.get(a.path) || null) : null,
  }));
}

export async function GET(request: NextRequest) {
  const auth = await checkAgencyAuth(request);
  if (!auth.isAgencyUser || !auth.agencyId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 403 });
  }
  try {
    assertSupabaseEnv();
    const { data: rows, error } = await (supabaseAdmin as any)
      .from("inquiries")
      .select("id, created_at, nationality, cancer_type, first_name, last_name, case_status, case_status_note, case_status_updated_at, insurance_provider, insurance_status, outcome, attachments, intake")
      .eq("agency_id", auth.agencyId)
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) {
      console.error("[agency/inquiries] list error:", error.message);
      return NextResponse.json({ ok: false, error: "list_failed" }, { status: 500 });
    }

    const ids = (rows || []).map((r: any) => r.id);
    // 단계 이력 (타임라인)
    const historyMap = new Map<number, any[]>();
    // 화상상담 일정·상태 (consultation_sessions → inquiry 직접 연결)
    const consultMap = new Map<number, any[]>();
    // 발행된 견적 (inquiry → cancer_patient_intakes → cost_estimates)
    const estimateMap = new Map<number, any[]>();
    // 에이전시 메신저 미읽음(코디 답장 안 본 수) + 스레드 상태
    const threadMap = new Map<number, { threadId: string; unread: number; status: string }>();

    if (ids.length > 0) {
      const { data: hist } = await (supabaseAdmin as any)
        .from("case_status_history")
        .select("inquiry_id, status, note, created_at")
        .in("inquiry_id", ids)
        .order("created_at", { ascending: true });
      (hist || []).forEach((h: any) => {
        const arr = historyMap.get(h.inquiry_id) || [];
        arr.push({ status: h.status, status_label: caseStatusLabel(h.status), note: h.note, at: h.created_at });
        historyMap.set(h.inquiry_id, arr);
      });

      // 화상상담
      const { data: consults } = await (supabaseAdmin as any)
        .from("consultation_sessions")
        .select("id, inquiry_id, scheduled_at, status, started_at")
        .in("inquiry_id", ids)
        .order("scheduled_at", { ascending: false });
      (consults || []).forEach((s: any) => {
        const arr = consultMap.get(s.inquiry_id) || [];
        arr.push({ id: s.id, scheduled_at: s.scheduled_at, status: s.status, started_at: s.started_at });
        consultMap.set(s.inquiry_id, arr);
      });

      // 견적: intake(id↔inquiry) → 발행된 cost_estimates 만
      const { data: intakes } = await (supabaseAdmin as any)
        .from("cancer_patient_intakes")
        .select("id, inquiry_id")
        .in("inquiry_id", ids);
      const intakeToInquiry = new Map<string, number>();
      (intakes || []).forEach((it: any) => { if (it.id) intakeToInquiry.set(it.id, it.inquiry_id); });
      const intakeIds = [...intakeToInquiry.keys()];
      if (intakeIds.length > 0) {
        const { data: ests } = await (supabaseAdmin as any)
          .from("cost_estimates")
          .select("id, intake_id, total_krw, total_usd, quotation_no, quotation_pdf_url, quotation_issued_at, status")
          .in("intake_id", intakeIds)
          .not("quotation_issued_at", "is", null) // 발행분만 — 초안은 에이전시 비노출
          .order("quotation_issued_at", { ascending: false });
        (ests || []).forEach((e: any) => {
          const inqId = intakeToInquiry.get(e.intake_id);
          if (!inqId) return;
          const arr = estimateMap.get(inqId) || [];
          arr.push({
            id: e.id, total_krw: e.total_krw, total_usd: e.total_usd,
            quotation_no: e.quotation_no, pdf_url: e.quotation_pdf_url,
            issued_at: e.quotation_issued_at, status: e.status,
          });
          estimateMap.set(inqId, arr);
        });
      }

      // 메신저 스레드(에이전시 채널) + 미읽음 계산
      const { data: threads } = await (supabaseAdmin as any)
        .from("chat_threads")
        .select("id, inquiry_id, status, metadata")
        .in("inquiry_id", ids)
        .eq("channel", "agency");
      const threadIds = (threads || []).map((t: any) => t.id);
      const coordByThread = new Map<string, string[]>(); // thread_id → coord/admin 메시지 시각들
      if (threadIds.length > 0) {
        const { data: msgs } = await (supabaseAdmin as any)
          .from("chat_messages")
          .select("thread_id, actor_type, created_at")
          .in("thread_id", threadIds)
          .in("actor_type", ["coordinator", "admin"]);
        (msgs || []).forEach((m: any) => {
          const arr = coordByThread.get(m.thread_id) || [];
          arr.push(m.created_at);
          coordByThread.set(m.thread_id, arr);
        });
      }
      (threads || []).forEach((t: any) => {
        const lastRead = t.metadata?.agency_last_read_at || "1970-01-01";
        const unread = (coordByThread.get(t.id) || []).filter((at: string) => at > lastRead).length;
        threadMap.set(t.inquiry_id, { threadId: t.id, unread, status: t.status });
      });
    }

    // intake 에서 안전한 의료 상세필드만 화이트리스트로 추출(암호화 PII 키는 제외)
    const DETAIL_KEYS = ["sex", "birthYear", "stage", "diagnosisDate", "diagnosedHospital", "treatmentState", "priorTreatment"];
    const pickDetail = (intake: any) => {
      const o = intake && typeof intake === "object" && !Array.isArray(intake) ? intake : {};
      const d: Record<string, string> = {};
      for (const k of DETAIL_KEYS) if (o[k] != null && String(o[k]).trim()) d[k] = String(o[k]);
      return d;
    };

    // 첨부 서명 URL — 전 케이스를 한 번에 묶어 서명(개별 호출 N→1)
    const urlByPath = await buildAttachmentUrlMap(rows || []);

    const cases = await Promise.all((rows || []).map(async (r: any) => {
      const dec = await decryptInquiryForAdmin(r).catch(() => r);
      return {
        id: r.id,
        name: maskName(dec?.first_name, dec?.last_name),
        nationality: r.nationality || "(미상)",
        cancer_type: r.cancer_type || "-",
        created_at: r.created_at,
        case_status: r.case_status,
        case_status_label: caseStatusLabel(r.case_status),
        case_status_note: r.case_status_note,
        case_status_updated_at: r.case_status_updated_at,
        insurance_provider: r.insurance_provider,
        insurance_status: r.insurance_status,
        detail: pickDetail(r.intake),
        attachments: mapAttachments(r.attachments, urlByPath),
        timeline: historyMap.get(r.id) || [],
        consultations: consultMap.get(r.id) || [],
        estimates: estimateMap.get(r.id) || [],
        thread: threadMap.get(r.id) || null,
      };
    }));

    return NextResponse.json({
      ok: true,
      agency: {
        id: auth.agencyId,
        name: auth.agencyName,
        partnerType: auth.partnerType || "agency",
      },
      cases,
      statusSteps: CASE_STATUS_STEPS,
    });
  } catch (err: any) {
    console.error("[agency/inquiries] error:", err?.message?.slice(0, 200));
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
