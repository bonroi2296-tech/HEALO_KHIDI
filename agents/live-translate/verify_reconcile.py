"""
재계산이 «도는 동안» 들어온 참가자도 통역쌍을 받나?

왜 (2026-08-28): 라우터는 참가자 변화가 오면 재계산을 예약하는데, 이미 도는 중이면
  그냥 나갔다. 재계산은 Gemini 연결을 기다려 몇 초씩 걸리므로, 그 사이 들어온 사람은
  **통역쌍이 영영 안 만들어진다** — 화면엔 봇이 있으니 「켜졌다」로 보인다(조용한 실패).

  이 시험은 그 창을 일부러 노린다:
    ① 청취자(ru)와 화자 A(ko)를 넣어 재계산을 시작시킨다
    ② 재계산이 «도는 동안»(1.5초 뒤) 화자 B(en)를 밀어 넣는다
    ③ 두 화자 모두 통역쌍(session up)을 받았는지 봇 로그로 센다

  uv run --env-file .env.local python verify_reconcile.py <방이름> [--log <봇로그경로>]

⚠️ 시험 전용. 실환자 방에 붙이지 마라(test_guard 가 막는다).
"""

import argparse
import asyncio
import os
import sys

from livekit import api, rtc

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))
from test_guard import refuse_real_room  # noqa: E402


def token(room: str, identity: str, lang: str) -> str:
    return (
        api.AccessToken(os.environ["LIVEKIT_API_KEY"], os.environ["LIVEKIT_API_SECRET"])
        .with_identity(identity)
        .with_attributes({"lang": lang})
        .with_grants(api.VideoGrants(room_join=True, room=room, can_publish=True, can_subscribe=True))
        .to_jwt()
    )


async def join(room_name: str, identity: str, lang: str, publish: bool) -> rtc.Room:
    """참가자로 들어간다. publish=True 면 «살아 있는 마이크»가 있어야 화자로 잡히므로 소리를 낸다."""
    room = rtc.Room()
    await room.connect(os.environ["LIVEKIT_URL"], token(room_name, identity, lang))
    if publish:
        src = rtc.AudioSource(48000, 1)
        track = rtc.LocalAudioTrack.create_audio_track("mic", src)
        await room.local_participant.publish_track(
            track, rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_MICROPHONE)
        )
        # 무음이라도 트랙이 살아 있으면 라우터가 «화자»로 본다
        async def _hum() -> None:
            frame = rtc.AudioFrame.create(48000, 1, 480)
            while True:
                await src.capture_frame(frame)
                await asyncio.sleep(0.01)
        asyncio.create_task(_hum())
    return room


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("room")
    ap.add_argument("--delay", type=float, default=1.5, help="두 번째 화자를 넣기까지 기다릴 초")
    args = ap.parse_args()
    refuse_real_room(args.room)

    url = os.environ["LIVEKIT_URL"]
    lkapi = api.LiveKitAPI(url.replace("wss://", "https://"),
                           os.environ["LIVEKIT_API_KEY"], os.environ["LIVEKIT_API_SECRET"])

    listener = await join(args.room, "listener-ru", "ru", publish=False)
    await lkapi.agent_dispatch.create_dispatch(
        api.CreateAgentDispatchRequest(agent_name="gemini-translator", room=args.room)
    )
    print("통역봇 부름. 화자 A 를 넣는다.")
    await asyncio.sleep(8)

    a = await join(args.room, "speaker-a-ko", "ko", publish=True)
    print(f"화자 A 들어감 → {args.delay}초 뒤(= 재계산이 도는 «동안») 화자 B 를 넣는다")
    await asyncio.sleep(args.delay)

    b = await join(args.room, "speaker-b-en", "en", publish=True)
    print("화자 B 들어감. 30초 기다린다.")
    await asyncio.sleep(30)

    for r in (a, b, listener):
        await r.disconnect()
    await lkapi.aclose()
    print("\n끝. 봇 로그에서 «session up» 이 두 화자 모두에 대해 떴는지 세라:")
    print("   speaker-a-ko -> ru  ·  speaker-b-en -> ru")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
