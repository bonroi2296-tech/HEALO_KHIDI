"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getLangCodeFromCookie } from "../../src/lib/i18n";
import {
  ArrowRight,
  Shield,
  Video,
  FileText,
  Heart,
  Globe,
  Clock,
  ChevronRight,
  Leaf,
  Stethoscope,
  Award,
  Users,
  Building2,
  CheckCircle,
  Star,
  TrendingUp,
  Lock,
  Headphones,
} from "lucide-react";

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
      ko: "한국 최고의 암 전문의에게\n먼저 상담받으세요",
      en: "Get a Second Opinion from\nKorea's Top Oncologists",
      ru: "Получите второе мнение от\nлучших онкологов Кореи",
      kz: "Кореяның үздік онкологтарынан\nекінші пікір алыңыз",
      zh: "获取韩国顶级\n肿瘤专家的第二意见",
      ja: "韓国トップのがん専門医に\nセカンドオピニオンを",
    },
    subtitle: {
      ko: "AI 실시간 통역 · 화상 사전상담 · 한방 통합 케어까지\n한국 방문 전, 집에서 모든 것을 준비하세요",
      en: "AI real-time interpretation · Video pre-consultation · Integrated Korean Medicine care\nPrepare everything from home before visiting Korea",
      ru: "ИИ-перевод в реальном времени · Видеоконсультация · Интегрированная корейская медицина\nПодготовьтесь ко всему дома, до визита в Корею",
      kz: "AI нақты уақыттағы аударма · Бейне кеңес · Кешенді корей медицинасы\nКореяға келмей тұрып, үйден бәрін дайындаңыз",
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
    title: {
      ko: "왜 한국에서 암 치료인가요?",
      en: "Why Cancer Treatment in Korea?",
      ru: "Почему лечение рака в Корее?",
      kz: "Неге Кореяда рак емдеу?",
      zh: "为什么选择韩国治疗癌症？",
      ja: "なぜ韓国でがん治療？",
    },
    subtitle: {
      ko: "한국은 세계 최고 수준의 암 생존율과 최첨단 의료 기술을 보유하고 있습니다",
      en: "Korea leads the world in cancer survival rates and cutting-edge medical technology",
      ru: "Корея — мировой лидер по выживаемости при раке и передовым медицинским технологиям",
      kz: "Корея рак бойынша тірі қалу көрсеткіштері мен озық медициналық технологиялар бойынша әлем көшбасшысы",
      zh: "韩国在癌症生存率和尖端医疗技术方面处于世界领先地位",
      ja: "韓国はがん生存率と最先端医療技術で世界をリード",
    },
    items: [
      { value: "77.0%", label: { ko: "위암 5년 생존율\n(세계 1위)", en: "Stomach Cancer\n5-year Survival\n(World #1)", ru: "Рак желудка\n5-летняя выживаемость\n(№1 в мире)", kz: "Асқазан обыры\n5 жылдық тірі қалу\n(Әлемде №1)", zh: "胃癌5年生存率\n（世界第一）", ja: "胃がん5年生存率\n（世界1位）" } },
      { value: "3,000+", label: { ko: "연간 외국인 암환자\n한국 방문", en: "International Cancer\nPatients Visit\nKorea Annually", ru: "Иностранных\nонкопациентов в Корее\nежегодно", kz: "Жыл сайын Кореяға\nкелетін шетелдік\nонкологиялық науқастар", zh: "每年访韩外国\n癌症患者", ja: "年間韓国訪問\n外国人がん患者" } },
      { value: "1/3", label: { ko: "미국 대비\n치료 비용", en: "Treatment Cost\nvs. United States", ru: "Стоимость лечения\nvs. США", kz: "АҚШ-қа қарағанда\nем құны", zh: "与美国相比\n治疗费用", ja: "米国比\n治療費用" } },
      { value: "Top 5", label: { ko: "OECD 의료\n품질 순위", en: "OECD Healthcare\nQuality Ranking", ru: "Рейтинг\nкачества ОЭСР", kz: "ЭЫДҰ денсаулық\nсақтау рейтингі", zh: "OECD医疗\n质量排名", ja: "OECD医療\n品質ランキング" } },
    ],
  },
  services: {
    title: {
      ko: "HEALO가 해드리는 일",
      en: "What HEALO Does For You",
      ru: "Что HEALO делает для вас",
      kz: "HEALO сіз үшін не істейді",
      zh: "HEALO为您做什么",
      ja: "HEALOがお手伝いすること",
    },
    subtitle: {
      ko: "한국 암 치료의 모든 과정을 원스톱으로 지원합니다",
      en: "One-stop support for every step of your cancer treatment journey in Korea",
      ru: "Комплексная поддержка на каждом этапе лечения рака в Корее",
      kz: "Кореядағы рак емдеу сапарыңыздың әр кезеңін толық қолдау",
      zh: "一站式支持您在韩国癌症治疗的每一步",
      ja: "韓国でのがん治療のすべてのステップをワンストップでサポート",
    },
    items: [
      {
        icon: "Stethoscope",
        title: { ko: "전문의 원격 상담", en: "Remote Specialist Consultation", ru: "Удалённая консультация специалиста", kz: "Маманмен қашықтан кеңес", zh: "远程专家咨询", ja: "専門医リモート相談" },
        desc: { ko: "한국 3대 암 병원 출신 전문의와 화상으로 먼저 상담. 진단서 검토 · 치료 계획 수립 · 비용 안내까지.", en: "Video consultation with oncologists from Korea's top cancer hospitals. Medical record review, treatment planning, and cost guidance.", ru: "Видеоконсультация с онкологами из ведущих больниц Кореи. Обзор документов, планирование лечения и расчёт стоимости.", kz: "Кореяның жетекші онкологиялық аурухналарының дәрігерлерімен бейне кеңес.", zh: "与韩国顶级肿瘤医院的专家进行视频咨询。病历审查、治疗方案制定和费用指导。", ja: "韓国トップのがん病院の専門医とビデオ相談。診断書レビュー・治療計画・費用案内まで。" },
      },
      {
        icon: "Globe",
        title: { ko: "6개국어 AI 통역", en: "AI Interpretation in 6 Languages", ru: "ИИ-перевод на 6 языках", kz: "6 тілде AI аудармасы", zh: "6种语言AI翻译", ja: "6言語AI通訳" },
        desc: { ko: "한국어·영어·러시아어·중국어·일본어·카자흐어 실시간 자동 통역. 언어 장벽 없는 상담.", en: "Real-time automatic interpretation in Korean, English, Russian, Chinese, Japanese, and Kazakh. No language barriers.", ru: "Синхронный перевод: корейский, английский, русский, китайский, японский, казахский. Без языковых барьеров.", kz: "Корей, ағылшын, орыс, қытай, жапон, қазақ тілдерінде нақты уақыттағы аударма.", zh: "韩·英·俄·中·日·哈实时自动翻译。无语言障碍的咨询。", ja: "韓·英·露·中·日·カザフ語リアルタイム自動通訳。言語の壁のない相談。" },
      },
      {
        icon: "Leaf",
        title: { ko: "양·한방 통합 케어", en: "Integrated East-West Care", ru: "Интегрированная помощь Восток-Запад", kz: "Шығыс-Батыс кешенді көмек", zh: "中西医结合护理", ja: "洋・韓方統合ケア" },
        desc: { ko: "수술·항암은 협진 암 병원에서, 면역 강화·부작용 관리는 면력한방병원에서. 하나의 플랫폼으로 연결합니다.", en: "Surgery & chemo at partner oncology hospitals. Immune support & side-effect management at Immunehospital Korean Medicine. Connected through one platform.", ru: "Хирургия и химиотерапия в партнёрских больницах. Иммунная поддержка в Иммуногоспитале корейской медицины. Всё на одной платформе.", kz: "Серіктес аурухналарда хирургия мен химиотерапия. Иммуногоспитальде иммундық қолдау. Бір платформада.", zh: "在合作肿瘤医院进行手术和化疗。在免力韩方医院进行免疫增强和副作用管理。一个平台连接一切。", ja: "手術・抗がんは協診がん病院で、免疫強化・副作用管理は免力韓方病院で。ひとつのプラットフォームで連携。" },
      },
      {
        icon: "Heart",
        title: { ko: "사후관리 프로그램", en: "Post-treatment Follow-up", ru: "Послеоперационное наблюдение", kz: "Емнен кейінгі бақылау", zh: "术后跟踪管理", ja: "術後フォローアップ" },
        desc: { ko: "귀국 후에도 증상 추적, 맞춤 교육 콘텐츠, 재진 예약까지 지속적으로 관리합니다.", en: "Symptom tracking, personalized education content, and follow-up scheduling even after returning home.", ru: "Отслеживание симптомов, персонализированный контент и запись на повторный приём даже после возвращения домой.", kz: "Үйге оралғаннан кейін де симптомдарды бақылау, жеке білім беру мазмұны және қайта қабылдауға жазылу.", zh: "回国后仍可进行症状追踪、个性化教育内容和复诊预约。", ja: "帰国後も症状追跡、パーソナライズされた教育コンテンツ、再診予約まで継続管理。" },
      },
    ],
  },
  process: {
    title: {
      ko: "이용 절차",
      en: "How It Works",
      ru: "Как это работает",
      kz: "Қалай жұмыс істейді",
      zh: "使用流程",
      ja: "ご利用の流れ",
    },
    steps: [
      { num: "01", title: { ko: "인테이크 작성", en: "Submit Intake", ru: "Заполните анкету", kz: "Сауалнаманы толтырыңыз", zh: "填写资料", ja: "問診票記入" }, desc: { ko: "암종, 병기, 치료 이력 입력 (5분)", en: "Cancer type, stage, treatment history (5 min)", ru: "Тип рака, стадия, история лечения (5 мин)", kz: "Рак түрі, сатысы, ем тарихы (5 мин)", zh: "癌症类型、分期、治疗史（5分钟）", ja: "がん種、病期、治療歴を入力（5分）" } },
      { num: "02", title: { ko: "전문의 매칭", en: "Doctor Matching", ru: "Подбор врача", kz: "Дәрігер таңдау", zh: "医生匹配", ja: "専門医マッチング" }, desc: { ko: "AI가 최적의 전문의를 추천 (24시간 이내)", en: "AI recommends the best specialist (within 24h)", ru: "ИИ подберёт лучшего специалиста (в течение 24ч)", kz: "AI ең жақсы маманды ұсынады (24 сағат ішінде)", zh: "AI推荐最佳专家（24小时内）", ja: "AIが最適な専門医を推薦（24時間以内）" } },
      { num: "03", title: { ko: "화상 사전상담", en: "Video Consultation", ru: "Видеоконсультация", kz: "Бейне кеңес", zh: "视频咨询", ja: "ビデオ相談" }, desc: { ko: "실시간 AI 통역과 함께 화상 상담", en: "Video call with real-time AI interpretation", ru: "Видеозвонок с ИИ-переводом в реальном времени", kz: "Нақты уақыттағы AI аудармамен бейне кеңес", zh: "配合实时AI翻译的视频通话", ja: "リアルタイムAI通訳付きビデオ相談" } },
      { num: "04", title: { ko: "치료 · 사후관리", en: "Treatment & Follow-up", ru: "Лечение и наблюдение", kz: "Ем және бақылау", zh: "治疗与随访", ja: "治療・フォローアップ" }, desc: { ko: "한국 방문 치료 + 귀국 후 지속 관리", en: "Visit Korea for treatment + continued care after return", ru: "Лечение в Корее + наблюдение после возвращения", kz: "Кореяда ем + қайтқаннан кейін бақылау", zh: "赴韩治疗 + 回国后持续管理", ja: "韓国で治療 + 帰国後も継続管理" } },
    ],
  },
  cancers: {
    title: {
      ko: "주요 지원 암종",
      en: "Cancer Types We Support",
      ru: "Типы рака, с которыми мы работаем",
      kz: "Біз қолдайтын рак түрлері",
      zh: "我们支持的癌症类型",
      ja: "対応がん種",
    },
    items: [
      { emoji: "🫁", label: { ko: "위암", en: "Stomach", ru: "Желудок", kz: "Асқазан", zh: "胃癌", ja: "胃がん" }, stat: { ko: "5년 생존율 77%", en: "77% 5yr survival", ru: "77% выживаемость", kz: "77% тірі қалу", zh: "5年生存率77%", ja: "5年生存率77%" } },
      { emoji: "🩷", label: { ko: "유방암", en: "Breast", ru: "Молочная железа", kz: "Сүт безі", zh: "乳腺癌", ja: "乳がん" }, stat: { ko: "보존율 세계 최고", en: "Top conservation rate", ru: "Лучшая сохранность", kz: "Ең жоғары сақтау", zh: "保乳率世界最高", ja: "温存率世界最高" } },
      { emoji: "🫀", label: { ko: "간암", en: "Liver", ru: "Печень", kz: "Бауыр", zh: "肝癌", ja: "肝がん" }, stat: { ko: "간이식 세계 1위", en: "World #1 transplant", ru: "№1 по трансплантации", kz: "Трансплантация №1", zh: "肝移植世界第一", ja: "肝移植世界1位" } },
      { emoji: "🌬️", label: { ko: "폐암", en: "Lung", ru: "Лёгкие", kz: "Өкпе", zh: "肺癌", ja: "肺がん" }, stat: { ko: "VATS 수술 선도", en: "VATS surgery leader", ru: "Лидер ВАТС-хирургии", kz: "ВАТС хирургия көшбасшысы", zh: "VATS手术领先", ja: "VATS手術リーダー" } },
      { emoji: "🦋", label: { ko: "갑상선암", en: "Thyroid", ru: "Щитовидная железа", kz: "Қалқанша без", zh: "甲状腺癌", ja: "甲状腺がん" }, stat: { ko: "생존율 100% 근접", en: "Near 100% survival", ru: "~100% выживаемость", kz: "~100% тірі қалу", zh: "生存率接近100%", ja: "生存率ほぼ100%" } },
      { emoji: "🎗️", label: { ko: "대장암", en: "Colorectal", ru: "Толстая кишка", kz: "Тоқ ішек", zh: "大肠癌", ja: "大腸がん" }, stat: { ko: "복강경 세계 최다", en: "Most laparoscopic", ru: "Больше всего лапароскопий", kz: "Ең көп лапароскопия", zh: "腹腔镜手术最多", ja: "腹腔鏡手術世界最多" } },
    ],
  },
  trust: {
    title: {
      ko: "믿을 수 있는 이유",
      en: "Why You Can Trust HEALO",
      ru: "Почему можно доверять HEALO",
      kz: "HEALO-ға неге сенуге болады",
      zh: "值得信赖的理由",
      ja: "HEALOを信頼できる理由",
    },
    items: [
      {
        icon: "Award",
        title: { ko: "정부과제 선정", en: "Government-backed Project", ru: "Государственный проект", kz: "Мемлекеттік жоба", zh: "政府支持项目", ja: "政府プロジェクト選定" },
        desc: { ko: "한국보건산업진흥원(KHIDI) ICT 기반 외국인환자 지원사업 선정", en: "Selected for KHIDI's ICT-based Foreign Patient Support Program", ru: "Выбран для программы поддержки иностранных пациентов KHIDI", kz: "KHIDI шетелдік науқастарды қолдау бағдарламасына таңдалды", zh: "入选KHIDI ICT外国患者支援项目", ja: "KHIDI ICT基盤外国人患者支援事業に選定" },
      },
      {
        icon: "Lock",
        title: { ko: "의료 데이터 보호", en: "Medical Data Protection", ru: "Защита медицинских данных", kz: "Медициналық деректерді қорғау", zh: "医疗数据保护", ja: "医療データ保護" },
        desc: { ko: "AES-256 암호화, HIPAA 수준의 데이터 보안 적용", en: "AES-256 encryption, HIPAA-grade data security standards", ru: "Шифрование AES-256, стандарты безопасности уровня HIPAA", kz: "AES-256 шифрлау, HIPAA деңгейіндегі қауіпсіздік", zh: "AES-256加密，HIPAA级数据安全标准", ja: "AES-256暗号化、HIPAA水準のデータセキュリティ" },
      },
      {
        icon: "Building2",
        title: { ko: "검증된 의료기관", en: "Verified Medical Institutions", ru: "Проверенные медучреждения", kz: "Тексерілген медициналық мекемелер", zh: "经过验证的医疗机构", ja: "検証済み医療機関" },
        desc: { ko: "한국 주요 암 전문 병원과 면력한방병원 컨소시엄 연계", en: "Partnered with Korea's leading cancer hospitals and Immunehospital consortium", ru: "В партнёрстве с ведущими онкологическими больницами Кореи", kz: "Кореяның жетекші онкологиялық аурухналарымен серіктестік", zh: "与韩国领先的肿瘤医院和免力韩方医院联盟合作", ja: "韓国主要がん専門病院・免力韓方病院コンソーシアム連携" },
      },
    ],
  },
  bottomCta: {
    title: {
      ko: "지금 바로 시작하세요",
      en: "Start Your Journey Today",
      ru: "Начните свой путь сегодня",
      kz: "Бүгін сапарыңызды бастаңыз",
      zh: "今天就开始",
      ja: "今日から始めましょう",
    },
    desc: {
      ko: "인테이크 양식 제출 후 24시간 이내에 최적의 전문의를 매칭해드립니다.\n상담 비용은 무료이며, 치료 결정은 언제든 자유롭게 하실 수 있습니다.",
      en: "We'll match you with the best specialist within 24 hours of your intake submission.\nConsultation is free, and you're never obligated to proceed with treatment.",
      ru: "Мы подберём лучшего специалиста в течение 24 часов после подачи заявки.\nКонсультация бесплатна, и вы не обязаны соглашаться на лечение.",
      kz: "Өтінім бергеннен кейін 24 сағат ішінде ең жақсы маманды тағайындаймыз.\nКеңес тегін, емді қабылдау міндетті емес.",
      zh: "提交资料后24小时内为您匹配最佳专家。\n咨询完全免费，您可以自由决定是否接受治疗。",
      ja: "問診票提出後24時間以内に最適な専門医をマッチングします。\n相談は無料で、治療の決定はいつでも自由です。",
    },
  },
};

const ICON_MAP = { FileText, Shield, Video, Heart, Globe, Clock, Leaf, Stethoscope, Award, Users, Building2, CheckCircle, Star, TrendingUp, Lock, Headphones };

export default function HomeClient() {
  const router = useRouter();
  const [lang, setLang] = useState("en");
  useEffect(() => { setLang(getLangCodeFromCookie()); }, []);
  const l = (obj) => obj?.[lang] || obj?.["en"] || "";

  return (
    <div className="min-h-screen bg-white">

      {/* ══════════════════════════════════════════
          HERO
          ══════════════════════════════════════════ */}
      <section className="relative bg-gradient-to-br from-slate-900 via-teal-900 to-slate-900 text-white overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal-400/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 py-20 md:py-32">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-teal-500/20 border border-teal-400/30 backdrop-blur-sm rounded-full px-5 py-2 text-sm font-medium mb-8">
              <Award size={16} className="text-teal-300" />
              <span className="text-teal-200">{l(L.hero.badge)}</span>
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6 whitespace-pre-line tracking-tight">
              {l(L.hero.title)}
            </h1>

            {/* Subtitle */}
            <p className="text-base md:text-lg text-slate-300 mb-10 max-w-2xl mx-auto whitespace-pre-line leading-relaxed">
              {l(L.hero.subtitle)}
            </p>

            {/* CTA */}
            <button
              onClick={() => router.push("/intake")}
              className="group bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold text-lg px-10 py-5 rounded-2xl shadow-2xl shadow-teal-500/30 hover:shadow-teal-500/50 hover:scale-105 transition-all duration-300 inline-flex items-center gap-3"
            >
              {l(L.hero.cta)}
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="text-slate-400 text-sm mt-4">{l(L.hero.ctaSub)}</p>

            {/* Language badges */}
            <div className="flex flex-wrap justify-center gap-2 mt-10">
              {["🇰🇷 한국어", "🇺🇸 English", "🇷🇺 Русский", "🇨🇳 中文", "🇯🇵 日本語", "🇰🇿 Қазақша"].map((lang, i) => (
                <span key={i} className="text-xs bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5 text-slate-300 border border-white/10">
                  {lang}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          STATS — Why Korea?
          ══════════════════════════════════════════ */}
      <section className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">{l(L.stats.title)}</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">{l(L.stats.subtitle)}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {L.stats.items.map((item, i) => (
              <div key={i} className="text-center p-6 rounded-2xl bg-gradient-to-b from-teal-50 to-white border border-teal-100">
                <div className="text-4xl md:text-5xl font-black text-teal-600 mb-3">{item.value}</div>
                <div className="text-xs md:text-sm text-gray-500 font-medium whitespace-pre-line leading-relaxed">{l(item.label)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SERVICES — What HEALO Does
          ══════════════════════════════════════════ */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">{l(L.services.title)}</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">{l(L.services.subtitle)}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {L.services.items.map((item, i) => {
              const Icon = ICON_MAP[item.icon];
              const colors = [
                { bg: "bg-teal-100", icon: "text-teal-600", border: "border-teal-200" },
                { bg: "bg-blue-100", icon: "text-blue-600", border: "border-blue-200" },
                { bg: "bg-emerald-100", icon: "text-emerald-600", border: "border-emerald-200" },
                { bg: "bg-purple-100", icon: "text-purple-600", border: "border-purple-200" },
              ][i];
              return (
                <div key={i} className={`bg-white rounded-2xl p-7 border ${colors.border} hover:shadow-lg transition-shadow duration-300`}>
                  <div className={`w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center mb-5`}>
                    <Icon size={24} className={colors.icon} />
                  </div>
                  <h3 className="font-bold text-xl mb-3 text-gray-900">{l(item.title)}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{l(item.desc)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          PROCESS — How It Works
          ══════════════════════════════════════════ */}
      <section className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-extrabold text-center text-gray-900 mb-14">{l(L.process.title)}</h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-4">
            {L.process.steps.map((step, i) => (
              <div key={i} className="relative flex md:flex-col items-start md:items-center gap-4 md:gap-0 md:text-center">
                {/* Connector line (desktop) */}
                {i < 3 && (
                  <div className="hidden md:block absolute top-6 left-[calc(50%+28px)] w-[calc(100%-56px)] h-0.5 bg-gradient-to-r from-teal-300 to-teal-100" />
                )}

                {/* Number circle */}
                <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-2xl flex items-center justify-center text-white font-black text-lg md:mb-4 shrink-0 relative z-10 shadow-lg shadow-teal-500/20">
                  {step.num}
                </div>

                <div>
                  <h3 className="font-bold text-base md:text-lg text-gray-900 mb-1">{l(step.title)}</h3>
                  <p className="text-gray-400 text-sm">{l(step.desc)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CANCER TYPES
          ══════════════════════════════════════════ */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-extrabold text-center text-gray-900 mb-14">{l(L.cancers.title)}</h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {L.cancers.items.map((c, i) => (
              <div
                key={i}
                onClick={() => router.push("/treatments")}
                className="bg-white rounded-2xl p-5 text-center cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 group"
              >
                <div className="text-4xl mb-3">{c.emoji}</div>
                <div className="font-bold text-sm text-gray-800 mb-1">{l(c.label)}</div>
                <div className="text-[11px] text-teal-600 font-semibold">{l(c.stat)}</div>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <button
              onClick={() => router.push("/treatments")}
              className="text-teal-600 font-semibold text-sm hover:text-teal-700 inline-flex items-center gap-1 transition"
            >
              {lang === "ko" ? "암종별 상세 치료 안내 보기" : "View detailed treatment guides"} <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          TRUST
          ══════════════════════════════════════════ */}
      <section className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-extrabold text-center text-gray-900 mb-14">{l(L.trust.title)}</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {L.trust.items.map((item, i) => {
              const Icon = ICON_MAP[item.icon];
              return (
                <div key={i} className="bg-gradient-to-b from-slate-50 to-white rounded-2xl p-7 border border-slate-100 text-center">
                  <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                    <Icon size={24} className="text-slate-700" />
                  </div>
                  <h3 className="font-bold text-lg text-gray-900 mb-2">{l(item.title)}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{l(item.desc)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          BOTTOM CTA
          ══════════════════════════════════════════ */}
      <section className="relative bg-gradient-to-br from-slate-900 via-teal-900 to-slate-900 text-white py-24 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-teal-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-6">{l(L.bottomCta.title)}</h2>
          <p className="text-slate-300 text-base mb-10 whitespace-pre-line leading-relaxed">{l(L.bottomCta.desc)}</p>

          <button
            onClick={() => router.push("/intake")}
            className="group bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold text-lg px-10 py-5 rounded-2xl shadow-2xl shadow-teal-500/30 hover:shadow-teal-500/50 hover:scale-105 transition-all duration-300 inline-flex items-center gap-3"
          >
            {l(L.hero.cta)}
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>

          <div className="flex flex-wrap justify-center gap-6 mt-10 text-sm text-slate-400">
            <span className="flex items-center gap-1.5"><CheckCircle size={14} className="text-teal-400" />{lang === "ko" ? "무료 상담" : "Free consultation"}</span>
            <span className="flex items-center gap-1.5"><CheckCircle size={14} className="text-teal-400" />{lang === "ko" ? "24시간 내 응답" : "24h response"}</span>
            <span className="flex items-center gap-1.5"><CheckCircle size={14} className="text-teal-400" />{lang === "ko" ? "치료 강제 없음" : "No obligation"}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
