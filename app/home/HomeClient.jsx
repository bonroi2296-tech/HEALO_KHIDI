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
  ChevronDown,
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
  Phone,
  MessageCircle,
  MapPin,
  Mail,
  GraduationCap,
  Quote,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════
   PLACEHOLDER IMAGES (Unsplash — free, no auth required)

   나중에 실제 사진으로 교체하세요:
   - 의사 사진: 400x400px 이상, 정사각형, 배경 깔끔
   - 병원 사진: 800x500px 이상, 건물 외관 또는 내부
   - 히어로 배경: 1920x1080px 이상
   ═══════════════════════════════════════════════════════ */
const PLACEHOLDER = {
  // 📸 히어로 배경 — 교체: 실제 병원 또는 한국 의료 이미지
  heroBg: "https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?w=1920&q=80",
  // 📸 의사 4명 — 교체: 실제 협력 의료진 프로필 사진 (400x400)
  doctors: [
    "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1594824476967-48c8b964ac31?w=400&h=400&fit=crop&crop=face",
  ],
  // 📸 병원 2곳 — 교체: 면력한방병원 + 협진 병원 사진 (800x500)
  hospitals: [
    "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&h=500&fit=crop",
  ],
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
    title: { ko: "왜 한국에서 암 치료인가요?", en: "Why Cancer Treatment in Korea?", ru: "Почему лечение рака в Корее?", kz: "Неге Кореяда рак емдеу?", zh: "为什么选择韩国治疗癌症？", ja: "なぜ韓国でがん治療？" },
    subtitle: { ko: "한국은 세계 최고 수준의 암 생존율과 최첨단 의료 기술을 보유하고 있습니다", en: "Korea leads the world in cancer survival rates and cutting-edge medical technology", ru: "Корея — мировой лидер по выживаемости при раке и передовым медицинским технологиям", kz: "Корея рак бойынша тірі қалу көрсеткіштері мен озық медициналық технологиялар бойынша әлем көшбасшысы", zh: "韩国在癌症生存率和尖端医疗技术方面处于世界领先地位", ja: "韓国はがん生存率と最先端医療技術で世界をリード" },
    items: [
      { value: "77.0%", label: { ko: "위암 5년 생존율\n(세계 1위)", en: "Stomach Cancer\n5-year Survival\n(World #1)", ru: "Рак желудка\n5-летняя выживаемость\n(№1 в мире)", kz: "Асқазан обыры\n5 жылдық тірі қалу\n(Әлемде №1)", zh: "胃癌5年生存率\n（世界第一）", ja: "胃がん5年生存率\n（世界1位）" } },
      { value: "3,000+", label: { ko: "연간 외국인 암환자\n한국 방문", en: "International Cancer\nPatients Visit\nKorea Annually", ru: "Иностранных\nонкопациентов\nежегодно", kz: "Жыл сайын Кореяға\nкелетін шетелдік\nонкопациенттер", zh: "每年访韩外国\n癌症患者", ja: "年間韓国訪問\n外国人がん患者" } },
      { value: "1/3", label: { ko: "미국 대비\n치료 비용", en: "Treatment Cost\nvs. United States", ru: "Стоимость лечения\nvs. США", kz: "АҚШ-қа қарағанда\nем құны", zh: "与美国相比\n治疗费用", ja: "米国比\n治療費用" } },
      { value: "Top 5", label: { ko: "OECD 의료\n품질 순위", en: "OECD Healthcare\nQuality Ranking", ru: "Рейтинг\nкачества ОЭСР", kz: "ЭЫДҰ денсаулық\nсақтау рейтингі", zh: "OECD医疗\n质量排名", ja: "OECD医療\n品質ランキング" } },
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
    title: { ko: "HEALO가 해드리는 일", en: "What HEALO Does For You", ru: "Что HEALO делает для вас", kz: "HEALO сіз үшін не істейді", zh: "HEALO为您做什么", ja: "HEALOがお手伝いすること" },
    subtitle: { ko: "한국 암 치료의 모든 과정을 원스톱으로 지원합니다", en: "One-stop support for every step of your cancer treatment journey in Korea", ru: "Комплексная поддержка на каждом этапе лечения рака в Корее", kz: "Кореядағы рак емдеу сапарыңыздың әр кезеңін толық қолдау", zh: "一站式支持您在韩国癌症治疗的每一步", ja: "韓国でのがん治療のすべてをワンストップでサポート" },
    items: [
      { icon: "Stethoscope", title: { ko: "전문의 원격 상담", en: "Remote Specialist Consultation", ru: "Удалённая консультация", kz: "Қашықтан кеңес", zh: "远程专家咨询", ja: "専門医リモート相談" }, desc: { ko: "한국 3대 암 병원 출신 전문의와 화상으로 먼저 상담.", en: "Video consultation with oncologists from Korea's top cancer hospitals.", ru: "Видеоконсультация с онкологами из ведущих больниц Кореи.", kz: "Кореяның жетекші аурухналарымен бейне кеңес.", zh: "与韩国顶级肿瘤医院的专家视频咨询。", ja: "韓国トップのがん病院の専門医とビデオ相談。" } },
      { icon: "Globe", title: { ko: "6개국어 AI 통역", en: "AI Interpretation in 6 Languages", ru: "ИИ-перевод на 6 языках", kz: "6 тілде AI аудармасы", zh: "6种语言AI翻译", ja: "6言語AI通訳" }, desc: { ko: "한·영·러·중·일·카자흐어 실시간 자동 통역.", en: "Real-time interpretation in Korean, English, Russian, Chinese, Japanese, Kazakh.", ru: "Синхронный перевод: корейский, английский, русский, китайский, японский, казахский.", kz: "Корей, ағылшын, орыс, қытай, жапон, қазақ тілдерінде аударма.", zh: "韩·英·俄·中·日·哈实时翻译。", ja: "韓·英·露·中·日·カザフ語リアルタイム通訳。" } },
      { icon: "Leaf", title: { ko: "양·한방 통합 케어", en: "Integrated East-West Care", ru: "Интегрированная помощь", kz: "Шығыс-Батыс кешенді көмек", zh: "中西医结合护理", ja: "洋・韓方統合ケア" }, desc: { ko: "수술·항암은 암 병원, 면역 관리는 면력한방병원에서.", en: "Surgery & chemo at partner hospitals. Immune support at Immunehospital.", ru: "Хирургия в партнёрских больницах. Иммунная поддержка в Иммуногоспитале.", kz: "Серіктес аурухналарда хирургия. Иммуногоспитальде қолдау.", zh: "在合作医院手术化疗，在免力韩方医院免疫管理。", ja: "手術・抗がんはがん病院、免疫管理は免力韓方病院。" } },
      { icon: "Heart", title: { ko: "사후관리 프로그램", en: "Post-treatment Follow-up", ru: "Послеоперационное наблюдение", kz: "Емнен кейінгі бақылау", zh: "术后跟踪管理", ja: "術後フォローアップ" }, desc: { ko: "귀국 후에도 증상 추적, 교육 콘텐츠, 재진 예약까지.", en: "Symptom tracking, education content, and follow-up scheduling after returning home.", ru: "Отслеживание симптомов и запись на повторный приём после возвращения.", kz: "Үйге оралғаннан кейін де бақылау және қайта қабылдау.", zh: "回国后症状追踪、教育内容和复诊预约。", ja: "帰国後も症状追跡、教育コンテンツ、再診予約。" } },
    ],
  },
  /* ── 프로세스 ── */
  process: {
    title: { ko: "이용 절차", en: "How It Works", ru: "Как это работает", kz: "Қалай жұмыс істейді", zh: "使用流程", ja: "ご利用の流れ" },
    steps: [
      { num: "01", title: { ko: "인테이크 작성", en: "Submit Intake", ru: "Заполните анкету", kz: "Сауалнама толтыру", zh: "填写资料", ja: "問診票記入" }, desc: { ko: "암종, 병기, 치료 이력 입력 (5분)", en: "Cancer type, stage, history (5 min)", ru: "Тип рака, стадия, история (5 мин)", kz: "Рак түрі, сатысы, тарихы (5 мин)", zh: "癌症类型、分期、病史（5分钟）", ja: "がん種、病期、治療歴（5分）" } },
      { num: "02", title: { ko: "전문의 매칭", en: "Doctor Matching", ru: "Подбор врача", kz: "Дәрігер таңдау", zh: "医生匹配", ja: "専門医マッチング" }, desc: { ko: "AI가 최적 전문의 추천 (24시간 이내)", en: "AI recommends the best specialist (within 24h)", ru: "ИИ подберёт лучшего специалиста (24ч)", kz: "AI ең жақсы маманды ұсынады (24 сағат)", zh: "AI推荐最佳专家（24小时内）", ja: "AI最適専門医推薦（24時間以内）" } },
      { num: "03", title: { ko: "화상 사전상담", en: "Video Consultation", ru: "Видеоконсультация", kz: "Бейне кеңес", zh: "视频咨询", ja: "ビデオ相談" }, desc: { ko: "실시간 AI 통역과 함께 상담", en: "Video call with real-time AI interpretation", ru: "Видеозвонок с ИИ-переводом", kz: "AI аудармамен бейне кеңес", zh: "配合AI翻译的视频通话", ja: "AI通訳付きビデオ相談" } },
      { num: "04", title: { ko: "치료 · 사후관리", en: "Treatment & Follow-up", ru: "Лечение и наблюдение", kz: "Ем және бақылау", zh: "治疗与随访", ja: "治療・フォローアップ" }, desc: { ko: "한국 방문 치료 + 귀국 후 관리", en: "Visit Korea for treatment + continued care", ru: "Лечение в Корее + наблюдение после", kz: "Кореяда ем + кейін бақылау", zh: "赴韩治疗 + 回国后管理", ja: "韓国治療 + 帰国後管理" } },
    ],
  },
  /* ── 암종 ── */
  cancers: {
    title: { ko: "주요 지원 암종", en: "Cancer Types We Support", ru: "Типы рака", kz: "Рак түрлері", zh: "支持的癌症类型", ja: "対応がん種" },
    items: [
      { emoji: "🫁", label: { ko: "위암", en: "Stomach", ru: "Желудок", kz: "Асқазан", zh: "胃癌", ja: "胃がん" }, stat: { ko: "5년 생존율 77%", en: "77% 5yr survival", ru: "77% выживаемость", kz: "77% тірі қалу", zh: "5年生存率77%", ja: "5年生存率77%" } },
      { emoji: "🩷", label: { ko: "유방암", en: "Breast", ru: "Молочная железа", kz: "Сүт безі", zh: "乳腺癌", ja: "乳がん" }, stat: { ko: "보존율 세계 최고", en: "Top conservation rate", ru: "Лучшая сохранность", kz: "Ең жоғары сақтау", zh: "保乳率世界最高", ja: "温存率世界最高" } },
      { emoji: "🫀", label: { ko: "간암", en: "Liver", ru: "Печень", kz: "Бауыр", zh: "肝癌", ja: "肝がん" }, stat: { ko: "간이식 세계 1위", en: "World #1 transplant", ru: "№1 трансплантация", kz: "Трансплантация №1", zh: "肝移植世界第一", ja: "肝移植世界1位" } },
      { emoji: "🌬️", label: { ko: "폐암", en: "Lung", ru: "Лёгкие", kz: "Өкпе", zh: "肺癌", ja: "肺がん" }, stat: { ko: "VATS 수술 선도", en: "VATS surgery leader", ru: "Лидер ВАТС", kz: "ВАТС көшбасшысы", zh: "VATS手术领先", ja: "VATS手術リーダー" } },
      { emoji: "🦋", label: { ko: "갑상선암", en: "Thyroid", ru: "Щитовидная железа", kz: "Қалқанша без", zh: "甲状腺癌", ja: "甲状腺がん" }, stat: { ko: "생존율 100% 근접", en: "Near 100% survival", ru: "~100% выживаемость", kz: "~100% тірі қалу", zh: "生存率接近100%", ja: "生存率ほぼ100%" } },
      { emoji: "🎗️", label: { ko: "대장암", en: "Colorectal", ru: "Толстая кишка", kz: "Тоқ ішек", zh: "大肠癌", ja: "大腸がん" }, stat: { ko: "복강경 세계 최다", en: "Most laparoscopic", ru: "Больше всего лапароскопий", kz: "Ең көп лапароскопия", zh: "腹腔镜最多", ja: "腹腔鏡最多" } },
    ],
  },
  /* ── 파트너 병원 ── */
  partners: {
    title: { ko: "검증된 파트너 의료기관", en: "Our Verified Care Network", ru: "Наша проверенная сеть", kz: "Біздің тексерілген желі", zh: "我们的认证医疗网络", ja: "認定パートナー医療機関" },
    subtitle: { ko: "엄격한 기준으로 선별된 한국 최고의 암 전문 의료기관과 함께합니다", en: "Carefully vetted partner hospitals meeting the highest clinical standards", ru: "Тщательно проверенные партнёрские больницы высших клинических стандартов", kz: "Жоғары клиникалық стандарттарға сай серіктес аурухналар", zh: "经过严格筛选的顶级合作医疗机构", ja: "厳格な基準で選ばれたパートナー医療機関" },
  },
  /* ── 환자 후기 ── */
  testimonials: {
    title: { ko: "환자 후기", en: "Patient Stories", ru: "Истории пациентов", kz: "Пациент тарихтары", zh: "患者故事", ja: "患者さんの声" },
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
    desc: { ko: "인테이크 제출 후 24시간 이내에 최적의 전문의를 매칭해드립니다.\n상담 비용은 무료이며, 치료 결정은 언제든 자유입니다.", en: "We'll match you with the best specialist within 24 hours.\nConsultation is free, and you're never obligated to proceed.", ru: "Мы подберём лучшего специалиста в течение 24 часов.\nКонсультация бесплатна, решение за вами.", kz: "24 сағат ішінде ең жақсы маманды тағайындаймыз.\nКеңес тегін, шешім сізде.", zh: "提交后24小时内匹配最佳专家。\n咨询免费，决定权在您。", ja: "24時間以内に最適な専門医をマッチング。\n相談無料、決定はご自由に。" },
  },
};

const ICON_MAP = { FileText, Shield, Video, Heart, Globe, Clock, Leaf, Stethoscope, Award, Users, Building2, CheckCircle, Star, TrendingUp, Lock, Headphones };

/* ═══════════════════════════════════════════════════════
   PLACEHOLDER DATA — 실제 데이터로 교체 필요

   📋 병원에 요청할 것:
   1. 의사 4명의 프로필 사진 + 이름 + 직함 + 전공 + 경력
   2. 면력한방병원 로고 이미지 (PNG, 투명 배경)
   3. 협진 병원 로고 이미지 (PNG, 투명 배경)
   4. 병원 외관/내부 사진 2-3장
   5. 환자 후기 (익명 가능) 2-3건
   ═══════════════════════════════════════════════════════ */

// 📸 교체 대상: 의사 정보 — 실제 의료진 이름·직함·전공으로 교체
const DOCTORS_DATA = [
  { name: { ko: "김OO 교수", en: "Prof. Kim", ru: "Проф. Ким", kz: "Проф. Ким", zh: "金教授", ja: "金教授" }, title: { ko: "종양내과 전문의", en: "Medical Oncologist", ru: "Онколог-терапевт", kz: "Онколог-терапевт", zh: "肿瘤内科专家", ja: "腫瘍内科専門医" }, specialty: { ko: "위암 · 대장암", en: "Stomach · Colorectal", ru: "Желудок · Толстая кишка", kz: "Асқазан · Тоқ ішек", zh: "胃癌 · 大肠癌", ja: "胃がん · 大腸がん" }, exp: "20+", img: PLACEHOLDER.doctors[0] },
  { name: { ko: "박OO 원장", en: "Dr. Park", ru: "Д-р Пак", kz: "Д-р Пак", zh: "朴院长", ja: "朴院長" }, title: { ko: "한방면역치료 전문", en: "Korean Medicine Immunotherapy", ru: "Иммунотерапия корейской медицины", kz: "Корей медицинасы иммунотерапиясы", zh: "韩方免疫治疗", ja: "韓方免疫治療" }, specialty: { ko: "면역 강화 · 부작용 관리", en: "Immune Support · Side Effects", ru: "Иммунная поддержка", kz: "Иммундық қолдау", zh: "免疫增强 · 副作用管理", ja: "免疫強化 · 副作用管理" }, exp: "15+", img: PLACEHOLDER.doctors[1] },
  { name: { ko: "이OO 교수", en: "Prof. Lee", ru: "Проф. Ли", kz: "Проф. Ли", zh: "李教授", ja: "李教授" }, title: { ko: "외과 전문의", en: "Surgical Oncologist", ru: "Хирург-онколог", kz: "Хирург-онколог", zh: "肿瘤外科专家", ja: "外科腫瘍専門医" }, specialty: { ko: "간암 · 유방암", en: "Liver · Breast", ru: "Печень · Молочная железа", kz: "Бауыр · Сүт безі", zh: "肝癌 · 乳腺癌", ja: "肝がん · 乳がん" }, exp: "18+", img: PLACEHOLDER.doctors[2] },
  { name: { ko: "최OO 교수", en: "Prof. Choi", ru: "Проф. Чхве", kz: "Проф. Чхве", zh: "崔教授", ja: "崔教授" }, title: { ko: "방사선종양학과", en: "Radiation Oncologist", ru: "Радиолог-онколог", kz: "Радиолог-онколог", zh: "放射肿瘤科", ja: "放射線腫瘍科" }, specialty: { ko: "폐암 · 갑상선암", en: "Lung · Thyroid", ru: "Лёгкие · Щитовидная", kz: "Өкпе · Қалқанша", zh: "肺癌 · 甲状腺癌", ja: "肺がん · 甲状腺がん" }, exp: "22+", img: PLACEHOLDER.doctors[3] },
];

// 📸 교체 대상: 병원 정보 — 실제 병원 로고·사진·설명으로 교체
const PARTNERS_DATA = [
  { name: { ko: "면력한방병원", en: "Immunehospital", ru: "Иммуногоспиталь", kz: "Иммуногоспиталь", zh: "免力韩方医院", ja: "免力韓方病院" }, type: { ko: "컨소시엄 핵심 파트너", en: "Core Consortium Partner", ru: "Основной партнёр", kz: "Негізгі серіктес", zh: "核心联盟伙伴", ja: "コンソーシアム中核パートナー" }, desc: { ko: "한방 면역치료 전문 — 서울 강남·강서·부산 3개 지점", en: "Korean Medicine Immunotherapy — 3 branches in Seoul & Busan", ru: "Иммунотерапия корейской медицины — 3 филиала", kz: "Корей медицинасы иммунотерапиясы — 3 филиал", zh: "韩方免疫治疗 — 首尔江南·江西·釜山3个分院", ja: "韓方免疫治療 — ソウル江南·江西·釜山3支院" }, img: PLACEHOLDER.hospitals[0] },
  { name: { ko: "협력 암 전문 병원", en: "Partner Oncology Hospital", ru: "Партнёрская онкобольница", kz: "Серіктес онкоаурухана", zh: "合作肿瘤医院", ja: "協力がん専門病院" }, type: { ko: "협진 파트너", en: "Collaborative Partner", ru: "Партнёр по совместному лечению", kz: "Бірлескен ем серіктесі", zh: "协诊伙伴", ja: "協診パートナー" }, desc: { ko: "수술·항암·방사선 치료 — 다학제 암 치료 센터", en: "Surgery, chemo, radiation — Multidisciplinary Cancer Center", ru: "Хирургия, химиотерапия, радиация — Многопрофильный центр", kz: "Хирургия, химиотерапия, радиация — Көп бейінді орталық", zh: "手术·化疗·放疗 — 多学科肿瘤治疗中心", ja: "手術・抗がん・放射線 — 集学的がん治療センター" }, img: PLACEHOLDER.hospitals[1] },
];

// 📸 교체 대상: 환자 후기 — 실제 환자 리뷰로 교체 (익명 가능)
const TESTIMONIALS_DATA = [
  { text: { ko: "카자흐스탄에서 위암 진단을 받고 막막했는데, HEALO를 통해 한국 전문의와 상담하고 치료 계획을 세울 수 있었습니다. 러시아어 통역이 실시간으로 되어서 정말 편했어요.", en: "I was diagnosed with stomach cancer in Kazakhstan and felt lost. Through HEALO, I consulted with a Korean specialist and planned my treatment. The real-time Russian interpretation made everything so easy.", ru: "Мне диагностировали рак желудка в Казахстане, и я был в растерянности. Через HEALO я проконсультировался с корейским специалистом. Синхронный перевод на русский сделал всё простым.", kz: "Қазақстанда асқазан обыры диагнозы қойылды, не істерімді білмедім. HEALO арқылы кореялық маманмен кеңестім.", zh: "在哈萨克斯坦被诊断出胃癌时很迷茫。通过HEALO咨询了韩国专家，实时俄语翻译让一切变得简单。", ja: "カザフスタンで胃がんと診断され途方に暮れていましたが、HEALOで韓国の専門医に相談できました。" }, author: { ko: "A.K. / 카자흐스탄 / 위암", en: "A.K. / Kazakhstan / Stomach Cancer", ru: "А.К. / Казахстан / Рак желудка", kz: "А.К. / Қазақстан / Асқазан обыры", zh: "A.K. / 哈萨克斯坦 / 胃癌", ja: "A.K. / カザフスタン / 胃がん" } },
  { text: { ko: "유방암 수술 후 면력한방병원에서 한방 면역치료를 병행했더니 항암 부작용이 확실히 줄었습니다. 원스톱으로 연결해주니 정말 편리했어요.", en: "After breast cancer surgery, I combined Korean Medicine immunotherapy at Immunehospital. The side effects from chemo were noticeably reduced. The one-stop connection was so convenient.", ru: "После операции по раку молочной железы я совместила иммунотерапию в Иммуногоспитале. Побочные эффекты химиотерапии заметно уменьшились.", kz: "Сүт безі обырынан кейін Иммуногоспитальде иммунотерапияны біріктірдім. Химиотерапия жанама әсерлері байқаларлықтай азайды.", zh: "乳腺癌手术后在免力韩方医院配合韩方免疫治疗，化疗副作用明显减少。一站式连接非常方便。", ja: "乳がん手術後、免力韓方病院で韓方免疫治療を併用したら副作用が明らかに減りました。" }, author: { ko: "M.S. / 러시아 / 유방암", en: "M.S. / Russia / Breast Cancer", ru: "М.С. / Россия / Рак молочной железы", kz: "М.С. / Ресей / Сүт безі обыры", zh: "M.S. / 俄罗斯 / 乳腺癌", ja: "M.S. / ロシア / 乳がん" } },
  { text: { ko: "일본에서 간암 세컨드오피니언을 위해 이용했습니다. 화상으로 편하게 상담받고, 한국 치료 비용이 일본보다 훨씬 합리적이라는 것도 알게 되었어요.", en: "I used HEALO from Japan for a second opinion on liver cancer. The video consultation was very comfortable, and I learned that treatment costs in Korea are much more reasonable than in Japan.", ru: "Я обратился из Японии за вторым мнением по раку печени. Видеоконсультация была очень удобной.", kz: "Жапониядан бауыр обыры бойынша екінші пікір алу үшін HEALO-ны пайдаландым.", zh: "我从日本使用HEALO咨询肝癌第二意见。视频咨询很方便，了解到韩国的治疗费用比日本合理得多。", ja: "日本から肝がんのセカンドオピニオンで利用しました。ビデオ相談が快適で、韓国の治療費が日本より合理的だと分かりました。" }, author: { ko: "T.Y. / 일본 / 간암", en: "T.Y. / Japan / Liver Cancer", ru: "Т.Я. / Япония / Рак печени", kz: "Т.Я. / Жапония / Бауыр обыры", zh: "T.Y. / 日本 / 肝癌", ja: "T.Y. / 日本 / 肝がん" } },
];

// FAQ 데이터 (실제 내용 — 교체 불필요)
const FAQ_DATA = {
  general: [
    { q: { ko: "HEALO는 어떤 서비스인가요?", en: "What is HEALO?", ru: "Что такое HEALO?", kz: "HEALO дегеніміз не?", zh: "HEALO是什么？", ja: "HEALOとは？" }, a: { ko: "HEALO는 해외 암환자가 한국 전문의와 원격 화상 사전상담을 받고, 한국 방문 치료 및 사후관리까지 원스톱으로 지원받을 수 있는 ICT 플랫폼입니다.", en: "HEALO is an ICT platform that enables international cancer patients to receive remote video pre-consultations with Korean specialists, with one-stop support from treatment to follow-up care.", ru: "HEALO — это ИКТ-платформа для дистанционных видеоконсультаций с корейскими онкологами и комплексной поддержки от лечения до послеоперационного наблюдения.", kz: "HEALO — кореялық мамандармен қашықтан бейне кеңес алуға арналған ICT платформасы.", zh: "HEALO是帮助海外癌症患者与韩国专家进行远程视频预咨询的ICT平台，提供从治疗到术后管理的一站式支持。", ja: "HEALOは海外がん患者が韓国の専門医とリモートビデオ事前相談を受け、治療からフォローアップまでワンストップで支援するICTプラットフォームです。" } },
    { q: { ko: "비용이 발생하나요?", en: "Is there any cost?", ru: "Это платно?", kz: "Ақылы ма?", zh: "需要费用吗？", ja: "費用はかかりますか？" }, a: { ko: "사전상담 접수와 전문의 매칭은 무료입니다. 실제 화상 상담 및 치료 비용은 별도이며, 상담 전 안내해드립니다.", en: "Intake submission and doctor matching are free. Video consultation and treatment costs are separate and will be communicated beforehand.", ru: "Подача заявки и подбор врача бесплатны. Стоимость консультации и лечения сообщается заранее.", kz: "Өтінім беру және дәрігер таңдау тегін. Кеңес және ем құны алдын ала хабарланады.", zh: "提交资料和医生匹配是免费的。视频咨询和治疗费用另计，会提前告知。", ja: "インテーク提出と医師マッチングは無料です。ビデオ相談・治療費用は別途、事前にご案内します。" } },
  ],
  consultation: [
    { q: { ko: "상담은 어떻게 진행되나요?", en: "How does the consultation work?", ru: "Как проходит консультация?", kz: "Кеңес қалай жүргізіледі?", zh: "咨询如何进行？", ja: "相談はどのように進みますか？" }, a: { ko: "인테이크 양식을 제출하면 24시간 이내에 최적의 전문의를 매칭합니다. 이후 화상 통화로 AI 실시간 통역과 함께 상담이 진행됩니다.", en: "After submitting your intake form, we match you with a specialist within 24 hours. The consultation is conducted via video call with AI real-time interpretation.", ru: "После подачи анкеты мы подберём специалиста в течение 24 часов. Консультация проходит по видеосвязи с ИИ-переводом.", kz: "Сауалнаманы жібергеннен кейін 24 сағат ішінде маман тағайындаймыз. Кеңес AI аудармамен бейне байланыс арқылы жүргізіледі.", zh: "提交资料后24小时内匹配专家。咨询通过视频通话进行，配有AI实时翻译。", ja: "問診票提出後24時間以内に専門医をマッチング。AI通訳付きビデオ通話で相談が行われます。" } },
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
    <div className="min-h-screen bg-white">

      {/* ══════════════════════════════════════════
          HERO — 배경 이미지 + 오버레이
          ══════════════════════════════════════════ */}
      <section className="relative text-white overflow-hidden">
        {/* 📸 교체: 실제 병원/의료진 사진 (1920x1080 이상) */}
        <div className="absolute inset-0">
          <img src={PLACEHOLDER.heroBg} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-teal-900/90 to-slate-900/95" />
        </div>
        {/* Glow effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 py-20 md:py-32">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-teal-500/20 border border-teal-400/30 backdrop-blur-sm rounded-full px-5 py-2 text-sm font-medium mb-8">
              <Award size={16} className="text-teal-300" />
              <span className="text-teal-200">{l(L.hero.badge)}</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6 whitespace-pre-line tracking-tight">
              {l(L.hero.title)}
            </h1>
            <p className="text-base md:text-lg text-slate-300 mb-10 max-w-2xl mx-auto whitespace-pre-line leading-relaxed">
              {l(L.hero.subtitle)}
            </p>
            <button
              onClick={() => router.push("/intake")}
              className="group bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold text-lg px-10 py-5 rounded-2xl shadow-2xl shadow-teal-500/30 hover:shadow-teal-500/50 hover:scale-105 transition-all duration-300 inline-flex items-center gap-3"
            >
              {l(L.hero.cta)}
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="text-slate-400 text-sm mt-4">{l(L.hero.ctaSub)}</p>
            <div className="flex flex-wrap justify-center gap-2 mt-10">
              {["🇰🇷 한국어", "🇺🇸 English", "🇷🇺 Русский", "🇨🇳 中文", "🇯🇵 日本語", "🇰🇿 Қазақша"].map((t, i) => (
                <span key={i} className="text-xs bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5 text-slate-300 border border-white/10">{t}</span>
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
              <div key={i} className="text-center p-6 rounded-2xl bg-gradient-to-b from-teal-50 to-white border border-teal-100 hover:shadow-lg transition-shadow">
                <div className="text-4xl md:text-5xl font-black text-teal-600 mb-3">{item.value}</div>
                <div className="text-xs md:text-sm text-gray-500 font-medium whitespace-pre-line leading-relaxed">{l(item.label)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          DOCTORS — 협력 의료진
          📸 교체 방법: DOCTORS_DATA 배열에서 img, name, title, specialty 수정
          ══════════════════════════════════════════ */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">{l(L.doctors.title)}</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">{l(L.doctors.subtitle)}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {DOCTORS_DATA.map((doc, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                {/* 📸 의사 사진 — 400x400px 정사각형 권장 */}
                <div className="aspect-square overflow-hidden bg-gray-100">
                  <img
                    src={doc.img}
                    alt={l(doc.name)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-lg text-gray-900">{l(doc.name)}</h3>
                  <p className="text-teal-600 text-sm font-medium mt-1">{l(doc.title)}</p>
                  <p className="text-gray-400 text-xs mt-1">{l(doc.specialty)}</p>
                  <div className="flex items-center gap-1 mt-3">
                    <GraduationCap size={14} className="text-gray-400" />
                    <span className="text-xs text-gray-400">
                      {doc.exp} {lang === "ko" ? "년 경력" : "years exp."}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <button
              onClick={() => router.push("/hospitals")}
              className="text-teal-600 font-semibold text-sm hover:text-teal-700 inline-flex items-center gap-1 transition"
            >
              {l(L.doctors.viewAll)} <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SERVICES — What HEALO Does
          ══════════════════════════════════════════ */}
      <section className="bg-white py-20">
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
      <section className="bg-slate-50 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-extrabold text-center text-gray-900 mb-14">{l(L.process.title)}</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-4">
            {L.process.steps.map((step, i) => (
              <div key={i} className="relative flex md:flex-col items-start md:items-center gap-4 md:gap-0 md:text-center">
                {i < 3 && (
                  <div className="hidden md:block absolute top-6 left-[calc(50%+28px)] w-[calc(100%-56px)] h-0.5 bg-gradient-to-r from-teal-300 to-teal-100" />
                )}
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
      <section className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-extrabold text-center text-gray-900 mb-14">{l(L.cancers.title)}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {L.cancers.items.map((c, i) => (
              <div key={i} onClick={() => router.push("/treatments")} className="bg-white rounded-2xl p-5 text-center cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 group">
                <div className="text-4xl mb-3">{c.emoji}</div>
                <div className="font-bold text-sm text-gray-800 mb-1">{l(c.label)}</div>
                <div className="text-[11px] text-teal-600 font-semibold">{l(c.stat)}</div>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <button onClick={() => router.push("/treatments")} className="text-teal-600 font-semibold text-sm hover:text-teal-700 inline-flex items-center gap-1 transition">
              {lang === "ko" ? "암종별 상세 치료 안내 보기" : "View detailed treatment guides"} <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          PARTNER HOSPITALS
          📸 교체 방법: PARTNERS_DATA 배열에서 img, name, desc 수정
          ══════════════════════════════════════════ */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">{l(L.partners.title)}</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">{l(L.partners.subtitle)}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {PARTNERS_DATA.map((h, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                {/* 📸 병원 사진 — 800x500px 권장 */}
                <div className="h-56 overflow-hidden bg-gray-100">
                  <img src={h.img} alt={l(h.name)} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-6">
                  <div className="inline-block bg-teal-50 text-teal-700 text-xs font-semibold px-3 py-1 rounded-full mb-3">
                    {l(h.type)}
                  </div>
                  <h3 className="font-bold text-xl text-gray-900 mb-2">{l(h.name)}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{l(h.desc)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          TESTIMONIALS — 환자 후기
          📸 교체 방법: TESTIMONIALS_DATA 배열에서 text, author 수정
          ══════════════════════════════════════════ */}
      <section className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-extrabold text-center text-gray-900 mb-14">{l(L.testimonials.title)}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS_DATA.map((t, i) => (
              <div key={i} className="bg-gradient-to-b from-slate-50 to-white rounded-2xl p-7 border border-slate-100 flex flex-col">
                <Quote size={24} className="text-teal-200 mb-4" />
                <p className="text-gray-600 text-sm leading-relaxed flex-1">{l(t.text)}</p>
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-emerald-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {l(t.author).charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{l(t.author)}</p>
                      <div className="flex gap-0.5 mt-0.5">
                        {[...Array(5)].map((_, j) => <Star key={j} size={12} className="text-amber-400 fill-amber-400" />)}
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
          FAQ — 탭 + 아코디언
          ══════════════════════════════════════════ */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-extrabold text-center text-gray-900 mb-10">{l(L.faq.title)}</h2>

          {/* Tabs */}
          <div className="flex justify-center gap-2 mb-8">
            {Object.entries(L.faq.tabs).map(([key, label]) => (
              <button
                key={key}
                onClick={() => { setFaqTab(key); setOpenFaq(null); }}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                  faqTab === key
                    ? "bg-teal-600 text-white shadow-lg shadow-teal-500/20"
                    : "bg-white text-gray-500 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                {l(label)}
              </button>
            ))}
          </div>

          {/* Accordion */}
          <div className="space-y-3">
            {FAQ_DATA[faqTab]?.map((item, i) => {
              const isOpen = openFaq === `${faqTab}-${i}`;
              return (
                <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : `${faqTab}-${i}`)}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition"
                  >
                    <span className="font-semibold text-gray-800 text-sm pr-4">{l(item.q)}</span>
                    <ChevronDown size={18} className={`text-gray-400 shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ${isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
                    <div className="px-5 pb-5 text-gray-500 text-sm leading-relaxed">{l(item.a)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          EMERGENCY CTA — 즉시 상담
          ══════════════════════════════════════════ */}
      <section className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl p-8 md:p-10 border border-red-100">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-red-100 rounded-full px-4 py-1.5 text-red-600 text-sm font-semibold mb-4">
                <Phone size={14} />
                24/7
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-3">{l(L.emergency.title)}</h2>
              <p className="text-gray-500 mb-8">{l(L.emergency.subtitle)}</p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <a href="mailto:contact@healo.kr" className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 rounded-xl px-6 py-3 text-gray-700 font-medium hover:border-teal-300 hover:shadow-md transition-all">
                  <Mail size={18} className="text-teal-600" />
                  contact@healo.kr
                </a>
                <button
                  onClick={() => router.push("/inquiry")}
                  className="inline-flex items-center justify-center gap-2 bg-teal-600 text-white rounded-xl px-6 py-3 font-medium hover:bg-teal-700 transition-colors shadow-lg shadow-teal-600/20"
                >
                  <MessageCircle size={18} />
                  {lang === "ko" ? "온라인 문의" : "Online Inquiry"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          TRUST BADGES (compact)
          ══════════════════════════════════════════ */}
      <section className="bg-slate-50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {L.trust?.items?.map((item, i) => {
              const Icon = ICON_MAP[item.icon];
              return (
                <div key={i} className="flex items-start gap-4 bg-white rounded-xl p-6 border border-gray-100">
                  <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center shrink-0">
                    <Icon size={22} className="text-teal-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-gray-900 mb-1">{l(item.title)}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{l(item.desc)}</p>
                  </div>
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
        <div className="absolute inset-0 pointer-events-none">
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

/* ═══════════════════════════════════════════════════════
   📋 사진 교체 가이드 (병원에 전달용)

   1. 의사 프로필 사진 (4장)
      - 크기: 400x400px 이상, 정사각형
      - 배경: 깔끔한 단색 또는 병원 배경
      - 복장: 가운 착용 권장
      → DOCTORS_DATA[i].img 를 실제 URL로 교체

   2. 병원 사진 (2장)
      - 크기: 800x500px 이상
      - 내용: 건물 외관 또는 로비/진료실
      → PARTNERS_DATA[i].img 를 실제 URL로 교체

   3. 히어로 배경 (1장)
      - 크기: 1920x1080px 이상
      - 내용: 병원 내부 또는 의료진 단체사진
      → PLACEHOLDER.heroBg 를 실제 URL로 교체

   4. 병원 로고 (선택)
      - PNG 투명 배경, 200x80px 이상
      → 별도 로고 섹션 추가 가능
   ═══════════════════════════════════════════════════════ */
