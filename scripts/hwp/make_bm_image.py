# -*- coding: utf-8 -*-
"""비즈니스모델 체계도 그림 — BeyondK 깔(docs/rules/PPT_STYLE.md) 기준.

규격 : 흰 바탕 · 라임(#D9FE55)은 한 곳만(가운데 healwith 상자) · 에스코어 드림 글꼴.
쓰는 곳 : 중간보고서 2부 「수익모델」 / 발표자료.
내용 고치는 곳 : 01. 작업본/비즈니스모델_내용_편집용.txt

⚠️ 에스코어 드림에는 겹화살괄호(« »)와 엠대시(—)가 없다. 넣으면 «빈칸»으로 빠진다.
   낫표(「」)와 가운뎃점(·)만 쓴다.

쓰는 법:  python scripts/hwp/make_bm_image.py <나올.png>
"""
import sys, os
from PIL import Image, ImageDraw, ImageFont

OUT = sys.argv[1] if len(sys.argv) > 1 else 'bm.png'
W, H = 1800, 1290

BLACK = (0, 0, 0)
INK = (26, 26, 26)
BODY = (0x76, 0x71, 0x71)
MUTED = (0x9A, 0x97, 0x97)
LINE = (0xDC, 0xDD, 0xDD)
PANEL = (0xF7, 0xF7, 0xF7)
HEAD = (0xEC, 0xEC, 0xEC)
LIME = (0xD9, 0xFE, 0x55)

FDIR = r'C:\Users\user\AppData\Local\Microsoft\Windows\Fonts'


def f(weight, size):
    return ImageFont.truetype(os.path.join(FDIR, 'SCDream%d.otf' % weight), size)


img = Image.new('RGB', (W, H), 'white')
d = ImageDraw.Draw(img)


def mid(x, y, text, font, fill):
    """가운데 정렬로 한 줄 쓴다."""
    d.text((x - d.textlength(text, font=font) / 2, y), text, font=font, fill=fill)


def card(x, y, w, h, title, sub=None, strong=False):
    """상자 하나. strong 이면 라임 바탕(가운데 healwith 만)."""
    d.rectangle([x, y, x + w, y + h], fill=LIME if strong else PANEL,
                outline=BLACK if strong else LINE, width=3 if strong else 2)
    cx = x + w / 2
    if sub:
        mid(cx, y + h / 2 - 34, title, f(7, 28), BLACK)
        mid(cx, y + h / 2 + 8, sub, f(4, 21), INK if strong else BODY)
    else:
        mid(cx, y + h / 2 - 16, title, f(7, 28), BLACK)


def arrow(x1, y, x2, label, money=False):
    """가로 화살표. money 면 굵은 검정(돈이 들어오는 쪽)."""
    col = BLACK if money else MUTED
    wd = 3 if money else 2
    d.line([x1, y, x2, y], fill=col, width=wd)
    s = 1 if x2 > x1 else -1
    d.polygon([(x2, y), (x2 - s * 16, y - 8), (x2 - s * 16, y + 8)], fill=col)
    fnt = f(6, 20) if money else f(4, 19)
    tw = d.textlength(label, font=fnt)
    cx = (x1 + x2) / 2
    d.rectangle([cx - tw / 2 - 8, y - 32, cx + tw / 2 + 8, y - 6], fill='white')
    d.text((cx - tw / 2, y - 30), label, font=fnt, fill=BLACK if money else BODY)


# ─────────────────────────── 머리말
d.text((70, 56), '비즈니스모델 체계도 및 연도별 매출계획(안)', font=f(8, 50), fill=BLACK)
d.line([70, 136, W - 70, 136], fill=BLACK, width=3)

# ─────────────────────────── 체계도
CW, CH = 300, 116
LX, MX, RX = 132, 740, 1368
MW = 320
TOP, BOT = 196, 392

card(LX, TOP, CW, CH, '카자흐스탄 등 CIS', '암환자')
card(LX, BOT, CW, CH, '현지 에이전시', '협력 의료기관')
card(MX, TOP, MW, CH, 'healwith 플랫폼', '본로이', strong=True)
card(RX, TOP, CW, CH, '국내 협진', '상급종합병원')
card(RX, BOT, CW, CH, '참여 한방병원', '면역 · 회복기 재활')

# 가운데 아래: 플랫폼이 하는 일
d.rectangle([MX, BOT - 8, MX + MW, BOT + CH + 26], fill='white', outline=LINE, width=2)
mid(MX + MW / 2, BOT + 8, '원격협진 · AI 사전상담', f(5, 21), BODY)
mid(MX + MW / 2, BOT + 44, '다국어 · 사후관리 자동안내', f(5, 21), BODY)
mid(MX + MW / 2, BOT + 80, '성과지표 자동집계', f(5, 21), BODY)

arrow(LX + CW, TOP + 40, MX, '상담 접수 · 의료정보')
arrow(MX + MW, TOP + 36, RX, '의뢰서 · 협진')
arrow(RX, TOP + 90, MX + MW, '① 유치 수수료', money=True)
arrow(MX + MW, BOT + 36, RX, '재활 · 사후관리 연계')
arrow(RX, BOT + 90, MX + MW, '② 플랫폼 이용료', money=True)
arrow(LX + CW, BOT + 62, MX, '환자 발굴 · 현지 경과')

# ─────────────────────────── 수익 계산식
FY = 620
d.line([70, FY, W - 70, FY], fill=LINE, width=2)
d.text((132, FY + 26), '① 원격진료 매출', font=f(7, 24), fill=BLACK)
d.text((400, FY + 28), '진료비 × 병원 지급 수수료율 15%   (지출: 에이전시 수수료 15~20%)',
       font=f(4, 22), fill=INK)
d.text((132, FY + 74), '② 솔루션 매출', font=f(7, 24), fill=BLACK)
d.text((400, FY + 76), '플랫폼 이용 의료기관 수 × 월 이용료 50~100만원 (구독형)',
       font=f(4, 22), fill=INK)

# ─────────────────────────── 연도별 매출계획표
TY = 780
cols = [132, 560, 860, 1120, 1380, W - 70]
rows = [TY + i * 56 for i in range(7)]
head = ['구  분', '2026년 (하반기)', '2027년', '2028년', '비  고']
body = [
    ['① 원격진료  유치 건수', '12 건 (목표)', '30 건', '60 건', '월 1.5건 → 2.5건 → 5건'],
    ['① 원격진료  매출', '건수 × 진료비 × 15%', '〃', '〃', '진료비 단가 확정 중'],
    ['② 솔루션  이용 기관', '2 개 (참여병원)', '5 개', '12 개', '제휴 의료기관 확대'],
    ['② 솔루션  매출', '-', '3,000 만원', '7,200 만원', '월 50만원 × 12개월'],
    ['사후관리 연계 건수', '120 건 (목표)', '300 건', '600 건', '유치 1건당 10회'],
]

d.rectangle([cols[0], rows[0], cols[-1], rows[1]], fill=HEAD, outline=LINE, width=2)
for i, t in enumerate(head):
    if i == 0:
        d.text((cols[0] + 20, rows[0] + 16), t, font=f(7, 22), fill=BLACK)
    else:
        mid((cols[i] + cols[i + 1]) / 2, rows[0] + 16, t, f(7, 22), BLACK)

for r, row in enumerate(body):
    y0, y1 = rows[r + 1], rows[r + 2]
    d.rectangle([cols[0], y0, cols[-1], y1], fill='white', outline=LINE, width=1)
    for c, t in enumerate(row):
        if c == 0:
            d.text((cols[0] + 20, y0 + 17), t, font=f(6, 21), fill=BLACK)
        else:
            mid((cols[c] + cols[c + 1]) / 2, y0 + 17, t, f(4, 21), INK)
for c in cols[1:-1]:
    d.line([c, rows[0], c, rows[-1]], fill=LINE, width=1)

# ─────────────────────────── 각주
NY = rows[-1] + 26
for i, t in enumerate([
    '※ 2026년 하반기는 유치 실적 확보 단계로, 매출보다 「사례 · 데이터 축적」을 우선한다.',
    '※ 솔루션 매출은 2027년부터 참여병원 · 제휴 의료기관을 대상으로 적용하며, 이용료는 월 단위 구독형이다.',
    '※ 해외 에이전시 지급 수수료는 계약서로 확정: MedicaTour(러시아) 15% · MedVoyage(영국) 20%.',
    '     「치료를 실제로 받은 환자」에 한해 지급한다.',
]):
    d.text((132, NY + i * 32), t, font=f(4, 20), fill=MUTED)

img.save(OUT)
print('만듦 :', OUT, img.size)
