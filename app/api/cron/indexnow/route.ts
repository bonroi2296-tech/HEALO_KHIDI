/**
 * IndexNow 제출 cron — 매일 16:00 KST (07:00 UTC, 오후 3시 배포 창구 한 시간 뒤), vercel.json.
 *
 * 무엇: 사이트맵(app/sitemap.js)이 «지금» 내놓는 주소 가운데 최근에 바뀐 것(lastModified 3일 안)을
 *   api.indexnow.org 에 보낸다 → 빙·얀덱스·네이버·Seznam 이 받는다. 월요일(UTC)엔 전부 한 번 보낸다.
 *   `?full=1` 을 붙이면 요일과 무관하게 전부(첫 제출·수동 확인용, 크론 비밀키 필요).
 * 왜: src/lib/seo/indexNow.ts 머리말. 요지 — 빙 색인 0쪽, 얀덱스 재크롤은 손으로 넣던 일이었다.
 * 개인정보: 공개 사이트맵 주소만 나간다(문의·상담·환자 화면은 robots 차단 = 사이트맵에 없다).
 */

export const runtime = "nodejs";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/security/cronAuth";
import { siteUrl } from "@/lib/siteUrl";
import { INDEXNOW_WINDOW_DAYS, pickIndexNowUrls, submitIndexNow } from "@/lib/seo/indexNow";
import sitemap from "../../../sitemap";

/** 월요일(UTC) = 전체 재제출일. 사이트맵에서 빠진 날이 있어도 일주일 안에 다시 닿는다. */
export function isFullSubmissionDay(d: Date): boolean {
  return d.getUTCDay() === 1;
}

async function handle(request: NextRequest) {
  if (!verifyCronSecret(request.headers.get("authorization"))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const t0 = Date.now();
  const forced = new URL(request.url).searchParams.get("full") === "1";
  const full = forced || isFullSubmissionDay(new Date());
  const mode = full ? "full" : "recent";
  try {
    const entries = await sitemap();
    const host = new URL(siteUrl()).host;
    const urls = pickIndexNowUrls(entries as any, { host, full, windowDays: INDEXNOW_WINDOW_DAYS });
    if (urls.length === 0) {
      console.log(`[cron/indexnow] mode=${mode} candidates=${entries?.length ?? 0} submitted=0 (보낼 변경 없음) ${Date.now() - t0}ms`);
      return NextResponse.json({ ok: true, mode, submitted: 0, status: 0 });
    }
    const r = await submitIndexNow({ host, urls });
    console.log(
      `[cron/indexnow] mode=${mode} candidates=${entries?.length ?? 0} submitted=${r.submitted} status=${r.status} ${Date.now() - t0}ms`
    );
    // 엔진이 거절(403 키 불일치·422 host 불일치·429 상한)하면 크론 기록에 빨간불이 남게 502.
    return NextResponse.json({ ok: r.ok, mode, submitted: r.submitted, status: r.status }, { status: r.ok ? 200 : 502 });
  } catch (err: any) {
    console.error("[cron/indexnow] failed:", err?.message);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
