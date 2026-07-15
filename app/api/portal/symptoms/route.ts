/**
 * healwith: 환자 증상 기록(사후관리) — 로그인 환자 본인 기준 (서버 경유)
 *
 * GET  /api/portal/symptoms → { ok, reports, inquiryId } = 본인 symptom_reports 60건
 * POST /api/portal/symptoms { symptoms[], report_type?, additionalNotes? } → AI분석+저장
 *
 * 배경(P1): symptom_reports 는 service_role 전용 RLS → 브라우저 직접조회는 빈 데이터.
 * 기존 환자 페이지는 ①읽기를 필터 없이 직접조회(빈 데이터) ②쓰기를 inquiryId 없이 보내
 * 리포트가 환자에 연결 안 돼 본인 조회·사후관리 KPI 집계가 끊겨 있었음.
 * → 여기서 본인 inquiry 를 **서버에서 해석**(클라가 inquiryId 보내면 IDOR)해 연결한다.
 * inquiries.email 은 AES(IV랜덤) 암호화라 복호화-매칭(admin/users·journey 패턴, 파일럿 규모).
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { decryptStringNullable } from "@/lib/security/encryptionV2";
import { analyzeSymptoms, type SymptomReport } from "@/lib/followup/symptomAnalyzer";
import { hasMojibake } from "@/lib/inquiry/noMojibake";

function safeDecrypt(enc: any): string {
  try {
    return decryptStringNullable(enc) || "";
  } catch {
    return "";
  }
}

/** 로그인 이메일과 일치하는 본인 문의 id 목록(최근순). 복호화-매칭. */
async function findOwnInquiryIds(userEmail: string): Promise<number[]> {
  const target = (userEmail || "").trim().toLowerCase();
  if (!target) return [];
  const { data } = await supabaseAdmin
    .from("inquiries")
    .select("id, email, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  return (data || [])
    .filter((i: any) => safeDecrypt(i.email).trim().toLowerCase() === target)
    .map((i: any) => i.id);
}

export async function GET(request: NextRequest) {
  const auth = await requirePortalAuth(request);
  if (!auth.success) return auth.response;

  try {
    const ids = await findOwnInquiryIds(auth.email || "");
    // 본인 기록 = patient_user_id(직접 소유) 또는 본인 inquiry 연결분.
    // patient_user_id 만으로도 잡히게 해 문의 없는 환자도 본인 기록을 본다.
    let q = supabaseAdmin
      .from("symptom_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(60);
    q = ids.length > 0
      ? q.or(`patient_user_id.eq.${auth.userId},inquiry_id.in.(${ids.join(",")})`)
      : q.eq("patient_user_id" as any, auth.userId);
    const { data, error } = await q;
    if (error) {
      console.error("[portal/symptoms] GET error:", error.message);
      return Response.json({ ok: false, error: "query_failed" }, { status: 500 });
    }
    return Response.json({ ok: true, reports: data || [], inquiryId: ids[0] ?? null });
  } catch (err: any) {
    console.error("[portal/symptoms] GET exception:", err?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePortalAuth(request);
  if (!auth.success) return auth.response;

  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  // 인코딩 깨진 본문(U+FFFD) 거부 — 깨진 한글이 DB·알림메일에 그대로 박힘 (POSTMORTEMS #92)
  if (hasMojibake(payload)) {
    return Response.json(
      { ok: false, error: "broken_encoding", detail: "body contains U+FFFD — send UTF-8" },
      { status: 400 }
    );
  }

  if (!payload?.symptoms || !Array.isArray(payload.symptoms) || payload.symptoms.length === 0) {
    return Response.json({ ok: false, error: "symptoms_required" }, { status: 400 });
  }

  try {
    // 본인 inquiry 서버 해석(IDOR 차단 — 클라가 보낸 inquiryId 신뢰 안 함)
    const ids = await findOwnInquiryIds(auth.email || "");
    const inquiryId = ids[0] ?? null;

    const report: SymptomReport = {
      followupId: "",
      inquiryId: inquiryId != null ? String(inquiryId) : "",
      reportType: payload.report_type || payload.reportType || "self",
      symptoms: payload.symptoms.map((s: any) => ({
        symptom: s.symptom || s.name || "",
        severity: parseInt(s.severity) || 1,
        duration: s.duration || "",
        language: s.language || payload.language || "ru",
      })),
      additionalNotes:
        payload.additionalNotes || payload.symptoms?.[0]?.notes || undefined,
    };

    const analysis = analyzeSymptoms(report);

    const { data, error } = await supabaseAdmin
      .from("symptom_reports")
      .insert([
        {
          followup_id: null,
          inquiry_id: inquiryId, // 본인 문의에 연결(없으면 null — 사후관리 KPI는 inquiry 연결분만)
          patient_user_id: auth.userId, // 작성자(환자) — 문의 없어도 본인 기록 조회 가능
          report_type: report.reportType,
          symptoms: report.symptoms,
          ai_risk_score: analysis.riskScore,
          ai_assessment: analysis.assessment,
          action_taken: analysis.recommendedAction,
          human_reviewed: false,
        },
      ] as any)
      .select("id, ai_risk_score, ai_assessment, action_taken, created_at, symptoms")
      .single();

    if (error) {
      console.error("[portal/symptoms] insert error:", error.message);
      // 분석은 돌려주되 저장 실패 표시
      return Response.json({ ok: true, analysis, saved: false });
    }

    // 이상치 자동 감지 → 코디 알림 (비동기, 응답 차단 X)
    ;(async () => {
      try {
        const { detectAlerts } = await import("@/lib/symptoms/detect");
        const { saveAndNotifyAlerts } = await import("@/lib/symptoms/alertService");
        const firstSym = report.symptoms[0];
        const entry = {
          id: data.id,
          patient_id: auth.userId,
          pain_score: firstSym?.severity ?? undefined,
          notes: report.symptoms.map((s: any) => s.symptom).filter(Boolean).join(" "),
          created_at: new Date().toISOString(),
        };
        const detected = await detectAlerts(entry, null);
        if (detected.length > 0) await saveAndNotifyAlerts(detected);
      } catch (e: any) {
        console.error("[portal/symptoms] 감지 오류(무시):", e?.message);
      }
    })();

    return Response.json({ ok: true, analysis, report: data, saved: true });
  } catch (err: any) {
    console.error("[portal/symptoms] POST exception:", err?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
