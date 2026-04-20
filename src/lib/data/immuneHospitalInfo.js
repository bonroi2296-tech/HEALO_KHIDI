/**
 * Immune Hospital (면력한방병원) — 공식 정보
 *
 * 출처: https://immunehospital.com/ (2026-04-20 분석)
 * 한방 면역치료 전문 의료기관 / HEALO 직영 파트너
 */

export const IMMUNE_HOSPITAL = {
  slug: "immunehospital",
  officialName: {
    ko: "면력한방병원",
    en: "Immune Hospital",
    ru: "Иммун Госпиталь",
    kz: "Иммун госпиталі",
    zh: "免疫医院",
    ja: "免疫病院",
  },
  tagline: {
    ko: "건강한 변화를 향한 여정, 지금 면력에서 시작하세요",
    en: "A journey to healthy change — starting now.",
    ru: "Путь к здоровым переменам — начинается здесь.",
    kz: "Сау өзгеріске бастау жолы — қазір осы жерде.",
    zh: "向着健康变化的旅程，从免疫医院开始。",
    ja: "健康な変化への旅、今、免疫病院から。",
  },

  representative: "황이준 (Hwang Yi-jun)",
  mainPhone: "1588-2915",
  cumulativeCases: "50,000+",
  cumulativeAsOf: "2024-11-06",

  branches: [
    {
      id: "magok",
      name: {
        ko: "마곡 본원 (강서)",
        en: "Magok (HQ, Gangseo)",
        ru: "Магок (головной офис)",
        kz: "Магок (бас кеңсе)",
        zh: "麻谷本院（江西）",
        ja: "麻谷本院（江西）",
      },
      address: {
        ko: "서울 강서구 마곡중앙6로 93 열린프라자 6층, 7층, 10층",
        en: "Open Plaza 6F/7F/10F, 93 Magokjungang 6-ro, Gangseo-gu, Seoul",
      },
      phone: "1588-2915",
      hours: {
        weekday: "09:00-20:00 (break 13:00-14:00)",
        weekend: "09:00-15:00",
      },
      subdomain: "https://immunehospital.com/",
    },
    {
      id: "sinchon",
      name: { ko: "신촌점", en: "Sinchon" },
      subdomain: "https://sc.immunehospital.com/",
    },
    {
      id: "gwangmyeong",
      name: { ko: "광명점", en: "Gwangmyeong" },
      subdomain: "https://km.immunehospital.com/",
    },
    {
      id: "seongdong",
      name: { ko: "성동점 (개원 예정)", en: "Seongdong (coming soon)" },
      subdomain: "https://sd.immunehospital.com/",
    },
  ],

  // 핵심 센터
  centers: [
    {
      id: "cancer",
      name: { ko: "암면역센터", en: "Cancer Immunity Center", ru: "Центр онкоиммунологии", kz: "Онкоиммунология орталығы", zh: "癌症免疫中心", ja: "がん免疫センター" },
      description: {
        ko: "유방·자궁·난소·대장·위·간·담도·췌장·폐·갑상선암 등 주요 암종에 대한 한방 면역 통합 케어",
        en: "Integrated Korean Medicine immune care for breast, uterine, ovarian, colorectal, gastric, liver, biliary, pancreatic, lung, thyroid and other cancers",
        ru: "Комплексная иммунная терапия корейской медицины при раке молочной железы, матки, яичников, кишечника, желудка, печени, лёгких, щитовидной железы и др.",
        kz: "Сүт безі, жатыр, аналық без, ішек, асқазан, бауыр, өкпе, қалқанша без обырлары үшін кешенді иммундық емдеу",
        zh: "针对乳腺、子宫、卵巢、大肠、胃、肝、胆、胰、肺、甲状腺等主要癌症的韩方免疫综合护理",
        ja: "乳がん、子宮がん、卵巣がん、大腸がん、胃がん、肝がん、胆道がん、膵がん、肺がん、甲状腺がん等の主要がんに対する韓方免疫統合ケア",
      },
    },
    {
      id: "neuro",
      name: { ko: "신경면역센터", en: "Neuro-Immunity Center" },
      description: {
        ko: "대상포진·안면마비·줄기세포 치료",
        en: "Shingles, facial paralysis, and stem cell therapy",
      },
    },
    {
      id: "rehab",
      name: { ko: "재활센터", en: "Rehabilitation Center" },
      description: {
        ko: "부인과 수술 후·교통사고 후유증·수술 후 재활",
        en: "Post-gynecological surgery, traffic-accident aftereffects, post-surgery rehabilitation",
      },
    },
  ],

  // 5단계 통합 면역치료 프로세스 (암면역센터)
  process: [
    {
      step: 1,
      phase: { ko: "수술 전 면역관리", en: "Pre-surgery immune care" },
      goals: {
        ko: ["체력 강화", "면역력 증진", "감염 예방"],
        en: ["Strength conditioning", "Immune boosting", "Infection prevention"],
      },
    },
    {
      step: 2,
      phase: { ko: "수술 후 회복·재활", en: "Post-surgery recovery" },
      goals: {
        ko: ["수술 후유증 완화", "체력·면역력 회복", "신체기능 정상화", "감염 관리"],
        en: ["Relieve surgical aftereffects", "Restore strength & immunity", "Normalize function", "Infection control"],
      },
    },
    {
      step: 3,
      phase: { ko: "항암·방사선 치료 효과 개선", en: "Improve chemo/radiation efficacy" },
      goals: {
        ko: [
          "항암치료율 향상",
          "항암부작용 감소",
          "항암내성 완화",
          "암성통증 관리",
          "손상 조직 회복",
          "면역체계 정상화",
        ],
        en: [
          "Improve treatment response",
          "Reduce chemo side effects",
          "Reduce chemo resistance",
          "Cancer pain management",
          "Damaged-tissue recovery",
          "Immune normalization",
        ],
      },
    },
    {
      step: 4,
      phase: { ko: "2차암·전이·재발 관리", en: "Secondary cancer / metastasis / recurrence management" },
      goals: {
        ko: [
          "면역세포 활성화",
          "암세포 증식 억제",
          "미세 잔존 암세포 사멸",
          "면역체계 강화·안정화",
        ],
        en: [
          "Immune cell activation",
          "Cancer cell proliferation suppression",
          "Eliminate microscopic residual cells",
          "Immune system stabilization",
        ],
      },
    },
    {
      step: 5,
      phase: { ko: "지속적 추적 관찰", en: "Long-term follow-up" },
      goals: {
        ko: ["정기 검진", "증상 모니터링", "생활습관 코칭"],
        en: ["Regular screenings", "Symptom monitoring", "Lifestyle coaching"],
      },
    },
  ],

  // 심신통합 프로그램
  integrativePrograms: [
    { ko: "야외 산책 프로그램 (평일 오전)", en: "Outdoor walking program (weekday mornings)" },
    { ko: "주 1회 병원 밖 힐링 소풍", en: "Weekly healing picnic" },
    { ko: "주 1회 전문 치료사 동반 운동치료", en: "Weekly guided exercise therapy with specialist" },
    { ko: "2주 1회 셰프와 함께하는 푸드테라피", en: "Bi-weekly food therapy with on-site chef" },
    { ko: "주 1회 주제별 원데이 클래스", en: "Weekly themed one-day class" },
  ],

  // 협진 체계
  teamStructure: {
    ko: "의료진 + 임상 영양사 + 치료식 전문 셰프 협진. 의료진이 의학적 상태를 진단하고, 영양사가 식습관을 분석하며, 셰프가 프리미엄 치료식을 제공합니다.",
    en: "Multidisciplinary team: physicians + clinical dietitian + in-house therapeutic chef. Doctors diagnose, dietitian profiles nutrition, and chef prepares premium treatment meals.",
  },

  // 의료진
  doctors: [
    { name: "황이준", nameEn: "Hwang Yi-jun", role: "대표원장", roleEn: "Chief Director", specialty: "통합면역, 암환자 케어", branch: "magok" },
    { name: "이우석", nameEn: "Lee Woo-seok", role: "양방대표원장", roleEn: "Chief (Western Medicine)", specialty: "통합면역, 부인과", branch: "magok" },
    { name: "임지성", nameEn: "Im Ji-seong", role: "의무원장", roleEn: "Medical Director", specialty: "통증재활, 한방재활의학과", branch: "magok" },
    { name: "김지영", nameEn: "Kim Ji-young", role: "진료원장", roleEn: "Attending Director", specialty: "통합면역, 한방내과", branch: "magok" },
    { name: "김은지", nameEn: "Kim Eun-ji", role: "진료원장", roleEn: "Attending Director", specialty: "통합면역, 한방내과", branch: "magok" },
    { name: "배상근", nameEn: "Bae Sang-geun", role: "양방원장", roleEn: "Director (Western Medicine)", specialty: "통합면역, 가정의학", branch: "magok" },
    { name: "김정현", nameEn: "Kim Jeong-hyeon", role: "진료원장", roleEn: "Attending Director", specialty: "통증재활", branch: "magok" },
  ],

  website: "https://immunehospital.com/",
};
