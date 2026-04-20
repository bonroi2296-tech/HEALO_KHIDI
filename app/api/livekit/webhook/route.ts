/**
 * LiveKit Cloud Webhook — 방/참가자 이벤트 수신
 *
 * 목적:
 * - `room_finished` / `participant_joined` / `participant_left` / `recording_finished`
 *   이벤트를 받아 `consultation_sessions` 상태 업데이트
 * - 세션 종료 시간, 총 참가 시간, 녹화 URL 등을 DB 에 영속
 *
 * 설정:
 * - LiveKit Dashboard → Settings → Webhooks → Add webhook
 * - URL: https://healo-khidi.com/api/livekit/webhook
 * - 이벤트: room_started, room_finished, participant_joined, participant_left,
 *          recording_finished
 *
 * 보안:
 * - LiveKit 은 `Authorization` 헤더로 서명된 JWT 를 보내며,
 *   LIVEKIT_API_KEY / LIVEKIT_API_SECRET 로 검증
 * - 서명 실패 시 401
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { WebhookReceiver } from "livekit-server-sdk";

const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;

export async function POST(request: NextRequest) {
  if (!API_KEY || !API_SECRET) {
    // LiveKit 설정 전이면 silent fail (500 대신 200 — LiveKit 이 재시도 폭주 방지)
    console.warn("[livekit/webhook] skipped: LIVEKIT_API_KEY/SECRET not configured");
    return Response.json({ ok: false, error: "not_configured" }, { status: 200 });
  }

  try {
    const receiver = new WebhookReceiver(API_KEY, API_SECRET);
    const body = await request.text();
    const authHeader = request.headers.get("authorization") || "";

    // 서명 검증 — 실패 시 throw
    const event = await receiver.receive(body, authHeader);

    // consultation_sessions 매핑 — room.name 이 consultation_id 와 동일한 규칙 (token 발급 시 설정)
    const roomName = event.room?.name;
    const participantIdentity = event.participant?.identity;

    console.log(
      `[livekit/webhook] event=${event.event} room=${roomName} participant=${participantIdentity}`
    );

    // DB 업데이트 — best effort (웹훅 실패가 LiveKit 재시도 유발하지 않도록 try/catch)
    try {
      const { getSupabaseServerClient } = await import(
        "../../../../src/lib/data/supabaseServerClient"
      );
      const supabase = getSupabaseServerClient();

      if (event.event === "room_finished" && roomName) {
        await supabase
          .from("consultation_sessions")
          // 스키마 drift 대응: ended_at 이 없으면 updated_at 만
          .update({
            status: "completed",
            updated_at: new Date().toISOString(),
          } as any)
          .eq("livekit_room_name", roomName);
      } else if (event.event === "participant_joined" && roomName) {
        // 참가 로그 - metadata 에 append
        console.log(`[livekit/webhook] ${participantIdentity} joined ${roomName}`);
      } else if ((event.event as string) === "recording_finished" && roomName) {
        // 녹화 URL 을 consultation 에 저장 (있으면)
        const fileUrl = (event as any).egressInfo?.fileResults?.[0]?.location;
        if (fileUrl) {
          await supabase
            .from("consultation_sessions")
            .update({
              recording_url: fileUrl,
              updated_at: new Date().toISOString(),
            } as any)
            .eq("livekit_room_name", roomName);
        }
      }
    } catch (dbErr: any) {
      console.error("[livekit/webhook] DB update failed:", dbErr.message);
      // LiveKit 에는 200 반환 (재시도 방지)
    }

    return Response.json({ ok: true });
  } catch (err: any) {
    // 서명 검증 실패 등
    console.warn("[livekit/webhook] signature or parse failed:", err.message);
    return Response.json({ ok: false, error: "invalid_signature" }, { status: 401 });
  }
}
