/**
 * healwith PDF Styles — D.Premium 톤 React PDF용
 * 색상/타이포그래피는 design system과 매칭
 */

import { StyleSheet, Font } from "@react-pdf/renderer";

// Google Fonts 등록 (PDF 빌드 시 다운로드)
Font.register({
  family: "Playfair",
  fonts: [
    { src: "https://fonts.gstatic.com/s/playfairdisplay/v37/nuFiD-vYSZviVYUb_rj3ij__anPXBYf9pW8wTIfHKHF.ttf", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/playfairdisplay/v37/nuFiD-vYSZviVYUb_rj3ij__anPXBYf9pW8wTIfHKHM.ttf", fontWeight: 500 },
    { src: "https://fonts.gstatic.com/s/playfairdisplay/v37/nuFiD-vYSZviVYUb_rj3ij__anPXBYf9pW8wTIfHKHZ.ttf", fontWeight: 700 },
    { src: "https://fonts.gstatic.com/s/playfairdisplay/v37/nuFlD-vYSZviVYUb_rj3ij__anPXDTngL8SI3mhTsyGQo8Nn.ttf", fontWeight: 400, fontStyle: "italic" },
  ],
});

Font.register({
  family: "Inter",
  fonts: [
    { src: "https://fonts.gstatic.com/s/inter/v19/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.ttf", fontWeight: 300 },
    { src: "https://fonts.gstatic.com/s/inter/v19/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.ttf", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/inter/v19/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fAZ9hjp-Ek-_EeA.ttf", fontWeight: 500 },
    { src: "https://fonts.gstatic.com/s/inter/v19/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYAZ9hjp-Ek-_EeA.ttf", fontWeight: 600 },
    { src: "https://fonts.gstatic.com/s/inter/v19/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYAZ9hjp-Ek-_EeA.ttf", fontWeight: 700 },
  ],
});

export const COLORS = {
  ink0: "#0a0a0a",
  ink1: "#111111",
  ink3: "#2a2a2a",
  ink4: "#3d3d3d",
  cream0: "#f5f0e8",
  cream2: "#e3dbcc",
  paper: "#fbf8f2",
  white: "#ffffff",
  gold0: "#c8a96a",
  gold2: "#b89550",
  goldTint: "#e8d9b4",
  fgOnLight1: "#0a0a0a",
  fgOnLight2: "#3d3d3d",
  fgOnLight3: "#6b6458",
  fgOnLight4: "#9a9284",
};

export const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: "Inter",
    fontSize: 10,
    color: COLORS.fgOnLight1,
    backgroundColor: COLORS.white,
  },

  // Header
  brandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 32,
    paddingBottom: 16,
    borderBottom: `1 solid ${COLORS.goldTint}`,
  },
  wordmark: {
    fontFamily: "Playfair",
    fontSize: 20,
    fontWeight: 500,
    letterSpacing: 1,
    color: COLORS.ink0,
  },
  docMeta: {
    fontFamily: "Inter",
    fontSize: 9,
    letterSpacing: 1.5,
    color: COLORS.fgOnLight3,
    textAlign: "right",
  },

  // Titles
  eyebrow: {
    fontFamily: "Inter",
    fontSize: 8,
    fontWeight: 500,
    letterSpacing: 2.4,
    textTransform: "uppercase",
    color: COLORS.gold2,
    marginBottom: 6,
  },
  title: {
    fontFamily: "Playfair",
    fontSize: 28,
    fontWeight: 400,
    color: COLORS.ink0,
    marginBottom: 4,
    lineHeight: 1.1,
  },
  titleItalic: {
    fontFamily: "Playfair",
    fontSize: 28,
    fontWeight: 400,
    fontStyle: "italic",
    color: COLORS.gold2,
  },
  subtitle: {
    fontFamily: "Inter",
    fontSize: 10,
    fontWeight: 300,
    color: COLORS.fgOnLight3,
    marginBottom: 24,
  },

  // Section labels
  sectionLabel: {
    fontFamily: "Inter",
    fontSize: 8,
    fontWeight: 500,
    letterSpacing: 2.4,
    textTransform: "uppercase",
    color: COLORS.fgOnLight3,
    marginBottom: 10,
    marginTop: 20,
  },
  sectionTitle: {
    fontFamily: "Playfair",
    fontSize: 16,
    fontWeight: 500,
    color: COLORS.ink0,
    marginBottom: 8,
  },
  rule: {
    borderBottom: `1 solid ${COLORS.goldTint}`,
    marginTop: 10,
    marginBottom: 16,
  },
  hairline: {
    borderBottom: `0.5 solid ${COLORS.cream2}`,
    marginVertical: 8,
  },

  // Body
  body: {
    fontFamily: "Inter",
    fontSize: 10,
    lineHeight: 1.6,
    color: COLORS.fgOnLight2,
  },
  bodyBold: {
    fontFamily: "Inter",
    fontSize: 10,
    fontWeight: 600,
    color: COLORS.ink0,
  },
  small: {
    fontFamily: "Inter",
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
    fontFamily: "Inter",
    fontSize: 9,
    fontWeight: 500,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: COLORS.fgOnLight3,
    paddingRight: 12,
  },
  dataValue: {
    width: "60%",
    fontFamily: "Playfair",
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
    borderBottom: `1 solid ${COLORS.ink0}`,
    height: 40,
    marginBottom: 6,
  },
  signatureLabel: {
    fontFamily: "Inter",
    fontSize: 8,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: COLORS.fgOnLight3,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    fontFamily: "Inter",
    fontSize: 7,
    color: COLORS.fgOnLight4,
    lineHeight: 1.5,
    borderTop: `0.5 solid ${COLORS.goldTint}`,
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
    borderColor: COLORS.ink0,
    marginTop: 2,
    marginRight: 8,
  },

  // Cost table
  costTable: {
    borderTop: `1 solid ${COLORS.goldTint}`,
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
    borderTop: `1 solid ${COLORS.gold0}`,
    borderBottom: `1 solid ${COLORS.gold0}`,
    marginTop: 6,
  },
  costDesc: {
    flex: 3,
    fontFamily: "Inter",
    fontSize: 10,
    color: COLORS.ink0,
  },
  costNote: {
    flex: 2,
    fontFamily: "Inter",
    fontSize: 8,
    color: COLORS.fgOnLight3,
  },
  costAmount: {
    flex: 2,
    fontFamily: "Playfair",
    fontSize: 11,
    color: COLORS.ink0,
    textAlign: "right",
  },
  costTotal: {
    fontFamily: "Playfair",
    fontSize: 14,
    fontWeight: 500,
    color: COLORS.gold2,
  },
});
