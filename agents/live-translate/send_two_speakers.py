"""
두 사람이 «번갈아» 말하는 상황을 흉내낸다 — 화자 판정이 흔들리는지 보려는 것.

왜 (2026-08-28): 이어 붙이기는 화자가 같아야 붙인다. 화자가 바뀌는 자리에서
  ①남의 말이 붙지 않는지 ②앞 사람의 이름이 새지 않는지를 본다.
  한 사람만 말하는 시험으로는 이 둘이 절대 안 드러난다.

  uv run --env-file .env.local python send_two_speakers.py <방이름> [--lang ko]

⚠️ 시험 전용.
"""
import argparse, asyncio, os, sys
from livekit import api, rtc
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))
from config import TRANSLATION_TEXT_TOPIC  # noqa: E402
from test_guard import refuse_real_room  # noqa: E402

# (화자 identity, 자막 조각) — 이름 없는 화자와 있는 화자를 섞는다
TURNS = [
    ("patient-ru", "안녕하세요, 저는"),
    ("patient-ru", "카자흐스탄에서 왔습니다."),
    ("doctor-ko", "네, 어디가"),          # ← 화자가 바뀐다: 여기서 붙으면 안 된다
    ("doctor-ko", "불편하신가요?"),
    ("patient-ru", "위암 3기 진단을"),     # ← 다시 바뀐다
    ("patient-ru", "받았습니다."),
]


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("room")
    ap.add_argument("--lang", default="ko")
    ap.add_argument("--gap", type=float, default=0.8)
    args = ap.parse_args()

    # 실환자 방을 실수로 겨누는 것을 막는다(test_guard 머리말 참고)
    refuse_real_room(args.room)

    token = (
        api.AccessToken(os.environ["LIVEKIT_API_KEY"], os.environ["LIVEKIT_API_SECRET"])
        .with_identity("agent-two-speakers")
        .with_grants(api.VideoGrants(room_join=True, room=args.room, can_publish=True))
        .to_jwt()
    )
    room = rtc.Room()
    await room.connect(os.environ["LIVEKIT_URL"], token)
    print(f"방 [{args.room}] 에 들어감. 두 화자가 번갈아 {len(TURNS)}조각.")
    await asyncio.sleep(3)
    for who, text in TURNS:
        await room.local_participant.send_text(
            text,
            topic=TRANSLATION_TEXT_TOPIC,
            attributes={"target_lang": args.lang, "speaker": who},
        )
        print(f"  [{who}] {text}")
        await asyncio.sleep(args.gap)
    await asyncio.sleep(8)
    await room.disconnect()
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
