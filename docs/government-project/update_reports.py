# -*- coding: utf-8 -*-
"""
update_reports.py — 생성기가 없는 산출물(04·06·07·08·09)을 현행으로 갱신한다.

왜 «수정 스크립트»인가:
  01·02·EVAL 은 생성기(make_*.py)가 있어 통째로 다시 뽑으면 되지만,
  04·06·07·08·09 는 생성기 없이 직접 작성된 문서다. 통째로 재작성하면 그동안 쌓인
  서술을 잃는다. 그래서 **틀린 부분만 제자리에서 고치고, 빠진 현행 내용은 장(章)으로
  덧붙이는** 방식을 쓴다. 재실행해도 결과가 같도록(멱등) 만들었다.

사실의 출처는 _facts.py 한 곳이다(문서마다 따로 적지 않는다).

    python3 update_reports.py
"""
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")

from docx import Document
from docx.shared import Pt, RGBColor, Cm
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

import _facts as F

HERE = os.path.dirname(os.path.abspath(__file__))

# ── 제자리 교체 목록 ────────────────────────────────────────────────────────
# (파일, [(옛 문구, 새 문구), ...])
# 폐지된 화면을 설명하던 문장을 현행 화면으로 바꾼다. 근거는 app/ 실재 여부로 확인함.
REPLACEMENTS = {
    "04_중간보고서.docx": [
        ("/admin/*, /partner/* 완성", "/admin/*, /hospital/* 완성"),
        # ── 2026-08-19 갱신 : 본문이 4월 30일 기준에 멈춰 있어 부록(현행)과 어긋났다.
        ("기준일 2026년 4월 30일 기준", "기준일 2026년 8월 19일 기준"),
        ("전체 기능 구현 진척률은 74% (완료) + 26% (부분구현)로, 미구현 기능은 없다.",
         "전체 기능 구현 진척률은 96% (완료 22/23) + 4% (부분구현 1/23)로, 미구현 기능은 없다. "
         "착수 시 부분구현으로 분류했던 6개 기능 중 5개가 완료로 전환되었다."),
        ("사업 기간 기준 진척률: 4월/8개월 = 12.5% (초기 단계)이나, 기능 구현은 사전 개발로 74% 완료 상태.",
         "사업 기간 기준 진척률: 5개월/8개월 = 62.5% 경과. 기능 구현은 96% 완료 상태이며, "
         "플랫폼은 6월 정식 배포 이후 실서비스로 운영 중이다."),
        ("2026년 4월 30일 기준 — 시스템 구축 단계이므로 운영 KPI는 측정 전 상태이다.",
         "2026년 8월 19일 기준 — 플랫폼 구축·배포는 완료되어 운영 중이며, "
         "운영 KPI는 실환자 유입 단계에 따라 집계된다."),
        ("2026년 4월 30일 (착수 후 1개월 시점)", "2026년 8월 19일 (착수 후 5개월 시점)"),
        ("74% (17/23 기능)", "96% (22/23 기능)"),
        ("26% (6/23 기능)", "4% (1/23 기능)"),
        ("화상 내 실시간 번역 자막, 예약 리마인더 자동화, 사후관리 AI 감지, 러시아어·카자흐어 UI 완성, 실시간 푸시 알림",
         "예약 리마인더 자동화(의료진 일정 연동 잔여)"),
        ("v0.9 [Draft]", "v1.1"),
        ("2026-04-30", "2026-08-19"),
    ],
    "08_테스트결과서.docx": [
        ("SEC-01~08 모두 통과 (2026-04-30 기준)", "SEC-01~08 모두 통과 (2026-08-19 기준)"),
        ("2026년 4월 30일", "2026년 8월 19일"),
        ("82개 파일 / 748건", "110개 파일 / 1,002건"),
        ("40개 파일 / 108건", "45개 파일 / 164건"),
        ("현재 (4월 30일)", "현재 (8월 19일)"),
        ("Critical: 0건, High: 0건, Moderate: [확인 필요 — TBD]",
         "Critical: 0건, High: 1건, Moderate: 2건 (운영 의존성 기준, 2026-08-19 실행)"),
        ("2026-04-30", "2026-08-19"),
    ],
    "09_산출물목록.docx": [
        ("Phase A 산출물은 사업 착수 및 KHIDI 신청 단계에서 작성된 문서이다. 2026년 4월 30일 완료.",
         "Phase A 산출물은 사업 착수 및 KHIDI 신청 단계에서 작성되었으며, 2026년 8월 19일 현행 실측 기준으로 갱신하였다."),
        ("2026년 4월 30일", "2026년 8월 19일"),
        ("구현 현황(완료74%/부분26%)", "구현 현황(완료96%/부분4%)"),
        ("진척률 74%, KPI 진행", "진척률 96%, KPI 진행"),
        ("2026-04-30 전체 완료", "2026-08-19 기준 갱신 완료"),
    ],
    "06_사용자매뉴얼.docx": [
        ("healo.kr/intake", "healo.kr/inquiry"),
        ("[화면: /intake 페이지 — Step 1]", "[화면: /inquiry 페이지 — 1단계]"),
        ("[화면: /intake 페이지 — Step 5 제출 완료 화면]", "[화면: /inquiry 페이지 — 제출 완료]"),
        ("[화면: /coordinator/intake/[id] 페이지]", "[화면: /coordinator/intakes 페이지]"),
        ("healo.kr/partner 접속 후 의료진 계정으로 로그인",
         "healo.kr/hospital 접속 후 의료기관 담당자 계정으로 로그인 "
         "(의료진 본인은 계정 없이 상담방 초대링크로 참여)"),
        ("[화면: /partner 페이지 — 파트너 대시보드]", "[화면: /hospital 페이지 — 국내 의료기관 대시보드]"),
        ("[화면: /partner/patients/[id] 페이지]", "[화면: /hospital/leads 페이지 — 의뢰 환자 상세]"),
        ("[화면: /partner/sessions/[id] 페이지 — 화상 협진]",
         "[화면: /consultation/[id] — 화상 상담방(초대링크 입장)]"),
        ("[화면: /partner/patients/[id]/opinion 페이지]",
         "[화면: /opinion/[token] — 전문의 소견 작성]"),
    ],
    "07_관리자매뉴얼.docx": [
        ("/admin/intake/[id] 에서", "/admin/inquiries 에서"),
    ],
}

# ── 덧붙일 장(章) ───────────────────────────────────────────────────────────
# 제목이 이미 있으면 다시 붙이지 않는다(재실행 안전).
APPENDIX_TITLE = f"부록. 현행 반영 ({F.AS_OF} 기준)"


def set_font(run, size=10, bold=False, color=None):
    run.font.name = "맑은 고딕"
    run.font.size = Pt(size)
    run.font.bold = bold
    if color:
        run.font.color.rgb = RGBColor(*color)
    rPr = run._r.get_or_add_rPr()
    rFonts = OxmlElement("w:rFonts")
    rFonts.set(qn("w:eastAsia"), "맑은 고딕")
    rPr.append(rFonts)


def set_cell_bg(cell, hex_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_color)
    tcPr.append(shd)


def heading(doc, text, size=14):
    p = doc.add_paragraph()
    set_font(p.add_run(text), size=size, bold=True, color=(0, 70, 127))
    return p


def para(doc, text, size=10, indent=0):
    p = doc.add_paragraph()
    if indent:
        p.paragraph_format.left_indent = Cm(indent)
    set_font(p.add_run(text), size=size)
    return p


def set_table_borders(t):
    """'Table Grid' 스타일이 없는 문서(다른 도구로 만든 04·06·07 등)를 위해 테두리를 직접 그린다."""
    tblPr = t._tbl.tblPr
    borders = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        el = OxmlElement(f"w:{edge}")
        el.set(qn("w:val"), "single")
        el.set(qn("w:sz"), "4")
        el.set(qn("w:color"), "999999")
        borders.append(el)
    tblPr.append(borders)


def table(doc, headers, rows):
    t = doc.add_table(rows=0, cols=len(headers))
    try:
        t.style = "Table Grid"
    except KeyError:
        # 이 문서엔 해당 스타일이 정의돼 있지 않다 → 테두리를 직접 넣는다.
        set_table_borders(t)
    hr = t.add_row()
    for i, h in enumerate(headers):
        c = hr.cells[i]
        c.text = ""
        set_font(c.paragraphs[0].add_run(h), size=9, bold=True, color=(255, 255, 255))
        set_cell_bg(c, "00467F")
    for r in rows:
        dr = t.add_row()
        for i, v in enumerate(r):
            if i < len(dr.cells):
                c = dr.cells[i]
                c.text = ""
                set_font(c.paragraphs[0].add_run(str(v)), size=9, bold=(i == 0))
    doc.add_paragraph()
    return t


def iter_paragraphs(doc):
    """본문 문단 + 모든 표 안의 문단까지 훑는다(표 안에 옛 경로가 많다)."""
    for p in doc.paragraphs:
        yield p
    for t in doc.tables:
        for row in t.rows:
            for cell in row.cells:
                for p in cell.paragraphs:
                    yield p


def replace_in_paragraph(p, old, new):
    """문단에서 old→new. 글자가 여러 run 으로 쪼개져 있어도 처리한다."""
    if old not in p.text:
        return False
    # 1) 한 run 안에 통째로 들어 있으면 그 run 만 고친다(서식 보존).
    for run in p.runs:
        if old in run.text:
            run.text = run.text.replace(old, new)
            return True
    # 2) run 경계로 쪼개진 경우 — 첫 run 에 합치고 나머지를 비운다.
    #    (짧은 경로 문자열이라 서식 손실이 사실상 없다.)
    merged = p.text.replace(old, new)
    if not p.runs:
        return False
    p.runs[0].text = merged
    for run in p.runs[1:]:
        run.text = ""
    return True


def already_has(doc, title):
    return any(title in p.text for p in doc.paragraphs)


def add_appendix(doc, kind):
    """kind: 'report'(04) | 'user'(06) | 'admin'(07) | 'test'(08) | 'inventory'(09)"""
    doc.add_page_break()
    heading(doc, APPENDIX_TITLE)
    para(doc,
         "본 부록은 문서 본문 작성 이후 변경된 사항을 현행 기준으로 반영한 것이다. "
         "수치는 추정이 아니라 운영데이터베이스 정확 집계이며, 화면 경로는 실제 배포 코드 기준이다.")
    doc.add_paragraph()

    heading(doc, "1. 계정 계층 (7종)", size=12)
    para(doc, "※ 의사는 계정 계층이 아니다. 화상상담 초대링크 게스트 또는 의료기관 계정으로 참여한다.", size=9)
    table(doc, ["계층", "권한 저장", "전용 화면", "설명"],
          [(t[1], t[2], t[3], t[4]) for t in F.TIERS])

    if kind in ("user", "admin", "report"):
        heading(doc, "2. 화상 상담(원격협진) 기능", size=12)
        table(doc, ["구분", "내용"], F.TELEMEDICINE)

        heading(doc, "3. 상담 채널", size=12)
        para(doc, "※ 연동 수준을 구분해 기재한다. 위챗·라인은 메신저 바로가기 안내이며 봇 연동은 미적용이다.", size=9)
        table(doc, ["채널", "연동 수준", "내용"], F.CHANNELS)

    heading(doc, "4. 화면 경로 정정 내역", size=12)
    para(doc, "본문에 남아 있던 옛 화면 안내는 아래 기준으로 현행에 맞게 정정하였다. "
              "폐지된 경로는 혼동을 막기 위해 그대로 표기하지 않는다.", size=9)
    table(doc, ["현행 화면", "대체한 옛 화면", "사유"], F.ROUTES_RETIRED_PRINTABLE)

    if kind in ("report", "inventory"):
        heading(doc, "5. 성과지표 현황", size=12)
        para(doc, F.KPI_NOTE, size=9)
        table(doc, ["지표", "목표", f"실적({F.AS_OF})"], [
            ("외국인환자 유치", f"{F.KPI_TARGET['attraction']}건", f"{F.KPI_ACTUAL['attraction']}건"),
            ("사전상담", "—", f"{F.KPI_ACTUAL['preConsultation']}건"),
            ("사후관리", "—", f"{F.KPI_ACTUAL['followUp']}건"),
            ("사전상담+사후관리 합산", f"{F.KPI_TARGET['consultAndCare']}건",
             f"{F.KPI_ACTUAL['preConsultation'] + F.KPI_ACTUAL['followUp']}건"),
            ("환자 만족도", f"{F.KPI_TARGET['satisfaction']}점",
             f"표본 {F.KPI_ACTUAL['satisfactionSamples']}건"),
            ("다국어 지원", f"{F.KPI_TARGET['languages']}개 언어",
             f"{F.KPI_ACTUAL['languages']}개 언어(충족)"),
        ])
        para(doc, f"※ 테스트 데이터는 제외한 실건이다. 문의 실건 {F.KPI_ACTUAL['inquiriesReal']}건, "
                  f"상담세션 실건 {F.KPI_ACTUAL['sessionsReal']}건.", size=9)

    if kind == "test":
        heading(doc, "5. 품질검증 현황", size=12)
        table(doc, ["구분", "규모", "결과"], [
            ("단위 테스트", f"{F.QUALITY['unit_files']}개 파일 / {F.QUALITY['unit_tests']}건",
             F.QUALITY["unit_result"]),
            ("통합·E2E 테스트", f"{F.QUALITY['e2e_files']}개 파일 / {F.QUALITY['e2e_tests']}건",
             "자동 실행"),
        ])
        heading(doc, "6. 자동 검사 항목", size=12)
        table(doc, ["검사", "내용", "주기"], F.QUALITY["ci_gates"])

    heading(doc, "9. 근거자료", size=12)
    table(doc, ["구분", "출처", "확인 내용"], F.PROVENANCE)


def main():
    changed = []
    # 1) 제자리 교체
    for fname, pairs in REPLACEMENTS.items():
        path = os.path.join(HERE, fname)
        if not os.path.exists(path):
            print(f"  건너뜀(없음): {fname}")
            continue
        doc = Document(path)
        n = 0
        for p in iter_paragraphs(doc):
            for old, new in pairs:
                if replace_in_paragraph(p, old, new):
                    n += 1
        if n:
            doc.save(path)
            changed.append(f"{fname}: {n}곳 교체")
        else:
            changed.append(f"{fname}: 교체할 것 없음(이미 현행)")

    # 2) 부록 덧붙이기 (이미 있으면 건너뜀 = 재실행 안전)
    for fname, kind in [
        ("04_중간보고서.docx", "report"),
        ("06_사용자매뉴얼.docx", "user"),
        ("07_관리자매뉴얼.docx", "admin"),
        ("08_테스트결과서.docx", "test"),
        ("09_산출물목록.docx", "inventory"),
    ]:
        path = os.path.join(HERE, fname)
        if not os.path.exists(path):
            continue
        doc = Document(path)
        if already_has(doc, APPENDIX_TITLE):
            changed.append(f"{fname}: 부록 이미 있음(건너뜀)")
            continue
        add_appendix(doc, kind)
        doc.save(path)
        changed.append(f"{fname}: 부록 추가")

    for c in changed:
        print("  " + c)
    print("완료.")


if __name__ == "__main__":
    main()
