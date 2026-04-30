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

function h1(text) { return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 120 },
  children: [new TextRun({ text, bold: true, size: 28, color: BLUE, font: "맑은 고딕" })] }); }
function h2(text) { return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 80 },
  children: [new TextRun({ text, bold: true, size: 24, color: "1F4E79", font: "맑은 고딕" })] }); }
function h3(text) { return new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 160, after: 60 },
  children: [new TextRun({ text, bold: true, size: 22, color: "333333", font: "맑은 고딕" })] }); }
function body(text) { return new Paragraph({ spacing: { before: 60, after: 60 },
  children: [new TextRun({ text, size: 20, font: "맑은 고딕" })] }); }
function tbd(label) { return new Paragraph({ spacing: { before: 60, after: 60 },
  shading: { fill: "FFF9C4", type: ShadingType.CLEAR },
  children: [new TextRun({ text: `  [TBD — ${label}]`, size: 20, color: "E65100", font: "맑은 고딕", italics: true })] }); }
function bullet(text) { return new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { before: 40, after: 40 },
  children: [new TextRun({ text, size: 20, font: "맑은 고딕" })] }); }
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
  numbering: { config: [{ reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•",
    alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 480, hanging: 240 } } } }] }] },
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
      children: [new TextRun({ text: "HEALO 플랫폼 | 최종보고서 — 예정 골격 (2026년 11월 완성)", size: 16, color: "666666", font: "맑은 고딕" })]
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
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 60 },
        children: [new TextRun({ text: "2026년 KHIDI 외국인환자 사전상담·사후관리 지원사업", size: 20, color: "666666", font: "맑은 고딕" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 120 },
        children: [new TextRun({ text: "최  종  보  고  서", size: 52, bold: true, color: BLUE, font: "맑은 고딕" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 240 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BLUE, space: 2 } },
        children: [new TextRun({ text: "Final Report — HEALO Platform", size: 24, color: "444444", font: "맑은 고딕" })] }),
      ...space(1),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 },
        shading: { fill: "FFF9C4", type: ShadingType.CLEAR },
        children: [new TextRun({ text: "  본 문서는 예정 골격입니다. 2026년 11월 사업 종료 시 실제 데이터로 완성 예정.  ", size: 18, color: "E65100", font: "맑은 고딕", bold: true })] }),
      ...space(2),
      new Table({
        width: { size: 7000, type: WidthType.DXA }, alignment: AlignmentType.CENTER, columnWidths: [2200, 4800],
        rows: [
          new TableRow({ children: [
            new TableCell({ borders: noBorders, width: { size: 2200, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "사 업 명", size: 20, bold: true, color: BLUE, font: "맑은 고딕" })] })] }),
            new TableCell({ borders: noBorders, width: { size: 4800, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "ICT 기반 외국인환자 사전상담·사후관리 지원사업", size: 20, font: "맑은 고딕" })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: noBorders, width: { size: 2200, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "사업 기간", size: 20, bold: true, color: BLUE, font: "맑은 고딕" })] })] }),
            new TableCell({ borders: noBorders, width: { size: 4800, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "2026년 4월 ~ 2026년 11월 (8개월)", size: 20, font: "맑은 고딕" })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: noBorders, width: { size: 2200, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "보 고 일 자", size: 20, bold: true, color: BLUE, font: "맑은 고딕" })] })] }),
            new TableCell({ borders: noBorders, width: { size: 4800, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "2026년 11월 [예정]", size: 20, font: "맑은 고딕" })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: noBorders, width: { size: 2200, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "주 관 기 관", size: 20, bold: true, color: BLUE, font: "맑은 고딕" })] })] }),
            new TableCell({ borders: noBorders, width: { size: 4800, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "(주)본로이 (Bonroi)", size: 20, font: "맑은 고딕" })] })] }),
          ]}),
        ]
      }),
      ...space(4),
      pageBreak(),

      // ── 1. 사업 성과 요약 ─────────────────────────────────────────────
      h1("1. 사업 성과 요약"),
      body("2026년 4~11월 ICT 기반 외국인환자 사전상담·사후관리 지원사업을 성공적으로 완료하였다."),
      body("주요 성과:"),
      bullet("HEALO 플랫폼 — AI 챗봇·화상 협진·다국어 인터페이스 완전 구축"),
      bullet("카자흐스탄·러시아 CIS 지역 암환자 대상 원격 상담 서비스 운영 개시"),
      bullet("한국 의료관광 사전 상담 ICT 플랫폼 최초 구축 사례 확보"),
      tbd("사업 종료 후 구체적 수치 및 성과 서술"),
      ...space(1),
      pageBreak(),

      // ── 2. KPI 달성 ──────────────────────────────────────────────────
      h1("2. KPI 달성 현황"),
      h2("2.1 핵심 KPI 실적"),
      ...space(1),
      new Table({
        width: { size: 8506, type: WidthType.DXA }, columnWidths: [400, 2500, 1500, 1500, 2606],
        rows: [
          new TableRow({ children: [hCell("번호", 400), hCell("KPI 항목", 2500), hCell("목표", 1500), hCell("실적", 1500), hCell("달성률", 2606)] }),
          new TableRow({ children: [dCell("K-01", 400), dCell("외국인 환자 유치 건수", 2500, { bold: true }), dCell("10건 이상", 1500, { center: true }), dCell("[TBD]건", 1500, { center: true, fill: "FFF9C4" }), dCell("[TBD]%", 2606, { fill: "FFF9C4" })] }),
          new TableRow({ children: [dCell("K-02", 400), dCell("원격 상담 건수", 2500, { bold: true }), dCell("80건 이상", 1500, { center: true }), dCell("[TBD]건", 1500, { center: true, fill: "FFF9C4" }), dCell("[TBD]%", 2606, { fill: "FFF9C4" })] }),
          new TableRow({ children: [dCell("K-03", 400), dCell("서비스 만족도", 2500, { bold: true }), dCell("80점 이상", 1500, { center: true }), dCell("[TBD]점", 1500, { center: true, fill: "FFF9C4" }), dCell("[TBD]%", 2606, { fill: "FFF9C4" })] }),
        ]
      }),
      tbd("11월 사업 종료 후 실적 데이터 입력. /admin/reports 다운로드 기반"),
      ...space(1),
      h2("2.2 기술 지표 실적"),
      new Table({
        width: { size: 8506, type: WidthType.DXA }, columnWidths: [400, 3000, 1500, 1500, 2106],
        rows: [
          new TableRow({ children: [hCell("번호", 400), hCell("기술 지표", 3000), hCell("목표치", 1500), hCell("실적", 1500), hCell("비고", 2106)] }),
          new TableRow({ children: [dCell("T-01", 400), dCell("AI 챗봇 응답 정확도", 3000), dCell("90% 이상", 1500, { center: true }), dCell("[TBD]", 1500, { center: true, fill: "FFF9C4" }), dCell("전문가 평가 기반", 2106)] }),
          new TableRow({ children: [dCell("T-02", 400), dCell("화상상담 연결 성공률", 3000), dCell("95% 이상", 1500, { center: true }), dCell("[TBD]", 1500, { center: true, fill: "FFF9C4" }), dCell("LiveKit 로그 기반", 2106)] }),
          new TableRow({ children: [dCell("T-03", 400), dCell("인테이크 완료율", 3000), dCell("70% 이상", 1500, { center: true }), dCell("[TBD]", 1500, { center: true, fill: "FFF9C4" }), dCell("Supabase Analytics", 2106)] }),
          new TableRow({ children: [dCell("T-04", 400), dCell("시스템 가동률", 3000), dCell("99.5% 이상", 1500, { center: true }), dCell("[TBD]", 1500, { center: true, fill: "FFF9C4" }), dCell("Vercel Uptime 리포트", 2106)] }),
          new TableRow({ children: [dCell("T-05", 400), dCell("보안 취약점 (Critical)", 3000), dCell("0건", 1500, { center: true }), dCell("[TBD]건", 1500, { center: true, fill: "FFF9C4" }), dCell("최종 보안 점검 결과", 2106)] }),
        ]
      }),
      pageBreak(),

      // ── 3. 정량 지표 ──────────────────────────────────────────────────
      h1("3. 정량 지표"),
      h2("3.1 이용자 현황"),
      new Table({
        width: { size: 8506, type: WidthType.DXA }, columnWidths: [3000, 2500, 3006],
        rows: [
          new TableRow({ children: [hCell("지표", 3000), hCell("수치", 2500), hCell("비고", 3006)] }),
          new TableRow({ children: [dCell("등록 환자 수", 3000), dCell("[TBD]명", 2500, { center: true, fill: "FFF9C4" }), dCell("사업 기간 내 회원가입 누적", 3006)] }),
          new TableRow({ children: [dCell("국가별 분포 (상위 3개국)", 3000), dCell("[TBD]", 2500, { center: true, fill: "FFF9C4" }), dCell("카자흐스탄·러시아 중심 예상", 3006)] }),
          new TableRow({ children: [dCell("암종별 분포 (상위 3개)", 3000), dCell("[TBD]", 2500, { center: true, fill: "FFF9C4" }), dCell("간암·폐암·위암 예상", 3006)] }),
          new TableRow({ children: [dCell("AI 챗봇 총 대화 건수", 3000), dCell("[TBD]건", 2500, { center: true, fill: "FFF9C4" }), dCell("chat_threads 집계", 3006)] }),
          new TableRow({ children: [dCell("업로드 의료 기록 건수", 3000), dCell("[TBD]건", 2500, { center: true, fill: "FFF9C4" }), dCell("attachments 집계", 3006)] }),
          new TableRow({ children: [dCell("병원 페이지 누적 조회수", 3000), dCell("[TBD]회", 2500, { center: true, fill: "FFF9C4" }), dCell("Vercel Analytics", 3006)] }),
        ]
      }),
      ...space(1),
      h2("3.2 만족도 조사 결과"),
      new Table({
        width: { size: 8506, type: WidthType.DXA }, columnWidths: [3000, 2500, 3006],
        rows: [
          new TableRow({ children: [hCell("항목", 3000), hCell("점수 (100점)", 2500), hCell("비고", 3006)] }),
          new TableRow({ children: [dCell("전반적 만족도", 3000), dCell("[TBD]점", 2500, { center: true, fill: "FFF9C4" }), dCell("5점 척도 → 100점 환산", 3006)] }),
          new TableRow({ children: [dCell("AI 챗봇 유용성", 3000), dCell("[TBD]점", 2500, { center: true, fill: "FFF9C4" }), dCell("", 3006)] }),
          new TableRow({ children: [dCell("화상상담 품질", 3000), dCell("[TBD]점", 2500, { center: true, fill: "FFF9C4" }), dCell("", 3006)] }),
          new TableRow({ children: [dCell("다국어 인터페이스", 3000), dCell("[TBD]점", 2500, { center: true, fill: "FFF9C4" }), dCell("", 3006)] }),
          new TableRow({ children: [dCell("재이용 의향", 3000), dCell("[TBD]%", 2500, { center: true, fill: "FFF9C4" }), dCell("재방문 또는 추천 의향", 3006)] }),
        ]
      }),
      pageBreak(),

      // ── 4. 정성 성과 ──────────────────────────────────────────────────
      h1("4. 정성 성과"),
      h2("4.1 대표 사례"),
      tbd("환자 상담 사례 2~3건 기술 — 실제 운영 후 작성"),
      body("작성 기준:"),
      bullet("사례 1: 국가, 암종, 상담 경로, 한국 입국 결정 경위, 치료 결과"),
      bullet("사례 2: 재외 동포 또는 러시아어권 환자의 언어 장벽 해소 사례"),
      bullet("사례 3: 화상 협진 통한 원격 진료 의견서 활용 사례"),
      ...space(1),
      h2("4.2 사용자 후기"),
      tbd("환자 및 코디네이터 후기 3건 이상 — 만족도 조사 자유 응답 기반"),
      ...space(1),
      h2("4.3 언론보도 및 홍보 성과"),
      tbd("언론보도 건수, 소셜 미디어 도달, CIS 커뮤니티 반응 — 운영 후 작성"),
      pageBreak(),

      // ── 5. 기술적 성과 ───────────────────────────────────────────────
      h1("5. 기술적 성과"),
      h2("5.1 구축된 시스템 현황"),
      body("사업 기간 내 구축 완료된 핵심 기술 시스템:"),
      ...space(1),
      new Table({
        width: { size: 8506, type: WidthType.DXA }, columnWidths: [2500, 6006],
        rows: [
          new TableRow({ children: [hCell("기술 영역", 2500), hCell("구축 결과", 6006)] }),
          new TableRow({ children: [dCell("AI 챗봇 3-Tier RAG", 2500), dCell("Gemini 2.5 Flash + HEALO DB + HIRA + Google Search Grounding 완전 통합", 6006)] }),
          new TableRow({ children: [dCell("화상 협진", 2500), dCell("LiveKit WebRTC 기반 암호화 화상상담 — 게스트 링크 지원", 6006)] }),
          new TableRow({ children: [dCell("다국어 인터페이스", 2500), dCell("6개 언어 (ko/en/ru/kz/zh/ja) i18n 전면 구현", 6006)] }),
          new TableRow({ children: [dCell("보안 인프라", 2500), dCell("AES-256-GCM 암호화, RBAC, Rate Limiting, server-only 격리", 6006)] }),
          new TableRow({ children: [dCell("데이터베이스", 2500), dCell("PostgreSQL 17.6 + pgvector + RLS — 환자 PII 완전 암호화 저장", 6006)] }),
          new TableRow({ children: [dCell("인프라", 2500), dCell("Vercel Edge Network + GitLab 미러 백업 — 99.5%+ Uptime", 6006)] }),
        ]
      }),
      ...space(1),
      h2("5.2 기술 혁신 포인트"),
      bullet("3-Tier RAG: 국내 최초 한국 의료관광 전용 다층 AI 검색 시스템"),
      bullet("게스트 토큰 화상 협진: 회원가입 없이 원클릭 화상상담 입장 — 진입 장벽 최소화"),
      bullet("AES-256-GCM 전면 암호화: 평문 PII 0건 — 개인정보 보호법 최고 수준 준수"),
      bullet("화상 내 실시간 번역 자막: CIS 환자와 한국 의료진 언어 장벽 실시간 해소"),
      pageBreak(),

      // ── 6. 사회적·경제적 효과 ─────────────────────────────────────────
      h1("6. 사회적·경제적 효과"),
      h2("6.1 경제적 효과"),
      new Table({
        width: { size: 8506, type: WidthType.DXA }, columnWidths: [3000, 2500, 3006],
        rows: [
          new TableRow({ children: [hCell("항목", 3000), hCell("추정 수치", 2500), hCell("산출 근거", 3006)] }),
          new TableRow({ children: [dCell("환자 1인당 평균 치료비 (외화 수입)", 3000), dCell("[TBD]만 원", 2500, { center: true, fill: "FFF9C4" }), dCell("면력한방병원 평균 치료비 기준", 3006)] }),
          new TableRow({ children: [dCell("총 외화 수입 (유치 건수 × 치료비)", 3000), dCell("[TBD]만 원", 2500, { center: true, fill: "FFF9C4" }), dCell("KPI K-01 달성치 × 단가", 3006)] }),
          new TableRow({ children: [dCell("ICT 플랫폼 절감 비용 (인건비 대비)", 3000), dCell("[TBD]만 원", 2500, { center: true, fill: "FFF9C4" }), dCell("기존 전화 상담 대비 AI 자동화 절감분", 3006)] }),
        ]
      }),
      ...space(1),
      h2("6.2 사회적 효과"),
      bullet("CIS 암환자 의료 접근성 향상 — 언어·정보 장벽 해소로 한국 의료 기회 확대"),
      bullet("K-Healthcare 브랜드 신뢰도 제고 — 러시아어권 국가 내 한국 의료 인지도 향상"),
      bullet("의료 외교 기반 강화 — 한-카자흐스탄, 한-러시아 보건 협력 모델 수립"),
      bullet("의료 데이터 기반 인사이트 — 암종별·국가별 수요 분석으로 정부 정책 참고 데이터 제공"),
      pageBreak(),

      // ── 7. 향후 계획·확장 로드맵 ──────────────────────────────────────
      h1("7. 향후 계획 및 확장 로드맵"),
      h2("7.1 Phase 2 확장 계획 (2027년)"),
      new Table({
        width: { size: 8506, type: WidthType.DXA }, columnWidths: [1500, 3000, 4006],
        rows: [
          new TableRow({ children: [hCell("시기", 1500), hCell("계획", 3000), hCell("내용", 4006)] }),
          new TableRow({ children: [dCell("2027년 1분기", 1500, { fill: GRAY }), dCell("파트너 병원 확대", 3000), dCell("면력한방병원 외 3~5개 협력 병원 추가 (국내 종합병원)", 4006)] }),
          new TableRow({ children: [dCell("2027년 2분기", 1500, { fill: GRAY }), dCell("지역 확장", 3000), dCell("CIS 권역 추가 (우즈베키스탄, 아제르바이잔, 벨라루스)", 4006)] }),
          new TableRow({ children: [dCell("2027년 3분기", 1500, { fill: GRAY }), dCell("보험 연계", 3000), dCell("현지 의료보험·여행보험 연동 사전 심사 지원", 4006)] }),
          new TableRow({ children: [dCell("2027년 4분기", 1500, { fill: GRAY }), dCell("암 레지스트리", 3000), dCell("외국인 환자 암 치료 결과 데이터 축적·분석", 4006)] }),
        ]
      }),
      ...space(1),
      h2("7.2 기술 고도화 로드맵"),
      bullet("AI 진단 보조: 영상 기록(CT/MRI) AI 1차 분석 — 방사선 전문의 참조용"),
      bullet("실시간 의료 통역: AI 화상 내 실시간 완전 통역 (현재 자막 → 음성 합성)"),
      bullet("모바일 앱: iOS/Android 네이티브 앱 출시 — 환자 편의성 극대화"),
      bullet("EMR 연동: 파트너 병원 EMR 시스템 API 연동 — 의료 기록 원클릭 전달"),

      pageBreak(),

      // ── 8. 결론·제언 ─────────────────────────────────────────────────
      h1("8. 결론 및 제언"),
      h2("8.1 결론"),
      body("본 사업을 통해 (주)본로이는 ICT 기반 외국인 암환자 사전상담·사후관리 지원 플랫폼 HEALO를 성공적으로 구축하였다."),
      body("AI 챗봇(3-Tier RAG), LiveKit 화상 협진, 6개 언어 다국어 인터페이스, AES-256-GCM 전면 암호화를 통해 CIS 지역 암환자의 한국 의료관광 접근성을 획기적으로 개선하는 플랫폼 기반을 확보하였다."),
      tbd("최종 KPI 달성 수치 및 구체적 성과 서술 추가"),
      ...space(1),
      h2("8.2 제언"),
      bullet("정부 지속 지원: ICT 의료관광 플랫폼의 지속적 고도화를 위한 후속 과제 지정 건의"),
      bullet("규제 환경 개선: 외국인 환자 원격 의료 진료 의견서 법적 지위 명확화"),
      bullet("데이터 공유: 외국인 환자 암 치료 데이터 KHIDI 공유를 통한 정책 참고 자료 활용"),
      bullet("의료관광 전문 인력: CIS 권역 의료관광 코디네이터 전문 자격증 제도 신설 건의"),
      ...space(2),
      new Paragraph({
        spacing: { before: 240, after: 60 },
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: BLUE, space: 2 } },
        children: [new TextRun({ text: "문서 관리 정보", size: 20, bold: true, color: BLUE, font: "맑은 고딕" })]
      }),
      new Table({
        width: { size: 8506, type: WidthType.DXA }, columnWidths: [2126, 2126, 2127, 2127],
        rows: [
          new TableRow({ children: [dCell("문서 번호", 2126, { fill: GRAY, bold: true }), dCell("HEALO-2026-DOC-05", 2126), dCell("작성자", 2127, { fill: GRAY, bold: true }), dCell("본로이 PM", 2127)] }),
          new TableRow({ children: [dCell("버전", 2126, { fill: GRAY, bold: true }), dCell("v0.1 [예정 골격]", 2126), dCell("작성일", 2127, { fill: GRAY, bold: true }), dCell("2026-04-30 (골격)", 2127)] }),
          new TableRow({ children: [dCell("상태", 2126, { fill: GRAY, bold: true }), dCell("예정 — 2026년 11월 완성", 2126), dCell("보안등급", 2127, { fill: GRAY, bold: true }), dCell("내부 기밀", 2127)] }),
        ]
      }),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("C:/Users/user/Desktop/HEALO_KHIDI/docs/government-project/05_최종보고서.docx", buffer);
  console.log("05_최종보고서.docx 생성 완료");
}).catch(err => { console.error(err); process.exit(1); });
