/**
 * 면력한방병원(Immune Hospital) 암종별 치료 정보 — 공식 사이트 기반
 * 출처: https://immunehospital.com/pages/cancer/*
 * 수집일: 2026-04-21
 *
 * 공통 5축 치료 프레임워크 (ITCRN):
 *   I — Immunity (면역): 싸이모신α1, 미슬토, NK세포, 항암면역증강제
 *   T — Temperature (체온): 고주파온열, 적외선온열
 *   C — Circulation (순환): 림프도수, 침전기물리치료
 *   R — Resistibility (저항성): 셀레늄, 글루타치온, 고농도비타민, 태반추출물
 *   N — Nutrition (영양): 30+ 맞춤식, 셰프 라이브
 *
 * 공통 통계:
 *   - 누적 케이스: 50,000+ (2024.11.06 기준)
 *   - 생존율 개선: 말기위암 한방+항암 병행 시 54%
 *   - 대표번호: 1588-2915
 *   - 운영: 평일 09:00–20:00 (야간), 토일공휴일 09:00–15:00
 */

// 공통 치료 축 — 모든 암종 공통 적용
export const ITCRN_FRAMEWORK = {
  immunity: {
    title: { ko: "면역 (Immunity)", en: "Immunity", ru: "Иммунитет" },
    desc: {
      ko: "세포면역과 체액면역을 동시 활성화해 수술/항암 후 약해진 면역계를 복구",
      en: "Activates both cellular and humoral immunity to restore the immune system weakened by surgery or chemotherapy",
    },
    cellular: ["싸이모신알파1 요법", "미슬토 요법", "이뮤노시아닌", "NK세포치료제", "항암면역증강제"],
    humoral: ["글루타민 주사", "면역플러스 (황기 부정단 처방)"],
    evidence: "싸이모신α1: T세포 및 NK세포 활성화, 암세포 직접 파괴 기전",
  },
  temperature: {
    title: { ko: "체온 (Temperature)", en: "Temperature", ru: "Температура" },
    desc: {
      ko: "온열 요법으로 암세포 사멸 유도 + 항암 효과 증폭",
      en: "Hyperthermia induces cancer cell death and amplifies chemotherapy efficacy",
    },
    methods: ["고주파온열암치료", "적외선온열요법"],
    evidence: "고주파온열 + 항암제 병행 시 생존기간 유의미 증가 (해외 임상)",
  },
  circulation: {
    title: { ko: "순환 (Circulation)", en: "Circulation", ru: "Циркуляция" },
    desc: {
      ko: "림프·혈액 순환 개선으로 부종, 노폐물, 조직 회복 지원",
      en: "Improves lymphatic and blood circulation to reduce edema and aid recovery",
    },
    methods: ["림프도수 마사지", "침전기물리치료"],
  },
  resistibility: {
    title: { ko: "저항성 (Resistibility)", en: "Resistibility", ru: "Сопротивляемость" },
    desc: {
      ko: "항산화·해독 요법으로 세포 손상 최소화",
      en: "Antioxidant and detoxification therapies minimize cell damage",
    },
    methods: ["셀레늄 요법 (비타민E의 2,000배 항산화)", "글루타치온", "고농도 비타민 요법", "태반추출물"],
  },
  nutrition: {
    title: { ko: "영양 (Nutrition)", en: "Nutrition", ru: "Питание" },
    desc: {
      ko: "30종 이상 맞춤식 + 셰프 라이브로 환자별 상태에 맞춘 치료식 제공",
      en: "30+ customized therapeutic menus with live chef stations tailored to each patient's condition",
    },
    programs: [
      "저잔사 치료식이 (대장/위 수술 후)",
      "위절제 치료식이 (덤핑증후군 관리)",
      "저요오드 식이 (갑상선)",
      "맞춤 면역 회복 선택식 (30+ 종)",
      "셰프 라이브 코너",
      "항암 맞춤 코너",
      "제철 과일 코너",
    ],
  },
  chemoSupport: {
    title: { ko: "항암 치료 지원", en: "Chemotherapy Support", ru: "Поддержка химиотерапии" },
    before: "체력 관리, 면역력 강화",
    during: "구토·피로 완화, 식욕 저하 개선, 구내염 개선",
    after: "전이·재발 예방, 미세잔존암 관리",
  },
};

// 공통 수술 후 관리 3영역 (대장/위에서 특히 상세)
export const POST_SURGICAL_CARE = {
  wound: { title: "상처 관리", items: 5 },
  stoma: { title: "장루 관리", items: 8 },
  diet: { title: "식이 관리", items: 7 },
};

// 암종별 상세
export const CANCER_DETAILS = {
  female: {
    slug: "female",
    immuneSourceUrl: "/pages/cancer/female-1.php",
    title: {
      ko: "유방 · 자궁 · 난소암",
      en: "Breast · Uterine · Ovarian Cancer",
      ru: "Рак груди · матки · яичников",
    },
    intro: {
      ko: "여성암은 수술 후 장기적 관리가 예후에 결정적입니다. 면력한방병원은 수술 전후 회복부터 항암 동안 증상 관리, 완화 기간 재발 예방까지 통합적으로 다룹니다.",
      en: "For female cancers, long-term post-surgical management is decisive for outcomes. Immune Hospital provides integrated care from pre/post-surgical recovery through chemotherapy support to recurrence prevention.",
    },
    complications: [
      { name: "발열", desc: "단순 발열과 수술부위 세균감염 발열은 구분 필요" },
      { name: "림프부종", desc: "림프절 제거 후 붓기 — 방치 시 평생 통증·신경저림" },
      { name: "배뇨·배변장애", desc: "신경 손상으로 인한 기능 장애" },
      { name: "수술부위 합병증", desc: "염증, 상처 아물지 않음, 감염 위험" },
      { name: "운동 제한", desc: "유착으로 인한 관절 경직, 어깨 움직임 제한" },
      { name: "미세잔존암", desc: "영상에 안 보이는 남은 암세포 관리" },
      { name: "영양·기력 저하", desc: "조직 손상 후 회복에 시간 필요" },
      { name: "정서적 문제", desc: "암 치료 스트레스, 불안, 우울 대응" },
    ],
    focusPrograms: ["림프도수 (부종 특화)", "NK세포 치료", "고농도 비타민", "심신통합 프로그램"],
  },

  digest: {
    slug: "digest",
    immuneSourceUrl: "/pages/cancer/digest-1.php",
    title: {
      ko: "대장 · 위암",
      en: "Colorectal · Gastric Cancer",
      ru: "Рак толстой кишки · желудка",
    },
    intro: {
      ko: "대장·위 절제 후에는 '식사법'이 곧 '회복 속도'입니다. 면력한방병원은 장루 관리, 덤핑증후군 대응, 저잔사 치료식을 수술 직후부터 체계적으로 제공합니다.",
      en: "After colorectal or gastric resection, diet management defines recovery speed. Immune Hospital provides systematic stoma care, dumping syndrome management, and low-residue therapeutic diets from immediate post-op.",
    },
    complications: [
      { name: "고열", desc: "수술부위 세균감염 가능성 — 신속 대응" },
      { name: "문합부 누출", desc: "장 연결부위 누출 — 재수술 위험" },
      { name: "장기능 변화", desc: "장루 필요 또는 배변 조절 필요" },
      { name: "장유착/장폐색", desc: "복부 수술 후 흔한 합병증, 반복 가능" },
      { name: "덤핑증후군", desc: "위절제 후 식사 직후 어지럼·저혈당 (위절제 환자)" },
      { name: "수술부위 합병증", desc: "염증, 감염, 상처 치유 지연" },
      { name: "미세잔존암", desc: "림프절 전이 위험 — 면역 활성화 필요" },
      { name: "영양·기력 저하", desc: "흡수 장애 → 체중 감소" },
      { name: "정서적 문제", desc: "장루 적응 심리적 부담" },
    ],
    focusPrograms: [
      "저잔사 치료식이",
      "위절제 치료식이 (덤핑증후군)",
      "상처 관리 (5개 프로토콜)",
      "장루 관리 (8개 프로토콜)",
      "식이 관리 (7개 프로토콜)",
    ],
    stats: {
      survivalImprovement: "말기 위암 환자 수술 후 한방 병행치료 시 생존율 54% 개선",
    },
  },

  liver: {
    slug: "liver",
    immuneSourceUrl: "/pages/cancer/liver-1.php",
    title: {
      ko: "간 · 담도 · 췌장암",
      en: "Liver · Biliary · Pancreatic Cancer",
      ru: "Рак печени · желчевыводящих путей · поджелудочной",
    },
    intro: {
      ko: "간·담도·췌장 절제는 대사 기능 자체에 영향을 줍니다. 면력한방병원은 간기능 저하, 담즙 누출, 소화·흡수 장애, 수술 후 당뇨까지 복합적으로 관리합니다.",
      en: "Liver, biliary, and pancreatic resection directly affects metabolic function. Immune Hospital integrates management of hepatic failure, bile leakage, digestive/absorption disorders, and post-surgical diabetes.",
    },
    complications: [
      {
        name: "간기능 저하",
        desc: "절제 후 황달·가려움·설사·발열·식욕저하 — 간 용적 감소 또는 담도 폐쇄",
      },
      {
        name: "수술부위 합병증",
        desc: "절개부위 감염·출혈 — 붓기·통증·삼출물, 약물 또는 시술로 관리",
      },
      {
        name: "담즙 누출",
        desc: "복강 내 담즙 유출 → 복통·발열·황달, 적절한 처치로 회복",
      },
      {
        name: "소화·흡수 장애",
        desc: "췌장 절제 후 효소 분비 감소 → 소화불량·설사·영양흡수 저하",
      },
      {
        name: "수술 후 당뇨",
        desc: "췌장 조직 제거로 인슐린 분비 감소 → 당뇨 발병 위험",
      },
      {
        name: "미세잔존암",
        desc: "현미경 수준 잔존 암세포 — 면역 활성화 필수",
      },
    ],
    focusPrograms: ["싸이모신α1 (면역 복구)", "고주파온열 (간 기능 보조)", "췌장 효소 보완식", "혈당 맞춤식"],
  },

  lung: {
    slug: "lung",
    immuneSourceUrl: "/pages/cancer/lung-1.php",
    title: {
      ko: "폐암",
      en: "Lung Cancer",
      ru: "Рак лёгких",
    },
    intro: {
      ko: "폐 절제 후에는 '호흡 용량' 회복이 일상 복귀의 관건입니다. 면력한방병원은 호흡 재활, 기관지 염증 관리, 면역 회복을 병행합니다.",
      en: "After lung resection, restoring respiratory capacity is the key to returning to daily life. Immune Hospital integrates respiratory rehab, bronchial inflammation care, and immune recovery.",
    },
    complications: [
      { name: "호흡곤란·폐활량 감소", desc: "계단 오를 때 숨참, 말하면서 호흡 고르기 어려움" },
      { name: "기침·가래·흉통", desc: "기관지 자극 및 절개부위 염증" },
      { name: "체력 저하", desc: "활동량 제한, 만성 피로" },
      { name: "미세잔존암", desc: "수술 후 잔존 암세포 — 면역 활성화" },
      { name: "영양·기력 저하", desc: "수술 후 조직손상 회복 필요" },
      { name: "정서적 문제", desc: "암 치료 스트레스" },
    ],
    focusPrograms: ["호흡 재활 프로그램", "적외선온열 (기관지)", "고농도 비타민 C", "면역 회복 식이"],
  },

  thyroid: {
    slug: "thyroid",
    immuneSourceUrl: "/pages/cancer/thyroid-1.php",
    title: {
      ko: "갑상선암",
      en: "Thyroid Cancer",
      ru: "Рак щитовидной железы",
    },
    intro: {
      ko: "갑상선암은 예후가 매우 좋지만 절제 후 평생 호르몬 관리가 필요합니다. 면력한방병원은 음성 장애, 저칼슘혈증, 호르몬 결핍, 경부 흉터, 삼킴 곤란까지 복합 관리합니다.",
      en: "Thyroid cancer has excellent prognosis but requires lifelong hormone management post-resection. Immune Hospital manages voice disorder, hypocalcemia, hormone deficiency, neck scarring, and dysphagia.",
    },
    complications: [
      { name: "음성 장애", desc: "후두신경 손상 또는 일시적 마비로 쉰 목소리" },
      { name: "저칼슘혈증", desc: "부갑상선 기능 저하 → 손발 저림, 근육 경련" },
      { name: "갑상선호르몬 결핍", desc: "T4 분비 불가 → 피로, 체중 증가" },
      { name: "경부 흉터", desc: "목 정중앙 절개 흔적 — 미용 스트레스" },
      { name: "삼킴 곤란", desc: "연조직 유착 또는 일시적 근육 약화" },
    ],
    focusPrograms: ["저요오드 치료식", "흉터 케어", "호르몬 보완 식이", "음성 재활"],
  },

  etc: {
    slug: "etc",
    immuneSourceUrl: "/pages/cancer/etc-1.php",
    title: {
      ko: "혈액암 · 뇌종양 · 전립선 · 신장암 외",
      en: "Blood · Brain · Prostate · Kidney Cancers and Others",
      ru: "Онкогематология · опухоли мозга · простаты · почек и др.",
    },
    intro: {
      ko: "혈액암, 뇌종양, 전립선, 신장, 기타 희귀암에 대해서도 면력한방병원의 5축(ITCRN) 프레임워크가 적용됩니다. 특정 암종에 맞춘 맞춤 치료 계획을 세웁니다.",
      en: "Immune Hospital's 5-axis (ITCRN) framework applies to blood cancers, brain tumors, prostate, kidney, and other rare cancers with cancer-specific tailored treatment plans.",
    },
    complications: [
      { name: "발열", desc: "세균감염 시 패혈증 위험 — 신속 대응" },
      { name: "림프부종", desc: "치료 지연 시 평생 통증·신경저림 가능" },
      { name: "배뇨·배변장애", desc: "신경 손상으로 발생" },
      { name: "수술부위 합병증", desc: "감염·영양장애로 상처 치유 지연" },
      { name: "유착", desc: "관절 움직임 제한, 경직" },
      { name: "미세잔존암", desc: "수술 후 잔존 암세포" },
      { name: "영양·기력 저하", desc: "조직손상 후 회복 재활" },
      { name: "정서적 문제", desc: "스트레스·불안감 대응" },
    ],
    focusPrograms: ["NK세포 치료", "고주파온열", "면역플러스", "맞춤 영양 프로토콜"],
  },
};

// 이미지 경로 레지스트리 — /public/immune/ 로컬 경로 우선, 폴백으로 원본 서버
// 수집일: 2026-04-21 (101개 이미지 /public/immune/ 에 저장 완료)
// 저작권: 면력한방병원 (자사 병원, 저작권 OK)
const IMMUNE_LOCAL = "/immune/cancer";
const IMMUNE_BASE = "https://immunehospital.com/resource/images"; // 폴백 (카드 이미지 등 미다운로드 항목)

export const CANCER_IMAGES = {
  // 공통 아이콘/그래프 — 로컬 경로
  logo: "/immune/logo/color-logo.svg",
  healGraph: `${IMMUNE_LOCAL}/cancer-graph.jpg`,
  healSvg: `${IMMUNE_LOCAL}/cancer-heal.svg`,
  caseImg1: `${IMMUNE_LOCAL}/cancer-case-img.svg`,
  caseImg2: `${IMMUNE_LOCAL}/cancer-case-img2.svg`,

  // 증상/합병증 이미지 — 로컬 경로
  // female (disease1-8), digest (disease9-12 = 원본 서버, 6-8 공용), liver (disease13-1~5), lung (disease14-1~3), thyroid (disease15-1~5)
  complications: {
    // 공통 (female/etc 페이지)
    fever: `${IMMUNE_LOCAL}/cancer-disease1.jpg`,
    lymphEdema: `${IMMUNE_LOCAL}/cancer-disease2.jpg`,
    urinaryBowel: `${IMMUNE_LOCAL}/cancer-disease3.jpg`,
    surgicalSiteFemale: `${IMMUNE_LOCAL}/cancer-disease4.jpg`,
    adhesionFemale: `${IMMUNE_LOCAL}/cancer-disease5.jpg`,
    residual: `${IMMUNE_LOCAL}/cancer-disease6.jpg`,
    nutrition: `${IMMUNE_LOCAL}/cancer-disease7.jpg`,
    emotional: `${IMMUNE_LOCAL}/cancer-disease8.jpg`,
    // 대장/위 전용 (원본 서버 — 별도 다운로드 필요 시 추가)
    anastomotic: `${IMMUNE_BASE}/cancer-disease9.jpg`,
    bowelFunction: `${IMMUNE_BASE}/cancer-disease10.jpg`,
    surgicalSite: `${IMMUNE_BASE}/cancer-disease11.jpg`,
    adhesion: `${IMMUNE_BASE}/cancer-disease12.jpg`,
    // 간/담도/췌장
    liverFailure: `${IMMUNE_LOCAL}/cancer-disease13-1.jpg`,
    bileLeak: `${IMMUNE_LOCAL}/cancer-disease13-3.jpg`,
    digestive: `${IMMUNE_LOCAL}/cancer-disease13-4.jpg`,
    diabetes: `${IMMUNE_LOCAL}/cancer-disease13-5.jpg`,
    // 폐암
    breathingDifficulty: `${IMMUNE_LOCAL}/cancer-disease14-1.jpg`,
    coughChestPain: `${IMMUNE_LOCAL}/cancer-disease14-2.jpg`,
    fatigue: `${IMMUNE_LOCAL}/cancer-disease14-3.jpg`,
    // 갑상선
    voiceChange: `${IMMUNE_LOCAL}/cancer-disease15-1.jpg`,
    hypocalcemia: `${IMMUNE_LOCAL}/cancer-disease15-2.jpg`,
    hormoneDeficiency: `${IMMUNE_LOCAL}/cancer-disease15-3.jpg`,
    neckScar: `${IMMUNE_LOCAL}/cancer-disease15-4.jpg`,
    swallowingDifficulty: `${IMMUNE_LOCAL}/cancer-disease15-5.jpg`,
  },

  // 치료법 이미지 — 로컬 경로 (/public/immune/program/)
  therapies: {
    thymosin: "/immune/program/cancer-heal1-1.png",
    mistletoe: "/immune/program/cancer-heal1-2.png",
    nkCell: "/immune/program/cancer-heal1-3.png",
    hyperthermia: "/immune/program/cancer-heal1-4.png",
    selenium: "/immune/program/cancer-heal1-5.png",
    heal2_1: "/immune/program/cancer-heal2-1.png",
    heal2_2: "/immune/program/cancer-heal2-2.png",
    heal3: "/immune/program/cancer-heal3.jpg",
    heal4: "/immune/program/cancer-heal4.jpg",
    chef: [
      "/immune/program/cancer-heal5-1.png",
      "/immune/program/cancer-heal5-2.png",
      "/immune/program/cancer-heal5-3.png",
      "/immune/program/cancer-heal5-4.png",
    ],
    meal: Array.from({ length: 8 }, (_, i) => `/immune/program/cancer-heal6-${i + 1}.jpg`),
  },

  // 식이/장루/상처 관리 카드 (원본 서버 — 카드 이미지 별도 다운로드 필요)
  cards: {
    diet: (n) => `${IMMUNE_BASE}/card/cancer-card22-${n}.jpg`, // 1-7
    stoma: (n) => `${IMMUNE_BASE}/card/cancer-card23-${n}.jpg`, // 1-8
    wound: (n) => `${IMMUNE_BASE}/card/cancer-card24-${n}.jpg`, // 1-5
    thyroidDaily: (n) => `${IMMUNE_BASE}/card/cancer-card27-${n}.jpg`, // 1-6
    thyroidDiet: (n) => `${IMMUNE_BASE}/card/cancer-card28-${n}.jpg`, // 1-6
  },
};

// 병원 공통 정보
export const HOSPITAL_INFO = {
  name: {
    ko: "면력한방병원",
    en: "Immune Hospital",
    ru: "Иммунная клиника",
    kz: "Иммундық клиника",
  },
  tagline: "Care You Need, Care You Trust",
  totalCases: "50,000+",
  casesAsOf: "2024-11-06",
  tel: "1588-2915",
  hours: {
    weekday: "09:00–20:00 (야간진료)",
    weekend: "09:00–15:00",
    lunch: "13:00–14:00",
  },
  founded: 2017,
  branches: ["강서 (마곡 본원)", "신촌", "광명", "성동 (예정)"],
};
