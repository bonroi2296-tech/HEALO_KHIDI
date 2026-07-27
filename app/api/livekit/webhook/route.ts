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
        // 통화 «시작 시각» 기록 — 2026-07-27 실측: 세션 54건 전부 started_at 이 NULL 이었다.
        // 실제로 회의를 해도 시스템은 «시작한 적 없음»으로 알아, 나중에 "이때 상담했다"를
        // 데이터로 증명할 수 없었다(상태는 계속 scheduled).
        // ⚠️ status 는 절대 건드리지 않는다 — 'completed' 는 K-02 집계 기준이고 staff 수동 완료가
        //    유일한 정본 경로다(위 room_finished 주석·#637 K-02 인플레 사고와 같은 원칙).
        //    여기서 채우는 건 status 와 무관한 started_at 컬럼뿐이다.
        // 첫 입장에만 기록(.is("started_at", null)) — 두 번째 참가자가 덮어쓰면 «시작»이 아니게 된다.
        const { error: startErr } = await supabase
          .from("consultation_sessions")
          .update({ started_at: new Date().toISOString() } as any)
          .eq("livekit_room_name", roomName)
          .is("started_at", null);
        if (startErr) {
          // 위 participant_left 와 같은 이유로 실패를 알린다(로그만 남기면 1시간 뒤 증발 =
          // 이 기능이 막으려던 «시작 시각 유실»이 그대로 재발). LiveKit 이 재시도한다.
          console.error("[livekit/webhook] started_at 기록 실패(재시도 유도):", startErr.message);
          return Response.json({ ok: false, error: "internal_error" }, { status: 502 });
        }
        console.log(`[livekit/webhook] ${participantIdentity} joined ${roomName} (started_at 기록 시도)`);
      } else if (
        event.event === "participant_left" &&
        roomName &&
        participantIdentity
      ) {
        // 퇴장 시각 영속(left_at) — Vercel 런타임 로그는 1시간이면 증발해 "회의가 몇 분이었나"
        // 사후 분석이 불가했음(2026-07-14 실회의에서 확인). status 는 여전히 안 건드린다(K-02 정본 경로).
        // ⚠️ error 를 받아 **502 로 실패시킨다** — 로그만 남기고 넘어가면 조회 실패가 "그런 방
        // 없음"과 똑같이 조용히 지나가, 이 기능이 막으려던 증상(퇴장 시각 유실)이 그대로 재발한다.
        // 이 파일 위 주석대로 Vercel 런타임 로그는 1시간이면 증발하므로 "로그를 남겼다"는 대책이
        // 아니다. LiveKit 은 webhook 이 비-2xx 면 재시도하므로, 실패를 알려야 다음 시도에서
        // left_at 이 채워진다. (POSTMORTEMS #105 — 1차 수정이 로그만 추가해 무동작이었던 것 보완)
        const { data: sessionRows, error: sessionErr } = await supabase
          .from("consultation_sessions")
          .select("id")
          .eq("livekit_room_name", roomName)
          .limit(1);
        if (sessionErr) {
          console.error("[livekit/webhook] 상담 세션 조회 실패(재시도 유도):", sessionErr.message);
          return Response.json({ ok: false, error: "internal_error" }, { status: 502 });
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
