"use client";

/**
 * 한국 암치료 비용 계산기 (다국어 6개 언어).
 * ⚠️ 청구서/확정 견적/의료 제안 아님 — 어디까지나 예상치. 정확한 견적은 무료 상담으로(/inquiry).
 * 설계: 환자는 질환·프로그램만 고른다(기간은 환자가 모름 → 보통 4~8주 자동 반영).
 *       숙소·항공은 토글이 아니라 비용 내역에 항상 표시(가격 투명성).
 * 언어는 useLang(). 가격대는 /ru/for-russian-patients 와 정합(보수적 추정).
 */

import { useState, useMemo } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/LangContext";

// 프로그램: oneTime=진단(일회성), 나머지는 월단위 × 예상 체류(개월) 범위.
const PROGRAMS = [
  { key: "diagnostics", oneTime: true, low: 500, high: 1500, mL: 0.5, mH: 1 },   // 2~4주
  { key: "immuno", low: 3000, high: 6000, mL: 1, mH: 2 },                          // 4~8주
  { key: "complex", low: 5000, high: 12000, mL: 1.5, mH: 3 },                      // 6~12주
];
const LODGING = { low: 800, high: 1500 };   // 월
const FLIGHT = { low: 400, high: 800 };       // 왕복 1회
const DIAGNOSTICS_ONCE = { low: 500, high: 1500 }; // 치료 코스에 포함되는 초기 진단

const NUM_LOCALE = { ko: "ko-KR", en: "en-US", ru: "ru-RU", kz: "ru-RU", zh: "zh-CN", ja: "ja-JP" };

const COPY = {
  en: {
    heroTitle: "How much does cancer treatment in Korea cost?",
    heroLede: "See an estimate in 30 seconds. We provide an exact quote and a consultation in your language for free.",
    labelType: "Condition", labelProgram: "Program",
    weeksUnit: "wk", stayLabel: "Est. stay",
    breakdownTitle: "Estimated breakdown",
    lineTreatment: "Diagnosis & treatment", lineLodging: "Lodging (during stay)", lineFlight: "Round-trip flight", lineTotal: "Total (estimated)",
    durationNote: "Based on a typical stay — varies by duration and condition.",
    fromPrefix: "from ", fromSuffix: "", perMonthWord: "/mo",
    resultLabel: "Estimated total", cta: "Get an exact quote — free →",
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
    labelType: "질환 종류", labelProgram: "프로그램",
    weeksUnit: "주", stayLabel: "예상 체류",
    breakdownTitle: "예상 비용 내역",
    lineTreatment: "진단·치료", lineLodging: "숙소(체류 중)", lineFlight: "왕복 항공", lineTotal: "합계(예상)",
    durationNote: "보통 체류 기준 — 기간·환자 상태에 따라 달라집니다.",
    fromPrefix: "", fromSuffix: "부터", perMonthWord: "/월",
    resultLabel: "예상 합계", cta: "정확한 견적 무료로 받기 →",
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
    heroLede: "Получите оценку за 30 секунд. Точный расчёт и консультацию на русском языке мы предоставляем бесплатно.",
    labelType: "Тип заболевания", labelProgram: "Программа",
    weeksUnit: "нед.", stayLabel: "Ориент. срок",
    breakdownTitle: "Ориентировочный расчёт",
    lineTreatment: "Диагностика и лечение", lineLodging: "Проживание (на время лечения)", lineFlight: "Перелёт (туда-обратно)", lineTotal: "Итого (ориентировочно)",
    durationNote: "Исходя из типичного срока — зависит от длительности и состояния.",
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
    heroLede: "30 секундта бағасын көріңіз. Нақты есеп пен кеңесті тегін береміз.",
    labelType: "Ауру түрі", labelProgram: "Бағдарлама",
    weeksUnit: "апта", stayLabel: "Шамамен мерзім",
    breakdownTitle: "Шамамен есеп",
    lineTreatment: "Диагностика және емдеу", lineLodging: "Тұру (емделу кезінде)", lineFlight: "Ұшу (екі жаққа)", lineTotal: "Барлығы (шамамен)",
    durationNote: "Әдеттегі мерзім бойынша — ұзақтығы мен жағдайға байланысты өзгереді.",
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
    heroLede: "30 秒查看预估。精确报价与咨询均免费提供。",
    labelType: "疾病类型", labelProgram: "项目",
    weeksUnit: "周", stayLabel: "预计停留",
    breakdownTitle: "费用预估明细",
    lineTreatment: "诊断与治疗", lineLodging: "住宿（治疗期间）", lineFlight: "往返机票", lineTotal: "合计（预估）",
    durationNote: "按常规疗程估算 — 因疗程与病情而异。",
    fromPrefix: "", fromSuffix: "起", perMonthWord: "/月",
    resultLabel: "预计总费用", cta: "免费获取精确报价 →",
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
    heroLede: "30秒で概算を確認。正確な見積もりとご相談は無料です。",
    labelType: "疾患の種類", labelProgram: "プログラム",
    weeksUnit: "週", stayLabel: "目安の滞在",
    breakdownTitle: "概算の内訳",
    lineTreatment: "診断・治療", lineLodging: "宿泊（滞在中）", lineFlight: "往復航空券", lineTotal: "合計（概算）",
    durationNote: "標準的な滞在を基準 — 期間や状態により変動します。",
    fromPrefix: "", fromSuffix: "〜", perMonthWord: "/月",
    resultLabel: "概算合計", cta: "正確な見積もりを無料で →",
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
  const fmtUSD = (n) => "$" + Math.round(n).toLocaleString(numLocale, { maximumFractionDigits: 0 });
  const range = (lo, hi) => `${fmtUSD(lo)} – ${fmtUSD(hi)}`;
  const priceHint = (low, perMonth) =>
    `${c.fromPrefix}${fmtUSD(low)}${perMonth ? c.perMonthWord : ""}${c.fromSuffix}`;

  const [cancerIdx, setCancerIdx] = useState(0);
  const [programKey, setProgramKey] = useState("diagnostics");
  const program = PROGRAMS.find((p) => p.key === programKey);

  const calc = useMemo(() => {
    const { oneTime, low, high, mL, mH } = program;
    // 진단·치료
    const treatLow = oneTime ? low : low * mL + DIAGNOSTICS_ONCE.low;
    const treatHigh = oneTime ? high : high * mH + DIAGNOSTICS_ONCE.high;
    // 숙소(체류 개월 비례)
    const lodgeLow = LODGING.low * mL;
    const lodgeHigh = LODGING.high * mH;
    // 항공(왕복 1회)
    const flightLow = FLIGHT.low, flightHigh = FLIGHT.high;
    return {
      treatLow, treatHigh, lodgeLow, lodgeHigh, flightLow, flightHigh,
      totalLow: treatLow + lodgeLow + flightLow,
      totalHigh: treatHigh + lodgeHigh + flightHigh,
      weeksLow: Math.round(mL * 4), weeksHigh: Math.round(mH * 4),
    };
  }, [program]);

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
                <span className="text-xs text-gray-400 tabular-nums">{priceHint(p.low, !p.oneTime)}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 합계(예상) */}
      <section className="bg-teal-600 text-white rounded-xl p-6 md:p-8 mt-5 text-center">
        <p className="text-sm text-teal-100 mb-1">{c.resultLabel}</p>
        <div className="text-3xl md:text-4xl font-bold tabular-nums">{range(calc.totalLow, calc.totalHigh)}</div>
        <p className="text-sm text-teal-100 mt-2">
          {c.cancers[cancerIdx]} · {c.programs[programKey]} · {c.stayLabel} {calc.weeksLow}–{calc.weeksHigh} {c.weeksUnit}
        </p>
        <Link href="/inquiry" className="inline-block mt-5 bg-white text-teal-700 px-8 py-3 rounded-lg font-semibold hover:bg-teal-50 transition">
          {c.cta}
        </Link>
      </section>

      {/* 비용 내역 (항상 표시 — 가격 투명성) */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 md:p-8 mt-5">
        <h2 className="text-sm font-bold text-gray-800 mb-4">{c.breakdownTitle}</h2>
        <dl className="divide-y divide-gray-100">
          {[
            { label: c.lineTreatment, lo: calc.treatLow, hi: calc.treatHigh },
            { label: c.lineLodging, lo: calc.lodgeLow, hi: calc.lodgeHigh },
            { label: c.lineFlight, lo: calc.flightLow, hi: calc.flightHigh },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between py-2.5">
              <dt className="text-sm text-gray-600">{row.label}</dt>
              <dd className="text-sm text-gray-800 tabular-nums">{range(row.lo, row.hi)}</dd>
            </div>
          ))}
          <div className="flex items-center justify-between pt-3">
            <dt className="text-sm font-bold text-gray-900">{c.lineTotal}</dt>
            <dd className="text-base font-bold text-teal-700 tabular-nums">{range(calc.totalLow, calc.totalHigh)}</dd>
          </div>
        </dl>
        <p className="text-xs text-gray-400 mt-3">{c.durationNote}</p>
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
