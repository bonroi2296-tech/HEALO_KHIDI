"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import PageShell from "../../../components/healo/PageShell";
import { Eyebrow, Rule, ButtonGold, LinkArrow, Chip } from "../../../components/healo/Primitives";
import { useLang } from "@/lib/i18n/LangContext";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * 외국인환자 의료관광 필수 서류 체크리스트
 * 단계별로 분류 (사전상담 → 비자 → 치료 → 사후관리)
 */
const DOC_CHECKLIST = [
  {
    phase: "pre_consultation",
    phaseLabel: { en: "Pre-consultation", ko: "사전상담" },
    items: [
      { key: "medical_record", required: true, labels: { en: "Medical diagnosis (English)", ko: "영문 진단서" } },
      { key: "test_result", required: true, labels: { en: "Recent lab/test results", ko: "최근 검사 결과" } },
      { key: "imaging", required: false, labels: { en: "Medical imaging (CT/MRI/PET)", ko: "영상자료 (CT/MRI/PET)" } },
      { key: "prescription", required: false, labels: { en: "Current prescriptions", ko: "현재 복용 처방전" } },
    ],
  },
  {
    phase: "visa",
    phaseLabel: { en: "Visa preparation", ko: "비자 준비" },
    items: [
      { key: "passport", required: true, labels: { en: "Passport copy (valid 6+ months)", ko: "여권 사본 (유효기간 6개월+)" } },
      { key: "passport_photo", required: true, labels: { en: "Passport photos (2)", ko: "여권 사진 2매" } },
      { key: "invitation_letter", required: true, labels: { en: "Invitation letter (healwith issues)", ko: "초청장 (healwith 발급)" } },
      { key: "financial_proof", required: true, labels: { en: "Financial capability proof", ko: "재정증빙" } },
      { key: "flight_booking", required: false, labels: { en: "Flight reservation", ko: "항공권 예약" } },
    ],
  },
  {
    phase: "treatment",
    phaseLabel: { en: "Treatment", ko: "치료" },
    items: [
      { key: "admission_form", required: false, labels: { en: "Hospital admission forms", ko: "병원 입원 서류" } },
      { key: "surgical_consent", required: false, labels: { en: "Surgical/anesthesia consent", ko: "수술·마취 동의서" } },
      { key: "insurance_info", required: false, labels: { en: "Insurance documentation", ko: "보험 서류" } },
    ],
  },
  {
    phase: "post_care",
    phaseLabel: { en: "Post-treatment", ko: "사후관리" },
    items: [
      { key: "discharge_summary", required: false, labels: { en: "Discharge summary", ko: "퇴원 요약" } },
      { key: "followup_plan", required: false, labels: { en: "Follow-up care plan", ko: "추후 진료 계획서" } },
    ],
  },
];

const COPY = {
  en: {
    heroEyebrow: "Documents",
    heroTitle: "A single",
    heroTitleItalic: "document vault.",
    heroLede: "Every document we need for your care, tracked from request to approval.",
    loading: "Loading…",
    loginRequired: "Please sign in to manage your documents.",
    upload: "Upload",
    uploadFor: "Upload for",
    ready: "Ready",
    pending: "Pending",
    approved: "Approved",
    required: "Required",
    optional: "Optional",
    uploaded: "Uploaded",
    waiting: "Waiting",
    myUploads: "My uploads",
    noUploads: "No files uploaded yet.",
    maxSize: "Max 20MB · PDF / JPEG / PNG / WebP",
    drag: "Drag file or click to browse",
    cancel: "Cancel",
    linkedTo: "Linked to",
    noConsultation: "Please start a consultation first to link documents.",
    requestConsultation: "Request consultation",
    uploadedAt: "Uploaded",
  },
  ko: {
    heroEyebrow: "의료 문서",
    heroTitle: "하나의",
    heroTitleItalic: "문서 보관함.",
    heroLede: "진료에 필요한 모든 서류를 요청부터 승인까지 추적합니다.",
    loading: "불러오는 중…",
    loginRequired: "문서 관리를 위해 로그인해 주세요.",
    upload: "업로드",
    uploadFor: "업로드",
    ready: "제출됨",
    pending: "대기 중",
    approved: "승인됨",
    required: "필수",
    optional: "선택",
    uploaded: "업로드됨",
    waiting: "필요",
    myUploads: "업로드한 파일",
    noUploads: "업로드된 파일이 없습니다.",
    maxSize: "최대 20MB · PDF / JPEG / PNG / WebP",
    drag: "파일을 끌어오거나 클릭",
    cancel: "취소",
    linkedTo: "연결된 상담",
    noConsultation: "문서를 연결하려면 먼저 상담을 시작해 주세요.",
    requestConsultation: "상담 신청",
    uploadedAt: "업로드 시각",
  },
};

export default function DocumentsPremium() {
  const lang = useLang();
  const copy = COPY[lang] || COPY.en;

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploads, setUploads] = useState([]); // consultation_documents rows
  const [consultations, setConsultations] = useState([]);
  const [uploadingKey, setUploadingKey] = useState(null);
  const fileInputRef = useRef(null);
  const [pendingKey, setPendingKey] = useState(null);

  useEffect(() => {
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }
      setUser(session.user);

      // 민감 테이블(consultation_documents 등)은 service_role 전용 → 브라우저 직접
      // 쿼리는 RLS 로 빈 결과가 됨. 서버 API 경유로 조회. (과거엔 직접 쿼리라 항상 빈 목록)
      const res = await fetch("/api/patient/documents", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const result = await res.json().catch(() => ({}));
      if (result.ok) {
        setUploads(result.data || []);
        setConsultations(result.consultations || []);
      }
      setLoading(false);
    })();
  }, []);

  const getUploadForKey = (key) => uploads.find((u) => u.document_type === key);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file || !pendingKey) return;

    const latestConsultation = consultations[0];
    if (!latestConsultation) {
      alert(copy.noConsultation);
      return;
    }

    setUploadingKey(pendingKey);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("consultationId", latestConsultation.id);
      formData.append("docType", pendingKey);

      const supabase = createSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch("/api/patient/documents", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.ok && data.data) {
          setUploads((prev) => [data.data, ...prev]);
        } else {
          // 서버 API 로 재조회 (브라우저 직접 쿼리는 RLS 로 비어버림)
          const reload = await fetch("/api/patient/documents", {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          const fresh = await reload.json().catch(() => ({}));
          if (fresh.ok) setUploads(fresh.data || []);
        }
      }
    } catch (err) {
      console.error("upload error", err);
    } finally {
      setUploadingKey(null);
      setPendingKey(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (!loading && !user) {
    return (
      <PageShell
        current=""
        heroEyebrow={copy.heroEyebrow}
        heroTitle={copy.heroTitle}
        heroTitleItalic={copy.heroTitleItalic}
      >
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
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      <section style={{ padding: "64px 24px 96px" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          {loading ? (
            <p style={{ textAlign: "center", color: "var(--fg-on-light-3)", padding: 72, fontStyle: "italic" }}>
              {copy.loading}
            </p>
          ) : (
            DOC_CHECKLIST.map((phase) => (
              <div key={phase.phase} style={{ marginBottom: 56 }}>
                <Eyebrow>{phase.phaseLabel[lang] || phase.phaseLabel.en}</Eyebrow>
                <Rule />
                <div
                  style={{
                    marginTop: 24,
                    borderTop: "1px solid var(--gold-tint)",
                  }}
                >
                  {phase.items.map((item) => {
                    const uploaded = getUploadForKey(item.key);
                    return (
                      <DocRow
                        key={item.key}
                        item={item}
                        uploaded={uploaded}
                        lang={lang}
                        copy={copy}
                        uploading={uploadingKey === item.key}
                        onUpload={() => {
                          setPendingKey(item.key);
                          fileInputRef.current?.click();
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            ))
          )}

          {/* Legacy uploads list (files uploaded with different docType) */}
          {uploads.length > 0 && (
            <div style={{ marginTop: 48 }}>
              <Eyebrow tone="muted">{copy.myUploads}</Eyebrow>
              <div style={{ marginTop: 16, borderTop: "1px solid var(--cream-2)" }}>
                {uploads.map((u) => (
                  <div
                    key={u.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "12px 0",
                      borderBottom: "1px solid var(--cream-2)",
                      fontSize: 13,
                      fontFamily: "var(--font-sans)",
                      color: "var(--fg-on-light-2)",
                    }}
                  >
                    <span>{u.file_name || u.doc_type}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-on-light-4)" }}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {consultations.length === 0 && !loading && (
            <div
              style={{
                marginTop: 48,
                padding: "32px 40px",
                background: "var(--paper)",
                border: "1px solid var(--gold-tint)",
              }}
            >
              <Eyebrow tone="muted">Action required</Eyebrow>
              <p
                style={{
                  fontFamily: "var(--font-serif)",
                  fontStyle: "italic",
                  fontSize: 17,
                  color: "var(--fg-on-light-2)",
                  marginTop: 12,
                  marginBottom: 24,
                  lineHeight: 1.6,
                }}
              >
                {copy.noConsultation}
              </p>
              <Link href="/intake" style={{ textDecoration: "none" }}>
                <ButtonGold>{copy.requestConsultation}</ButtonGold>
              </Link>
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}

function DocRow({ item, uploaded, lang, copy, uploading, onUpload }) {
  const label = item.labels[lang] || item.labels.en;
  const isUploaded = !!uploaded;

  return (
    <div
      className="healo-doc-row"
      style={{
        display: "grid",
        gridTemplateColumns: "24px 1fr auto auto",
        gap: 16,
        alignItems: "center",
        padding: "20px 0",
        borderBottom: "1px solid var(--cream-2)",
      }}
    >
      {/* Status indicator */}
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: 16,
          border: `2px solid ${isUploaded ? "var(--gold-0)" : "var(--cream-2)"}`,
          background: isUploaded ? "var(--gold-0)" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isUploaded && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5l2 2 4-4" stroke="var(--ink-0)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      {/* Label */}
      <div>
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 17,
            fontWeight: 400,
            color: isUploaded ? "var(--fg-on-light-3)" : "var(--fg-on-light-1)",
            textDecoration: isUploaded ? "line-through" : "none",
            textDecorationColor: "var(--gold-0)",
            lineHeight: 1.4,
          }}
        >
          {label}
        </div>
        {uploaded?.file_name && (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--fg-on-light-4)",
              letterSpacing: "0.05em",
              marginTop: 4,
            }}
          >
            {uploaded.file_name} · {copy.uploadedAt} {new Date(uploaded.created_at).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Required/Optional chip */}
      <Chip tone={item.required ? "gold" : "cream"}>
        {item.required ? copy.required : copy.optional}
      </Chip>

      {/* Action */}
      {isUploaded ? (
        <Chip tone="success">{copy.uploaded}</Chip>
      ) : (
        <button
          onClick={onUpload}
          disabled={uploading}
          style={{
            background: "transparent",
            color: "var(--ink-0)",
            border: "1px solid var(--ink-0)",
            padding: "10px 16px",
            fontFamily: "var(--font-sans)",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            cursor: uploading ? "wait" : "pointer",
            opacity: uploading ? 0.5 : 1,
            minHeight: 44,
          }}
        >
          {uploading ? "…" : copy.upload}
        </button>
      )}

      <style jsx>{`
        @media (max-width: 640px) {
          :global(.healo-doc-row) {
            grid-template-columns: 24px 1fr auto !important;
            gap: 12px !important;
            padding: 18px 0 !important;
          }
          :global(.healo-doc-row > *:nth-child(3)) {
            grid-column: 2 / 3;
            grid-row: 2;
            justify-self: start;
          }
          :global(.healo-doc-row > *:nth-child(4)) {
            grid-column: 3 / 4;
            grid-row: 1 / 3;
            align-self: center;
          }
        }
      `}</style>
    </div>
  );
}
