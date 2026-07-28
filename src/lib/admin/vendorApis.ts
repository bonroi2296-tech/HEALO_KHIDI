/**
 * healwith 벤더 사용량 API 연동 (Vercel · Sentry)
 *
 * 이 둘은 우리 DB 로 못 재서, 벤더 API 토큰이 있어야 라이브로 볼 수 있다.
 * 토큰이 env 에 있으면 라이브 집계, 없으면 available:false 로 떨어져 화면은 콘솔 링크만 보인다
 * (= PO 가 토큰을 넣는 순간 코드 수정 없이 자동으로 라이브 전환).
 *
 * 필요 env:
 *  - Vercel: VERCEL_API_TOKEN (필수), VERCEL_TEAM_ID(팀 프로젝트면), VERCEL_PROJECT_ID(prj_…) 또는
 *            VERCEL_PROJECT_NAME(기본 "healo-khidi")
 *  - Sentry: SENTRY_AUTH_TOKEN (필수), SENTRY_ORG(필수), SENTRY_PROJECT(선택 — 조직 전체면 생략)
 *
 * 모든 호출은 4초 타임아웃 + 실패 격리 — 벤더가 느리거나 죽어도 어드민 화면을 막지 않는다.
 */

import "server-only";

const TIMEOUT_MS = 4000;

async function fetchJson(url: string, headers: Record<string, string>): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers, signal: ctrl.signal, cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

/** 이번 달 1일 0시(KST) → epoch ms */
function monthStartMs(now: Date): number {
  const k = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return new Date(`${k.getUTCFullYear()}-${String(k.getUTCMonth() + 1).padStart(2, "0")}-01T00:00:00+09:00`).getTime();
}

export interface VercelUsage {
  available: boolean;
  deploymentsThisMonth?: number;
  productionState?: string;
  error?: string;
}

export async function fetchVercelUsage(now: Date = new Date()): Promise<VercelUsage> {
  const token = process.env.VERCEL_API_TOKEN;
  if (!token) return { available: false };
  const teamId = process.env.VERCEL_TEAM_ID;
  const teamQ = teamId ? `&teamId=${encodeURIComponent(teamId)}` : "";
  const headers = { Authorization: `Bearer ${token}` };

  try {
    // 프로젝트 ID 확보(없으면 이름으로 조회)
    let projectId = process.env.VERCEL_PROJECT_ID;
    if (!projectId) {
      const name = process.env.VERCEL_PROJECT_NAME || "healo-khidi";
      const proj = await fetchJson(
        `https://api.vercel.com/v9/projects/${encodeURIComponent(name)}?${teamQ.slice(1)}`,
        headers
      );
      projectId = proj?.id;
    }
    if (!projectId) return { available: false, error: "project_not_found" };

    const since = monthStartMs(now);
    const data = await fetchJson(
      `https://api.vercel.com/v6/deployments?projectId=${encodeURIComponent(projectId)}&since=${since}&limit=100${teamQ}`,
      headers
    );
    const deployments = (data?.deployments ?? []) as Array<{ state?: string; target?: string }>;
    const prod = deployments.find((d) => d.target === "production");
    return {
      available: true,
      deploymentsThisMonth: deployments.length,
      productionState: prod?.state,
    };
  } catch (e) {
    return { available: false, error: (e as Error).message };
  }
}

export interface SentryUsage {
  available: boolean;
  errorsThisMonth?: number;
  error?: string;
}

export async function fetchSentryUsage(): Promise<SentryUsage> {
  const token = process.env.SENTRY_AUTH_TOKEN;
  const org = process.env.SENTRY_ORG;
  if (!token || !org) return { available: false };
  const project = process.env.SENTRY_PROJECT;
  const headers = { Authorization: `Bearer ${token}` };

  try {
    const projectQ = project ? `&project=${encodeURIComponent(project)}` : "";
    // 최근 30일 error 이벤트 합계(무료 5,000/월 대비 근사)
    const data = await fetchJson(
      `https://sentry.io/api/0/organizations/${encodeURIComponent(org)}/stats_v2/` +
        `?field=sum(quantity)&category=error&statsPeriod=30d&interval=1d${projectQ}`,
      headers
    );
    // stats_v2 응답: { groups: [{ totals: { "sum(quantity)": N }, series: {...} }], ... }
    let total = 0;
    const groups = (data?.groups ?? []) as Array<{ totals?: Record<string, number> }>;
    for (const g of groups) {
      total += Number(g.totals?.["sum(quantity)"] ?? 0);
    }
    return { available: true, errorsThisMonth: total };
  } catch (e) {
    return { available: false, error: (e as Error).message };
  }
}
