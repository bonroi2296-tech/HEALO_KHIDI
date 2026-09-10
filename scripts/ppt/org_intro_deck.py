# -*- coding: utf-8 -*-
"""출장용 소개 제안서 — 뼈대(축)를 골라 만든다.

  python scripts/ppt/org_intro_deck.py time    # A판 「시간」 축 (기본)
  python scripts/ppt/org_intro_deck.py path    # B판 「비어 있는 통로」 축
  python scripts/ppt/org_intro_deck.py both    # C판 둘을 이어붙인 판

축이 다른 것은 앞부분(문제 제기) 2~3장뿐이고, 뒤(우리가 하는 일·네트워크·협력)는 공통이다.
기관용 시장 통계는 PO 지시로 «한 장만» 넣는다(2026-09-10).
규격: docs/rules/PPT_STYLE.md — beyondk_style 이 집행한다.
"""
import io
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import beyondk_style as B  # noqa: E402

MODE = (sys.argv[1] if len(sys.argv) > 1 else "time").lower()
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SHOTS = os.path.join(ROOT, "docs", "presentations", "shots")
OUT_DIR = os.path.join(os.path.expanduser("~"), "Desktop",
                       "healwith_기관제안서_260910_claude")
OUT = os.path.join(OUT_DIR, "healwith_제안서_%s_260910_claude.pptx" % MODE)

W = B.W
M = B.MARGIN

prs = B.deck()

# ── 표지 ───────────────────────────────────────────────────────────────
COVER = {
    "time": (["환자가 잃는 것은", "돈이 아니라 시간입니다"],
             "카자흐스탄·CIS 암환자를 한국 의료로 잇습니다"),
    "path": (["카자흐스탄·CIS 암환자를", "한국 의료로 잇습니다"],
             "수요가 아니라 통로가 비어 있습니다"),
    "both": (["환자가 잃는 것은", "돈이 아니라 시간입니다"],
             "카자흐스탄·CIS 암환자를 한국 의료로 잇습니다"),
}[MODE]
B.cover(prs, "기관·파트너 협력 제안 · 2026", COVER[0], COVER[1],
        "본로이(Bonroi) · 외국인환자 유치업 등록 A-2026-01-02-06761 · 2026년 9월")

B.chapter(prs, "Who we are")

# ── 3. 우리는 누구인가 ─────────────────────────────────────────────────
s = B.content(
    prs, "ABOUT US",
    "법정 요건을 갖춘 등록 유치업자입니다",
    "브로커가 아니라 정부에 등록하고 보증보험을 갖춘 사업자로서 외국인환자를 유치합니다.",
)
cw = (W - M * 2 - 16 * 3) / 4
for i, (v, l, sub, acc) in enumerate([
    ("정부 등록", "외국인환자 유치업자", "A-2026-01-02-06761", True),
    ("1억원", "등록보증보험 가입", "SGI서울보증 가입", False),
    ("국책과제", "2026 보건복지부·KHIDI", "ICT 사전상담·사후관리 사업", False),
    ("특허 2건", "자체 기술 보유", "EMR 연동 · AI 중개", False),
]):
    B.stat(s, M + i * (cw + 16), 170, cw, v, l, sub, accent=acc)

B.table(s, [
    ["구분", "내용"],
    ["상호 / 대표", "본로이(Bonroi) / 강주영"],
    ["소재지", "서울 강서구 강서로 385, 613호 (마곡)"],
    ["서비스", "healwith · 외국인 암환자 사전상담·병원연계·사후관리 플랫폼"],
    ["대상 국가", "카자흐스탄 · 러시아 · 중앙아시아 (6개 언어 제공)"],
], M, 288, [150, 666], row_h=27)

B.band(s, "▶ 등록과 보증보험은 법정 요건이고, 국책과제 수행과 자체 특허가 저희의 차별점입니다")


_D = os.path.dirname(os.path.abspath(__file__))
def _part(name):
    exec(io.open(os.path.join(_D, "_deck_%s.py.txt" % name), encoding="utf-8").read(), globals())

if MODE == "time":
    _part("time")
elif MODE == "path":
    _part("path")
else:
    _part("time")
    _part("path")
_part("market")

# ── 9. 환자 여정 6단계 ─────────────────────────────────────────────────
s = B.content(
    prs, "HOW",
    "현지 상담부터 귀국 후 관리까지 한 곳에서",
    "①~③은 현지에서, ④~⑥은 방한 이후에 진행합니다. 여섯 단계가 모두 한 플랫폼에 기록됩니다.",
)
steps = [
    ("① 사전상담", ["현지에서 러시아어로 문의", "의무기록 업로드·판독"]),
    ("② 병원 매칭", ["암종별로 진료과 연결", "예상 일정·비용 안내"]),
    ("③ 방한 준비", ["의료비자·항공·숙박", "통역 배정"]),
    ("④ 치료", ["상급종합병원 수술·항암", "동행 통역과 일정 관리"]),
    ("⑤ 회복·면역재활", ["면력한방병원에서", "체력·면역·영양 관리"]),
    ("⑥ 사후관리", ["귀국 후 원격 상담", "경과 기록·재방문 안내"]),
]
sw = (W - M * 2 - 33 * 2) / 3
for i, (title, lines) in enumerate(steps):
    col, row = i % 3, i // 3
    B.step(s, M + col * (sw + 33), 180 + row * 112, sw, 92, title, lines,
           fill=B.GREEN_L if row == 0 else B.PANEL)

B.band(s, "▶ 사전상담과 사후관리는 2027년 5월부터 법으로 허용되는 비대면 진료의 토대가 됩니다")
B.note(s, "의료해외진출법 개정안 공포 2026-05-26 / 시행 2027-05. 현재 원격상담은 진료가 아닌 «상담·정보제공» 범위에서 운영합니다.")

# ── 10. 플랫폼 실화면 ───────────────────────────────────────────────────
s = B.content(
    prs, "PLATFORM",
    "기획안이 아니라 이미 돌아가는 서비스입니다",
    "브라우저 언어가 러시아어면 아래 화면이 그대로 열립니다. 여섯 언어를 자동으로 가릅니다.",
)
hero = os.path.join(SHOTS, "crop_home_hero.png")
if os.path.exists(hero):
    B.picture(s, hero, M, 172, w=560)
B.caption(s, "healwith.co.kr 러시아어 화면 (2026년 9월 10일 촬영)", M, 172 + 232 + 6, 560, size=9)

tf = B.text(s, M + 584, 176, W - M * 2 - 584, 250)
for i, (h, ls) in enumerate([
    ("6개 언어", ["한국어·영어·러시아어", "카자흐어·중국어·일본어"]),
    ("웹 + 모바일 앱", ["iOS 앱 2026년 9월 게시", "카자흐·러시아·우즈베키스탄·", "키르기스스탄에서 내려받기"]),
    ("환자 전용 화면", ["의무기록을 올리면", "판독해 요약합니다"]),
]):
    B.line(tf, h, 12, B.BLACK, B.HEAVY, first=(i == 0), before=(0 if i == 0 else 16))
    for j, t in enumerate(ls):
        B.line(tf, t, 10.5, B.BODY, B.REG, before=(3 if j == 0 else 0))

B.band(s, "▶ 데모가 아니라 실제 환자 문의가 들어오고 있는 서비스입니다")

# ── 11. 실시간 AI 의료통역 ─────────────────────────────────────────────
s = B.content(
    prs, "DIFFERENTIATOR",
    "말이 오가는 동안 자막으로 옮깁니다",
    "상대가 말하면 듣는 사람의 언어로 자막이 뜨고, 오간 말이 번역돼 기록에 남습니다.",
)
room = os.path.join(SHOTS, "ui_consult_mock.png")
if os.path.exists(room):
    B.picture(s, room, M, 186, w=516)
B.caption(s, "원격상담 화면. 위는 의료진의 발화, 아래는 실시간 번역", M, 448, 516, size=9)

tf = B.text(s, M + 548, 190, W - M * 2 - 548, 260)
for i, (t, ds) in enumerate([
    ("통역 인력 부담을 덜어 줍니다", ["러시아어 의료통역은 구하기도", "일정을 맞추기도 어렵습니다."]),
    ("듣는 사람의 언어로 바뀝니다", ["상대의 말이 내 언어 자막으로", "화면에 뜹니다."]),
    ("오간 말이 기록으로 남습니다", ["번역된 내용이 저장되어", "이후 상담으로 이어집니다."]),
]):
    B.line(tf, t, 12, B.BLACK, B.XBOLD, first=(i == 0), before=(0 if i == 0 else 18))
    for j, d in enumerate(ds):
        B.line(tf, d, 10, B.BODY, B.REG, before=(3 if j == 0 else 0))

B.band(s, "▶ AI 자막은 참고용입니다. 의학적 판단은 의료진이 직접 확인합니다", y=474)
B.note(s, "특허 10-2745881(EMR 연동 플랫폼) · 10-2868334(AI 기반 중개 시스템) 보유. 중요한 진료 대화에는 통역 인력을 함께 배정합니다.")

# ── 12. 플랫폼이 제공하는 화면 ─────────────────────────────────────────
s = B.content(
    prs, "FEATURES",
    "여정의 각 단계마다 쓰는 화면이 있습니다",
    "아래는 실제 서비스 화면입니다. 환자는 처음부터 끝까지 자기 언어로 씁니다.",
)
tiles = [
    ("ui_journey.png", "진단부터 회복까지 여정 안내"),
    ("ui_hospitals.png", "병원·의료진 정보"),
    ("ui_cost.png", "암종·단계별 예상 비용 계산"),
    ("ui_telemed.png", "화상 사전상담과 실시간 통역"),
    ("ui_guide.png", "암종별 치료 정보 가이드"),
    ("ui_visa.png", "의료비자·방한 준비 안내"),
]
tw = 224
for i, (fn, cap) in enumerate(tiles):
    p = os.path.join(SHOTS, fn)
    col, row = i % 3, i // 3
    x = M + col * (tw + 72)
    y = 164 + row * 172
    if os.path.exists(p):
        B.picture(s, p, x, y, w=tw)
    B.caption(s, cap, x, y + 140 + 6, tw, size=8.5)

B.note(s, "화면은 러시아어판이며 한국어·영어·카자흐어·중국어·일본어로도 같은 기능을 제공합니다.", y=512)

# ── 13. 의료 네트워크 ──────────────────────────────────────────────────
s = B.content(
    prs, "NETWORK",
    "환자가 지나가는 길은 이렇게 이어져 있습니다",
    "각 구간의 관계를 있는 그대로 적었습니다. 과장 없이 설명하는 것이 저희 방식입니다.",
)
# 윗줄: 유치 흐름(현지 → 우리 → 치료)
nw = 232
gap = (W - M * 2 - nw * 3) / 2
row1 = [
    ("현지 에이전시", ["아스타나 Clinic Navigator", "비슈케크 MedEx Travel", "유치 계약 체결"], B.PANEL),
    ("healwith 플랫폼", ["사전상담·의무기록 판독", "병원 연계·통역·기록 관리", "본로이 직접 운영"], B.GREEN_M),
    ("상급종합병원", ["이대서울·이대목동", "고려대구로·신촌세브란스", "수술·항암 치료"], B.PANEL),
]
for i, (title, lines, fill) in enumerate(row1):
    x = M + i * (nw + gap)
    B.step(s, x, 172, nw, 104, title, lines, fill=fill)
    if i < 2:
        B.arrow(s, x + nw + (gap - 22) / 2, 218)

# 아랫줄: 면력한방병원은 우리와 직접 제휴이고, 상급종합병원과는 «그들끼리의» 협진이다
B.step(s, M + nw + gap, 306, nw, 92, "면력한방병원",
       ["강서·신촌 컨소시엄 참여", "회복·면역·영양 관리", "본로이와 직접 제휴"], fill=B.GREEN_L)
B.box(s, M + nw + gap + nw / 2 - 0.6, 276, 1.2, 30, B.LINE)          # 우리 ↔ 면력 (실선)
B.box(s, M + nw + gap + nw, 351, gap + nw / 2 - nw / 2, 1.2, B.LINE)  # 면력 ↔ 상급종합 (가로선)
B.box(s, M + 2 * (nw + gap) + nw / 2 - 0.6, 276, 1.2, 76, B.LINE)

B.caption(s, "면력한방병원과 상급종합병원은 두 기관 사이의 협진 관계입니다. 본로이와 상급종합병원의 직접 협약은 별도로 진행하고 있습니다.",
          M, 410, W - M * 2, size=9)
B.band(s, "▶ 수술은 상급종합병원에서, 회복은 면력한방병원에서. 한 여정으로 묶어 관리합니다", y=444)

# ── 14. 챕터 ───────────────────────────────────────────────────────────
B.chapter(prs, "Together")

# ── 15. 함께할 수 있는 일 ──────────────────────────────────────────────
s = B.content(
    prs, "PARTNERSHIP",
    "이런 자리에서 함께할 수 있습니다",
    "정해진 요청을 들고 온 것이 아니라, 서로 보탤 수 있는 지점을 찾고자 합니다.",
)
B.table(s, [
    ["협력 영역", "저희가 드릴 수 있는 것", "함께하면 생기는 것"],
    ["현지 홍보·행사",
     "러시아어·카자흐어 콘텐츠와 현지 상담 채널",
     "행사·설명회 현장에서 바로 이어지는 상담 접점"],
    ["현지 네트워크",
     "아스타나·비슈케크 계약 파트너, 현지 방문 일정",
     "현지 의료기관·유관기관으로 연결 확대"],
    ["현장 정보·데이터",
     "실제 문의·상담에서 확인한 수요와 이탈 지점",
     "중증 의료관광 수요를 숫자로 확인할 자료"],
    ["공동 사업",
     "국책과제 수행 경험과 자체 ICT 플랫폼",
     "공동 프로모션·시범사업의 실행 주체"],
], M, 168, [140, 336, 340], row_h=44)

B.band(s, "▶ 오늘은 인사드리러 왔습니다. 어느 쪽이든 이야기를 이어갈 수 있으면 좋겠습니다", y=400)

# ── 16. 연락처 ─────────────────────────────────────────────────────────
s = B.content(prs, "CONTACT", "연락처", "언제든 편하게 연락 주십시오.")
B.table(s, [
    ["구분", "내용"],
    ["상호", "본로이(Bonroi) · 외국인환자 유치업 등록 A-2026-01-02-06761"],
    ["대표", "강주영"],
    ["주소", "서울특별시 강서구 강서로 385, 613호"],
    ["이메일", "admin@healwith.co.kr"],
    ["웹사이트", "https://healwith.co.kr"],
    ["모바일", "App Store에서 healwith 앱 검색"],
], M, 170, [130, 686], row_h=30)

B.band(s, "▶ 오늘 나눈 이야기를 정리해 다시 연락드리겠습니다. 감사합니다", y=420)
B.note(s, "서비스명은 상표권 출원 과정에서 기존 명칭에서 healwith 로 변경했습니다. 일부 현장 사진·현수막에 변경 전 명칭이 남아 있습니다.")


os.makedirs(OUT_DIR, exist_ok=True)
B.save(prs, OUT)
print("saved:", os.path.basename(OUT), len(prs.slides._sldIdLst), "slides")
