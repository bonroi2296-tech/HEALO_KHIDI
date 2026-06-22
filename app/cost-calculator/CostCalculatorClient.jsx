"use client";

/**
 * 한국 암치료 안내 + 무료 견적 (다국어 6개 언어).
 * ⚠️ 임시: 가격 수치 숨김(2=B). PO 실제 가격 확보 후 금액 복원 예정.
 * 설계: 환자는 질환 + 치료 단계만 고른다 → 그 단계에 무엇이 포함되는지 + "정확한 비용은 무료 상담".
 * 치료 단계 = 우리 실제 케어경로: 진단 → 수술·항암(상급종합) → 면역·재활(한방 보조).
 * 의료 레드라인: 한방 면역·재활은 '보조'(치료/완치 아님).
 */

import { useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/LangContext";

const PROGRAM_KEYS = ["diagnosis", "surgery", "immune"];

const COPY = {
  en: {
    heroTitle: "How much does cancer treatment in Korea cost?",
    heroLede: "Pick a treatment stage to see what's included. We provide an exact quote and a consultation in your language — free.",
    labelType: "Condition", labelProgram: "Treatment stage", includesLabel: "What's included",
    cancers: ["Stomach cancer", "Lung cancer", "Breast cancer", "Liver cancer", "Thyroid cancer", "Colorectal cancer", "Other / not sure"],
    programs: {
      diagnosis: { name: "Diagnosis & second opinion", desc: "Review of your medical records and imaging, a second opinion from a Korean oncologist, and a recommended care plan." },
      surgery: { name: "Surgery & oncology (tertiary hospital)", desc: "Standard cancer treatment — surgery, chemotherapy, radiation — at our partner tertiary hospitals." },
      immune: { name: "Immune & rehab care (Korean medicine, supportive)", desc: "Supportive immune care, side-effect management and rehabilitation at Myeonryeok Korean-medicine hospital. Supportive care — not a cancer cure." },
    },
    quoteTitle: "Exact cost? Free consultation.", quoteText: "Cost depends on the cancer type, stage and plan. Send your records and we'll prepare a personalized quote for free — no obligation.",
    cta: "Get a free quote →",
    disclaimer: "⚠️ Treatment stages and costs vary by patient condition. An exact cost and care plan are provided free after a review of your medical records. Korean-medicine immune/rehab care is supportive and does not guarantee a cure.",
    benefits: [
      { t: "Visa-free from Kazakhstan", d: "Visa-free entry to Korea for KZ citizens. We help with documents." },
      { t: "Support in your language", d: "Interpreter and personal manager at every step — from inquiry to discharge." },
      { t: "2× more affordable", d: "30–60% lower cost than Germany or the US at comparable quality." },
    ],
    navCare: "Care journey", navConsult: "Free consultation", navVisa: "Visa",
  },
  ko: {
    heroTitle: "한국 암치료, 얼마나 들까요?",
    heroLede: "치료 단계를 고르면 무엇이 포함되는지 보여드려요. 정확한 견적과 상담은 무료입니다.",
    labelType: "질환 종류", labelProgram: "치료 단계", includesLabel: "포함 내용",
    cancers: ["위암", "폐암", "유방암", "간암", "갑상선암", "대장암", "기타 / 잘 모름"],
    programs: {
      diagnosis: { name: "진단 및 2차 소견", desc: "의료기록·영상 검토, 한국 전문의의 2차 소견, 권장 케어 계획 안내." },
      surgery: { name: "수술·항암 (상급종합병원)", desc: "협진 상급종합병원에서 수술·항암·방사선 등 표준 암치료." },
      immune: { name: "면역·재활 케어 (한방 보조)", desc: "면력한방병원에서 면역지원·부작용 관리·재활. 보조 요법이며 암 치료/완치가 아닙니다." },
    },
    quoteTitle: "정확한 비용? 무료 상담으로.", quoteText: "비용은 암종·병기·치료계획에 따라 달라집니다. 의료기록을 보내주시면 맞춤 견적을 무료로 준비해 드립니다(부담 없음).",
    cta: "무료 견적 받기 →",
    disclaimer: "⚠️ 치료 단계·비용은 환자 상태에 따라 달라집니다. 정확한 비용·치료계획은 의료기록 검토 후 무료 상담에서 안내합니다. 한방 면역·재활은 보조 요법이며 완치를 보장하지 않습니다.",
    benefits: [
      { t: "카자흐스탄 무비자", d: "카자흐 국민은 한국 무비자 입국. 서류를 도와드립니다." },
      { t: "모국어 지원", d: "문의부터 퇴원까지 통역사·전담 매니저가 모든 단계 동행." },
      { t: "2배 저렴", d: "독일·미국 대비 30~60% 저렴, 동등한 의료 품질." },
    ],
    navCare: "치료 여정", navConsult: "무료 상담", navVisa: "비자",
  },
  ru: {
    heroTitle: "Сколько стоит лечение рака в Корее?",
    heroLede: "Выберите этап лечения, чтобы увидеть, что входит. Точный расчёт и консультацию на русском мы предоставляем бесплатно.",
    labelType: "Тип заболевания", labelProgram: "Этап лечения", includesLabel: "Что входит",
    cancers: ["Рак желудка", "Рак лёгких", "Рак молочной железы", "Рак печени", "Рак щитовидной железы", "Колоректальный рак", "Другое / не уверен(а)"],
    programs: {
      diagnosis: { name: "Диагностика и второе мнение", desc: "Изучение медицинских документов и снимков, второе мнение корейского онколога и рекомендованный план." },
      surgery: { name: "Хирургия и онкология (клиника 3-го уровня)", desc: "Стандартное лечение рака — операция, химиотерапия, лучевая терапия — в наших партнёрских клиниках." },
      immune: { name: "Иммунная поддержка и реабилитация (корейская медицина)", desc: "Поддерживающая иммунотерапия, управление побочными эффектами и реабилитация в клинике Myeonryeok. Поддерживающая терапия — не лечение рака." },
    },
    quoteTitle: "Точная стоимость? Бесплатная консультация.", quoteText: "Стоимость зависит от типа рака, стадии и плана. Пришлите документы — мы бесплатно подготовим персональный расчёт, без обязательств.",
    cta: "Получить бесплатный расчёт →",
    disclaimer: "⚠️ Этапы лечения и стоимость зависят от состояния пациента. Точная стоимость и план предоставляются бесплатно после изучения медицинских документов. Иммунная/реабилитационная терапия корейской медицины является поддерживающей и не гарантирует излечения.",
    benefits: [
      { t: "Без визы из Казахстана", d: "Безвизовый въезд в Корею для граждан РК. Помогаем с документами." },
      { t: "Сопровождение на русском", d: "Переводчик и личный менеджер на всех этапах — от заявки до выписки." },
      { t: "Дешевле в 2 раза", d: "Стоимость на 30–60% ниже, чем в Германии или США при сопоставимом качестве." },
    ],
    navCare: "Лечение рака в Корее", navConsult: "Бесплатная консультация", navVisa: "Виза",
  },
  kz: {
    heroTitle: "Кореяда қатерлі ісікті емдеу қанша тұрады?",
    heroLede: "Емдеу кезеңін таңдаңыз — не кіретінін көрсетеміз. Нақты есеп пен кеңесті тегін береміз.",
    labelType: "Ауру түрі", labelProgram: "Емдеу кезеңі", includesLabel: "Не кіреді",
    cancers: ["Асқазан қатерлі ісігі", "Өкпе қатерлі ісігі", "Сүт безі қатерлі ісігі", "Бауыр қатерлі ісігі", "Қалқанша без қатерлі ісігі", "Колоректальды қатерлі ісік", "Басқа / сенімді емеспін"],
    programs: {
      diagnosis: { name: "Диагностика және екінші пікір", desc: "Медициналық құжаттар мен суреттерді қарау, корей онкологінің екінші пікірі және ұсынылған жоспар." },
      surgery: { name: "Хирургия және онкология (жоғары деңгейлі аурухана)", desc: "Серіктес ауруханаларда операция, химиотерапия, сәулелік терапия — стандартты ем." },
      immune: { name: "Иммундық қолдау және оңалту (корей медицинасы)", desc: "Myeonryeok клиникасында қолдау иммунотерапиясы, жанама әсерлерді басқару және оңалту. Қолдау терапиясы — ісікті емдеу емес." },
    },
    quoteTitle: "Нақты құны? Тегін кеңес.", quoteText: "Құны ісік түріне, сатысына және жоспарға байланысты. Құжаттарды жіберсеңіз, жеке есепті тегін дайындаймыз — міндеттемесіз.",
    cta: "Тегін есеп алу →",
    disclaimer: "⚠️ Емдеу кезеңдері мен құны пациент жағдайына байланысты. Нақты құн мен жоспар медициналық құжаттарды қарағаннан кейін тегін беріледі. Корей медицинасының иммундық/оңалту терапиясы қолдау болып табылады және сауығуға кепілдік бермейді.",
    benefits: [
      { t: "Қазақстаннан визасыз", d: "ҚР азаматтары үшін Кореяға визасыз кіру. Құжаттарға көмектесеміз." },
      { t: "Тіліңізде қолдау", d: "Өтініштен шығуға дейін аудармашы мен жеке менеджер әр кезеңде." },
      { t: "2 есе арзан", d: "Германия мен АҚШ-пен салыстырғанда 30–60% арзан, сапасы тең." },
    ],
    navCare: "Емдеу жолы", navConsult: "Тегін кеңес", navVisa: "Виза",
  },
  zh: {
    heroTitle: "在韩国治疗癌症需要多少钱？",
    heroLede: "选择治疗阶段，查看包含内容。精确报价与咨询均免费提供。",
    labelType: "疾病类型", labelProgram: "治疗阶段", includesLabel: "包含内容",
    cancers: ["胃癌", "肺癌", "乳腺癌", "肝癌", "甲状腺癌", "结直肠癌", "其他 / 不确定"],
    programs: {
      diagnosis: { name: "诊断与第二意见", desc: "审阅病历与影像，韩国肿瘤专家第二意见，并提供推荐方案。" },
      surgery: { name: "手术与肿瘤治疗（三级医院）", desc: "在合作三级医院进行手术、化疗、放疗等标准癌症治疗。" },
      immune: { name: "免疫与康复护理（韩医辅助）", desc: "在Myeonryeok韩医医院进行免疫支持、副作用管理与康复。辅助疗法 — 并非治愈癌症。" },
    },
    quoteTitle: "精确费用？免费咨询。", quoteText: "费用因癌种、分期与方案而异。发送病历，我们免费为您准备个性化报价，无需承诺。",
    cta: "获取免费报价 →",
    disclaimer: "⚠️ 治疗阶段与费用因患者病情而异。精确费用与方案在审阅病历后免费提供。韩医免疫/康复护理为辅助性质，不保证治愈。",
    benefits: [
      { t: "哈萨克斯坦免签", d: "哈萨克公民免签入境韩国。我们协助办理材料。" },
      { t: "母语支持", d: "从咨询到出院，翻译与专属经理全程陪同。" },
      { t: "便宜一半", d: "在同等质量下，比德国或美国低 30–60%。" },
    ],
    navCare: "治疗旅程", navConsult: "免费咨询", navVisa: "签证",
  },
  ja: {
    heroTitle: "韓国でのがん治療はいくら？",
    heroLede: "治療段階を選ぶと、含まれる内容が分かります。正確な見積もりとご相談は無料です。",
    labelType: "疾患の種類", labelProgram: "治療段階", includesLabel: "含まれる内容",
    cancers: ["胃がん", "肺がん", "乳がん", "肝臓がん", "甲状腺がん", "大腸がん", "その他 / わからない"],
    programs: {
      diagnosis: { name: "診断・セカンドオピニオン", desc: "診療記録・画像の確認、韓国の腫瘍専門医によるセカンドオピニオン、推奨ケアプランのご案内。" },
      surgery: { name: "手術・腫瘍治療（高度医療機関）", desc: "提携の高度医療機関で手術・化学療法・放射線などの標準的ながん治療。" },
      immune: { name: "免疫・リハビリケア（韓方・補助）", desc: "Myeonryeok韓方病院での免疫サポート・副作用管理・リハビリ。補助療法であり、がんの治癒ではありません。" },
    },
    quoteTitle: "正確な費用は？無料相談で。", quoteText: "費用はがんの種類・進行度・計画により異なります。記録をお送りいただければ、無料で個別見積もりを作成します（義務なし）。",
    cta: "無料見積もりを受ける →",
    disclaimer: "⚠️ 治療段階・費用は患者の状態により異なります。正確な費用と計画は診療記録の確認後に無料で提供します。韓方の免疫・リハビリケアは補助的なもので、治癒を保証しません。",
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

  const [cancerIdx, setCancerIdx] = useState(0);
  const [programKey, setProgramKey] = useState("diagnosis");
  const program = c.programs[programKey];

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

        {/* 치료 단계 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{c.labelProgram}</label>
          <div className="grid sm:grid-cols-3 gap-2">
            {PROGRAM_KEYS.map((key, i) => (
              <button
                key={key}
                onClick={() => setProgramKey(key)}
                className={`text-left px-4 py-3 rounded-lg border text-sm transition-all ${
                  programKey === key
                    ? "bg-teal-50 text-teal-800 border-teal-200 shadow-sm"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                <span className="text-xs text-gray-400 tabular-nums">{i + 1}</span>
                <span className="font-medium block mt-0.5">{c.programs[key].name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 선택 단계 포함 내용 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-500 mb-1">{c.includesLabel}</p>
          <p className="text-sm text-gray-700 leading-relaxed">{program.desc}</p>
        </div>
      </section>

      {/* 무료 견적 CTA (금액 대신) */}
      <section className="bg-teal-600 text-white rounded-xl p-6 md:p-8 mt-5 text-center">
        <h2 className="text-xl md:text-2xl font-bold mb-2">{c.quoteTitle}</h2>
        <p className="text-sm text-teal-100 max-w-xl mx-auto">{c.quoteText}</p>
        <p className="text-xs text-teal-100/80 mt-3">{c.cancers[cancerIdx]} · {program.name}</p>
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
