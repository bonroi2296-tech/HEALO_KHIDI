/**
 * 테넌트(= 이 사이트가 「누구의 것인지」) 설정 — B2B 판에 찍어내기 1차 실험.
 *
 * ⚠️ 안전 원칙 (이걸 어기면 healwith 실서비스가 다친다):
 *   `NEXT_PUBLIC_TENANT` 가 없거나 모르는 값이면 **무조건 healwith 기본값**으로 떨어진다.
 *   즉 설정을 안 켜면 지금 동작과 100% 동일해야 한다. 테스트(`tenant.test.ts`)가 이걸 지킨다.
 *
 * 왜 이 파일이 있나 (docs/B2B_병원솔루션_기획.md §10):
 *   병원 하나를 늘릴 때마다 사람이 브랜드 문구를 찾아 고치면 그건 공장이 아니라 수공예다.
 *   「병원 하나 = 설정 하나」로 만드는 게 판의 첫 조각이고, 이 파일이 그 자리다.
 *
 * 🔍 이 실험이 답하려는 질문: **지금 코드가 브랜드 갈아끼우기를 견디는가?**
 *   - 사전(dictionary.js)에 브랜드명이 545번 박혀 있다 → `t()` 한 곳에서 치환되는지
 *   - 푸터·법인정보·연락처가 한 곳(SITE_INFO)에서 갈리는지
 */

import { IMMUNE_HOME_CONTENT } from "./content/immune";

// 브랜드명은 언어마다 다르다(면력한방병원 / Immune Hospital / Immune Hospital …).
// 사전 치환도 언어별이어야 해서 이름을 언어 맵으로 들고 있다.
const HEALWITH = {
  key: "healwith",
  // 표기 이름 — 언어별. 없으면 en 으로 폴백.
  name: {
    en: "healwith",
    ko: "healwith",
    ru: "healwith",
    kz: "healwith",
    zh: "healwith",
    ja: "healwith",
  },
  tagline: "AI Medical Concierge for Global Patients",
  // 상담 채널 — 병원마다 새로 발급받아야 하는 것(기획서 §10-2 「바깥 승인 28건」).
  messenger: {
    whatsapp: "https://wa.me/821047721075",
    telegram: "https://t.me/healwith_bot",
    line: "",
    wechat: "",
  },
  legal: {
    serviceName: "healwith",
    operatedBy: "Bonroi",
    representative: "Juyoung Kang",
    representativeKo: "강주영",
    businessRegistrationNumber: "463-35-00902",
    foreignPatientAttractionRegistration: "A-2026-01-02-06761",
    guaranteeInsurer: "SGI Seoul Guarantee Insurance",
    guaranteeInsurerKo: "SGI 서울보증보험",
    addressLine1: "Room 613, 385 Gangseo-ro, Gangseo-gu,",
    addressLine2: "Seoul, Republic of Korea",
    addressKo: "서울특별시 강서구 강서로 385, 613호",
    contactEmail: "admin@healwith.co.kr",
    privacyOfficer: "Juyoung Kang",
    privacyOfficerKo: "강주영",
    copyright: "© healwith. All rights reserved.",
    copyrightKo: "© healwith(힐위드). All rights reserved.",
  },
};

/**
 * 면력한방병원 — **목업 전용**(2026-07-28). 로컬에서 `NEXT_PUBLIC_TENANT=immune` 로만 뜬다.
 *
 * 🚨 여기 법인 정보는 **자리표시자(placeholder)다. 실제 값이 아니다.**
 *    실제 사업자번호·유치업 등록번호·보험은 병원에서 받아 채워야 한다(계약 시 필요 서류).
 *    자리표시자인 채로 실서비스에 띄우면 허위 표시가 된다 — `PLACEHOLDER` 표식을 남긴 이유.
 *
 * 출처: `hospitals` 테이블의 면력 4개 지점(강서·신촌·광명·성동) 실데이터 + immunehospital.com.
 */
const IMMUNE = {
  key: "immune",
  isMockup: true, // 목업 표식 — 실서비스 전환 시 반드시 제거하고 실제 정보로 교체
  // 홈 이야기를 통째로 갈아끼운다. 브랜드명만 바꾸면 «이름은 면력, 이야기는 healwith» 가 된다
  // (2026-07-28 1차 목업의 실패). 화자가 «중개자» 에서 «병원 본인» 으로 바뀌므로 섹션째 새로 씀.
  homeContent: IMMUNE_HOME_CONTENT,
  name: {
    ko: "면력한방병원",
    en: "Immune Hospital",
    ru: "Immune Hospital",
    kz: "Immune Hospital",
    zh: "Immune Hospital",
    ja: "Immune Hospital",
  },
  tagline: "Korean Medicine Immuno-Oncology Care",
  messenger: {
    // 목업이라 healwith 채널을 그대로 쓴다 — 실제 구축 때는 병원 전용 번호를 새로 받아야 한다.
    whatsapp: "https://wa.me/821047721075",
    telegram: "https://t.me/healwith_bot",
    line: "",
    wechat: "",
  },
  // ⚠️ **모르는 값은 빈 문자열로 둔다.** 자리표시자(PLACEHOLDER)를 넣었더니 그 글자가
  //    푸터·문의 버튼에 그대로 떴다(2026-07-28 1차 목업 실측). 화면은 빈 값이면 그 줄을
  //    통째로 안 그린다 → **모르는 사실은 «아무 말도 안 하는» 쪽이 맞다**(지어내면 허위 표시).
  //    실제 구축 때 병원에서 받아 채울 칸: 법인명·대표자·사업자번호·유치기관 등록·보험·이메일.
  legal: {
    serviceName: "면력한방병원",
    operatedBy: "",
    // ⚠️ 2026-07-29 정정: 앞서 나는 이 칸들을 「병원에서 받아야 채워진다」고 적었는데,
    //    **이미 immunehospital.com 푸터에 공개돼 있었다.** 「없다」고 단정하기 전에 찾아봤어야 했다.
    //    출처: https://immunehospital.com/pages/hospital/nonpayment.php 푸터(법정 공개 정보).
    representative: "Hwang Yi-jun",
    representativeKo: "황이준",
    businessRegistrationNumber: "645-92-01641",
    // 외국인환자 유치기관 등록번호는 아직 못 찾음 — 비워 두면 화면에 안 뜬다(지어내지 않는다).
    foreignPatientAttractionRegistration: "",
    guaranteeInsurer: "",
    guaranteeInsurerKo: "",
    // 본원(강서점) 실주소 — hospitals 테이블 값.
    addressLine1: "93 Magokjungang 6-ro, Gangseo-gu,",
    addressLine2: "Seoul, Republic of Korea",
    addressKo: "서울특별시 강서구 마곡중앙6로 93, 열린프라자 6,7,10층",
    contactEmail: "",
    // 대표번호는 공개 정보라 그대로 쓴다(immunehospital.com · hospitals 테이블 일치).
    contactPhone: "1588-2915",
    privacyOfficer: "Son Hyo-jun",
    privacyOfficerKo: "손효준",
    copyright: "© Immune Hospital. All rights reserved.",
    copyrightKo: "© 면력한방병원. All rights reserved.",
  },
};

export const TENANTS = {
  healwith: HEALWITH,
  immune: IMMUNE,
};

export const DEFAULT_TENANT_KEY = "healwith";

// healwith 의 한글 별칭. 네이버 검색이 본문 글자를 매칭하므로 곳곳에 병기돼 있다
// ("healwith(힐위드)"). 다른 병원 화면에 남으면 안 되므로 치환 대상에 함께 넣는다.
const BRAND_ALIAS_KO = "힐위드";

/** 지금 켜져 있는 테넌트 열쇠. 모르는 값이면 기본값으로 떨어진다(안전). */
export function activeTenantKey() {
  const raw = process.env.NEXT_PUBLIC_TENANT;
  return raw && Object.prototype.hasOwnProperty.call(TENANTS, raw) ? raw : DEFAULT_TENANT_KEY;
}

/** 지금 테넌트 설정 전체. */
export function getTenant() {
  return TENANTS[activeTenantKey()];
}

/** 기본(healwith)인가 — true 면 모든 치환 로직이 아무것도 하지 않아야 한다. */
export function isDefaultTenant() {
  return activeTenantKey() === DEFAULT_TENANT_KEY;
}

/** 해당 언어의 브랜드 표기명. 없는 언어는 en → 기본값 순으로 폴백. */
export function tenantBrandName(lang = "en") {
  const t = getTenant();
  return t.name[lang] || t.name.en || DEFAULT_TENANT_KEY;
}

/**
 * 문자열 안의 브랜드명을 지금 테넌트 이름으로 갈아끼운다.
 *
 * 기본 테넌트면 **원본 그대로 반환**(문자열 동일성까지 보존) — 실서비스 무영향의 핵심.
 * 사전 545군데에 박힌 "healwith" 를 파일마다 고치는 대신 t() 한 곳에서 처리하려는 것.
 *
 * ⚠️ 한계(실험에서 드러난 것, 기획서 §10-5 기록 대상):
 *   - 조사가 붙는 한국어("healwith는")는 이름이 바뀌면 조사가 어색해질 수 있다(면력한방병원는 ×).
 *     지금은 치환만 하고 조사 보정은 안 한다 — 실제 구축 때 문구를 병원별로 덮어쓰는 게 정석.
 *   - 도메인(healwith.co.kr)은 **일부러 안 건드린다.** 주소는 브랜드명이 아니라 설정이고,
 *     어설프게 바꾸면 「없는 주소」를 안내하게 된다.
 */
export function applyTenantBrand(text, lang = "en") {
  if (isDefaultTenant()) return text;
  if (typeof text !== "string" || text.length === 0) return text;
  if (!text.includes(DEFAULT_TENANT_KEY) && !text.includes(BRAND_ALIAS_KO)) return text;
  const brand = tenantBrandName(lang);
  const brandKo = tenantBrandName("ko");
  return (
    text
      // ① 한글 병기 패턴을 **먼저** 하나로 — "healwith(힐위드)" · "healwith 힐위드".
      //    안 그러면 각각 치환돼 "면력한방병원 면력한방병원" 같은 겹말이 된다
      //    (2026-07-28 목업 실험에서 한국어 <title> 이 "면력한방병원 힐위드" 로 나와 발각).
      .replace(/healwith\s*\(\s*힐위드\s*\)/g, brand)
      .replace(/healwith\s+힐위드/g, brand)
      // ② 도메인(healwith.co.kr 등)은 건드리지 않는다 — 뒤에 점+영문이 오면 주소로 본다.
      .replace(/healwith(?!\.[a-z])/g, brand)
      // ③ 홀로 남은 한글 별칭. healwith 고유 별칭이라 다른 병원 화면에 남으면 안 된다.
      .replace(/힐위드/g, brandKo)
  );
}
