"use client";

export default function Error({ error, reset }) {
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
            color: "#8c3a2e",
            fontWeight: 700,
            margin: 0,
          }}
        >
          Error · 500
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
          500
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
          Something{" "}
          <span style={{ fontStyle: "italic", color: "var(--gold-0, #c8a96a)" }}>slipped.</span>
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
            margin: "0 auto 32px",
            maxWidth: 440,
          }}
        >
          An unexpected error occurred while preparing this page. Your data is safe —
          please try again, and if the issue persists, contact your coordinator.
        </p>

        {process.env.NODE_ENV === "development" && error?.message && (
          <pre
            style={{
              textAlign: "left",
              background: "#1a1a1a",
              border: "1px solid #3d3d3d",
              padding: 16,
              fontSize: 11,
              color: "#8c3a2e",
              overflow: "auto",
              marginBottom: 32,
              fontFamily: "'SF Mono', 'JetBrains Mono', monospace",
              maxHeight: 200,
            }}
          >
            {error.message}
          </pre>
        )}

        <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>
          <button
            onClick={() => reset()}
            style={{
              background: "var(--gold-0, #c8a96a)",
              color: "var(--ink-0, #0a0a0a)",
              padding: "14px 26px",
              border: 0,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              cursor: "pointer",
              fontFamily: "'Inter', system-ui, sans-serif",
              minHeight: 44,
            }}
          >
            Try again
          </button>
          <a
            href="/"
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
            Return home →
          </a>
        </div>
      </div>
    </main>
  );
}
