# -*- coding: utf-8 -*-
"""SWOT 분석 그림 — BeyondK 깔(docs/rules/PPT_STYLE.md) 기준.

규격 : 흰 바탕 · 라임(#D9FE55)은 한 곳만 · 에스코어 드림 글꼴.
쓰는 곳 : 중간보고서 2부 「수익모델」 / 발표자료 SWOT 장.

쓰는 법:  python scripts/ppt/make_swot_image.py <나올.png>
"""
import sys, os
from PIL import Image, ImageDraw, ImageFont

OUT = sys.argv[1] if len(sys.argv) > 1 else 'swot.png'
W, H = 1800, 1300

BLACK = (0, 0, 0)
INK = (26, 26, 26)
BODY = (0x76, 0x71, 0x71)
MUTED = (0x9A, 0x97, 0x97)
LINE = (0xDC, 0xDD, 0xDD)
PANEL = (0xF7, 0xF7, 0xF7)
PANEL2 = (0xFA, 0xFA, 0xFA)
LIME = (0xD9, 0xFE, 0x55)

FDIR = r'C:\Users\user\AppData\Local\Microsoft\Windows\Fonts'


def f(weight, size):
    return ImageFont.truetype(os.path.join(FDIR, 'SCDream%d.otf' % weight), size)


img = Image.new('RGB', (W, H), 'white')
d = ImageDraw.Draw(img)

# ─────────────────────────── 머리말
d.text((70, 58), '카자흐스탄 진출 SWOT 분석', font=f(8, 54), fill=BLACK)
d.text((70, 130), '2026년 8월 19일 실측 기준 · 중간평가 제출용', font=f(4, 24), fill=MUTED)
d.line([70, 182, W - 70, 182], fill=BLACK, width=3)

# ─────────────────────────── 사분면 좌표
GAP = 26
X0, Y0 = 132, 258
CW = (W - 132 - 70 - GAP) // 2
CH = 404


def quad(x, y, tag, kor, eng, items, strong=False):
    d.rectangle([x, y, x + CW, y + CH], fill=PANEL if strong else PANEL2, outline=LINE, width=2)
    # 머리 띠
    d.rectangle([x, y, x + CW, y + 76], fill=(0xEC, 0xEC, 0xEC) if strong else (0xF2, 0xF2, 0xF2))
    d.text((x + 30, y + 18), tag, font=f(9, 40), fill=BLACK if strong else BODY)
    d.text((x + 92, y + 24), kor, font=f(7, 30), fill=BLACK)
    tw = d.textlength(eng, font=f(4, 20))
    d.text((x + CW - 30 - tw, y + 34), eng, font=f(4, 20), fill=MUTED)
    ty = y + 104
    for head, sub in items:
        d.ellipse([x + 32, ty + 9, x + 42, ty + 19], fill=BLACK if strong else BODY)
        d.text((x + 58, ty), head, font=f(6, 25), fill=INK)
        if sub:
            d.text((x + 58, ty + 34), sub, font=f(4, 20), fill=BODY)
            ty += 74
        else:
            ty += 48


quad(X0, Y0, 'S', '강점', 'Strength', [
    ('양·한방 협진 + 회복기 재활 특화', '참여병원 누적 치료사례 5만건 · 환자 만족도 93.5%'),
    ('6개 언어 플랫폼 · 실시간 통역', '한↔러 자막 누적 3,481건 · 실제 파트너 협의에 사용'),
    ('법이 이름까지 같다', '의료해외진출법 제16조 「외국인환자 사전ㆍ사후관리」가 근거 · 유치업 등록 A-2026-01-02-06761'),
    ('상급종합병원 4곳 협진망', '이대서울 · 이대목동 · 고려대구로 · 신촌세브란스'),
], strong=True)

quad(X0 + CW + GAP, Y0, 'W', '약점', 'Weakness', [
    ('현지 인지도 부족', '신규 진입 · 브랜드보다 파트너 신뢰에 기대는 단계'),
    ('소수 인력 운영', '상담·개발·행정이 소수에 집중'),
    ('파트너 의존도', '초기 송출 시점이 에이전시 일정에 좌우된다'),
])

quad(X0, Y0 + CH + GAP, 'O', '기회', 'Opportunity', [
    ('치료형 고액 소비 국가', '진흥원 소비패턴 분류상 카자흐스탄은 중증 치료 수요 중심'),
    ('정책 방향 일치', '진흥원 2026.07.30 「비대면진료 기반 사전·사후관리 표준 운영체계」 발주'),
    ('2027.5.27 범위 확대', '제16조의2 신설 · 진단ㆍ처방까지 하는 비대면 진료가 열린다'),
], strong=True)

quad(X0 + CW + GAP, Y0 + CH + GAP, 'T', '위협', 'Threat', [
    ('현지 에이전시 관행', '고수수료 · 「직접 병원 실사 후 송출」 요구로 초기 지연'),
    ('송출의 계절성', '환자 이동이 특정 시기에 몰린다'),
    ('인접 경쟁국', '튀르키예 · 인도의 가격 경쟁력'),
])

# ─────────────────────────── 축 라벨 (세로 글자는 회전해 붙인다)
def side(y, text):
    # 세로로 돌리면 글자가 뒤집혀 읽히므로 한 글자씩 내려 쓴다
    for i, ch in enumerate(text):
        d.text((78, y + i * 30), ch, font=f(5, 22), fill=MUTED)


side(Y0 + 96, '내부요인')
side(Y0 + CH + GAP + 96, '외부요인')

# ─────────────────────────── 전략 띠 (라임은 여기 한 곳만)
BY = Y0 + (CH + GAP) * 2 + 14
d.rectangle([X0, BY, W - 70, BY + 96], fill=LIME)
d.text((X0 + 34, BY + 16), 'SO 전략',
       font=f(8, 27), fill=BLACK)
d.text((X0 + 34, BY + 54),
       '지금 돌아가는 원격협진으로 실사례를 쌓아 표준 절차로 다듬는다   ·   제도 범위가 넓어질 때 그대로 확산할 수 있는 자산',
       font=f(5, 23), fill=BLACK)

img.save(OUT)
print('만듦 :', OUT, img.size)
