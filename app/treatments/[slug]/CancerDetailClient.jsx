"use client";

import Link from "next/link";
import { useState } from "react";
import { useLang } from "../../../src/lib/i18n/LangContext";
import {
  Eyebrow,
  Rule,
  ButtonGold,
  LinkArrow,
  FilmGrain,
} from "../../../components/healo/Primitives";
import {
  CANCER_DETAILS,
  ITCRN_FRAMEWORK,
  CANCER_IMAGES,
  POST_SURGICAL_CARE,
} from "../../../src/lib/data/immuneCancerDetails";
import { IMMUNE_THERAPIES } from "../../../src/lib/data/immuneTherapies";
import Nav from "../../../components/healo/Nav";
import Footer from "../../../components/healo/Footer";

// ── 다국어 CTA 레이블 ────────────────────────────────────────────
const CTA = {
  ko: { consult: "원격 상담으로 먼저 만나보기", intake: "문의 신청", intakeShort: "문의 신청" },
  en: { consult: "Start with a Remote Consultation", intake: "Submit an Inquiry", intakeShort: "Inquiry" },
  ru: { consult: "Начните с онлайн-консультации", intake: "Оставить заявку", intakeShort: "Заявка" },
  kz: { consult: "Қашықтан кеңесу", intake: "Сұрау жіберу", intakeShort: "Сұрау" },
  ja: { consult: "まずはオンライン相談から", intake: "お問い合わせ", intakeShort: "問い合わせ" },
  zh: { consult: "先进行远程咨询", intake: "提交咨询", intakeShort: "咨询" },
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

// 암종별 영웅 배경 이미지
const HERO_BG = {
  female: CANCER_IMAGES.complications.lymphEdema,
  digest: CANCER_IMAGES.complications.digestive,
  liver: CANCER_IMAGES.complications.liverFailure,
  lung: CANCER_IMAGES.complications.breathingDifficulty,
  thyroid: CANCER_IMAGES.complications.voiceChange,
  etc: CANCER_IMAGES.healGraph,
};

// FAQ 데이터 — 암종별 + 러시아/카자흐 관점
const FAQ_DATA = {
  female: [
    { q: { ko: "치료 기간은 얼마나 되나요?", ru: "Сколько времени занимает лечение?" }, a: { ko: "수술 후 회복에 2~4주, 항암 치료 병행 시 3~6개월 프로그램을 제안합니다. 개인별 상태에 따라 맞춤 계획을 세웁니다.", ru: "Восстановление после операции занимает 2–4 недели; при химиотерапии предлагаем программу 3–6 месяцев." } },
    { q: { ko: "림프부종 치료는 보험이 되나요?", ru: "Покрывается ли лечение лимфедемы страховкой?" }, a: { ko: "림프도수 마사지는 비급여 치료입니다. 30분 90,000원~60분 230,000원 수준입니다. 원격 상담 시 상세 비용 안내드립니다.", ru: "Лимфодренажный массаж — платная процедура, от 90 000 до 230 000 KRW за сеанс. Подробнее — на консультации." } },
    { q: { ko: "통역 서비스가 제공되나요?", ru: "Есть ли услуги переводчика?" }, a: { ko: "HEALO 코디네이터가 러시아어·카자흐어 통역을 지원합니다. 진료 동행도 가능합니다.", ru: "Координатор HEALO обеспечивает перевод на русский и казахский языки, включая сопровождение на приём." } },
    { q: { ko: "한국 방문 비자는 어떻게 받나요?", ru: "Как получить медицинскую визу в Корею?" }, a: { ko: "병원 초청장을 바탕으로 의료 비자(C-3-3) 신청이 가능합니다. 필요 서류 준비를 도와드립니다.", ru: "На основании приглашения из больницы можно подать на медицинскую визу (C-3-3). Поможем подготовить документы." } },
    { q: { ko: "수술 후 귀국은 언제 가능한가요?", ru: "Когда можно вернуться домой после операции?" }, a: { ko: "외과 수술 후 최소 2주 이상 체류를 권장합니다. 항공 탑승 전 담당 의료진의 확인이 필요합니다.", ru: "После операции рекомендуем остаться минимум 2 недели. Перед перелётом необходимо получить разрешение врача." } },
  ],
  digest: [
    { q: { ko: "대장·위암 수술 후 식이는 어떻게 관리하나요?", ru: "Как управлять питанием после операции?" }, a: { ko: "저잔사 치료식과 위절제 치료식(덤핑증후군 관리)을 수술 직후부터 제공합니다. 전담 영양사가 매일 개인별 식단을 모니터링합니다.", ru: "Предоставляем низкошлаковую диету и диету после гастрэктомии с первого дня. Диетолог ежедневно контролирует питание." } },
    { q: { ko: "장루 관리는 어떻게 배우나요?", ru: "Как обучают уходу за стомой?" }, a: { ko: "전담 간호사가 8가지 장루 관리 프로토콜을 교육합니다. 귀국 후에도 원격으로 지속 지원합니다.", ru: "Специализированная медсестра обучит 8 протоколам ухода за стомой. После отъезда поддержка продолжается онлайн." } },
    { q: { ko: "치료 비용은 얼마인가요?", ru: "Сколько стоит лечение?" }, a: { ko: "치료 구성에 따라 다르며, 원격 상담 후 개인별 견적을 제공합니다. 고주파온열 1회 250,000원 등 주요 비용을 안내드립니다.", ru: "Стоимость зависит от состава лечения. Индивидуальную смету предоставим после консультации. Напр., гипертермия — 250 000 KRW/сеанс." } },
    { q: { ko: "통역 및 코디네이터 서비스가 있나요?", ru: "Есть ли переводчик и координатор?" }, a: { ko: "HEALO 전담 코디네이터가 러시아어·카자흐어로 지원하며 병원 동행, 문서 번역, 일정 조율 모두 포함됩니다.", ru: "Координатор HEALO сопровождает на всех визитах, переводит документы и организует расписание." } },
  ],
  liver: [
    { q: { ko: "췌장암 수술 후 당뇨는 어떻게 관리하나요?", ru: "Как управлять диабетом после операции на поджелудочной?" }, a: { ko: "췌장 기능 저하로 인한 수술 후 당뇨는 영양 맞춤식과 혈당 모니터링으로 관리합니다. 담당 내과의와 한방 의사가 협진합니다.", ru: "Послеоперационный диабет управляется диетой и мониторингом глюкозы. Терапевт и врач корейской медицины работают совместно." } },
    { q: { ko: "간 수술 후 황달이 생기면 어떻게 하나요?", ru: "Что делать при желтухе после операции на печени?" }, a: { ko: "황달·가려움·발열 증상은 담도 폐쇄 신호일 수 있습니다. 즉시 의료진에게 알려주세요. 입원 기간 동안 매일 모니터링합니다.", ru: "Желтуха, зуд или жар могут указывать на закупорку желчных протоков. Немедленно сообщите врачу. Ежедневный мониторинг обеспечен." } },
    { q: { ko: "러시아에서 진단서를 번역해도 되나요?", ru: "Можно ли перевести документы из России?" }, a: { ko: "네, 러시아어 진단서·검사 결과를 HEALO가 번역·검토하여 한국 의료진에게 전달합니다.", ru: "Да, HEALO переводит и передаёт российские медицинские документы и результаты анализов корейским врачам." } },
    { q: { ko: "치료 후 귀국 시 추적 관찰은 어떻게 하나요?", ru: "Как проходит наблюдение после возвращения домой?" }, a: { ko: "원격 진료를 통해 귀국 후에도 한국 의사와 3개월, 6개월 주기로 추적 상담이 가능합니다.", ru: "После возвращения доступны онлайн-консультации с корейским врачом каждые 3–6 месяцев." } },
  ],
  lung: [
    { q: { ko: "폐 절제 후 호흡 재활은 얼마나 걸리나요?", ru: "Сколько времени занимает дыхательная реабилитация?" }, a: { ko: "폐엽 절제 기준 4~8주 프로그램을 권장합니다. 적외선온열과 호흡 재활 운동을 병행합니다.", ru: "После лобэктомии рекомендуется программа 4–8 недель с инфракрасной термотерапией и дыхательными упражнениями." } },
    { q: { ko: "항암치료 중 병행 치료가 가능한가요?", ru: "Можно ли совмещать лечение с химиотерапией?" }, a: { ko: "네, 항암 중 싸이모신α1, 미슬토, 고농도비타민C 등으로 효과 강화 및 부작용 완화를 병행합니다.", ru: "Да, во время химиотерапии можно сочетать с Тимозином-α1, омелой и высокодозным витамином C для усиления эффекта." } },
    { q: { ko: "한국 방문 비자와 의료비 지원이 가능한가요?", ru: "Есть ли помощь с визой и оплатой лечения?" }, a: { ko: "의료 비자 발급 지원 및 국제 의료비 결제(카드/송금)를 안내드립니다. 카자흐스탄·러시아에서도 원활하게 진행됩니다.", ru: "Помогаем с оформлением медицинской визы и международной оплатой (карта/перевод) для пациентов из Казахстана и России." } },
  ],
  thyroid: [
    { q: { ko: "갑상선 절제 후 호르몬제는 평생 먹어야 하나요?", ru: "Нужно ли принимать гормоны всю жизнь?" }, a: { ko: "전절제 시 레보티록신(T4)을 평생 복용합니다. 반절제는 잔여 기능에 따라 다릅니다. 귀국 후에도 복용 관리를 원격으로 안내합니다.", ru: "При полной тиреоидэктомии — левотироксин пожизненно. При частичном удалении зависит от оставшейся функции. Онлайн-сопровождение доступно." } },
    { q: { ko: "저요오드 식이를 한국에서 지원받을 수 있나요?", ru: "Можно ли получить низкойодную диету в Корее?" }, a: { ko: "네, 면력한방병원 셰프팀이 방사성요오드 치료 전 저요오드 맞춤식을 제공합니다.", ru: "Да, команда шефов Immune Hospital готовит низкойодное меню перед радиойодтерапией." } },
    { q: { ko: "목 흉터는 어떻게 관리하나요?", ru: "Как ухаживать за шрамом на шее?" }, a: { ko: "전담 간호사가 흉터 케어 프로토콜을 교육하며, 압박 붕대·실리콘 패치 사용법을 안내합니다.", ru: "Медсестра обучит уходу за шрамом: компрессионные повязки и силиконовые пластыри." } },
    { q: { ko: "음성 장애는 회복되나요?", ru: "Восстановится ли голос?" }, a: { ko: "신경 일시적 손상의 경우 대부분 수주~수개월 내 회복됩니다. 음성 재활 프로그램을 함께 진행합니다.", ru: "В большинстве случаев временные нарушения голоса восстанавливаются в течение нескольких недель–месяцев с реабилитацией." } },
  ],
  etc: [
    { q: { ko: "NK세포 치료는 어떤 암에 효과적인가요?", ru: "При каких видах рака эффективна НК-клеточная терапия?" }, a: { ko: "혈액암, 뇌종양, 전립선암 등 다양한 암에 NK세포 활성화 치료가 적용됩니다. 개인별 면역 검사 후 프로토콜을 결정합니다.", ru: "НК-клеточная терапия применяется при гематологических, церебральных, простатических и других онкологических заболеваниях." } },
    { q: { ko: "희귀암도 치료 가능한가요?", ru: "Можно ли лечить редкие виды рака?" }, a: { ko: "ITCRN 5축 프레임워크는 모든 암종에 적용됩니다. 희귀암의 경우 한국 대형 병원과의 협진 네트워크를 통해 맞춤 계획을 제안합니다.", ru: "Фреймворк ITCRN применим к любому виду рака. При редких случаях привлекаем партнёрские крупные больницы Кореи." } },
    { q: { ko: "치료 기간과 비용은 어떻게 되나요?", ru: "Каковы сроки и стоимость лечения?" }, a: { ko: "암 종류와 단계에 따라 다릅니다. 원격 상담 후 개인별 치료 계획과 비용 견적을 제공합니다.", ru: "Зависит от типа и стадии рака. После консультации предоставим индивидуальный план и смету." } },
  ],
};

// ITCRN 축 순서
const ITCRN_KEYS = ["immunity", "temperature", "circulation", "resistibility", "nutrition"];

export default function CancerDetailClient({ slug }) {
  const lang = useLang();
  const [openAxis, setOpenAxis] = useState(null);

  const cancer = CANCER_DETAILS[slug];
  if (!cancer) return null;

  const l = (obj) => obj?.[lang] || obj?.en || obj?.ko || "";
  const cta = CTA[lang] || CTA.en;

  const therapyKeys = SLUG_THERAPIES[slug] || [];
  const complicationImgs = COMPLICATION_IMAGES[slug] || [];
  const heroBg = HERO_BG[slug] || CANCER_IMAGES.healGraph;
  const faqs = FAQ_DATA[slug] || FAQ_DATA.etc;

  const showPostSurgical = slug === "digest" || slug === "liver";

  return (
    <div style={{ background: "var(--cream-0)", minHeight: "100vh" }}>
      <Nav current="treatments" />

      {/* ── 1. HERO ─────────────────────────────────── */}
      <section
        style={{
          position: "relative",
          background: "var(--ink-0)",
          color: "var(--fg-on-dark-1)",
          padding: "96px 24px 72px",
          overflow: "hidden",
          minHeight: 420,
          display: "flex",
          alignItems: "center",
        }}
      >
        <FilmGrain />
        {/* 배경 이미지 레이어 */}
        <div
          style={{
            position: "absolute", inset: 0,
            backgroundImage: `url(${heroBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.18,
          }}
          aria-hidden="true"
        />
        <div style={{ position: "relative", maxWidth: 1240, margin: "0 auto", width: "100%" }}>
          <Eyebrow>면력한방병원 · 암종별 치료</Eyebrow>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(40px, 6vw, 88px)",
              lineHeight: 1.05,
              letterSpacing: "-0.015em",
              margin: "28px 0 20px",
              maxWidth: 900,
            }}
          >
            {l(cancer.title).split("·").map((part, i, arr) => (
              <span key={i}>
                {i > 0 && <span style={{ color: "var(--fg-on-dark-3)" }}> · </span>}
                {i === arr.length - 1
                  ? <span style={{ fontStyle: "italic", color: "var(--gold-0)" }}>{part.trim()}</span>
                  : part.trim()}
              </span>
            ))}
          </h1>
          <Rule width={64} tone="gold" />
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 300,
              fontSize: 17,
              lineHeight: 1.8,
              color: "var(--fg-on-dark-2)",
              marginTop: 20,
              maxWidth: 680,
            }}
          >
            {l(cancer.intro)}
          </p>
          {cancer.stats?.survivalImprovement && (
            <div
              style={{
                marginTop: 32,
                padding: "16px 24px",
                borderLeft: "3px solid var(--gold-0)",
                background: "rgba(200,169,106,0.08)",
                maxWidth: 560,
              }}
            >
              <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 15, color: "var(--gold-0)", margin: 0 }}>
                {cancer.stats.survivalImprovement}
              </p>
            </div>
          )}
          <div style={{ display: "flex", gap: 20, marginTop: 40, flexWrap: "wrap" }}>
            <Link href="/consult/start" style={{ textDecoration: "none" }}>
              <ButtonGold>{cta.consult}</ButtonGold>
            </Link>
            <Link href="/intake" style={{ textDecoration: "none" }}>
              <span
                style={{
                  fontFamily: "var(--font-serif)",
                  fontStyle: "italic",
                  fontSize: 15,
                  color: "var(--fg-on-dark-2)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                }}
              >
                {cta.intake} →
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── 2. 합병증·증상 그리드 ───────────────────── */}
      <section style={{ background: "var(--cream-0)", padding: "88px 24px" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <Eyebrow>{lang === "ko" ? "수술 후 주요 합병증" : lang === "ru" ? "Основные осложнения" : "Post-Surgical Complications"}</Eyebrow>
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(28px, 4vw, 52px)",
              lineHeight: 1.1,
              margin: "20px 0 16px",
              color: "var(--fg-on-light-1)",
            }}
          >
            {lang === "ko" ? "조용히, 그러나" : lang === "ru" ? "Молча, но" : "Quietly, but"}{" "}
            <span style={{ fontStyle: "italic", color: "var(--gold-2)" }}>
              {lang === "ko" ? "책임집니다." : lang === "ru" ? "ответственно." : "responsibly."}
            </span>
          </h2>
          <Rule width={48} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
              gap: 20,
              marginTop: 48,
            }}
          >
            {cancer.complications.map((comp, idx) => (
              <article
                key={idx}
                style={{
                  background: "var(--paper)",
                  border: "1px solid var(--cream-2)",
                  overflow: "hidden",
                }}
              >
                {complicationImgs[idx] && (
                  <div style={{ width: "100%", aspectRatio: "16 / 9", overflow: "hidden" }}>
                    <img
                      src={complicationImgs[idx]}
                      alt={comp.name}
                      loading="lazy"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        filter: "grayscale(20%) contrast(1.05)",
                      }}
                      onError={(e) => {
                        e.currentTarget.src = CANCER_IMAGES.healSvg;
                      }}
                    />
                  </div>
                )}
                <div style={{ padding: "20px 20px 24px" }}>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      letterSpacing: "0.2em",
                      color: "var(--gold-2)",
                      marginBottom: 8,
                    }}
                  >
                    {String(idx + 1).padStart(2, "0")}
                  </div>
                  <h3
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 20,
                      fontWeight: 500,
                      color: "var(--fg-on-light-1)",
                      margin: "0 0 8px",
                      lineHeight: 1.3,
                    }}
                  >
                    {comp.name}
                  </h3>
                  <p
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 14,
                      lineHeight: 1.65,
                      color: "var(--fg-on-light-2)",
                      margin: 0,
                    }}
                  >
                    {comp.desc}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. ITCRN 5축 치료 ───────────────────────── */}
      <section
        style={{
          background: "var(--ink-0)",
          color: "var(--fg-on-dark-1)",
          padding: "88px 24px",
          borderTop: "1px solid var(--gold-tint)",
        }}
      >
        <FilmGrain />
        <div style={{ position: "relative", maxWidth: 1240, margin: "0 auto" }}>
          <Eyebrow tone="muted-dark">ITCRN Framework</Eyebrow>
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(28px, 4vw, 52px)",
              lineHeight: 1.1,
              margin: "20px 0 12px",
            }}
          >
            {lang === "ko" ? "5축 통합 면역 치료" : lang === "ru" ? "5-осевая интегративная терапия" : "5-Axis Integrative Immune Care"}
          </h2>

          {/* 암종 특화 포커스 배지 */}
          {cancer.focusPrograms && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 20, marginBottom: 40 }}>
              <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--fg-on-dark-3)", letterSpacing: "0.1em", alignSelf: "center" }}>
                {lang === "ko" ? "특화 프로그램" : "Focus"}:
              </span>
              {cancer.focusPrograms.map((prog, i) => (
                <span
                  key={i}
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    padding: "4px 12px",
                    border: "1px solid var(--gold-0)",
                    color: "var(--gold-0)",
                    borderRadius: 2,
                  }}
                >
                  {prog}
                </span>
              ))}
            </div>
          )}

          {/* 5축 아코디언 */}
          <div style={{ borderTop: "1px solid var(--ink-3)" }}>
            {ITCRN_KEYS.map((key, idx) => {
              const axis = ITCRN_FRAMEWORK[key];
              if (!axis) return null;
              const isOpen = openAxis === key;
              return (
                <div key={key} style={{ borderBottom: "1px solid var(--ink-3)" }}>
                  <button
                    onClick={() => setOpenAxis(isOpen ? null : key)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "24px 0",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 12,
                          color: "var(--gold-0)",
                          letterSpacing: "0.2em",
                          minWidth: 28,
                        }}
                      >
                        {String.fromCharCode(73 + [0,3,2,17,13][idx])}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-serif)",
                          fontSize: "clamp(18px, 2.5vw, 28px)",
                          fontWeight: 400,
                          color: "var(--fg-on-dark-1)",
                        }}
                      >
                        {l(axis.title)}
                      </span>
                    </div>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 20,
                        color: "var(--gold-0)",
                        transform: isOpen ? "rotate(45deg)" : "none",
                        transition: "transform 0.2s",
                      }}
                    >
                      +
                    </span>
                  </button>
                  {isOpen && (
                    <div style={{ padding: "0 0 32px 48px" }}>
                      <p
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 15,
                          lineHeight: 1.75,
                          color: "var(--fg-on-dark-2)",
                          maxWidth: 640,
                          marginBottom: 20,
                        }}
                      >
                        {l(axis.desc)}
                      </p>
                      {axis.evidence && (
                        <div
                          style={{
                            padding: "12px 20px",
                            borderLeft: "2px solid var(--gold-0)",
                            marginBottom: 20,
                            background: "rgba(200,169,106,0.06)",
                          }}
                        >
                          <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 14, color: "var(--gold-0)", margin: 0 }}>
                            {axis.evidence}
                          </p>
                        </div>
                      )}
                      {(axis.methods || axis.cellular || axis.programs) && (
                        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {[...(axis.methods || []), ...(axis.cellular || []), ...(axis.humoral || []), ...(axis.programs || [])].map(
                            (m, i) => (
                              <li
                                key={i}
                                style={{
                                  fontFamily: "var(--font-sans)",
                                  fontSize: 13,
                                  color: "var(--fg-on-dark-2)",
                                  padding: "6px 14px",
                                  border: "1px solid var(--ink-3)",
                                  borderRadius: 2,
                                }}
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
        </div>
      </section>

      {/* ── 4. 치료법 상세 카드 ─────────────────────── */}
      <section style={{ background: "var(--paper)", padding: "88px 24px" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <Eyebrow>{lang === "ko" ? "주요 치료 프로그램" : lang === "ru" ? "Ключевые программы" : "Key Treatment Programs"}</Eyebrow>
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(28px, 4vw, 52px)",
              lineHeight: 1.1,
              margin: "20px 0 48px",
              color: "var(--fg-on-light-1)",
            }}
          >
            {lang === "ko" ? "이 암종에 특화된" : lang === "ru" ? "Специализированные методы для" : "Tailored for"}{" "}
            <span style={{ fontStyle: "italic", color: "var(--gold-2)" }}>
              {lang === "ko" ? "치료 접근법" : lang === "ru" ? "данного типа рака" : "this cancer type"}
            </span>
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))",
              gap: 24,
            }}
          >
            {therapyKeys.map((key, idx) => {
              const therapy = IMMUNE_THERAPIES[key];
              if (!therapy) return null;
              return (
                <article
                  key={key}
                  style={{
                    background: "var(--cream-0)",
                    border: "1px solid var(--cream-2)",
                    overflow: "hidden",
                  }}
                >
                  {therapy.image && (
                    <div style={{ width: "100%", aspectRatio: "16 / 9", overflow: "hidden" }}>
                      <img
                        src={therapy.image}
                        alt={l(therapy.name)}
                        loading="lazy"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </div>
                  )}
                  <div style={{ padding: "24px" }}>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        letterSpacing: "0.2em",
                        color: "var(--gold-2)",
                        textTransform: "uppercase",
                        marginBottom: 8,
                      }}
                    >
                      {therapy.axis?.toUpperCase()} — {String(idx + 1).padStart(2, "0")}
                    </div>
                    <h3
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: 20,
                        fontWeight: 500,
                        color: "var(--fg-on-light-1)",
                        margin: "0 0 10px",
                        lineHeight: 1.25,
                      }}
                    >
                      {l(therapy.name)}
                    </h3>
                    <p
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 14,
                        lineHeight: 1.65,
                        color: "var(--fg-on-light-2)",
                        margin: 0,
                      }}
                    >
                      {l(therapy.description)}
                    </p>
                    {therapy.evidence && (
                      <p
                        style={{
                          fontFamily: "var(--font-serif)",
                          fontStyle: "italic",
                          fontSize: 13,
                          color: "var(--gold-2)",
                          marginTop: 12,
                          marginBottom: 0,
                        }}
                      >
                        {l(therapy.evidence)}
                      </p>
                    )}
                    {therapy.price && (
                      <div
                        style={{
                          marginTop: 16,
                          padding: "8px 12px",
                          background: "var(--paper)",
                          border: "1px solid var(--cream-2)",
                          display: "inline-block",
                        }}
                      >
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-on-light-3)" }}>
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
        <section
          style={{
            background: "var(--ink-0)",
            color: "var(--fg-on-dark-1)",
            padding: "88px 24px",
            borderTop: "1px solid var(--gold-tint)",
          }}
        >
          <FilmGrain />
          <div style={{ position: "relative", maxWidth: 1240, margin: "0 auto" }}>
            <Eyebrow tone="muted-dark">
              {lang === "ko" ? "수술 후 관리 프로토콜" : lang === "ru" ? "Протоколы послеоперационного ухода" : "Post-Surgical Care Protocols"}
            </Eyebrow>
            <h2
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 400,
                fontSize: "clamp(28px, 4vw, 48px)",
                lineHeight: 1.1,
                margin: "20px 0 48px",
              }}
            >
              {lang === "ko" ? "퇴원 후에도" : lang === "ru" ? "После выписки тоже" : "Even after discharge,"}
              {" "}
              <span style={{ fontStyle: "italic", color: "var(--gold-0)" }}>
                {lang === "ko" ? "조용히 책임집니다." : lang === "ru" ? "мы несём ответственность." : "we take responsibility."}
              </span>
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 1,
                background: "var(--ink-3)",
              }}
            >
              {Object.entries(POST_SURGICAL_CARE).map(([key, care]) => (
                <div
                  key={key}
                  style={{
                    background: "var(--ink-1)",
                    padding: "40px 32px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 48,
                      fontWeight: 400,
                      color: "var(--gold-0)",
                      lineHeight: 1,
                      marginBottom: 16,
                    }}
                  >
                    {care.items}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 11,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      color: "var(--fg-on-dark-3)",
                      marginBottom: 8,
                    }}
                  >
                    {lang === "ko" ? "프로토콜" : "protocols"}
                  </div>
                  <h3
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 22,
                      fontWeight: 400,
                      color: "var(--fg-on-dark-1)",
                      margin: 0,
                    }}
                  >
                    {care.title}
                  </h3>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── 6. 환자 여정 5단계 ──────────────────────── */}
      <section style={{ background: "var(--cream-0)", padding: "88px 24px" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <Eyebrow>
            {lang === "ko" ? "환자 여정" : lang === "ru" ? "Путь пациента" : "Patient Journey"}
          </Eyebrow>
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(28px, 4vw, 52px)",
              lineHeight: 1.1,
              margin: "20px 0 48px",
              color: "var(--fg-on-light-1)",
            }}
          >
            {lang === "ko" ? "문의부터 귀국까지," : lang === "ru" ? "От заявки до возвращения домой," : "From inquiry to return,"}{" "}
            <span style={{ fontStyle: "italic", color: "var(--gold-2)" }}>
              {lang === "ko" ? "함께합니다." : lang === "ru" ? "мы рядом." : "we are with you."}
            </span>
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 0,
              borderTop: "1px solid var(--cream-2)",
            }}
          >
            {[
              { num: "01", ko: "문의 · 상담", en: "Inquiry & Consult", ru: "Запрос", sub: { ko: "원격 상담", en: "Remote consultation", ru: "Онлайн" } },
              { num: "02", ko: "치료 계획", en: "Treatment Plan", ru: "План лечения", sub: { ko: "맞춤 견적", en: "Tailored plan", ru: "Индивидуально" } },
              { num: "03", ko: "방문 · 입원", en: "Visit & Admission", ru: "Приезд", sub: { ko: "비자·이동 지원", en: "Visa & transfer", ru: "Виза и трансфер" } },
              { num: "04", ko: "치료 · 회복", en: "Treatment & Recovery", ru: "Лечение", sub: { ko: "ITCRN 5축", en: "ITCRN 5-axis", ru: "5-осевая система" } },
              { num: "05", ko: "귀국 · 추적", en: "Return & Follow-up", ru: "Возвращение", sub: { ko: "원격 사후 관리", en: "Remote follow-up", ru: "Удалённое наблюдение" } },
            ].map((step, i) => (
              <div
                key={step.num}
                style={{
                  padding: "32px 16px",
                  borderRight: i < 4 ? "1px solid var(--cream-2)" : "none",
                  borderBottom: "1px solid var(--cream-2)",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 40,
                    fontWeight: 400,
                    color: "var(--gold-2)",
                    lineHeight: 1,
                    marginBottom: 12,
                  }}
                >
                  {step.num}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 16,
                    fontWeight: 500,
                    color: "var(--fg-on-light-1)",
                    marginBottom: 4,
                    lineHeight: 1.3,
                  }}
                >
                  {lang === "ko" ? step.ko : lang === "ru" ? step.ru : step.en}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 11,
                    letterSpacing: "0.1em",
                    color: "var(--fg-on-light-3)",
                    textTransform: "uppercase",
                  }}
                >
                  {lang === "ko" ? step.sub.ko : lang === "ru" ? step.sub.ru : step.sub.en}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. FAQ ──────────────────────────────────── */}
      <section
        style={{
          background: "var(--paper)",
          padding: "88px 24px",
          borderTop: "1px solid var(--cream-2)",
        }}
      >
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <Eyebrow>FAQ</Eyebrow>
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(28px, 4vw, 48px)",
              lineHeight: 1.1,
              margin: "20px 0 48px",
              color: "var(--fg-on-light-1)",
            }}
          >
            {lang === "ko" ? "자주 묻는" : lang === "ru" ? "Часто задаваемые" : "Frequently asked"}{" "}
            <span style={{ fontStyle: "italic", color: "var(--gold-2)" }}>
              {lang === "ko" ? "질문들" : lang === "ru" ? "вопросы" : "questions"}
            </span>
          </h2>
          <div>
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                style={{
                  padding: "28px 0",
                  borderTop: "1px solid var(--cream-2)",
                }}
              >
                <h3
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 20,
                    fontWeight: 500,
                    color: "var(--fg-on-light-1)",
                    margin: "0 0 12px",
                    lineHeight: 1.4,
                  }}
                >
                  {faq.q[lang] || faq.q.ko}
                </h3>
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 15,
                    lineHeight: 1.75,
                    color: "var(--fg-on-light-2)",
                    margin: 0,
                  }}
                >
                  {faq.a[lang] || faq.a.ko}
                </p>
              </div>
            ))}
            <div style={{ borderTop: "1px solid var(--cream-2)" }} />
          </div>
        </div>
      </section>

      {/* ── 8. CTA ──────────────────────────────────── */}
      <section
        style={{
          background: "var(--ink-0)",
          color: "var(--fg-on-dark-1)",
          padding: "96px 24px",
          textAlign: "center",
          borderTop: "1px solid var(--gold-tint)",
        }}
      >
        <FilmGrain />
        <div style={{ position: "relative", maxWidth: 720, margin: "0 auto" }}>
          <Eyebrow tone="muted-dark">
            {lang === "ko" ? "다음 단계" : lang === "ru" ? "Следующий шаг" : "Next Step"}
          </Eyebrow>
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(32px, 5vw, 64px)",
              lineHeight: 1.05,
              margin: "24px 0 16px",
            }}
          >
            {lang === "ko" ? "치료는 대화에서" : lang === "ru" ? "Лечение начинается" : "Healing begins"}{" "}
            <span style={{ fontStyle: "italic", color: "var(--gold-0)" }}>
              {lang === "ko" ? "시작됩니다." : lang === "ru" ? "с разговора." : "with a conversation."}
            </span>
          </h2>
          <Rule width={64} tone="gold" style={{ margin: "24px auto" }} />
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 16,
              lineHeight: 1.8,
              color: "var(--fg-on-dark-2)",
              marginBottom: 40,
            }}
          >
            {lang === "ko"
              ? "원격 상담으로 부담 없이 시작하세요. 영업일 기준 1일 내 담당 코디네이터가 연락드립니다."
              : lang === "ru"
              ? "Начните с бесплатной онлайн-консультации. Координатор свяжется с вами в течение 1 рабочего дня."
              : "Start with a no-obligation remote consultation. Your dedicated coordinator will reach out within 1 business day."}
          </p>
          <div style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/consult/start" style={{ textDecoration: "none" }}>
              <ButtonGold>{cta.consult}</ButtonGold>
            </Link>
            <Link href="/intake" style={{ textDecoration: "none" }}>
              <span
                style={{
                  fontFamily: "var(--font-serif)",
                  fontStyle: "italic",
                  fontSize: 15,
                  color: "var(--fg-on-dark-2)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                  padding: "14px 0",
                }}
              >
                {cta.intake} →
              </span>
            </Link>
          </div>
          <div style={{ marginTop: 40 }}>
            <Link href="/treatments" style={{ textDecoration: "none" }}>
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "var(--fg-on-dark-4)",
                }}
              >
                ← {lang === "ko" ? "모든 암종 보기" : lang === "ru" ? "Все виды рака" : "All Cancer Types"}
              </span>
            </Link>
          </div>
        </div>
      </section>

      <Footer />

      <style jsx>{`
        @media (max-width: 768px) {
          :global(section > div > div[style*="grid-template-columns: repeat(5"]) {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          :global(section > div > div[style*="grid-template-columns: repeat(3"]) {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 480px) {
          :global(section > div > div[style*="grid-template-columns: repeat(5"]) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
