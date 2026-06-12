"use client";

import Link from "next/link";
import PageShell from "../../components/healo/PageShell";
import { Eyebrow, Rule, ButtonGold, LinkArrow, Chip, FilmGrain } from "../../components/healo/Primitives";
import { useLang } from "@/lib/i18n/LangContext";
import { STORIES } from "@/lib/stories/storiesData";
import { PHOTO_FILTER } from "../../components/healo/Photos";

const COPY = {
  en: {
    eyebrow: "Patient stories",
    title: "Real people,",
    titleItalic: "real recoveries.",
    lede: "Every story shared here was reviewed, consented, and approved by the patient. Names may be anonymized at request. Hospital names are shared with partner authorization.",
    age: "age",
    outcome: "Outcome",
    consent: "Published with patient consent",
    anonymized: "Name anonymized",
    readFull: "Read full story",
    shareYours: "Want to share yours?",
    shareBody: "After your care journey, your coordinator will ask if you'd like to share your story to help future patients. Fully optional. Always your choice.",
    shareBtn: "Start your journey",
  },
  ko: {
    eyebrow: "환자 스토리",
    title: "실제 사람들의",
    titleItalic: "실제 회복.",
    lede: "여기 공유된 모든 스토리는 환자 본인의 검토·동의·승인을 거쳤습니다. 이름은 요청에 따라 가명화될 수 있습니다.",
    age: "나이",
    outcome: "경과",
    consent: "환자 동의 하에 게재",
    anonymized: "이름 가명화",
    readFull: "전체 스토리 읽기",
    shareYours: "당신의 이야기도 들려주시겠어요?",
    shareBody: "치료 여정이 끝난 후, 코디네이터가 후기 공유 의향을 여쭙습니다. 완전히 선택 사항이며, 결정은 언제나 환자의 몫입니다.",
    shareBtn: "여정 시작하기",
  },
  ru: {
    eyebrow: "Истории пациентов",
    title: "Реальные люди,",
    titleItalic: "реальное восстановление.",
    lede: "Каждая история здесь проверена и опубликована с согласия пациента. Имена могут быть анонимизированы по запросу.",
    age: "возраст",
    outcome: "Результат",
    consent: "Опубликовано с согласия пациента",
    anonymized: "Имя анонимизировано",
    readFull: "Полная история",
    shareYours: "Хотите поделиться своей?",
    shareBody: "После лечения координатор спросит, хотите ли вы поделиться опытом. Это полностью ваше решение.",
    shareBtn: "Начать путь",
  },
};

export default function StoriesClient() {
  const lang = useLang();
  const copy = COPY[lang] || COPY.en;
  const l = (obj) => obj?.[lang] || obj?.en || "";

  return (
    <PageShell
      current=""
      heroEyebrow={copy.eyebrow}
      heroTitle={copy.title}
      heroTitleItalic={copy.titleItalic}
      heroLede={copy.lede}
    >
      <section style={{ padding: "72px 24px 96px" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          {STORIES.length === 0 ? (
            <p
              style={{
                padding: "72px 0",
                textAlign: "center",
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                color: "var(--fg-on-light-3)",
              }}
            >
              Stories will be published here as patients consent to share.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 96 }}>
              {STORIES.map((story, idx) => (
                <StoryCard key={story.id} story={story} idx={idx} l={l} copy={copy} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA — dark */}
      <section
        style={{
          position: "relative",
          background: "var(--ink-0)",
          color: "var(--fg-on-dark-1)",
          padding: "96px 24px",
          overflow: "hidden",
          borderTop: "1px solid var(--gold-tint)",
        }}
      >
        <FilmGrain />
        <div style={{ position: "relative", maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
          <Eyebrow>Begin</Eyebrow>
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(32px, 4.5vw, 56px)",
              lineHeight: 1.15,
              margin: "24px 0 16px",
              fontStyle: "italic",
              color: "var(--gold-0)",
            }}
          >
            {copy.shareYours}
          </h2>
          <Rule width={64} tone="gold" style={{ margin: "24px auto" }} />
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 16,
              lineHeight: 1.75,
              color: "var(--fg-on-dark-2)",
              margin: "24px 0 40px",
              maxWidth: 560,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            {copy.shareBody}
          </p>
          <Link href="/intake" style={{ textDecoration: "none" }}>
            <ButtonGold>{copy.shareBtn}</ButtonGold>
          </Link>
        </div>
      </section>
    </PageShell>
  );
}

function StoryCard({ story, idx, l, copy }) {
  const imageRight = idx % 2 === 1;
  return (
    <article
      className="healo-story-card"
      style={{
        display: "grid",
        gridTemplateColumns: "5fr 7fr",
        gap: 64,
        alignItems: "start",
        direction: imageRight ? "rtl" : "ltr",
      }}
    >
      <div style={{ direction: "ltr" }}>
        <div
          style={{
            width: "100%",
            aspectRatio: "4 / 5",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <img
            src={story.coverImage}
            alt=""
            loading="lazy"
            style={{ width: "100%", height: "100%", objectFit: "cover", filter: PHOTO_FILTER }}
          />
        </div>
        <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Chip tone="gold">{l(story.cancerLabel)}</Chip>
          <Chip tone="cream">Stage {story.stage}</Chip>
          <Chip tone="cream">
            {l(story.country)} · {copy.age} {story.age}
          </Chip>
        </div>
      </div>

      <div style={{ direction: "ltr" }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--gold-2)",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          {String(idx + 1).padStart(2, "0")} — {l(story.displayName)}
        </div>
        <blockquote
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontWeight: 400,
            fontSize: "clamp(24px, 3vw, 36px)",
            lineHeight: 1.4,
            color: "var(--fg-on-light-1)",
            margin: "0 0 32px",
            borderLeft: "2px solid var(--gold-0)",
            paddingLeft: 24,
          }}
        >
          {l(story.quote)}
        </blockquote>

        <Rule width={40} />

        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 15,
            lineHeight: 1.75,
            color: "var(--fg-on-light-2)",
            marginTop: 24,
          }}
        >
          {l(story.body)}
        </p>

        {story.outcome && (
          <div
            style={{
              marginTop: 32,
              padding: "20px 24px",
              background: "var(--paper)",
              borderLeft: "2px solid var(--gold-0)",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: "var(--gold-2)",
                marginBottom: 6,
              }}
            >
              {copy.outcome}
            </div>
            <div
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 17,
                fontStyle: "italic",
                color: "var(--fg-on-light-1)",
              }}
            >
              {l(story.outcome)}
            </div>
          </div>
        )}

        <div
          style={{
            marginTop: 24,
            fontFamily: "var(--font-sans)",
            fontSize: 10,
            letterSpacing: "0.05em",
            color: "var(--fg-on-light-4)",
            lineHeight: 1.7,
          }}
        >
          ✓ {copy.consent}
          {story.anonymized ? ` · ${copy.anonymized}` : ""}
          {story.consentDate ? ` · ${story.consentDate}` : ""}
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          :global(.healo-story-card) {
            grid-template-columns: 1fr !important;
            direction: ltr !important;
            gap: 32px !important;
          }
        }
      `}</style>
    </article>
  );
}
