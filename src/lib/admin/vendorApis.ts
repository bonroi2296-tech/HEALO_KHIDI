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

/**
 * 빌드 1분(벽시계)당 추정 요금(USD).
 *
 * ⚠️ **추정치다. 벤더 실값이 아니다.** Vercel 은 크레딧 소진액을 주는 공개 API 가 없어서
 *    (2026-07-28 `/v1/usage`·`/v1/spend`·청구 엔드포인트 전수 시도 — 전부 거부) 직접 계산한다.
 *
 * 교정 근거(2026-07-28 실측): 사용량 대시보드 «Build CPU Minutes 83시간 = $14.13» ÷
 * 같은 기간 배포 API 로 센 빌드 벽시계 991분 = **$0.01426/분**. 빌드 머신이 바뀌거나
 * 단가가 바뀌면 어긋난다 → **콘솔 실값과 크게 벌어지면 이 상수를 다시 교정할 것.**
 */
export const EST_USD_PER_BUILD_MINUTE = 0.0143;

/** 배포 목록을 훑을 때의 전체 마감시간(ms). 넘으면 부분집계 + truncated 로 표시. */
const DEPLOY_SCAN_BUDGET_MS = 8000;

export interface VercelDeploymentLike {
  state?: string;
  target?: string | null;
  buildingAt?: number;
  ready?: number;
}

/**
 * 배포 목록 → 빌드 집계. 순수 함수(테스트 대상) — 돈이 걸린 산수라 따로 뺐다.
 *
 * - `builtDeployments`: 실제로 지어진 것(READY). 요금은 여기서만 나온다.
 * - `skippedDeployments`: CANCELED — ignoreCommand 가 «안 볼 배포»로 판정해 건너뛴 것
 *   (+ 사람이 취소한 것). **이 숫자가 0 으로 떨어지면 배포 스킵 규칙이 풀렸다는 신호다.**
 * - 벽시계 시간은 **음수·1시간 초과를 버린다**: 큐 대기나 기록 누락이 섞이면 합계가 망가진다
 *   (실제로 2026-07-28 집계에서 `buildingAt=0` 인 행이 «8,900만 분»을 만들어 냈다).
 */
export function summarizeDeployments(deployments: VercelDeploymentLike[]): {
  deploymentsThisPeriod: number;
  productionDeployments: number;
  builtDeployments: number;
  skippedDeployments: number;
  buildWallMinutes: number;
  estimatedBuildCostUsd: number;
} {
  const built = deployments.filter((d) => d.state === "READY");
  const buildWallMinutes = built.reduce((sum, d) => {
    const ms = (d.ready ?? 0) - (d.buildingAt ?? 0);
    return sum + (d.buildingAt && d.ready && ms > 0 && ms < 3_600_000 ? ms / 60_000 : 0);
  }, 0);
  return {
    deploymentsThisPeriod: deployments.length,
    productionDeployments: deployments.filter((d) => d.target === "production").length,
    builtDeployments: built.length,
    skippedDeployments: deployments.filter((d) => d.state === "CANCELED").length,
    buildWallMinutes: Math.round(buildWallMinutes),
    estimatedBuildCostUsd: Math.round(buildWallMinutes * EST_USD_PER_BUILD_MINUTE * 100) / 100,
  };
}

export interface VercelUsage {
  available: boolean;
  /** 벤더 실값: 요금제(pro/hobby 등) */
  plan?: string;
  /** 벤더 실값: 이번 청구주기 시작·종료 ISO */
  periodStart?: string;
  periodEnd?: string;
  /** 벤더 실값: 주기당 포함 크레딧(USD) */
  includedCreditUsd?: number;
  /** 우리 실측: 이번 «청구주기» 배포 수(전체 / 프로덕션 / 실제 빌드된 것 / 스킵된 것) */
  deploymentsThisPeriod?: number;
  productionDeployments?: number;
  builtDeployments?: number;
  skippedDeployments?: number;
  /** 우리 실측: 실제 빌드된 것들의 벽시계 합계(분) */
  buildWallMinutes?: number;
  /** 추정: 빌드비(USD) — 벤더 실값 아님 */
  estimatedBuildCostUsd?: number;
  /** 배포가 너무 많아 다 못 셌음(부분집계) */
  truncated?: boolean;
  /** 하위호환: 예전 화면이 쓰던 «이번 달 배포 수» */
  deploymentsThisMonth?: number;
  productionState?: string;
  error?: string;
}

export async function fetchVercelUsage(now: Date = new Date()): Promise<VercelUsage> {
  // VERCEL_TOKEN 도 받는다 — 로컬 .env.local 이 그 이름을 쓰고 있어서, 이름이 달라
  // 「왜 화면이 비지?」로 헤매는 걸 막는다.
  const token = process.env.VERCEL_API_TOKEN || process.env.VERCEL_TOKEN;
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

    // ① 벤더 실값 — 청구주기·요금제·포함 크레딧. 팀이 아니면 이 정보가 없으니 조용히 건너뛴다.
    let plan: string | undefined;
    let periodStart: number | undefined;
    let periodEnd: number | undefined;
    let includedCreditUsd: number | undefined;
    if (teamId) {
      try {
        const team = await fetchJson(`https://api.vercel.com/v2/teams/${encodeURIComponent(teamId)}`, headers);
        const b = team?.billing ?? {};
        plan = b.plan;
        periodStart = Number(b.period?.start) || undefined;
        periodEnd = Number(b.period?.end) || undefined;
        const included = b.invoiceItems?.includedAllocationUsd?.quantity;
        includedCreditUsd = Number.isFinite(Number(included)) ? Number(included) : undefined;
      } catch {
        // 청구 정보를 못 읽어도 배포 집계는 계속한다.
      }
    }

    // ② 우리 실측 — 청구주기(모르면 이번 달) 안의 배포를 전부 훑는다.
    const since = periodStart ?? monthStartMs(now);
    const deadline = Date.now() + DEPLOY_SCAN_BUDGET_MS;
    const deployments: VercelDeploymentLike[] = [];
    let until: number | undefined;
    let truncated = false;
    for (let page = 0; page < 12; page++) {
      if (Date.now() > deadline) {
        truncated = true;
        break;
      }
      const url =
        `https://api.vercel.com/v6/deployments?projectId=${encodeURIComponent(projectId)}` +
        `&since=${since}&limit=100${teamQ}` +
        (until ? `&until=${until}` : "");
      const data = await fetchJson(url, headers);
      const batch = (data?.deployments ?? []) as VercelDeploymentLike[];
      deployments.push(...batch);
      const next = data?.pagination?.next;
      if (!batch.length || !next) break;
      until = Number(next);
      if (page === 11) truncated = true;
    }

    return {
      available: true,
      plan,
      periodStart: periodStart ? new Date(periodStart).toISOString() : undefined,
      periodEnd: periodEnd ? new Date(periodEnd).toISOString() : undefined,
      includedCreditUsd,
      ...summarizeDeployments(deployments),
      truncated,
      deploymentsThisMonth: deployments.length,
      productionState: deployments.find((d) => d.target === "production")?.state,
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
