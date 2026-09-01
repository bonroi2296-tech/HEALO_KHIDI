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
 *   - 생존율: 말기위암 「한방+항암 병행치료」 54% (병원 표기 그대로. «개선»이 아니다 —
 *     2026-09-01 원문 재확인. 참고논문 Rao X.Q. et al. 1994, CJITWM 14(6):366)
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
  wound: { title: { ko: "상처 관리", en: "Wound care", ru: "Уход за раной", kz: "Жараны күту", zh: "伤口护理", ja: "創傷ケア" }, items: 5 },
  stoma: { title: { ko: "장루 관리", en: "Stoma care", ru: "Уход за стомой", kz: "Стоманы күту", zh: "造口护理", ja: "ストーマケア" }, items: 8 },
  diet: { title: { ko: "식이 관리", en: "Dietary management", ru: "Диетическое сопровождение", kz: "Диеталық басқару", zh: "饮食管理", ja: "食事管理" }, items: 7 },
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
      kz: "Сүт безі · жатыр · аналық без обыры",
      zh: "乳腺 · 子宫 · 卵巢癌",
      ja: "乳房 · 子宮 · 卵巣がん",
    },
    intro: {
      ko: "여성암은 수술 후 장기적 관리가 예후에 결정적입니다. 면력한방병원은 수술 전후 회복부터 항암 동안 증상 관리, 완화 기간 재발 예방까지 통합적으로 다룹니다.",
      en: "For female cancers, long-term post-surgical management is decisive for outcomes. Immune Hospital provides integrated care from pre/post-surgical recovery through chemotherapy support to recurrence prevention.",
      ru: "При женских формах рака долгосрочное послеоперационное ведение определяет прогноз. Иммунная клиника обеспечивает комплексное сопровождение — от восстановления до и после операции и контроля симптомов во время химиотерапии до профилактики рецидива.",
      kz: "Әйелдер обырында операциядан кейінгі ұзақ мерзімді бақылау нәтиже үшін шешуші маңызға ие. Иммундық клиника операцияға дейінгі және кейінгі қалпына келуден бастап, химиотерапия кезіндегі симптомдарды бақылау мен рецидивтің алдын алуға дейін кешенді көмек көрсетеді.",
      zh: "对于女性癌症，术后的长期管理对预后起决定性作用。免疫医院提供从术前术后康复、化疗期间症状管理到复发预防的一体化诊疗。",
      ja: "女性がんでは術後の長期的な管理が予後を左右します。免疫病院は手術前後の回復から抗がん剤治療中の症状管理、寛解期の再発予防まで一貫してサポートします。",
    },
    complications: [
      { name: { ko: "발열", en: "Fever", ru: "Лихорадка", kz: "Қызба", zh: "发热", ja: "発熱" }, desc: { ko: "단순 발열과 수술부위 세균감염 발열은 구분 필요", en: "Simple fever must be distinguished from fever caused by bacterial infection at the surgical site", ru: "Необходимо отличать обычную лихорадку от лихорадки при бактериальной инфекции операционной раны", kz: "Қарапайым қызбаны операция орнындағы бактериялық инфекциядан болатын қызбадан ажырату қажет", zh: "需要区分单纯发热与手术部位细菌感染引起的发热", ja: "単純な発熱と手術部位の細菌感染による発熱を区別する必要があります" } },
      { name: { ko: "림프부종", en: "Lymphedema", ru: "Лимфедема", kz: "Лимфедема", zh: "淋巴水肿", ja: "リンパ浮腫" }, desc: { ko: "림프절 제거 후 붓기 — 방치 시 평생 통증·신경저림", en: "Swelling after lymph node removal — if left untreated, can cause lifelong pain and numbness", ru: "Отёк после удаления лимфоузлов — без лечения может вызвать пожизненную боль и онемение", kz: "Лимфа түйіндерін алып тастағаннан кейінгі ісіну — емделмесе, өмір бойы ауырсыну мен ұюды тудырады", zh: "淋巴结清扫后的肿胀——若不处理可导致终身疼痛和麻木", ja: "リンパ節郭清後のむくみ — 放置すると生涯にわたる痛みやしびれを招きます" } },
      { name: { ko: "배뇨·배변장애", en: "Urinary and bowel dysfunction", ru: "Нарушение мочеиспускания и дефекации", kz: "Зәр шығару және дәрет бұзылысы", zh: "排尿排便障碍", ja: "排尿・排便障害" }, desc: { ko: "신경 손상으로 인한 기능 장애", en: "Functional impairment due to nerve damage", ru: "Функциональные нарушения вследствие повреждения нервов", kz: "Жүйке зақымдануынан болатын функционалдық бұзылыс", zh: "因神经损伤导致的功能障碍", ja: "神経損傷による機能障害" } },
      { name: { ko: "수술부위 합병증", en: "Surgical site complications", ru: "Осложнения в области операции", kz: "Операция орнындағы асқынулар", zh: "手术部位并发症", ja: "手術部位の合併症" }, desc: { ko: "염증, 상처 아물지 않음, 감염 위험", en: "Inflammation, poor wound healing, and risk of infection", ru: "Воспаление, плохое заживление раны и риск инфекции", kz: "Қабыну, жараның жазылмауы және инфекция қаупі", zh: "炎症、伤口不愈合及感染风险", ja: "炎症、創傷治癒不良、感染リスク" } },
      { name: { ko: "운동 제한", en: "Restricted movement", ru: "Ограничение движений", kz: "Қозғалыстың шектелуі", zh: "活动受限", ja: "運動制限" }, desc: { ko: "유착으로 인한 관절 경직, 어깨 움직임 제한", en: "Joint stiffness and limited shoulder mobility due to adhesions", ru: "Тугоподвижность суставов и ограничение движения плеча из-за спаек", kz: "Бітісуден болатын буын қатаюы және иық қозғалысының шектелуі", zh: "因粘连导致的关节僵硬和肩部活动受限", ja: "癒着による関節のこわばりや肩の可動域制限" } },
      { name: { ko: "미세잔존암", en: "Minimal residual disease", ru: "Минимальная остаточная болезнь", kz: "Минималды қалдық обыр", zh: "微小残留癌", ja: "微小残存がん" }, desc: { ko: "영상에 안 보이는 남은 암세포 관리", en: "Management of residual cancer cells not visible on imaging", ru: "Контроль остаточных раковых клеток, не видимых на снимках", kz: "Бейнелеуде көрінбейтін қалдық обыр жасушаларын бақылау", zh: "管理影像上无法显示的残留癌细胞", ja: "画像に映らない残存がん細胞の管理" } },
      { name: { ko: "영양·기력 저하", en: "Nutritional and energy decline", ru: "Снижение питания и сил", kz: "Тамақтану және күш-қуаттың төмендеуі", zh: "营养与体力下降", ja: "栄養・体力の低下" }, desc: { ko: "조직 손상 후 회복에 시간 필요", en: "Recovery from tissue damage takes time", ru: "Восстановление после повреждения тканей требует времени", kz: "Тіннің зақымдануынан кейін қалпына келу уақыт қажет етеді", zh: "组织损伤后的恢复需要时间", ja: "組織損傷後の回復には時間がかかります" } },
      { name: { ko: "정서적 문제", en: "Emotional issues", ru: "Эмоциональные проблемы", kz: "Эмоционалдық проблемалар", zh: "情绪问题", ja: "情緒的な問題" }, desc: { ko: "암 치료 스트레스, 불안, 우울 대응", en: "Coping with cancer treatment stress, anxiety, and depression", ru: "Помощь при стрессе, тревоге и депрессии, связанных с лечением рака", kz: "Обырды емдеу стресі, мазасыздық пен депрессияға қарсы көмек", zh: "应对癌症治疗带来的压力、焦虑和抑郁", ja: "がん治療によるストレス・不安・うつへの対応" } },
    ],
    focusPrograms: {
      ko: ["림프도수 (부종 특화)", "NK세포 치료", "고농도 비타민", "심신통합 프로그램"],
      en: ["Lymphatic drainage (edema-focused)", "NK cell therapy", "High-dose vitamins", "Mind-body integrative program"],
      ru: ["Лимфодренаж (при отёках)", "NK-клеточная терапия", "Высокие дозы витаминов", "Психосоматическая программа"],
      kz: ["Лимфодренаж (ісінуге арналған)", "NK-жасушалық терапия", "Жоғары дозалы дәрумендер", "Психосоматикалық бағдарлама"],
      zh: ["淋巴引流（针对水肿）", "NK细胞治疗", "高浓度维生素", "身心整合项目"],
      ja: ["リンパドレナージュ（浮腫対応）", "NK細胞療法", "高濃度ビタミン", "心身統合プログラム"],
    },
  },

  digest: {
    slug: "digest",
    immuneSourceUrl: "/pages/cancer/digest-1.php",
    title: {
      ko: "대장 · 위암",
      en: "Colorectal · Gastric Cancer",
      ru: "Рак толстой кишки · желудка",
      kz: "Тоқ ішек · асқазан обыры",
      zh: "结直肠 · 胃癌",
      ja: "大腸 · 胃がん",
    },
    intro: {
      ko: "대장·위 절제 후에는 '식사법'이 곧 '회복 속도'입니다. 면력한방병원은 장루 관리, 덤핑증후군 대응, 저잔사 치료식을 수술 직후부터 체계적으로 제공합니다.",
      en: "After colorectal or gastric resection, diet management defines recovery speed. Immune Hospital provides systematic stoma care, dumping syndrome management, and low-residue therapeutic diets from immediate post-op.",
      ru: "После резекции толстой кишки или желудка способ питания определяет скорость восстановления. Иммунная клиника с первых дней после операции системно обеспечивает уход за стомой, контроль демпинг-синдрома и низкошлаковую лечебную диету.",
      kz: "Тоқ ішек немесе асқазанды кесіп алғаннан кейін «тамақтану тәсілі» — қалпына келу жылдамдығының кепілі. Иммундық клиника операциядан кейін бірден стоманы күтуді, демпинг-синдромды бақылауды және аз қалдықты емдік диетаны жүйелі түрде ұсынады.",
      zh: "结直肠或胃切除术后，'饮食方式'就是'恢复速度'。免疫医院从术后即刻起，系统地提供造口护理、倾倒综合征管理和低渣治疗膳食。",
      ja: "大腸・胃の切除後は「食べ方」がそのまま「回復速度」になります。免疫病院はストーマケア、ダンピング症候群への対応、低残渣治療食を術後すぐから体系的に提供します。",
    },
    complications: [
      { name: { ko: "고열", en: "High fever", ru: "Высокая температура", kz: "Жоғары қызба", zh: "高热", ja: "高熱" }, desc: { ko: "수술부위 세균감염 가능성 — 신속 대응", en: "Possible bacterial infection at the surgical site — requires prompt response", ru: "Возможна бактериальная инфекция операционной раны — требует быстрой реакции", kz: "Операция орнында бактериялық инфекция болуы мүмкін — жедел әрекет қажет", zh: "可能为手术部位细菌感染——需迅速处理", ja: "手術部位の細菌感染の可能性 — 迅速な対応が必要です" } },
      { name: { ko: "문합부 누출", en: "Anastomotic leakage", ru: "Несостоятельность анастомоза", kz: "Анастомоздың ағуы", zh: "吻合口漏", ja: "縫合部漏出" }, desc: { ko: "장 연결부위 누출 — 재수술 위험", en: "Leakage at the bowel join — risk of reoperation", ru: "Подтекание в месте соединения кишки — риск повторной операции", kz: "Ішек жалғанған жердің ағуы — қайта операция қаупі", zh: "肠吻合部位渗漏——有再次手术风险", ja: "腸の接合部からの漏れ — 再手術のリスク" } },
      { name: { ko: "장기능 변화", en: "Altered bowel function", ru: "Изменение функции кишечника", kz: "Ішек қызметінің өзгеруі", zh: "肠功能改变", ja: "腸機能の変化" }, desc: { ko: "장루 필요 또는 배변 조절 필요", en: "May require a stoma or bowel control management", ru: "Может потребоваться стома или контроль дефекации", kz: "Стома немесе дәретті бақылау қажет болуы мүмкін", zh: "可能需要造口或排便控制", ja: "ストーマや排便コントロールが必要になることがあります" } },
      { name: { ko: "장유착/장폐색", en: "Bowel adhesion / obstruction", ru: "Спайки / непроходимость кишечника", kz: "Ішек бітісуі / бітелуі", zh: "肠粘连/肠梗阻", ja: "腸癒着・腸閉塞" }, desc: { ko: "복부 수술 후 흔한 합병증, 반복 가능", en: "Common complication after abdominal surgery, may recur", ru: "Частое осложнение после абдоминальных операций, может повторяться", kz: "Іш қуысы операциясынан кейінгі жиі асқыну, қайталануы мүмкін", zh: "腹部手术后常见并发症，可能反复发生", ja: "腹部手術後によくみられる合併症で、再発することがあります" } },
      { name: { ko: "덤핑증후군", en: "Dumping syndrome", ru: "Демпинг-синдром", kz: "Демпинг-синдром", zh: "倾倒综合征", ja: "ダンピング症候群" }, desc: { ko: "위절제 후 식사 직후 어지럼·저혈당 (위절제 환자)", en: "Dizziness and hypoglycemia right after eating following gastrectomy (gastrectomy patients)", ru: "Головокружение и гипогликемия сразу после еды после гастрэктомии (у пациентов с гастрэктомией)", kz: "Гастрэктомиядан кейін тамақтанғаннан соң бас айналу мен гипогликемия (гастрэктомия пациенттері)", zh: "胃切除后进食后立即出现头晕、低血糖（胃切除患者）", ja: "胃切除後、食後すぐのめまい・低血糖（胃切除患者）" } },
      { name: { ko: "수술부위 합병증", en: "Surgical site complications", ru: "Осложнения в области операции", kz: "Операция орнындағы асқынулар", zh: "手术部位并发症", ja: "手術部位の合併症" }, desc: { ko: "염증, 감염, 상처 치유 지연", en: "Inflammation, infection, and delayed wound healing", ru: "Воспаление, инфекция и замедленное заживление раны", kz: "Қабыну, инфекция және жараның баяу жазылуы", zh: "炎症、感染及伤口愈合延迟", ja: "炎症、感染、創傷治癒の遅延" } },
      { name: { ko: "미세잔존암", en: "Minimal residual disease", ru: "Минимальная остаточная болезнь", kz: "Минималды қалдық обыр", zh: "微小残留癌", ja: "微小残存がん" }, desc: { ko: "림프절 전이 위험 — 면역 활성화 필요", en: "Risk of lymph node metastasis — immune activation needed", ru: "Риск метастазов в лимфоузлы — необходима активация иммунитета", kz: "Лимфа түйіндеріне метастаз қаупі — иммунитетті белсендіру қажет", zh: "淋巴结转移风险——需激活免疫", ja: "リンパ節転移のリスク — 免疫の活性化が必要です" } },
      { name: { ko: "영양·기력 저하", en: "Nutritional and energy decline", ru: "Снижение питания и сил", kz: "Тамақтану және күш-қуаттың төмендеуі", zh: "营养与体力下降", ja: "栄養・体力の低下" }, desc: { ko: "흡수 장애 → 체중 감소", en: "Malabsorption leading to weight loss", ru: "Нарушение всасывания → потеря веса", kz: "Сіңірудің бұзылуы → салмақ жоғалту", zh: "吸收障碍→体重下降", ja: "吸収障害 → 体重減少" } },
      { name: { ko: "정서적 문제", en: "Emotional issues", ru: "Эмоциональные проблемы", kz: "Эмоционалдық проблемалар", zh: "情绪问题", ja: "情緒的な問題" }, desc: { ko: "장루 적응 심리적 부담", en: "Psychological burden of adjusting to a stoma", ru: "Психологическая нагрузка при адаптации к стоме", kz: "Стомаға бейімделудің психологиялық ауыртпалығы", zh: "适应造口的心理负担", ja: "ストーマへの適応に伴う心理的負担" } },
    ],
    focusPrograms: {
      ko: ["저잔사 치료식이", "위절제 치료식이 (덤핑증후군)", "상처 관리 (5개 프로토콜)", "장루 관리 (8개 프로토콜)", "식이 관리 (7개 프로토콜)"],
      en: ["Low-residue therapeutic diet", "Post-gastrectomy diet (dumping syndrome)", "Wound care (5 protocols)", "Stoma care (8 protocols)", "Dietary management (7 protocols)"],
      ru: ["Малошлаковая лечебная диета", "Диета после гастрэктомии (демпинг-синдром)", "Уход за раной (5 протоколов)", "Уход за стомой (8 протоколов)", "Диетическое сопровождение (7 протоколов)"],
      kz: ["Аз қалдықты емдік диета", "Гастрэктомиядан кейінгі диета (демпинг-синдром)", "Жараны күту (5 протокол)", "Стоманы күту (8 протокол)", "Диеталық басқару (7 протокол)"],
      zh: ["低渣治疗膳食", "胃切除后膳食（倾倒综合征）", "伤口护理（5项方案）", "造口护理（8项方案）", "饮食管理（7项方案）"],
      ja: ["低残渣治療食", "胃切除後治療食（ダンピング症候群）", "創傷ケア（5プロトコル）", "ストーマケア（8プロトコル）", "食事管理（7プロトコル）"],
    },
    // ⚠️ 이 칸은 «healwith 의 주장»이 아니라 «제휴 병원이 자기 사이트에 적어 둔 것을 옮긴 것»이다.
    //    2026-09-01 감사에서 두 가지가 잡혀 함께 고쳤다.
    //    ① 출처가 화면에 하나도 안 나왔다 — 암 생존율 수치를 근거 없이 띄우는 건 YMYL 지면에서
    //       제일 위험한 형태다. 우리는 병원이 아니라 등록 유치업체라 더 그렇다.
    //    ② 옮겨 적으면서 주장이 «세졌다». 원문(immunehospital.com/pages/cancer/digest-1.php)은
    //       「암 수술 후, 생존율 54% / 한방+항암 병행치료」라고만 적혀 있는데 우리 문장은
    //       "생존율 54% 개선"이었다. 「생존율이 54%다」와 「생존율이 54% 좋아진다」는 다른 주장이고,
    //       1994년 인용 논문을 직접 못 본 상태에서 더 센 쪽을 고를 근거가 없다.
    //       → 원문 표기를 «그대로 옮긴 형태»로 바꾸고, 누가 한 말인지 앞에 붙였다.
    //    ⚠️ 숫자·의학적 타당성은 우리가 판단하지 않는다. 바꾸려면 면력한방병원 확인이 먼저다.
    stats: {
      survivalImprovement: { ko: "면력한방병원은 «말기 위암 수술 후 한방+항암 병행치료 시 생존율 54%»로 표기합니다", en: "Immune Hospital states: \"54% survival with combined Korean medicine and chemotherapy after surgery for advanced gastric cancer.\"", ru: "Иммунная клиника указывает: «выживаемость 54% при сочетании корейской медицины и химиотерапии после операции по поводу рака желудка поздней стадии»", kz: "Иммундық клиника «асқынған асқазан обыры бойынша операциядан кейін корей медицинасы мен химиотерапияны қатар қолданғанда өмір сүру — 54%» деп көрсетеді", zh: "免疫医院标示：「晚期胃癌术后韩方与化疗并行治疗，生存率54%」", ja: "免疫病院は「進行胃がんの術後に韓方と抗がん剤を併用した場合、生存率54%」と表記しています" },
      survivalImprovementSource: { ko: "출처: 면력한방병원 공식 사이트 (2026-04 확인). 해당 페이지가 밝힌 참고논문 — Rao X.Q. et al. (1994), CJITWM 14(6):366. healwith 가 독자적으로 검증한 수치가 아닙니다.", en: "Source: Immune Hospital official website (retrieved April 2026). Reference cited on that page — Rao X.Q. et al. (1994), CJITWM 14(6):366. Not independently verified by healwith.", ru: "Источник: официальный сайт Иммунной клиники (проверено в апреле 2026). Работа, указанная на той странице, — Rao X.Q. et al. (1994), CJITWM 14(6):366. Показатель не проверялся healwith независимо.", kz: "Дереккөз: Иммундық клиниканың ресми сайты (2026 жылғы сәуірде тексерілді). Сол беттегі сілтеме — Rao X.Q. et al. (1994), CJITWM 14(6):366. Бұл көрсеткішті healwith тәуелсіз тексерген жоқ.", zh: "来源：免疫医院官方网站（2026年4月确认）。该页面所引文献 — Rao X.Q. et al. (1994), CJITWM 14(6):366。此数值未经 healwith 独立核实。", ja: "出典：免疫病院公式サイト（2026年4月確認）。同ページが挙げる引用文献 — Rao X.Q. et al. (1994), CJITWM 14(6):366。この数値は healwith が独自に検証したものではありません。" },
      survivalImprovementSourceUrl: "https://immunehospital.com/pages/cancer/digest-1.php",
    },
  },

  liver: {
    slug: "liver",
    immuneSourceUrl: "/pages/cancer/liver-1.php",
    title: {
      ko: "간 · 담도 · 췌장암",
      en: "Liver · Biliary · Pancreatic Cancer",
      ru: "Рак печени · желчевыводящих путей · поджелудочной",
      kz: "Бауыр · өт жолдары · ұйқы безі обыры",
      zh: "肝 · 胆道 · 胰腺癌",
      ja: "肝臓 · 胆道 · 膵臓がん",
    },
    intro: {
      ko: "간·담도·췌장 절제는 대사 기능 자체에 영향을 줍니다. 면력한방병원은 간기능 저하, 담즙 누출, 소화·흡수 장애, 수술 후 당뇨까지 복합적으로 관리합니다.",
      en: "Liver, biliary, and pancreatic resection directly affects metabolic function. Immune Hospital integrates management of hepatic failure, bile leakage, digestive/absorption disorders, and post-surgical diabetes.",
      ru: "Резекция печени, желчевыводящих путей и поджелудочной железы влияет на сам обмен веществ. Иммунная клиника комплексно ведёт снижение функции печени, подтекание желчи, нарушения пищеварения и всасывания, а также послеоперационный диабет.",
      kz: "Бауыр, өт жолдары мен ұйқы безін кесіп алу зат алмасу қызметінің өзіне әсер етеді. Иммундық клиника бауыр қызметінің төмендеуін, өттің ағуын, ас қорыту мен сіңіру бұзылыстарын және операциядан кейінгі қант диабетін кешенді түрде басқарады.",
      zh: "肝、胆道、胰腺切除会直接影响代谢功能本身。免疫医院对肝功能下降、胆汁漏、消化吸收障碍乃至术后糖尿病进行综合管理。",
      ja: "肝臓・胆道・膵臓の切除は代謝機能そのものに影響します。免疫病院は肝機能低下、胆汁漏、消化・吸収障害、術後糖尿病まで総合的に管理します。",
    },
    complications: [
      {
        name: { ko: "간기능 저하", en: "Hepatic dysfunction", ru: "Снижение функции печени", kz: "Бауыр қызметінің төмендеуі", zh: "肝功能下降", ja: "肝機能低下" },
        desc: { ko: "절제 후 황달·가려움·설사·발열·식욕저하 — 간 용적 감소 또는 담도 폐쇄", en: "Jaundice, itching, diarrhea, fever, and loss of appetite after resection — due to reduced liver volume or bile duct obstruction", ru: "После резекции — желтуха, зуд, диарея, лихорадка, потеря аппетита — из-за уменьшения объёма печени или закупорки желчных протоков", kz: "Кесіп алғаннан кейін сарғаю, қышу, диарея, қызба, тәбеттің төмендеуі — бауыр көлемінің азаюы немесе өт жолының бітелуі", zh: "切除后出现黄疸、瘙痒、腹泻、发热、食欲下降——因肝体积减少或胆道阻塞", ja: "切除後の黄疸・かゆみ・下痢・発熱・食欲低下 — 肝容積の減少または胆道閉塞による" },
      },
      {
        name: { ko: "수술부위 합병증", en: "Surgical site complications", ru: "Осложнения в области операции", kz: "Операция орнындағы асқынулар", zh: "手术部位并发症", ja: "手術部位の合併症" },
        desc: { ko: "절개부위 감염·출혈 — 붓기·통증·삼출물, 약물 또는 시술로 관리", en: "Infection or bleeding at the incision — swelling, pain, and discharge, managed with medication or procedures", ru: "Инфекция или кровотечение в области разреза — отёк, боль и выделения, лечатся медикаментами или процедурами", kz: "Тілік орнындағы инфекция немесе қан кету — ісіну, ауырсыну және бөліністер, дәрі-дәрмекпен немесе емшаралармен басқарылады", zh: "切口感染或出血——肿胀、疼痛、渗出，可通过药物或处置管理", ja: "切開部の感染・出血 — 腫れ・痛み・滲出液、薬剤または処置で管理" },
      },
      {
        name: { ko: "담즙 누출", en: "Bile leakage", ru: "Подтекание желчи", kz: "Өттің ағуы", zh: "胆汁漏", ja: "胆汁漏" },
        desc: { ko: "복강 내 담즙 유출 → 복통·발열·황달, 적절한 처치로 회복", en: "Bile leaking into the abdominal cavity → abdominal pain, fever, jaundice; recovers with appropriate treatment", ru: "Утечка желчи в брюшную полость → боль в животе, лихорадка, желтуха; восстанавливается при надлежащем лечении", kz: "Іш қуысына өттің ағуы → іштің ауыруы, қызба, сарғаю; тиісті емдеумен қалпына келеді", zh: "胆汁漏入腹腔→腹痛、发热、黄疸，经适当处置可恢复", ja: "腹腔内への胆汁漏出 → 腹痛・発熱・黄疸、適切な処置で回復" },
      },
      {
        name: { ko: "소화·흡수 장애", en: "Digestive and absorption disorders", ru: "Нарушения пищеварения и всасывания", kz: "Ас қорыту және сіңіру бұзылыстары", zh: "消化吸收障碍", ja: "消化・吸収障害" },
        desc: { ko: "췌장 절제 후 효소 분비 감소 → 소화불량·설사·영양흡수 저하", en: "Reduced enzyme secretion after pancreatic resection → indigestion, diarrhea, and poor nutrient absorption", ru: "Снижение секреции ферментов после резекции поджелудочной → несварение, диарея и плохое усвоение питательных веществ", kz: "Ұйқы безін кесіп алғаннан кейін фермент бөлінуінің азаюы → ас қорытудың бұзылуы, диарея және қоректік заттардың нашар сіңуі", zh: "胰腺切除后酶分泌减少→消化不良、腹泻、营养吸收下降", ja: "膵臓切除後の酵素分泌低下 → 消化不良・下痢・栄養吸収の低下" },
      },
      {
        name: { ko: "수술 후 당뇨", en: "Post-surgical diabetes", ru: "Послеоперационный диабет", kz: "Операциядан кейінгі қант диабеті", zh: "术后糖尿病", ja: "術後糖尿病" },
        desc: { ko: "췌장 조직 제거로 인슐린 분비 감소 → 당뇨 발병 위험", en: "Reduced insulin secretion from removal of pancreatic tissue → risk of developing diabetes", ru: "Снижение секреции инсулина после удаления ткани поджелудочной → риск развития диабета", kz: "Ұйқы безі тінін алып тастаудан инсулин бөлінуінің азаюы → қант диабетінің даму қаупі", zh: "因切除胰腺组织导致胰岛素分泌减少→糖尿病发病风险", ja: "膵臓組織の摘出によるインスリン分泌低下 → 糖尿病発症のリスク" },
      },
      {
        name: { ko: "미세잔존암", en: "Minimal residual disease", ru: "Минимальная остаточная болезнь", kz: "Минималды қалдық обыр", zh: "微小残留癌", ja: "微小残存がん" },
        desc: { ko: "현미경 수준 잔존 암세포 — 면역 활성화 필수", en: "Residual cancer cells at the microscopic level — immune activation is essential", ru: "Остаточные раковые клетки на микроскопическом уровне — необходима активация иммунитета", kz: "Микроскопиялық деңгейдегі қалдық обыр жасушалары — иммунитетті белсендіру міндетті", zh: "显微镜级别的残留癌细胞——必须激活免疫", ja: "顕微鏡レベルの残存がん細胞 — 免疫の活性化が必須" },
      },
    ],
    focusPrograms: {
      ko: ["싸이모신α1 (면역 복구)", "고주파온열 (간 기능 보조)", "췌장 효소 보완식", "혈당 맞춤식"],
      en: ["Thymosin α1 (immune recovery)", "RF hyperthermia (liver support)", "Pancreatic enzyme support diet", "Blood-sugar tailored diet"],
      ru: ["Тимозин α1 (восстановление иммунитета)", "Радиочастотная гипертермия (поддержка печени)", "Питание с панкреатическими ферментами", "Диета с контролем сахара"],
      kz: ["Thymosin α1 (иммунитетті қалпына келтіру)", "Радиожиілікті гипертермия (бауырды қолдау)", "Ұйқы безі ферменттерін толықтыратын тамақ", "Қандағы қантты реттейтін диета"],
      zh: ["胸腺素α1（免疫修复）", "射频热疗（辅助肝功能）", "胰酶补充膳食", "血糖定制膳食"],
      ja: ["Thymosin α1（免疫回復）", "高周波温熱（肝機能補助）", "膵酵素補充食", "血糖管理食"],
    },
  },

  lung: {
    slug: "lung",
    immuneSourceUrl: "/pages/cancer/lung-1.php",
    title: {
      ko: "폐암",
      en: "Lung Cancer",
      ru: "Рак лёгких",
      kz: "Өкпе обыры",
      zh: "肺癌",
      ja: "肺がん",
    },
    intro: {
      ko: "폐 절제 후에는 '호흡 용량' 회복이 일상 복귀의 관건입니다. 면력한방병원은 호흡 재활, 기관지 염증 관리, 면역 회복을 병행합니다.",
      en: "After lung resection, restoring respiratory capacity is the key to returning to daily life. Immune Hospital integrates respiratory rehab, bronchial inflammation care, and immune recovery.",
      ru: "После резекции лёгкого восстановление дыхательного объёма — ключ к возвращению к повседневной жизни. Иммунная клиника сочетает дыхательную реабилитацию, лечение воспаления бронхов и восстановление иммунитета.",
      kz: "Өкпені кесіп алғаннан кейін «тыныс алу көлемін» қалпына келтіру күнделікті өмірге оралудың кепілі. Иммундық клиника тыныс алу реабилитациясын, бронх қабынуын емдеуді және иммунитетті қалпына келтіруді қатар жүргізеді.",
      zh: "肺切除术后，'呼吸容量'的恢复是回归日常生活的关键。免疫医院同步进行呼吸康复、支气管炎症管理和免疫恢复。",
      ja: "肺切除後は「呼吸容量」の回復が日常復帰の鍵となります。免疫病院は呼吸リハビリ、気管支炎症の管理、免疫回復を併行します。",
    },
    complications: [
      { name: { ko: "호흡곤란·폐활량 감소", en: "Dyspnea and reduced lung capacity", ru: "Одышка и снижение жизненной ёмкости лёгких", kz: "Ентігу және өкпе сыйымдылығының төмендеуі", zh: "呼吸困难、肺活量下降", ja: "呼吸困難・肺活量の低下" }, desc: { ko: "계단 오를 때 숨참, 말하면서 호흡 고르기 어려움", en: "Shortness of breath when climbing stairs, difficulty controlling breathing while speaking", ru: "Одышка при подъёме по лестнице, трудно регулировать дыхание во время разговора", kz: "Баспалдақпен көтерілгенде ентігу, сөйлеу кезінде тыныс алуды реттеу қиын", zh: "上楼时气喘，说话时难以调匀呼吸", ja: "階段昇降時の息切れ、話しながら呼吸を整えにくい" } },
      { name: { ko: "기침·가래·흉통", en: "Cough, sputum, and chest pain", ru: "Кашель, мокрота и боль в груди", kz: "Жөтел, қақырық және кеуде ауыруы", zh: "咳嗽、咳痰、胸痛", ja: "咳・痰・胸痛" }, desc: { ko: "기관지 자극 및 절개부위 염증", en: "Bronchial irritation and inflammation at the incision site", ru: "Раздражение бронхов и воспаление в области разреза", kz: "Бронхтың тітіркенуі және тілік орнындағы қабыну", zh: "支气管刺激及切口部位炎症", ja: "気管支の刺激および切開部の炎症" } },
      { name: { ko: "체력 저하", en: "Reduced stamina", ru: "Снижение выносливости", kz: "Күш-қуаттың төмендеуі", zh: "体力下降", ja: "体力の低下" }, desc: { ko: "활동량 제한, 만성 피로", en: "Limited activity and chronic fatigue", ru: "Ограничение активности, хроническая усталость", kz: "Белсенділіктің шектелуі, созылмалы шаршау", zh: "活动量受限、慢性疲劳", ja: "活動量の制限、慢性的な疲労" } },
      { name: { ko: "미세잔존암", en: "Minimal residual disease", ru: "Минимальная остаточная болезнь", kz: "Минималды қалдық обыр", zh: "微小残留癌", ja: "微小残存がん" }, desc: { ko: "수술 후 잔존 암세포 — 면역 활성화", en: "Residual cancer cells after surgery — immune activation", ru: "Остаточные раковые клетки после операции — активация иммунитета", kz: "Операциядан кейінгі қалдық обыр жасушалары — иммунитетті белсендіру", zh: "术后残留癌细胞——激活免疫", ja: "術後の残存がん細胞 — 免疫の活性化" } },
      { name: { ko: "영양·기력 저하", en: "Nutritional and energy decline", ru: "Снижение питания и сил", kz: "Тамақтану және күш-қуаттың төмендеуі", zh: "营养与体力下降", ja: "栄養・体力の低下" }, desc: { ko: "수술 후 조직손상 회복 필요", en: "Recovery from post-surgical tissue damage is needed", ru: "Требуется восстановление после послеоперационного повреждения тканей", kz: "Операциядан кейінгі тін зақымынан қалпына келу қажет", zh: "需要术后组织损伤的恢复", ja: "術後の組織損傷からの回復が必要です" } },
      { name: { ko: "정서적 문제", en: "Emotional issues", ru: "Эмоциональные проблемы", kz: "Эмоционалдық проблемалар", zh: "情绪问题", ja: "情緒的な問題" }, desc: { ko: "암 치료 스트레스", en: "Cancer treatment stress", ru: "Стресс, связанный с лечением рака", kz: "Обырды емдеу стресі", zh: "癌症治疗压力", ja: "がん治療によるストレス" } },
    ],
    focusPrograms: {
      ko: ["호흡 재활 프로그램", "적외선온열 (기관지)", "고농도 비타민 C", "면역 회복 식이"],
      en: ["Pulmonary rehabilitation program", "Infrared hyperthermia (bronchial)", "High-dose vitamin C", "Immune-recovery diet"],
      ru: ["Программа дыхательной реабилитации", "Инфракрасная гипертермия (бронхи)", "Высокие дозы витамина C", "Диета для восстановления иммунитета"],
      kz: ["Тыныс алу реабилитациясы бағдарламасы", "Инфрақызыл гипертермия (бронх)", "Жоғары дозалы C дәрумені", "Иммунитетті қалпына келтіру диетасы"],
      zh: ["呼吸康复项目", "红外热疗（支气管）", "高浓度维生素C", "免疫恢复膳食"],
      ja: ["呼吸リハビリプログラム", "赤外線温熱（気管支）", "高濃度ビタミンC", "免疫回復食"],
    },
  },

  thyroid: {
    slug: "thyroid",
    immuneSourceUrl: "/pages/cancer/thyroid-1.php",
    title: {
      ko: "갑상선암",
      en: "Thyroid Cancer",
      ru: "Рак щитовидной железы",
      kz: "Қалқанша без обыры",
      zh: "甲状腺癌",
      ja: "甲状腺がん",
    },
    intro: {
      ko: "갑상선암은 예후가 매우 좋지만 절제 후 평생 호르몬 관리가 필요합니다. 면력한방병원은 음성 장애, 저칼슘혈증, 호르몬 결핍, 경부 흉터, 삼킴 곤란까지 복합 관리합니다.",
      en: "Thyroid cancer has excellent prognosis but requires lifelong hormone management post-resection. Immune Hospital manages voice disorder, hypocalcemia, hormone deficiency, neck scarring, and dysphagia.",
      ru: "Рак щитовидной железы имеет очень благоприятный прогноз, но после резекции требует пожизненного контроля гормонов. Иммунная клиника комплексно ведёт нарушения голоса, гипокальциемию, дефицит гормонов, рубцы на шее и нарушение глотания.",
      kz: "Қалқанша без обырының болжамы өте жақсы, бірақ кесіп алғаннан кейін өмір бойы гормондарды бақылау қажет. Иммундық клиника дауыс бұзылысын, гипокальциемияны, гормон тапшылығын, мойындағы тыртықты және жұтынудың қиындауын кешенді басқарады.",
      zh: "甲状腺癌预后非常好，但切除后需要终身的激素管理。免疫医院对声音障碍、低钙血症、激素缺乏、颈部瘢痕乃至吞咽困难进行综合管理。",
      ja: "甲状腺がんは予後が非常に良好ですが、切除後は生涯にわたるホルモン管理が必要です。免疫病院は音声障害、低カルシウム血症、ホルモン欠乏、頸部の傷跡、嚥下困難まで総合的に管理します。",
    },
    complications: [
      { name: { ko: "음성 장애", en: "Voice disorder", ru: "Нарушение голоса", kz: "Дауыс бұзылысы", zh: "声音障碍", ja: "音声障害" }, desc: { ko: "후두신경 손상 또는 일시적 마비로 쉰 목소리", en: "Hoarseness due to laryngeal nerve damage or temporary paralysis", ru: "Охриплость из-за повреждения гортанного нерва или временного паралича", kz: "Көмей жүйкесінің зақымдануынан немесе уақытша салдан болатын қарлыққан дауыс", zh: "因喉神经损伤或暂时性麻痹导致声音嘶哑", ja: "喉頭神経の損傷または一時的な麻痺による声のかすれ" } },
      { name: { ko: "저칼슘혈증", en: "Hypocalcemia", ru: "Гипокальциемия", kz: "Гипокальциемия", zh: "低钙血症", ja: "低カルシウム血症" }, desc: { ko: "부갑상선 기능 저하 → 손발 저림, 근육 경련", en: "Parathyroid hypofunction → numbness in hands and feet, muscle cramps", ru: "Снижение функции паращитовидных желёз → онемение рук и ног, мышечные судороги", kz: "Қалқанша маңы безі қызметінің төмендеуі → қол-аяқтың ұюы, бұлшықет тырысуы", zh: "甲状旁腺功能减退→手脚麻木、肌肉痉挛", ja: "副甲状腺機能の低下 → 手足のしびれ、筋肉のけいれん" } },
      { name: { ko: "갑상선호르몬 결핍", en: "Thyroid hormone deficiency", ru: "Дефицит гормонов щитовидной железы", kz: "Қалқанша без гормонының тапшылығы", zh: "甲状腺激素缺乏", ja: "甲状腺ホルモン欠乏" }, desc: { ko: "T4 분비 불가 → 피로, 체중 증가", en: "Inability to secrete T4 → fatigue, weight gain", ru: "Невозможность секреции T4 → усталость, набор веса", kz: "T4 бөліне алмауы → шаршау, салмақ қосу", zh: "无法分泌T4→疲劳、体重增加", ja: "T4が分泌できない → 疲労、体重増加" } },
      { name: { ko: "경부 흉터", en: "Neck scar", ru: "Рубец на шее", kz: "Мойындағы тыртық", zh: "颈部瘢痕", ja: "頸部の傷跡" }, desc: { ko: "목 정중앙 절개 흔적 — 미용 스트레스", en: "Incision mark in the middle of the neck — cosmetic stress", ru: "След разреза посередине шеи — косметический стресс", kz: "Мойынның ортасындағы тілік ізі — косметикалық кейіп", zh: "颈部正中切口痕迹——美容方面的压力", ja: "首の正中の切開跡 — 美容上のストレス" } },
      { name: { ko: "삼킴 곤란", en: "Dysphagia", ru: "Затруднённое глотание", kz: "Жұтынудың қиындауы", zh: "吞咽困难", ja: "嚥下困難" }, desc: { ko: "연조직 유착 또는 일시적 근육 약화", en: "Soft-tissue adhesion or temporary muscle weakness", ru: "Спайки мягких тканей или временная мышечная слабость", kz: "Жұмсақ тіннің бітісуі немесе уақытша бұлшықет әлсіздігі", zh: "软组织粘连或暂时性肌肉无力", ja: "軟部組織の癒着または一時的な筋力低下" } },
    ],
    focusPrograms: {
      ko: ["저요오드 치료식", "흉터 케어", "호르몬 보완 식이", "음성 재활"],
      en: ["Low-iodine therapeutic diet", "Scar care", "Hormone-support diet", "Voice rehabilitation"],
      ru: ["Низкойодная лечебная диета", "Уход за рубцами", "Диета для поддержки гормонов", "Восстановление голоса"],
      kz: ["Аз йодты емдік диета", "Тыртықты күту", "Гормонды қолдайтын диета", "Дауысты қалпына келтіру"],
      zh: ["低碘治疗膳食", "瘢痕护理", "激素支持膳食", "声音康复"],
      ja: ["低ヨード治療食", "傷跡ケア", "ホルモン補助食", "音声リハビリ"],
    },
  },

  etc: {
    slug: "etc",
    immuneSourceUrl: "/pages/cancer/etc-1.php",
    title: {
      ko: "혈액암 · 뇌종양 · 전립선 · 신장암 외",
      en: "Blood · Brain · Prostate · Kidney Cancers and Others",
      ru: "Онкогематология · опухоли мозга · простаты · почек и др.",
      kz: "Қан обыры · ми ісігі · қуық асты безі · бүйрек обыры және басқалары",
      zh: "血液癌 · 脑肿瘤 · 前列腺 · 肾癌等",
      ja: "血液がん · 脳腫瘍 · 前立腺 · 腎臓がんなど",
    },
    intro: {
      ko: "혈액암, 뇌종양, 전립선, 신장, 기타 희귀암에 대해서도 면력한방병원의 5축(ITCRN) 프레임워크가 적용됩니다. 특정 암종에 맞춘 맞춤 치료 계획을 세웁니다.",
      en: "Immune Hospital's 5-axis (ITCRN) framework applies to blood cancers, brain tumors, prostate, kidney, and other rare cancers with cancer-specific tailored treatment plans.",
      ru: "Пятиосевая система (ITCRN) Иммунной клиники применяется также при онкогематологии, опухолях мозга, простаты, почек и других редких видах рака — с индивидуальным планом лечения под конкретную форму рака.",
      kz: "Иммундық клиниканың бес осьтік (ITCRN) жүйесі қан обырына, ми ісіктеріне, қуық асты безіне, бүйрекке және басқа сирек обыр түрлеріне де қолданылады. Нақты обыр түріне бейімделген емдеу жоспары құрылады.",
      zh: "免疫医院的五轴（ITCRN）框架同样适用于血液癌、脑肿瘤、前列腺、肾脏及其他罕见癌症，并制定针对特定癌种的定制治疗方案。",
      ja: "免疫病院の5軸（ITCRN）フレームワークは、血液がん、脳腫瘍、前立腺、腎臓、その他の希少がんにも適用されます。特定のがん種に合わせた治療計画を立てます。",
    },
    complications: [
      { name: { ko: "발열", en: "Fever", ru: "Лихорадка", kz: "Қызба", zh: "发热", ja: "発熱" }, desc: { ko: "세균감염 시 패혈증 위험 — 신속 대응", en: "Risk of sepsis with bacterial infection — requires prompt response", ru: "Риск сепсиса при бактериальной инфекции — требует быстрой реакции", kz: "Бактериялық инфекция кезінде сепсис қаупі — жедел әрекет қажет", zh: "细菌感染时有败血症风险——需迅速处理", ja: "細菌感染時は敗血症のリスク — 迅速な対応が必要です" } },
      { name: { ko: "림프부종", en: "Lymphedema", ru: "Лимфедема", kz: "Лимфедема", zh: "淋巴水肿", ja: "リンパ浮腫" }, desc: { ko: "치료 지연 시 평생 통증·신경저림 가능", en: "Delayed treatment may cause lifelong pain and numbness", ru: "Задержка лечения может привести к пожизненной боли и онемению", kz: "Емдеуді кешіктіру өмір бойы ауырсыну мен ұюды тудыруы мүмкін", zh: "治疗延误可能导致终身疼痛和麻木", ja: "治療が遅れると生涯にわたる痛みやしびれを招くことがあります" } },
      { name: { ko: "배뇨·배변장애", en: "Urinary and bowel dysfunction", ru: "Нарушение мочеиспускания и дефекации", kz: "Зәр шығару және дәрет бұзылысы", zh: "排尿排便障碍", ja: "排尿・排便障害" }, desc: { ko: "신경 손상으로 발생", en: "Caused by nerve damage", ru: "Возникает из-за повреждения нервов", kz: "Жүйке зақымдануынан туындайды", zh: "因神经损伤引起", ja: "神経損傷により生じます" } },
      { name: { ko: "수술부위 합병증", en: "Surgical site complications", ru: "Осложнения в области операции", kz: "Операция орнындағы асқынулар", zh: "手术部位并发症", ja: "手術部位の合併症" }, desc: { ko: "감염·영양장애로 상처 치유 지연", en: "Delayed wound healing due to infection or nutritional disorder", ru: "Замедленное заживление раны из-за инфекции или нарушения питания", kz: "Инфекция немесе тамақтану бұзылысынан жараның баяу жазылуы", zh: "因感染或营养障碍导致伤口愈合延迟", ja: "感染や栄養障害による創傷治癒の遅延" } },
      { name: { ko: "유착", en: "Adhesions", ru: "Спайки", kz: "Бітісу", zh: "粘连", ja: "癒着" }, desc: { ko: "관절 움직임 제한, 경직", en: "Limited joint movement and stiffness", ru: "Ограничение движения суставов и тугоподвижность", kz: "Буын қозғалысының шектелуі және қатаю", zh: "关节活动受限、僵硬", ja: "関節可動域の制限、こわばり" } },
      { name: { ko: "미세잔존암", en: "Minimal residual disease", ru: "Минимальная остаточная болезнь", kz: "Минималды қалдық обыр", zh: "微小残留癌", ja: "微小残存がん" }, desc: { ko: "수술 후 잔존 암세포", en: "Residual cancer cells after surgery", ru: "Остаточные раковые клетки после операции", kz: "Операциядан кейінгі қалдық обыр жасушалары", zh: "术后残留癌细胞", ja: "術後の残存がん細胞" } },
      { name: { ko: "영양·기력 저하", en: "Nutritional and energy decline", ru: "Снижение питания и сил", kz: "Тамақтану және күш-қуаттың төмендеуі", zh: "营养与体力下降", ja: "栄養・体力の低下" }, desc: { ko: "조직손상 후 회복 재활", en: "Recovery and rehabilitation after tissue damage", ru: "Восстановление и реабилитация после повреждения тканей", kz: "Тін зақымынан кейінгі қалпына келу және реабилитация", zh: "组织损伤后的恢复与康复", ja: "組織損傷後の回復・リハビリ" } },
      { name: { ko: "정서적 문제", en: "Emotional issues", ru: "Эмоциональные проблемы", kz: "Эмоционалдық проблемалар", zh: "情绪问题", ja: "情緒的な問題" }, desc: { ko: "스트레스·불안감 대응", en: "Coping with stress and anxiety", ru: "Помощь при стрессе и тревоге", kz: "Стресс пен мазасыздыққа қарсы көмек", zh: "应对压力和焦虑", ja: "ストレス・不安への対応" } },
    ],
    focusPrograms: {
      ko: ["NK세포 치료", "고주파온열", "면역플러스", "맞춤 영양 프로토콜"],
      en: ["NK cell therapy", "RF hyperthermia", "Immune Plus", "Personalized nutrition protocol"],
      ru: ["NK-клеточная терапия", "Радиочастотная гипертермия", "Иммунитет Плюс", "Индивидуальный нутри-протокол"],
      kz: ["NK-жасушалық терапия", "Радиожиілікті гипертермия", "Immune Plus", "Жеке тамақтану протоколы"],
      zh: ["NK细胞治疗", "射频热疗", "Immune Plus", "定制营养方案"],
      ja: ["NK細胞療法", "高周波温熱", "Immune Plus", "個別栄養プロトコル"],
    },
  },
};

/**
 * 화면의 «장기 이름» → 상세 페이지 slug 단일 매핑.
 *
 * 왜 생겼나 (2026-08-31 감사): 홈·치료목록의 암종 카드는 stomach/breast/colon 처럼 «장기» 단위인데
 * 상세 페이지는 digest/female 처럼 «묶음» 단위라 서로 이름이 안 맞았다. 그래서 카드가 전부
 * /treatments 목록으로만 보냈고, **정작 만들어 둔 암종 상세 6쪽은 사이트 안에서 링크가 0개**였다
 * (사이트맵에만 존재 = 구글이 발견해도 우선순위 최하). 이 표가 그 다리다.
 *
 * ⚠️ 카드를 추가하면 여기 한 줄도 같이 추가해라. 값은 반드시 CANCER_DETAILS 의 키여야 한다
 *    (없는 키를 적으면 상세 페이지가 404 — scripts/check-cancer-i18n.mjs 와 같은 부류의 실수).
 */
export const ORGAN_TO_CANCER_SLUG = {
  stomach: "digest",   // 대장 · 위암
  colon: "digest",     // 대장 · 위암
  breast: "female",    // 유방 · 자궁 · 난소암
  liver: "liver",      // 간 · 담도 · 췌장암
  lung: "lung",        // 폐암
  thyroid: "thyroid",  // 갑상선암
};

/** 장기 이름으로 상세 경로를 만든다. 매핑이 없으면 목록으로(안전 폴백). */
export function cancerDetailPath(organ) {
  const slug = ORGAN_TO_CANCER_SLUG[organ];
  return slug ? `/treatments/${slug}` : "/treatments";
}

// 이미지 경로 레지스트리 — 전부 /public/immune/ 로컬 경로 (외부 핫링크 없음)
// 수집일: 2026-04-21(101개) + 2026-07-01(카드/합병증 36개, scripts/fetch-cancer-card-images.mjs)
// 저작권: 면력한방병원 (자사 병원, 저작권 OK)
const IMMUNE_LOCAL = "/immune/cancer";

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
    // 대장/위 전용
    anastomotic: `${IMMUNE_LOCAL}/cancer-disease9.jpg`,
    bowelFunction: `${IMMUNE_LOCAL}/cancer-disease10.jpg`,
    surgicalSite: `${IMMUNE_LOCAL}/cancer-disease11.jpg`,
    adhesion: `${IMMUNE_LOCAL}/cancer-disease12.jpg`,
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

  // 식이/장루/상처 관리 카드 — 로컬 경로 (/public/immune/cancer/card/)
  cards: {
    diet: (n) => `${IMMUNE_LOCAL}/card/cancer-card22-${n}.jpg`, // 1-7
    stoma: (n) => `${IMMUNE_LOCAL}/card/cancer-card23-${n}.jpg`, // 1-8
    wound: (n) => `${IMMUNE_LOCAL}/card/cancer-card24-${n}.jpg`, // 1-5
    thyroidDaily: (n) => `${IMMUNE_LOCAL}/card/cancer-card27-${n}.jpg`, // 1-6
    thyroidDiet: (n) => `${IMMUNE_LOCAL}/card/cancer-card28-${n}.jpg`, // 1-6
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
  // 성동점은 2026-08-18 실측으로 «운영 중» 확인(홈페이지·네이버 예약·대표번호). 「예정」은 낡은 값이었다.
  branches: ["강서 (마곡 본원)", "신촌", "광명", "성동"],
};

// 암종별 FAQ — 6개 언어. (데이터와 함께 둬서 check:cancer-i18n 으로 누락 차단)
export const CANCER_FAQ = {
  female: [
    { q: { ko: "치료 기간은 얼마나 되나요?", en: "How long does treatment take?", ru: "Сколько времени занимает лечение?", kz: "Емдеу қанша уақытқа созылады?", zh: "治疗周期需要多长时间？", ja: "治療期間はどのくらいですか？" }, a: { ko: "수술 후 회복에 2~4주, 항암 치료 병행 시 3~6개월 프로그램을 제안합니다. 개인별 상태에 따라 맞춤 계획을 세웁니다.", en: "Post-surgical recovery takes 2–4 weeks; when combined with chemotherapy we propose a 3–6 month program. We build a tailored plan based on each patient's condition.", ru: "Восстановление после операции занимает 2–4 недели; при химиотерапии предлагаем программу 3–6 месяцев. Составляем индивидуальный план по состоянию пациента.", kz: "Операциядан кейінгі қалпына келу 2–4 апта, химиотерапиямен қатар жүргенде 3–6 айлық бағдарлама ұсынамыз. Әр пациенттің жағдайына қарай жеке жоспар жасаймыз.", zh: "术后恢复需2~4周，联合化疗时建议3~6个月的方案。我们会根据每位患者的状况制定个性化计划。", ja: "術後の回復に2〜4週間、抗がん剤治療を併行する場合は3〜6か月のプログラムを提案します。患者ごとの状態に合わせた計画を立てます。" } },
    { q: { ko: "림프부종 치료는 보험이 되나요?", en: "Is lymphedema treatment covered by insurance?", ru: "Покрывается ли лечение лимфедемы страховкой?", kz: "Лимфедеманы емдеу сақтандырумен өтеле ме?", zh: "淋巴水肿治疗有保险吗？", ja: "リンパ浮腫の治療は保険が利きますか？" }, a: { ko: "림프도수 마사지는 비급여 치료입니다. 30분 90,000원~60분 230,000원 수준입니다. 원격 상담 시 상세 비용 안내드립니다.", en: "Lymphatic drainage massage is a non-covered treatment, ranging from 90,000 KRW for 30 minutes to 230,000 KRW for 60 minutes. Detailed costs are provided during the remote consultation.", ru: "Лимфодренажный массаж — платная процедура, от 90,000 KRW за 30 минут до 230,000 KRW за 60 минут. Подробнее — на онлайн-консультации.", kz: "Лимфодренаж массажы — ақылы ем, 30 минут 90,000 KRW-дан 60 минут 230,000 KRW-ға дейін. Толық құны қашықтан кеңес кезінде ұсынылады.", zh: "淋巴引流按摩为自费治疗，30分钟90,000韩元至60分钟230,000韩元不等。远程咨询时将详细告知费用。", ja: "リンパドレナージュは自費診療です。30分90,000KRW〜60分230,000KRW程度です。オンライン相談時に詳しい費用をご案内します。" } },
    { q: { ko: "통역 서비스가 제공되나요?", en: "Are interpreter services available?", ru: "Есть ли услуги переводчика?", kz: "Аударма қызметі бар ма?", zh: "提供翻译服务吗？", ja: "通訳サービスはありますか？" }, a: { ko: "healwith 코디네이터가 러시아어·카자흐어 통역을 지원합니다. 진료 동행도 가능합니다.", en: "healwith coordinators provide Russian and Kazakh interpretation, including accompaniment to appointments.", ru: "Координатор healwith обеспечивает перевод на русский и казахский языки, включая сопровождение на приём.", kz: "healwith координаторы орыс және қазақ тілдеріне аударма жасайды, қабылдауға еріп баруды қоса.", zh: "healwith协调员提供俄语、哈萨克语翻译，并可陪同就诊。", ja: "healwithコーディネーターがロシア語・カザフ語の通訳を行います。診療への同行も可能です。" } },
    { q: { ko: "한국 방문 비자는 어떻게 받나요?", en: "How do I get a visa to visit Korea?", ru: "Как получить медицинскую визу в Корею?", kz: "Кореяға бару үшін визаны қалай аламын?", zh: "如何办理赴韩签证？", ja: "韓国訪問ビザはどう取得しますか？" }, a: { ko: "병원 초청장을 바탕으로 의료 비자(C-3-3) 신청이 가능합니다. 필요 서류 준비를 도와드립니다.", en: "You can apply for a medical visa (C-3-3) based on the hospital's invitation letter. We help you prepare the required documents.", ru: "На основании приглашения из больницы можно подать на медицинскую визу (C-3-3). Поможем подготовить документы.", kz: "Аурухананың шақыру хаты негізінде медициналық визаға (C-3-3) өтініш беруге болады. Қажетті құжаттарды дайындауға көмектесеміз.", zh: "可凭医院邀请函申请医疗签证（C-3-3）。我们协助准备所需材料。", ja: "病院の招聘状をもとに医療ビザ（C-3-3）を申請できます。必要書類の準備をお手伝いします。" } },
    { q: { ko: "수술 후 귀국은 언제 가능한가요?", en: "When can I return home after surgery?", ru: "Когда можно вернуться домой после операции?", kz: "Операциядан кейін қашан үйге орала аламын?", zh: "术后何时可以回国？", ja: "手術後はいつ帰国できますか？" }, a: { ko: "외과 수술 후 최소 2주 이상 체류를 권장합니다. 항공 탑승 전 담당 의료진의 확인이 필요합니다.", en: "We recommend staying at least 2 weeks after surgery. Approval from your medical team is required before flying.", ru: "После операции рекомендуем остаться минимум 2 недели. Перед перелётом необходимо получить разрешение врача.", kz: "Операциядан кейін кемінде 2 апта болуды ұсынамыз. Ұшаққа отырар алдында дәрігердің рұқсаты қажет.", zh: "建议术后至少停留2周以上。乘机前需经主治医疗团队确认。", ja: "外科手術後は最低2週間以上の滞在を推奨します。搭乗前に担当医療チームの確認が必要です。" } },
  ],
  digest: [
    { q: { ko: "대장·위암 수술 후 식이는 어떻게 관리하나요?", en: "How is diet managed after colorectal or gastric cancer surgery?", ru: "Как управлять питанием после операции?", kz: "Тоқ ішек немесе асқазан обыры операциясынан кейін тамақтану қалай реттеледі?", zh: "结直肠或胃癌术后如何管理饮食？", ja: "大腸・胃がんの手術後、食事はどう管理しますか？" }, a: { ko: "저잔사 치료식과 위절제 치료식(덤핑증후군 관리)을 수술 직후부터 제공합니다. 전담 영양사가 매일 개인별 식단을 모니터링합니다.", en: "We provide low-residue therapeutic diets and post-gastrectomy diets (for dumping syndrome) from immediately after surgery. A dedicated dietitian monitors each patient's menu daily.", ru: "Предоставляем низкошлаковую диету и диету после гастрэктомии (контроль демпинг-синдрома) с первого дня. Диетолог ежедневно контролирует индивидуальное питание.", kz: "Аз қалдықты емдік диета мен гастрэктомиядан кейінгі диетаны (демпинг-синдромды басқару) операциядан кейін бірден ұсынамыз. Арнайы диетолог әр пациенттің мәзірін күн сайын бақылайды.", zh: "我们从术后即刻起提供低渣治疗膳食和胃切除后膳食（管理倾倒综合征）。专职营养师每天监测每位患者的饮食。", ja: "低残渣治療食と胃切除後治療食（ダンピング症候群管理）を術後すぐから提供します。専属の栄養士が毎日、患者ごとの食事をモニタリングします。" } },
    { q: { ko: "장루 관리는 어떻게 배우나요?", en: "How do I learn stoma care?", ru: "Как обучают уходу за стомой?", kz: "Стоманы күтуді қалай үйренемін?", zh: "如何学习造口护理？", ja: "ストーマケアはどのように学びますか？" }, a: { ko: "전담 간호사가 8가지 장루 관리 프로토콜을 교육합니다. 귀국 후에도 원격으로 지속 지원합니다.", en: "A dedicated nurse teaches 8 stoma care protocols. Support continues remotely even after you return home.", ru: "Специализированная медсестра обучит 8 протоколам ухода за стомой. После отъезда поддержка продолжается онлайн.", kz: "Арнайы медбике 8 стоманы күту протоколын үйретеді. Үйге оралғаннан кейін де қолдау қашықтан жалғасады.", zh: "专职护士会教授8项造口护理方案。回国后仍通过远程持续支持。", ja: "専属の看護師が8つのストーマケアプロトコルを指導します。帰国後もオンラインで継続的にサポートします。" } },
    { q: { ko: "치료 비용은 얼마인가요?", en: "How much does treatment cost?", ru: "Сколько стоит лечение?", kz: "Емделу қанша тұрады?", zh: "治疗费用是多少？", ja: "治療費はいくらですか？" }, a: { ko: "치료 구성에 따라 다르며, 원격 상담 후 개인별 견적을 제공합니다. 고주파온열 1회 250,000원 등 주요 비용을 안내드립니다.", en: "It varies by treatment composition; we provide an individual estimate after a remote consultation. We outline key costs, such as 250,000 KRW per RF hyperthermia session.", ru: "Стоимость зависит от состава лечения. Индивидуальную смету предоставим после онлайн-консультации. Напр., радиочастотная гипертермия — 250,000 KRW за сеанс.", kz: "Емдеу құрамына байланысты әртүрлі, қашықтан кеңестен кейін жеке есеп ұсынамыз. Мысалы, радиожиілікті гипертермия — бір сеанс 250,000 KRW.", zh: "费用因治疗方案而异，远程咨询后提供个性化报价。例如射频热疗每次250,000韩元等主要费用会一并告知。", ja: "治療内容により異なり、オンライン相談後に個別見積りを提供します。高周波温熱1回250,000KRWなど主な費用をご案内します。" } },
    { q: { ko: "통역 및 코디네이터 서비스가 있나요?", en: "Are interpreter and coordinator services available?", ru: "Есть ли переводчик и координатор?", kz: "Аударма және координатор қызметтері бар ма?", zh: "有翻译和协调员服务吗？", ja: "通訳・コーディネーターのサービスはありますか？" }, a: { ko: "healwith 전담 코디네이터가 러시아어·카자흐어로 지원하며 병원 동행, 문서 번역, 일정 조율 모두 포함됩니다.", en: "A dedicated healwith coordinator supports you in Russian and Kazakh, including hospital accompaniment, document translation, and scheduling.", ru: "Координатор healwith сопровождает на всех визитах, переводит документы и организует расписание на русском и казахском языках.", kz: "healwith арнайы координаторы орыс және қазақ тілдерінде қолдау көрсетеді, ауруханаға еріп бару, құжаттарды аудару және кесте құру қамтылады.", zh: "healwith专职协调员以俄语、哈萨克语提供支持，包括陪同就诊、文件翻译和日程协调。", ja: "healwith専属コーディネーターがロシア語・カザフ語で対応し、病院同行・書類翻訳・日程調整をすべて含みます。" } },
  ],
  liver: [
    { q: { ko: "췌장암 수술 후 당뇨는 어떻게 관리하나요?", en: "How is diabetes managed after pancreatic cancer surgery?", ru: "Как управлять диабетом после операции на поджелудочной?", kz: "Ұйқы безі обыры операциясынан кейін қант диабеті қалай басқарылады?", zh: "胰腺癌术后糖尿病如何管理？", ja: "膵臓がん手術後の糖尿病はどう管理しますか？" }, a: { ko: "췌장 기능 저하로 인한 수술 후 당뇨는 영양 맞춤식과 혈당 모니터링으로 관리합니다. 담당 내과의와 한방 의사가 협진합니다.", en: "Post-surgical diabetes from reduced pancreatic function is managed with a tailored diet and blood-sugar monitoring. The internist and Korean medicine doctor collaborate on care.", ru: "Послеоперационный диабет из-за снижения функции поджелудочной управляется индивидуальной диетой и мониторингом глюкозы. Терапевт и врач корейской медицины работают совместно.", kz: "Ұйқы безі қызметінің төмендеуінен болатын операциядан кейінгі қант диабеті жеке диета мен қандағы қантты бақылаумен басқарылады. Терапевт пен корей медицинасының дәрігері бірлесіп жұмыс істейді.", zh: "因胰腺功能下降导致的术后糖尿病，通过营养定制膳食和血糖监测进行管理。内科医生与韩医协同诊疗。", ja: "膵機能低下による術後糖尿病は、栄養管理食と血糖モニタリングで管理します。内科医と韓方医が連携して診療します。" } },
    { q: { ko: "간 수술 후 황달이 생기면 어떻게 하나요?", en: "What should I do if jaundice appears after liver surgery?", ru: "Что делать при желтухе после операции на печени?", kz: "Бауыр операциясынан кейін сарғаю пайда болса не істеу керек?", zh: "肝脏术后出现黄疸怎么办？", ja: "肝臓手術後に黄疸が出たらどうしますか？" }, a: { ko: "황달·가려움·발열 증상은 담도 폐쇄 신호일 수 있습니다. 즉시 의료진에게 알려주세요. 입원 기간 동안 매일 모니터링합니다.", en: "Jaundice, itching, or fever may signal bile duct obstruction. Notify the medical team immediately. We monitor daily during hospitalization.", ru: "Желтуха, зуд или жар могут указывать на закупорку желчных протоков. Немедленно сообщите врачу. Ежедневный мониторинг обеспечен во время госпитализации.", kz: "Сарғаю, қышу немесе қызба өт жолының бітелуінің белгісі болуы мүмкін. Дереу медициналық топқа хабарлаңыз. Емделу кезінде күн сайын бақылаймыз.", zh: "黄疸、瘙痒、发热可能是胆道阻塞的信号。请立即告知医疗团队。住院期间每天进行监测。", ja: "黄疸・かゆみ・発熱は胆道閉塞のサインの可能性があります。すぐに医療チームへお知らせください。入院期間中は毎日モニタリングします。" } },
    { q: { ko: "러시아에서 진단서를 번역해도 되나요?", en: "Can I have medical records from Russia translated?", ru: "Можно ли перевести документы из России?", kz: "Ресейдегі медициналық құжаттарды аударуға бола ма?", zh: "可以翻译来自俄罗斯的诊断书吗？", ja: "ロシアの診断書を翻訳してもらえますか？" }, a: { ko: "네, 러시아어 진단서·검사 결과를 healwith가 번역·검토하여 한국 의료진에게 전달합니다.", en: "Yes, healwith translates and reviews Russian medical records and test results, then forwards them to the Korean medical team.", ru: "Да, healwith переводит и проверяет российские медицинские документы и результаты анализов, передавая их корейским врачам.", kz: "Иә, healwith орыс тіліндегі медициналық құжаттар мен талдау нәтижелерін аударып, тексеріп, корей дәрігерлеріне жеткізеді.", zh: "可以，healwith会翻译并审阅俄语诊断书和检查结果，并转交给韩国医疗团队。", ja: "はい、healwithがロシア語の診断書・検査結果を翻訳・確認し、韓国の医療チームに伝達します。" } },
    { q: { ko: "치료 후 귀국 시 추적 관찰은 어떻게 하나요?", en: "How is follow-up handled after I return home?", ru: "Как проходит наблюдение после возвращения домой?", kz: "Емделгеннен кейін үйге оралғанда бақылау қалай жүргізіледі?", zh: "治疗后回国如何进行随访？", ja: "治療後の帰国時、経過観察はどうしますか？" }, a: { ko: "원격 진료를 통해 귀국 후에도 한국 의사와 3개월, 6개월 주기로 추적 상담이 가능합니다.", en: "Through telemedicine, follow-up consultations with the Korean doctor are available at 3- and 6-month intervals even after returning home.", ru: "После возвращения доступны онлайн-консультации с корейским врачом каждые 3 и 6 месяцев.", kz: "Қашықтан емдеу арқылы үйге оралғаннан кейін де корей дәрігерімен 3 және 6 ай сайын бақылау кеңесін алуға болады.", zh: "通过远程诊疗，回国后仍可与韩国医生按3个月、6个月周期进行随访咨询。", ja: "オンライン診療により、帰国後も韓国の医師と3か月・6か月ごとに経過観察の相談が可能です。" } },
  ],
  lung: [
    { q: { ko: "폐 절제 후 호흡 재활은 얼마나 걸리나요?", en: "How long does respiratory rehabilitation take after lung resection?", ru: "Сколько времени занимает дыхательная реабилитация?", kz: "Өкпені кесіп алғаннан кейін тыныс алу реабилитациясы қанша уақытқа созылады?", zh: "肺切除后呼吸康复需要多长时间？", ja: "肺切除後の呼吸リハビリはどのくらいかかりますか？" }, a: { ko: "폐엽 절제 기준 4~8주 프로그램을 권장합니다. 적외선온열과 호흡 재활 운동을 병행합니다.", en: "For lobectomy, we recommend a 4–8 week program, combining infrared hyperthermia with respiratory rehabilitation exercises.", ru: "После лобэктомии рекомендуется программа 4–8 недель с инфракрасной термотерапией и дыхательными упражнениями.", kz: "Лобэктомия үшін 4–8 апталық бағдарлама ұсынамыз. Инфрақызыл гипертермия мен тыныс алу жаттығуларын қатар жүргіземіз.", zh: "以肺叶切除为标准，建议4~8周的方案。同时进行红外热疗与呼吸康复训练。", ja: "肺葉切除を基準に4〜8週間のプログラムを推奨します。赤外線温熱と呼吸リハビリ運動を併行します。" } },
    { q: { ko: "항암치료 중 병행 치료가 가능한가요?", en: "Can complementary treatment be done during chemotherapy?", ru: "Можно ли совмещать лечение с химиотерапией?", kz: "Химиотерапия кезінде қосымша ем жүргізуге бола ма?", zh: "化疗期间可以同时进行辅助治疗吗？", ja: "抗がん剤治療中に併用治療は可能ですか？" }, a: { ko: "네, 항암 중 싸이모신α1, 미슬토, 고농도비타민C 등으로 효과 강화 및 부작용 완화를 병행합니다.", en: "Yes, during chemotherapy we combine Thymosin α1, mistletoe, and high-dose vitamin C to enhance efficacy and ease side effects.", ru: "Да, во время химиотерапии можно сочетать с Тимозином α1, омелой и высокодозным витамином C для усиления эффекта и облегчения побочных эффектов.", kz: "Иә, химиотерапия кезінде Thymosin α1, мистлето және жоғары дозалы C дәруменімен әсерін күшейтіп, жанама әсерлерді жеңілдетеміз.", zh: "可以，化疗期间联合使用胸腺素α1、槲寄生、高浓度维生素C等，以增强疗效并缓解副作用。", ja: "はい、抗がん剤治療中にThymosin α1、ヤドリギ、高濃度ビタミンCなどを併用し、効果の増強と副作用の緩和を行います。" } },
    { q: { ko: "한국 방문 비자와 의료비 지원이 가능한가요?", en: "Is there support for the Korea visa and medical payments?", ru: "Есть ли помощь с визой и оплатой лечения?", kz: "Кореяға виза және емделу ақысына көмек бар ма?", zh: "可以协助办理赴韩签证和医疗费支付吗？", ja: "韓国訪問ビザや医療費の支援は可能ですか？" }, a: { ko: "의료 비자 발급 지원 및 국제 의료비 결제(카드/송금)를 안내드립니다. 카자흐스탄·러시아에서도 원활하게 진행됩니다.", en: "We assist with medical visa issuance and international payment of medical fees (card/transfer). It works smoothly from Kazakhstan and Russia as well.", ru: "Помогаем с оформлением медицинской визы и международной оплатой лечения (карта/перевод) для пациентов из Казахстана и России.", kz: "Медициналық виза ресімдеуге және халықаралық медициналық төлемге (карта/аударым) көмектесеміз. Қазақстан мен Ресейден де еркін жүргізіледі.", zh: "我们协助办理医疗签证及国际医疗费支付（刷卡/汇款）。在哈萨克斯坦、俄罗斯也可顺利办理。", ja: "医療ビザの取得支援および国際医療費の決済（カード／送金）をご案内します。カザフスタン・ロシアからもスムーズに進められます。" } },
  ],
  thyroid: [
    { q: { ko: "갑상선 절제 후 호르몬제는 평생 먹어야 하나요?", en: "Do I have to take hormone medication for life after thyroidectomy?", ru: "Нужно ли принимать гормоны всю жизнь?", kz: "Қалқанша безді алып тастағаннан кейін гормон дәрісін өмір бойы ішу керек пе?", zh: "甲状腺切除后需要终身服用激素药吗？", ja: "甲状腺切除後、ホルモン剤は一生飲む必要がありますか？" }, a: { ko: "전절제 시 레보티록신(T4)을 평생 복용합니다. 반절제는 잔여 기능에 따라 다릅니다. 귀국 후에도 복용 관리를 원격으로 안내합니다.", en: "After total thyroidectomy, levothyroxine (T4) is taken for life. For hemithyroidectomy, it depends on the remaining function. We guide medication management remotely even after you return home.", ru: "При полной тиреоидэктомии левотироксин (T4) принимают пожизненно. При частичном удалении зависит от оставшейся функции. Сопровождаем приём лекарств онлайн и после возвращения домой.", kz: "Толық тиреоидэктомияда левотироксин (T4) өмір бойы ішіледі. Жартылай алып тастағанда қалған қызметке байланысты. Үйге оралғаннан кейін де дәрі қабылдауды қашықтан бағыттаймыз.", zh: "全切时需终身服用左甲状腺素（T4）。半切则取决于残余功能。回国后我们仍远程指导用药管理。", ja: "全摘の場合はレボチロキシン（T4）を生涯服用します。半摘は残存機能によって異なります。帰国後も服薬管理をオンラインでご案内します。" } },
    { q: { ko: "저요오드 식이를 한국에서 지원받을 수 있나요?", en: "Can I get a low-iodine diet in Korea?", ru: "Можно ли получить низкойодную диету в Корее?", kz: "Кореяда аз йодты диета алуға бола ма?", zh: "可以在韩国获得低碘膳食支持吗？", ja: "低ヨード食を韓国で受けられますか？" }, a: { ko: "네, 면력한방병원 셰프팀이 방사성요오드 치료 전 저요오드 맞춤식을 제공합니다.", en: "Yes, the Immune Hospital chef team provides a tailored low-iodine diet before radioactive iodine therapy.", ru: "Да, команда шефов Immune Hospital готовит индивидуальное низкойодное меню перед радиойодтерапией.", kz: "Иә, Immune Hospital аспаздар тобы радиоактивті йод терапиясының алдында жеке аз йодты тамақ дайындайды.", zh: "可以，免疫医院的厨师团队会在放射性碘治疗前提供定制低碘膳食。", ja: "はい、免疫病院のシェフチームが放射性ヨード治療の前に低ヨードの個別食を提供します。" } },
    { q: { ko: "목 흉터는 어떻게 관리하나요?", en: "How is the neck scar managed?", ru: "Как ухаживать за шрамом на шее?", kz: "Мойындағы тыртық қалай күтіледі?", zh: "颈部瘢痕如何护理？", ja: "首の傷跡はどうケアしますか？" }, a: { ko: "전담 간호사가 흉터 케어 프로토콜을 교육하며, 압박 붕대·실리콘 패치 사용법을 안내합니다.", en: "A dedicated nurse teaches the scar care protocol and explains how to use compression bandages and silicone patches.", ru: "Медсестра обучит уходу за шрамом: компрессионные повязки и силиконовые пластыри.", kz: "Арнайы медбике тыртықты күту протоколын үйретеді және қысым таңғыштары мен силикон жапсырмаларын қолдануды түсіндіреді.", zh: "专职护士会教授瘢痕护理方案，并指导加压绷带、硅胶贴片的使用方法。", ja: "専属の看護師が傷跡ケアのプロトコルを指導し、圧迫包帯・シリコンパッチの使い方をご案内します。" } },
    { q: { ko: "음성 장애는 회복되나요?", en: "Will voice problems recover?", ru: "Восстановится ли голос?", kz: "Дауыс бұзылысы қалпына келе ме?", zh: "声音障碍能恢复吗？", ja: "音声障害は回復しますか？" }, a: { ko: "신경 일시적 손상의 경우 대부분 수주~수개월 내 회복됩니다. 음성 재활 프로그램을 함께 진행합니다.", en: "In cases of temporary nerve damage, most recover within weeks to months. We carry out a voice rehabilitation program alongside.", ru: "В большинстве случаев временные нарушения голоса восстанавливаются в течение нескольких недель–месяцев. Параллельно проводим программу восстановления голоса.", kz: "Жүйкенің уақытша зақымдануында көп жағдайда бірнеше апта–айда қалпына келеді. Дауысты қалпына келтіру бағдарламасын қатар жүргіземіз.", zh: "若为神经暂时性损伤，多数在数周至数月内恢复。我们会同时进行声音康复项目。", ja: "神経の一時的な損傷の場合、多くは数週間〜数か月で回復します。音声リハビリプログラムを併せて行います。" } },
  ],
  etc: [
    { q: { ko: "NK세포 치료는 어떤 암에 효과적인가요?", en: "Which cancers does NK cell therapy work for?", ru: "При каких видах рака эффективна НК-клеточная терапия?", kz: "NK-жасушалық терапия қандай обыр түрлеріне тиімді?", zh: "NK细胞治疗对哪些癌症有效？", ja: "NK細胞療法はどのがんに効果的ですか？" }, a: { ko: "혈액암, 뇌종양, 전립선암 등 다양한 암에 NK세포 활성화 치료가 적용됩니다. 개인별 면역 검사 후 프로토콜을 결정합니다.", en: "NK cell activation therapy applies to various cancers including blood cancers, brain tumors, and prostate cancer. The protocol is determined after an individual immune assessment.", ru: "НК-клеточная терапия применяется при гематологических, церебральных, простатических и других онкологических заболеваниях. Протокол определяется после индивидуального иммунологического обследования.", kz: "NK-жасушаларын белсендіру терапиясы қан обыры, ми ісіктері, қуық асты безі обыры сияқты түрлі обырларға қолданылады. Протокол жеке иммундық тексеруден кейін анықталады.", zh: "NK细胞活化治疗适用于血液癌、脑肿瘤、前列腺癌等多种癌症。在个体免疫检查后确定方案。", ja: "NK細胞活性化療法は血液がん、脳腫瘍、前立腺がんなど多様ながんに適用されます。個別の免疫検査の後にプロトコルを決定します。" } },
    { q: { ko: "희귀암도 치료 가능한가요?", en: "Can rare cancers be treated too?", ru: "Можно ли лечить редкие виды рака?", kz: "Сирек обыр түрлерін емдеуге бола ма?", zh: "罕见癌症也能治疗吗？", ja: "希少がんも治療できますか？" }, a: { ko: "ITCRN 5축 프레임워크는 모든 암종에 적용됩니다. 희귀암의 경우 한국 대형 병원과의 협진 네트워크를 통해 맞춤 계획을 제안합니다.", en: "The ITCRN 5-axis framework applies to all cancer types. For rare cancers, we propose a tailored plan through our collaborative network with major Korean hospitals.", ru: "Фреймворк ITCRN применим к любому виду рака. При редких случаях предлагаем индивидуальный план через сеть сотрудничества с крупными больницами Кореи.", kz: "ITCRN 5 осьтік жүйесі барлық обыр түрлеріне қолданылады. Сирек обырларда Кореяның ірі ауруханаларымен серіктестік желісі арқылы жеке жоспар ұсынамыз.", zh: "ITCRN五轴框架适用于所有癌种。对于罕见癌症，我们通过与韩国大型医院的协诊网络提供定制方案。", ja: "ITCRN5軸フレームワークはすべてのがん種に適用されます。希少がんの場合は、韓国の大型病院との連携ネットワークを通じて個別計画を提案します。" } },
    { q: { ko: "치료 기간과 비용은 어떻게 되나요?", en: "What are the treatment duration and cost?", ru: "Каковы сроки и стоимость лечения?", kz: "Емделу мерзімі мен құны қандай?", zh: "治疗周期和费用如何？", ja: "治療期間と費用はどのくらいですか？" }, a: { ko: "암 종류와 단계에 따라 다릅니다. 원격 상담 후 개인별 치료 계획과 비용 견적을 제공합니다.", en: "It varies by cancer type and stage. After a remote consultation, we provide an individual treatment plan and cost estimate.", ru: "Зависит от типа и стадии рака. После онлайн-консультации предоставим индивидуальный план лечения и смету.", kz: "Обыр түрі мен сатысына байланысты әртүрлі. Қашықтан кеңестен кейін жеке емдеу жоспары мен құн есебін ұсынамыз.", zh: "因癌种和分期而异。远程咨询后提供个性化治疗方案和费用预估。", ja: "がんの種類と病期によって異なります。オンライン相談後に個別の治療計画と費用見積りを提供します。" } },
  ],
};
