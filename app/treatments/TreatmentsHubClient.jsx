"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useLang } from "@/lib/i18n/LangContext";
import { CANCERS, TREATMENTS_L } from "./TreatmentsClient";
import { PHOTOS, IMMUNE_PHOTOS } from "../../components/healo/Photos";
import {
  CANCER_DETAILS,
  ITCRN_FRAMEWORK,
} from "@/lib/data/immuneCancerDetails";

const SECTION_PHOTOS = [
  PHOTOS.hero,
  PHOTOS.hospital1,
  PHOTOS.hospital2,
  PHOTOS.hospital3,
  PHOTOS.clinical1,
  PHOTOS.clinical2,
];

// 6개 암종 카드 썸네일 — 면력한방 회복프로그램/시설 실사진(따뜻·희망 톤, DESIGN.md Airbnb).
// 차가운 기계·주사 이미지 대신 회복 장면으로(암환자 정서). 일부는 암종 주제와 연결(식이→푸드테라피, 폐암→운동).
const CANCER_PHOTOS = {
  female: IMMUNE_PHOTOS.programWalking,      // 강변 산책 — 회복·일상복귀
  digest: IMMUNE_PHOTOS.programFoodTherapy,  // 셰프 푸드테라피 — 식이관리 핵심
  liver: IMMUNE_PHOTOS.facilityRoom,         // 프리미엄 입원실 휴식 — 회복
  lung: IMMUNE_PHOTOS.programExercise,       // 운동치료 — 호흡 재활
  thyroid: IMMUNE_PHOTOS.programPicnic,      // 야외 힐링 — 예후 좋음·희망적
  etc: IMMUNE_PHOTOS.programClass,           // 원데이 클래스 — 케어 공동체
};

const ITCRN_KEYS = ["immunity", "temperature", "circulation", "resistibility", "nutrition"];

// 허브 레이블 다국어
const COPY = {
  ko: {
    eyebrow: "치료 안내",
    heroTitle: "암종별 치료 안내",
    lede:
      "healwith는 한국의 종양학 치료와 한방 통합 케어를 함께 안내합니다. 진단에 따라 양방·한방 치료를 단계별로 연결하고, 코디네이터가 전 과정을 지원합니다.",
    cancerHub: "6개 암종",
    cancerHubTitle: "암종을 선택하세요",
    cancerHubBody:
      "각 암종별로 면력한방병원의 특화 프로토콜, 합병증 관리, 수술 후 케어를 담은 전용 페이지를 제공합니다.",
    itcrnTitle: "5축 통합 면역치료 프레임워크",
    itcrnBody: "모든 암종에 ITCRN 프레임워크가 적용됩니다 — 면역·체온·순환·저항성·영양.",
    western: "양방 의학",
    eastern: "한방 의학",
    partnerLabel: "협진 병원",
    kmLabel: "면력한방병원 (healwith 직영)",
    strength: "한국의 강점",
    readGuide: "환자 가이드 보기",
    requestConsult: "상담 신청",
    viewPage: "상세 치료 페이지 보기",
    bottomTitle: "어떤 암종이든 하나의 치료 여정",
    bottomBody:
      "간단한 인테이크를 작성해 주세요. 영업일 기준 하루 안에, 전문의 치료와 적절한 한방 통합 케어를 결합한 맞춤 치료 계획을 안내합니다.",
  },
  en: {
    eyebrow: "Treatments",
    heroTitle: "Cancer Treatment Guide",
    lede:
      "healwith brings together Korea's oncology care and Korean Medicine integrative care. Treatments are connected stage by stage based on your diagnosis, and a coordinator supports the entire process.",
    cancerHub: "6 Cancer Types",
    cancerHubTitle: "Choose your cancer type",
    cancerHubBody:
      "Each cancer type has a dedicated page with Immune Hospital's specialized protocols, complication management, and post-surgical care.",
    itcrnTitle: "5-Axis Integrative Immune Framework",
    itcrnBody: "Every cancer type is treated through the ITCRN framework — Immunity, Temperature, Circulation, Resistibility, Nutrition.",
    western: "Western Medicine",
    eastern: "Korean Medicine",
    partnerLabel: "Partner hospital",
    kmLabel: "Immune Hospital (healwith direct)",
    strength: "Korea's advantage",
    readGuide: "Read patient guide",
    requestConsult: "Request consultation",
    viewPage: "View treatment page",
    bottomTitle: "Whichever cancer type, one journey",
    bottomBody:
      "Submit a brief intake. Within one business day, we present a matched treatment plan — combining specialist oncology care with integrative Korean Medicine when appropriate.",
  },
  ru: {
    eyebrow: "Лечение",
    heroTitle: "Руководство по лечению рака",
    lede:
      "healwith объединяет онкологическую помощь Кореи и интегративную корейскую медицину. В зависимости от диагноза западное и корейское лечение соединяются поэтапно, а координатор сопровождает весь процесс.",
    cancerHub: "6 видов рака",
    cancerHubTitle: "Выберите тип рака",
    cancerHubBody:
      "Каждый тип рака имеет отдельную страницу со специализированными протоколами Immune Hospital, управлением осложнениями и послеоперационным уходом.",
    itcrnTitle: "5-осевая интегративная иммунная система",
    itcrnBody: "Все виды рака лечатся по системе ITCRN — иммунитет, температура, кровообращение, сопротивляемость, питание.",
    western: "Западная медицина",
    eastern: "Корейская медицина",
    partnerLabel: "Партнёрская больница",
    kmLabel: "Иммунная клиника (прямой партнёр healwith)",
    strength: "Преимущество Кореи",
    readGuide: "Руководство для пациентов",
    requestConsult: "Записаться на консультацию",
    viewPage: "Перейти к странице лечения",
    bottomTitle: "Какой бы ни был тип рака — единый путь лечения",
    bottomBody:
      "Заполните короткую анкету. В течение 1 рабочего дня мы предложим индивидуальный план лечения — с участием онколога и корейской медицины, когда это уместно.",
  },
  kz: {
    eyebrow: "Емдеу",
    heroTitle: "Обыр түрлері бойынша емдеу нұсқаулығы",
    lede:
      "healwith Кореяның онкологиялық емі мен корей медицинасының интегративті күтімін бірге ұсынады. Диагнозға қарай батыс және корей емі кезең-кезеңмен байланыстырылады, координатор бүкіл процесте қолдау көрсетеді.",
    cancerHub: "6 обыр түрі",
    cancerHubTitle: "Обыр түрін таңдаңыз",
    cancerHubBody:
      "Әр обыр түрі үшін Immune Hospital-дің арнайы хаттамалары, асқынуларды басқару және операциядан кейінгі күтім туралы бөлек бет беріледі.",
    itcrnTitle: "5 осьті интегративті иммундық жүйе",
    itcrnBody: "Барлық обыр түрі ITCRN жүйесі бойынша емделеді — иммунитет, температура, қан айналымы, төзімділік, тамақтану.",
    western: "Батыс медицинасы",
    eastern: "Корей медицинасы",
    partnerLabel: "Серіктес аурухана",
    kmLabel: "Immune Hospital (healwith тікелей)",
    strength: "Кореяның артықшылығы",
    readGuide: "Пациент нұсқаулығын қарау",
    requestConsult: "Кеңеске өтініш беру",
    viewPage: "Емдеу бетін қарау",
    bottomTitle: "Қай обыр түрі болсын — бір емдеу жолы",
    bottomBody:
      "Қысқа анкета толтырыңыз. Бір жұмыс күні ішінде маман емі мен қажет болған жағдайда корей медицинасының интегративті күтімін біріктірген жеке емдеу жоспарын ұсынамыз.",
  },
  zh: {
    eyebrow: "治疗指南",
    heroTitle: "癌症治疗指南",
    lede:
      "healwith 将韩国的肿瘤治疗与韩方整合护理结合在一起。根据诊断分阶段衔接西医与韩方治疗，并由协调员全程提供支持。",
    cancerHub: "6种癌症",
    cancerHubTitle: "选择您的癌症类型",
    cancerHubBody:
      "每种癌症都有专属页面，包含 Immune Hospital 的专业方案、并发症管理及术后护理。",
    itcrnTitle: "五轴整合免疫框架",
    itcrnBody: "所有癌症均通过 ITCRN 框架治疗——免疫、体温、循环、抵抗力、营养。",
    western: "西方医学",
    eastern: "韩方医学",
    partnerLabel: "协诊医院",
    kmLabel: "Immune Hospital（healwith 直营）",
    strength: "韩国的优势",
    readGuide: "查看患者指南",
    requestConsult: "申请咨询",
    viewPage: "查看治疗页面",
    bottomTitle: "无论哪种癌症，同一段治疗旅程",
    bottomBody:
      "请填写简短的问诊表。我们将在一个工作日内，为您提供结合专科肿瘤治疗与适当韩方整合护理的个性化治疗方案。",
  },
  ja: {
    eyebrow: "治療案内",
    heroTitle: "がん種別の治療ガイド",
    lede:
      "healwithは韓国の腫瘍治療と韓方統合ケアをあわせてご案内します。診断に応じて西洋医学と韓方の治療を段階的につなぎ、コーディネーターが全過程をサポートします。",
    cancerHub: "6つのがん種",
    cancerHubTitle: "がん種を選んでください",
    cancerHubBody:
      "各がん種ごとに、面力韓方病院の専門プロトコル・合併症管理・術後ケアをまとめた専用ページをご用意しています。",
    itcrnTitle: "5軸統合免疫フレームワーク",
    itcrnBody: "すべてのがん種にITCRNフレームワークが適用されます — 免疫・体温・循環・抵抗力・栄養。",
    western: "西洋医学",
    eastern: "韓方医学",
    partnerLabel: "協診病院",
    kmLabel: "面力韓方病院（healwith直営）",
    strength: "韓国の強み",
    readGuide: "患者ガイドを見る",
    requestConsult: "相談を申し込む",
    viewPage: "治療ページを見る",
    bottomTitle: "どのがん種でも、ひとつの治療の旅",
    bottomBody:
      "簡単なインテークをご記入ください。営業日基準で1日以内に、専門医の治療と必要に応じた韓方統合ケアを組み合わせた個別の治療プランをご案内します。",
  },
};

export default function TreatmentsHubClient() {
  const lang = useLang();
  const copy = COPY[lang] || COPY.ko;
  const l = (obj) => obj?.[lang] || obj?.en || obj?.ko || "";

  return (
    <div className="bg-white">
      {/* HERO */}
      <section className="max-w-4xl mx-auto px-4 pt-8 pb-10 md:pt-20 md:pb-16">
        <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-5">
          {copy.eyebrow}
        </span>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
          {copy.heroTitle}
        </h1>
        <p className="mt-5 text-base md:text-lg text-gray-500 leading-relaxed max-w-2xl">
          {copy.lede}
        </p>
        <Link
          href="/intake"
          className="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition-colors"
        >
          {copy.requestConsult} <ArrowRight size={18} />
        </Link>

        {/* 통계 바 — 모바일은 2×2 그리드 (flex-wrap 은 3+1 로 어색하게 깨졌음) */}
        <div className="mt-8 md:mt-12 pt-6 md:pt-8 border-t border-gray-200 grid grid-cols-2 sm:flex sm:flex-wrap gap-x-10 gap-y-6">
          {[
            { num: "50,000+", label: lang === "ko" ? "누적 케이스" : lang === "ru" ? "Случаев" : lang === "kz" ? "Жағдай" : lang === "zh" ? "累计病例" : lang === "ja" ? "累計ケース" : "Cumulative cases" },
            { num: "5", label: lang === "ko" ? "면역 회복 요소" : lang === "ru" ? "Факторы восстановления иммунитета" : lang === "kz" ? "Иммунитетті қалпына келтіру факторлары" : lang === "zh" ? "免疫恢复要素" : lang === "ja" ? "免疫回復の要素" : "Immune recovery factors" },
            { num: "6", label: lang === "ko" ? "암종 전문 케어" : lang === "ru" ? "Видов рака" : lang === "kz" ? "Обыр түрі" : lang === "zh" ? "癌症专科" : lang === "ja" ? "がん種専門" : "Cancer specialties" },
            { num: "2017", label: lang === "ko" ? "개원" : lang === "ru" ? "Основан" : lang === "kz" ? "Ашылды" : lang === "zh" ? "开院" : lang === "ja" ? "開院" : "Founded" },
          ].map((stat, i) => (
            <div key={i}>
              <div className="text-2xl md:text-3xl font-bold text-gray-900 leading-none">{stat.num}</div>
              <div className="mt-1.5 text-xs text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── ITCRN 5축 설명 ─────────────────────── */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-16">
          <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-4">
            ITCRN Framework
          </span>
          <div className="grid md:grid-cols-[5fr_7fr] gap-8 md:gap-12 items-start">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">{copy.itcrnTitle}</h2>
              <div className="w-12 h-px bg-teal-600 mb-4" />
              <p className="text-sm md:text-base text-gray-600 leading-relaxed max-w-md">{copy.itcrnBody}</p>
            </div>
            <div className="divide-y divide-gray-200">
              {ITCRN_KEYS.map((key, idx) => {
                const axis = ITCRN_FRAMEWORK[key];
                if (!axis) return null;
                const letter = ["I", "T", "C", "R", "N"][idx];
                return (
                  <div key={key} className="flex gap-4 py-4 items-start">
                    <span className="shrink-0 w-9 h-9 rounded-lg bg-teal-600 text-white font-bold flex items-center justify-center text-sm">
                      {letter}
                    </span>
                    <div>
                      <div className="text-base font-bold text-gray-900 mb-1">{l(axis.title)}</div>
                      <div className="text-sm text-gray-500 leading-relaxed">{l(axis.desc)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── 암종 6개 카드 허브 ───────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 py-12 md:py-16">
        <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-4">
          {copy.cancerHub}
        </span>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">{copy.cancerHubTitle}</h2>
        <p className="text-sm md:text-base text-gray-500 leading-relaxed max-w-2xl mb-8 md:mb-10">{copy.cancerHubBody}</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {Object.values(CANCER_DETAILS).map((cancer, idx) => (
            <Link
              key={cancer.slug}
              href={`/treatments/${cancer.slug}`}
              className="group block border border-gray-200 rounded-xl overflow-hidden hover:border-teal-300 hover:shadow-md transition-all"
            >
              <article>
                <div className="w-full aspect-[16/9] overflow-hidden bg-gray-100 border-b border-gray-100">
                  <img
                    src={CANCER_PHOTOS[cancer.slug] || PHOTOS.clinical1}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-5 md:p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2 leading-snug">{l(cancer.title)}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed mb-4 line-clamp-3">{l(cancer.intro)}</p>
                  {l(cancer.focusPrograms)?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {l(cancer.focusPrograms).slice(0, 2).map((prog, i) => (
                        <span
                          key={i}
                          className="text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-2.5 py-0.5"
                        >
                          {prog}
                        </span>
                      ))}
                    </div>
                  )}
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-teal-600">
                    {copy.viewPage} <ArrowRight size={16} />
                  </span>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 암종별 상세 패널 (기존 CANCERS 데이터 활용) ─────────── */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-16 space-y-8 md:space-y-10">
          {CANCERS.slice(0, 4).map((c, idx) => (
            <article
              key={idx}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden"
            >
              <div className="grid md:grid-cols-[5fr_7fr] gap-0">
                <div className="w-full aspect-[4/5] md:aspect-auto overflow-hidden bg-gray-100">
                  <img
                    src={SECTION_PHOTOS[idx % SECTION_PHOTOS.length]}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-5 md:p-8">
                  <div className="text-xs font-bold tracking-wide text-teal-600 mb-3">
                    {String(idx + 1).padStart(2, "0")}
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 leading-tight">
                    {l(c.type)}
                  </h2>
                  <p className="text-base text-teal-700 font-semibold leading-relaxed mb-5">
                    {l(c.koreaStrength)}
                  </p>
                  <div className="w-12 h-px bg-teal-600 mb-6" />
                  <div className="grid sm:grid-cols-2 gap-6">
                    {[
                      { label: copy.western, sub: copy.partnerLabel, items: c.western },
                      { label: copy.eastern, sub: copy.kmLabel, items: c.eastern },
                    ].map((col, ci) => (
                      <div key={ci}>
                        <div className="text-xs font-bold tracking-wide text-gray-900 uppercase">{col.label}</div>
                        <div className="text-xs text-gray-400 mb-3">{col.sub}</div>
                        <ul className="divide-y divide-gray-200 border-t border-gray-200">
                          {col.items?.map((t, i) => (
                            <li key={i} className="flex gap-2 py-2.5 text-sm text-gray-600 leading-relaxed">
                              <span className="shrink-0 text-xs font-bold text-teal-600 mt-0.5">
                                {String(i + 1).padStart(2, "0")}
                              </span>
                              <span>{l(t)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 mt-6">
                    <Link
                      href="/education"
                      className="inline-flex items-center gap-1.5 text-sm font-bold text-teal-600 hover:text-teal-700 transition-colors"
                    >
                      {copy.readGuide} <ArrowRight size={16} />
                    </Link>
                    <Link
                      href="/intake"
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition-colors"
                    >
                      {copy.requestConsult} <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── 면력한방병원 통합 프로그램 ─────────────────── */}
      <section className="max-w-4xl mx-auto px-4 py-12 md:py-16">
        <div className="max-w-2xl mb-10 md:mb-12">
          <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-4">
            {lang === "ko" ? "한방 통합 케어" : lang === "ru" ? "Интегративная медицина" : lang === "kz" ? "Интегративті күтім" : lang === "zh" ? "韩方整合护理" : lang === "ja" ? "韓方統合ケア" : "Integrative Korean Medicine"}
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 leading-tight">
            {lang === "ko"
              ? "의료진·영양·생활관리 통합 케어"
              : lang === "ru"
              ? "Интегрированный уход: врачи, питание, образ жизни"
              : lang === "kz"
              ? "Дәрігерлер, тамақтану және өмір салтын біріктірген күтім"
              : lang === "zh"
              ? "医疗·营养·生活管理一体化护理"
              : lang === "ja"
              ? "医療・栄養・生活管理の統合ケア"
              : "Integrated care: medical, nutrition, daily life"}
          </h2>
          <div className="w-12 h-px bg-teal-600 mb-4" />
          <p className="text-sm md:text-base text-gray-600 leading-relaxed">
            {lang === "ko"
              ? "healwith 직영 면력한방병원(Immune Hospital)은 의료진·임상영양사·치료식 셰프가 함께 한 명의 환자를 돌봅니다. 누적 50,000건 이상의 케이스."
              : lang === "ru"
              ? "В Immune Hospital — прямом партнёре healwith — врачи, диетологи и шеф-повар заботятся о каждом пациенте. Более 50 000 случаев."
              : lang === "kz"
              ? "healwith тікелей басқаратын Immune Hospital-да дәрігерлер, клиникалық диетологтар мен емдік ас-су шефі әр пациентпен бірге жұмыс істейді. 50 000-нан астам жағдай."
              : lang === "zh"
              ? "healwith 直营的 Immune Hospital 由医疗团队、临床营养师与治疗膳食主厨共同照护每一位患者。累计超过 50,000 例。"
              : lang === "ja"
              ? "healwith直営の面力韓方病院(Immune Hospital)は、医療陣・臨床栄養士・治療食シェフが一人の患者を共にケアします。累計50,000件以上のケース。"
              : "At Immune Hospital — healwith's direct partner — physicians, clinical dietitians, and a full-time therapeutic chef care for each patient together. Over 50,000 cases to date."}
          </p>
          <div className="mt-5">
            <Link
              href="/hospitals/immune"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-teal-600 hover:text-teal-700 transition-colors"
            >
              {lang === "ko" ? "면력한방병원 자세히 보기" : lang === "ru" ? "Подробнее об Immune Hospital" : lang === "kz" ? "Immune Hospital туралы толығырақ" : lang === "zh" ? "了解 Immune Hospital 详情" : lang === "ja" ? "面力韓方病院の詳細を見る" : "Learn more about Immune Hospital"}
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {[
            {
              photo: IMMUNE_PHOTOS.programFoodTherapy,
              labelKo: "셰프 푸드테라피", labelEn: "Chef food therapy", labelRu: "Фудтерапия шефа", labelKz: "Шеф фудтерапиясы", labelZh: "主厨食疗", labelJa: "シェフ・フードセラピー",
              descKo: "2주 1회 전담 셰프와 함께하는 맞춤 치료식",
              descEn: "Bi-weekly personalized therapeutic meals with an in-house chef",
              descRu: "Индивидуальное лечебное питание 2 раза в месяц",
              descKz: "Екі аптада бір рет арнайы шефпен жеке емдік ас",
              descZh: "每两周一次由专属主厨准备的个性化治疗膳食",
              descJa: "2週に1回、専任シェフによる個別の治療食",
            },
            {
              photo: IMMUNE_PHOTOS.programWalking,
              labelKo: "야외 산책", labelEn: "Outdoor walking", labelRu: "Прогулки на свежем воздухе", labelKz: "Серуендеу", labelZh: "户外散步", labelJa: "屋外ウォーキング",
              descKo: "평일 오전, 강변에서 회복의 시간",
              descEn: "Riverside walks every weekday morning",
              descRu: "Прогулки вдоль реки каждое утро",
              descKz: "Жұмыс күндері таңертең өзен жағасында серуен",
              descZh: "工作日清晨在河边的康复时光",
              descJa: "平日の朝、川辺での回復の時間",
            },
            {
              photo: IMMUNE_PHOTOS.programExercise,
              labelKo: "운동치료", labelEn: "Movement therapy", labelRu: "Двигательная терапия", labelKz: "Қозғалыс терапиясы", labelZh: "运动治疗", labelJa: "運動療法",
              descKo: "주 1회 전문 치료사 동반 개별 세션",
              descEn: "Weekly guided sessions with a specialist",
              descRu: "Еженедельные сеансы со специалистом",
              descKz: "Аптасына бір рет маманмен жеке сабақ",
              descZh: "每周一次由专业治疗师陪同的个别课程",
              descJa: "週1回、専門セラピスト同伴の個別セッション",
            },
            {
              photo: IMMUNE_PHOTOS.programPicnic,
              labelKo: "힐링 소풍", labelEn: "Healing picnic", labelRu: "Пикник исцеления", labelKz: "Сауықтыру серуені", labelZh: "疗愈野餐", labelJa: "ヒーリングピクニック",
              descKo: "주 1회 병원 밖에서의 휴식과 대화",
              descEn: "Weekly off-site rest and conversation",
              descRu: "Еженедельный отдых за пределами больницы",
              descKz: "Аптасына бір рет аурухана сыртында демалу",
              descZh: "每周一次在医院外的休息与交流",
              descJa: "週1回、病院外での休息と対話",
            },
            {
              photo: IMMUNE_PHOTOS.programClass,
              labelKo: "원데이 클래스", labelEn: "One-day class", labelRu: "Однодневный класс", labelKz: "Бір күндік сабақ", labelZh: "一日课程", labelJa: "ワンデイクラス",
              descKo: "공예·명상·셀프케어 주제별 프로그램",
              descEn: "Craft · meditation · self-care weekly themes",
              descRu: "Творчество · медитация · самопомощь",
              descKz: "Қолөнер · медитация · өзіне-өзі күтім",
              descZh: "手工·冥想·自我护理的主题课程",
              descJa: "工芸・瞑想・セルフケアのテーマ別プログラム",
            },
          ].map((prog, i) => {
            const label = lang === "ko" ? prog.labelKo : lang === "ru" ? prog.labelRu : lang === "kz" ? prog.labelKz : lang === "zh" ? prog.labelZh : lang === "ja" ? prog.labelJa : prog.labelEn;
            const desc = lang === "ko" ? prog.descKo : lang === "ru" ? prog.descRu : lang === "kz" ? prog.descKz : lang === "zh" ? prog.descZh : lang === "ja" ? prog.descJa : prog.descEn;
            return (
              <article key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="w-full aspect-[4/5] overflow-hidden bg-gray-100">
                  <img
                    src={prog.photo}
                    alt={label}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4 md:p-5">
                  <div className="text-xs font-bold tracking-wide text-teal-600 mb-1.5">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-1.5 leading-snug">{label}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </article>
            );
          })}
        </div>

        {/* 5단계 프로세스 */}
        <div className="mt-12 md:mt-16 bg-gray-50 border border-gray-200 rounded-xl p-5 md:p-8">
          <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-4">
            {lang === "ko" ? "5단계 통합 면역치료" : lang === "ru" ? "5 этапов интегративной иммунотерапии" : lang === "kz" ? "5 кезеңді интегративті иммунотерапия" : lang === "zh" ? "五阶段整合免疫治疗" : lang === "ja" ? "5段階統合免疫治療" : "5-stage integrated immune care"}
          </span>
          <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-6 md:mb-8 leading-snug max-w-2xl">
            {lang === "ko"
              ? "수술 전부터 재발 관리까지, 암의 모든 단계를 함께합니다."
              : lang === "ru"
              ? "От предоперационной подготовки до управления рецидивом — на каждом этапе."
              : lang === "kz"
              ? "Операцияға дейінгі дайындықтан рецидивті басқаруға дейін — әр кезеңде бірге."
              : lang === "zh"
              ? "从术前到复发管理，陪伴癌症的每一个阶段。"
              : lang === "ja"
              ? "手術前から再発管理まで、がんのすべての段階を共にします。"
              : "From before surgery to recurrence management — with you through every phase."}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { num: "01", ko: "수술 전", en: "Pre-surgery", ru: "До операции", kz: "Операцияға дейін", zh: "术前", ja: "手術前", sub: { ko: "면역관리", en: "Immune prep", ru: "Подготовка", kz: "Иммундық дайындық", zh: "免疫准备", ja: "免疫管理" } },
              { num: "02", ko: "수술 후", en: "Post-surgery", ru: "После операции", kz: "Операциядан кейін", zh: "术后", ja: "手術後", sub: { ko: "회복·재활", en: "Recovery", ru: "Восстановление", kz: "Қалпына келу", zh: "恢复·康复", ja: "回復・リハビリ" } },
              { num: "03", ko: "항암 중", en: "During chemo", ru: "Химиотерапия", kz: "Химиотерапия кезінде", zh: "化疗期间", ja: "抗がん中", sub: { ko: "효과 개선", en: "Efficacy boost", ru: "Поддержка", kz: "Тиімділікті арттыру", zh: "提升疗效", ja: "効果改善" } },
              { num: "04", ko: "재발 관리", en: "Recurrence", ru: "Рецидив", kz: "Рецидивті басқару", zh: "复发管理", ja: "再発管理", sub: { ko: "면역 강화", en: "Immune fortification", ru: "Иммунитет", kz: "Иммунитетті нығайту", zh: "免疫强化", ja: "免疫強化" } },
              { num: "05", ko: "추적 관찰", en: "Follow-up", ru: "Наблюдение", kz: "Бақылау", zh: "随访观察", ja: "追跡観察", sub: { ko: "장기 관리", en: "Long-term care", ru: "Долгосрочно", kz: "Ұзақ мерзімді күтім", zh: "长期管理", ja: "長期管理" } },
            ].map((step) => (
              <div key={step.num} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-teal-600 leading-none mb-2.5">{step.num}</div>
                <div className="text-sm font-bold text-gray-900 mb-1 leading-snug">
                  {lang === "ko" ? step.ko : lang === "ru" ? step.ru : lang === "kz" ? step.kz : lang === "zh" ? step.zh : lang === "ja" ? step.ja : step.en}
                </div>
                <div className="text-xs text-gray-500 leading-snug">
                  {lang === "ko" ? step.sub.ko : lang === "ru" ? step.sub.ru : lang === "kz" ? step.sub.kz : lang === "zh" ? step.sub.zh : lang === "ja" ? step.sub.ja : step.sub.en}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-teal-600">
        <div className="max-w-4xl mx-auto px-4 py-14 md:py-20 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-snug">{copy.bottomTitle}</h2>
          <p className="text-teal-50 text-sm md:text-base mb-8 max-w-2xl mx-auto leading-relaxed">{copy.bottomBody}</p>
          <Link
            href="/intake"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-teal-700 rounded-xl font-bold hover:bg-teal-50 transition-colors"
          >
            {copy.requestConsult} <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
