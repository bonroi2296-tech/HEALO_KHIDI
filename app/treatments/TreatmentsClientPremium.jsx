"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n/LangContext";
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

const SECTION_PHOTOS = [
  PHOTOS.hero,
  PHOTOS.hospital1,
  PHOTOS.hospital2,
  PHOTOS.hospital3,
  PHOTOS.clinical1,
  PHOTOS.clinical2,
];

const COPY = {
  en: {
    eyebrow: "Treatments",
    titleA: "Treatment is not just",
    titleB: "fighting disease.",
    titleC: "It's restoring a life.",
    lede:
      "healwith combines Korea's world-class oncology with Korean Medicine integrative care. Same diagnosis, two disciplines, one coordinator.",
    western: "Western Medicine",
    eastern: "Korean Medicine",
    partnerLabel: "Partner hospital",
    kmLabel: "Immune Hospital (healwith direct)",
    strength: "Korea's advantage",
    readGuide: "Read patient guide",
    requestConsult: "Request consultation",
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
      "healwith는 한국의 세계 수준 종양학과 한방 통합 케어를 결합합니다. 같은 진단, 두 분야, 한 명의 코디네이터.",
    western: "양방 의학",
    eastern: "한방 의학",
    partnerLabel: "협진 병원",
    kmLabel: "면력한방병원 (healwith 직영)",
    strength: "한국의 강점",
    readGuide: "환자 가이드 보기",
    requestConsult: "상담 신청",
    bottomTitle: "어떤 암종이든,",
    bottomTitleItalic: "하나의 여정.",
    bottomBody:
      "간단한 인테이크를 작성해 주세요. 영업일 기준 하루 안에, 전문의 치료와 적절한 한방 통합 케어를 결합한 맞춤 치료 계획을 안내합니다.",
  },
};

export default function TreatmentsClientPremium() {
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
        </div>
      </section>

      {/* Cancer panels — alternating cream/dark */}
      {CANCERS.map((c, idx) => {
        const isDark = idx % 2 === 1;
        const isRight = idx % 2 === 1; // image on right for dark panels
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
              {/* Photo */}
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
                  {copy.strength}
                </p>
              </div>

              {/* Text */}
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

                {/* Two-column treatment list */}
                <div
                  className="healo-treatment-cols"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 40,
                    marginTop: 40,
                  }}
                >
                  <div>
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
                      {copy.western}
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
                      {copy.partnerLabel}
                    </div>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      {c.western?.map((t, i) => (
                        <li
                          key={i}
                          style={{
                            fontFamily: "var(--font-sans)",
                            fontSize: 14,
                            lineHeight: 1.65,
                            color: isDark ? "var(--fg-on-dark-2)" : "var(--fg-on-light-2)",
                            padding: "10px 0",
                            borderTop:
                              i === 0
                                ? `1px solid ${isDark ? "var(--ink-3)" : "var(--cream-2)"}`
                                : "none",
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
                  <div>
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
                      {copy.eastern}
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
                      {copy.kmLabel}
                    </div>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      {c.eastern?.map((t, i) => (
                        <li
                          key={i}
                          style={{
                            fontFamily: "var(--font-sans)",
                            fontSize: 14,
                            lineHeight: 1.65,
                            color: isDark ? "var(--fg-on-dark-2)" : "var(--fg-on-light-2)",
                            padding: "10px 0",
                            borderTop:
                              i === 0
                                ? `1px solid ${isDark ? "var(--ink-3)" : "var(--cream-2)"}`
                                : "none",
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
                </div>

                {/* CTAs */}
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
            <Eyebrow>{lang === "ko" ? "한방 통합 케어" : "Integrative Korean Medicine"}</Eyebrow>
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
              {lang === "ko" ? "치료는" : "Healing is"}{" "}
              <span style={{ fontStyle: "italic", color: "var(--gold-2)" }}>
                {lang === "ko" ? "의사 혼자의 일이 아닙니다." : "not a solo act."}
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
                ? "healwith 직영 면력한방병원(Immune Hospital)은 의료진·임상영양사·치료식 셰프가 함께 한 명의 환자를 돌봅니다. 누적 50,000건 이상의 케이스."
                : "At Immune Hospital — healwith's direct partner — physicians, clinical dietitians, and a full-time therapeutic chef care for each patient together. Over 50,000 cases to date."}
            </p>
          </div>

          {/* Program cards — 5개 프로그램 */}
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
                labelKo: "셰프 푸드테라피",
                labelEn: "Chef food therapy",
                descKo: "2주 1회 전담 셰프와 함께하는 맞춤 치료식",
                descEn: "Bi-weekly personalized therapeutic meals with an in-house chef",
              },
              {
                photo: IMMUNE_PHOTOS.programWalking,
                labelKo: "야외 산책",
                labelEn: "Outdoor walking",
                descKo: "평일 오전, 강변에서 회복의 시간",
                descEn: "Riverside walks every weekday morning",
              },
              {
                photo: IMMUNE_PHOTOS.programExercise,
                labelKo: "운동치료",
                labelEn: "Movement therapy",
                descKo: "주 1회 전문 치료사 동반 개별 세션",
                descEn: "Weekly guided sessions with a specialist",
              },
              {
                photo: IMMUNE_PHOTOS.programPicnic,
                labelKo: "힐링 소풍",
                labelEn: "Healing picnic",
                descKo: "주 1회 병원 밖에서의 휴식과 대화",
                descEn: "Weekly off-site rest and conversation",
              },
              {
                photo: IMMUNE_PHOTOS.programClass,
                labelKo: "원데이 클래스",
                labelEn: "One-day class",
                descKo: "공예·명상·셀프케어 주제별 프로그램",
                descEn: "Craft · meditation · self-care weekly themes",
              },
            ].map((prog, i) => (
              <article key={i}>
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "4 / 5",
                    overflow: "hidden",
                    marginBottom: 12,
                  }}
                >
                  <img
                    src={prog.photo}
                    alt={lang === "ko" ? prog.labelKo : prog.labelEn}
                    loading="lazy"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      filter: IMMUNE_PHOTO_FILTER,
                    }}
                  />
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    letterSpacing: "0.2em",
                    color: "var(--gold-2)",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 20,
                    fontWeight: 500,
                    color: "var(--fg-on-light-1)",
                    margin: "0 0 6px",
                    lineHeight: 1.25,
                  }}
                >
                  {lang === "ko" ? prog.labelKo : prog.labelEn}
                </h3>
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: "var(--fg-on-light-3)",
                    margin: 0,
                  }}
                >
                  {lang === "ko" ? prog.descKo : prog.descEn}
                </p>
              </article>
            ))}
          </div>

          {/* 5단계 프로세스 요약 */}
          <div
            style={{
              marginTop: 72,
              padding: "48px 40px",
              background: "var(--ink-0)",
              color: "var(--fg-on-dark-1)",
              borderTop: "1px solid var(--gold-0)",
            }}
          >
            <Eyebrow>{lang === "ko" ? "5단계 통합 면역치료" : "5-stage integrated immune care"}</Eyebrow>
            <h3
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "clamp(24px, 3vw, 36px)",
                fontWeight: 400,
                lineHeight: 1.2,
                margin: "16px 0 32px",
                color: "var(--fg-on-dark-1)",
                maxWidth: 680,
              }}
            >
              {lang === "ko"
                ? "수술 전부터 재발 관리까지, 암의 모든 단계를 함께합니다."
                : "From before surgery to recurrence management — with you through every phase."}
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
                gap: 0,
                borderTop: "1px solid var(--gold-tint)",
              }}
            >
              {[
                { num: "01", ko: "수술 전", en: "Pre-surgery", sub: { ko: "면역관리", en: "Immune prep" } },
                { num: "02", ko: "수술 후", en: "Post-surgery", sub: { ko: "회복·재활", en: "Recovery" } },
                { num: "03", ko: "항암 중", en: "During chemo", sub: { ko: "효과 개선", en: "Efficacy boost" } },
                { num: "04", ko: "재발 관리", en: "Recurrence", sub: { ko: "면역 강화", en: "Immune fortification" } },
                { num: "05", ko: "추적 관찰", en: "Follow-up", sub: { ko: "장기 관리", en: "Long-term care" } },
              ].map((step, i) => (
                <div
                  key={step.num}
                  style={{
                    padding: "24px 16px",
                    borderRight: i < 4 ? "1px solid var(--ink-3)" : "none",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 36,
                      fontWeight: 400,
                      color: "var(--gold-0)",
                      lineHeight: 1,
                      marginBottom: 10,
                    }}
                  >
                    {step.num}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 14,
                      fontWeight: 500,
                      color: "var(--fg-on-dark-1)",
                      marginBottom: 4,
                    }}
                  >
                    {lang === "ko" ? step.ko : step.en}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 10,
                      letterSpacing: "0.1em",
                      color: "var(--fg-on-dark-3)",
                      textTransform: "uppercase",
                    }}
                  >
                    {lang === "ko" ? step.sub.ko : step.sub.en}
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
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 16,
              lineHeight: 1.75,
              color: "var(--fg-on-light-2)",
              margin: "24px 0 40px",
            }}
          >
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
        }
      `}</style>
    </div>
  );
}
