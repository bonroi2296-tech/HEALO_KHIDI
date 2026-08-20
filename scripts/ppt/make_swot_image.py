# -*- coding: utf-8 -*-
"""SWOT 분석 그림 — BeyondK 깔(docs/rules/PPT_STYLE.md) 기준.

규격 : 흰 바탕 · 라임(#D9FE55)은 한 곳만 · 에스코어 드림 글꼴.
쓰는 곳 : 중간보고서 2부 「수익모델」 / 발표자료 SWOT 장.

쓰는 법:  python scripts/ppt/make_swot_image.py <나올.png>
"""
import sys, os
from PIL import Image, ImageDraw, ImageFont

OUT = sys.argv[1] if len(sys.argv) > 1 else 'swot.png'
W, H = 1800, 1040

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
d.text((70, 56), '카자흐스탄 진출 SWOT 분석', font=f(8, 54), fill=BLACK)
d.line([70, 140, W - 70, 140], fill=BLACK, width=3)

# ─────────────────────────── 사분면 좌표
GAP = 26
X0, Y0 = 132, 200
CW = (W - 132 - 70 - GAP) // 2
CH = 320


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
    ('6개 언어 플랫폼 · 실시간 통역', '에이전시 및 환자 원격 협진 실증 · 제2의료소견 6건 회신'),
    ('상급종합병원 협진 네트워크', '이대서울 · 이대목동 · 고려대구로 · 신촌세브란스'),
], strong=True)

quad(X0 + CW + GAP, Y0, 'W', '약점', 'Weakness', [
    ('한방 치료에 대한 현지 인식', '러시아 의학 전통이 강한 지역이라 한방 면역치료가 낯선 선택지로 받아들여진다'),
    ('유치 실적 미발생', '실환자 유치 0건 · 문의 대다수가 한국에 와도 치료가 어려운 상태였다'),
    ('현지 상주 인력 부재', '현지 응대와 서류 확인을 파트너와 원격에 의존한다'),
])

quad(X0, Y0 + CH + GAP, 'O', '기회', 'Opportunity', [
    ('치료형 고액 소비 국가', '카자흐스탄은 중증 치료 수요 중심'),
    ('정책 방향 일치', '「의료 해외진출 및 외국인환자 유치 지원에 관한 법률」 개정안 공포'),
    ('러시아어권 전체로 확장', '러시아어 하나로 러시아와 CIS 전역까지 같은 플랫폼으로 대응한다'),
], strong=True)

quad(X0 + CW + GAP, Y0 + CH + GAP, 'T', '위협', 'Threat', [
    ('등록 유치업체 과다', '국내 등록 유치업체가 수천 곳이라 병원 연결만으로는 차별이 안 된다'),
    ('병원 직영 채널', '대형병원이 해외 사무소를 직접 두고 환자를 받는 구조가 있다'),
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
       '한국 대학병원 소견을 현지에서 먼저 받아보는 경로를 러시아어권 전체로 넓힌다   ·   방한 여부를 소개가 아니라 의료진 판단으로 정하는 방식',
       font=f(5, 23), fill=BLACK)

img.save(OUT)
print('만듦 :', OUT, img.size)
