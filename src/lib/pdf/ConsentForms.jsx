/**
 * healwith Consent Forms PDF (3종)
 *
 * 1. PersonalInfoConsent — 개인정보 수집·이용 동의 (PIPA §15)
 * 2. SensitiveHealthConsent — 민감정보(건강) 처리 별도 동의 (PIPA §23 / GDPR Art 9)
 * 3. CrossBorderConsent — 국외이전 동의 (PIPA §28-8 / KZ 94-V §16)
 *
 * 환자가 서명한 PDF를 archival하면 법적 증거력 확보.
 */

import React from "react";
import { Document, Page, View, Text } from "@react-pdf/renderer";
import { styles, COLORS, SANS } from "./styles";

function FormHeader({ formNo, formTitle, legalBasis, issuedAt }) {
  return (
    <>
      <View style={styles.brandRow} fixed>
        <View>
          <Text style={styles.wordmark}>healwith</Text>
          <Text style={{ ...styles.small, marginTop: 4 }}>
            BONROI · Consent Form {formNo}
          </Text>
        </View>
        <View>
          <Text style={styles.docMeta}>CONSENT · {formNo}</Text>
          <Text style={{ ...styles.small, marginTop: 6, textAlign: "right" }}>
            Issued {issuedAt}
          </Text>
        </View>
      </View>

      <Text style={styles.eyebrow}>CONSENT {formNo}</Text>
      <Text style={styles.title}>{formTitle}</Text>
      <View style={{ ...styles.rule, width: 48, marginTop: 6 }} />
      <Text style={{ ...styles.subtitle, marginTop: 10 }}>{legalBasis}</Text>
    </>
  );
}

function DataTable({ items }) {
  return (
    <View style={{ marginTop: 10, marginBottom: 16 }}>
      {items.map((item, i) => (
        <View key={i} style={styles.dataRow}>
          <Text style={styles.dataLabel}>{item.label}</Text>
          <Text style={{ ...styles.dataValue, fontSize: 9, fontFamily: SANS, fontWeight: 400, lineHeight: 1.55 }}>
            {item.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

function ConsentCheckbox({ agreeLabel, declineLabel }) {
  return (
    <View style={{ marginTop: 16, marginBottom: 8, padding: 14, backgroundColor: COLORS.paper, borderWidth: 1, borderColor: COLORS.goldTint }}>
      <View style={styles.checkboxRow}>
        <View style={styles.checkbox} />
        <Text style={styles.body}>{agreeLabel}</Text>
      </View>
      <View style={styles.checkboxRow}>
        <View style={styles.checkbox} />
        <Text style={styles.body}>{declineLabel}</Text>
      </View>
    </View>
  );
}

function SignatureBlock({ patientName, lang }) {
  const labels =
    lang === "ko"
      ? { sig: "환자 서명", date: "날짜", name: "성명 (인쇄)", passport: "여권번호" }
      : { sig: "Patient signature", date: "Date", name: "Name (printed)", passport: "Passport" };
  return (
    <View style={styles.signatureRow}>
      <View style={styles.signatureBlock}>
        <View style={styles.signatureLine} />
        <Text style={styles.signatureLabel}>{labels.sig}</Text>
        {patientName ? (
          <Text style={{ ...styles.small, marginTop: 2 }}>{patientName}</Text>
        ) : null}
      </View>
      <View style={styles.signatureBlock}>
        <Text style={{ ...styles.small, marginBottom: 4 }}>{labels.date}</Text>
        <View style={{ ...styles.signatureLine, height: 24 }} />
        <Text style={{ ...styles.small, marginTop: 8, marginBottom: 4 }}>{labels.passport}</Text>
        <View style={{ ...styles.signatureLine, height: 24 }} />
      </View>
    </View>
  );
}

function CommonFooter() {
  return (
    <View style={styles.footer} fixed>
      <Text>
        BONROI · Sole Proprietorship · Rep. JUYOUNG KANG · Business Reg. 463-35-00902 ·
        Facilitator Reg. A-2026-01-02-06761
      </Text>
      <Text>
        Data Protection Officer: JUYOUNG KANG · admin@healwith.co.kr · +82 10 4772 1075
      </Text>
      <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} style={{ textAlign: "right", marginTop: 2 }} />
    </View>
  );
}

// ============================================================
// FORM 1 — Personal Information Collection & Use (PIPA §15)
// ============================================================

export function PersonalInfoConsent({ patient = {}, lang = "ko" }) {
  const issuedAt = new Date().toISOString().slice(0, 10);
  const isKo = lang === "ko";

  const items = isKo
    ? [
        { label: "수집 항목", value: "이름, 생년월일, 성별, 국적, 여권번호, 연락처(이메일·전화), 거주지 주소, 보호자 정보" },
        { label: "수집·이용 목적", value: "회원 식별, 서비스 제공, 의료기관 매칭 안내, 비자·체류 지원, 결제 처리, 고객 응대" },
        { label: "보유·이용 기간", value: "회원 탈퇴 시까지 (단 관계 법령상 보관 의무 기간 예외 — 전자상거래법 5년 등)" },
        { label: "동의 거부권", value: "동의하지 않을 권리가 있습니다. 단 필수 항목 미동의 시 서비스 이용이 불가할 수 있습니다." },
      ]
    : [
        { label: "Items collected", value: "Name, DOB, gender, nationality, passport no., email & phone, address, guardian info" },
        { label: "Purpose of use", value: "Identity verification, service provision, hospital matching, visa/stay support, payment processing, customer support" },
        { label: "Retention period", value: "Until account closure (except statutory retention — e.g. 5 years under Korean E-Commerce Act)" },
        { label: "Right to refuse", value: "You have the right to refuse. However, service use may be restricted without consent to required items." },
      ];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <FormHeader
          formNo="01"
          formTitle={isKo ? "개인정보 수집·이용 동의서" : "Personal Information Collection & Use Consent"}
          legalBasis={isKo ? "「개인정보보호법」 제15조에 따른 필수 동의" : "Required consent under Korean PIPA §15"}
          issuedAt={issuedAt}
        />

        <Text style={styles.sectionLabel}>{isKo ? "동의 사항" : "What you're consenting to"}</Text>
        <DataTable items={items} />

        <ConsentCheckbox
          agreeLabel={
            isKo
              ? "[필수] 위 내용에 동의합니다. (Required)"
              : "[Required] I consent to the above collection and use."
          }
          declineLabel={
            isKo
              ? "[필수] 동의하지 않습니다. (서비스 이용 제한됨)"
              : "[Required] I do not consent. (Service use will be restricted.)"
          }
        />

        <Text style={{ ...styles.sectionLabel, marginTop: 24 }}>{isKo ? "정보주체 권리" : "Your rights"}</Text>
        <Text style={styles.body}>
          {isKo
            ? "열람·정정·삭제·처리정지·동의철회·손해배상 청구가 가능합니다. admin@healwith.co.kr 으로 요청하시면 10일 이내에 조치합니다."
            : "You may request access, correction, deletion, suspension, consent withdrawal, or compensation. Contact admin@healwith.co.kr; we respond within 10 business days."}
        </Text>

        <SignatureBlock patientName={patient.name} lang={lang} />
        <CommonFooter />
      </Page>
    </Document>
  );
}

// ============================================================
// FORM 2 — Sensitive Health Information (PIPA §23 / GDPR Art 9)
// ============================================================

export function SensitiveHealthConsent({ patient = {}, lang = "ko" }) {
  const issuedAt = new Date().toISOString().slice(0, 10);
  const isKo = lang === "ko";

  const items = isKo
    ? [
        { label: "수집 항목 (민감정보)", value: "진단명, 치료 이력, 현재 증상, 복용 약물, 진단서·병리 리포트·영상 자료(CT/MRI/X-ray), 건강보험 정보, 장애 여부" },
        { label: "처리 목적", value: "의료기관 매칭, 적절한 진료과 및 전문의 안내, 치료 계획 수립 지원" },
        { label: "처리 근거", value: "「개인정보보호법」 제23조에 따른 명시적 별도 동의 · GDPR Art. 9(2)(a) explicit consent" },
        { label: "제공받는 자", value: "이용자가 선택·동의한 한국 내 협력 의료기관 및 담당 의료진 (제3자 제공 동의서 참조)" },
        { label: "보유·이용 기간", value: "컨시어지 서비스 완료 후 즉시 삭제. 재이용 보관 요청 시 최대 3년." },
        { label: "동의 거부권", value: "동의하지 않을 권리가 있습니다. 단 의료 매칭 서비스 이용이 불가합니다." },
      ]
    : [
        { label: "Items (sensitive)", value: "Diagnosis, medical history, current symptoms, medications, medical certificates, pathology reports, imaging (CT/MRI/X-ray), insurance, disability status" },
        { label: "Purpose", value: "Hospital matching, appropriate specialist recommendation, treatment planning support" },
        { label: "Legal basis", value: "Explicit separate consent under Korean PIPA §23 · GDPR Art. 9(2)(a) explicit consent" },
        { label: "Recipients", value: "Korean partner hospitals and attending physicians selected and consented by you (see Third-Party Sharing Consent)" },
        { label: "Retention", value: "Deleted immediately after concierge service completion. Up to 3 years if retention is requested." },
        { label: "Right to refuse", value: "You have the right to refuse. Without consent, medical matching is unavailable." },
      ];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <FormHeader
          formNo="02"
          formTitle={isKo ? "민감정보(건강정보) 처리 동의서" : "Sensitive Health Information Processing Consent"}
          legalBasis={isKo ? "「개인정보보호법」 제23조 별도 동의 · GDPR Art. 9" : "Separate consent under Korean PIPA §23 · GDPR Art. 9"}
          issuedAt={issuedAt}
        />

        <Text style={styles.sectionLabel}>{isKo ? "민감정보 처리 내용" : "Processing details"}</Text>
        <DataTable items={items} />

        <View style={{ ...styles.rule, marginTop: 8, marginBottom: 12 }} />
        <Text style={{ ...styles.body, color: COLORS.fgOnLight3 }}>
          {isKo
            ? "※ 민감정보는 일반 개인정보와 분리하여 별도의 명시적 동의를 받습니다. 본 동의는 구두로는 인정되지 않으며, 서면 또는 전자서명으로만 유효합니다."
            : "※ Sensitive data requires separate explicit consent, distinct from general personal data. Verbal consent is not recognized; written or electronic signature is required."}
        </Text>

        <ConsentCheckbox
          agreeLabel={isKo ? "[별도 동의] 민감정보 처리에 동의합니다." : "[Separate consent] I consent to the processing of my sensitive health data."}
          declineLabel={isKo ? "[별도 동의] 동의하지 않습니다." : "[Separate consent] I do not consent."}
        />

        <SignatureBlock patientName={patient.name} lang={lang} />
        <CommonFooter />
      </Page>
    </Document>
  );
}

// ============================================================
// FORM 3 — Cross-border Transfer (PIPA §28-8 / KZ 94-V §16)
// ============================================================

export function CrossBorderConsent({ patient = {}, lang = "ko" }) {
  const issuedAt = new Date().toISOString().slice(0, 10);
  const isKo = lang === "ko";

  const items = isKo
    ? [
        { label: "이전되는 국가", value: "대한민국 (추가로 미국 — Vercel/Supabase 클라우드, 아일랜드 — Google Ireland Ltd. 분석)" },
        { label: "이전 받는 자", value: "이용자가 선택한 한국 협력 의료기관, 클라우드 인프라(Vercel Inc., Supabase Inc.), 분석(Google Ireland Ltd.)" },
        { label: "이전 항목", value: "제1호 동의서(개인정보) + 제2호 동의서(민감 건강정보)의 모든 항목" },
        { label: "이전 시기 및 방법", value: "서비스 이용 시점 즉시 · HTTPS 암호화 전송(TLS 1.3) · 저장 시 AES-256 암호화" },
        { label: "이전 목적", value: "대한민국 내 의료 컨시어지 서비스 제공" },
        { label: "보유 기간", value: "각 수신자의 보관 정책에 따름 (의료기관은 의료법 §22에 따라 10년)" },
        { label: "안전장치", value: "처리위탁 계약(SCC 준용), 기술적·관리적 보호조치. 유출 시 72시간 내 통지." },
        { label: "거부권", value: "동의하지 않을 권리가 있습니다. 단 서비스 본질상 이전이 필수이므로 미동의 시 서비스 이용 불가." },
      ]
    : [
        { label: "Destination countries", value: "Republic of Korea (plus USA — Vercel/Supabase cloud, Ireland — Google Ireland Ltd. analytics)" },
        { label: "Recipients", value: "Korean partner hospitals selected by you, cloud infrastructure (Vercel Inc., Supabase Inc.), analytics (Google Ireland Ltd.)" },
        { label: "Transferred items", value: "All items in Consent Form 01 (Personal Info) + Consent Form 02 (Sensitive Health)" },
        { label: "Transfer timing & method", value: "Immediately upon service use · HTTPS (TLS 1.3) in transit · AES-256 at rest" },
        { label: "Purpose", value: "Provision of medical concierge service in the Republic of Korea" },
        { label: "Retention", value: "Per each recipient's policy (hospitals retain for 10 years under Korean Medical Service Act §22)" },
        { label: "Safeguards", value: "Processing agreements modeled on SCCs, technical & organizational measures. Breach notification within 72h." },
        { label: "Right to refuse", value: "You may refuse. Because transfer is essential to the service, refusal prevents service use." },
      ];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <FormHeader
          formNo="03"
          formTitle={isKo ? "개인정보 국외이전 동의서" : "Cross-Border Personal Data Transfer Consent"}
          legalBasis={
            isKo
              ? "「개인정보보호법」 제28조의8 · 카자흐스탄 94-V ЗРК 제16조 · GDPR Art. 44-49"
              : "Korean PIPA §28-8 · Kazakhstan Law 94-V §16 · GDPR Art. 44-49"
          }
          issuedAt={issuedAt}
        />

        <Text style={styles.sectionLabel}>{isKo ? "국외이전 상세" : "Transfer details"}</Text>
        <DataTable items={items} />

        <Text style={{ ...styles.sectionLabel, marginTop: 16 }}>
          {isKo ? "관할별 추가 고지" : "Jurisdictional notices"}
        </Text>
        <Text style={{ ...styles.body, marginBottom: 8 }}>
          <Text style={styles.bodyBold}>EU/EEA (GDPR): </Text>
          {isKo
            ? "대한민국은 EU 집행위원회로부터 2021년 12월 적정성 결정(Decision 2022/254)을 받아 SCC 없이 이전 가능합니다."
            : "The Republic of Korea received an EU Commission adequacy decision (2022/254) in December 2021, permitting transfers without SCCs."}
        </Text>
        <Text style={{ ...styles.body, marginBottom: 8 }}>
          <Text style={styles.bodyBold}>Kazakhstan (94-V ЗРК): </Text>
          {isKo
            ? "본 동의는 제16조에 따른 명시적 서면 동의이며, 서면 또는 전자서명으로 기록됩니다."
            : "This consent constitutes explicit written consent under §16, recorded in writing or with electronic signature."}
        </Text>
        <Text style={{ ...styles.body }}>
          <Text style={styles.bodyBold}>Russia (152-FZ): </Text>
          {isKo
            ? "러시아 시민의 경우 152-FZ 현지화 요건을 별도 검토 중이며, 본 동의는 해당 요건을 준수하는 범위 내에서 유효합니다."
            : "For Russian citizens, 152-FZ localization requirements are under separate review; this consent is valid within the scope of compliance."}
        </Text>

        <ConsentCheckbox
          agreeLabel={isKo ? "[별도 동의] 국외이전에 동의합니다." : "[Separate consent] I consent to the cross-border transfer."}
          declineLabel={isKo ? "[별도 동의] 동의하지 않습니다." : "[Separate consent] I do not consent."}
        />

        <SignatureBlock patientName={patient.name} lang={lang} />
        <CommonFooter />
      </Page>
    </Document>
  );
}
