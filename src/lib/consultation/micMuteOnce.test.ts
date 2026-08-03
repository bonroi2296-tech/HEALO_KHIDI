import { describe, it, expect } from "vitest";
import { Track } from "livekit-client";
// ⚠️ 여기에 @ts-expect-error 를 달지 마라 — .jsx 는 타입이 없어 그냥 통과하므로
//    「쓰이지 않은 지시」로 타입검사가 되레 실패한다(이 저장소가 5일 막혔던 그 원인).
import { createMicMuteOnce } from "./SameRoomGuard.jsx";

/**
 * 「같은 회선이라 조용히 들어가기」의 마이크 쪽 안전장치.
 *
 * 왜 시험이 필요한가(2026-08-03 발견): LiveKit 리액트 컴포넌트는 `audio={true}` 일 때
 * **접속이 끝난 뒤** 마이크를 켠다. 회선 판정은 그보다 **먼저** 돌아 마이크를 끄는데,
 * 그 시점엔 끌 트랙이 없어 아무 일도 안 일어난다 → 잠시 뒤 마이크가 그냥 켜졌다.
 * 배너는 「소리 껐어요」인데 마이크는 살아 있는 상태 = 하울링 절반이 그대로 남는다.
 */
function fakeRoom() {
  const calls: boolean[] = [];
  return {
    calls,
    localParticipant: {
      setMicrophoneEnabled: (on: boolean) => {
        calls.push(on);
        return Promise.resolve();
      },
    },
  };
}

describe("createMicMuteOnce — 마이크가 뒤늦게 켜지는 자리를 막는다", () => {
  it("마이크가 올라오면 끈다", () => {
    const room = fakeRoom();
    createMicMuteOnce(room)({ source: Track.Source.Microphone });
    expect(room.calls).toEqual([false]);
  });

  it("두 번째부터는 안 끈다 — 사람이 마이크 버튼을 눌러 켜는 걸 막으면 안 된다", () => {
    const room = fakeRoom();
    const muteOnce = createMicMuteOnce(room);
    muteOnce({ source: Track.Source.Microphone });
    muteOnce({ source: Track.Source.Microphone });
    muteOnce({ source: Track.Source.Microphone });
    expect(room.calls).toEqual([false]);
  });

  it("카메라가 올라온 건 마이크가 아니므로 그냥 둔다(한 번 쓸 기회를 안 낭비한다)", () => {
    const room = fakeRoom();
    const muteOnce = createMicMuteOnce(room);
    muteOnce({ source: Track.Source.Camera });
    expect(room.calls).toEqual([]);
    muteOnce({ source: Track.Source.Microphone });
    expect(room.calls).toEqual([false]);
  });

  it("방·참가자가 아직 없어도 터지지 않는다(접속 도중 호출)", () => {
    expect(() => createMicMuteOnce(undefined as any)({})).not.toThrow();
    expect(() => createMicMuteOnce({} as any)({})).not.toThrow();
  });
});
