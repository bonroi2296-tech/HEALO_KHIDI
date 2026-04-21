/**
 * 면력한방병원 시설 정보
 * 출처: https://immunehospital.com/pages/hospital/facility.php
 * 수집일: 2026-04-21
 * 저작권: 면력한방병원 (자사 병원, 저작권 OK)
 */

export const IMMUNE_FACILITIES = {
  vip: {
    id: "vip",
    title: { ko: "VIP 입원실", en: "VIP Private Room", ru: "VIP Палата" },
    description: {
      ko: "특별한 당신을 위해 한 차원 더 높은 기준을 제시합니다. 프라이버시를 보장하는 아늑한 공간에서 몸과 마음을 치유하며, 진정한 휴식을 경험하세요.",
      en: "We set a higher standard for you. Heal your body and mind in a cozy space that guarantees privacy and experience true rest.",
      ru: "Мы предлагаем более высокий стандарт для вас. Исцелите тело и разум в уютном пространстве, гарантирующем конфиденциальность.",
    },
    amenities: {
      ko: ["모션베드", "개인 냉장고", "Smart TV", "안마의자", "Wi-Fi", "병실 내 샤워실"],
      en: ["Motion Bed", "Personal Refrigerator", "Smart TV", "Massage Chair", "Wi-Fi", "In-room Shower"],
    },
    price: {
      min: 200000,
      max: 600000,
      unit: "KRW/day",
      note: { ko: "1인실 기준 (비급여)", en: "Single room (non-covered)" },
    },
    images: [
      "/immune/facility/facility-vip-room-1.jpg",
      "/immune/facility/facility-vip-room-2.jpg",
      "/immune/facility/facility-vip-room-3.jpg",
      "/immune/facility/facility-vip-room-4.jpg",
      "/immune/facility/facility-vip-room-5.jpg",
    ],
  },

  ward: {
    id: "ward",
    title: { ko: "다인 입원실", en: "Multi-person Ward", ru: "Общая Палата" },
    description: {
      ko: "모두를 위한 편안함과 세심한 배려를 담았습니다. 아늑한 공간과 효율적인 동선으로 진료와 휴식의 조화를 이루며, 함께하는 시간을 더 편안하게 만들어 드립니다.",
      en: "Comfort and thoughtful care for everyone. Our cozy space with efficient layout creates harmony between treatment and rest.",
      ru: "Комфорт и забота для всех. Уютное пространство с эффективной планировкой создаёт гармонию между лечением и отдыхом.",
    },
    amenities: {
      ko: ["모션베드", "개인 냉장고", "Smart TV", "개인 캐비넷", "Wi-Fi", "병실 내 샤워실"],
      en: ["Motion Bed", "Personal Refrigerator", "Smart TV", "Personal Cabinet", "Wi-Fi", "In-room Shower"],
    },
    images: [
      "/immune/facility/facility-ward-room-1.jpg",
      "/immune/facility/facility-ward-room-2.jpg",
      "/immune/facility/facility-ward-room-3.jpg",
    ],
  },

  treatment: {
    id: "treatment",
    title: { ko: "치료공간", en: "Treatment Space", ru: "Процедурный Кабинет" },
    description: {
      ko: "치유를 위한 최적의 공간을 제공합니다. 효율적이고 안락한 치료 환경에서, 몸과 마음의 회복이 조화롭게 이루어질 수 있도록 세심하게 설계했습니다.",
      en: "Providing the optimal space for healing. Carefully designed so that body and mind recovery can happen harmoniously in an efficient and comfortable treatment environment.",
      ru: "Оптимальное пространство для лечения, тщательно спроектированное для гармоничного восстановления тела и разума.",
    },
    images: [
      "/immune/facility/facility-treatment-room-1.jpg",
      "/immune/facility/facility-treatment-room-2.jpg",
      "/immune/facility/facility-treatment-room-3.jpg",
      "/immune/facility/facility-treatment-room-4.jpg",
    ],
  },

  healing: {
    id: "healing",
    title: { ko: "힐링공간", en: "Healing Space", ru: "Зона Отдыха" },
    description: {
      ko: "몸과 마음이 쉬어가는 힐링의 공간. 편안하고 아늑한 환경에서 진정한 휴식과 재충전을 경험하세요. 24시간/365일 힐링 할 수 있는 환경",
      en: "A healing space where body and mind can rest. Experience true relaxation and recharge in a comfortable and cozy environment available 24/7 year-round.",
      ru: "Пространство для исцеления, где тело и разум могут отдохнуть. Истинное расслабление и восстановление 24/7 в уютной обстановке.",
    },
    availableHours: "24/7",
    images: [
      "/immune/facility/facility-healing-space-1.jpg",
      "/immune/facility/facility-healing-space-2.jpg",
      "/immune/facility/facility-healing-space-3.jpg",
      "/immune/facility/facility-healing-space-4.jpg",
      "/immune/facility/facility-healing-space-6.jpg",
      "/immune/facility/facility-healing-space-7.jpg",
    ],
  },
};

// 병원 소개 이미지
export const HOSPITAL_ABOUT_IMAGES = {
  visual: "/immune/misc/hospital-visual.jpg",
  about: "/immune/misc/hospital-about.jpg",
  programs: [
    { src: "/immune/misc/hospital-program1.jpg", label: { ko: "통합의학 면역 치료", en: "Integrative Immune Therapy" } },
    { src: "/immune/misc/hospital-program2.jpg", label: { ko: "면역 식이요법", en: "Immune Diet Therapy" } },
    { src: "/immune/misc/hospital-program3.jpg", label: { ko: "재활 치료 프로그램", en: "Rehabilitation Program" } },
    { src: "/immune/misc/hospital-program4.jpg", label: { ko: "힐링 프로그램", en: "Healing Program" } },
  ],
  newFacility: [
    "/immune/misc/new-facility1.jpg",
    "/immune/misc/new-facility2.jpg",
    "/immune/misc/new-facility3.jpg",
  ],
};

// 병원 연혁
export const HOSPITAL_HISTORY = [
  { year: 2017, event: { ko: "면력한방병원 개원 (강서)", en: "Immune Hospital Founded (Gangeo)" } },
  { year: 2019, event: { ko: "면역병동 오픈 — 5원칙 기반 개인 맞춤 치료 도입", en: "Immune Ward opened — 5-principle personalized treatment" } },
  { year: 2020, event: { ko: "면역센터 오픈 — 한·양방 통합 치료 시스템 구축", en: "Immune Center opened — Korean-Western integrated system" } },
  { year: 2021, event: { ko: "광명면력한방병원 개원", en: "Gwangmyeong branch opened" } },
  { year: 2023, event: { ko: "광명 병동 확장, 신촌면력한방병원 개원", en: "Gwangmyeong expanded, Sinchon branch opened" } },
];

export const FACILITY_LIST = Object.values(IMMUNE_FACILITIES);
