"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Plus, HeartPulse, Activity, Droplet, Wind, Stethoscope, Microscope, Calculator, FileText } from "lucide-react";

const CANCER_ICONS = {
  female: HeartPulse,
  digest: Activity,
  liver: Droplet,
  lung: Wind,
  thyroid: Stethoscope,
  etc: Microscope,
};
import { useLang } from "@/lib/i18n/LangContext";
import { t } from "@/lib/i18n";
import {
  CANCER_DETAILS,
  ITCRN_FRAMEWORK,
  CANCER_IMAGES,
  POST_SURGICAL_CARE,
  CANCER_FAQ,
} from "@/lib/data/immuneCancerDetails";
import { IMMUNE_THERAPIES } from "@/lib/data/immuneTherapies";

// ── 다국어 CTA 레이블 ────────────────────────────────────────────
const CTA = {
  ko: { consult: "원격 상담 신청", intake: "문의 신청", intakeShort: "문의 신청" },
  en: { consult: "Request a remote consultation", intake: "Submit an inquiry", intakeShort: "Inquiry" },
  ru: { consult: "Запросить онлайн-консультацию", intake: "Оставить заявку", intakeShort: "Заявка" },
  kz: { consult: "Қашықтан кеңес сұрау", intake: "Сұрау жіберу", intakeShort: "Сұрау" },
  ja: { consult: "オンライン相談を申し込む", intake: "お問い合わせ", intakeShort: "問い合わせ" },
  zh: { consult: "申请远程咨询", intake: "提交咨询", intakeShort: "咨询" },
};

// ── 비용·비자 안내 밴드 카피 (전환 의도: 가격·비자·이동) ─────────
// ⚠️ 카피 톤은 PO 검토 대상(초안). 가격 숫자는 하드코딩 금지 → /cost-calculator로 연결.
const COST_VISA = {
  ko: {
    eyebrow: "비용 · 비자 안내",
    title: "한국 치료, 비용과 비자를 미리 확인하세요",
    desc: "예상 치료 비용과 의료 비자 절차를 한눈에. 카자흐스탄·러시아·중앙아시아에서 오시는 분들을 위한 안내입니다.",
    costTitle: "예상 치료 비용", costSub: "비용 계산기로 바로 확인",
    visaTitle: "비자 · 입국 안내", visaSub: "의료 비자 절차 안내",
  },
  en: {
    eyebrow: "Cost & Visa",
    title: "Check costs and visa before traveling to Korea",
    desc: "See estimated treatment costs and the medical visa process at a glance — for patients coming from Kazakhstan, Russia and Central Asia.",
    costTitle: "Estimated treatment cost", costSub: "Open the cost calculator",
    visaTitle: "Visa & entry guide", visaSub: "Medical visa process",
  },
  ru: {
    eyebrow: "Стоимость и виза",
    title: "Узнайте стоимость лечения и визу в Корею заранее",
    desc: "Ориентировочная стоимость лечения и порядок оформления медицинской визы — для пациентов из Казахстана, России и Центральной Азии.",
    costTitle: "Стоимость лечения", costSub: "Открыть калькулятор стоимости",
    visaTitle: "Виза и въезд", visaSub: "Оформление медицинской визы",
  },
  kz: {
    eyebrow: "Құны және виза",
    title: "Кореяда емделу құны мен визаны алдын ала біліңіз",
    desc: "Болжамды емделу құны және медициналық виза рәсімі — Қазақстан, Ресей және Орталық Азиядан келетін науқастарға арналған.",
    costTitle: "Емделу құны", costSub: "Құн калькуляторын ашу",
    visaTitle: "Виза және кіру", visaSub: "Медициналық виза рәсімі",
  },
  zh: {
    eyebrow: "费用与签证",
    title: "赴韩治疗前，提前了解费用与签证",
    desc: "预估治疗费用与医疗签证流程一目了然 — 为来自哈萨克斯坦、俄罗斯及中亚的患者提供。",
    costTitle: "预估治疗费用", costSub: "打开费用计算器",
    visaTitle: "签证与入境指南", visaSub: "医疗签证流程",
  },
  ja: {
    eyebrow: "費用とビザ",
    title: "韓国での治療、費用とビザを事前に確認",
    desc: "治療費の目安と医療ビザの手続きをひと目で — カザフスタン・ロシア・中央アジアからお越しの方向け。",
    costTitle: "治療費の目安", costSub: "費用計算ツールを開く",
    visaTitle: "ビザ・入国案内", visaSub: "医療ビザの手続き",
  },
};

// 암종별 관련 치료법 매핑
const SLUG_THERAPIES = {
  female: ["thymosin", "nkCell", "highVitaminC", "lymphDrainage", "selenium"],
  digest: ["thymosin", "lowResidueDiet", "gastrectomyDiet", "hyperthermia", "glutathione"],
  liver: ["thymosin", "hyperthermia", "placentaExtract", "glutathione", "selenium"],
  lung: ["thymosin", "infraredHeat", "highVitaminC", "mistletoe", "immunoPlus"],
  thyroid: ["lowIodideDiet", "thymosin", "lymphDrainage", "selenium", "placentaExtract"],
  etc: ["nkCell", "hyperthermia", "immunoPlus", "thymosin", "highVitaminC"],
};

// 합병증 → 이미지 매핑 (slug 기준)
const COMPLICATION_IMAGES = {
  female: [
    CANCER_IMAGES.complications.fever,
    CANCER_IMAGES.complications.lymphEdema,
    CANCER_IMAGES.complications.urinaryBowel,
    CANCER_IMAGES.complications.surgicalSiteFemale,
    CANCER_IMAGES.complications.adhesionFemale,
    CANCER_IMAGES.complications.residual,
    CANCER_IMAGES.complications.nutrition,
    CANCER_IMAGES.complications.emotional,
  ],
  digest: [
    CANCER_IMAGES.complications.fever,
    CANCER_IMAGES.complications.anastomotic,
    CANCER_IMAGES.complications.bowelFunction,
    CANCER_IMAGES.complications.adhesion,
    CANCER_IMAGES.complications.residual,
    CANCER_IMAGES.complications.surgicalSite,
    CANCER_IMAGES.complications.nutrition,
    CANCER_IMAGES.complications.emotional,
    CANCER_IMAGES.complications.residual,
  ],
  liver: [
    CANCER_IMAGES.complications.liverFailure,
    CANCER_IMAGES.complications.surgicalSiteFemale,
    CANCER_IMAGES.complications.bileLeak,
    CANCER_IMAGES.complications.digestive,
    CANCER_IMAGES.complications.diabetes,
    CANCER_IMAGES.complications.residual,
  ],
  lung: [
    CANCER_IMAGES.complications.breathingDifficulty,
    CANCER_IMAGES.complications.coughChestPain,
    CANCER_IMAGES.complications.fatigue,
    CANCER_IMAGES.complications.residual,
    CANCER_IMAGES.complications.nutrition,
    CANCER_IMAGES.complications.emotional,
  ],
  thyroid: [
    CANCER_IMAGES.complications.voiceChange,
    CANCER_IMAGES.complications.hypocalcemia,
    CANCER_IMAGES.complications.hormoneDeficiency,
    CANCER_IMAGES.complications.neckScar,
    CANCER_IMAGES.complications.swallowingDifficulty,
  ],
  etc: [
    CANCER_IMAGES.complications.fever,
    CANCER_IMAGES.complications.lymphEdema,
    CANCER_IMAGES.complications.urinaryBowel,
    CANCER_IMAGES.complications.surgicalSiteFemale,
    CANCER_IMAGES.complications.adhesionFemale,
    CANCER_IMAGES.complications.residual,
    CANCER_IMAGES.complications.nutrition,
    CANCER_IMAGES.complications.emotional,
  ],
};

// ITCRN 축 순서
const ITCRN_KEYS = ["immunity", "temperature", "circulation", "resistibility", "nutrition"];
const ITCRN_LETTERS = ["I", "T", "C", "R", "N"];

// 섹션 라벨 다국어
const SECTION_COPY = {
  ko: {
    heroEyebrow: "면력한방병원 · 암종별 치료",
    compEyebrow: "수술 후 주요 합병증",
    compTitle: "수술 후 나타날 수 있는 합병증과 관리",
    itcrnTitle: "5축 통합 면역 치료",
    itcrnFocus: "특화 프로그램",
    therapyEyebrow: "주요 치료 프로그램",
    therapyTitle: "이 암종에 특화된 치료 접근법",
    postEyebrow: "수술 후 관리 프로토콜",
    postTitle: "퇴원 후에도 이어지는 관리",
    postProtocols: "프로토콜",
    journeyEyebrow: "환자 여정",
    journeyTitle: "문의부터 귀국까지의 5단계",
    faqTitle: "자주 묻는 질문",
    ctaEyebrow: "다음 단계",
    ctaTitle: "원격 상담으로 먼저 시작하세요",
    ctaBody: "원격 상담으로 부담 없이 시작하세요. 영업일 기준 1일 내 담당 코디네이터가 연락드립니다.",
    allTypes: "모든 암종 보기",
  },
  en: {
    heroEyebrow: "Immune Hospital · Cancer-specific care",
    compEyebrow: "Post-surgical complications",
    compTitle: "Complications that can follow surgery, and how we manage them",
    itcrnTitle: "5-axis integrative immune care",
    itcrnFocus: "Focus programs",
    therapyEyebrow: "Key treatment programs",
    therapyTitle: "Treatment approaches tailored to this cancer type",
    postEyebrow: "Post-surgical care protocols",
    postTitle: "Care that continues after discharge",
    postProtocols: "protocols",
    journeyEyebrow: "Patient journey",
    journeyTitle: "Five steps from inquiry to return home",
    faqTitle: "Frequently asked questions",
    ctaEyebrow: "Next step",
    ctaTitle: "Start with a remote consultation",
    ctaBody: "Start with a no-obligation remote consultation. Your dedicated coordinator will reach out within 1 business day.",
    allTypes: "View all cancer types",
  },
  ru: {
    heroEyebrow: "Immune Hospital · Лечение по типу рака",
    compEyebrow: "Послеоперационные осложнения",
    compTitle: "Возможные осложнения после операции и их ведение",
    itcrnTitle: "5-осевая интегративная иммунотерапия",
    itcrnFocus: "Профильные программы",
    therapyEyebrow: "Ключевые программы лечения",
    therapyTitle: "Подходы к лечению, адаптированные под этот тип рака",
    postEyebrow: "Протоколы послеоперационного ухода",
    postTitle: "Уход, который продолжается после выписки",
    postProtocols: "протоколов",
    journeyEyebrow: "Путь пациента",
    journeyTitle: "Пять шагов от заявки до возвращения домой",
    faqTitle: "Часто задаваемые вопросы",
    ctaEyebrow: "Следующий шаг",
    ctaTitle: "Начните с онлайн-консультации",
    ctaBody: "Начните с бесплатной онлайн-консультации. Координатор свяжется с вами в течение 1 рабочего дня.",
    allTypes: "Все виды рака",
  },
  kz: {
    heroEyebrow: "Immune Hospital · Обыр түрі бойынша емдеу",
    compEyebrow: "Операциядан кейінгі асқынулар",
    compTitle: "Операциядан кейін мүмкін асқынулар және оларды басқару",
    itcrnTitle: "5 осьті интегративті иммунотерапия",
    itcrnFocus: "Профильді бағдарламалар",
    therapyEyebrow: "Негізгі емдеу бағдарламалары",
    therapyTitle: "Осы обыр түріне бейімделген емдеу тәсілдері",
    postEyebrow: "Операциядан кейінгі күтім хаттамалары",
    postTitle: "Шыққаннан кейін де жалғасатын күтім",
    postProtocols: "хаттама",
    journeyEyebrow: "Пациент жолы",
    journeyTitle: "Сұраудан үйге оралуға дейінгі бес кезең",
    faqTitle: "Жиі қойылатын сұрақтар",
    ctaEyebrow: "Келесі қадам",
    ctaTitle: "Қашықтан кеңестен бастаңыз",
    ctaBody: "Қашықтан кеңестен ыңғайлы бастаңыз. Бір жұмыс күні ішінде координатор сізге хабарласады.",
    allTypes: "Барлық обыр түрін қарау",
  },
  zh: {
    heroEyebrow: "Immune Hospital · 癌症专科治疗",
    compEyebrow: "术后主要并发症",
    compTitle: "术后可能出现的并发症及其管理",
    itcrnTitle: "五轴整合免疫治疗",
    itcrnFocus: "专项项目",
    therapyEyebrow: "主要治疗项目",
    therapyTitle: "针对该癌症类型的治疗方案",
    postEyebrow: "术后护理方案",
    postTitle: "出院后仍持续的护理",
    postProtocols: "项方案",
    journeyEyebrow: "患者旅程",
    journeyTitle: "从咨询到回国的五个阶段",
    faqTitle: "常见问题",
    ctaEyebrow: "下一步",
    ctaTitle: "先从远程咨询开始",
    ctaBody: "从无负担的远程咨询开始。我们将在一个工作日内由专属协调员与您联系。",
    allTypes: "查看所有癌症类型",
  },
  ja: {
    heroEyebrow: "面力韓方病院 · がん種別の治療",
    compEyebrow: "術後の主な合併症",
    compTitle: "手術後に起こりうる合併症とその管理",
    itcrnTitle: "5軸統合免疫治療",
    itcrnFocus: "特化プログラム",
    therapyEyebrow: "主な治療プログラム",
    therapyTitle: "このがん種に特化した治療アプローチ",
    postEyebrow: "術後ケアプロトコル",
    postTitle: "退院後も続くケア",
    postProtocols: "プロトコル",
    journeyEyebrow: "患者の歩み",
    journeyTitle: "お問い合わせから帰国までの5ステップ",
    faqTitle: "よくある質問",
    ctaEyebrow: "次のステップ",
    ctaTitle: "まずはオンライン相談から",
    ctaBody: "まずは負担のないオンライン相談から。営業日基準1日以内に担当コーディネーターがご連絡します。",
    allTypes: "すべてのがん種を見る",
  },
};

// 환자 여정 5단계
const JOURNEY_STEPS = [
  { num: "01", ko: "문의 · 상담", en: "Inquiry & consult", ru: "Запрос и консультация", kz: "Сұрау және кеңес", zh: "咨询", ja: "お問い合わせ・相談", sub: { ko: "원격 상담", en: "Remote consultation", ru: "Онлайн-консультация", kz: "Қашықтан кеңес", zh: "远程咨询", ja: "オンライン相談" } },
  { num: "02", ko: "치료 계획", en: "Treatment plan", ru: "План лечения", kz: "Емдеу жоспары", zh: "治疗计划", ja: "治療計画", sub: { ko: "맞춤 견적", en: "Tailored plan", ru: "Индивидуальный план", kz: "Жеке жоспар", zh: "定制方案", ja: "個別見積もり" } },
  { num: "03", ko: "방문 · 입원", en: "Visit & admission", ru: "Приезд и госпитализация", kz: "Келу және жатқызу", zh: "到访 · 住院", ja: "来院・入院", sub: { ko: "비자·이동 지원", en: "Visa & transfer", ru: "Виза и трансфер", kz: "Виза және трансфер", zh: "签证·交通支持", ja: "ビザ・移動支援" } },
  { num: "04", ko: "치료 · 회복", en: "Treatment & recovery", ru: "Лечение и восстановление", kz: "Емдеу және қалпына келу", zh: "治疗 · 康复", ja: "治療・回復", sub: { ko: "ITCRN 5축", en: "ITCRN 5-axis", ru: "5-осевая система ITCRN", kz: "ITCRN 5 ось", zh: "ITCRN 五轴", ja: "ITCRN 5軸" } },
  { num: "05", ko: "귀국 · 추적", en: "Return & follow-up", ru: "Возвращение и наблюдение", kz: "Оралу және бақылау", zh: "回国 · 随访", ja: "帰国・追跡", sub: { ko: "원격 사후 관리", en: "Remote follow-up", ru: "Удалённое наблюдение", kz: "Қашықтан бақылау", zh: "远程后续管理", ja: "オンライン経過観察" } },
];

export default function CancerDetailClient({ slug }) {
  const lang = useLang();
  const [openAxis, setOpenAxis] = useState(null);

  const cancer = CANCER_DETAILS[slug];
  if (!cancer) return null;

  const l = (obj) => obj?.[lang] || obj?.en || obj?.ko || "";
  const cta = CTA[lang] || CTA.en;
  const s = SECTION_COPY[lang] || SECTION_COPY.en;
  const cv = COST_VISA[lang] || COST_VISA.en;

  const therapyKeys = SLUG_THERAPIES[slug] || [];
  const complicationImgs = COMPLICATION_IMAGES[slug] || [];
  const faqs = CANCER_FAQ[slug] || CANCER_FAQ.etc;

  const showPostSurgical = slug === "digest" || slug === "liver";

  return (
    <div className="bg-white">
      {/* ── 1. HERO ─────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 pt-8 pb-10 md:pt-20 md:pb-16">
        <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-5">
          {s.heroEyebrow}
        </span>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
          {l(cancer.title)}
        </h1>
        <p className="mt-5 text-base md:text-lg text-gray-500 leading-relaxed max-w-2xl">
          {l(cancer.intro)}
        </p>
        {cancer.stats?.survivalImprovement && (
          <div className="mt-6 border-l-2 border-teal-600 bg-teal-50 rounded-r-xl px-4 py-3 max-w-xl">
            <p className="text-sm md:text-base text-teal-800 font-semibold leading-relaxed m-0">
              {l(cancer.stats.survivalImprovement)}
            </p>
          </div>
        )}
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            href="/inquiry"
            className="inline-flex items-center gap-2 px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold transition-colors"
          >
            {cta.consult} <ArrowRight size={18} />
          </Link>
          <Link
            href="/intake"
            className="inline-flex items-center gap-1.5 px-2 py-2 text-sm font-bold text-teal-700 hover:text-teal-700 transition-colors"
          >
            {cta.intake} <ArrowRight size={16} />
          </Link>
        </div>

        {/* 히어로 — 암종 아이콘 밴드 (사진 대신 깔끔한 플랫폼 톤) */}
        <div className="mt-10 w-full aspect-[16/7] rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center">
          {(() => {
            const Icon = CANCER_ICONS[slug] || Activity;
            return <Icon size={64} strokeWidth={1.25} className="text-teal-700/70" />;
          })()}
        </div>
      </section>

      {/* ── 1.5 비용·비자 안내 밴드 (전환 의도: 가격·비자·이동) ── */}
      <section className="max-w-4xl mx-auto px-4 pb-10 md:pb-14">
        <div className="rounded-xl border border-teal-100 bg-teal-50 p-5 md:p-8">
          <span className="inline-block text-xs font-bold tracking-wide text-teal-700 mb-2">
            {cv.eyebrow}
          </span>
          <h2 className="text-lg md:text-xl font-bold text-gray-900 leading-snug">
            {cv.title}
          </h2>
          <p className="mt-2 text-sm md:text-base text-gray-500 leading-relaxed max-w-2xl">
            {cv.desc}
          </p>
          <div className="mt-5 grid sm:grid-cols-2 gap-4">
            <Link
              href="/cost-calculator"
              className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-5 py-4 shadow-sm hover:shadow-md transition-all"
            >
              <span className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0">
                <Calculator size={20} className="text-teal-700" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm md:text-base font-bold text-gray-900">{cv.costTitle}</span>
                <span className="block text-xs md:text-sm text-gray-500">{cv.costSub}</span>
              </span>
              <ArrowRight size={18} className="ml-auto text-teal-700 shrink-0" />
            </Link>
            <Link
              href="/visa"
              className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-5 py-4 shadow-sm hover:shadow-md transition-all"
            >
              <span className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0">
                <FileText size={20} className="text-teal-700" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm md:text-base font-bold text-gray-900">{cv.visaTitle}</span>
                <span className="block text-xs md:text-sm text-gray-500">{cv.visaSub}</span>
              </span>
              <ArrowRight size={18} className="ml-auto text-teal-700 shrink-0" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── 2. 합병증·증상 그리드 ───────────────────── */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-16">
          <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-4">
            {s.compEyebrow}
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 leading-tight">
            {s.compTitle}
          </h2>
          <div className="w-12 h-px bg-teal-700 mb-8 md:mb-10" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {cancer.complications.map((comp, idx) => (
              <article
                key={idx}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden"
              >
                {complicationImgs[idx] && (
                  <div className="w-full aspect-[16/9] overflow-hidden bg-gray-100">
                    <img
                      src={complicationImgs[idx]}
                      alt={l(comp.name)}
                      loading="lazy"
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.src = CANCER_IMAGES.healSvg; }}
                    />
                  </div>
                )}
                <div className="p-4 md:p-5">
                  <div className="text-xs font-bold tracking-wide text-teal-700 mb-1.5">
                    {String(idx + 1).padStart(2, "0")}
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-1.5 leading-snug">
                    {l(comp.name)}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {l(comp.desc)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. ITCRN 5축 치료 ───────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 py-12 md:py-16">
        <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-4">
          ITCRN Framework
        </span>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 leading-tight">
          {s.itcrnTitle}
        </h2>
        <div className="w-12 h-px bg-teal-700 mb-6" />

        {/* 암종 특화 포커스 배지 */}
        {l(cancer.focusPrograms)?.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-8">
            <span className="text-xs font-bold tracking-wide text-gray-500 uppercase mr-1">
              {s.itcrnFocus}
            </span>
            {l(cancer.focusPrograms).map((prog, i) => (
              <span
                key={i}
                className="text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1"
              >
                {prog}
              </span>
            ))}
          </div>
        )}

        {/* 5축 아코디언 */}
        <div className="border-t border-gray-200">
          {ITCRN_KEYS.map((key, idx) => {
            const axis = ITCRN_FRAMEWORK[key];
            if (!axis) return null;
            const isOpen = openAxis === key;
            return (
              <div key={key} className="border-b border-gray-200">
                <button
                  onClick={() => setOpenAxis(isOpen ? null : key)}
                  className="w-full flex items-center justify-between gap-4 py-5 text-left"
                >
                  <div className="flex items-center gap-4">
                    <span className="shrink-0 w-9 h-9 rounded-lg bg-teal-700 text-white font-bold flex items-center justify-center text-sm">
                      {ITCRN_LETTERS[idx]}
                    </span>
                    <span className="text-base md:text-lg font-bold text-gray-900">
                      {l(axis.title)}
                    </span>
                  </div>
                  <Plus
                    size={20}
                    className={`shrink-0 text-teal-700 transition-transform ${isOpen ? "rotate-45" : ""}`}
                  />
                </button>
                {isOpen && (
                  <div className="pb-6 pl-0 md:pl-13">
                    <p className="text-sm md:text-base text-gray-600 leading-relaxed max-w-2xl mb-4">
                      {l(axis.desc)}
                    </p>
                    {axis.evidence && (
                      <div className="border-l-2 border-teal-600 bg-teal-50 rounded-r-xl px-4 py-3 mb-4 max-w-2xl">
                        <p className="text-sm text-teal-800 font-semibold m-0 leading-relaxed">
                          {axis.evidence}
                        </p>
                      </div>
                    )}
                    {(axis.methods || axis.cellular || axis.programs) && (
                      <ul className="flex flex-wrap gap-2 list-none p-0 m-0">
                        {[...(axis.methods || []), ...(axis.cellular || []), ...(axis.humoral || []), ...(axis.programs || [])].map(
                          (m, i) => (
                            <li
                              key={i}
                              className="text-xs font-semibold text-gray-600 border border-gray-200 rounded-full px-3 py-1"
                            >
                              {m}
                            </li>
                          )
                        )}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 4. 치료법 상세 카드 ─────────────────────── */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-16">
          <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-4">
            {s.therapyEyebrow}
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 leading-tight">
            {s.therapyTitle}
          </h2>
          <div className="w-12 h-px bg-teal-700 mb-8 md:mb-10" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {therapyKeys.map((key, idx) => {
              const therapy = IMMUNE_THERAPIES[key];
              if (!therapy) return null;
              return (
                <article
                  key={key}
                  className="bg-white border border-gray-200 rounded-xl overflow-hidden"
                >
                  {therapy.image && (
                    <div className="w-full aspect-[16/9] overflow-hidden bg-gray-100">
                      <img
                        src={therapy.image}
                        alt={l(therapy.name)}
                        loading="lazy"
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.src = CANCER_IMAGES.healSvg; }}
                      />
                    </div>
                  )}
                  <div className="p-4 md:p-5">
                    <div className="text-xs font-bold tracking-wide text-teal-700 uppercase mb-1.5">
                      {therapy.axis?.toUpperCase()} — {String(idx + 1).padStart(2, "0")}
                    </div>
                    <h3 className="text-base font-bold text-gray-900 mb-1.5 leading-snug">
                      {l(therapy.name)}
                    </h3>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      {l(therapy.description)}
                    </p>
                    {therapy.evidence && (
                      <p className="text-xs text-teal-700 font-semibold mt-3 mb-0 leading-relaxed">
                        {l(therapy.evidence)}
                      </p>
                    )}
                    {therapy.price && (
                      <div className="mt-4 inline-block bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
                        <span className="text-xs font-semibold text-gray-600">
                          {typeof therapy.price.amount === "number"
                            ? `${therapy.price.amount.toLocaleString()} ${therapy.price.unit}`
                            : `${therapy.price.amount} ${therapy.price.unit || ""}`}
                        </span>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 5. 수술 후 관리 (대장/간만) ─────────────── */}
      {showPostSurgical && (
        <section className="max-w-4xl mx-auto px-4 py-12 md:py-16">
          <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-4">
            {s.postEyebrow}
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 leading-tight">
            {s.postTitle}
          </h2>
          <div className="w-12 h-px bg-teal-700 mb-8 md:mb-10" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {Object.entries(POST_SURGICAL_CARE).map(([key, care]) => (
              <div
                key={key}
                className="bg-gray-50 border border-gray-200 rounded-xl p-5 md:p-6 text-center"
              >
                <div className="text-3xl md:text-4xl font-bold text-teal-700 leading-none mb-3">
                  {care.items}
                </div>
                <div className="text-xs font-bold tracking-wide text-gray-500 uppercase mb-1.5">
                  {s.postProtocols}
                </div>
                <h3 className="text-base md:text-lg font-bold text-gray-900 leading-snug">
                  {l(care.title)}
                </h3>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 6. 환자 여정 5단계 ──────────────────────── */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-16">
          <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-4">
            {s.journeyEyebrow}
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 leading-tight">
            {s.journeyTitle}
          </h2>
          <div className="w-12 h-px bg-teal-700 mb-8 md:mb-10" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {JOURNEY_STEPS.map((step) => (
              <div key={step.num} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-teal-700 leading-none mb-2.5">{step.num}</div>
                <div className="text-sm font-bold text-gray-900 mb-1 leading-snug">
                  {step[lang] || step.en}
                </div>
                <div className="text-xs text-gray-500 leading-snug">
                  {step.sub[lang] || step.sub.en}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. FAQ ──────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 py-12 md:py-16">
        <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-4">
          FAQ
        </span>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 md:mb-8 leading-tight">
          {s.faqTitle}
        </h2>
        <div className="divide-y divide-gray-200 border-t border-gray-200">
          {faqs.map((faq, idx) => (
            <div key={idx} className="py-5">
              <h3 className="text-base md:text-lg font-bold text-gray-900 mb-2 leading-snug">
                {faq.q[lang] || faq.q.ko}
              </h3>
              <p className="text-sm md:text-base text-gray-500 leading-relaxed">
                {faq.a[lang] || faq.a.ko}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 8. CTA ──────────────────────────────────── */}
      <section className="bg-teal-700">
        <div className="max-w-4xl mx-auto px-4 py-14 md:py-20 text-center">
          <span className="inline-block text-xs font-bold tracking-wide text-teal-50 bg-teal-700/40 border border-teal-400/40 rounded-full px-3 py-1 mb-5">
            {s.ctaEyebrow}
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-snug">
            {s.ctaTitle}
          </h2>
          <p className="text-teal-50 text-sm md:text-base mb-8 max-w-2xl mx-auto leading-relaxed">
            {s.ctaBody}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/inquiry"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-teal-700 rounded-xl font-bold hover:bg-teal-50 transition-colors"
            >
              {cta.consult} <ArrowRight size={18} />
            </Link>
            <Link
              href="/intake"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-teal-50 hover:text-white transition-colors"
            >
              {cta.intake} <ArrowRight size={16} />
            </Link>
          </div>
          <div className="mt-8">
            <Link
              href="/treatments"
              className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-teal-100 hover:text-white transition-colors"
            >
              {s.allTypes} <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* 의료 면책고지 — 매칭·코디네이션만 제공, 치료 결과 미보장 명시 */}
      <div className="border-t border-gray-100 bg-white">
        <p className="max-w-4xl mx-auto px-4 py-5 text-[11px] leading-relaxed text-gray-400 text-center">
          {t("sidebar.disclaimer", lang)}
        </p>
      </div>
    </div>
  );
}
