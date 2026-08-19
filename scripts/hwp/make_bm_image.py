# -*- coding: utf-8 -*-
"""붙임19 중간보고서 「비즈니스모델 체계도 + 연도별 매출계획(안)」 그림을 만든다.

양식에 원래 박혀 있던 그림은 «다른 사업(만성질환 플랫폼 2017~2018)의 예시»다.
그대로 제출하면 남의 사례가 우리 보고서에 실린다 → 같은 규격(946×654 BMP)으로 우리 것을 만들어 갈아끼운다.

쓰는 법:  python scripts/hwp/make_bm_image.py <나올.bmp>
"""
import sys
from PIL import Image, ImageDraw, ImageFont

W, H = 946, 654
OUT = sys.argv[1] if len(sys.argv) > 1 else 'bm.bmp'

INK = (33, 37, 41)
GRAY = (108, 117, 125)
LINE = (173, 181, 189)
TEAL = (13, 110, 110)
TEAL_BG = (224, 242, 241)
HEAD_BG = (238, 240, 242)
BOX = (250, 250, 251)


def font(sz, bold=False):
    path = r'C:\Windows\Fonts\malgunbd.ttf' if bold else r'C:\Windows\Fonts\malgun.ttf'
    return ImageFont.truetype(path, sz)


img = Image.new('RGB', (W, H), 'white')
d = ImageDraw.Draw(img)

f9, f10, f11, f12, f14 = font(13), font(14), font(15), font(16), font(19)
b9, b10, b11, b12, b16 = font(13, 1), font(14, 1), font(15, 1), font(16, 1), font(22, 1)


def box(x, y, w, h, text, fill=BOX, outline=LINE, fnt=None, color=INK, radius=6):
    d.rounded_rectangle([x, y, x + w, y + h], radius=radius, fill=fill, outline=outline, width=1)
    fnt = fnt or f10
    lines = text.split('\n')
    th = len(lines) * (fnt.size + 4) - 4
    ty = y + (h - th) / 2
    for ln in lines:
        tw = d.textlength(ln, font=fnt)
        d.text((x + (w - tw) / 2, ty), ln, font=fnt, fill=color)
        ty += fnt.size + 4


def arrow(x1, y1, x2, y2, color=GRAY, label=None):
    d.line([x1, y1, x2, y2], fill=color, width=2)
    import math
    ang = math.atan2(y2 - y1, x2 - x1)
    for s in (2.6, -2.6):
        d.line([x2, y2, x2 - 9 * math.cos(ang - s / 5), y2 - 9 * math.sin(ang - s / 5)], fill=color, width=2)
    if label:
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2
        tw = d.textlength(label, font=f9)
        d.rectangle([mx - tw / 2 - 3, my - 10, mx + tw / 2 + 3, my + 8], fill='white')
        d.text((mx - tw / 2, my - 8), label, font=f9, fill=GRAY)


# ─────────────────────────────── 제목
d.text((24, 18), '비즈니스모델 체계도 및 연도별 매출계획(안)', font=b16, fill=INK)
d.line([24, 52, W - 24, 52], fill=TEAL, width=2)

# ─────────────────────────────── 체계도
box(24, 74, 150, 54, '카자흐스탄 등\nCIS 암환자', fnt=f11)
box(398, 74, 168, 54, 'healwith 플랫폼\n(본로이)', fill=TEAL_BG, outline=TEAL, fnt=b11, color=TEAL)
box(772, 74, 150, 54, '국내 협진\n상급종합병원', fnt=f11)
box(772, 168, 150, 54, '참여 한방병원\n(면역·회복기 재활)', fnt=f10)
box(24, 168, 150, 54, '현지 에이전시\n· 협력 의료기관', fnt=f10)

arrow(174, 101, 396, 101, label='상담 접수 · 의료정보')
arrow(566, 95, 770, 95, label='의뢰서 · 협진')
arrow(770, 112, 568, 112, color=TEAL, label='① 유치 수수료')
arrow(566, 190, 770, 190, label='재활 · 사후관리 연계')
arrow(770, 205, 568, 205, color=TEAL, label='② 플랫폼 이용료')
arrow(174, 195, 396, 195, label='환자 발굴 · 현지 경과')

box(398, 160, 168, 70, '원격협진 · AI 사전상담\n다국어 · 사후관리 자동안내', fill=HEAD_BG, fnt=f9)

d.text((24, 244), '① 원격진료 매출(수입) = 진료비 × 병원 지급 수수료율   /   지출 = 에이전시 수수료(MedicaTour 15% · MedVoyage 20%)',
       font=f10, fill=INK)
d.text((24, 264), '② 솔루션(매칭) 매출 = 플랫폼 이용 의료기관 수 × 월 이용료(50~100만원, 구독형)',
       font=f10, fill=INK)

# ─────────────────────────────── 연도별 매출계획표
TY = 300
cols = [24, 250, 420, 590, 760, 922]
rows = [TY, TY + 34, TY + 68, TY + 102, TY + 136, TY + 170, TY + 204]
head = ['구  분', '2026년 (하반기)', '2027년', '2028년', '비  고']
body = [
    ['① 원격진료 — 유치 건수', '12 건 (목표)', '30 건', '60 건', '월 1.5건 → 2.5건 → 5건'],
    ['① 원격진료 — 매출', '건수 × 진료비 × 15%', '〃', '〃', '진료비 단가 확정 중'],
    ['② 솔루션 — 이용 기관', '2 개 (참여병원)', '5 개', '12 개', '제휴 의료기관 확대'],
    ['② 솔루션 — 매출', '—', '3,000 만원', '7,200 만원', '월 50만원 × 12개월 기준'],
    ['사후관리 연계 건수', '120 건 (목표)', '300 건', '600 건', '유치 1건당 10회'],
]

d.rectangle([cols[0], rows[0], cols[-1], rows[1]], fill=HEAD_BG, outline=LINE)
for i, t in enumerate(head):
    tw = d.textlength(t, font=b10)
    d.text((cols[i] + (cols[i + 1] - cols[i] - tw) / 2, rows[0] + 9), t, font=b10, fill=INK)

for r, row in enumerate(body):
    y0, y1 = rows[r + 1], rows[r + 2]
    d.rectangle([cols[0], y0, cols[-1], y1], fill='white', outline=LINE)
    for c, t in enumerate(row):
        fnt = b10 if c == 0 else f10
        col = TEAL if c == 0 else INK
        if c == 0:
            d.text((cols[0] + 10, y0 + 9), t, font=fnt, fill=col)
        else:
            tw = d.textlength(t, font=fnt)
            d.text((cols[c] + (cols[c + 1] - cols[c] - tw) / 2, y0 + 9), t, font=fnt, fill=col)
for c in cols:
    d.line([c, rows[0], c, rows[-1]], fill=LINE, width=1)

d.text((24, rows[-1] + 12),
       '※ 2026년 하반기는 유치 실적 확보 단계로, 매출보다 «사례·데이터 축적»을 우선한다.',
       font=f10, fill=GRAY)
d.text((24, rows[-1] + 34),
       '※ 솔루션 매출은 2027년부터 참여병원·제휴 의료기관 대상으로 적용하며, 이용료는 구독형(월 단위)이다.',
       font=f10, fill=GRAY)
d.text((24, rows[-1] + 56),
       '※ 해외 에이전시 지급 수수료는 계약서로 확정 — MedicaTour(러시아) 15% · MedVoyage(영국) 20%, «치료를 실제로 받은 환자»에 한해 지급.',
       font=f10, fill=GRAY)

img.save(OUT)
print('만듦:', OUT, img.size)
