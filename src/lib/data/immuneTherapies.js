/**
 * 면력한방병원 치료법 상세
 * 출처: https://immunehospital.com/pages/cancer/female-1.php 등 각 암종 페이지
 *       https://immunehospital.com/pages/hospital/nonpayment.php (비급여 가격 포함)
 * 수집일: 2026-04-21
 * 저작권: 면력한방병원 (자사 병원, 저작권 OK)
 *
 * 2026-09-05: name 에 kz·zh·ja 추가(ko·en·ru 는 그대로). 암종 페이지 5축 태그·JSON-LD(immuneCancerDetails.js)가 이 name 을
 *   «정본»으로 참조한다 — 같은 치료법을 두 파일에서 따로 번역하지 않는다(독립 리뷰 2026-09-05). ⚠️ kz·zh·ja 는 AI 번역, 코디 검수 전엔 「제안」.
 * 구조: ITCRN 5축 기준으로 정리
 *   I — Immunity (면역)
 *   T — Temperature (체온)
 *   C — Circulation (순환)
 *   R — Resistibility (저항성)
 *   N — Nutrition (영양)
 */

export const IMMUNE_THERAPIES = {
  // ────────────────── I: 면역 (Immunity) ──────────────────
  thymosin: {
    id: "thymosin",
    axis: "immunity",
    name: { ko: "싸이모신α1 요법", en: "Thymosin α1 Therapy", ru: "Терапия Тимозин-α1", kz: "Тимозин α1 терапиясы", zh: "胸腺肽α1疗法", ja: "サイモシンα1療法" },
    category: { ko: "세포면역", en: "Cellular Immunity" },
    description: {
      ko: "흉선에서 생성되는 펩타이드 호르몬으로, T세포와 NK세포를 직접 활성화시켜 암세포를 공격합니다. 항암치료 후 저하된 면역 기능 회복에 핵심적 역할을 합니다.",
      en: "A peptide hormone produced by the thymus that directly activates T-cells and NK cells to attack cancer cells. Plays a key role in restoring immune function after chemotherapy.",
      ru: "Пептидный гормон тимуса, напрямую активирующий Т-клетки и НК-клетки. Ключевую роль играет в восстановлении иммунных функций после химиотерапии.",
    },
    mechanism: {
      ko: "T세포 성숙·분화 촉진, NK세포 활성화, 암세포 직접 파괴",
      en: "Promotes T-cell maturation and differentiation, NK cell activation, direct cancer cell destruction",
    },
    evidence: {
      ko: "국제 임상 연구를 통해 T세포 및 NK세포 활성화, 암세포 직접 파괴 기전 확인",
      en: "International clinical studies confirm T-cell and NK cell activation mechanisms",
    },
    image: "/immune/program/cancer-heal1-1.png",
    type: "injection",
  },

  mistletoe: {
    id: "mistletoe",
    axis: "immunity",
    name: { ko: "미슬토 요법", en: "Mistletoe Therapy", ru: "Терапия Омелой", kz: "Омела терапиясы", zh: "槲寄生疗法", ja: "ミスルトー（ヤドリギ）療法" },
    category: { ko: "세포면역", en: "Cellular Immunity" },
    description: {
      ko: "유럽 겨우살이(Viscum album) 추출물로 제조된 항암 보조 주사제. NK세포와 T림프구 활성화로 면역력을 높이고 항암제 부작용을 줄여줍니다.",
      en: "An injectable anti-cancer adjuvant made from European mistletoe (Viscum album) extract. Enhances immunity by activating NK cells and T lymphocytes, and reduces chemotherapy side effects.",
      ru: "Инъекционный препарат из европейской омелы. Повышает иммунитет, активируя НК-клетки и Т-лимфоциты, снижает побочные эффекты химиотерапии.",
    },
    mechanism: {
      ko: "NK세포·T림프구 활성화, 사이토카인 생성 촉진, 항암제 부작용(오심·피로) 완화",
      en: "NK cell and T lymphocyte activation, cytokine production promotion, chemotherapy side effect reduction",
    },
    image: "/immune/program/cancer-heal1-2.png",
    type: "injection",
  },

  immunocyanin: {
    id: "immunocyanin",
    axis: "immunity",
    name: { ko: "이뮤노시아닌", en: "Immunocyanin (KLH)", ru: "Иммуноцианин", kz: "Иммуноцианин (KLH)", zh: "免疫蓝蛋白 (Immunocyanin)", ja: "イムノシアニン" },
    category: { ko: "세포면역", en: "Cellular Immunity" },
    description: {
      ko: "해양 연체동물에서 추출한 고분자 단백질로 강력한 면역 자극 효과를 가집니다. 비특이적 면역 강화와 항암 치료 보조로 사용됩니다.",
      en: "A high-molecular-weight protein extracted from marine mollusks with powerful immune-stimulating effects, used for non-specific immune enhancement and as a cancer treatment adjuvant.",
    },
    type: "injection",
  },

  nkCell: {
    id: "nkCell",
    axis: "immunity",
    name: { ko: "NK세포치료제", en: "NK Cell Therapy", ru: "НК-клеточная Терапия", kz: "NK жасушалық терапия", zh: "NK细胞疗法", ja: "NK細胞療法" },
    category: { ko: "세포면역", en: "Cellular Immunity" },
    description: {
      ko: "자연살해세포(Natural Killer Cell)를 활성화하여 암세포를 직접 공격하는 면역 치료입니다. 수술 후 잔존 암세포 관리에 효과적입니다.",
      en: "An immunotherapy that activates Natural Killer cells to directly attack cancer cells. Effective for managing residual cancer cells after surgery.",
      ru: "Иммунотерапия, активирующая NK-клетки для прямой атаки раковых клеток.",
    },
    image: "/immune/program/cancer-heal1-3.png",
    type: "injection",
  },

  immunoPlus: {
    id: "immunoPlus",
    axis: "immunity",
    name: { ko: "면역플러스 (황기 부정단)", en: "Immune Plus (Astragalus Formula)", ru: "Иммун Плюс", kz: "Иммун Плюс (астрагал негізіндегі шөп қоспасы)", zh: "免疫加强方（黄芪扶正丹）", ja: "免疫プラス（黄耆扶正丹）" },
    category: { ko: "체액면역", en: "Humoral Immunity" },
    description: {
      ko: "한방 면역 강화 처방. 황기(Astragalus) 등 면역 증강 한약재를 조합한 맞춤 처방으로, 체액면역 강화와 기력 회복을 돕습니다.",
      en: "Korean medicine immune-boosting formula combining Astragalus and other immune-enhancing herbs for humoral immunity and energy recovery.",
    },
    type: "herbal",
  },

  glutamine: {
    id: "glutamine",
    axis: "immunity",
    name: { ko: "글루타민 주사", en: "Glutamine Injection", ru: "Инъекция Глутамина", kz: "Глутамин инъекциясы", zh: "谷氨酰胺注射", ja: "グルタミン注射" },
    category: { ko: "체액면역", en: "Humoral Immunity" },
    description: {
      ko: "면역세포의 주요 에너지원인 글루타민을 직접 공급하여 점막 면역 기능을 강화합니다. 항암치료 중 구내염, 장 점막 손상에 효과적입니다.",
      en: "Directly supplies glutamine, the primary energy source for immune cells, strengthening mucosal immunity. Effective against mucositis and intestinal mucosal damage during chemotherapy.",
    },
    type: "injection",
  },

  anticancerImmune: {
    id: "anticancerImmune",
    axis: "immunity",
    name: { ko: "항암면역증강제", en: "Anti-cancer Immune Enhancer", ru: "Иммуностимулятор при Онкологии", kz: "Онкологиядағы иммунды күшейткіш", zh: "抗癌免疫增强剂", ja: "抗がん免疫増強剤" },
    category: { ko: "세포면역", en: "Cellular Immunity" },
    description: {
      ko: "항암치료 중 저하된 면역 기능을 보완하는 보조 치료제. 항암제의 효과를 최대화하면서 부작용은 최소화합니다.",
      en: "Adjuvant therapy that compensates for reduced immune function during chemotherapy, maximizing drug effects while minimizing side effects.",
    },
    type: "injection",
  },

  // ────────────────── T: 체온 (Temperature) ──────────────────
  hyperthermia: {
    id: "hyperthermia",
    axis: "temperature",
    name: { ko: "고주파온열암치료", en: "High-Frequency Hyperthermia", ru: "Высокочастотная Гипертермия", kz: "Жоғары жиілікті гипертермия", zh: "高频热疗", ja: "高周波温熱療法" },
    description: {
      ko: "8MHz 고주파 전류를 암세포 부위에 집중시켜 42~43°C로 국소 가열합니다. 암세포는 정상 세포보다 열에 취약하므로 사멸을 유도하며, 항암제와 병행 시 시너지 효과가 있습니다.",
      en: "Concentrates 8MHz high-frequency current on cancer cell areas to locally heat to 42-43°C. Cancer cells are more heat-sensitive than normal cells, inducing their death with synergistic effects when combined with chemotherapy.",
      ru: "Локальный нагрев зоны опухоли до 42-43°C. Раковые клетки более чувствительны к теплу, что вызывает их гибель с синергетическим эффектом при химиотерапии.",
    },
    mechanism: {
      ko: "고열에 의한 암세포 사멸, 혈류 개선, 항암제 암세포 내 흡수율 증가",
      en: "Cancer cell death by heat, blood flow improvement, increased chemotherapy absorption in cancer cells",
    },
    evidence: {
      ko: "고주파온열 + 항암제 병행 시 생존기간 유의미 증가 (해외 임상 데이터)",
      en: "Significant survival time increase when combined with chemotherapy (international clinical data)",
    },
    price: { amount: 250000, unit: "KRW/session" },
    image: "/immune/program/cancer-heal1-4.png",
    type: "physical",
  },

  infraredHeat: {
    id: "infraredHeat",
    axis: "temperature",
    name: { ko: "적외선온열요법", en: "Infrared Thermotherapy", ru: "Инфракрасная Термотерапия", kz: "Инфрақызыл термотерапия", zh: "红外线温热疗法", ja: "赤外線温熱療法" },
    description: {
      ko: "근적외선을 이용한 전신 온열 요법. 기관지 염증 완화, 혈액 순환 개선, 피로 회복에 효과적입니다. 폐암 수술 후 호흡 재활에도 활용됩니다.",
      en: "Whole-body thermotherapy using near-infrared. Effective for bronchial inflammation relief, blood circulation improvement, and fatigue recovery.",
    },
    type: "physical",
  },

  // ────────────────── C: 순환 (Circulation) ──────────────────
  lymphDrainage: {
    id: "lymphDrainage",
    axis: "circulation",
    name: { ko: "림프도수 마사지", en: "Lymphatic Drainage Massage", ru: "Лимфодренажный Массаж", kz: "Лимфодренаж массажы", zh: "淋巴引流按摩", ja: "リンパドレナージマッサージ" },
    description: {
      ko: "숙련된 치료사가 림프관을 따라 마사지하여 림프액 순환을 돕습니다. 수술 후 림프절 제거로 발생하는 림프부종 치료에 필수적이며, 방치 시 평생 통증과 신경저림이 지속될 수 있습니다.",
      en: "Skilled therapists massage along lymph vessels to assist lymph circulation. Essential for treating post-surgical lymphedema; untreated lymphedema can cause lifelong pain and nerve tingling.",
      ru: "Специалисты массируют лимфатические сосуды. Незаменим при лимфедеме после удаления лимфоузлов.",
    },
    type: "manual",
  },

  ict: {
    id: "ict",
    axis: "circulation",
    name: { ko: "침전기물리치료 (ICT)", en: "Acupuncture-Electrophysical Therapy (ICT)", ru: "Иглоэлектрофизиотерапия", kz: "Ине-электрофизиотерапия (ICT)", zh: "电针物理治疗 (ICT)", ja: "鍼電気物理療法（ICT）" },
    description: {
      ko: "침치료와 전기자극을 결합한 치료법. 혈액 및 림프 순환을 개선하고, 통증 완화와 조직 회복을 돕습니다.",
      en: "A treatment combining acupuncture and electrical stimulation to improve blood and lymph circulation, relieve pain, and aid tissue recovery.",
    },
    price: { amount: 5000, unit: "KRW/session" },
    type: "combined",
  },

  // ────────────────── R: 저항성 (Resistibility) ──────────────────
  selenium: {
    id: "selenium",
    axis: "resistibility",
    name: { ko: "셀레늄 요법", en: "Selenium Therapy", ru: "Терапия Селеном", kz: "Селен терапиясы", zh: "硒疗法", ja: "セレン療法" },
    description: {
      ko: "비타민E의 약 2,000배에 달하는 항산화력을 가진 필수 미네랄. 활성산소 억제, DNA 손상 방지, 암세포 사멸 유도 기전이 있습니다. 항암치료 중 세포 손상 최소화에 사용됩니다.",
      en: "An essential mineral with approximately 2,000 times the antioxidant power of vitamin E. Has mechanisms for suppressing free radicals, preventing DNA damage, and inducing cancer cell death.",
      ru: "Незаменимый минерал с антиоксидантной активностью ~2000 раз выше витамина Е. Подавляет свободные радикалы, предотвращает повреждение ДНК.",
    },
    evidence: {
      ko: "셀레늄 보충 시 항암제 독성 감소, 면역 기능 개선 연구 다수 확인",
      en: "Multiple studies confirm reduced chemotherapy toxicity and improved immune function with selenium supplementation",
    },
    price: {
      oral: { amount: 800, unit: "KRW/tablet", product: "셀레나제퍼오랄" },
    },
    image: "/immune/program/cancer-heal1-5.png",
    type: "supplement",
  },

  glutathione: {
    id: "glutathione",
    axis: "resistibility",
    name: { ko: "글루타치온", en: "Glutathione", ru: "Глутатион", kz: "Глутатион", zh: "谷胱甘肽", ja: "グルタチオン" },
    description: {
      ko: "체내 강력한 항산화제로, 항암치료 후 세포 손상을 복구하고 간 해독 기능을 지원합니다. 피부 개선과 면역력 강화에도 효과적입니다.",
      en: "A powerful antioxidant that repairs cell damage after chemotherapy and supports liver detoxification. Also effective for skin improvement and immune enhancement.",
      ru: "Мощный антиоксидант, восстанавливающий клетки после химиотерапии и поддерживающий детоксикацию печени.",
    },
    type: "injection",
  },

  highVitaminC: {
    id: "highVitaminC",
    axis: "resistibility",
    name: { ko: "고농도 비타민 요법", en: "High-Dose Vitamin Therapy", ru: "Высокодозная Витаминная Терапия", kz: "Жоғары дозалы дәрумен терапиясы", zh: "高剂量维生素疗法", ja: "高濃度ビタミン療法" },
    description: {
      ko: "고농도 비타민C를 정맥 주사로 직접 공급. 항산화 작용으로 암세포 성장 억제, 면역 강화, 항암 피로 회복에 사용됩니다.",
      en: "Directly delivers high-concentration vitamin C via IV. Used for cancer cell growth inhibition through antioxidant action, immune enhancement, and chemotherapy fatigue recovery.",
      ru: "Высокие дозы витамина С внутривенно. Тормозит рост раковых клеток, усиливает иммунитет, борется с усталостью при химиотерапии.",
    },
    type: "injection",
  },

  placentaExtract: {
    id: "placentaExtract",
    axis: "resistibility",
    name: { ko: "태반추출물", en: "Placenta Extract (Laennec/Melsmon)", ru: "Экстракт Плаценты", kz: "Плацента сығындысы (Laennec/Melsmon)", zh: "胎盘提取物 (Laennec/Melsmon)", ja: "プラセンタエキス（ラエンネック／メルスモン）" },
    description: {
      ko: "인태반 추출물(라이넥/멜스몬 등)로 세포 재생, 면역 조절, 간 기능 개선 효과가 있습니다. 수술 후 회복 기간 단축에 사용됩니다.",
      en: "Human placenta extract (Laennec/Melsmon etc.) with cell regeneration, immune regulation, and liver function improvement effects. Used to shorten post-surgical recovery periods.",
    },
    type: "injection",
  },

  // ────────────────── N: 영양 (Nutrition) ──────────────────
  chefLive: {
    id: "chefLive",
    axis: "nutrition",
    name: { ko: "셰프 라이브 코너", en: "Chef Live Station", ru: "Живая Кухня Шефа", kz: "Аспаздың тікелей дайындау бұрышы", zh: "厨师现场烹饪区", ja: "シェフのライブキッチン" },
    description: {
      ko: "전담 셰프가 환자 상태에 맞게 즉석에서 조리하는 맞춤 식단 코너. 30종 이상의 메뉴 중 선택 가능하며, 항암 맞춤, 저잔사, 위절제 식이 등 질환별 특화 메뉴가 있습니다.",
      en: "A dedicated chef station where food is prepared fresh according to each patient's condition. 30+ menu options with cancer-specific, low-residue, post-gastrectomy specialized menus.",
      ru: "Шеф-повар готовит свежие блюда для каждого пациента. Более 30 вариантов меню, включая специализированные противораковые диеты.",
    },
    menuOptions: {
      ko: [
        "맞춤 면역 회복 선택식 (30종+)",
        "셰프 라이브 코너",
        "항암 맞춤 코너",
        "항암 쌈채소 코너",
        "제철 과일 코너",
        "수제 건강음료 코너",
        "비빔밥 코너",
      ],
      en: [
        "Custom immune recovery menu (30+ options)",
        "Chef Live Station",
        "Chemotherapy-specific menu",
        "Wrapped vegetables corner",
        "Seasonal fruit corner",
        "Artisan health drink corner",
        "Bibimbap corner",
      ],
    },
    images: [
      "/immune/program/cancer-heal5-1.png",
      "/immune/program/cancer-heal5-2.png",
      "/immune/program/cancer-heal5-3.png",
      "/immune/program/cancer-heal5-4.png",
      "/immune/program/cancer-heal6-1.jpg",
      "/immune/program/cancer-heal6-2.jpg",
      "/immune/program/cancer-heal6-3.jpg",
      "/immune/program/cancer-heal6-4.jpg",
      "/immune/program/cancer-heal6-5.jpg",
      "/immune/program/cancer-heal6-6.jpg",
      "/immune/program/cancer-heal6-7.jpg",
      "/immune/program/cancer-heal6-8.jpg",
    ],
    type: "nutrition",
  },

  lowResidueDiet: {
    id: "lowResidueDiet",
    axis: "nutrition",
    name: { ko: "저잔사 치료식이", en: "Low-Residue Therapeutic Diet", ru: "Низкошлаковая Лечебная Диета", kz: "Аз қалдықты емдік диета", zh: "低渣治疗饮食", ja: "低残渣治療食" },
    description: {
      ko: "대장·위 절제 수술 후 장에 부담을 최소화하는 식이요법. 소화가 잘 되고 장 자극이 적은 음식으로 구성됩니다.",
      en: "Diet therapy that minimizes intestinal burden after colorectal or gastric resection surgery.",
    },
    indications: { ko: ["대장암 수술 후", "위암 수술 후", "장 기능 저하 환자"], en: ["Post-colorectal surgery", "Post-gastric surgery", "Patients with reduced bowel function"] },
    type: "nutrition",
  },

  gastrectomyDiet: {
    id: "gastrectomyDiet",
    axis: "nutrition",
    name: { ko: "위절제 치료식이 (덤핑증후군 관리)", en: "Post-Gastrectomy Diet (Dumping Syndrome Management)", ru: "Диета после Гастрэктомии", kz: "Асқазан резекциясынан кейінгі диета (демпинг-синдромды бақылау)", zh: "胃切除术后饮食（倾倒综合征管理）", ja: "胃切除後治療食（ダンピング症候群の管理）" },
    description: {
      ko: "위절제 후 발생하는 덤핑증후군(식사 직후 어지럼·저혈당)을 예방하는 소량 다회 식이 프로그램. 단순당 제한, 수분과 식사 분리 등 맞춤 관리를 제공합니다.",
      en: "A small, frequent meal program to prevent dumping syndrome (dizziness/hypoglycemia immediately after eating) after gastrectomy.",
    },
    indications: { ko: ["위절제 수술 후", "덤핑증후군 환자"], en: ["Post-gastrectomy", "Dumping syndrome patients"] },
    type: "nutrition",
  },

  lowIodideDiet: {
    id: "lowIodideDiet",
    axis: "nutrition",
    name: { ko: "저요오드 식이", en: "Low-Iodine Diet", ru: "Низкойодная Диета", kz: "Йоды аз диета", zh: "低碘饮食", ja: "低ヨウ素食" },
    description: {
      ko: "갑상선암 수술 후 방사성요오드 치료 전에 실시하는 저요오드 식이. 방사성요오드 치료 효과를 극대화하기 위해 요오드 섭취를 제한합니다.",
      en: "Low-iodine diet before radioiodine therapy after thyroid cancer surgery, restricting iodine intake to maximize treatment effectiveness.",
    },
    indications: { ko: ["갑상선암 수술 후", "방사성요오드 치료 예정 환자"], en: ["Post-thyroid surgery", "Patients scheduled for radioiodine therapy"] },
    type: "nutrition",
  },
};

// 비급여 가격표 (2026-04-21 기준, 강서 본원)
export const NON_COVERED_PRICES = {
  tests: {
    nkActivityTest: 100000,
    hairMineralTest: 150000,
    antioxidantTest: 100000,
    urineOrganicAcid: 270000,
    maleCancerMarker11: 150000,
    femaleCancerMarker12: 150000,
    maleComprehensive26: 220000,
    femaleComprehensive27: 200000,
  },
  therapy: {
    manualTherapy30min: 90000,
    manualTherapy40min: 120000,
    manualTherapy50min: 180000,
    manualTherapy60min: 230000,
    manualTherapy70min: 280000,
    painScrambler: "200,000–300,000",
    shockwave: 180000,
    cryo3min: 30000,
    hyperthermia: 250000,
    neurInjection: 50000,
    placentaInjection: 100000,
    ict: 5000,
  },
  room: {
    vipMin: 200000,
    vipMax: 600000,
    unit: "KRW/day",
  },
};

export const THERAPY_AXES = ["immunity", "temperature", "circulation", "resistibility", "nutrition"];

export const THERAPY_LIST = Object.values(IMMUNE_THERAPIES);
