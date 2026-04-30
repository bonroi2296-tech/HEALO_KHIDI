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
function heading3(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 160, after: 60 },
    children: [new TextRun({ text, bold: true, size: 22, color: "333333", font: "맑은 고딕" })] });
}
function body(text) {
  return new Paragraph({ spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, size: 20, font: "맑은 고딕" })] });
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
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true, font: "맑은 고딕" },
        paragraph: { spacing: { before: 160, after: 60 }, outlineLevel: 2 } },
    ]
  },
  sections: [{
    properties: {
      page: { size: { width: 11906, height: 16838 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1800 } }
    },
    headers: { default: new Header({ children: [new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 1 } },
      children: [new TextRun({ text: "HEALO 플랫폼 | 중간보고서  |  2026년 4~8월", size: 16, color: "666666", font: "맑은 고딕" })]
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
        children: [new TextRun({ text: "중  간  보  고  서", size: 52, bold: true, color: BLUE, font: "맑은 고딕" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 480 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BLUE, space: 2 } },
        children: [new TextRun({ text: "Progress Report (Mid-term) — HEALO Platform", size: 24, color: "444444", font: "맑은 고딕" })] }),
      ...space(2),
      new Table({
        width: { size: 7000, type: WidthType.DXA }, alignment: AlignmentType.CENTER,
        columnWidths: [2200, 4800],
        rows: [
          new TableRow({ children: [
            new TableCell({ borders: noBorders, width: { size: 2200, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "사 업 명", size: 20, bold: true, color: BLUE, font: "맑은 고딕" })] })] }),
            new TableCell({ borders: noBorders, width: { size: 4800, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "ICT 기반 외국인환자 사전상담·사후관리 지원사업", size: 20, font: "맑은 고딕" })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: noBorders, width: { size: 2200, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "보 고 일 자", size: 20, bold: true, color: BLUE, font: "맑은 고딕" })] })] }),
            new TableCell({ borders: noBorders, width: { size: 4800, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "2026년 8월 [예정 — 실제 제출 시 갱신]", size: 20, font: "맑은 고딕" })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: noBorders, width: { size: 2200, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "기준 일자", size: 20, bold: true, color: BLUE, font: "맑은 고딕" })] })] }),
            new TableCell({ borders: noBorders, width: { size: 4800, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "2026년 4월 30일 (착수 후 1개월 시점)", size: 20, font: "맑은 고딕" })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: noBorders, width: { size: 2200, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "주 관 기 관", size: 20, bold: true, color: BLUE, font: "맑은 고딕" })] })] }),
            new TableCell({ borders: noBorders, width: { size: 4800, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "(주)본로이 (Bonroi)", size: 20, font: "맑은 고딕" })] })] }),
          ]}),
        ]
      }),
      ...space(4),
      pageBreak(),

      // ── 1. 진척률 요약 ────────────────────────────────────────────────
      heading1("1. 사업 진척률 요약"),
      heading2("1.1 전체 진척률"),
      body("기준일 2026년 4월 30일 기준, 전체 기능 구현 진척률은 74% (완료) + 26% (부분구현)로, 미구현 기능은 없다."),
      body("사업 기간 기준 진척률: 4월/8개월 = 12.5% (초기 단계)이나, 기능 구현은 사전 개발로 74% 완료 상태."),
      ...space(1),
      new Table({
        width: { size: 8506, type: WidthType.DXA }, columnWidths: [2200, 1800, 4506],
        rows: [
          new TableRow({ children: [hCell("구분", 2200), hCell("비율", 1800), hCell("주요 기능", 4506)] }),
          new TableRow({ children: [dCell("완료", 2200, { fill: "E8F5E9", bold: true }), dCell("74% (17/23 기능)", 1800, { center: true, fill: "E8F5E9" }), dCell("인증·RBAC, AI챗봇 3-Tier RAG, 인테이크, LiveKit 화상상담, 병원매칭, 문서업로드, AES암호화, 관리자·코디네이터 대시보드, 이메일 알림, RAG 엔진", 4506)] }),
          new TableRow({ children: [dCell("부분 완료", 2200, { fill: "FFF9C4", bold: true }), dCell("26% (6/23 기능)", 1800, { center: true, fill: "FFF9C4" }), dCell("화상 내 실시간 번역 자막, 예약 리마인더 자동화, 사후관리 AI 감지, 러시아어·카자흐어 UI 완성, 실시간 푸시 알림", 4506)] }),
          new TableRow({ children: [dCell("미구현", 2200, { fill: "E8F5E9" }), dCell("0%", 1800, { center: true }), dCell("모든 기능 최소 부분 구현 상태", 4506)] }),
        ]
      }),
      ...space(1),
      heading2("1.2 기능 그룹별 진척 현황"),
      new Table({
        width: { size: 8506, type: WidthType.DXA }, columnWidths: [700, 2500, 1500, 3806],
        rows: [
          new TableRow({ children: [hCell("ID", 700), hCell("기능 그룹", 2500), hCell("상태", 1500), hCell("비고", 3806)] }),
          new TableRow({ children: [dCell("FN-AUTH", 700), dCell("인증·RBAC·게스트 토큰", 2500), dCell("완료", 1500, { center: true, fill: "E8F5E9" }), dCell("middleware.js, src/lib/auth 완성", 3806)] }),
          new TableRow({ children: [dCell("FN-INTAKE", 700), dCell("암환자 인테이크 폼", 2500), dCell("완료", 1500, { center: true, fill: "E8F5E9" }), dCell("5-Step + AES-256-GCM 암호화, 평문 컬럼 완전 삭제", 3806)] }),
          new TableRow({ children: [dCell("FN-ATTACH", 700), dCell("의료문서 업로드", 2500), dCell("완료", 1500, { center: true, fill: "E8F5E9" }), dCell("/api/attachments, Supabase Storage", 3806)] }),
          new TableRow({ children: [dCell("FN-MATCH", 700), dCell("병원·의료진 매칭", 2500), dCell("완료", 1500, { center: true, fill: "E8F5E9" }), dCell("pgvector 기반 RAG 검색", 3806)] }),
          new TableRow({ children: [dCell("FN-VIDEO", 700), dCell("LiveKit 화상상담", 2500), dCell("완료", 1500, { center: true, fill: "E8F5E9" }), dCell("세션 생성·참여·게스트 토큰 모두 완성", 3806)] }),
          new TableRow({ children: [dCell("FN-CHAT", 700), dCell("AI 챗봇·코디네이터 이관", 2500), dCell("완료", 1500, { center: true, fill: "E8F5E9" }), dCell("3-Tier RAG + Gemini 2.5 Flash", 3806)] }),
          new TableRow({ children: [dCell("FN-TRANS", 700), dCell("번역 (채팅/화상)", 2500), dCell("부분완료", 1500, { center: true, fill: "FFF9C4" }), dCell("채팅 번역 API 완성, 화상 자막 통합 미완", 3806)] }),
          new TableRow({ children: [dCell("FN-SCHED", 700), dCell("예약·일정 관리", 2500), dCell("부분완료", 1500, { center: true, fill: "FFF9C4" }), dCell("UI 완성, 자동 리마인더 미완", 3806)] }),
          new TableRow({ children: [dCell("FN-VISA", 700), dCell("비자·교육 지원", 2500), dCell("완료", 1500, { center: true, fill: "E8F5E9" }), dCell("/patient/visa, /patient/education 완성", 3806)] }),
          new TableRow({ children: [dCell("FN-CARE", 700), dCell("사후관리·증상 모니터링", 2500), dCell("부분완료", 1500, { center: true, fill: "FFF9C4" }), dCell("UI 완성, AI 자동 감지 미완", 3806)] }),
          new TableRow({ children: [dCell("FN-I18N", 700), dCell("다국어 6개 언어", 2500), dCell("부분완료", 1500, { center: true, fill: "FFF9C4" }), dCell("ko/en 완성, ru/kz 부분 완성, zh/ja 기본", 3806)] }),
          new TableRow({ children: [dCell("FN-COORD", 700), dCell("코디네이터 시스템", 2500), dCell("완료", 1500, { center: true, fill: "E8F5E9" }), dCell("/coordinator/* 전체 완성", 3806)] }),
          new TableRow({ children: [dCell("FN-ADMIN", 700), dCell("관리자 대시보드", 2500), dCell("완료", 1500, { center: true, fill: "E8F5E9" }), dCell("/admin/*, /partner/* 완성", 3806)] }),
          new TableRow({ children: [dCell("FN-NOTIF", 700), dCell("알림·메시지", 2500), dCell("부분완료", 1500, { center: true, fill: "FFF9C4" }), dCell("이메일 완성, 실시간 푸시 부분", 3806)] }),
          new TableRow({ children: [dCell("FN-RAG", 700), dCell("3-Tier RAG 엔진", 2500), dCell("완료", 1500, { center: true, fill: "E8F5E9" }), dCell("HEALO DB + HIRA + Google Grounding", 3806)] }),
          new TableRow({ children: [dCell("FN-SEC", 700), dCell("보안·암호화", 2500), dCell("완료", 1500, { center: true, fill: "E8F5E9" }), dCell("AES-256-GCM, Rate Limit, RLS 전체 완성", 3806)] }),
        ]
      }),
      pageBreak(),

      // ── 2. KPI 진행 상황 ─────────────────────────────────────────────
      heading1("2. KPI 진행 상황"),
      heading2("2.1 핵심 KPI 현황"),
      body("2026년 4월 30일 기준 — 시스템 구축 단계이므로 운영 KPI는 측정 전 상태이다."),
      ...space(1),
      new Table({
        width: { size: 8506, type: WidthType.DXA }, columnWidths: [400, 2500, 1500, 1500, 2606],
        rows: [
          new TableRow({ children: [hCell("번호", 400), hCell("KPI", 2500), hCell("목표", 1500), hCell("현재", 1500), hCell("상태 및 계획", 2606)] }),
          new TableRow({ children: [dCell("K-01", 400), dCell("외국인 환자 유치 건수", 2500, { bold: true }), dCell("10건", 1500, { center: true }), dCell("0건", 1500, { center: true, fill: "FFF9C4" }), dCell("7월 시범 운영 개시 후 집중 달성", 2606)] }),
          new TableRow({ children: [dCell("K-02", 400), dCell("원격 상담 건수", 2500, { bold: true }), dCell("80건", 1500, { center: true }), dCell("0건", 1500, { center: true, fill: "FFF9C4" }), dCell("9~10월 운영 기간 집중 달성 계획", 2606)] }),
          new TableRow({ children: [dCell("K-03", 400), dCell("서비스 만족도", 2500, { bold: true }), dCell("80점", 1500, { center: true }), dCell("[TBD]", 1500, { center: true, fill: "F5F5F5" }), dCell("운영 시작 후 설문 측정 예정", 2606)] }),
        ]
      }),
      ...space(1),
      body("현 단계 KPI 미달성은 정상 — 사업 초기(착수 1개월) 시스템 구축 집중 기간이며, 7월 시범 운영 개시를 통해 KPI 달성 기간 진입 예정."),
      ...space(1),
      heading2("2.2 기술 지표 현황"),
      new Table({
        width: { size: 8506, type: WidthType.DXA }, columnWidths: [400, 3000, 1500, 3606],
        rows: [
          new TableRow({ children: [hCell("번호", 400), hCell("지표", 3000), hCell("목표치", 1500), hCell("현황", 3606)] }),
          new TableRow({ children: [dCell("T-01", 400), dCell("AI 챗봇 응답 정확도", 3000), dCell("90% 이상", 1500, { center: true }), dCell("내부 샘플 테스트 진행 중 [TBD]", 3606, { fill: "FFF9C4" })] }),
          new TableRow({ children: [dCell("T-02", 400), dCell("화상상담 연결 성공률", 3000), dCell("95% 이상", 1500, { center: true }), dCell("LiveKit 구현 완료 — 시범 운영 시 측정 예정", 3606, { fill: "E8F5E9" })] }),
          new TableRow({ children: [dCell("T-04", 400), dCell("시스템 가동률 (Uptime)", 3000), dCell("99.5% 이상", 1500, { center: true }), dCell("Vercel 자동 배포 + GitLab 백업 — SLA 충족 중", 3606, { fill: "E8F5E9" })] }),
          new TableRow({ children: [dCell("T-05", 400), dCell("보안 취약점 (Critical)", 3000), dCell("0건", 1500, { center: true }), dCell("0건 — AES-256-GCM 암호화, RLS 정책 완비", 3606, { fill: "E8F5E9" })] }),
        ]
      }),
      pageBreak(),

      // ── 3. 주요 성과 ─────────────────────────────────────────────────
      heading1("3. 주요 성과"),
      heading2("3.1 구현 완료 핵심 기능"),
      heading3("3.1.1 AI 챗봇 — 3-Tier RAG 아키텍처"),
      body("Gemini 2.5 Flash 기반 AI 챗봇에 3단계 정보 검색 아키텍처를 구현하였다."),
      bullet("Tier 1 (HEALO 자체 DB): pgvector 기반 병원·치료 정보 임베딩 검색 — 가장 정확하고 신뢰도 높은 소스"),
      bullet("Tier 2 (HIRA/Naver): 건강보험심사평가원 및 네이버 의료 정보 외부 API 연동"),
      bullet("Tier 3 (Google Search Grounding): 최신 의료 정보 실시간 검색 보완"),
      body("결과: 암종별 전문 상담, 병원 추천, 치료 비용 안내, 입국 절차 안내 가능."),
      ...space(1),
      heading3("3.1.2 LiveKit 화상 협진 시스템"),
      bullet("WebRTC 기반 암호화 화상 통화 — 환자·코디네이터·의료진 동시 참여 지원"),
      bullet("게스트 토큰 링크로 회원가입 없이 화상 참여 가능 (진입 장벽 최소화)"),
      bullet("consultation_sessions 테이블에 상담 이력 자동 기록"),
      ...space(1),
      heading3("3.1.3 암환자 인테이크 폼 (5-Step)"),
      bullet("5단계 진행형 폼 — 기본정보 → 암정보 → 의료기록 업로드 → 희망 치료 → 동의·제출"),
      bullet("AES-256-GCM 암호화: 성명·연락처·주소 등 PII 전체 암호화 저장 (평문 컬럼 완전 삭제)"),
      bullet("6개 언어 메타 정보: ko/en/ru/kz/zh/ja 다국어 지원"),
      ...space(1),
      heading3("3.1.4 다국어 6개 언어 인프라"),
      bullet("i18n 시스템: 한국어, 영어, 러시아어, 카자흐어, 중국어, 일본어"),
      bullet("URL 기반 언어 라우팅: /ru, /kk 전용 라우트"),
      bullet("콘텐츠 번역: DB의 i18n JSONB 컬럼 기반 병원·치료 정보 다국어 제공"),
      ...space(1),
      heading3("3.1.5 보안 인프라"),
      bullet("AES-256-GCM 암호화 — src/lib/security/encryptionV2.ts"),
      bullet("RBAC 4개 역할 — 환자/코디네이터/관리자/파트너병원"),
      bullet("Rate Limiting — 공개 API 엔드포인트 과부하 방지"),
      bullet("server-only 모듈 격리 — service_role 키 클라이언트 노출 원천 차단"),
      ...space(1),
      heading2("3.2 암종별 전문 페이지 구축"),
      body("면력한방병원 데이터 기반 6개 암종 전문 치료 페이지 완성:"),
      bullet("간암, 폐암, 위암, 대장암, 유방암, 전립선암 — 각 암종별 한방 치료 설명, 병원 소개, 의료진 정보"),
      bullet("SEO 최적화: Yandex(러시아) + Google 양방향 메타 태그, hreflang, Structured Data"),
      pageBreak(),

      // ── 4. 이슈·해결 사항 ────────────────────────────────────────────
      heading1("4. 이슈 및 해결 사항"),
      heading2("4.1 주요 이슈 및 해결 사례"),
      body("사업 진행 중 발생한 주요 기술·운영 이슈와 해결 결과를 기록한다."),
      ...space(1),
      new Table({
        width: { size: 8506, type: WidthType.DXA }, columnWidths: [400, 2200, 2000, 3906],
        rows: [
          new TableRow({ children: [hCell("번호", 400), hCell("이슈", 2200), hCell("영향", 2000), hCell("해결 및 사례 학습", 3906)] }),
          new TableRow({ children: [dCell("I-01", 400), dCell("vercel.json 스키마 위반", 2200, { bold: true }), dCell("전체 배포 실패", 2000, { fill: "FFEBEE" }), dCell("_crons_memo 비표준 필드 제거 완료. vercel.json 사전 검증 스크립트(pre-push hook) 추가로 재발 방지", 3906)] }),
          new TableRow({ children: [dCell("I-02", 400), dCell("Gemini 모델 업그레이드", 2200, { bold: true }), dCell("성능 향상 기회", 2000, { fill: "E8F5E9" }), dCell("Gemini 2.5 Flash에서 Gemini 3 Flash로 업그레이드 완료. @ai-sdk/google 표준 인터페이스로 1개 파일만 수정", 3906)] }),
          new TableRow({ children: [dCell("I-03", 400), dCell("평문 PII 컬럼 잔존", 2200, { bold: true }), dCell("보안 위험 H등급", 2000, { fill: "FFEBEE" }), dCell("migrations/20260420_drop_*_plaintext 마이그레이션으로 모든 평문 PII 컬럼 완전 삭제. 암호화 전환 완료", 3906)] }),
          new TableRow({ children: [dCell("I-04", 400), dCell("Turbopack 빌드 오류", 2200, { bold: true }), dCell("CI/CD 간헐 실패", 2000, { fill: "FFF9C4" }), dCell("빌드 명령 npx next build --webpack 고정. Turbopack은 dev 서버 전용으로 분리", 3906)] }),
          new TableRow({ children: [dCell("I-05", 400), dCell("홈 디자인 A/B 테스트", 2200, { bold: true }), dCell("UX 최적화 필요", 2000, { fill: "E8F5E9" }), dCell("LEGACY vs PREMIUM 2개 디자인 버전 토글 UI 구현. 사용자 반응 측정 후 하나로 통합 예정", 3906)] }),
          new TableRow({ children: [dCell("I-06", 400), dCell("GitLab 미러 백업", 2200, { bold: true }), dCell("단일 장애점 위험", 2000, { fill: "E8F5E9" }), dCell("main 브랜치 푸시 시 GitLab 자동 미러링 워크플로우 구현. 오프사이트 백업 확보", 3906)] }),
        ]
      }),
      ...space(1),
      heading2("4.2 현재 미해결 이슈"),
      new Table({
        width: { size: 8506, type: WidthType.DXA }, columnWidths: [400, 2500, 1500, 4106],
        rows: [
          new TableRow({ children: [hCell("번호", 400), hCell("이슈", 2500), hCell("우선순위", 1500), hCell("계획", 4106)] }),
          new TableRow({ children: [dCell("P-01", 400), dCell("화상 내 실시간 자막 번역 미완성", 2500), dCell("높음", 1500, { center: true, fill: "FFEBEE" }), dCell("5월 말 완성 목표 — translate API에 LiveKit 스트림 통합", 4106)] }),
          new TableRow({ children: [dCell("P-02", 400), dCell("예약 리마인더 자동화 미완성", 2500), dCell("중간", 1500, { center: true, fill: "FFF9C4" }), dCell("6월 완성 목표 — Supabase CRON 또는 외부 스케줄러 활용", 4106)] }),
          new TableRow({ children: [dCell("P-03", 400), dCell("러시아어·카자흐어 UI 미완성", 2500), dCell("높음", 1500, { center: true, fill: "FFEBEE" }), dCell("6월 완성 목표 — i18n 번역 키 전체 보완, 의료 통역사 검토", 4106)] }),
          new TableRow({ children: [dCell("P-04", 400), dCell("의료기관 인증 추진 중", 2500), dCell("중간", 1500, { center: true, fill: "FFF9C4" }), dCell("면력한방병원 자체 추진 — 가산점 3점 확보 목표", 4106)] }),
        ]
      }),
      pageBreak(),

      // ── 5. 예산 집행 ─────────────────────────────────────────────────
      heading1("5. 예산 집행 현황"),
      heading2("5.1 예산 집행 개요"),
      body("사업 예산 집행 현황은 다음과 같다. 실제 수치는 사업비 확정 후 갱신 예정이다."),
      ...space(1),
      new Table({
        width: { size: 8506, type: WidthType.DXA }, columnWidths: [2000, 2000, 2000, 2506],
        rows: [
          new TableRow({ children: [hCell("예산 항목", 2000), hCell("계획 (원)", 2000), hCell("집행 (원)", 2000), hCell("비고", 2506)] }),
          new TableRow({ children: [dCell("인건비", 2000), dCell("[TBD]", 2000, { center: true }), dCell("[TBD]", 2000, { center: true }), dCell("PM 및 개발자 인건비", 2506)] }),
          new TableRow({ children: [dCell("인프라 비용", 2000), dCell("[TBD]", 2000, { center: true }), dCell("[TBD]", 2000, { center: true }), dCell("Vercel, Supabase, LiveKit Cloud, Gemini API", 2506)] }),
          new TableRow({ children: [dCell("마케팅·홍보", 2000), dCell("[TBD]", 2000, { center: true }), dCell("[TBD]", 2000, { center: true }), dCell("CIS 채널 광고, SEO 작업", 2506)] }),
          new TableRow({ children: [dCell("의료 자문비", 2000), dCell("[TBD]", 2000, { center: true }), dCell("[TBD]", 2000, { center: true }), dCell("면력한방병원 콘텐츠 검토비", 2506)] }),
          new TableRow({ children: [dCell("번역비", 2000), dCell("[TBD]", 2000, { center: true }), dCell("[TBD]", 2000, { center: true }), dCell("러시아어·카자흐어 전문 번역", 2506)] }),
          new TableRow({ children: [dCell("기타", 2000), dCell("[TBD]", 2000, { center: true }), dCell("[TBD]", 2000, { center: true }), dCell("출장비, 보험료 등", 2506)] }),
          new TableRow({ children: [dCell("합계", 2000, { bold: true, fill: LIGHT_BLUE }), dCell("[TBD]", 2000, { center: true, fill: LIGHT_BLUE }), dCell("[TBD]", 2000, { center: true, fill: LIGHT_BLUE }), dCell("사업비 확정 시 갱신", 2506, { fill: LIGHT_BLUE })] }),
        ]
      }),
      body("※ 인프라 실비 현황: Vercel Pro (월 $20), Supabase Pro (월 $25), LiveKit Cloud (사용량 기반), Gemini API (사용량 기반) — 시범 운영 전 낮은 수준 유지"),
      pageBreak(),

      // ── 6. 잔여 기간 계획 ───────────────────────────────────────────
      heading1("6. 잔여 기간 계획"),
      heading2("6.1 Phase 잔여 기능 개발 계획"),
      ...space(1),
      new Table({
        width: { size: 8506, type: WidthType.DXA }, columnWidths: [1500, 3000, 2000, 2006],
        rows: [
          new TableRow({ children: [hCell("기간", 1500), hCell("개발 과제", 3000), hCell("담당", 2000), hCell("완성 기준", 2006)] }),
          new TableRow({ children: [dCell("5월", 1500, { fill: GRAY }), dCell("화상 내 실시간 번역 자막 통합", 3000), dCell("개발팀", 2000), dCell("화상 중 자막 표시 E2E 동작", 2006)] }),
          new TableRow({ children: [dCell("5월", 1500, { fill: GRAY }), dCell("러시아어·카자흐어 UI 전면 완성", 3000), dCell("개발팀", 2000), dCell("/ru, /kk 전 페이지 번역 완료", 2006)] }),
          new TableRow({ children: [dCell("6월", 1500, { fill: GRAY }), dCell("예약 리마인더 자동화", 3000), dCell("개발팀", 2000), dCell("예약 D-1 이메일·알림 자동 발송", 2006)] }),
          new TableRow({ children: [dCell("6월", 1500, { fill: GRAY }), dCell("사후관리 AI 이상징후 감지", 3000), dCell("개발팀", 2000), dCell("증상 입력 시 위험도 자동 평가", 2006)] }),
          new TableRow({ children: [dCell("6월", 1500, { fill: GRAY }), dCell("보안 침투 테스트", 3000), dCell("외부 + 내부", 2000), dCell("Critical 취약점 0건 확인", 2006)] }),
          new TableRow({ children: [dCell("7월", 1500, { fill: GRAY }), dCell("코디네이터 인력 투입 및 교육", 3000), dCell("PM", 2000), dCell("코디네이터 1명 이상 배치 완료", 2006)] }),
          new TableRow({ children: [dCell("7~8월", 1500, { fill: GRAY }), dCell("시범 환자 유치 (목표 5건)", 3000), dCell("PM + 마케팅", 2000), dCell("시범 상담 5건 이상 진행", 2006)] }),
          new TableRow({ children: [dCell("9~10월", 1500, { fill: GRAY }), dCell("본격 운영 — 상담 80건 달성", 3000), dCell("코디네이터 + PM", 2000), dCell("KPI 80건 달성", 2006)] }),
          new TableRow({ children: [dCell("11월", 1500, { fill: GRAY }), dCell("최종보고 준비 및 성과 측정", 3000), dCell("PM", 2000), dCell("최종보고서 KHIDI 제출", 2006)] }),
        ]
      }),
      ...space(1),
      heading2("6.2 잔여 개발 우선순위"),
      bullet("[P1 최우선] 화상 내 실시간 번역 자막 — 핵심 차별화 기능, 5월 집중"),
      bullet("[P1 최우선] 러시아어·카자흐어 UI 완성 — 주요 타깃 언어, SEO 연계"),
      bullet("[P2 중요] 예약 리마인더 자동화 — 환자 재방문율 향상"),
      bullet("[P2 중요] 사후관리 AI 감지 — 입원 후 관리 서비스 완성"),
      bullet("[P3 보완] 실시간 푸시 알림 완성 — Supabase Realtime 통합"),
      ...space(2),
      new Paragraph({
        spacing: { before: 240, after: 60 },
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: BLUE, space: 2 } },
        children: [new TextRun({ text: "문서 관리 정보", size: 20, bold: true, color: BLUE, font: "맑은 고딕" })]
      }),
      new Table({
        width: { size: 8506, type: WidthType.DXA }, columnWidths: [2126, 2126, 2127, 2127],
        rows: [
          new TableRow({ children: [dCell("문서 번호", 2126, { fill: GRAY, bold: true }), dCell("HEALO-2026-DOC-04", 2126), dCell("작성자", 2127, { fill: GRAY, bold: true }), dCell("본로이 PM", 2127)] }),
          new TableRow({ children: [dCell("버전", 2126, { fill: GRAY, bold: true }), dCell("v0.9 [Draft]", 2126), dCell("작성일", 2127, { fill: GRAY, bold: true }), dCell("2026-04-30", 2127)] }),
          new TableRow({ children: [dCell("상태", 2126, { fill: GRAY, bold: true }), dCell("중간 초안 — 8월 제출 시 갱신", 2126), dCell("보안등급", 2127, { fill: GRAY, bold: true }), dCell("내부 기밀", 2127)] }),
        ]
      }),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("C:/Users/user/Desktop/HEALO_KHIDI/docs/government-project/04_중간보고서.docx", buffer);
  console.log("04_중간보고서.docx 생성 완료");
}).catch(err => { console.error(err); process.exit(1); });
