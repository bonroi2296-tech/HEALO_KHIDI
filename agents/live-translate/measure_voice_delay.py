"""
통역 «음성»이 얼마나 늦게 나오나? (말이 시작된 뒤 통역 소리가 나올 때까지)

왜 (2026-08-28): 자막은 여러 번 쟀는데 «소리»는 아무도 안 쟀다. 사용자가 실제로 겪는 것은
  소리다 — 상대가 말을 마쳤는데 통역이 아직 안 나오면 서로 말이 겹친다.

  재는 법: 말소리를 흘리면서(발화자) 동시에 통역 트랙을 구독해(청취자) 첫 소리가
  «언제» 도착하는지 잰다. 앞무음을 붙였으므로 «말 시작 시각»을 정확히 안다.

  uv run --env-file .env.local python measure_voice_delay.py [--repeat 3]

⚠️ 시험 전용. 가짜 대본만 쓴다(무료 열쇠는 구글이 음성을 학습에 쓸 수 있다).
"""

import argparse
import asyncio
import os
import subprocess
import sys
import tempfile
import uuid
from pathlib import Path

from livekit import api, rtc

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))
from config import TRACK_NAME_PREFIX  # noqa: E402

LEAD = 5.0  # 앞무음(초) — 이만큼 뒤가 «말 시작»이다
LINE = "안녕하세요. 작년 십일월에 위암 3기 진단을 받았습니다."

# 긴 대화에서 지연이 «쌓이나»를 보려면 여러 문장을 쉬어 가며 말해야 한다.
# --long 을 주면 이 대본을 쓰고, 통역 소리가 «몇 번» 나오는지와 각 시작 시각을 낸다.
LONG_LINES = [
    "안녕하세요 선생님. 저는 카자흐스탄에서 왔습니다.",
    "작년 십일월에 위암 3기 진단을 받았습니다.",
    "지금은 항암치료를 여섯 번 받았습니다.",
]
GAP = 1.5
# 통역 음성이 이만큼 «연속으로» 조용하면 «끊겼다»고 본다(말 사이 쉼과 가르는 자).
SILENCE_GAP = 1.5


def make_audio(tmp: Path) -> Path:
    """앞무음 + 말소리. 앞무음 길이를 알면 «말 시작 시각»을 계산할 수 있다."""
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
    # ⚠️ 말소리 «길이»를 재둔다. 「말 시작 → 통역」만 재면 대본이 길수록 숫자가 커져
    #    뜻이 흐려진다. 사용자가 겪는 것은 **말이 끝난 뒤 얼마나 더 기다리나**다.
    # 24kHz · 16비트 · 1채널이므로 바이트 수로 길이가 나온다(ffprobe 없이도 정확).
    dur = pcm.stat().st_size / (24000 * 2)
    (tmp / "speech_sec.txt").write_text(str(dur), encoding="utf-8")
    out = tmp / "lead.ogg"
    subprocess.run(
        ["ffmpeg", "-y",
         "-f", "lavfi", "-t", str(LEAD), "-i", "anullsrc=r=24000:cl=mono",
         "-f", "s16le", "-ar", "24000", "-ac", "1", "-i", str(pcm),
         "-f", "lavfi", "-t", "12", "-i", "anullsrc=r=24000:cl=mono",
         "-filter_complex", "[0:a][1:a][2:a]concat=n=3:v=0:a=1",
         "-c:a", "libopus", "-b:a", "32k", "-ar", "48000", "-ac", "1", str(out)],
        check=True, capture_output=True,
    )
    return out


async def one_run(room_name: str, ogg: Path) -> float | None:
    """말 시작 → 통역 소리 첫 도착까지 걸린 초. 소리가 안 오면 None."""
    url = os.environ["LIVEKIT_URL"]
    k, s = os.environ["LIVEKIT_API_KEY"], os.environ["LIVEKIT_API_SECRET"]
    tok = (
        api.AccessToken(k, s).with_identity("listener-ru").with_attributes({"lang": "ru"})
        .with_grants(api.VideoGrants(room_join=True, room=room_name, can_subscribe=True))
        .to_jwt()
    )
    room = rtc.Room()
    first_audio: list[float] = []  # 통역 소리가 처음 난 시각
    _last_loud: list[float | None] = [None]
    _gaps: list[tuple[float, float]] = []  # 소리가 «끊긴» 구간들
    loop = asyncio.get_event_loop()

    @room.on("track_subscribed")
    def _on(track, pub, participant):
        if not (pub.name or "").startswith(TRACK_NAME_PREFIX):
            return
        async def _read() -> None:
            stream = rtc.AudioStream(track)
            async for ev in stream:
                # 무음이 아닌 «진짜 소리»가 처음 온 시각을 잡는다.
                # ⚠️ frame.data 는 이미 16비트 배열이라 cast("h") 를 부르면 터진다
                #    («byte 가 아닌 두 형식 사이 변환» 오류). 그대로 훑는다.
                samples = ev.frame.data
                # ⚠️ 프레임 «전체»를 봐야 한다. 앞 480샘플(10ms)만 보면 말 사이의 짧은 쉼이
                #    «무음»으로 잡혀 한 발화를 여러 개로 잘못 센다(2026-08-28 실측에서 6개로 셌다).
                loud = any(abs(x) > 500 for x in samples)
                now = loop.time()
                if loud:
                    if not first_audio:
                        first_audio.append(now)
                    _last_loud[0] = now
                elif _last_loud[0] and now - _last_loud[0] > SILENCE_GAP:
                    # 이만큼 «연속으로» 조용했으면 소리가 끊긴 것으로 본다
                    _gaps.append((_last_loud[0], now))
                    _last_loud[0] = None
        asyncio.create_task(_read())

    await room.connect(url, tok, options=rtc.RoomOptions(auto_subscribe=True))
    lkapi = api.LiveKitAPI(url.replace("wss://", "https://"), k, s)
    await lkapi.agent_dispatch.create_dispatch(
        api.CreateAgentDispatchRequest(agent_name="gemini-translator", room=room_name)
    )
    await asyncio.sleep(10)

    publish_at = loop.time()
    proc = await asyncio.create_subprocess_exec(
        "lk", "room", "join", "--project", "healo", "--identity", "patient-ko",
        "--attribute", "lang=ko", "--publish", str(ogg), room_name,
        stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL,
    )
    await asyncio.sleep(28)
    proc.kill()
    await room.disconnect()
    await lkapi.aclose()

    if not first_audio:
        return None
    base = publish_at + LEAD
    starts = [t - base for t in first_audio]
    if _gaps:
        print(f"      통역 소리가 {SILENCE_GAP}초 넘게 끊긴 구간: {len(_gaps)}번 "
              f"({', '.join(f'{b-a:.1f}초' for a, b in _gaps)})")
    return starts[0]


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--repeat", type=int, default=3)
    args = ap.parse_args()

    tmp = Path(tempfile.mkdtemp(prefix="vdelay-"))
    print(f"대본: {LINE}\n앞무음 {LEAD}초 (= 이 시점이 «말 시작»)\n음성 만드는 중...", flush=True)
    ogg = make_audio(tmp)
    speech_sec = float((tmp / "speech_sec.txt").read_text(encoding="utf-8"))
    print(f"말소리 길이 {speech_sec:.1f}초 → 말 끝나는 시각 = 앞무음 " + str(LEAD) + " + " + f"{speech_sec:.1f}" + "초")

    got: list[float] = []
    for i in range(1, args.repeat + 1):
        d = await one_run(f"vd-{uuid.uuid4().hex[:8]}", ogg)
        if d is None:
            print(f"  {i}회차: 통역 소리가 안 왔다")
        else:
            got.append(d)
            print(f"  {i}회차: 말 시작 후 {d:.1f}초 → «말 끝난 뒤» {d - speech_sec:+.1f}초")

    print("\n" + "=" * 56)
    if got:
        got.sort()
        mid = got[len(got) // 2]
        print(f"말 시작 기준: {got[0]:.1f} ~ {got[-1]:.1f}초 (가운데 {mid:.1f})")
        print(f"말 «끝» 기준: {got[0]-speech_sec:+.1f} ~ {got[-1]-speech_sec:+.1f}초 (가운데 {mid-speech_sec:+.1f})")
        print("  ← 이게 사용자가 겪는 «기다림»이다. 음수면 말이 끝나기 «전»에 통역이 시작된 것.")
    else:
        print("통역 소리가 한 번도 안 왔다 — 통역쌍이 섰는지 봇 로그를 봐라")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
