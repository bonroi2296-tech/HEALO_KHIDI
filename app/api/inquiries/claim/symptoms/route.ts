/**
 * healwith: 환자가 «진행상황 링크에서» 증상을 기록한다 (계정 없이) — 사후관리 ICT ⑤
 *
 * POST { token, text, severity?, language? } → 규칙 + AI 2차 위험도 판정 → symptom_reports 저장
 *                                             → 코디 종 알림(항상) + 이상 징후 경보(위험 시)
 *
 * 왜 (2026-09-06 PO «사후관리 3대 보완» B): 증상 기록 화면(/patient/symptoms)은 로그인 환자만 쓸 수
 *   있는데, 실환자 8명 중 계정이 있는 사람은 4명이다. 왓츠앱·메일·에이전시로 들어온 환자가 표준이라
 *   «보려면 먼저 가입»을 두지 않는 진행상황 링크(/claim)에 증상 기록을 붙인다. 로그인 경로와
 *   저장 표·판정·경보는 전부 같다 — 화면 하나가 더 생긴 것뿐이다.
 *
 * ⚠️ 공개 링크로 들어오는 쓰기(claim/submit 과 같은 부류):
 *   ①토큰이 진짜 문의인지 ②횟수 제한 ③글자 상한 ④깨진 인코딩 거부 ⑤환자 실명·연락처는 응답에 안 싣는다.
 *   증상은 심각도 한 줄 + 자유 서술로 받는다(항목별 폼은 폰에서 안 채운다 — 2026-08-20 실측: 환자 증상
 *   제출이 «전부» 저장 실패하던 옛 폼의 교훈).
 */
export const runtime = "nodejs";

import { NextRequest, after } from "next/server";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { checkRateLimitPersistent, getClientIp, getRateLimitHeaders } from "@/lib/rateLimit";
import { hasMojibake } from "@/lib/inquiry/noMojibake";
import { analyzeSymptomsWithAi } from "@/lib/followup/aiTriage";
import type { SymptomReport } from "@/lib/followup/symptomAnalyzer";
import { notifyStaffPatientMessage } from "@/lib/notifications/inApp";
import { appendFollowUp, BY_PATIENT_LINK } from "@/lib/inquiry/followUps";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RATE = { windowMs: 60 * 1000, maxRequests: 6, apiName: "claim_symptoms" };
const MAX_TEXT = 2000;
const LANGS = new Set(["ko", "en", "ru", "kz", "zh", "ja"]);

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await checkRateLimitPersistent(ip, RATE);
  if (!rl.allowed) {
    return Response.json({ ok: false, error: "rate_limited" }, { status: 429, headers: getRateLimitHeaders(rl) });
  }

  try {
    const body = await request.json();
    const token = String(body?.token || "");
    if (!UUID_RE.test(token)) return Response.json({ ok: false, error: "invalid_link" }, { status: 404 });
    if (hasMojibake(body)) return Response.json({ ok: false, error: "broken_encoding" }, { status: 400 });

    const text = String(body?.text || "").trim().slice(0, MAX_TEXT);
    if (!text) return Response.json({ ok: false, error: "text_required" }, { status: 400 });
    const severityRaw = Number(body?.severity);
    const severity = Number.isFinite(severityRaw) ? Math.min(10, Math.max(1, Math.round(severityRaw))) : 5;
    const language = LANGS.has(String(body?.language)) ? String(body.language) : "ru";

    const { data: rows, error: findErr } = await (supabaseAdmin as any)
      .from("inquiries")
      .select("id, is_test, user_id, follow_ups")
      .eq("public_token", token)
      .limit(1);
    if (findErr) throw findErr;
    const inq = rows?.[0];
    if (!inq) return Response.json({ ok: false, error: "invalid_link" }, { status: 404 });

    const report: SymptomReport = {
      followupId: "",
      inquiryId: String(inq.id),
      reportType: "ad_hoc",
      symptoms: [{ symptom: text, severity, duration: "", language }],
    };
    const analysis = await analyzeSymptomsWithAi(report);

    const { data, error } = await (supabaseAdmin as any)
      .from("symptom_reports")
      .insert([
        {
          followup_id: null,
          inquiry_id: inq.id,
          patient_user_id: inq.user_id || null,
          report_type: "ad_hoc",
          symptoms: report.symptoms,
          ai_risk_score: analysis.riskScore,
          ai_assessment: analysis.assessment,
          action_taken: analysis.recommendedAction,
          human_reviewed: false,
        },
      ])
      .select("id, created_at")
      .single();
    if (error) {
      console.error("[claim/symptoms] insert error:", error.message);
      return Response.json({ ok: true, saved: false, analysis: publicView(analysis) });
    }

    // 코디가 «늘 보던 자리»(케이스 상세 「추가 정보」)에도 같은 글을 남긴다 — symptom_reports 는 코디 화면이
    // 직접 보여주지 않고 경보(symptom_alerts)만 보이므로, 위험이 낮은 기록은 여기 없으면 아무도 못 본다.
    // 환자 화면 「보내주신 것」에도 같은 경로로 뜬다. 저장 실패는 기록 본체를 되돌리지 않는다.
    try {
      const tag = `[${urgencyTag(analysis.urgencyLevel)} · ${severity}/10] `;
      const next = appendFollowUp(inq.follow_ups, tag + text, BY_PATIENT_LINK);
      await (supabaseAdmin as any).from("inquiries").update({ follow_ups: next }).eq("id", inq.id);
    } catch (e: any) {
      console.warn("[claim/symptoms] 추가 정보 기록 실패(무시):", e?.message);
    }

    // 환자가 말을 걸었다 — 코디 종(항상) + 위험 시 이상 징후 경보. 응답을 막지 않되 증발도 안 하게 after().
    if (!inq.is_test) {
      after(async () => {
        try {
          await notifyStaffPatientMessage({ inquiryId: Number(inq.id) });
          const risky = analysis.requiresHumanReview || analysis.urgencyLevel === "high" || analysis.urgencyLevel === "emergency";
          // 경보 저장(symptom_alerts.patient_id)은 uuid 를 요구한다 — 계정이 연결된 환자만. 계정 없는 환자는
          // 위 종 알림(우선순위 high)과 「추가 정보」 태그가 코디에게 닿는 길이다.
          if (risky && inq.user_id) {
            const { detectAlerts } = await import("@/lib/symptoms/detect");
            const { saveAndNotifyAlerts } = await import("@/lib/symptoms/alertService");
            const detected = await detectAlerts(
              { id: data.id, patient_id: inq.user_id, pain_score: severity, notes: text, created_at: data.created_at },
              null
            );
            if (detected.length > 0) await saveAndNotifyAlerts(detected);
          }
        } catch (e: any) {
          console.error("[claim/symptoms] 알림 오류(무시):", e?.message);
        }
      });
    }

    return Response.json({ ok: true, saved: true, analysis: publicView(analysis) });
  } catch (err: any) {
    console.error("[inquiries/claim/symptoms]", err?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

/** 코디 화면 태그 — 한국어 고정(코디 표준 언어). */
function urgencyTag(u: string): string {
  return u === "emergency" ? "증상 기록 · 응급 의심" : u === "high" ? "증상 기록 · 확인 필요" : u === "medium" ? "증상 기록 · 주의" : "증상 기록";
}

/** 환자 화면에 내려주는 만큼만 — 내부 평가문(AI 근거 포함)은 코디 화면에서 본다. */
function publicView(a: { urgencyLevel: string; requiresHumanReview: boolean; riskScore: number }) {
  return { urgency: a.urgencyLevel, humanFollowup: a.requiresHumanReview || a.urgencyLevel !== "low" };
}
