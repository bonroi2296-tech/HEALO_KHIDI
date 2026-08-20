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
         "(아래 표는 2026-04 시점 수동 확인 시나리오다. 2026-08-20 현재는 자동화 스크립트 45개 파일 164건으로 대체되어 자동 실행된다.)"),
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

# 사업계획서(2026-05-14 제출본)가 약속한 결과물과 실제 산출물의 대응.
# 계획서엔 「UI/UX 설계서」인데 우리 파일 이름은 「화면 설계서」인 것처럼 표현이
# 조금씩 다르다. 파일 이름을 바꾸는 대신 이 표로 이어 보인다(이름을 바꾸면 참조가
# 여러 곳이라 비용이 크고, 대조하는 사람에게는 이 표 한 장이면 충분하다).
PLAN_MAP_TITLE = "사업계획서 약속 대비표"
PLAN_MAP_ROWS = [
    ("M1. 플랫폼 설계 완료 (5월)", "요구사항 정의서", "01_요구사항정의서.docx", "충족"),
    ("", "UI/UX 설계서", "01-1_화면설계서.docx (화면 10종 lo-fi 설계)", "충족"),
    ("", "시스템 구성도", "01-1_화면설계서.docx 제2장", "충족"),
    ("M2. 플랫폼 개발 완료 (6월)", "HEALO 배포본", "healwith.co.kr 실서비스 가동", "충족"),
    ("", "기능 테스트 결과서", "08_테스트결과서.docx", "충족"),
    ("M4. 중간점검 (9월)", "중간 실적 보고서", "중간보고서 (KHIDI 지정 양식, 별도 관리)", "진행"),
    ("정성지표 증빙", "플랫폼 시연 및 관련 산출물(정의서 · 설계서 · 테스트 결과 등)",
     "위 문서 일체 + 02_기능명세서 · 11_6대ICT 대비표", "충족"),
]

# 09 제출 일정표에서 폐기 문서를 가리키던 문구. 제출은 계속 있으므로 문구만 바꾼다.
DROPPED_DOC_NOTES = [
    ("04_중간보고서.docx (갱신본)", "중간보고서 (KHIDI 지정 양식, 별도 관리)"),
    ("05_최종보고서.docx", "최종보고서 (KHIDI 지정 양식, 별도 관리)"),
]

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


# ── 08 Core Web Vitals ─────────────────────────────────────────────────────
# 2026-08-20 Lighthouse 12.8.2 실측(https://healwith.co.kr/ko). 광고차단 프로그램을 끈 상태,
# 모바일·데스크톱 각 5회 측정의 중앙값.
CWV_ROWS = [
    ("LCP (최대 콘텐츠 페인트)", "2.5초 이하", "모바일 6.40초 / 데스크톱 1.41초",
     "각 5회 반복 측정의 중앙값. 데스크톱 충족, 모바일 미달"
     "(첫 화면 전송량 831KB 가 저속 회선에서 병목). 개선 과제"),
    ("CLS (레이아웃 안정성)", "0.1 이하", "데스크톱 0.51(5회 중 4회) / 모바일 0.95(5회 중 1회)",
     "간헐 발생. 화면 골격이 본문보다 먼저 그려진 회차에서만 꼬리말이 밀린다. "
     "원인 규명 완료, 수정 반영 예정"),
    ("입력 반응성 (FID → TBT 대체)", "TBT 200ms 이하", "모바일 186ms / 데스크톱 25ms",
     "각 5회 중앙값. FID 는 폐지된 지표로 총 차단 시간(TBT)으로 대체 측정. 양쪽 충족"),
    ("TTFB (서버 응답 시간)", "800ms 이하", "26~35ms", "충족"),
    ("AI 챗봇 첫 토큰", "3초 이하", "미측정", "별도 계측 도구 필요"),
]
CWV_NOTE = ("Lighthouse 12.8.2 실측(2026. 8. 20., https://healwith.co.kr/ko). "
            "모바일은 저속 4G·CPU 4배 감속 조건이며 5회 반복 측정의 중앙값이다. 측정 PC 의 "
            "광고차단 프로그램이 값을 왜곡시키므로 해당 프로그램을 끈 상태에서 측정하였다. "
            "종합 점수는 측정 환경에 따라 편차가 크므로 기재하지 않고 지표값만 기재한다.")


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


def drop_rows_containing(doc, needle, only_table_with=None):
    """어느 칸에든 needle 이 든 줄을 표에서 통째로 뺀다. 지운 줄 수를 돌려준다.

    only_table_with 를 주면 «첫 칸이 그 글자로 시작하는 줄이 있는 표»에서만 지운다.
    같은 파일명이 여러 표에 나올 때(목록 표 + 제출 일정표) 엉뚱한 표까지
    지우는 것을 막는다. 2026-08-20 실측: 이걸 안 두었더니 제출 일정표의
    8월·11월 줄이 통째로 날아갔다.

    ⚠️ 번호(B-01 등)로 지우지 마라. 지운 뒤 번호를 다시 매기면 «다음 문서»가 그
       번호를 물려받아, 다시 실행할 때 엉뚱한 줄이 지워진다(2026-08-20 실측:
       04_중간보고서 줄이 이렇게 사라졌다). 파일명처럼 안 바뀌는 값으로 지운다.
    """
    n = 0
    for t in doc.tables:
        if only_table_with and not any(
                r.cells[0].text.strip().startswith(only_table_with) for r in t.rows):
            continue
        for row in list(t.rows):
            if any(needle in c.text for c in row.cells):
                t._tbl.remove(row._tr)
                n += 1
    return n


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

    # 0-1) 09 산출물목록에서 폐기 문서 흔적 제거
    #      03 착수보고서: KHIDI 가 요구한 적 없는데 이전 세션이 만든 것(PO 결정 2026-08-20).
    #      04 중간보고서·05 최종보고서: KHIDI 정해진 양식으로 따로 만든다(PO 결정 2026-08-20).
    #      제출 자체는 계속 있으므로 일정표는 지우지 않고 문구만 바꾼다.
    path = os.path.join(HERE, "09_산출물목록.docx")
    if os.path.exists(path):
        doc = Document(path)
        hit = 0
        for gone in ("03_착수보고서", "04_중간보고서.docx", "05_최종보고서.docx"):
            hit += drop_rows_containing(doc, gone, only_table_with="B-")
        # ⚠️ 문구 교체는 «줄을 지운 뒤»에 한다. 먼저 하면 삭제 기준 글자가 사라져 줄이 안 지워진다.
        for para_ in iter_paragraphs(doc):
            for old_, new_ in DROPPED_DOC_NOTES:
                replace_in_paragraph(para_, old_, new_)
        if hit:
            for t in doc.tables:
                if not any(r.cells[0].text.strip().startswith("B-") for r in t.rows):
                    continue
                n = 0
                for row in t.rows:
                    if row.cells[0].text.strip().startswith("B-"):
                        n += 1
                        c = row.cells[0]; c.text = ""
                        set_font(c.paragraphs[0].add_run(f"B-{n:02d}"), size=9, bold=True)
        if not any(PLAN_MAP_TITLE in p_.text for p_ in doc.paragraphs):
            # ⚠️ 부록을 먼저 걷어내고 붙인다. 그냥 붙이면 «부록 뒤»에 놓이고,
            #    뒤에서 부록을 걷어낼 때 부록 제목부터 문서 끝까지 지우므로 이 표도
            #    같이 날아간다(2026-08-20 실측). 부록은 아래 단계에서 다시 붙는다.
            strip_appendix(doc)
            doc.add_page_break()
            heading(doc, PLAN_MAP_TITLE)
            para(doc, "2026. 5. 14. 제출한 사업계획서가 결과물로 적은 항목과 실제 산출물을 "
                      "나란히 둔 표다. 계획서 표현과 파일 이름이 다른 곳이 있어 함께 적는다.", size=9)
            table(doc, ["마일스톤", "계획서가 적은 결과물", "실제 산출물", "상태"], PLAN_MAP_ROWS)
            hit += 1
        if hit:
            doc.save(path)
            changed.append(f"09_산출물목록.docx: 폐기 문서 정리 + 계획서 대비표")

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

    path = os.path.join(HERE, "08_테스트결과서.docx")
    if os.path.exists(path):
        doc = Document(path)
        hit = set_cells(doc, "성능 측정 (Lighthouse)",
                        {2: "5항목 중 4항목 측정",
                         3: "2026-08-20 실측(모바일·데스크톱 각 5회). LCP 는 데스크톱만 충족, CLS 는 간헐 발생"})
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
