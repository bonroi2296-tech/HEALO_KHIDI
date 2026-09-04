import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const W = 1280;
const H = 720;
const OUT = "C:\\Users\\user\\Documents\\테플러\\2025 정부지원과제\\02. 본로이\\03. 진행 중\\12. ICT 기반 외국인환자 사전상담·사후관리 지원 사업\\02. 진행서류\\09. 중간평가\\02. 중간보고 제출 자료\\01. 작업본\\중간평가_발표자료_codex_v1_260901.pptx";
const TMP = "C:\\Users\\user\\Desktop\\HEALO_KHIDI\\.codex-tmp\\ppt-create";
const SRC_PROMPT = "C:\\Users\\user\\Downloads\\KHIDI_중간보고_코덱스_프롬프트.md";

const assets = {
  homeRu: "C:\\Users\\user\\Documents\\테플러\\2025 정부지원과제\\02. 본로이\\03. 진행 중\\12. ICT 기반 외국인환자 사전상담·사후관리 지원 사업\\02. 진행서류\\09. 중간평가\\03. 화면 사진_260820\\01_홈_러시아어.png",
  remoteMobile: "C:\\Users\\user\\Documents\\테플러\\2025 정부지원과제\\02. 본로이\\03. 진행 중\\12. ICT 기반 외국인환자 사전상담·사후관리 지원 사업\\02. 진행서류\\09. 중간평가\\03. 화면 사진_260820\\33_원격의료_폰_러시아어.png",
  risk: "C:\\Users\\user\\Documents\\테플러\\2025 정부지원과제\\02. 본로이\\03. 진행 중\\12. ICT 기반 외국인환자 사전상담·사후관리 지원 사업\\02. 진행서류\\09. 중간평가\\03. 화면 사진_260820\\50_증상_AI위험도판정.png",
  education: "C:\\Users\\user\\Documents\\테플러\\2025 정부지원과제\\02. 본로이\\03. 진행 중\\12. ICT 기반 외국인환자 사전상담·사후관리 지원 사업\\02. 진행서류\\09. 중간평가\\03. 화면 사진_260820\\51_교육콘텐츠_암종5종.png",
  opinion: "C:\\Users\\user\\Documents\\테플러\\2025 정부지원과제\\02. 본로이\\03. 진행 중\\12. ICT 기반 외국인환자 사전상담·사후관리 지원 사업\\02. 진행서류\\09. 중간평가\\02. 중간보고 제출 자료\\01. 작업본\\소견서_healwith_개인정보가림_260831_claude.png",
  remoteMeeting: "C:\\Users\\user\\Documents\\테플러\\2025 정부지원과제\\02. 본로이\\03. 진행 중\\12. ICT 기반 외국인환자 사전상담·사후관리 지원 사업\\02. 진행서류\\09. 중간평가\\02. 중간보고 제출 자료\\01. 작업본\\image_20260804_15.01.40.png",
  partner: "C:\\Users\\user\\Documents\\테플러\\2025 정부지원과제\\02. 본로이\\03. 진행 중\\12. ICT 기반 외국인환자 사전상담·사후관리 지원 사업\\02. 진행서류\\09. 중간평가\\02. 중간보고 제출 자료\\01. 작업본\\협의사진_SAULYK_260826_claude.png",
};

const C = {
  ink: "#0A0A0A",
  gray900: "#1F2933",
  gray700: "#52606D",
  gray500: "#7B8794",
  gray300: "#D9DEE5",
  gray100: "#F3F5F7",
  gray50: "#F8FAFC",
  blue: "#2F80ED",
  sky: "#DFF3FF",
  teal: "#1B8A82",
  green: "#287D3C",
  amber: "#A45B00",
  red: "#B42318",
  white: "#FFFFFF",
  black: "#000000",
};

const font = "Malgun Gothic";

function addShape(slide, geometry, x, y, w, h, fill = C.gray100, line = "none", extra = {}) {
  return slide.shapes.add({
    geometry,
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: line === "none" ? { style: "solid", fill: "none", width: 0 } : line,
    ...extra,
  });
}

function addText(slide, text, x, y, w, h, opts = {}) {
  const s = slide.shapes.add({
    geometry: "textbox",
    position: { left: x, top: y, width: w, height: h },
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  s.text = text;
  s.text.style = {
    typeface: opts.typeface ?? font,
    fontSize: opts.size ?? 24,
    bold: opts.bold ?? false,
    color: opts.color ?? C.ink,
    alignment: opts.align ?? "left",
    verticalAlignment: opts.valign ?? "top",
    autoFit: opts.autoFit ?? "shrinkText",
    wrap: "square",
    lineSpacing: opts.lineSpacing ?? 1.15,
    insets: opts.insets ?? { top: 0, right: 0, bottom: 0, left: 0 },
  };
  return s;
}

function title(slide, t, sub = "", no = "") {
  addText(slide, t, 54, 40, 1010, 64, { size: 34, bold: true, autoFit: "none" });
  if (sub) addText(slide, sub, 56, 104, 1050, 32, { size: 17, color: C.gray700, autoFit: "none" });
  addText(slide, no, 1180, 42, 46, 28, { size: 13, color: C.gray500, align: "right" });
  addShape(slide, "line", 54, 144, 1172, 0, "none", { style: "solid", fill: C.gray300, width: 1.2 });
}

function note(slide, lines, sources = []) {
  const body = [
    ...lines,
    "",
    "[Sources]",
    ...sources,
  ].join("\n");
  slide.speakerNotes.textFrame.setText(body);
  slide.speakerNotes.setVisible(true);
}

function foot(slide, text = "자료 기준: 2026-08-31 실측 및 사용자 제공 근거") {
  addText(slide, text, 54, 666, 880, 22, { size: 12, color: C.gray500, autoFit: "none" });
}

function metric(slide, x, y, w, h, value, label, color = C.ink) {
  addShape(slide, "roundRect", x, y, w, h, C.gray100, { style: "solid", fill: C.gray300, width: 1 }, { borderRadius: 7 });
  addText(slide, value, x + 20, y + 22, w - 40, 52, { size: 37, bold: true, color, autoFit: "shrinkText" });
  addText(slide, label, x + 20, y + 82, w - 40, h - 96, { size: 16, color: C.gray700 });
}

function labelBox(slide, x, y, w, h, head, body, color = C.ink) {
  addShape(slide, "roundRect", x, y, w, h, C.gray50, { style: "solid", fill: C.gray300, width: 1 }, { borderRadius: 7 });
  addText(slide, head, x + 22, y + 18, w - 44, 30, { size: 21, bold: true, color });
  addText(slide, body, x + 22, y + 56, w - 44, h - 72, { size: 15, color: C.gray700 });
}

function bar(slide, x, y, maxW, label, value, max, color) {
  addText(slide, label, x, y, 185, 28, { size: 16, color: C.gray700 });
  addShape(slide, "rect", x + 190, y + 4, maxW, 18, C.gray100, { style: "solid", fill: "none", width: 0 });
  addShape(slide, "rect", x + 190, y + 4, Math.max(2, maxW * value / max), 18, color, { style: "solid", fill: "none", width: 0 });
  addText(slide, String(value), x + 198 + maxW, y - 2, 70, 28, { size: 15, bold: true, color: C.gray900 });
}

async function addImage(slide, assetPath, x, y, w, h, alt, fit = "cover") {
  try {
    const bytes = await fs.readFile(assetPath);
    slide.images.add({
      blob: bytes,
      contentType: "image/png",
      alt,
      fit,
      position: { left: x, top: y, width: w, height: h },
      geometry: "roundRect",
      borderRadius: 6,
    });
  } catch {
    addShape(slide, "roundRect", x, y, w, h, C.gray100, { style: "solid", fill: C.gray300, width: 1 }, { borderRadius: 6 });
    addText(slide, "[이미지 확인 필요]", x + 20, y + h / 2 - 14, w - 40, 28, { size: 18, color: C.gray500, align: "center" });
  }
}

function processStep(slide, x, y, num, head, body, w = 340) {
  addText(slide, num, x, y, 64, 42, { size: 28, bold: true, color: C.blue });
  addText(slide, head, x + 72, y + 2, w - 72, 32, { size: 21, bold: true });
  addText(slide, body, x + 72, y + 42, w - 72, 74, { size: 15, color: C.gray700 });
}

function qa(slide, x, y, q, a) {
  addText(slide, "Q", x, y, 28, 28, { size: 18, bold: true, color: C.blue });
  addText(slide, q, x + 34, y - 2, 500, 34, { size: 18, bold: true });
  addText(slide, a, x + 34, y + 34, 500, 58, { size: 14, color: C.gray700 });
}

async function build() {
  await fs.mkdir(TMP, { recursive: true });
  const deck = Presentation.create({ slideSize: { width: W, height: H } });

  let s = deck.slides.add();
  s.background.fill = C.gray900;
  addText(s, "HEALO", 54, 42, 220, 42, { size: 23, bold: true, color: C.white, autoFit: "none" });
  addText(s, "정량 부진을 숨기지 않고,\n계속 지원의 근거를 증명합니다", 54, 236, 820, 150, { size: 46, bold: true, color: C.white, lineSpacing: 1.05 });
  addShape(s, "line", 56, 416, 160, 0, "none", { style: "solid", fill: C.white, width: 2 });
  addText(s, "카자흐스탄 암환자 대상 ICT 기반 사전상담·사후관리 통합 의료연계 서비스\n중간평가 발표자료 · 발표일: [확인 필요: 평가일]", 58, 454, 800, 60, { size: 17, color: "#DDE3EA" });
  addText(s, "주관 본로이 · 참여 면력한방병원, 신촌면력한방병원", 58, 628, 760, 26, { size: 14, color: "#C9D1DA" });
  note(s, [
    "오늘 발표의 핵심은 정량 부진을 감추는 것이 아니라, 현재 상태를 사실대로 놓고 계속 지원 판단의 근거를 설명하는 것입니다.",
    "유치 실적은 0건입니다. 다만 구축, 상담, 파트너, 운영통제의 실체가 확인되어 잔여기간 전환 검증으로 넘어갈 기반은 갖췄습니다.",
    "발표는 평가항목 네 가지에 맞춰 사업모델, 추진실적, 향후계획, 성과지표 순서로 설명하겠습니다.",
  ], ["사용자 제공 KHIDI_중간보고_코덱스_프롬프트.md"]);

  s = deck.slides.add();
  title(s, "평가는 ‘계속 지원할 만한가’를 묻습니다", "발표 20분, 질의 10분 안에 네 평가항목을 모두 방어해야 합니다", "02");
  labelBox(s, 70, 190, 260, 160, "사업 목적 및 모델", "당초 범위 준수, 수익모델의 구체성, 유치업자와 의료기관의 역할 구분", C.blue);
  labelBox(s, 365, 190, 260, 160, "사업 추진 실적", "플랫폼 구축, 상담 처리, 파트너 접점, 계약·MOU, 예산 집행 근거", C.teal);
  labelBox(s, 660, 190, 260, 160, "향후 추진계획", "모수 확대, 환자군 재설정, 보험·직접유입 채널, 월별 실행 가능성", C.amber);
  labelBox(s, 955, 190, 260, 160, "성과지표", "유치 0건, 사전·사후관리 7건, 만족도 표본 부족을 정직하게 제시", C.red);
  addText(s, "70점 이상이면 계속 지원 및 잔금 30% 교부, 70점 미만이면 재평가입니다.", 132, 460, 1000, 54, { size: 25, bold: true, align: "center" });
  foot(s, "근거: 중간평가 계획(안), 사용자 제공 프롬프트");
  note(s, [
    "중간평가의 목적은 단순 발표가 아니라 사업 지속 여부와 잔금 지급 여부 판단입니다.",
    "따라서 오늘 자료는 성과를 부풀리는 방식이 아니라, 낮은 정량지표를 인정하면서도 계속 지원의 근거를 만드는 방식으로 구성했습니다.",
    "네 평가항목이 자료 전체에 어떻게 반영되는지 먼저 보여드리겠습니다.",
  ], ["2026년 ICT기반 외국인환자 사전상담 사후관리 지원사업 중간평가 계획(안)_안내용", "사용자 제공 프롬프트 §2"]);

  s = deck.slides.add();
  title(s, "사업은 구축 완료에서 유치 전환 검증으로 이동했습니다", "8월 31일 기준, 플랫폼과 운영 기반은 갖췄고 정량 전환은 아직 미달입니다", "03");
  metric(s, 70, 205, 245, 150, "구축 완료", "6개 언어, 원격협진, AI 상담, 관리자 시스템", C.green);
  metric(s, 345, 205, 245, 150, "7건", "사전상담·소견 전달 실측 합계", C.blue);
  metric(s, 620, 205, 245, 150, "0건", "외국인환자 유치 확정 실측", C.red);
  metric(s, 895, 205, 245, 150, "잔여 3개월", "9~11월 전환 검증 구간", C.amber);
  addText(s, "핵심 판단: ‘만들었는가’는 통과했고, ‘남은 기간에 전환 가능한가’가 평가의 본질입니다.", 92, 470, 1090, 74, { size: 28, bold: true, align: "center" });
  foot(s);
  note(s, [
    "현재 사업의 위치는 명확합니다. 플랫폼 구축 자체는 완료했고 운영도 시작했습니다.",
    "반면 환자 유치 실적은 아직 0건입니다.",
    "따라서 남은 발표의 초점은 유치 0건을 회피하는 것이 아니라, 왜 0건이 발생했고 어떤 방식으로 전환 가능성을 검증할 것인지입니다.",
  ], ["사용자 제공 프롬프트 §3, §4"]);

  s = deck.slides.add();
  title(s, "성과지표는 정성 구축과 정량 전환이 갈라졌습니다", "0은 0으로, 표본 부족은 표본 부족으로 제시합니다", "04");
  const rows = [
    ["지표", "목표", "실측", "판정"],
    ["K-01 외국인환자 유치", "12건", "0건", "미달"],
    ["K-02+K-04 사전·사후관리", "120건", "7건", "5.8%"],
    ["K-03 만족도", "90점", "2건 응답, 4.90/5.0", "참고치"],
    ["ICT 체계 구축", "플랫폼 고도화", "구현 완료·운영 중", "달성"],
    ["협진 치료모델", "프로토콜 수립·운영", "체계 수립, 실제 진료 확인 필요", "부분 달성"],
  ];
  let y = 170;
  rows.forEach((r, i) => {
    const fill = i === 0 ? C.gray900 : i % 2 ? C.white : C.gray50;
    addShape(s, "rect", 74, y, 1130, 50, fill, { style: "solid", fill: C.gray300, width: 1 });
    [74, 430, 660, 900].forEach((x, idx) => addText(s, r[idx], x + 14, y + 13, [330, 210, 220, 270][idx], 24, { size: i === 0 ? 15 : 14, bold: i === 0, color: i === 0 ? C.white : C.ink }));
    y += 50;
  });
  foot(s);
  note(s, [
    "성과지표는 강한 부분과 약한 부분이 분명히 갈립니다.",
    "정성지표인 플랫폼 구축은 구현 완료와 운영 중으로 제시할 수 있습니다.",
    "그러나 유치 0건, 사전·사후관리 7건, 만족도 2건 응답은 그대로 제시해야 합니다.",
    "이 슬라이드에서 숫자를 미화하지 않는 태도를 먼저 확보하는 것이 질의응답 방어에 중요합니다.",
  ], ["사용자 제공 프롬프트 §3-1, §3-3, §3-4"]);

  s = deck.slides.add();
  title(s, "유치 0건은 전환 실패보다 ‘얇은 모수’ 문제에 가깝습니다", "실문의 6건 안에서 병원 검토까지 진행됐지만 입원 확정으로 이어지지 않았습니다", "05");
  const fx = [80, 340, 600, 860];
  const heads = ["실문의", "의무기록 수령", "소견·상담", "유치 확정"];
  const vals = ["6건", "6명", "7건", "0건"];
  const desc = ["시험데이터 제외", "환자 자료 접수", "소견서 6 + 화상 1", "admitted 실측 0"];
  fx.forEach((x, i) => {
    metric(s, x, 205, 190, 145, vals[i], heads[i] + "\n" + desc[i], i === 3 ? C.red : C.blue);
    if (i < fx.length - 1) addText(s, "→", x + 210, 250, 48, 42, { size: 30, bold: true, color: C.gray500, align: "center" });
  });
  addText(s, "해석의 기준을 바꿔야 합니다: ‘문의를 받아도 전환이 안 됐다’보다 먼저 ‘전환 가능한 문의 모수가 충분히 형성되지 않았다’를 설명해야 합니다.", 96, 454, 1080, 84, { size: 24, bold: true, align: "center" });
  foot(s);
  note(s, [
    "유치 실적 0건은 가장 큰 리스크입니다.",
    "다만 원자료 기준에서 실제 문의 모수는 누적 6건입니다. 시험데이터를 제외한 정본 기준을 사용했습니다.",
    "여기서는 0건을 숨기지 않고, 왜 전환 가능한 모수 자체가 부족했는지 설명하는 방식이 필요합니다.",
    "이후 슬라이드에서는 이 모수 문제의 원인과 하반기 보완 방향을 연결하겠습니다.",
  ], ["사용자 제공 프롬프트 §3-1, §3-4"]);

  s = deck.slides.add();
  title(s, "초기 문의는 유치 가능한 표준 케이스가 아니었습니다", "고난도·중증 문의가 플랫폼 검증에는 의미 있었지만 단기 유치에는 불리했습니다", "06");
  labelBox(s, 90, 195, 330, 270, "장기이식·재수술", "신장이식·간이식 재수술 사례는 공여자 부재와 국내 규정 이슈로 단기 수술 연계가 어려웠습니다.", C.red);
  labelBox(s, 475, 195, 330, 270, "치료 확답의 어려움", "대학병원 검토까지 진행했지만, 중증·말기암 사례는 즉시 치료 가능 여부를 확답하기 어려웠습니다.", C.amber);
  labelBox(s, 860, 195, 330, 270, "비급여 비용 부담", "비급여 치료비가 보험 보장으로 연결되지 않으면 환자 결정이 지연됩니다.", C.blue);
  addText(s, "따라서 하반기에는 중증 단일 타깃에서 ‘종합검진·조기암·국내 체류 외국인’까지 전환 가능한 환자군을 넓힙니다.", 110, 545, 1050, 48, { size: 23, bold: true, align: "center" });
  foot(s);
  note(s, [
    "초기 문의의 상당수는 장기이식이나 말기암처럼 단기 유치 전환이 어려운 케이스였습니다.",
    "이런 케이스는 플랫폼의 의무기록 처리와 병원 검토 흐름을 검증하는 데는 의미가 있었지만, 중간평가 시점의 유치 실적으로 전환되기에는 불리했습니다.",
    "특히 비급여 치료비와 보험 보장 한계는 환자 결정 지연의 실제 요인입니다.",
  ], ["사용자 제공 프롬프트 §3-4, §4-4", "사용자 제공 대화 맥락: 비급여 보험 적용 한계"]);

  s = deck.slides.add();
  title(s, "HEALO는 사전상담 3종과 사후관리 3종을 구현했습니다", "정성 실적의 핵심은 ‘아이디어’가 아니라 작동하는 운영 화면입니다", "07");
  await addImage(s, assets.homeRu, 74, 176, 500, 290, "러시아어 HEALO 홈 화면");
  await addImage(s, assets.remoteMobile, 604, 176, 175, 290, "모바일 원격의료 화면");
  await addImage(s, assets.risk, 804, 176, 380, 135, "AI 위험도 판정 화면", "contain");
  await addImage(s, assets.education, 804, 331, 380, 135, "암종별 교육 콘텐츠 화면", "contain");
  addText(s, "병원안내·매칭 / 진료의뢰·상담 / 예약상담\n경과관찰 / 모니터링·교육 / 재이용 예약", 112, 530, 1050, 48, { size: 24, bold: true, align: "center" });
  foot(s, "근거: 플랫폼 화면 캡처 및 사용자 제공 개발 실측");
  note(s, [
    "정성 실적은 화면과 기능으로 보여주는 것이 가장 설득력이 높습니다.",
    "HEALO는 사전상담 세 가지와 사후관리 세 가지를 모두 구현했고, 러시아어와 카자흐어를 포함한 6개 언어를 지원합니다.",
    "평가위원에게는 이 장에서 ‘구축 완료’가 단순 문구가 아니라 실제 화면과 기능으로 확인 가능하다는 점을 전달합니다.",
  ], ["사용자 제공 프롬프트 §4-2", "로컬 화면 캡처: 중간평가/03. 화면 사진_260820"]);

  s = deck.slides.add();
  title(s, "플랫폼은 지속 개발 중인 운영 시스템입니다", "중간평가 직전 급조가 아니라 6월 이후에도 기능 규모가 증가했습니다", "08");
  metric(s, 70, 190, 206, 140, "20.7만", "소스코드 LOC\n1,022개 파일", C.blue);
  metric(s, 300, 190, 206, 140, "229개", "서버 기능\nAPI 엔드포인트", C.teal);
  metric(s, 530, 190, 206, 140, "140개", "화면 페이지\n6개 언어 적용", C.green);
  metric(s, 760, 190, 206, 140, "159개", "DB 변경이력\n마이그레이션", C.amber);
  metric(s, 990, 190, 206, 140, "213개", "자동화 테스트\n품질 관리", C.gray900);
  addShape(s, "rect", 88, 455, 260, 26, C.gray100, "none");
  addShape(s, "rect", 88, 455, 168, 26, C.blue, "none");
  addText(s, "2026.06.21 13.5만 LOC", 88, 420, 260, 24, { size: 16, color: C.gray700 });
  addText(s, "2026.08.31 20.7만 LOC · 약 +53%", 372, 450, 620, 32, { size: 27, bold: true });
  addText(s, "운영 중 기능이 커졌고, 성과지표 자동 집계·AI 품질 채점까지 포함합니다.", 372, 492, 740, 28, { size: 17, color: C.gray700 });
  foot(s);
  note(s, [
    "개발 실적은 단순 화면 수가 아니라 운영 시스템 규모로 제시할 수 있습니다.",
    "8월 31일 기준 약 20.7만 줄, API 229개, 화면 140개, 마이그레이션 159개, 테스트 파일 213개입니다.",
    "6월 21일 대비 코드 규모가 약 53% 증가했다는 점은 지속 개발의 근거로 사용할 수 있습니다.",
  ], ["사용자 제공 프롬프트 §4-1"]);

  s = deck.slides.add();
  title(s, "의료정보를 다루는 운영통제까지 구축했습니다", "환자 개인정보, 권한, AI 품질, 성과지표 집계를 관리하는 구조입니다", "09");
  processStep(s, 92, 205, "01", "권한 분리", "관리자·코디네이터·병원·에이전시·환자 5종 권한으로 업무 범위를 분리했습니다.");
  processStep(s, 92, 365, "02", "개인정보 보호", "환자 개인정보 AES-256-GCM 암호화와 전 테이블 RLS를 적용했습니다.");
  processStep(s, 670, 205, "03", "AI 품질관리", "AI 응답의 환각·안전 위반·응답시간 P95를 매일 자동 점검합니다.");
  processStep(s, 670, 365, "04", "성과 자동집계", "K-01, K-02, K-04와 유치 전환 깔때기를 관리자 화면에서 확인합니다.");
  addText(s, "플랫폼은 홍보용 웹사이트가 아니라 환자 상담과 사후관리 데이터를 운영하는 업무 시스템입니다.", 120, 550, 1040, 38, { size: 25, bold: true, align: "center" });
  foot(s);
  note(s, [
    "평가위원이 ICT 실체를 물을 경우 운영통제 구조를 보여주는 것이 중요합니다.",
    "HEALO는 권한 분리, 개인정보 암호화, RLS, AI 품질 자동 점검, 성과지표 자동 집계를 포함합니다.",
    "따라서 이 사업은 단순 소개 페이지 구축이 아니라 의료정보를 다루는 운영 시스템 구축으로 설명할 수 있습니다.",
  ], ["사용자 제공 프롬프트 §4-2"]);

  s = deck.slides.add();
  title(s, "사전상담은 의무기록 수령부터 환자 언어 전달까지 닫힌 흐름입니다", "의료진 소견서 6건과 화상 사전상담 1건이 현재 실측 기준입니다", "10");
  processStep(s, 70, 185, "01", "의무기록 접수", "러시아어 등 현지 의무기록을 받아 번역·정리합니다.", 295);
  processStep(s, 70, 315, "02", "국내 의료진 검토", "협진 상급종합병원과 참여병원에 치료 가능성을 확인합니다.", 295);
  processStep(s, 70, 445, "03", "환자 언어 전달", "회신 소견을 환자 언어로 다시 옮겨 치료 가능성과 비용 범위를 안내합니다.", 295);
  await addImage(s, assets.opinion, 505, 180, 650, 365, "개인정보가림 처리된 의료소견서 화면", "contain");
  foot(s, "근거: 실DB 2026-08-31, 개인정보 가림 소견서 이미지");
  note(s, [
    "사전상담 실적은 숫자보다 프로세스의 닫힘을 보여줘야 합니다.",
    "환자 의무기록을 받아 번역하고, 국내 의료진 검토를 거쳐, 환자 언어로 다시 전달하는 흐름이 이미 운영됐습니다.",
    "현재 공식 실측 기준은 화상 사전상담 1건과 의료진 소견서를 글로 작성·전달한 6건입니다.",
  ], ["사용자 제공 프롬프트 §3-1, §4-4", "소견서_healwith_개인정보가림_260831_claude.png"]);

  s = deck.slides.add();
  title(s, "원격협진은 진료가 아닌 상담·정보제공 범위에서 실증했습니다", "2027년 5월 시행 전까지 법적 표현을 분명히 구분합니다", "11");
  await addImage(s, assets.remoteMeeting, 74, 178, 620, 350, "2026년 8월 4일 원격협진 화상상담 캡처");
  labelBox(s, 735, 188, 390, 120, "현재 표현", "사전상담, 정보 제공, 치료 가능성 검토, 원격협진 시스템 실증", C.green);
  labelBox(s, 735, 336, 390, 120, "피해야 할 표현", "온라인 진료 제공, 원격진료 완료, 초진·처방 제공", C.red);
  addText(s, "진료 주체는 유치의료기관 소속 의사이며, HEALO는 플랫폼·유치업자로 구분합니다.", 735, 508, 400, 54, { size: 21, bold: true });
  foot(s, "근거: 의료해외진출법 개정 시행 전 법령상 표현 제한");
  note(s, [
    "원격협진 실증은 강점이지만 표현을 잘못 쓰면 리스크가 됩니다.",
    "개정법 시행 전인 현재는 온라인 진료를 제공했다고 말하지 않고, 사전상담과 정보 제공 범위에서 실증했다고 설명해야 합니다.",
    "진료 주체는 유치의료기관 소속 의사이고, HEALO는 플랫폼과 유치업자의 역할을 수행한다는 구분을 분명히 하겠습니다.",
  ], ["사용자 제공 프롬프트 §5 법령 인용 시 지켜야 할 선", "로컬 캡처 image_20260804_15.01.40.png"]);

  s = deck.slides.add();
  title(s, "해외 파트너 접점은 실제 계약·MOU로 일부 전환됐습니다", "다만 집계 기준은 15건 회의, 4건 계약·MOU로 보수적으로 맞춥니다", "12");
  metric(s, 80, 200, 235, 140, "15건", "해외 파트너 회의\n회의록 원본 보유", C.blue);
  metric(s, 345, 200, 235, 140, "4건", "계약·MOU\nMedicaTour, UMIT, GHO, MedVoyage", C.teal);
  metric(s, 610, 200, 235, 140, "8곳", "시스템 등록 병원", C.green);
  metric(s, 875, 200, 235, 140, "16건", "파트너 화상 미팅\n완료 2, 예정 14", C.amber);
  await addImage(s, assets.partner, 140, 405, 1000, 150, "SAULYK 협의 사진", "contain");
  foot(s);
  note(s, [
    "파트너 실적은 기존 v5의 23회와 10건보다, 제공된 정본 기준인 15건 회의와 4건 계약·MOU로 보수적으로 제시합니다.",
    "평가위원이 증빙을 요구할 경우 회의록 원본, 계약서, MOU, 등록 병원 목록으로 연결할 수 있습니다.",
    "이 장의 목적은 유치가 0건이어도 환자 유입 경로를 만들기 위한 외부 접점은 실제로 진행됐음을 보여주는 것입니다.",
  ], ["사용자 제공 프롬프트 §4-4", "협의사진_SAULYK_260826_claude.png"]);

  s = deck.slides.add();
  title(s, "카자흐 시장을 ‘성장 시장’으로 단정하지 않습니다", "불리한 통계를 회피하지 않고, 치료형 고액 수요의 좁은 기회로 설명합니다", "13");
  labelBox(s, 90, 190, 500, 270, "불리한 사실", "카자흐스탄은 2025년 외국인환자 15,188명으로 순위가 11위에서 13위로 하락했고, 증가율도 상위 15개국 중 낮은 편입니다. 러시아도 순위가 9위에서 11위로 내려갔습니다.", C.red);
  labelBox(s, 690, 190, 500, 270, "그래도 보는 이유", "KHIDI 자료는 러시아·중앙아시아 중증암환자 비중, 긴 재원일수, 에이전시 경유율을 제시합니다. 즉 대중 시장 확대가 아니라 치료형 고액 수요의 좁은 통로를 검증하는 사업입니다.", C.blue);
  addText(s, "표현 원칙: ‘CIS 시장이 커진다’가 아니라 ‘중증·치료형 수요에 맞는 비대면 사전상담 통로를 검증한다’입니다.", 110, 545, 1040, 44, { size: 23, bold: true, align: "center" });
  foot(s, "근거: 복지부 보도자료, KHIDI 비즈니스 가이드, 사용자 제공 프롬프트");
  note(s, [
    "시장 설명은 과장하면 바로 공격받을 수 있습니다.",
    "카자흐스탄과 러시아가 전체 외국인환자 시장에서 상위권이 아니라는 불리한 사실을 먼저 인정합니다.",
    "대신 본 사업은 대중 시장 증가에 베팅한 것이 아니라, 중증·치료형 수요에 맞는 사전상담 통로를 검증하는 사업이라고 설명합니다.",
  ], ["사용자 제공 프롬프트 §5"]);

  s = deck.slides.add();
  title(s, "수익모델은 법정 유치수수료 한도 안에서 설계했습니다", "플랫폼은 의료행위를 대체하지 않고 유치·상담·사후관리 운영을 지원합니다", "14");
  labelBox(s, 80, 190, 330, 250, "유치수수료", "치료비의 15~30%. 상급종합 15%, 종합·병원 20%, 의원 30% 법정 상한을 넘지 않게 설계합니다.", C.blue);
  labelBox(s, 475, 190, 330, 250, "플랫폼 이용료", "월 50~100만원/기관. 병원·에이전시가 상담, 번역, 성과관리 기능을 이용하는 구조입니다.", C.teal);
  labelBox(s, 870, 190, 330, 250, "의료관광 패키지", "건당 100~200만원. 통역, 숙박, 일정관리 등 비의료 서비스 중심으로 범위를 구분합니다.", C.green);
  addText(s, "수익모델의 핵심은 진료 수익이 아니라, 유치 경로와 사전·사후관리 운영을 표준화하는 데 있습니다.", 105, 535, 1070, 48, { size: 24, bold: true, align: "center" });
  foot(s);
  note(s, [
    "수익모델은 법정 상한과 역할 구분을 동시에 방어해야 합니다.",
    "유치수수료는 보건복지부 통합고시의 상한 범위 안에서 설명하고, 플랫폼 이용료와 의료관광 패키지는 의료행위가 아닌 운영지원과 비의료 서비스로 구분합니다.",
    "이렇게 해야 사업모델의 구체성과 법적 타당성을 함께 확보할 수 있습니다.",
  ], ["사용자 제공 프롬프트 §1, §5"]);

  s = deck.slides.add();
  title(s, "사업비는 개발비 외주 없이 플랫폼 구축에 집중됐습니다", "집행률은 회계자료 확정 전까지 확인 필요로 남깁니다", "15");
  metric(s, 90, 195, 250, 145, "87,500천원", "총사업비", C.ink);
  metric(s, 380, 195, 250, 145, "70,000천원", "정부출연금\n본로이 42,000", C.blue);
  metric(s, 670, 195, 250, 145, "17,500천원", "자부담\n현금 4,375 / 현물 13,125", C.teal);
  metric(s, 960, 195, 250, 145, "0원", "외주 개발비\n자체 개발 기준", C.green);
  labelBox(s, 120, 440, 450, 112, "확인된 집행·승인", "홍보비 7,700,000원 사전승인, 비목 변경 승인, 회계법인 중간정산 제출 완료", C.blue);
  labelBox(s, 710, 440, 450, 112, "발표 전 확인 필요", "실제 이체 실행 여부, 해외 클라우드 원화 청구액, 총 집행률, 회계검토 결과", C.red);
  foot(s, "집행률은 확인 필요 항목으로 처리");
  note(s, [
    "사업비 슬라이드는 숫자 오류가 나면 신뢰가 크게 떨어집니다.",
    "따라서 총사업비와 정부출연금, 자부담은 확정값으로 쓰고, 총 집행률은 회계자료 확인 전까지 확인 필요로 남깁니다.",
    "자체 개발로 외주 개발비를 줄였다는 점은 정성 구축 성과와 연결해서 설명할 수 있습니다.",
  ], ["사용자 제공 프롬프트 §1, §4-5"]);

  s = deck.slides.add();
  title(s, "계획 대비 실적은 ‘구축 완료, 유치 전환 미달’로 정리합니다", "평가위원이 보는 핵심 기준을 먼저 표로 맞춥니다", "16");
  const planRows = [
    ["평가기준", "현재 답변"],
    ["사업목적·범위 준수", "카자흐스탄 암환자 대상 사전상담·사후관리 플랫폼 구축 범위 유지"],
    ["사업추진 방법", "6개 언어, AI 상담, WebRTC, 관리자 시스템, 보안·성과 집계 구현"],
    ["계획 대비 추진실적", "구축·협진·파트너 실적은 확보, 유치·사후관리 정량은 미달"],
    ["사업비 집행실적", "승인·정산 자료 제출 완료, 총 집행률은 회계 확인 필요"],
    ["회계검토", "2026-08-10 제출, 검토 결과 확인 필요"],
  ];
  y = 170;
  planRows.forEach((r, i) => {
    const fill = i === 0 ? C.gray900 : C.white;
    addShape(s, "rect", 86, y, 1100, i === 0 ? 44 : 64, fill, { style: "solid", fill: C.gray300, width: 1 });
    addText(s, r[0], 102, y + 12, 280, 30, { size: i === 0 ? 15 : 16, bold: i === 0, color: i === 0 ? C.white : C.ink });
    addText(s, r[1], 410, y + 12, 740, i === 0 ? 30 : 42, { size: i === 0 ? 15 : 15, bold: i === 0, color: i === 0 ? C.white : C.gray700 });
    y += i === 0 ? 44 : 64;
  });
  foot(s);
  note(s, [
    "이 장은 질의응답의 기준표 역할을 합니다.",
    "당초 사업 목적과 범위는 유지했고, 사업추진 방법과 정성 구축은 충분히 설명할 수 있습니다.",
    "반면 유치와 사후관리 정량은 미달이며, 사업비와 회계는 확인 필요 항목을 남겨야 합니다.",
  ], ["사용자 제공 프롬프트 §2, §3, §4-5"]);

  s = deck.slides.add();
  title(s, "전환 제약 요인은 세 가지로 압축됩니다", "외부 탓이 아니라 하반기 전환 전략을 바꾸는 근거로 제시합니다", "17");
  labelBox(s, 90, 190, 330, 265, "고난도 환자 편중", "초기 문의가 장기이식·말기암 등 단기 유치가 어려운 케이스에 몰렸습니다.", C.red);
  labelBox(s, 475, 190, 330, 265, "기존 송출망 고착", "현지 에이전시는 이미 한국 협력병원 또는 인도·튀르키예 선택지를 보유하고 있었습니다.", C.amber);
  labelBox(s, 860, 190, 330, 265, "보험 보장 한계", "비급여 치료비가 보험 보장으로 연결되지 않을 때 환자 결정이 지연됩니다.", C.blue);
  addText(s, "따라서 대책은 ‘더 열심히 영업’이 아니라, 환자군·유입경로·보험 채널을 동시에 바꾸는 것입니다.", 120, 540, 1040, 40, { size: 24, bold: true, align: "center" });
  foot(s);
  note(s, [
    "미진사유라는 제목은 방어적으로 보이기 때문에, 전환 제약 요인으로 표현하는 것이 좋습니다.",
    "세 요인은 고난도 환자 편중, 기존 송출망 고착, 보험 보장 한계입니다.",
    "이렇게 정리하면 13~14장의 실행계획과 자연스럽게 연결됩니다.",
  ], ["사용자 제공 프롬프트 §3-4, §4-4", "사용자 제공 대화 맥락"]);

  s = deck.slides.add();
  title(s, "남은 기간에는 환자군과 유입경로를 동시에 바꿉니다", "모수 확대 없이는 12건 목표를 방어할 수 없습니다", "18");
  processStep(s, 95, 205, "01", "전환 가능한 환자군", "종합검진·조기암·국내 체류 외국인까지 유입 대상을 넓힙니다.", 350);
  processStep(s, 95, 365, "02", "직접 유입 채널", "현지 검색광고와 러시아·CIS 콘텐츠로 에이전시 의존도를 낮춥니다.", 350);
  processStep(s, 675, 205, "03", "보험사 채널", "Madanes 등 보험 가입자 연계와 보험 안내 페이지를 활용합니다.", 350);
  processStep(s, 675, 365, "04", "사후관리 실증", "첫 유치 이후 자동 안내, 만족도, 현지 경과관찰 데이터를 수집합니다.", 350);
  addText(s, "목표는 단순 홍보량 확대가 아니라, 유치 가능한 문의 모수를 빠르게 만드는 것입니다.", 150, 550, 980, 38, { size: 24, bold: true, align: "center" });
  foot(s);
  note(s, [
    "남은 기간의 실행계획은 광고 집행보다 전환 가능한 모수 확대에 초점을 맞춰야 합니다.",
    "첫째, 환자군을 종합검진과 조기암, 국내 체류 외국인까지 넓힙니다.",
    "둘째, 현지 검색광고와 콘텐츠로 직접 유입을 만들고, 셋째 보험사 채널을 통해 비용 부담 문제를 줄입니다.",
    "마지막으로 첫 유치 이후 사후관리 실증과 만족도 수집까지 연결합니다.",
  ], ["사용자 제공 프롬프트 §4-2, §4-4, §5"]);

  s = deck.slides.add();
  title(s, "9~11월은 광고 집행보다 전환 검증 일정입니다", "확정이라고 단정하지 않고, 단계별 증거를 쌓는 일정으로 제시합니다", "19");
  addShape(s, "line", 130, 315, 1000, 0, "none", { style: "solid", fill: C.gray300, width: 2 });
  const months = [
    ["9월", "유입 모수 확대", "검색광고·콘텐츠 광고 시작\n전환 가능한 환자군 테스트"],
    ["10월", "첫 전환·사후관리 실증", "실환자 자동 안내 적용\n만족도 설문 수집 개시"],
    ["11월", "성과 정리·최종보고", "유치·상담·사후관리 실적 정리\nUMIT 현지 경과관찰 데이터 수집"],
  ];
  [150, 515, 880].forEach((x, i) => {
    addShape(s, "ellipse", x, 303, 24, 24, i === 0 ? C.blue : i === 1 ? C.teal : C.amber, "none");
    addText(s, months[i][0], x - 18, 245, 80, 34, { size: 26, bold: true, align: "center" });
    addText(s, months[i][1], x - 86, 352, 230, 32, { size: 21, bold: true, align: "center" });
    addText(s, months[i][2], x - 100, 394, 250, 74, { size: 15, color: C.gray700, align: "center" });
  });
  addText(s, "사업기간: 2026년 4월 ~ 2026년 11월 20일", 390, 545, 500, 32, { size: 21, bold: true, align: "center" });
  foot(s);
  note(s, [
    "일정은 첫 유치 확정처럼 단정적 표현을 피하고 단계형으로 제시합니다.",
    "9월에는 모수 확대, 10월에는 첫 전환과 사후관리 실증, 11월에는 성과 정리와 최종보고로 이어집니다.",
    "평가위원에게는 잔여기간의 계획이 희망사항이 아니라 단계별 검증 일정이라는 점을 강조합니다.",
  ], ["사용자 제공 프롬프트 §1, §3, §4"]);

  s = deck.slides.add();
  title(s, "평가위원의 우려는 세 문장으로 먼저 답합니다", "질문을 기다리지 말고 발표 안에서 선제 대응합니다", "20");
  qa(s, 85, 180, "유치 0건인데 계속 지원 가치가 있는가", "유치 0건은 인정합니다. 다만 정본 실문의가 6건으로 얇았고, 구축·상담·파트너 기반은 확인됐으므로 하반기는 전환 검증에 집중하겠습니다.");
  qa(s, 85, 340, "기존 의료관광 에이전시와 무엇이 다른가", "일회성 송출 중개가 아니라 의무기록, 다국어 상담, 원격협진, 사후관리, 성과집계를 하나의 운영 흐름으로 묶습니다.");
  qa(s, 675, 180, "지원금 7,000만원 대비 산출이 무엇인가", "20.7만 LOC, API 229개, 140개 화면, 6개 언어, 보안·AI 품질·성과집계 시스템까지 구축했습니다.");
  qa(s, 675, 340, "온라인 진료를 하는 것인가", "아닙니다. 현재는 사전상담과 정보 제공 범위이며, 진료 주체는 유치의료기관 소속 의사입니다.");
  foot(s);
  note(s, [
    "이 장은 예상 질의를 슬라이드 안에서 선제적으로 답하는 장입니다.",
    "가장 큰 질문은 유치 0건, 차별성, 지원금 대비 산출, 법령 리스크입니다.",
    "답변은 길게 변명하지 않고, 숫자를 인정한 뒤 구축 실체와 남은 검증계획으로 연결합니다.",
  ], ["사용자 제공 프롬프트 §2, §3, §4, §5, §8"]);

  s = deck.slides.add();
  title(s, "계속 지원의 근거는 완료된 기반과 검증 가능한 수정계획입니다", "잔금 30%는 유치 전환 실험을 완결하는 데 투입됩니다", "21");
  addText(s, "이미 완료한 것", 100, 205, 300, 36, { size: 24, bold: true, color: C.green });
  addText(s, "플랫폼 구축 · 6개 언어 · 원격협진 · AI 상담 · 보안/권한 · 성과 자동집계 · 파트너 접점", 100, 255, 455, 100, { size: 20, color: C.gray700 });
  addText(s, "부족한 것", 100, 405, 300, 36, { size: 24, bold: true, color: C.red });
  addText(s, "유치 확정 0건 · 사후관리 0건 · 만족도 표본 2건 · 총 집행률 확인 필요", 100, 455, 455, 100, { size: 20, color: C.gray700 });
  addText(s, "잔여기간 실행", 705, 205, 330, 36, { size: 24, bold: true, color: C.blue });
  addText(s, "전환 가능한 환자군 확대\n직접유입 검색광고·콘텐츠\n보험사 채널 연계\n첫 유치 후 사후관리 실증", 705, 255, 420, 170, { size: 23, bold: true, lineSpacing: 1.25 });
  addShape(s, "line", 640, 190, 0, 360, "none", { style: "solid", fill: C.gray300, width: 2 });
  addText(s, "판단 요청: 구축 기반을 전환 실적으로 연결할 수 있도록 계속 지원이 필요합니다.", 160, 610, 960, 40, { size: 25, bold: true, align: "center" });
  foot(s);
  note(s, [
    "마무리는 완료한 것과 부족한 것을 동시에 정리합니다.",
    "완료한 기반은 명확하고, 부족한 정량 전환은 인정합니다.",
    "잔여기간의 핵심은 광고비 지출 자체가 아니라, 전환 가능한 환자군과 유입경로를 검증해 실제 유치와 사후관리 실적으로 연결하는 것입니다.",
    "따라서 계속 지원이 필요한 이유를 이 구조로 요청합니다.",
  ], ["사용자 제공 프롬프트 §2, §3, §4, §8"]);

  s = deck.slides.add();
  title(s, "부록: 핵심 예상 질의응답", "유치 0건, 차별성, 지원금 대비 산출은 반드시 먼저 준비합니다", "22");
  qa(s, 70, 170, "유치 실적이 0건인데 이 사업이 계속 지원받을 가치가 있습니까?", "0건은 인정합니다. 그러나 시험데이터를 제외한 실문의가 6건으로 아직 모수가 얇고, 그 6건은 의무기록 접수와 병원 검토까지 진행됐습니다. 잔여기간에는 환자군과 채널을 바꿔 전환 모수를 만드는 데 집중하겠습니다.");
  qa(s, 70, 330, "기존 의료관광 에이전시와 무엇이 다릅니까?", "기존 에이전시는 송출 중심이지만 HEALO는 사전상담, 의무기록 번역, 원격협진, 사후관리, 성과지표 집계까지 운영 데이터로 묶습니다. 사람 상담 기록을 AI 학습자료로 축적하는 점도 차별점입니다.");
  qa(s, 670, 170, "지원금 7,000만원 대비 산출이 무엇입니까?", "20.7만 LOC, API 229개, 화면 140개, DB 마이그레이션 159개, 테스트 파일 213개 규모의 운영 시스템을 구축했습니다. 외주 개발비 없이 자체 구축했고, 보안과 AI 품질관리까지 포함했습니다.");
  qa(s, 670, 330, "사전상담 7건은 왜 목표 120건 대비 낮습니까?", "목표는 유치 12건에 대해 사전 5회와 사후 5회를 합산한 구조입니다. 유치가 아직 0건이므로 사후관리 실적도 0건이며, 현재는 실제 문의 6건에서 가능한 사전상담과 소견 전달만 집계했습니다.");
  foot(s);
  note(s, [
    "이 부록은 발표 중 시간이 부족하면 넘기지 않고 질의응답 때 사용합니다.",
    "첫 세 질문은 반드시 준비해야 하는 질문입니다.",
    "답변의 원칙은 숫자를 인정하고, 구축 실체와 전환 계획으로 연결하는 것입니다.",
  ], ["사용자 제공 프롬프트 §7, §8"]);

  s = deck.slides.add();
  title(s, "부록: 법령·시장·회계 예상 질의응답", "과장 표현을 피하고 확인 필요 항목은 확인 필요로 남깁니다", "23");
  qa(s, 70, 165, "온라인 진료를 제공하고 있습니까?", "아닙니다. 현재는 사전상담과 정보 제공 범위이며, 진료 주체는 유치의료기관 소속 의사입니다. 2027년 5월 시행 전 표현을 엄격히 구분합니다.");
  qa(s, 70, 300, "만족도 98점이라고 볼 수 있습니까?", "아닙니다. 응답 2건의 평균 4.90/5.0이라는 참고값으로만 제시하고, 표본 부족 때문에 공식 달성으로 쓰지 않습니다.");
  qa(s, 70, 435, "카자흐 시장이 성장해서 들어간 것입니까?", "그렇게 단정하지 않습니다. 2025년 통계상 카자흐 순위와 증가율은 불리한 면이 있습니다. 본 사업은 대중 성장 시장이 아니라 치료형 고액 수요의 좁은 통로를 검증하는 사업입니다.");
  qa(s, 670, 165, "사업비 집행률이 낮으면 문제 아닙니까?", "총 집행률은 회계자료 확인 후 확정해야 합니다. 다만 홍보비와 비목 변경 사전승인, 회계법인 중간정산 제출은 완료된 상태로 제시할 수 있습니다.");
  qa(s, 670, 300, "참여기관 실적은 왜 비어 있습니까?", "우리 시스템에 잡히지 않는 참여기관 치료·사후관리·만족도 실적은 확인 없이 채우지 않습니다. 발표 전 참여기관 회신으로 보완해야 합니다.");
  foot(s);
  note(s, [
    "법령, 시장, 회계 질문은 잘못 답하면 신뢰를 잃기 쉽습니다.",
    "온라인 진료, 만족도 98점, 카자흐 시장 성장 같은 표현은 단정하지 않습니다.",
    "참여기관 실적과 집행률은 확인 전까지 확인 필요로 유지합니다.",
  ], ["사용자 제공 프롬프트 §3-2, §3-4, §4-5, §5, §6"]);

  s = deck.slides.add();
  title(s, "발표 전 확인 필요 항목", "이 항목만 채우면 숫자·증빙 리스크를 줄일 수 있습니다", "24");
  const checks = [
    "평가일 최종 확정",
    "참여기관 실적: 치료, 원격 사후관리, 협진 연계율, 만족도",
    "이화여자대학교 의료원 협약서 서명 원본 보관 여부",
    "홍보비 7,700,000원 실제 이체 실행 여부",
    "Vercel, Supabase, LiveKit, Apple 원화 확정 청구액",
    "총 집행률 및 회계검토 결과",
    "소모품비 실제 집행 여부",
    "2026년 7월 키르기스스탄 환자 사전상담 실적 인정 여부",
  ];
  checks.forEach((c, i) => {
    const x = i < 4 ? 95 : 685;
    const yy = 180 + (i % 4) * 95;
    addShape(s, "rect", x, yy + 6, 18, 18, C.white, { style: "solid", fill: C.gray500, width: 1.4 });
    addText(s, c, x + 36, yy, 480, 48, { size: 20, color: C.gray900 });
  });
  addText(s, "확인 전까지는 빈칸을 억지로 채우지 않는 것이 더 안전합니다.", 190, 590, 900, 36, { size: 25, bold: true, align: "center" });
  foot(s);
  note(s, [
    "마지막 부록은 발표 전 체크리스트입니다.",
    "이 항목은 확인 없이 숫자를 넣으면 오히려 평가 리스크가 커집니다.",
    "특히 참여기관 실적, 총 집행률, 회계검토 결과, 홍보비 실제 이체 여부를 우선 확인해야 합니다.",
  ], ["사용자 제공 프롬프트 §3-2, §4-5, §7"]);

  await fs.writeFile(path.join(TMP, "source-notes.txt"), [
    "Primary source: KHIDI_중간보고_코덱스_프롬프트.md",
    "Visual assets: local screenshots under 중간평가/03. 화면 사진_260820 and 중간보고 제출 자료/01. 작업본",
    "No external browsing was used. Government statistics and legal references were used as provided by the user source file.",
  ].join("\n"), "utf8");

  for (const [i, slide] of deck.slides.items.entries()) {
    const stem = `slide-${String(i + 1).padStart(2, "0")}`;
    const png = await deck.export({ slide, format: "png", scale: 1 });
    await fs.writeFile(path.join(TMP, `${stem}.png`), new Uint8Array(await png.arrayBuffer()));
    const layout = await slide.export({ format: "layout" });
    await fs.writeFile(path.join(TMP, `${stem}.layout.json`), await layout.text(), "utf8");
  }

  const montage = await deck.export({ format: "webp", montage: true, scale: 1 });
  await fs.writeFile(path.join(TMP, "khidi-codex-montage.webp"), new Uint8Array(await montage.arrayBuffer()));

  const pptx = await PresentationFile.exportPptx(deck);
  await pptx.save(OUT);
}

build().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
