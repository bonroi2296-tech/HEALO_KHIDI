"""
화자가 «나갔다 다시 들어오면» 통역쌍이 다시 서나?

왜 (2026-08-28): 실사용에서 흔한 일이다 — 환자가 회선 문제로 튕겨 나갔다 재입장한다.
  그때 봇의 라우터가 «나감»만 처리하고 «다시 들어옴»에 통역쌍을 다시 세우지 않으면,
  화면엔 봇이 그대로 있는데 통역만 영영 안 나온다(조용한 실패).

  판정은 봇 로그가 아니라 «통역 트랙»으로 한다: 봇이 통역쌍을 세우면
  `tx:<화자>:<언어>` 이름의 오디오 트랙을 낸다. 그 트랙이 다시 생기면 통과다.

  uv run --env-file .env.local python verify_rejoin.py <방이름>

⚠️ 시험 전용. 실환자 방에 붙이지 마라(test_guard 가 막는다).
"""

import asyncio
import os
import sys

# 윈도우 명령창은 기본이 cp949 라 «» 같은 글자에서 터진다.
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from livekit import api, rtc

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))
from config import TRACK_NAME_PREFIX  # noqa: E402
from test_guard import refuse_real_room  # noqa: E402


def token(room: str, identity: str, lang: str) -> str:
    return (
        api.AccessToken(os.environ["LIVEKIT_API_KEY"], os.environ["LIVEKIT_API_SECRET"])
        .with_identity(identity)
        .with_attributes({"lang": lang, "voice": "on"})
        .with_grants(api.VideoGrants(room_join=True, room=room, can_publish=True, can_subscribe=True))
        .to_jwt()
    )


async def join_speaking(room_name: str, identity: str, lang: str) -> rtc.Room:
    """살아 있는 마이크를 든 화자로 들어간다(라우터가 «화자»로 보려면 트랙이 있어야 한다)."""
    room = rtc.Room()
    await room.connect(os.environ["LIVEKIT_URL"], token(room_name, identity, lang))
    src = rtc.AudioSource(48000, 1)
    track = rtc.LocalAudioTrack.create_audio_track("mic", src)
    await room.local_participant.publish_track(
        track, rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_MICROPHONE)
    )

    async def _hum() -> None:
        frame = rtc.AudioFrame.create(48000, 1, 480)
        while True:
            await src.capture_frame(frame)
            await asyncio.sleep(0.01)

    asyncio.create_task(_hum())
    return room


async def tx_tracks(lkapi: api.LiveKitAPI, room_name: str) -> list[str]:
    """지금 방에 떠 있는 통역 트랙 이름들."""
    res = await lkapi.room.list_participants(api.ListParticipantsRequest(room=room_name))
    out = []
    for p in res.participants:
        for t in p.tracks:
            if (t.name or "").startswith(TRACK_NAME_PREFIX):
                out.append(t.name)
    return out


async def main() -> int:
    room_name = sys.argv[1]
    refuse_real_room(room_name)
    url = os.environ["LIVEKIT_URL"]
    lkapi = api.LiveKitAPI(url.replace("wss://", "https://"),
                           os.environ["LIVEKIT_API_KEY"], os.environ["LIVEKIT_API_SECRET"])

    listener = rtc.Room()
    await listener.connect(url, token(room_name, "listener-ru", "ru"))
    await lkapi.agent_dispatch.create_dispatch(
        api.CreateAgentDispatchRequest(agent_name="gemini-translator", room=room_name)
    )
    print("통역봇 부름. 화자를 넣는다.")
    await asyncio.sleep(8)

    speaker = await join_speaking(room_name, "speaker-ko", "ko")
    await asyncio.sleep(22)
    before = await tx_tracks(lkapi, room_name)
    print(f"  [처음] 통역 트랙 {len(before)}개: {before}")

    await speaker.disconnect()
    print("  화자가 나갔다")
    await asyncio.sleep(10)

    speaker2 = await join_speaking(room_name, "speaker-ko", "ko")
    print("  화자가 «다시» 들어왔다 — 25초 기다린다")
    await asyncio.sleep(25)
    after = await tx_tracks(lkapi, room_name)
    print(f"  [재입장 뒤] 통역 트랙 {len(after)}개: {after}")

    await speaker2.disconnect()
    await listener.disconnect()
    await lkapi.aclose()

    print()
    if after:
        print("  OK 재입장해도 통역쌍이 다시 선다")
        return 0
    print("  WARN 재입장 뒤 통역쌍이 안 선다 - 조용한 실패")
    return 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
