"use client";

import { useState } from "react";
import Link from "next/link";
import PageShell from "../../components/healo/PageShell";
import { Eyebrow, Rule, ButtonGold, LinkArrow } from "../../components/healo/Primitives";
import { useLang } from "../../src/lib/i18n/LangContext";
import { FAQ_CATEGORIES, FAQS } from "../../src/lib/faq/faqData";

const COPY = {
  en: {
    eyebrow: "Questions",
    title: "Everything you're",
    titleItalic: "wondering.",
    lede: "Common questions from international patients before and during their care in Korea. Didn't find yours? Send us a message.",
    all: "All",
    contactTitle: "Still have questions?",
    contactBody: "Our coordinator will answer personally in your language, within one business day.",
    contactBtn: "Start a conversation",
  },
  ko: {
    eyebrow: "자주 묻는 질문",
    title: "궁금하신",
    titleItalic: "모든 것.",
    lede: "외국인 환자들이 한국 치료 전·중에 가장 자주 묻는 질문들입니다. 원하는 답이 없으면 메시지 주세요.",
    all: "전체",
    contactTitle: "다른 궁금한 점이 있으신가요?",
    contactBody: "코디네이터가 선호 언어로, 영업일 기준 하루 안에 개인적으로 답변드립니다.",
    contactBtn: "대화 시작하기",
  },
  ru: {
    eyebrow: "Вопросы",
    title: "Всё что вас",
    titleItalic: "интересует.",
    lede: "Самые частые вопросы иностранных пациентов до и во время лечения в Корее.",
    all: "Все",
    contactTitle: "Остались вопросы?",
    contactBody: "Наш координатор ответит лично на вашем языке в течение одного рабочего дня.",
    contactBtn: "Начать разговор",
  },
};

export default function FAQClient() {
  const lang = useLang();
  const copy = COPY[lang] || COPY.en;
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [openIdx, setOpenIdx] = useState(null);

  const l = (obj) => obj?.[lang] || obj?.en || "";

  const filtered =
    selectedCategory === "all"
      ? FAQS
      : FAQS.filter((f) => f.category === selectedCategory);

  return (
    <PageShell
      current=""
      heroEyebrow={copy.eyebrow}
      heroTitle={copy.title}
      heroTitleItalic={copy.titleItalic}
      heroLede={copy.lede}
    >
      {/* Category filter */}
      <section
        style={{
          borderTop: "1px solid var(--gold-tint)",
          borderBottom: "1px solid var(--cream-2)",
          padding: "20px 24px",
          background: "var(--cream-0)",
          position: "sticky",
          top: 65,
          zIndex: 10,
          backdropFilter: "blur(10px)",
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            display: "flex",
            gap: 24,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--fg-on-light-4)",
              letterSpacing: "0.2em",
            }}
          >
            {String(filtered.length).padStart(2, "0")} Q&A
          </span>
          <FilterBtn active={selectedCategory === "all"} onClick={() => setSelectedCategory("all")}>
            {copy.all}
          </FilterBtn>
          {FAQ_CATEGORIES.map((cat) => (
            <FilterBtn
              key={cat.id}
              active={selectedCategory === cat.id}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {l(cat.labels)}
            </FilterBtn>
          ))}
        </div>
      </section>

      {/* FAQ list */}
      <section style={{ padding: "72px 24px 96px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          {filtered.map((faq, idx) => {
            const key = `${faq.category}-${idx}`;
            const open = openIdx === key;
            return (
              <div
                key={key}
                style={{
                  borderTop: idx === 0 ? "1px solid var(--gold-tint)" : "none",
                  borderBottom: "1px solid var(--cream-2)",
                }}
              >
                <button
                  onClick={() => setOpenIdx(open ? null : key)}
                  aria-expanded={open}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    background: "transparent",
                    border: 0,
                    padding: "24px 0",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 24,
                    fontFamily: "inherit",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        color: "var(--gold-2)",
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        marginBottom: 8,
                      }}
                    >
                      {String(idx + 1).padStart(2, "0")} ·{" "}
                      {l(FAQ_CATEGORIES.find((c) => c.id === faq.category)?.labels || {})}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: "clamp(20px, 2.4vw, 26px)",
                        fontWeight: 500,
                        color: "var(--fg-on-light-1)",
                        lineHeight: 1.3,
                      }}
                    >
                      {l(faq.q)}
                    </div>
                  </div>
                  <span
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 32,
                      color: "var(--gold-0)",
                      lineHeight: 1,
                      transform: open ? "rotate(45deg)" : "rotate(0)",
                      transition: "transform 250ms var(--ease-out)",
                      marginTop: 4,
                      flexShrink: 0,
                    }}
                  >
                    +
                  </span>
                </button>
                {open && (
                  <div
                    style={{
                      paddingBottom: 32,
                      paddingRight: 56,
                      fontFamily: "var(--font-sans)",
                      fontSize: 16,
                      lineHeight: 1.75,
                      color: "var(--fg-on-light-2)",
                    }}
                  >
                    {l(faq.a)}
                  </div>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <p
              style={{
                padding: "72px 0",
                textAlign: "center",
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                color: "var(--fg-on-light-3)",
              }}
            >
              —
            </p>
          )}
        </div>
      </section>

      {/* CTA */}
      <section
        style={{
          background: "var(--paper)",
          padding: "96px 24px",
          borderTop: "1px solid var(--cream-2)",
        }}
      >
        <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
          <Eyebrow>Contact</Eyebrow>
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(28px, 4vw, 44px)",
              lineHeight: 1.15,
              margin: "16px 0",
              color: "var(--fg-on-light-1)",
            }}
          >
            {copy.contactTitle}
          </h2>
          <Rule width={48} style={{ margin: "16px auto" }} />
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 15,
              lineHeight: 1.7,
              color: "var(--fg-on-light-2)",
              margin: "16px 0 32px",
            }}
          >
            {copy.contactBody}
          </p>
          <Link href="/intake" style={{ textDecoration: "none" }}>
            <ButtonGold>{copy.contactBtn}</ButtonGold>
          </Link>
        </div>
      </section>
    </PageShell>
  );
}

function FilterBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "transparent",
        border: 0,
        cursor: "pointer",
        padding: "6px 0",
        fontFamily: "var(--font-sans)",
        fontSize: 11,
        fontWeight: active ? 600 : 500,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        color: active ? "var(--ink-0)" : "var(--fg-on-light-3)",
        borderBottom: `1px solid ${active ? "var(--gold-0)" : "transparent"}`,
      }}
    >
      {children}
    </button>
  );
}
