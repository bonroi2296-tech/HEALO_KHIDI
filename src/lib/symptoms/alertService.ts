/**
 * healwith: symptom_alerts 저장 + 코디네이터·환자 알림 발송 서비스 (FR-16)
 *
 * - symptom_alerts 테이블에 INSERT
 * - 코디네이터 in-app 알림 (notifications 테이블)
 * - severity=high/critical 시 이메일도 발송 (AWS SES / Resend)
 * - 환자에게 "코디네이터에게 전달됐습니다" 안심 알림
 * - Fail-safe: 알림 실패해도 throw 하지 않음
 */

import "server-only";

import { getSupabaseServerClient } from "@/lib/data/supabaseServerClient";
import { sendEmail } from "@/lib/email/sendEmail";
import type { DetectedAlert } from "./detect";

const SEVERITY_PRIORITY: Record<string, string> = {
  critical: "urgent",
  high: "high",
  medium: "normal",
  low: "low",
};

const SEVERITY_LABEL: Record<string, string> = {
  critical: "🚨 긴급",
  high: "⚠️ 높음",
  medium: "📋 보통",
  low: "ℹ️ 낮음",
};

const ALERT_TYPE_LABEL: Record<string, string> = {
  fever_high: "고열 감지",
  pain_critical: "통증 위험",
  silence_long: "장기 무입력",
  symptom_worsening: "증상 급악화",
  ai_risk: "AI 위험 감지",
};

// ─────────────────────────────────────────────
// 코디네이터 user_id 조회 (해당 환자 담당 코디네이터)
// coordinator 테이블이 없으면 app_metadata.role='coordinator' 전체에게
// ─────────────────────────────────────────────
async function getCoordinatorIds(patientId: string): Promise<string[]> {
  const supabase = getSupabaseServerClient();
  // consultation_sessions에서 coordinator_id 조회 시도
  const { data: sessions } = await supabase
    .from("consultation_sessions")
    .select("coordinator_id, coordinator_user_id")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(1);

  const session = sessions?.[0] as any;
  const coordId = session?.coordinator_user_id || session?.coordinator_id;
  if (coordId) {
    return [coordId];
  }

  // 담당 코디네이터 없으면 COORDINATOR_FALLBACK_EMAIL env로 fallback
  const fallbackEmail = process.env.COORDINATOR_FALLBACK_EMAIL;
  if (fallbackEmail) {
    const { data: users } = await supabase.auth.admin
      ? (await (await import("@/lib/rag/supabaseAdmin")).supabaseAdmin
          .from("users" as any)
          .select("id")
          .eq("email", fallbackEmail)
          .limit(1))
      : { data: null };
    if (users && (users as any[]).length > 0) {
      return [(users as any[])[0].id];
    }
  }

  return [];
}

// ─────────────────────────────────────────────
// In-app 알림 INSERT (notifications 테이블)
// ─────────────────────────────────────────────
async function insertNotification(
  userId: string,
  alert: DetectedAlert,
  alertId: string,
  role: "coordinator" | "patient"
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const typeLabel = ALERT_TYPE_LABEL[alert.alert_type] || alert.alert_type;
  const severityLabel = SEVERITY_LABEL[alert.severity] || "";

  let title: string;
  let body: string;
  let link: string;

  if (role === "coordinator") {
    title = `${severityLabel} ${typeLabel}`;
    body = `환자 증상 이상치가 감지됐습니다. 즉시 확인이 필요합니다.`;
    link = `/coordinator/alerts?alert=${alertId}`;
  } else {
    title = "증상 기록이 코디네이터에게 전달됐습니다";
    body = "코디네이터가 곧 확인하고 필요 시 연락드리겠습니다. 안심하세요.";
    link = `/patient/symptoms`;
  }

  await (supabase as any).from("notifications").insert({
    user_id: userId,
    type: "symptom_alert",
    title,
    body,
    link,
    priority: SEVERITY_PRIORITY[alert.severity] || "normal",
    payload: {
      alert_id: alertId,
      alert_type: alert.alert_type,
      severity: alert.severity,
      patient_id: alert.patient_id,
    },
  } as any);
}

// ─────────────────────────────────────────────
// 이메일 발송 (high/critical severity)
// ─────────────────────────────────────────────
async function sendAlertEmail(
  alert: DetectedAlert,
  alertId: string
): Promise<void> {
  const recipientEmail =
    process.env.COORDINATOR_FALLBACK_EMAIL ||
    process.env.ADMIN_EMAIL_ALLOWLIST?.split(",")[0]?.trim();

  if (!recipientEmail) return;

  const typeLabel = ALERT_TYPE_LABEL[alert.alert_type] || alert.alert_type;
  const severityLabel = SEVERITY_LABEL[alert.severity] || "";
  const appUrl = process.env.NEXT_PUBLIC_URL || "https://healo.com";

  await sendEmail({
    to: recipientEmail,
    subject: `[healwith] ${severityLabel} ${typeLabel} — 환자 이상치 감지`,
    html: `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <div style="background:${alert.severity === "critical" ? "#dc2626" : "#ea580c"};color:white;padding:16px 20px;border-radius:8px 8px 0 0">
    <h2 style="margin:0">${severityLabel} ${typeLabel}</h2>
    <p style="margin:4px 0 0;font-size:13px;opacity:.9">healwith 사후 관리 이상치 감지 시스템</p>
  </div>
  <div style="background:#f9fafb;padding:20px;border:1px solid #e5e7eb;border-radius:0 0 8px 8px">
    <p style="color:#374151;margin:0 0 12px"><strong>감지 유형:</strong> ${typeLabel}</p>
    <p style="color:#374151;margin:0 0 12px"><strong>심각도:</strong> ${alert.severity}</p>
    <p style="color:#374151;margin:0 0 12px"><strong>환자 ID:</strong> ${alert.patient_id}</p>
    <p style="color:#374151;margin:0 0 20px"><strong>감지 데이터:</strong><br>
      <code style="background:#e5e7eb;padding:8px;display:block;border-radius:4px;font-size:12px;white-space:pre-wrap">${JSON.stringify(alert.data, null, 2)}</code>
    </p>
    <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:6px;padding:12px;margin-bottom:20px;font-size:13px;color:#92400e">
      ⚠️ 본 알림은 의학적 진단이 아닙니다. 코디네이터가 직접 환자 상태를 확인하여 필요 시 의료진에게 연결해 주세요.
    </div>
    <a href="${appUrl}/coordinator/alerts?alert=${alertId}"
       style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold">
      코디네이터 알림 확인하기
    </a>
  </div>
</body></html>`,
    text: `[healwith] ${severityLabel} ${typeLabel}\n환자 ID: ${alert.patient_id}\n감지 데이터: ${JSON.stringify(alert.data)}\n\n확인: ${appUrl}/coordinator/alerts?alert=${alertId}\n\n⚠️ 이 알림은 의학적 진단이 아닙니다.`,
    tags: { source: "symptom_alert", severity: alert.severity },
  });
}

// ─────────────────────────────────────────────
// 메인: 감지된 알림들을 DB 저장 + 알림 발송
// ─────────────────────────────────────────────
export async function saveAndNotifyAlerts(
  alerts: DetectedAlert[]
): Promise<string[]> {
  if (alerts.length === 0) return [];

  const savedIds: string[] = [];
  const supabase = getSupabaseServerClient();

  for (const alert of alerts) {
    try {
      // 1. symptom_alerts INSERT
      const { data: inserted, error } = await (supabase as any)
        .from("symptom_alerts")
        .insert({
          patient_id: alert.patient_id,
          symptom_entry_id: alert.symptom_entry_id || null,
          alert_type: alert.alert_type,
          severity: alert.severity,
          detected_by: alert.detected_by,
          data: alert.data,
        } as any)
        .select("id")
        .single();

      if (error || !inserted) {
        console.error("[alertService] insert 실패:", error?.message);
        continue;
      }

      const alertId: string = (inserted as any).id;
      savedIds.push(alertId);

      // 2. 코디네이터 in-app 알림
      const coordinatorIds = await getCoordinatorIds(alert.patient_id);
      for (const cId of coordinatorIds) {
        await insertNotification(cId, alert, alertId, "coordinator").catch((e) =>
          console.warn("[alertService] 코디 알림 실패:", e.message)
        );
      }

      // 3. high/critical → 이메일
      if (alert.severity === "high" || alert.severity === "critical") {
        await sendAlertEmail(alert, alertId).catch((e) =>
          console.warn("[alertService] 이메일 실패:", e.message)
        );
      }

      // 4. 환자 안심 알림 (중복 방지: ai_risk 제외)
      if (alert.alert_type !== "silence_long") {
        await insertNotification(alert.patient_id, alert, alertId, "patient").catch(
          (e) => console.warn("[alertService] 환자 알림 실패:", e.message)
        );
      }
    } catch (err: any) {
      console.error("[alertService] 처리 중 오류 (무시):", err.message);
    }
  }

  return savedIds;
}
