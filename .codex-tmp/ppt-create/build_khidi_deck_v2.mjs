import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const W = 1280;
const H = 720;
const TMP = "C:\\Users\\user\\Desktop\\HEALO_KHIDI\\.codex-tmp\\ppt-create-v2";
const OUT = "C:\\Users\\user\\Documents\\테플러\\2025 정부지원과제\\02. 본로이\\03. 진행 중\\12. ICT 기반 외국인환자 사전상담·사후관리 지원 사업\\02. 진행서류\\09. 중간평가\\02. 중간보고 제출 자료\\01. 작업본\\중간평가_발표자료_codex_v2_260901.pptx";

const A = {
  home: "C:\\Users\\user\\Documents\\테플러\\2025 정부지원과제\\02. 본로이\\03. 진행 중\\12. ICT 기반 외국인환자 사전상담·사후관리 지원 사업\\02. 진행서류\\09. 중간평가\\03. 화면 사진_260820\\01_홈_러시아어.png",
  kzHome: "C:\\Users\\user\\Documents\\테플러\\2025 정부지원과제\\02. 본로이\\03. 진행 중\\12. ICT 기반 외국인환자 사전상담·사후관리 지원 사업\\02. 진행서류\\09. 중간평가\\03. 화면 사진_260820\\02_홈_카자흐어.png",
  remote: "C:\\Users\\user\\Documents\\테플러\\2025 정부지원과제\\02. 본로이\\03. 진행 중\\12. ICT 기반 외국인환자 사전상담·사후관리 지원 사업\\02. 진행서류\\09. 중간평가\\02. 중간보고 제출 자료\\01. 작업본\\image_20260804_15.01.40.png",
  opinion: "C:\\Users\\user\\Documents\\테플러\\2025 정부지원과제\\02. 본로이\\03. 진행 중\\12. ICT 기반 외국인환자 사전상담·사후관리 지원 사업\\02. 진행서류\\09. 중간평가\\02. 중간보고 제출 자료\\01. 작업본\\소견서_healwith_개인정보가림_260831_claude.png",
  education: "C:\\Users\\user\\Documents\\테플러\\2025 정부지원과제\\02. 본로이\\03. 진행 중\\12. ICT 기반 외국인환자 사전상담·사후관리 지원 사업\\02. 진행서류\\09. 중간평가\\03. 화면 사진_260820\\51_교육콘텐츠_암종5종.png",
  risk: "C:\\Users\\user\\Documents\\테플러\\2025 정부지원과제\\02. 본로이\\03. 진행 중\\12. ICT 기반 외국인환자 사전상담·사후관리 지원 사업\\02. 진행서류\\09. 중간평가\\03. 화면 사진_260820\\50_증상_AI위험도판정.png",
  partner: "C:\\Users\\user\\Documents\\테플러\\2025 정부지원과제\\02. 본로이\\03. 진행 중\\12. ICT 기반 외국인환자 사전상담·사후관리 지원 사업\\02. 진행서류\\09. 중간평가\\02. 중간보고 제출 자료\\01. 작업본\\협의사진_SAULYK_260826_claude.png",
};

const C = {
  bg: "#FFFFFF",
  ink: "#111111",
  muted: "#6B7280",
  pale: "#F5F6F8",
  line: "#D8DEE8",
  dark: "#24272B",
  blue: "#2563EB",
  teal: "#07847F",
  red: "#B42318",
  amber: "#A15C07",
  green: "#287D3C",
};
const font = "Malgun Gothic";

function shape(slide, geometry, left, top, width, height, fill = C.pale, line = "none", extra = {}) {
  return slide.shapes.add({
    geometry,
    position: { left, top, width, height },
    fill,
    line: line === "none" ? { style: "solid", fill: "none", width: 0 } : line,
    ...extra,
  });
}

function text(slide, value, left, top, width, height, opts = {}) {
  const t = slide.shapes.add({
    geometry: "textbox",
    position: { left, top, width, height },
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  t.text = value;
  t.text.style = {
    typeface: font,
    fontSize: opts.size ?? 22,
    bold: opts.bold ?? false,
    color: opts.color ?? C.ink,
    alignment: opts.align ?? "left",
    verticalAlignment: opts.valign ?? "top",
    autoFit: opts.autoFit ?? "shrinkText",
    lineSpacing: opts.lineSpacing ?? 1.12,
    wrap: "square",
    insets: { top: 0, right: 0, bottom: 0, left: 0 },
  };
  return t;
}

function header(slide, title, sub, n) {
  text(slide, title, 64, 48, 1030, 58, { size: 34, bold: true, autoFit: "none" });
  if (sub) text(slide, sub, 66, 112, 900, 28, { size: 17, color: C.muted, autoFit: "none" });
  text(slide, String(n).padStart(2, "0"), 1172, 54, 44, 24, { size: 14, color: C.muted, align: "right" });
  shape(slide, "line", 64, 156, 1152, 0, "none", { style: "solid", fill: C.line, width: 1 });
}

function foot(slide, v = "기준: 2026-08-31 실측 및 사용자 제공 자료") {
  text(slide, v, 64, 666, 800, 20, { size: 11, color: "#8290A2", autoFit: "none" });
}

function notes(slide, body, sources) {
  slide.speakerNotes.textFrame.setText([...body, "", "[Sources]", ...sources].join("\n"));
  slide.speakerNotes.setVisible(true);
}

async function image(slide, p, left, top, width, height, alt, fit = "cover") {
  try {
    const bytes = await fs.readFile(p);
    slide.images.add({
      blob: bytes,
      contentType: "image/png",
      alt,
      fit,
      position: { left, top, width, height },
    });
  } catch {
    shape(slide, "rect", left, top, width, height, C.pale, { style: "solid", fill: C.line, width: 1 });
    text(slide, "[이미지 확인 필요]", left + 20, top + height / 2 - 14, width - 40, 28, { size: 18, color: C.muted, align: "center" });
  }
}

function bigMetric(slide, x, value, label, color = C.ink) {
  text(slide, value, x, 238, 240, 62, { size: 48, bold: true, color, align: "center" });
  shape(slide, "line", x + 42, 318, 156, 0, "none", { style: "solid", fill: color, width: 3 });
  text(slide, label, x, 346, 240, 64, { size: 18, color: C.muted, align: "center" });
}

function oneLine(slide, t, color = C.ink) {
  text(slide, t, 110, 558, 1060, 42, { size: 25, bold: true, color, align: "center" });
}

function threeItem(slide, items) {
  items.forEach((it, i) => {
    const x = 88 + i * 394;
    text(slide, it.k, x, 208, 70, 34, { size: 24, bold: true, color: it.color });
    text(slide, it.h, x, 260, 300, 34, { size: 25, bold: true });
    text(slide, it.b, x, 315, 300, 100, { size: 18, color: C.muted });
  });
}

function timeline(slide, items) {
  shape(slide, "line", 150, 342, 980, 0, "none", { style: "solid", fill: C.line, width: 2 });
  items.forEach((it, i) => {
    const x = 165 + i * 365;
    shape(slide, "ellipse", x, 330, 24, 24, it.color, "none");
    text(slide, it.month, x - 35, 250, 90, 34, { size: 28, bold: true, align: "center" });
    text(slide, it.h, x - 105, 386, 250, 32, { size: 22, bold: true, align: "center" });
    text(slide, it.b, x - 110, 430, 260, 70, { size: 17, color: C.muted, align: "center" });
  });
}

function qa(slide, y, q, a) {
  text(slide, q, 110, y, 450, 42, { size: 23, bold: true });
  text(slide, a, 650, y, 500, 58, { size: 18, color: C.muted });
  shape(slide, "line", 110, y + 88, 1040, 0, "none", { style: "solid", fill: C.line, width: 1 });
}

async function build() {
  await fs.mkdir(TMP, { recursive: true });
  const deck = Presentation.create({ slideSize: { width: W, height: H } });

  let s = deck.slides.add();
  s.background.fill = C.dark;
  text(s, "HEALO", 64, 52, 220, 30, { size: 20, bold: true, color: "#FFFFFF" });
  text(s, "중간평가", 64, 245, 420, 70, { size: 58, bold: true, color: "#FFFFFF" });
  text(s, "구축은 끝났고,\n이제 유치 전환을 검증합니다", 64, 340, 820, 118, { size: 40, bold: true, color: "#FFFFFF", lineSpacing: 1.08 });
  shape(s, "line", 66, 500, 170, 0, "none", { style: "solid", fill: "#FFFFFF", width: 2 });
  text(s, "카자흐스탄 암환자 대상 ICT 기반 사전상담·사후관리 통합 의료연계 서비스", 66, 532, 840, 28, { size: 18, color: "#D9DEE8" });
  text(s, "주관 본로이 · 참여 면력한방병원, 신촌면력한방병원 · 발표일 [확인 필요]", 66, 620, 760, 24, { size: 14, color: "#C6CDD8" });
  notes(s, [
    "오늘 발표는 유치 실적 0건을 감추지 않고 시작합니다.",
    "다만 플랫폼 구축과 상담 운영, 파트너 접점은 이미 실체가 있고, 남은 기간에는 전환 검증에 집중하겠습니다.",
  ], ["사용자 제공 KHIDI_중간보고_코덱스_프롬프트.md"]);

  s = deck.slides.add();
  header(s, "오늘 답해야 할 질문은 하나입니다", "잔금 30%를 투입해 유치 전환을 검증할 만큼 기반이 만들어졌는가", 2);
  text(s, "정량은 낮습니다.", 90, 230, 340, 60, { size: 38, bold: true, color: C.red });
  text(s, "하지만 구축 실체는 있습니다.", 90, 304, 520, 60, { size: 38, bold: true, color: C.green });
  text(s, "그래서 남은 발표는\n‘성과 포장’이 아니라\n‘전환 가능성 검증계획’입니다.", 670, 230, 470, 160, { size: 34, bold: true, lineSpacing: 1.16 });
  oneLine(s, "계속 지원 판단의 기준을 이 문장으로 정리합니다.");
  foot(s, "근거: 중간평가 계획(안), 사용자 제공 자료");
  notes(s, [
    "이 발표의 핵심 질문은 단순합니다.",
    "정량 실적이 낮은 상황에서, 그래도 잔여기간 지원을 통해 전환 검증까지 갈 수 있는 기반이 만들어졌는가입니다.",
    "따라서 성과를 포장하지 않고, 기반과 보완계획을 분리해 설명하겠습니다.",
  ], ["중간평가 계획(안)", "사용자 제공 프롬프트 §2, §8"]);

  s = deck.slides.add();
  header(s, "현재 상태는 네 숫자로 충분합니다", "위원이 먼저 볼 숫자를 숨기지 않습니다", 3);
  bigMetric(s, 95, "0건", "유치 확정\n목표 12건", C.red);
  bigMetric(s, 365, "6건", "실문의\n시험데이터 제외", C.blue);
  bigMetric(s, 635, "7건", "사전상담·소견\n실측 합계", C.teal);
  bigMetric(s, 905, "20.7만", "소스코드 LOC\n운영시스템 규모", C.green);
  oneLine(s, "정량 전환은 미달, 구축과 상담 처리 기반은 확인된 상태입니다.");
  foot(s);
  notes(s, [
    "숫자는 네 개만 먼저 제시합니다.",
    "유치 확정은 0건이고, 시험데이터를 제외한 실제 문의는 6건입니다.",
    "그 안에서 사전상담과 의료진 소견 전달 7건이 집계됐고, 플랫폼은 20.7만 LOC 규모까지 구축됐습니다.",
  ], ["사용자 제공 프롬프트 §3-1, §3-4, §4-1"]);

  s = deck.slides.add();
  header(s, "성과지표는 달성보다 해석이 중요합니다", "0은 0으로 두고, 표본 부족은 표본 부족으로 둡니다", 4);
  const rows = [
    ["외국인환자 유치", "12건", "0건", "미달"],
    ["사전·사후관리", "120건", "7건", "5.8%"],
    ["만족도", "90점", "2건 응답", "참고치"],
    ["ICT 체계 구축", "플랫폼 고도화", "완료·운영 중", "달성"],
  ];
  rows.forEach((r, i) => {
    const y = 205 + i * 72;
    shape(s, "line", 100, y + 58, 1080, 0, "none", { style: "solid", fill: C.line, width: 1 });
    text(s, r[0], 100, y, 310, 32, { size: 22, bold: true });
    text(s, r[1], 475, y, 170, 32, { size: 22, color: C.muted });
    text(s, r[2], 680, y, 190, 32, { size: 24, bold: true, color: i === 0 ? C.red : C.ink });
    text(s, r[3], 930, y, 190, 32, { size: 22, bold: true, color: i === 3 ? C.green : i === 0 ? C.red : C.muted });
  });
  oneLine(s, "이 자료의 설득은 낮은 숫자를 바꾸는 데 있지 않고, 낮은 이유와 다음 조치를 맞추는 데 있습니다.");
  foot(s);
  notes(s, [
    "정량지표는 솔직하게 제시합니다.",
    "만족도 98점 환산은 표본 2건이므로 달성으로 말하지 않습니다.",
    "대신 ICT 체계 구축은 완료·운영 중으로 평가 가능한 정성지표입니다.",
  ], ["사용자 제공 프롬프트 §3-1, §3-3, §3-4"]);

  s = deck.slides.add();
  header(s, "플랫폼은 실제 화면으로 증명합니다", "보고서 문장보다 작동 화면이 더 빠르게 설득합니다", 5);
  await image(s, A.home, 70, 190, 540, 320, "러시아어 HEALO 웹 화면", "cover");
  await image(s, A.kzHome, 645, 190, 240, 320, "카자흐어 HEALO 화면", "cover");
  await image(s, A.risk, 920, 190, 260, 145, "AI 위험도 판정 화면", "contain");
  await image(s, A.education, 920, 365, 260, 145, "암종별 교육 콘텐츠 화면", "contain");
  oneLine(s, "6개 언어, AI 상담, 원격협진, 사후관리 화면이 이미 같은 서비스 안에서 작동합니다.");
  foot(s, "근거: 로컬 플랫폼 화면 캡처");
  notes(s, [
    "이 장에서는 설명을 줄이고 실제 화면을 보여줍니다.",
    "러시아어와 카자흐어 화면, AI 위험도 판정, 교육 콘텐츠 화면을 통해 정성 구축 실적을 증명합니다.",
  ], ["사용자 제공 프롬프트 §4-2", "로컬 화면 캡처 폴더"]);

  s = deck.slides.add();
  header(s, "개발은 ‘웹페이지 제작’ 수준이 아닙니다", "운영·보안·품질관리까지 포함된 업무 시스템입니다", 6);
  bigMetric(s, 88, "229", "API\n엔드포인트", C.blue);
  bigMetric(s, 332, "140", "화면\n6개 언어 적용", C.teal);
  bigMetric(s, 576, "159", "DB\n마이그레이션", C.amber);
  bigMetric(s, 820, "213", "테스트\n파일", C.green);
  text(s, "성과 자동집계 · RLS 권한 · AES-256-GCM 암호화 · AI 품질 자동 채점", 160, 505, 960, 34, { size: 25, bold: true, align: "center" });
  foot(s);
  notes(s, [
    "플랫폼 구축 실적은 코드 규모뿐 아니라 운영 품질로 설명해야 합니다.",
    "API, 화면, DB 변경이력, 테스트 파일이 있고, 성과 자동집계와 개인정보 보호, AI 품질 자동 채점까지 포함합니다.",
  ], ["사용자 제공 프롬프트 §4-1, §4-2"]);

  s = deck.slides.add();
  header(s, "사전상담은 병원 검토까지 실제로 닫혔습니다", "실적은 작지만 업무 흐름은 한 바퀴 돌았습니다", 7);
  text(s, "의무기록 접수", 90, 220, 240, 34, { size: 25, bold: true });
  text(s, "번역·정리", 90, 315, 240, 34, { size: 25, bold: true });
  text(s, "의료진 회신", 90, 410, 240, 34, { size: 25, bold: true });
  text(s, "환자 언어 전달", 90, 505, 260, 34, { size: 25, bold: true });
  [280, 375, 470].forEach((y) => text(s, "↓", 175, y, 40, 26, { size: 24, bold: true, color: C.blue, align: "center" }));
  await image(s, A.opinion, 460, 190, 680, 360, "개인정보 가림 처리된 의료진 소견서", "contain");
  oneLine(s, "유치 전 단계의 핵심 운영 흐름은 실제 환자 문의로 검증됐습니다.");
  foot(s);
  notes(s, [
    "사전상담 7건은 작지만, 의무기록 접수부터 환자 언어 전달까지 실제 프로세스가 닫혔다는 의미가 있습니다.",
    "오른쪽 소견서 이미지는 개인정보를 가린 증빙입니다.",
  ], ["사용자 제공 프롬프트 §3-1, §4-4", "소견서_healwith_개인정보가림_260831_claude.png"]);

  s = deck.slides.add();
  header(s, "원격협진은 법적 범위를 지켜 실증했습니다", "현재는 진료가 아니라 사전상담·정보제공입니다", 8);
  await image(s, A.remote, 70, 190, 620, 355, "원격협진 화상상담 캡처", "cover");
  text(s, "말할 수 있는 것", 760, 225, 320, 34, { size: 26, bold: true, color: C.green });
  text(s, "사전상담\n정보 제공\n치료 가능성 검토\n플랫폼 화상상담 실증", 760, 272, 360, 130, { size: 23, lineSpacing: 1.25 });
  text(s, "말하면 안 되는 것", 760, 440, 320, 34, { size: 26, bold: true, color: C.red });
  text(s, "온라인 진료 제공\n초진·처방 수행", 760, 487, 360, 80, { size: 23, lineSpacing: 1.25 });
  foot(s);
  notes(s, [
    "원격협진은 강점이지만 표현을 조심해야 합니다.",
    "현재 단계에서는 온라인 진료가 아니라 사전상담과 정보 제공 범위에서 실증했다고 설명합니다.",
    "진료 주체는 유치의료기관 소속 의사이고 HEALO는 플랫폼과 유치업자입니다.",
  ], ["사용자 제공 프롬프트 §5, §6", "원격협진 캡처"]);

  s = deck.slides.add();
  header(s, "유입 경로도 일부는 계약으로 전환됐습니다", "집계는 보수적으로 잡아도 외부 접점은 있습니다", 9);
  bigMetric(s, 115, "15건", "해외 파트너 회의\n회의록 보유", C.blue);
  bigMetric(s, 385, "4건", "계약·MOU\nMedicaTour, UMIT 등", C.teal);
  bigMetric(s, 655, "8곳", "시스템 등록 병원", C.green);
  bigMetric(s, 925, "16건", "파트너 화상 미팅\n완료 2·예정 14", C.amber);
  await image(s, A.partner, 355, 470, 570, 96, "SAULYK 협의 사진", "contain");
  oneLine(s, "유치가 아직 없다는 사실과 별개로, 환자 유입 경로를 만들기 위한 접점은 형성됐습니다.");
  foot(s);
  notes(s, [
    "파트너 숫자는 과장하지 않고 보수적으로 제시합니다.",
    "해외 파트너 회의 15건, 계약·MOU 4건, 시스템 등록 병원 8곳, 파트너 화상 미팅 16건입니다.",
  ], ["사용자 제공 프롬프트 §4-4"]);

  s = deck.slides.add();
  header(s, "그런데 왜 유치가 0건인가", "핵심은 변명이 아니라 타깃과 채널의 재설정입니다", 10);
  threeItem(s, [
    { k: "01", h: "고난도 환자 편중", b: "장기이식·말기암 등 단기 유치로 전환하기 어려운 문의가 먼저 들어왔습니다.", color: C.red },
    { k: "02", h: "기존 송출망 고착", b: "현지 에이전시는 이미 한국 파트너 또는 인도·튀르키예 선택지를 갖고 있었습니다.", color: C.amber },
    { k: "03", h: "비급여 보험 한계", b: "비급여 비용이 보험 보장으로 연결되지 않으면 환자 결정이 지연됩니다.", color: C.blue },
  ]);
  oneLine(s, "따라서 답은 ‘더 열심히’가 아니라 ‘전환 가능한 모수’를 다시 만드는 것입니다.");
  foot(s);
  notes(s, [
    "유치 0건의 원인은 세 가지로 압축합니다.",
    "고난도 환자 편중, 기존 송출망 고착, 비급여 보험 한계입니다.",
    "이 세 가지가 다음 실행계획의 근거가 됩니다.",
  ], ["사용자 제공 프롬프트 §3-4, §4-4", "사용자 제공 대화 맥락"]);

  s = deck.slides.add();
  header(s, "하반기 실행은 환자군·채널·비용장벽을 동시에 바꿉니다", "유치 가능한 문의 모수를 먼저 키워야 합니다", 11);
  threeItem(s, [
    { k: "A", h: "환자군 재설정", b: "종합검진·조기암·국내 체류 외국인까지 넓혀 단기 전환 가능성을 높입니다.", color: C.green },
    { k: "B", h: "직접 유입", b: "현지 검색광고와 러시아·CIS 콘텐츠로 에이전시 의존도를 낮춥니다.", color: C.blue },
    { k: "C", h: "보험 채널", b: "Madanes 등 보험 가입자 연계와 보험 안내 페이지로 비용장벽을 줄입니다.", color: C.teal },
  ]);
  oneLine(s, "목표는 홍보량이 아니라 전환 가능한 실문의의 증가입니다.");
  foot(s);
  notes(s, [
    "남은 기간의 실행계획은 세 갈래입니다.",
    "전환 가능한 환자군으로 바꾸고, 직접 유입 채널을 만들고, 보험 채널을 통해 비용장벽을 줄입니다.",
  ], ["사용자 제공 프롬프트 §4-4, §5"]);

  s = deck.slides.add();
  header(s, "9~11월은 전환 검증 일정입니다", "확정 성과처럼 말하지 않고, 단계별 검증으로 말합니다", 12);
  timeline(s, [
    { month: "9월", h: "모수 확대", b: "검색광고·콘텐츠 집행\n환자군 테스트", color: C.blue },
    { month: "10월", h: "첫 전환 검증", b: "실환자 안내 적용\n만족도 수집 개시", color: C.teal },
    { month: "11월", h: "최종 정리", b: "유치·상담·사후관리\n실적과 증빙 정리", color: C.amber },
  ]);
  oneLine(s, "평가 전 표현은 ‘확정’보다 ‘검증’이 안전합니다.");
  foot(s, "사업기간: 2026년 4월 ~ 2026년 11월 20일");
  notes(s, [
    "일정은 성과를 확정한 것처럼 말하지 않습니다.",
    "9월 모수 확대, 10월 첫 전환 검증, 11월 최종 정리로 제시합니다.",
  ], ["사용자 제공 프롬프트 §1, §4"]);

  s = deck.slides.add();
  header(s, "사업비는 확인된 숫자만 씁니다", "총 집행률은 회계자료 확정 전까지 비워 두는 편이 안전합니다", 13);
  bigMetric(s, 115, "87,500천원", "총사업비", C.ink);
  bigMetric(s, 385, "70,000천원", "정부출연금", C.blue);
  bigMetric(s, 655, "17,500천원", "자부담", C.teal);
  bigMetric(s, 925, "0원", "외주 개발비\n자체 개발", C.green);
  text(s, "확인된 것: 홍보비·비목 변경 사전승인, 회계법인 중간정산 제출", 170, 490, 940, 30, { size: 23, bold: true, align: "center" });
  text(s, "확인 필요: 실제 이체, 해외 클라우드 원화 청구액, 총 집행률, 회계검토 결과", 170, 536, 940, 30, { size: 20, color: C.red, align: "center" });
  foot(s);
  notes(s, [
    "사업비는 숫자 오류가 가장 위험합니다.",
    "총사업비, 정부출연금, 자부담, 외주 개발비 0원은 제시하고, 총 집행률은 회계자료 확인 전까지 비워두겠습니다.",
  ], ["사용자 제공 프롬프트 §1, §4-5"]);

  s = deck.slides.add();
  header(s, "계속 지원의 근거는 ‘완료된 기반’과 ‘수정된 실행계획’입니다", "유치 실적 0건 자체를 부정하지 않습니다", 14);
  text(s, "완료된 기반", 115, 220, 340, 40, { size: 30, bold: true, color: C.green });
  text(s, "플랫폼 구축\n6개 언어\n원격협진 실증\n의료진 소견 전달\n파트너 접점", 115, 285, 360, 170, { size: 26, lineSpacing: 1.28 });
  shape(s, "line", 620, 210, 0, 285, "none", { style: "solid", fill: C.line, width: 2 });
  text(s, "수정된 실행계획", 730, 220, 360, 40, { size: 30, bold: true, color: C.blue });
  text(s, "환자군 재설정\n직접 유입 확대\n보험 채널 보완\n사후관리 실증\n성과 증빙 정리", 730, 285, 380, 170, { size: 26, lineSpacing: 1.28 });
  oneLine(s, "잔여기간 지원은 구축비가 아니라 유치 전환 검증비로 설명해야 합니다.");
  foot(s);
  notes(s, [
    "계속 지원을 요청하는 이유는 이미 모든 지표가 좋기 때문이 아닙니다.",
    "구축 기반은 완료됐고, 미달 원인에 맞춰 실행계획을 수정했기 때문입니다.",
    "잔여기간 지원은 구축비가 아니라 유치 전환 검증비로 설명합니다.",
  ], ["사용자 제공 프롬프트 §2, §8"]);

  s = deck.slides.add();
  header(s, "가장 어려운 질문은 먼저 답합니다", "길게 변명하지 않고, 인정 후 계획으로 연결합니다", 15);
  qa(s, 210, "유치 0건인데 계속 지원 가치가 있습니까?", "0건은 인정합니다. 다만 실문의 6건에서 의무기록 접수와 의료진 검토까지 운영 흐름을 검증했고, 남은 기간에는 환자군·채널·보험 장벽을 조정해 전환 가능한 모수를 만들겠습니다.");
  qa(s, 355, "기존 에이전시와 무엇이 다릅니까?", "일회성 송출 중개가 아니라 사전상담, 의무기록 번역, 원격협진, 사후관리, 성과집계를 하나의 운영 데이터로 묶습니다.");
  qa(s, 500, "지원금 대비 산출이 무엇입니까?", "20.7만 LOC, API 229개, 화면 140개, DB 마이그레이션 159개, 테스트 213개 규모의 운영 시스템을 자체 개발했습니다.");
  foot(s);
  notes(s, [
    "질의응답의 핵심 세 가지를 발표 안에서 먼저 답합니다.",
    "유치 0건, 기존 에이전시와의 차별성, 지원금 대비 산출입니다.",
  ], ["사용자 제공 프롬프트 §7, §8"]);

  s = deck.slides.add();
  header(s, "발표 전에는 빈칸을 억지로 채우지 않습니다", "확인되지 않은 숫자는 점수보다 신뢰를 먼저 깎습니다", 16);
  const checks = [
    "평가일 최종 확정",
    "참여기관 치료·사후관리·만족도 실적",
    "협약서 서명 원본 보관 여부",
    "홍보비 실제 이체 실행 여부",
    "클라우드 원화 청구액",
    "총 집행률 및 회계검토 결과",
    "소모품비 집행 여부",
    "키르기스스탄 환자 실적 인정 여부",
  ];
  checks.forEach((c, i) => {
    const x = i < 4 ? 130 : 690;
    const y = 210 + (i % 4) * 86;
    shape(s, "rect", x, y + 7, 18, 18, C.bg, { style: "solid", fill: "#95A1B2", width: 1.5 });
    text(s, c, x + 38, y, 440, 38, { size: 22 });
  });
  oneLine(s, "확인 전 숫자를 만들지 않는 것이 이 발표의 신뢰입니다.");
  foot(s);
  notes(s, [
    "마지막은 발표 전 확인 필요 항목입니다.",
    "확인되지 않은 숫자를 채우면 오히려 평가 리스크가 커집니다.",
    "참여기관 실적과 회계검토 결과를 우선 확인해야 합니다.",
  ], ["사용자 제공 프롬프트 §3-2, §4-5, §7"]);

  await fs.writeFile(path.join(TMP, "source-notes.txt"), "Primary source: KHIDI_중간보고_코덱스_프롬프트.md\nVisual assets: local screenshots under 중간평가 folders\n", "utf8");

  for (const [i, slide] of deck.slides.items.entries()) {
    const stem = `slide-${i + 1}`;
    const png = await deck.export({ slide, format: "png", scale: 1 });
    await fs.writeFile(path.join(TMP, `${stem}.png`), new Uint8Array(await png.arrayBuffer()));
    const layout = await slide.export({ format: "layout" });
    await fs.writeFile(path.join(TMP, `${stem}.layout.json`), await layout.text(), "utf8");
  }
  const montage = await deck.export({ format: "webp", montage: true, scale: 1 });
  await fs.writeFile(path.join(TMP, "montage.webp"), new Uint8Array(await montage.arrayBuffer()));
  const pptx = await PresentationFile.exportPptx(deck);
  await pptx.save(OUT);
}

build().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
