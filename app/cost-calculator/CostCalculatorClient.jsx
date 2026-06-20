"use client";

/**
 * 한국 암치료 비용 계산기 (다국어 6개 언어).
 * ⚠️ 청구서/확정 견적/의료 제안 아님 — 어디까지나 예상치. 정확한 견적은 무료 상담으로(/inquiry).
 * 언어는 useLang() (URL 언어 prefix → proxy → cookie). 문자열은 COPY[lang].
 * 가격대는 /ru/for-russian-patients 와 정합(보수적 추정).
 */

import { useState, useMemo } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/LangContext";

// 프로그램 가격대(USD, 추정). 진단가는 일회성, 나머지는 월 단위.
const PROGRAMS = [
  { key: "diagnostics", perMonth: false, low: 500, high: 1500 },
  { key: "immuno", perMonth: true, low: 3000, high: 6000 },
  { key: "complex", perMonth: true, low: 5000, high: 12000 },
];
const LODGING = { low: 800, high: 1500 };
const FLIGHT = { low: 400, high: 800 };
const DIAGNOSTICS_ONCE = { low: 500, high: 1500 };

const NUM_LOCALE = { ko: "ko-KR", en: "en-US", ru: "ru-RU", kz: "ru-RU", zh: "zh-CN", ja: "ja-JP" };

const COPY = {
  en: {
    heroTitle: "How much does cancer treatment in Korea cost?",
    heroLede: "Estimate the cost in 30 seconds. We provide an exact quote and a consultation in your language for free.",
    labelType: "Condition", labelProgram: "Program", labelTerm: "Treatment duration",
    weeksUnit: "wk", termHint: "Average stay for CIS patients — 4–8 weeks.",
    optLodging: "Lodging near clinic", optFlight: "Round-trip flight",
    fromPrefix: "from ", fromSuffix: "", perMonthWord: "/mo",
    resultLabel: "Estimated cost", cta: "Get an exact quote — free →",
    cancers: ["Stomach cancer", "Lung cancer", "Breast cancer", "Liver cancer", "Thyroid cancer", "Colorectal cancer", "Other / not sure"],
    programs: { diagnostics: "Diagnostics & second opinion", immuno: "Course of immunotherapy (Korean medicine)", complex: "Comprehensive treatment (oncology + support)" },
    disclaimer: "⚠️ This is an estimate only and is not a bill, offer, or medical proposal. The final cost is determined by the clinic after reviewing your medical records. An exact quote and treatment plan are provided free after consultation.",
    benefits: [
      { t: "Visa-free from Kazakhstan", d: "Visa-free entry to Korea for KZ citizens. We help with documents." },
      { t: "Support in your language", d: "Interpreter and personal manager at every step — from inquiry to discharge." },
      { t: "2× more affordable", d: "30–60% lower cost than Germany or the US at comparable quality." },
    ],
    navCare: "Care journey", navConsult: "Free consultation", navVisa: "Visa",
  },
  ko: {
    heroTitle: "한국 암치료, 얼마나 들까요?",
    heroLede: "30초 만에 예상 비용을 확인하세요. 정확한 견적과 상담은 무료입니다.",
    labelType: "질환 종류", labelProgram: "프로그램", labelTerm: "치료 기간",
    weeksUnit: "주", termHint: "CIS 환자 평균 체류 — 4~8주.",
    optLodging: "병원 근처 숙소", optFlight: "왕복 항공",
    fromPrefix: "", fromSuffix: "부터", perMonthWord: "/월",
    resultLabel: "예상 비용", cta: "정확한 견적 무료로 받기 →",
    cancers: ["위암", "폐암", "유방암", "간암", "갑상선암", "대장암", "기타 / 잘 모름"],
    programs: { diagnostics: "진단 및 2차 소견", immuno: "면역치료 코스(한방)", complex: "종합 치료(종양 + 지원)" },
    disclaimer: "⚠️ 본 계산은 예상치이며 청구서·확정 견적·의료 제안이 아닙니다. 최종 비용은 병원이 의료기록 검토 후 결정합니다. 정확한 견적과 치료계획은 상담 후 무료로 제공됩니다.",
    benefits: [
      { t: "카자흐스탄 무비자", d: "카자흐 국민은 한국 무비자 입국. 서류를 도와드립니다." },
      { t: "모국어 지원", d: "문의부터 퇴원까지 통역사·전담 매니저가 모든 단계 동행." },
      { t: "2배 저렴", d: "독일·미국 대비 30~60% 저렴, 동등한 의료 품질." },
    ],
    navCare: "치료 여정", navConsult: "무료 상담", navVisa: "비자",
  },
  ru: {
    heroTitle: "Сколько стоит лечение рака в Корее?",
    heroLede: "Рассчитайте ориентировочную стоимость за 30 секунд. Точный расчёт и консультацию на русском языке мы предоставляем бесплатно.",
    labelType: "Тип заболевания", labelProgram: "Программа", labelTerm: "Срок лечения",
    weeksUnit: "нед.", termHint: "Средний срок для пациентов из СНГ — 4–8 недель.",
    optLodging: "Проживание рядом с клиникой", optFlight: "Перелёт (туда-обратно)",
    fromPrefix: "от ", fromSuffix: "", perMonthWord: "/мес.",
    resultLabel: "Ориентировочная стоимость", cta: "Получить точный расчёт бесплатно →",
    cancers: ["Рак желудка", "Рак лёгких", "Рак молочной железы", "Рак печени", "Рак щитовидной железы", "Колоректальный рак", "Другое / не уверен(а)"],
    programs: { diagnostics: "Диагностика и второе мнение", immuno: "Курс иммунотерапии (корейская медицина)", complex: "Комплексное лечение (онкология + поддержка)" },
    disclaimer: "⚠️ Расчёт является ориентировочным и не является счётом, офертой или медицинским предложением. Итоговая стоимость определяется клиникой после изучения медицинских документов. Точный расчёт и план лечения предоставляются бесплатно после консультации.",
    benefits: [
      { t: "Без визы из Казахстана", d: "Безвизовый въезд в Корею для граждан РК. Помогаем с документами." },
      { t: "Сопровождение на русском", d: "Переводчик и личный менеджер на всех этапах — от заявки до выписки." },
      { t: "Дешевле в 2 раза", d: "Стоимость на 30–60% ниже, чем в Германии или США при сопоставимом качестве." },
    ],
    navCare: "Лечение рака в Корее", navConsult: "Бесплатная консультация", navVisa: "Виза",
  },
  kz: {
    heroTitle: "Кореяда қатерлі ісікті емдеу қанша тұрады?",
    heroLede: "Шамамен құнын 30 секундта есептеңіз. Нақты есеп пен кеңесті тегін береміз.",
    labelType: "Ауру түрі", labelProgram: "Бағдарлама", labelTerm: "Емдеу мерзімі",
    weeksUnit: "апта", termHint: "ТМД пациенттері үшін орташа мерзім — 4–8 апта.",
    optLodging: "Клиника жанындағы тұру", optFlight: "Ұшу (екі жаққа)",
    fromPrefix: "", fromSuffix: " бастап", perMonthWord: "/айына",
    resultLabel: "Шамамен құны", cta: "Нақты есепті тегін алу →",
    cancers: ["Асқазан қатерлі ісігі", "Өкпе қатерлі ісігі", "Сүт безі қатерлі ісігі", "Бауыр қатерлі ісігі", "Қалқанша без қатерлі ісігі", "Колоректальды қатерлі ісік", "Басқа / сенімді емеспін"],
    programs: { diagnostics: "Диагностика және екінші пікір", immuno: "Иммунотерапия курсы (корей медицинасы)", complex: "Кешенді емдеу (онкология + қолдау)" },
    disclaimer: "⚠️ Бұл тек шамамен есеп, шот, оферта немесе медициналық ұсыныс емес. Түпкілікті құнды клиника медициналық құжаттарды қарағаннан кейін анықтайды. Нақты есеп пен емдеу жоспары кеңестен кейін тегін беріледі.",
    benefits: [
      { t: "Қазақстаннан визасыз", d: "ҚР азаматтары үшін Кореяға визасыз кіру. Құжаттарға көмектесеміз." },
      { t: "Тіліңізде қолдау", d: "Өтініштен шығуға дейін аудармашы мен жеке менеджер әр кезеңде." },
      { t: "2 есе арзан", d: "Германия мен АҚШ-пен салыстырғанда 30–60% арзан, сапасы тең." },
    ],
    navCare: "Емдеу жолы", navConsult: "Тегін кеңес", navVisa: "Виза",
  },
  zh: {
    heroTitle: "在韩国治疗癌症需要多少钱？",
    heroLede: "30 秒估算费用。精确报价与咨询均免费提供。",
    labelType: "疾病类型", labelProgram: "项目", labelTerm: "治疗周期",
    weeksUnit: "周", termHint: "独联体患者平均疗程 — 4–8 周。",
    optLodging: "医院附近住宿", optFlight: "往返机票",
    fromPrefix: "", fromSuffix: "起", perMonthWord: "/月",
    resultLabel: "预计费用", cta: "免费获取精确报价 →",
    cancers: ["胃癌", "肺癌", "乳腺癌", "肝癌", "甲状腺癌", "结直肠癌", "其他 / 不确定"],
    programs: { diagnostics: "诊断与第二意见", immuno: "免疫治疗疗程（韩医）", complex: "综合治疗（肿瘤 + 支持）" },
    disclaimer: "⚠️ 此为预估，并非账单、要约或医疗建议。最终费用由医院在审阅病历后确定。咨询后免费提供精确报价与治疗方案。",
    benefits: [
      { t: "哈萨克斯坦免签", d: "哈萨克公民免签入境韩国。我们协助办理材料。" },
      { t: "母语支持", d: "从咨询到出院，翻译与专属经理全程陪同。" },
      { t: "便宜一半", d: "在同等质量下，比德国或美国低 30–60%。" },
    ],
    navCare: "治疗旅程", navConsult: "免费咨询", navVisa: "签证",
  },
  ja: {
    heroTitle: "韓国でのがん治療はいくら？",
    heroLede: "30秒で概算。正確な見積もりとご相談は無料です。",
    labelType: "疾患の種類", labelProgram: "プログラム", labelTerm: "治療期間",
    weeksUnit: "週", termHint: "CIS患者の平均滞在 — 4〜8週間。",
    optLodging: "病院近くの宿泊", optFlight: "往復航空券",
    fromPrefix: "", fromSuffix: "〜", perMonthWord: "/月",
    resultLabel: "概算費用", cta: "正確な見積もりを無料で →",
    cancers: ["胃がん", "肺がん", "乳がん", "肝臓がん", "甲状腺がん", "大腸がん", "その他 / わからない"],
    programs: { diagnostics: "診断・セカンドオピニオン", immuno: "免疫療法コース（韓方）", complex: "総合治療（腫瘍＋サポート）" },
    disclaimer: "⚠️ これは概算であり、請求書・確定見積もり・医療提案ではありません。最終費用は医療機関が診療記録を確認のうえ決定します。正確な見積もりと治療計画はご相談後に無料で提供します。",
    benefits: [
      { t: "カザフスタンからビザ不要", d: "カザフ国民は韓国へビザ不要で入国。書類をサポートします。" },
      { t: "母国語サポート", d: "問い合わせから退院まで、通訳と専任マネージャーが全段階で同行。" },
      { t: "2倍お得", d: "同等の品質でドイツや米国より30〜60%低コスト。" },
    ],
    navCare: "ケアの流れ", navConsult: "無料相談", navVisa: "ビザ",
  },
};

export default function CostCalculatorClient() {
  const lang = useLang();
  const c = COPY[lang] || COPY.en;
  const numLocale = NUM_LOCALE[lang] || "en-US";
  const fmtUSD = (n) => "$" + n.toLocaleString(numLocale, { maximumFractionDigits: 0 });
  const priceHint = (low, perMonth) =>
    `${c.fromPrefix}${fmtUSD(low)}${perMonth ? c.perMonthWord : ""}${c.fromSuffix}`;

  const [cancerIdx, setCancerIdx] = useState(0);
  const [programKey, setProgramKey] = useState("immuno");
  const [weeks, setWeeks] = useState(4);
  const [withLodging, setWithLodging] = useState(true);
  const [withFlight, setWithFlight] = useState(true);

  const program = PROGRAMS.find((p) => p.key === programKey);
  const isCourse = program.perMonth;

  const result = useMemo(() => {
    const months = weeks / 4;
    let low = 0, high = 0;
    if (program.perMonth) {
      low += program.low * months; high += program.high * months;
      low += DIAGNOSTICS_ONCE.low; high += DIAGNOSTICS_ONCE.high;
    } else {
      low += program.low; high += program.high;
    }
    if (withLodging) { low += LODGING.low * months; high += LODGING.high * months; }
    if (withFlight) { low += FLIGHT.low; high += FLIGHT.high; }
    return { low: Math.round(low), high: Math.round(high) };
  }, [program, weeks, withLodging, withFlight]);

  return (
    <main className="max-w-3xl mx-auto px-4 py-12 text-gray-800">
      <header className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-teal-700 mb-3">{c.heroTitle}</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">{c.heroLede}</p>
      </header>

      <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 md:p-8 space-y-6">
        {/* 질환 종류 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{c.labelType}</label>
          <select
            value={cancerIdx}
            onChange={(e) => setCancerIdx(Number(e.target.value))}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            {c.cancers.map((name, i) => (
              <option key={i} value={i}>{name}</option>
            ))}
          </select>
        </div>

        {/* 프로그램 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{c.labelProgram}</label>
          <div className="grid sm:grid-cols-3 gap-2">
            {PROGRAMS.map((p) => (
              <button
                key={p.key}
                onClick={() => setProgramKey(p.key)}
                className={`text-left px-4 py-3 rounded-lg border text-sm transition-all ${
                  programKey === p.key
                    ? "bg-teal-50 text-teal-800 border-teal-200 shadow-sm"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                <span className="font-medium block">{c.programs[p.key]}</span>
                <span className="text-xs text-gray-400 tabular-nums">{priceHint(p.low, p.perMonth)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 기간 */}
        {isCourse && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">{c.labelTerm}</label>
              <span className="text-sm font-bold text-gray-900 tabular-nums">{weeks} {c.weeksUnit}</span>
            </div>
            <input
              type="range" min={2} max={12} step={1} value={weeks}
              onChange={(e) => setWeeks(Number(e.target.value))}
              className="w-full accent-teal-600"
            />
            <p className="text-xs text-gray-400 mt-1">{c.termHint}</p>
          </div>
        )}

        {/* 옵션 */}
        <div className="flex flex-col sm:flex-row gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={withLodging} onChange={(e) => setWithLodging(e.target.checked)} className="accent-teal-600 w-4 h-4" />
            {c.optLodging}
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={withFlight} onChange={(e) => setWithFlight(e.target.checked)} className="accent-teal-600 w-4 h-4" />
            {c.optFlight}
          </label>
        </div>
      </section>

      {/* 결과 */}
      <section className="bg-teal-600 text-white rounded-xl p-6 md:p-8 mt-5 text-center">
        <p className="text-sm text-teal-100 mb-1">{c.resultLabel}</p>
        <div className="text-3xl md:text-4xl font-bold tabular-nums">
          {fmtUSD(result.low)} – {fmtUSD(result.high)}
        </div>
        <p className="text-sm text-teal-100 mt-2">
          {c.cancers[cancerIdx]} · {c.programs[programKey]}{isCourse ? ` · ${weeks} ${c.weeksUnit}` : ""}
        </p>
        <Link href="/inquiry" className="inline-block mt-5 bg-white text-teal-700 px-8 py-3 rounded-lg font-semibold hover:bg-teal-50 transition">
          {c.cta}
        </Link>
      </section>

      <p className="text-xs text-gray-400 leading-relaxed mt-4">{c.disclaimer}</p>

      {/* 신뢰 포인트 */}
      <section className="mt-10 grid sm:grid-cols-3 gap-4">
        {c.benefits.map((b) => (
          <div key={b.t} className="bg-gray-50 rounded-xl p-5">
            <h3 className="font-semibold text-gray-800 text-sm mb-1">{b.t}</h3>
            <p className="text-xs text-gray-600 leading-relaxed">{b.d}</p>
          </div>
        ))}
      </section>

      <nav className="mt-10 pt-6 border-t text-sm text-gray-500 flex flex-wrap gap-4">
        <Link href="/care-journey" className="hover:text-teal-600">{c.navCare}</Link>
        <Link href="/hospitals/immune" className="hover:text-teal-600">Immune Hospital</Link>
        <Link href="/inquiry" className="hover:text-teal-600">{c.navConsult}</Link>
        <Link href="/visa" className="hover:text-teal-600">{c.navVisa}</Link>
      </nav>
    </main>
  );
}
