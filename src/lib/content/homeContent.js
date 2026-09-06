// 홈페이지 기본 콘텐츠(6개어). 코디 편집 오버라이드의 '폴백 기본값'.
// ⚠️ 원래 app/home/HomeClient.jsx 의 const L={} 를 추출한 것.
//    편집 백오피스(content_overrides)가 이 키들을 언어별로 덮어쓴다(없으면 이 값).

export const HOME_CONTENT = {
  hero: {
    badge: {
      ko: "KHIDI 정부과제 선정 플랫폼",
      en: "Government-backed by KHIDI",
      ru: "При поддержке правительства (KHIDI)",
      kz: "Үкімет қолдауымен (KHIDI)",
      zh: "韩国政府(KHIDI)支持平台",
      ja: "韓国政府(KHIDI)支援プラットフォーム",
    },
    title: {
      ko: "한국 최고의 암 전문의에게\n먼저 상담받으세요",
      en: "Get a Second Opinion from\nKorea's Top Oncologists",
      ru: "Второе мнение от\nлучших онкологов Кореи",
      kz: "Кореяның үздік онкологтарынан\nекінші пікір алу",
      zh: "获取韩国顶级\n肿瘤专家的第二意见",
      ja: "韓国トップのがん専門医に\nセカンドオピニオンを",
    },
    subtitle: {
      ko: "AI 실시간 통역 · 화상 사전상담 · 한방 통합 케어까지\n한국 방문 전, 집에서 모든 것을 준비하세요",
      en: "AI real-time interpretation · Video pre-consultation · Integrated Korean Medicine care\nPrepare everything from home before visiting Korea",
      ru: "ИИ-перевод в реальном времени · Видеоконсультация\n · Интегрированная корейская медицина\nПодготовьтесь к визиту в Корею, не выходя из дома",
      kz: "Нақты уақыттағы ЖИ аударма · Онлайн бейне кеңес \n· Кешенді корей медицинасы\nБарлық дайындықтарды үйден бастап, Кореяға сенімді барыңыз",
      zh: "AI实时翻译 · 视频预咨询 · 中西医结合护理\n访韩前，在家完成所有准备",
      ja: "AIリアルタイム通訳 · ビデオ事前相談 · 韓方統合ケア\n韓国訪問前にすべてを自宅で準備",
    },
    cta: {
      ko: "무료 사전상담 신청",
      en: "Request Free Consultation",
      ru: "Бесплатная консультация",
      kz: "Тегін кеңес сұрау",
      zh: "申请免费咨询",
      ja: "無料相談を申請",
    },
    ctaSub: {
      ko: "5분이면 충분합니다 · 비용 무료",
      en: "Takes only 5 minutes · Completely free",
      ru: "Всего 5 минут · Абсолютно бесплатно",
      kz: "Тек 5 минут · Мүлдем тегін",
      zh: "仅需5分钟 · 完全免费",
      ja: "たった5分 · 完全無料",
    },
  },
  stats: {
    title: { ko: "왜 한국에서 암 치료인가요?", en: "Why Cancer Treatment in Korea?", ru: "Почему именно Корея?", kz: "Неге емделу үшін Корея таңдалады?", zh: "为什么选择韩国治疗癌症？", ja: "なぜ韓国でがん治療？" },
    subtitle: { ko: "한국은 세계 최고 수준의 암 생존율과 최첨단 의료 기술을 보유하고 있습니다", en: "Korea leads the world in cancer survival rates and cutting-edge medical technology", ru: "Южная Корея признана мировым лидером в области онкологии благодаря высоким показателям выживаемости и применению передовых медицинских технологий.", kz: "Корея қатерлі ісік бойынша тірі қалу көрсеткіштері мен озық медициналық технологиялары жағынан әлемдік көшбасшы болып табылады", zh: "韩国在癌症生存率和尖端医疗技术方面处于世界领先地位", ja: "韓国はがん生存率と最先端医療技術で世界をリード" },
    items: [
      { value: "78.6%", label: { ko: "위암 5년 생존율\n(세계 1위)", en: "Stomach Cancer\n5-year Survival\n(World #1)", ru: "Рак желудка\n5-летняя выживаемость\n(№1 в мире)", kz: "Асқазан обыры\n5 жылдық тірі қалу көрсеткіші әлемде №1 деңгейде", zh: "胃癌5年生存率\n（世界第一）", ja: "胃がん5年生存率\n（世界1位）" } },
      { value: { ko: "201만+", en: "2.01M+", ru: "2,01 млн+", kz: "2,01 млн+", zh: "201万+", ja: "201万+" }, label: { ko: "2025 외국인 환자\n한국 방문", en: "Foreign Patients\nVisited Korea\nin 2025", ru: "Иностранные пациенты в Корее в 2025 году", kz: "2025 жылы Кореяға\nкелген шетелдік\nнауқастар", zh: "2025年访韩\n外国患者", ja: "2025年韓国訪問\n外国人患者" } },
      { value: "40~60%", label: { ko: "미국 대비\n치료비 절감", en: "Cost Savings\nvs. United States", ru: "Экономия\nvs. США", kz: "АҚШ-қа қарағанда\nүнемдеу", zh: "与美国相比\n节省费用", ja: "米国比\nコスト削減" } },
      { value: { ko: "세계 2위", en: "#2", ru: "№2", kz: "№2", zh: "世界第2", ja: "世界2位" }, label: { ko: "의료 시스템 품질\nCEOWORLD 지수 2025", en: "Healthcare System Quality\nCEOWORLD Index 2025", ru: "Качество системы\nздравоохранения\nИндекс CEOWORLD 2025", kz: "Денсаулық сақтау жүйесі\nсапасы\nCEOWORLD индексі 2025", zh: "医疗体系质量\nCEOWORLD指数 2025", ja: "医療システムの質\nCEOWORLD指数 2025" } },
    ],
  },
  /* ── 의사 섹션 ── */
  doctors: {
    title: { ko: "협력 의료진", en: "Our Medical Team", ru: "Наша медицинская команда", kz: "Біздің медициналық ұжым", zh: "合作医疗团队", ja: "協力医療チーム" },
    subtitle: { ko: "한국 주요 암 전문 병원에서 다년간 경력을 쌓은 전문의들이 함께합니다", en: "Experienced oncologists from Korea's leading cancer hospitals", ru: "Опытные онкологи ведущих клиник Кореи ", kz: "Кореяның жетекші онкологиялық клиникаларының тәжірибелі дәрігерлері", zh: "来自韩国顶级肿瘤医院的资深专家", ja: "韓国主要がん専門病院の経験豊富な専門医" },
    viewAll: { ko: "전체 의료진 보기", en: "View All Doctors", ru: "Все врачи", kz: "Барлық дәрігерлер", zh: "查看全部医生", ja: "全医師を見る" },
    // 사진 경로 등 비문구 메타는 HomeClient 의 DOCTORS_META (순서 일치 필수)
    items: [
      { name: { ko: "황이준 대표원장", en: "Dr. Hwang Yi-jun", ru: "Dr. Hwang Yi-jun", kz: "Dr. Hwang Yi-jun", zh: "Dr. Hwang Yi-jun", ja: "Dr. Hwang Yi-jun" }, title: { ko: "면력한방병원 강서점 대표원장", en: "Chief Director, Immune Hospital Gangseo", ru: "Главный директор, Immune Hospital Gangseo", kz: "Бас директор, Immune Hospital Gangseo", zh: "Immune Hospital Gangseo 代表院长", ja: "Immune Hospital Gangseo 代表院長" }, specialty: { ko: "한방 면역 종양학 · 통합 암 케어", en: "Korean Medicine Immuno-Oncology", ru: "Иммуноонкология корейской медицины", kz: "Корей медицинасы иммуноонкологиясы", zh: "韩方免疫肿瘤学", ja: "韓方免疫腫瘍学" } },
      { name: { ko: "유형진 대표원장", en: "Dr. Yu Hyung-jin", ru: "Dr. Yu Hyung-jin", kz: "Dr. Yu Hyung-jin", zh: "Dr. Yu Hyung-jin", ja: "Dr. Yu Hyung-jin" }, title: { ko: "면력한방병원 신촌점 대표원장", en: "Chief Director, Immune Hospital Sinchon", ru: "Главный директор, Immune Hospital Sinchon", kz: "Бас директор, Immune Hospital Sinchon", zh: "Immune Hospital Sinchon 代表院长", ja: "Immune Hospital Sinchon 代表院長" }, specialty: { ko: "한방 면역 치료 · 암 통합 케어", en: "Korean Medicine Immunotherapy · Cancer Care", ru: "Иммунотерапия · Онкологическая помощь", kz: "Иммунотерапия · Онкологиялық көмек", zh: "韩方免疫治疗 · 癌症综合护理", ja: "韓方免疫治療 · がん統合ケア" } },
      { name: { ko: "배길준 대표원장", en: "Dr. Bae Gil-jun", ru: "Dr. Bae Gil-jun", kz: "Dr. Bae Gil-jun", zh: "Dr. Bae Gil-jun", ja: "Dr. Bae Gil-jun" }, title: { ko: "면력한방병원 광명점 대표원장", en: "Chief Director, Immune Hospital Gwangmyeong", ru: "Главный директор, Immune Hospital Gwangmyeong", kz: "Бас директор, Immune Hospital Gwangmyeong", zh: "Immune Hospital Gwangmyeong 代表院长", ja: "Immune Hospital Gwangmyeong 代表院長" }, specialty: { ko: "통합면역 · 암환자 케어", en: "Integrative Immunology · Cancer Care", ru: "Интегративная иммунология · Помощь онкопациентам", kz: "Интегративті иммунология · Онкологиялық көмек", zh: "综合免疫 · 癌症患者护理", ja: "統合免疫 · がん患者ケア" } },
      { name: { ko: "강주안 대표원장", en: "Dr. Kang Ju-an", ru: "Dr. Kang Ju-an", kz: "Dr. Kang Ju-an", zh: "Dr. Kang Ju-an", ja: "Dr. Kang Ju-an" }, title: { ko: "면력한방병원 성동점 대표원장", en: "Chief Director, Immune Hospital Seongdong", ru: "Главный директор, Immune Hospital Seongdong", kz: "Бас директор, Immune Hospital Seongdong", zh: "Immune Hospital Seongdong 代表院长", ja: "Immune Hospital Seongdong 代表院長" }, specialty: { ko: "한방내과 · 면역통합의학", en: "Korean Internal Medicine · Integrative Immunology", ru: "Корейская внутренняя медицина · Интегративная иммунология", kz: "Корей ішкі медицинасы · Интегративті иммунология", zh: "韩方内科 · 综合免疫医学", ja: "韓方内科 · 免疫統合医学" } },
    ],
  },
  /* ── 서비스 ── */
  services: {
    title: { ko: "healwith가 해드리는 일", en: "What healwith Does For You", ru: "Что healwith делает для вас", kz: "healwith сіз үшін не істейді", zh: "healwith为您做什么", ja: "healwithがお手伝いすること" },
    subtitle: { ko: "한국 암 치료의 모든 과정을 원스톱으로 지원합니다", en: "One-stop support for every step of your cancer treatment journey in Korea", ru: "Комплексная поддержка на каждом этапе лечения рака в Корее", kz: "Кореядағы обыр емінің әр кезеңінде толық қолдау көрсетеміз", zh: "一站式支持您在韩国癌症治疗的每一步", ja: "韓国でのがん治療のすべてをワンストップでサポート" },
    items: [
      { icon: "Stethoscope", title: { ko: "전문의 원격 상담", en: "Remote Specialist Consultation", ru: "Удалённая консультация", kz: "Қашықтан кеңес", zh: "远程专家咨询", ja: "専門医リモート相談" }, desc: { ko: "한국 3대 암 병원 출신 전문의와 화상으로 먼저 상담.", en: "Video consultation with oncologists from Korea's top cancer hospitals.", ru: "Видеоконсультация с онкологами ведущих клиник Кореи", kz: "Кореяның жетекші ауруханаларының дәрігерлерімен бейне кеңес", zh: "与韩国顶级肿瘤医院的专家视频咨询。", ja: "韓国トップのがん病院の専門医とビデオ相談。" } },
      { icon: "Globe", title: { ko: "6개국어 AI 통역", en: "AI Interpretation in 6 Languages", ru: "ИИ-перевод на 6 языках", kz: "6 тілде ЖИ аудармасы", zh: "6种语言AI翻译", ja: "6言語AI通訳" }, desc: { ko: "한·영·러·중·일·카자흐어 실시간 자동 통역.", en: "Real-time interpretation in Korean, English, Russian, Chinese, Japanese, Kazakh.", ru: "Синхронный перевод: корейский, английский, русский, китайский, японский, казахский", kz: "Корей, ағылшын, орыс, қытай, жапон, қазақ тілдерінде аударма", zh: "韩·英·俄·中·日·哈实时翻译。", ja: "韓·英·露·中·日·カザフ語リアルタイム通訳。" } },
      { icon: "Leaf", title: { ko: "양·한방 통합 케어", en: "Integrated East-West Care", ru: "Интегрированная помощь", kz: "Шығыс-Батыс кешенді көмек", zh: "中西医结合护理", ja: "洋・韓方統合ケア" }, desc: { ko: "수술·항암은 암 병원, 면역 관리는 면력한방병원에서.", en: "Surgery & chemo at partner hospitals. Immune support at Immune Hospital.", ru: "Хирургическое лечение в партнёрских клиниках и иммунная поддержка в Immune Hospital ", kz: "Серіктес ауруханаларда хирургиялық ем\n«Immune Hospital»-да қалпына келтіру қолдауы", zh: "在合作医院手术化疗，在 Immune Hospital 免疫管理。", ja: "手術・抗がんはがん病院、免疫管理は Immune Hospital。" } },
      { icon: "Heart", title: { ko: "사후관리 프로그램", en: "Post-treatment Follow-up", ru: "Послеоперационное наблюдение", kz: "Емнен кейінгі бақылау", zh: "术后跟踪管理", ja: "術後フォローアップ" }, desc: { ko: "귀국 후에도 증상 추적, 교육 콘텐츠, 재진 예약까지.", en: "Symptom tracking, education content, and follow-up scheduling after returning home.", ru: "Контроль состояния пациента, отслеживание симптомов, профилактика осложнений", kz: "Үйге оралғаннан кейін де бақылау және қайта қабылдау", zh: "回国后症状追踪、教育内容和复诊预约。", ja: "帰国後も症状追跡、教育コンテンツ、再診予約。" } },
    ],
  },
  /* ── 프로세스 ── */
  process: {
    title: { ko: "이용 절차", en: "How It Works", ru: "Как это работает", kz: "Пайдалану тәртібі", zh: "使用流程", ja: "ご利用の流れ" },
    steps: [
      { num: "01", title: { ko: "인테이크 작성", en: "Submit Intake", ru: "Заполните анкету", kz: "Сауалнама толтыру", zh: "填写资料", ja: "問診票記入" }, desc: { ko: "암종, 병기, 치료 이력 입력 (5분)", en: "Cancer type, stage, history (5 min)", ru: "Тип рака, стадия, история (5 мин)", kz: "Обыр түрі, сатысы және ауру тарихы (5 мин)", zh: "癌症类型、分期、病史（5分钟）", ja: "がん種、病期、治療歴（5分）" } },
      { num: "02", title: { ko: "전문의 상담 배정", en: "Specialist Assignment", ru: "Назначение специалиста", kz: "Маман тағайындау", zh: "专家会诊安排", ja: "専門医の手配" }, desc: { ko: "코디네이터가 전문의 상담을 배정 (24시간 이내)", en: "Coordinator arranges a specialist consultation (within 24h)", ru: "Координатор организует консультацию специалиста (24ч)", kz: "Координатор маманмен кеңес ұйымдастырады (24 сағат)", zh: "协调员安排专家咨询（24小时内）", ja: "コーディネーターが専門医相談を手配（24時間以内）" } },
      { num: "03", title: { ko: "화상 사전상담", en: "Video Consultation", ru: "Видеоконсультация", kz: "Бейне кеңес", zh: "视频咨询", ja: "ビデオ相談" }, desc: { ko: "실시간 AI 통역과 함께 상담", en: "Video call with real-time AI interpretation", ru: "Видеозвонок с ИИ-переводом", kz: "Кореялық дәрігермен ЖИ аудармасы арқылы тікелей сөйлесу", zh: "配合AI翻译的视频通话", ja: "AI通訳付きビデオ相談" } },
      { num: "04", title: { ko: "치료 · 사후관리", en: "Treatment & Follow-up", ru: "Лечение и наблюдение", kz: "Ем және бақылау", zh: "治疗与随访", ja: "治療・フォローアップ" }, desc: { ko: "한국 방문 치료 + 귀국 후 관리", en: "Visit Korea for treatment + continued care", ru: "Лечение в Корее и последующее наблюдение", kz: "Кореяда емделу, елге оралған соң қашықтан бақылау", zh: "赴韩治疗 + 回国后管理", ja: "韓国治療 + 帰国後管理" } },
    ],
  },
  /* ── 암종 ── */
  cancers: {
    title: { ko: "주요 지원 암종", en: "Cancer Types We Support", ru: "Основные виды рака", kz: "Обыр түрлері", zh: "支持的癌症类型", ja: "対応がん種" },
    items: [
      { organ: "stomach", label: { ko: "위암", en: "Stomach", ru: "Рак желудка", kz: "Асқазан обыры", zh: "胃癌", ja: "胃がん" }, stat: { ko: "5년 생존율 78.6%", en: "78.6% 5yr survival", ru: "выживаемость 78,6%", kz: "78.6% тірі қалу көрсеткіші", zh: "5年生存率78.6%", ja: "5年生存率78.6%" } },
      { organ: "breast", label: { ko: "유방암", en: "Breast", ru: "Рак молочной железы", kz: "Сүт безі обыры", zh: "乳腺癌", ja: "乳がん" }, stat: { ko: "보존율 세계 최고", en: "Top conservation rate", ru: "высокая сохранность функций", kz: "Ең жоғары сақтау", zh: "保乳率世界最高", ja: "温存率世界最高" } },
      { organ: "liver", label: { ko: "간암", en: "Liver", ru: "Рак печени", kz: "Бауыр обыры", zh: "肝癌", ja: "肝がん" }, stat: { ko: "간이식 세계 1위", en: "World #1 transplant", ru: "лидер по трансплантации", kz: "Ағза трансплантациясы бойынша №1", zh: "肝移植世界第一", ja: "肝移植世界1位" } },
      { organ: "lung", label: { ko: "폐암", en: "Lung", ru: "Рак лёгких ", kz: "Өкпе обыры", zh: "肺癌", ja: "肺がん" }, stat: { ko: "VATS 수술 선도", en: "VATS surgery leader", ru: "лидер в ВАТС‑операциях", kz: "ВАТС көшбасшысы", zh: "VATS手术领先", ja: "VATS手術リーダー" } },
      { organ: "thyroid", label: { ko: "갑상선암", en: "Thyroid", ru: "Рак щитовидной железы", kz: "Қалқанша без обыры", zh: "甲状腺癌", ja: "甲状腺がん" }, stat: { ko: "생존율 100% 근접", en: "Near 100% survival", ru: "~100% выживаемость", kz: "~100% тірі қалу көрсеткіші", zh: "生存率接近100%", ja: "生存率ほぼ100%" } },
      { organ: "colon", label: { ko: "대장암", en: "Colorectal", ru: "Рак толстой кишки", kz: "Тоқ ішек обыры", zh: "大肠癌", ja: "大腸がん" }, stat: { ko: "복강경 세계 최다", en: "Most laparoscopic", ru: "наибольшее число лапароскопий", kz: "Ең көп лапароскопия", zh: "腹腔镜最多", ja: "腹腔鏡最多" } },
    ],
  },
  /* ── 파트너 병원 ── */
  partners: {
    title: { ko: "협력 의료기관", en: "Our Partner Hospitals", ru: "Наши партнёрские клиники", kz: "Біздің серіктес аурухналар", zh: "合作医疗机构", ja: "協力医療機関" },
    subtitle: { ko: "healwith와 함께하는 제휴 병원 및 협진 대학병원", en: "Partner hospitals and cooperating university hospitals working with healwith", ru: "Партнёрская сеть healwith", kz: "healwith-мен жұмыс істейтін серіктес аурухналар", zh: "与healwith合作的医院", ja: "healwithと連携する医療機関" },
    // slug·badge·이미지 등 비문구 메타는 HomeClient 의 PARTNERS_META (순서 일치 필수)
    items: [
      { name: { ko: "면력한방병원 강서점", en: "Immune Hospital Gangseo", ru: "Immune Hospital Кансо", kz: "Immune Hospital Кансо", zh: "Immune Hospital 江西院", ja: "Immune Hospital 江西院" }, desc: { ko: "강서 소재 한방 면역치료 병원", en: "Korean Medicine immunotherapy in Gangseo", ru: "Иммунотерапия корейской медицины в Кансо", kz: "Кансодағы корей медицинасы иммунотерапиясы", zh: "江西韩方免疫治疗医院", ja: "江西の韓方免疫治療病院" } },
      { name: { ko: "면력한방병원 신촌점", en: "Immune Hospital Sinchon", ru: "Immune Hospital Синчхон", kz: "Immune Hospital Синчон", zh: "Immune Hospital 新村院", ja: "Immune Hospital 新村院" }, desc: { ko: "서대문구 연세로 소재", en: "On Yonsei-ro, Seodaemun-gu", ru: "На Ёнсе-ро, Содэмун-гу", kz: "Ёнсе-ро, Содэмун-гу", zh: "位于延世路", ja: "延世路に位置" } },
      { name: { ko: "면력한방병원 광명점", en: "Immune Hospital Gwangmyeong", ru: "Immune Hospital Кванмён", kz: "Immune Hospital Кванмён", zh: "Immune Hospital 光明院", ja: "Immune Hospital 光明院" }, desc: { ko: "광명 철산동 소재", en: "In Cheolsan-dong, Gwangmyeong", ru: "Чхольсан-дон, Кванмён", kz: "Кванмён, Чхольсан-дон", zh: "位于光明市铁山洞", ja: "光明市鉄山洞に位置" } },
      { name: { ko: "면력한방병원 성동점", en: "Immune Hospital Seongdong", ru: "Immune Hospital Сондон", kz: "Immune Hospital Сондон", zh: "Immune Hospital 城东院", ja: "Immune Hospital 城東院" }, desc: { ko: "서울 성동구 신규 개원", en: "Newly opened in Seongdong-gu, Seoul", ru: "Недавно открыт в Сондон-гу, Сеул", kz: "Сеул Сондон-гуда жаңадан ашылды", zh: "首尔城东区新开院", ja: "ソウル城東区に新規開院" } },
      { name: { ko: "이대서울병원", en: "Ewha Seoul Hospital", ru: "Больница Ихва Сеул", kz: "Ихва Сеул ауруханасы", zh: "梨大首尔医院", ja: "梨大ソウル病院" }, desc: { ko: "서울 마곡 소재 최신 대학병원", en: "Modern university hospital in Magok, Seoul", ru: "Современная больница в Магоке", kz: "Магоктағы заманауи аурухана", zh: "首尔麻谷现代化大学医院", ja: "ソウル麻谷の最新大学病院" } },
      { name: { ko: "이대목동병원", en: "Ewha Mokdong Hospital", ru: "Больница Ихва Мокдон", kz: "Ихва Мокдон ауруханасы", zh: "梨大木洞医院", ja: "梨大木洞病院" }, desc: { ko: "이화여자대학교 의료원 목동", en: "Ewha Medical Center, Mokdong", ru: "Медицинский центр Ихва, Мокдон", kz: "Ихва медициналық орталығы, Мокдон", zh: "梨花医疗院木洞", ja: "梨花医療院木洞" } },
      { name: { ko: "고려대 구로병원", en: "Korea Univ. Guro Hospital", ru: "Больница Куро", kz: "Куро ауруханасы", zh: "高丽大九老医院", ja: "高麗大九老病院" }, desc: { ko: "고려대학교 의과대학 부속", en: "Korea University College of Medicine", ru: "При медфакультете Корёского университета", kz: "Корё университеті медицина факультеті", zh: "高丽大学医学院附属", ja: "高麗大学医学部附属" } },
      { name: { ko: "신촌세브란스병원", en: "Severance Hospital", ru: "Больница Северанс", kz: "Северанс ауруханасы", zh: "世福兰斯医院", ja: "セブランス病院" }, desc: { ko: "연세대학교 세브란스병원", en: "Yonsei University Severance Hospital", ru: "Больница Северанс университета Ёнсе", kz: "Ёнсе университетінің Северанс ауруханасы", zh: "延世大学世福兰斯医院", ja: "延世大学セブランス病院" } },
    ],
  },
  /* ── FAQ ── */
  faq: {
    title: { ko: "자주 묻는 질문", en: "Frequently Asked Questions", ru: "Часто задаваемые вопросы", kz: "Жиі қойылатын сұрақтар", zh: "常见问题", ja: "よくある質問" },
    tabs: {
      general: { ko: "일반", en: "General", ru: "Общие", kz: "Жалпы", zh: "一般", ja: "一般" },
      consultation: { ko: "상담", en: "Consultation", ru: "Консультация", kz: "Кеңес", zh: "咨询", ja: "相談" },
      cost: { ko: "비용·비자", en: "Cost & Visa", ru: "Стоимость и виза", kz: "Құн және виза", zh: "费用与签证", ja: "費用・ビザ" },
    },
    general: [
      { q: { ko: "healwith는 어떤 서비스인가요?", en: "What is healwith?", ru: "Что такое healwith?", kz: "healwith дегеніміз не?", zh: "healwith是什么？", ja: "healwithとは？" }, a: { ko: "healwith는 해외 암환자가 한국 전문의와 원격 화상 사전상담을 받고, 한국 방문 치료 및 사후관리까지 원스톱으로 지원받을 수 있는 ICT 플랫폼입니다.", en: "healwith is an ICT platform that enables international cancer patients to receive remote video pre-consultations with Korean specialists, with one-stop support from treatment to follow-up care.", ru: "healwith — это ИКТ-платформа для дистанционных видеоконсультаций с корейскими онкологами и комплексной поддержки от лечения до послеоперационного наблюдения.", kz: "healwith — Оңтүстік Кореяның дәрігерлерімен қашықтан бейнекеңес алуға арналған цифрлық платформа.", zh: "healwith是帮助海外癌症患者与韩国专家进行远程视频预咨询的ICT平台，提供从治疗到术后管理的一站式支持。", ja: "healwithは海外がん患者が韓国の専門医とリモートビデオ事前相談を受け、治療からフォローアップまでワンストップで支援するICTプラットフォームです。" } },
      { q: { ko: "비용이 발생하나요?", en: "Is there any cost?", ru: "Это платно?", kz: "Ақылы ма?", zh: "需要费用吗？", ja: "費用はかかりますか？" }, a: { ko: "사전상담 접수와 전문의 상담 배정은 무료입니다. 실제 화상 상담 및 치료 비용은 별도이며, 상담 전 안내해드립니다.", en: "Intake submission and specialist consultation arrangement are free. Video consultation and treatment costs are separate and will be communicated beforehand.", ru: "Подача заявки и организация консультации специалиста бесплатны. Стоимость консультации и лечения оговаривается заранее.", kz: "Өтінім қалдыру мен кеңес — тегін. Емдеу құнын алдын ала хабарлаймыз.", zh: "提交资料和专家咨询安排是免费的。视频咨询和治疗费用另计，会提前告知。", ja: "インテーク提出と専門医相談の手配は無料です。ビデオ相談・治療費用は別途、事前にご案内します。" } },
    ],
    consultation: [
      { q: { ko: "상담은 어떻게 진행되나요?", en: "How does the consultation work?", ru: "Как проходит консультация?", kz: "Кеңес қалай жүргізіледі?", zh: "咨询如何进行？", ja: "相談はどのように進みますか？" }, a: { ko: "인테이크 양식을 제출하면 24시간 이내에 전문의 상담을 배정해드립니다. 이후 화상 통화로 AI 실시간 통역과 함께 상담이 진행됩니다.", en: "After submitting your intake form, we arrange a specialist consultation within 24 hours. The consultation is conducted via video call with AI real-time interpretation.", ru: "После подачи анкеты консультация со специалистом организуется в течение 24 часов. Она проходит по видеосвязи с использованием ИИ‑перевода.", kz: "Сауалнаманы жібергеннен кейін 24 сағат ішінде маман кеңесін ұйымдастырамыз. Кеңес ЖИ аудармамен бейне байланыс арқылы жүргізіледі.", zh: "提交资料后24小时内为您安排专家咨询。咨询通过视频通话进行，配有AI实时翻译。", ja: "問診票提出後24時間以内に専門医相談を手配します。AI通訳付きビデオ通話で相談が行われます。" } },
      { q: { ko: "어떤 언어로 상담할 수 있나요?", en: "What languages are supported?", ru: "На каких языках?", kz: "Қандай тілдерде?", zh: "支持哪些语言？", ja: "対応言語は？" }, a: { ko: "한국어, 영어, 러시아어, 중국어, 일본어, 카자흐어 총 6개 언어를 AI 실시간 통역으로 지원합니다.", en: "We support 6 languages: Korean, English, Russian, Chinese, Japanese, and Kazakh with AI real-time interpretation.", ru: "Мы поддерживаем 6 языков: корейский, английский, русский, китайский, японский и казахский.", kz: "6 тілді қолдаймыз: корей, ағылшын, орыс, қытай, жапон және қазақ.", zh: "支持6种语言：韩语、英语、俄语、中文、日语、哈萨克语，配有AI实时翻译。", ja: "韓国語・英語・ロシア語・中国語・日本語・カザフ語の6言語をAI通訳で対応します。" } },
    ],
    cost: [
      { q: { ko: "한국 치료비는 얼마나 드나요?", en: "How much does treatment in Korea cost?", ru: "Сколько стоит лечение в Корее?", kz: "Кореядағы ем қанша тұрады?", zh: "韩国治疗费用是多少？", ja: "韓国の治療費はいくらですか？" }, a: { ko: "일반적으로 미국 대비 1/3 수준이며, 암종과 치료 방법에 따라 다릅니다. 사전상담 시 예상 비용을 안내해드립니다.", en: "Generally about 1/3 of US costs, varying by cancer type and treatment. Estimated costs are provided during pre-consultation.", ru: "В среднем лечение обходится примерно в 1/3 стоимости по сравнению с США. Конкретная цена определяется типом рака и планом лечения.", kz: "АҚШ құнының шамамен 1/3. Нақты құн рак түрі мен емге байланысты.", zh: "通常约为美国费用的1/3，具体取决于癌症类型和治疗方案。预咨询时会提供预估费用。", ja: "一般的に米国の約1/3で、がん種と治療法により異なります。事前相談時に概算費用をご案内します。" } },
      { q: { ko: "비자는 어떻게 준비하나요?", en: "How do I prepare my visa?", ru: "Как подготовить визу?", kz: "Визаны қалай дайындауға болады?", zh: "如何准备签证？", ja: "ビザはどう準備しますか？" }, a: { ko: "단기 치료는 C-3-3(의료관광) 비자, 장기 치료는 G-1-10 비자가 필요합니다. healwith가 비자 유형 안내 및 필요 서류 체크리스트를 제공합니다.", en: "Short-term treatment requires a C-3-3 (medical tourism) visa, long-term requires G-1-10. healwith provides visa type guidance and document checklists.", ru: "Для краткосрочного лечения используется K‑eta либо виза C‑3‑3, для долгосрочного — G‑1‑10. healwith помогает с визовыми рекомендациями.", kz: "Қысқа мерзімді ем — C-3-3 визасы, ұзақ мерзімді — G-1-10. healwith виза бойынша кеңес береді.", zh: "短期治疗需要C-3-3（医疗旅游）签证，长期治疗需要G-1-10签证。healwith提供签证类型指南和文件清单。", ja: "短期治療はC-3-3（医療観光）ビザ、長期はG-1-10ビザが必要です。healwithがビザ案内と必要書類チェックリストを提供します。" } },
    ],
  },
  /* ── 긴급 CTA ── */
  emergency: {
    title: { ko: "지금 바로 상담이 필요하신가요?", en: "Need Immediate Assistance?", ru: "Нужна срочная помощь?", kz: "Шұғыл көмек керек пе?", zh: "需要立即帮助？", ja: "今すぐ相談が必要ですか？" },
    subtitle: { ko: "전문 코디네이터가 24시간 이내에 연락드립니다", en: "Our coordinator will contact you within 24 hours", ru: "Координатор свяжется с вами в течение 24 часов", kz: "Координатор 24 сағат ішінде хабарласады", zh: "协调员将在24小时内与您联系", ja: "コーディネーターが24時間以内にご連絡します" },
  },
  /* ── 하단 CTA ── */
  bottomCta: {
    title: { ko: "지금 바로 시작하세요", en: "Start Your Journey Today", ru: "Начните свой путь сегодня", kz: "Бүгін бастаңыз", zh: "今天就开始", ja: "今日から始めましょう" },
    desc: { ko: "인테이크 제출 후 24시간 이내에 전문의 상담을 배정해드립니다.\n상담 비용은 무료이며, 치료 결정은 언제든 자유입니다.", en: "We'll arrange a specialist consultation within 24 hours.\nConsultation is free, and you're never obligated to proceed.", ru: "Мы организуем консультацию специалиста в течение 24 часов.\nКонсультация бесплатна, решение за вами.", kz: "Координатор сізбен 24 сағат ішінде хабарласады.\nКеңес — тегін, шешім — сізде.", zh: "提交后24小时内为您安排专家咨询。\n咨询免费，决定权在您。", ja: "24時間以内に専門医相談を手配します。\n相談無料、決定はご自由に。" },
    free: { ko: "무료 상담", en: "Free consultation", ru: "Бесплатная консультация", kz: "Тегін кеңес", zh: "免费咨询", ja: "無料相談" },
    fast: { ko: "24시간 내 응답", en: "24h response", ru: "Ответ в течение 24ч", kz: "24 сағат ішінде жауап", zh: "24小时内回复", ja: "24時間以内に返信" },
    noObligation: { ko: "치료 강제 없음", en: "No obligation", ru: "Без обязательств", kz: "Міндеттемесіз", zh: "无需承诺", ja: "義務なし" },
  },
  /* ── misc CTA / labels ── */
  misc: {
    viewTreatments: { ko: "암종별 상세 치료 안내 보기", en: "View detailed treatment guides", ru: "Подробные руководства по лечению", kz: "Емдеу нұсқаулықтарын көру", zh: "查看各癌种详细治疗指南", ja: "がん種別の詳細治療ガイドを見る" },
    onlineInquiry: { ko: "온라인 문의", en: "Online Inquiry", ru: "Онлайн-запрос", kz: "Онлайн сұрау", zh: "在线咨询", ja: "オンラインお問い合わせ" },
    badgePartner: { ko: "제휴 병원", en: "Partner", ru: "Партнёр", kz: "Серіктес", zh: "合作", ja: "提携" },
    badgeUniversity: { ko: "협진 대학병원", en: "University", ru: "Университетская клиника", kz: "Университет клиникасы", zh: "大学医院", ja: "大学病院" },
  },
};
