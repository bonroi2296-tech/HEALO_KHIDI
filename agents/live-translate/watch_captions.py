"""
통역 자막 «내용»을 눈으로 보는 시험 도구.

왜 필요한가 (2026-08-27):
  통역 프로그램은 자막 내용을 «일부러» 로그에 안 남긴다(환자 대화라 금지, gemini_session.py 참고).
  그래서 실동작 확인은 `session up` 과 글자 수까지만 되고 «번역이 맞나»를 볼 수 없었다.
  이 도구는 방에 청취자로 들어가 `lk.translation` 으로 오는 자막을 그대로 찍는다.

⚠️ 시험 전용이다. 실환자 방에 붙이지 마라 — 화면에 대화 내용이 그대로 뜬다.

  uv run python watch_captions.py <방이름> [--lang ru] [--seconds 90]
"""

import argparse
import asyncio
import os
import sys
from datetime import datetime

from livekit import api, rtc

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))
from config import TRANSLATION_TEXT_TOPIC  # noqa: E402
from test_guard import refuse_real_room  # noqa: E402


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("room")
    ap.add_argument("--lang", default="ru", help="내가 받을 언어 (통역 대상)")
    ap.add_argument("--identity", default="caption-watcher")
    ap.add_argument("--seconds", type=int, default=90)
    args = ap.parse_args()

    # 실환자 방을 실수로 겨누는 것을 막는다(test_guard 머리말 참고)
    refuse_real_room(args.room)

    url = os.environ["LIVEKIT_URL"]
    token = (
        api.AccessToken(os.environ["LIVEKIT_API_KEY"], os.environ["LIVEKIT_API_SECRET"])
        .with_identity(args.identity)
        .with_attributes({"lang": args.lang})   # ← 이게 있어야 통역 대상이 된다(#100 함정)
        .with_grants(api.VideoGrants(room_join=True, room=args.room, can_subscribe=True))
        .to_jwt()
    )

    room = rtc.Room()
    got: list[str] = []

    @room.on("participant_connected")
    def _joined(p: rtc.RemoteParticipant) -> None:
        print(f"  [입장] {p.identity} (lang={p.attributes.get('lang', '없음')})")

    async def read_stream(reader, participant_identity: str) -> None:
        text = await reader.read_all()
        attrs = reader.info.attributes or {}
        stamp = datetime.now().strftime("%H:%M:%S")
        got.append(text)
        print(f"\n[{stamp}] 자막 #{len(got)}  (말한 사람: {attrs.get('speaker', '?')} → {attrs.get('target_lang', '?')})")
        print(f"    {text}")

    room.register_text_stream_handler(
        TRANSLATION_TEXT_TOPIC,
        lambda reader, pid: asyncio.create_task(read_stream(reader, pid)),
    )

    print(f"방 [{args.room}] 에 '{args.identity}'(언어 {args.lang}) 로 들어간다. {args.seconds}초 동안 듣는다.")
    await room.connect(url, token, options=rtc.RoomOptions(auto_subscribe=True))
    print("연결됨. 자막을 기다리는 중...\n")

    await asyncio.sleep(args.seconds)
    await room.disconnect()

    print(f"\n{'=' * 60}")
    print(f"받은 자막 {len(got)}개")
    if got:
        print("이어붙인 전문:")
        print("  " + " ".join(got))
    else:
        print("⚠️ 자막이 하나도 안 왔다. 통역봇이 방에 호출됐는지·발화자가 있는지 확인해라.")
    return 0 if got else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
