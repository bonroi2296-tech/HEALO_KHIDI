/**
 * 병원 사이트 「판」이 요구하는 데이터 형태 — **이 스키마가 곧 「병원에서 받아야 할 것 목록」이다.**
 *
 * 왜 스키마를 따로 두나 (기획서 §10-6 ③ 「콘텐츠 씨앗」):
 *   판에 찍어내려면 «무엇을 채우면 사이트가 완성되는지»가 한 장에 있어야 한다.
 *   영업이 병원에 요청할 자료 목록과, 개발이 채울 칸이 **같은 문서**여야 어긋나지 않는다.
 *
 * 채우는 법:
 *   · 다국어 값은 `{ ko, en, ru, kz, zh, ja }`. 없는 언어는 en 으로 떨어진다(사이트 안 깨짐).
 *   · 모르는 값은 **비워 둔다.** 판은 빈 칸이면 그 블록을 통째로 안 그린다.
 *     자리표시자 글자를 넣으면 그게 화면에 뜬다(2026-07-28 실제로 겪음).
 *
 * ⚠️ 이 판은 **healwith 사이트와 다른 제품**이다.
 *    healwith 는 «중개자»(왜 한국인가 → 병원을 연결)라 DESIGN.md 의 teal 톤을 따르고,
 *    이 판은 «병원 본인»(왜 우리인가 → 우리 실적·의료진·시술)이라 톤과 구조가 다르다.
 *    PO 지시(2026-07-28): "힐위드 포맷으로 하지 말고 외국인이 좋아하는 요즘 스타일로."
 */

/** 판이 채워지길 기대하는 칸 전체 — 영업이 병원에 요청할 자료 목록과 1:1. */
export const HOSPITAL_SITE_SCHEMA = {
  brand: {
    name: "다국어 병원명 { ko, en, ru, kz, zh, ja }",
    logoUrl: "로고 파일(투명 배경 PNG/SVG). 없으면 판이 글자 로고로 대체한다",
    accent: "강조색 HEX 하나. 없으면 판 기본값(딥 포레스트)",
  },
  hero: {
    eyebrow: "제목 위 한 줄 (예: 양·한방 협진 · 누적 5만 건)",
    title: "가장 큰 한 문장",
    subtitle: "받쳐주는 1~2줄",
    primaryCta: "주 버튼 문구 (예: 상담 예약)",
    secondaryCta: "보조 버튼 문구 (예: WhatsApp 문의)",
    image: "히어로 배경 사진 (1920px 이상, 사람/공간이 보이는 것)",
  },
  /** 히어로 바로 아래 신뢰 숫자 — 의료관광 사이트의 사실상 표준(3~4개). */
  proof: "[{ value, label }] — 경력 연차·누적 환자·센터 수·지점 수 같은 «셀 수 있는» 것만",
  specialties: "[{ title, desc, icon? }] — 이 병원이 실제로 보는 것 (인기 시술/센터)",
  whyUs: "[{ title, desc }] — 3개 권장. «우리만의» 이유여야 한다(국가 자랑 아님)",
  doctors: "[{ name, title, credentials, photo }] — 얼굴 사진이 신뢰의 핵심",
  programs: "[{ title, desc, items[] }] — 치료 프로그램. 가격은 선택(외국인 진료비는 다를 수 있음)",
  testimonials: "[{ quote, author, country }] — 없으면 블록 자체를 안 그린다",
  credentials: "[{ title, desc, year? }] — 인증·수상·등록. 의료는 «누가 보증하나»가 신뢰의 절반",
  faq: "[{ q, a }] — 해외 환자가 실제로 묻는 것(비자·통역·체류·비용·결제)",
  contact: {
    phone: "대표번호",
    email: "이메일(없으면 전화만 뜬다)",
    address: "주소 { ko, en }",
    hours: "진료시간",
    channels: "{ whatsapp, telegram, wechat, line } — 병원마다 새로 발급 필요",
  },
};

/** 병원에 보낼 자료 요청 목록(영업용) — 스키마와 같은 소스에서 나온다. */
export const ASSET_REQUEST_CHECKLIST = [
  { key: "brand.logoUrl", label: "병원 로고 (투명 배경)", required: true },
  { key: "hero.image", label: "대표 사진 1장 (건물·진료실·의료진 중 택1, 1920px+)", required: true },
  { key: "doctors[].photo", label: "의료진 얼굴 사진 (1인당 1장, 정사각형)", required: true },
  { key: "proof", label: "내세울 숫자 3~4개 (경력·누적 환자·지점 수 등)", required: true },
  { key: "credentials", label: "인증·수상·등록 내역", required: false },
  { key: "testimonials", label: "환자 후기 2~3건 (익명 가능)", required: false },
  { key: "contact.channels", label: "상담 채널 (WhatsApp 번호 등) — 승인에 며칠 걸림", required: true },
  { key: "legal", label: "법인명·대표자·사업자번호 (법정 표기용)", required: true },
];
