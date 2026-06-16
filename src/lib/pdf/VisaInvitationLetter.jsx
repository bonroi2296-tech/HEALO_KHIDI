/**
 * healwith Visa Invitation Letter (초청장) PDF
 *
 * 대한민국 법무부 출입국·외국인정책본부 지침에 따른 의료목적 사증 초청 사유서.
 * 환자·국적, 초청 의료기관(또는 유치업자 BONROI), 치료 계획, 체류 예정일을 명시.
 *
 * 사용법:
 *   import { renderToBuffer } from '@react-pdf/renderer';
 *   const buffer = await renderToBuffer(<VisaInvitationLetter data={...} />);
 */

import React from "react";
import { Document, Page, View, Text } from "@react-pdf/renderer";
import { styles, COLORS } from "./styles";

const LABELS = {
  ko: {
    eyebrow: "healwith · 의료목적 사증 초청장",
    titleA: "Invitation",
    titleB: "Letter.",
    subtitle: "대한민국 출입국·외국인정책본부 — 의료목적 사증(C-3-3 / G-1-10) 초청 사유서",
    toEmbassy: "주한 대한민국 대사관 / 주재 공관 귀중",
    greeting: "아래 외국인환자를 한국 내 의료기관에서 치료받기 위하여 초청하니 사증 발급을 요청드립니다.",
    section_patient: "환자 정보",
    section_visa: "사증 정보",
    section_inviter: "초청인 / 유치업자",
    section_hospital: "치료 의료기관",
    section_schedule: "치료 및 체류 일정",
    section_responsibility: "초청인의 책임",
    fields: {
      name: "성명", nationality: "국적", passport: "여권번호", dob: "생년월일",
      visaType: "사증 유형", duration: "체류 예정 일수", purpose: "방문 목적",
      inviterName: "유치업자 (등록번호)", inviterRep: "대표자", inviterAddress: "주소", inviterContact: "연락처",
      hospital: "의료기관명", doctor: "담당의", regNo: "외국인환자 유치 의료기관 등록번호",
      diagnosis: "진단명", plan: "치료 계획",
      arrival: "예상 입국일", departure: "예상 출국일", totalDays: "총 체류 일수",
    },
    responsibility: [
      "초청인은 본 환자의 치료 목적 이외 활동을 하지 않도록 관리·감독할 책임을 집니다.",
      "초청인은 치료 종료 후 환자가 기한 내 출국하도록 지원합니다.",
      "초청인은 환자의 진료비 및 체류 비용 지급을 보증합니다.",
      "초청 사유에 변동이 발생할 경우 지체 없이 출입국·외국인청에 통지합니다.",
    ],
    issuedBy: "초청인 (서명·직인)",
    representative: "JUYOUNG KANG · BONROI",
  },
  en: {
    eyebrow: "healwith · Invitation Letter for Medical Visa",
    titleA: "Invitation",
    titleB: "Letter.",
    subtitle: "Republic of Korea — Medical Visa (C-3-3 / G-1-10) Invitation Letter",
    toEmbassy: "To the Embassy / Consulate of the Republic of Korea",
    greeting: "We hereby invite the following foreign patient to receive medical treatment at a Korean hospital and respectfully request visa issuance.",
    section_patient: "Patient Information",
    section_visa: "Visa Information",
    section_inviter: "Inviter / Patient Facilitator",
    section_hospital: "Treatment Facility",
    section_schedule: "Treatment & Stay Schedule",
    section_responsibility: "Inviter's Responsibilities",
    fields: {
      name: "Full Name", nationality: "Nationality", passport: "Passport No.", dob: "Date of Birth",
      visaType: "Visa Type", duration: "Planned Duration (days)", purpose: "Purpose of Visit",
      inviterName: "Facilitator (Reg. No.)", inviterRep: "Representative", inviterAddress: "Address", inviterContact: "Contact",
      hospital: "Hospital", doctor: "Attending Physician", regNo: "Foreign Patient Attraction Registration No.",
      diagnosis: "Diagnosis", plan: "Treatment Plan",
      arrival: "Planned Arrival", departure: "Planned Departure", totalDays: "Total Stay",
    },
    responsibility: [
      "The inviter is responsible for supervising that the patient does not engage in activities outside the stated medical purpose.",
      "The inviter shall assist the patient in departing Korea within the authorized period upon completion of treatment.",
      "The inviter guarantees payment of the patient's medical and living expenses.",
      "Any changes to the invitation reason shall be reported promptly to the Korea Immigration Service.",
    ],
    issuedBy: "Inviter (Signature / Seal)",
    representative: "JUYOUNG KANG · BONROI",
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

/* eslint-disable react-hooks/purity */
export default function VisaInvitationLetter({ data, lang = "en" }) {
  const L = LABELS[lang] || LABELS.en;

  const letterNo =
    data?.letterNo ||
    `healwith-INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(
      Math.floor(Math.random() * 1000)
    ).padStart(3, "0")}`;
  const issuedAt = data?.issuedAt || new Date().toISOString().slice(0, 10);

  const patient = data?.patient || {};
  const visa = data?.visa || {};
  const hospital = data?.hospital || {};
  const schedule = data?.schedule || {};

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.brandRow} fixed>
          <View>
            <Text style={styles.wordmark}>healwith</Text>
            <Text style={{ ...styles.small, marginTop: 4 }}>
              BONROI · Facilitator A-2026-01-02-06761
            </Text>
          </View>
          <View>
            <Text style={styles.docMeta}>INVITATION NO.</Text>
            <Text
              style={{
                fontFamily: "Playfair",
                fontSize: 12,
                color: COLORS.ink0,
                marginTop: 2,
              }}
            >
              {letterNo}
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

        {/* To embassy */}
        <Text style={{ ...styles.body, marginTop: 14, fontStyle: "italic" }}>
          {L.toEmbassy}
        </Text>
        <Text style={{ ...styles.body, marginTop: 6 }}>{L.greeting}</Text>

        {/* Patient */}
        <Text style={styles.sectionLabel}>01 — {L.section_patient}</Text>
        <View>
          <DataRow label={L.fields.name} value={patient.name} />
          <DataRow label={L.fields.nationality} value={patient.nationality} />
          <DataRow label={L.fields.passport} value={patient.passport} />
          <DataRow label={L.fields.dob} value={patient.dob} />
          <DataRow label={L.fields.diagnosis} value={patient.diagnosis} />
        </View>

        {/* Visa */}
        <Text style={styles.sectionLabel}>02 — {L.section_visa}</Text>
        <View>
          <DataRow label={L.fields.visaType} value={visa.visaType} />
          <DataRow label={L.fields.purpose} value={visa.purpose} />
          <DataRow label={L.fields.duration} value={visa.durationDays ? `${visa.durationDays} days` : null} />
        </View>

        {/* Inviter */}
        <Text style={styles.sectionLabel}>03 — {L.section_inviter}</Text>
        <View>
          <DataRow
            label={L.fields.inviterName}
            value="BONROI · A-2026-01-02-06761"
          />
          <DataRow label={L.fields.inviterRep} value="JUYOUNG KANG" />
          <DataRow
            label={L.fields.inviterAddress}
            value="Room 613, 385 Gangseo-ro, Gangseo-gu, Seoul"
          />
          <DataRow
            label={L.fields.inviterContact}
            value="roiimmunelab@immunelab.co.kr / +82 10 4772 1075"
          />
        </View>

        {/* Hospital */}
        <Text style={styles.sectionLabel}>04 — {L.section_hospital}</Text>
        <View>
          <DataRow label={L.fields.hospital} value={hospital.name} />
          <DataRow label={L.fields.doctor} value={hospital.doctor} />
          <DataRow label={L.fields.regNo} value={hospital.regNo} />
          <DataRow label={L.fields.plan} value={hospital.plan} />
        </View>

        {/* Schedule */}
        <Text style={styles.sectionLabel}>05 — {L.section_schedule}</Text>
        <View>
          <DataRow label={L.fields.arrival} value={schedule.arrival} />
          <DataRow label={L.fields.departure} value={schedule.departure} />
          <DataRow
            label={L.fields.totalDays}
            value={schedule.totalDays ? `${schedule.totalDays} days` : null}
          />
        </View>

        {/* Responsibility */}
        <Text style={styles.sectionLabel}>06 — {L.section_responsibility}</Text>
        {L.responsibility.map((t, i) => (
          <Text key={i} style={{ ...styles.body, marginLeft: 12 }}>
            · {t}
          </Text>
        ))}

        {/* Signature */}
        <View style={styles.signatureRow}>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>{L.issuedBy}</Text>
            <Text style={{ ...styles.small, marginTop: 2 }}>
              {L.representative}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>
            BONROI · Sole Proprietorship · Rep. JUYOUNG KANG · Business Reg.
            463-35-00902 · International Patient Facilitator Reg.
            A-2026-01-02-06761 (Mayor of Seoul)
          </Text>
          <Text>
            Room 613, 385 Gangseo-ro, Gangseo-gu, Seoul ·
            roiimmunelab@immunelab.co.kr · +82 10 4772 1075
          </Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} / ${totalPages}`
            }
            style={{ textAlign: "right", marginTop: 2 }}
          />
        </View>
      </Page>
    </Document>
  );
}
