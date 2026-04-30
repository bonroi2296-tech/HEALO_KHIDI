const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
        PageNumber, Header, Footer, PageBreak, LevelFormat } = require('docx');
const fs = require('fs');

const BLUE = "00467F";
const LIGHT_BLUE = "D5E8F0";
const GRAY = "F5F5F5";
const GREEN = "1B5E20";
const LIGHT_GREEN = "E8F5E9";

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
function note(text) { return new Paragraph({ spacing: { before: 60, after: 60 },
  border: { left: { style: BorderStyle.SINGLE, size: 8, color: "1976D2", space: 4 } },
  children: [new TextRun({ text: "  " + text, size: 18, color: "1565C0", font: "맑은 고딕", italics: true })] }); }
function screen(path) { return new Paragraph({ spacing: { before: 80, after: 80 },
  shading: { fill: "EEEEEE", type: ShadingType.CLEAR },
  children: [new TextRun({ text: `  [화면: ${path}]`, size: 18, color: "555555", font: "맑은 고딕", italics: true })] }); }
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
      children: [new TextRun({ text: "HEALO 플랫폼 | 사용자 매뉴얼", size: 16, color: "666666", font: "맑은 고딕" })]
    })] }) },
    footers: { default: new Footer({ children: [new Paragraph({
      border: { top: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 1 } },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: "(주)본로이 | 기밀문서  |  ", size: 16, color: "666666", font: "맑은 고딕" }),
        new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "666666", font: "맑은 고딕" }),
        new TextRun({ text: " / ", size: 16, color: "666666", font: "맑은 고딕" }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: "666666", font: "맑은 고딕" }),
      ]
    })] }) },
    children: [
      // ── 표지 ──────────────────────────────────────────────────────────
      ...space(4),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 120 },
        children: [new TextRun({ text: "HEALO 플랫폼 — 사용자 안내서", size: 20, color: "666666", font: "맑은 고딕" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 120 },
        children: [new TextRun({ text: "사 용 자 매 뉴 얼", size: 52, bold: true, color: BLUE, font: "맑은 고딕" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 360 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BLUE, space: 2 } },
        children: [new TextRun({ text: "환자 / 코디네이터 / 의료진", size: 24, color: "444444", font: "맑은 고딕" })] }),
      ...space(2),
      new Table({
        width: { size: 6000, type: WidthType.DXA }, alignment: AlignmentType.CENTER,
        columnWidths: [2000, 4000],
        rows: [
          new TableRow({ children: [
            new TableCell({ borders: noBorders, width: { size: 2000, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "적 용 버 전", size: 20, bold: true, color: BLUE, font: "맑은 고딕" })] })] }),
            new TableCell({ borders: noBorders, width: { size: 4000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "HEALO v1.0 (2026년 4월 기준)", size: 20, font: "맑은 고딕" })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: noBorders, width: { size: 2000, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "대 상 언 어", size: 20, bold: true, color: BLUE, font: "맑은 고딕" })] })] }),
            new TableCell({ borders: noBorders, width: { size: 4000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "한국어 (ru/kk 번역본 추후 제공 예정)", size: 20, font: "맑은 고딕" })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: noBorders, width: { size: 2000, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "URL", size: 20, bold: true, color: BLUE, font: "맑은 고딕" })] })] }),
            new TableCell({ borders: noBorders, width: { size: 4000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "https://healo.kr", size: 20, font: "맑은 고딕" })] })] }),
          ]}),
        ]
      }),
      ...space(3),
      pageBreak(),

      // ── 목차 ─────────────────────────────────────────────────────────
      h1("목  차"),
      new Table({
        width: { size: 8506, type: WidthType.DXA }, columnWidths: [7500, 1006],
        rows: [
          ["제 1장. 환자 사용 안내", "3"],
          ["  1.1 회원가입 및 로그인", "3"],
          ["  1.2 인테이크 폼 작성", "4"],
          ["  1.3 원격상담 참여 (화상 협진)", "5"],
          ["  1.4 의료문서 업로드 및 확인", "6"],
          ["  1.5 다국어 전환", "7"],
          ["  1.6 알림 및 메시지 확인", "7"],
          ["제 2장. 코디네이터 사용 안내", "9"],
          ["  2.1 로그인 및 대시보드", "9"],
          ["  2.2 환자 상담 이력 조회", "9"],
          ["  2.3 인테이크 검토 및 병원 배정", "10"],
          ["  2.4 화상상담 설정 및 진행", "11"],
          ["  2.5 메시지 발송", "11"],
          ["제 3장. 의료진 사용 안내", "13"],
          ["  3.1 파트너 병원 포털 접속", "13"],
          ["  3.2 환자 정보 조회", "13"],
          ["  3.3 화상 협진 참여", "14"],
          ["  3.4 진료 의견서 작성", "14"],
        ].map(([title, pg]) => new TableRow({ children: [
          new TableCell({ borders: noBorders, width: { size: 7500, type: WidthType.DXA },
            children: [new Paragraph({ children: [new TextRun({ text: title, size: 20, font: "맑은 고딕" })] })] }),
          new TableCell({ borders: noBorders, width: { size: 1006, type: WidthType.DXA },
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: pg, size: 20, font: "맑은 고딕" })] })] }),
        ]}))
      }),
      pageBreak(),

      // ─────────────────────────────────────────────────────────────────
      // 제 1장. 환자 사용 안내
      // ─────────────────────────────────────────────────────────────────
      new Paragraph({ spacing: { before: 0, after: 240 },
        shading: { fill: BLUE, type: ShadingType.CLEAR },
        children: [new TextRun({ text: "  제 1장. 환자 사용 안내 (Patient Guide)", bold: true, size: 28, color: "FFFFFF", font: "맑은 고딕" })] }),
      ...space(1),

      h2("1.1 회원가입 및 로그인"),
      h3("회원가입 절차"),
      step(1, "HEALO 플랫폼(healo.kr)에 접속한다."),
      step(2, "우측 상단 [회원가입] 버튼을 클릭한다."),
      step(3, "이메일 주소를 입력하고 [이메일로 계속] 버튼을 클릭한다."),
      step(4, "입력한 이메일로 인증 메일이 발송된다. 이메일을 확인하고 [인증 확인] 링크를 클릭한다."),
      step(5, "비밀번호를 설정하고 기본 정보를 입력하면 회원가입이 완료된다."),
      screen("/auth 페이지 — 회원가입 폼"),
      note("소셜 로그인(Google, Kakao)으로도 가입 가능하다."),
      ...space(1),
      h3("로그인 절차"),
      step(1, "healo.kr에 접속한다."),
      step(2, "[로그인] 버튼 클릭 후 이메일과 비밀번호를 입력한다."),
      step(3, "로그인 성공 시 환자 대시보드(/patient)로 이동된다."),
      screen("/login 페이지"),
      note("회원가입 없이도 [게스트 상담] 기능으로 인테이크 폼 작성 가능 — 링크를 받은 경우 바로 접속"),
      ...space(1),

      h2("1.2 인테이크 폼 작성"),
      body("인테이크 폼은 암환자가 상담을 신청하기 위해 작성하는 5단계 정보 입력 양식이다."),
      ...space(1),
      h3("접속 방법"),
      step(1, "로그인 후 상단 메뉴 [상담 신청] 또는 홈 화면 [지금 상담 시작] 버튼 클릭"),
      step(2, "또는 직접 URL healo.kr/intake 접속"),
      screen("/intake 페이지 — Step 1"),
      ...space(1),
      h3("Step별 입력 내용"),
      new Table({
        width: { size: 8506, type: WidthType.DXA }, columnWidths: [800, 2200, 5506],
        rows: [
          new TableRow({ children: [hCell("단계", 800), hCell("항목", 2200), hCell("입력 내용", 5506)] }),
          new TableRow({ children: [dCell("Step 1", 800, { fill: GRAY }), dCell("기본 정보", 2200, { bold: true }), dCell("성명, 연락처(WhatsApp), 국가, 생년월일", 5506)] }),
          new TableRow({ children: [dCell("Step 2", 800, { fill: GRAY }), dCell("암 정보", 2200, { bold: true }), dCell("암종, 병기, 현재 치료 상태, 기왕력", 5506)] }),
          new TableRow({ children: [dCell("Step 3", 800, { fill: GRAY }), dCell("의료기록 업로드", 2200, { bold: true }), dCell("CT/MRI/혈액검사 등 파일 첨부 (PDF·JPEG·PNG, 최대 50MB)", 5506)] }),
          new TableRow({ children: [dCell("Step 4", 800, { fill: GRAY }), dCell("희망 치료", 2200, { bold: true }), dCell("치료 방법, 예산, 입국 가능 시기, 동행자", 5506)] }),
          new TableRow({ children: [dCell("Step 5", 800, { fill: GRAY }), dCell("개인정보 동의·제출", 2200, { bold: true }), dCell("개인정보 처리 동의, 의료 정보 동의 후 제출", 5506)] }),
        ]
      }),
      note("모든 개인 정보는 AES-256-GCM으로 암호화되어 저장되며, 코디네이터와 담당 의료진만 열람 가능하다."),
      note("Step 도중 저장된 진행 내용은 자동 저장된다. 브라우저를 닫아도 이어서 작성 가능하다 [TODO: 자동 저장 기능 구현 예정]."),
      screen("/intake 페이지 — Step 5 제출 완료 화면"),
      ...space(1),

      h2("1.3 원격상담 참여 (화상 협진)"),
      h3("화상상담 링크로 참여하기"),
      step(1, "코디네이터가 WhatsApp/이메일로 발송한 화상상담 링크를 확인한다."),
      step(2, "링크를 클릭하면 게스트 토큰으로 화상상담 화면에 자동 접속된다. 별도 로그인 불필요."),
      step(3, "카메라 및 마이크 권한 허용 팝업에서 [허용]을 클릭한다."),
      step(4, "대기 화면에서 의료진 또는 코디네이터가 입장할 때까지 기다린다."),
      step(5, "상담 종료 후 [상담 종료] 버튼을 클릭한다."),
      screen("/telemedicine/[room] 페이지 — 화상상담 화면"),
      note("PC 또는 스마트폰 모두 사용 가능하다. Chrome 또는 Safari 최신 버전 권장."),
      note("화상 중 번역 자막 기능은 현재 개발 중이며 2026년 5월 적용 예정이다 [진행 중]."),
      ...space(1),
      h3("화상상담 중 기능"),
      new Table({
        width: { size: 8506, type: WidthType.DXA }, columnWidths: [2500, 6006],
        rows: [
          new TableRow({ children: [hCell("기능", 2500), hCell("설명", 6006)] }),
          new TableRow({ children: [dCell("카메라 ON/OFF", 2500), dCell("화면 하단 카메라 아이콘 클릭으로 전환", 6006)] }),
          new TableRow({ children: [dCell("마이크 ON/OFF", 2500), dCell("마이크 아이콘 클릭. 음소거 시 상대방에게 음성 전달 안 됨", 6006)] }),
          new TableRow({ children: [dCell("채팅", 2500), dCell("화면 우측 채팅 패널에서 텍스트 메시지 교환 가능", 6006)] }),
          new TableRow({ children: [dCell("화면 공유", 2500), dCell("의료 기록 화면 공유 가능 (PC 전용)", 6006)] }),
          new TableRow({ children: [dCell("번역 자막", 2500), dCell("실시간 번역 자막 [2026년 5월 예정 — 진행 중]", 6006, { fill: "FFF9C4" })] }),
        ]
      }),
      ...space(1),

      h2("1.4 의료문서 업로드 및 확인"),
      h3("문서 업로드"),
      step(1, "환자 대시보드(/patient) 접속 후 [의료 기록] 메뉴 클릭"),
      step(2, "[파일 추가] 버튼 클릭 또는 파일을 드래그앤드롭"),
      step(3, "지원 형식: DICOM, JPEG, PNG, PDF (파일당 최대 50MB)"),
      step(4, "업로드 완료 시 파일 목록에 표시되고 코디네이터에게 알림이 발송된다."),
      screen("/patient/documents 페이지"),
      h3("문서 확인"),
      step(1, "환자 대시보드 [의료 기록] 탭에서 업로드된 파일 목록 확인"),
      step(2, "파일명 클릭 시 다운로드 또는 미리보기"),
      step(3, "코디네이터가 검토 의견을 추가한 경우 해당 파일에 메모 표시"),
      note("업로드된 파일은 Supabase Storage에 암호화 보관되며, 담당 코디네이터·의료진만 접근 가능하다."),
      ...space(1),

      h2("1.5 다국어 전환"),
      step(1, "화면 우측 상단 언어 선택 버튼(국기 아이콘) 클릭"),
      step(2, "한국어, 영어, 러시아어, 카자흐어, 중국어, 일본어 중 선택"),
      step(3, "선택 즉시 페이지 전체가 해당 언어로 전환된다."),
      screen("글로벌 헤더 — 언어 전환 드롭다운"),
      note("러시아어(/ru)와 카자흐어(/kk) 번역은 현재 일부 완성 상태이다. 2026년 6월 전면 완성 예정 [진행 중]."),
      ...space(1),

      h2("1.6 알림 및 메시지 확인"),
      h3("이메일 알림"),
      body("다음 이벤트에서 자동 이메일이 발송된다:"),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { before: 40, after: 40 },
        children: [new TextRun({ text: "인테이크 폼 제출 완료 — 접수 확인 이메일", size: 20, font: "맑은 고딕" })] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { before: 40, after: 40 },
        children: [new TextRun({ text: "화상상담 일정 확정 — 링크 포함 안내 이메일", size: 20, font: "맑은 고딕" })] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { before: 40, after: 40 },
        children: [new TextRun({ text: "코디네이터 메시지 수신 — 새 메시지 알림", size: 20, font: "맑은 고딕" })] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { before: 40, after: 40 },
        children: [new TextRun({ text: "예약 D-1 리마인더 [2026년 6월 예정 — 진행 중]", size: 20, font: "맑은 고딕" })] }),
      ...space(1),
      h3("플랫폼 내 메시지"),
      step(1, "환자 대시보드(/patient) 상단 메시지 아이콘 클릭"),
      step(2, "코디네이터와의 메시지 스레드 확인"),
      step(3, "답장 입력 후 [전송] 클릭"),
      screen("/patient/messages 페이지"),
      pageBreak(),

      // ─────────────────────────────────────────────────────────────────
      // 제 2장. 코디네이터 사용 안내
      // ─────────────────────────────────────────────────────────────────
      new Paragraph({ spacing: { before: 0, after: 240 },
        shading: { fill: "1F4E79", type: ShadingType.CLEAR },
        children: [new TextRun({ text: "  제 2장. 코디네이터 사용 안내 (Coordinator Guide)", bold: true, size: 28, color: "FFFFFF", font: "맑은 고딕" })] }),
      ...space(1),

      h2("2.1 로그인 및 대시보드"),
      step(1, "healo.kr/login 접속 후 코디네이터 계정으로 로그인"),
      step(2, "로그인 성공 시 자동으로 코디네이터 대시보드(/coordinator)로 이동"),
      screen("/coordinator 페이지 — 대시보드 홈"),
      body("대시보드 구성:"),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { before: 40, after: 40 },
        children: [new TextRun({ text: "신규 인테이크 수신 현황 — 미배정 건수 표시", size: 20, font: "맑은 고딕" })] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { before: 40, after: 40 },
        children: [new TextRun({ text: "예정 화상상담 일정", size: 20, font: "맑은 고딕" })] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { before: 40, after: 40 },
        children: [new TextRun({ text: "미답변 메시지 수", size: 20, font: "맑은 고딕" })] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { before: 40, after: 40 },
        children: [new TextRun({ text: "월별 상담 건수 통계", size: 20, font: "맑은 고딕" })] }),
      ...space(1),

      h2("2.2 환자 상담 이력 조회"),
      step(1, "좌측 사이드바 [환자 관리] 클릭"),
      step(2, "환자 목록에서 이름 또는 인테이크 ID로 검색"),
      step(3, "환자 이름 클릭 시 상세 페이지 이동"),
      step(4, "상세 페이지에서: 인테이크 정보, 의료 기록, 채팅 이력, 예약 현황 확인"),
      screen("/coordinator/patients/[id] 페이지"),
      note("환자 개인정보(성명·연락처)는 암호화 저장되며 화면에서는 마스킹 처리됨. 전체 확인은 복호화 권한 필요."),
      ...space(1),

      h2("2.3 인테이크 검토 및 병원 배정"),
      step(1, "[인테이크 관리] 메뉴에서 신규 접수 건 확인"),
      step(2, "인테이크 항목 검토: 암종, 병기, 업로드 의료 기록 확인"),
      step(3, "[병원 매칭 AI 추천] 버튼 클릭 시 AI가 적합 병원 3개 추천"),
      step(4, "추천 결과 검토 후 [배정] 버튼으로 병원 및 의료진 배정"),
      step(5, "환자에게 배정 결과 이메일 자동 발송"),
      screen("/coordinator/intake/[id] 페이지"),
      ...space(1),

      h2("2.4 화상상담 설정 및 진행"),
      step(1, "환자 상세 페이지 [화상상담 설정] 탭 클릭"),
      step(2, "상담 일시, 참여자(의료진) 선택 후 [방 생성]"),
      step(3, "생성된 화상상담 링크를 환자에게 이메일/WhatsApp으로 전송"),
      step(4, "상담 시간에 맞춰 [화상 참여] 클릭으로 화상방에 입장"),
      step(5, "상담 종료 후 상담 결과 메모 저장 및 후속 액션 설정"),
      screen("/coordinator/sessions/[id] 페이지"),
      note("게스트 참여 링크는 24시간 유효. 만료 시 새 링크 재발급 필요."),
      ...space(1),

      h2("2.5 메시지 발송"),
      step(1, "환자 상세 페이지 또는 [메시지] 메뉴에서 해당 환자 선택"),
      step(2, "메시지 입력창에 텍스트 작성 후 [전송]"),
      step(3, "환자에게 새 메시지 이메일 알림 자동 발송"),
      screen("/coordinator/messages 페이지"),
      note("메시지는 현재 텍스트 전용. 파일 첨부는 [의료 기록] 탭에서 별도 처리."),
      pageBreak(),

      // ─────────────────────────────────────────────────────────────────
      // 제 3장. 의료진 사용 안내
      // ─────────────────────────────────────────────────────────────────
      new Paragraph({ spacing: { before: 0, after: 240 },
        shading: { fill: "1B5E20", type: ShadingType.CLEAR },
        children: [new TextRun({ text: "  제 3장. 의료진 사용 안내 (Doctor Guide)", bold: true, size: 28, color: "FFFFFF", font: "맑은 고딕" })] }),
      ...space(1),

      h2("3.1 파트너 병원 포털 접속"),
      step(1, "healo.kr/partner 접속 후 의료진 계정으로 로그인"),
      step(2, "파트너 대시보드로 이동: 배정된 환자 목록, 예정 화상상담, 수신 의뢰 확인"),
      screen("/partner 페이지 — 파트너 대시보드"),
      note("의료진 계정은 관리자가 발급한다. 계정 신청은 플랫폼 관리자(admin)에게 문의."),
      ...space(1),

      h2("3.2 환자 정보 조회"),
      step(1, "[배정 환자] 목록에서 환자 선택"),
      step(2, "열람 가능 항목: 인테이크 정보(암종·병기·기왕력), 업로드 의료 기록"),
      step(3, "의료 기록 파일 다운로드 후 검토"),
      screen("/partner/patients/[id] 페이지"),
      note("의료진은 자신에게 배정된 환자 정보만 접근 가능하다 (RLS 정책 적용)."),
      ...space(1),

      h2("3.3 화상 협진 참여"),
      step(1, "대시보드 [예정 화상상담] 목록에서 해당 일정 확인"),
      step(2, "상담 시간 5분 전 [입장] 버튼 클릭"),
      step(3, "카메라·마이크 권한 허용 후 상담 진행"),
      step(4, "상담 중 채팅 기능으로 의료 용어 텍스트 전달 가능"),
      screen("/partner/sessions/[id] 페이지 — 화상 협진"),
      note("의료진 화상 접속은 로그인 후 직접 입장 (게스트 링크 불사용)."),
      ...space(1),

      h2("3.4 진료 의견서 작성"),
      step(1, "화상상담 종료 후 [진료 의견서 작성] 클릭"),
      step(2, "권고 치료 방법, 예상 입원 기간, 주의사항 입력"),
      step(3, "[제출] 클릭 시 코디네이터에게 전달되고 환자에게 이메일 발송"),
      screen("/partner/patients/[id]/opinion 페이지"),
      note("진료 의견서는 법적 의료 문서가 아니며 참고 의견으로만 사용된다. 정식 진료는 입국 후 대면 진료에서 진행."),
      ...space(2),
      new Paragraph({
        spacing: { before: 240, after: 60 },
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: BLUE, space: 2 } },
        children: [new TextRun({ text: "문서 관리 정보", size: 20, bold: true, color: BLUE, font: "맑은 고딕" })]
      }),
      new Table({
        width: { size: 8506, type: WidthType.DXA }, columnWidths: [2126, 2126, 2127, 2127],
        rows: [
          new TableRow({ children: [dCell("문서 번호", 2126, { fill: GRAY, bold: true }), dCell("HEALO-2026-DOC-06", 2126), dCell("작성자", 2127, { fill: GRAY, bold: true }), dCell("본로이 PM", 2127)] }),
          new TableRow({ children: [dCell("버전", 2126, { fill: GRAY, bold: true }), dCell("v1.0", 2126), dCell("작성일", 2127, { fill: GRAY, bold: true }), dCell("2026-04-30", 2127)] }),
          new TableRow({ children: [dCell("상태", 2126, { fill: GRAY, bold: true }), dCell("완료 (운영 시작 후 스크린샷 보완)", 2126), dCell("보안등급", 2127, { fill: GRAY, bold: true }), dCell("내부 기밀", 2127)] }),
        ]
      }),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("C:/Users/user/Desktop/HEALO_KHIDI/docs/government-project/06_사용자매뉴얼.docx", buffer);
  console.log("06_사용자매뉴얼.docx 생성 완료");
}).catch(err => { console.error(err); process.exit(1); });
