"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n/LangContext";
import PageShell from "../../components/healo/PageShell";
import { Eyebrow, Rule, ButtonGold } from "../../components/healo/Primitives";

const COPY = {
  en: {
    eyebrow: "Contact",
    title: "Speak with",
    titleItalic: "a coordinator.",
    lede: "We respond within one business day in your preferred language. Whatsapp, email, or the intake form — whatever works for you.",
    channels: [
      { label: "Email", value: "admin@healwith.co.kr", href: "mailto:admin@healwith.co.kr" },
      { label: "Phone (international)", value: "+82 10 4772 1075", href: "tel:+821047721075" },
      { label: "Phone (domestic)", value: "070-7500-7795", href: "tel:07075007795" },
    ],
    hours: "Business hours",
    hoursValue: "Monday – Friday · 09:00 – 18:00 KST (excl. Korean public holidays)",
    office: "Office",
    officeAddress: "Room 613, 385 Gangseo-ro, Gangseo-gu, Seoul, Republic of Korea",
    officeLine2: "(Magok-dong, Woosung SB Tower)",
    legalEyebrow: "Legal",
    legalEntity: "Trade name: BONROI · Sole proprietorship",
    legalRep: "Representative: JUYOUNG KANG",
    legalReg: "Business Reg. 463-35-00902",
    legalFacilitator: "International Patient Facilitator · A-2026-01-02-06761 (Seoul)",
    ctaTitle: "Prefer a structured inquiry?",
    ctaBody: "The intake form captures your diagnosis, timing, and preferences in a few minutes.",
    ctaBtn: "Request consultation",
  },
  ko: {
    eyebrow: "연락처",
    title: "코디네이터와",
    titleItalic: "대화하세요.",
    lede: "선호 언어로 영업일 기준 하루 안에 답변드립니다. 이메일, 전화, 인테이크 폼 중 편하신 방법으로.",
    channels: [
      { label: "이메일", value: "admin@healwith.co.kr", href: "mailto:admin@healwith.co.kr" },
      { label: "전화 (국제)", value: "+82 10 4772 1075", href: "tel:+821047721075" },
      { label: "전화 (국내)", value: "070-7500-7795", href: "tel:07075007795" },
    ],
    hours: "운영 시간",
    hoursValue: "월요일 – 금요일 · 09:00 – 18:00 KST (한국 공휴일 제외)",
    office: "사무실",
    officeAddress: "서울특별시 강서구 강서로 385, 613호",
    officeLine2: "(마곡동, 우성에스비타워)",
    legalEyebrow: "법인 정보",
    legalEntity: "상호: 본로이 (BONROI) · 개인사업자",
    legalRep: "대표자: 강주영 (JUYOUNG KANG)",
    legalReg: "사업자등록번호 463-35-00902",
    legalFacilitator: "외국인환자 유치업자 등록 · A-2026-01-02-06761 (서울)",
    ctaTitle: "구조화된 문의가 더 편하신가요?",
    ctaBody: "인테이크 폼은 진단·일정·선호사항을 몇 분 안에 정리해 줍니다.",
    ctaBtn: "상담 신청",
  },
};

export default function ContactPremium() {
  const lang = useLang();
  const copy = COPY[lang] || COPY.en;

  return (
    <PageShell
      current="contact"
      heroEyebrow={copy.eyebrow}
      heroTitle={copy.title}
      heroTitleItalic={copy.titleItalic}
      heroLede={copy.lede}
    >
      {/* Channels */}
      <section style={{ padding: "72px 24px", borderTop: "1px solid var(--gold-tint)" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 0,
            }}
          >
            {copy.channels.map((c, i) => (
              <a
                key={i}
                href={c.href}
                style={{
                  padding: "40px 32px 40px 0",
                  borderRight: i < copy.channels.length - 1 ? "1px solid var(--cream-2)" : "none",
                  paddingLeft: i === 0 ? 0 : 32,
                  textDecoration: "none",
                  display: "block",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 10,
                    fontWeight: 500,
                    letterSpacing: "0.24em",
                    textTransform: "uppercase",
                    color: "var(--fg-on-light-3)",
                    marginBottom: 10,
                  }}
                >
                  {c.label}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 22,
                    fontWeight: 500,
                    color: "var(--fg-on-light-1)",
                    lineHeight: 1.3,
                    wordBreak: "break-all",
                  }}
                >
                  {c.value}
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Hours + Office */}
      <section style={{ padding: "64px 24px", background: "var(--paper)" }}>
        <div
          className="healo-contact-grid"
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 64,
          }}
        >
          <div>
            <Eyebrow>{copy.hours}</Eyebrow>
            <Rule />
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: 18,
                lineHeight: 1.7,
                color: "var(--fg-on-light-2)",
                margin: "16px 0 0",
              }}
            >
              {copy.hoursValue}
            </p>
          </div>
          <div>
            <Eyebrow>{copy.office}</Eyebrow>
            <Rule />
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 18,
                lineHeight: 1.7,
                color: "var(--fg-on-light-1)",
                margin: "16px 0 0",
              }}
            >
              {copy.officeAddress}
              <br />
              <span style={{ color: "var(--fg-on-light-3)", fontSize: 15 }}>
                {copy.officeLine2}
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* Legal info strip */}
      <section style={{ padding: "48px 24px", background: "var(--ink-0)", color: "var(--fg-on-dark-2)" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <Eyebrow>{copy.legalEyebrow}</Eyebrow>
          <div
            style={{
              marginTop: 16,
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              lineHeight: 2,
              color: "var(--fg-on-dark-2)",
            }}
          >
            {copy.legalEntity}
            <br />
            {copy.legalRep}
            <br />
            {copy.legalReg}
            <br />
            <span style={{ color: "var(--gold-0)" }}>{copy.legalFacilitator}</span>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "96px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(28px, 4vw, 44px)",
              lineHeight: 1.2,
              margin: "0 0 16px",
              color: "var(--fg-on-light-1)",
            }}
          >
            {copy.ctaTitle}
          </h2>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 15,
              lineHeight: 1.7,
              color: "var(--fg-on-light-2)",
              margin: "16px 0 32px",
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
        @media (max-width: 768px) {
          :global(.healo-contact-grid) {
            grid-template-columns: 1fr !important;
            gap: 48px !important;
          }
        }
      `}</style>
    </PageShell>
  );
}
