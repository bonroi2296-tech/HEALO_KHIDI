const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
        PageNumber, Header, Footer, PageBreak, LevelFormat } = require('docx');
const fs = require('fs');

const BLUE = "00467F";
const LIGHT_BLUE = "D5E8F0";
const GRAY = "F5F5F5";
const RED = "B71C1C";

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

function h1(text) { return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 120 },
  children: [new TextRun({ text, bold: true, size: 28, color: BLUE, font: "맑은 고딕" })] }); }
function h2(text) { return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 80 },
  children: [new TextRun({ text, bold: true, size: 24, color: "1F4E79", font: "맑은 고딕" })] }); }
function h3(text) { return new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 160, after: 60 },
  children: [new TextRun({ text, bold: true, size: 22, color: "333333", font: "맑은 고딕" })] }); }
function body(text) { return new Paragraph({ spacing: { before: 60, after: 60 },
  children: [new TextRun({ text, size: 20, font: "맑은 고딕" })] }); }
function step(num, text) { return new Paragraph({ numbering: { reference: "steps", level: 0 }, spacing: { before: 40, after: 40 },
  children: [new TextRun({ text, size: 20, font: "맑은 고딕" })] }); }
function note(text, color = "1565C0") { return new Paragraph({ spacing: { before: 60, after: 60 },
  border: { left: { style: BorderStyle.SINGLE, size: 8, color, space: 4 } },
  children: [new TextRun({ text: "  " + text, size: 18, color, font: "맑은 고딕", italics: true })] }); }
function warn(text) { return note(text, "B71C1C"); }
function code(text) { return new Paragraph({ spacing: { before: 60, after: 60 },
  shading: { fill: "1E1E1E", type: ShadingType.CLEAR },
  children: [new TextRun({ text: "  " + text, size: 18, color: "A8FF60", font: "Courier New" })] }); }
function space(n = 1) { return Array.from({ length: n }, () => new Paragraph({ children: [new TextRun("")] })); }
function pageBreak() { return new Paragraph({ children: [new PageBreak()] }); }
function hCell(text, w) { return new TableCell({ borders, width: { size: w, type: WidthType.DXA },
  shading: { fill: BLUE, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
  children: [new Paragraph({ alignment: AlignmentType.CENTER,
    children: [new TextRun({ text, bold: true, size: 18, color: "FFFFFF", font: "맑은 고딕" })] })] }); }
function dCell(text, w, opts = {}) { return new TableCell({ borders, width: { size: w, type: WidthType.DXA },
  shading: { fill: opts.fill || "FFFFFF", type: ShadingType.CLEAR },
  margins: { top: 80, bottom: 80, left: 120, right: 120 },
  children: [new Paragraph({ alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
    children: [new TextRun({ text: String(text), size: 18, font: "맑은 고딕", bold: opts.bold || false })] })] }); }
function bullet(text) { return new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { before: 40, after: 40 },
  children: [new TextRun({ text, size: 20, font: "맑은 고딕" })] }); }
function screen(path) { return new Paragraph({ spacing: { before: 80, after: 80 },
  shading: { fill: "EEEEEE", type: ShadingType.CLEAR },
  children: [new TextRun({ text: `  [화면: ${path}]`, size: 18, color: "555555", font: "맑은 고딕", italics: true })] }); }

const doc = new Document({
  numbering: {
    config: [
      { reference: "steps", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.",
        alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 560, hanging: 320 } } } }] },
      { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•",
        alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 480, hanging: 240 } } } }] },
    ]
  },
  styles: {
    default: { document: { run: { font: "맑은 고딕", size: 20 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "맑은 고딕" }, paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "맑은 고딕" }, paragraph: { spacing: { before: 240, after: 80 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true, font: "맑은 고딕" }, paragraph: { spacing: { before: 160, after: 60 }, outlineLevel: 2 } },
    ]
  },
  sections: [{
    properties: {
      page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1800 } }
    },
    headers: { default: new Header({ children: [new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 1 } },
      children: [new TextRun({ text: "HEALO 플랫폼 | 관리자 매뉴얼 — 기밀", size: 16, color: "666666", font: "맑은 고딕" })]
    })] }) },
    footers: { default: new Footer({ children: [new Paragraph({
      border: { top: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 1 } },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: "본로이 | 내부 기밀  |  ", size: 16, color: "666666", font: "맑은 고딕" }),
        new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "666666", font: "맑은 고딕" }),
        new TextRun({ text: " / ", size: 16, color: "666666", font: "맑은 고딕" }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: "666666", font: "맑은 고딕" }),
      ]
    })] }) },
    children: [
      // ── 표지 ──────────────────────────────────────────────────────────
      ...space(4),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 120 },
        children: [new TextRun({ text: "HEALO 플랫폼 — 운영·보안 가이드", size: 20, color: "666666", font: "맑은 고딕" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 120 },
        children: [new TextRun({ text: "관 리 자 매 뉴 얼", size: 52, bold: true, color: BLUE, font: "맑은 고딕" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 360 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: RED, space: 2 } },
        children: [new TextRun({ text: "기밀 문서 — 관리자·PM 전용", size: 24, color: RED, font: "맑은 고딕", bold: true })] }),
      ...space(2),
      new Table({
        width: { size: 6000, type: WidthType.DXA }, alignment: AlignmentType.CENTER, columnWidths: [2000, 4000],
        rows: [
          new TableRow({ children: [
            new TableCell({ borders: noBorders, width: { size: 2000, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "적 용 버 전", size: 20, bold: true, color: BLUE, font: "맑은 고딕" })] })] }),
            new TableCell({ borders: noBorders, width: { size: 4000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "HEALO v1.0 (2026년 4월 기준)", size: 20, font: "맑은 고딕" })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: noBorders, width: { size: 2000, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "대 상", size: 20, bold: true, color: BLUE, font: "맑은 고딕" })] })] }),
            new TableCell({ borders: noBorders, width: { size: 4000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "본로이 PM, 기술 운영팀", size: 20, font: "맑은 고딕" })] })] }),
          ]}),
        ]
      }),
      ...space(4),
      pageBreak(),

      // ── 1. 어드민 대시보드 ───────────────────────────────────────────
      h1("1. 어드민 대시보드 사용법"),
      h2("1.1 관리자 접속"),
      step(1, "healo.kr/admin 접속 — 관리자 계정으로 로그인 필요 (app_metadata.role = admin)"),
      step(2, "2FA 인증 [추후 적용 예정] 또는 이메일 인증 확인"),
      step(3, "어드민 대시보드 메인으로 이동"),
      screen("/admin 페이지 — 대시보드"),
      warn("관리자 계정 정보는 어떤 경우에도 외부 공유 금지. service_role 키는 코드베이스에 절대 포함하지 않는다."),
      ...space(1),
      h2("1.2 대시보드 주요 지표"),
      new Table({
        width: { size: 8506, type: WidthType.DXA }, columnWidths: [2500, 6006],
        rows: [
          new TableRow({ children: [hCell("지표", 2500), hCell("설명", 6006)] }),
          new TableRow({ children: [dCell("신규 인테이크", 2500), dCell("미처리 인테이크 수신 건수 (오늘/이번 주)", 6006)] }),
          new TableRow({ children: [dCell("활성 세션", 2500), dCell("현재 진행 중인 화상상담 세션 수", 6006)] }),
          new TableRow({ children: [dCell("전체 사용자 수", 2500), dCell("가입 환자·코디네이터·의료진 합계", 6006)] }),
          new TableRow({ children: [dCell("월별 상담 건수", 2500), dCell("KPI K-02 추적용 차트", 6006)] }),
          new TableRow({ children: [dCell("오류 로그", 2500), dCell("최근 24시간 API 오류 건수", 6006)] }),
        ]
      }),
      ...space(1),
      pageBreak(),

      // ── 2. 환자·세션 관리 ───────────────────────────────────────────
      h1("2. 환자·세션 관리"),
      h2("2.1 환자 목록 관리"),
      step(1, "/admin/patients 접속"),
      step(2, "검색 필터: 국가, 암종, 인테이크 상태, 등록일"),
      step(3, "환자 클릭 시 전체 인테이크·상담·문서 이력 확인"),
      step(4, "상태 변경: 신규접수 → 검토중 → 병원배정 → 상담완료 → 입원대기 → 사후관리"),
      screen("/admin/patients 페이지"),
      note("환자 PII 복호화는 권한 있는 관리자만 가능. 화면에는 마스킹 표시."),
      ...space(1),
      h2("2.2 화상세션 관리"),
      step(1, "/admin/sessions 접속"),
      step(2, "진행 중·예정·완료 세션 목록 확인"),
      step(3, "세션 강제 종료: [세션 종료] 버튼 — 이상 징후 또는 연결 문제 발생 시"),
      step(4, "세션 로그 다운로드 (상담 일시·참여자·지속 시간)"),
      screen("/admin/sessions 페이지"),
      warn("화상상담 내용은 녹화·저장하지 않는다. 개인정보 보호 정책 준수."),
      ...space(1),
      h2("2.3 계정 관리"),
      h3("코디네이터 계정 생성"),
      step(1, "/admin/users 접속 후 [새 사용자 추가] 클릭"),
      step(2, "이메일 입력 후 역할 선택: coordinator"),
      step(3, "임시 비밀번호 발급 및 초대 이메일 발송"),
      h3("계정 역할 변경"),
      step(1, "사용자 목록에서 계정 선택 후 [역할 변경]"),
      step(2, "역할: patient / coordinator / admin / partner_hospital"),
      warn("역할 변경은 app_metadata.role 기준으로 처리. user_metadata는 사용하지 않는다."),
      pageBreak(),

      // ── 3. 코디네이터 배정 ──────────────────────────────────────────
      h1("3. 코디네이터 배정"),
      h2("3.1 인테이크 배정 프로세스"),
      body("신규 인테이크 수신 시 코디네이터 배정 흐름:"),
      ...space(1),
      new Table({
        width: { size: 8506, type: WidthType.DXA }, columnWidths: [400, 2500, 5606],
        rows: [
          new TableRow({ children: [hCell("단계", 400), hCell("액션", 2500), hCell("설명", 5606)] }),
          new TableRow({ children: [dCell("1", 400, { fill: GRAY }), dCell("수신 확인", 2500), dCell("/admin 대시보드 신규 인테이크 알림 확인", 5606)] }),
          new TableRow({ children: [dCell("2", 400, { fill: GRAY }), dCell("코디네이터 선택", 2500), dCell("환자 국가·언어 기준 적합 코디네이터 선택 (러시아어 환자 → 러시아어 가능 코디네이터)", 5606)] }),
          new TableRow({ children: [dCell("3", 400, { fill: GRAY }), dCell("배정", 2500), dCell("/admin/intake/[id] 에서 [코디네이터 배정] 클릭 후 담당자 선택", 5606)] }),
          new TableRow({ children: [dCell("4", 400, { fill: GRAY }), dCell("알림", 2500), dCell("코디네이터에게 배정 알림 이메일 자동 발송", 5606)] }),
          new TableRow({ children: [dCell("5", 400, { fill: GRAY }), dCell("환자 연락", 2500), dCell("코디네이터가 24시간 내 환자 최초 연락 (WhatsApp/이메일)", 5606)] }),
        ]
      }),
      ...space(1),
      h2("3.2 부하 분산 원칙"),
      bullet("코디네이터 1인 최대 동시 담당 건수: 15건 권장"),
      bullet("언어 매칭 우선: 환자 사용 언어와 코디네이터 구사 언어 일치"),
      bullet("암종별 전문성 고려: 동일 코디네이터에게 반복 배정 시 전문성 축적"),
      pageBreak(),

      // ── 4. 통계·리포트 ──────────────────────────────────────────────
      h1("4. 통계 및 리포트"),
      h2("4.1 KPI 추적 대시보드"),
      step(1, "/admin/statistics 접속"),
      step(2, "기간 선택 후 KPI 현황 확인"),
      screen("/admin/statistics 페이지"),
      ...space(1),
      new Table({
        width: { size: 8506, type: WidthType.DXA }, columnWidths: [2500, 6006],
        rows: [
          new TableRow({ children: [hCell("지표명", 2500), hCell("집계 방법", 6006)] }),
          new TableRow({ children: [dCell("환자 유치 건수", 2500), dCell("status = '입원대기' 이상으로 변경된 환자 건수", 6006)] }),
          new TableRow({ children: [dCell("원격 상담 건수", 2500), dCell("consultation_sessions 테이블 completed 건수", 6006)] }),
          new TableRow({ children: [dCell("국가별 분포", 2500), dCell("inquiries.country 기준 집계", 6006)] }),
          new TableRow({ children: [dCell("암종별 분포", 2500), dCell("inquiries.cancer_type 기준 집계", 6006)] }),
          new TableRow({ children: [dCell("평균 응답 시간", 2500), dCell("인테이크 제출 → 코디네이터 첫 연락 시간 (목표: 24시간 이내)", 6006)] }),
        ]
      }),
      ...space(1),
      h2("4.2 KHIDI 보고용 리포트 생성"),
      step(1, "/admin/reports 접속"),
      step(2, "보고 기간 선택 (월별 / 분기별)"),
      step(3, "[리포트 다운로드] 클릭 — CSV 또는 PDF 형식"),
      step(4, "다운로드한 데이터로 04_중간보고서 및 05_최종보고서 실적 수치 갱신"),
      note("KHIDI 제출용 KPI 수치는 반드시 이 리포트 데이터를 기준으로 한다."),
      pageBreak(),

      // ── 5. 시스템 모니터링 ──────────────────────────────────────────
      h1("5. 시스템 모니터링"),
      h2("5.1 Vercel 모니터링"),
      step(1, "Vercel 대시보드(vercel.com) 접속 → 프로젝트 healo-khidi"),
      step(2, "Deployments 탭: 최신 배포 상태 확인 (Ready / Error / Building)"),
      step(3, "Functions 탭: Serverless API 실행 시간 및 오류 확인"),
      step(4, "Analytics 탭: 방문자 수, 페이지별 응답 시간(Core Web Vitals) 확인"),
      note("Vercel 배포 트리거: main 브랜치 push 시 자동. 수동 재배포: [Redeploy] 버튼."),
      ...space(1),
      h2("5.2 Supabase 모니터링"),
      step(1, "Supabase 대시보드(supabase.com) → 프로젝트 hvwwlkawaxabhtumjhrg"),
      step(2, "Database 탭: 연결 수, 쿼리 슬로우 로그 확인"),
      step(3, "Logs 탭: API/Auth/Storage 오류 로그 실시간 조회"),
      step(4, "Usage 탭: 월별 DB 용량·API 호출 수 확인"),
      warn("Supabase 무료 플랜 한도 초과 시 서비스 중단 위험. 월 1회 Usage 점검 필수."),
      ...space(1),
      h2("5.3 오류 대응 절차"),
      new Table({
        width: { size: 8506, type: WidthType.DXA }, columnWidths: [1500, 3000, 4006],
        rows: [
          new TableRow({ children: [hCell("오류 유형", 1500), hCell("확인 방법", 3000), hCell("대응", 4006)] }),
          new TableRow({ children: [dCell("배포 실패", 1500, { fill: "FFEBEE" }), dCell("Vercel Deployments 탭 오류", 3000), dCell("빌드 로그 확인 → vercel.json 검증 → npx next build --webpack 로컬 재현", 4006)] }),
          new TableRow({ children: [dCell("API 500 오류", 1500, { fill: "FFEBEE" }), dCell("Vercel Functions 로그", 3000), dCell("Supabase 연결 확인 → 환경변수(SUPABASE_URL, ANON_KEY) 점검", 4006)] }),
          new TableRow({ children: [dCell("DB 연결 오류", 1500, { fill: "FFEBEE" }), dCell("Supabase Database 탭", 3000), dCell("연결 수 한도 확인 → pgbouncer 풀링 점검 → Supabase 재시작", 4006)] }),
          new TableRow({ children: [dCell("LiveKit 오류", 1500, { fill: "FFF9C4" }), dCell("LiveKit Cloud 대시보드", 3000), dCell("방 이름·토큰 유효성 확인 → LIVEKIT_API_KEY 환경변수 점검", 4006)] }),
          new TableRow({ children: [dCell("AI 응답 없음", 1500, { fill: "FFF9C4" }), dCell("Vercel Functions 로그", 3000), dCell("GOOGLE_GENERATIVE_AI_API_KEY 유효성 확인 → Gemini API 상태 페이지 확인", 4006)] }),
        ]
      }),
      pageBreak(),

      // ── 6. 백업·복구 ─────────────────────────────────────────────────
      h1("6. 백업 및 복구"),
      h2("6.1 자동 백업 체계"),
      new Table({
        width: { size: 8506, type: WidthType.DXA }, columnWidths: [2000, 2000, 4506],
        rows: [
          new TableRow({ children: [hCell("백업 대상", 2000), hCell("주기", 2000), hCell("방법", 4506)] }),
          new TableRow({ children: [dCell("Supabase DB", 2000), dCell("매일 1회", 2000, { center: true }), dCell("Supabase Pro 플랜 자동 백업 (7일 보관) — 대시보드 Backups 탭에서 확인", 4506)] }),
          new TableRow({ children: [dCell("코드베이스", 2000), dCell("매 push 시", 2000, { center: true }), dCell("GitHub main 브랜치 + GitLab 자동 미러 (ops/gitlab-mirror 워크플로우)", 4506)] }),
          new TableRow({ children: [dCell("Supabase Storage", 2000), dCell("수동", 2000, { center: true }), dCell("월 1회 rclone 또는 supabase storage download 명령으로 로컬 백업 권장", 4506)] }),
          new TableRow({ children: [dCell("환경변수", 2000), dCell("변경 시", 2000, { center: true }), dCell("Vercel 환경변수 → 로컬 암호화 파일로 백업 (1Password 또는 암호화 .env.vault)", 4506)] }),
        ]
      }),
      ...space(1),
      h2("6.2 DB 복구 절차"),
      h3("Supabase 포인트인타임 복구"),
      step(1, "Supabase 대시보드 → Settings → Database → Backups"),
      step(2, "복구할 시점 선택 후 [Restore to this point] 클릭"),
      step(3, "복구 완료 후 Vercel 재배포 실행 (환경변수 재확인)"),
      warn("복구 실행 시 해당 시점 이후 모든 데이터 소실. 반드시 사전에 최신 백업 다운로드 후 진행."),
      ...space(1),
      h2("6.3 긴급 롤백 절차"),
      h3("코드 롤백"),
      code("git revert HEAD"),
      code("git push origin main"),
      body("또는 Vercel Deployments 탭에서 이전 배포 버전 [Promote to Production] 클릭"),
      pageBreak(),

      // ── 7. 보안 사고 대응 ───────────────────────────────────────────
      h1("7. 보안 사고 대응"),
      h2("7.1 보안 사고 유형별 대응"),
      warn("보안 사고 발생 시 즉시 PM에게 보고. Critical 사고는 24시간 내 KHIDI 보고 의무."),
      ...space(1),
      new Table({
        width: { size: 8506, type: WidthType.DXA }, columnWidths: [400, 2200, 1500, 4406],
        rows: [
          new TableRow({ children: [hCell("등급", 400), hCell("사고 유형", 2200), hCell("초기 조치", 1500), hCell("상세 대응 절차", 4406)] }),
          new TableRow({ children: [dCell("Critical", 400, { fill: "FFEBEE" }), dCell("환자 PII 대량 유출 의심", 2200), dCell("즉시 서비스 중단", 1500, { fill: "FFEBEE" }), dCell("1. Vercel 배포 일시 중단(Pause) 2. Supabase RLS 정책 강화 재적용 3. 접근 로그 전수 분석 4. 영향 환자 개별 통지 5. PM → KHIDI 보고", 4406)] }),
          new TableRow({ children: [dCell("High", 400, { fill: "FFF3E0" }), dCell("관리자 계정 무단 접근", 2200), dCell("비밀번호 즉시 변경", 1500, { fill: "FFF3E0" }), dCell("1. 해당 계정 즉시 비활성화 2. Supabase Auth 로그 분석 3. 접속 IP 확인·차단 4. 전체 관리자 계정 비밀번호 리셋", 4406)] }),
          new TableRow({ children: [dCell("High", 400, { fill: "FFF3E0" }), dCell("API 키 노출 (GitHub 등)", 2200), dCell("즉시 키 재발급", 1500, { fill: "FFF3E0" }), dCell("1. Supabase/Vercel에서 노출된 키 즉시 무효화 2. 새 키 발급·환경변수 갱신 3. git history에서 키 제거(BFG Repo Cleaner) 4. GitHub secret scanning 알림 확인", 4406)] }),
          new TableRow({ children: [dCell("Medium", 400, { fill: "FFF9C4" }), dCell("비정상 트래픽 (DDoS 의심)", 2200), dCell("Rate Limit 강화", 1500, { fill: "FFF9C4" }), dCell("1. Vercel 방화벽 규칙 추가 2. src/lib/rateLimit.ts 임계값 조정 3. 의심 IP 차단 4. 정상화 후 원인 분석", 4406)] }),
        ]
      }),
      ...space(1),
      h2("7.2 보안 정기 점검 체크리스트"),
      body("분기별 1회 실시 (SECURITY_CHECKLIST.md 기준):"),
      bullet("Supabase RLS 정책 전체 검토 — 신규 테이블 정책 누락 여부"),
      bullet("API 엔드포인트 인증 헬퍼 적용 여부 확인 (requireAdminAuth 등)"),
      bullet("환경변수 노출 점검 — .env.local gitignore 확인"),
      bullet("의존성 보안 취약점 점검: npm audit"),
      bullet("Supabase Auth 로그 이상 접속 IP 확인"),
      bullet("AES-256-GCM 암호화 키 로테이션 검토 (연 1회)"),
      bullet("API 응답에 error.message 직접 노출 여부 코드 검토"),
      ...space(1),
      h2("7.3 보안 원칙 요약"),
      new Table({
        width: { size: 8506, type: WidthType.DXA }, columnWidths: [3000, 5506],
        rows: [
          new TableRow({ children: [hCell("원칙", 3000), hCell("구현 방법", 5506)] }),
          new TableRow({ children: [dCell("PII 암호화", 3000), dCell("AES-256-GCM / encryptionV2.ts — 모든 환자 성명·연락처·주소", 5506)] }),
          new TableRow({ children: [dCell("권한 최소화", 3000), dCell("app_metadata.role 기반 RBAC. anon key → 공개 읽기만. service_role → 서버 전용", 5506)] }),
          new TableRow({ children: [dCell("API 보안", 3000), dCell("모든 POST → requireAdminAuth 또는 checkRateLimit 필수 적용", 5506)] }),
          new TableRow({ children: [dCell("오류 은닉", 3000), dCell("API 응답에 error.message 직접 노출 금지. 'internal_error' 코드만 반환", 5506)] }),
          new TableRow({ children: [dCell("서버 격리", 3000), dCell("service_role 키 접근 모듈에 import 'server-only' 필수", 5506)] }),
        ]
      }),
      ...space(2),
      new Paragraph({
        spacing: { before: 240, after: 60 },
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: BLUE, space: 2 } },
        children: [new TextRun({ text: "문서 관리 정보", size: 20, bold: true, color: BLUE, font: "맑은 고딕" })]
      }),
      new Table({
        width: { size: 8506, type: WidthType.DXA }, columnWidths: [2126, 2126, 2127, 2127],
        rows: [
          new TableRow({ children: [dCell("문서 번호", 2126, { fill: GRAY, bold: true }), dCell("HEALO-2026-DOC-07", 2126), dCell("작성자", 2127, { fill: GRAY, bold: true }), dCell("본로이 PM", 2127)] }),
          new TableRow({ children: [dCell("버전", 2126, { fill: GRAY, bold: true }), dCell("v1.0", 2126), dCell("작성일", 2127, { fill: GRAY, bold: true }), dCell("2026-04-30", 2127)] }),
          new TableRow({ children: [dCell("상태", 2126, { fill: GRAY, bold: true }), dCell("완료", 2126), dCell("보안등급", 2127, { fill: GRAY, bold: true }), dCell("내부 기밀 — 외부 공개 금지", 2127)] }),
        ]
      }),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("C:/Users/user/Desktop/HEALO_KHIDI/docs/government-project/07_관리자매뉴얼.docx", buffer);
  console.log("07_관리자매뉴얼.docx 생성 완료");
}).catch(err => { console.error(err); process.exit(1); });
