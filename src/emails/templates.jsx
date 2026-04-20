/**
 * HEALO 트랜잭셔널 이메일 템플릿 6종
 *
 * 1. inquiryReceived      — 문의 접수 확인
 * 2. coordinatorIntro     — 코디네이터 첫 연락
 * 3. hospitalMatch        — 병원 매칭 제안
 * 4. visaDocumentRequest  — 비자 서류 요청
 * 5. treatmentSchedule    — 치료 일정 확정
 * 6. postTreatmentFollowup — 사후 관리 체크인
 *
 * 각 템플릿은 { ko, en } 버전을 단일 이메일에 bilingual로 렌더.
 */

import React from "react";
import { Row, Column, Section, Text, Link as EmailLink } from "@react-email/components";
import { HealoEmail, Eyebrow, Title, Rule, BodyText as Body, CTA, BilingualSplit, COLORS, BRAND } from "./shared";

// ============ 1. 문의 접수 확인 ============

export function InquiryReceived({ name = "", inquiryId = "" }) {
  const preview = "Your inquiry has arrived. We'll respond within one business day.";
  return (
    <HealoEmail preview={preview}>
      <Eyebrow>Received</Eyebrow>
      <Title>
        Your inquiry{" "}
        <span style={{ fontStyle: "italic", color: COLORS.goldDark }}>has arrived.</span>
      </Title>
      <Rule />
      <BilingualSplit
        ko={
          <>
            <Body>
              {name ? `${name} 님,` : "환자님,"} 안녕하세요.
              HEALO에 문의주셔서 감사합니다. 전담 코디네이터가 영업일 기준 하루 안에
              선호 언어로 회신드립니다.
            </Body>
            <Body>
              그 사이에 환자 가이드를 살펴보시면 한국 치료 과정을 이해하시는 데 도움이 됩니다.
            </Body>
            {inquiryId ? (
              <Body>
                <strong>문의 번호:</strong> {inquiryId}
              </Body>
            ) : null}
          </>
        }
        en={
          <>
            <Body>
              Dear {name || "patient"}, thank you for reaching out to HEALO. A dedicated
              coordinator will respond within one business day, in your preferred language.
            </Body>
            <Body>
              In the meantime, our patient guides can help you understand treatment in Korea.
            </Body>
            {inquiryId ? (
              <Body>
                <strong>Inquiry ID:</strong> {inquiryId}
              </Body>
            ) : null}
          </>
        }
      />
      <CTA href={`${BRAND.website}/education`}>View patient guides</CTA>
    </HealoEmail>
  );
}

// ============ 2. 코디네이터 첫 연락 ============

export function CoordinatorIntro({
  patientName = "",
  coordinatorName = "Ji-hyun Park",
  coordinatorLang = "Korean, Russian, English",
  calendarLink = "",
}) {
  return (
    <HealoEmail preview={`Hello from ${coordinatorName}, your HEALO coordinator.`}>
      <Eyebrow>Your coordinator</Eyebrow>
      <Title italic>A personal introduction.</Title>
      <Rule />
      <BilingualSplit
        ko={
          <>
            <Body>
              {patientName ? `${patientName} 님,` : "안녕하세요,"} HEALO의 {coordinatorName} 코디네이터입니다.
              앞으로 진료 여정의 모든 단계를 저와 함께 하시게 됩니다.
            </Body>
            <Body>
              저는 {coordinatorLang} 로 응대 가능하며, 주중 09:00-18:00 KST 기준으로
              보통 2시간 이내 답변드립니다.
            </Body>
            <Body>
              다음 단계는 30분 정도의 화상 통화로 진단 내용과 우선순위를 확인하는 것입니다.
              아래에서 편한 시간을 선택해 주세요.
            </Body>
          </>
        }
        en={
          <>
            <Body>
              Dear {patientName || "patient"}, I'm {coordinatorName}, your HEALO coordinator.
              I'll be with you through every step of this journey.
            </Body>
            <Body>
              I work in {coordinatorLang} and typically respond within 2 hours during
              09:00–18:00 KST on weekdays.
            </Body>
            <Body>
              Our next step is a 30-minute video call to review your diagnosis and
              priorities. Please pick a time that works for you below.
            </Body>
          </>
        }
      />
      {calendarLink ? (
        <CTA href={calendarLink}>Schedule the call</CTA>
      ) : (
        <CTA href={`mailto:${BRAND.email}?subject=Schedule%20intro%20call`}>Reply to schedule</CTA>
      )}
    </HealoEmail>
  );
}

// ============ 3. 병원 매칭 제안 ============

export function HospitalMatch({ patientName = "", proposals = [], quotationLink = "" }) {
  return (
    <HealoEmail preview="We've selected hospitals that match your case.">
      <Eyebrow>Matches proposed</Eyebrow>
      <Title>
        Selected for <span style={{ fontStyle: "italic", color: COLORS.goldDark }}>your case.</span>
      </Title>
      <Rule />
      <BilingualSplit
        ko={
          <Body>
            {patientName ? `${patientName} 님의` : "환자님의"} 진단과 우선순위를 바탕으로
            다음 의료기관들을 엄선했습니다. 각 제안에는 예상 치료 기간과 비용이 포함돼 있습니다.
          </Body>
        }
        en={
          <Body>
            Based on {patientName ? `${patientName}'s` : "your"} diagnosis and priorities,
            we've selected the following hospitals. Each includes estimated treatment duration and cost.
          </Body>
        }
      />

      {/* Proposals */}
      {proposals.map((p, i) => (
        <Section
          key={i}
          style={{
            borderTop: `1px solid ${COLORS.goldTint}`,
            padding: "20px 0",
          }}
        >
          <Text
            style={{
              fontSize: 10,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: COLORS.goldDark,
              margin: "0 0 6px",
              fontFamily: "'Inter', Arial, sans-serif",
            }}
          >
            {String(i + 1).padStart(2, "0")} — {p.specialty || "Partner hospital"}
          </Text>
          <Text
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 20,
              fontWeight: 500,
              color: COLORS.ink,
              margin: "0 0 8px",
            }}
          >
            {p.name}
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: COLORS.textMuted,
              margin: "0 0 8px",
              lineHeight: 1.6,
            }}
          >
            {p.description}
          </Text>
          <Row>
            <Column>
              <Text style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: COLORS.textMuted, margin: 0 }}>
                Duration
              </Text>
              <Text style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: COLORS.ink, margin: "2px 0 0" }}>
                {p.duration}
              </Text>
            </Column>
            <Column>
              <Text style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: COLORS.textMuted, margin: 0 }}>
                Estimated cost
              </Text>
              <Text style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: COLORS.ink, margin: "2px 0 0" }}>
                {p.estimate}
              </Text>
            </Column>
          </Row>
        </Section>
      ))}

      {quotationLink ? (
        <CTA href={quotationLink}>Review full quotation (PDF)</CTA>
      ) : null}

      <BilingualSplit
        ko={<Body>회신 주시면 선호하는 병원에 맞춰 일정을 조율하겠습니다.</Body>}
        en={<Body>Reply with your preference and we'll arrange the schedule.</Body>}
      />
    </HealoEmail>
  );
}

// ============ 4. 비자 서류 요청 ============

export function VisaDocumentRequest({ patientName = "", visaType = "C-3-3", uploadLink = "" }) {
  const docs = [
    { ko: "여권 사본 (유효기간 6개월 이상)", en: "Passport copy (valid 6+ months)" },
    { ko: "여권용 사진 2매", en: "Two passport photos" },
    { ko: "현지 주치의 진단서 (영문)", en: "Medical certificate from your local doctor (English)" },
    { ko: "재직/재학 증명서 또는 재정 능력 증빙", en: "Employment/enrollment certificate OR proof of financial means" },
    { ko: "항공권 예약 확인서", en: "Flight reservation confirmation" },
  ];
  return (
    <HealoEmail preview={`Visa documents needed for ${visaType}`}>
      <Eyebrow>Visa preparation</Eyebrow>
      <Title>
        We need <span style={{ fontStyle: "italic", color: COLORS.goldDark }}>a few documents.</span>
      </Title>
      <Rule />
      <BilingualSplit
        ko={
          <Body>
            {patientName ? `${patientName} 님의` : "환자님의"} {visaType} 메디컬 비자 신청을
            위해 다음 서류가 필요합니다. 스캔본은 아래 링크에서 바로 업로드하실 수 있습니다.
          </Body>
        }
        en={
          <Body>
            To prepare your {visaType} medical visa application, we need the following documents.
            You can upload scans at the link below.
          </Body>
        }
      />

      {docs.map((doc, i) => (
        <Row key={i} style={{ borderBottom: `1px solid ${COLORS.border}`, padding: "10px 0" }}>
          <Column width={28}>
            <Text
              style={{
                fontFamily: "'Courier New', monospace",
                fontSize: 10,
                color: COLORS.goldDark,
                margin: 0,
              }}
            >
              {String(i + 1).padStart(2, "0")}
            </Text>
          </Column>
          <Column>
            <Text style={{ fontSize: 13, color: COLORS.ink, margin: 0, lineHeight: 1.5 }}>
              {doc.ko}
            </Text>
            <Text
              style={{
                fontFamily: "'Playfair Display', serif",
                fontStyle: "italic",
                fontSize: 12,
                color: COLORS.textMuted,
                margin: "2px 0 0",
              }}
            >
              {doc.en}
            </Text>
          </Column>
        </Row>
      ))}

      {uploadLink ? (
        <CTA href={uploadLink}>Upload documents</CTA>
      ) : (
        <CTA href={`mailto:${BRAND.email}?subject=Visa%20documents`}>Reply with attachments</CTA>
      )}
    </HealoEmail>
  );
}

// ============ 5. 치료 일정 확정 ============

export function TreatmentSchedule({
  patientName = "",
  hospitalName = "",
  coordinatorName = "",
  itinerary = [],
}) {
  return (
    <HealoEmail preview="Your treatment schedule is confirmed.">
      <Eyebrow>Schedule confirmed</Eyebrow>
      <Title>
        Everything is <span style={{ fontStyle: "italic", color: COLORS.goldDark }}>in place.</span>
      </Title>
      <Rule />
      <BilingualSplit
        ko={
          <Body>
            {patientName ? `${patientName} 님의` : "환자님의"} 치료 일정이 {hospitalName}와 함께 확정되었습니다.
            아래 일정을 확인해 주시고, 변경이 필요하시면 코디네이터 {coordinatorName}에게
            바로 연락 주세요.
          </Body>
        }
        en={
          <Body>
            Your treatment schedule with {hospitalName} is confirmed. Please review the
            itinerary below — contact your coordinator {coordinatorName} for any changes.
          </Body>
        }
      />

      {itinerary.map((it, i) => (
        <Section
          key={i}
          style={{ borderTop: `1px solid ${COLORS.goldTint}`, padding: "16px 0" }}
        >
          <Row>
            <Column width={90}>
              <Text
                style={{
                  fontFamily: "'Courier New', monospace",
                  fontSize: 10,
                  color: COLORS.goldDark,
                  letterSpacing: 1.5,
                  margin: 0,
                }}
              >
                {it.date}
              </Text>
              <Text
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 20,
                  color: COLORS.ink,
                  margin: "2px 0 0",
                }}
              >
                {it.time}
              </Text>
            </Column>
            <Column>
              <Text
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 17,
                  color: COLORS.ink,
                  margin: 0,
                }}
              >
                {it.event}
              </Text>
              {it.location ? (
                <Text
                  style={{
                    fontSize: 12,
                    color: COLORS.textMuted,
                    margin: "4px 0 0",
                  }}
                >
                  {it.location}
                </Text>
              ) : null}
              {it.note ? (
                <Text
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontStyle: "italic",
                    fontSize: 12,
                    color: COLORS.textMuted,
                    margin: "6px 0 0",
                  }}
                >
                  {it.note}
                </Text>
              ) : null}
            </Column>
          </Row>
        </Section>
      ))}

      <BilingualSplit
        ko={<Body>전체 일정은 PDF로 별도 첨부해드립니다. 공항 픽업 시간에 맞춰 입국 준비 부탁드립니다.</Body>}
        en={<Body>The full itinerary is attached as PDF. Please be ready for airport pickup on arrival.</Body>}
      />
    </HealoEmail>
  );
}

// ============ 6. 사후 관리 체크인 ============

export function PostTreatmentFollowup({ patientName = "", daysSinceDischarge = 30, feedbackLink = "" }) {
  return (
    <HealoEmail preview="Checking in on your recovery">
      <Eyebrow>Follow-up</Eyebrow>
      <Title italic>How are you?</Title>
      <Rule />
      <BilingualSplit
        ko={
          <>
            <Body>
              {patientName ? `${patientName} 님,` : "환자님,"} 퇴원 후 {daysSinceDischarge}일이
              지났습니다. 회복 잘 되고 계신가요?
            </Body>
            <Body>
              사후 관리는 치료의 연장선입니다. 증상·복약·컨디션을 공유해 주시면
              필요 시 담당 의료진과 재진을 조율해드립니다.
            </Body>
            <Body>
              1분 정도의 짧은 피드백도 부탁드립니다. HEALO가 다른 환자들을 더 잘
              도울 수 있게 됩니다.
            </Body>
          </>
        }
        en={
          <>
            <Body>
              Dear {patientName || "patient"}, it's been {daysSinceDischarge} days since
              discharge. How is your recovery?
            </Body>
            <Body>
              Post-treatment care is part of the journey. Share your symptoms, medications,
              and general condition — we'll coordinate a follow-up consultation if needed.
            </Body>
            <Body>
              We'd also appreciate a 1-minute feedback. It helps HEALO serve future
              patients better.
            </Body>
          </>
        }
      />
      {feedbackLink ? (
        <CTA href={feedbackLink}>Share 1-minute feedback</CTA>
      ) : (
        <CTA href={`mailto:${BRAND.email}?subject=Follow-up%20check-in`}>Reply with update</CTA>
      )}
    </HealoEmail>
  );
}
