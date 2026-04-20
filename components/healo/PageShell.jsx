"use client";

import Nav from "./Nav";
import Footer from "./Footer";

/**
 * PageShell — Premium 디자인 공통 wrapper
 *
 * 아직 전면 재디자인 안 된 페이지에 Premium Nav + Footer 씌우기 용도.
 * 본문(children)은 크림 배경 위에 기존 콘텐츠 렌더.
 *
 * 사용 예:
 *   export default function Page() {
 *     return <PageShell current="about"><OldClient /></PageShell>;
 *   }
 *
 * 본문도 Premium 톤으로 바꾸려면 heroEyebrow, heroTitle, heroLede 전달.
 */

import { Eyebrow, Rule } from "./Primitives";

export default function PageShell({
  children,
  current,
  heroEyebrow,
  heroTitle,
  heroTitleItalic,
  heroLede,
  dark = false,
  noHero = false,
  containerMax = 1240,
}) {
  return (
    <div style={{ background: "var(--cream-0)", minHeight: "100vh" }}>
      <Nav current={current} />

      {!noHero && heroTitle && (
        <section
          style={{
            background: dark ? "var(--ink-0)" : "var(--paper)",
            color: dark ? "var(--fg-on-dark-1)" : "var(--fg-on-light-1)",
            padding: "96px 24px 72px",
          }}
        >
          <div style={{ maxWidth: containerMax, margin: "0 auto" }}>
            {heroEyebrow && <Eyebrow>{heroEyebrow}</Eyebrow>}
            <h1
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 400,
                fontSize: "clamp(44px, 6vw, 88px)",
                lineHeight: 1.05,
                letterSpacing: "-0.015em",
                margin: "24px 0 32px",
                maxWidth: 1000,
              }}
            >
              {heroTitle}
              {heroTitleItalic && (
                <>
                  <br />
                  <span
                    style={{
                      fontStyle: "italic",
                      color: dark ? "var(--gold-0)" : "var(--gold-2)",
                    }}
                  >
                    {heroTitleItalic}
                  </span>
                </>
              )}
            </h1>
            <Rule width={64} />
            {heroLede && (
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontWeight: 300,
                  fontSize: 17,
                  lineHeight: 1.75,
                  color: dark ? "var(--fg-on-dark-2)" : "var(--fg-on-light-2)",
                  marginTop: 24,
                  maxWidth: 680,
                }}
              >
                {heroLede}
              </p>
            )}
          </div>
        </section>
      )}

      <main style={{ background: "var(--cream-0)" }}>{children}</main>

      <Footer />
    </div>
  );
}
