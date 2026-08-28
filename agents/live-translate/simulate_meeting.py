"""
실제 회의 흉내 — 여러 문장을 «쉬어 가며» 말했을 때 통역이 어떻게 나오나.

왜 (2026-08-28):
  measure_term_loss.py 는 «한 문장을 던지고 바로 나가는» 시험이라 실제 회의와 다르다.
  실제 회의에서 사람은 ①방에 미리 들어와 있고 ②문장 사이에 숨을 쉬고 ③말이 끝나도 남아 있다.
  그 리듬을 그대로 흉내내서 «앞뒤 잘림»과 «문장 중간 절단»이 실제로도 나는지 본다.

  비교 기준: 상담방 화면의 조각내기는 1.2초 무음을 «말 끝»으로 보고 자른다.
  실시간 통역이 그 문제에서 자유로운지가 이 시험의 질문이다.

  uv run --env-file .env.local python -u simulate_meeting.py --repeat 2

⚠️ 시험 전용. 무료 Gemini 열쇠는 구글이 음성을 학습에 쓸 수 있다 — 실환자 목소리 금지.
"""

import argparse
import asyncio
import json
import os
import re
import subprocess
import sys
import tempfile
import time
import uuid
from pathlib import Path

from livekit import api, rtc

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))
from config import TRANSLATION_TEXT_TOPIC  # noqa: E402

LEAD = float(os.environ.get("LEAD_SEC", "5"))    # 방에 미리 들어와 기다리는 시간
GAP = float(os.environ.get("GAP_SEC", "1.5"))    # 문장 사이 숨 쉬는 시간
TAIL = float(os.environ.get("TAIL_SEC", "8"))    # 말이 끝난 뒤에도 방에 남아 있는 시간

# 실제 상담처럼 여러 문장. 각 문장에 «살아 있어야 할 말»을 붙인다.
DIALOG = [
    ("안녕하세요 선생님. 저는 카자흐스탄에서 왔습니다.",
     {"카자흐스탄": ["казахстан"]}),
    ("작년 十一월에 위암 3기 진단을 받았고, 서울에서 수술을 받았습니다.",
     {"위암": ["рак желудка", "рака желудка", "желудка"],
      "3기": ["3 стади", "третья стади", "третьей стади", "стади"],
      "수술": ["операц", "хирург"]}),
    ("지금은 항암치료를 여섯 번 받았는데, 앞으로 몇 번 더 받아야 하는지 궁금합니다.",
     {"항암치료": ["химиотерап", "химио"],
      "여섯번": ["шесть", "шести", "6 "]}),
]


def tts(text: str, out_pcm: Path) -> None:
    import base64, json, urllib.request
    key = os.environ.get("GOOGLE_GENERATIVE_AI_API_KEY") or os.environ["GEMINI_API_KEY"]
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
    out_pcm.write_bytes(base64.b64decode(j["candidates"][0]["content"]["parts"][0]["inlineData"]["data"]))


def build_dialog(tmp: Path) -> Path:
    """[앞무음] 문장1 [쉼] 문장2 [쉼] 문장3 [뒤무음] 을 한 파일로."""
    pcms = []
    for i, (text, _) in enumerate(DIALOG):
        p = tmp / f"s{i}.pcm"
        tts(text, p)
        pcms.append(p)

    args = ["ffmpeg", "-y", "-f", "lavfi", "-t", str(LEAD), "-i", "anullsrc=r=24000:cl=mono"]
    labels = ["[0:a]"]
    idx = 1
    for i, pcm in enumerate(pcms):
        if i:
            args += ["-f", "lavfi", "-t", str(GAP), "-i", "anullsrc=r=24000:cl=mono"]
            labels.append(f"[{idx}:a]"); idx += 1
        args += ["-f", "s16le", "-ar", "24000", "-ac", "1", "-i", str(pcm)]
        labels.append(f"[{idx}:a]"); idx += 1
    args += ["-f", "lavfi", "-t", str(TAIL), "-i", "anullsrc=r=24000:cl=mono"]
    labels.append(f"[{idx}:a]")
    out = tmp / "dialog.ogg"
    args += ["-filter_complex", "".join(labels) + f"concat=n={len(labels)}:v=0:a=1",
             "-c:a", "libopus", "-b:a", "32k", "-ar", "48000", "-ac", "1", str(out)]
    subprocess.run(args, check=True, capture_output=True)
    return out


DIALOG_RU = [
    ("Здравствуйте, доктор. Я приехала из Казахстана.",
     {"카자흐스탄": ["카자흐스탄", "카자흐"]}),
    ("В ноябре прошлого года мне поставили диагноз рак желудка третьей стадии, "
     "и меня прооперировали в Сеуле.",
     {"위암": ["위암", "위 암"], "3기": ["3기", "삼기", "3 기"], "수술": ["수술", "집도"]}),
    ("Сейчас я прошла шесть курсов химиотерапии и хочу узнать, сколько ещё нужно.",
     # WARN 띄어쓰기를 반드시 같이 적어라. 실제 번역은 「화학 요법」으로 나오는데
     #    「화학요법」만 적어 두었다가 8회차 중 4회를 «용어 누락»으로 잘못 셌다(2026-08-28).
     {"항암치료": ["항암", "화학요법", "화학 요법"], "여섯번": ["여섯", "6"]}),
]


async def run_once(room_name: str, ogg: Path, wait: int,
                   speak_lang: str = "ko", listen_lang: str = "ru") -> list[dict]:
    url = os.environ["LIVEKIT_URL"]
    k, s = os.environ["LIVEKIT_API_KEY"], os.environ["LIVEKIT_API_SECRET"]
    token = (
        api.AccessToken(k, s).with_identity("caption-watcher")
        .with_attributes({"lang": listen_lang})
        .with_grants(api.VideoGrants(room_join=True, room=room_name, can_subscribe=True))
        .to_jwt()
    )
    room = rtc.Room()
    got: list[dict] = []
    room.register_text_stream_handler(
        TRANSLATION_TEXT_TOPIC,
        lambda r, p: asyncio.create_task(_collect(r, got)),
    )
    await room.connect(url, token, options=rtc.RoomOptions(auto_subscribe=True))

    lkapi = api.LiveKitAPI(url.replace("wss://", "https://"), k, s)
    await lkapi.agent_dispatch.create_dispatch(
        api.CreateAgentDispatchRequest(agent_name="gemini-translator", room=room_name)
    )
    await asyncio.sleep(10)

    proc = await asyncio.create_subprocess_exec(
        "lk", "room", "join", "--project", "healo", "--identity", f"patient-{speak_lang}",
        "--attribute", f"lang={speak_lang}", "--publish", str(ogg),
        "--exit-after-publish", room_name,
        stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL,
    )
    await proc.wait()
    await asyncio.sleep(wait)
    await room.disconnect()
    await lkapi.aclose()
    return got


async def _collect(reader, bucket: list[dict]) -> None:
    # 시각은 «스트림이 열린 순간»으로 잡는다. read_all() 은 끝날 때까지 기다리므로
    # 그 뒤에 재면 조각 사이 간격이 실제보다 짧게 나온다.
    at = int(time.monotonic() * 1000)
    attrs = reader.info.attributes or {}
    text = await reader.read_all()
    bucket.append({
        "at": at,
        "text": text,
        "speaker": attrs.get("speaker", ""),
        "lang": attrs.get("target_lang", ""),
    })


ENDED = re.compile(r"[.!?…]\s*$")


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--repeat", type=int, default=2)
    # 지금까지는 «한국어 발화 → 러시아어 자막»만 쟀는데, 코디가 실제로 읽는 것은
    # 그 반대(«환자 러시아어 → 한국어 자막»)다. --reverse 로 그 방향을 잰다.
    ap.add_argument("--reverse", action="store_true",
                    help="환자(러시아어)가 말하고 코디(한국어)가 자막을 읽는 방향")
    ap.add_argument("--wait", type=int, default=25, help="음성이 끝난 뒤 자막을 더 기다리는 초")
    ap.add_argument("--dump", default="captions.json", help="자막 원본을 저장할 파일")
    args = ap.parse_args()

    tmp = Path(tempfile.mkdtemp(prefix="meeting-"))
    print(f"대본 {len(DIALOG)}문장 · 앞무음 {LEAD}초 · 문장사이 {GAP}초 · 뒤무음 {TAIL}초")
    print("음성 만드는 중...", flush=True)
    if args.reverse:
        globals()["DIALOG"] = DIALOG_RU
    ogg = build_dialog(tmp)
    print(f"만듦 ({ogg.stat().st_size // 1024}KB)\n")

    dialog = DIALOG_RU if args.reverse else DIALOG
    all_terms = {t: [] for _s, terms in dialog for t in terms}
    cut_counts = []
    rounds: list[list[dict]] = []

    for r in range(1, args.repeat + 1):
        caps = await run_once(
            f"mt-{uuid.uuid4().hex[:8]}", ogg, args.wait,
            speak_lang="ru" if args.reverse else "ko",
            listen_lang="ko" if args.reverse else "ru",
        )
        rounds.append(caps)
        flat = re.sub(r"\s+", " ", " ".join(c["text"] for c in caps)).strip()
        print(f"[{r}회차] 자막 {len(caps)}조각")
        for i, c in enumerate(caps, 1):
            t = c["text"].strip()
            mark = "" if ENDED.search(t) else "  ← 문장 중간에서 끊김"
            print(f"    {i}. {t}{mark}")
        cut = sum(1 for c in caps if c["text"].strip() and not ENDED.search(c["text"].strip()))
        cut_counts.append((cut, len(caps)))
        for _s, terms in DIALOG:
            for term, cands in terms.items():
                all_terms[term].append(any(c.lower() in flat.lower() for c in cands))
        print()

    print("=" * 66)
    print("중요한 말이 살아남았나")
    for term, oks in all_terms.items():
        print(f"  {term:<10} {sum(oks)}/{len(oks)}  ({100 * sum(oks) / len(oks):.0f}%)")
    tot_cut = sum(c for c, _ in cut_counts)
    tot_all = sum(n for _, n in cut_counts)
    print(f"\n문장 중간에서 끊긴 자막: {tot_cut}/{tot_all} ({100 * tot_cut / max(1, tot_all):.0f}%)")
    print("  (비교: 지금 상담방 화면은 31%)")

    out = Path(args.dump)
    out.write_text(json.dumps(rounds, ensure_ascii=False, indent=1), encoding="utf-8")
    print(chr(10) + "자막 원본을 " + str(out) + " 에 저장했다 (이어 붙이기 채점용).")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
