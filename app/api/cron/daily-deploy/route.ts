/**
 * healwith: 배포 창구를 «깃허브 예약» 대신 «Vercel 예약»이 연다 (2026-07-31 PO 결정)
 *
 * GET /api/cron/daily-deploy — 하루 한 번, 오후 3시(KST). main 의 최신 커밋으로
 * 프로덕션 배포 한 건을 만든다. 그 한 건이 그날 머지된 것 전부를 포함한다.
 *
 * 왜 옮겼나 — 깃허브가 예약을 제때 안 깨운다(2026-07-31 실측):
 *   창구(오후 3시 예약)가 3일 연속 2시간 36~48분 늦게 시작 → 실제 배포는 오후 5시 40분쯤.
 *   같은 저장소의 10분 감시기도 24시간에 144회가 아니라 14회만 돌았다(간격 64~191분).
 *   만든 시각 = 시작 시각이라 «일꾼 대기»가 아니라 «깨우는 단계»가 늦은 것 → 설정으론 못 고친다.
 *
 * 왜 「새 열쇠 없이」 되나 (2026-07-31):
 *   원래는 깃허브 토큰을 새로 발급해 production 가지를 미는 안이었는데, 발급 화면이 2단계
 *   인증을 요구해 PO 손이 묶였다. 이 저장소는 **공개**라 main 의 최신 커밋은 열쇠 없이 읽히고,
 *   배포를 만드는 데 필요한 `VERCEL_API_TOKEN`·`VERCEL_TEAM_ID` 는 **이미 실서비스 환경에 있다**.
 *   → 새로 발급받을 열쇠가 없다.
 *
 * 예비 창구(.github/workflows/daily-deploy.yml)는 그대로 둔다 — 이 경로가 실패해도 늦게라도 나간다.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/security/cronAuth";

const REPO = process.env.GITHUB_DEPLOY_REPO || "bonroi2296-tech/HEALO_KHIDI";
const REPO_ID = Number(process.env.GITHUB_REPO_ID || 1178442315);
const PROJECT = process.env.VERCEL_PROJECT_NAME || "healo-khidi";
const PROJECT_ID = process.env.VERCEL_PROJECT_ID || "prj_5W5Md15wbvvkJt7k61mOqBjqYdt8";
const BRANCH = "main";

/** 공개 저장소라 열쇠 없이 읽는다. 하루 몇 번이라 깃허브 무인증 한도(시간당 60)에 한참 못 미친다. */
async function latestMainSha(): Promise<string> {
  const res = await fetch(`https://api.github.com/repos/${REPO}/commits/${BRANCH}`, {
    cache: "no-store",
    headers: { accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`main_read_failed_${res.status}`);
  const body = await res.json();
  if (!body?.sha) throw new Error("main_sha_missing");
  return body.sha as string;
}

/** 지금 실서비스로 살아 있는 배포가 어느 커밋인지. 없으면 null(첫 배포). */
async function liveSha(token: string, teamId?: string): Promise<string | null> {
  const q = new URLSearchParams({ projectId: PROJECT_ID, target: "production", limit: "1" });
  if (teamId) q.set("teamId", teamId);
  const res = await fetch(`https://api.vercel.com/v6/deployments?${q}`, {
    cache: "no-store",
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`deployments_read_failed_${res.status}`);
  const body = await res.json();
  const d = body?.deployments?.[0];
  // 실패·취소된 배포를 「살아있다」고 보면 그날 배포를 통째로 건너뛴다 → READY 만 인정한다.
  if (!d || d.state !== "READY") return null;
  return d?.meta?.githubCommitSha ?? null;
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request.headers.get("authorization"))) {
    console.warn("[cron/daily-deploy] Unauthorized cron access");
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const token = process.env.VERCEL_API_TOKEN || process.env.VERCEL_TOKEN;
  if (!token) {
    console.error("[cron/daily-deploy] VERCEL_API_TOKEN 없음 — 배포 창구를 못 연다");
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }
  const teamId = process.env.VERCEL_TEAM_ID;

  try {
    const sha = await latestMainSha();
    const live = await liveSha(token, teamId);

    // 이미 같은 커밋이 살아 있으면 그날 머지된 게 없다는 뜻 → 빌드 한 건을 통째로 아낀다.
    if (live && live === sha) {
      console.log("[cron/daily-deploy] 새 머지 없음 — 배포 생략");
      return NextResponse.json({ ok: true, deployed: false, reason: "no_new_merge" });
    }

    const q = new URLSearchParams({ forceNew: "1" });
    if (teamId) q.set("teamId", teamId);
    const res = await fetch(`https://api.vercel.com/v13/deployments?${q}`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        name: PROJECT,
        target: "production",
        gitSource: { type: "github", repoId: REPO_ID, ref: BRANCH, sha },
        // 이 표식이 있어야 「안 볼 배포는 짓지 않는다」 규칙(scripts/vercel-ignore-build.sh)이
        // 창구 배포를 통과시킨다. 가지 이름이 main 이라 다른 조건엔 안 걸린다.
        build: { env: { DEPLOY_WINDOW: "1" } },
      }),
    });
    if (!res.ok) {
      console.error("[cron/daily-deploy] 배포 생성 실패:", res.status, await res.text());
      return NextResponse.json({ ok: false, error: "deploy_failed" }, { status: 502 });
    }

    const created = await res.json();
    console.log(`[cron/daily-deploy] 창구 열림 — ${sha.slice(0, 7)} (${created?.id})`);
    return NextResponse.json({ ok: true, deployed: true, sha: sha.slice(0, 7), id: created?.id });
  } catch (err: any) {
    // 응답에 원문 오류를 싣지 않는다(내부 구조 노출 금지) — 자세한 건 서버 로그에만.
    console.error("[cron/daily-deploy] error:", err?.message);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
