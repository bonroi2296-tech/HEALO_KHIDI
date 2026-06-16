/**
 * healwith Design System · Primitives (ES Module version)
 * Direction: D. Premium (Concierge · Private-bank meets boutique hospital)
 *
 * 원본: design-system-export/ui_kits/web/Primitives.jsx
 * 변환: window 전역 attach → ES module exports, Next.js RSC 호환
 */

"use client";

export const Eyebrow = ({ children, tone = "gold", className = "", style = {} }) => {
  const color =
    tone === "muted"
      ? "var(--fg-on-light-3)"
      : tone === "muted-dark"
      ? "var(--fg-on-dark-3)"
      : "var(--gold-0)";
  return (
    <span
      className={className}
      style={{
        fontFamily: "var(--font-sans)",
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.24em",
        textTransform: "uppercase",
        color,
        ...style,
      }}
    >
      {children}
    </span>
  );
};

export const Rule = ({ width = 48, tone = "gold", style = {} }) => (
  <div
    style={{
      width,
      height: 1,
      margin: "16px 0",
      background:
        tone === "gold"
          ? "var(--gold-0)"
          : tone === "cream"
          ? "var(--cream-2)"
          : "rgba(200,169,106,0.4)",
      ...style,
    }}
  />
);

export const Hairline = ({ tone = "cream", style = {} }) => (
  <hr
    style={{
      border: 0,
      height: 1,
      margin: 0,
      background:
        tone === "gold" ? "rgba(200,169,106,0.3)" : "var(--cream-2)",
      ...style,
    }}
  />
);

export const ButtonGold = ({ children, onClick, type = "button", className = "", style = {} }) => (
  <button
    type={type}
    onClick={onClick}
    className={className}
    style={{
      background: "var(--gold-0)",
      color: "var(--ink-0)",
      border: 0,
      borderRadius: 2,
      padding: "14px 26px",
      cursor: "pointer",
      fontFamily: "var(--font-sans)",
      fontWeight: 600,
      fontSize: 11,
      letterSpacing: "0.24em",
      textTransform: "uppercase",
      transition: "background 150ms var(--ease-out)",
      ...style,
    }}
    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--gold-1)")}
    onMouseLeave={(e) => (e.currentTarget.style.background = "var(--gold-0)")}
  >
    {children}
  </button>
);

export const ButtonOutline = ({ children, onClick, onDark = false, type = "button", style = {} }) => (
  <button
    type={type}
    onClick={onClick}
    style={{
      background: "transparent",
      color: onDark ? "var(--fg-on-dark-1)" : "var(--ink-0)",
      border: `1px solid ${onDark ? "rgba(200,169,106,0.5)" : "var(--ink-0)"}`,
      borderRadius: 2,
      padding: "14px 26px",
      cursor: "pointer",
      fontFamily: "var(--font-sans)",
      fontWeight: 600,
      fontSize: 11,
      letterSpacing: "0.24em",
      textTransform: "uppercase",
      transition: "all 150ms var(--ease-out)",
      ...style,
    }}
  >
    {children}
  </button>
);

export const LinkArrow = ({ children, href, onClick, onDark = false }) => {
  const Tag = href ? "a" : "span";
  return (
    <Tag
      href={href}
      onClick={onClick}
      style={{
        fontFamily: "var(--font-sans)",
        fontWeight: 500,
        fontSize: 11,
        letterSpacing: "0.24em",
        textTransform: "uppercase",
        color: onDark ? "var(--fg-on-dark-2)" : "var(--fg-on-light-2)",
        borderBottom: `1px solid ${onDark ? "var(--ink-4)" : "var(--fg-on-light-4)"}`,
        paddingBottom: 2,
        cursor: "pointer",
        textDecoration: "none",
        display: "inline-block",
      }}
    >
      {children}
    </Tag>
  );
};

export const Chip = ({ children, tone = "cream" }) => {
  const styles = {
    gold: { bg: "var(--gold-wash)", fg: "var(--gold-2)", bd: "var(--gold-tint)" },
    ink: { bg: "var(--ink-0)", fg: "var(--gold-0)", bd: "transparent" },
    cream: { bg: "var(--paper)", fg: "var(--fg-on-light-2)", bd: "var(--cream-2)" },
    success: { bg: "rgba(90,122,74,0.10)", fg: "#5a7a4a", bd: "rgba(90,122,74,0.30)" },
    warn: { bg: "rgba(184,133,52,0.10)", fg: "#b88534", bd: "rgba(184,133,52,0.30)" },
  };
  const s = styles[tone] || styles.cream;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        borderRadius: 999,
        background: s.bg,
        color: s.fg,
        border: `1px solid ${s.bd}`,
        fontFamily: "var(--font-sans)",
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </span>
  );
};

export const Stat = ({ num, unit, label, onDark = false }) => (
  <div style={{ padding: "8px 0" }}>
    <div
      style={{
        fontFamily: "var(--font-serif)",
        fontSize: 44,
        fontWeight: 400,
        lineHeight: 1,
        color: onDark ? "var(--fg-on-dark-1)" : "var(--fg-on-light-1)",
        marginBottom: 10,
      }}
    >
      {num}
      {unit && (
        <span
          style={{
            fontSize: 22,
            marginLeft: 4,
            color: onDark ? "var(--fg-on-dark-3)" : "var(--gold-0)",
          }}
        >
          {unit}
        </span>
      )}
    </div>
    <div
      style={{
        fontFamily: "var(--font-sans)",
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: "0.24em",
        textTransform: "uppercase",
        color: onDark ? "var(--fg-on-dark-3)" : "var(--fg-on-light-3)",
      }}
    >
      {label}
    </div>
  </div>
);

export const FilmGrain = () => (
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
);

/**
 * InputUnderline — 인테이크 폼용 밑줄만 있는 input
 */
export const InputUnderline = ({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = false,
  name,
  id,
  style = {},
}) => (
  <label style={{ display: "block", marginBottom: 28, ...style }}>
    {label && (
      <span
        style={{
          display: "block",
          fontFamily: "var(--font-sans)",
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          color: "var(--fg-on-light-3)",
          marginBottom: 8,
        }}
      >
        {label}
        {required && <span style={{ color: "var(--gold-0)", marginLeft: 4 }}>*</span>}
      </span>
    )}
    <input
      id={id}
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      style={{
        width: "100%",
        border: 0,
        borderBottom: "1px solid var(--fg-on-light-4)",
        padding: "10px 0",
        fontFamily: "var(--font-serif)",
        fontSize: 20,
        fontWeight: 400,
        background: "transparent",
        color: "var(--fg-on-light-1)",
        outline: "none",
        transition: "border-color 150ms var(--ease-out)",
      }}
      onFocus={(e) => (e.currentTarget.style.borderBottomColor = "var(--gold-0)")}
      onBlur={(e) => (e.currentTarget.style.borderBottomColor = "var(--fg-on-light-4)")}
    />
  </label>
);

/**
 * Section — 공통 섹션 래퍼 (다크/라이트 톤)
 */
export const Section = ({ children, tone = "cream", grain = false, style = {}, className = "", id }) => (
  <section
    id={id}
    className={className}
    style={{
      position: "relative",
      background:
        tone === "dark"
          ? "var(--ink-0)"
          : tone === "paper"
          ? "var(--paper)"
          : "var(--cream-0)",
      color:
        tone === "dark" ? "var(--fg-on-dark-1)" : "var(--fg-on-light-1)",
      padding: "96px 24px",
      ...style,
    }}
  >
    {grain && tone === "dark" && <FilmGrain />}
    <div style={{ position: "relative", maxWidth: 1280, margin: "0 auto" }}>
      {children}
    </div>
  </section>
);
