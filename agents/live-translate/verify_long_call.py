"""
긴 상담(20분+)에서 통역이 «계속» 도나?

왜 (2026-08-28): 실제 상담은 30분이 넘는다. Gemini Live 세션은 일정 시간이 지나면
  스스로 닫히는데, 봇의 재연결 셈이 «성공했을 때만» 초기화된다. 오래 돌다 끊긴 것을
  「연속 실패」로 세면 재연결이 0.5초에서 30초까지 늘어나고, 세 번째부터는 멀쩡한데도
  「통역이 안 되고 있다」 안내가 화면에 뜬다.

  이 시험은 그걸 실제로 겪는지 본다: 20분 동안 말소리를 계속 흘리며
  ①통역 트랙이 살아 있는 시간 ②봇 로그의 재연결 횟수를 센다.

  uv run --env-file .env.local python verify_long_call.py <방이름> [--minutes 20]

⚠️ 시험 전용(가짜 대본). 실환자 방에 붙이지 마라.
"""

import argparse
import asyncio
import os
import subprocess
import sys
import tempfile
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from livekit import api, rtc

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))
from config import TRACK_NAME_PREFIX  # noqa: E402
from test_guard import refuse_real_room  # noqa: E402

LINE = "안녕하세요. 오늘 진료 상담을 시작하겠습니다. 궁금한 점을 말씀해 주세요."


def make_loop_audio(tmp: Path, minutes: int) -> Path:
    """말소리 + 쉼을 이어 붙여 긴 오디오를 만든다(말이 끊기면 세션도 닫힐 수 있어 계속 말한다)."""
    import base64, json, urllib.request

    key = os.environ.get("GOOGLE_GENERATIVE_AI_API_KEY") or os.environ["GEMINI_API_KEY"]
    body = json.dumps({
        "contents": [{"parts": [{"text": f"Say exactly this and nothing else: {LINE}"}]}],
        "generationConfig": {"responseModalities": ["AUDIO"]},
    }).encode()
    req = urllib.request.Request(
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-2.5-flash-preview-tts:generateContent?key={key}",
        data=body, headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        j = json.load(r)
    pcm = tmp / "s.pcm"
    pcm.write_bytes(base64.b64decode(j["candidates"][0]["content"]["parts"][0]["inlineData"]["data"]))
    one = tmp / "one.ogg"
    # 한 토막 = 말소리 + 4초 쉼
    subprocess.run(
        ["ffmpeg", "-y",
         "-f", "s16le", "-ar", "24000", "-ac", "1", "-i", str(pcm),
         "-f", "lavfi", "-t", "4", "-i", "anullsrc=r=24000:cl=mono",
         "-filter_complex", "[0:a][1:a]concat=n=2:v=0:a=1",
         "-c:a", "libopus", "-b:a", "32k", "-ar", "48000", "-ac", "1", str(one)],
        check=True, capture_output=True,
    )
    # 토막을 반복해 목표 길이를 채운다
    out = tmp / "long.ogg"
    subprocess.run(
        ["ffmpeg", "-y", "-stream_loop", "-1", "-i", str(one),
         "-t", str(minutes * 60), "-c", "copy", str(out)],
        check=True, capture_output=True,
    )
    return out


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("room")
    ap.add_argument("--minutes", type=int, default=20)
    args = ap.parse_args()
    refuse_real_room(args.room)

    url = os.environ["LIVEKIT_URL"]
    k, s = os.environ["LIVEKIT_API_KEY"], os.environ["LIVEKIT_API_SECRET"]
    tmp = Path(tempfile.mkdtemp(prefix="long-"))
    print(f"{args.minutes}분짜리 말소리를 만든다...", flush=True)
    ogg = make_loop_audio(tmp, args.minutes)

    tok = (
        api.AccessToken(k, s).with_identity("listener-ru")
        .with_attributes({"lang": "ru", "voice": "on"})
        .with_grants(api.VideoGrants(room_join=True, room=args.room, can_subscribe=True))
        .to_jwt()
    )
    room = rtc.Room()
    await room.connect(url, tok, options=rtc.RoomOptions(auto_subscribe=True))
    lkapi = api.LiveKitAPI(url.replace("wss://", "https://"), k, s)
    await lkapi.agent_dispatch.create_dispatch(
        api.CreateAgentDispatchRequest(agent_name="gemini-translator", room=args.room)
    )
    await asyncio.sleep(8)

    proc = await asyncio.create_subprocess_exec(
        "lk", "room", "join", "--project", "healo", "--identity", "patient-ko",
        "--attribute", "lang=ko", "--attribute", "voice=on",
        "--publish", str(ogg), args.room,
        stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL,
    )

    # 30초마다 통역 트랙이 살아 있나 본다
    alive, dead = 0, 0
    for i in range(args.minutes * 2):
        await asyncio.sleep(30)
        try:
            res = await lkapi.room.list_participants(api.ListParticipantsRequest(room=args.room))
            n = sum(1 for p in res.participants for t in p.tracks
                    if (t.name or "").startswith(TRACK_NAME_PREFIX))
        except Exception:
            n = -1
        mark = "O" if n > 0 else "X"
        if n > 0:
            alive += 1
        else:
            dead += 1
        print(f"  {(i+1)*30//60}분{(i+1)*30%60:02d}초  통역트랙 {n}개 {mark}", flush=True)

    proc.kill()
    await room.disconnect()
    await lkapi.aclose()
    print(chr(10) + f"30초마다 {alive + dead}번 봤다: 살아있음 {alive} · 없음 {dead}")
    print("  봇 로그에서 'gemini session error' 횟수를 같이 세라")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
