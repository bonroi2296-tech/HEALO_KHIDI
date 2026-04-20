"use client";

import Link from "next/link";
import { Eyebrow, Rule } from "./Primitives";

export default function Footer() {
  return (
    <footer
      style={{
        background: "var(--ink-0)",
        color: "var(--fg-on-dark-2)",
        padding: "80px 24px 48px",
        borderTop: "1px solid var(--gold-tint)",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 48,
            marginBottom: 56,
          }}
        >
          {/* Brand */}
          <div>
            <div
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 500,
                fontSize: 28,
                letterSpacing: "0.04em",
                color: "var(--fg-on-dark-1)",
                marginBottom: 16,
              }}
            >
              HEALO
            </div>
            <Rule width={48} tone="gold" />
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                lineHeight: 1.7,
                color: "var(--fg-on-dark-3)",
                marginTop: 20,
                maxWidth: 300,
              }}
            >
              Medical concierge for international patients seeking treatment in Korea.
            </p>
          </div>

          {/* Services */}
          <div>
            <Eyebrow>Services</Eyebrow>
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { href: "/treatments", label: "Treatments" },
                { href: "/hospitals", label: "Hospitals" },
                { href: "/education", label: "Patient Guides" },
                { href: "/intake", label: "Request Consultation" },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    color: "var(--fg-on-dark-2)",
                    textDecoration: "none",
                  }}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Legal */}
          <div>
            <Eyebrow>Legal</Eyebrow>
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { href: "/privacy", label: "Privacy Policy" },
                { href: "/terms", label: "Terms of Service" },
                { href: "/medical-disclaimer", label: "Medical Disclaimer" },
                { href: "/cookies", label: "Cookie Policy" },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    color: "var(--fg-on-dark-2)",
                    textDecoration: "none",
                  }}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <Eyebrow>Contact</Eyebrow>
            <div
              style={{
                marginTop: 16,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                color: "var(--fg-on-dark-2)",
                lineHeight: 1.7,
              }}
            >
              <a href="mailto:roiimmunelab@immunelab.co.kr" style={{ color: "inherit", textDecoration: "none" }}>
                roiimmunelab@immunelab.co.kr
              </a>
              <a href="tel:+821047721075" style={{ color: "inherit", textDecoration: "none" }}>
                +82 10 4772 1075
              </a>
              <span style={{ fontSize: 12, color: "var(--fg-on-dark-3)" }}>
                Mon-Fri 09:00-18:00 KST
              </span>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            borderTop: "1px solid var(--gold-tint)",
            paddingTop: 24,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: 16,
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            color: "var(--fg-on-dark-4)",
            letterSpacing: "0.05em",
          }}
        >
          <div>
            © 2026 BONROI · Business Reg. 463-35-00902
          </div>
          <div style={{ textAlign: "right" }}>
            International Patient Facilitator · A-2026-01-02-06761
          </div>
        </div>
      </div>
    </footer>
  );
}
