"use client";

import Link from "next/link";
import { ArrowRight, Phone, MapPin, Clock, Car } from "lucide-react";
import { IMMUNE_PHOTOS } from "../../../components/healo/Photos";
import { useLang } from "@/lib/i18n/LangContext";
import { IMMUNE_HOSPITAL as H } from "@/lib/data/immuneHospitalInfo";

/* ───────── 섹션 라벨 i18n (6개 언어) ───────── */
const COPY = {
  ko: {
    eyebrow: "healwith 직영 파트너",
    heroLede:
      "한방과 현대의학을 결합한 통합 면역치료 전문 병원. 2017년 개원 이후 누적 50,000+ 사례. 의료진·임상 영양사·치료식 셰프가 함께 한 명의 환자를 돌봅니다.",
    requestConsult: "상담 신청",
    statCases: "누적 케이스",
    statYears: "운영 기간",
    statBranches: "지점",
    statDoctors: "전담 의료진",
    statHealing: "힐링 공간",
    yearsUnit: "년",
    philosophyEyebrow: "치료 철학",
    philosophyTitle: "ITCR — 다섯 가지 원칙",
    philosophyBody:
      "Immune Hospital은 모든 암 회복 프로그램을 이 다섯 가지 원칙 위에 구성합니다. 개별 치료가 아닌, 서로 맞물려 작동하는 하나의 체계입니다.",
    cancerEyebrow: "암종별 프로그램",
    cancerTitle: "같은 원칙, 암종별 맞춤 프로그램",
    treatEyebrow: "구체적 치료법",
    treatTitle: "실제로 사용하는 치료 목록",
    progEyebrow: "심신통합 프로그램",
    progTitle: "병상 밖의 치료",
    doctorsEyebrow: "의료진",
    doctorsTitle: "한방 · 양방 · 영양 협진",
    facilitiesEyebrow: "시설",
    facilitiesTitle: "회복을 위한 공간",
    branchesEyebrow: "지점 & 오시는 길",
    branchesTitle: "전국 4개 지점",
    branchLabel: "지점",
    ctaTitle: "Immune Hospital에서 시작하세요",
    ctaBody: "healwith 코디네이터가 영업일 기준 하루 안에 선호 언어로 회신드립니다.",
  },
  en: {
    eyebrow: "healwith direct partner",
    heroLede:
      "Integrative immune care combining Korean Medicine and modern oncology. Founded 2017, 50,000+ cumulative cases. Physicians, clinical dietitian, and in-house chef care for each patient together.",
    requestConsult: "Request consultation",
    statCases: "Cumulative cases",
    statYears: "Operating",
    statBranches: "Branches",
    statDoctors: "Physicians",
    statHealing: "Healing space",
    yearsUnit: "yrs",
    philosophyEyebrow: "Care philosophy",
    philosophyTitle: "ITCR — five principles",
    philosophyBody:
      "Every Immune Hospital recovery program is built on these five principles — not separate treatments, but an integrated system that works together.",
    cancerEyebrow: "Cancer-specific programs",
    cancerTitle: "Same principles, tailored for each cancer",
    treatEyebrow: "Treatment methods",
    treatTitle: "What we actually use",
    progEyebrow: "Mind-body programs",
    progTitle: "Treatment beyond the bed",
    doctorsEyebrow: "Medical team",
    doctorsTitle: "Korean Medicine · Western · Nutrition",
    facilitiesEyebrow: "Facilities",
    facilitiesTitle: "Spaces for recovery",
    branchesEyebrow: "Branches & directions",
    branchesTitle: "4 branches nationwide",
    branchLabel: "Branch",
    ctaTitle: "Start with Immune Hospital",
    ctaBody: "A healwith coordinator responds in your preferred language within one business day.",
  },
  ru: {
    eyebrow: "Прямой партнёр healwith",
    heroLede:
      "Специализированная клиника интегративной иммунотерапии, объединяющая корейскую медицину и современную онкологию. Открыта в 2017 году, более 50 000 случаев. Врачи, клинический диетолог и шеф-повар заботятся о каждом пациенте вместе.",
    requestConsult: "Записаться на консультацию",
    statCases: "Случаев",
    statYears: "Лет работы",
    statBranches: "Филиалов",
    statDoctors: "Врачей",
    statHealing: "Зоны отдыха",
    yearsUnit: "лет",
    philosophyEyebrow: "Философия лечения",
    philosophyTitle: "ITCR — пять принципов",
    philosophyBody:
      "Каждая программа восстановления Immune Hospital построена на этих пяти принципах — не отдельные процедуры, а единая система, работающая вместе.",
    cancerEyebrow: "Программы по типам рака",
    cancerTitle: "Единые принципы, индивидуальная программа для каждого рака",
    treatEyebrow: "Методы лечения",
    treatTitle: "Что мы действительно применяем",
    progEyebrow: "Программы тела и духа",
    progTitle: "Лечение за пределами палаты",
    doctorsEyebrow: "Медицинская команда",
    doctorsTitle: "Корейская медицина · Западная · Питание",
    facilitiesEyebrow: "Помещения",
    facilitiesTitle: "Пространства для восстановления",
    branchesEyebrow: "Филиалы и как добраться",
    branchesTitle: "4 филиала по всей стране",
    branchLabel: "Филиал",
    ctaTitle: "Начните с Immune Hospital",
    ctaBody: "Координатор healwith ответит на удобном вам языке в течение одного рабочего дня.",
  },
  kz: {
    eyebrow: "healwith тікелей серіктесі",
    heroLede:
      "Корей медицинасы мен заманауи онкологияны біріктірген интегративті иммунотерапия маманданған ауруханасы. 2017 жылы ашылған, 50 000-нан астам жағдай. Дәрігерлер, клиникалық диетолог және ас-су шефі әр пациентпен бірге жұмыс істейді.",
    requestConsult: "Кеңеске өтініш беру",
    statCases: "Жағдай",
    statYears: "Жұмыс жылы",
    statBranches: "Филиал",
    statDoctors: "Дәрігер",
    statHealing: "Демалыс аймағы",
    yearsUnit: "жыл",
    philosophyEyebrow: "Емдеу философиясы",
    philosophyTitle: "ITCR — бес принцип",
    philosophyBody:
      "Immune Hospital-дің әр қалпына келтіру бағдарламасы осы бес принципке негізделген — жеке емдеу емес, бірге жұмыс істейтін біртұтас жүйе.",
    cancerEyebrow: "Обыр түрлері бойынша бағдарлама",
    cancerTitle: "Бірыңғай принциптер, әр обырға арналған бағдарлама",
    treatEyebrow: "Емдеу әдістері",
    treatTitle: "Біз шынымен қолданатын емдер",
    progEyebrow: "Тән мен жан бағдарламалары",
    progTitle: "Төсектен тыс емдеу",
    doctorsEyebrow: "Медициналық топ",
    doctorsTitle: "Корей медицинасы · Батыс · Тамақтану",
    facilitiesEyebrow: "Нысандар",
    facilitiesTitle: "Қалпына келуге арналған кеңістік",
    branchesEyebrow: "Филиалдар және жол",
    branchesTitle: "Ел бойынша 4 филиал",
    branchLabel: "Филиал",
    ctaTitle: "Immune Hospital-дан бастаңыз",
    ctaBody: "healwith координаторы бір жұмыс күні ішінде сізге қолайлы тілде хабарласады.",
  },
  zh: {
    eyebrow: "healwith 直营合作伙伴",
    heroLede:
      "结合韩方医学与现代肿瘤学的整合免疫治疗专科医院。2017年开院，累计逾 50,000 例。医疗团队、临床营养师与治疗膳食主厨共同照护每一位患者。",
    requestConsult: "申请咨询",
    statCases: "累计病例",
    statYears: "运营年数",
    statBranches: "分院",
    statDoctors: "专科医师",
    statHealing: "疗愈空间",
    yearsUnit: "年",
    philosophyEyebrow: "治疗理念",
    philosophyTitle: "ITCR — 五项原则",
    philosophyBody:
      "Immune Hospital 的所有癌症康复项目都建立在这五项原则之上——并非各自独立的治疗，而是相互衔接、协同运作的一套体系。",
    cancerEyebrow: "癌症专科项目",
    cancerTitle: "同一原则，按癌种量身定制",
    treatEyebrow: "治疗方法",
    treatTitle: "我们实际采用的治疗",
    progEyebrow: "身心整合项目",
    progTitle: "病床之外的治疗",
    doctorsEyebrow: "医疗团队",
    doctorsTitle: "韩方 · 西医 · 营养协诊",
    facilitiesEyebrow: "设施",
    facilitiesTitle: "用于康复的空间",
    branchesEyebrow: "分院与交通",
    branchesTitle: "全国 4 家分院",
    branchLabel: "分院",
    ctaTitle: "从 Immune Hospital 开始",
    ctaBody: "healwith 协调员将在一个工作日内以您偏好的语言与您联系。",
  },
  ja: {
    eyebrow: "healwith直営パートナー",
    heroLede:
      "韓方と現代医学を融合した統合免疫治療の専門病院。2017年開院、累計50,000件以上のケース。医療陣・臨床栄養士・治療食シェフが一人の患者を共にケアします。",
    requestConsult: "相談を申し込む",
    statCases: "累計ケース",
    statYears: "運営期間",
    statBranches: "拠点",
    statDoctors: "専任医療陣",
    statHealing: "ヒーリング空間",
    yearsUnit: "年",
    philosophyEyebrow: "治療哲学",
    philosophyTitle: "ITCR — 5つの原則",
    philosophyBody:
      "Immune Hospitalはすべてのがん回復プログラムをこの5つの原則の上に構成します。個別の治療ではなく、互いに噛み合って機能する一つの体系です。",
    cancerEyebrow: "がん種別プログラム",
    cancerTitle: "同じ原則、がん種ごとの個別対応",
    treatEyebrow: "具体的な治療法",
    treatTitle: "実際に用いる治療一覧",
    progEyebrow: "心身統合プログラム",
    progTitle: "病床の外の治療",
    doctorsEyebrow: "医療陣",
    doctorsTitle: "韓方 · 西洋 · 栄養の協診",
    facilitiesEyebrow: "施設",
    facilitiesTitle: "回復のための空間",
    branchesEyebrow: "拠点とアクセス",
    branchesTitle: "全国4拠点",
    branchLabel: "拠点",
    ctaTitle: "Immune Hospitalで始めましょう",
    ctaBody: "healwithコーディネーターが営業日基準で1日以内にご希望の言語でご返信します。",
  },
};

const PROGRAM_PHOTOS = [
  IMMUNE_PHOTOS.programFoodTherapy,
  IMMUNE_PHOTOS.programWalking,
  IMMUNE_PHOTOS.programExercise,
  IMMUNE_PHOTOS.programPicnic,
  IMMUNE_PHOTOS.programClass,
];

export default function ImmuneHospitalClient() {
  const lang = useLang() || "ko";
  const c = COPY[lang] || COPY.ko;
  const l = (obj) => obj?.[lang] || obj?.en || obj?.ko || "";

  const years = new Date().getFullYear() - H.foundedYear;

  return (
    <div className="bg-white">
      {/* ── HERO ───────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 pt-8 pb-10 md:pt-20 md:pb-16">
        <div className="grid md:grid-cols-[6fr_5fr] gap-8 md:gap-12 items-center">
          <div>
            <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-5">
              {c.eyebrow}
            </span>
            <h1 translate="no" className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
              {l(H.officialName)}
            </h1>
            <p className="mt-3 text-base md:text-lg text-teal-700 font-semibold">
              {l(H.tagline)}
            </p>
            <div className="w-12 h-px bg-teal-600 mt-5 mb-5" />
            <p className="text-sm md:text-base text-gray-500 leading-relaxed max-w-xl">
              {c.heroLede}
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-8">
              <Link
                href="/inquiry"
                className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition-colors"
              >
                {c.requestConsult} <ArrowRight size={18} />
              </Link>
              <a
                href={`tel:${H.mainPhone.replace(/[^\d+]/g, "")}`}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-teal-600 hover:text-teal-700 transition-colors"
              >
                <Phone size={16} /> {H.mainPhone}
              </a>
            </div>
          </div>

          <div className="w-full aspect-[4/5] overflow-hidden rounded-xl bg-gray-100">
            <img
              src={IMMUNE_PHOTOS.team}
              alt="Immune Hospital team"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* 통계 바 */}
        <div className="mt-12 pt-8 border-t border-gray-200 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-8 gap-y-6">
          {[
            { num: "50,000+", label: c.statCases },
            { num: String(years), unit: c.yearsUnit, label: c.statYears },
            { num: String(H.branches.length), label: c.statBranches },
            { num: "7+", label: c.statDoctors },
            { num: "24/7", label: c.statHealing },
          ].map((stat, i) => (
            <div key={i}>
              <div className="text-2xl md:text-3xl font-bold text-gray-900 leading-none">
                {stat.num}
                {stat.unit ? <span className="text-base ml-0.5">{stat.unit}</span> : null}
              </div>
              <div className="mt-1.5 text-xs text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── ITCR 5원칙 ───────────────────────────── */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-12 md:py-16">
          <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-4">
            {c.philosophyEyebrow}
          </span>
          <div className="grid md:grid-cols-[5fr_7fr] gap-8 md:gap-12 items-start">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 leading-tight">
                {c.philosophyTitle}
              </h2>
              <div className="w-12 h-px bg-teal-600 mb-4" />
              <p className="text-sm md:text-base text-gray-600 leading-relaxed max-w-md">
                {c.philosophyBody}
              </p>
            </div>
            <div className="divide-y divide-gray-200">
              {H.principles.map((p) => (
                <div key={p.id} className="flex gap-4 py-4 items-start">
                  <span className="shrink-0 w-9 h-9 rounded-lg bg-teal-600 text-white font-bold flex items-center justify-center text-sm">
                    {p.letter}
                  </span>
                  <div>
                    <div className="text-base font-bold text-gray-900 mb-1">{l(p.name)}</div>
                    <div className="text-sm text-gray-500 leading-relaxed">{l(p.description)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 암종별 프로그램 ─────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-12 md:py-16">
        <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-4">
          {c.cancerEyebrow}
        </span>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 md:mb-10 leading-tight max-w-2xl">
          {c.cancerTitle}
        </h2>
        <div className="divide-y divide-gray-200 border-t border-gray-200">
          {H.cancerPrograms.map((cp, i) => (
            <div
              key={cp.id}
              className="grid grid-cols-[auto_1fr] md:grid-cols-[auto_3fr_6fr] gap-x-4 md:gap-x-8 gap-y-2 py-6 items-start"
            >
              <span className="shrink-0 w-9 h-9 rounded-lg bg-teal-50 border border-teal-100 text-teal-700 font-bold flex items-center justify-center text-sm">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="text-lg font-bold text-gray-900 leading-snug self-center md:self-start">
                {l(cp.name)}
              </h3>
              <p className="col-span-2 md:col-span-1 text-sm md:text-base text-gray-500 leading-relaxed">
                {l(cp.focus)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 치료법 상세 ─────────────────────────── */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-12 md:py-16">
          <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-4">
            {c.treatEyebrow}
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 md:mb-10 leading-tight max-w-2xl">
            {c.treatTitle}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {Object.entries(H.treatments).map(([key, t]) => (
              <div key={key} className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
                <div className="text-xs font-bold tracking-wide text-teal-600 uppercase mb-3">
                  {l(t.category)}
                </div>
                <ul className="divide-y divide-gray-200 border-t border-gray-200">
                  {t.items.map((item, i) => (
                    <li key={i} className="py-2.5 text-sm text-gray-700 leading-relaxed">
                      {l(item)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-8 text-xs text-gray-400 leading-relaxed max-w-2xl">
            ※ {l(H.evidenceNote)}
          </p>
        </div>
      </section>

      {/* ── 심신통합 프로그램 갤러리 ─────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-12 md:py-16">
        <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-4">
          {c.progEyebrow}
        </span>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 md:mb-10 leading-tight max-w-2xl">
          {c.progTitle}
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {H.integrativePrograms.map((prog, i) => (
            <article key={prog.id} className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="w-full aspect-[4/5] overflow-hidden bg-gray-100">
                <img
                  src={PROGRAM_PHOTOS[i]}
                  alt={l(prog.label)}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4 md:p-5">
                <div className="text-xs font-bold tracking-wide text-teal-600 mb-1.5">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1.5 leading-snug">{l(prog.label)}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{l(prog.desc)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── 의료진 ───────────────────────────────── */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-12 md:py-16">
          <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-4">
            {c.doctorsEyebrow}
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 md:mb-10 leading-tight max-w-2xl">
            {c.doctorsTitle}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
            {H.doctors.map((d, i) => (
              <article key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="w-full aspect-[3/4] overflow-hidden bg-gray-100">
                  <img
                    src={d.photo}
                    alt={l(d.name)}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <div className="text-xs font-bold tracking-wide text-teal-600 mb-1">{l(d.role)}</div>
                  <h3 translate="no" className="text-base font-bold text-gray-900 mb-1 leading-snug">
                    {l(d.name)}
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{l(d.specialty)}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── 시설 갤러리 ─────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-12 md:py-16">
        <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-4">
          {c.facilitiesEyebrow}
        </span>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 md:mb-10 leading-tight max-w-2xl">
          {c.facilitiesTitle}
        </h2>
        <div className="space-y-10 md:space-y-12">
          {H.facilities.map((f) => (
            <div key={f.id}>
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-1.5">{l(f.name)}</h3>
              <p className="text-sm text-gray-500 leading-relaxed max-w-2xl mb-4">{l(f.description)}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {f.images.map((img, i) => (
                  <div key={i} className="aspect-[4/3] overflow-hidden rounded-xl bg-gray-100">
                    <img
                      src={img}
                      alt={l(f.name)}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 지점 & 오시는 길 ─────────────────────── */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-12 md:py-16">
          <span className="inline-block text-xs font-bold tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-4">
            {c.branchesEyebrow}
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 md:mb-10 leading-tight max-w-2xl">
            {c.branchesTitle}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {H.branches.map((b) => (
              <div key={b.id} className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
                <div className="text-xs font-bold tracking-wide text-gray-400 uppercase mb-2">
                  {c.branchLabel} · {b.id}
                </div>
                <h3 translate="no" className="text-lg font-bold text-gray-900 mb-4 leading-snug">
                  {l(b.name)}
                </h3>
                {b.address && (
                  <p className="flex gap-2 text-sm text-gray-600 leading-relaxed mb-3">
                    <MapPin size={15} className="shrink-0 mt-0.5 text-teal-600" />
                    <span>{l(b.address)}</span>
                  </p>
                )}
                {b.phone && (
                  <a
                    href={`tel:${b.phone.replace(/[^\d+]/g, "")}`}
                    className="flex items-center gap-2 text-sm font-bold text-teal-600 hover:text-teal-700 transition-colors mb-3"
                  >
                    <Phone size={15} className="shrink-0" /> {b.phone}
                  </a>
                )}
                {b.hours && (
                  <div className="flex gap-2 text-xs text-gray-500 leading-relaxed mb-3">
                    <Clock size={15} className="shrink-0 mt-0.5 text-gray-400" />
                    <div>
                      <div>{l(b.hours.weekday)}</div>
                      <div>{l(b.hours.weekend)}</div>
                    </div>
                  </div>
                )}
                {b.parking && (
                  <p className="flex gap-2 text-xs text-gray-500 leading-relaxed mb-3">
                    <Car size={15} className="shrink-0 mt-0.5 text-gray-400" />
                    <span>{l(b.parking)}</span>
                  </p>
                )}
                {b.nearby && (
                  <p className="text-xs font-semibold text-teal-700 leading-relaxed">{l(b.nearby)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────── */}
      <section className="bg-teal-600">
        <div className="max-w-4xl mx-auto px-4 py-14 md:py-20 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 leading-snug">{c.ctaTitle}</h2>
          <p className="text-teal-50 text-sm md:text-base mb-8 max-w-xl mx-auto leading-relaxed">{c.ctaBody}</p>
          <Link
            href="/inquiry"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-teal-700 rounded-xl font-bold hover:bg-teal-50 transition-colors"
          >
            {c.requestConsult} <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
