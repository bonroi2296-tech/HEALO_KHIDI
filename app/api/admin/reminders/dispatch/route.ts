/**
 * healwith: 리마인더 수동 디스패치 — 어드민 전용 프록시
 *
 * POST /api/admin/reminders/dispatch
 *
 * 왜(2026-07-02 전수 감사): 기존 화면은 브라우저 prompt 로 CRON_SECRET 을 직접 입력받아
 * /api/cron/dispatch-reminders 를 호출 — 시크릿이 브라우저에 노출되는 관행.
 * 어드민 인증으로 감싸고 시크릿은 서버에서만 주입한다(cron 로직 재사용, 복제 없음).
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";
import { POST as cronDispatch } from "../../../cron/dispatch-reminders/route";

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  if (!process.env.CRON_SECRET) {
    return Response.json({ ok: false, error: "cron_secret_missing" }, { status: 500 });
  }

  const proxied = new NextRequest("http://internal/api/cron/dispatch-reminders", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  return cronDispatch(proxied);
}
