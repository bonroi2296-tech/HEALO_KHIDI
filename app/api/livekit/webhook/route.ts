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
 * - URL: https://healwith.co.kr/api/livekit/webhook
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
        "@/lib/data/supabaseServerClient"
      );
      const supabase = getSupabaseServerClient();

      if (event.event === "room_finished" && roomName) {
        // ⚠️ 의도적으로 status 를 바꾸지 않는다.
        // 'completed' 는 KHIDI 성과지표 K-02(사전상담·사후관리 건수) 집계의 기준이므로,
        // staff 가 상담관리 화면에서 직접 완료 처리하는 것이 유일한 정본 경로다
        // (#620 is_test 격리와 같은 '정직한 실적' 원칙).
        // LiveKit 방이 물리적으로 끝났다고(참가자 전원 퇴장/타임아웃) 자동으로 completed 를
        // 찍으면 테스트콜·중단된 콜까지 실적으로 집계돼 평가 숫자가 부풀려진다(K-02 인플레).
        // 통화 종료 시각이 필요해지면 status 와 무관한 별도 컬럼(예: livekit_ended_at)을
        // 마이그레이션으로 추가할 것 — status 는 건드리지 않는다.
        console.log(
          `[livekit/webhook] room_finished ${roomName} — status 미변경(staff 완료가 K-02 정본 경로)`
        );
      } else if (event.event === "participant_joined" && roomName) {
        // 참가 로그 - metadata 에 append
        console.log(`[livekit/webhook] ${participantIdentity} joined ${roomName}`);
      } else if (
        event.event === "participant_left" &&
        roomName &&
        participantIdentity
      ) {
        // 퇴장 시각 영속(left_at) — Vercel 런타임 로그는 1시간이면 증발해 "회의가 몇 분이었나"
        // 사후 분석이 불가했음(2026-07-14 실회의에서 확인). status 는 여전히 안 건드린다(K-02 정본 경로).
        // ⚠️ error 를 받는다 — 안 받으면 조회 실패가 "그런 방 없음"과 구별되지 않아, 이 기능이
        // 막으려던 바로 그 증상(퇴장 시각 유실)이 조용히 재발한다(POSTMORTEMS #105 부류).
        const { data: sessionRows, error: sessionErr } = await supabase
          .from("consultation_sessions")
          .select("id")
          .eq("livekit_room_name", roomName)
          .limit(1);
        if (sessionErr) {
          console.error("[livekit/webhook] 상담 세션 조회 실패:", sessionErr.message);
        }
        const session = (sessionRows as any)?.[0] || null;
        if ((session as any)?.id) {
          // 같은 identity 재입장(LiveKit 자동 교체) 시, 떠나는 '옛 접속'의 left 이벤트가 방금
          // 생성된 '새 접속'의 입장 기록까지 닫으면 안 된다. 기준 = 떠나는 접속의 LiveKit 합류
          // 시각(joinedAt): 그보다 나중에 생성된 열린 기록은 새 접속의 것이므로 보호.
          // (독립 리뷰 지적: 고정 5초 휴리스틱은 연결이 느리면 — 워치독 예산이 18초 — 새 기록까지
          // 닫는 구멍. joinedAt 없는 페이로드만 5초 휴리스틱 폴백.)
          const joinedAtSec = Number((event.participant as any)?.joinedAt || 0);
          const cutoff =
            joinedAtSec > 0
              ? new Date(joinedAtSec * 1000 + 2000).toISOString()
              : new Date(Date.now() - 5000).toISOString();
          await supabase
            .from("consultation_admissions")
            .update({ left_at: new Date().toISOString() } as any)
            .eq("consultation_id", (session as any).id)
            .eq("participant_identity", participantIdentity)
            .is("left_at", null)
            .lt("requested_at", cutoff);
        }
        console.log(`[livekit/webhook] ${participantIdentity} left ${roomName}`);
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
