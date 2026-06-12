"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n/LangContext";
import PageShell from "../../components/healo/PageShell";
import {
  Eyebrow,
  Rule,
  ButtonGold,
  FilmGrain,
  Stat,
} from "../../components/healo/Primitives";
import { PHOTOS, IMMUNE_PHOTOS, PHOTO_FILTER, IMMUNE_PHOTO_FILTER } from "../../components/healo/Photos";

const COPY = {
  en: {
    eyebrow: "About HEALO",
    title: "Quiet expertise.",
    titleItalic: "Personal care.",
    lede:
      "HEALO is a concierge platform that brings international cancer patients into Korea's most experienced oncology teams — and stays with them from first question to full recovery.",
    mission: {
      eyebrow: "Our mission",
      body: "To make Korea's best cancer care accessible to anyone, in any language, at any stage of their diagnosis — without the chaos that usually surrounds medical travel.",
    },
    values: [
      {
        num: "01",
        title: "Restraint over hype",
        body: "We don't promise miracles. We present realistic options, clear pricing, and honest outcomes.",
      },
      {
        num: "02",
        title: "One coordinator, end to end",
        body: "A single dedicated point of contact — in your language, in your time zone, from inquiry through follow-up.",
      },
      {
        num: "03",
        title: "No sponsored placements",
        body: "Partner hospitals are selected for clinical outcomes, not for commercial relationships.",
      },
      {
        num: "04",
        title: "Privacy by design",
        body: "Medical and personal data is handled under Korean PIPA, GDPR, and Kazakhstan Law 94-V — with explicit consent for every transfer.",
      },
    ],
    teamEyebrow: "The team",
    teamLede: "Built by operators who have run international patient programs at top Korean hospitals.",
    stats: [
      { num: "06", unit: "languages", label: "Ko · En · Ru · Kz · Zh · Ja" },
      { num: "24/7", unit: "", label: "Concierge availability" },
      { num: "10+", unit: "years", label: "Combined operator experience" },
    ],
    ctaTitle: "Tell us what you're facing.",
    ctaBody: "We'll respond within one business day in your language.",
    ctaBtn: "Request consultation",
  },
  ko: {
    eyebrow: "HEALO 소개",
    title: "조용한 전문성,",
    titleItalic: "개인적인 돌봄.",
    lede:
      "HEALO는 해외 암환자를 한국의 가장 경험 많은 종양학 팀과 연결하는 컨시어지 플랫폼입니다. 첫 문의부터 완전한 회복까지, 옆에서 함께합니다.",
    mission: {
      eyebrow: "우리의 미션",
      body: "누구든, 어떤 언어로든, 진단의 어떤 단계에서든 한국 최고의 암 치료에 접근할 수 있게 하는 것. 의료 해외여행에 따라붙는 혼란 없이.",
    },
    values: [
      {
        num: "01",
        title: "과장보다 신중함",
        body: "기적을 약속하지 않습니다. 현실적인 옵션, 명확한 가격, 정직한 결과만 안내합니다.",
      },
      {
        num: "02",
        title: "한 명의 코디네이터가 끝까지",
        body: "전담 코디네이터 한 명이 이용자의 언어·시간대로 문의부터 사후 관리까지 함께합니다.",
      },
      {
        num: "03",
        title: "스폰서 제휴 없음",
        body: "제휴 병원은 상업적 관계가 아닌 임상 성과를 기준으로 선정합니다.",
      },
      {
        num: "04",
        title: "프라이버시가 기본",
        body: "의료·개인 정보는 한국 PIPA, GDPR, 카자흐스탄 94-V 법에 따라 처리되며, 모든 이전에 명시적 동의를 받습니다.",
      },
    ],
    teamEyebrow: "팀",
    teamLede: "한국 최상위 병원에서 외국인환자 유치 프로그램을 운영해온 실무자들이 만들었습니다.",
    stats: [
      { num: "06", unit: "개 언어", label: "한·영·러·카자흐·중·일" },
      { num: "24/7", unit: "", label: "컨시어지 지원" },
      { num: "10+", unit: "년", label: "종합 운영 경험" },
    ],
    ctaTitle: "어떤 상황이신지 알려주세요.",
    ctaBody: "영업일 기준 하루 안에, 선호 언어로 회신드립니다.",
    ctaBtn: "상담 신청",
  },
};

export default function AboutPremium() {
  const lang = useLang();
  const copy = COPY[lang] || COPY.en;

  return (
    <PageShell
      current="about"
      heroEyebrow={copy.eyebrow}
      heroTitle={copy.title}
      heroTitleItalic={copy.titleItalic}
      heroLede={copy.lede}
    >
      {/* Mission */}
      <section style={{ padding: "96px 24px", borderTop: "1px solid var(--cream-2)" }}>
        <div
          className="healo-about-grid"
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "5fr 7fr",
            gap: 64,
            alignItems: "start",
          }}
        >
          <div>
            <Eyebrow>{copy.mission.eyebrow}</Eyebrow>
            <Rule />
          </div>
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontWeight: 400,
              fontSize: "clamp(22px, 2.8vw, 36px)",
              lineHeight: 1.4,
              color: "var(--fg-on-light-1)",
              margin: 0,
            }}
          >
            {copy.mission.body}
          </p>
        </div>
      </section>

      {/* Values */}
      <section style={{ padding: "96px 24px", background: "var(--paper)" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <Eyebrow>Values</Eyebrow>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 0,
              marginTop: 32,
              borderTop: "1px solid var(--gold-tint)",
            }}
          >
            {copy.values.map((v, i) => (
              <div
                key={v.num}
                style={{
                  padding: "40px 32px 40px 0",
                  borderRight: i < copy.values.length - 1 ? "1px solid var(--cream-2)" : "none",
                  paddingLeft: i === 0 ? 0 : 32,
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--gold-2)",
                    letterSpacing: "0.2em",
                    marginBottom: 20,
                  }}
                >
                  {v.num}
                </div>
                <h3
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 22,
                    fontWeight: 500,
                    lineHeight: 1.25,
                    color: "var(--fg-on-light-1)",
                    margin: "0 0 12px",
                  }}
                >
                  {v.title}
                </h3>
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 14,
                    lineHeight: 1.7,
                    color: "var(--fg-on-light-2)",
                    margin: 0,
                  }}
                >
                  {v.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team + Stats */}
      <section
        style={{
          position: "relative",
          background: "var(--ink-0)",
          color: "var(--fg-on-dark-1)",
          padding: "96px 24px",
          overflow: "hidden",
        }}
      >
        <FilmGrain />
        <div
          style={{
            position: "relative",
            maxWidth: 1240,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "5fr 7fr",
            gap: 64,
            alignItems: "center",
          }}
          className="healo-about-team"
        >
          <div>
            <img
              src={IMMUNE_PHOTOS.team}
              alt="HEALO team — physicians, coordinators, and chef"
              style={{
                width: "100%",
                aspectRatio: "4 / 5",
                objectFit: "cover",
                filter: IMMUNE_PHOTO_FILTER,
              }}
            />
          </div>
          <div>
            <Eyebrow>{copy.teamEyebrow}</Eyebrow>
            <h2
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 400,
                fontSize: "clamp(32px, 4vw, 56px)",
                lineHeight: 1.15,
                margin: "24px 0 40px",
                color: "var(--fg-on-dark-1)",
              }}
            >
              {copy.teamLede}
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 32,
              }}
            >
              {copy.stats.map((s, i) => (
                <Stat key={i} num={s.num} unit={s.unit} label={s.label} onDark />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "96px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <Eyebrow>Begin</Eyebrow>
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
            {copy.ctaTitle}
          </h2>
          <Rule width={64} style={{ margin: "24px auto" }} />
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 16,
              lineHeight: 1.7,
              color: "var(--fg-on-light-2)",
              margin: "24px 0 40px",
            }}
          >
            {copy.ctaBody}
          </p>
          <Link href="/intake" style={{ textDecoration: "none" }}>
            <ButtonGold>{copy.ctaBtn}</ButtonGold>
          </Link>
        </div>
      </section>

      <style jsx>{`
        @media (max-width: 900px) {
          :global(.healo-about-grid),
          :global(.healo-about-team) {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
          }
        }
      `}</style>
    </PageShell>
  );
}
