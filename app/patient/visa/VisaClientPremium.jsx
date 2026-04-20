"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLang } from "../../../src/lib/i18n/LangContext";
import {
  Eyebrow,
  Rule,
  ButtonGold,
  LinkArrow,
  FilmGrain,
} from "../../../components/healo/Primitives";
import Nav from "../../../components/healo/Nav";
import Footer from "../../../components/healo/Footer";

const NATIONALITIES = [
  { value: "ru", label: { ko: "러시아", en: "Russia", ru: "Россия", zh: "俄罗斯", ja: "ロシア", kz: "Ресей" } },
  { value: "kz", label: { ko: "카자흐스탄", en: "Kazakhstan", ru: "Казахстан", zh: "哈萨克斯坦", ja: "カザフスタン", kz: "Қазақстан" } },
  { value: "mn", label: { ko: "몽골", en: "Mongolia", ru: "Монголия", zh: "蒙古", ja: "モンゴル", kz: "Моңғолия" } },
  { value: "zh", label: { ko: "중국", en: "China", ru: "Китай", zh: "中国", ja: "中国", kz: "Қытай" } },
  { value: "ja", label: { ko: "일본", en: "Japan", ru: "Япония", zh: "日本", ja: "日本", kz: "Жапония" } },
  { value: "en", label: { ko: "기타", en: "Other", ru: "Другое", zh: "其他", ja: "その他", kz: "Басқа" } },
];

const COPY = {
  en: {
    eyebrow: "Visa & stay",
    titleA: "We prepare every",
    titleB: "document.",
    titleC: "You prepare for recovery.",
    lede:
      "Your coordinator handles invitation letters, visa applications, and arrival logistics. The information below is a reference guide.",
    nationality: "Nationality",
    duration: "Expected treatment duration",
    days: "days",
    recommended: "Recommended",
    alternative: "Alternative",
    maxStay: "Max stay",
    processing: "Processing time",
    fee: "Fee",
    documents: "Required documents",
    note: "Note",
    checkedItem: "Ready",
    notCheckedItem: "Still needed",
    requestConsult: "Request consultation",
    steps: [
      { num: "01", title: "Inquiry", body: "Share your diagnosis and planned treatment with HEALO." },
      { num: "02", title: "Invitation", body: "HEALO issues the invitation letter and medical confirmation." },
      { num: "03", title: "Application", body: "Submit visa application to the Korean consulate in your country." },
      { num: "04", title: "Arrival", body: "Your coordinator meets you at the airport. Treatment begins." },
    ],
    loading: "Preparing your visa information…",
  },
  ko: {
    eyebrow: "비자 및 체류",
    titleA: "서류는 저희가",
    titleB: "준비합니다.",
    titleC: "당신은 회복만 준비하세요.",
    lede:
      "전담 코디네이터가 초청장, 비자 신청, 입국 로지스틱스를 책임집니다. 아래는 참고 가이드입니다.",
    nationality: "국적",
    duration: "예상 치료 기간",
    days: "일",
    recommended: "추천 비자",
    alternative: "대안 비자",
    maxStay: "최대 체류",
    processing: "처리 기간",
    fee: "수수료",
    documents: "필요 서류",
    note: "참고",
    checkedItem: "준비됨",
    notCheckedItem: "아직 필요",
    requestConsult: "상담 신청",
    steps: [
      { num: "01", title: "문의", body: "진단과 예정된 치료를 HEALO에 공유합니다." },
      { num: "02", title: "초청장", body: "HEALO가 초청장과 의료 확인서를 발급합니다." },
      { num: "03", title: "비자 신청", body: "현지 주한국 대사관/영사관에 비자를 신청합니다." },
      { num: "04", title: "입국", body: "전담 코디네이터가 공항에서 영접하고, 치료가 시작됩니다." },
    ],
    loading: "비자 정보 준비 중…",
  },
};

export default function VisaClientPremium() {
  const lang = useLang();
  const copy = COPY[lang] || COPY.en;
  const l = (obj) => obj?.[lang] || obj?.en || "";

  const [nationality, setNationality] = useState("ru");
  const [duration, setDuration] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      nationality,
      duration: String(duration),
      lang,
    });
    fetch(`/api/khidi/visa?${params}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) setData(res);
        else setData(null);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [nationality, duration, lang]);

  return (
    <div style={{ background: "var(--cream-0)", minHeight: "100vh" }}>
      <Nav current="visa" />

      {/* HERO */}
      <section style={{ background: "var(--paper)", padding: "96px 24px 72px" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <Eyebrow>{copy.eyebrow}</Eyebrow>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(44px, 6vw, 88px)",
              lineHeight: 1.05,
              letterSpacing: "-0.015em",
              margin: "24px 0 32px",
              color: "var(--fg-on-light-1)",
              maxWidth: 1000,
            }}
          >
            {copy.titleA} {copy.titleB}
            <br />
            <span style={{ fontStyle: "italic", color: "var(--gold-2)" }}>{copy.titleC}</span>
          </h1>
          <Rule width={64} />
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 300,
              fontSize: 17,
              lineHeight: 1.75,
              color: "var(--fg-on-light-2)",
              marginTop: 24,
              maxWidth: 680,
            }}
          >
            {copy.lede}
          </p>
        </div>
      </section>

      {/* Configurator */}
      <section style={{ padding: "64px 24px", background: "var(--cream-0)", borderTop: "1px solid var(--gold-tint)" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <div
            className="healo-visa-config"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 48,
              marginBottom: 48,
            }}
          >
            <label style={{ display: "block" }}>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: "0.24em",
                  textTransform: "uppercase",
                  color: "var(--fg-on-light-3)",
                  marginBottom: 10,
                }}
              >
                {copy.nationality}
              </div>
              <select
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                style={{
                  width: "100%",
                  border: 0,
                  borderBottom: "1px solid var(--fg-on-light-4)",
                  padding: "12px 0",
                  fontFamily: "var(--font-serif)",
                  fontSize: 20,
                  fontWeight: 400,
                  background: "transparent",
                  outline: "none",
                  color: "var(--fg-on-light-1)",
                  appearance: "none",
                }}
              >
                {NATIONALITIES.map((n) => (
                  <option key={n.value} value={n.value}>
                    {l(n.label)}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "block" }}>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: "0.24em",
                  textTransform: "uppercase",
                  color: "var(--fg-on-light-3)",
                  marginBottom: 10,
                }}
              >
                {copy.duration} · <span style={{ color: "var(--gold-2)" }}>{duration} {copy.days}</span>
              </div>
              <input
                type="range"
                min={1}
                max={365}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                style={{
                  width: "100%",
                  accentColor: "var(--gold-0)",
                }}
              />
            </label>
          </div>

          {loading ? (
            <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--fg-on-light-3)" }}>
              {copy.loading}
            </p>
          ) : !data ? (
            <div
              style={{
                padding: 32,
                border: "1px solid var(--cream-2)",
                background: "var(--paper)",
                textAlign: "center",
              }}
            >
              <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--fg-on-light-3)" }}>
                —
              </p>
            </div>
          ) : (
            <div
              className="healo-visa-cards"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 24,
              }}
            >
              <VisaCard visa={data.primary} tone={copy.recommended} copy={copy} primary />
              {data.alternative && (
                <VisaCard visa={data.alternative} tone={copy.alternative} copy={copy} />
              )}
            </div>
          )}
        </div>
      </section>

      {/* Process timeline */}
      <section
        style={{
          position: "relative",
          background: "var(--ink-0)",
          color: "var(--fg-on-dark-1)",
          padding: "96px 24px",
          overflow: "hidden",
          borderTop: "1px solid var(--gold-tint)",
        }}
      >
        <FilmGrain />
        <div style={{ position: "relative", maxWidth: 1240, margin: "0 auto" }}>
          <Eyebrow>Process</Eyebrow>
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(36px, 5vw, 64px)",
              lineHeight: 1.1,
              margin: "24px 0 64px",
              maxWidth: 900,
            }}
          >
            {lang === "ko" ? "네 단계, 신중한 속도로." : "Four steps, carefully paced."}
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 32,
              borderTop: "1px solid var(--gold-tint)",
              paddingTop: 32,
            }}
          >
            {copy.steps.map((step) => (
              <div key={step.num}>
                <div
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 64,
                    fontWeight: 400,
                    color: "var(--gold-0)",
                    lineHeight: 1,
                    marginBottom: 16,
                  }}
                >
                  {step.num}
                </div>
                <h3
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 22,
                    fontWeight: 500,
                    color: "var(--fg-on-dark-1)",
                    margin: "0 0 8px",
                  }}
                >
                  {step.title}
                </h3>
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 14,
                    lineHeight: 1.7,
                    color: "var(--fg-on-dark-2)",
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

      {/* CTA */}
      <section style={{ background: "var(--paper)", padding: "96px 24px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
          <Eyebrow>Begin</Eyebrow>
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(32px, 4.5vw, 56px)",
              lineHeight: 1.1,
              margin: "24px 0 16px",
              color: "var(--fg-on-light-1)",
            }}
          >
            {lang === "ko" ? "코디네이터가 서류 전체를 준비합니다." : "Your coordinator handles all paperwork."}
          </h2>
          <Rule width={64} style={{ margin: "24px auto" }} />
          <Link href="/intake" style={{ textDecoration: "none", display: "inline-block", marginTop: 24 }}>
            <ButtonGold>{copy.requestConsult}</ButtonGold>
          </Link>
        </div>
      </section>

      <Footer />

      <style jsx>{`
        @media (max-width: 768px) {
          :global(.healo-visa-config),
          :global(.healo-visa-cards) {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
        }
      `}</style>
    </div>
  );
}

function VisaCard({ visa, tone, copy, primary }) {
  const [checks, setChecks] = useState({});
  if (!visa) return null;

  return (
    <article
      style={{
        position: "relative",
        background: primary ? "var(--paper)" : "var(--cream-0)",
        border: `1px solid ${primary ? "var(--gold-0)" : "var(--cream-2)"}`,
        padding: 32,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <Eyebrow>{tone}</Eyebrow>
          <h3
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 500,
              fontSize: 32,
              lineHeight: 1.1,
              color: "var(--fg-on-light-1)",
              margin: "8px 0 0",
            }}
          >
            {visa.visaName}
          </h3>
        </div>
      </div>

      {visa.description && (
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 14,
            color: "var(--fg-on-light-3)",
            lineHeight: 1.7,
            marginBottom: 24,
          }}
        >
          {visa.description}
        </p>
      )}

      {/* Key facts */}
      <dl
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 16,
          margin: "0 0 32px",
          paddingTop: 16,
          borderTop: "1px solid var(--gold-tint)",
        }}
      >
        {[
          [copy.maxStay, `${visa.maxStay || "—"} ${copy.days}`],
          [copy.processing, visa.processingTime || "—"],
          [copy.fee, visa.fee || "—"],
        ].map(([k, v], i) => (
          <div key={i}>
            <dt
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 9,
                fontWeight: 500,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: "var(--fg-on-light-3)",
                marginBottom: 6,
              }}
            >
              {k}
            </dt>
            <dd
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 18,
                fontWeight: 500,
                color: "var(--fg-on-light-1)",
                margin: 0,
              }}
            >
              {v}
            </dd>
          </div>
        ))}
      </dl>

      {/* Documents checklist */}
      {visa.documents?.length > 0 && (
        <div>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "var(--fg-on-light-3)",
              marginBottom: 12,
            }}
          >
            {copy.documents}
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {visa.documents.map((doc, i) => {
              const docId = doc.id || `doc-${i}`;
              const checked = !!checks[docId];
              const docLabel = typeof doc === "string" ? doc : doc.label || doc.name || "";
              return (
                <li
                  key={docId}
                  style={{
                    padding: "12px 0",
                    borderBottom: "1px solid var(--cream-2)",
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                    cursor: "pointer",
                  }}
                  onClick={() => setChecks((p) => ({ ...p, [docId]: !p[docId] }))}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      letterSpacing: "0.1em",
                      color: checked ? "var(--gold-0)" : "var(--fg-on-light-4)",
                      marginTop: 2,
                      minWidth: 20,
                    }}
                  >
                    {checked ? "✓" : String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      lineHeight: 1.6,
                      color: checked ? "var(--fg-on-light-3)" : "var(--fg-on-light-1)",
                      textDecoration: checked ? "line-through" : "none",
                      textDecorationColor: "var(--gold-0)",
                    }}
                  >
                    {docLabel}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </article>
  );
}
