# -*- coding: utf-8 -*-
"""기관 협력 제안서(org_intro_deck.py)에 넣을 차트 이미지를 만든다.

숫자는 전부 docs/WHY_US_EVIDENCE.md 의 출처 있는 값이다. 여기서 새로 만들지 마라.
쓰기: python scripts/ppt/org_intro_charts.py
"""
import os
import sys

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib import font_manager  # noqa: E402

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import beyondk_style as B  # noqa: E402

# ── 글꼴: 에스코어 드림 (PPT 본문과 같은 것)
FDIR = os.path.join(os.environ["LOCALAPPDATA"], "Microsoft", "Windows", "Fonts")
for f in ("SCDream4.otf", "SCDream5.otf", "SCDream7.otf"):
    p = os.path.join(FDIR, f)
    if os.path.exists(p):
        font_manager.fontManager.addfont(p)
REG = font_manager.FontProperties(fname=os.path.join(FDIR, "SCDream4.otf"))
MED = font_manager.FontProperties(fname=os.path.join(FDIR, "SCDream5.otf"))
BOLD = font_manager.FontProperties(fname=os.path.join(FDIR, "SCDream7.otf"))

# ── 색: 새로 적지 않는다. beyondk_style 상수를 그대로 쓴다(PPT_STYLE §2).
def hexof(c):
    return f"#{c}"


BRAND = hexof(B.BRAND)      # teal-700 · 강조 (슬라이드당 한 곳)
PANEL = hexof(B.PANEL)      # 회색 밝은 단계
LINE = hexof(B.LINE)        # 회색 중간 단계 · 테두리
INK = hexof(B.BLACK)
WHITE = hexof(B.WHITE)

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__)))), "docs", "presentations", "shots")
os.makedirs(OUT, exist_ok=True)


def save(fig, name):
    p = os.path.join(OUT, name)
    fig.savefig(p, dpi=200, bbox_inches="tight", pad_inches=0.02, facecolor="white")
    plt.close(fig)
    print("chart:", name)


# ── 차트 1. 카자흐 암환자 흐름 (연 진단 → 해외 출국 → 국가 지원)
def chart_funnel():
    fig, ax = plt.subplots(figsize=(5.6, 3.3))
    labels = ["연간 신규 암 진단", "치료 위해 해외로 출국", "국가 예산의 해외치료 지원"]
    values = [40000, 6000, 80]
    notes = ["3~4만 명", "약 6,000명", "약 80명 (0.3% 미만)"]
    # 강조는 한 곳만(맨 아래 «국가 지원»). 나머지는 규격 회색 두 단계로 물러난다.
    colors = [PANEL, LINE, BRAND]
    y = [2, 1, 0]
    ax.barh(y, values, height=0.48, color=colors, edgecolor=LINE, linewidth=0.8)
    for yi, v, n in zip(y, values, notes):
        ax.text(v + 900, yi, n, va="center", ha="left",
                fontproperties=BOLD, fontsize=13, color=INK)
    ax.set_yticks(y)
    ax.set_yticklabels(labels, fontproperties=MED, fontsize=12, color=INK)
    ax.set_xlim(0, 54000)
    ax.set_ylim(-0.6, 2.6)
    ax.set_xticks([])
    for sp in ax.spines.values():
        sp.set_visible(False)
    ax.tick_params(left=False)
    save(fig, "chart_kz_funnel.png")


# ── 차트 2. 한국 의료관광 의료비 지출의 진료과 구성 (2026 상반기)
#    부분-전체는 도넛이 아니라 가로 누적 막대로 그린다(dataviz 스킬 기본형).
def chart_mix():
    fig, ax = plt.subplots(figsize=(8.6, 1.45))
    segs = [
        ("피부과\n54.1%", 54.1, PANEL, INK),
        ("성형외과\n18.0%", 18.0, LINE, INK),
        ("그 외 진료과\n27.9%", 27.9, BRAND, WHITE),
    ]
    left = 0.0
    for label, v, fill, ink in segs:
        ax.barh(0, v, left=left, height=0.74, color=fill, edgecolor=WHITE, linewidth=2)
        ax.text(left + v / 2, 0, label, ha="center", va="center", linespacing=1.5,
                fontproperties=BOLD, fontsize=11.5, color=ink)
        left += v
    # 흰 배경에서 밝은 회색 칸도 형태가 보이도록 막대 전체에 규격 선색 윤곽을 두른다
    ax.barh(0, 100, height=0.74, color="none", edgecolor=LINE, linewidth=1)
    ax.set_xlim(0, 100)
    ax.set_ylim(-0.5, 0.5)
    ax.set_xticks([])
    ax.set_yticks([])
    for sp in ax.spines.values():
        sp.set_visible(False)
    save(fig, "chart_specialty_mix.png")


if __name__ == "__main__":
    chart_funnel()
    chart_mix()
