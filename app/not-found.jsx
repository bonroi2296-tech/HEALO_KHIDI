import Link from "next/link";

export const metadata = { title: "Page Not Found | HEALO" };

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--ink-0, #0a0a0a)",
        color: "var(--fg-on-dark-1, #f5f0e8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "64px 24px",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.04,
          mixBlendMode: "overlay",
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='a'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23a)'/%3E%3C/svg%3E\")",
        }}
      />
      <div style={{ position: "relative", maxWidth: 560, textAlign: "center" }}>
        <p
          style={{
            fontSize: 10,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "var(--gold-0, #c8a96a)",
            fontWeight: 600,
            margin: 0,
          }}
        >
          Error · 404
        </p>
        <div
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: "clamp(120px, 22vw, 256px)",
            lineHeight: 1,
            color: "var(--gold-0, #c8a96a)",
            fontWeight: 400,
            fontStyle: "italic",
            margin: "16px 0",
            letterSpacing: "-0.05em",
          }}
        >
          404
        </div>
        <h1
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: "clamp(28px, 4vw, 44px)",
            fontWeight: 400,
            lineHeight: 1.15,
            margin: "0 0 16px",
          }}
        >
          This page has{" "}
          <span style={{ fontStyle: "italic", color: "var(--gold-0, #c8a96a)" }}>wandered off.</span>
        </h1>
        <hr
          style={{
            border: 0,
            height: 1,
            width: 64,
            background: "var(--gold-0, #c8a96a)",
            margin: "24px auto",
          }}
        />
        <p
          style={{
            fontSize: 15,
            lineHeight: 1.7,
            color: "var(--fg-on-dark-2, #c7c2b8)",
            margin: "0 auto 40px",
            maxWidth: 440,
          }}
        >
          The page you're looking for doesn't exist — or has moved to a quieter place.
          Let's find you something that's still there.
        </p>
        <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>
          <Link
            href="/"
            style={{
              background: "var(--gold-0, #c8a96a)",
              color: "var(--ink-0, #0a0a0a)",
              padding: "14px 26px",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              textDecoration: "none",
            }}
          >
            Return home
          </Link>
          <Link
            href="/intake"
            style={{
              color: "var(--fg-on-dark-2, #c7c2b8)",
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              textDecoration: "none",
              borderBottom: "1px solid var(--ink-4, #3d3d3d)",
              paddingBottom: 2,
            }}
          >
            Request consultation →
          </Link>
        </div>
      </div>
    </main>
  );
}
