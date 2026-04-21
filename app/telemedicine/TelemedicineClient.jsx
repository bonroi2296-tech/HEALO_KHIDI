"use client";

import Link from "next/link";
import { useLang } from "../../src/lib/i18n/LangContext";
import { Eyebrow, Rule, ButtonGold, FilmGrain } from "../../components/healo/Primitives";
import Nav from "../../components/healo/Nav";
import Footer from "../../components/healo/Footer";

const COPY = {
  en: {
    eyebrow: "Telemedicine · Cancer-care concierge",
    heroTitleA: "Meet a Korean specialist",
    heroTitleB: "before you board the plane.",
    heroLede:
      "No visa. No flight. Real-time video consultation with Korea's top cancer specialists — from Almaty, Astana, Moscow, or anywhere in the world. Decide whether to travel only after you know.",
    ctaPrimary: "Request consultation",
    ctaSecondary: "See how it works",
    stepsEyebrow: "How it works",
    stepsTitle: "From first click to consultation — under 48 hours.",
    steps: [
      {
        num: "01",
        title: "Request",
        body: "Share your diagnosis, past reports, and preferred language. Takes 10 minutes.",
      },
      {
        num: "02",
        title: "Match",
        body: "HEALO matches you with 2–3 specialists whose expertise fits your case.",
      },
      {
        num: "03",
        title: "Receive link",
        body: "We email you a secure meeting link (patient + interpreter + family can join).",
      },
      {
        num: "04",
        title: "Consult",
        body: "30–60 min video session with live interpretation and document review.",
      },
    ],
    featuresEyebrow: "What's included",
    features: [
      { icon: "🎥", title: "HD video + audio", body: "Ultra-low latency WebRTC. No app install." },
      { icon: "🗣️", title: "Live medical interpretation", body: "Korean ↔ Russian / Kazakh / English / Chinese." },
      { icon: "📄", title: "Document sharing", body: "MRI, CT, pathology reviewed live during the call." },
      { icon: "👨‍⚕️", title: "Cancer specialists", body: "Board-certified oncologists from top Korean hospitals." },
      { icon: "🔒", title: "Medical-grade security", body: "AES-256 end-to-end, PIPA §28-8 compliant." },
      { icon: "📧", title: "Guest access", body: "No account needed — patient joins by link only." },
      { icon: "🤝", title: "Coordinator follow-up", body: "Every session is followed by a written summary and next-step plan." },
      { icon: "💳", title: "Transparent pricing", body: "Flat consultation fee. No hidden charges. Travel only if you choose." },
    ],
    useCasesEyebrow: "When to use telemedicine",
    useCases: [
      {
        title: "Second opinion",
        body: "You have a diagnosis at home and want a Korean oncologist's view before committing to treatment.",
      },
      {
        title: "Pre-travel screening",
        body: "You're considering flying to Korea. Telemedicine validates that your case is treatable here — no wasted trip.",
      },
      {
        title: "Follow-up after surgery",
        body: "After surgery in Korea, post-care consultations can continue from home.",
      },
      {
        title: "Family consultation",
        body: "Patient + spouse + adult children can join the same call from different cities.",
      },
    ],
    faqEyebrow: "Frequently asked",
    faqs: [
      {
        q: "Do I need to download an app?",
        a: "No. Telemedicine works in any modern browser (Chrome, Safari, Edge) on PC, tablet, or mobile.",
      },
      {
        q: "What if my English / Korean is limited?",
        a: "A professional medical interpreter joins the call. We support Russian, Kazakh, English, and Chinese.",
      },
      {
        q: "Is this a replacement for in-person consultation?",
        a: "No. Telemedicine is for initial assessment, second opinions, and follow-ups. Surgery / treatment still requires travel.",
      },
      {
        q: "How do I share my medical records?",
        a: "Upload securely via link before the call. MRI, CT, pathology reports — the specialist reviews them live.",
      },
      {
        q: "Is this covered by insurance?",
        a: "Usually not by home-country insurance. The fee is paid directly. Some private plans reimburse — ask us.",
      },
      {
        q: "What about privacy?",
        a: "All traffic is AES-256 encrypted end-to-end. Records follow PIPA §28-8 (Korea) and GDPR-equivalent standards.",
      },
    ],
    ctaSection: {
      eyebrow: "Begin",
      title: "Your first consultation can be this week.",
      body: "No payment, no commitment to travel. Share your case and we reply within 24 hours.",
      btn: "Start now",
    },
  },
  ko: {
    eyebrow: "원격협진 · 암 치료 컨시어지",
    heroTitleA: "비행기 타기 전에",
    heroTitleB: "한국 전문의와 먼저 만나세요.",
    heroLede:
      "비자도, 항공편도 필요 없습니다. 알마티 · 아스타나 · 모스크바 어디에서든 한국 최고의 암 전문의와 실시간 영상 상담. 한국 방문은 확신이 든 뒤에 결정하세요.",
    ctaPrimary: "상담 신청",
    ctaSecondary: "진행 방식 보기",
    stepsEyebrow: "진행 방식",
    stepsTitle: "클릭 한 번에서 상담까지 — 48시간 이내.",
    steps: [
      { num: "01", title: "신청", body: "진단명, 기존 검사지, 희망 언어를 알려주세요. 10분." },
      { num: "02", title: "매칭", body: "HEALO 가 증례에 맞는 전문의 2~3명을 매칭." },
      { num: "03", title: "링크 전송", body: "보안 미팅 링크를 이메일로 전송 (환자 + 통역사 + 가족 입장 가능)." },
      { num: "04", title: "상담", body: "30~60분 영상 세션 + 실시간 통역 + 문서 검토." },
    ],
    featuresEyebrow: "포함된 기능",
    features: [
      { icon: "🎥", title: "HD 영상 + 음성", body: "초저지연 WebRTC. 앱 설치 불필요." },
      { icon: "🗣️", title: "실시간 의료 통역", body: "한 ↔ 러 / 카자흐 / 영 / 중." },
      { icon: "📄", title: "문서 공유", body: "MRI, CT, 조직검사 상담 중 실시간 판독." },
      { icon: "👨‍⚕️", title: "암 전문의", body: "한국 상급종합병원 전문의 (보드 인증)." },
      { icon: "🔒", title: "의료 등급 보안", body: "End-to-end AES-256, PIPA §28조의8 준수." },
      { icon: "📧", title: "계정 불필요", body: "링크 한 줄로 입장 — 환자는 가입 안 해도 됨." },
      { icon: "🤝", title: "사후 코디", body: "모든 상담 후 요약본 + 다음 단계 계획 발송." },
      { icon: "💳", title: "투명한 가격", body: "정액 상담료. 숨은 비용 없음. 한국 방문은 선택." },
    ],
    useCasesEyebrow: "이럴 때 원격협진",
    useCases: [
      {
        title: "세컨드 오피니언",
        body: "자국 병원 진단을 받았지만 치료를 시작하기 전 한국 전문의 의견을 듣고 싶을 때.",
      },
      {
        title: "방문 전 스크리닝",
        body: "한국 방문을 고민 중 — 원격협진으로 '치료 가능한 증례인지' 먼저 확인하고 방문 결정.",
      },
      {
        title: "수술 후 경과 확인",
        body: "한국에서 수술 후 귀국해도 경과 관리는 원격으로 지속.",
      },
      {
        title: "가족 합동 상담",
        body: "환자 + 배우자 + 성인 자녀가 각자 도시에서 같은 방에 입장.",
      },
    ],
    faqEyebrow: "자주 묻는 질문",
    faqs: [
      {
        q: "앱을 설치해야 하나요?",
        a: "아니요. PC · 태블릿 · 스마트폰의 최신 브라우저 (Chrome, Safari, Edge) 에서 작동.",
      },
      {
        q: "영어나 한국어가 어려워요.",
        a: "전문 의료 통역사가 상담에 동반. 러시아어 · 카자흐어 · 영어 · 중국어 지원.",
      },
      {
        q: "대면 진료를 대체하나요?",
        a: "아니요. 원격협진은 초기 평가 / 세컨드 오피니언 / 사후관리 용도. 수술/치료는 대면 필수.",
      },
      {
        q: "의료 기록은 어떻게 공유하나요?",
        a: "상담 전 보안 링크로 업로드. MRI · CT · 조직검사지를 상담 중 의사가 실시간 판독.",
      },
      {
        q: "보험 적용되나요?",
        a: "자국 보험은 대체로 불가. 원격협진료는 직접 결제. 일부 프라이빗 플랜은 환급됨 — 문의 바랍니다.",
      },
      {
        q: "개인정보는 어떻게 보호되나요?",
        a: "전 구간 AES-256 암호화. PIPA §28조의8 (한국) + GDPR 동등 기준 준수.",
      },
    ],
    ctaSection: {
      eyebrow: "지금 시작",
      title: "첫 상담을 이번 주에 받을 수 있습니다.",
      body: "결제 없음, 방문 의무 없음. 증례 공유 후 24시간 이내 회신.",
      btn: "지금 시작",
    },
  },
};

export default function TelemedicineClient() {
  const lang = useLang();
  const copy = COPY[lang] || COPY.en;

  return (
    <>
      <Nav current="telemedicine" />

      <main style={{ background: "var(--paper, #faf8f3)" }}>
        {/* HERO */}
        <section
          style={{
            background:
              "linear-gradient(180deg, var(--ink-0) 0%, var(--ink-0) 70%, #0f1a17 100%)",
            color: "var(--fg-on-dark-1, #f5f0e8)",
            padding: "120px 24px 96px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <FilmGrain />
          <div style={{ maxWidth: 1240, margin: "0 auto", position: "relative" }}>
            <div style={{ maxWidth: 900 }}>
              <Eyebrow tone="muted-dark">{copy.eyebrow}</Eyebrow>
              <h1
                style={{
                  fontFamily: "var(--font-serif)",
                  fontWeight: 400,
                  fontSize: "clamp(44px, 6.5vw, 96px)",
                  lineHeight: 1.04,
                  letterSpacing: "-0.015em",
                  margin: "32px 0 32px",
                }}
              >
                {copy.heroTitleA}
                <br />
                <span style={{ fontStyle: "italic", color: "var(--gold-0, #c8a96a)" }}>
                  {copy.heroTitleB}
                </span>
              </h1>
              <Rule width={64} color="gold" />
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "clamp(16px, 1.4vw, 20px)",
                  lineHeight: 1.65,
                  color: "var(--fg-on-dark-2, #c7c2b8)",
                  margin: "32px 0 48px",
                  maxWidth: 720,
                }}
              >
                {copy.heroLede}
              </p>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
                <Link href="/inquiry" style={{ textDecoration: "none" }}>
                  <ButtonGold>{copy.ctaPrimary}</ButtonGold>
                </Link>
                <Link
                  href="#how-it-works"
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 11,
                    letterSpacing: "0.24em",
                    textTransform: "uppercase",
                    color: "var(--fg-on-dark-2, #c7c2b8)",
                    textDecoration: "none",
                    borderBottom: "1px solid rgba(255,255,255,0.25)",
                    paddingBottom: 4,
                  }}
                >
                  {copy.ctaSecondary} →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* STEPS */}
        <section id="how-it-works" style={{ background: "var(--cream-0)", padding: "96px 24px" }}>
          <div style={{ maxWidth: 1240, margin: "0 auto" }}>
            <Eyebrow>{copy.stepsEyebrow}</Eyebrow>
            <h2
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 400,
                fontSize: "clamp(32px, 4.5vw, 60px)",
                lineHeight: 1.1,
                margin: "24px 0 64px",
                color: "var(--fg-on-light-1)",
                maxWidth: 900,
              }}
            >
              {copy.stepsTitle}
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 0,
                borderTop: "1px solid var(--gold-tint)",
              }}
            >
              {copy.steps.map((step, i) => (
                <div
                  key={i}
                  style={{
                    padding: "40px 24px 40px 0",
                    borderRight:
                      i < copy.steps.length - 1 ? "1px solid var(--cream-2)" : "none",
                    paddingLeft: i === 0 ? 0 : 24,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color: "var(--gold-2)",
                      marginBottom: 16,
                    }}
                  >
                    {step.num}
                  </div>
                  <h3
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 24,
                      fontWeight: 500,
                      margin: "0 0 12px",
                      color: "var(--fg-on-light-1)",
                    }}
                  >
                    {step.title}
                  </h3>
                  <p
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 14,
                      lineHeight: 1.7,
                      color: "var(--fg-on-light-2)",
                      margin: 0,
                    }}
                  >
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section style={{ background: "var(--paper)", padding: "96px 24px" }}>
          <div style={{ maxWidth: 1240, margin: "0 auto" }}>
            <Eyebrow>{copy.featuresEyebrow}</Eyebrow>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 32,
                marginTop: 48,
              }}
            >
              {copy.features.map((f, i) => (
                <div
                  key={i}
                  style={{
                    padding: "28px 24px",
                    background: "var(--cream-0)",
                    border: "1px solid var(--cream-2)",
                    borderLeft: "2px solid var(--gold-0)",
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
                  <h3
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 18,
                      fontWeight: 500,
                      margin: "0 0 8px",
                      color: "var(--fg-on-light-1)",
                    }}
                  >
                    {f.title}
                  </h3>
                  <p
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      lineHeight: 1.6,
                      color: "var(--fg-on-light-2)",
                      margin: 0,
                    }}
                  >
                    {f.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* USE CASES */}
        <section style={{ background: "var(--cream-0)", padding: "96px 24px" }}>
          <div style={{ maxWidth: 1240, margin: "0 auto" }}>
            <Eyebrow>{copy.useCasesEyebrow}</Eyebrow>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: 40,
                marginTop: 48,
              }}
            >
              {copy.useCases.map((uc, i) => (
                <div key={i} style={{ paddingTop: 24, borderTop: "1px solid var(--gold-tint)" }}>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      color: "var(--gold-2)",
                      marginBottom: 12,
                      letterSpacing: "0.24em",
                      textTransform: "uppercase",
                    }}
                  >
                    case 0{i + 1}
                  </div>
                  <h3
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 22,
                      fontWeight: 500,
                      margin: "0 0 12px",
                      color: "var(--fg-on-light-1)",
                    }}
                  >
                    {uc.title}
                  </h3>
                  <p
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 14,
                      lineHeight: 1.7,
                      color: "var(--fg-on-light-2)",
                      margin: 0,
                    }}
                  >
                    {uc.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section style={{ background: "var(--paper)", padding: "96px 24px" }}>
          <div style={{ maxWidth: 820, margin: "0 auto" }}>
            <Eyebrow>{copy.faqEyebrow}</Eyebrow>
            <div style={{ marginTop: 48 }}>
              {copy.faqs.map((faq, i) => (
                <details
                  key={i}
                  style={{
                    borderBottom: "1px solid var(--cream-2)",
                    padding: "24px 0",
                  }}
                >
                  <summary
                    style={{
                      cursor: "pointer",
                      fontFamily: "var(--font-serif)",
                      fontSize: 18,
                      color: "var(--fg-on-light-1)",
                      listStyle: "none",
                    }}
                  >
                    {faq.q}
                  </summary>
                  <p
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 14,
                      lineHeight: 1.7,
                      color: "var(--fg-on-light-2)",
                      margin: "16px 0 0",
                    }}
                  >
                    {faq.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section
          style={{
            background: "var(--ink-0)",
            color: "var(--fg-on-dark-1)",
            padding: "120px 24px",
            textAlign: "center",
          }}
        >
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <Eyebrow tone="muted-dark">{copy.ctaSection.eyebrow}</Eyebrow>
            <h2
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 400,
                fontSize: "clamp(36px, 5vw, 60px)",
                lineHeight: 1.1,
                margin: "24px 0 24px",
              }}
            >
              {copy.ctaSection.title}
            </h2>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 16,
                lineHeight: 1.65,
                color: "var(--fg-on-dark-2)",
                margin: "0 0 40px",
              }}
            >
              {copy.ctaSection.body}
            </p>
            <Link href="/inquiry" style={{ textDecoration: "none" }}>
              <ButtonGold>{copy.ctaSection.btn}</ButtonGold>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
