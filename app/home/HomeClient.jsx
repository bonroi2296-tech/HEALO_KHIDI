"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getLangCodeFromCookie } from "../../src/lib/i18n";
import {
  ArrowRight,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  Star,
  Phone,
  MessageCircle,
  Mail,
  Quote,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════
   실사 이미지 — 면력한방병원 에셋 + public/immune/
   ═══════════════════════════════════════════════════════ */
const IMAGES = {
  heroBg: "/immune/misc/banner-gangeo-main.jpg",
  hospitals: [
    "/immune/misc/banner-gangeo-main.jpg",
    "/immune/misc/banner-sinchon.jpg",
    "/immune/misc/banner-gwangmyeong.jpg",
    "/immune/misc/banner-seongdong.jpg",
  ],
  /* 서비스 카드 썸네일 */
  serviceCards: [
    "/immune/facility/facility-treatment-room-1.jpg",   // 원격 상담
    "/immune/misc/hospital-visual.jpg",                  // AI 통역
    "/immune/program/cancer-heal3.jpg",                  // 양·한방 통합
    "/immune/facility/facility-healing-space-1.jpg",    // 사후관리
  ],
  /* Stats 섹션 — 차트/데이터 이미지 */
  statsBg: "/immune/cancer/cancer-graph.jpg",
  /* 병원 로고 */
  hospitalLogo: "/immune/logo/color-logo.svg",
};

/* ─────────────────────────────────────────
   i18n 텍스트
   ───────────────────────────────────────── */
const L = {
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
      ko: "한국 최고의 암 전문의에게 먼저 상담받으세요",
      en: "Get a Second Opinion from Korea's Top Oncologists",
      ru: "Получите второе мнение от лучших онкологов Кореи",
      kz: "Кореяның үздік онкологтарынан екінші пікір алыңыз",
      zh: "获取韩国顶级肿瘤专家的第二意见",
      ja: "韓国トップのがん専門医にセカンドオピニオンを",
    },
    subtitle: {
      ko: "AI 실시간 통역 · 화상 사전상담 · 한방 통합 케어까지. 한국 방문 전, 집에서 모든 것을 준비하세요.",
      en: "AI real-time interpretation · Video pre-consultation · Integrated Korean Medicine care. Prepare everything from home before visiting Korea.",
      ru: "ИИ-перевод · Видеоконсультация · Интегрированная корейская медицина. Подготовьтесь дома до визита в Корею.",
      kz: "AI аударма · Бейне кеңес · Кешенді корей медицинасы. Кореяға келмей тұрып, үйден дайындаңыз.",
      zh: "AI实时翻译 · 视频预咨询 · 中西医结合护理。访韩前，在家完成所有准备。",
      ja: "AIリアルタイム通訳 · ビデオ事前相談 · 韓方統合ケア。韓国訪問前にすべてを自宅で準備。",
    },
    cta: {
      ko: "무료 원격상담 신청",
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
    telemedicine: {
      ko: "원격협진이란?",
      en: "What is Telemedicine?",
      ru: "Что такое телемедицина?",
      kz: "Телемедицина дегеніміз не?",
      zh: "什么是远程协诊？",
      ja: "遠隔診療とは？",
    },
  },
  telemedicine: {
    badge: {
      ko: "HEALO 핵심 서비스",
      en: "HEALO Core Service",
      ru: "Основная услуга HEALO",
      kz: "HEALO негізгі қызметі",
      zh: "HEALO核心服务",
      ja: "HEALOコアサービス",
    },
    title: {
      ko: "원격협진 — 한국에 오기 전 전문의와 먼저 만나세요",
      en: "Telemedicine — Meet a Korean Specialist Before You Travel",
      ru: "Телемедицина — Встретьтесь со специалистом до поездки",
      kz: "Телемедицина — Сапарға дейін маманмен кездесіңіз",
      zh: "远程协诊 — 来韩前先与专家会面",
      ja: "遠隔診療 — 渡韓前に専門医とまず面談",
    },
    subtitle: {
      ko: "병기 확인 · 치료 계획 수립 · 비용 예측까지. AI 실시간 통역이 언어 장벽을 없애줍니다.",
      en: "Stage confirmation · Treatment planning · Cost estimation. AI real-time interpretation eliminates language barriers.",
      ru: "Подтверждение стадии · Планирование лечения · Оценка стоимости. ИИ устраняет языковой барьер.",
      kz: "Кезеңді растау · Ем жоспарлау · Шығын бағалау. AI тіл кедергісін жояды.",
      zh: "确认分期 · 制定治疗计划 · 预估费用。AI实时翻译消除语言障碍。",
      ja: "病期確認 · 治療計画 · 費用予測。AIが言語の壁を取り除きます。",
    },
    cta: {
      ko: "원격협진 바로 신청",
      en: "Start Telemedicine Now",
      ru: "Начать телемедицину",
      kz: "Телемедицинаны бастау",
      zh: "立即申请远程协诊",
      ja: "遠隔診療を今すぐ申請",
    },
    points: [
      {
        ko: "한국 3대 암 병원 출신 전문의",
        en: "Oncologists from Korea's top 3 cancer hospitals",
        ru: "Онкологи из лучших больниц Кореи",
        kz: "Кореяның үздік 3 ауруханасының онкологтары",
        zh: "来自韩国三大癌症医院的专家",
        ja: "韓国3大がん病院出身の専門医",
      },
      {
        ko: "6개국어 AI 실시간 통역",
        en: "AI real-time interpretation in 6 languages",
        ru: "ИИ перевод на 6 языках в реальном времени",
        kz: "6 тілде AI нақты уақыт аудармасы",
        zh: "6种语言AI实时翻译",
        ja: "6言語AIリアルタイム通訳",
      },
      {
        ko: "인테이크 제출 후 24시간 내 매칭",
        en: "Matched within 24 hours after intake",
        ru: "Подбор врача в течение 24 часов",
        kz: "Өтінімнен кейін 24 сағат ішінде",
        zh: "提交后24小时内匹配",
        ja: "提出後24時間以内にマッチング",
      },
    ],
  },
  stats: {
    title: { ko: "왜 한국에서 암 치료인가요?", en: "Why Cancer Treatment in Korea?", ru: "Почему лечение рака в Корее?", kz: "Неге Кореяда рак емдеу?", zh: "为什么选择韩国治疗癌症？", ja: "なぜ韓国でがん治療？" },
    subtitle: { ko: "한국은 세계 최고 수준의 암 생존율과 최첨단 의료 기술을 보유하고 있습니다", en: "Korea leads the world in cancer survival rates and cutting-edge medical technology", ru: "Корея — мировой лидер по выживаемости при раке и передовым медицинским технологиям", kz: "Корея рак бойынша тірі қалу және озық технологиялар бойынша әлем көшбасшысы", zh: "韩国在癌症生存率和尖端医疗技术方面处于世界领先地位", ja: "韓国はがん生存率と最先端医療技術で世界をリード" },
    items: [
      { value: "78.4%", label: { ko: "위암 5년 생존율\n(세계 1위)", en: "Stomach Cancer\n5-year Survival\n(World #1)", ru: "Рак желудка\n5-летняя выживаемость\n(№1 в мире)", kz: "Асқазан обыры\n5 жылдық тірі қалу\n(Әлемде №1)", zh: "胃癌5年生存率\n（世界第一）", ja: "胃がん5年生存率\n（世界1位）" } },
      { value: { ko: "117만+", en: "1.17M+", ru: "1,17 млн+", kz: "1,17 млн+", zh: "117万+", ja: "117万+" }, label: { ko: "2024 외국인 환자\n한국 방문", en: "Foreign Patients\nVisited Korea\nin 2024", ru: "Иностранных\nпациентов в Корее\n2024", kz: "2024 жылы Кореяға\nкелген шетелдік науқастар", zh: "2024年访韩\n外国患者", ja: "2024年韓国訪問\n外国人患者" } },
      { value: "60~80%", label: { ko: "미국 대비\n치료비 절감", en: "Cost Savings\nvs. United States", ru: "Экономия\nvs. США", kz: "АҚШ-қа қарағанда\nүнемдеу", zh: "与美国相比\n节省费用", ja: "米国比\nコスト削減" } },
      { value: "Top 10", label: { ko: "의료 시설 품질\n세계 순위", en: "Global Ranking\nHealthcare Quality", ru: "Мировой рейтинг\nкачества медицины", kz: "Медицина сапасы\nәлемдік рейтинг", zh: "医疗设施质量\n世界排名", ja: "医療施設の質\n世界ランキング" } },
    ],
  },
  doctors: {
    title: { ko: "협력 의료진", en: "Our Medical Team", ru: "Наша медицинская команда", kz: "Біздің медициналық топ", zh: "合作医疗团队", ja: "協力医療チーム" },
    subtitle: { ko: "한국 주요 암 전문 병원에서 다년간 경력을 쌓은 전문의들이 함께합니다", en: "Experienced oncologists from Korea's leading cancer hospitals", ru: "Опытные онкологи из ведущих онкологических больниц Кореи", kz: "Кореяның жетекші аурухналарының тәжірибелі дәрігерлері", zh: "来自韩国顶级肿瘤医院的资深专家", ja: "韓国主要がん専門病院の経験豊富な専門医" },
    viewAll: { ko: "전체 의료진 보기", en: "View All Doctors", ru: "Все врачи", kz: "Барлық дәрігерлер", zh: "查看全部医生", ja: "全医師を見る" },
  },
  services: {
    title: { ko: "HEALO가 해드리는 일", en: "What HEALO Does For You", ru: "Что HEALO делает для вас", kz: "HEALO сіз үшін не істейді", zh: "HEALO为您做什么", ja: "HEALOがお手伝いすること" },
    subtitle: { ko: "한국 암 치료의 모든 과정을 원스톱으로 지원합니다", en: "One-stop support for every step of your cancer treatment journey in Korea", ru: "Комплексная поддержка на каждом этапе лечения рака в Корее", kz: "Кореядағы рак емдеу сапарыңыздың әр кезеңін толық қолдау", zh: "一站式支持您在韩国癌症治疗的每一步", ja: "韓国でのがん治療のすべてをワンストップでサポート" },
    items: [
      { img: 0, title: { ko: "전문의 원격 상담", en: "Remote Specialist Consultation", ru: "Удалённая консультация", kz: "Қашықтан кеңес", zh: "远程专家咨询", ja: "専門医リモート相談" }, desc: { ko: "한국 3대 암 병원 출신 전문의와 화상으로 먼저 상담.", en: "Video consultation with oncologists from Korea's top cancer hospitals.", ru: "Видеоконсультация с онкологами из ведущих больниц Кореи.", kz: "Кореяның жетекші аурухналарымен бейне кеңес.", zh: "与韩国顶级肿瘤医院的专家视频咨询。", ja: "韓国トップのがん病院の専門医とビデオ相談。" } },
      { img: 1, title: { ko: "6개국어 AI 통역", en: "AI Interpretation in 6 Languages", ru: "ИИ-перевод на 6 языках", kz: "6 тілде AI аудармасы", zh: "6种语言AI翻译", ja: "6言語AI通訳" }, desc: { ko: "한·영·러·중·일·카자흐어 실시간 자동 통역.", en: "Real-time interpretation in Korean, English, Russian, Chinese, Japanese, Kazakh.", ru: "Синхронный перевод: корейский, английский, русский, китайский, японский, казахский.", kz: "Корей, ағылшын, орыс, қытай, жапон, қазақ тілдерінде аударма.", zh: "韩·英·俄·中·日·哈实时翻译。", ja: "韓·英·露·中·日·カザフ語リアルタイム通訳。" } },
      { img: 2, title: { ko: "양·한방 통합 케어", en: "Integrated East-West Care", ru: "Интегрированная помощь", kz: "Шығыс-Батыс кешенді көмек", zh: "中西医结合护理", ja: "洋・韓方統合ケア" }, desc: { ko: "수술·항암은 암 병원, 면역 관리는 면력한방병원에서.", en: "Surgery & chemo at partner hospitals. Immune support at Immune Hospital.", ru: "Хирургия в партнёрских больницах. Иммунная поддержка в Иммуногоспитале.", kz: "Серіктес аурухналарда хирургия. Иммунная Клиникаде қолдау.", zh: "在合作医院手术化疗，在免疫医院免疫管理。", ja: "手術・抗がんはがん病院、免疫管理は免疫病院。" } },
      { img: 3, title: { ko: "사후관리 프로그램", en: "Post-treatment Follow-up", ru: "Послеоперационное наблюдение", kz: "Емнен кейінгі бақылау", zh: "术后跟踪管理", ja: "術後フォローアップ" }, desc: { ko: "귀국 후에도 증상 추적, 교육 콘텐츠, 재진 예약까지.", en: "Symptom tracking, education content, and follow-up scheduling after returning home.", ru: "Отслеживание симптомов и запись на повторный приём после возвращения.", kz: "Үйге оралғаннан кейін де бақылау және қайта қабылдау.", zh: "回国后症状追踪、教育内容和复诊预约。", ja: "帰国後も症状追跡、教育コンテンツ、再診予約。" } },
    ],
  },
  process: {
    title: { ko: "이용 절차", en: "How It Works", ru: "Как это работает", kz: "Қалай жұмыс істейді", zh: "使用流程", ja: "ご利用の流れ" },
    steps: [
      { num: "01", title: { ko: "인테이크 작성", en: "Submit Intake", ru: "Заполните анкету", kz: "Сауалнама толтыру", zh: "填写资料", ja: "問診票記入" }, desc: { ko: "암종, 병기, 치료 이력 입력 (5분)", en: "Cancer type, stage, history (5 min)", ru: "Тип рака, стадия, история (5 мин)", kz: "Рак түрі, сатысы, тарихы (5 мин)", zh: "癌症类型、分期、病史（5分钟）", ja: "がん種、病期、治療歴（5分）" } },
      { num: "02", title: { ko: "전문의 매칭", en: "Doctor Matching", ru: "Подбор врача", kz: "Дәрігер таңдау", zh: "医生匹配", ja: "専門医マッチング" }, desc: { ko: "AI가 최적 전문의 추천 (24시간 이내)", en: "AI recommends the best specialist (within 24h)", ru: "ИИ подберёт лучшего специалиста (24ч)", kz: "AI ең жақсы маманды ұсынады (24 сағат)", zh: "AI推荐最佳专家（24小时内）", ja: "AI最適専門医推薦（24時間以内）" } },
      { num: "03", title: { ko: "화상 원격상담", en: "Video Consultation", ru: "Видеоконсультация", kz: "Бейне кеңес", zh: "视频咨询", ja: "ビデオ相談" }, desc: { ko: "실시간 AI 통역과 함께 상담", en: "Video call with real-time AI interpretation", ru: "Видеозвонок с ИИ-переводом", kz: "AI аудармамен бейне кеңес", zh: "配合AI翻译的视频通话", ja: "AI通訳付きビデオ相談" } },
      { num: "04", title: { ko: "치료 · 사후관리", en: "Treatment & Follow-up", ru: "Лечение и наблюдение", kz: "Ем және бақылау", zh: "治疗与随访", ja: "治療・フォローアップ" }, desc: { ko: "한국 방문 치료 + 귀국 후 관리", en: "Visit Korea for treatment + continued care", ru: "Лечение в Корее + наблюдение после", kz: "Кореяда ем + кейін бақылау", zh: "赴韩治疗 + 回国后管理", ja: "韓国治療 + 帰国後管理" } },
    ],
  },
  cancers: {
    title: { ko: "주요 지원 암종", en: "Cancer Types We Support", ru: "Типы рака", kz: "Рак түрлері", zh: "支持的癌症类型", ja: "対応がん種" },
    items: [
      { emoji: "🫁", label: { ko: "위암", en: "Stomach", ru: "Желудок", kz: "Асқазан", zh: "胃癌", ja: "胃がん" }, stat: { ko: "5년 생존율 78.4%", en: "78.4% 5yr survival", ru: "78.4% выживаемость", kz: "78.4% тірі қалу", zh: "5年生存率78.4%", ja: "5年生存率78.4%" } },
      { emoji: "🩷", label: { ko: "유방암", en: "Breast", ru: "Молочная железа", kz: "Сүт безі", zh: "乳腺癌", ja: "乳がん" }, stat: { ko: "보존율 세계 최고", en: "Top conservation rate", ru: "Лучшая сохранность", kz: "Ең жоғары сақтау", zh: "保乳率世界最高", ja: "温存率世界最高" } },
      { emoji: "🫀", label: { ko: "간암", en: "Liver", ru: "Печень", kz: "Бауыр", zh: "肝癌", ja: "肝がん" }, stat: { ko: "간이식 세계 1위", en: "World #1 transplant", ru: "№1 трансплантация", kz: "Трансплантация №1", zh: "肝移植世界第一", ja: "肝移植世界1位" } },
      { emoji: "🌬️", label: { ko: "폐암", en: "Lung", ru: "Лёгкие", kz: "Өкпе", zh: "肺癌", ja: "肺がん" }, stat: { ko: "VATS 수술 선도", en: "VATS surgery leader", ru: "Лидер ВАТС", kz: "ВАТС көшбасшысы", zh: "VATS手术领先", ja: "VATS手術リーダー" } },
      { emoji: "🦋", label: { ko: "갑상선암", en: "Thyroid", ru: "Щитовидная железа", kz: "Қалқанша без", zh: "甲状腺癌", ja: "甲状腺がん" }, stat: { ko: "생존율 100% 근접", en: "Near 100% survival", ru: "~100% выживаемость", kz: "~100% тірі қалу", zh: "生存率接近100%", ja: "生存率ほぼ100%" } },
      { emoji: "🎗️", label: { ko: "대장암", en: "Colorectal", ru: "Толстая кишка", kz: "Тоқ ішек", zh: "大肠癌", ja: "大腸がん" }, stat: { ko: "복강경 세계 최다", en: "Most laparoscopic", ru: "Больше всего лапароскопий", kz: "Ең көп лапароскопия", zh: "腹腔镜最多", ja: "腹腔鏡最多" } },
    ],
  },
  partners: {
    title: { ko: "협력 의료기관", en: "Our Partner Hospitals", ru: "Наши партнёрские больницы", kz: "Біздің серіктес аурухналар", zh: "合作医疗机构", ja: "協力医療機関" },
    subtitle: { ko: "HEALO와 함께하는 제휴 병원 및 협진 대학병원", en: "Partner hospitals and cooperating university hospitals working with HEALO", ru: "Больницы-партнёры, работающие с HEALO", kz: "HEALO-мен жұмыс істейтін серіктес аурухналар", zh: "与HEALO合作的医院", ja: "HEALOと連携する医療機関" },
  },
  testimonials: {
    title: { ko: "환자 후기", en: "Patient Stories", ru: "Истории пациентов", kz: "Пациент тарихтары", zh: "患者故事", ja: "患者さんの声" },
  },
  faq: {
    title: { ko: "자주 묻는 질문", en: "Frequently Asked Questions", ru: "Часто задаваемые вопросы", kz: "Жиі қойылатын сұрақтар", zh: "常见问题", ja: "よくある質問" },
    tabs: {
      general: { ko: "일반", en: "General", ru: "Общие", kz: "Жалпы", zh: "一般", ja: "一般" },
      consultation: { ko: "상담", en: "Consultation", ru: "Консультация", kz: "Кеңес", zh: "咨询", ja: "相談" },
      cost: { ko: "비용·비자", en: "Cost & Visa", ru: "Стоимость и виза", kz: "Құн және виза", zh: "费用与签证", ja: "費用・ビザ" },
    },
  },
  emergency: {
    title: { ko: "지금 바로 상담이 필요하신가요?", en: "Need Immediate Assistance?", ru: "Нужна срочная помощь?", kz: "Шұғыл көмек керек пе?", zh: "需要立即帮助？", ja: "今すぐ相談が必要ですか？" },
    subtitle: { ko: "전문 코디네이터가 24시간 이내에 연락드립니다", en: "Our coordinator will contact you within 24 hours", ru: "Координатор свяжется с вами в течение 24 часов", kz: "Координатор 24 сағат ішінде хабарласады", zh: "协调员将在24小时内与您联系", ja: "コーディネーターが24時間以内にご連絡します" },
  },
  bottomCta: {
    title: { ko: "지금 바로 시작하세요", en: "Start Your Journey Today", ru: "Начните свой путь сегодня", kz: "Бүгін бастаңыз", zh: "今天就开始", ja: "今日から始めましょう" },
    desc: { ko: "인테이크 제출 후 24시간 이내에 최적의 전문의를 매칭해드립니다. 상담 비용은 무료이며, 치료 결정은 언제든 자유입니다.", en: "We'll match you with the best specialist within 24 hours. Consultation is free, and you're never obligated to proceed.", ru: "Мы подберём лучшего специалиста в течение 24 часов. Консультация бесплатна, решение за вами.", kz: "24 сағат ішінде ең жақсы маманды тағайындаймыз. Кеңес тегін, шешім сізде.", zh: "提交后24小时内匹配最佳专家。咨询免费，决定权在您。", ja: "24時間以内に最適な専門医をマッチング。相談無料、決定はご自由に。" },
    free: { ko: "무료 상담", en: "Free consultation", ru: "Бесплатная консультация", kz: "Тегін кеңес", zh: "免费咨询", ja: "無料相談" },
    fast: { ko: "24시간 내 응답", en: "24h response", ru: "Ответ в течение 24ч", kz: "24 сағат ішінде жауап", zh: "24小时内回复", ja: "24時間以内に返信" },
    noObligation: { ko: "치료 강제 없음", en: "No obligation", ru: "Без обязательств", kz: "Міндеттемесіз", zh: "无需承诺", ja: "義務なし" },
    telemedicineCta: {
      ko: "원격협진 먼저 받기",
      en: "Try Telemedicine First",
      ru: "Сначала попробуйте телемедицину",
      kz: "Алдымен телемедицинаны сынап көріңіз",
      zh: "先体验远程协诊",
      ja: "まず遠隔診療を試す",
    },
  },
  misc: {
    viewTreatments: { ko: "암종별 상세 치료 안내 보기", en: "View detailed treatment guides", ru: "Подробные руководства по лечению", kz: "Емдеу нұсқаулықтарын көру", zh: "查看各癌种详细治疗指南", ja: "がん種別の詳細治療ガイドを見る" },
    onlineInquiry: { ko: "온라인 문의", en: "Online Inquiry", ru: "Онлайн-запрос", kz: "Онлайн сұрау", zh: "在线咨询", ja: "オンラインお問い合わせ" },
    badgePartner: { ko: "제휴 병원", en: "Partner", ru: "Партнёр", kz: "Серіктес", zh: "合作", ja: "提携" },
    badgeUniversity: { ko: "협진 대학병원", en: "University", ru: "Университет", kz: "Университет", zh: "大学医院", ja: "大学病院" },
  },
};

/* ═══════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════ */
const DOCTORS_DATA = [
  { name: { ko: "황이준 대표원장", en: "Dr. Hwang Yi-jun", ru: "Д-р Хван Иджун", kz: "Д-р Хван Иджун", zh: "黄以准 代表院长", ja: "黄以準 代表院長" }, title: { ko: "면력한방병원 강서 대표원장", en: "Chief Director, Immune Hospital Gangseo", ru: "Главный директор, Иммунная Клиника Кансо", kz: "Бас директор, Иммунная Клиника Кансо", zh: "免疫医院 江西 代表院长", ja: "免疫病院 江西 代表院長" }, specialty: { ko: "한방 면역 종양학 · 통합 암 케어", en: "Korean Medicine Immuno-Oncology", ru: "Иммуноонкология корейской медицины", kz: "Корей медицинасы иммуноонкологиясы", zh: "韩方免疫肿瘤学", ja: "韓方免疫腫瘍学" }, img: "https://immunehospital.com/uploads/doctors/68a674036de695.54364290.png" },
  { name: { ko: "유형진 대표원장", en: "Dr. Yu Hyung-jin", ru: "Д-р Ю Хёнджин", kz: "Д-р Ю Хёнджин", zh: "柳炯进 代表院长", ja: "柳炯進 代表院長" }, title: { ko: "면력한방병원 신촌 대표원장", en: "Chief Director, Immune Hospital Sinchon", ru: "Главный директор, Иммунная Клиника Синчхон", kz: "Бас директор, Иммунная Клиника Синчхон", zh: "免疫医院 新村 代表院长", ja: "免疫病院 新村 代表院長" }, specialty: { ko: "한방 면역 치료 · 암 통합 케어", en: "Korean Medicine Immunotherapy · Cancer Care", ru: "Иммунотерапия · Онкологическая помощь", kz: "Иммунотерапия · Онкологиялық көмек", zh: "韩方免疫治疗 · 癌症综合护理", ja: "韓方免疫治療 · がん統合ケア" }, img: "https://immunehospital.com/uploads/doctors/68ac46bd439598.83386960.png" },
  { name: { ko: "이우석 양방대표원장", en: "Dr. Lee Woo-seok", ru: "Д-р Ли Усок", kz: "Д-р Ли Усок", zh: "李宇锡 西医代表院长", ja: "李宇錫 洋方代表院長" }, title: { ko: "면력한방병원 강서 양방대표원장", en: "Western Medicine Director, Gangseo", ru: "Директор западной медицины, Кансо", kz: "Батыс медицинасы директоры, Кансо", zh: "江西 西医代表院长", ja: "江西 洋方代表院長" }, specialty: { ko: "통합면역 · 산부인과", en: "Integrated Immunity · Obstetrics/Gynecology", ru: "Интегративный иммунитет · Акушерство", kz: "Кешенді иммунитет · Акушерлік", zh: "综合免疫 · 妇产科", ja: "統合免疫 · 産婦人科" }, img: "https://immunehospital.com/uploads/doctors/68a42d8de9e095.75488957.jpg" },
  { name: { ko: "정유진 진료원장", en: "Dr. Jung Yu-jin", ru: "Д-р Чон Юджин", kz: "Д-р Чон Юджин", zh: "郑有进 诊疗院长", ja: "鄭有進 診療院長" }, title: { ko: "면력한방병원 신촌 한방내과 전문의", en: "Korean Internal Medicine Specialist, Sinchon", ru: "Специалист корейской внутренней медицины, Синчхон", kz: "Корей ішкі медицина маманы, Синчхон", zh: "新村 韩方内科专家", ja: "新村 韓方内科専門医" }, specialty: { ko: "한방내과 · 면역 치료", en: "Korean Internal Medicine · Immunotherapy", ru: "Корейская внутренняя медицина · Иммунотерапия", kz: "Корей ішкі медицинасы · Иммунотерапия", zh: "韩方内科 · 免疫治疗", ja: "韓方内科 · 免疫治療" }, img: "https://immunehospital.com/uploads/doctors/68ac464c6fdee2.09872274.jpg" },
];

const PARTNERS_DATA = [
  { slug: "immunehospital-magok", badge: "partner", name: { ko: "면력한방병원 강서 (본원)", en: "Immune Hospital Gangseo (HQ)", ru: "Иммунная Клиника Кансо (главный)", kz: "Иммунная Клиника Кансо (бас)", zh: "免疫医院 江西本院", ja: "免疫病院 江西本院" }, desc: { ko: "마곡 소재 한방 면역치료 본원", en: "Korean Medicine Immunotherapy HQ in Magok", ru: "Главный офис иммунотерапии в Магоке", kz: "Магоктағы иммунотерапия бас кеңсесі", zh: "麻谷韩方免疫治疗本院", ja: "麻谷の韓方免疫治療本院" }, img: "/immune/misc/banner-gangeo-main.jpg" },
  { slug: "immunehospital-sinchon", badge: "partner", name: { ko: "신촌면력한방병원", en: "Immune Hospital Sinchon", ru: "Иммунная Клиника Синчхон", kz: "Иммунная Клиника Синчон", zh: "新村免疫医院", ja: "新村免疫病院" }, desc: { ko: "연세로 소재 신촌 분원", en: "Sinchon branch on Yonsei-ro", ru: "Филиал Синчхон на Ёнсе-ро", kz: "Ёнсе-родағы Синчон филиалы", zh: "位于延世路的新村分院", ja: "延世路の新村分院" }, img: "/immune/misc/banner-sinchon.jpg" },
  { slug: "immunehospital-gwangmyeong", badge: "partner", name: { ko: "면력한방병원 광명점", en: "Immune Hospital Gwangmyeong", ru: "Иммунная Клиника Кванмён", kz: "Иммунная Клиника Кванмён", zh: "免疫医院 光明院", ja: "免疫病院 光明院" }, desc: { ko: "광명역 소재 광명 분원", en: "Gwangmyeong branch near Gwangmyeong Station", ru: "Филиал Кванмён у станции Кванмён", kz: "Кванмён стансасындағы филиал", zh: "光明站附近光明分院", ja: "光明駅の光明分院" }, img: "/immune/misc/banner-gwangmyeong.jpg" },
  { slug: "immunehospital-seongdong", badge: "partner", name: { ko: "면력한방병원 성동점", en: "Immune Hospital Seongdong", ru: "Иммунная Клиника Сондон", kz: "Иммунная Клиника Сондон", zh: "免疫医院 城东院", ja: "免疫病院 城東院" }, desc: { ko: "성동구 소재 성동 분원", en: "Seongdong branch in Seongdong-gu", ru: "Филиал Сондон в Сондон-гу", kz: "Сондон-гудағы Сондон филиалы", zh: "城东区城东分院", ja: "城東区の城東分院" }, img: "/immune/misc/banner-seongdong.jpg" },
  { slug: "ewha-seoul", badge: "university", name: { ko: "이대서울병원", en: "Ewha Seoul Hospital", ru: "Больница Ихва Сеул", kz: "Ихва Сеул ауруханасы", zh: "梨大首尔医院", ja: "梨大ソウル病院" }, desc: { ko: "서울 마곡 소재 최신 대학병원", en: "Modern university hospital in Magok, Seoul", ru: "Современная больница в Магоке", kz: "Магоктағы заманауи аурухана", zh: "首尔麻谷现代化大学医院", ja: "ソウル麻谷の最新大学病院" }, img: "/immune/facility/facility-healing-space-2.jpg" },
  { slug: "ewha-mokdong", badge: "university", name: { ko: "이대목동병원", en: "Ewha Mokdong Hospital", ru: "Больница Ихва Мокдон", kz: "Ихва Мокдон ауруханасы", zh: "梨大木洞医院", ja: "梨大木洞病院" }, desc: { ko: "이화여자대학교 의료원 목동", en: "Ewha Medical Center, Mokdong", ru: "Медицинский центр Ихва, Мокдон", kz: "Ихва медициналық орталығы, Мокдон", zh: "梨花医疗院木洞", ja: "梨花医療院木洞" }, img: "/immune/facility/facility-healing-space-3.jpg" },
  { slug: "korea-guro", badge: "university", name: { ko: "고려대 구로병원", en: "Korea Univ. Guro Hospital", ru: "Больница Куро", kz: "Куро ауруханасы", zh: "高丽大九老医院", ja: "高麗大九老病院" }, desc: { ko: "고려대학교 의과대학 부속", en: "Korea University College of Medicine", ru: "При медфакультете Корёского университета", kz: "Корё университеті медицина факультеті", zh: "高丽大学医学院附属", ja: "高麗大学医学部附属" }, img: "/immune/facility/facility-treatment-room-2.jpg" },
  { slug: "severance-sinchon", badge: "university", name: { ko: "신촌세브란스병원", en: "Severance Hospital", ru: "Больница Северанс", kz: "Северанс ауруханасы", zh: "世福兰斯医院", ja: "セブランス病院" }, desc: { ko: "연세대학교 세브란스병원 본원", en: "Yonsei University Severance Hospital", ru: "Больница Северанс университета Ёнсе", kz: "Ёнсе университетінің Северанс ауруханасы", zh: "延世大学世福兰斯本院", ja: "延世大学セブランス本院" }, img: "/immune/facility/facility-vip-room-1.jpg" },
];

const TESTIMONIALS_DATA = [
  { text: { ko: "카자흐스탄에서 위암 진단을 받고 막막했는데, HEALO를 통해 한국 전문의와 상담하고 치료 계획을 세울 수 있었습니다. 러시아어 통역이 실시간으로 되어서 정말 편했어요.", en: "I was diagnosed with stomach cancer in Kazakhstan and felt lost. Through HEALO, I consulted with a Korean specialist and planned my treatment. The real-time Russian interpretation made everything so easy.", ru: "Мне диагностировали рак желудка в Казахстане. Через HEALO я проконсультировался с корейским специалистом. Синхронный перевод на русский сделал всё простым.", kz: "Қазақстанда асқазан обыры диагнозы қойылды, не істерімді білмедім. HEALO арқылы кореялық маманмен кеңестім.", zh: "在哈萨克斯坦被诊断出胃癌时很迷茫。通过HEALO咨询了韩国专家，实时俄语翻译让一切变得简单。", ja: "カザフスタンで胃がんと診断され途方に暮れていましたが、HEALOで韓国の専門医に相談できました。" }, author: { ko: "A.K. / 카자흐스탄 / 위암", en: "A.K. / Kazakhstan / Stomach Cancer", ru: "А.К. / Казахстан / Рак желудка", kz: "А.К. / Қазақстан / Асқазан обыры", zh: "A.K. / 哈萨克斯坦 / 胃癌", ja: "A.K. / カザフスタン / 胃がん" } },
  { text: { ko: "유방암 수술 후 면력한방병원에서 한방 면역치료를 병행했더니 항암 부작용이 확실히 줄었습니다. 원스톱으로 연결해주니 정말 편리했어요.", en: "After breast cancer surgery, I combined Korean Medicine immunotherapy at Immune Hospital. The side effects from chemo were noticeably reduced. The one-stop connection was so convenient.", ru: "После операции по раку молочной железы я совместила иммунотерапию в Иммуногоспитале. Побочные эффекты химиотерапии заметно уменьшились.", kz: "Сүт безі обырынан кейін Иммунная Клиникаде иммунотерапияны біріктірдім. Химиотерапия жанама әсерлері байқаларлықтай азайды.", zh: "乳腺癌手术后在免疫医院配合韩方免疫治疗，化疗副作用明显减少。一站式连接非常方便。", ja: "乳がん手術後、免疫病院で韓方免疫治療を併用したら副作用が明らかに減りました。" }, author: { ko: "M.S. / 러시아 / 유방암", en: "M.S. / Russia / Breast Cancer", ru: "М.С. / Россия / Рак молочной железы", kz: "М.С. / Ресей / Сүт безі обыры", zh: "M.S. / 俄罗斯 / 乳腺癌", ja: "M.S. / ロシア / 乳がん" } },
  { text: { ko: "일본에서 간암 세컨드오피니언을 위해 이용했습니다. 화상으로 편하게 상담받고, 한국 치료 비용이 일본보다 훨씬 합리적이라는 것도 알게 되었어요.", en: "I used HEALO from Japan for a second opinion on liver cancer. The video consultation was very comfortable, and I learned that treatment costs in Korea are much more reasonable than in Japan.", ru: "Я обратился из Японии за вторым мнением по раку печени. Видеоконсультация была очень удобной.", kz: "Жапониядан бауыр обыры бойынша екінші пікір алу үшін HEALO-ны пайдаландым.", zh: "我从日本使用HEALO咨询肝癌第二意见。视频咨询很方便，了解到韩国的治疗费用比日本合理得多。", ja: "日本から肝がんのセカンドオピニオンで利用しました。ビデオ相談が快適で、費用も合理的でした。" }, author: { ko: "T.Y. / 일본 / 간암", en: "T.Y. / Japan / Liver Cancer", ru: "Т.Я. / Япония / Рак печени", kz: "Т.Я. / Жапония / Бауыр обыры", zh: "T.Y. / 日本 / 肝癌", ja: "T.Y. / 日本 / 肝がん" } },
];

const FAQ_DATA = {
  general: [
    { q: { ko: "HEALO는 어떤 서비스인가요?", en: "What is HEALO?", ru: "Что такое HEALO?", kz: "HEALO дегеніміз не?", zh: "HEALO是什么？", ja: "HEALOとは？" }, a: { ko: "HEALO는 해외 암환자가 한국 전문의와 원격 화상 사전상담을 받고, 한국 방문 치료 및 사후관리까지 원스톱으로 지원받을 수 있는 ICT 플랫폼입니다.", en: "HEALO is an ICT platform that enables international cancer patients to receive remote video pre-consultations with Korean specialists, with one-stop support from treatment to follow-up care.", ru: "HEALO — это ИКТ-платформа для дистанционных видеоконсультаций с корейскими онкологами.", kz: "HEALO — кореялық мамандармен қашықтан бейне кеңес алуға арналған ICT платформасы.", zh: "HEALO是帮助海外癌症患者与韩国专家进行远程视频预咨询的ICT平台，提供从治疗到术后管理的一站式支持。", ja: "HEALOは海外がん患者が韓国の専門医とリモートビデオ事前相談を受け、治療からフォローアップまでワンストップで支援するICTプラットフォームです。" } },
    { q: { ko: "비용이 발생하나요?", en: "Is there any cost?", ru: "Это платно?", kz: "Ақылы ма?", zh: "需要费用吗？", ja: "費用はかかりますか？" }, a: { ko: "사전상담 접수와 전문의 매칭은 무료입니다. 실제 화상 상담 및 치료 비용은 별도이며, 상담 전 안내해드립니다.", en: "Intake submission and doctor matching are free. Video consultation and treatment costs are separate and will be communicated beforehand.", ru: "Подача заявки и подбор врача бесплатны. Стоимость консультации и лечения сообщается заранее.", kz: "Өтінім беру және дәрігер таңдау тегін. Кеңес және ем құны алдын ала хабарланады.", zh: "提交资料和医生匹配是免费的。视频咨询和治疗费用另计，会提前告知。", ja: "インテーク提出と医師マッチングは無料です。ビデオ相談・治療費用は別途、事前にご案内します。" } },
  ],
  consultation: [
    { q: { ko: "상담은 어떻게 진행되나요?", en: "How does the consultation work?", ru: "Как проходит консультация?", kz: "Кеңес қалай жүргізіледі?", zh: "咨询如何进行？", ja: "相談はどのように進みますか？" }, a: { ko: "인테이크 양식을 제출하면 24시간 이내에 최적의 전문의를 매칭합니다. 이후 화상 통화로 AI 실시간 통역과 함께 상담이 진행됩니다.", en: "After submitting your intake form, we match you with a specialist within 24 hours. The consultation is conducted via video call with AI real-time interpretation.", ru: "После подачи анкеты мы подберём специалиста в течение 24 часов. Консультация проходит по видеосвязи с ИИ-переводом.", kz: "Сауалнаманы жібергеннен кейін 24 сағат ішінде маман тағайындаймыз.", zh: "提交资料后24小时内匹配专家。咨询通过视频通话进行，配有AI实时翻译。", ja: "問診票提出後24時間以内に専門医をマッチング。AI通訳付きビデオ通話で相談が行われます。" } },
    { q: { ko: "어떤 언어로 상담할 수 있나요?", en: "What languages are supported?", ru: "На каких языках?", kz: "Қандай тілдерде?", zh: "支持哪些语言？", ja: "対応言語は？" }, a: { ko: "한국어, 영어, 러시아어, 중국어, 일본어, 카자흐어 총 6개 언어를 AI 실시간 통역으로 지원합니다.", en: "We support 6 languages: Korean, English, Russian, Chinese, Japanese, and Kazakh with AI real-time interpretation.", ru: "Мы поддерживаем 6 языков: корейский, английский, русский, китайский, японский и казахский.", kz: "6 тілді қолдаймыз: корей, ағылшын, орыс, қытай, жапон және қазақ.", zh: "支持6种语言：韩语、英语、俄语、中文、日语、哈萨克语，配有AI实时翻译。", ja: "韓国語・英語・ロシア語・中国語・日本語・カザフ語の6言語をAI通訳で対応します。" } },
  ],
  cost: [
    { q: { ko: "한국 치료비는 얼마나 드나요?", en: "How much does treatment in Korea cost?", ru: "Сколько стоит лечение в Корее?", kz: "Кореядағы ем қанша тұрады?", zh: "韩国治疗费用是多少？", ja: "韓国の治療費はいくらですか？" }, a: { ko: "일반적으로 미국 대비 1/3 수준이며, 암종과 치료 방법에 따라 다릅니다. 사전상담 시 예상 비용을 안내해드립니다.", en: "Generally about 1/3 of US costs, varying by cancer type and treatment. Estimated costs are provided during pre-consultation.", ru: "Обычно около 1/3 стоимости в США. Точная стоимость зависит от типа рака и лечения.", kz: "АҚШ құнының шамамен 1/3. Нақты құн рак түрі мен емге байланысты.", zh: "通常约为美国费用的1/3，具体取决于癌症类型和治疗方案。预咨询时会提供预估费用。", ja: "一般的に米国の約1/3で、がん種と治療法により異なります。事前相談時に概算費用をご案内します。" } },
    { q: { ko: "비자는 어떻게 준비하나요?", en: "How do I prepare my visa?", ru: "Как подготовить визу?", kz: "Визаны қалай дайындауға болады?", zh: "如何准备签证？", ja: "ビザはどう準備しますか？" }, a: { ko: "단기 치료는 C-3-3(의료관광) 비자, 장기 치료는 G-1-10 비자가 필요합니다. HEALO가 비자 유형 안내 및 필요 서류 체크리스트를 제공합니다.", en: "Short-term treatment requires a C-3-3 (medical tourism) visa, long-term requires G-1-10. HEALO provides visa type guidance and document checklists.", ru: "Краткосрочное лечение — виза C-3-3, долгосрочное — G-1-10. HEALO предоставляет рекомендации по визам.", kz: "Қысқа мерзімді ем — C-3-3 визасы, ұзақ мерзімді — G-1-10. HEALO виза бойынша кеңес береді.", zh: "短期治疗需要C-3-3（医疗旅游）签证，长期治疗需要G-1-10签证。HEALO提供签证类型指南和文件清单。", ja: "短期治療はC-3-3（医療観光）ビザ、長期はG-1-10ビザが必要です。HEALOがビザ案内と必要書類チェックリストを提供します。" } },
  ],
};

/* ═══════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════ */
export default function HomeClient() {
  const router = useRouter();
  const [lang, setLang] = useState("en");
  const [faqTab, setFaqTab] = useState("general");
  const [openFaq, setOpenFaq] = useState(null);
  useEffect(() => { setLang(getLangCodeFromCookie()); }, []);
  const l = (obj) => obj?.[lang] || obj?.["en"] || "";

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif", lineHeight: "1.65" }}>

      {/* ══════════════════════════════════════════
          HERO — 풀블리드 실사 이미지 + 오버레이
          ══════════════════════════════════════════ */}
      <section className="relative text-white overflow-hidden" style={{ minHeight: "88vh", display: "flex", alignItems: "center" }}>
        {/* 실사 배경 이미지 */}
        <div className="absolute inset-0">
          <img
            src={IMAGES.heroBg}
            alt=""
            className="w-full h-full object-cover"
            style={{ objectPosition: "center 30%" }}
          />
          {/* Airbnb식 오버레이 — 너무 어둡지 않게 */}
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.38)" }} />
        </div>

        <div className="relative w-full max-w-6xl mx-auto px-6 md:px-8 py-20 md:py-28">
          <div className="max-w-2xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full text-sm font-medium"
              style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.25)", color: "#fff" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#2dd4bf", display: "inline-block", flexShrink: 0 }} />
              {l(L.hero.badge)}
            </div>

            {/* 제목 — 자연스럽게 wrap, 강제 br 없음 */}
            <h1 style={{ fontSize: "clamp(2rem, 4.5vw, 3.25rem)", fontWeight: 800, lineHeight: 1.2, marginBottom: "1.25rem", letterSpacing: "-0.02em" }}>
              {l(L.hero.title)}
            </h1>

            <p style={{ fontSize: "clamp(1rem, 1.5vw, 1.125rem)", color: "rgba(255,255,255,0.85)", marginBottom: "2.5rem", lineHeight: 1.7, maxWidth: "36rem" }}>
              {l(L.hero.subtitle)}
            </p>

            {/* CTA 버튼 — Airbnb식 충분한 패딩 */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => router.push("/intake")}
                className="group inline-flex items-center justify-center gap-2 font-bold transition-all duration-200"
                style={{ background: "#0d9488", color: "#fff", padding: "18px 36px", borderRadius: 12, fontSize: "1.0625rem", boxShadow: "0 8px 24px rgba(13,148,136,0.35)" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#0f766e"; e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(13,148,136,0.45)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#0d9488"; e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 8px 24px rgba(13,148,136,0.35)"; }}
              >
                {l(L.hero.cta)}
                <ArrowRight size={18} />
              </button>
              <button
                onClick={() => router.push("/telemedicine")}
                className="inline-flex items-center justify-center gap-2 font-medium transition-all duration-200"
                style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", padding: "18px 28px", borderRadius: 12, fontSize: "1rem" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.2)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; }}
              >
                {l(L.hero.telemedicine)}
              </button>
            </div>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.8125rem", marginTop: "1rem" }}>{l(L.hero.ctaSub)}</p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          원격협진 USP — 히어로 바로 아래 전면 배치
          ══════════════════════════════════════════ */}
      <section style={{ background: "#f0fdfa", padding: "80px 0" }}>
        <div className="max-w-6xl mx-auto px-6 md:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* 텍스트 */}
            <div>
              <div className="inline-block px-3 py-1 rounded-full text-sm font-semibold mb-5"
                style={{ background: "#ccfbf1", color: "#0f766e" }}>
                {l(L.telemedicine.badge)}
              </div>
              <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2.25rem)", fontWeight: 800, color: "#0f172a", lineHeight: 1.3, marginBottom: "1rem" }}>
                {l(L.telemedicine.title)}
              </h2>
              <p style={{ color: "#475569", fontSize: "1rem", lineHeight: 1.7, marginBottom: "2rem" }}>
                {l(L.telemedicine.subtitle)}
              </p>
              <ul className="space-y-3" style={{ marginBottom: "2rem" }}>
                {L.telemedicine.points.map((pt, i) => (
                  <li key={i} className="flex items-center gap-3" style={{ fontSize: "0.9375rem", color: "#334155" }}>
                    <CheckCircle size={18} style={{ color: "#0d9488", flexShrink: 0 }} strokeWidth={2} />
                    {l(pt)}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => router.push("/intake")}
                className="inline-flex items-center gap-2 font-semibold transition-all duration-200"
                style={{ background: "#0d9488", color: "#fff", padding: "16px 28px", borderRadius: 10, fontSize: "0.9375rem" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#0f766e"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#0d9488"; e.currentTarget.style.transform = ""; }}
              >
                {l(L.telemedicine.cta)} <ArrowRight size={16} />
              </button>
            </div>
            {/* 이미지 */}
            <div style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 32px rgba(0,0,0,0.1)" }}>
              <img
                src="/immune/misc/hospital-visual.jpg"
                alt="원격협진"
                className="w-full h-full object-cover"
                style={{ height: 380 }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          STATS — 숫자 타이포 강조 (Airbnb)
          ══════════════════════════════════════════ */}
      <section style={{ background: "#fff", padding: "96px 0" }}>
        <div className="max-w-6xl mx-auto px-6 md:px-8">
          <div className="text-center" style={{ marginBottom: "3rem" }}>
            <h2 style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", fontWeight: 800, color: "#0f172a", marginBottom: "0.75rem" }}>
              {l(L.stats.title)}
            </h2>
            <p style={{ color: "#64748b", fontSize: "1rem", maxWidth: "36rem", margin: "0 auto" }}>{l(L.stats.subtitle)}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {L.stats.items.map((item, i) => (
              <div
                key={i}
                className="text-center transition-all duration-300"
                style={{ padding: "32px 24px", borderRadius: 16, background: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.04)" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)"; e.currentTarget.style.borderColor = "#99f6e4"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.04)"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
              >
                <div style={{ fontSize: "clamp(1.75rem, 3vw, 2.75rem)", fontWeight: 900, color: "#0d9488", lineHeight: 1.1, marginBottom: "0.75rem" }}>
                  {typeof item.value === "string" ? item.value : l(item.value)}
                </div>
                <div style={{ fontSize: "0.8125rem", color: "#64748b", fontWeight: 500, whiteSpace: "pre-line", lineHeight: 1.5 }}>{l(item.label)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          DOCTORS — 협력 의료진
          ══════════════════════════════════════════ */}
      <section style={{ background: "#f8fafc", padding: "96px 0" }}>
        <div className="max-w-6xl mx-auto px-6 md:px-8">
          <div className="text-center" style={{ marginBottom: "3rem" }}>
            <h2 style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", fontWeight: 800, color: "#0f172a", marginBottom: "0.75rem" }}>{l(L.doctors.title)}</h2>
            <p style={{ color: "#64748b", fontSize: "1rem", maxWidth: "36rem", margin: "0 auto" }}>{l(L.doctors.subtitle)}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {DOCTORS_DATA.map((doc, i) => (
              <div
                key={i}
                className="transition-all duration-300"
                style={{ background: "#fff", borderRadius: 16, overflow: "hidden", border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.04)", cursor: "default" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.1)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.04)"; }}
              >
                <div style={{ aspectRatio: "1/1", overflow: "hidden", background: "#f1f5f9" }}>
                  <img
                    src={doc.img}
                    alt={l(doc.name)}
                    className="w-full h-full object-cover transition-transform duration-500"
                    style={{ objectPosition: "top" }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.04)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ""; }}
                  />
                </div>
                <div style={{ padding: "1rem 1.25rem 1.25rem" }}>
                  <h3 style={{ fontWeight: 700, fontSize: "0.9375rem", color: "#0f172a", lineHeight: 1.3, marginBottom: "0.25rem" }}>{l(doc.name)}</h3>
                  <p style={{ color: "#0d9488", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.25rem", lineHeight: 1.4 }}>{l(doc.title)}</p>
                  <p style={{ color: "#94a3b8", fontSize: "0.75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l(doc.specialty)}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center" style={{ marginTop: "2.5rem" }}>
            <button
              onClick={() => router.push("/hospitals")}
              className="inline-flex items-center gap-1 font-semibold transition-colors"
              style={{ color: "#0d9488", fontSize: "0.9375rem" }}
              onMouseEnter={e => e.currentTarget.style.color = "#0f766e"}
              onMouseLeave={e => e.currentTarget.style.color = "#0d9488"}
            >
              {l(L.doctors.viewAll)} <ChevronRight size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SERVICES — 실사 이미지 썸네일 카드
          ══════════════════════════════════════════ */}
      <section style={{ background: "#fff", padding: "96px 0" }}>
        <div className="max-w-6xl mx-auto px-6 md:px-8">
          <div className="text-center" style={{ marginBottom: "3rem" }}>
            <h2 style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", fontWeight: 800, color: "#0f172a", marginBottom: "0.75rem" }}>{l(L.services.title)}</h2>
            <p style={{ color: "#64748b", fontSize: "1rem", maxWidth: "36rem", margin: "0 auto" }}>{l(L.services.subtitle)}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            {L.services.items.map((item, i) => (
              <div
                key={i}
                className="transition-all duration-300"
                style={{ background: "#fff", borderRadius: 16, overflow: "hidden", border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.04)" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.09)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.04)"; }}
              >
                {/* 실사 이미지 썸네일 */}
                <div style={{ height: 180, overflow: "hidden", background: "#f1f5f9" }}>
                  <img
                    src={IMAGES.serviceCards[i]}
                    alt={l(item.title)}
                    className="w-full h-full object-cover transition-transform duration-500"
                    onMouseEnter={e => e.currentTarget.style.transform = "scale(1.04)"}
                    onMouseLeave={e => e.currentTarget.style.transform = ""}
                  />
                </div>
                <div style={{ padding: "1.5rem 1.75rem" }}>
                  <h3 style={{ fontWeight: 700, fontSize: "1.0625rem", color: "#0f172a", marginBottom: "0.625rem" }}>{l(item.title)}</h3>
                  <p style={{ color: "#64748b", fontSize: "0.9375rem", lineHeight: 1.65 }}>{l(item.desc)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          PROCESS — 이용 절차 (스텝)
          ══════════════════════════════════════════ */}
      <section style={{ background: "#f8fafc", padding: "96px 0" }}>
        <div className="max-w-6xl mx-auto px-6 md:px-8">
          <h2 className="text-center" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", fontWeight: 800, color: "#0f172a", marginBottom: "3rem" }}>{l(L.process.title)}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {L.process.steps.map((step, i) => (
              <div key={i} className="relative flex flex-col items-center text-center">
                {i < 3 && (
                  <div className="hidden md:block absolute" style={{ top: 22, left: "calc(50% + 28px)", width: "calc(100% - 56px)", height: 2, background: "linear-gradient(90deg, #99f6e4 0%, #e2e8f0 100%)" }} />
                )}
                <div style={{ width: 52, height: 52, background: "#0d9488", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: "1.0625rem", marginBottom: "1rem", flexShrink: 0, position: "relative", zIndex: 1, boxShadow: "0 4px 16px rgba(13,148,136,0.25)" }}>
                  {step.num}
                </div>
                <h3 style={{ fontWeight: 700, fontSize: "0.9375rem", color: "#0f172a", marginBottom: "0.375rem" }}>{l(step.title)}</h3>
                <p style={{ color: "#94a3b8", fontSize: "0.8125rem", lineHeight: 1.55 }}>{l(step.desc)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CANCER TYPES — 이모지 + 이름
          ══════════════════════════════════════════ */}
      <section style={{ background: "#fff", padding: "96px 0" }}>
        <div className="max-w-6xl mx-auto px-6 md:px-8">
          <h2 className="text-center" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", fontWeight: 800, color: "#0f172a", marginBottom: "3rem" }}>{l(L.cancers.title)}</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-4">
            {L.cancers.items.map((c, i) => (
              <div
                key={i}
                onClick={() => router.push("/treatments")}
                className="transition-all duration-300"
                style={{ background: "#fff", borderRadius: 14, padding: "1.25rem 0.75rem", textAlign: "center", cursor: "pointer", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.09)"; e.currentTarget.style.borderColor = "#99f6e4"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
              >
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>{c.emoji}</div>
                <div style={{ fontWeight: 700, fontSize: "0.8125rem", color: "#1e293b", marginBottom: "0.25rem" }}>{l(c.label)}</div>
                <div style={{ fontSize: "0.6875rem", color: "#0d9488", fontWeight: 600, lineHeight: 1.4 }}>{l(c.stat)}</div>
              </div>
            ))}
          </div>
          <div className="text-center" style={{ marginTop: "2.5rem" }}>
            <button
              onClick={() => router.push("/treatments")}
              className="inline-flex items-center gap-1 font-semibold transition-colors"
              style={{ color: "#0d9488", fontSize: "0.9375rem" }}
              onMouseEnter={e => e.currentTarget.style.color = "#0f766e"}
              onMouseLeave={e => e.currentTarget.style.color = "#0d9488"}
            >
              {l(L.misc.viewTreatments)} <ChevronRight size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          PARTNER HOSPITALS — 실사 이미지 교체
          ══════════════════════════════════════════ */}
      <section style={{ background: "#f8fafc", padding: "96px 0" }}>
        <div className="max-w-6xl mx-auto px-6 md:px-8">
          <div className="text-center" style={{ marginBottom: "3rem" }}>
            <h2 style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", fontWeight: 800, color: "#0f172a", marginBottom: "0.75rem" }}>{l(L.partners.title)}</h2>
            <p style={{ color: "#64748b", fontSize: "1rem", maxWidth: "36rem", margin: "0 auto" }}>{l(L.partners.subtitle)}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
            {PARTNERS_DATA.map((h, i) => {
              const isPartner = h.badge === "partner";
              return (
                <div
                  key={i}
                  onClick={() => router.push(`/hospitals/${h.slug}`)}
                  className="transition-all duration-300"
                  style={{ background: "#fff", borderRadius: 16, overflow: "hidden", border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.04)", cursor: "pointer" }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.1)"; e.currentTarget.style.borderColor = "#99f6e4"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.04)"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
                >
                  <div style={{ height: 140, overflow: "hidden", background: "#f1f5f9" }}>
                    <img
                      src={h.img}
                      alt={l(h.name)}
                      className="w-full h-full object-cover transition-transform duration-500"
                      onMouseEnter={e => e.currentTarget.style.transform = "scale(1.04)"}
                      onMouseLeave={e => e.currentTarget.style.transform = ""}
                    />
                  </div>
                  <div style={{ padding: "0.875rem 1rem 1rem" }}>
                    <div
                      style={{
                        display: "inline-block",
                        fontSize: "0.6875rem",
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: 999,
                        marginBottom: "0.5rem",
                        background: isPartner ? "#ccfbf1" : "#dbeafe",
                        color: isPartner ? "#0f766e" : "#1d4ed8",
                      }}
                    >
                      {isPartner ? l(L.misc.badgePartner) : l(L.misc.badgeUniversity)}
                    </div>
                    <h3 style={{ fontWeight: 700, fontSize: "0.8125rem", color: "#0f172a", lineHeight: 1.35, marginBottom: "0.25rem" }}>{l(h.name)}</h3>
                    <p className="hidden sm:block" style={{ color: "#94a3b8", fontSize: "0.75rem", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{l(h.desc)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          TESTIMONIALS
          ══════════════════════════════════════════ */}
      <section style={{ background: "#fff", padding: "96px 0" }}>
        <div className="max-w-6xl mx-auto px-6 md:px-8">
          <h2 className="text-center" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", fontWeight: 800, color: "#0f172a", marginBottom: "3rem" }}>{l(L.testimonials.title)}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {TESTIMONIALS_DATA.map((t, i) => (
              <div
                key={i}
                className="flex flex-col transition-all duration-300"
                style={{ background: "#f8fafc", borderRadius: 16, padding: "1.75rem", border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.04)" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.04)"; }}
              >
                <Quote size={22} strokeWidth={1.5} style={{ color: "#99f6e4", marginBottom: "1rem", flexShrink: 0 }} />
                <p style={{ color: "#475569", fontSize: "0.9375rem", lineHeight: 1.7, flex: 1 }}>{l(t.text)}</p>
                <div style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid #e2e8f0" }}>
                  <div className="flex items-center gap-3">
                    <div style={{ width: 40, height: 40, background: "linear-gradient(135deg, #0d9488 0%, #059669 100%)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "0.9375rem", flexShrink: 0 }}>
                      {l(t.author).charAt(0)}
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: "0.875rem", color: "#1e293b" }}>{l(t.author)}</p>
                      <div className="flex gap-0.5" style={{ marginTop: 2 }}>
                        {[...Array(5)].map((_, j) => <Star key={j} size={11} fill="#f59e0b" style={{ color: "#f59e0b" }} />)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FAQ
          ══════════════════════════════════════════ */}
      <section style={{ background: "#f8fafc", padding: "96px 0" }}>
        <div style={{ maxWidth: "48rem", margin: "0 auto", padding: "0 1.5rem" }}>
          <h2 className="text-center" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", fontWeight: 800, color: "#0f172a", marginBottom: "2.5rem" }}>{l(L.faq.title)}</h2>
          {/* Tabs */}
          <div className="flex justify-center gap-2" style={{ marginBottom: "2rem" }}>
            {Object.entries(L.faq.tabs).map(([key, label]) => (
              <button
                key={key}
                onClick={() => { setFaqTab(key); setOpenFaq(null); }}
                style={{
                  padding: "8px 20px",
                  borderRadius: 999,
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  transition: "all 0.15s",
                  background: faqTab === key ? "#0d9488" : "#fff",
                  color: faqTab === key ? "#fff" : "#64748b",
                  border: faqTab === key ? "1px solid #0d9488" : "1px solid #e2e8f0",
                  boxShadow: faqTab === key ? "0 4px 12px rgba(13,148,136,0.2)" : "none",
                  cursor: "pointer",
                }}
              >
                {l(label)}
              </button>
            ))}
          </div>
          {/* Accordion */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {FAQ_DATA[faqTab]?.map((item, i) => {
              const isOpen = openFaq === `${faqTab}-${i}`;
              return (
                <div key={i} style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : `${faqTab}-${i}`)}
                    className="w-full flex items-center justify-between text-left"
                    style={{ padding: "1.125rem 1.25rem", background: "transparent", cursor: "pointer", border: "none" }}
                  >
                    <span style={{ fontWeight: 600, color: "#1e293b", fontSize: "0.9375rem", paddingRight: "1rem" }}>{l(item.q)}</span>
                    <ChevronDown size={18} style={{ color: "#94a3b8", flexShrink: 0, transform: isOpen ? "rotate(180deg)" : "", transition: "transform 0.3s" }} />
                  </button>
                  <div style={{ maxHeight: isOpen ? "20rem" : 0, overflow: "hidden", transition: "max-height 0.3s ease", opacity: isOpen ? 1 : 0 }}>
                    <div style={{ padding: "0 1.25rem 1.25rem", color: "#64748b", fontSize: "0.9375rem", lineHeight: 1.7 }}>{l(item.a)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          EMERGENCY CTA
          ══════════════════════════════════════════ */}
      <section style={{ background: "#fff", padding: "80px 0" }}>
        <div style={{ maxWidth: "52rem", margin: "0 auto", padding: "0 1.5rem" }}>
          <div style={{ background: "#fff7ed", borderRadius: 20, padding: "2.5rem 2rem", border: "1px solid #fed7aa" }}>
            <div className="text-center">
              <div className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full text-sm font-semibold"
                style={{ background: "#fee2e2", color: "#b91c1c" }}>
                <Phone size={12} strokeWidth={2} />
                24/7
              </div>
              <h2 style={{ fontSize: "clamp(1.25rem, 2.5vw, 1.875rem)", fontWeight: 800, color: "#0f172a", marginBottom: "0.625rem" }}>{l(L.emergency.title)}</h2>
              <p style={{ color: "#64748b", fontSize: "0.9375rem", marginBottom: "2rem" }}>{l(L.emergency.subtitle)}</p>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <a
                  href="mailto:contact@healo.kr"
                  className="inline-flex items-center justify-center gap-2 font-medium transition-all"
                  style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 24px", color: "#334155", fontSize: "0.9375rem", textDecoration: "none" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#99f6e4"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.06)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  <Mail size={16} style={{ color: "#0d9488" }} strokeWidth={1.5} />
                  contact@healo.kr
                </a>
                <button
                  onClick={() => router.push("/inquiry")}
                  className="inline-flex items-center justify-center gap-2 font-medium transition-all"
                  style={{ background: "#0d9488", color: "#fff", borderRadius: 10, padding: "14px 24px", fontSize: "0.9375rem", border: "none", cursor: "pointer", boxShadow: "0 4px 16px rgba(13,148,136,0.25)" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#0f766e"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#0d9488"; }}
                >
                  <MessageCircle size={16} strokeWidth={1.5} />
                  {l(L.misc.onlineInquiry)}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          BOTTOM CTA — 히어로와 문구 차별화
          ══════════════════════════════════════════ */}
      <section className="relative overflow-hidden text-white" style={{ background: "linear-gradient(135deg, #0f172a 0%, #134e4a 50%, #0f172a 100%)", padding: "112px 0" }}>
        <div className="absolute inset-0 pointer-events-none">
          <div style={{ position: "absolute", top: 0, right: 0, width: 400, height: 400, background: "rgba(13,148,136,0.08)", borderRadius: "50%", filter: "blur(80px)" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, width: 300, height: 300, background: "rgba(5,150,105,0.07)", borderRadius: "50%", filter: "blur(60px)" }} />
        </div>
        <div className="relative max-w-2xl mx-auto px-6 text-center">
          <h2 style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", fontWeight: 800, marginBottom: "1rem", lineHeight: 1.3 }}>{l(L.bottomCta.title)}</h2>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "1rem", lineHeight: 1.7, marginBottom: "2.5rem" }}>{l(L.bottomCta.desc)}</p>
          {/* 두 버튼 — 히어로와 문구 차별화 */}
          <div className="flex flex-col sm:flex-row justify-center gap-3" style={{ marginBottom: "2.5rem" }}>
            <button
              onClick={() => router.push("/intake")}
              className="inline-flex items-center justify-center gap-2 font-bold transition-all duration-200"
              style={{ background: "#0d9488", color: "#fff", padding: "18px 32px", borderRadius: 12, fontSize: "1rem", boxShadow: "0 8px 24px rgba(13,148,136,0.35)", border: "none", cursor: "pointer" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#0f766e"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#0d9488"; e.currentTarget.style.transform = ""; }}
            >
              {l(L.hero.cta)} <ArrowRight size={17} />
            </button>
            <button
              onClick={() => router.push("/telemedicine")}
              className="inline-flex items-center justify-center gap-2 font-medium transition-all duration-200"
              style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.25)", color: "#fff", padding: "18px 28px", borderRadius: 12, fontSize: "0.9375rem", cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.18)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
            >
              {l(L.bottomCta.telemedicineCta)}
            </button>
          </div>
          {/* 체크 배지 */}
          <div className="flex flex-wrap justify-center gap-4 md:gap-8" style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.5)" }}>
            <span className="flex items-center gap-1.5"><CheckCircle size={13} strokeWidth={2} style={{ color: "#2dd4bf" }} />{l(L.bottomCta.free)}</span>
            <span className="flex items-center gap-1.5"><CheckCircle size={13} strokeWidth={2} style={{ color: "#2dd4bf" }} />{l(L.bottomCta.fast)}</span>
            <span className="flex items-center gap-1.5"><CheckCircle size={13} strokeWidth={2} style={{ color: "#2dd4bf" }} />{l(L.bottomCta.noObligation)}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
