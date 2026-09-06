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

/**
 * 방 «인스턴스» 생성 시각(ms). LiveKit 은 같은 이름의 방을 닫았다 다시 열면 새 인스턴스를 만들고
 * creationTime 을 새로 찍는다 → «어제 시험 입장의 started_at» 이 «오늘 실상담 방» 것인지 가르는 기준.
 * 값이 안 실려 오면 0(모름) — 호출부는 옛 방식(started_at IS NULL 에만 기록)으로 돈다.
 */
function roomCreatedMs(room: any): number {
  // ⚠️ 초 단위로 내림한다. started_at 은 event.createdAt(초 단위)로 적히므로, 방 생성과 같은 초에
  //    2명이 됐을 때 ms 짜리 생성 시각과 비교하면 «시작이 생성보다 앞»으로 잘못 판정된다.
  const ms = Number(room?.creationTimeMs ?? 0);
  if (Number.isFinite(ms) && ms > 0) return Math.floor(ms / 1000) * 1000;
  const sec = Number(room?.creationTime ?? 0);
  return Number.isFinite(sec) && sec > 0 ? Math.floor(sec) * 1000 : 0;
}

/** 이벤트 생성 시각(ms, LiveKit 시계). 없으면 우리 수신 시각. 재시도해도 같은 값이 나온다. */
function eventAtMs(event: any): number {
  const sec = Number(event?.createdAt ?? 0);
  return Number.isFinite(sec) && sec > 0 ? sec * 1000 : Date.now();
}

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
        // 2026-07-31: 위 주석이 예고한 별도 컬럼을 실제로 추가해 여기서 채운다
        // (migrations/20260731_livekit_call_duration.sql). status·ended_at·duration_seconds 는
        // 여전히 한 줄도 안 건드린다 — 실적은 사람이 누른 것만, 여기는 기계가 관측한 사실만.
        //
        // 왜 필요했나(실측): 7월 상담 21건이 전부 «안 끝난 상태»로 남아 통화시간 합계가 0분이었다.
        //   staff 가 「완료」를 안 누르면 상담을 몇 분 했는지 증명할 방법이 아예 없었다.
        //
        // 시각은 event.createdAt(LiveKit 이 이벤트를 만든 시각, 초)을 쓴다 — 우리 수신 시각을
        // 쓰면 LiveKit 이 재시도할 때마다 값이 달라져 같은 통화가 매번 길어진다.
        const endedAtIso = new Date(eventAtMs(event)).toISOString();

        const { data: finishedRows, error: finishedErr } = await supabase
          .from("consultation_sessions")
          .select("id, started_at")
          .eq("livekit_room_name", roomName)
          .limit(1);
        if (finishedErr) {
          console.error("[livekit/webhook] 세션 조회 실패(재시도 유도):", finishedErr.message);
          return Response.json({ ok: false, error: "internal_error" }, { status: 502 });
        }
        const finished = (finishedRows as any)?.[0] || null;
        if (finished?.id) {
          // 아무도 안 들어온 방(started_at 없음)은 통화가 없었던 것 → 길이는 null 로 둔다.
          // 0 으로 적으면 «0분 통화했다»로 읽혀 나중에 평균을 왜곡한다.
          //
          // 2026-09-06 실측으로 잡은 부풀림 2종(실환자 상담 «21시간», 파트너 미팅 «4.3시간»·«90시간»):
          //  ① started_at 이 «이전 방 인스턴스» 것 — 전날 시험 입장(2명)에 박힌 시각이 그대로 남아
          //     오늘 실상담 종료 시각까지 이어 붙었다(8/04 실환자 상담: 실제 ~40분 → 76,319초).
          //     기준: started_at < 이 방의 creationTime 이면 이 인스턴스에서 «2명이 된 순간»은
          //     기록된 적이 없다 → 모름(null). (입장 쪽에서 새 인스턴스면 덮어쓰도록 같이 고쳤다.)
          //  ② 손님이 전부 나간 뒤 진행자 탭 혼자 남아 좀비가 됐고, 3시간 청소기(closeStaleRooms)가
          //     닫은 시각까지가 통화로 잡혔다(9/01 파트너 미팅: 실제 32분 → 4시간 15분).
          //     기준: 입장 대장(consultation_admissions)의 손님이 전부 나갔으면(left_at 전부 있음)
          //     마지막 손님이 나간 시각까지만 통화다 — 혼자 남은 진행자는 통화가 아니다.
          //     대장이 비었거나(직원끼리 회의) 한 명이라도 left_at 이 없으면 종전대로 방 종료 시각.
          const startedMs = finished.started_at ? Date.parse(finished.started_at) : NaN;
          const createdMs = roomCreatedMs(event.room);
          let durationSec: number | null = null;
          if (Number.isFinite(startedMs) && createdMs > 0 && startedMs < createdMs) {
            console.warn(
              `[livekit/webhook] ${roomName} started_at(${finished.started_at}) 이 이 방 인스턴스(${new Date(createdMs).toISOString()}) 이전 → 통화시간 모름(null)`
            );
          } else if (Number.isFinite(startedMs)) {
            let endMs = Date.parse(endedAtIso);
            const { data: admRows } = await supabase
              .from("consultation_admissions")
              .select("left_at")
              .eq("consultation_id", finished.id)
              .limit(500);
            const adm = (admRows as Array<{ left_at: string | null }> | null) || [];
            if (adm.length && adm.every((a) => a.left_at)) {
              const lastLeftMs = Math.max(...adm.map((a) => Date.parse(a.left_at as string)));
              // 마지막 퇴장이 시작보다 «뒤»일 때만 — 앞이면 그 대장은 이전 인스턴스(어제 손님) 것이다.
              if (Number.isFinite(lastLeftMs) && lastLeftMs > startedMs && lastLeftMs < endMs) {
                endMs = lastLeftMs;
              }
            }
            durationSec = Math.max(0, Math.round((endMs - startedMs) / 1000));
          }
          const { error: durErr } = await supabase
            .from("consultation_sessions")
            .update({
              livekit_ended_at: endedAtIso,
              livekit_duration_seconds: durationSec,
            } as any)
            .eq("id", finished.id);
          if (durErr) {
            console.error("[livekit/webhook] 통화시간 기록 실패(재시도 유도):", durErr.message);
            return Response.json({ ok: false, error: "internal_error" }, { status: 502 });
          }
        }
        console.log(
          `[livekit/webhook] room_finished ${roomName} — 통화시간 기록(status 미변경, staff 완료가 K-02 정본 경로)`
        );
      } else if (event.event === "participant_joined" && roomName) {
        // 통화 «시작 시각» 기록 — 2026-07-27 실측: 세션 54건 전부 started_at 이 NULL 이었다.
        // 실제로 회의를 해도 시스템은 «시작한 적 없음»으로 알아, 나중에 "이때 상담했다"를
        // 데이터로 증명할 수 없었다(상태는 계속 scheduled).
        // ⚠️ status 는 절대 건드리지 않는다 — 'completed' 는 K-02 집계 기준이고 staff 수동 완료가
        //    유일한 정본 경로다(위 room_finished 주석·#637 K-02 인플레 사고와 같은 원칙).
        //    여기서 채우는 건 status 와 무관한 started_at 컬럼뿐이다.
        // ⭐ 「시작」의 기준 = **방에 2명 이상이 된 순간** (PO 결정 2026-07-31).
        //   왜 바꿨나(실측): 오늘 16:30 회의방의 시작 시각이 «10:59» 로 박혀 있었다 —
        //   아침에 직원이 혼자 테스트로 들어간 순간이다. 첫 입장에만 쓰고 덮지 않으니
        //   진짜 회의를 해도 기록은 5시간 반 전으로 남고, 통화 길이도 그만큼 부풀려진다.
        //   혼자 들어간 건 회의가 아니다 — 상대가 들어와야 회의다.
        //   ⚠️ 예정 시각(scheduled_at)은 판정에 안 쓴다. 회의는 밀리거나 당겨지기 때문(PO).
        //   ponytail: 「말을 시작한 순간」이 더 정확해 보이지만 마이크를 켜고 말을 안 하거나
        //   음소거로 진행하는 회의가 통째로 누락된다 — 인원수가 값싸고 덜 틀린다.
        //   ⚠️ 인원수 값이 아예 안 실려 오면(구버전·필드 누락) 예전처럼 첫 입장에 기록한다 —
        //      「모르면 기록한다」. 조용히 아무것도 안 남기면 통화 길이가 통째로 사라진다.
        //      어느 길로 갔는지 아래 로그에 남으니, 실회의 뒤 로그로 확인할 수 있다.
        const rawCount = (event.room as any)?.numParticipants;
        const numParticipants = Number(rawCount ?? 0);
        const countKnown = Number.isFinite(numParticipants) && numParticipants > 0;
        if (countKnown && numParticipants < 2) {
          console.log(
            `[livekit/webhook] ${participantIdentity} joined ${roomName} — 아직 ${numParticipants}명(혼자) → 시작 아님`
          );
          return Response.json({ ok: true });
        }
        if (!countKnown) {
          console.warn(
            `[livekit/webhook] ${roomName} 인원수 값 없음(raw=${String(rawCount)}) → 옛 방식(첫 입장)으로 기록`
          );
        }
        // 2명이 된 첫 순간에만 기록 — 중간에 한 명 나갔다 들어와도 안 밀린다.
        // 2026-09-06: «첫 순간»의 기준을 «이 방 인스턴스 안에서»로 좁혔다. 전날 시험 입장(2명)의
        //   started_at 이 남아 있으면 오늘 실상담은 «시작 없음»으로 남고, 종료 때 통화시간이 하루치로
        //   부풀었다(8/04 실환자 상담 76,319초). started_at 이 이 방의 creationTime 보다 앞이면
        //   이전 인스턴스 것이므로 덮어쓰고, 그 인스턴스의 종료 표시·길이도 지운다(청소기가 새 방을
        //   다시 볼 수 있어야 한다 — livekit_ended_at 이 남아 있으면 후보에서 빠진다).
        //   creationTime 이 안 실려 오면 옛 방식(비어 있을 때만).
        // 시각은 LiveKit 시계(event.createdAt)로 — creationTime 과 같은 시계라 비교가 어긋나지 않고,
        //   재시도돼도 같은 값이다(room_finished 와 같은 이유).
        const createdMs = roomCreatedMs(event.room);
        let startQuery = supabase
          .from("consultation_sessions")
          .update({
            started_at: new Date(eventAtMs(event)).toISOString(),
            livekit_ended_at: null,
            livekit_duration_seconds: null,
          } as any)
          .eq("livekit_room_name", roomName);
        startQuery =
          createdMs > 0
            ? startQuery.or(
                `started_at.is.null,started_at.lt.${new Date(createdMs).toISOString().replace(/\.\d{3}Z$/, "Z")}`
              )
            : startQuery.is("started_at", null);
        const { error: startErr } = await startQuery;
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
      } else if (
        (event.event as string) === "egress_ended" ||
        (event.event as string) === "recording_finished"
      ) {
        // 녹화 종료 — 대장(consultation_recordings)을 닫는다.
        // ⚠️ 이게 없으면 방이 자연 종료돼 녹화가 알아서 끝났을 때 행이 'recording' 으로 영영 남고,
        //    그 상담은 «이미 녹화 중»으로 판정돼 **다시는 녹화를 못 시작한다.** (스위치 켜기 전 선반영)
        const eg = (event as any).egressInfo;
        const egressId = eg?.egressId;
        if (egressId) {
          const startedNs = Number(eg?.startedAt || 0);
          const endedNs = Number(eg?.endedAt || 0);
          const durationSec =
            startedNs && endedNs ? Math.round((endedNs - startedNs) / 1e9) : null;
          // 3=COMPLETE 만 정상. 4/5/6(FAILED·ABORTED·LIMIT_REACHED)은 실패로 남겨 원인을 남긴다.
          const ok = Number(eg?.status) === 3;
          await supabase
            .from("consultation_recordings")
            .update({
              status: ok ? "stopped" : "failed",
              ended_at: new Date().toISOString(),
              duration_sec: durationSec,
            })
            .eq("egress_id", egressId)
            .eq("status", "recording");
        }

        // (레거시) 녹화 URL 을 consultation 에 저장 — 옛 경로 유지
        const fileUrl = eg?.fileResults?.[0]?.location;
        if (fileUrl && roomName) {
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
