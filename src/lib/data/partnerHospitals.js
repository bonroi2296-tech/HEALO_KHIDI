/**
 * Static partner hospital data
 * These hospitals don't exist in the DB — they're our consortium / cooperating partners.
 */

const PARTNER_HOSPITALS = {
  /* ════════════════════════════════════════════
     면력한방병원 — 3개 지점 (제휴 병원)
     ════════════════════════════════════════════ */
  "immunehospital-magok": {
    slug: "immunehospital-magok",
    badge: "partner",
    name: { ko: "면력한방병원 강서 (본원)", en: "Immune Hospital Gangseo (HQ)", ru: "Иммунная Клиника Кансо (главный)", kz: "Иммунная Клиника Кансо (бас)", zh: "免疫医院 江西本院", ja: "免疫病院 江西本院" },
    type: { ko: "제휴 병원", en: "Partner Hospital", ru: "Больница-партнёр", kz: "Серіктес аурухана", zh: "合作医院", ja: "提携病院" },
    description: {
      ko: "면력한방병원 강서점은 서울 마곡에 위치한 한방 면역치료 전문 본원입니다. 통합암치료 인정의를 포함한 8명의 전문 의료진이 한방 면역치료, 통증재활, 한방내과, 한방부인과, 한방신경정신과 등 다양한 분야에서 암환자의 면역력 강화와 항암 부작용 관리를 담당하고 있습니다. 사상체질 진단을 기반으로 한 맞춤형 면역 프로그램과 한약·침·약침 통합 치료를 제공합니다.",
      en: "Immune Hospital Gangseo is the headquarters located in Magok, Seoul, specializing in Korean Medicine immunotherapy. With 8 expert doctors including certified integrative oncology specialists, we offer personalized immune enhancement programs based on Sasang constitutional diagnosis, combined herbal medicine, acupuncture, and pharmacopuncture treatments for cancer patients.",
      ru: "Иммунная Клиника Кансо — главный офис в Магоке, Сеул, специализирующийся на иммунотерапии корейской медицины. 8 специалистов, включая сертифицированных онкологов, обеспечивают персонализированные программы укрепления иммунитета.",
      kz: "Иммунная Клиника Кансо — Сеул Магоктағы бас кеңсе, корей медицинасы иммунотерапиясына маманданған. 8 маман дәрігер қызмет көрсетеді.",
      zh: "免疫医院江西本院位于首尔麻谷，是韩方免疫治疗专科总院。拥有8名专家医生，包括获认证的综合肿瘤治疗专家，提供基于四象体质诊断的个性化免疫增强方案。",
      ja: "免疫病院江西本院はソウル麻谷に位置する韓方免疫治療専門の本院です。統合がん治療認定医を含む8名の専門医が在籍し、四象体質診断に基づく個別化された免疫プログラムを提供しています。",
    },
    website: "https://immunehospital.com",
    phone: "1522-8850",
    address: { ko: "서울특별시 강서구 마곡중앙6로 93 (마곡동, 열린프라자) 6,7,10층", en: "6F/7F/10F, 93 Magok Jungang 6-ro, Gangseo-gu, Seoul" },
    lat: 37.5620, lng: 126.8282,
    specialties: {
      ko: ["한방 면역치료", "통합암치료", "통증재활", "한방내과", "한방부인과", "한방신경정신과", "한방재활의학과", "양방 산부인과"],
      en: ["Korean Medicine Immunotherapy", "Integrative Oncology", "Pain Rehabilitation", "Korean Internal Medicine", "Korean OB/GYN", "Korean Neuropsychiatry", "Korean Rehabilitation Medicine", "Western OB/GYN"],
    },
    highlights: {
      ko: ["외국인환자 유치의료기관 등록", "통합암치료 인정의 다수 보유", "사상체질 진단 기반 맞춤 면역 프로그램", "한약·침·약침 통합 치료 시스템", "8명 전문의 상주"],
      en: ["Registered for International Patient Care", "Multiple Certified Integrative Oncology Specialists", "Personalized Immune Programs via Sasang Diagnosis", "Integrated Herbal Medicine, Acupuncture & Pharmacopuncture", "8 Resident Specialists"],
    },
    doctorCount: 8,
    image: "/images/hospitals/immune-magok.jpg",
  },

  "immunehospital-sinchon": {
    slug: "immunehospital-sinchon",
    badge: "partner",
    name: { ko: "신촌면력한방병원", en: "Immune Hospital Sinchon", ru: "Иммунная Клиника Синчхон", kz: "Иммунная Клиника Синчон", zh: "新村免疫医院", ja: "新村免疫病院" },
    type: { ko: "제휴 병원", en: "Partner Hospital", ru: "Больница-партнёр", kz: "Серіктес аурухана", zh: "合作医院", ja: "提携病院" },
    description: {
      ko: "신촌면력한방병원은 서울 서대문구 연세로에 위치한 면력한방병원의 신촌 분원입니다. 피델리아타워 8-14층에 걸쳐 넓은 진료 공간을 운영하며, 대표원장을 포함한 3명의 전문 의료진이 한방 면역치료와 한방재활의학, 한방내과 분야에서 진료합니다. 신촌세브란스병원과 인접하여 양·한방 협진이 용이합니다.",
      en: "Immune Hospital Sinchon is located on Yonsei-ro, Seodaemun-gu, Seoul, occupying floors 8-14 of Fidelia Tower. With 3 specialist doctors including the chief director, it provides Korean Medicine immunotherapy, rehabilitation medicine, and internal medicine. Its proximity to Sinchon Severance Hospital facilitates integrated Western-Korean Medicine cooperation.",
      ru: "Иммунная Клиника Синчхон расположен на Ёнсе-ро, Содэмун-гу, Сеул, на 8-14 этажах башни Фиделия. 3 специалиста обеспечивают иммунотерапию корейской медицины, реабилитацию и внутреннюю медицину.",
      kz: "Иммунная Клиника Синчон Ёнсе-рода, Содэмун-гуда, Сеулде, Фиделия мұнарасының 8-14 қабаттарында орналасқан. 3 маман дәрігер қызмет көрсетеді.",
      zh: "新村免疫医院位于首尔西大门区延世路，占据Fidelia大厦8-14层。3名专家医生提供韩方免疫治疗、康复医学和内科诊疗。毗邻新村世福兰斯医院，便于中西医协诊。",
      ja: "新村免疫病院はソウル西大門区延世路のフィデリアタワー8-14階に位置する分院です。代表院長を含む3名の専門医が韓方免疫治療、リハビリ医学、内科を担当。新村セブランス病院に隣接し洋韓方協診が容易です。",
    },
    website: "https://sc.immunehospital.com",
    phone: "1522-8850",
    address: { ko: "서울특별시 서대문구 연세로 12 (창천동, 피델리아타워) 8-14층", en: "8F-14F, 12 Yonsei-ro, Seodaemun-gu, Seoul (Fidelia Tower)" },
    lat: 37.5568, lng: 126.9366,
    specialties: {
      ko: ["한방 면역치료", "통합암치료", "한방내과", "한방재활의학과"],
      en: ["Korean Medicine Immunotherapy", "Integrative Oncology", "Korean Internal Medicine", "Korean Rehabilitation Medicine"],
    },
    highlights: {
      ko: ["외국인환자 유치의료기관 등록", "신촌세브란스 인접 — 양·한방 협진 용이", "피델리아타워 8-14층 대규모 진료 공간", "3명 전문의 상주"],
      en: ["Registered for International Patient Care", "Adjacent to Severance Hospital — Easy East-West Cooperation", "Large clinic across floors 8-14 of Fidelia Tower", "3 Resident Specialists"],
    },
    doctorCount: 3,
    image: "/images/hospitals/immune-sinchon.jpg",
  },

  "immunehospital-gwangmyeong": {
    slug: "immunehospital-gwangmyeong",
    badge: "partner",
    name: { ko: "면력한방병원 광명점", en: "Immune Hospital Gwangmyeong", ru: "Иммунная Клиника Кванмён", kz: "Иммунная Клиника Кванмён", zh: "免疫医院 光明院", ja: "免疫病院 光明院" },
    type: { ko: "제휴 병원", en: "Partner Hospital", ru: "Больница-партнёр", kz: "Серіктес аурухана", zh: "合作医院", ja: "提携病院" },
    description: {
      ko: "면력한방병원 광명점은 광명역 M클러스터에 위치한 분원으로, 대표원장을 포함한 7명의 전문 의료진이 한방 면역치료, 통증재활, 한방신경정신과, 마취통증의학과 등 폭넓은 진료를 제공합니다. 스위스 정부 장학생 출신 제네바의대 면역학 연구원 등 해외 연구 경험이 풍부한 의료진이 특징입니다.",
      en: "Immune Hospital Gwangmyeong is located in M Cluster at Gwangmyeong Station, featuring 7 specialist doctors including the chief director. The team provides comprehensive care in immunotherapy, pain rehabilitation, Korean neuropsychiatry, and anesthesiology. The staff includes doctors with international research experience, including a former Swiss government scholar at the University of Geneva immunology lab.",
      ru: "Иммунная Клиника Кванмён расположен в M Cluster у станции Кванмён. 7 специалистов обеспечивают иммунотерапию, реабилитацию, нейропсихиатрию и анестезиологию.",
      kz: "Иммунная Клиника Кванмён Кванмён стансасындағы M Cluster-де орналасқан. 7 маман дәрігер қызмет көрсетеді.",
      zh: "免疫医院光明院位于光明站M Cluster，7名专家医生提供免疫治疗、疼痛康复、韩方神经精神科、麻醉疼痛医学科等全面诊疗。",
      ja: "免疫病院光明院は光明駅Mクラスターに位置し、代表院長を含む7名の専門医が免疫治療、疼痛リハビリ、韓方神経精神科、麻酔疼痛医学科など幅広い診療を提供しています。",
    },
    website: "https://km.immunehospital.com",
    phone: "1522-8850",
    address: { ko: "경기도 광명시 오리로 876 광명역 M클러스터 4층", en: "4F, M Cluster, 876 Ori-ro, Gwangmyeong-si, Gyeonggi-do" },
    lat: 37.4153, lng: 126.8842,
    specialties: {
      ko: ["한방 면역치료", "통합암치료", "통증재활", "한방내과", "한방신경정신과", "침구의학과", "마취통증의학과"],
      en: ["Korean Medicine Immunotherapy", "Integrative Oncology", "Pain Rehabilitation", "Korean Internal Medicine", "Korean Neuropsychiatry", "Acupuncture Medicine", "Anesthesiology & Pain Medicine"],
    },
    highlights: {
      ko: ["7명 전문의 상주 (한방 + 양방)", "스위스 정부 장학생 출신 면역학 연구원 보유", "통합암치료 인정의 다수", "광명역 직결 — KTX 접근성 우수", "양방 마취통증의학과 협진"],
      en: ["7 Resident Specialists (Korean + Western Medicine)", "Former Swiss Government Scholar in Immunology", "Multiple Certified Integrative Oncology Specialists", "Direct KTX access via Gwangmyeong Station", "Western Anesthesiology & Pain Medicine Cooperation"],
    },
    doctorCount: 7,
    image: "/images/hospitals/immune-gwangmyeong.jpg",
  },

  /* ════════════════════════════════════════════
     협진 대학병원 4곳
     ════════════════════════════════════════════ */
  "ewha-seoul": {
    slug: "ewha-seoul",
    badge: "university",
    name: { ko: "이대서울병원", en: "Ewha Womans University Seoul Hospital", ru: "Сеульская больница университета Ихва", kz: "Ихва университеті Сеул ауруханасы", zh: "梨大首尔医院", ja: "梨大ソウル病院" },
    type: { ko: "협진 대학병원", en: "University Hospital", ru: "Университетская больница", kz: "Университеттік аурухана", zh: "大学医院", ja: "大学病院" },
    description: {
      ko: "이대서울병원은 2019년 서울 마곡에 개원한 이화여자대학교 의료원 소속 최신 대학병원입니다. 756병상 규모로 최첨단 의료 장비와 쾌적한 환경을 갖추고 있으며, 암센터, 심장혈관센터, 장기이식센터 등 전문센터를 운영합니다. 면력한방병원 강서점과 같은 마곡 지역에 위치하여 양·한방 협진 체계가 원활합니다.",
      en: "Ewha Seoul Hospital opened in 2019 in Magok, Seoul, as a 756-bed state-of-the-art university hospital under Ewha Womans University Medical Center. It operates specialized centers including a Cancer Center, Cardiovascular Center, and Organ Transplant Center. Located in the same Magok area as Immune Hospital Gangseo, enabling seamless Western-Korean Medicine cooperation.",
      ru: "Сеульская больница Ихва открылась в 2019 году в Магоке — 756 коек, онкоцентр, кардиоваскулярный центр и центр трансплантации. Расположена рядом с Иммуногоспиталем Кансо для удобной совместной работы.",
      kz: "Ихва Сеул ауруханасы 2019 жылы Магокта ашылды — 756 төсек-орын, онкологиялық, жүрек-қантамыр орталықтары бар. Иммунная Клиника Кансомен бірлесіп жұмыс істейді.",
      zh: "梨大首尔医院于2019年在首尔麻谷开院，拥有756张床位的最新大学医院。设有癌症中心、心血管中心、器官移植中心等专科中心。与免疫医院江西本院同处麻谷地区，中西医协诊便利。",
      ja: "梨大ソウル病院は2019年にソウル麻谷に開院した756床の最新大学病院です。がんセンター、心臓血管センター、臓器移植センターなどの専門センターを運営。免疫病院江西本院と同じ麻谷地域に位置し、洋韓方協診がスムーズです。",
    },
    website: "https://seoulehospital.ewha.ac.kr",
    phone: "1666-5000",
    address: { ko: "서울특별시 강서구 공항대로 260", en: "260 Gonghang-daero, Gangseo-gu, Seoul" },
    specialties: {
      ko: ["암센터", "종양내과", "유방·갑상선외과", "소화기내과", "방사선종양학과", "영상의학과", "병리과", "핵의학과"],
      en: ["Cancer Center", "Oncology", "Breast & Thyroid Surgery", "Gastroenterology", "Radiation Oncology", "Radiology", "Pathology", "Nuclear Medicine"],
    },
    highlights: {
      ko: ["2019년 개원 최신 시설 (756병상)", "암센터 운영 — 다학제 통합 진료", "면력한방병원 강서점과 마곡 인접", "외국인환자 전담 부서 운영", "최첨단 영상·수술 장비"],
      en: ["Opened 2019 with 756 Beds", "Cancer Center — Multidisciplinary Integrated Care", "Adjacent to Immune Hospital Gangseo in Magok", "Dedicated International Patient Department", "State-of-the-art Imaging & Surgical Equipment"],
    },
    bedCount: 756,
    image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&h=500&fit=crop",
  },

  "ewha-mokdong": {
    slug: "ewha-mokdong",
    badge: "university",
    name: { ko: "이대목동병원", en: "Ewha Womans University Mokdong Hospital", ru: "Больница Мокдон университета Ихва", kz: "Ихва университеті Мокдон ауруханасы", zh: "梨大木洞医院", ja: "梨大木洞病院" },
    type: { ko: "협진 대학병원", en: "University Hospital", ru: "Университетская больница", kz: "Университеттік аурухана", zh: "大学医院", ja: "大学病院" },
    description: {
      ko: "이대목동병원은 1985년 개원한 이화여자대학교 의료원의 목동 캠퍼스 병원으로, 40년의 역사와 풍부한 임상 경험을 바탕으로 종합 의료서비스를 제공합니다. 특히 소아청소년 암, 여성 암 분야에서 높은 전문성을 보유하고 있으며, 암센터를 통해 수술·항암·방사선 치료를 통합 제공합니다.",
      en: "Ewha Mokdong Hospital, established in 1985, is a comprehensive medical center with 40 years of clinical expertise. It holds particular strengths in pediatric cancer and women's cancer treatment, providing integrated surgery, chemotherapy, and radiation therapy through its Cancer Center.",
      ru: "Больница Ихва Мокдон основана в 1985 году — 40 лет клинического опыта. Особая специализация: детская онкология и женские онкозаболевания. Интегрированная хирургия, химиотерапия и радиотерапия.",
      kz: "Ихва Мокдон ауруханасы 1985 жылы құрылған — 40 жылдық клиникалық тәжірибе. Балалар онкологиясы мен әйелдер онкологиясында мамандану.",
      zh: "梨大木洞医院创建于1985年，拥有40年临床经验。在小儿肿瘤和女性肿瘤领域具有高度专业性，通过癌症中心提供手术、化疗、放疗一体化治疗。",
      ja: "梨大木洞病院は1985年開院、40年の臨床実績を持つ総合医療センターです。小児がん・女性がん分野に高い専門性を有し、がんセンターで手術・化学療法・放射線治療を一体的に提供しています。",
    },
    website: "https://mokdong.ewha.ac.kr",
    phone: "1666-5000",
    address: { ko: "서울특별시 양천구 안양천로 1071", en: "1071 Anyangcheon-ro, Yangcheon-gu, Seoul" },
    specialties: {
      ko: ["암센터", "종양내과", "소아청소년과", "산부인과", "유방외과", "소화기내과", "방사선종양학과"],
      en: ["Cancer Center", "Oncology", "Pediatrics", "OB/GYN", "Breast Surgery", "Gastroenterology", "Radiation Oncology"],
    },
    highlights: {
      ko: ["1985년 개원 — 40년 임상 경험", "소아청소년 암 전문 치료", "여성 암 (유방암·자궁경부암) 특화", "암센터 수술·항암·방사선 통합 진료", "풍부한 임상 연구 및 학술 성과"],
      en: ["Established 1985 — 40 Years of Clinical Expertise", "Specialized Pediatric Cancer Treatment", "Women's Cancer Specialization (Breast, Cervical)", "Cancer Center: Integrated Surgery, Chemo & Radiation", "Extensive Clinical Research & Academic Achievements"],
    },
    image: "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=800&h=500&fit=crop",
  },

  "korea-guro": {
    slug: "korea-guro",
    badge: "university",
    name: { ko: "고려대학교 구로병원", en: "Korea University Guro Hospital", ru: "Больница Куро Корёского университета", kz: "Корё университеті Куро ауруханасы", zh: "高丽大学九老医院", ja: "高麗大学九老病院" },
    type: { ko: "협진 대학병원", en: "University Hospital", ru: "Университетская больница", kz: "Университеттік аурухана", zh: "大学医院", ja: "大学病院" },
    description: {
      ko: "고려대학교 구로병원은 고려대학교 의과대학 부속 병원으로, 암센터를 중심으로 한 종합적인 암 치료 체계를 갖추고 있습니다. 간암·폐암·위암 등 주요 암종에 대해 로봇수술센터와 방사선종양학과를 통한 정밀 치료 체계를 운영합니다. 외국인환자 유치의료기관으로 등록되어 국제진료센터를 운영합니다.",
      en: "Korea University Guro Hospital features a comprehensive cancer treatment system centered around its Cancer Center. It provides precision treatment for liver, lung, and stomach cancers through its Robotic Surgery Center and Radiation Oncology department. Registered as an international patient care facility with a dedicated International Medical Center.",
      ru: "Больница Куро Корёского университета — комплексная система лечения рака печени, лёгких и желудка. Центр роботизированной хирургии и радиотерапии. Зарегистрирована как медучреждение для иностранных пациентов.",
      kz: "Корё университеті Куро ауруханасы — бауыр, өкпе, асқазан обырын емдейтін кешенді жүйе. Робот-хирургия орталығы мен радиотерапия бөлімі бар. Шетелдік пациенттерге арналған медициналық мекеме.",
      zh: "高丽大学九老医院以癌症中心为核心，构建了全面的癌症治疗体系。针对肝癌、肺癌、胃癌等主要癌种，通过机器人手术中心和放射肿瘤学科提供精准治疗。设有面向外国患者的国际诊疗中心。",
      ja: "高麗大学九老病院はがんセンターを中心に総合的ながん治療体制を備えています。肝がん・肺がん・胃がんなど主要がん種に対し、ロボット手術センターと放射線腫瘍科による精密治療を提供します。外国人患者向けの国際診療センターを運営しています。",
    },
    website: "https://guro.kumc.or.kr",
    phone: "02-2626-1114",
    address: { ko: "서울특별시 구로구 구로동로 148", en: "148 Gurodong-ro, Guro-gu, Seoul" },
    specialties: {
      ko: ["암센터", "종양내과", "혈액종양내과", "간담췌외과", "흉부외과", "위장관외과", "방사선종양학과", "로봇수술센터", "핵의학과"],
      en: ["Cancer Center", "Oncology", "Hematologic Oncology", "Hepatobiliary & Pancreatic Surgery", "Thoracic Surgery", "GI Surgery", "Radiation Oncology", "Robotic Surgery Center", "Nuclear Medicine"],
    },
    highlights: {
      ko: ["간암·폐암·위암 정밀 수술 치료", "로봇수술센터 운영", "국제진료센터 — 외국인환자 전담", "다학제 암 진료 체계 (Tumor Board)", "첨단 방사선치료 (IMRT, SBRT)"],
      en: ["Precision Surgery for Liver, Lung & Stomach Cancer", "Robotic Surgery Center", "International Medical Center for Foreign Patients", "Multidisciplinary Tumor Board", "Advanced Radiation Therapy (IMRT, SBRT)"],
    },
    image: "https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=800&h=500&fit=crop",
  },

  "severance-sinchon": {
    slug: "severance-sinchon",
    badge: "university",
    name: { ko: "신촌세브란스병원", en: "Sinchon Severance Hospital", ru: "Больница Северанс Синчхон", kz: "Синчон Северанс ауруханасы", zh: "新村世福兰斯医院", ja: "新村セブランス病院" },
    type: { ko: "협진 대학병원", en: "University Hospital", ru: "Университетская больница", kz: "Университеттік аурухана", zh: "大学医院", ja: "大学病院" },
    description: {
      ko: "신촌세브란스병원은 연세대학교 의과대학 세브란스병원의 본원으로, 연세암병원을 운영합니다. 12개 주요 암종에 대한 다학제 통합 진료(MDT)를 통해 각 환자에게 최적화된 치료 계획을 제시하며, 양성자치료센터 등 첨단 치료 인프라를 갖추고 있습니다. 신촌면력한방병원과 인접하여 항암 치료 후 한방 면역 관리 협진이 원활합니다.",
      en: "Sinchon Severance Hospital is the main campus of Yonsei University's Severance Hospital, operating the Yonsei Cancer Hospital. Through multidisciplinary team (MDT) consultations across 12 major cancer types, it provides optimized treatment plans for each patient, supported by advanced infrastructure including a Proton Therapy Center. Adjacent to Immune Hospital Sinchon for seamless post-chemo Korean Medicine immune care.",
      ru: "Больница Северанс Синчхон — главный кампус с Онкобольницей Ёнсе. Мультидисциплинарные консилиумы (MDT) по 12 основным типам рака, центр протонной терапии. Рядом с Иммуногоспиталем Синчхон для послехимиотерапевтической поддержки.",
      kz: "Синчон Северанс ауруханасы — Ёнсе университетінің бас кампусы, Ёнсе онкологиялық ауруханасы бар. 12 негізгі рак түрі бойынша мультидисциплинарлық кеңес (MDT), протонды терапия орталығы.",
      zh: "新村世福兰斯医院是延世大学世福兰斯医院本院，运营延世癌症医院。针对12种主要癌症提供多学科会诊(MDT)，配备质子治疗中心等先进治疗设施。毗邻新村免疫医院，化疗后韩方免疫管理协诊便利。",
      ja: "新村セブランス病院は延世大学セブランス病院の本院で、延世がん病院を運営しています。12の主要がん種について多職種統合診療(MDT)を提供し、陽子線治療センターなど先端治療インフラを備えています。新村免疫病院に隣接し、化学療法後の韓方免疫ケア協診がスムーズです。",
    },
    website: "https://sev.severance.healthcare",
    phone: "02-2228-0114",
    address: { ko: "서울특별시 서대문구 연세로 50-1", en: "50-1 Yonsei-ro, Seodaemun-gu, Seoul" },
    specialties: {
      ko: ["연세암병원", "종양내과", "유방외과", "간담췌외과", "대장항문외과", "흉부외과", "방사선종양학과", "핵의학과", "양성자치료센터"],
      en: ["Yonsei Cancer Hospital", "Oncology", "Breast Surgery", "Hepatobiliary & Pancreatic Surgery", "Colorectal Surgery", "Thoracic Surgery", "Radiation Oncology", "Nuclear Medicine", "Proton Therapy Center"],
    },
    highlights: {
      ko: ["연세암병원 — 12개 암종 다학제 통합 진료", "다학제 통합 진료 (MDT) 운영", "양성자치료센터 보유", "신촌면력한방병원 인접 — 양·한방 협진", "JCI 인증 — 국제 의료 품질 기준 충족", "외국인환자 전담 국제진료센터"],
      en: ["Yonsei Cancer Hospital — MDT Care Across 12 Cancer Types", "Multidisciplinary Team (MDT) Consultations", "Proton Therapy Center", "Adjacent to Immune Hospital Sinchon — East-West Cooperation", "JCI Accredited — International Quality Standards", "International Patient Center"],
    },
    image: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&h=500&fit=crop",
  },
};

export function getPartnerHospital(slug) {
  return PARTNER_HOSPITALS[slug] || null;
}

export function getAllPartnerSlugs() {
  return Object.keys(PARTNER_HOSPITALS);
}

export function getAllPartnerHospitals() {
  return Object.values(PARTNER_HOSPITALS);
}

/**
 * Convert partner hospital data into the format HospitalDetailLegacyClient expects.
 * The `_i18n` field carries raw multilingual data so the client can re-resolve on lang change.
 */
export function convertPartnerToInitialData(partner) {
  if (!partner) return null;
  const l = (obj) => obj?.["en"] || obj?.["ko"] || "";
  const lArr = (obj) => {
    if (!obj) return [];
    return obj["en"] || obj["ko"] || [];
  };

  return {
    id: partner.slug,
    slug: partner.slug,
    name: l(partner.name),
    description: l(partner.description),
    location: l(partner.address),
    location_kr: partner.address?.ko || "",
    location_en: partner.address?.en || "",
    address_detail: "",
    latitude: partner.lat || null,
    longitude: partner.lng || null,
    images: partner.image ? [partner.image] : [],
    thumbnail_image: partner.image || null,
    gallery_images: [],
    specialties: lArr(partner.specialties),
    website: partner.website || null,
    is_partner: true,
    rating: null,
    reviews_count: 0,
    tags: [l(partner.type)],
    doctor_count: partner.doctorCount || null,
    doctor_profile: null,
    operating_hours: null,
    certifications: [],
    medical_equipment: [],
    insurance_accepted: false,
    supported_languages: [],
    amenities: [],
    external_ratings: {
      phone: partner.phone || null,
      website: partner.website || null,
      google_reviews: [],
    },
    // Raw i18n data for client-side re-resolution on language change
    _i18n: {
      name: partner.name,
      description: partner.description,
      address: partner.address,
      specialties: partner.specialties,
      highlights: partner.highlights,
      type: partner.type,
      bedCount: partner.bedCount || null,
      doctorCount: partner.doctorCount || null,
    },
  };
}
