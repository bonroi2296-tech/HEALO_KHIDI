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
import pathlib
import sys

sys.stdout.reconfigure(encoding="utf-8")

from docx import Document
from docx.shared import Pt, RGBColor, Cm
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

import _facts as F

HERE = os.path.dirname(os.path.abspath(__file__))

# 모든 산출물에 적용. 본로이는 개인사업자라 「(주)」는 사실과 다르다.
GLOBAL = [
    ("(주)본로이", "본로이"),
    ("(주) 본로이", "본로이"),
    ("healo.kr", "healwith.co.kr"),
]

# ── 제자리 교체 목록 ────────────────────────────────────────────────────────
# (파일, [(옛 문구, 새 문구), ...])
# 폐지된 화면을 설명하던 문장을 현행 화면으로 바꾼다. 근거는 app/ 실재 여부로 확인함.
REPLACEMENTS = {
    # 03 은 4월 30일자 문서지만 협약 서명(4/16) 뒤에 쓴 것이라 옛 목표치(10/80/80)가
    # 처음부터 틀린 값이었다. 확정 목표는 12 / 120 / 90 이다(PO 결정 2026-08-20).
    "03_착수보고서.docx": [
        ("시범 환자 모집 (목표 10건 유치)", "시범 환자 모집 (목표 12건 유치)"),
        ("상담 80건 달성 목표 추진", "사전상담·사후관리 120건 달성 목표 추진"),
        ("KPI 목표치 확인: 유치 10건, 상담 80건, 만족도 80점",
         "KPI 목표치 확인: 유치 12건, 사전상담·사후관리 120건, 만족도 90점"),
    ],

    "01_요구사항정의서.docx": [
        # ── 2026-08-19 : 실제로 없는 경로 → 배포 코드의 실제 주소로
        ("/app/api/chat/route.ts", "/app/api/public/chat/message, /app/api/patient/chat"),
        ("/app/api/livekit/route.ts", "/app/api/khidi/consultation/token (+ /app/api/livekit/webhook)"),
        ("/app/api/email", "src/lib/email/sendEmail.ts"),
        ("migrations/20260420_drop_*_plaintext (평문 완전 제거)",
         "식별정보 암호화 적용 — 이메일 109건·전화 22건 전건 암호문(2026-08-19 실측). "
         "평문 컬럼 삭제 마이그레이션은 보류(검색·번역에 쓰이는 본문 때문)"),
        ("migrations/20260420_drop_*_plaintext", "migrations/20260420_drop_*_plaintext (작성 완료·미실행)"),
        ("평문 완전 제거", "식별정보 암호화 완료 / 본문·소견은 평문 보관"),
    ],
    "02_기능명세서.docx": [
        # ── 2026-08-19 : 실제로 없는 경로 → 배포 코드의 실제 주소로
        ("/app/api/chat/route.ts", "/app/api/public/chat/message, /app/api/patient/chat"),
        ("/app/api/livekit/route.ts", "/app/api/khidi/consultation/token (+ /app/api/livekit/webhook)"),
        ("/app/api/email", "src/lib/email/sendEmail.ts"),
        ("migrations/20260420_drop_*_plaintext (평문 완전 제거)",
         "식별정보 암호화 적용 — 이메일 109건·전화 22건 전건 암호문(2026-08-19 실측). "
         "평문 컬럼 삭제 마이그레이션은 보류(검색·번역에 쓰이는 본문 때문)"),
        ("migrations/20260420_drop_*_plaintext", "migrations/20260420_drop_*_plaintext (작성 완료·미실행)"),
        ("평문 완전 제거", "식별정보 암호화 완료 / 본문·소견은 평문 보관"),
    ],
    "04_중간보고서.docx": [
        ("/admin/*, /partner/* 완성", "/admin/*, /hospital/* 완성"),
        ("현 단계 KPI 미달성은 정상 — 사업 초기(착수 1개월) 시스템 구축 집중 기간이며, "
         "7월 시범 운영 개시를 통해 KPI 달성 기간 진입 예정.",
         "플랫폼 구축·배포는 완료되어 운영 중이며, 운영 KPI 는 실환자가 상담·치료 단계에 "
         "도달해야 발생하는 구조다. 잔여 기간(8~10월) 환자 유입이 달성의 관건이다."),
        # ── 2026-08-19 : 실제로 없는 경로 → 배포 코드의 실제 주소로
        ("/app/api/chat/route.ts", "/app/api/public/chat/message, /app/api/patient/chat"),
        ("/app/api/livekit/route.ts", "/app/api/khidi/consultation/token (+ /app/api/livekit/webhook)"),
        ("/app/api/email", "src/lib/email/sendEmail.ts"),
        ("migrations/20260420_drop_*_plaintext (평문 완전 제거)",
         "식별정보 암호화 적용 — 이메일 109건·전화 22건 전건 암호문(2026-08-19 실측). "
         "평문 컬럼 삭제 마이그레이션은 보류(검색·번역에 쓰이는 본문 때문)"),
        ("migrations/20260420_drop_*_plaintext", "migrations/20260420_drop_*_plaintext (작성 완료·미실행)"),
        ("평문 완전 제거", "식별정보 암호화 완료 / 본문·소견은 평문 보관"),
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
        ("«수동 확인»", "수동 확인"),
        ("SEC-01~08 모두 통과 (2026-04-30 기준)", "SEC-01~08 모두 통과 (2026-08-19 기준)"),
        ("2026년 4월 30일", "2026년 8월 19일"),
        ("82개 파일 / 748건", "110개 파일 / 1,002건"),
        ("40개 파일 / 108건", "45개 파일 / 164건"),
        ("현재 (4월 30일)", "현재 (8월 19일)"),
        ("Critical: 0건, High: 0건, Moderate: [확인 필요 — TBD]",
         "Critical: 0건, High: 1건, Moderate: 2건 (운영 의존성 기준, 2026-08-19 실행)"),
        ("2026-04-30", "2026-08-19"),
        ("(e2e/ 디렉토리 예정)",
         "— 아래 표는 2026-04 시점 수동 확인 시나리오다. 2026-08-19 현재는 자동화 스크립트 45개 파일 164건으로 대체되어 자동 실행된다."),
        ("Playwright E2E 스크립트 코드베이스 내 미포함 — 현재 수동 시나리오 기반 (e2e/ 디렉토리 추가 예정)",
         "[해소됨 2026-08-19] Playwright E2E 스크립트 도입 완료 — 45개 파일 164건. 매 변경 시 스모크, 매일 밤 전체 실행."),
        ("단위 테스트(Jest) 케이스 부재 — requireAdminAuth.test.ts 등 추가 필요",
         "[해소됨 2026-08-19] 단위 테스트 110개 파일 1,002건 도입 완료(전건 통과)."),
        ("5.2 자동화 테스트 미흡 영역", "5.2 자동화 테스트 미흡 영역 (2026-04 지적 → 2026-08-19 해소 내역)"),
        ("27건 | 27/27 (100%) | 현재 시점 전체 통과", "27건 | 27/27 | 2026-04 수동 확인 기준"),
        ("27/27 (100%)", "27/27 (2026-04 수동 확인 기준)"),
        ("2026년 5월 | 화상 내 번역 자막 E2E 테스트", "[완료] 화상 내 번역 자막 — 실서비스 가동, 통번역 3,542건"),
        ("2026년 5월 | requireAdminAuth 단위 테스트", "[완료] requireAdminAuth 단위 테스트 도입"),
        ("2026년 6월 | 부하 테스트 (100 동시 접속)", "[예정] 부하 테스트 (100 동시 접속)"),
        ("2026년 7월 | 외부 침투 테스트", "[예정] 외부 침투 테스트"),
        ("name_encrypted 컬럼 암호문 확인, 평문 없음",
         "성명·이메일·전화 암호문 확인(2026-08-19 재확인: 이메일 109건·전화 22건 전건 암호문). 문의 본문·의료진 소견은 검색·번역 목적으로 평문 보관"),
        ("PII 평문 저장 없음", "식별정보 평문 저장 없음"),
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
        ("HEALO v1.0 (2026년 4월 기준)", "HEALO (2026년 8월 19일 기준)"),
        ("2026-04-30", "2026-08-19"),
    ],
    "07_관리자매뉴얼.docx": [
        ("/admin/intake/[id] 에서", "/admin/inquiries 에서"),
        ("HEALO v1.0 (2026년 4월 기준)", "HEALO (2026년 8월 19일 기준)"),
        ("2026-04-30", "2026-08-19"),
    ],
}

# ── 덧붙일 장(章) ───────────────────────────────────────────────────────────
# 제목이 이미 있으면 다시 붙이지 않는다(재실행 안전).
# 제목에 날짜를 넣지 않는다 — 날짜가 들어가면 갱신 때마다 「이미 있음」 검사가 빗나가
# 부록이 한 문서에 여러 벌 쌓인다(2026-08-19 실제로 04·06·07·08·09 에 두 벌씩 쌓였다).
APPENDIX_TITLE = "부록. 현행 반영"


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
    # new 가 old 를 품고 있는 쌍(꼬리말 덧붙이기)만 겹쳐 붙는다. 그 경우에만 건너뛴다.
    if old in new and new in p.text:
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


def strip_appendix(doc):
    """이미 붙어 있는 부록을 통째로 걷어낸다. 없으면 아무것도 안 한다.

    부록은 항상 문서 맨 뒤에 붙으므로, 첫 부록 제목부터 본문 끝까지를 지운다.
    앞의 쪽나눔 빈 문단도 같이 지워야 빈 페이지가 남지 않는다.
    """
    body = doc.element.body
    kids = [c for c in body.iterchildren() if not c.tag.endswith("}sectPr")]
    start = next((i for i, c in enumerate(kids)
                  if APPENDIX_TITLE in "".join(c.itertext())), None)
    if start is None:
        return 0
    while start > 0 and not "".join(kids[start - 1].itertext()).strip():
        start -= 1
    for c in kids[start:]:
        body.remove(c)
    return len(kids) - start


def add_appendix(doc, kind):
    """kind: 'report'(04) | 'user'(06) | 'admin'(07) | 'test'(08) | 'inventory'(09)"""
    doc.add_page_break()
    heading(doc, APPENDIX_TITLE)
    para(doc, f"기준일 : {F.AS_OF}", size=9)
    doc.add_paragraph()

    n = [0]

    def sec(title):
        n[0] += 1
        heading(doc, f"{n[0]}. {title}", size=12)

    sec("계정 계층 (7종)")
    para(doc, "※ 의사는 계정 계층이 아니다. 화상상담 초대링크 게스트 또는 의료기관 계정으로 참여한다.", size=9)
    table(doc, ["계층", "권한 저장", "전용 화면", "설명"],
          [(t[1], t[2], t[3], t[4]) for t in F.TIERS])

    if kind in ("user", "admin", "report"):
        sec("화상 상담(원격협진) 기능")
        table(doc, ["구분", "내용"], F.TELEMEDICINE)

        sec("상담 채널")
        para(doc, "※ 위챗·라인은 메신저 바로가기 안내이며 봇 연동은 미적용이다.", size=9)
        table(doc, ["채널", "연동 수준", "내용"], F.CHANNELS)

    sec("화면 경로 정정 내역")
    table(doc, ["현행 화면", "대체한 옛 화면", "사유"], F.ROUTES_RETIRED_PRINTABLE)

    if kind in ("report", "inventory"):
        sec("성과지표 현황")
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
        para(doc, f"※ 시험 데이터 제외. 문의 {F.KPI_ACTUAL['inquiriesReal']}건, "
                  f"상담세션 {F.KPI_ACTUAL['sessionsReal']}건.", size=9)

    if kind == "test":
        sec("품질검증 현황")
        table(doc, ["구분", "규모", "결과"], [
            ("단위 테스트", f"{F.QUALITY['unit_files']}개 파일 / {F.QUALITY['unit_tests']}건",
             F.QUALITY["unit_result"]),
            ("통합·E2E 테스트", f"{F.QUALITY['e2e_files']}개 파일 / {F.QUALITY['e2e_tests']}건",
             "자동 실행"),
        ])
        sec("자동 검사 항목")
        table(doc, ["검사", "내용", "주기"], F.QUALITY["ci_gates"])

    sec("근거자료")
    table(doc, ["구분", "출처", "확인 내용"], F.PROVENANCE)


# ── 04 예산 집행 표 ─────────────────────────────────────────────────────────
# 협약서(2026-186-001) 사업비와 2026-08-10 제출한 중간정산 사용실적보고서 확정치.
# 비목별 계획액은 회계법인 제출본에만 있으므로 재원별로만 적는다(추정해 채우지 않는다).
BUDGET_ROWS = [
    ("정부지원금(국고)", "70,000,000", "7,850,826",
     "집행률 11.2% — 홍보비·클라우드 이용료·소모품비"),
    ("자기부담", "17,500,000", "6,503,386",
     "집행률 37.2% — 현금 4,375,000 / 현물 13,125,000 중 참여기관 현물 인건비 집행분"),
    ("합계", "87,500,000", "14,354,212", "집행률 16.4%"),
]
BUDGET_LEAD = ("사업 예산 집행 현황은 협약서(2026-186-001) 사업비와 2026. 8. 10. 제출한 "
               "중간정산 사용실적보고서 기준이다.")
BUDGET_TAIL = ("※ 국고 집행액의 대부분은 온라인 마케팅 위탁 홍보비 7,700,000원"
               "(세금계산서 2026. 7. 16.)이며, 나머지는 앱 등록비·클라우드 인프라 이용료·"
               "소모품비이다. 비목별 세부 내역은 중간정산 사용실적보고서에 따른다.")


def fill_budget(doc):
    """04 의 예산 집행 표를 재원별 3줄로 다시 쓴다. 몇 번 돌려도 같은 결과."""
    for t in doc.tables:
        if t.rows and t.rows[0].cells[0].text.strip() != "예산 항목":
            continue
        for tr in t._tbl.tr_lst[1:]:                       # 머리줄만 남기고 비운다
            t._tbl.remove(tr)
        t.rows[0].cells[0].text = ""
        set_font(t.rows[0].cells[0].paragraphs[0].add_run("재원"), size=9, bold=True,
                 color=(255, 255, 255))
        set_cell_bg(t.rows[0].cells[0], "00467F")
        for r in BUDGET_ROWS:
            dr = t.add_row()
            for i, v in enumerate(r):
                c = dr.cells[i]; c.text = ""
                set_font(c.paragraphs[0].add_run(v), size=9, bold=(i == 0))
        return True
    return False


# ── 08 Core Web Vitals ─────────────────────────────────────────────────────
# 2026-08-19 Lighthouse 12.8.2 실측(https://healwith.co.kr/ko, 헤드리스 크롬).
# 모바일은 저속 4G·CPU 4배 감속 조건, 데스크톱은 기본 조건.
CWV_ROWS = [
    ("LCP (최대 콘텐츠 페인트)", "2.5초 이하", "모바일 8.1초 / 데스크톱 1.6초",
     "데스크톱 충족. 모바일 미달 — 원인 규명 완료(첫 화면 본문이 뒤늦게 끼워지는 구조), 개선 반영 예정"),
    ("CLS (레이아웃 안정성)", "0.1 이하", "모바일 0.971 / 데스크톱 0.007",
     "데스크톱 충족. 모바일 미달 — 본문 도착 시 꼬리말이 밀려남. 위와 동일 원인"),
    ("입력 반응성 (FID → TBT 대체)", "TBT 200ms 이하", "모바일 213ms / 데스크톱 0ms",
     "FID 는 폐지된 지표로 총 차단 시간(TBT)으로 대체 측정"),
    ("TTFB (서버 응답 시간)", "800ms 이하", "26~35ms", "충족"),
    ("AI 챗봇 첫 토큰", "3초 이하", "미측정", "별도 계측 도구 필요"),
]
CWV_NOTE = ("Lighthouse 12.8.2 실측(2026. 8. 20., https://healwith.co.kr/ko). "
            "모바일은 저속 4G·CPU 4배 감속 조건이다. 측정 PC 에 설치된 광고차단 프로그램이 "
            "페이지마다 2.1MB 를 끼워 넣어 값을 왜곡시키므로 해당 주입을 차단하고 측정하였다. "
            "종합 점수는 측정 환경에 따라 편차가 크므로 기재하지 않고, 지표값만 기재한다.")


def fill_cwv(doc):
    """08 의 Core Web Vitals 표를 실측값으로 채운다. 몇 번 돌려도 같은 결과."""
    for t in doc.tables:
        if not t.rows or t.rows[0].cells[0].text.strip() != "지표":
            continue
        if "2.5초 이하" not in "".join(c.text for c in t.rows[1].cells):
            continue
        for tr in t._tbl.tr_lst[1:]:
            t._tbl.remove(tr)
        for r in CWV_ROWS:
            dr = t.add_row()
            for i, v in enumerate(r):
                c = dr.cells[i]; c.text = ""
                set_font(c.paragraphs[0].add_run(v), size=9, bold=(i == 0))
        return True
    return False


def set_cells(doc, first_cell, values):
    """첫 칸이 first_cell 인 줄을 찾아 {열번호: 값} 으로 덮어쓴다. 없으면 False."""
    for t in doc.tables:
        for row in t.rows:
            if row.cells[0].text.strip() != first_cell:
                continue
            for i, v in values.items():
                if i >= len(row.cells):
                    continue
                c = row.cells[i]; c.text = ""
                set_font(c.paragraphs[0].add_run(v), size=9)
            return True
    return False


# 04 본문 KPI 표가 옛 목표(10건/80건/80점)에 멈춰 있어 같은 문서의 부록(12/120/90)과
# 어긋나 있었다. 확정 목표는 협약 기준 12 / 120 / 90 이다.
KPI_ROWS_04 = {
    "K-01": {1: "외국인환자 유치 건수", 2: f"{F.KPI_TARGET['attraction']}건",
             3: f"{F.KPI_ACTUAL['attraction']}건", 4: "유치 파이프라인 가동 중 — 8~10월 유입 필요"},
    "K-02": {1: "사전상담·사후관리 건수", 2: f"{F.KPI_TARGET['consultAndCare']}건",
             3: f"{F.KPI_ACTUAL['preConsultation'] + F.KPI_ACTUAL['followUp']}건",
             4: "영상 사전상담 1건 + 환자에게 전달된 소견 5건"},
    "K-03": {1: "서비스 만족도", 2: f"{F.KPI_TARGET['satisfaction']}점",
             3: f"표본 {F.KPI_ACTUAL['satisfactionSamples']}건", 4: "완료 상담 증가에 연동"},
}


def main():
    changed = []

    # 0) 모든 산출물 공통 교체
    for path in sorted(pathlib.Path(HERE).glob("*.docx")):
        doc = Document(str(path))
        n = sum(1 for p in iter_paragraphs(doc) for old, new in GLOBAL
                if replace_in_paragraph(p, old, new))
        if n:
            doc.save(str(path))
            changed.append(f"{path.name}: 공통 교체 {n}곳")

    # 0-1) 04 예산 표
    path = os.path.join(HERE, "04_중간보고서.docx")
    if os.path.exists(path):
        doc = Document(path)
        for para_ in iter_paragraphs(doc):
            if "실제 수치는 사업비 확정 후 갱신 예정이다" in para_.text and para_.runs:
                para_.runs[0].text = BUDGET_LEAD
                for r_ in para_.runs[1:]:
                    r_.text = ""
            if para_.text.strip().startswith("※ 인프라 실비 현황") and para_.runs:
                para_.runs[0].text = BUDGET_TAIL
                for r_ in para_.runs[1:]:
                    r_.text = ""
        if fill_budget(doc):
            doc.save(path)
            changed.append("04_중간보고서.docx: 예산 집행 표 갱신")

    # 0-2) 08 성능 실측
    path = os.path.join(HERE, "08_테스트결과서.docx")
    if os.path.exists(path):
        doc = Document(path)
        for para_ in iter_paragraphs(doc):
            txt = para_.text.strip()
            if not para_.runs:
                continue
            if txt.startswith("[화면: Lighthouse 리포트 스크린샷"):
                para_.runs[0].text = ""
            elif txt.startswith(("Core Web Vitals는 시범 운영 시작 후", "Lighthouse 12.8.2 실측")):
                para_.runs[0].text = CWV_NOTE
                for r_ in para_.runs[1:]:
                    r_.text = ""
        if fill_cwv(doc):
            doc.save(path)
            changed.append("08_테스트결과서.docx: 성능 측정 표 실측 반영")

    # 0-2b) 03 성과지표 표 — 확정 목표치로
    path = os.path.join(HERE, "03_착수보고서.docx")
    if os.path.exists(path):
        doc = Document(path)
        hit = set_cells(doc, "K-01", {2: "12건 이상"})
        hit += set_cells(doc, "K-02", {1: "사전상담·사후관리 건수", 2: "120건 이상"})
        hit += set_cells(doc, "K-03", {2: "90점 이상 (100점)"})
        if hit:
            doc.save(path)
            changed.append(f"03_착수보고서.docx: 성과지표 목표 {hit}줄 정정")

    # 0-3) 04 KPI 표 · 08 남은 측정 칸
    path = os.path.join(HERE, "04_중간보고서.docx")
    if os.path.exists(path):
        doc = Document(path)
        hit = sum(set_cells(doc, k, v) for k, v in KPI_ROWS_04.items())
        hit += set_cells(doc, "T-01", {2: "레드라인 위반 0건 유지",
                                       3: "매일 자동 시험 가동 — 위반 자동 검출·경보"})
        if hit:
            doc.save(path)
            changed.append(f"04_중간보고서.docx: KPI·기술지표 {hit}줄 갱신")

    path = os.path.join(HERE, "08_테스트결과서.docx")
    if os.path.exists(path):
        doc = Document(path)
        hit = set_cells(doc, "성능 측정 (Lighthouse)",
                        {2: "5항목 중 4항목 측정",
                         3: "2026-08-20 실측. 데스크톱 전 항목 충족, 모바일 LCP·CLS 미달"})
        hit += set_cells(doc, "npm 의존성 보안",
                         {2: "1회", 3: "Critical 0건 · High 1건 · Moderate 2건 (2026-08-19)"})
        if hit:
            doc.save(path)
            changed.append(f"08_테스트결과서.docx: 측정 결과 {hit}줄 갱신")

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

    # 2) 부록 — 있던 것을 걷어내고 새로 붙인다(몇 번 돌려도 한 벌만 남는다)
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
        removed = strip_appendix(doc)
        add_appendix(doc, kind)
        doc.save(path)
        changed.append(f"{fname}: 부록 갱신" + (f" (옛 부록 {removed}블록 제거)" if removed else ""))

    for c in changed:
        print("  " + c)
    print("완료.")


if __name__ == "__main__":
    main()
