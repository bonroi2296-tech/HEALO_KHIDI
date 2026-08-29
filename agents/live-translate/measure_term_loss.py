"""
실시간 통역이 «중요한 말을 빠뜨리는 비율»을 잰다.

왜 (2026-08-28):
  통역을 한 번 돌려 봤더니 "위암 수술을 받은 지 두 달" 에서 **「위암 수술」이 통째로 빠지고**
  「두 달이 지났고」만 남았다. 의료 상담에서 병명이 빠지는 건 위험하다.
  한 번으로는 우연인지 늘 그런지 못 가르니 같은 대본을 여러 번 돌려 비율을 낸다.

  대본마다 «반드시 살아 있어야 할 말»(병명·치료명·수치)을 러시아어 후보로 미리 적어 두고,
  통역 자막에 그중 하나라도 들어 있으면 «살았다»로 센다.

  uv run --env-file .env.local python -u measure_term_loss.py --repeat 5

⚠️ 시험 전용. 무료 Gemini 열쇠로 돌리면 구글이 음성을 학습에 쓸 수 있다 — 실환자 목소리 금지.
"""

import argparse
import asyncio
import os
import re
import subprocess
import sys
import tempfile
import uuid
from pathlib import Path

from livekit import api, rtc

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))
from config import TRANSLATION_TEXT_TOPIC  # noqa: E402

HERE = Path(__file__).parent

# 말 앞에 붙일 무음(초). 0 으로 두면 «앞부분 유실»이 재현된다.
LEAD_SILENCE_SEC = float(os.environ.get("LEAD_SILENCE_SEC", "3"))
# 말 «뒤»에 붙일 무음(초). 발화자가 --exit-after-publish 로 즉시 나가면 통역 세션이
# 그 자리에서 닫혀 문장 뒷부분이 안 나온다(2026-08-28 실측: 항암치료·방사선·조직검사 0%).
TAIL_SILENCE_SEC = float(os.environ.get("TAIL_SILENCE_SEC", "6"))
# 문장 «사이» 쉼(초). 실제 회의에서 사람은 문장 사이에 숨을 쉰다.
# 상담방 화면의 조각내기는 1.2초 무음을 «말 끝»으로 본다 — 실시간 통역도 그런지 본다.
GAP_SEC = float(os.environ.get("GAP_SEC", "1.5"))

# 대본: (한국어 문장, [반드시 살아야 할 말의 러시아어 후보들])
SCRIPTS = [
    (
        "안녕하세요 선생님. 위암 수술을 받은 지 두 달 되었는데, 항암치료를 언제부터 시작해야 하는지 궁금합니다.",
        {
            "위암": ["рак желудка", "рака желудка", "раке желудка", "желудка"],
            "수술": ["операц", "хирург"],
            "항암치료": ["химиотерап", "химио"],
        },
    ),
    (
        "환자분은 폐암 3기이고, 지난달에 방사선 치료를 열다섯 번 받았습니다.",
        {
            "폐암": ["рак лёгк", "рак легк", "рака лёгк", "рака легк", "лёгк", "легк"],
            "3기": ["3 стади", "третья стади", "третьей стади", "стади"],
            "방사선": ["лучев", "радиотерап", "облучен"],
        },
    ),
    (
        "유방암 진단을 받으셨고, 조직 검사 결과는 다음 주 화요일에 나옵니다.",
        {
            "유방암": ["рак груд", "рака груд", "рак молочн", "молочной железы", "груд"],
            "조직검사": ["биопси", "гистолог"],
        },
    ),
]


def make_audio(text: str, out_ogg: Path) -> None:
    """Gemini TTS 로 한국어 음성을 만들고 LiveKit 규격(Ogg Opus)으로 바꾼다."""
    key = os.environ.get("GOOGLE_GENERATIVE_AI_API_KEY") or os.environ["GEMINI_API_KEY"]
    import base64, json, urllib.request

    body = json.dumps({
        "contents": [{"parts": [{"text": f"Say exactly this and nothing else: {text}"}]}],
        "generationConfig": {"responseModalities": ["AUDIO"]},
    }).encode()
    req = urllib.request.Request(
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-2.5-flash-preview-tts:generateContent?key={key}",
        data=body, headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        j = json.load(r)
    b64 = j["candidates"][0]["content"]["parts"][0]["inlineData"]["data"]
    pcm = out_ogg.with_suffix(".pcm")
    pcm.write_bytes(base64.b64decode(b64))
    # ⚠️ 앞에 무음 3초를 붙인다. 2026-08-28 실측: 안 붙이면 «통역 세션이 열리기 전»에
    #    말이 시작돼 문장 앞부분이 통째로 유실된다("위암 수술을 받은 지" 가 사라지고
    #    "두 달이 지났고" 부터 나왔다). 이건 번역 품질이 아니라 «시작 타이밍» 문제다.
    subprocess.run(
        ["ffmpeg", "-y",
         "-f", "lavfi", "-t", str(LEAD_SILENCE_SEC), "-i", "anullsrc=r=24000:cl=mono",
         "-f", "s16le", "-ar", "24000", "-ac", "1", "-i", str(pcm),
         "-f", "lavfi", "-t", str(TAIL_SILENCE_SEC), "-i", "anullsrc=r=24000:cl=mono",
         "-filter_complex", "[0:a][1:a][2:a]concat=n=3:v=0:a=1",
         "-c:a", "libopus", "-b:a", "32k", "-ar", "48000", "-ac", "1", str(out_ogg)],
        check=True, capture_output=True,
    )
    pcm.unlink(missing_ok=True)


async def one_run(room_name: str, ogg: Path, seconds: int) -> str:
    """방을 만들어 통역봇을 부르고 음성을 흘린 뒤, 받은 자막을 이어붙여 돌려준다."""
    url = os.environ["LIVEKIT_URL"]
    k, s = os.environ["LIVEKIT_API_KEY"], os.environ["LIVEKIT_API_SECRET"]
    token = (
        api.AccessToken(k, s).with_identity("caption-watcher")
        .with_attributes({"lang": "ru"})
        .with_grants(api.VideoGrants(room_join=True, room=room_name, can_subscribe=True))
        .to_jwt()
    )
    room = rtc.Room()
    got: list[str] = []

    async def read(reader, _pid) -> None:
        got.append(await reader.read_all())

    room.register_text_stream_handler(
        TRANSLATION_TEXT_TOPIC, lambda r, p: asyncio.create_task(read(r, p))
    )
    await room.connect(url, token, options=rtc.RoomOptions(auto_subscribe=True))

    # 통역봇 호출 (청취자가 먼저 들어간 뒤여야 통역쌍이 만들어진다)
    lkapi = api.LiveKitAPI(url.replace("wss://", "https://"), k, s)
    await lkapi.agent_dispatch.create_dispatch(
        api.CreateAgentDispatchRequest(agent_name="gemini-translator", room=room_name)
    )
    await asyncio.sleep(10)

    # 발화자로 음성 발행 (lk CLI 가 파일 재생을 해준다)
    proc = await asyncio.create_subprocess_exec(
        "lk", "room", "join", "--project", "healo", "--identity", "doctor-ko",
        "--attribute", "lang=ko", "--publish", str(ogg), "--exit-after-publish", room_name,
        stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL,
    )
    await proc.wait()
    await asyncio.sleep(seconds)
    await room.disconnect()
    await lkapi.aclose()
    return " ".join(got)


def survived(caption: str, candidates: list[str]) -> bool:
    low = caption.lower()
    return any(c.lower() in low for c in candidates)


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--repeat", type=int, default=3, help="대본당 반복 횟수")
    ap.add_argument("--seconds", type=int, default=18, help="음성 발행 뒤 자막을 기다리는 초")
    args = ap.parse_args()

    tmp = Path(tempfile.mkdtemp(prefix="termloss-"))
    results: list[tuple[str, str, bool, str]] = []   # (대본, 용어, 살았나, 자막)

    for si, (text, terms) in enumerate(SCRIPTS, 1):
        ogg = tmp / f"s{si}.ogg"
        print(f"\n[대본 {si}] {text}")
        print("  음성 만드는 중...", flush=True)
        make_audio(text, ogg)
        for r in range(1, args.repeat + 1):
            room = f"tl-{uuid.uuid4().hex[:8]}"
            cap = await one_run(room, ogg, args.seconds)
            flat = re.sub(r"\s+", " ", cap).strip()
            marks = []
            for term, cands in terms.items():
                ok = survived(flat, cands)
                results.append((f"대본{si}", term, ok, flat))
                marks.append(f"{term}{'○' if ok else '✗'}")
            print(f"  {r}회차: {' '.join(marks)}")
            print(f"      자막: {flat[:110] or '(자막 0개)'}")

    print(f"\n{'=' * 66}")
    print("용어별 살아남은 비율")
    by_term: dict[str, list[bool]] = {}
    for _s, term, ok, _c in results:
        by_term.setdefault(term, []).append(ok)
    for term, oks in by_term.items():
        n, alive = len(oks), sum(oks)
        print(f"  {term:<8} {alive}/{n}  ({100 * alive / n:.0f}% 살아남음)")
    total = len(results)
    lost = total - sum(1 for _s, _t, ok, _c in results if ok)
    print(f"\n  전체: {total}번 중 {lost}번 빠짐 ({100 * lost / total:.0f}%)")
    empty = sum(1 for _s, _t, _o, c in results if not c)
    if empty:
        print(f"  ⚠️ 자막이 아예 안 온 경우 {empty // max(1, len(by_term))}회 — 통역봇 연결 문제일 수 있다")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
