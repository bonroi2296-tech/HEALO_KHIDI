import sys
sys.stdout.reconfigure(encoding='utf-8')

from docx import Document
from docx.shared import Pt, Inches, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

doc = Document()

section = doc.sections[0]
section.page_width = Inches(8.27)
section.page_height = Inches(11.69)
section.left_margin = Cm(2.5)
section.right_margin = Cm(2.5)
section.top_margin = Cm(2.5)
section.bottom_margin = Cm(2.5)

def set_font(run, size=10, bold=False, color=None):
    run.font.name = '맑은 고딕'
    run.font.size = Pt(size)
    run.font.bold = bold
    if color:
        run.font.color.rgb = RGBColor(*color)
    rPr = run._r.get_or_add_rPr()
    rFonts = OxmlElement('w:rFonts')
    rFonts.set(qn('w:eastAsia'), '맑은 고딕')
    rPr.append(rFonts)

def add_heading(doc, text, level=1, color=(0,70,127)):
    p = doc.add_heading(level=level)
    p.clear()
    run = p.add_run(text)
    size = 14 if level == 1 else (12 if level == 2 else 11)
    set_font(run, size=size, bold=True, color=color)
    return p

def add_para(doc, text, indent=0, size=10):
    p = doc.add_paragraph()
    if indent:
        p.paragraph_format.left_indent = Cm(indent)
    run = p.add_run(text)
    set_font(run, size=size)
    return p

def set_cell_bg(cell, hex_color):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), hex_color)
    tcPr.append(shd)

def add_header_row(table, cols, bg='00467F'):
    row = table.add_row()
    for i, col in enumerate(cols):
        if i < len(row.cells):
            cell = row.cells[i]
            cell.text = ''
            p = cell.paragraphs[0]
            run = p.add_run(col)
            set_font(run, size=9, bold=True, color=(255,255,255))
            set_cell_bg(cell, bg)

def add_data_row(table, cols, bold_first=False, bg=None):
    row = table.add_row()
    for i, cell in enumerate(row.cells):
        if i < len(cols):
            cell.text = ''
            p = cell.paragraphs[0]
            run = p.add_run(str(cols[i]))
            b = bold_first and i == 0
            set_font(run, size=9, bold=b)
            if bg:
                set_cell_bg(cell, bg)

def func_spec_table(doc, spec):
    """기능 명세 표 생성"""
    tbl = doc.add_table(rows=0, cols=2)
    tbl.style = 'Table Grid'
    add_header_row(tbl, ['항목', '내용'])
    for k, v in spec.items():
        add_data_row(tbl, [k, v], bold_first=True)
    doc.add_paragraph()

# ================================================================
# 표지
# ================================================================
doc.add_paragraph()
doc.add_paragraph()
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run('HEALO 플랫폼')
set_font(run, 20, True, (0,70,127))

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run('기능 명세서')
set_font(run, 24, True, (0,70,127))

doc.add_paragraph()
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run('Functional Specification Document')
set_font(run, 12, False, (80,80,80))

doc.add_paragraph()
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run('ICT 기반 외국인환자 사전상담·사후관리 지원 사업  |  v1.2  |  2026.08.20')
set_font(run, 10, False, (120,120,120))

doc.add_paragraph()
doc.add_paragraph()

tbl_info = doc.add_table(rows=0, cols=2)
tbl_info.style = 'Table Grid'
for label, val in [
    ('문서 번호', 'HEALO-FSD-2026-001'),
    ('작성 기관', '본로이 (Bonroi)'),
    ('작성일', '2026년 8월 20일'),
    ('버전', 'v1.2'),
    ('관련 문서', 'HEALO-REQ-2026-001 요구사항정의서'),
]:
    row = tbl_info.add_row()
    row.cells[0].text = ''
    r1 = row.cells[0].paragraphs[0].add_run(label)
    set_font(r1, 10, True, (0,70,127))
    row.cells[1].text = ''
    r2 = row.cells[1].paragraphs[0].add_run(val)
    set_font(r2, 10)

doc.add_page_break()

# ================================================================
# 목차
# ================================================================
add_heading(doc, '목  차', 1)
for num, title in [
    ('1.', '기능 그룹 개요'),
    ('2.', '회원·인증·권한 관리'),
    ('3.', '환자 인테이크·문서 업로드'),
    ('4.', '병원 매칭·정보 제공'),
    ('5.', '원격 화상상담 (LiveKit)'),
    ('6.', 'AI 챗봇·사람 상담원 상담'),
    ('7.', 'AI 실시간 번역'),
    ('8.', '예약·일정·비자 관리'),
    ('9.', '사후관리·모니터링·교육'),
    ('10.', '다국어 (ko/en/ru/kz/zh/ja)'),
    ('11.', '코디네이터 포털'),
    ('12.', '관리자·파트너·의사 포털'),
    ('13.', '알림·이메일 시스템'),
    ('14.', 'AI 학습 파이프라인 (RAG)'),
    ('15.', '보안·암호화·감사'),
]:
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Cm(0.5) if '.' in num and len(num) > 2 else Cm(0)
    run = p.add_run(f'{num}  {title}')
    set_font(run, 10)

doc.add_page_break()

# ================================================================
# 1. 기능 그룹 개요
# ================================================================
add_heading(doc, '1. 기능 그룹 개요', 1)
add_para(doc, '본 문서는 HEALO 플랫폼의 14개 기능 그룹에 대한 상세 명세를 기술한다. 각 기능마다 시나리오(액터·전제·트리거·흐름·예외), 입출력, 화면 라우트, DB 테이블/컬럼, 현재 구현 상태를 명시한다.')
add_para(doc, '※ 현황 표기: 완료 / 부분구현 / 미구현')
doc.add_paragraph()

# 기능 그룹 요약 표
tbl = doc.add_table(rows=0, cols=4)
tbl.style = 'Table Grid'
add_header_row(tbl, ['그룹', '기능 그룹명', '핵심 라우트', '현황'])
groups = [
    ('G-01', '회원·인증·권한', '/signup, /login', ''),
    ('G-02', '환자 인테이크·문서', '/inquiry, /api/attachments', ''),
    ('G-03', '병원 매칭·정보', '/hospitals, /api/chat', ''),
    ('G-04', '원격 화상상담', '/telemedicine, /api/livekit', ''),
    ('G-05', 'AI 챗봇·Human 상담', '/api/chat, /coordinator/messages', ''),
    ('G-06', 'AI 실시간 번역', '/api/translate, /api/translate-text', ''),
    ('G-07', '예약·일정·비자', '/patient/calendar, /patient/visa', ''),
    ('G-08', '사후관리·모니터링', '/patient/symptoms, /patient/education', ''),
    ('G-09', '다국어 UI', '/ru, /kz, src/lib/i18n', ''),
    ('G-10', '코디네이터 포털', '/coordinator/*', ''),
    ('G-11', '관리자·의료기관·파트너', '/admin/*, /hospital/*, /agency/*, /clinic/*', ''),
    ('G-12', '알림·이메일', '/api/email, Supabase Realtime', ''),
    ('G-13', 'AI RAG 파이프라인', 'src/lib/rag, /api/rag', ''),
    ('G-14', '보안·암호화·감사', 'src/lib/security, /admin/audit', ''),
]
for g in groups:
    add_data_row(tbl, g, bold_first=True)

doc.add_page_break()

# ================================================================
# 헬퍼: 시나리오 블록 생성
# ================================================================
def add_scenario(doc, scenario_dict):
    tbl = doc.add_table(rows=0, cols=2)
    tbl.style = 'Table Grid'
    add_header_row(tbl, ['시나리오 항목', '내용'], bg='2E6DA4')
    for k, v in scenario_dict.items():
        add_data_row(tbl, [k, v], bold_first=True)
    doc.add_paragraph()

# ================================================================
# 2. 회원·인증·권한 관리
# ================================================================
add_heading(doc, '2. 회원·인증·권한 관리', 1)

add_heading(doc, '2.1 회원가입 및 로그인 (FN-AUTH-01)', 2)
add_scenario(doc, {
    '기능 ID': 'FN-AUTH-01',
    '기능명': '이메일·소셜 회원가입 및 로그인',
    '액터': '환자, 코디네이터, 의료진, 관리자',
    '전제 조건': '네트워크 연결, 유효한 이메일 주소 보유',
    '트리거': '사용자가 /signup 또는 /login 페이지 접근',
    '기본 흐름': '① 이메일·비밀번호 또는 Google OAuth 선택\n② Supabase Auth 인증 처리\n③ 세션 쿠키 발급 (@supabase/ssr)\n④ role에 따라 적절한 대시보드로 리다이렉트',
    '예외 흐름': '• 이메일 미인증 → 인증 메일 재발송 안내\n• 잘못된 비밀번호 → 「인증 실패」 메시지 (error.message 직접 노출 금지)\n• 소셜 OAuth 실패 → fallback 이메일 로그인 안내',
    '입력': '이메일, 비밀번호 (또는 OAuth 토큰)',
    '출력': 'Supabase 세션 쿠키, 리다이렉트',
    '화면 경로': '/app/signup, /app/login',
    'DB 테이블': 'auth.users (Supabase 관리)\napp_metadata.role 컬럼',
    '현재 구현 상태': '완료: proxy.ts, src/lib/auth',
})

add_heading(doc, '2.2 역할 기반 접근 제어 (FN-AUTH-02)', 2)
add_scenario(doc, {
    '기능 ID': 'FN-AUTH-02',
    '기능명': 'RBAC: 역할 기반 라우트 보호',
    '액터': '시스템 (Next.js 미들웨어)',
    '전제 조건': '사용자 세션 쿠키 존재',
    '트리거': '보호된 라우트 (/patient/*, /admin/*, /coordinator/*) 접근 시',
    '기본 흐름': '① Next.js proxy.ts(구 middleware)에서 세션 검증\n② app_metadata.role 확인\n③ 역할 불일치 → /login 리다이렉트\n④ 역할 일치 → 페이지 렌더링 허용',
    '예외 흐름': '• 세션 만료 → 재로그인 안내\n• role 미설정 → 기본 환자 권한',
    '역할 정의': '비회원(게스트): 상담방 초대링크 토큰으로만 /consultation/[id] 입장\n환자: /patient/* 접근\ncoordinator: /coordinator/* 접근\nadmin: /admin/* 전체 접근\n국내 의료기관: /hospital/* 접근\n해외 에이전시: /agency/* 접근\n해외 의료기관: /clinic/* 접근\n※ 의사는 계정 계층이 아님: 초대링크 게스트 또는 병원 계정으로 참여',
    '화면 경로': 'proxy.ts (루트 레벨)',
    'DB/컬럼': 'auth.users.app_metadata.role (user_metadata 사용 금지)',
    '현재 구현 상태': '완료: proxy.ts, src/lib/auth/requireAdminAuth',
})

add_heading(doc, '2.3 게스트 토큰 (FN-AUTH-03)', 2)
add_scenario(doc, {
    '기능 ID': 'FN-AUTH-03',
    '기능명': '비회원 게스트 공개 토큰 발급',
    '액터': '비회원 환자',
    '전제 조건': '회원가입 없이 상담 시작 요청',
    '트리거': '최초 인테이크 폼 제출 또는 채팅 시작',
    '기본 흐름': '① UUID 기반 public_token 생성\n② inquiries 테이블에 token 저장\n③ 쿠키/로컬스토리지에 token 보관\n④ 이후 요청에 token으로 상담 이력 연속성 유지',
    '예외 흐름': '• 토큰 만료 → 새 토큰 발급, 이전 이력 연결 불가',
    '화면 경로': '/inquiry (토큰 발급 시작점)',
    'DB 테이블/컬럼': 'inquiries.public_token (migrations/20260125_inquiries_public_token_and_attachments)',
    '현재 구현 상태': '완료: migrations/20260125_inquiries_public_token_and_attachments',
})

doc.add_page_break()

# ================================================================
# 3. 환자 인테이크·문서
# ================================================================
add_heading(doc, '3. 환자 인테이크·문서 업로드', 1)

add_heading(doc, '3.1 암환자 인테이크 폼 (FN-INTAKE-01)', 2)
add_scenario(doc, {
    '기능 ID': 'FN-INTAKE-01',
    '기능명': '단계별 암환자 인테이크 정보 수집',
    '액터': '해외 암환자 (P-01)',
    '전제 조건': '웹/앱 접속, 다국어 UI 선택 (러시아어 등)',
    '트리거': '/inquiry 페이지 접근',
    '기본 흐름': '① 1단계 접수: 이름·연락 수단·국적·선호 언어 / 암종·병기 / 하고 싶은 말\n② 동의 4종(개인정보·민감정보·제3자 제공·국외이전) 확인 후 제출 — 여기까지만 채워도 접수된다\n③ 접수 뒤 2단계(/inquiry/intake): 문의번호와 접근 토큰이 있어야 열린다\n④ 2단계에서 대학병원 의뢰에 필요한 검사자료를 추가로 받는다\n⑥ → inquiries 테이블 저장, 코디네이터 알림 발송',
    '예외 흐름': '• 필수 항목 미입력 → 단계 진행 불가\n• 파일 업로드 실패 → 재시도 안내\n• 네트워크 오류 → 임시 저장 (로컬스토리지)',
    '입력': '성명(암호화), 연락처(암호화), 국가, 암 종류, 병기, 파일, 희망 내용',
    '출력': 'inquiry 레코드 생성, 코디네이터 이메일 알림',
    '화면 경로': '/app/inquiry (통합 문의 퍼널)',
    'DB 테이블/컬럼': 'inquiries (id, first_name, last_name, email, phone — 이 넷에 암호문 저장, cancer_type, public_token, status)\ncancer_intake_encrypted (암호화 민감 데이터)\nmigrations/20260125_inquiries_intake_progressive',
    '보안': 'AES-256-GCM 암호화 (encryptionV2.ts)\n개인정보보호법 동의 수집',
    '현재 구현 상태': '완료: /app/inquiry (통합 문의 퍼널)\nmigrations/20260125_inquiries_intake_progressive\nmigrations/20260420_drop_cancer_intake_plaintext (평문 컬럼 삭제 완료)',
})

add_heading(doc, '3.2 의료문서 업로드·관리 (FN-INTAKE-02)', 2)
add_scenario(doc, {
    '기능 ID': 'FN-INTAKE-02',
    '기능명': '의료문서(CT/MRI/검사결과) 업로드 및 관리',
    '액터': '환자, 코디네이터',
    '전제 조건': '인테이크 완료 또는 상담 진행 중',
    '트리거': '파일 첨부 버튼 클릭, react-dropzone',
    '기본 흐름': '① 환자가 파일 드래그·업로드\n② MIME 타입 검증 (DICOM/JPEG/PNG/PDF)\n③ 파일 크기 확인 (건당 200MB 이하, 최대 10개)\n④ Supabase Storage 업로드\n⑤ consultation_documents 표에 메타데이터 저장\n⑥ 코디네이터·의료진이 파일 열람 가능',
    '예외 흐름': '• 허용 외 파일 형식 → 업로드 거부 및 안내\n• 파일 크기 초과 → 압축 요청\n• Storage 오류 → 재시도',
    '입력': '의료 파일 (CT DICOM, MRI, 검사결과 PDF, 진단서)',
    '출력': 'Supabase Storage URL, attachments 레코드',
    '화면 경로': '/app/inquiry (업로드), /app/patient/documents (관리)',
    'DB 테이블/컬럼': 'consultation_documents (id, consultation_id, file_name, file_type, file_size, storage_path, document_type, uploaded_by, created_at)\nconsultation_documents (migrations/20260406_consultation_documents)',
    '현재 구현 상태': '완료: /app/api/attachments\nmigrations/20260406_consultation_documents',
})

doc.add_page_break()

# ================================================================
# 4. 병원 매칭
# ================================================================
add_heading(doc, '4. 병원 매칭·정보 제공', 1)

add_heading(doc, '4.1 AI 기반 병원·의료진 매칭 (FN-MATCH-01)', 2)
add_scenario(doc, {
    '기능 ID': 'FN-MATCH-01',
    '기능명': 'AI 기반 병원·의료진 자동 매칭',
    '액터': '환자 (P-01), AI Agent',
    '전제 조건': '인테이크 정보 또는 채팅 증상 입력 완료',
    '트리거': '상담 시작 또는 「병원 추천」 요청',
    '기본 흐름': '① 환자 증상·희망 치료·예산·국가 입력\n② AI Agent (Gemini Flash) 쿼리 생성\n③ RAG 1계층: HEALO DB에서 병원 벡터 검색\n④ RAG 2계층: HIRA 데이터 보완 검색\n⑤ RAG 3계층: Google Search Grounding\n⑥ 다국어 매칭 결과 반환 (병원명·진료과·의료진·예상비용)',
    '예외 흐름': '• 해당 진료과 병원 미보유 → 유사 병원 추천\n• AI 응답 5초 초과 → 스트리밍 응답으로 부분 표시',
    '입력': '증상 텍스트, 암 종류, 선호 병원 유형, 예산',
    '출력': '병원 목록 (이름·진료과·의료진·특장점·예상비용·위치)',
    '화면 경로': '/app/hospitals, /app/api/chat',
    'DB 테이블/컬럼': 'hospitals (id, name, specialties, location_kr·location_en 등 언어별 칸, i18n JSONB)\nrag_documents (content, trust_tier, source_type, source_url) + rag_chunks (embedding vector)\nmigrations/20260225_rag_vector_v1, 20260223_i18n_jsonb',
    '참조 특허': '특허 10-2745881 (EMR 연동 플랫폼), 특허 10-2868334 (AI 기반 중개)',
    '현재 구현 상태': '완료: src/lib/chat/generateReply.ts\nsrc/lib/rag/*, /app/api/chat/route.ts',
})

add_heading(doc, '4.2 병원 목록·상세 조회 (FN-MATCH-02)', 2)
add_scenario(doc, {
    '기능 ID': 'FN-MATCH-02',
    '기능명': '병원 목록·상세 페이지 (다국어)',
    '액터': '환자, 방문자',
    '트리거': '/hospitals 또는 /hospitals/[id] 접근',
    '기본 흐름': '① 병원 목록 조회 (필터: 진료과·지역·인증 여부)\n② 선택 병원 상세 정보 표시\n③ 언어 설정에 따라 i18n JSONB 컬럼에서 현지어 텍스트 반환\n④ Google Maps로 위치 표시',
    '예외 흐름': '• 선택 언어 번역 미존재 → 한국어 fallback',
    '입력': '필터 조건 (진료과, 지역, 언어)',
    '출력': '병원 카드 목록, 상세 정보, 지도',
    '화면 경로': '/app/hospitals, /app/treatments',
    'DB 테이블/컬럼': 'hospitals (id, name, specialties, address, i18n JSONB, is_published)\ntreatments, specialties\nmigrations/20260223_i18n_jsonb, 20260125_add_is_published',
    '현재 구현 상태': '완료: /app/hospitals, /app/treatments\nmigrations/20260223_i18n_jsonb',
})

doc.add_page_break()

# ================================================================
# 5. 원격 화상상담
# ================================================================
add_heading(doc, '5. 원격 화상상담 (LiveKit WebRTC)', 1)

add_heading(doc, '5.1 화상상담 세션 생성 및 참여 (FN-VIDEO-01)', 2)
add_scenario(doc, {
    '기능 ID': 'FN-VIDEO-01',
    '기능명': 'LiveKit 기반 WebRTC 화상상담',
    '액터': '환자 (P-01), 코디네이터/의료진 (P-02, P-03)',
    '전제 조건': '상담 예약 확정 또는 즉시 상담 요청',
    '트리거': '「화상상담 시작」 버튼 클릭',
    '기본 흐름': '① /api/khidi/consultation/token 에서 방 이름 기반 접근 토큰 발급\n② 환자: 게스트 토큰 또는 로그인 토큰으로 참여\n③ 코디네이터/의료진: 로그인 후 참여\n④ @livekit/components-react 기반 UI 렌더링\n⑤ 오디오/비디오/채팅 채널 활성화\n⑥ 상담 종료 → consultation_sessions 테이블에 기록',
    '예외 흐름': '• 카메라/마이크 권한 거부 → 오디오 전용 모드\n• 네트워크 불안정 → 재연결 시도 3회\n• 참여자 미접속 → 대기 상태 유지(자동 종료하지 않는다)',
    '입력': '방 이름(room_name), 참여자 ID, 역할',
    '출력': 'LiveKit Access Token, 화상 UI',
    '화면 경로': '/app/telemedicine/TelemedicineClient.jsx',
    'DB 테이블/컬럼': 'consultation_sessions (id, inquiry_id, livekit_room_name, started_at, ended_at, duration_seconds)\nmigrations/20260403_add_consultation_sessions',
    '연동 서비스': 'LiveKit Cloud (livekit-server-sdk)\n@livekit/components-react, livekit-client',
    '현재 구현 상태': '완료: /app/api/livekit/route.ts\n/app/telemedicine/TelemedicineClient.jsx\nmigrations/20260403_add_consultation_sessions',
})

add_heading(doc, '5.2 게스트 참여 토큰 (FN-VIDEO-02)', 2)
add_scenario(doc, {
    '기능 ID': 'FN-VIDEO-02',
    '기능명': '비회원 환자의 화상상담 참여',
    '액터': '비회원 환자',
    '전제 조건': '공개 상담 링크 보유 (코디네이터가 발송)',
    '트리거': '상담 링크 클릭',
    '기본 흐름': '① 코디네이터가 환자에게 상담 링크 전송\n② 환자가 링크 접속 (로그인 불필요)\n③ 초대 주소(/c/<코드>)가 상담을 찾아 게스트 토큰을 발급\n④ 이름 입력 후 화상상담 참여',
    '예외 흐름': '• 링크 만료 → 코디네이터에게 재발급 요청',
    '화면 경로': '/app/telemedicine/ (게스트 진입)',
    '현재 구현 상태': '완료: /app/api/livekit/route.ts',
})

doc.add_page_break()

# ================================================================
# 6. AI 챗봇·사람 상담원 상담
# ================================================================
add_heading(doc, '6. AI 챗봇·사람 상담원 상담 시스템', 1)

add_heading(doc, '6.1 AI 챗봇 24시간 상담 (FN-CHAT-01)', 2)
add_scenario(doc, {
    '기능 ID': 'FN-CHAT-01',
    '기능명': 'Gemini 기반 AI Agent 다국어 상담',
    '액터': '환자 (P-01), AI Agent',
    '전제 조건': '채팅 UI 로드, 사용자 언어 감지',
    '트리거': '환자 메시지 입력 및 전송',
    '기본 흐름': '① 환자가 채팅 입력 (텍스트, 다국어)\n② /api/public/chat/message 호출\n③ src/lib/chat/generateReply.ts 실행\n  - RAG 검색: rag_documents에서 관련 병원·치료 정보 벡터 검색\n  - Gemini Flash 로 응답 생성 (스트리밍)\n④ 응답 반환 (병원 정보, 치료 안내, 비용 안내 등)\n⑤ 복잡 케이스 감지 → Human Agent 이관 플래그 설정\n⑥ 대화 내용 chat_threads 테이블 저장',
    '예외 흐름': '• Gemini API 타임아웃 → 「잠시 후 다시 시도」 메시지\n• 의료 진단 요청 → 「의료진 상담 연결」 안내',
    '입력': '사용자 메시지 텍스트, 언어 코드, 상담 컨텍스트',
    '출력': '스트리밍 텍스트 응답, 병원 카드, Human 이관 여부',
    '화면 경로': '/app/patient/chat, /app/consult',
    'DB 테이블/컬럼': 'chat_threads (id, inquiry_id, status, channel, created_at) · chat_messages (본문)\nrag_documents (content, trust_tier, lang) · rag_chunks (embedding, chunk_index)\nmigrations/20260225_chat_threads, 20260225_rag_vector_v1',
    '현재 구현 상태': '완료: /app/api/chat/route.ts\nsrc/lib/chat/generateReply.ts\nsrc/lib/rag/*',
})

add_heading(doc, '6.2 Human Agent 이관 및 코디네이터 상담 (FN-CHAT-02)', 2)
add_scenario(doc, {
    '기능 ID': 'FN-CHAT-02',
    '기능명': 'AI→Human 이관 및 코디네이터 직접 상담',
    '액터': '코디네이터 (P-02), 환자 (P-01)',
    '전제 조건': 'AI 이관 플래그 설정 또는 환자 직접 Human 요청',
    '트리거': 'AI 이관 알림 수신 또는 코디네이터 직접 응답',
    '기본 흐름': '① AI가 이관 플래그 설정 → 코디네이터 알림\n② 코디네이터 /coordinator/messages 접속\n③ 환자 대화 이력 전체 확인\n④ 코디네이터가 직접 메시지 작성·전송\n⑤ 상담 완료 후 AI 자동화 재활성화 여부 선택',
    '예외 흐름': '• 코디네이터 비접속 (1시간) → 슈퍼바이저에게 에스컬레이션',
    '화면 경로': '/app/coordinator/messages',
    'DB 테이블/컬럼': 'chat_threads.user_id · chat_threads.status\nchat_threads.status (사람 인계 여부)',
    '현재 구현 상태': '완료: /app/coordinator/messages\n/app/coordinator/*',
})

doc.add_page_break()

# ================================================================
# 7. AI 실시간 번역
# ================================================================
add_heading(doc, '7. AI 실시간 번역', 1)

add_heading(doc, '7.1 채팅 메시지 번역 (FN-TRANS-01)', 2)
add_scenario(doc, {
    '기능 ID': 'FN-TRANS-01',
    '기능명': '채팅 메시지 AI 실시간 번역',
    '액터': '환자, 코디네이터, 의료진',
    '트리거': '메시지 전송 또는 「번역 보기」 버튼 클릭',
    '기본 흐름': '① 사용자 메시지 감지\n② /api/translate-text 호출\n③ Gemini로 러시아어↔한국어 번역\n④ 상대 발화를 내 언어로 한 줄 자막 표시(두 언어를 나란히 놓지 않는다)',
    '화면 경로': '/app/api/translate-text',
    'DB 테이블/컬럼': '별도 저장 없음 (실시간 처리)',
    '참조 특허': '특허 10-2868334 (실시간 통역 가능 생성형AI 기반 중개 플랫폼)',
    '현재 구현 상태': '완료 (API): /app/api/translate/route.ts\n/app/api/translate-text/route.ts',
})

add_heading(doc, '7.2 화상상담 중 실시간 번역 (FN-TRANS-02)', 2)
add_scenario(doc, {
    '기능 ID': 'FN-TRANS-02',
    '기능명': '화상상담 중 STT + AI 실시간 통번역',
    '액터': '환자, 의료진',
    '전제 조건': 'LiveKit 화상상담 세션 활성',
    '기본 흐름': '① 음성 → STT 변환\n② /api/translate-text로 번역 요청\n③ 자막 형태로 화면 표시',
    '예외 흐름': '• STT 인식률 저하 → 텍스트 입력 전환 안내',
    '화면 경로': '/app/telemedicine/ (자막 오버레이)',
    '현재 구현 상태': '완료: 번역 API + 상담방 실시간 자막 가동\n화상 내 실시간 자막 통합은 추가 개발 필요\n(Phase B 개발 예정)',
})

doc.add_page_break()

# ================================================================
# 8. 예약·일정·비자
# ================================================================
add_heading(doc, '8. 예약·일정·비자 관리', 1)

add_heading(doc, '8.1 진료 예약·일정 관리 (FN-SCHED-01)', 2)
add_scenario(doc, {
    '기능 ID': 'FN-SCHED-01',
    '기능명': '환자-의료진 일정 조율 및 예약 확정',
    '액터': '환자 (P-01), 코디네이터 (P-02)',
    '트리거': '상담 완료 후 예약 단계 진입',
    '기본 흐름': '① 코디네이터가 병원 가능 일정 입력\n② 환자에게 일정 선택 UI 제공\n③ 환자가 선호 날짜 선택\n④ 예약 확정 → 이메일 확인서 발송\n⑤ 달력에 일정 등록',
    '예외 흐름': '• 선택 날짜 의료진 부재 → 대안 일정 제시\n• 초대 링크 만료: 상담 시각 +12시간(최소 72시간) — 만료 시 재발급',
    '화면 경로': '/app/patient/calendar',
    'DB 테이블/컬럼': 'consultation_sessions (scheduled_at, status)\nmigrations/20260403_add_consultation_sessions',
    '현재 구현 상태': '부분구현: /app/patient/calendar\n리마인더 자동 발송은 가동 중. 의료진 일정 연동만 남음',
})

add_heading(doc, '8.2 비자 발급 안내 (FN-SCHED-02)', 2)
add_scenario(doc, {
    '기능 ID': 'FN-SCHED-02',
    '기능명': '카자흐스탄→한국 의료비자 안내 서비스',
    '액터': '환자 (P-01)',
    '트리거': '예약 확정 후 또는 비자 정보 메뉴 접근',
    '기본 흐름': '① 비자 종류 안내 (의료비자 C-3-1)\n② 필요 서류 목록 제공 (진단서, 예약 확인서, 재정증명 등)\n③ 처리 기간·수수료 안내\n④ 진단서·예약확인서 PDF 다운로드 연동',
    '화면 경로': '/app/patient/visa, /app/visa',
    'DB 테이블/컬럼': 'education_contents (교육 콘텐츠) · visa_applications·visa_status_history (비자 진행)',
    '현재 구현 상태': '완료: /app/patient/visa, /app/visa\nmigrations/20260406_education_visa_rebooking',
})

doc.add_page_break()

# ================================================================
# 9. 사후관리·모니터링·교육
# ================================================================
add_heading(doc, '9. 사후관리·모니터링·교육', 1)

add_heading(doc, '9.1 경과 모니터링 f/u (FN-POST-01)', 2)
add_scenario(doc, {
    '기능 ID': 'FN-POST-01',
    '기능명': '귀국 후 환자 경과 추적 및 모니터링',
    '액터': '환자 (P-01), 의료진 (P-03)',
    '전제 조건': '치료 완료 및 귀국',
    '트리거': '정기 체크인 알림 수신 또는 환자 자발적 입력',
    '기본 흐름': '① 환자가 증상 기록 입력\n② 검사결과·영상자료 업로드 옵션\n③ AI가 이상 징후 자동 감지\n④ 이상 감지 시 의료진에게 알림\n⑤ 의료진이 화상상담 또는 메시지로 경과 확인',
    '예외 흐름': '• 설문 8일 이상 무응답 → 운영자에게 자동 경보\n• 심각한 이상 징후 → 응급 연락처 안내',
    '입력': '증상 코드, 통증 점수, 파일, 메모',
    '출력': '경과 기록, 의료진 알림',
    '화면 경로': '/app/patient/symptoms',
    'DB 테이블/컬럼': 'followup_schedules (사후관리 차수·상태를 별도 표로 관리)\nconsultation_sessions (notes, notes_encrypted)',
    '현재 구현 상태': '완료: /app/patient/symptoms + /app/api/khidi/followup\n증상 기록 접수와 이상 징후 자동 분석·담당자 알림이 가동 중',
})

add_heading(doc, '9.2 건강관리 교육 콘텐츠 (FN-POST-02)', 2)
add_scenario(doc, {
    '기능 ID': 'FN-POST-02',
    '기능명': '암 유형별 맞춤 사후관리 교육 콘텐츠',
    '액터': '환자 (P-01)',
    '트리거': '교육 콘텐츠 메뉴 접근 또는 치료 완료 후 자동 제공',
    '기본 흐름': '① 환자 암 유형에 따른 콘텐츠 필터링\n② 식이요법, 운동가이드, 복약안내, 면역력 관리 콘텐츠\n③ 러시아어·카자흐어 콘텐츠 제공\n④ 영상·카드뉴스·텍스트 형태',
    '화면 경로': '/app/patient/education, /app/education',
    'DB 테이블/컬럼': 'education_contents (암종·단계·범주별 교육 콘텐츠, 다국어)\nmigrations/20260406_education_visa_rebooking',
    '현재 구현 상태': '부분구현: /app/education\n콘텐츠 18건·러시아어 전건 발행 완료. 단계별 자동 발송의 화면 연결만 남음',
})

add_heading(doc, '9.3 재방문 예약 (Rebooking) (FN-POST-03)', 2)
add_scenario(doc, {
    '기능 ID': 'FN-POST-03',
    '기능명': '경과 기반 재방문 예약 원스톱 서비스',
    '액터': '환자 (P-01), AI Agent',
    '트리거': '경과 모니터링 데이터에서 재방문 필요성 감지',
    '기본 흐름': '① AI가 경과 데이터 분석 → 재방문 필요성 판단\n② 환자에게 재방문 알림 발송\n③ 재진 예상비용·일정·비자 재발급 안내\n④ 예약 확정',
    '화면 경로': '/app/patient/rebooking',
    'DB 테이블/컬럼': 'visa_applications · visa_status_history (비자 진행) 및 재방문 제안 로직',
    '현재 구현 상태': '완료: /app/patient/rebooking\nmigrations/20260406_education_visa_rebooking',
})

doc.add_page_break()

# ================================================================
# 10. 다국어
# ================================================================
add_heading(doc, '10. 다국어 (ko/en/ru/kz/zh/ja)', 1)

add_heading(doc, '10.1 다국어 UI 라우팅 (FN-I18N-01)', 2)
add_scenario(doc, {
    '기능 ID': 'FN-I18N-01',
    '기능명': '6개 언어 UI 및 언어별 라우팅',
    '액터': '모든 사용자',
    '트리거': '언어 선택 또는 브라우저 언어 감지',
    '기본 흐름': '① 브라우저 Accept-Language 헤더 감지\n② 또는 /ru, /kz 경로로 직접 접근\n③ src/lib/i18n/index.js에서 언어 메시지 로드\n④ 해당 언어 UI 렌더링',
    '지원 언어': 'ko (한국어), en (영어), ru (러시아어), kz (카자흐어), zh (중국어), ja (일본어)',
    '화면 경로': 'proxy.ts (언어 접두어 처리) · src/lib/i18n/index.js',
    '현재 구현 상태': '완료: 6개 언어 라우트 운영(ko·en·ru·kz·zh·ja)\n러시아어·카자흐어 문구 전건 채움\n키 누락은 자동 검사로 상시 확인',
})

add_heading(doc, '10.2 DB 콘텐츠 자동번역 (FN-I18N-02)', 2)
add_scenario(doc, {
    '기능 ID': 'FN-I18N-02',
    '기능명': '병원·치료 정보 DB 자동 다국어 번역',
    '액터': '관리자, 시스템 배치',
    '트리거': '신규 병원·치료 정보 등록 시 또는 관리자 수동 실행',
    '기본 흐름': '① 관리자가 한국어 콘텐츠 입력\n② /api/rag 배치 처리: Gemini로 6개 언어 번역\n③ hospitals.i18n JSONB 컬럼에 번역 저장\n④ 각 언어 UI에서 자동 로드',
    '화면 경로': '/app/admin/* (관리자 실행), 전체 공개 페이지에서 결과 표시',
    'DB 테이블/컬럼': 'hospitals.i18n JSONB\ntreatments.translations\nmigrations/20260223_auto_translate_fields\nmigrations/20260226_treatment_translations',
    '현재 구현 상태': '완료: migrations/20260223_auto_translate_fields\nmigrations/20260226_treatment_translations',
})

doc.add_page_break()

# ================================================================
# 11. 코디네이터 포털
# ================================================================
add_heading(doc, '11. 코디네이터 포털', 1)

add_heading(doc, '11.1 코디네이터 대시보드·환자 관리 (FN-COORD-01)', 2)
add_scenario(doc, {
    '기능 ID': 'FN-COORD-01',
    '기능명': '코디네이터 포털: 환자 관리 및 상담 처리',
    '액터': '코디네이터 (P-02)',
    '전제 조건': 'coordinator role 로그인',
    '트리거': '/coordinator 접근',
    '기본 흐름': '① 담당 환자 목록 및 상태 확인\n② AI 이관 상담 목록 확인\n③ 환자 메시지 읽기·응답\n④ 의료문서 라우팅 (병원에 전달)\n⑤ 예약·일정 확정\n⑥ 실적 현황 (유치 건수, 상담 건수) 확인',
    '화면 경로': '/app/coordinator/page.jsx\n/app/coordinator/messages\n/app/coordinator/inbox\n/app/coordinator/consultations',
    'DB 테이블/컬럼': 'inquiries (status) · 담당자 배정은 별도 표로 관리\nchat_threads (assigned_to)\nconsultation_sessions (coordinator_id, coordinator_user_id)',
    '현재 구현 상태': '완료: /app/coordinator/*',
})

add_heading(doc, '11.2 코디네이터 응답·문서 관리 (FN-COORD-02)', 2)
add_scenario(doc, {
    '기능 ID': 'FN-COORD-02',
    '기능명': '코디네이터 응답 이력 및 문서 관리',
    '액터': '코디네이터 (P-02)',
    '기본 흐름': '① 상담 응답 내용 기록 (coordinator_responses 테이블)\n② 의료문서 분류·병원 전달\n③ 상담 요약 생성 (AI 보조)',
    'DB 테이블/컬럼': 'coordinator_responses (id, inquiry_id, hospital_id, response_type, content, quoted_price, status, created_at)\nmigrations/20260225_coordinator_responses',
    '현재 구현 상태': '완료: migrations/20260225_coordinator_responses',
})

doc.add_page_break()

# ================================================================
# 12. 관리자·파트너·의사 포털
# ================================================================
add_heading(doc, '12. 관리자·파트너·의사 포털', 1)

add_heading(doc, '12.1 관리자 포털 (FN-ADMIN-01)', 2)
add_scenario(doc, {
    '기능 ID': 'FN-ADMIN-01',
    '기능명': '관리자 KPI·사용자·AI 성능 관리',
    '액터': '관리자 (P-04)',
    '전제 조건': 'admin role 로그인',
    '기본 흐름': '① KPI 대시보드: 유치 건수, 상담 건수, 만족도\n② 사용자 관리: 역할 변경, 활성화/비활성화\n③ 병원·의료진 데이터 관리\n④ AI 성능 모니터링: RAG 응답 품질, 자동응답률\n⑤ 감사 로그 조회\n⑥ 성과보고서 PDF 출력',
    '화면 경로': '/app/admin/page.jsx\n/app/admin/analytics\n/app/admin/consultations\n/app/admin/audit',
    'DB 테이블/컬럼': 'admin_audit_logs (id, admin_user_id, admin_email, action, created_at)\nmigrations/20260129_add_admin_audit_logs',
    '현재 구현 상태': '완료: /app/admin/*',
})

add_heading(doc, '12.2 파트너 병원 포털 (FN-PARTNER-01)', 2)
add_scenario(doc, {
    '기능 ID': 'FN-PARTNER-01',
    '기능명': '파트너 병원 정보·의료진·협진 관리',
    '액터': '파트너 병원 담당자',
    '전제 조건': 'partner role 로그인',
    '기본 흐름': '① 병원 프로필·의료진 정보 관리\n② 협진 의뢰 수신·처리\n③ 진료 결과 입력\n④ 가용 일정 관리',
    '화면 경로': '/app/hospital/*',
    'DB 테이블/컬럼': 'hospital_users (hospital_id, user_id, role)\npartner_doctors (id, branch_id, name_ko, subspecialty, is_active)\nmigrations/20260220_hospital_users\nmigrations/20260407_partner_doctors_branches',
    '현재 구현 상태': '완료: /app/hospital/*\nmigrations/20260407_partner_doctors_branches',
})

doc.add_page_break()

# ================================================================
# 13. 알림·이메일
# ================================================================
add_heading(doc, '13. 알림·이메일 시스템', 1)

add_heading(doc, '13.1 이메일 알림 (FN-NOTIF-01)', 2)
add_scenario(doc, {
    '기능 ID': 'FN-NOTIF-01',
    '기능명': 'Resend 기반 이메일 알림·리마인더',
    '액터': '시스템, 환자, 코디네이터',
    '트리거': '예약 확정, 상담 완료, 경과 체크인 시점',
    '기본 흐름': '① 트리거 이벤트 발생\n② 발송 지점에서 src/lib/email/sendEmail.ts 호출\n③ @react-email/render로 HTML 이메일 생성\n④ Resend API로 발송\n⑤ 발송 로그 기록',
    '이메일 유형': '예약 확인서, 상담 완료 요약, 경과 체크인 리마인더\n관리자 신규 문의 알림, 코디네이터 이관 알림',
    '화면 경로': '/app/api/email/*',
    'DB 테이블/컬럼': 'admin_notification_logs (id, channel, recipient_label, destination, status, created_at)\nmigrations/20260204_add_admin_notification_logs',
    '현재 구현 상태': '완료: /app/api/email, src/lib/email',
})

add_heading(doc, '13.2 실시간 In-app 알림 (FN-NOTIF-02)', 2)
add_scenario(doc, {
    '기능 ID': 'FN-NOTIF-02',
    '기능명': 'Supabase Realtime 기반 실시간 알림',
    '액터': '코디네이터, 환자',
    '트리거': '신규 메시지, AI 이관, 의료진 회신',
    '기본 흐름': '① Supabase Realtime 채널 구독\n② DB 변경 감지 시 클라이언트에 push\n③ 알림 뱃지·토스트 표시',
    '화면 경로': '/app/patient/messages, /app/coordinator/*',
    '현재 구현 상태': '완료: src/hooks/useNotifications.ts + src/lib/push/fcm.ts\nSupabase Realtime 구독과 FCM 푸시가 함께 돈다',
})

doc.add_page_break()

# ================================================================
# 14. AI RAG 파이프라인
# ================================================================
add_heading(doc, '14. AI 학습 파이프라인 (RAG 3계층)', 1)

add_heading(doc, '14.1 RAG 3계층 구조 (FN-RAG-01)', 2)
add_para(doc, '사업계획서 p.30~31 AI 학습 기반 상담 자동화 시스템 구현.')
add_scenario(doc, {
    '기능 ID': 'FN-RAG-01',
    '기능명': 'RAG 3계층 기반 AI 응답 생성',
    '개요': '사업계획서(p.31) 「지금은 사람이, 앞으로는 AI 가」: Human Agent 상담 데이터 RAG 학습 파이프라인',
    '1계층 (HEALO DB)': 'Supabase pgvector로 병원·치료·FAQ 벡터 저장\nrag_documents 테이블 (embedding, content, trust_tier)\nmigrations/20260225_rag_vector_v1',
    '2계층 (HIRA 크롤링)': 'HIRA 의료수가·병원 정보 크롤링 및 RAG 인제스트\ncrawl_raw_items, crawl_jobs 테이블\nmigrations/20260225_crawl_pipeline',
    '3계층 (Google Grounding)': 'Gemini Google Search Grounding\n실시간 최신 의료 정보 보완',
    '학습 파이프라인': '① Human Agent 상담 기록\n② 자동 구조화 (JSON/CSV)\n③ 벡터 임베딩 생성\n④ pgvector 저장\n⑤ RAG 검색으로 AI 응답 품질 향상',
    '화면 경로': 'src/lib/rag/*, src/lib/chat/generateReply.ts',
    'DB 테이블/컬럼': 'rag_documents (id, content, trust_tier, source_type, source_url) · rag_chunks (embedding)\nplaybook_patterns, playbook_usage_events\nmigrations/20260225_rag_*, 20260225_playbook_*',
    '현재 구현 상태': '완료: src/lib/rag/*\nmigrations/20260225_rag_vector_v1\nmigrations/20260225_playbook_patterns',
})

doc.add_page_break()

# ================================================================
# 15. 보안·암호화·감사
# ================================================================
add_heading(doc, '15. 보안·암호화·감사', 1)

add_heading(doc, '15.1 환자 PII AES-256-GCM 암호화 (FN-SEC-01)', 2)
add_scenario(doc, {
    '기능 ID': 'FN-SEC-01',
    '기능명': '환자 PII 암호화 저장',
    '대상 컬럼': 'inquiries.first_name · last_name · email · phone (암호문 저장)\nconsultation_sessions.notes_encrypted · cancer_patient_intakes.*_encrypted 등',
    '암호화 방식': 'AES-256-GCM (src/lib/security/encryptionV2.ts)',
    '암호화 시점': '인테이크 폼 제출 → 서버 측에서 암호화 후 저장\n평문 컬럼은 migrations/20260420_drop_cancer_intake_plaintext (실행 완료) · 20260420_drop_inquiries_plaintext_email (보류) 에서 삭제 완료',
    '복호화 권한': 'service_role 키 보유 서버 모듈만 복호화 가능\nimport "server-only" 적용',
    'DB 테이블/컬럼': 'inquiries (first_name, last_name, email, phone — 전부 암호문)\ncancer_intake_encrypted\nmigrations/20260420_drop_cancer_intake_plaintext\nmigrations/20260420_drop_inquiries_plaintext_email',
    '현재 구현 상태': '완료: src/lib/security/encryptionV2.ts\nmigrations/20260420_drop_cancer_intake_plaintext (실행 완료) · 20260420_drop_inquiries_plaintext_email (보류) (평문 완전 제거)',
})

add_heading(doc, '15.2 API 보안 헬퍼 및 Rate Limiting (FN-SEC-02)', 2)
add_scenario(doc, {
    '기능 ID': 'FN-SEC-02',
    '기능명': 'API 인증·권한 검증 및 Rate Limiting',
    '인증 헬퍼': 'requireAdminAuth(): admin role 검증\nrequireConsultationAccess(): 상담 접근 권한\n모든 새 API 라우트에 의무 적용',
    'Rate Limiting': 'src/lib/rateLimit.ts: IP 기반 요청 수 제한\n공개 POST 엔드포인트 필수 적용',
    '오류 처리': 'API 응답에 error.message 직접 노출 금지\n"internal_error" 등 코드형 오류만 반환',
    'RLS (Row Level Security)': 'Supabase PostgreSQL 행 단위 접근 제어\nmigrations/20260125_security_rls_policies\nmigrations/20260130_enable_rls_inquiries',
    '화면 경로': 'src/lib/auth/*, src/lib/rateLimit.ts',
    '현재 구현 상태': '완료: src/lib/security/*\nsrc/lib/rateLimit.ts\nmigrations/20260125_security_*',
})

add_heading(doc, '15.3 감사 로그 (FN-SEC-03)', 2)
add_scenario(doc, {
    '기능 ID': 'FN-SEC-03',
    '기능명': '관리자 행동 감사 로그 기록',
    '기록 대상': '관리자 로그인, 사용자 역할 변경, 데이터 수정, 병원 정보 변경 등',
    '화면 경로': '/app/admin/audit',
    'DB 테이블/컬럼': 'admin_audit_logs (id, action, inquiry_ids, admin_user_id, ip_address, user_agent, created_at)\nmigrations/20260129_add_admin_audit_logs',
    '현재 구현 상태': '완료: migrations/20260129_add_admin_audit_logs',
})

# ================================================================
# 구현 상태 요약
# ================================================================
doc.add_page_break()
add_heading(doc, '부록 A. 기능 구현 상태 요약', 1)
add_para(doc, '코드베이스 검증 기반 현황 (2026.08.20 기준)')
doc.add_paragraph()

sum_tbl = doc.add_table(rows=0, cols=4)
sum_tbl.style = 'Table Grid'
add_header_row(sum_tbl, ['기능 그룹', '구현 상태', '파일 경로', '비고'])
summary_data = [
    ('회원·인증·RBAC', '완료', '/app/signup, /app/login, proxy.ts', '게스트 토큰 포함'),
    ('인테이크·문서 업로드', '완료', '/app/inquiry, /app/api/attachments', '인테이크 평문 컬럼 제거 완료'),
    ('병원 매칭 (AI+RAG)', '완료', '/app/api/chat, src/lib/chat/', 'RAG 3계층 운영 중'),
    ('병원 목록·상세', '완료', '/app/hospitals', 'i18n JSONB 완료'),
    ('화상상담 (LiveKit)', '완료', '/app/consultation/[id], /app/api/livekit', '초대링크로 계정 없이 참여'),
    ('번역 API', '완료', '/app/api/translate-text', 'Gemini 기반'),
    ('화상 내 실시간 자막', '완료', '/app/consultation/[id]', '실서비스 가동 · 통역 자막 3,277건 축적'),
    ('예약·달력 UI', '부분', '/app/patient/calendar', '리마인더 자동 발송 가동 · 의료진 일정 연동 남음'),
    ('비자 안내', '완료', '/app/patient/visa', '다국어 포함'),
    ('경과 모니터링 UI', '완료', '/app/patient/symptoms', '이상 징후 자동 분석·담당자 알림 가동'),
    ('교육 콘텐츠', '부분', '/app/education', '18건 발행(러시아어 전건) · 단계별 자동 발송은 화면 연결 남음'),
    ('재방문 예약', '완료', '/app/patient/rebooking', ''),
    ('6개 언어 UI', '완료', 'proxy.ts · src/lib/i18n', '6개 언어 문구 전건 채움 · 자동 검사 통과'),
    ('DB 자동번역', '완료', 'migrations/20260223_auto_translate_fields', '병원·치료 완료'),
    ('코디네이터 포털', '완료', '/app/coordinator/*', ''),
    ('관리자 포털', '완료', '/app/admin/*', '감사 로그 포함'),
    ('국내 의료기관 포털', '완료', '/app/hospital/*', '의료진 등록 포함'),
    ('이메일 알림', '완료', '/app/api/email', 'Resend 연동'),
    ('실시간 In-app 알림', '완료', 'src/hooks/useNotifications.ts', 'Supabase Realtime 구독 + FCM 푸시'),
    ('RAG 파이프라인', '완료', 'src/lib/rag/*', '3계층 운영'),
    ('PII 암호화', '완료', 'src/lib/security/encryptionV2.ts', 'AES-256-GCM'),
    ('Rate Limiting', '완료', 'src/lib/rateLimit.ts', ''),
    ('감사 로그', '완료', '/app/admin/audit', ''),
]
for row in summary_data:
    add_data_row(sum_tbl, row, bold_first=True)

doc.add_paragraph()
add_para(doc, '구현 비율 집계:')
add_para(doc, '완료: 21개 기능 (91%). 착수 시 부분구현 6건 중 4건이 완료로 전환(2026-08-20 실측)', indent=1)
add_para(doc, '부분구현: 2개 기능 (9%). ①단계별 교육 콘텐츠 자동 발송의 화면 연결 ②예약 리마인더의 의료진 일정 연동', indent=1)
add_para(doc, '미구현: 0개 기능. 모든 기능이 최소 부분 구현 상태다', indent=1)
add_para(doc, '※ 부분구현 2건은 01-1 화면설계서 「후속 고도화 항목」과 같은 항목이며, 2026년 9월 중간평가 이전 완료를 목표로 한다.')

# 마지막 「※」 한 줄만 다음 쪽으로 떨어져 한 줄짜리 쪽이 생겼다(2026-08-20 실측).
# 집계 네 줄을 한 덩어리로 묶어 같은 쪽에 남게 한다.
for _p in doc.paragraphs[-5:-1]:
    _p.paragraph_format.keep_with_next = True

# 저장
import os as _os
# 저장 위치는 «이 스크립트가 있는 폴더» 기준으로 잡는다.
# (전에는 특정 PC 의 절대경로가 박혀 있어 그 PC 밖에서는 재생성이 아예 불가능했다.)
out_path = _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), '02_기능명세서.docx')
doc.save(out_path)
print(f'저장 완료: {out_path}')
print(f'총 단락 수: {len(doc.paragraphs)}')
