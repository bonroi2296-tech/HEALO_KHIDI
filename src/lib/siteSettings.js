import { getTenant, tenantBrandName } from "@/lib/tenant";

// 「누구의 사이트인지」는 테넌트 설정이 단일 SoR(src/lib/tenant/index.js).
// NEXT_PUBLIC_TENANT 를 안 켜면 TENANT 는 healwith → 아래 값들이 예전 하드코딩과 글자까지 동일하다.
// 환경변수(env)는 여전히 테넌트보다 우선한다 — 기존 배포 설정을 깨지 않기 위해서.
const TENANT = getTenant();

export const SITE_INFO = {
  messenger: {
    whatsapp: process.env.NEXT_PUBLIC_MESSENGER_WHATSAPP_URL || TENANT.messenger.whatsapp,
    // 환자용 공식 봇 @healwith_bot (2026-07-23 개통). 텔레그램 주소가 차면 /inquiry 의
    // Human Agent 가 바로가기 대신 WhatsApp·Telegram 선택 화면(picker)을 띄운다.
    // ⚠️ ?start=<표식> 딥링크를 붙이지 말 것(2026-07-23 PO): start 파라미터가 있으면 이미
    // 대화하던 사용자도 재입장 때마다 '/start'가 채팅에 찍힌다(텔레그램 프로토콜). 표식을
    // 빼면 재입장은 그냥 채팅이 열리고, /start 는 신규 사용자의 최초 1회(START 버튼)만 남는다.
    // 대가: 유입경로(utm.start_param) 구분을 포기 — 채널 자체(telegram)는 스레드에 계속 기록됨.
    telegram: process.env.NEXT_PUBLIC_MESSENGER_TELEGRAM_URL || TENANT.messenger.telegram,
    line: process.env.NEXT_PUBLIC_MESSENGER_LINE_URL || TENANT.messenger.line,
    wechat: process.env.NEXT_PUBLIC_MESSENGER_WECHAT_URL || TENANT.messenger.wechat,
  },
  brand: {
    name: tenantBrandName("en"),
    tagline: TENANT.tagline,
  },
  navigation: {
    company: [
      // label 은 i18n(labelKey) 이 없을 때만 쓰는 폴백이라 en 표기로 충분.
      { labelKey: "nav.about", label: `About ${tenantBrandName("en")}`, href: "/about" },
      { labelKey: "nav.contact", label: "Contact Us", href: "/contact" },
      { labelKey: "nav.partners", label: "Partners", href: "/partners" },
    ],
    legal: [
      { labelKey: "nav.privacy", label: "Privacy Policy", href: "/privacy" },
      { labelKey: "nav.terms", label: "Terms of Service", href: "/terms" },
    ],
  },
  // ⚠️ 법인정보의 단일 SoR 은 이제 **테넌트 설정**(src/lib/tenant/index.js)이다.
  //    여기에 값을 다시 적으면 spread 뒤에 와서 테넌트를 조용히 덮어쓴다 — 적지 말 것.
  //
  //    healwith 값에 붙어 있던 결정 기록(옮겨 적음):
  //    · 사업자 구분(개인사업자 등)은 고유명사가 아니라 분류라 i18n(footer.biz.soleProprietor)이 SoR.
  //      여기 문자열로 되살리면 소비처 0인 유령 값이 된다("여기만 고치고 화면은 안 바뀜" 함정).
  //    · guaranteeInsurer = SGI 서울보증 배상책임(의료관광) 1억, 유치업 법정 요건 실물.
  //      갱신형이라 만료일은 일부러 표기 안 함(문서-현실 드리프트 방지).
  //      보험사명은 고유명사라 번역 안 하고, 담보종류·금액은 설명이라 i18n(footer.biz.insuranceScope).
  //    · addressKo·representativeKo·copyrightKo = 한국어 화면 전용. 외국어 5개 화면은 로마자를 쓴다
  //      — 러시아·카자흐 환자에겐 한글 주소가 읽히지도, 서류·택시에 쓰이지도 않는다.
  //    · copyrightKo 의 "힐위드" 병기: 네이버 검색은 본문에 실제 글자가 있어야 매칭된다.
  //      한국어 화면에서만 노출(영어 화면 한글누출 가드 i18n-no-korean-leak 준수) — ClientShell 푸터 분기.
  legal: { ...TENANT.legal },
};
