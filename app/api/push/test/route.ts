/**
 * healwith: 푸시 발송 검증용 (admin 전용)
 *
 * 경로: POST /api/push/test
 * 권한: requireAdminAuth (admin role + allowlist)
 * Body: { token?: string, title?: string, body?: string }
 *   - token 주면 그 기기 1대에 발송, 없으면 호출한 admin 본인 기기(들)에 발송.
 *
 * Firebase env(FCM_PROJECT_ID·GOOGLE_SERVICE_ACCOUNT_JSON) 미설정이면 skipped=true 로 정직하게 응답.
 * 실기기에서 알림 수신을 눈으로 확인하는 게 최종 검증.
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";
import { sendPush, sendPushToUser } from "@/lib/push/fcm";

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    /* body 없어도 됨 */
  }

  const title = typeof body?.title === "string" && body.title.trim() ? body.title.trim() : "healwith 테스트 알림";
  const text = typeof body?.body === "string" && body.body.trim() ? body.body.trim() : "푸시 발송이 정상 동작합니다.";
  const payload = { title, body: text, data: { route: "/" } };

  const token = typeof body?.token === "string" ? body.token.trim() : "";

  if (token) {
    const r = await sendPush(token, payload);
    return Response.json({ ok: r.ok, skipped: r.skipped, dead: !!r.dead });
  }

  const userId = auth.authResult.userId;
  if (!userId) {
    return Response.json({ ok: false, error: "no_user" }, { status: 400 });
  }
  const r = await sendPushToUser(userId, payload);
  return Response.json(r);
}
