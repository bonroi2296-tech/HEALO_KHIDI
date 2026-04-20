/**
 * HEALO Medical Quotation PDF
 * 의료해외진출법 §15 "외국인환자의 권익 보호" 조항에 따라
 * 진료계약 체결 전 환자에게 서면으로 고지해야 할 진료비 예상 금액 + 수수료 + 분쟁 처리 절차
 *
 * 사용법:
 *   import { renderToBuffer } from '@react-pdf/renderer';
 *   const buffer = await renderToBuffer(<MedicalQuotation data={...} />);
 */

import React from "react";
import { Document, Page, View, Text } from "@react-pdf/renderer";
import { styles, COLORS } from "./styles";

const LABELS = {
  ko: {
    eyebrow: "HEALO · 진료비 견적서",
    titleA: "Medical",
    titleB: "Quotation.",
    subtitle: "의료 해외진출 및 외국인환자 유치 지원에 관한 법률 §15에 따라 발급",
    patient: "환자 정보",
    hospital: "제휴 의료기관",
    plan: "제안된 치료 계획",
    cost: "비용 상세",
    terms: "결제 및 환불 조건",
    dispute: "불만·분쟁 처리",
    signature: "확인 서명",
    patientSig: "환자 서명",
    healoSig: "HEALO 대표자",
    disclaimer: "본 견적서는 예상 금액이며, 실제 비용은 진료 후 의료기관 청구서에 따릅니다. 본 문서를 확인하지 않고는 진료계약을 체결할 수 없습니다.",
    fields: {
      name: "성명", nationality: "국적", passport: "여권번호",
      dob: "생년월일", diagnosis: "진단명",
      hospital: "의료기관명", doctor: "담당의", regNo: "기관 번호",
      procedure: "치료 내용", duration: "예상 기간", dates: "진료 일정",
      description: "항목", note: "비고", amount: "금액",
      refund: "환불 정책", payment: "결제 방법",
      agency: "한국의료분쟁조정중재원", kopico: "개인정보 분쟁조정위원회",
    },
    paymentTerms: "계약금 30%는 진료 시작 전 입금. 잔금은 퇴원 전 정산. 국제송금, 신용카드, 현금 지원.",
    refundTerms: [
      "진료 시작 전 해지: 계약금 전액 환불 (단 실비 공제)",
      "진료 중 해지: 진행된 진료분 정산 후 잔액 환불",
      "의료기관 귀책 취소: 전액 환불",
    ],
  },
  en: {
    eyebrow: "HEALO · Medical Quotation",
    titleA: "Medical",
    titleB: "Quotation.",
    subtitle: "Issued under §15 of the Korean Medical Tourism Act (outbound healthcare & inbound patient attraction)",
    patient: "Patient",
    hospital: "Partner Hospital",
    plan: "Proposed Treatment Plan",
    cost: "Cost Breakdown",
    terms: "Payment & Refund",
    dispute: "Complaint & Dispute Resolution",
    signature: "Confirmation",
    patientSig: "Patient signature",
    healoSig: "HEALO representative",
    disclaimer: "This quotation is an estimate. Final amount follows the hospital's post-treatment invoice. No treatment contract may be concluded without acknowledging this document.",
    fields: {
      name: "Full name", nationality: "Nationality", passport: "Passport no.",
      dob: "Date of birth", diagnosis: "Diagnosis",
      hospital: "Hospital", doctor: "Attending physician", regNo: "Registration no.",
      procedure: "Procedure", duration: "Expected duration", dates: "Scheduled dates",
      description: "Item", note: "Note", amount: "Amount",
      refund: "Refund policy", payment: "Payment method",
      agency: "Korean Medical Dispute Mediation Agency", kopico: "Personal Info Dispute Mediation Committee",
    },
    paymentTerms: "30% deposit before treatment. Balance settled before discharge. Supports international wire, credit card, and cash.",
    refundTerms: [
      "Cancellation before treatment: full deposit refund (minus actual expenses)",
      "Cancellation during treatment: refund balance after deducting completed services",
      "Hospital-caused cancellation: 100% refund",
    ],
  },
};

function DataRow({ label, value }) {
  return (
    <View style={styles.dataRow}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={styles.dataValue}>{value || "—"}</Text>
    </View>
  );
}

function fmtKRW(n) {
  if (n == null || isNaN(n)) return "—";
  return `${Number(n).toLocaleString("ko-KR")} KRW`;
}
function fmtUSD(n) {
  if (n == null || isNaN(n)) return "—";
  return `$${Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export default function MedicalQuotation({ data, lang = "ko" }) {
  const L = LABELS[lang] || LABELS.en;
  const L2 = lang === "ko" ? LABELS.en : LABELS.ko; // bilingual

  const quotationNo =
    data?.quotationNo ||
    `HEALO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`;
  const issuedAt = data?.issuedAt || new Date().toISOString().slice(0, 10);

  const patient = data?.patient || {};
  const hospital = data?.hospital || {};
  const treatment = data?.treatment || {};
  const costs = data?.costs || [];
  const totalKRW = costs.reduce((s, c) => s + (Number(c.krw) || 0), 0);
  const totalUSD = costs.reduce((s, c) => s + (Number(c.usd) || 0), 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.brandRow} fixed>
          <View>
            <Text style={styles.wordmark}>HEALO</Text>
            <Text style={{ ...styles.small, marginTop: 4 }}>BONROI · Facilitator A-2026-01-02-06761</Text>
          </View>
          <View>
            <Text style={styles.docMeta}>QUOTATION NO.</Text>
            <Text style={{ fontFamily: "Playfair", fontSize: 12, color: COLORS.ink0, marginTop: 2 }}>
              {quotationNo}
            </Text>
            <Text style={{ ...styles.small, marginTop: 6, textAlign: "right" }}>
              Issued {issuedAt}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.eyebrow}>{L.eyebrow}</Text>
        <Text style={styles.title}>
          {L.titleA} <Text style={styles.titleItalic}>{L.titleB}</Text>
        </Text>
        <View style={{ ...styles.rule, width: 48, marginTop: 4 }} />
        <Text style={{ ...styles.subtitle, marginTop: 12 }}>{L.subtitle}</Text>

        {/* Patient */}
        <Text style={styles.sectionLabel}>01 — {L.patient}</Text>
        <View>
          <DataRow label={L.fields.name} value={patient.name} />
          <DataRow label={L.fields.nationality} value={patient.nationality} />
          <DataRow label={L.fields.passport} value={patient.passport} />
          <DataRow label={L.fields.dob} value={patient.dob} />
          <DataRow label={L.fields.diagnosis} value={patient.diagnosis} />
        </View>

        {/* Hospital */}
        <Text style={styles.sectionLabel}>02 — {L.hospital}</Text>
        <View>
          <DataRow label={L.fields.hospital} value={hospital.name} />
          <DataRow label={L.fields.doctor} value={hospital.doctor} />
          <DataRow label={L.fields.regNo} value={hospital.regNo} />
        </View>

        {/* Treatment plan */}
        <Text style={styles.sectionLabel}>03 — {L.plan}</Text>
        <View>
          <DataRow label={L.fields.procedure} value={treatment.procedure} />
          <DataRow label={L.fields.duration} value={treatment.duration} />
          <DataRow label={L.fields.dates} value={treatment.dates} />
        </View>

        {/* Cost breakdown */}
        <Text style={styles.sectionLabel}>04 — {L.cost}</Text>
        <View style={styles.costTable}>
          {/* Header row */}
          <View style={{ ...styles.costRow, borderBottom: `1 solid ${COLORS.gold0}` }}>
            <Text style={{ ...styles.costDesc, ...styles.bodyBold }}>{L.fields.description}</Text>
            <Text style={{ ...styles.costNote, textTransform: "uppercase", letterSpacing: 1 }}>{L.fields.note}</Text>
            <Text style={{ ...styles.costAmount, ...styles.bodyBold }}>{L.fields.amount}</Text>
          </View>
          {costs.map((c, i) => (
            <View key={i} style={styles.costRow}>
              <Text style={styles.costDesc}>{c.label}</Text>
              <Text style={styles.costNote}>{c.note || ""}</Text>
              <Text style={styles.costAmount}>
                {c.krw != null ? fmtKRW(c.krw) : ""}
                {c.usd != null ? `\n${fmtUSD(c.usd)}` : ""}
              </Text>
            </View>
          ))}
          {/* Total */}
          <View style={styles.costRowFinal}>
            <Text style={{ ...styles.costDesc, ...styles.bodyBold, textTransform: "uppercase", letterSpacing: 1 }}>
              {lang === "ko" ? "합계" : "Total"}
            </Text>
            <Text style={styles.costNote}></Text>
            <View style={styles.costAmount}>
              <Text style={styles.costTotal}>{fmtKRW(totalKRW)}</Text>
              <Text style={{ ...styles.small, textAlign: "right", marginTop: 2 }}>{fmtUSD(totalUSD)}</Text>
            </View>
          </View>
        </View>
        <Text style={{ ...styles.small, marginTop: 10, fontStyle: "italic" }}>
          ※ {L.disclaimer}
        </Text>

        {/* Payment & Refund */}
        <Text style={styles.sectionLabel}>05 — {L.terms}</Text>
        <Text style={{ ...styles.body, marginBottom: 8 }}>
          <Text style={styles.bodyBold}>{L.fields.payment}:</Text> {L.paymentTerms}
        </Text>
        <Text style={{ ...styles.bodyBold, marginBottom: 4 }}>{L.fields.refund}:</Text>
        {L.refundTerms.map((t, i) => (
          <Text key={i} style={{ ...styles.body, marginLeft: 12 }}>· {t}</Text>
        ))}

        {/* Dispute */}
        <Text style={styles.sectionLabel}>06 — {L.dispute}</Text>
        <Text style={styles.body}>
          · {L.fields.agency}: www.k-medi.or.kr / 02-6210-0114
        </Text>
        <Text style={styles.body}>
          · {L.fields.kopico}: www.kopico.go.kr / 1833-6972
        </Text>

        {/* Signatures */}
        <View style={styles.signatureRow}>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>{L.patientSig}</Text>
            <Text style={{ ...styles.small, marginTop: 2 }}>{patient.name || ""}</Text>
          </View>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>{L.healoSig}</Text>
            <Text style={{ ...styles.small, marginTop: 2 }}>JUYOUNG KANG · BONROI</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>
            BONROI (BONROI) · Sole Proprietorship · Rep. JUYOUNG KANG · Business Reg. 463-35-00902 ·
            International Patient Facilitator Reg. A-2026-01-02-06761 (Mayor of Seoul)
          </Text>
          <Text>
            Room 613, 385 Gangseo-ro, Gangseo-gu, Seoul · roiimmunelab@immunelab.co.kr · +82 10 4772 1075
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} style={{ textAlign: "right", marginTop: 2 }} />
        </View>
      </Page>
    </Document>
  );
}
