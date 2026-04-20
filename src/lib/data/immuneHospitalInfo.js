/**
 * Immune Hospital (면력한방병원) — 공식 정보
 *
 * 출처: https://immunehospital.com/ (2026-04-20 정밀 분석)
 * 한방 면역치료 전문 의료기관 / HEALO 직영 파트너
 */

export const IMMUNE_HOSPITAL = {
  slug: "immunehospital",
  officialName: {
    ko: "면력한방병원",
    en: "Immune Hospital",
    ru: "Иммунная Клиника",
    kz: "Иммундық клиника",
    zh: "免疫医院",
    ja: "免疫病院",
  },
  tagline: {
    ko: "Care You Need, Care You Trust",
    en: "Care You Need, Care You Trust",
    ru: "Забота, в которой вы нуждаетесь",
    kz: "Сізге қажетті күтім",
    zh: "您所需的照护，您能信赖的照护",
    ja: "必要なケア、信頼できるケア",
  },
  subtagline: {
    ko: "건강한 변화를 향한 여정, 지금 면력에서 시작하세요",
    en: "A journey to healthy change — starting now.",
  },

  representative: { ko: "황이준", en: "Hwang Yi-jun" },
  foundedYear: 2017,
  mainPhone: "1588-2915",
  cumulativeCases: "50,000+",
  cumulativeAsOf: "2024-11-06",

  // ===== 4개 지점 =====
  branches: [
    {
      id: "magok",
      name: {
        ko: "마곡 본원 (강서)",
        en: "Magok HQ (Gangseo)",
        ru: "Магок (головной офис)",
      },
      address: {
        ko: "서울 강서구 마곡중앙6로 93 열린프라자 6층, 7층, 10층",
        en: "Open Plaza 6F/7F/10F, 93 Magokjungang 6-ro, Gangseo-gu, Seoul",
      },
      phone: "1588-2915",
      hours: {
        weekday: {
          ko: "평일 09:00-20:00 (점심 13:00-14:00, 야간진료)",
          en: "Mon-Fri 09:00-20:00 (lunch 13:00-14:00, evening clinic)",
        },
        weekend: {
          ko: "토·일·공휴일 09:00-15:00",
          en: "Sat/Sun/Holidays 09:00-15:00",
        },
      },
      parking: {
        ko: "입·퇴원 3시간 무료, 외래 3시간 무료 (초과 시 유료)",
        en: "3 hours free for admission/discharge & outpatient. Paid beyond.",
      },
      nearby: {
        ko: "이대서울병원 도보 1분",
        en: "1-min walk from Ewha Womans University Seoul Hospital",
      },
      url: "https://immunehospital.com/",
    },
    {
      id: "sinchon",
      name: { ko: "신촌점", en: "Sinchon" },
      url: "https://sc.immunehospital.com/",
    },
    {
      id: "gwangmyeong",
      name: { ko: "광명점", en: "Gwangmyeong" },
      url: "https://km.immunehospital.com/",
    },
    {
      id: "seongdong",
      name: { ko: "성동점 (개원 예정)", en: "Seongdong (coming soon)" },
      url: "https://sd.immunehospital.com/",
    },
  ],

  // ===== 3개 센터 =====
  centers: [
    {
      id: "cancer",
      name: { ko: "암면역센터", en: "Cancer Immunity Center" },
      description: {
        ko: "주요 암종 수술 전후 한방 면역 통합 케어",
        en: "Integrated Korean Medicine immune care around cancer surgery",
      },
    },
    {
      id: "neuro",
      name: { ko: "신경면역센터", en: "Neuro-Immunity Center" },
      description: {
        ko: "대상포진·안면마비·줄기세포 치료",
        en: "Shingles, facial paralysis, stem cell therapy",
      },
    },
    {
      id: "rehab",
      name: { ko: "재활센터", en: "Rehabilitation Center" },
      description: {
        ko: "부인과 수술 후·교통사고 후유증·수술 후 재활",
        en: "Post-gynecological surgery, traffic-accident, post-surgery rehab",
      },
    },
  ],

  // ===== 핵심 치료 철학: ITCR 5원칙 =====
  // Immunity · Temperature · Circulation · Resistibility · Nutrition
  principles: [
    {
      letter: "I",
      id: "immunity",
      name: { ko: "면역", en: "Immunity" },
      description: {
        ko: "세포·체액 면역 복합 치료로 면역력 회복",
        en: "Cellular & humoral immunity treatments to restore immune function",
      },
    },
    {
      letter: "T",
      id: "temperature",
      name: { ko: "체온", en: "Temperature" },
      description: {
        ko: "고주파·적외선 온열로 심부 체온 상승",
        en: "High-frequency & infrared hyperthermia to raise core body temperature",
      },
    },
    {
      letter: "C",
      id: "circulation",
      name: { ko: "순환", en: "Circulation" },
      description: {
        ko: "림프도수·침전기물리치료로 혈액·림프 순환 개선",
        en: "Lymphatic drainage & electrotherapy to improve blood/lymph flow",
      },
    },
    {
      letter: "R",
      id: "resistibility",
      name: { ko: "저항성", en: "Resistibility" },
      description: {
        ko: "항산화·항노화 요법으로 세포 저항력 강화",
        en: "Antioxidant & anti-aging therapy to strengthen cellular resistance",
      },
    },
    {
      letter: "N",
      id: "nutrition",
      name: { ko: "영양", en: "Nutrition" },
      description: {
        ko: "임상 영양사 + 전담 셰프의 맞춤 치료식",
        en: "Custom therapeutic meals by clinical dietitian & in-house chef",
      },
    },
  ],

  // ===== 구체적 치료법 =====
  treatments: {
    cellular: {
      category: { ko: "세포면역", en: "Cellular Immunity" },
      items: [
        { ko: "싸이모신 알파1 요법", en: "Thymosin α1 therapy" },
        { ko: "미슬토 요법", en: "Mistletoe therapy" },
        { ko: "이뮤노시아닌", en: "Immunocyanin" },
        { ko: "NK세포 치료제", en: "NK cell therapy" },
        { ko: "항암면역증강제", en: "Immune-enhancing adjuvants" },
      ],
    },
    humoral: {
      category: { ko: "체액면역", en: "Humoral Immunity" },
      items: [
        { ko: "글루타민 주사", en: "Glutamine injection" },
        { ko: "면역플러스 (황기 부정단 처방)", en: "ImmunePlus (Hwanggi Bujeongdan formula)" },
      ],
    },
    thermal: {
      category: { ko: "온열 치료", en: "Thermal Therapy" },
      items: [
        { ko: "고주파 온열암치료", en: "High-frequency hyperthermia" },
        { ko: "적외선 온열요법", en: "Infrared hyperthermia" },
      ],
    },
    supportive: {
      category: { ko: "순환·보조", en: "Circulatory & Supportive" },
      items: [
        { ko: "림프 도수치료", en: "Manual lymphatic drainage" },
        { ko: "침전기물리치료", en: "Electro-acupuncture physical therapy" },
      ],
    },
    nutritional: {
      category: { ko: "영양 요법", en: "Nutritional Therapy" },
      items: [
        { ko: "셀레늄 요법", en: "Selenium therapy" },
        { ko: "글루타치온 요법", en: "Glutathione therapy" },
        { ko: "고농도 비타민 요법", en: "High-dose vitamin therapy" },
      ],
    },
  },

  // ===== 암종별 특화 =====
  cancerPrograms: [
    {
      id: "female",
      name: { ko: "유방·자궁·난소암", en: "Breast / Uterine / Ovarian" },
      focus: {
        ko: "수술부위 관리(배액관·상처·일상·자세) + 기력 회복 + 맞춤 30여 종 면역 회복 선택식 + 셰프 라이브 코너",
        en: "Surgical site care (drain, wound, daily activity, posture) + strength recovery + 30+ custom immune meals + chef live corner",
      },
    },
    {
      id: "digest",
      name: { ko: "대장·위암", en: "Colorectal / Gastric" },
      focus: {
        ko: "수술 후 8대 증상(고열·문합부 누출·장기능 변화 등) 관리 + 장루 관리 + 저잔사식·위절제식 맞춤 식이",
        en: "Post-op 8-symptom management (fever, anastomotic leak, bowel changes) + ostomy care + low-residue/post-gastrectomy meal plans",
      },
    },
    {
      id: "liver",
      name: { ko: "간·담도·췌장암", en: "Liver / Biliary / Pancreatic" },
      focus: {
        ko: "간수치 정상화·황달·소화기능·영양흡수·체중감소 관리. NK세포 + 고주파 온열 + 항산화 요법 중심",
        en: "Liver enzyme normalization, jaundice, digestive function, nutrient absorption, weight loss. NK cell + hyperthermia + antioxidant therapy",
      },
    },
    {
      id: "lung",
      name: { ko: "폐암", en: "Lung" },
      focus: {
        ko: "호흡곤란·기침·가래·흉통·체력저하 관리. 심호흡 훈련·풍선 불기 재활 + 면역 회복 프로그램",
        en: "Dyspnea, cough, sputum, chest pain, fatigue. Deep breathing drills, balloon therapy + immune recovery program",
      },
    },
    {
      id: "thyroid",
      name: { ko: "갑상선암", en: "Thyroid" },
      focus: {
        ko: "목소리 변화·저칼슘혈증·호르몬 부족·경부 흉터 관리. ITCR 5원칙 기반 회복",
        en: "Voice changes, hypocalcemia, hormone deficiency, neck scar care. Recovery via 5 ITCR principles",
      },
    },
    {
      id: "etc",
      name: { ko: "기타 암종", en: "Other cancers" },
      focus: {
        ko: "각 암종 맞춤 상담 후 프로그램 구성",
        en: "Custom program after consultation for each cancer type",
      },
    },
  ],

  // ===== 5단계 프로세스 =====
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
        en: ["Relieve aftereffects", "Restore strength & immunity", "Normalize function", "Infection control"],
      },
    },
    {
      step: 3,
      phase: { ko: "항암·방사선 치료 효과 개선", en: "Improve chemo/radiation efficacy" },
      goals: {
        ko: ["항암치료율 향상", "부작용 감소", "내성 완화", "암성통증 관리", "손상 조직 회복", "면역 정상화"],
        en: ["Improve response", "Reduce side effects", "Reduce resistance", "Pain management", "Tissue recovery", "Immune normalization"],
      },
    },
    {
      step: 4,
      phase: { ko: "2차암·전이·재발 관리", en: "Secondary cancer / recurrence" },
      goals: {
        ko: ["면역세포 활성화", "암세포 증식 억제", "미세 잔존 암세포 사멸", "면역 안정화"],
        en: ["Immune cell activation", "Suppress proliferation", "Eliminate residual cells", "Immune stabilization"],
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

  // ===== 심신통합 프로그램 =====
  integrativePrograms: [
    {
      id: "food",
      label: { ko: "셰프 푸드테라피", en: "Chef food therapy" },
      desc: { ko: "2주 1회 전담 셰프와 함께하는 맞춤 치료식 + 라이브 코너", en: "Bi-weekly personalized therapeutic meals with in-house chef" },
    },
    {
      id: "walking",
      label: { ko: "야외 산책", en: "Outdoor walking" },
      desc: { ko: "평일 오전 강변 산책 버스", en: "Weekday-morning riverside walking shuttle" },
    },
    {
      id: "exercise",
      label: { ko: "운동치료", en: "Movement therapy" },
      desc: { ko: "주 1회 전문 치료사 동반", en: "Weekly specialist-led session" },
    },
    {
      id: "picnic",
      label: { ko: "힐링 소풍", en: "Healing picnic" },
      desc: { ko: "주 1회 병원 밖 휴식", en: "Weekly off-site rest" },
    },
    {
      id: "class",
      label: { ko: "원데이 클래스", en: "One-day class" },
      desc: { ko: "공예·명상·셀프케어 주제별", en: "Craft · meditation · self-care themes" },
    },
  ],

  // ===== 시설 =====
  facilities: [
    {
      id: "vip",
      name: { ko: "VIP 입원실", en: "VIP rooms" },
      description: {
        ko: "프라이버시를 보장하는 1인실. 모션베드, 개인 냉장고, Smart TV, 안마의자, Wi-Fi, 병실 내 샤워실",
        en: "Private rooms with motion bed, personal fridge, smart TV, massage chair, Wi-Fi, in-room shower",
      },
      images: [
        "https://immunehospital.com/uploads/facilities/68be408d5f7644.95684766.jpg",
        "https://immunehospital.com/uploads/facilities/68be40b4b1d8c5.23151011.jpg",
        "https://immunehospital.com/uploads/facilities/68be40c36bec25.48300415.jpg",
        "https://immunehospital.com/uploads/facilities/68be40d00efbe8.92716455.jpg",
      ],
    },
    {
      id: "shared",
      name: { ko: "다인 입원실", en: "Shared rooms" },
      description: {
        ko: "아늑한 공간과 효율적 동선. 모션베드, 개인 냉장고, Smart TV, 개인 캐비넷, Wi-Fi, 샤워실",
        en: "Comfortable with efficient flow. Motion bed, fridge, smart TV, personal cabinet, Wi-Fi, shower",
      },
      images: [
        "https://immunehospital.com/uploads/facilities/68be41219b4160.51146831.jpg",
        "https://immunehospital.com/uploads/facilities/68be412b85d8b7.40777135.jpg",
        "https://immunehospital.com/uploads/facilities/68be413524d368.74504271.jpg",
      ],
    },
    {
      id: "treatment",
      name: { ko: "치료 공간", en: "Treatment rooms" },
      description: {
        ko: "고주파·적외선·침치료 등 통합 치료 전용 공간",
        en: "Dedicated rooms for hyperthermia, infrared, acupuncture",
      },
      images: [
        "https://immunehospital.com/uploads/facilities/6895d4fa2ed0b9.39462196.jpg",
        "https://immunehospital.com/uploads/facilities/6895d5060a54a4.33929598.jpg",
        "https://immunehospital.com/uploads/facilities/6895d50fd16de4.42589908.jpg",
        "https://immunehospital.com/uploads/facilities/6895d519331118.44767347.jpg",
      ],
    },
    {
      id: "healing",
      name: { ko: "힐링 공간", en: "Healing spaces" },
      description: {
        ko: "24시간·365일 휴식할 수 있는 아늑한 환경",
        en: "Comfortable rest environment available 24/7/365",
      },
      images: [
        "https://immunehospital.com/uploads/facilities/6895e97c9bb5b9.72629469.jpg",
        "https://immunehospital.com/uploads/facilities/6895e984e72530.73501440.jpg",
        "https://immunehospital.com/uploads/facilities/6895e98da907d6.04767846.jpg",
        "https://immunehospital.com/uploads/facilities/68bea94b7914a9.24667654.jpg",
        "https://immunehospital.com/uploads/facilities/6895e996409ee8.20820981.jpg",
        "https://immunehospital.com/uploads/facilities/6895e9a27163b3.11074499.jpg",
      ],
    },
  ],

  // ===== 의료진 =====
  doctors: [
    {
      name: { ko: "황이준", en: "Hwang Yi-jun" },
      role: { ko: "대표원장", en: "Chief Director" },
      specialty: { ko: "통합면역 · 암환자 케어", en: "Integrative Immunology · Cancer Care" },
      photo: "https://immunehospital.com/uploads/doctors/68a674036de695.54364290.png",
      branch: "magok",
    },
    {
      name: { ko: "이우석", en: "Lee Woo-seok" },
      role: { ko: "양방 대표원장", en: "Chief (Western Medicine)" },
      specialty: { ko: "통합면역 · 부인과", en: "Integrative Immunology · Gynecology" },
      photo: "https://immunehospital.com/uploads/doctors/68a42d8de9e095.75488957.jpg",
      branch: "magok",
    },
    {
      name: { ko: "임지성", en: "Im Ji-seong" },
      role: { ko: "의무원장", en: "Medical Director" },
      specialty: { ko: "통증재활 · 한방재활의학과", en: "Pain Rehab · KM Rehabilitation" },
      photo: "https://immunehospital.com/uploads/doctors/68ff2829546a03.48601548.jpg",
      branch: "magok",
    },
    {
      name: { ko: "김지영", en: "Kim Ji-young" },
      role: { ko: "진료원장", en: "Attending Director" },
      specialty: { ko: "통합면역 · 한방내과", en: "Integrative Immunology · KM Internal Medicine" },
      photo: "https://immunehospital.com/uploads/doctors/68a42f470df8e0.51544383.jpg",
      branch: "magok",
    },
    {
      name: { ko: "김은지", en: "Kim Eun-ji" },
      role: { ko: "진료원장", en: "Attending Director" },
      specialty: { ko: "통합면역 · 한방내과", en: "Integrative Immunology · KM Internal Medicine" },
      photo: "https://immunehospital.com/uploads/doctors/68a42d656c1818.66316770.jpg",
      branch: "magok",
    },
    {
      name: { ko: "배상근", en: "Bae Sang-geun" },
      role: { ko: "양방 원장", en: "Director (Western Medicine)" },
      specialty: { ko: "통합면역 · 가정의학", en: "Integrative Immunology · Family Medicine" },
      photo: "https://immunehospital.com/uploads/doctors/690b00eb512ff3.09917549.jpg",
      branch: "magok",
    },
    {
      name: { ko: "김정현", en: "Kim Jeong-hyeon" },
      role: { ko: "진료원장", en: "Attending Director" },
      specialty: { ko: "통증재활", en: "Pain Rehab" },
      photo: "https://immunehospital.com/uploads/doctors/69d6ee664689b0.12934912.jpg",
      branch: "magok",
    },
  ],

  // ===== 협진 체계 =====
  teamStructure: {
    ko: "의료진(한방+양방 협진) + 임상 영양사 + 치료식 전담 셰프의 3축 협진. 누적 50,000+ 사례.",
    en: "Three-axis collaboration: physicians (KM+Western) + clinical dietitian + in-house therapeutic chef. 50,000+ cumulative cases.",
  },

  // ===== 근거 자료 =====
  evidenceNote: {
    ko: "참고 논문: 말기 위암환자 수술 후 한방 병행 치료 시 생존율 개선 사례 보고됨. 개별 예후는 환자 상태에 따라 다를 수 있으며, 실제 효과는 의료진과 상담 필요.",
    en: "Reference: published cases report improved survival when combining Korean Medicine with post-surgical care for late-stage gastric cancer. Individual outcomes vary and require physician consultation.",
  },

  website: "https://immunehospital.com/",
};
