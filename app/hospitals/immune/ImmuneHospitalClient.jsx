"use client";

import Link from "next/link";
import PageShell from "../../../components/healo/PageShell";
import {
  Eyebrow,
  Rule,
  ButtonGold,
  LinkArrow,
  Chip,
  Stat,
  FilmGrain,
} from "../../../components/healo/Primitives";
import { IMMUNE_PHOTOS, IMMUNE_PHOTO_FILTER } from "../../../components/healo/Photos";
import { useLang } from "../../../src/lib/i18n/LangContext";
import { IMMUNE_HOSPITAL as H } from "../../../src/lib/data/immuneHospitalInfo";

export default function ImmuneHospitalClient() {
  const lang = useLang();
  const l = (obj) => obj?.[lang] || obj?.en || obj?.ko || "";

  return (
    <PageShell current="hospitals" noHero>
      {/* HERO */}
      <section
        style={{
          position: "relative",
          background: "var(--ink-0)",
          color: "var(--fg-on-dark-1)",
          padding: "80px 24px 64px",
          overflow: "hidden",
        }}
      >
        <FilmGrain />
        <div
          className="healo-ih-hero"
          style={{
            position: "relative",
            maxWidth: 1240,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "6fr 6fr",
            gap: 48,
            alignItems: "center",
          }}
        >
          <div>
            <Eyebrow>HEALO direct partner</Eyebrow>
            <h1
              translate="no"
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 400,
                fontSize: "clamp(44px, 6vw, 88px)",
                lineHeight: 1.05,
                letterSpacing: "-0.015em",
                margin: "24px 0 16px",
              }}
            >
              {l(H.officialName)}
            </h1>
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: "clamp(18px, 2vw, 24px)",
                color: "var(--gold-0)",
                margin: "0 0 24px",
              }}
            >
              — {l(H.tagline)}
            </p>
            <Rule width={64} tone="gold" />
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 300,
                fontSize: 16,
                lineHeight: 1.75,
                color: "var(--fg-on-dark-2)",
                maxWidth: 540,
                marginTop: 24,
              }}
            >
              {lang === "ko"
                ? "한방과 현대의학을 결합한 통합 면역치료 전문 병원. 2017년 개원 이후 누적 50,000+ 사례. 의료진·임상 영양사·치료식 셰프가 함께 한 명의 환자를 돌봅니다."
                : "Integrative immune care combining Korean Medicine and modern oncology. Founded 2017, 50,000+ cumulative cases. Physicians, clinical dietitian, and in-house chef care for each patient together."}
            </p>

            <div style={{ display: "flex", gap: 16, marginTop: 32, flexWrap: "wrap" }}>
              <Link href="/intake" style={{ textDecoration: "none" }}>
                <ButtonGold>
                  {lang === "ko" ? "Immune Hospital 상담 신청" : "Request consultation"}
                </ButtonGold>
              </Link>
              <a
                href={`tel:${H.mainPhone.replace(/[^\d+]/g, "")}`}
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 18,
                  color: "var(--gold-0)",
                  textDecoration: "none",
                  borderBottom: "1px solid var(--gold-0)",
                  paddingBottom: 2,
                }}
              >
                ☎ {H.mainPhone}
              </a>
            </div>
          </div>

          <div>
            <img
              src={IMMUNE_PHOTOS.team}
              alt="Immune Hospital team"
              style={{
                width: "100%",
                aspectRatio: "4 / 5",
                objectFit: "cover",
                filter: IMMUNE_PHOTO_FILTER,
              }}
            />
          </div>
        </div>

        {/* Stats strip */}
        <div
          style={{
            position: "relative",
            maxWidth: 1240,
            margin: "56px auto 0",
            paddingTop: 32,
            borderTop: "1px solid var(--gold-tint)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 160px), 1fr))",
            gap: 16,
          }}
        >
          <Stat num="50,000" unit="+" label={lang === "ko" ? "누적 케이스" : "Cumulative cases"} onDark />
          <Stat num={String(new Date().getFullYear() - H.foundedYear)} unit={lang === "ko" ? "년" : "yrs"} label={lang === "ko" ? "운영 기간" : "Operating"} onDark />
          <Stat num={String(H.branches.length)} unit="" label={lang === "ko" ? "지점" : "Branches"} onDark />
          <Stat num="7" unit="" label={lang === "ko" ? "전담 의료진" : "Physicians"} onDark />
          <Stat num="24/7" unit="" label={lang === "ko" ? "힐링 공간" : "Healing space"} onDark />
        </div>
      </section>

      {/* ITCR 5원칙 */}
      <section style={{ padding: "96px 24px", background: "var(--cream-0)" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <div style={{ maxWidth: 720, marginBottom: 48 }}>
            <Eyebrow>{lang === "ko" ? "치료 철학" : "Care philosophy"}</Eyebrow>
            <h2
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 400,
                fontSize: "clamp(32px, 4.5vw, 56px)",
                lineHeight: 1.1,
                margin: "20px 0 16px",
              }}
            >
              ITCR —{" "}
              <span style={{ fontStyle: "italic", color: "var(--gold-2)" }}>
                {lang === "ko" ? "다섯 가지 원칙." : "five principles."}
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
                ? "Immune Hospital은 모든 암 회복 프로그램을 이 다섯 가지 원칙 위에 구성합니다. 개별 치료가 아닌, 서로 맞물려 작동하는 하나의 체계."
                : "Every Immune Hospital recovery program is built on these five principles — not separate treatments, but an integrated system."}
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
              gap: 0,
              borderTop: "1px solid var(--gold-tint)",
              borderLeft: "1px solid var(--cream-2)",
            }}
          >
            {H.principles.map((p) => (
              <div
                key={p.id}
                style={{
                  padding: "32px 28px",
                  borderRight: "1px solid var(--cream-2)",
                  borderBottom: "1px solid var(--cream-2)",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 64,
                    fontWeight: 400,
                    color: "var(--gold-0)",
                    lineHeight: 1,
                    marginBottom: 16,
                    fontStyle: "italic",
                  }}
                >
                  {p.letter}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 10,
                    letterSpacing: "0.24em",
                    textTransform: "uppercase",
                    color: "var(--gold-2)",
                    marginBottom: 8,
                    fontWeight: 600,
                  }}
                >
                  {l(p.name)}
                </div>
                <p
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 15,
                    lineHeight: 1.55,
                    color: "var(--fg-on-light-1)",
                    margin: 0,
                  }}
                >
                  {l(p.description)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 암종별 프로그램 */}
      <section
        style={{
          padding: "96px 24px",
          background: "var(--paper)",
          borderTop: "1px solid var(--cream-2)",
        }}
      >
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <Eyebrow>{lang === "ko" ? "암종별 프로그램" : "Cancer-specific programs"}</Eyebrow>
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(32px, 4.5vw, 56px)",
              lineHeight: 1.1,
              margin: "20px 0 56px",
              maxWidth: 760,
            }}
          >
            {lang === "ko"
              ? "같은 원칙, 암종별로 다른 맞춤."
              : "Same principles, tailored for each cancer."}
          </h2>

          <div style={{ borderTop: "1px solid var(--gold-tint)" }}>
            {H.cancerPrograms.map((cp, i) => (
              <div
                key={cp.id}
                className="healo-ih-cancer-row"
                style={{
                  display: "grid",
                  gridTemplateColumns: "80px 3fr 6fr",
                  gap: 32,
                  padding: "28px 0",
                  borderBottom: "1px solid var(--cream-2)",
                  alignItems: "start",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.2em",
                    color: "var(--gold-2)",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 24,
                    fontWeight: 500,
                    color: "var(--fg-on-light-1)",
                    margin: 0,
                    lineHeight: 1.2,
                  }}
                >
                  {l(cp.name)}
                </h3>
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 15,
                    lineHeight: 1.7,
                    color: "var(--fg-on-light-2)",
                    margin: 0,
                  }}
                >
                  {l(cp.focus)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 치료법 상세 */}
      <section style={{ padding: "96px 24px", background: "var(--cream-0)" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <Eyebrow>{lang === "ko" ? "구체적 치료법" : "Treatment methods"}</Eyebrow>
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(32px, 4.5vw, 48px)",
              lineHeight: 1.1,
              margin: "20px 0 56px",
              maxWidth: 720,
            }}
          >
            {lang === "ko"
              ? "실제로 사용하는 치료 목록."
              : "What we actually use."}
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
              gap: 32,
            }}
          >
            {Object.entries(H.treatments).map(([key, t]) => (
              <div
                key={key}
                style={{
                  borderTop: "1px solid var(--gold-tint)",
                  paddingTop: 24,
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 10,
                    letterSpacing: "0.24em",
                    textTransform: "uppercase",
                    color: "var(--gold-2)",
                    fontWeight: 600,
                    marginBottom: 16,
                  }}
                >
                  {l(t.category)}
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {t.items.map((item, i) => (
                    <li
                      key={i}
                      style={{
                        padding: "10px 0",
                        borderBottom: i < t.items.length - 1 ? "1px solid var(--cream-2)" : "none",
                        fontFamily: "var(--font-serif)",
                        fontSize: 16,
                        color: "var(--fg-on-light-1)",
                        lineHeight: 1.45,
                      }}
                    >
                      {l(item)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p
            style={{
              marginTop: 48,
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: 13,
              color: "var(--fg-on-light-3)",
              maxWidth: 720,
              lineHeight: 1.6,
            }}
          >
            ※ {l(H.evidenceNote)}
          </p>
        </div>
      </section>

      {/* 심신통합 프로그램 사진 갤러리 */}
      <section
        style={{
          padding: "96px 24px",
          background: "var(--ink-0)",
          color: "var(--fg-on-dark-1)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <FilmGrain />
        <div style={{ position: "relative", maxWidth: 1240, margin: "0 auto" }}>
          <div style={{ maxWidth: 720, marginBottom: 48 }}>
            <Eyebrow>{lang === "ko" ? "심신통합 프로그램" : "Mind-body programs"}</Eyebrow>
            <h2
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 400,
                fontSize: "clamp(32px, 4.5vw, 48px)",
                lineHeight: 1.1,
                margin: "20px 0 0",
              }}
            >
              {lang === "ko"
                ? "병상 밖의 치료."
                : "Treatment beyond the bed."}
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
              gap: 24,
            }}
          >
            {[
              { img: IMMUNE_PHOTOS.programFoodTherapy, prog: H.integrativePrograms[0] },
              { img: IMMUNE_PHOTOS.programWalking, prog: H.integrativePrograms[1] },
              { img: IMMUNE_PHOTOS.programExercise, prog: H.integrativePrograms[2] },
              { img: IMMUNE_PHOTOS.programPicnic, prog: H.integrativePrograms[3] },
              { img: IMMUNE_PHOTOS.programClass, prog: H.integrativePrograms[4] },
            ].map((it, i) => (
              <article key={i}>
                <div style={{ aspectRatio: "4 / 5", overflow: "hidden", marginBottom: 12 }}>
                  <img
                    src={it.img}
                    alt={l(it.prog.label)}
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
                    fontFamily: "var(--font-serif)",
                    fontSize: 18,
                    fontWeight: 500,
                    color: "var(--fg-on-dark-1)",
                    marginBottom: 4,
                  }}
                >
                  {l(it.prog.label)}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    lineHeight: 1.6,
                    color: "var(--fg-on-dark-3)",
                  }}
                >
                  {l(it.prog.desc)}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 의료진 */}
      <section style={{ padding: "96px 24px", background: "var(--cream-0)" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <Eyebrow>{lang === "ko" ? "의료진" : "Medical team"}</Eyebrow>
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(32px, 4.5vw, 48px)",
              lineHeight: 1.1,
              margin: "20px 0 48px",
            }}
          >
            {lang === "ko"
              ? "한방 · 양방 · 영양 협진."
              : "Korean Medicine · Western · Nutrition."}
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
              gap: 24,
            }}
          >
            {H.doctors.map((d, i) => (
              <article key={i}>
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "3 / 4",
                    overflow: "hidden",
                    marginBottom: 12,
                    background: "var(--paper)",
                  }}
                >
                  <img
                    src={d.photo}
                    alt={l(d.name)}
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
                    fontFamily: "var(--font-sans)",
                    fontSize: 10,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "var(--gold-2)",
                    marginBottom: 4,
                  }}
                >
                  {l(d.role)}
                </div>
                <h3
                  translate="no"
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 18,
                    fontWeight: 500,
                    color: "var(--fg-on-light-1)",
                    margin: "0 0 6px",
                  }}
                >
                  {l(d.name)}
                </h3>
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    color: "var(--fg-on-light-3)",
                    lineHeight: 1.5,
                    margin: 0,
                  }}
                >
                  {l(d.specialty)}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 시설 갤러리 */}
      <section style={{ padding: "96px 24px", background: "var(--paper)" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <Eyebrow>{lang === "ko" ? "시설" : "Facilities"}</Eyebrow>
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(32px, 4.5vw, 48px)",
              lineHeight: 1.1,
              margin: "20px 0 48px",
            }}
          >
            {lang === "ko" ? "프라이빗한 회복의 공간." : "Private spaces for recovery."}
          </h2>

          {H.facilities.map((f) => (
            <div key={f.id} style={{ marginBottom: 56 }}>
              <div style={{ marginBottom: 20 }}>
                <h3
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 24,
                    fontWeight: 500,
                    color: "var(--fg-on-light-1)",
                    margin: "0 0 6px",
                  }}
                >
                  {l(f.name)}
                </h3>
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 14,
                    lineHeight: 1.7,
                    color: "var(--fg-on-light-3)",
                    margin: 0,
                    maxWidth: 720,
                  }}
                >
                  {l(f.description)}
                </p>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
                  gap: 12,
                }}
              >
                {f.images.map((img, i) => (
                  <div key={i} style={{ aspectRatio: "4 / 3", overflow: "hidden" }}>
                    <img
                      src={img}
                      alt={l(f.name)}
                      loading="lazy"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        filter: IMMUNE_PHOTO_FILTER,
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 지점 & 오시는 길 */}
      <section style={{ padding: "96px 24px", background: "var(--cream-0)" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <Eyebrow>{lang === "ko" ? "지점 & 오시는 길" : "Branches & directions"}</Eyebrow>
          <div
            style={{
              marginTop: 32,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
              gap: 32,
            }}
          >
            {H.branches.map((b) => (
              <div
                key={b.id}
                style={{
                  padding: "28px 24px",
                  border: "1px solid var(--cream-2)",
                  background: "var(--paper)",
                }}
              >
                <Eyebrow tone="muted">Branch · {b.id}</Eyebrow>
                <h3
                  translate="no"
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 22,
                    fontWeight: 500,
                    color: "var(--fg-on-light-1)",
                    margin: "8px 0 16px",
                  }}
                >
                  {l(b.name)}
                </h3>
                {b.address && (
                  <p
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      lineHeight: 1.65,
                      color: "var(--fg-on-light-2)",
                      marginBottom: 16,
                    }}
                  >
                    {l(b.address)}
                  </p>
                )}
                {b.phone && (
                  <div style={{ marginBottom: 8 }}>
                    <a
                      href={`tel:${b.phone.replace(/[^\d+]/g, "")}`}
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: 18,
                        color: "var(--gold-2)",
                        textDecoration: "none",
                      }}
                    >
                      ☎ {b.phone}
                    </a>
                  </div>
                )}
                {b.hours && (
                  <div
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 12,
                      lineHeight: 1.7,
                      color: "var(--fg-on-light-3)",
                      marginBottom: 12,
                    }}
                  >
                    <div>{l(b.hours.weekday)}</div>
                    <div>{l(b.hours.weekend)}</div>
                  </div>
                )}
                {b.parking && (
                  <p
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontStyle: "italic",
                      fontSize: 12,
                      color: "var(--fg-on-light-3)",
                      lineHeight: 1.55,
                      marginBottom: 8,
                    }}
                  >
                    ⓟ {l(b.parking)}
                  </p>
                )}
                {b.nearby && (
                  <p
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontStyle: "italic",
                      fontSize: 12,
                      color: "var(--gold-2)",
                      lineHeight: 1.55,
                    }}
                  >
                    · {l(b.nearby)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        style={{
          padding: "96px 24px",
          background: "var(--ink-0)",
          color: "var(--fg-on-dark-1)",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <FilmGrain />
        <div style={{ position: "relative", maxWidth: 640, margin: "0 auto" }}>
          <Eyebrow>Begin</Eyebrow>
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontStyle: "italic",
              fontSize: "clamp(32px, 4.5vw, 56px)",
              lineHeight: 1.15,
              margin: "24px 0 16px",
              color: "var(--gold-0)",
            }}
          >
            {lang === "ko"
              ? "Immune Hospital에서 시작하세요."
              : "Start with Immune Hospital."}
          </h2>
          <Rule width={64} tone="gold" style={{ margin: "24px auto" }} />
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 16,
              lineHeight: 1.75,
              color: "var(--fg-on-dark-2)",
              margin: "24px 0 40px",
            }}
          >
            {lang === "ko"
              ? "HEALO 코디네이터가 영업일 기준 하루 안에 선호 언어로 회신드립니다."
              : "HEALO coordinator responds in your language within one business day."}
          </p>
          <Link href="/intake" style={{ textDecoration: "none" }}>
            <ButtonGold>
              {lang === "ko" ? "상담 신청" : "Request consultation"}
            </ButtonGold>
          </Link>
        </div>
      </section>

      <style jsx>{`
        @media (max-width: 900px) {
          :global(.healo-ih-hero) {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
          }
          :global(.healo-ih-cancer-row) {
            grid-template-columns: 48px 1fr !important;
            gap: 16px !important;
          }
          :global(.healo-ih-cancer-row > *:nth-child(3)) {
            grid-column: 1 / 3 !important;
            grid-row: 2 !important;
            margin-left: 64px;
          }
        }
      `}</style>
    </PageShell>
  );
}
