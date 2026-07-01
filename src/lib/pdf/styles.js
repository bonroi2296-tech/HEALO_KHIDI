/**
 * healwith PDF Styles — Legacy 톤 (DESIGN.md 준수)
 *
 * 규칙: serif(Playfair) 금지 · cream/ink/gold 금지 · 브랜드색 teal-600 · 회색/흰색.
 * 폰트는 내장 Helvetica만 사용(외부 웹폰트 다운로드 없음 → 오프라인·프록시 404 안전).
 * ※ 스타일 키 이름은 하위 컴포넌트 호환 위해 유지하되, 값만 Legacy 톤으로 정의.
 */

import { StyleSheet } from "@react-pdf/renderer";

const SANS = "Helvetica";

// Legacy 팔레트 (DESIGN.md 토큰: teal-600 / gray / white). 키는 보존, 값만 교체.
export const COLORS = {
  ink0: "#111827", // gray-900
  ink1: "#111827",
  ink3: "#374151", // gray-700
  ink4: "#4b5563", // gray-600
  cream0: "#f9fafb", // gray-50 (subtle bg)
  cream2: "#e5e7eb", // gray-200 (border)
  paper: "#ffffff",
  white: "#ffffff",
  gold0: "#0d9488", // → teal-600 (accent 대체)
  gold2: "#0f766e", // → teal-700
  goldTint: "#e5e7eb", // → gray-200 (rule)
  fgOnLight1: "#111827", // gray-900
  fgOnLight2: "#374151", // gray-700
  fgOnLight3: "#6b7280", // gray-500
  fgOnLight4: "#9ca3af", // gray-400
  teal: "#0d9488",
};

export const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: SANS,
    fontSize: 10,
    color: COLORS.fgOnLight1,
    backgroundColor: COLORS.white,
  },

  // Header
  brandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
    paddingBottom: 14,
    borderBottom: `1 solid ${COLORS.cream2}`,
  },
  wordmark: {
    fontFamily: SANS,
    fontSize: 18,
    fontWeight: 700,
    color: COLORS.teal,
  },
  docMeta: {
    fontFamily: SANS,
    fontSize: 9,
    color: COLORS.fgOnLight3,
    textAlign: "right",
  },

  // Titles
  eyebrow: {
    fontFamily: SANS,
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: COLORS.fgOnLight3,
    marginBottom: 6,
  },
  title: {
    fontFamily: SANS,
    fontSize: 24,
    fontWeight: 700,
    color: COLORS.ink0,
    marginBottom: 4,
    lineHeight: 1.2,
  },
  // (구 premium: italic gold) → Legacy: 동일 산세리프 볼드, teal 강조. italic 제거.
  titleItalic: {
    fontFamily: SANS,
    fontSize: 24,
    fontWeight: 700,
    color: COLORS.teal,
  },
  subtitle: {
    fontFamily: SANS,
    fontSize: 10,
    color: COLORS.fgOnLight3,
    marginBottom: 22,
  },

  // Section labels
  sectionLabel: {
    fontFamily: SANS,
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: COLORS.fgOnLight3,
    marginBottom: 10,
    marginTop: 20,
  },
  sectionTitle: {
    fontFamily: SANS,
    fontSize: 15,
    fontWeight: 700,
    color: COLORS.ink0,
    marginBottom: 8,
  },
  rule: {
    borderBottom: `1 solid ${COLORS.cream2}`,
    marginTop: 10,
    marginBottom: 16,
  },
  hairline: {
    borderBottom: `0.5 solid ${COLORS.cream2}`,
    marginVertical: 8,
  },

  // Body
  body: {
    fontFamily: SANS,
    fontSize: 10,
    lineHeight: 1.6,
    color: COLORS.fgOnLight2,
  },
  bodyBold: {
    fontFamily: SANS,
    fontSize: 10,
    fontWeight: 700,
    color: COLORS.ink0,
  },
  small: {
    fontFamily: SANS,
    fontSize: 8,
    lineHeight: 1.55,
    color: COLORS.fgOnLight3,
  },

  // Data grids
  dataRow: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottom: `0.5 solid ${COLORS.cream2}`,
  },
  dataLabel: {
    width: "40%",
    fontFamily: SANS,
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: COLORS.fgOnLight3,
    paddingRight: 12,
  },
  dataValue: {
    width: "60%",
    fontFamily: SANS,
    fontSize: 11,
    color: COLORS.ink0,
  },

  // Signature
  signatureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 48,
    paddingTop: 24,
  },
  signatureBlock: {
    width: "45%",
  },
  signatureLine: {
    borderBottom: `1 solid ${COLORS.ink4}`,
    height: 40,
    marginBottom: 6,
  },
  signatureLabel: {
    fontFamily: SANS,
    fontSize: 8,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: COLORS.fgOnLight3,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    fontFamily: SANS,
    fontSize: 7,
    color: COLORS.fgOnLight4,
    lineHeight: 1.5,
    borderTop: `0.5 solid ${COLORS.cream2}`,
    paddingTop: 10,
  },

  // Checkbox for consent forms
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginVertical: 10,
    gap: 8,
  },
  checkbox: {
    width: 10,
    height: 10,
    borderWidth: 1,
    borderColor: COLORS.ink4,
    marginTop: 2,
    marginRight: 8,
  },

  // Cost table
  costTable: {
    borderTop: `1 solid ${COLORS.cream2}`,
    marginTop: 12,
  },
  costRow: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottom: `0.5 solid ${COLORS.cream2}`,
  },
  costRowFinal: {
    flexDirection: "row",
    paddingVertical: 10,
    borderTop: `1 solid ${COLORS.teal}`,
    borderBottom: `1 solid ${COLORS.teal}`,
    marginTop: 6,
  },
  costDesc: {
    flex: 3,
    fontFamily: SANS,
    fontSize: 10,
    color: COLORS.ink0,
  },
  costNote: {
    flex: 2,
    fontFamily: SANS,
    fontSize: 8,
    color: COLORS.fgOnLight3,
  },
  costAmount: {
    flex: 2,
    fontFamily: SANS,
    fontSize: 11,
    color: COLORS.ink0,
    textAlign: "right",
  },
  costTotal: {
    fontFamily: SANS,
    fontSize: 14,
    fontWeight: 700,
    color: COLORS.teal,
  },
});
