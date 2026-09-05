/**
 * healwith: 통역봇 «부를 때만» 호출 (on-demand dispatch)
 *
 * POST /api/khidi/consultation/[id]/interpreter
 * Body: { on: boolean, identity: string }
 *
 * 왜 만들었나 (2026-07-28 PO 요청 — "눌렀을 때만 띡하고 나오고 다시 끄면 사라지게"):
 *   그 전 방식은 **토큰 발급 시 RoomConfiguration 에 봇을 끼워 방 생성과 동시에 자동 입장**
 *   이었다. 그래서 아무도 통역을 원하지 않아도 방만 열리면 봇이 들어왔고, 실제로
 *   2026-07-20 에 **실환자 상담방에 봇이 무단 입장**했다(POSTMORTEMS #101). 부를 때만
 *   오게 하면 그 사고가 구조적으로 불가능해진다 + 분당 과금도 실제 사용분만 난다.
 *
 * 판정 규칙:
 *   - on  → 이 참가자의 `voice=on` 속성을 찍고, 방에 디스패치가 없으면 만든다(멱등).
 *   - off → 속성을 지우고, **방에 아직 `voice=on` 인 사람이 남아 있으면 봇을 두고**,
 *           아무도 없을 때만 디스패치를 지운다(= 봇 퇴장).
 *           한 명이 껐다고 바로 내보내면 아직 듣고 있는 상대의 통역이 끊긴다.
 *
 * 보안: 참가자만(초대토큰 or 계정 — resolveConsultationActor), IP 레이트리밋,
 *       응답에 상세 에러 미노출(코드형만).
 */

export const runtime = "nodejs";

import "server-only";
import { NextRequest } from "next/server";
import { AgentDispatchClient, RoomServiceClient } from "livekit-server-sdk";
import { resolveConsultationActor } from "@/lib/auth/requireConsultationAccess";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { checkRateLimit, getClientIp, getRateLimitHeaders } from "@/lib/rateLimit";
import {
  TRANSLATOR_AGENT_NAME,
  INTERPRETER_WANT_ATTR,
  INTERPRETER_WANT_ON,
  isLiveTranslateEnabledServer,
} from "@/lib/consultation/liveTranslate";

const RATE = {
  windowMs: 60 * 1000,
  // 토글은 사람 손가락 속도라 분당 20이면 충분(연타·재시도 여유 포함)
  maxRequests: 20,
  apiName: "consultation_interpreter",
};

// 봇(agent-*)은 사람이 아니다 — 「아직 통역을 원하는 사람이 있나」 판정에서 제외.
const isHumanIdentity = (identity: string) => !identity.startsWith("agent-");

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(request) || "unknown";
    const rl = checkRateLimit(ip, RATE);
    if (!rl.allowed) {
      return Response.json(
        { ok: false, error: "rate_limited" },
        { status: 429, headers: getRateLimitHeaders(rl) }
      );
    }

    const { id: consultationId } = await params;

    const access = await resolveConsultationActor(request, consultationId);
    if (!access.success) return access.response;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
    }
    const on = (body as { on?: unknown })?.on === true;
    const identity = (body as { identity?: unknown })?.identity;
    if (typeof identity !== "string" || !identity || identity.length > 200) {
      return Response.json({ ok: false, error: "invalid_identity" }, { status: 400 });
    }

    // 스위치가 꺼져 있으면 «준비 중» 을 정직하게 알린다 — 조용히 성공시키면
    // 사용자에겐 «켰는데 아무 일도 안 일어남» 이 되고, 그게 정확히 2026-07-24~28 상태였다.
    if (!isLiveTranslateEnabledServer()) {
      return Response.json({ ok: true, enabled: false, dispatched: false });
    }

    const { LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET } = process.env;
    if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      console.error("[interpreter] LiveKit env 누락");
      return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
    }

    const { data: session, error } = await supabaseAdmin
      .from("consultation_sessions")
      .select("id, livekit_room_name")
      .eq("id", consultationId)
      .maybeSingle<{ id: string; livekit_room_name: string | null }>();

    if (error) {
      console.error("[interpreter] DB error:", error.message);
      return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
    }
    if (!session?.livekit_room_name) {
      return Response.json({ ok: false, error: "consultation_not_found" }, { status: 404 });
    }

    const room = session.livekit_room_name;
    const svc = new RoomServiceClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
    const dispatchClient = new AgentDispatchClient(
      LIVEKIT_URL,
      LIVEKIT_API_KEY,
      LIVEKIT_API_SECRET
    );

    // ── 1) 내 «통역 원함» 표시를 방에 남긴다 ──────────────────────────────
    // ⚠️ 기존 속성을 읽어 합쳐서 쓴다. `lang` 속성이 날아가면 에이전트가 통역쌍을
    //    못 만들어 **조용히 아무 일도 안 일어난다**(POSTMORTEMS #100 과 같은 실패 모양).
    try {
      const me = await svc.getParticipant(room, identity);
      await svc.updateParticipant(room, identity, {
        attributes: {
          ...(me?.attributes ?? {}),
          [INTERPRETER_WANT_ATTR]: on ? INTERPRETER_WANT_ON : "",
        },
      });
    } catch (e) {
      // 방에 아직 안 붙었거나(레이스) 이미 나갔음 — 표시는 실패해도 아래 디스패치는 진행한다.
      console.warn("[interpreter] 참가자 속성 갱신 실패:", (e as Error)?.message);
    }

    // ── 2) 봇 호출 / 퇴장 ────────────────────────────────────────────────
    // ⚠️ **이름으로 걸러야 한다.** `listDispatch` 는 우리가 만든 것뿐 아니라 LiveKit 이 방마다
    //    자동으로 얹는 **이름 없는(자동 디스패치) 항목**도 같이 돌려준다. 처음엔 «항목이 하나라도
    //    있으면 이미 부른 것»으로 봤다가, 그 자동 항목 때문에 **실제 호출을 건너뛰고도
    //    `dispatched:true` 를 답했다**(2026-07-28 로봇 실행: API 200·봇 미입장. 앱 로그만 보면
    //    성공처럼 보이는 부류라 더 위험했다).
    const existing = (await dispatchClient.listDispatch(room)).filter(
      (d) => d.agentName === TRANSLATOR_AGENT_NAME
    );

    if (on) {
      if (existing.length === 0) {
        await dispatchClient.createDispatch(room, TRANSLATOR_AGENT_NAME, {
          metadata: JSON.stringify({ consultationId }),
        });
        console.log(`[interpreter] 봇 호출 room=${room} by=${identity}`);

        // ⚠️ 위 «세어 보고 없으면 부른다»는 두 사람이 «동시에» 켜면 둘 다 0 을 보고 둘 다 부른다.
        //    LiveKit 은 같은 이름의 호출을 막지 않는다(2026-08-28 실측: 깨끗한 방에 동시 2회 →
        //    호출 2개가 그대로 붙었다). 봇이 둘이면 **자막이 두 배로 오고 기록도 두 배**가 된다.
        //    잠금을 걸 자리가 없으므로(요청마다 다른 서버) **부른 «뒤»에 다시 세어 정리한다** —
        //    가장 먼저 만들어진 것 하나만 남기고 나머지는 지운다. 둘 다 이 코드를 지나므로
        //    누가 이기든 같은 하나가 남는다.
        try {
          const after = (await dispatchClient.listDispatch(room)).filter(
            (d) => d.agentName === TRANSLATOR_AGENT_NAME
          );
          if (after.length > 1) {
            const keep = after.reduce((a, b) =>
              String(a.id) <= String(b.id) ? a : b
            );
            for (const d of after) {
              if (d.id !== keep.id) await dispatchClient.deleteDispatch(d.id, room);
            }
            console.warn(
              `[interpreter] 통역봇 호출이 ${after.length}개 겹쳐 ${after.length - 1}개 정리 room=${room}`
            );
          }
        } catch (e) {
          // 정리에 실패해도 통역은 된다(봇이 둘일 뿐) — 켜기 자체를 실패시키지 않는다.
          console.warn("[interpreter] 겹친 호출 정리 실패:", (e as Error)?.message);
        }
      }
      return Response.json({ ok: true, enabled: true, dispatched: true });
    }

    // 끄기 — 아직 통역을 원하는 «다른 사람»이 있으면 봇을 두고 나만 안 듣는다.
    let stillWanted = false;
    try {
      const participants = await svc.listParticipants(room);
      stillWanted = participants.some(
        (p) =>
          isHumanIdentity(p.identity) &&
          p.identity !== identity &&
          p.attributes?.[INTERPRETER_WANT_ATTR] === INTERPRETER_WANT_ON
      );
    } catch (e) {
      // 참가자 목록을 못 읽으면 «남아 있다»고 보수적으로 판단 — 남의 통역을 끊는 쪽보다
      // 봇이 몇 분 더 머무는 쪽이 낫다(빈 방이 되면 어차피 자동 종료된다).
      console.warn("[interpreter] 참가자 조회 실패, 봇 유지:", (e as Error)?.message);
      stillWanted = true;
    }

    if (!stillWanted) {
      for (const d of existing) {
        await dispatchClient.deleteDispatch(d.id, room);
      }
      if (existing.length > 0) {
        console.log(`[interpreter] 봇 퇴장 room=${room} by=${identity}`);
      }
    }

    return Response.json({ ok: true, enabled: true, dispatched: stillWanted });
  } catch (e) {
    console.error("[interpreter] 실패:", (e as Error)?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
