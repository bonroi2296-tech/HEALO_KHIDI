# -*- coding: utf-8 -*-
"""비즈니스모델 체계도 그림. BeyondK 깔(docs/rules/PPT_STYLE.md) 기준.

규격 : 흰 바탕 · 브랜드 색(teal-700 #0f766e)은 한 곳만(가운데 healwith 상자) · 에스코어 드림 글꼴.
쓰는 곳 : 중간보고서 2부 「수익모델」 / 발표자료.
내용 고치는 곳 : 01. 작업본/비즈니스모델_내용_편집용.txt

구조 (2026-08-20 대표 정정)
  · 환자가 직접 오든 에이전시가 소개하든 «유입 경로»만 다르고 그 뒤는 똑같다.
  · 플랫폼이 환자 상태를 보고 상급종합병원이든 한방병원이든 연결한다. 둘은 갈라진 길이 아니다.
  · 유치 수수료는 «양쪽 병원 모두»에서 받는다. 한쪽만 받는 게 아니다.
  · 플랫폼 이용료는 지금 받지 않는다. 향후 검토 항목이므로 흐름도에서 빼고 아래에만 적는다.

⚠️ 에스코어 드림에는 겹화살괄호(« »)와 엠대시가 없다. 넣으면 빈칸으로 빠진다.
   낫표(「」)와 가운뎃점(·)만 쓴다.

쓰는 법:  python scripts/hwp/make_bm_image.py <나올.png>
"""
import sys, os
from PIL import Image, ImageDraw, ImageFont

OUT = sys.argv[1] if len(sys.argv) > 1 else 'bm.png'
W, H = 1800, 1240

BLACK = (0, 0, 0)
INK = (26, 26, 26)
BODY = (0x76, 0x71, 0x71)
MUTED = (0x9A, 0x97, 0x97)
LINE = (0xDC, 0xDD, 0xDD)
PANEL = (0xF7, 0xF7, 0xF7)
HEAD = (0xEC, 0xEC, 0xEC)
BRAND = (0x0F, 0x76, 0x6E)     # teal-700 · 우리 브랜드 색
BRAND_D = (0x11, 0x5E, 0x59)   # teal-800 (테두리)
PALE = (0xCC, 0xFB, 0xF1)      # teal-100 (짙은 바탕 위 작은 글씨)

FDIR = r'C:\Users\user\AppData\Local\Microsoft\Windows\Fonts'


def f(weight, size):
    return ImageFont.truetype(os.path.join(FDIR, 'SCDream%d.otf' % weight), size)


img = Image.new('RGB', (W, H), 'white')
d = ImageDraw.Draw(img)


def mid(x, y, text, font, fill):
    d.text((x - d.textlength(text, font=font) / 2, y), text, font=font, fill=fill)


def card(x, y, w, h, title, subs):
    """subs 는 문자열 하나이거나 여러 줄 목록. 글 뭉치를 상자 세로 가운데에 놓는다."""
    if isinstance(subs, str):
        subs = [subs]
    d.rectangle([x, y, x + w, y + h], fill=PANEL, outline=LINE, width=2)
    cx = x + w / 2
    block = 36 + 8 + len(subs) * 28 + (len(subs) - 1) * 4
    top = y + (h - block) / 2
    mid(cx, top, title, f(7, 27), BLACK)
    for i, t in enumerate(subs):
        mid(cx, top + 44 + i * 32, t, f(4, 20), BODY)


def arrow(x1, y, x2, label, money=False):
    """가로 화살표. money 면 굵은 검정(돈이 들어오는 쪽)."""
    col = BLACK if money else MUTED
    d.line([x1, y, x2, y], fill=col, width=3 if money else 2)
    s = 1 if x2 > x1 else -1
    d.polygon([(x2, y), (x2 - s * 15, y - 8), (x2 - s * 15, y + 8)], fill=col)
    fnt = f(6, 19) if money else f(4, 18)
    tw = d.textlength(label, font=fnt)
    cx = (x1 + x2) / 2
    d.rectangle([cx - tw / 2 - 8, y - 30, cx + tw / 2 + 8, y - 5], fill='white')
    d.text((cx - tw / 2, y - 28), label, font=fnt, fill=BLACK if money else BODY)


def varrow(x, y1, y2, label):
    """세로 화살표. 오른쪽 기둥 안에서 병원끼리 이어지는 흐름."""
    d.line([x, y1, x, y2], fill=BODY, width=2)
    d.polygon([(x, y2), (x - 8, y2 - 15), (x + 8, y2 - 15)], fill=BODY)
    fnt = f(5, 18)
    tw = d.textlength(label, font=fnt)
    d.rectangle([x + 14, (y1 + y2) / 2 - 14, x + 22 + tw, (y1 + y2) / 2 + 12], fill='white')
    d.text((x + 18, (y1 + y2) / 2 - 12), label, font=fnt, fill=BODY)


# ─────────────────────────── 머리말
d.text((70, 56), '비즈니스모델 체계도 및 연도별 매출계획(안)', font=f(8, 50), fill=BLACK)
d.line([70, 136, W - 70, 136], fill=BLACK, width=3)

# ─────────────────────────── 체계도
CW, CH = 296, 138
LX, RX = 132, 1372
MX, MW = 706, 388
TOP, BOT = 200, 384
MY, MH = 200, 322          # 아래끝을 오른쪽 아래 상자(BOT+CH)에 맞춘다

# 기둥 이름
mid(LX + CW / 2, 168, '유 입 경 로', f(6, 19), MUTED)
mid(RX + CW / 2, 168, '연 결 병 원', f(6, 19), MUTED)

card(LX, TOP, CW, CH, '외국인 환자', '암환자 · 보호자')
card(LX, BOT, CW, CH, '해외 파트너십', '협력 의료기관 · 에이전시')
card(RX, TOP, CW, CH, '상급 종합병원', '정밀검진 · 수술 · 항암치료')
card(RX, BOT, CW, CH, '협력 병·의원', ['면역치료 · 회복기 재활', '사후관리'])

# 가운데: 플랫폼
d.rectangle([MX, MY, MX + MW, MY + MH], fill=BRAND, outline=BRAND_D, width=3)
cx = MX + MW / 2
PLAT = ['사전상담 · 원격협진', '다국어 · 사후관리 자동안내']
_block = 40 + 8 + 28 + 26 + 2 + 26 + len(PLAT) * 26 + (len(PLAT) - 1) * 16
_top = MY + (MH - _block) / 2
mid(cx, _top, 'healwith 플랫폼', f(7, 31), 'white')
mid(cx, _top + 48, '본로이', f(4, 21), PALE)
d.line([MX + 48, _top + 102, MX + MW - 48, _top + 102], fill=BRAND_D, width=2)
for i, t in enumerate(PLAT):
    mid(cx, _top + 130 + i * 42, t, f(5, 20), PALE)

# 유입: 두 경로 모두 같은 곳으로 들어온다
arrow(LX + CW, TOP + 59, MX, '직접 문의')
arrow(LX + CW, BOT + 59, MX, '환자 소개')

# 연결: 환자 상태에 따라 어느 쪽으로든. 수수료는 양쪽 모두에서 받는다
arrow(MX + MW, TOP + 32, RX, '의뢰서 · 환자 유치')
arrow(RX, TOP + 88, MX + MW, '① 유치 수수료', money=True)
arrow(MX + MW, BOT + 32, RX, '의뢰서 · 환자 유치')
arrow(RX, BOT + 88, MX + MW, '① 유치 수수료', money=True)

# 수술·항암을 마친 환자가 호텔에 머무는 대신 회복기 치료로 이어지는 흐름
varrow(RX + CW / 2, TOP + CH + 4, BOT - 4, '퇴원 후 회복기 연계')

d.text((MX - 4, MY + MH + 18),
       '환자 상태와 진료과에 따라 연결처를 정한다. 수술·항암을 마친 환자는 그대로 회복기 치료로 이어진다.',
       font=f(4, 19), fill=MUTED)

# ─────────────────────────── 수익 구조
FY = 566
d.line([70, FY, W - 70, FY], fill=LINE, width=2)
d.text((132, FY + 26), '① 유치 수수료', font=f(7, 24), fill=BLACK)
d.text((400, FY + 22), '외국인 환자를 유치할 경우 병원으로부터 수수료 발생', font=f(4, 21), fill=INK)
d.text((400, FY + 52), '상급 종합병원 진료 15% · 검진 20% · 협력 병·의원 별도 협의   /   지출: 에이전시 소개 건은 15~20% 지급',
       font=f(4, 21), fill=BODY)
d.text((132, FY + 100), '② 플랫폼 이용료', font=f(7, 24), fill=MUTED)
d.text((400, FY + 96), '월 구독형 비즈니스 모델 확장', font=f(4, 21), fill=INK)
d.text((400, FY + 126), '제휴 의료기관에서 필요한 편의 기능을 추가하여 월 구독형 수익성 극대화', font=f(4, 21), fill=BODY)

# ─────────────────────────── 연도별 매출계획표
TY = 754
cols = [132, 560, 860, 1120, 1380, W - 70]
rows = [TY + i * 54 for i in range(7)]
head = ['구  분', '2026년 (하반기)', '2027년', '2028년', '비  고']
body = [
    ['1.  유치 건수', '12 건 (목표)', '30 건', '60 건', '월 1.5건 → 2.5건 → 5건'],
    ['2.  매출액', '건수 × 진료비 × 유치 수수료', None, None, '환자별 치료 구성에 따라 변동'],
    ['3.  사후관리 연계 건수', '120 건 (목표)', '300 건', '600 건', '유치 1건당 10회 (예상치)'],
    ['4.  이용료 도입 기관', '없음', '5 개', '12 개', '유료화 여부는 2027년 판단'],
    ['5.  이용료 매출', '없음', '3,000 만원', '7,200 만원', '월 50만원 기준'],
]
GREY = (3, 4)          # 아직 시행 안 하는 줄은 옅게
MERGE_ROW = 1          # 2번 줄은 연도 세 칸을 한 칸으로 합쳐 가운데 정렬한다

d.rectangle([cols[0], rows[0], cols[-1], rows[1]], fill=HEAD, outline=LINE, width=2)
for i, t in enumerate(head):
    if i == 0:
        d.text((cols[0] + 20, rows[0] + 15), t, font=f(7, 21), fill=BLACK)
    else:
        mid((cols[i] + cols[i + 1]) / 2, rows[0] + 15, t, f(7, 21), BLACK)

for r, row in enumerate(body):
    y0, y1 = rows[r + 1], rows[r + 2]
    d.rectangle([cols[0], y0, cols[-1], y1], fill='white', outline=LINE, width=1)
    ink = MUTED if r in GREY else INK
    for c, t in enumerate(row):
        if t is None:
            continue
        if c == 0:
            d.text((cols[0] + 20, y0 + 16), t, font=f(6, 20), fill=MUTED if r in GREY else BLACK)
        elif r == MERGE_ROW and c == 1:
            mid((cols[1] + cols[4]) / 2, y0 + 16, t, f(4, 20), ink)
        else:
            mid((cols[c] + cols[c + 1]) / 2, y0 + 16, t, f(4, 20), ink)

# 세로선. 합친 칸 가운데 선은 긋지 않는다
for ci, c in enumerate(cols[1:-1], start=1):
    for r in range(len(body) + 1):
        if r == MERGE_ROW + 1 and ci in (2, 3):
            continue
        d.line([c, rows[r], c, rows[r + 1]], fill=LINE, width=1)

# ─────────────────────────── 각주
NY = rows[-1] + 24
for i, t in enumerate([
    '※ 2026년 하반기는 유치 실적 확보 단계로, 매출보다 「사례 · 데이터 축적」을 우선한다.',
    '※ 플랫폼 이용료는 아직 받지 않는다. 참여병원 두 곳은 무상으로 쓰고 있으며, 유료화 여부는 2027년에 판단한다.',
    '※ 해외 에이전시 지급 수수료는 계약서로 확정: MedicaTour(러시아) 15% · MedVoyage(영국) 20%.',
    '     「치료를 실제로 받은 환자」에 한해 지급한다.',
]):
    d.text((132, NY + i * 30), t, font=f(4, 19), fill=MUTED)

img.save(OUT)
print('만듦 :', OUT, img.size)
