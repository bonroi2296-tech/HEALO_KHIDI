"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageShell from "../../../components/healo/PageShell";
import { Eyebrow, Rule, ButtonGold, LinkArrow, Chip } from "../../../components/healo/Primitives";
import { useLang } from "../../../src/lib/i18n/LangContext";
import { createSupabaseBrowserClient } from "../../../src/lib/supabase/browser";

const COPY = {
  en: {
    heroEyebrow: "Billing",
    heroTitle: "Transparent",
    heroTitleItalic: "invoicing.",
    heroLede:
      "Your medical care costs are settled directly with the hospital. HEALO's concierge fee and any shared services are invoiced here.",
    loginRequired: "Please sign in to view your invoices.",
    invoices: "Your invoices",
    noInvoices: "No invoices issued yet.",
    downloadQuotation: "Download quotation",
    quotationExplainer:
      "Click below to generate a sample medical quotation PDF. In production, this is issued by your coordinator after hospital matching.",
    paymentInstructions: "Payment instructions",
    stage: "Stage",
    due: "Due",
    paid: "Paid",
    total: "Total",
    wireInfo: "Bank wire transfer",
    wireNote:
      "For international wire transfers, use the following BONROI account. Include your inquiry number in the reference field.",
    bankName: "Bank",
    accountHolder: "Account holder",
    accountNumber: "Account number",
    swift: "SWIFT / BIC",
    bankAddress: "Bank address",
    reference: "Reference (required)",
    alternativePayment: "Alternative payment methods",
    cardNote:
      "Credit card (Visa/Mastercard/UnionPay) and PayPal are available via a secure payment link. Your coordinator will send you the link when it's time to pay.",
    hospitalNote: "Hospital fees",
    hospitalNoteBody:
      "Major hospital costs (surgery, drugs, hospitalization) are paid directly to the hospital at discharge — not to HEALO. Hospitals accept cash (KRW), major credit cards, and wire transfer in KRW.",
    contactCoordinator: "Need help? Contact your coordinator.",
  },
  ko: {
    heroEyebrow: "청구 및 결제",
    heroTitle: "투명한",
    heroTitleItalic: "청구서.",
    heroLede:
      "진료비는 병원과 직접 정산하시고, HEALO의 코디네이션 수수료 및 부대 서비스 비용은 여기서 청구됩니다.",
    loginRequired: "청구서 확인을 위해 로그인해 주세요.",
    invoices: "청구서 내역",
    noInvoices: "발행된 청구서가 없습니다.",
    downloadQuotation: "견적서 다운로드",
    quotationExplainer:
      "아래에서 샘플 진료비 견적서를 다운로드할 수 있습니다. 실제로는 병원 매칭 후 코디네이터가 발급합니다.",
    paymentInstructions: "결제 방법",
    stage: "단계",
    due: "납부 기한",
    paid: "납부 완료",
    total: "합계",
    wireInfo: "은행 송금",
    wireNote:
      "국제 송금을 통해 BONROI 계좌로 송금해 주세요. 송금 시 참조란에 문의 번호를 기입해 주세요.",
    bankName: "은행",
    accountHolder: "예금주",
    accountNumber: "계좌번호",
    swift: "SWIFT / BIC",
    bankAddress: "은행 주소",
    reference: "참조란 (필수)",
    alternativePayment: "다른 결제 방법",
    cardNote:
      "Visa/Mastercard/UnionPay 신용카드 및 PayPal은 보안 결제 링크를 통해 사용 가능합니다. 결제 시점에 코디네이터가 링크를 보내드립니다.",
    hospitalNote: "병원 진료비",
    hospitalNoteBody:
      "수술·약제·입원 등 주요 진료비는 퇴원 시 병원에 직접 납부합니다 (HEALO 경유 아님). 병원에서는 현금(KRW), 주요 신용카드, KRW 원화 송금을 받습니다.",
    contactCoordinator: "도움이 필요하시면 코디네이터에게 문의하세요.",
  },
};

// 송금 계좌 정보 (사업자 확정 후 변경)
const BANK_INFO = {
  bankName: "[Bank name to be confirmed]",
  accountHolder: "BONROI (JUYOUNG KANG)",
  accountNumber: "[Account number — TBC]",
  swift: "[SWIFT/BIC — TBC]",
  bankAddress: "[Bank branch address — TBC]",
};

export default function BillingClient() {
  const lang = useLang();
  const copy = COPY[lang] || COPY.en;

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [genLoading, setGenLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }
      setUser(session.user);

      // Invoice 데이터는 coordinator_responses의 quoted_price 필드로 proxy
      const { data } = await supabase
        .from("coordinator_responses")
        .select("*")
        .not("quoted_price", "is", null)
        .order("created_at", { ascending: false });
      setInvoices(data || []);
      setLoading(false);
    })();
  }, []);

  async function downloadQuotationSample() {
    setGenLoading(true);
    try {
      const res = await fetch(`/api/pdf/quotation?lang=${lang}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      }
    } finally {
      setGenLoading(false);
    }
  }

  if (!loading && !user) {
    return (
      <PageShell current="" heroEyebrow={copy.heroEyebrow} heroTitle={copy.heroTitle} heroTitleItalic={copy.heroTitleItalic}>
        <div style={{ padding: "72px 24px", textAlign: "center" }}>
          <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--fg-on-light-3)", marginBottom: 24 }}>
            {copy.loginRequired}
          </p>
          <Link href="/login" style={{ textDecoration: "none" }}>
            <ButtonGold>Sign in</ButtonGold>
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      current=""
      heroEyebrow={copy.heroEyebrow}
      heroTitle={copy.heroTitle}
      heroTitleItalic={copy.heroTitleItalic}
      heroLede={copy.heroLede}
    >
      <section style={{ padding: "48px 24px 96px" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          {/* Quotation section */}
          <div style={{ marginBottom: 64 }}>
            <Eyebrow>Quotation</Eyebrow>
            <Rule />
            <p
              style={{
                marginTop: 24,
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: 18,
                lineHeight: 1.65,
                color: "var(--fg-on-light-2)",
                maxWidth: 720,
              }}
            >
              {copy.quotationExplainer}
            </p>
            <div style={{ marginTop: 24 }}>
              <button
                onClick={downloadQuotationSample}
                disabled={genLoading}
                style={{
                  background: "var(--ink-0)",
                  color: "var(--cream-0)",
                  border: 0,
                  padding: "14px 26px",
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  fontWeight: 600,
                  fontSize: 11,
                  letterSpacing: "0.24em",
                  textTransform: "uppercase",
                  opacity: genLoading ? 0.5 : 1,
                }}
              >
                {genLoading ? "…" : copy.downloadQuotation}
              </button>
            </div>
          </div>

          {/* Invoices */}
          <div style={{ marginBottom: 64 }}>
            <Eyebrow>{copy.invoices}</Eyebrow>
            <Rule />
            {loading ? (
              <p style={{ padding: "32px 0", fontStyle: "italic", color: "var(--fg-on-light-3)", fontFamily: "var(--font-serif)" }}>
                —
              </p>
            ) : invoices.length === 0 ? (
              <p
                style={{
                  padding: "32px 0",
                  fontStyle: "italic",
                  color: "var(--fg-on-light-3)",
                  fontFamily: "var(--font-serif)",
                  fontSize: 17,
                }}
              >
                {copy.noInvoices}
              </p>
            ) : (
              <div style={{ marginTop: 24, borderTop: "1px solid var(--gold-tint)" }}>
                {invoices.map((inv) => (
                  <div
                    key={inv.id}
                    style={{
                      padding: "20px 0",
                      borderBottom: "1px solid var(--cream-2)",
                      display: "grid",
                      gridTemplateColumns: "auto 1fr auto auto",
                      gap: 24,
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        color: "var(--fg-on-light-3)",
                        letterSpacing: "0.1em",
                        minWidth: 90,
                      }}
                    >
                      {new Date(inv.created_at).toLocaleDateString()}
                    </div>
                    <div>
                      <div
                        style={{
                          fontFamily: "var(--font-serif)",
                          fontSize: 17,
                          fontWeight: 500,
                          color: "var(--fg-on-light-1)",
                        }}
                      >
                        {inv.response_type === "quotation" ? "Quotation" : inv.response_type}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--fg-on-light-3)", marginTop: 2 }}>
                        Inquiry #{inv.inquiry_id}
                      </div>
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: 20,
                        fontWeight: 500,
                        color: "var(--fg-on-light-1)",
                      }}
                    >
                      {inv.quoted_price
                        ? `${Number(inv.quoted_price).toLocaleString()} ${inv.currency || "KRW"}`
                        : "—"}
                    </div>
                    <Chip tone={inv.status === "paid" ? "success" : inv.is_final ? "gold" : "cream"}>
                      {inv.status || (inv.is_final ? "Final" : "Draft")}
                    </Chip>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Hospital fees notice */}
          <div
            style={{
              padding: "32px 40px",
              background: "var(--paper)",
              borderLeft: "2px solid var(--gold-0)",
              marginBottom: 56,
            }}
          >
            <Eyebrow tone="muted">{copy.hospitalNote}</Eyebrow>
            <p
              style={{
                marginTop: 12,
                fontFamily: "var(--font-sans)",
                fontSize: 15,
                lineHeight: 1.7,
                color: "var(--fg-on-light-2)",
              }}
            >
              {copy.hospitalNoteBody}
            </p>
          </div>

          {/* Payment instructions */}
          <div>
            <Eyebrow>{copy.paymentInstructions}</Eyebrow>
            <Rule />

            {/* Wire transfer */}
            <div style={{ marginTop: 40 }}>
              <h3
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 24,
                  fontWeight: 500,
                  color: "var(--fg-on-light-1)",
                  margin: "0 0 12px",
                }}
              >
                {copy.wireInfo}
              </h3>
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 14,
                  lineHeight: 1.7,
                  color: "var(--fg-on-light-2)",
                  marginBottom: 24,
                  maxWidth: 720,
                }}
              >
                {copy.wireNote}
              </p>
              <div
                style={{
                  background: "var(--ink-0)",
                  color: "var(--fg-on-dark-1)",
                  padding: "28px 32px",
                  maxWidth: 640,
                }}
              >
                <BankRow label={copy.bankName} value={BANK_INFO.bankName} />
                <BankRow label={copy.accountHolder} value={BANK_INFO.accountHolder} />
                <BankRow label={copy.accountNumber} value={BANK_INFO.accountNumber} mono />
                <BankRow label={copy.swift} value={BANK_INFO.swift} mono />
                <BankRow label={copy.bankAddress} value={BANK_INFO.bankAddress} />
              </div>
            </div>

            {/* Alternative */}
            <div style={{ marginTop: 56 }}>
              <h3
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 24,
                  fontWeight: 500,
                  color: "var(--fg-on-light-1)",
                  margin: "0 0 12px",
                }}
              >
                {copy.alternativePayment}
              </h3>
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 14,
                  lineHeight: 1.7,
                  color: "var(--fg-on-light-2)",
                  maxWidth: 720,
                }}
              >
                {copy.cardNote}
              </p>
            </div>

            {/* Contact coordinator */}
            <div style={{ marginTop: 56, textAlign: "center" }}>
              <Link href="/patient/messages" style={{ textDecoration: "none" }}>
                <LinkArrow>{copy.contactCoordinator} →</LinkArrow>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function BankRow({ label, value, mono }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "160px 1fr",
        gap: 24,
        padding: "10px 0",
        borderBottom: "1px solid var(--ink-3)",
        alignItems: "center",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          color: "var(--fg-on-dark-3)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: mono ? "var(--font-mono)" : "var(--font-serif)",
          fontSize: mono ? 14 : 17,
          color: "var(--gold-0)",
          wordBreak: "break-all",
        }}
      >
        {value}
      </div>
    </div>
  );
}
