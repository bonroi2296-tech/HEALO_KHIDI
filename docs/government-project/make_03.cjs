const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
        PageNumber, Header, Footer, PageBreak, LevelFormat } = require('docx');
const fs = require('fs');

// ── 공통 색상 ──────────────────────────────────────────────────────────────
const BLUE = "00467F";
const LIGHT_BLUE = "D5E8F0";
const GRAY = "F5F5F5";
const DARK_GRAY = "333333";

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 120 },
    children: [new TextRun({ text, bold: true, size: 28, color: BLUE, font: "맑은 고딕" })]
  });
}
function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 80 },
    children: [new TextRun({ text, bold: true, size: 24, color: "1F4E79", font: "맑은 고딕" })]
  });
}
function heading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 160, after: 60 },
    children: [new TextRun({ text, bold: true, size: 22, color: DARK_GRAY, font: "맑은 고딕" })]
  });
}
function body(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, size: 20, font: "맑은 고딕", ...opts })]
  });
}
function bullet(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, size: 20, font: "맑은 고딕" })]
  });
}
function space(lines = 1) {
  return Array.from({ length: lines }, () =>
    new Paragraph({ children: [new TextRun({ text: "" })] }));
}
function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function headerCell(text, width) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: BLUE, type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, bold: true, size: 18, color: "FFFFFF", font: "맑은 고딕" })]
    })]
  });
}
function dataCell(text, width, opts = {}) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: opts.fill || "FFFFFF", type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({
      alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({ text: String(text), size: 18, font: "맑은 고딕", bold: opts.bold || false })]
    })]
  });
}

// ── 문서 시작 ────────────────────────────────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [{
      reference: "bullets",
      levels: [{
        level: 0, format: LevelFormat.BULLET, text: "•",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 480, hanging: 240 } } }
      }]
    }]
  },
  styles: {
    default: {
      document: { run: { font: "맑은 고딕", size: 20 } }
    },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "맑은 고딕" },
        paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "맑은 고딕" },
        paragraph: { spacing: { before: 240, after: 80 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true, font: "맑은 고딕" },
        paragraph: { spacing: { before: 160, after: 60 }, outlineLevel: 2 } },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1800 }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 1 } },
          children: [
            new TextRun({ text: "HEALO 플랫폼 | 착수보고서", size: 16, color: "666666", font: "맑은 고딕" }),
            new TextRun({ text: "\t2026년 KHIDI ICT 기반 외국인환자 사전상담·사후관리 지원사업", size: 16, color: "999999", font: "맑은 고딕" })
          ]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          border: { top: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 1 } },
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "(주)본로이 | 기밀문서 — 무단 배포 금지  |  ", size: 16, color: "666666", font: "맑은 고딕" }),
            new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "666666", font: "맑은 고딕" }),
            new TextRun({ text: " / ", size: 16, color: "666666", font: "맑은 고딕" }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: "666666", font: "맑은 고딕" }),
          ]
        })]
      })
    },
    children: [
      // ── 표지 ──────────────────────────────────────────────────────────
      ...space(4),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 120 },
        children: [new TextRun({ text: "2026년 KHIDI 외국인환자 사전상담·사후관리 지원사업", size: 20, color: "666666", font: "맑은 고딕" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 120 },
        children: [new TextRun({ text: "착  수  보  고  서", size: 52, bold: true, color: BLUE, font: "맑은 고딕" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 60, after: 480 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BLUE, space: 2 } },
        children: [new TextRun({ text: "Inception Report — HEALO Platform", size: 24, color: "444444", font: "맑은 고딕" })]
      }),
      ...space(2),
      new Table({
        width: { size: 7000, type: WidthType.DXA },
        alignment: AlignmentType.CENTER,
        columnWidths: [2200, 4800],
        rows: [
          new TableRow({ children: [
            new TableCell({ borders: noBorders, width: { size: 2200, type: WidthType.DXA },
              children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "사 업 명", size: 20, bold: true, color: BLUE, font: "맑은 고딕" })] })] }),
            new TableCell({ borders: noBorders, width: { size: 4800, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun({ text: "ICT 기반 외국인환자 사전상담·사후관리 지원사업", size: 20, font: "맑은 고딕" })] })] })
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: noBorders, width: { size: 2200, type: WidthType.DXA },
              children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "주 관 기 관", size: 20, bold: true, color: BLUE, font: "맑은 고딕" })] })] }),
            new TableCell({ borders: noBorders, width: { size: 4800, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun({ text: "(주)본로이 (Bonroi)", size: 20, font: "맑은 고딕" })] })] })
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: noBorders, width: { size: 2200, type: WidthType.DXA },
              children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "파 트 너 병 원", size: 20, bold: true, color: BLUE, font: "맑은 고딕" })] })] }),
            new TableCell({ borders: noBorders, width: { size: 4800, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun({ text: "면력한방병원", size: 20, font: "맑은 고딕" })] })] })
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: noBorders, width: { size: 2200, type: WidthType.DXA },
              children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "지 원 기 관", size: 20, bold: true, color: BLUE, font: "맑은 고딕" })] })] }),
            new TableCell({ borders: noBorders, width: { size: 4800, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun({ text: "한국보건산업진흥원 (KHIDI)", size: 20, font: "맑은 고딕" })] })] })
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: noBorders, width: { size: 2200, type: WidthType.DXA },
              children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "보 고 일 자", size: 20, bold: true, color: BLUE, font: "맑은 고딕" })] })] }),
            new TableCell({ borders: noBorders, width: { size: 4800, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun({ text: "2026년 4월 30일", size: 20, font: "맑은 고딕" })] })] })
          ]}),
        ]
      }),
      ...space(4),
      pageBreak(),

      // ── 목차 ─────────────────────────────────────────────────────────
      heading1("목  차"),
      new Table({
        width: { size: 8506, type: WidthType.DXA },
        columnWidths: [7000, 1506],
        rows: [
          ["1. 사업 개요 및 목표", "3"],
          ["2. 추진 체계", "5"],
          ["3. 사업 일정 계획", "7"],
          ["4. 위험 관리 계획", "8"],
          ["5. 평가지표 및 KPI", "10"],
          ["6. 착수보고회 결과 요약", "12"],
          ["7. 다음 단계 액션 아이템", "14"],
        ].map(([title, pg]) => new TableRow({ children: [
          new TableCell({ borders: noBorders, width: { size: 7000, type: WidthType.DXA },
            children: [new Paragraph({ children: [new TextRun({ text: title, size: 20, font: "맑은 고딕" })] })] }),
          new TableCell({ borders: noBorders, width: { size: 1506, type: WidthType.DXA },
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: pg, size: 20, font: "맑은 고딕" })] })] }),
        ]}))
      }),
      pageBreak(),

      // ── 1. 사업 개요 및 목표 ──────────────────────────────────────────
      heading1("1. 사업 개요 및 목표"),
      heading2("1.1 사업 배경"),
      body("카자흐스탄·러시아·CIS 지역 암환자는 현지 의료 인프라의 한계로 인해 해외 치료 수요가 높으나, 언어 장벽·정보 비대칭·절차 복잡성으로 인해 한국 의료기관 접근에 어려움을 겪고 있다."),
      body("HEALO 플랫폼은 AI 기반 사전상담 챗봇, LiveKit 화상 원격협진, 다국어(6개 언어) 인터페이스를 통해 이 격차를 해소하고자 한다."),
      ...space(1),
      heading2("1.2 사업 목적"),
      body("본 사업의 목적은 다음과 같다."),
      bullet("ICT 기술을 활용한 외국인 암환자 사전 상담 자동화 — AI 챗봇 24시간 운영"),
      bullet("원격 화상 협진 시스템 구축 — 현지 환자와 한국 의료진 실시간 연결"),
      bullet("입국 전 의료 정보 제공 및 병원 매칭 — 암종별 전문병원 추천"),
      bullet("입국 후 사후관리 지원 — 증상 모니터링·재예약·비자 연장 안내"),
      bullet("카자흐스탄·러시아어 완전 지원 인터페이스 구축"),
      ...space(1),
      heading2("1.3 기대 효과"),
      new Table({
        width: { size: 8506, type: WidthType.DXA },
        columnWidths: [2500, 6006],
        rows: [
          new TableRow({ children: [headerCell("구분", 2500), headerCell("기대 효과", 6006)] }),
          new TableRow({ children: [dataCell("환자", 2500, { fill: LIGHT_BLUE, bold: true }), dataCell("언어 장벽 없이 24시간 AI 상담 → 치료 결정 기간 단축", 6006)] }),
          new TableRow({ children: [dataCell("병원", 2500, { fill: LIGHT_BLUE, bold: true }), dataCell("외국인 환자 유치 채널 확보 → 병원 수익 다각화", 6006)] }),
          new TableRow({ children: [dataCell("정부", 2500, { fill: LIGHT_BLUE, bold: true }), dataCell("의료관광 K-Healthcare 브랜드 제고 및 외화 수입 증대", 6006)] }),
          new TableRow({ children: [dataCell("사회", 2500, { fill: LIGHT_BLUE, bold: true }), dataCell("CIS 한국 의료 신뢰도 향상 및 의료 외교 기반 강화", 6006)] }),
        ]
      }),
      ...space(1),
      heading2("1.4 플랫폼 주요 기능 요약"),
      new Table({
        width: { size: 8506, type: WidthType.DXA },
        columnWidths: [1800, 4706, 2000],
        rows: [
          new TableRow({ children: [headerCell("기능 그룹", 1800), headerCell("설명", 4706), headerCell("구현 현황", 2000)] }),
          new TableRow({ children: [dataCell("인증·권한", 1800), dataCell("소셜·이메일 로그인, RBAC(4개 역할), 게스트 토큰", 4706), dataCell("완료", 2000, { center: true, fill: "E8F5E9" })] }),
          new TableRow({ children: [dataCell("AI 챗봇", 1800), dataCell("Gemini 2.5 Flash + 3-Tier RAG (DB/HIRA/Google)", 4706), dataCell("완료", 2000, { center: true, fill: "E8F5E9" })] }),
          new TableRow({ children: [dataCell("인테이크", 1800), dataCell("5-Step 암환자 정보 수집 + AES-256-GCM 암호화", 4706), dataCell("완료", 2000, { center: true, fill: "E8F5E9" })] }),
          new TableRow({ children: [dataCell("화상 협진", 1800), dataCell("LiveKit WebRTC 기반 원격 화상상담", 4706), dataCell("완료", 2000, { center: true, fill: "E8F5E9" })] }),
          new TableRow({ children: [dataCell("다국어 UI", 1800), dataCell("6개 언어 (ko/en/ru/kz/zh/ja) — i18n 전면 지원", 4706), dataCell("진행 중", 2000, { center: true, fill: "FFF9C4" })] }),
          new TableRow({ children: [dataCell("사후관리", 1800), dataCell("증상 모니터링, 재예약, 비자 연장 안내", 4706), dataCell("부분 완료", 2000, { center: true, fill: "FFF9C4" })] }),
        ]
      }),
      pageBreak(),

      // ── 2. 추진 체계 ──────────────────────────────────────────────────
      heading1("2. 추진 체계"),
      heading2("2.1 추진 조직도"),
      body("본 사업의 추진 조직은 지원기관(KHIDI), 주관기관(본로이), 협력기관(면력한방병원)의 3개 층위로 구성된다."),
      ...space(1),
      new Table({
        width: { size: 8506, type: WidthType.DXA },
        columnWidths: [2835, 2836, 2835],
        rows: [
          new TableRow({ children: [
            new TableCell({
              borders,
              width: { size: 8506, type: WidthType.DXA },
              columnSpan: 3,
              shading: { fill: BLUE, type: ShadingType.CLEAR },
              margins: { top: 100, bottom: 100, left: 120, right: 120 },
              children: [new Paragraph({ alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "지원기관: 한국보건산업진흥원 (KHIDI)", bold: true, size: 20, color: "FFFFFF", font: "맑은 고딕" })] })]
            })
          ]}),
          new TableRow({ children: [
            new TableCell({
              borders,
              width: { size: 8506, type: WidthType.DXA },
              columnSpan: 3,
              shading: { fill: "1F4E79", type: ShadingType.CLEAR },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [new Paragraph({ alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "주관기관: (주)본로이 (Bonroi)", bold: true, size: 20, color: "FFFFFF", font: "맑은 고딕" })] })]
            })
          ]}),
          new TableRow({ children: [
            new TableCell({ borders, width: { size: 2835, type: WidthType.DXA },
              shading: { fill: LIGHT_BLUE, type: ShadingType.CLEAR },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "PM / 총괄", bold: true, size: 18, font: "맑은 고딕" })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "본로이 대표", size: 18, font: "맑은 고딕" })] }),
              ] }),
            new TableCell({ borders, width: { size: 2836, type: WidthType.DXA },
              shading: { fill: LIGHT_BLUE, type: ShadingType.CLEAR },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "기술 개발", bold: true, size: 18, font: "맑은 고딕" })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "풀스택 개발자 (Claude Code AI 보조)", size: 18, font: "맑은 고딕" })] }),
              ] }),
            new TableCell({ borders, width: { size: 2835, type: WidthType.DXA },
              shading: { fill: LIGHT_BLUE, type: ShadingType.CLEAR },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "협력기관", bold: true, size: 18, font: "맑은 고딕" })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "면력한방병원 (의료 콘텐츠·임상 검토)", size: 18, font: "맑은 고딕" })] }),
              ] }),
          ]}),
        ]
      }),
      ...space(1),
      heading2("2.2 역할 분담"),
      new Table({
        width: { size: 8506, type: WidthType.DXA },
        columnWidths: [2000, 2253, 4253],
        rows: [
          new TableRow({ children: [headerCell("구분", 2000), headerCell("담당자", 2253), headerCell("주요 역할", 4253)] }),
          new TableRow({ children: [dataCell("PM", 2000, { fill: GRAY }), dataCell("본로이 대표", 2253), dataCell("사업 총괄, KHIDI 보고, 일정·예산 관리, 최종 의사결정", 4253)] }),
          new TableRow({ children: [dataCell("기술 개발", 2000, { fill: GRAY }), dataCell("풀스택 개발자", 2253), dataCell("Next.js/Supabase 플랫폼 구축, AI 챗봇, LiveKit 통합, 보안 구현", 4253)] }),
          new TableRow({ children: [dataCell("의료 자문", 2000, { fill: GRAY }), dataCell("면력한방병원 의료진", 2253), dataCell("암종별 치료 정보 검토, 의료 콘텐츠 정확성 확인, 시범 화상상담 참여", 4253)] }),
          new TableRow({ children: [dataCell("마케팅", 2000, { fill: GRAY }), dataCell("본로이 (PM 겸직)", 2253), dataCell("러시아어 SEO, CIS 채널 홍보, 환자 유치 채널 운영", 4253)] }),
          new TableRow({ children: [dataCell("코디네이터", 2000, { fill: GRAY }), dataCell("[예정 채용]", 2253), dataCell("환자 상담 전환, 병원 예약 보조, 비자 안내 [Phase B 후반 투입 예정]", 4253)] }),
        ]
      }),
      ...space(1),
      heading2("2.3 기술 스택 및 인프라"),
      new Table({
        width: { size: 8506, type: WidthType.DXA },
        columnWidths: [2000, 6506],
        rows: [
          new TableRow({ children: [headerCell("영역", 2000), headerCell("기술 구성", 6506)] }),
          new TableRow({ children: [dataCell("프론트엔드", 2000, { fill: GRAY }), dataCell("Next.js 16 (App Router) + React + Tailwind CSS", 6506)] }),
          new TableRow({ children: [dataCell("백엔드", 2000, { fill: GRAY }), dataCell("Supabase (PostgreSQL 17.6, RLS, pgvector) + Vercel Serverless API Routes", 6506)] }),
          new TableRow({ children: [dataCell("AI 엔진", 2000, { fill: GRAY }), dataCell("Gemini 2.5 Flash (via @ai-sdk/google) + 3-Tier RAG 아키텍처", 6506)] }),
          new TableRow({ children: [dataCell("화상 통신", 2000, { fill: GRAY }), dataCell("LiveKit Cloud (WebRTC) — 암호화 P2P + SFU", 6506)] }),
          new TableRow({ children: [dataCell("인프라", 2000, { fill: GRAY }), dataCell("Vercel (CDN·자동 배포·Edge Functions) + GitLab 미러 백업", 6506)] }),
          new TableRow({ children: [dataCell("보안", 2000, { fill: GRAY }), dataCell("AES-256-GCM 암호화, RBAC, Rate Limiting, server-only 모듈 격리", 6506)] }),
        ]
      }),
      pageBreak(),

      // ── 3. 사업 일정 계획 ────────────────────────────────────────────────
      heading1("3. 사업 일정 계획"),
      heading2("3.1 전체 마일스톤"),
      body("사업 기간: 2026년 4월 ~ 2026년 11월 (8개월)"),
      ...space(1),
      new Table({
        width: { size: 8506, type: WidthType.DXA },
        columnWidths: [1200, 2500, 4806],
        rows: [
          new TableRow({ children: [headerCell("시기", 1200), headerCell("마일스톤", 2500), headerCell("주요 내용", 4806)] }),
          new TableRow({ children: [dataCell("4월", 1200, { fill: GRAY }), dataCell("사업 착수", 2500, { bold: true }), dataCell("착수보고회 개최, 사업 계획 확정, 기존 플랫폼 기반 개발 시작 공식화", 4806)] }),
          new TableRow({ children: [dataCell("5월", 1200, { fill: GRAY }), dataCell("시스템 고도화 1", 2500), dataCell("화상 내 실시간 번역 자막 통합, 러시아어·카자흐어 UI 완성, 예약 리마인더 자동화", 4806)] }),
          new TableRow({ children: [dataCell("6월", 1200, { fill: GRAY }), dataCell("시스템 고도화 2", 2500), dataCell("사후관리 AI 이상징후 감지, 코디네이터 대시보드 완성, 보안 침투 테스트", 4806)] }),
          new TableRow({ children: [dataCell("7월", 1200, { fill: GRAY }), dataCell("시범 운영 개시", 2500), dataCell("시범 환자 모집 (목표 10건 유치), 코디네이터 인력 투입, 면력한방병원 화상 협진 시작", 4806)] }),
          new TableRow({ children: [dataCell("8월", 1200, { fill: GRAY }), dataCell("중간 점검", 2500), dataCell("중간보고서 KHIDI 제출, KPI 중간 달성률 점검, 시스템 안정화 조치", 4806)] }),
          new TableRow({ children: [dataCell("9~10월", 1200, { fill: GRAY }), dataCell("본격 운영", 2500), dataCell("상담 80건 달성 목표 추진, 만족도 조사 1차 시행, 운영 최적화", 4806)] }),
          new TableRow({ children: [dataCell("11월", 1200, { fill: GRAY }), dataCell("사업 종료", 2500, { bold: true }), dataCell("최종보고서 제출, KPI 최종 달성 보고, 성과 발표, Phase 2 확장 계획 수립", 4806)] }),
        ]
      }),
      ...space(1),
      heading2("3.2 개발 세부 일정 (현재 진행 기준)"),
      body("2026년 4월 30일 기준 구현 완료 기능 (74%): 인증·RBAC·게스트 토큰, AI 챗봇 3-Tier RAG, 인테이크 폼, 화상상담(LiveKit), 병원·치료 매칭, 문서 업로드, 암호화, 관리자·코디네이터 대시보드, 이메일 알림"),
      body("진행 중 기능 (26%): 화상 내 실시간 번역 자막, 예약 리마인더 자동화, 사후관리 AI 감지, 러시아어·카자흐어 UI 전체 완성"),
      pageBreak(),

      // ── 4. 위험 관리 계획 ────────────────────────────────────────────────
      heading1("4. 위험 관리 계획"),
      heading2("4.1 위험 등록부"),
      body("총 8개 위험 항목을 식별하였으며, 각 위험에 대한 영향도(H/M/L)·발생 가능성·대응 전략을 수립하였다."),
      ...space(1),
      new Table({
        width: { size: 8506, type: WidthType.DXA },
        columnWidths: [400, 1800, 800, 800, 4706],
        rows: [
          new TableRow({ children: [headerCell("번호", 400), headerCell("위험 항목", 1800), headerCell("영향도", 800), headerCell("가능성", 800), headerCell("대응 전략", 4706)] }),
          new TableRow({ children: [dataCell("R-01", 400), dataCell("AI 오진 정보 제공 위험", 1800, { bold: true }), dataCell("H", 800, { center: true, fill: "FFEBEE" }), dataCell("M", 800, { center: true }), dataCell("의료 면책 고지 필수 표시, AI 응답에 '의사 상담 권고' 자동 포함, 의료 정보 출처 명시", 4706)] }),
          new TableRow({ children: [dataCell("R-02", 400), dataCell("개인정보 침해 (환자 PII)", 1800, { bold: true }), dataCell("H", 800, { center: true, fill: "FFEBEE" }), dataCell("L", 800, { center: true }), dataCell("AES-256-GCM 암호화 적용, 평문 컬럼 전면 삭제(완료), RLS 정책, 보안 감사 정기 실시", 4706)] }),
          new TableRow({ children: [dataCell("R-03", 400), dataCell("환자 유치 목표 미달성", 1800, { bold: true }), dataCell("H", 800, { center: true, fill: "FFEBEE" }), dataCell("M", 800, { center: true }), dataCell("러시아어 SEO 강화, CIS 현지 파트너 네트워크 구축, SNS 광고 채널 운영, 시범 환자 조기 모집", 4706)] }),
          new TableRow({ children: [dataCell("R-04", 400), dataCell("인프라 장애 (Vercel/Supabase)", 1800, { bold: true }), dataCell("M", 800, { center: true, fill: "FFF9C4" }), dataCell("L", 800, { center: true }), dataCell("GitLab 자동 미러 백업(구현 완료), Vercel 자동 배포, Supabase 일일 백업 활성화", 4706)] }),
          new TableRow({ children: [dataCell("R-05", 400), dataCell("LiveKit 화상 품질 저하", 1800, { bold: true }), dataCell("M", 800, { center: true, fill: "FFF9C4" }), dataCell("M", 800, { center: true }), dataCell("LiveKit Cloud SFU 사용으로 안정성 확보, 연결 불량 시 전화 백업 프로토콜 수립", 4706)] }),
          new TableRow({ children: [dataCell("R-06", 400), dataCell("의료기관 인증 미취득", 1800, { bold: true }), dataCell("M", 800, { center: true, fill: "FFF9C4" }), dataCell("M", 800, { center: true }), dataCell("면력한방병원 국제의료기관 인증 신청 추진 중 [진행 중]. 미취득 시 가산점 3점 미확보", 4706)] }),
          new TableRow({ children: [dataCell("R-07", 400), dataCell("AI 모델 서비스 중단", 1800, { bold: true }), dataCell("M", 800, { center: true, fill: "FFF9C4" }), dataCell("L", 800, { center: true }), dataCell("@ai-sdk/google 표준 인터페이스 사용으로 타 모델(GPT-4o 등) 전환 용이, Fallback 로직 구현", 4706)] }),
          new TableRow({ children: [dataCell("R-08", 400), dataCell("번역 품질 문제 (러·카자흐)", 1800, { bold: true }), dataCell("M", 800, { center: true, fill: "FFF9C4" }), dataCell("M", 800, { center: true }), dataCell("현지 의료 통역사 검토 계획, 머신 번역 + 전문가 교정 이중화, 사용자 오류 신고 기능 추가", 4706)] }),
        ]
      }),
      ...space(1),
      heading2("4.2 위험 대응 원칙"),
      bullet("모든 고위험(H) 항목은 PM이 직접 모니터링하며 월 1회 상태 업데이트"),
      bullet("위험 발생 시 KHIDI 담당자에게 즉시 보고 및 대응 계획 갱신"),
      bullet("보안 위험(R-02)은 SECURITY_CHECKLIST.md 기준 분기별 회귀 테스트 시행"),
      pageBreak(),

      // ── 5. 평가지표 KPI ──────────────────────────────────────────────────
      heading1("5. 평가지표 및 KPI"),
      heading2("5.1 사업 성과 KPI"),
      body("KHIDI 공고 기준 3대 핵심 KPI 및 세부 목표치는 다음과 같다."),
      ...space(1),
      new Table({
        width: { size: 8506, type: WidthType.DXA },
        columnWidths: [400, 2500, 1500, 1500, 2606],
        rows: [
          new TableRow({ children: [headerCell("번호", 400), headerCell("KPI 항목", 2500), headerCell("목표치", 1500), headerCell("현재 달성", 1500), headerCell("비고", 2606)] }),
          new TableRow({ children: [dataCell("K-01", 400), dataCell("외국인 환자 유치 건수", 2500, { bold: true }), dataCell("10건 이상", 1500, { center: true }), dataCell("0건 [시범 준비 중]", 1500, { center: true, fill: "FFF9C4" }), dataCell("7월 시범 운영 개시 후 달성 예정", 2606)] }),
          new TableRow({ children: [dataCell("K-02", 400), dataCell("원격 상담 건수", 2500, { bold: true }), dataCell("80건 이상", 1500, { center: true }), dataCell("0건 [시스템 구축 중]", 1500, { center: true, fill: "FFF9C4" }), dataCell("시스템 완성 후 9~10월 집중 달성 계획", 2606)] }),
          new TableRow({ children: [dataCell("K-03", 400), dataCell("서비스 만족도", 2500, { bold: true }), dataCell("80점 이상 (100점)", 1500, { center: true }), dataCell("[TBD — 운영 후 조사]", 1500, { center: true, fill: "FFF9C4" }), dataCell("5점 척도 설문 기반, 운영 후 측정", 2606)] }),
        ]
      }),
      ...space(1),
      heading2("5.2 기술 지표"),
      new Table({
        width: { size: 8506, type: WidthType.DXA },
        columnWidths: [400, 3000, 1500, 1500, 2106],
        rows: [
          new TableRow({ children: [headerCell("번호", 400), headerCell("기술 지표", 3000), headerCell("목표치", 1500), headerCell("현재 수준", 1500), headerCell("측정 방법", 2106)] }),
          new TableRow({ children: [dataCell("T-01", 400), dataCell("AI 챗봇 응답 정확도", 3000), dataCell("90% 이상", 1500, { center: true }), dataCell("내부 테스트 중", 1500, { center: true, fill: "FFF9C4" }), dataCell("샘플 100건 전문가 평가", 2106)] }),
          new TableRow({ children: [dataCell("T-02", 400), dataCell("화상상담 연결 성공률", 3000), dataCell("95% 이상", 1500, { center: true }), dataCell("LiveKit 구현 완료", 1500, { center: true, fill: "E8F5E9" }), dataCell("시범 운영 시 모니터링", 2106)] }),
          new TableRow({ children: [dataCell("T-03", 400), dataCell("인테이크 완료율", 3000), dataCell("70% 이상", 1500, { center: true }), dataCell("[TBD — 운영 후]", 1500, { center: true, fill: "FFF9C4" }), dataCell("Supabase Analytics", 2106)] }),
          new TableRow({ children: [dataCell("T-04", 400), dataCell("시스템 가동률 (Uptime)", 3000), dataCell("99.5% 이상", 1500, { center: true }), dataCell("Vercel SLA 기준", 1500, { center: true, fill: "E8F5E9" }), dataCell("Vercel 대시보드", 2106)] }),
          new TableRow({ children: [dataCell("T-05", 400), dataCell("보안 취약점 (Critical)", 3000), dataCell("0건", 1500, { center: true }), dataCell("0건 [현재]", 1500, { center: true, fill: "E8F5E9" }), dataCell("분기별 보안 테스트", 2106)] }),
        ]
      }),
      ...space(1),
      heading2("5.3 KPI 달성 전략"),
      bullet("환자 유치(K-01): 러시아어 SEO 최적화(Yandex 대응), CIS 현지 커뮤니티 소셜 마케팅, 면력한방병원 소개 채널 활용"),
      bullet("상담 건수(K-02): AI 챗봇 24시간 무중단 운영, 낮은 진입 장벽(회원가입 불필요 게스트 상담), LiveKit 화상 협진으로 깊이 있는 상담 전환"),
      bullet("만족도(K-03): 다국어 UI 완성, 신속 응답(AI 자동화), 전담 코디네이터 배치, 상담 후 피드백 수집 자동화"),
      pageBreak(),

      // ── 6. 착수보고회 결과 요약 ──────────────────────────────────────────
      heading1("6. 착수보고회 결과 요약"),
      heading2("6.1 보고회 개요"),
      new Table({
        width: { size: 8506, type: WidthType.DXA },
        columnWidths: [2000, 6506],
        rows: [
          new TableRow({ children: [dataCell("일시", 2000, { fill: GRAY, bold: true }), dataCell("2026년 4월 중 [일시 확인 필요 — TBD]", 6506)] }),
          new TableRow({ children: [dataCell("장소", 2000, { fill: GRAY, bold: true }), dataCell("한국보건산업진흥원 회의실 또는 온라인 (Zoom/화상)", 6506)] }),
          new TableRow({ children: [dataCell("참석자", 2000, { fill: GRAY, bold: true }), dataCell("KHIDI 담당자, 본로이 PM, 면력한방병원 담당자", 6506)] }),
          new TableRow({ children: [dataCell("발표 내용", 2000, { fill: GRAY, bold: true }), dataCell("사업 개요, 플랫폼 현황 데모, 개발 일정, KPI 계획, 위험 관리", 6506)] }),
          new TableRow({ children: [dataCell("자료 제출", 2000, { fill: GRAY, bold: true }), dataCell("사업계획서, 착수보고서 초안, 플랫폼 라이브 URL (healo.kr)", 6506)] }),
        ]
      }),
      ...space(1),
      heading2("6.2 주요 결정사항"),
      body("착수보고회에서 확인된 주요 결정사항은 다음과 같다."),
      bullet("사업 일정 확정: 2026년 4월 착수 → 11월 종료 (8개월)"),
      bullet("KPI 목표치 확인: 유치 10건, 상담 80건, 만족도 80점"),
      bullet("파트너 병원 역할: 면력한방병원이 의료 콘텐츠 검토 및 화상 협진 참여"),
      bullet("보고 체계: 월 1회 진행 보고, 중간보고(8월), 최종보고(11월)"),
      bullet("의료기관 인증: 면력한방병원 국제 인증 추진 여부 검토 요청 [진행 중]"),
      ...space(1),
      heading2("6.3 KHIDI 피드백 및 요구사항"),
      body("[착수보고회 실제 참석 후 기재 — 현재 TBD]"),
      body("주요 피드백 영역 (예상):"),
      bullet("환자 개인정보 처리 방침 구체화 및 PIPA 준수 방안 제출"),
      bullet("의료 광고 심의 관련 법적 검토 결과 제출"),
      bullet("러시아어 콘텐츠 의료 번역 전문가 검토 증빙 계획"),
      ...space(1),
      heading2("6.4 후속 조치 사항"),
      new Table({
        width: { size: 8506, type: WidthType.DXA },
        columnWidths: [400, 3500, 2000, 2606],
        rows: [
          new TableRow({ children: [headerCell("번호", 400), headerCell("조치 사항", 3500), headerCell("담당", 2000), headerCell("기한", 2606)] }),
          new TableRow({ children: [dataCell("A-01", 400), dataCell("개인정보 처리방침 최종본 제출", 3500), dataCell("본로이 PM", 2000), dataCell("2026년 5월", 2606)] }),
          new TableRow({ children: [dataCell("A-02", 400), dataCell("면력한방병원 협약서(MOU) 체결", 3500), dataCell("본로이 PM + 면력", 2000), dataCell("2026년 5월", 2606)] }),
          new TableRow({ children: [dataCell("A-03", 400), dataCell("화상 내 실시간 번역 자막 개발 완료", 3500), dataCell("개발팀", 2000), dataCell("2026년 5월 말", 2606)] }),
          new TableRow({ children: [dataCell("A-04", 400), dataCell("러시아어·카자흐어 UI 전체 완성", 3500), dataCell("개발팀", 2000), dataCell("2026년 6월", 2606)] }),
          new TableRow({ children: [dataCell("A-05", 400), dataCell("코디네이터 채용 및 교육", 3500), dataCell("본로이 PM", 2000), dataCell("2026년 6~7월", 2606)] }),
          new TableRow({ children: [dataCell("A-06", 400), dataCell("의료기관 인증 신청 추진 [진행 중]", 3500), dataCell("면력한방병원", 2000), dataCell("진행 중", 2606)] }),
        ]
      }),
      pageBreak(),

      // ── 7. 다음 단계 액션 아이템 ─────────────────────────────────────────
      heading1("7. 다음 단계 액션 아이템"),
      heading2("7.1 5월 우선 과제"),
      bullet("화상 내 실시간 번역 자막 기능 개발 완료 (Phase B 최우선 기능)"),
      bullet("러시아어 UI 전면 전환 — /ru 라우트 완성, i18n 누락 키 보완"),
      bullet("예약 리마인더 자동화 — 이메일/알림 발송 스케줄러 구현"),
      bullet("개인정보 처리방침 상세화 및 법적 검토 완료"),
      bullet("면력한방병원 MOU 협약서 체결"),
      ...space(1),
      heading2("7.2 6~7월 과제"),
      bullet("사후관리 AI 이상징후 감지 모듈 개발"),
      bullet("코디네이터 대시보드 완성 및 인력 투입 준비"),
      bullet("보안 침투 테스트 실시 (외부 검토)"),
      bullet("시범 환자 모집 채널 개설 (최소 10명)"),
      bullet("면력한방병원 화상 협진 시범 운영 (1~2회)"),
      ...space(1),
      heading2("7.3 8월 (중간보고 준비)"),
      bullet("KHIDI 중간보고서 작성 및 제출"),
      bullet("KPI 중간 달성률 공식 집계"),
      bullet("시스템 안정화 최종 점검"),
      bullet("만족도 조사 1차 시행 (시범 환자 대상)"),
      ...space(2),
      new Paragraph({
        spacing: { before: 240, after: 60 },
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: BLUE, space: 2 } },
        children: [new TextRun({ text: "문서 관리 정보", size: 20, bold: true, color: BLUE, font: "맑은 고딕" })]
      }),
      new Table({
        width: { size: 8506, type: WidthType.DXA },
        columnWidths: [2126, 2126, 2127, 2127],
        rows: [
          new TableRow({ children: [
            dataCell("문서 번호", 2126, { fill: GRAY, bold: true }),
            dataCell("HEALO-2026-DOC-03", 2126),
            dataCell("작성자", 2127, { fill: GRAY, bold: true }),
            dataCell("본로이 PM", 2127),
          ]}),
          new TableRow({ children: [
            dataCell("버전", 2126, { fill: GRAY, bold: true }),
            dataCell("v1.0", 2126),
            dataCell("작성일", 2127, { fill: GRAY, bold: true }),
            dataCell("2026-04-30", 2127),
          ]}),
          new TableRow({ children: [
            dataCell("상태", 2126, { fill: GRAY, bold: true }),
            dataCell("착수 완료 (사후 정리)", 2126),
            dataCell("보안등급", 2127, { fill: GRAY, bold: true }),
            dataCell("내부 기밀", 2127),
          ]}),
        ]
      }),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("C:/Users/user/Desktop/HEALO_KHIDI/docs/government-project/03_착수보고서.docx", buffer);
  console.log("03_착수보고서.docx 생성 완료");
}).catch(err => { console.error(err); process.exit(1); });
