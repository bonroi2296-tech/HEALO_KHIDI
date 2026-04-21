"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useLang } from "../../src/lib/i18n/LangContext";
import { supabaseClient } from "../../src/lib/data/supabaseClient";
import { mapHospitalRow } from "../../src/lib/mapper";
import { getLangCodeFromCookie } from "../../src/lib/i18n";
import {
  Eyebrow,
  Rule,
  ButtonGold,
  ButtonOutline,
  LinkArrow,
  Chip,
  Stat,
  FilmGrain,
} from "../../components/healo/Primitives";
import Nav from "../../components/healo/Nav";
import Footer from "../../components/healo/Footer";
import { PHOTOS, IMMUNE_PHOTOS, PHOTO_FILTER, IMMUNE_PHOTO_FILTER } from "../../components/healo/Photos";

const COPY = {
  en: {
    navCurrent: "home",
    eyebrowHero: "01 — Concierge care, Korea",
    heroTitleA: "Expert cancer care,",
    heroTitleB: "guided end to end.",
    heroLede:
      "HEALO coordinates every step — from first consultation to follow-up — with Korea's most experienced oncology teams. For patients from anywhere in the world.",
    ctaPrimary: "Request consultation",
    ctaSecondary: "How it works",
    heroCaption: "Immune Hospital · Magok (HEALO direct)",
    disclaimer:
      "We are not a medical institution. All diagnosis and treatment is delivered by licensed Korean providers.",

    statsEyebrow: "02 — By the numbers",
    stats: [
      { num: "99.9", unit: "%", label: "Thyroid 5-yr survival" },
      { num: "93.8", unit: "%", label: "Breast 5-yr survival" },
      { num: "3,200", unit: "+", label: "Cases per year" },
      { num: "24/7", unit: "", label: "Concierge support" },
    ],

    servicesEyebrow: "03 — What we handle",
    servicesTitle: "The entire journey,",
    servicesTitleItalic: "handled quietly.",
    services: [
      {
        eyebrow: "Hospital matching",
        title: "Hospital matching",
        body:
          "Multidisciplinary screening across Korea's top cancer centers — matched to your diagnosis, language, budget, and timeline.",
      },
      {
        eyebrow: "Visa & stay",
        title: "Visa and arrival",
        body:
          "C-3-3 and G-1 medical visa preparation, airport pickup, and curated stay options near your treatment center.",
      },
      {
        eyebrow: "Translation",
        title: "Medical translation",
        body:
          "Professional interpreters in Korean-Russian, Korean-English, and Korean-Kazakh — present at every consultation.",
      },
      {
        eyebrow: "Coordination",
        title: "End-to-end coordination",
        body:
          "One dedicated coordinator from first inquiry through post-treatment follow-up, operating in your time zone.",
      },
    ],

    // 원격협진 — USP 전면
    telemedicineEyebrow: "04 — Telemedicine · Our USP",
    telemedicineTitle: "Talk to a Korean specialist",
    telemedicineTitleItalic: "before you board the plane.",
    telemedicineLede:
      "No visa. No flight. Start with a real-time video consultation with Korea's top oncologists from wherever you are — then decide whether to travel.",
    telemedicineFeatures: [
      {
        icon: "🎥",
        title: "HD video consultation",
        desc: "Ultra-low-latency WebRTC. Works on laptop, tablet, and mobile. No app install.",
      },
      {
        icon: "🗣️",
        title: "Real-time interpretation",
        desc: "Korean ↔ Russian / Kazakh / English / Chinese. Medical-grade AI + human interpreters when needed.",
      },
      {
        icon: "📄",
        title: "Secure document review",
        desc: "Upload MRI, CT, pathology — Korean specialists review and discuss live during the call.",
      },
      {
        icon: "🔒",
        title: "Medical-grade security",
        desc: "AES-256 encryption end-to-end. PIPA §28-8 / HIPAA-ready. Your records, your consent.",
      },
    ],
    telemedicineCtaPrimary: "Start a remote consultation",
    telemedicineCtaSecondary: "See how it works",

    hospitalsEyebrow: "05 — Partner hospitals",
    hospitalsTitle: "Selected for outcomes,",
    hospitalsTitleItalic: "not for show.",
    hospitalsLede:
      "Every partner is vetted for oncology specialization, international patient experience, and language support. No sponsored placements.",
    hospitals: [
      {
        name: "Asan Medical Center",
        specialty: "Comprehensive cancer",
        meta: "2,700 beds · Seoul",
        photo: PHOTOS.hospital1,
      },
      {
        name: "Samsung Medical Center",
        specialty: "Precision oncology",
        meta: "1,970 beds · Seoul",
        photo: PHOTOS.hospital2,
      },
      {
        name: "Severance Hospital",
        specialty: "Robotic & minimally invasive",
        meta: "2,450 beds · Seoul",
        photo: PHOTOS.hospital3,
      },
    ],

    processEyebrow: "06 — The process",
    processTitle: "Four steps, carefully paced.",
    process: [
      {
        step: "01",
        title: "Intake",
        body: "Share your diagnosis and priorities. We review within 24 hours.",
      },
      {
        step: "02",
        title: "Matching",
        body: "We present two or three suitable hospitals with clear pricing.",
      },
      {
        step: "03",
        title: "Travel",
        body: "We prepare visa paperwork and arrange arrival logistics.",
      },
      {
        step: "04",
        title: "Treatment",
        body: "Your coordinator accompanies every appointment through discharge.",
      },
    ],

    ctaEyebrow: "Begin",
    ctaTitle: "A single inquiry starts everything.",
    ctaBody:
      "No account, no payment. Share what you know, and we respond within one business day.",
  },

  ko: {
    navCurrent: "home",
    eyebrowHero: "01 — 한국 암 치료 컨시어지",
    heroTitleA: "국제 암환자의 한국 치료,",
    heroTitleB: "처음부터 끝까지.",
    heroLede:
      "HEALO는 첫 상담부터 사후 관리까지 한국 최고 수준 종양학 팀과 함께 조용히 코디네이팅합니다. 전 세계 어디에서 오시든.",
    ctaPrimary: "상담 신청",
    ctaSecondary: "진행 방식 보기",
    heroCaption: "면력한방병원 마곡 (HEALO 직영)",
    disclaimer:
      "HEALO는 의료기관이 아닙니다. 진단과 치료는 한국의 면허를 갖춘 의료진이 수행합니다.",

    statsEyebrow: "02 — 숫자로 보는",
    stats: [
      { num: "99.9", unit: "%", label: "갑상선암 5년 생존율" },
      { num: "93.8", unit: "%", label: "유방암 5년 생존율" },
      { num: "3,200", unit: "+", label: "연간 진료 케이스" },
      { num: "24/7", unit: "", label: "컨시어지 지원" },
    ],

    servicesEyebrow: "03 — 맡아드리는 것",
    servicesTitle: "여정 전체를",
    servicesTitleItalic: "조용히 책임집니다.",
    services: [
      {
        eyebrow: "병원 매칭",
        title: "병원 매칭",
        body:
          "진단·언어·예산·일정에 맞춰 한국 최상위 암센터들 중 다학제 심사를 거친 2-3곳을 제안드립니다.",
      },
      {
        eyebrow: "비자·체류",
        title: "비자와 체류",
        body:
          "메디컬 비자(C-3-3, G-1) 준비, 공항 픽업, 진료 병원 근처 체류 옵션 전체를 사전 준비합니다.",
      },
      {
        eyebrow: "의료 통역",
        title: "의료 전문 통역",
        body:
          "한·러, 한·영, 한·카자흐 전문 의료 통역사가 모든 진료에 동행합니다.",
      },
      {
        eyebrow: "코디네이션",
        title: "전 과정 코디네이션",
        body:
          "첫 문의부터 치료 후 경과 관리까지, 전담 코디네이터 한 분이 이용자의 시간대에 맞춰 함께합니다.",
      },
    ],

    // 원격협진 — USP 전면
    telemedicineEyebrow: "04 — 원격협진 · HEALO 의 USP",
    telemedicineTitle: "비행기 타기 전에",
    telemedicineTitleItalic: "한국 전문의와 먼저 만나세요.",
    telemedicineLede:
      "비자도, 항공편도 필요 없습니다. 계신 그 자리에서 실시간 영상 상담으로 한국 최고의 암 전문의와 만난 뒤 — 한국 방문 여부를 결정하세요.",
    telemedicineFeatures: [
      {
        icon: "🎥",
        title: "HD 영상 상담",
        desc: "초저지연 WebRTC. 노트북/태블릿/모바일 어디서든. 앱 설치 불필요.",
      },
      {
        icon: "🗣️",
        title: "실시간 의료 통역",
        desc: "한-러 / 한-카자흐 / 한-영 / 한-중. 의료 전문 AI + 필요 시 인간 통역사.",
      },
      {
        icon: "📄",
        title: "보안 문서 공유",
        desc: "MRI, CT, 조직검사 업로드 — 한국 전문의가 상담 중 실시간 판독.",
      },
      {
        icon: "🔒",
        title: "의료 등급 보안",
        desc: "End-to-end AES-256 암호화. PIPA §28조의8 / HIPAA 준수. 본인 동의 기반.",
      },
    ],
    telemedicineCtaPrimary: "원격 상담 시작하기",
    telemedicineCtaSecondary: "진행 방식 보기",

    hospitalsEyebrow: "05 — 제휴 병원",
    hospitalsTitle: "과시를 위한 것이 아닌,",
    hospitalsTitleItalic: "성과로 선정했습니다.",
    hospitalsLede:
      "모든 제휴 병원은 종양학 전문성, 외국인 환자 진료 경험, 언어 지원을 기준으로 선별됩니다. 스폰서 제휴는 없습니다.",
    hospitals: [
      {
        name: "서울아산병원",
        specialty: "종합 암센터",
        meta: "2,700병상 · 서울",
        photo: PHOTOS.hospital1,
      },
      {
        name: "삼성서울병원",
        specialty: "정밀 종양학",
        meta: "1,970병상 · 서울",
        photo: PHOTOS.hospital2,
      },
      {
        name: "세브란스병원",
        specialty: "로봇·최소침습 수술",
        meta: "2,450병상 · 서울",
        photo: PHOTOS.hospital3,
      },
    ],

    processEyebrow: "06 — 진행 방식",
    processTitle: "네 단계, 신중한 속도로.",
    process: [
      {
        step: "01",
        title: "문의",
        body: "진단과 우선순위를 공유해 주시면 24시간 내 검토합니다.",
      },
      {
        step: "02",
        title: "매칭",
        body: "투명한 견적과 함께 적합한 병원 2-3곳을 제안합니다.",
      },
      {
        step: "03",
        title: "여정",
        body: "비자 서류와 입국 로지스틱스를 대행합니다.",
      },
      {
        step: "04",
        title: "치료",
        body: "전담 코디네이터가 모든 진료에 동행하고 퇴원까지 함께합니다.",
      },
    ],

    ctaEyebrow: "시작하기",
    ctaTitle: "한 번의 문의로 모든 것이 시작됩니다.",
    ctaBody: "계정도 결제도 필요 없습니다. 아시는 만큼만 공유해 주시면 영업일 기준 하루 안에 답변드립니다.",
  },
};

export default function HomeClientPremium() {
  const lang = useLang();
  const copy = COPY[lang] || COPY.en;
  const isKo = lang === "ko";

  // 실제 DB에서 병원 데이터 fetch (Google Places enriched)
  const [dbHospitals, setDbHospitals] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabaseClient
          .from("hospitals")
          .select("*")
          .eq("is_published", true)
          .not("thumbnail_image", "is", null)
          .order("display_order", { ascending: true, nullsFirst: false })
          .limit(3);
        if (data && data.length > 0) {
          const langCode = getLangCodeFromCookie();
          setDbHospitals(
            data.map((r) => {
              const mapped = mapHospitalRow(r, langCode);
              return {
                name: mapped?.name || r.name_ko || r.name_en,
                photo: r.thumbnail_image,
                specialty: r.tags?.[0] || "Partner hospital",
                meta: r.address || "Seoul",
                slug: r.slug,
                rating: r.external_ratings?.google?.rating,
              };
            })
          );
        }
      } catch {
        /* use fallback */
      }
    })();
  }, []);
  const hospitalsToShow = dbHospitals && dbHospitals.length > 0 ? dbHospitals : copy.hospitals;

  return (
    <div style={{ background: "var(--cream-0)", minHeight: "100vh" }}>
      <Nav current="home" />

      {/* ==================== HERO ==================== */}
      <section
        style={{
          position: "relative",
          background: "var(--ink-0)",
          color: "var(--fg-on-dark-1)",
          padding: "64px 0 0",
          overflow: "hidden",
        }}
      >
        <FilmGrain />
        <div
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            padding: "0 24px",
            position: "relative",
          }}
        >
          <div style={{ borderTop: "1px solid var(--gold-tint)", paddingTop: 64 }}>
            <Eyebrow>{copy.eyebrowHero}</Eyebrow>
            <h1
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 400,
                fontSize: "clamp(48px, 9vw, 132px)",
                lineHeight: 1.02,
                letterSpacing: "-0.02em",
                margin: "32px 0 40px",
                maxWidth: 1100,
              }}
            >
              {copy.heroTitleA}
              <br />
              <span style={{ fontStyle: "italic", color: "var(--gold-0)" }}>
                {copy.heroTitleB}
              </span>
            </h1>

            <div
              className="healo-hero-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "5fr 7fr",
                gap: 48,
                alignItems: "end",
                marginBottom: 48,
              }}
            >
              <div>
                <Rule />
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontWeight: 300,
                    fontSize: 16,
                    lineHeight: 1.75,
                    color: "var(--fg-on-dark-2)",
                    maxWidth: 440,
                    margin: "16px 0 24px",
                  }}
                >
                  {copy.heroLede}
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 24,
                    flexWrap: "wrap",
                  }}
                >
                  <Link href="/intake" style={{ textDecoration: "none" }}>
                    <ButtonGold>{copy.ctaPrimary}</ButtonGold>
                  </Link>
                  <LinkArrow href="#process" onDark>
                    {copy.ctaSecondary}
                  </LinkArrow>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <p
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontStyle: "italic",
                    fontWeight: 400,
                    fontSize: 13,
                    color: "var(--fg-on-dark-4)",
                    margin: 0,
                    maxWidth: 340,
                    marginLeft: "auto",
                    lineHeight: 1.7,
                  }}
                >
                  {copy.disclaimer}
                </p>
              </div>
            </div>
          </div>

          {/* Hero photo */}
          <div
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: "21 / 9",
              overflow: "hidden",
              marginTop: 8,
            }}
          >
            <img
              src={IMMUNE_PHOTOS.team}
              alt="HEALO · Immune Hospital team"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                filter: IMMUNE_PHOTO_FILTER,
              }}
            />
            <div style={{ position: "absolute", left: 24, bottom: 24 }}>
              <Eyebrow>{isKo ? "제휴 병원" : "Partner hospital"}</Eyebrow>
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontStyle: "italic",
                  fontSize: 22,
                  color: "var(--fg-on-dark-1)",
                  marginTop: 8,
                  fontWeight: 400,
                }}
              >
                {copy.heroCaption}
              </div>
            </div>
          </div>
        </div>

        {/* ==================== STATS STRIP ==================== */}
        <div
          style={{
            borderTop: "1px solid var(--gold-tint)",
            marginTop: 0,
          }}
        >
          <div
            style={{
              maxWidth: 1240,
              margin: "0 auto",
              padding: "48px 24px 64px",
            }}
          >
            <Eyebrow tone="muted-dark">{copy.statsEyebrow}</Eyebrow>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 32,
                marginTop: 24,
              }}
            >
              {copy.stats.map((s, i) => (
                <Stat key={i} num={s.num} unit={s.unit} label={s.label} onDark />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== SERVICES ==================== */}
      <section style={{ background: "var(--cream-0)", padding: "96px 24px" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <Eyebrow>{copy.servicesEyebrow}</Eyebrow>
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(36px, 5vw, 72px)",
              lineHeight: 1.08,
              letterSpacing: "-0.005em",
              margin: "24px 0 64px",
              color: "var(--fg-on-light-1)",
              maxWidth: 900,
            }}
          >
            {copy.servicesTitle}
            <br />
            <span style={{ fontStyle: "italic", color: "var(--gold-2)" }}>
              {copy.servicesTitleItalic}
            </span>
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 0,
              borderTop: "1px solid var(--gold-tint)",
            }}
          >
            {copy.services.map((srv, i) => (
              <div
                key={i}
                style={{
                  padding: "40px 32px 40px 0",
                  borderRight:
                    i < copy.services.length - 1
                      ? "1px solid var(--cream-2)"
                      : "none",
                  paddingLeft: i === 0 ? 0 : 32,
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--gold-2)",
                    marginBottom: 16,
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 24,
                    fontWeight: 500,
                    lineHeight: 1.2,
                    color: "var(--fg-on-light-1)",
                    margin: "0 0 12px",
                  }}
                >
                  {srv.title}
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
                  {srv.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== TELEMEDICINE (USP) ==================== */}
      <section
        style={{
          background:
            "linear-gradient(180deg, var(--ink-0) 0%, var(--ink-0) 60%, #0f1a17 100%)",
          color: "var(--fg-on-dark-1, #f5f0e8)",
          padding: "120px 24px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative gold frame */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 32,
            right: 32,
            width: 120,
            height: 120,
            borderTop: "1px solid var(--gold-0, #c8a96a)",
            borderRight: "1px solid var(--gold-0, #c8a96a)",
            opacity: 0.3,
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            bottom: 32,
            left: 32,
            width: 120,
            height: 120,
            borderBottom: "1px solid var(--gold-0, #c8a96a)",
            borderLeft: "1px solid var(--gold-0, #c8a96a)",
            opacity: 0.3,
          }}
        />

        <div style={{ maxWidth: 1240, margin: "0 auto", position: "relative" }}>
          <div style={{ maxWidth: 900 }}>
            <Eyebrow tone="muted-dark">{copy.telemedicineEyebrow}</Eyebrow>
            <h2
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 400,
                fontSize: "clamp(40px, 5.5vw, 80px)",
                lineHeight: 1.05,
                letterSpacing: "-0.01em",
                margin: "32px 0 32px",
              }}
            >
              {copy.telemedicineTitle}
              <br />
              <span style={{ fontStyle: "italic", color: "var(--gold-0, #c8a96a)" }}>
                {copy.telemedicineTitleItalic}
              </span>
            </h2>
            <Rule width={64} color="gold" />
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "clamp(16px, 1.3vw, 19px)",
                lineHeight: 1.7,
                color: "var(--fg-on-dark-2, #c7c2b8)",
                margin: "32px 0 64px",
                maxWidth: 720,
              }}
            >
              {copy.telemedicineLede}
            </p>
          </div>

          {/* 4 Feature grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 32,
              marginBottom: 64,
            }}
          >
            {copy.telemedicineFeatures.map((f, i) => (
              <div
                key={i}
                style={{
                  padding: "32px 24px",
                  background: "rgba(200, 169, 106, 0.04)",
                  border: "1px solid rgba(200, 169, 106, 0.2)",
                  borderRadius: 2,
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 16 }}>{f.icon}</div>
                <h3
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 20,
                    fontWeight: 500,
                    margin: "0 0 12px",
                    color: "var(--fg-on-dark-1, #f5f0e8)",
                  }}
                >
                  {f.title}
                </h3>
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    lineHeight: 1.65,
                    color: "var(--fg-on-dark-2, #c7c2b8)",
                    margin: 0,
                  }}
                >
                  {f.desc}
                </p>
              </div>
            ))}
          </div>

          {/* CTA row */}
          <div
            style={{
              display: "flex",
              gap: 24,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <Link href="/inquiry" style={{ textDecoration: "none" }}>
              <ButtonGold>{copy.telemedicineCtaPrimary}</ButtonGold>
            </Link>
            <Link
              href="#process"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: "var(--fg-on-dark-2, #c7c2b8)",
                textDecoration: "none",
                borderBottom: "1px solid rgba(255,255,255,0.25)",
                paddingBottom: 4,
              }}
            >
              {copy.telemedicineCtaSecondary} →
            </Link>
          </div>
        </div>
      </section>

      {/* ==================== HOSPITALS ==================== */}
      <section style={{ background: "var(--paper)", padding: "96px 24px" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <div
            className="healo-hospitals-head"
            style={{
              display: "grid",
              gridTemplateColumns: "5fr 6fr",
              gap: 48,
              alignItems: "end",
              marginBottom: 48,
            }}
          >
            <div>
              <Eyebrow>{copy.hospitalsEyebrow}</Eyebrow>
              <h2
                style={{
                  fontFamily: "var(--font-serif)",
                  fontWeight: 400,
                  fontSize: "clamp(36px, 5vw, 72px)",
                  lineHeight: 1.08,
                  letterSpacing: "-0.005em",
                  margin: "24px 0 0",
                  color: "var(--fg-on-light-1)",
                }}
              >
                {copy.hospitalsTitle}
                <br />
                <span style={{ fontStyle: "italic", color: "var(--gold-2)" }}>
                  {copy.hospitalsTitleItalic}
                </span>
              </h2>
            </div>
            <div>
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 15,
                  lineHeight: 1.75,
                  color: "var(--fg-on-light-2)",
                  margin: 0,
                  maxWidth: 520,
                }}
              >
                {copy.hospitalsLede}
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
              gap: 32,
            }}
          >
            {hospitalsToShow.map((h, i) => (
              <article key={h.slug || i}>
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "4 / 5",
                    overflow: "hidden",
                    marginBottom: 16,
                  }}
                >
                  <img
                    src={h.photo}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      filter: PHOTO_FILTER,
                    }}
                  />
                </div>
                <Eyebrow tone="muted">{h.specialty}</Eyebrow>
                <h3
                  translate="no"
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 22,
                    fontWeight: 500,
                    lineHeight: 1.25,
                    color: "var(--fg-on-light-1)",
                    margin: "8px 0",
                  }}
                >
                  {h.name}
                </h3>
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    color: "var(--fg-on-light-3)",
                    letterSpacing: "0.04em",
                    margin: 0,
                  }}
                >
                  {h.meta}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== PROCESS ==================== */}
      <section
        id="process"
        style={{
          position: "relative",
          background: "var(--ink-0)",
          color: "var(--fg-on-dark-1)",
          padding: "96px 24px",
          overflow: "hidden",
        }}
      >
        <FilmGrain />
        <div style={{ position: "relative", maxWidth: 1240, margin: "0 auto" }}>
          <Eyebrow>{copy.processEyebrow}</Eyebrow>
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(36px, 5vw, 72px)",
              lineHeight: 1.08,
              margin: "24px 0 64px",
              color: "var(--fg-on-dark-1)",
              maxWidth: 900,
            }}
          >
            {copy.processTitle}
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 32,
              borderTop: "1px solid var(--gold-tint)",
              paddingTop: 32,
            }}
          >
            {copy.process.map((p, i) => (
              <div key={i}>
                <div
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 64,
                    fontWeight: 400,
                    color: "var(--gold-0)",
                    lineHeight: 1,
                    marginBottom: 16,
                  }}
                >
                  {p.step}
                </div>
                <h3
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 22,
                    fontWeight: 500,
                    color: "var(--fg-on-dark-1)",
                    margin: "0 0 8px",
                  }}
                >
                  {p.title}
                </h3>
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 14,
                    lineHeight: 1.7,
                    color: "var(--fg-on-dark-2)",
                    margin: 0,
                  }}
                >
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FINAL CTA ==================== */}
      <section style={{ background: "var(--cream-0)", padding: "96px 24px" }}>
        <div
          style={{
            maxWidth: 720,
            margin: "0 auto",
            textAlign: "center",
          }}
        >
          <Eyebrow>{copy.ctaEyebrow}</Eyebrow>
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(32px, 4.5vw, 56px)",
              lineHeight: 1.15,
              margin: "24px 0 24px",
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
            <ButtonGold>{copy.ctaPrimary}</ButtonGold>
          </Link>
        </div>
      </section>

      <Footer />

      {/* Mobile responsive */}
      <style jsx>{`
        @media (max-width: 768px) {
          :global(.healo-hero-grid),
          :global(.healo-hospitals-head) {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
          }
        }
      `}</style>
    </div>
  );
}
