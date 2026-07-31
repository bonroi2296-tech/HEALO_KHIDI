/**
 * healwith: 배포 창구를 «깃허브 예약» 대신 «Vercel 예약»이 연다 (2026-07-31 PO 결정)
 *
 * GET /api/cron/daily-deploy  — 하루 한 번, 오후 3시(KST). 하는 일은 창구 워크플로와 같다:
 * main 을 production 가지로 밀면 Vercel 이 그날치를 한 번에 짓는다.
 *
 * 왜 옮겼나 — 깃허브가 예약을 제때 안 깨운다(2026-07-31 실측):
 *   창구(오후 3시 예약)가 3일 연속 2시간 36~48분 늦게 시작 → 실제 배포는 오후 5시 40분쯤.
 *   같은 저장소의 10분 감시기도 24시간에 144회가 아니라 14회만 돌았다(간격 64~191분).
 *   만든 시각 = 시작 시각이라 «일꾼 대기»가 아니라 «깨우는 단계»가 늦은 것 → 우리 설정으로는 못 고친다.
 *   Vercel 예약은 정시에 돈다.
 *
 * 필요한 열쇠: GITHUB_DEPLOY_TOKEN — 이 저장소 contents:write 하나만 가진 세분화 토큰.
 *   없으면 아무것도 안 하고 503 을 돌려준다(조용히 성공한 척하지 않는다).
 *
 * 깃허브 쪽 예약 워크플로(.github/workflows/daily-deploy.yml)는 **예비로 남겨둔다** —
 * 이 경로가 이미 밀어놨으면 그쪽은 «새 머지 없음»으로 스스로 건너뛴다.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/security/cronAuth";

const REPO = process.env.GITHUB_DEPLOY_REPO || "bonroi2296-tech/HEALO_KHIDI";
const SOURCE_BRANCH = "main";
const DEPLOY_BRANCH = "production";

async function gh(path: string, token: string, init?: RequestInit) {
  return fetch(`https://api.github.com/repos/${REPO}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      ...(init?.headers || {}),
    },
  });
}

async function branchSha(branch: string, token: string): Promise<string | null> {
  const res = await gh(`/git/ref/heads/${branch}`, token);
  if (res.status === 404) return null; // production 가지가 아직 없을 수 있다
  if (!res.ok) throw new Error(`ref_read_failed_${branch}_${res.status}`);
  const body = await res.json();
  return body?.object?.sha ?? null;
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request.headers.get("authorization"))) {
    console.warn("[cron/daily-deploy] Unauthorized cron access");
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const token = process.env.GITHUB_DEPLOY_TOKEN;
  if (!token) {
    console.error("[cron/daily-deploy] GITHUB_DEPLOY_TOKEN 없음 — 배포 창구를 못 연다");
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  try {
    const mainSha = await branchSha(SOURCE_BRANCH, token);
    if (!mainSha) throw new Error("main_ref_missing");

    // 이미 같으면 그날 머지된 게 없다는 뜻 → 빌드 한 건을 통째로 아낀다(창구 워크플로와 같은 판정).
    const prodSha = await branchSha(DEPLOY_BRANCH, token);
    if (prodSha === mainSha) {
      console.log("[cron/daily-deploy] 새 머지 없음 — 배포 생략");
      return NextResponse.json({ ok: true, deployed: false, reason: "no_new_merge" });
    }

    // force 안 쓴다 — main 을 앞지른 뭔가가 production 에 있으면 조용히 덮어쓰지 말고 실패해야 한다.
    const res = await gh(`/git/refs/heads/${DEPLOY_BRANCH}`, token, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sha: mainSha, force: false }),
    });
    if (!res.ok) {
      console.error("[cron/daily-deploy] production 밀기 실패:", res.status, await res.text());
      return NextResponse.json({ ok: false, error: "push_failed" }, { status: 502 });
    }

    console.log(`[cron/daily-deploy] 창구 열림 — ${DEPLOY_BRANCH} → ${mainSha.slice(0, 7)}`);
    return NextResponse.json({ ok: true, deployed: true, sha: mainSha.slice(0, 7) });
  } catch (err: any) {
    // 응답에 원문 오류를 싣지 않는다(내부 구조 노출 금지) — 자세한 건 서버 로그에만.
    console.error("[cron/daily-deploy] error:", err?.message);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
