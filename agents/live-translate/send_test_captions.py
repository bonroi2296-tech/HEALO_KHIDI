"""
통역봇이 «내보내는 것과 똑같은 모양»으로 자막 조각을 흘려보내는 시험 도구.

왜 (2026-08-28): 통역봇 자막을 받는 «화면 쪽 배선»(이어 붙이기 + 기록 저장)을 검증하려면
  실제 통역쌍이 서야 하는데, 시험 환경에서 그 조건(두 참가자의 lang 속성 + 살아있는 마이크)을
  맞추기가 까다로워 네 번 실패했다. 자막을 받는 쪽만 보려면 통역 모델이 필요 없다:
  같은 토픽(lk.translation)·같은 속성(speaker · target_lang)으로 보내면 화면은 구별 못 한다.

  ⚠️ 이건 «자막 만드는 쪽»은 검증하지 않는다. 받는 쪽 배선만 본다.

  uv run --env-file .env.local python send_test_captions.py <방이름> [--lang ko]
"""

import argparse
import asyncio
import os
import sys

from livekit import api, rtc

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))
from config import TRANSLATION_TEXT_TOPIC  # noqa: E402
from test_guard import refuse_real_room  # noqa: E402

# 실제 통역이 내보내는 조각 모양 그대로: 문장이 여러 토막으로 잘려 온다.
# (2026-08-28 실측 자막에서 그대로 가져왔다 — 회차 하나의 실물)
CHUNKS = [
    "안녕하세요, 선생님.",
    "저는",
    "카자흐스탄에서",
    "왔습니다.",
    "작년 십일월에",
    "위암 3기 진단을 받았고,",
    "서울에서 수술을",
    "받았습니다.",
]


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("room")
    ap.add_argument("--lang", default="ko", help="자막을 받을 사람의 언어(target_lang)")
    ap.add_argument("--speaker", default="patient-ru", help="원래 말한 사람 identity")
    ap.add_argument("--gap", type=float, default=0.8, help="조각 사이 간격(초)")
    # 순서가 뒤바뀌나 보려면 «번호 붙인» 조각을 촘촘히 보내야 한다. 받는 쪽 핸들러가
    # 비동기(await readAll)라, 조각이 겹치면 완료 순서가 도착 순서와 달라질 수 있다.
    ap.add_argument("--numbered", type=int, default=0, help="번호 붙인 조각을 이 개수만큼 보낸다")
    args = ap.parse_args()

    # 실환자 방을 실수로 겨누는 것을 막는다(test_guard 머리말 참고)
    refuse_real_room(args.room)

    url = os.environ["LIVEKIT_URL"]
    token = (
        api.AccessToken(os.environ["LIVEKIT_API_KEY"], os.environ["LIVEKIT_API_SECRET"])
        # 화면은 identity 가 "agent-" 로 시작해야 «통역봇이 있다»고 본다(LiveTranslateBridge).
        .with_identity("agent-test-captions")
        .with_grants(api.VideoGrants(room_join=True, room=args.room, can_publish=True))
        .to_jwt()
    )
    room = rtc.Room()
    await room.connect(url, token)
    print(f"방 [{args.room}] 에 통역봇 흉내로 들어감.")
    await asyncio.sleep(3)

    chunks = ([f"조각{n:02d}" for n in range(1, args.numbered + 1)]
              if args.numbered else CHUNKS)
    for i, text in enumerate(chunks, 1):
        await room.local_participant.send_text(
            text,
            topic=TRANSLATION_TEXT_TOPIC,
            attributes={"target_lang": args.lang, "speaker": args.speaker},
        )
        print(f"  {i}. {text}")
        await asyncio.sleep(args.gap)

    print("다 보냈다. 화면이 이어 붙이고 기록에 남기는지 확인해라.")
    await asyncio.sleep(5)
    await room.disconnect()
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
