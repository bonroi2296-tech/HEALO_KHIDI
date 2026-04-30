const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
        PageNumber, Header, Footer, PageBreak, LevelFormat } = require('docx');
const fs = require('fs');

const BLUE = "00467F";
const LIGHT_BLUE = "D5E8F0";
const GRAY = "F5F5F5";

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

function heading1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 120 },
    children: [new TextRun({ text, bold: true, size: 28, color: BLUE, font: "맑은 고딕" })] });
}
function heading2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 80 },
    children: [new TextRun({ text, bold: true, size: 24, color: "1F4E79", font: "맑은 고딕" })] });
}
function body(text, opts = {}) {
  return new Paragraph({ spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, size: 20, font: "맑은 고딕", ...opts })] });
}
function bullet(text) {
  return new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, size: 20, font: "맑은 고딕" })] });
}
function space(n = 1) {
  return Array.from({ length: n }, () => new Paragraph({ children: [new TextRun("")] }));
}
function pageBreak() { return new Paragraph({ children: [new PageBreak()] }); }
function hCell(text, w) {
  return new TableCell({ borders, width: { size: w, type: WidthType.DXA },
    shading: { fill: BLUE, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, bold: true, size: 18, color: "FFFFFF", font: "맑은 고딕" })] })] });
}
function dCell(text, w, opts = {}) {
  return new TableCell({ borders, width: { size: w, type: WidthType.DXA },
    shading: { fill: opts.fill || "FFFFFF", type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({ text: String(text), size: 18, font: "맑은 고딕", bold: opts.bold || false })] })] });
}
function statusCell(text, w) {
  const fillMap = {
    "완료": "E8F5E9", "제출 완료": "E8F5E9",
    "작성 완료": "E8F5E9",
    "작성 중": "FFF9C4", "진행 중": "FFF9C4",
    "작성 예정": "F5F5F5", "제출 예정": "F5F5F5",
    "[TBD]": "F5F5F5",
  };
  const fill = fillMap[text] || "FFFFFF";
  return new TableCell({ borders, width: { size: w, type: WidthType.DXA },
    shading: { fill, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, size: 18, font: "맑은 고딕" })] })] });
}

const doc = new Document({
  numbering: { config: [{ reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•",
    alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 480, hanging: 240 } } } }] }] },
  styles: {
    default: { document: { run: { font: "맑은 고딕", size: 20 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "맑은 고딕" },
        paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "맑은 고딕" },
        paragraph: { spacing: { before: 240, after: 80 }, outlineLevel: 1 } },
    ]
  },
  sections: [{
    properties: {
      page: { size: { width: 11906, height: 16838 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1800 } }
    },
    headers: { default: new Header({ children: [new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 1 } },
      children: [new TextRun({ text: "HEALO 플랫폼 | 산출물 목록", size: 16, color: "666666", font: "맑은 고딕" })]
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
        children: [new TextRun({ text: "2026년 KHIDI 외국인환자 사전상담·사후관리 지원사업", size: 20, color: "666666", font: "맑은 고딕" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 120 },
        children: [new TextRun({ text: "산  출  물  목  록", size: 52, bold: true, color: BLUE, font: "맑은 고딕" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 480 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BLUE, space: 2 } },
        children: [new TextRun({ text: "Deliverables Inventory — HEALO Platform", size: 24, color: "444444", font: "맑은 고딕" })] }),
      ...space(2),
      new Table({
        width: { size: 7000, type: WidthType.DXA }, alignment: AlignmentType.CENTER,
        columnWidths: [2200, 4800],
        rows: [
          new TableRow({ children: [
            new TableCell({ borders: noBorders, width: { size: 2200, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "기준 일자", size: 20, bold: true, color: BLUE, font: "맑은 고딕" })] })] }),
            new TableCell({ borders: noBorders, width: { size: 4800, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "2026년 4월 30일", size: 20, font: "맑은 고딕" })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: noBorders, width: { size: 2200, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "총 산출물", size: 20, bold: true, color: BLUE, font: "맑은 고딕" })] })] }),
            new TableCell({ borders: noBorders, width: { size: 4800, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Phase A 4건 + Phase B 7건 + 기타 docs 6건 = 17건", size: 20, font: "맑은 고딕" })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: noBorders, width: { size: 2200, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "주 관 기 관", size: 20, bold: true, color: BLUE, font: "맑은 고딕" })] })] }),
            new TableCell({ borders: noBorders, width: { size: 4800, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "(주)본로이 (Bonroi)", size: 20, font: "맑은 고딕" })] })] }),
          ]}),
        ]
      }),
      ...space(4),
      pageBreak(),

      // ── 1. Phase A 산출물 ─────────────────────────────────────────────
      heading1("1. Phase A 산출물 (사업계획 및 요구사항)"),
      body("Phase A 산출물은 사업 착수 및 KHIDI 신청 단계에서 작성된 문서이다. 2026년 4월 30일 완료."),
      ...space(1),
      new Table({
        width: { size: 8506, type: WidthType.DXA },
        columnWidths: [400, 2200, 1200, 1200, 1000, 2506],
        rows: [
          new TableRow({ children: [hCell("번호", 400), hCell("파일명", 2200), hCell("작성일", 1200), hCell("담당자", 1200), hCell("상태", 1000), hCell("설명", 2506)] }),
          new TableRow({ children: [dCell("A-01", 400), dCell("01_요구사항정의서.docx", 2200), dCell("2026-04-30", 1200, { center: true }), dCell("본로이 PM", 1200, { center: true }), statusCell("작성 완료", 1000), dCell("페르소나 4종, FR-01~28, NFR 6범주, 외부시스템 9종, 용어 28개 (~22p)", 2506)] }),
          new TableRow({ children: [dCell("A-02", 400), dCell("02_기능명세서.docx", 2200), dCell("2026-04-30", 1200, { center: true }), dCell("본로이 PM", 1200, { center: true }), statusCell("작성 완료", 1000), dCell("14개 기능그룹 상세 명세, 구현 현황(완료74%/부분26%) (~30p)", 2506)] }),
          new TableRow({ children: [dCell("A-03", 400), dCell("EVAL_MATRIX.docx", 2200), dCell("2026-04-30", 1200, { center: true }), dCell("본로이 PM", 1200, { center: true }), statusCell("작성 완료", 1000), dCell("공고문 붙임1 평가기준 대응표, 추정 82.5~85.5/105점 (~15p)", 2506)] }),
          new TableRow({ children: [dCell("A-04", 400), dCell("00_INDEX.md", 2200), dCell("2026-04-30", 1200, { center: true }), dCell("본로이 PM", 1200, { center: true }), statusCell("작성 완료", 1000), dCell("전체 산출물 인덱스 (1p)", 2506)] }),
        ]
      }),
      ...space(1),
      pageBreak(),

      // ── 2. Phase B 산출물 ────────────────────────────────────────────
      heading1("2. Phase B 산출물 (보고서·매뉴얼·테스트)"),
      body("Phase B 산출물은 사업 진행 중 작성되는 보고서, 매뉴얼, 테스트 문서이다."),
      ...space(1),
      new Table({
        width: { size: 8506, type: WidthType.DXA },
        columnWidths: [400, 2200, 1200, 1200, 1000, 2506],
        rows: [
          new TableRow({ children: [hCell("번호", 400), hCell("파일명", 2200), hCell("작성일", 1200), hCell("담당자", 1200), hCell("상태", 1000), hCell("설명", 2506)] }),
          new TableRow({ children: [dCell("B-01", 400), dCell("03_착수보고서.docx", 2200), dCell("2026-04-30", 1200, { center: true }), dCell("본로이 PM", 1200, { center: true }), statusCell("작성 완료", 1000), dCell("착수보고회 사후 정리, 추진체계, 일정, KPI, 위험관리 (~14p)", 2506)] }),
          new TableRow({ children: [dCell("B-02", 400), dCell("04_중간보고서.docx", 2200), dCell("2026-04-30", 1200, { center: true }), dCell("본로이 PM", 1200, { center: true }), statusCell("작성 중", 1000), dCell("진척률 74%, KPI 진행, 주요성과, 이슈해결, 예산, 잔여계획 (~18p) — 8월 갱신 예정", 2506)] }),
          new TableRow({ children: [dCell("B-03", 400), dCell("05_최종보고서.docx", 2200), dCell("2026-04-30", 1200, { center: true }), dCell("본로이 PM", 1200, { center: true }), statusCell("작성 중", 1000), dCell("사업 종료 템플릿 골격, KPI 실적 [TBD], 기술·사회적 성과 (~22p) — 11월 완성 예정", 2506)] }),
          new TableRow({ children: [dCell("B-04", 400), dCell("06_사용자매뉴얼.docx", 2200), dCell("2026-04-30", 1200, { center: true }), dCell("본로이 PM", 1200, { center: true }), statusCell("작성 완료", 1000), dCell("환자/코디네이터/의료진 3개 사용자군 매뉴얼 (~20p)", 2506)] }),
          new TableRow({ children: [dCell("B-05", 400), dCell("07_관리자매뉴얼.docx", 2200), dCell("2026-04-30", 1200, { center: true }), dCell("본로이 PM", 1200, { center: true }), statusCell("작성 완료", 1000), dCell("어드민 대시보드, 환자관리, 보안대응, 백업·복구 매뉴얼 (~18p)", 2506)] }),
          new TableRow({ children: [dCell("B-06", 400), dCell("08_테스트결과서.docx", 2200), dCell("2026-04-30", 1200, { center: true }), dCell("본로이 PM", 1200, { center: true }), statusCell("작성 완료", 1000), dCell("테스트 전략, E2E 케이스 목록, 보안 회귀 테스트, 성능 측정 (~12p)", 2506)] }),
          new TableRow({ children: [dCell("B-07", 400), dCell("09_산출물목록.docx", 2200), dCell("2026-04-30", 1200, { center: true }), dCell("본로이 PM", 1200, { center: true }), statusCell("작성 완료", 1000), dCell("전체 산출물 인벤토리, KHIDI 제출 일정 매핑 (~8p)", 2506)] }),
        ]
      }),
      ...space(1),
      pageBreak(),

      // ── 3. 기타 기술 문서 ────────────────────────────────────────────
      heading1("3. 기타 기술 문서 및 운영 파일"),
      body("코드베이스 내 기술 문서 및 운영 체크리스트. KHIDI 제출 대상은 아니나 사업 증빙 자료로 활용 가능."),
      ...space(1),
      new Table({
        width: { size: 8506, type: WidthType.DXA },
        columnWidths: [700, 2800, 1500, 1500, 2006],
        rows: [
          new TableRow({ children: [hCell("번호", 700), hCell("파일명", 2800), hCell("위치", 1500), hCell("담당자", 1500), hCell("내용", 2006)] }),
          new TableRow({ children: [dCell("T-01", 700), dCell("AI_ARCHITECTURE_REPORT_2026_04.md", 2800), dCell("docs/", 1500), dCell("개발팀", 1500), dCell("AI 엔진 아키텍처 상세 보고, 비용 시뮬레이션", 2006)] }),
          new TableRow({ children: [dCell("T-02", 700), dCell("SECURITY_CHECKLIST.md", 2800), dCell("docs/", 1500), dCell("개발팀", 1500), dCell("보안 점검 체크리스트 — 분기별 회귀 테스트 기준", 2006)] }),
          new TableRow({ children: [dCell("T-03", 700), dCell("DEPLOY_CHECKLIST.md", 2800), dCell("docs/ (예정)", 1500), dCell("개발팀", 1500), dCell("배포 전 안전장치 체크리스트 [예정]", 2006)] }),
          new TableRow({ children: [dCell("T-04", 700), dCell("vercel.json", 2800), dCell("루트", 1500), dCell("개발팀", 1500), dCell("Vercel 배포 설정 — crons, rewrites, headers", 2006)] }),
          new TableRow({ children: [dCell("T-05", 700), dCell("migrations/ (37개 파일)", 2800), dCell("migrations/", 1500), dCell("개발팀", 1500), dCell("DB 스키마 마이그레이션 전체 이력", 2006)] }),
          new TableRow({ children: [dCell("T-06", 700), dCell("CLAUDE.md", 2800), dCell("루트", 1500), dCell("PM", 1500), dCell("Claude Code 프로젝트 개발 지침 및 규약", 2006)] }),
        ]
      }),
      ...space(1),
      pageBreak(),

      // ── 4. KHIDI 제출 일정 매핑 ──────────────────────────────────────
      heading1("4. KHIDI 제출 일정 매핑"),
      body("사업 일정에 따른 KHIDI 보고 및 산출물 제출 계획이다."),
      ...space(1),
      new Table({
        width: { size: 8506, type: WidthType.DXA },
        columnWidths: [1200, 1800, 2500, 3006],
        rows: [
          new TableRow({ children: [hCell("시기", 1200), hCell("보고 유형", 1800), hCell("제출 산출물", 2500), hCell("비고", 3006)] }),
          new TableRow({ children: [dCell("2026년 4월", 1200, { fill: GRAY }), dCell("착수보고", 1800, { bold: true }), dCell("03_착수보고서.docx", 2500), dCell("착수보고회 개최 후 제출 — 완료", 3006, { fill: "E8F5E9" })] }),
          new TableRow({ children: [dCell("2026년 5~7월", 1200, { fill: GRAY }), dCell("월 1회 진행 보고", 1800), dCell("월별 진행 요약 (이메일 등)", 2500), dCell("KHIDI 형식 확인 필요 [진행 중]", 3006, { fill: "FFF9C4" })] }),
          new TableRow({ children: [dCell("2026년 8월", 1200, { fill: GRAY }), dCell("중간보고", 1800, { bold: true }), dCell("04_중간보고서.docx (갱신본)", 2500), dCell("KPI 중간 달성률 포함, 8월 제출 예정", 3006, { fill: "FFF9C4" })] }),
          new TableRow({ children: [dCell("2026년 11월", 1200, { fill: GRAY }), dCell("최종보고", 1800, { bold: true }), dCell("05_최종보고서.docx\n06_사용자매뉴얼.docx\n07_관리자매뉴얼.docx\n08_테스트결과서.docx\n09_산출물목록.docx", 2500), dCell("최종보고회 개최 후 전체 산출물 패키지 제출, 11월 예정", 3006, { fill: "FFF9C4" })] }),
          new TableRow({ children: [dCell("수시", 1200, { fill: GRAY }), dCell("요청 시 제출", 1800), dCell("01_요구사항정의서.docx\n02_기능명세서.docx\nEVAL_MATRIX.docx", 2500), dCell("KHIDI 실사·점검 요청 시 즉시 제출 가능", 3006)] }),
        ]
      }),
      ...space(1),
      heading1("5. 산출물 현황 요약"),
      new Table({
        width: { size: 8506, type: WidthType.DXA },
        columnWidths: [2500, 1500, 1500, 3006],
        rows: [
          new TableRow({ children: [hCell("구분", 2500), hCell("총 건수", 1500), hCell("완료", 1500), hCell("비고", 3006)] }),
          new TableRow({ children: [dCell("Phase A 산출물", 2500), dCell("4건", 1500, { center: true }), dCell("4건 (100%)", 1500, { center: true, fill: "E8F5E9" }), dCell("2026-04-30 전체 완료", 3006)] }),
          new TableRow({ children: [dCell("Phase B 산출물", 2500), dCell("7건", 1500, { center: true }), dCell("5건 완료 / 2건 초안", 1500, { center: true, fill: "FFF9C4" }), dCell("04·05 보고서는 운영 후 갱신 예정", 3006)] }),
          new TableRow({ children: [dCell("기술·운영 문서", 2500), dCell("6건", 1500, { center: true }), dCell("4건 완료 / 2건 예정", 1500, { center: true, fill: "FFF9C4" }), dCell("코드베이스 내 관리", 3006)] }),
          new TableRow({ children: [dCell("전체 합계", 2500, { bold: true, fill: LIGHT_BLUE }), dCell("17건", 1500, { center: true, fill: LIGHT_BLUE, bold: true }), dCell("13건 완료", 1500, { center: true, fill: LIGHT_BLUE, bold: true }), dCell("완성도 76%", 3006, { fill: LIGHT_BLUE })] }),
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
          new TableRow({ children: [dCell("문서 번호", 2126, { fill: GRAY, bold: true }), dCell("HEALO-2026-DOC-09", 2126), dCell("작성자", 2127, { fill: GRAY, bold: true }), dCell("본로이 PM", 2127)] }),
          new TableRow({ children: [dCell("버전", 2126, { fill: GRAY, bold: true }), dCell("v1.0", 2126), dCell("작성일", 2127, { fill: GRAY, bold: true }), dCell("2026-04-30", 2127)] }),
          new TableRow({ children: [dCell("상태", 2126, { fill: GRAY, bold: true }), dCell("완료", 2126), dCell("보안등급", 2127, { fill: GRAY, bold: true }), dCell("내부 기밀", 2127)] }),
        ]
      }),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("C:/Users/user/Desktop/HEALO_KHIDI/docs/government-project/09_산출물목록.docx", buffer);
  console.log("09_산출물목록.docx 생성 완료");
}).catch(err => { console.error(err); process.exit(1); });
