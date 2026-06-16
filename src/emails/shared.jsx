/**
 * healwith Email — 공통 레이아웃 + 브랜드 헤더/푸터
 * React Email 컴포넌트 사용. HTML 렌더 시 Gmail/Outlook 호환.
 */

import React from "react";
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Row,
  Column,
  Text,
  Link as EmailLink,
  Hr,
  Preview,
  Font,
} from "@react-email/components";

export const BRAND = {
  name: "healwith",
  entity: "BONROI",
  rep: "JUYOUNG KANG",
  bizReg: "463-35-00902",
  facilitatorReg: "A-2026-01-02-06761",
  email: "roiimmunelab@immunelab.co.kr",
  phone: "+82 10 4772 1075",
  address: "Room 613, 385 Gangseo-ro, Gangseo-gu, Seoul, Republic of Korea",
  website: "https://healo-khidi.vercel.app",
};

export const COLORS = {
  ink: "#0a0a0a",
  ink3: "#2a2a2a",
  cream: "#f5f0e8",
  paper: "#fbf8f2",
  gold: "#c8a96a",
  goldDark: "#b89550",
  textMuted: "#6b6458",
  textFaint: "#9a9284",
  border: "#e3dbcc",
  goldTint: "#e8d9b4",
};

export function healwithEmail({ preview, children }) {
  return (
    <Html>
      <Head>
        <Font
          fontFamily="Playfair Display"
          fallbackFontFamily="Georgia"
          webFont={{
            url: "https://fonts.gstatic.com/s/playfairdisplay/v37/nuFiD-vYSZviVYUb_rj3ij__anPXBYf9pW8wTIfHKHF.ttf",
            format: "truetype",
          }}
          fontWeight={400}
          fontStyle="normal"
        />
        <Font
          fontFamily="Inter"
          fallbackFontFamily="Arial"
          webFont={{
            url: "https://fonts.gstatic.com/s/inter/v19/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.ttf",
            format: "truetype",
          }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: COLORS.cream,
          margin: 0,
          padding: "32px 16px",
          fontFamily: "'Inter', Arial, sans-serif",
          color: COLORS.ink,
        }}
      >
        <Container
          style={{
            maxWidth: 600,
            margin: "0 auto",
            backgroundColor: COLORS.paper,
            border: `1px solid ${COLORS.border}`,
          }}
        >
          {/* Brand header */}
          <Section style={{ padding: "28px 32px 0" }}>
            <Text
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 22,
                fontWeight: 500,
                color: COLORS.ink,
                letterSpacing: 1,
                margin: 0,
              }}
            >
              {BRAND.name}
            </Text>
            <Text
              style={{
                fontFamily: "'Inter', Arial, sans-serif",
                fontSize: 10,
                color: COLORS.goldDark,
                letterSpacing: 2,
                textTransform: "uppercase",
                margin: "4px 0 0",
              }}
            >
              Medical Concierge · Korea
            </Text>
            <Hr style={{ borderTop: `1px solid ${COLORS.goldTint}`, margin: "20px 0 0" }} />
          </Section>

          {/* Content */}
          <Section style={{ padding: "32px" }}>{children}</Section>

          {/* Footer */}
          <Section
            style={{
              padding: "24px 32px",
              backgroundColor: COLORS.ink,
              color: COLORS.textFaint,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                lineHeight: 1.7,
                color: COLORS.textFaint,
                margin: 0,
              }}
            >
              {BRAND.entity} · Sole Proprietorship · Rep. {BRAND.rep}
              <br />
              Business Reg. {BRAND.bizReg} · Facilitator {BRAND.facilitatorReg}
              <br />
              {BRAND.address}
              <br />
              <EmailLink
                href={`mailto:${BRAND.email}`}
                style={{ color: COLORS.gold, textDecoration: "none" }}
              >
                {BRAND.email}
              </EmailLink>{" "}
              ·{" "}
              <EmailLink
                href={`tel:${BRAND.phone.replace(/\s/g, "")}`}
                style={{ color: COLORS.gold, textDecoration: "none" }}
              >
                {BRAND.phone}
              </EmailLink>
            </Text>
            <Hr style={{ borderTop: `1px solid ${COLORS.ink3}`, margin: "16px 0 12px" }} />
            <Text style={{ fontSize: 9, color: COLORS.textFaint, margin: 0, letterSpacing: 0.5 }}>
              This email was sent in response to your inquiry or an ongoing consultation.
              If this was unexpected, please contact us directly.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function Eyebrow({ children }) {
  return (
    <Text
      style={{
        fontFamily: "'Inter', Arial, sans-serif",
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: 2.4,
        textTransform: "uppercase",
        color: COLORS.goldDark,
        margin: "0 0 12px",
      }}
    >
      {children}
    </Text>
  );
}

export function Title({ children, italic }) {
  return (
    <Text
      style={{
        fontFamily: "'Playfair Display', Georgia, serif",
        fontSize: 32,
        fontWeight: 400,
        color: COLORS.ink,
        lineHeight: 1.1,
        margin: "0 0 16px",
        fontStyle: italic ? "italic" : "normal",
      }}
    >
      {children}
    </Text>
  );
}

export function Rule({ width = 48 }) {
  return (
    <Hr
      style={{
        borderTop: `1px solid ${COLORS.gold}`,
        width,
        margin: "16px 0",
      }}
    />
  );
}

export function BodyText({ children }) {
  return (
    <Text
      style={{
        fontFamily: "'Inter', Arial, sans-serif",
        fontSize: 15,
        lineHeight: 1.7,
        color: COLORS.ink3,
        margin: "0 0 16px",
      }}
    >
      {children}
    </Text>
  );
}

export function CTA({ href, children }) {
  return (
    <table cellPadding="0" cellSpacing="0" border="0" style={{ margin: "24px 0" }}>
      <tbody>
        <tr>
          <td
            style={{
              backgroundColor: COLORS.gold,
              padding: "14px 26px",
            }}
          >
            <EmailLink
              href={href}
              style={{
                color: COLORS.ink,
                fontFamily: "'Inter', Arial, sans-serif",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: 2.4,
                textTransform: "uppercase",
                textDecoration: "none",
              }}
            >
              {children}
            </EmailLink>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export function BilingualSplit({ ko, en }) {
  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <Eyebrow>한국어</Eyebrow>
        {ko}
      </div>
      <Hr style={{ borderTop: `1px dashed ${COLORS.border}`, margin: "24px 0" }} />
      <div>
        <Eyebrow>English</Eyebrow>
        {en}
      </div>
    </>
  );
}
