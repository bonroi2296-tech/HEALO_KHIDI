import "server-only";

/**
 * 오래 열려 있는 상담방 강제 종료 — 「좀비 방」 청소.
 *
 * 왜 (2026-08-04 실측):
 *   · 어제 만든 방: 18:18 시작 → 다음 날 13:29 종료 = **19시간**
 *   · 7/31 회의 방: 8/4 오전 10:27 종료 = **90시간(3.75일)**
 *   실제 회의(2건 합쳐 67분)의 80배가 빈 방으로 켜져 있었다. 화상은 시간제 요금이라 그대로 돈이다.
 *
 * 왜 기존 장치로 안 잡혔나:
 *   · LiveKit 의 emptyTimeout 은 «방이 **비었을 때**»만 센다. 좀비는 탭이 아직 붙어 있어 안 빈다.
 *   · 화면 쪽 자리비움 타이머(6분)는 «나 혼자일 때»만 돈다 → 같은 사무실 두 대가 서로를 상대로
 *     인식하면 영영 안 돈다. 게다가 탭이 뒤로 밀리면 브라우저가 타이머를 늦추거나 멈춘다.
 *   → 사람 기기에 기대지 말고 **서버가 닫는다.** 이게 유일하게 확실한 경로다.
 *
 * ⚠️ 진행 중인 회의를 끊으면 안 된다. 그래서 문턱을 «실측 최장 회의(35분)의 5배 이상»으로 잡았다.
 *    3시간 넘게 이어지는 상담은 우리 서비스에 없다 — 있으면 이 숫자를 올려라, 낮추지 말고.
 */

const STALE_AFTER_MS = 3 * 60 * 60 * 1000; // 3시간

export type CloseStaleResult = {
  checked: number;
  closed: string[];
  errors: string[];
};

/**
 * 시작한 지 3시간이 지났는데 아직 살아 있는 LiveKit 방을 닫는다.
 * @param nowMs 기준 시각(시험에서 고정하려고 주입 — 실서비스는 생략)
 */
export async function closeStaleRooms(nowMs: number = Date.now()): Promise<CloseStaleResult> {
  const out: CloseStaleResult = { checked: 0, closed: [], errors: [] };

  const url = process.env.LIVEKIT_URL;
  const key = process.env.LIVEKIT_API_KEY;
  const secret = process.env.LIVEKIT_API_SECRET;
  if (!url || !key || !secret) {
    out.errors.push("livekit_not_configured");
    return out;
  }

  const { supabaseAdmin } = await import("@/lib/rag/supabaseAdmin");
  const { RoomServiceClient } = await import("livekit-server-sdk");

  // 후보: 시작했는데 아직 «끝났다»는 신호(livekit_ended_at)가 안 온 방.
  //   livekit_ended_at 은 방이 닫힐 때 webhook 이 채운다 → 비어 있다 = 아직 살아 있다는 뜻.
  const since = new Date(nowMs - STALE_AFTER_MS).toISOString();
  const { data, error } = await supabaseAdmin
    .from("consultation_sessions")
    .select("id, livekit_room_name, started_at")
    .not("started_at", "is", null)
    .is("livekit_ended_at", null)
    .lt("started_at", since)
    .limit(50);

  if (error) {
    out.errors.push("query_failed");
    return out;
  }

  const rows = (data ?? []) as Array<{ id: string; livekit_room_name: string | null }>;
  out.checked = rows.length;
  if (!rows.length) return out;

  const svc = new RoomServiceClient(url, key, secret);
  for (const r of rows) {
    if (!r.livekit_room_name) continue;
    try {
      await svc.deleteRoom(r.livekit_room_name);
      out.closed.push(r.livekit_room_name);
    } catch (e: any) {
      // 이미 닫힌 방이면 LiveKit 이 not found 를 준다 — 그건 실패가 아니다(목표 상태 달성).
      const msg = String(e?.message || "");
      if (/not.?found|does not exist/i.test(msg)) continue;
      out.errors.push(r.livekit_room_name);
    }
  }
  return out;
}
