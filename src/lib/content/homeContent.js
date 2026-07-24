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
      ru: "ИИ-перевод в реальном времени · Видеоконсультация · Интегрированная корейская медицина\nПодготовьтесь к визиту в Корею, не выходя из дома",
      kz: "Нақты уақыттағы AI аударма · Онлайн бейне кеңес · Кешенді корей медицинасы\nБарлық дайындықтарды үйден бастап, Кореяға сенімді барыңыз",
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
    title: { ko: "왜 한국에서 암 치료인가요?", en: "Why Cancer Treatment in Korea?", ru: "Почему лечение рака в Корее?", kz: "Неге Кореяда рак емдеу?", zh: "为什么选择韩国治疗癌症？", ja: "なぜ韓国でがん治療？" },
    subtitle: { ko: "한국은 세계 최고 수준의 암 생존율과 최첨단 의료 기술을 보유하고 있습니다", en: "Korea leads the world in cancer survival rates and cutting-edge medical technology", ru: "Корея — мировой лидер по выживаемости при раке и передовым медицинским технологиям", kz: "Корея рак бойынша тірі қалу көрсеткіштері мен озық медициналық технологиялар бойынша әлем көшбасшысы", zh: "韩国在癌症生存率和尖端医疗技术方面处于世界领先地位", ja: "韓国はがん生存率と最先端医療技術で世界をリード" },
    items: [
      { value: "78.4%", label: { ko: "위암 5년 생존율\n(세계 1위)", en: "Stomach Cancer\n5-year Survival\n(World #1)", ru: "Рак желудка\n5-летняя выживаемость\n(№1 в мире)", kz: "Асқазан обыры\n5 жылдық тірі қалу\n(Әлемде №1)", zh: "胃癌5年生存率\n（世界第一）", ja: "胃がん5年生存率\n（世界1位）" } },
      { value: { ko: "201만+", en: "2.01M+", ru: "2,01 млн+", kz: "2,01 млн+", zh: "201万+", ja: "201万+" }, label: { ko: "2025 외국인 환자\n한국 방문", en: "Foreign Patients\nVisited Korea\nin 2025", ru: "Иностранных\nпациентов в Корее\nв 2025", kz: "2025 жылы Кореяға\nкелген шетелдік\nнауқастар", zh: "2025年访韩\n外国患者", ja: "2025年韓国訪問\n外国人患者" } },
      { value: "60~80%", label: { ko: "미국 대비\n치료비 절감", en: "Cost Savings\nvs. United States", ru: "Экономия\nvs. США", kz: "АҚШ-қа қарағанда\nүнемдеу", zh: "与美国相比\n节省费用", ja: "米国比\nコスト削減" } },
      { value: "Top 10", label: { ko: "의료 시설 품질\n세계 순위", en: "Global Ranking\nHealthcare Quality\n& Facilities", ru: "Мировой рейтинг\nкачества медицины", kz: "Медицина сапасы\nбойынша әлемдік\nрейтинг", zh: "医疗设施质量\n世界排名", ja: "医療施設の質\n世界ランキング" } },
    ],
  },
  /* ── 의사 섹션 ── */
  doctors: {
    title: { ko: "협력 의료진", en: "Our Medical Team", ru: "Наша медицинская команда", kz: "Біздің медициналық топ", zh: "合作医疗团队", ja: "協力医療チーム" },
    subtitle: { ko: "한국 주요 암 전문 병원에서 다년간 경력을 쌓은 전문의들이 함께합니다", en: "Experienced oncologists from Korea's leading cancer hospitals", ru: "Опытные онкологи из ведущих онкологических больниц Кореи", kz: "Кореяның жетекші онкологиялық аурухналарының тәжірибелі дәрігерлері", zh: "来自韩国顶级肿瘤医院的资深专家", ja: "韓国主要がん専門病院の経験豊富な専門医" },
    viewAll: { ko: "전체 의료진 보기", en: "View All Doctors", ru: "Все врачи", kz: "Барлық дәрігерлер", zh: "查看全部医生", ja: "全医師を見る" },
  },
  /* ── 서비스 ── */
  services: {
    title: { ko: "healwith가 해드리는 일", en: "What healwith Does For You", ru: "Что healwith делает для вас", kz: "healwith сіз үшін не істейді", zh: "healwith为您做什么", ja: "healwithがお手伝いすること" },
    subtitle: { ko: "한국 암 치료의 모든 과정을 원스톱으로 지원합니다", en: "One-stop support for every step of your cancer treatment journey in Korea", ru: "Комплексная поддержка на каждом этапе лечения рака в Корее", kz: "Кореядағы рак емдеу сапарыңыздың әр кезеңін толық қолдау", zh: "一站式支持您在韩国癌症治疗的每一步", ja: "韓国でのがん治療のすべてをワンストップでサポート" },
    items: [
      { icon: "Stethoscope", title: { ko: "전문의 원격 상담", en: "Remote Specialist Consultation", ru: "Удалённая консультация", kz: "Қашықтан кеңес", zh: "远程专家咨询", ja: "専門医リモート相談" }, desc: { ko: "한국 3대 암 병원 출신 전문의와 화상으로 먼저 상담.", en: "Video consultation with oncologists from Korea's top cancer hospitals.", ru: "Видеоконсультация с онкологами из ведущих больниц Кореи.", kz: "Кореяның жетекші аурухналарымен бейне кеңес.", zh: "与韩国顶级肿瘤医院的专家视频咨询。", ja: "韓国トップのがん病院の専門医とビデオ相談。" } },
      { icon: "Globe", title: { ko: "6개국어 AI 통역", en: "AI Interpretation in 6 Languages", ru: "ИИ-перевод на 6 языках", kz: "6 тілде AI аудармасы", zh: "6种语言AI翻译", ja: "6言語AI通訳" }, desc: { ko: "한·영·러·중·일·카자흐어 실시간 자동 통역.", en: "Real-time interpretation in Korean, English, Russian, Chinese, Japanese, Kazakh.", ru: "Синхронный перевод: корейский, английский, русский, китайский, японский, казахский.", kz: "Корей, ағылшын, орыс, қытай, жапон, қазақ тілдерінде аударма.", zh: "韩·英·俄·中·日·哈实时翻译。", ja: "韓·英·露·中·日·カザフ語リアルタイム通訳。" } },
      { icon: "Leaf", title: { ko: "양·한방 통합 케어", en: "Integrated East-West Care", ru: "Интегрированная помощь", kz: "Шығыс-Батыс кешенді көмек", zh: "中西医结合护理", ja: "洋・韓方統合ケア" }, desc: { ko: "수술·항암은 암 병원, 면역 관리는 면력한방병원에서.", en: "Surgery & chemo at partner hospitals. Immune support at Immune Hospital.", ru: "Хирургия в партнёрских больницах. Иммунная поддержка в Иммуногоспитале.", kz: "Серіктес аурухналарда хирургия. Иммунная Клиникаде қолдау.", zh: "在合作医院手术化疗，在免疫医院免疫管理。", ja: "手術・抗がんはがん病院、免疫管理は免疫病院。" } },
      { icon: "Heart", title: { ko: "사후관리 프로그램", en: "Post-treatment Follow-up", ru: "Послеоперационное наблюдение", kz: "Емнен кейінгі бақылау", zh: "术后跟踪管理", ja: "術後フォローアップ" }, desc: { ko: "귀국 후에도 증상 추적, 교육 콘텐츠, 재진 예약까지.", en: "Symptom tracking, education content, and follow-up scheduling after returning home.", ru: "Отслеживание симптомов и запись на повторный приём после возвращения.", kz: "Үйге оралғаннан кейін де бақылау және қайта қабылдау.", zh: "回国后症状追踪、教育内容和复诊预约。", ja: "帰国後も症状追跡、教育コンテンツ、再診予約。" } },
    ],
  },
  /* ── 프로세스 ── */
  process: {
    title: { ko: "이용 절차", en: "How It Works", ru: "Как это работает", kz: "Қалай жұмыс істейді", zh: "使用流程", ja: "ご利用の流れ" },
    steps: [
      { num: "01", title: { ko: "인테이크 작성", en: "Submit Intake", ru: "Заполните анкету", kz: "Сауалнама толтыру", zh: "填写资料", ja: "問診票記入" }, desc: { ko: "암종, 병기, 치료 이력 입력 (5분)", en: "Cancer type, stage, history (5 min)", ru: "Тип рака, стадия, история (5 мин)", kz: "Рак түрі, сатысы, тарихы (5 мин)", zh: "癌症类型、分期、病史（5分钟）", ja: "がん種、病期、治療歴（5分）" } },
      { num: "02", title: { ko: "전문의 상담 배정", en: "Specialist Assignment", ru: "Назначение специалиста", kz: "Маман тағайындау", zh: "专家会诊安排", ja: "専門医の手配" }, desc: { ko: "코디네이터가 전문의 상담을 배정 (24시간 이내)", en: "Coordinator arranges a specialist consultation (within 24h)", ru: "Координатор организует консультацию специалиста (24ч)", kz: "Координатор маман кеңесін ұйымдастырады (24 сағат)", zh: "协调员安排专家咨询（24小时内）", ja: "コーディネーターが専門医相談を手配（24時間以内）" } },
      { num: "03", title: { ko: "화상 사전상담", en: "Video Consultation", ru: "Видеоконсультация", kz: "Бейне кеңес", zh: "视频咨询", ja: "ビデオ相談" }, desc: { ko: "실시간 AI 통역과 함께 상담", en: "Video call with real-time AI interpretation", ru: "Видеозвонок с ИИ-переводом", kz: "AI аудармамен бейне кеңес", zh: "配合AI翻译的视频通话", ja: "AI通訳付きビデオ相談" } },
      { num: "04", title: { ko: "치료 · 사후관리", en: "Treatment & Follow-up", ru: "Лечение и наблюдение", kz: "Ем және бақылау", zh: "治疗与随访", ja: "治療・フォローアップ" }, desc: { ko: "한국 방문 치료 + 귀국 후 관리", en: "Visit Korea for treatment + continued care", ru: "Лечение в Корее + наблюдение после", kz: "Кореяда ем + кейін бақылау", zh: "赴韩治疗 + 回国后管理", ja: "韓国治療 + 帰国後管理" } },
    ],
  },
  /* ── 암종 ── */
  cancers: {
    title: { ko: "주요 지원 암종", en: "Cancer Types We Support", ru: "Типы рака", kz: "Рак түрлері", zh: "支持的癌症类型", ja: "対応がん種" },
    items: [
      { organ: "stomach", label: { ko: "위암", en: "Stomach", ru: "Желудок", kz: "Асқазан", zh: "胃癌", ja: "胃がん" }, stat: { ko: "5년 생존율 78.4%", en: "78.4% 5yr survival", ru: "78.4% выживаемость", kz: "78.4% тірі қалу", zh: "5年生存率78.4%", ja: "5年生存率78.4%" } },
      { organ: "breast", label: { ko: "유방암", en: "Breast", ru: "Молочная железа", kz: "Сүт безі", zh: "乳腺癌", ja: "乳がん" }, stat: { ko: "보존율 세계 최고", en: "Top conservation rate", ru: "Лучшая сохранность", kz: "Ең жоғары сақтау", zh: "保乳率世界最高", ja: "温存率世界最高" } },
      { organ: "liver", label: { ko: "간암", en: "Liver", ru: "Печень", kz: "Бауыр", zh: "肝癌", ja: "肝がん" }, stat: { ko: "간이식 세계 1위", en: "World #1 transplant", ru: "№1 трансплантация", kz: "Трансплантация №1", zh: "肝移植世界第一", ja: "肝移植世界1位" } },
      { organ: "lung", label: { ko: "폐암", en: "Lung", ru: "Лёгкие", kz: "Өкпе", zh: "肺癌", ja: "肺がん" }, stat: { ko: "VATS 수술 선도", en: "VATS surgery leader", ru: "Лидер ВАТС", kz: "ВАТС көшбасшысы", zh: "VATS手术领先", ja: "VATS手術リーダー" } },
      { organ: "thyroid", label: { ko: "갑상선암", en: "Thyroid", ru: "Щитовидная железа", kz: "Қалқанша без", zh: "甲状腺癌", ja: "甲状腺がん" }, stat: { ko: "생존율 100% 근접", en: "Near 100% survival", ru: "~100% выживаемость", kz: "~100% тірі қалу", zh: "生存率接近100%", ja: "生存率ほぼ100%" } },
      { organ: "colon", label: { ko: "대장암", en: "Colorectal", ru: "Толстая кишка", kz: "Тоқ ішек", zh: "大肠癌", ja: "大腸がん" }, stat: { ko: "복강경 세계 최다", en: "Most laparoscopic", ru: "Больше всего лапароскопий", kz: "Ең көп лапароскопия", zh: "腹腔镜最多", ja: "腹腔鏡最多" } },
    ],
  },
  /* ── 파트너 병원 ── */
  partners: {
    title: { ko: "협력 의료기관", en: "Our Partner Hospitals", ru: "Наши партнёрские больницы", kz: "Біздің серіктес аурухналар", zh: "合作医疗机构", ja: "協力医療機関" },
    subtitle: { ko: "healwith와 함께하는 제휴 병원 및 협진 대학병원", en: "Partner hospitals and cooperating university hospitals working with healwith", ru: "Больницы-партнёры, работающие с healwith", kz: "healwith-мен жұмыс істейтін серіктес аурухналар", zh: "与healwith合作的医院", ja: "healwithと連携する医療機関" },
  },
  /* ── FAQ ── */
  faq: {
    title: { ko: "자주 묻는 질문", en: "Frequently Asked Questions", ru: "Часто задаваемые вопросы", kz: "Жиі қойылатын сұрақтар", zh: "常见问题", ja: "よくある質問" },
    tabs: {
      general: { ko: "일반", en: "General", ru: "Общие", kz: "Жалпы", zh: "一般", ja: "一般" },
      consultation: { ko: "상담", en: "Consultation", ru: "Консультация", kz: "Кеңес", zh: "咨询", ja: "相談" },
      cost: { ko: "비용·비자", en: "Cost & Visa", ru: "Стоимость и виза", kz: "Құн және виза", zh: "费用与签证", ja: "費用・ビザ" },
    },
  },
  /* ── 긴급 CTA ── */
  emergency: {
    title: { ko: "지금 바로 상담이 필요하신가요?", en: "Need Immediate Assistance?", ru: "Нужна срочная помощь?", kz: "Шұғыл көмек керек пе?", zh: "需要立即帮助？", ja: "今すぐ相談が必要ですか？" },
    subtitle: { ko: "전문 코디네이터가 24시간 이내에 연락드립니다", en: "Our coordinator will contact you within 24 hours", ru: "Координатор свяжется с вами в течение 24 часов", kz: "Координатор 24 сағат ішінде хабарласады", zh: "协调员将在24小时内与您联系", ja: "コーディネーターが24時間以内にご連絡します" },
  },
  /* ── 하단 CTA ── */
  bottomCta: {
    title: { ko: "지금 바로 시작하세요", en: "Start Your Journey Today", ru: "Начните свой путь сегодня", kz: "Бүгін бастаңыз", zh: "今天就开始", ja: "今日から始めましょう" },
    desc: { ko: "인테이크 제출 후 24시간 이내에 전문의 상담을 배정해드립니다.\n상담 비용은 무료이며, 치료 결정은 언제든 자유입니다.", en: "We'll arrange a specialist consultation within 24 hours.\nConsultation is free, and you're never obligated to proceed.", ru: "Мы организуем консультацию специалиста в течение 24 часов.\nКонсультация бесплатна, решение за вами.", kz: "24 сағат ішінде маман кеңесін ұйымдастырамыз.\nКеңес тегін, шешім сізде.", zh: "提交后24小时内为您安排专家咨询。\n咨询免费，决定权在您。", ja: "24時間以内に専門医相談を手配します。\n相談無料、決定はご自由に。" },
    free: { ko: "무료 상담", en: "Free consultation", ru: "Бесплатная консультация", kz: "Тегін кеңес", zh: "免费咨询", ja: "無料相談" },
    fast: { ko: "24시간 내 응답", en: "24h response", ru: "Ответ в течение 24ч", kz: "24 сағат ішінде жауап", zh: "24小时内回复", ja: "24時間以内に返信" },
    noObligation: { ko: "치료 강제 없음", en: "No obligation", ru: "Без обязательств", kz: "Міндеттемесіз", zh: "无需承诺", ja: "義務なし" },
  },
  /* ── misc CTA / labels ── */
  misc: {
    viewTreatments: { ko: "암종별 상세 치료 안내 보기", en: "View detailed treatment guides", ru: "Подробные руководства по лечению", kz: "Емдеу нұсқаулықтарын көру", zh: "查看各癌种详细治疗指南", ja: "がん種別の詳細治療ガイドを見る" },
    onlineInquiry: { ko: "온라인 문의", en: "Online Inquiry", ru: "Онлайн-запрос", kz: "Онлайн сұрау", zh: "在线咨询", ja: "オンラインお問い合わせ" },
    badgePartner: { ko: "제휴 병원", en: "Partner", ru: "Партнёр", kz: "Серіктес", zh: "合作", ja: "提携" },
    badgeUniversity: { ko: "협진 대학병원", en: "University", ru: "Университет", kz: "Университет", zh: "大学医院", ja: "大学病院" },
  },
};
