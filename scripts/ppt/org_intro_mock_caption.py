# -*- coding: utf-8 -*-
"""제안서 11장(DIFFERENTIATOR)에 넣을 «자막 화면 예시»를 만든다.

  python scripts/ppt/org_intro_mock_caption.py

왜 다시 그리나 (2026-09-11):
  기존 ui_consult_mock.png 은 자막 블록을 «원문 줄 + 번역 줄» 두 칸으로 그렸는데
  두 줄에 «똑같은 러시아어 문장»이 들어가 있었다. 러시아어를 읽는 상대에게는
  「번역이 아무 일도 하지 않은 화면」으로 보인다.
  게다가 두 칸 구조 자체가 실제 동작과 다르다 — 통역봇은 «번역문만» 보내고
  (원문 자막 input transcription 은 켜져 있지 않다), 사용자가 화면에서 보는 자막은
  언제나 「상대 말 → 내 언어」 한 방향 한 줄이다.
  그래서 원문 줄을 없애고 실제 화면대로 «한 줄»로 다시 그린다.

이 파일이 만드는 것은 실제 통화 캡처가 아니라 «화면 예시»다. 슬라이드 캡션에도 그렇게 적는다
(실제 통화 캡처는 상대 참가자와 가짜 마이크 두 대가 필요해 출장 자료용으로는 과하다).
"""
import os

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SHOTS = os.path.join(ROOT, "docs", "presentations", "shots")
FDIR = os.path.join(os.environ["LOCALAPPDATA"], "Microsoft", "Windows", "Fonts")

SRC = os.path.join(SHOTS, "ui_consult_mock.png")
OUT = os.path.join(SHOTS, "mock_consult_caption_ru.png")

BG = (6, 8, 11)                  # 자막 블록 배경(원본에서 샘플링한 값)
GREY = (156, 163, 175)
WHITE = (243, 244, 246)
TEAL = (45, 212, 191)

# 자막 블록의 «안쪽»만 덮는다. 라운드 모서리를 건드리면 테두리가 깨진다.
BOX = (70, 434, 1425, 652)

LABEL = "Врач · говорит по-корейски"
XLATE = "ИИ-перевод в реальном времени"
TEXT = "Посмотрим результаты КТ и обсудим следующие шаги."


def font(weight, size):
    return ImageFont.truetype(os.path.join(FDIR, "SCDream%d.otf" % weight), size)


def centered(d, y, txt, f, fill):
    w = d.textbbox((0, 0), txt, font=f)[2]
    cx = (BOX[0] + BOX[2]) / 2
    d.text((cx - w / 2, y), txt, font=f, fill=fill)


def main():
    im = Image.open(SRC).convert("RGB")
    d = ImageDraw.Draw(im)
    d.rectangle(BOX, fill=BG)
    # 블록 왼쪽 경계 «안쪽»에 원본 화자 이름표의 블러 조각이 남는다(x 54~69, y 600~652).
    # 라운드 모서리(반경 약 12px)를 건드리지 않는 범위에서만 덮는다.
    d.rectangle((53, 598, 70, 648), fill=BG)

    centered(d, 470, LABEL, font(4, 21), GREY)
    centered(d, 512, XLATE, font(4, 19), TEAL)
    centered(d, 556, TEXT, font(7, 30), WHITE)

    # 원본은 하단 통화 버튼 줄을 절반만 담고 있어서, 슬라이드에 넣으면 버튼이
    # 가로로 잘린 채 인쇄된다(2026-09-11 감사 지적) → 그 줄 위에서 끊는다.
    im = im.crop((0, 0, im.width, 690))

    im.save(OUT)
    print("saved:", os.path.basename(OUT), im.size)


if __name__ == "__main__":
    main()
