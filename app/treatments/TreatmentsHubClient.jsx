"use client";

import Link from "next/link";
import { useLang } from "../../src/lib/i18n/LangContext";
import { CANCERS, TREATMENTS_L } from "./TreatmentsClient";
import {
  Eyebrow,
  Rule,
  ButtonGold,
  LinkArrow,
  FilmGrain,
} from "../../components/healo/Primitives";
import Nav from "../../components/healo/Nav";
import Footer from "../../components/healo/Footer";
import { PHOTOS, IMMUNE_PHOTOS, PHOTO_FILTER, IMMUNE_PHOTO_FILTER } from "../../components/healo/Photos";
import {
  CANCER_DETAILS,
  ITCRN_FRAMEWORK,
  CANCER_IMAGES,
} from "../../src/lib/data/immuneCancerDetails";

const SECTION_PHOTOS = [
  PHOTOS.hero,
  PHOTOS.hospital1,
  PHOTOS.hospital2,
  PHOTOS.hospital3,
  PHOTOS.clinical1,
  PHOTOS.clinical2,
];

// 6개 암종 카드용 이미지
const CANCER_CARD_IMAGES = {
  female: CANCER_IMAGES.complications.lymphEdema,
  digest: CANCER_IMAGES.complications.digestive,
  liver: CANCER_IMAGES.complications.liverFailure,
  lung: CANCER_IMAGES.complications.breathingDifficulty,
  thyroid: CANCER_IMAGES.complications.voiceChange,
  etc: CANCER_IMAGES.healGraph,
};

const ITCRN_KEYS = ["immunity", "temperature", "circulation", "resistibility", "nutrition"];

// 허브 레이블 다국어
const COPY = {
  en: {
    eyebrow: "Treatments",
    titleA: "Treatment is not just",
    titleB: "fighting disease.",
    titleC: "It's restoring a life.",
    lede:
      "HEALO combines Korea's world-class oncology with Korean Medicine integrative care. Same diagnosis, two disciplines, one coordinator.",
    cancerHub: "6 Cancer Types",
    cancerHubTitle: "Find your",
    cancerHubTitleItalic: "cancer type.",
    cancerHubBody:
      "Each cancer type has a dedicated page with Immune Hospital's specialized protocols, complication management, and post-surgical care.",
    itcrnTitle: "5-Axis Integrative",
    itcrnTitleItalic: "Immune Framework",
    itcrnBody: "Every cancer type is treated through the ITCRN framework — Immunity, Temperature, Circulation, Resistibility, Nutrition.",
    western: "Western Medicine",
    eastern: "Korean Medicine",
    partnerLabel: "Partner hospital",
    kmLabel: "Immune Hospital (HEALO direct)",
    strength: "Korea's advantage",
    readGuide: "Read patient guide",
    requestConsult: "Request consultation",
    viewPage: "View treatment page →",
    bottomTitle: "Whichever cancer type,",
    bottomTitleItalic: "one journey.",
    bottomBody:
      "Submit a brief intake. Within one business day, we present a matched treatment plan — combining specialist oncology care with integrative Korean Medicine when appropriate.",
  },
  ko: {
    eyebrow: "치료 안내",
    titleA: "치료는 병을 이기는",
    titleB: "것이 아니라,",
    titleC: "삶을 되찾는 과정입니다.",
    lede:
      "HEALO는 한국의 세계 수준 종양학과 한방 통합 케어를 결합합니다. 같은 진단, 두 분야, 한 명의 코디네이터.",
    cancerHub: "6개 암종",
    cancerHubTitle: "암종을",
    cancerHubTitleItalic: "선택하세요.",
    cancerHubBody:
      "각 암종별로 면력한방병원의 특화 프로토콜, 합병증 관리, 수술 후 케어를 담은 전용 페이지를 제공합니다.",
    itcrnTitle: "5축 통합",
    itcrnTitleItalic: "면역치료 프레임워크",
    itcrnBody: "모든 암종에 ITCRN 프레임워크가 적용됩니다 — 면역·체온·순환·저항성·영양.",
    western: "양방 의학",
    eastern: "한방 의학",
    partnerLabel: "협진 병원",
    kmLabel: "면력한방병원 (HEALO 직영)",
    strength: "한국의 강점",
    readGuide: "환자 가이드 보기",
    requestConsult: "상담 신청",
    viewPage: "상세 치료 페이지 보기 →",
    bottomTitle: "어떤 암종이든,",
    bottomTitleItalic: "하나의 여정.",
    bottomBody:
      "간단한 인테이크를 작성해 주세요. 영업일 기준 하루 안에, 전문의 치료와 적절한 한방 통합 케어를 결합한 맞춤 치료 계획을 안내합니다.",
  },
  ru: {
    eyebrow: "Лечение",
    titleA: "Лечение — это не просто",
    titleB: "борьба с болезнью.",
    titleC: "Это возвращение к жизни.",
    lede:
      "HEALO объединяет передовую онкологию Кореи с интегративной корейской медициной. Один диагноз, два подхода, один координатор.",
    cancerHub: "6 видов рака",
    cancerHubTitle: "Выберите",
    cancerHubTitleItalic: "тип рака.",
    cancerHubBody:
      "Каждый тип рака имеет отдельную страницу со специализированными протоколами Immune Hospital.",
    itcrnTitle: "5-осевая интегративная",
    itcrnTitleItalic: "иммунная система",
    itcrnBody: "Все виды рака лечатся по системе ITCRN — иммунитет, температура, кровообращение, сопротивляемость, питание.",
    western: "Западная медицина",
    eastern: "Корейская медицина",
    partnerLabel: "Партнёрская больница",
    kmLabel: "Иммунная клиника (прямой партнёр HEALO)",
    strength: "Преимущество Кореи",
    readGuide: "Руководство для пациентов",
    requestConsult: "Записаться на консультацию",
    viewPage: "Перейти к странице лечения →",
    bottomTitle: "Какой бы ни был тип рака,",
    bottomTitleItalic: "один путь.",
    bottomBody:
      "Заполните анкету. В течение 1 рабочего дня мы предложим индивидуальный план лечения — с участием онколога и корейской медицины.",
  },
};

export default function TreatmentsHubClient() {
  const lang = useLang();
  const copy = COPY[lang] || COPY.en;
  const l = (obj) => obj?.[lang] || obj?.en || obj?.ko || "";

  return (
    <div style={{ background: "var(--cream-0)", minHeight: "100vh" }}>
      <Nav current="treatments" />

      {/* HERO — dark */}
      <section
        style={{
          position: "relative",
          background: "var(--ink-0)",
          color: "var(--fg-on-dark-1)",
          padding: "96px 24px 72px",
          overflow: "hidden",
        }}
      >
        <FilmGrain />
        <div style={{ position: "relative", maxWidth: 1240, margin: "0 auto" }}>
          <Eyebrow>{copy.eyebrow}</Eyebrow>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(44px, 6.5vw, 96px)",
              lineHeight: 1.05,
              letterSpacing: "-0.015em",
              margin: "32px 0 40px",
              maxWidth: 1100,
            }}
          >
            {copy.titleA} {copy.titleB}
            <br />
            <span style={{ fontStyle: "italic", color: "var(--gold-0)" }}>{copy.titleC}</span>
          </h1>
          <Rule width={64} />
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 300,
              fontSize: 17,
              lineHeight: 1.75,
              color: "var(--fg-on-dark-2)",
              marginTop: 24,
              maxWidth: 720,
            }}
          >
            {copy.lede}
          </p>
          {/* 통계 바 */}
          <div
            style={{
              display: "flex",
              gap: 40,
              marginTop: 48,
              paddingTop: 40,
              borderTop: "1px solid var(--ink-3)",
              flexWrap: "wrap",
            }}
          >
            {[
              { num: "50,000+", label: lang === "ko" ? "누적 케이스" : lang === "ru" ? "Случаев" : "Cumulative cases" },
              { num: "5축", label: "ITCRN Framework" },
              { num: "6", label: lang === "ko" ? "암종 전문 케어" : lang === "ru" ? "Видов рака" : "Cancer specialties" },
              { num: "2017", label: lang === "ko" ? "개원" : lang === "ru" ? "Основан" : "Founded" },
            ].map((stat, i) => (
              <div key={i}>
                <div
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "clamp(28px, 3.5vw, 48px)",
                    fontWeight: 400,
                    color: "var(--gold-0)",
                    lineHeight: 1,
                  }}
                >
                  {stat.num}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 11,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: "var(--fg-on-dark-3)",
                    marginTop: 6,
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ITCRN 5축 간략 설명 ─────────────────────── */}
      <section style={{ background: "var(--paper)", padding: "88px 24px", borderTop: "1px solid var(--cream-2)" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <Eyebrow>ITCRN Framework</Eyebrow>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "5fr 7fr",
              gap: 64,
              alignItems: "start",
              marginTop: 24,
            }}
            className="healo-hub-itcrn"
          >
            <div>
              <h2
                style={{
                  fontFamily: "var(--font-serif)",
                  fontWeight: 400,
                  fontSize: "clamp(28px, 4vw, 52px)",
                  lineHeight: 1.1,
                  color: "var(--fg-on-light-1)",
                  margin: "0 0 16px",
                }}
              >
                {copy.itcrnTitle}
                <br />
                <span style={{ fontStyle: "italic", color: "var(--gold-2)" }}>
                  {copy.itcrnTitleItalic}
                </span>
              </h2>
              <Rule width={48} />
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 15,
                  lineHeight: 1.75,
                  color: "var(--fg-on-light-2)",
                  marginTop: 16,
                  maxWidth: 480,
                }}
              >
                {copy.itcrnBody}
              </p>
            </div>
            <div>
              {ITCRN_KEYS.map((key, idx) => {
                const axis = ITCRN_FRAMEWORK[key];
                if (!axis) return null;
                const letter = ["I", "T", "C", "R", "N"][idx];
                return (
                  <div
                    key={key}
                    style={{
                      display: "flex",
                      gap: 20,
                      padding: "20px 0",
                      borderBottom: "1px solid var(--cream-2)",
                      alignItems: "flex-start",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: 32,
                        fontWeight: 400,
                        color: "var(--gold-2)",
                        lineHeight: 1,
                        minWidth: 32,
                      }}
                    >
                      {letter}
                    </div>
                    <div>
                      <div
                        style={{
                          fontFamily: "var(--font-serif)",
                          fontSize: 17,
                          fontWeight: 500,
                          color: "var(--fg-on-light-1)",
                          marginBottom: 4,
                        }}
                      >
                        {l(axis.title)}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 13,
                          lineHeight: 1.6,
                          color: "var(--fg-on-light-3)",
                        }}
                      >
                        {l(axis.desc)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── 암종 6개 카드 허브 ───────────────────────── */}
      <section style={{ background: "var(--cream-0)", padding: "88px 24px", borderTop: "1px solid var(--cream-2)" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <Eyebrow>{copy.cancerHub}</Eyebrow>
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(28px, 4vw, 52px)",
              lineHeight: 1.1,
              margin: "20px 0 12px",
              color: "var(--fg-on-light-1)",
            }}
          >
            {copy.cancerHubTitle}{" "}
            <span style={{ fontStyle: "italic", color: "var(--gold-2)" }}>
              {copy.cancerHubTitleItalic}
            </span>
          </h2>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 15,
              lineHeight: 1.75,
              color: "var(--fg-on-light-2)",
              maxWidth: 640,
              marginBottom: 48,
            }}
          >
            {copy.cancerHubBody}
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 360px), 1fr))",
              gap: 2,
              background: "var(--cream-2)",
            }}
          >
            {Object.values(CANCER_DETAILS).map((cancer, idx) => (
              <Link
                key={cancer.slug}
                href={`/treatments/${cancer.slug}`}
                style={{ textDecoration: "none" }}
              >
                <article
                  style={{
                    background: "var(--paper)",
                    overflow: "hidden",
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--cream-0)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "var(--paper)";
                  }}
                >
                  {/* 이미지 */}
                  <div style={{ width: "100%", aspectRatio: "16 / 9", overflow: "hidden" }}>
                    <img
                      src={CANCER_CARD_IMAGES[cancer.slug] || CANCER_IMAGES.healGraph}
                      alt={l(cancer.title)}
                      loading="lazy"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        filter: "grayscale(15%) contrast(1.05)",
                        transition: "transform 0.4s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.03)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                      onError={(e) => { e.currentTarget.src = CANCER_IMAGES.healSvg; }}
                    />
                  </div>
                  <div style={{ padding: "28px 28px 32px" }}>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        letterSpacing: "0.2em",
                        color: "var(--gold-2)",
                        marginBottom: 10,
                        textTransform: "uppercase",
                      }}
                    >
                      {String(idx + 1).padStart(2, "0")} — CANCER
                    </div>
                    <h3
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: "clamp(20px, 2.5vw, 28px)",
                        fontWeight: 400,
                        color: "var(--fg-on-light-1)",
                        margin: "0 0 10px",
                        lineHeight: 1.2,
                      }}
                    >
                      {l(cancer.title)}
                    </h3>
                    <p
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 13,
                        lineHeight: 1.65,
                        color: "var(--fg-on-light-3)",
                        margin: "0 0 16px",
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {l(cancer.intro)}
                    </p>
                    {/* 특화 프로그램 배지 */}
                    {cancer.focusPrograms && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
                        {cancer.focusPrograms.slice(0, 2).map((prog, i) => (
                          <span
                            key={i}
                            style={{
                              fontFamily: "var(--font-sans)",
                              fontSize: 10,
                              fontWeight: 600,
                              letterSpacing: "0.08em",
                              padding: "3px 10px",
                              border: "1px solid var(--gold-2)",
                              color: "var(--gold-2)",
                              borderRadius: 2,
                            }}
                          >
                            {prog}
                          </span>
                        ))}
                      </div>
                    )}
                    <span
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontStyle: "italic",
                        fontSize: 14,
                        color: "var(--gold-2)",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      {copy.viewPage}
                    </span>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Cancer panels — alternating cream/dark (기존 CANCERS 데이터 활용) */}
      {CANCERS.slice(0, 4).map((c, idx) => {
        const isDark = idx % 2 === 1;
        const isRight = idx % 2 === 1;
        return (
          <section
            key={idx}
            style={{
              position: "relative",
              background: isDark ? "var(--ink-0)" : "var(--cream-0)",
              color: isDark ? "var(--fg-on-dark-1)" : "var(--fg-on-light-1)",
              padding: "96px 24px",
              overflow: "hidden",
              borderTop: isDark ? "1px solid var(--gold-tint)" : "1px solid var(--cream-2)",
            }}
          >
            {isDark && <FilmGrain />}
            <div
              className="healo-treatment-panel"
              style={{
                position: "relative",
                maxWidth: 1240,
                margin: "0 auto",
                display: "grid",
                gridTemplateColumns: "5fr 7fr",
                gap: 64,
                alignItems: "start",
                direction: isRight ? "rtl" : "ltr",
              }}
            >
              <div style={{ direction: "ltr" }}>
                <div style={{ width: "100%", aspectRatio: "4 / 5", overflow: "hidden" }}>
                  <img
                    src={SECTION_PHOTOS[idx % SECTION_PHOTOS.length]}
                    alt=""
                    loading="lazy"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      filter: PHOTO_FILTER,
                    }}
                  />
                </div>
                <p
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontStyle: "italic",
                    fontSize: 12,
                    color: isDark ? "var(--fg-on-dark-3)" : "var(--fg-on-light-3)",
                    marginTop: 12,
                  }}
                >
                  {lang === "ko" ? "한국의 강점" : "Korea's advantage"}
                </p>
              </div>
              <div style={{ direction: "ltr" }}>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--gold-0)",
                    letterSpacing: "0.2em",
                    marginBottom: 16,
                  }}
                >
                  {String(idx + 1).padStart(2, "0")} — CANCER
                </div>
                <h2
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontWeight: 400,
                    fontSize: "clamp(40px, 5.5vw, 72px)",
                    lineHeight: 1.05,
                    letterSpacing: "-0.01em",
                    color: isDark ? "var(--fg-on-dark-1)" : "var(--fg-on-light-1)",
                    margin: "0 0 20px",
                  }}
                >
                  {l(c.type)}
                </h2>
                <p
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontStyle: "italic",
                    fontWeight: 400,
                    fontSize: 20,
                    lineHeight: 1.5,
                    color: isDark ? "var(--gold-0)" : "var(--gold-2)",
                    margin: "0 0 40px",
                    maxWidth: 640,
                  }}
                >
                  {l(c.koreaStrength)}
                </p>
                <Rule width={48} />
                <div
                  className="healo-treatment-cols"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 40,
                    marginTop: 40,
                  }}
                >
                  {[
                    { label: copy.western, sub: copy.partnerLabel, items: c.western },
                    { label: copy.eastern, sub: copy.kmLabel, items: c.eastern },
                  ].map((col, ci) => (
                    <div key={ci}>
                      <div
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: "0.24em",
                          textTransform: "uppercase",
                          color: isDark ? "var(--fg-on-dark-3)" : "var(--fg-on-light-3)",
                          marginBottom: 4,
                        }}
                      >
                        {col.label}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-serif)",
                          fontStyle: "italic",
                          fontSize: 12,
                          color: isDark ? "var(--fg-on-dark-4)" : "var(--fg-on-light-4)",
                          marginBottom: 18,
                        }}
                      >
                        {col.sub}
                      </div>
                      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                        {col.items?.map((t, i) => (
                          <li
                            key={i}
                            style={{
                              fontFamily: "var(--font-sans)",
                              fontSize: 14,
                              lineHeight: 1.65,
                              color: isDark ? "var(--fg-on-dark-2)" : "var(--fg-on-light-2)",
                              padding: "10px 0",
                              borderTop: i === 0 ? `1px solid ${isDark ? "var(--ink-3)" : "var(--cream-2)"}` : "none",
                              borderBottom: `1px solid ${isDark ? "var(--ink-3)" : "var(--cream-2)"}`,
                            }}
                          >
                            <span
                              style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: 10,
                                color: "var(--gold-0)",
                                marginRight: 10,
                              }}
                            >
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            {l(t)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 24, alignItems: "center", marginTop: 40, flexWrap: "wrap" }}>
                  <Link href="/education" style={{ textDecoration: "none" }}>
                    <LinkArrow onDark={isDark}>{copy.readGuide} →</LinkArrow>
                  </Link>
                  <Link href="/intake" style={{ textDecoration: "none" }}>
                    <ButtonGold>{copy.requestConsult}</ButtonGold>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        );
      })}

      {/* Immune Hospital integrated programs */}
      <section
        style={{
          background: "var(--cream-0)",
          padding: "96px 24px",
          borderTop: "1px solid var(--gold-tint)",
        }}
      >
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <div style={{ maxWidth: 720, marginBottom: 56 }}>
            <Eyebrow>{lang === "ko" ? "한방 통합 케어" : lang === "ru" ? "Интегративная медицина" : "Integrative Korean Medicine"}</Eyebrow>
            <h2
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 400,
                fontSize: "clamp(32px, 4.5vw, 56px)",
                lineHeight: 1.1,
                margin: "20px 0 16px",
                color: "var(--fg-on-light-1)",
              }}
            >
              {lang === "ko" ? "치료는" : lang === "ru" ? "Лечение — " : "Healing is"}{" "}
              <span style={{ fontStyle: "italic", color: "var(--gold-2)" }}>
                {lang === "ko" ? "의사 혼자의 일이 아닙니다." : lang === "ru" ? "не одиночное дело." : "not a solo act."}
              </span>
            </h2>
            <Rule width={48} />
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 15,
                lineHeight: 1.75,
                color: "var(--fg-on-light-2)",
                marginTop: 20,
              }}
            >
              {lang === "ko"
                ? "HEALO 직영 면력한방병원(Immune Hospital)은 의료진·임상영양사·치료식 셰프가 함께 한 명의 환자를 돌봅니다. 누적 50,000건 이상의 케이스."
                : lang === "ru"
                ? "В Immune Hospital — прямом партнёре HEALO — врачи, диетологи и шеф-повар заботятся о каждом пациенте. Более 50 000 случаев."
                : "At Immune Hospital — HEALO's direct partner — physicians, clinical dietitians, and a full-time therapeutic chef care for each patient together. Over 50,000 cases to date."}
            </p>
            <div style={{ marginTop: 24 }}>
              <Link href="/hospitals/immune" style={{ textDecoration: "none" }}>
                <LinkArrow>
                  {lang === "ko" ? "면력한방병원 자세히 보기 →" : lang === "ru" ? "Подробнее об Immune Hospital →" : "Learn more about Immune Hospital →"}
                </LinkArrow>
              </Link>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
              gap: 24,
            }}
          >
            {[
              {
                photo: IMMUNE_PHOTOS.programFoodTherapy,
                labelKo: "셰프 푸드테라피", labelEn: "Chef food therapy", labelRu: "Фудтерапия шефа",
                descKo: "2주 1회 전담 셰프와 함께하는 맞춤 치료식",
                descEn: "Bi-weekly personalized therapeutic meals with an in-house chef",
                descRu: "Индивидуальное лечебное питание 2 раза в месяц",
              },
              {
                photo: IMMUNE_PHOTOS.programWalking,
                labelKo: "야외 산책", labelEn: "Outdoor walking", labelRu: "Прогулки на свежем воздухе",
                descKo: "평일 오전, 강변에서 회복의 시간",
                descEn: "Riverside walks every weekday morning",
                descRu: "Прогулки вдоль реки каждое утро",
              },
              {
                photo: IMMUNE_PHOTOS.programExercise,
                labelKo: "운동치료", labelEn: "Movement therapy", labelRu: "Двигательная терапия",
                descKo: "주 1회 전문 치료사 동반 개별 세션",
                descEn: "Weekly guided sessions with a specialist",
                descRu: "Еженедельные сеансы со специалистом",
              },
              {
                photo: IMMUNE_PHOTOS.programPicnic,
                labelKo: "힐링 소풍", labelEn: "Healing picnic", labelRu: "Пикник исцеления",
                descKo: "주 1회 병원 밖에서의 휴식과 대화",
                descEn: "Weekly off-site rest and conversation",
                descRu: "Еженедельный отдых за пределами больницы",
              },
              {
                photo: IMMUNE_PHOTOS.programClass,
                labelKo: "원데이 클래스", labelEn: "One-day class", labelRu: "Однодневный класс",
                descKo: "공예·명상·셀프케어 주제별 프로그램",
                descEn: "Craft · meditation · self-care weekly themes",
                descRu: "Творчество · медитация · самопомощь",
              },
            ].map((prog, i) => (
              <article key={i}>
                <div style={{ width: "100%", aspectRatio: "4 / 5", overflow: "hidden", marginBottom: 12 }}>
                  <img
                    src={prog.photo}
                    alt={lang === "ko" ? prog.labelKo : lang === "ru" ? prog.labelRu : prog.labelEn}
                    loading="lazy"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      filter: IMMUNE_PHOTO_FILTER,
                    }}
                  />
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.2em", color: "var(--gold-2)", textTransform: "uppercase", marginBottom: 6 }}>
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 500, color: "var(--fg-on-light-1)", margin: "0 0 6px", lineHeight: 1.25 }}>
                  {lang === "ko" ? prog.labelKo : lang === "ru" ? prog.labelRu : prog.labelEn}
                </h3>
                <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, lineHeight: 1.6, color: "var(--fg-on-light-3)", margin: 0 }}>
                  {lang === "ko" ? prog.descKo : lang === "ru" ? prog.descRu : prog.descEn}
                </p>
              </article>
            ))}
          </div>

          {/* 5단계 프로세스 */}
          <div style={{ marginTop: 72, padding: "48px 40px", background: "var(--ink-0)", color: "var(--fg-on-dark-1)", borderTop: "1px solid var(--gold-0)" }}>
            <Eyebrow>{lang === "ko" ? "5단계 통합 면역치료" : lang === "ru" ? "5 этапов интегративной иммунотерапии" : "5-stage integrated immune care"}</Eyebrow>
            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 400, lineHeight: 1.2, margin: "16px 0 32px", color: "var(--fg-on-dark-1)", maxWidth: 680 }}>
              {lang === "ko"
                ? "수술 전부터 재발 관리까지, 암의 모든 단계를 함께합니다."
                : lang === "ru"
                ? "От предоперационной подготовки до управления рецидивом — на каждом этапе."
                : "From before surgery to recurrence management — with you through every phase."}
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: 0, borderTop: "1px solid var(--gold-tint)" }}>
              {[
                { num: "01", ko: "수술 전", en: "Pre-surgery", ru: "До операции", sub: { ko: "면역관리", en: "Immune prep", ru: "Подготовка" } },
                { num: "02", ko: "수술 후", en: "Post-surgery", ru: "После операции", sub: { ko: "회복·재활", en: "Recovery", ru: "Восстановление" } },
                { num: "03", ko: "항암 중", en: "During chemo", ru: "Химиотерапия", sub: { ko: "효과 개선", en: "Efficacy boost", ru: "Поддержка" } },
                { num: "04", ko: "재발 관리", en: "Recurrence", ru: "Рецидив", sub: { ko: "면역 강화", en: "Immune fortification", ru: "Иммунитет" } },
                { num: "05", ko: "추적 관찰", en: "Follow-up", ru: "Наблюдение", sub: { ko: "장기 관리", en: "Long-term care", ru: "Долгосрочно" } },
              ].map((step, i) => (
                <div key={step.num} style={{ padding: "24px 16px", borderRight: i < 4 ? "1px solid var(--ink-3)" : "none", textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--font-serif)", fontSize: 36, fontWeight: 400, color: "var(--gold-0)", lineHeight: 1, marginBottom: 10 }}>
                    {step.num}
                  </div>
                  <div style={{ fontFamily: "var(--font-serif)", fontSize: 14, fontWeight: 500, color: "var(--fg-on-dark-1)", marginBottom: 4 }}>
                    {lang === "ko" ? step.ko : lang === "ru" ? step.ru : step.en}
                  </div>
                  <div style={{ fontFamily: "var(--font-sans)", fontSize: 10, letterSpacing: "0.1em", color: "var(--fg-on-dark-3)", textTransform: "uppercase" }}>
                    {lang === "ko" ? step.sub.ko : lang === "ru" ? step.sub.ru : step.sub.en}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ background: "var(--paper)", padding: "96px 24px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
          <Eyebrow>{copy.eyebrow}</Eyebrow>
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(32px, 4.5vw, 56px)",
              lineHeight: 1.1,
              margin: "24px 0 16px",
              color: "var(--fg-on-light-1)",
            }}
          >
            {copy.bottomTitle}
            <br />
            <span style={{ fontStyle: "italic", color: "var(--gold-2)" }}>
              {copy.bottomTitleItalic}
            </span>
          </h2>
          <Rule width={64} style={{ margin: "24px auto" }} />
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 16, lineHeight: 1.75, color: "var(--fg-on-light-2)", margin: "24px 0 40px" }}>
            {copy.bottomBody}
          </p>
          <Link href="/intake" style={{ textDecoration: "none" }}>
            <ButtonGold>{copy.requestConsult}</ButtonGold>
          </Link>
        </div>
      </section>

      <Footer />

      <style jsx>{`
        @media (max-width: 900px) {
          :global(.healo-treatment-panel) {
            grid-template-columns: 1fr !important;
            direction: ltr !important;
            gap: 32px !important;
          }
          :global(.healo-treatment-cols) {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
          }
          :global(.healo-hub-itcrn) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
