/**
 * healwith 외부 서비스 사용량 보드 — 모든 연동 서비스의 사용량을 한 화면용 데이터로 조립.
 *
 * 실측(live): 제미나이 토큰·비용 / Supabase DB·스토리지 용량 / 알림 채널별 발송(Resend·SES·
 *             Twilio·Telegram) / LiveKit 상담방 수.
 * 콘솔(console): Vercel·Sentry — 벤더 Management API 키 미보유 → 무료 한도·콘솔 링크만.
 *
 * 모든 DB 접근은 service_role(supabaseAdmin) — RLS 우회. 실패는 errors 로 표면화(조용한 0 방지).
 */

import "server-only";

import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { getAiUsageSummary } from "@/lib/ai/usageLog";
import { EXTERNAL_SERVICES, FREE_LIMITS, type ExternalService } from "@/lib/admin/externalServices";
import { fetchVercelUsage, fetchSentryUsage } from "@/lib/admin/vendorApis";

function kstDayStartISO(now: Date): string {
  const k = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return `${k.getUTCFullYear()}-${String(k.getUTCMonth() + 1).padStart(2, "0")}-${String(k.getUTCDate()).padStart(2, "0")}T00:00:00+09:00`;
}
function kstMonthInfo(now: Date): { iso: string; dayOfMonth: number; daysInMonth: number } {
  const k = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = k.getUTCFullYear();
  const m = k.getUTCMonth();
  return {
    iso: `${y}-${String(m + 1).padStart(2, "0")}-01T00:00:00+09:00`,
    dayOfMonth: k.getUTCDate(),
    daysInMonth: new Date(Date.UTC(y, m + 1, 0)).getUTCDate(),
  };
}

function pct(value: number, limit: number): number {
  if (!limit || limit <= 0) return 0;
  return Math.round((value / limit) * 1000) / 10;
}
/** %로 상태색 결정. */
function statusOf(p: number | null): "ok" | "warn" | "danger" | "none" {
  if (p === null) return "none";
  if (p >= 90) return "danger";
  if (p >= 70) return "warn";
  return "ok";
}

export interface UsageMetric {
  label: string;
  value: number | string;
  unit?: string;
  limit?: number | string;
  pct?: number | null;
  status?: "ok" | "warn" | "danger" | "none";
  note?: string;
}

export interface ServiceCard extends ExternalService {
  usage: {
    kind: "live" | "proxy" | "console";
    primary: UsageMetric | null;
    extra: UsageMetric[];
  };
}

export interface ServiceUsageBoard {
  generatedAt: string;
  services: ServiceCard[];
  errors: string[];
  topTables: Array<{ table: string; bytes: number }>;
}

export async function getServiceUsageBoard(now: Date = new Date()): Promise<ServiceUsageBoard> {
  const db = supabaseAdmin as any;
  const errors: string[] = [];
  const dayStart = kstDayStartISO(now);
  const month = kstMonthInfo(now);
  const nowISO = now.toISOString();

  // 병렬 수집 ───────────────────────────────────
  // 벤더 API(Vercel·Sentry)는 토큰 없으면 available:false 로 즉시 반환 + 실패 격리(throw 안 함).
  const [geminiMonth, geminiToday, dbUsageRes, notifRes, sessTotalRes, sessMonthRes, vercel, sentry] =
    await Promise.all([
      getAiUsageSummary(month.iso, nowISO),
      getAiUsageSummary(dayStart, nowISO),
      db.rpc("get_external_db_usage"),
      db.from("admin_notification_logs").select("channel, created_at, status").limit(100000),
      db.from("consultation_sessions").select("*", { count: "exact", head: true }),
      db
        .from("consultation_sessions")
        .select("*", { count: "exact", head: true })
        .gte("created_at", month.iso),
      fetchVercelUsage(now).catch((e) => ({ available: false, error: (e as Error).message })),
      fetchSentryUsage().catch((e) => ({ available: false, error: (e as Error).message })),
    ]);

  // 제미나이
  const projectedMonthCost =
    month.dayOfMonth > 0
      ? Math.round((geminiMonth.totals.costUsd / month.dayOfMonth) * month.daysInMonth * 1e6) / 1e6
      : geminiMonth.totals.costUsd;

  // Supabase DB/스토리지
  let dbBytes = 0;
  let storageBytes = 0;
  let storageObjects = 0;
  let topTables: Array<{ table: string; bytes: number }> = [];
  if (dbUsageRes?.error) {
    errors.push(`db_usage: ${dbUsageRes.error.message}`);
  } else if (dbUsageRes?.data) {
    const d = dbUsageRes.data as any;
    dbBytes = Number(d.db_size_bytes ?? 0);
    storageBytes = Number(d.storage_bytes ?? 0);
    storageObjects = Number(d.storage_objects ?? 0);
    topTables = (d.top_tables ?? []) as Array<{ table: string; bytes: number }>;
  }

  // 알림 채널별 집계(이번 달/누적). status='sent'만 셈(실제 발송).
  const notifMonth = new Map<string, number>();
  const notifTotal = new Map<string, number>();
  if (notifRes?.error) {
    errors.push(`notifications: ${notifRes.error.message}`);
  } else {
    for (const r of (notifRes.data ?? []) as Array<{ channel: string | null; created_at: string; status: string | null }>) {
      if (r.status && r.status !== "sent") continue;
      const ch = (r.channel || "unknown").toLowerCase();
      notifTotal.set(ch, (notifTotal.get(ch) ?? 0) + 1);
      if (r.created_at >= month.iso) notifMonth.set(ch, (notifMonth.get(ch) ?? 0) + 1);
    }
  }

  // LiveKit 프록시(상담방 수)
  if (sessTotalRes?.error) errors.push(`sessions_total: ${sessTotalRes.error.message}`);
  if (sessMonthRes?.error) errors.push(`sessions_month: ${sessMonthRes.error.message}`);
  const sessionsTotal = sessTotalRes?.count ?? 0;
  const sessionsMonth = sessMonthRes?.count ?? 0;

  // 벤더 API 결과(토큰 없으면 available:false)
  const vercelU = vercel as { available: boolean; deploymentsThisMonth?: number; productionState?: string; error?: string };
  const sentryU = sentry as { available: boolean; errorsThisMonth?: number; error?: string };
  if (vercelU.error) errors.push(`vercel: ${vercelU.error}`);
  if (sentryU.error) errors.push(`sentry: ${sentryU.error}`);

  // 서비스 카드 조립 ───────────────────────────────
  const services: ServiceCard[] = EXTERNAL_SERVICES.map((s) => {
    let primary: UsageMetric | null = null;
    const extra: UsageMetric[] = [];
    let kind = s.measure;

    if (s.liveKey === "gemini") {
      primary = {
        label: "이번 달 비용(추정)",
        value: geminiMonth.totals.costUsd,
        unit: "USD",
        note: `호출 ${geminiMonth.totals.calls.toLocaleString()}회`,
        status: "none",
      };
      extra.push(
        { label: "월말 예상", value: projectedMonthCost, unit: "USD" },
        { label: "오늘", value: geminiToday.totals.costUsd, unit: "USD" },
        { label: "이번 달 토큰", value: geminiMonth.totals.totalTokens }
      );
    } else if (s.liveKey === "supabase") {
      const p = pct(dbBytes, FREE_LIMITS.supabaseDbBytes);
      primary = {
        label: "DB 용량",
        value: Math.round((dbBytes / (1024 * 1024)) * 10) / 10,
        unit: "MB",
        limit: "500MB",
        pct: p,
        status: statusOf(p),
      };
      const sp = pct(storageBytes, FREE_LIMITS.supabaseStorageBytes);
      extra.push(
        {
          label: "스토리지",
          value: Math.round((storageBytes / (1024 * 1024)) * 10) / 10,
          unit: "MB",
          limit: "1GB",
          pct: sp,
          status: statusOf(sp),
        },
        { label: "스토리지 객체", value: storageObjects, unit: "개" }
      );
    } else if (s.liveKey === "notif") {
      const channels = (s.notifChannels ?? []).map((c) => c.toLowerCase());
      const monthCount = channels.reduce((sum, c) => sum + (notifMonth.get(c) ?? 0), 0);
      const totalCount = channels.reduce((sum, c) => sum + (notifTotal.get(c) ?? 0), 0);
      const limitNum = s.id === "resend" ? FREE_LIMITS.resendMonthly : null;
      const p = limitNum ? pct(monthCount, limitNum) : null;
      primary = {
        label: "이번 달 발송",
        value: monthCount,
        unit: "건",
        ...(limitNum ? { limit: `${limitNum.toLocaleString()}건` } : {}),
        pct: p,
        status: statusOf(p),
      };
      extra.push({ label: "누적 발송", value: totalCount, unit: "건" });
    } else if (s.liveKey === "livekit") {
      primary = {
        label: "이번 달 상담방",
        value: sessionsMonth,
        unit: "개",
        note: "정확한 영상 사용 분은 콘솔",
        status: "none",
      };
      extra.push({ label: "누적 상담방", value: sessionsTotal, unit: "개" });
    } else if (s.id === "vercel" && vercelU.available) {
      kind = "live";
      primary = {
        label: "이번 달 배포",
        value: vercelU.deploymentsThisMonth ?? 0,
        unit: "회",
        note: "대역폭·함수 사용량은 콘솔",
        status: "none",
      };
      if (vercelU.productionState) {
        extra.push({ label: "프로덕션 상태", value: vercelU.productionState });
      }
    } else if (s.id === "sentry" && sentryU.available) {
      kind = "live";
      const limit = 5000;
      const v = sentryU.errorsThisMonth ?? 0;
      const p = pct(v, limit);
      primary = {
        label: "최근 30일 오류",
        value: v,
        unit: "건",
        limit: `${limit.toLocaleString()}건`,
        pct: p,
        status: statusOf(p),
      };
    }
    // 토큰 없는 console 서비스(vercel·sentry)는 primary 없음 — 무료 한도·콘솔 링크만.

    return { ...s, usage: { kind, primary, extra } };
  });

  return {
    generatedAt: nowISO,
    services,
    errors,
    topTables,
  };
}
