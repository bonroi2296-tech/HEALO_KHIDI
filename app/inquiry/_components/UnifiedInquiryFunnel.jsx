"use client";

/**
 * UnifiedInquiryFunnel — 4개 폼 통폐합 단일 funnel
 * Phase: step1 → step1-success → step2 → step2-success → done
 *
 * Step 1 (1분, 6필드): 성함·국적·연락수단·선호언어·암종·메모
 * Step 2 (3분, 6필드): 병기·진단일·치료상태·의료문서·입국시기·우선순위
 */

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check, ChevronRight, ChevronLeft, UploadCloud, X, File,
  AlertCircle, Loader2, Shield, Clock, Copy, ExternalLink,
  Bot, MessageCircle, ClipboardList, Headset, BadgeCheck, HelpCircle
} from "lucide-react";
import OrganIcon from "../../_components/OrganIcon";
import { uploadAttachment } from "@/lib/uploadAttachment";
import { describeUpload } from "@/lib/uploadPolicy";
// 인테이크 선택지 라벨(6개국어)·값은 코디 상세화면과 공용 — 단일 SoR.
import { CANCER_TYPES, STAGES, TREATMENT_STATES, TRAVEL_TIMING, PRIORITIES, optLabel } from "@/lib/inquiry/intakeLabels";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/i18n/LangContext";
import { localeHref } from "@/lib/i18n/config";
import { getArrival } from "@/lib/inquiry/arrival";
import { event, GA_EVENTS } from "@/lib/ga";
import { SITE_INFO } from "@/lib/siteSettings";
import { ThreadChat } from "../ThreadChat";
import GoogleInAppNotice from "@/components/auth/GoogleInAppNotice";
import { isNativeApp, hasNativeGoogleSignIn } from "@/lib/isNativeApp";
import { withLang } from "@/lib/i18n/guestLinkLang";

// ─── 상수 ───────────────────────────────────────────────────────────
const NATIONALITIES = [
  { value: "KZ", label: "Kazakhstan / Казахстан" },
  { value: "RU", label: "Russia / Россия" },
  { value: "UZ", label: "Uzbekistan / Ўзбекистон" },
  { value: "KG", label: "Kyrgyzstan / Кыргызстан" },
  { value: "MN", label: "Mongolia / Монгол" },
  { value: "CN", label: "China / 中国" },
  { value: "JP", label: "Japan / 日本" },
  { value: "KR", label: "Korea / 한국" },
  { value: "OTHER", label: "Other / 기타" },
];

// 국가번호 — 국적≠거주국이라 자동 매핑 안 함. 본인이 선택. 목록에 없으면 'OTHER'로 직접 입력.
// 라벨은 국가명 먼저(브라우저 타이핑 자동완성용). 타겟·CIS 우선, 그 외 거주 많은 나라.
const DIAL_CODES = [
  // CIS · 중앙아시아 (타겟)
  { code: "+7", label: "Kazakhstan +7" },
  { code: "+7", label: "Russia +7" },
  { code: "+998", label: "Uzbekistan +998" },
  { code: "+996", label: "Kyrgyzstan +996" },
  { code: "+992", label: "Tajikistan +992" },
  { code: "+993", label: "Turkmenistan +993" },
  { code: "+994", label: "Azerbaijan +994" },
  { code: "+374", label: "Armenia +374" },
  { code: "+995", label: "Georgia +995" },
  { code: "+380", label: "Ukraine +380" },
  { code: "+375", label: "Belarus +375" },
  { code: "+976", label: "Mongolia +976" },
  // 동아시아
  { code: "+82", label: "Korea +82" },
  { code: "+86", label: "China +86" },
  { code: "+81", label: "Japan +81" },
  { code: "+84", label: "Vietnam +84" },
  { code: "+66", label: "Thailand +66" },
  // 중동·서아시아 (거주 많음)
  { code: "+90", label: "Turkey +90" },
  { code: "+971", label: "UAE +971" },
  { code: "+966", label: "Saudi Arabia +966" },
  { code: "+98", label: "Iran +98" },
  { code: "+91", label: "India +91" },
  // 유럽·북미 (거주 많음)
  { code: "+49", label: "Germany +49" },
  { code: "+44", label: "United Kingdom +44" },
  { code: "+33", label: "France +33" },
  { code: "+39", label: "Italy +39" },
  { code: "+34", label: "Spain +34" },
  { code: "+48", label: "Poland +48" },
  { code: "+1", label: "USA / Canada +1" },
  // 그 외 — 번호에 +국가코드 직접 입력. 이 목록의 label 은 전 언어 공통(영문 국가명 관례)이라
  // 한국어를 쓰면 ru/kz 사용자 화면에 한국어가 새어 나감 — 영문 통일.
  { code: "OTHER", label: "Other (type +code before number)" },
];

// 순서 = 핵심 타겟 시장 우선(러시아·카자흐 먼저, 한국어 마지막).
const PREFERRED_LANGUAGES = [
  { value: "ru", label: "Русский" },
  { value: "kz", label: "Қазақша" },
  { value: "en", label: "English" },
  { value: "ja", label: "日本語" },
  { value: "zh", label: "中文" },
  { value: "ko", label: "한국어" },
];

// CANCER_TYPES·STAGES·TREATMENT_STATES·TRAVEL_TIMING·PRIORITIES → @/lib/inquiry/intakeLabels 로 이동(코디 상세화면과 공용).

const CANCER_TYPE_COLORS = {
  stomach: "text-orange-600 bg-orange-50 border-orange-200",
  liver: "text-amber-600 bg-amber-50 border-amber-200",
  lung: "text-sky-600 bg-sky-50 border-sky-200",
  breast: "text-pink-600 bg-pink-50 border-pink-200",
  thyroid: "text-purple-600 bg-purple-50 border-purple-200",
  colorectal: "text-green-600 bg-green-50 border-green-200",
  pancreatic: "text-red-600 bg-red-50 border-red-200",
  other: "text-gray-600 bg-gray-50 border-gray-200",
};

const LANG_NAMES = {
  ko: "한국어", en: "English", ru: "Русский", kz: "Қазақша", zh: "中文", ja: "日本語",
};

// ─── i18n — 문자열은 중앙 사전(src/lib/i18n)의 inquiryFunnel.* 키로 이동 ──────
// tl(key, lang) = t("inquiryFunnel." + key, lang). 표시 문자열만 중앙화 —
// 제출 payload 값·필드명·검증 로직은 불변.
function tl(key, lang) {
  return t("inquiryFunnel." + key, lang);
}

// 큰 자료는 쪼개서 올리게 되므로 5개는 좁다(문의 #60: 131MB PDF). 서버 검증(step2)도 같은 10개.
const MAX_ATTACHMENTS = 10;

// ─── 컴포넌트 ───────────────────────────────────────────────────────
export default function UnifiedInquiryFunnel() {
  const lang = useLang() || "en";
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromChat = searchParams?.get("from_chat") || null;

  // 코디 콘텐츠 편집기의 「미리보기」 전용 — 바로 그 단계를 열어준다.
  // 왜: 병기·진단일 같은 문구는 **2단계**에 있어서, 주소만 열면 채널 선택 화면이 뜨고
  //     그 문구는 영원히 안 보인다(2026-08-03 PO: «화면 열기 누르니깐 문의페이지 나오는데?»).
  //     제출을 거치지 않고는 갈 수 없는 자리라 미리보기용 문 하나를 낸다.
  //     ⚠️ 화면만 그린다 — 여기로 들어와도 저장·전송은 평소와 똑같이 검증을 거친다.
  const previewPhase = searchParams?.get("preview") || null;
  const PREVIEWABLE = ["step1", "step2", "step1-success", "step2-success", "channel-select", "human-channels", "ai-chat"];

  // from_chat 이 있으면 채널 선택 건너뛰고 바로 step1 (AI 챗에서 폼 전환된 케이스)
  const initialPhase = PREVIEWABLE.includes(previewPhase)
    ? previewPhase
    : searchParams?.get("from_chat") ? "step1" : "channel-select";
  const [phase, setPhase] = useState(initialPhase); // channel-select | human-channels | step1 | step1-success | step2 | step2-success | done
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [inquiryId, setInquiryId] = useState(null);
  const [publicToken, setPublicToken] = useState(null); // step1 응답값 — step2 소유권 증명
  const [uploadedFiles, setUploadedFiles] = useState([]); // [{path, name, type}]

  // 개인정보 동의 (PIPA — 출시 법적 필수: 개인정보·민감정보·국외이전·제3자 제공). marketing 만 선택.
  const [consents, setConsents] = useState({
    pipa: false, sensitive: false, thirdParty: false, crossBorder: false, marketing: false,
  });
  const REQUIRED_CONSENTS = ["pipa", "sensitive", "thirdParty", "crossBorder"];
  const allRequiredConsented = REQUIRED_CONSENTS.every((k) => consents[k]);
  const allConsented = Object.values(consents).every(Boolean); // 「모두 동의」 체크 상태(선택 포함)
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  // Step 1 폼
  const [form1, setForm1] = useState({
    lastName: "",
    firstName: "",
    nationality: "",
    email: "", // 필수 — 동일인 통합 기준
    phoneDial: "", // 전화 국가번호 (선택)
    phone: "", // 전화번호 (선택)
    preferredLanguage: lang,
    cancerType: "",
    shortMemo: "",
  });

  // Step 2 폼
  const [form2, setForm2] = useState({
    stage: "",
    stageUnknown: false,
    diagnosisDate: "",
    diagnosisUnknown: false,
    treatmentState: "",
    travelTiming: "",
    priorities: [],
  });

  // from_chat 자동채움 (게스트 PII 라 chat 쿠키의 public_token 동봉 — 없으면 자동채움 생략)
  useEffect(() => {
    if (!fromChat) return;
    const chatToken = (typeof document !== "undefined" &&
      document.cookie.match(/(?:^|;\s*)healo_chat_token=([^;]+)/)?.[1]) || null;
    if (!chatToken) return;
    fetch(`/api/chat/thread-summary?thread_id=${fromChat}&public_token=${encodeURIComponent(chatToken)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) return;
        setForm1((prev) => ({
          ...prev,
          email: data.guest_email || prev.email,
          phone: data.guest_phone || prev.phone,
          nationality: data.guest_country || prev.nationality,
        }));
      })
      .catch(() => {});
  }, [fromChat]);

  // 로그인 상태면 폼을 미리 채운다 — 계정(이메일·이름)은 세션에서 바로, 국적·전화는
  // 지난 접수(/api/inquiries/prefill)에서. 빈 칸만 채우고 사용자가 이미 친 값은 안 건드린다.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { createSupabaseBrowserClient } = await import("@/lib/supabase/browser");
        const { data: { session } } = await createSupabaseBrowserClient().auth.getSession();
        if (!session?.access_token) return; // 게스트 — 그냥 빈 폼
        const user = session.user || {};
        const md = user.user_metadata || {};
        // 🛑 계정의 full_name·name 은 한 덩어리라 성·이름을 가를 수 없다 — 자동으로 채우지 않는다.
        //    성/이름이 «따로» 있을 때만 각 칸에 넣는다(아래 setForm1).

        let p = {};
        try {
          const res = await fetch("/api/inquiries/prefill", {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          const json = await res.json();
          // 스태프·에이전시 계정은 늘 «환자 대신» 쓴다 → 자동채움을 통째로 끈다.
          // (안 그러면 코디 이름·직전 환자 전화가 새 환자 폼에 미리 박힌다 — route.ts 주석 참고)
          if (json?.skip) return;
          if (json?.ok && json.prefill) p = json.prefill;
        } catch { /* 지난 접수 없음 — 계정 정보만으로 채운다 */ }

        if (cancelled) return;
        setForm1((prev) => ({
          ...prev,
          lastName: prev.lastName || md.last_name || "",
          firstName: prev.firstName || md.first_name || "",
          email: prev.email || user.email || "",
          nationality: prev.nationality || p.nationality || "",
          // 지난 접수 번호는 국가번호가 이미 붙은 통짜 문자열 → 국가번호 칸은 OTHER 로 두고 그대로 보여준다.
          ...(p.phone && !prev.phone ? { phone: p.phone, phoneDial: "OTHER" } : {}),
        }));
      } catch { /* 자동채움 실패해도 폼은 그대로 쓸 수 있어야 한다 */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // GA 이벤트 — 폼 단계 진입 시에만 트리거
  useEffect(() => {
    if (phase === "step1") safeEvent(GA_EVENTS.STEP1_STARTED);
    if (phase === "channel-select") safeEvent(GA_EVENTS.CHANNEL_VIEW);
    if (phase === "human-channels") safeEvent(GA_EVENTS.HUMAN_CHANNELS_VIEW);
  }, [phase]);

  function safeEvent(name, params) {
    try { event(name, params); } catch {}
  }

  // ─── Step 1 검증 ─────────────────────────────────────────────────
  // 전화 선택 시 국가번호도 골라야 함 (OTHER면 번호에 +코드 직접 입력)
  // 전화는 선택 — 입력했을 때만 국가번호도 필요 (OTHER면 번호에 +코드 직접 입력)
  const phoneNeedsDial = form1.phone.trim().length > 0 && form1.phoneDial === "";
  const step1Valid =
    form1.lastName.trim().length > 0 &&
    form1.firstName.trim().length > 0 &&
    form1.nationality !== "" &&
    form1.email.trim().length > 0 &&
    !phoneNeedsDial &&
    form1.preferredLanguage !== "" &&
    form1.cancerType !== "" &&
    allRequiredConsented;

  function validateStep1() {
    // ⚠️ 여기서 막힌 사람 = 「보내려는 의지가 있었는데 못 보낸 사람」 = 가장 아까운 이탈이다.
    //    예전엔 이 함수가 false 를 돌려주면 그냥 조용히 끝나서 GA 에 흔적이 0이었다
    //    (제출 이벤트는 검증을 통과한 뒤에만 발화). 즉 「어느 칸이 사람을 막고 있나」를
    //    영영 알 수 없었다 → 막힌 사유를 남긴다. blocked_by 값이 곧 고칠 대상이다.
    if (!allRequiredConsented) {
      safeEvent(GA_EVENTS.STEP1_BLOCKED, { blocked_by: "consent" });
      setError(tl("consentRequired", lang));
      return false;
    }
    if (!step1Valid) {
      safeEvent(GA_EVENTS.STEP1_BLOCKED, {
        // 전화 국가번호를 안 골랐나, 아니면 다른 필수칸이 비었나 — 원인이 다르면 고칠 것도 다르다.
        blocked_by: phoneNeedsDial ? "phone_dial" : "required_field",
        // 어느 칸이 비었는지까지 (여러 개면 쉼표로).
        missing: [
          form1.lastName.trim() ? null : "lastName",
          form1.firstName.trim() ? null : "firstName",
          form1.nationality ? null : "nationality",
          form1.email.trim() ? null : "email",
          form1.preferredLanguage ? null : "language",
          form1.cancerType ? null : "cancer_type",
        ].filter(Boolean).join(",") || null,
      });
      setError(phoneNeedsDial ? tl("dialRequired", lang) : tl("required", lang));
      return false;
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(form1.email)) {
      safeEvent(GA_EVENTS.STEP1_BLOCKED, { blocked_by: "email_format" });
      setError(tl("invalidEmail", lang));
      return false;
    }
    setError("");
    return true;
  }

  // ─── Step 1 제출 ─────────────────────────────────────────────────
  async function handleStep1Submit() {
    if (!validateStep1()) return;
    setSubmitting(true);
    // 「눌렀다」와 「저장됐다」는 다른 사건이다. 예전엔 여기서 성공 이벤트를 쐈는데,
    // 서버가 실패해도 GA 에는 제출 성공으로 찍혀 전환수가 부풀었다(2026-07-28 수정).
    // → 여기는 «검증까지 통과한» 시도. 검증에서 막힌 사람은 위 validateStep1 의
    //   STEP1_BLOCKED 로 따로 잡힌다(여기까지 못 온다).
    safeEvent(GA_EVENTS.STEP1_ATTEMPTED);

    try {
      // 🛑 예전엔 이름을 한 칸으로 받아 «앞 토막 = 이름»으로 잘랐다. 카자흐·러시아 사람은
      //    성을 먼저 쓰기 때문에 성과 이름이 통째로 뒤바뀐 채 저장됐다(2026-09-03 실측:
      //    옛 퍼널로 들어온 진짜 문의 4건이 «전부» 같은 방향으로 뒤집혀 있었다).
      //    화면이 「이름 + 성」 순으로 붙여 보여줘서 겉으로는 맞아 보였고, 그래서 오래 안 드러났다.
      //    이제 칸을 나눠서 받는다 — 추측이 없어야 병원 등록·여권 대조에서 거부되지 않는다.
      const firstName = form1.firstName.trim();
      const lastName = form1.lastName.trim() || null;

      // 전화는 선택 — 입력했을 때만 국가번호 + 번호 합쳐서 저장. OTHER면 사용자가 +코드 직접 입력.
      const hasPhone = form1.phone.trim().length > 0;
      const fullPhone = hasPhone
        ? (form1.phoneDial === "OTHER" || !form1.phoneDial
            ? form1.phone.trim()
            : `${form1.phoneDial} ${form1.phone.trim()}`.trim())
        : null;

      const body = {
        firstName,
        lastName,
        email: form1.email.trim(),
        phone: fullPhone,
        nationality: form1.nationality,
        preferredLanguage: form1.preferredLanguage,
        cancerType: form1.cancerType,
        shortMemo: form1.shortMemo.trim() || null,
        aiChatThreadId: fromChat || null,
        // 기존 create API 호환 필드
        spokenLanguage: form1.preferredLanguage,
        contactMethod: hasPhone ? "Phone" : null,
        contactId: fullPhone,
        treatmentType: form1.cancerType,
        // PIPA 동의 기록 (출시 법적 필수). 서버가 intake.consents 에 보존.
        consents: {
          pipa_collection: consents.pipa,
          sensitive_health: consents.sensitive,
          third_party_hospital: consents.thirdParty,
          cross_border_kr: consents.crossBorder,
          marketing: consents.marketing,
        },
        consentVersion: "2.0.0",
        // 유입 기록 — 첫 진입 때 잡아둔 값(어디서 왔나·어느 페이지로 들어왔나) + 지금 화면 언어.
        ...getArrival(lang),
      };

      // 로그인 상태면 토큰 동봉 → 서버가 본인 계정에 문의 귀속(마이페이지 '내 문의' 노출).
      const headers = { "Content-Type": "application/json" };
      try {
        const { createSupabaseBrowserClient } = await import("@/lib/supabase/browser");
        const { data: { session } } = await createSupabaseBrowserClient().auth.getSession();
        if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
      } catch { /* 게스트 제출 */ }

      const res = await fetch("/api/inquiries/step1", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (!result.ok) throw new Error(result.error || "submit_failed");

      setInquiryId(result.inquiryId);
      setPublicToken(result.publicToken || null);
      // ⭐ 핵심 전환 — 서버 저장이 확인된 이 지점에서만 발화.
      safeEvent(GA_EVENTS.INQUIRY_SUBMITTED, {
        cancer_type: form1.cancerType || null,
        nationality: form1.nationality || null,
        preferred_language: form1.preferredLanguage || null,
        from_ai_chat: !!fromChat,
      });
      setPhase("step1-success");
    } catch (_e) {
      safeEvent(GA_EVENTS.INQUIRY_SUBMIT_FAILED, { step: 1 });
      // 원시 에러메시지(영문 네트워크 오류 등)를 그대로 노출하지 않고 6개 언어 일반 메시지로.
      setError(tl("genericError", lang));
    } finally {
      setSubmitting(false);
    }
  }

  // ─── 파일 업로드 ─────────────────────────────────────────────────
  async function handleFileAdd(files) {
    const remaining = MAX_ATTACHMENTS - uploadedFiles.length;
    if (remaining <= 0) { setError(tl("tooManyFiles", lang)); return; }
    const toUpload = Array.from(files).slice(0, remaining);

    for (const file of toUpload) {
      const data = await uploadAttachment(file);
      if (!data.ok) {
        setError(tl(data.error === "file_too_large" ? "fileTooLarge" : "uploadError", lang));
        continue;
      }
      setUploadedFiles((prev) => [...prev, { path: data.path, name: data.name, type: data.type }]);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    handleFileAdd(e.dataTransfer.files);
  }

  function handleDragOver(e) { e.preventDefault(); }

  // ─── Step 2 제출 ─────────────────────────────────────────────────
  async function handleStep2Submit() {
    setSubmitting(true);
    safeEvent(GA_EVENTS.STEP2_ATTEMPTED); // 시도(분모). 성공은 저장 확인 후 아래에서.

    try {
      const body = {
        inquiryId,
        publicToken,
        stage: form2.stageUnknown ? null : form2.stage || null,
        diagnosisDate: form2.diagnosisUnknown ? null : form2.diagnosisDate || null,
        treatmentState: form2.treatmentState || null,
        travelTiming: form2.travelTiming || null,
        priorities: form2.priorities,
        attachments: uploadedFiles,
        matchAccuracy: uploadedFiles.length > 0 ? 95 : 90,
      };

      const res = await fetch("/api/inquiries/step2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (!result.ok) throw new Error(result.error || "step2_failed");

      // ⭐ 상세정보까지 완주 — 저장 확인 후에만 발화.
      safeEvent(GA_EVENTS.INQUIRY_DETAIL_SUBMITTED, {
        has_attachments: uploadedFiles.length > 0,
        attachment_count: uploadedFiles.length,
      });
      setPhase("step2-success");
    } catch (_e) {
      safeEvent(GA_EVENTS.INQUIRY_SUBMIT_FAILED, { step: 2 });
      // 원시 에러메시지(영문 네트워크 오류 등)를 그대로 노출하지 않고 6개 언어 일반 메시지로.
      setError(tl("genericError", lang));
    } finally {
      setSubmitting(false);
    }
  }

  // ─── 가입 처리 ───────────────────────────────────────────────────
  // 가입이 끝나면 **이 문의의 케이스 주소로 되돌아온다**(?redirect=/claim/<주소>).
  // 그래야 가입한 계정에 이 문의가 확실히 붙는다 — 전에는 from=inquiry 만 붙어서
  // 「가입 이메일과 문의 이메일이 같을 때만 붙는」 이메일 대조 폴백에 기대고 있었다
  // (구글 가입은 이메일이 다를 수 있어 그대로 끊겼다). SignupClient 는 /claim/ 로
  // 시작하는 redirect 만 허용한다(오픈리다이렉트 차단).
  const claimRedirect = publicToken
    ? `&redirect=${encodeURIComponent(`/claim/${publicToken}`)}`
    : "";

  function handleSignupGoogle() {
    // 앱(스토어 셸)에서는 «웹 방식» 구글 가입이 끝까지 못 간다 — 여기서 보내면 /signup 이 전체화면
    // 오버레이를 띄운 채 영영 멈춘다. 이유·증거는 GoogleInAppNotice 주석. (2026-08-29)
    // ⚠️ 네이티브 부품이 있는 판은 그대로 보낸다 — /signup 이 ?provider=google 을 받아 네이티브 창을 연다.
    if (isNativeApp() && !hasNativeGoogleSignIn()) return;
    safeEvent(GA_EVENTS.SIGNUP_CLICKED, { method: "google" });
    router.push(`/signup?provider=google&from=inquiry${claimRedirect}`);
  }

  function handleSignupEmail() {
    safeEvent(GA_EVENTS.SIGNUP_CLICKED, { method: "email" });
    const email = form1.email || "";
    router.push(
      `/signup?from=inquiry${email ? `&email=${encodeURIComponent(email)}` : ""}${claimRedirect}`
    );
  }

  function handleDropoff(fromPhase) {
    safeEvent(GA_EVENTS.DROPOFF, { phase: fromPhase });
    setPhase("done");
  }

  // ─── 렌더 ────────────────────────────────────────────────────────

  // Phase: done
  if (phase === "done") {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center animate-in fade-in duration-300">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-teal-100 flex items-center justify-center">
          <Check size={32} className="text-teal-700" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">{tl("doneTitle", lang)}</h2>
        <p className="text-gray-500 text-sm leading-relaxed">{tl("doneBody", lang)}</p>
        <div className="text-left mt-6">
          <TrackBox token={publicToken} lang={lang} emailed={!!form1.email} />
        </div>
        <button
          onClick={() => router.push("/")}
          className="mt-8 px-6 py-3 bg-teal-700 text-white rounded-xl font-semibold hover:bg-teal-800 transition"
        >
          {tl("backHome", lang)}
        </button>
      </div>
    );
  }

  // Phase: step2-success
  if (phase === "step2-success") {
    return (
      <div className="max-w-md mx-auto px-4 py-12 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-teal-700 flex items-center justify-center shadow-lg shadow-teal-200">
            <Check size={32} className="text-white" strokeWidth={3} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{tl("step2SuccessTitle", lang)}</h2>
          <p className="text-gray-500 text-sm leading-relaxed">{tl("step2SuccessBody", lang)}</p>
        </div>

        <TrackBox token={publicToken} lang={lang} emailed={!!form1.email} />

        <div className="border-t border-gray-100 my-6" />

        <div className="bg-teal-50 rounded-2xl p-5 border border-teal-100 mb-5">
          <p className="text-sm font-bold text-teal-800 mb-2">💡 {tl("signupTitle", lang)}</p>
          <p className="text-xs text-teal-700 leading-relaxed">{tl("signupBenefits", lang)}</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleSignupGoogle}
            aria-describedby="funnel-google-app-note"
            className="app-google-lock-btn w-full flex items-center justify-center gap-3 py-3.5 border-2 border-gray-200 rounded-xl hover:border-teal-400 hover:bg-teal-50 transition font-semibold text-sm"
          >
            <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/><path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/><path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/><path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.31z"/></svg>
            {tl("signupGoogle", lang)}
          </button>
          <GoogleInAppNotice id="funnel-google-app-note" langCode={lang} variant="signup" />
          <button
            onClick={handleSignupEmail}
            className="w-full py-3.5 bg-teal-700 text-white rounded-xl font-semibold hover:bg-teal-800 transition text-sm"
          >
            {tl("signupEmail", lang)}
          </button>
          <button
            onClick={() => handleDropoff("step2-success")}
            className="w-full py-2 text-gray-400 text-sm hover:text-gray-600 transition"
          >
            {tl("noSignup", lang)}
          </button>
        </div>
      </div>
    );
  }

  // Phase: step1-success
  if (phase === "step1-success") {
    // 문장 «안»에 들어가는 언어 이름은 화면 언어로 번역돼야 한다.
    // 전엔 어느 화면에서든 그 언어의 제 이름(Русский·Қазақша…)을 그대로 넣어서
    // 한국어 화면에 «Русский로 연락드립니다» 처럼 글자가 섞여 나왔다(2026-07-31 실측).
    // 표를 6개 언어×6개로 늘리는 대신 브라우저가 가진 언어 이름을 쓴다(ko 화면 → «러시아어»).
    // 목록(선택 버튼)에서는 제 이름을 보여주는 게 맞으므로 LANG_NAMES 는 그대로 둔다.
    let langName = LANG_NAMES[form1.preferredLanguage] || form1.preferredLanguage;
    try {
      // ⚠️ 우리 코드 «kz» 는 국제 표기가 아니다(카자흐어 = kk). 그대로 넣으면 브라우저가
      //    이름을 못 찾아 «kz» 를 되돌려준다 — 고친 게 더 나빠지는 자리라 여기서 갈아끼운다.
      const BCP47 = { kz: "kk" };
      const uiCode = BCP47[lang] || lang;
      // ⚠️ 브라우저가 그 화면 언어를 «모르면»(예: 카자흐어) 조용히 다른 언어 이름을 내놓는다
      //    (실측: 카자흐어 화면인데 «한국어·러시아어»가 한글로 나왔다). 지원 여부부터 확인한다.
      const supported = Intl.DisplayNames.supportedLocalesOf([uiCode]).length > 0;
      const code = BCP47[form1.preferredLanguage] || form1.preferredLanguage;
      const shown = supported ? new Intl.DisplayNames([uiCode], { type: "language" }).of(code) : null;
      // 못 찾으면 코드를 그대로 돌려준다 → 그 경우엔 제 이름(Қазақша)이 낫다.
      if (shown && shown.toLowerCase() !== code.toLowerCase()) langName = shown;
    } catch { /* 아주 옛 브라우저 → 제 이름으로 폴백 */ }
    const successMsg = tl("successBody", lang).replace("{lang}", langName);

    return (
      <div className="max-w-md mx-auto px-4 py-12 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-teal-700 flex items-center justify-center shadow-lg shadow-teal-200">
            <Check size={32} className="text-white" strokeWidth={3} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{tl("successTitle", lang)}</h2>
          <p className="text-gray-500 text-sm leading-relaxed">{successMsg}</p>
        </div>

        {/* step1 만 하고 끊는 사람이 실제로 많다 — 여기서 주소를 안 주면 그 사람은
            진행상황을 볼 방법이 영영 없다(가입 유도는 step2-success 에만 있다). */}
        <TrackBox token={publicToken} lang={lang} emailed={!!form1.email} />

        <div className="border-t border-gray-100 my-6" />

        <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100 mb-5">
          <p className="text-sm font-bold text-blue-800 mb-1">💡 {tl("upgradeTitle", lang)}</p>
          <p className="text-xs text-blue-700 leading-relaxed">{tl("upgradeBody", lang)}</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => {
              safeEvent(GA_EVENTS.STEP2_STARTED);
              setPhase("step2");
            }}
            className="w-full py-3.5 bg-teal-700 text-white rounded-xl font-bold hover:bg-teal-800 transition flex items-center justify-center gap-2"
          >
            {tl("yesUpgrade", lang)} <ChevronRight size={18} />
          </button>
          <button
            onClick={() => handleDropoff("step1-success")}
            className="w-full py-2 text-gray-400 text-sm hover:text-gray-600 transition"
          >
            {tl("noUpgrade", lang)}
          </button>
        </div>
      </div>
    );
  }

  // Phase: step2
  if (phase === "step2") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="text-center mb-8">
          <span className="inline-block bg-teal-50 text-teal-700 text-xs font-bold px-3 py-1 rounded-full border border-teal-200 mb-3">{tl("step2of2", lang)}</span>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{tl("step2Title", lang)}</h2>
        </div>

        <div className="space-y-6">
          {/* 병기 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">{tl("stageLabel", lang)}</label>
            <div className="flex flex-wrap gap-2">
              {STAGES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  disabled={form2.stageUnknown}
                  onClick={() => setForm2((p) => ({ ...p, stage: p.stage === s.value ? "" : s.value }))}
                  className={`px-5 py-2 rounded-xl border-2 font-semibold text-sm transition ${
                    form2.stage === s.value && !form2.stageUnknown
                      ? "border-teal-500 bg-teal-50 text-teal-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300 disabled:opacity-40"
                  }`}
                >
                  {optLabel(s, lang)}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setForm2((p) => ({ ...p, stageUnknown: !p.stageUnknown, stage: "" }))}
                className={`px-5 py-2 rounded-xl border-2 font-semibold text-sm transition ${
                  form2.stageUnknown
                    ? "border-teal-500 bg-teal-50 text-teal-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {tl("stageUnknown", lang)}
              </button>
            </div>
          </div>

          {/* 진단일 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">{tl("diagnosisDateLabel", lang)}</label>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={form2.diagnosisDate}
                disabled={form2.diagnosisUnknown}
                onChange={(e) => setForm2((p) => ({ ...p, diagnosisDate: e.target.value }))}
                className="flex-1 p-3 rounded-xl border border-gray-200 focus:border-teal-500 outline-none text-sm bg-white disabled:bg-gray-50 disabled:text-gray-400"
              />
              <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={form2.diagnosisUnknown}
                  onChange={(e) => setForm2((p) => ({ ...p, diagnosisUnknown: e.target.checked, diagnosisDate: "" }))}
                  className="accent-teal-600"
                />
                {tl("diagnosisUnknown", lang)}
              </label>
            </div>
          </div>

          {/* 치료 상태 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">{tl("treatmentStateLabel", lang)}</label>
            <div className="flex flex-wrap gap-2">
              {TREATMENT_STATES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setForm2((p) => ({ ...p, treatmentState: p.treatmentState === s.value ? "" : s.value }))}
                  className={`px-4 py-2 rounded-xl border-2 text-sm font-medium transition ${
                    form2.treatmentState === s.value
                      ? "border-teal-500 bg-teal-50 text-teal-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {optLabel(s, lang)}
                </button>
              ))}
            </div>
          </div>

          {/* 의료문서 업로드 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">{tl("uploadLabel", lang)}</label>
            <div
              ref={dropZoneRef}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-5 text-center hover:bg-gray-50 transition cursor-pointer"
            >
              <UploadCloud size={24} className="mx-auto text-gray-400 mb-2" />
              <p className="text-xs text-gray-500">{tl("uploadDrop", lang)}</p>
              <p className="text-[11px] text-gray-400 mt-1">{describeUpload("medicalDoc", lang)} · {MAX_ATTACHMENTS}</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => handleFileAdd(e.target.files)}
            />
            {uploadedFiles.length > 0 && (
              <ul className="mt-3 space-y-2">
                {uploadedFiles.map((f, i) => (
                  <li key={i} className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <File size={14} className="text-teal-700 shrink-0" />
                      <span className="text-xs font-medium text-teal-800 truncate">{f.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUploadedFiles((prev) => prev.filter((_, j) => j !== i))}
                      className="p-1 hover:bg-teal-100 rounded-full text-teal-700"
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 입국 기간 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">{tl("travelTimingLabel", lang)}</label>
            <div className="grid grid-cols-2 gap-2">
              {TRAVEL_TIMING.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm2((p) => ({ ...p, travelTiming: p.travelTiming === opt.value ? "" : opt.value }))}
                  className={`py-3 rounded-xl border-2 text-sm font-medium transition ${
                    form2.travelTiming === opt.value
                      ? "border-teal-500 bg-teal-50 text-teal-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {optLabel(opt, lang)}
                </button>
              ))}
            </div>
          </div>

          {/* 우선순위 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">{tl("prioritiesLabel", lang)}</label>
            <div className="flex flex-wrap gap-2">
              {PRIORITIES.map((p) => {
                const selected = form2.priorities.includes(p.value);
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() =>
                      setForm2((prev) => ({
                        ...prev,
                        priorities: selected
                          ? prev.priorities.filter((v) => v !== p.value)
                          : [...prev.priorities, p.value],
                      }))
                    }
                    className={`px-4 py-2 rounded-xl border-2 text-sm font-medium transition flex items-center gap-1.5 ${
                      selected
                        ? "border-teal-500 bg-teal-50 text-teal-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {selected && <Check size={14} />}
                    {optLabel(p, lang)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3 border border-red-100">
            <AlertCircle size={16} className="shrink-0" />
            {error}
          </div>
        )}

        <button
          onClick={handleStep2Submit}
          disabled={submitting}
          className="w-full mt-8 py-4 bg-teal-700 text-white rounded-xl font-bold hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-teal-100 flex items-center justify-center gap-2"
        >
          {submitting ? <><Loader2 size={18} className="animate-spin" /> {tl("submitting", lang)}</> : tl("submitStep2", lang)}
        </button>
      </div>
    );
  }

  // Phase: channel-select (진입)
  if (phase === "channel-select") {
    const channels = [
      {
        key: "ai",
        title: tl("aiAgent", lang),
        desc: tl("aiAgentDesc", lang),
        Icon: Bot,
        iconColor: "text-teal-700",
        iconBg: "bg-teal-50",
        hoverBorder: "hover:border-teal-500",
        onClick: () => {
          safeEvent(GA_EVENTS.CHOOSE_CHANNEL, { channel: "ai" });
          setPhase("ai-chat");
        },
      },
      {
        key: "human",
        title: tl("humanAgent", lang),
        desc: tl("humanAgentDesc", lang),
        Icon: Headset,
        iconColor: "text-green-700",
        iconBg: "bg-green-50",
        hoverBorder: "hover:border-green-500",
        onClick: () => {
          safeEvent(GA_EVENTS.CHOOSE_CHANNEL, { channel: "human" });
          // 설정된 메신저만 노출. 1개뿐이면(현재 WhatsApp) picker 화면을 건너뛰고 바로 연결 —
          // 미설정 채널을 '준비 중' 빈 카드로 보여 미완성 인상 주지 않게. 2개 이상이면 picker.
          const m = SITE_INFO.messenger;
          const configured = [
            { key: "whatsapp", url: m.whatsapp },
            { key: "telegram", url: m.telegram },
            { key: "wechat", url: m.wechat },
            { key: "line", url: m.line },
          ].filter((c) => c.url);
          if (configured.length === 1) {
            safeEvent(GA_EVENTS.MESSENGER_CLICK, { channel: configured[0].key, direct: true });
            window.open(configured[0].url, "_blank", "noopener,noreferrer");
          } else {
            setPhase("human-channels");
          }
        },
      },
      {
        key: "form",
        title: tl("inquiryForm", lang),
        desc: tl("inquiryFormDesc", lang),
        Icon: ClipboardList,
        iconColor: "text-blue-700",
        iconBg: "bg-blue-50",
        hoverBorder: "hover:border-blue-500",
        onClick: () => {
          safeEvent(GA_EVENTS.CHOOSE_CHANNEL, { channel: "form" });
          // 폼은 새 의뢰서(/inquiry/referral)로 넘긴다. 이 파일의 step1/step2 는 옛 폼이라
          // 더 이상 안 쓴다 — 새 폼이 확정되면 그 코드는 지운다.
          router.push(localeHref("/inquiry/referral", lang));
        },
      },
    ];

    return (
      <div className="max-w-3xl mx-auto px-4 py-6 md:py-16 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="text-center mb-6 md:mb-10">
          <h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-1 md:mb-2">{tl("chooseTitle", lang)}</h1>
          <p className="text-gray-500 text-sm md:text-base">{tl("chooseSubtitle", lang)}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-5">
          {channels.map((c) => {
            const Icon = c.Icon;
            return (
              <button
                key={c.key}
                type="button"
                // 자동 검사가 «글자» 대신 이걸로 고른다 — 「Inquiry Form」으로 찾으면
                // 카자흐·러시아 화면에서 못 찾아 검사가 조용히 지나친다(2026-08-21).
                data-testid={`channel-${c.key}`}
                onClick={c.onClick}
                className={`bg-white border border-gray-200 rounded-xl p-4 md:p-6 text-left flex md:block items-center gap-4 md:gap-0 ${c.hoverBorder} hover:shadow-md transition-all`}
              >
                <div className={`w-11 h-11 md:w-12 md:h-12 ${c.iconBg} rounded-xl flex items-center justify-center mb-0 md:mb-4 shrink-0`}>
                  <Icon size={22} className={c.iconColor} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base md:text-lg font-bold text-gray-900 mb-0.5 md:mb-1.5">{c.title}</h3>
                  <p className="text-gray-500 text-xs md:text-sm leading-snug md:leading-relaxed">{c.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* 신뢰 스트립 — 무료·비구속 + 보안·응답 + 인증 배지 (진입 첫 화면) */}
        <div className="mt-6 md:mt-8 flex flex-col items-center gap-2.5">
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[11px] md:text-xs text-gray-500">
            <span className="flex items-center gap-1"><Check size={12} className="text-teal-600" /> {tl("trustFree", lang)}</span>
            <span className="flex items-center gap-1"><Check size={12} className="text-teal-600" /> {tl("trustDirectPay", lang)}</span>
            <span className="flex items-center gap-1"><Shield size={12} className="text-teal-600" /> {tl("trustEncryption", lang)}</span>
            <span className="flex items-center gap-1"><Clock size={12} className="text-teal-600" /> {tl("trustResponse", lang)}</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1 text-[10px] md:text-[11px] font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-1">
              <BadgeCheck size={12} className="text-teal-600" /> {tl("certKhidi", lang)}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] md:text-[11px] font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-1">
              <BadgeCheck size={12} className="text-teal-600" /> {tl("certForeignPatient", lang)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Phase: ai-chat (AI 상담사 인라인 챗)
  // PC에서 화면을 충분히 쓰도록 폭(max-w-4xl)·높이(뷰포트 채움)를 키운다. 「뒤로」는 ThreadChat
  // 상단 툴바로 내려보내(onBack) 코디·접수 버튼과 같은 줄에 두어 세로 공간을 아낀다(2026-06-30 PO).
  if (phase === "ai-chat") {
    // 높이: 부모 래퍼(page.jsx)가 이미 min-h-[100vh-64px] + py(헤더·여백)를 잡으므로 여기서 또
    // 100dvh 를 통째로 빼면 이중차감으로 입력칸이 화면 밖으로 밀린다(데스크톱). 그래서
    //  - 모바일: -my-3 로 래퍼 py-3 을 상쇄하고 헤더(56px=3.5rem)만 뺀 풀하이트(기존 방식).
    //  - 데스크톱: md:h-auto 로 외곽의 dvh 차감을 끄고(이중차감 제거), 안쪽을 뷰포트 기준 큰 높이로
    //    채운다(헤더4rem+래퍼py-8 4rem+여백 ≈ 9rem 차감). 옛 600px 고정보다 훨씬 큼.
    return (
      <div className="max-w-4xl w-full mx-auto px-2 sm:px-4 flex flex-col h-[calc(100dvh-3.5rem)] -my-3 md:my-0 md:h-auto animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex-1 min-h-0 md:flex-none md:h-[calc(100dvh-9rem)]">
          <ThreadChat onBack={() => setPhase("channel-select")} backLabel={tl("back", lang)} />
        </div>
      </div>
    );
  }

  // Phase: human-channels (4개 메신저 카드)
  if (phase === "human-channels") {
    const channels = [
      { key: "whatsapp", name: "WhatsApp", url: SITE_INFO.messenger.whatsapp, color: "#25D366", iconUrl: "/icons/messengers/whatsapp.svg" },
      { key: "telegram", name: "Telegram", url: SITE_INFO.messenger.telegram, color: "#26A5E4", iconUrl: "/icons/messengers/telegram.svg" },
      { key: "wechat", name: "WeChat", url: SITE_INFO.messenger.wechat, color: "#07C160", iconUrl: "/icons/messengers/wechat.svg" },
      { key: "line", name: "LINE", url: SITE_INFO.messenger.line, color: "#06C755", iconUrl: "/icons/messengers/line.svg" },
    ].filter((c) => c.url); // 미설정 채널 숨김 — '준비 중' 빈 카드 제거(미완성 인상 방지)

    return (
      <div className="max-w-3xl mx-auto px-4 py-10 md:py-16 animate-in fade-in slide-in-from-right-4 duration-300">
        <button
          type="button"
          onClick={() => setPhase("channel-select")}
          className="flex items-center gap-1 text-sm font-medium text-gray-500 mb-6 hover:text-teal-700 transition"
        >
          <ChevronLeft size={16} /> {tl("back", lang)}
        </button>

        <div className="text-center mb-10">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{tl("humanChannelsTitle", lang)}</h1>
          <p className="text-gray-500 text-sm md:text-base">{tl("humanChannelsSubtitle", lang)}</p>
        </div>

        {/* 카드 수와 무관하게 가운데 정렬 — 4칸 grid 고정이면 2개(현 WhatsApp·Telegram)일 때
            왼쪽으로 쏠린다(실기기 2026-07-24 PO 지적). 채널이 늘어도(4개) 그대로 동작. */}
        <div className="flex flex-wrap justify-center gap-3 md:gap-4">
          {channels.map((c) => {
            const enabled = !!c.url;
            const inner = (
              <>
                <img
                  src={c.iconUrl}
                  alt={c.name}
                  className="w-10 h-10 mb-3"
                  style={enabled ? undefined : { filter: "grayscale(100%)", opacity: 0.4 }}
                />
                <span className="text-sm font-bold text-gray-900">{c.name}</span>
                {!enabled && (
                  <span className="mt-1.5 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    {tl("channelComingSoon", lang)}
                  </span>
                )}
              </>
            );

            // flex 컨테이너라 카드가 스스로 폭을 가져야 함 — 모바일 2열(반폭), md+ 고정폭.
            const baseCls = "bg-white border border-gray-200 rounded-xl p-5 flex flex-col items-center justify-center text-center transition-all aspect-square w-[calc(50%-0.375rem)] md:w-44";

            if (enabled) {
              return (
                <a
                  key={c.key}
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => safeEvent(GA_EVENTS.MESSENGER_CLICK, { channel: c.key })}
                  className={`${baseCls} hover:shadow-md hover:border-[var(--brand-hover)]`}
                  style={{ "--brand-hover": c.color }}
                >
                  {inner}
                </a>
              );
            }
            return (
              <div key={c.key} className={`${baseCls} opacity-60 cursor-not-allowed`}>
                {inner}
              </div>
            );
          })}
        </div>

        {/* 폴백 — 원하는 채널이 없어도 막다른 길이 아니게 (항상 동작하는 경로 제공) */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 mb-3">{tl("humanFallbackText", lang)}</p>
          <button
            type="button"
            onClick={() => { safeEvent(GA_EVENTS.HUMAN_FALLBACK_TO_FORM); router.push(localeHref("/inquiry/referral", lang)); }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-teal-700 text-white rounded-xl font-semibold text-sm hover:bg-teal-800 transition"
          >
            <ClipboardList size={16} /> {tl("humanFallbackCta", lang)} <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  // Phase: step1 (폼)
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* 채널 선택으로 돌아가기 (from_chat 케이스 제외) */}
      {!fromChat && (
        <button
          type="button"
          onClick={() => setPhase("channel-select")}
          className="flex items-center gap-1 text-sm font-medium text-gray-500 mb-4 hover:text-teal-700 transition"
        >
          <ChevronLeft size={16} /> {tl("back", lang)}
        </button>
      )}

      <div className="text-center mb-8">
        <span className="inline-block bg-teal-50 text-teal-700 text-xs font-bold px-3 py-1 rounded-full border border-teal-200 mb-3">{tl("step1of2", lang)}</span>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{tl("step1Title", lang)}</h1>
        <p className="text-gray-500 text-sm">{tl("step1Subtitle", lang)}</p>
      </div>

      <div className="space-y-5">
        {/* 성함 — 성과 이름을 «따로» 받는다. 한 칸으로 받아 잘라 넣으면 CIS 환자(성을 먼저 쓴다)의
            성·이름이 통째로 뒤바뀐다(2026-09-03 실측 4건). 병원 등록은 두 칸을 각각 쓴다. */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="funnel-last-name" className="block text-sm font-bold text-gray-700 mb-1.5">
              {tl("lastNameLabel", lang)} <span className="text-red-500">*</span>
            </label>
            <input
              id="funnel-last-name"
              type="text"
              value={form1.lastName}
              onChange={(e) => setForm1((p) => ({ ...p, lastName: e.target.value }))}
              className="w-full p-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-100 outline-none text-sm bg-gray-50/50 transition"
            />
          </div>
          <div>
            <label htmlFor="funnel-first-name" className="block text-sm font-bold text-gray-700 mb-1.5">
              {tl("firstNameLabel", lang)} <span className="text-red-500">*</span>
            </label>
            <input
              id="funnel-first-name"
              type="text"
              value={form1.firstName}
              onChange={(e) => setForm1((p) => ({ ...p, firstName: e.target.value }))}
              className="w-full p-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-100 outline-none text-sm bg-gray-50/50 transition"
            />
          </div>
        </div>

        {/* 국적 */}
        <div>
          <label htmlFor="funnel-nationality" className="block text-sm font-bold text-gray-700 mb-1.5">
            {tl("nationalityLabel", lang)} <span className="text-red-500">*</span>
          </label>
          <select
            id="funnel-nationality"
            value={form1.nationality}
            onChange={(e) => setForm1((p) => ({ ...p, nationality: e.target.value }))}
            className="w-full p-3 rounded-xl border border-gray-200 focus:border-teal-500 outline-none text-sm bg-white transition"
          >
            <option value="">{tl("selectNationality", lang)}</option>
            {NATIONALITIES.map((n) => (
              <option key={n.value} value={n.value}>{n.label}</option>
            ))}
          </select>
        </div>

        {/* 이메일 (필수) */}
        <div>
          <label htmlFor="funnel-email" className="block text-sm font-bold text-gray-700 mb-1.5">
            {tl("contactEmail", lang)} <span className="text-red-500">*</span>
          </label>
          <input
            id="funnel-email"
            type="email"
            value={form1.email}
            onChange={(e) => setForm1((p) => ({ ...p, email: e.target.value }))}
            placeholder={tl("emailPlaceholder", lang)}
            className="w-full p-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-100 outline-none text-sm bg-gray-50/50 transition"
          />
        </div>

        {/* 전화번호 (선택) */}
        <div>
          <label htmlFor="funnel-phone" className="block text-sm font-bold text-gray-700 mb-1.5">
            {tl("contactPhone", lang)} <span className="text-gray-500 font-normal">{tl("optionalTag", lang)}</span>
          </label>
          <div className="flex gap-2">
            <select
              value={form1.phoneDial}
              onChange={(e) => setForm1((p) => ({ ...p, phoneDial: e.target.value }))}
              className="shrink-0 w-44 p-3 rounded-xl border border-gray-200 focus:border-teal-500 outline-none text-sm bg-white transition"
              aria-label={tl("dialAria", lang)}
            >
              <option value="">{tl("dialPlaceholder", lang)}</option>
              {DIAL_CODES.map((d) => (
                <option key={d.code + d.label} value={d.code}>{d.label}</option>
              ))}
            </select>
            <input
              id="funnel-phone"
              type="tel"
              value={form1.phone}
              onChange={(e) => setForm1((p) => ({ ...p, phone: e.target.value }))}
              placeholder={form1.phoneDial === "OTHER" ? "+49 170 1234567" : "701 234 5678"}
              // ⚠️ min-w-0 을 빼면 폰에서 이 칸이 화면 밖으로 잘린다 (2026-07-29 실측: 375px 화면에서
              //    오른쪽 끝 403px = 28px 잘림). 가로 스크롤도 안 생겨서 «잘린 줄도 모른다».
              //    이유: flex 안의 입력칸은 기본값(min-width:auto)이라 «글자가 들어갈 만큼»보다
              //    작아지길 거부한다. 국가번호 칸이 w-44(176px)를 이미 먹어서 자리가 모자랐다.
              className="flex-1 min-w-0 p-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-100 outline-none text-sm bg-gray-50/50 transition"
            />
          </div>
        </div>

        {/* 선호 언어 */}
        <div>
          <label htmlFor="funnel-lang" className="block text-sm font-bold text-gray-700 mb-1.5">
            {tl("langLabel", lang)} <span className="text-red-500">*</span>
          </label>
          <select
            id="funnel-lang"
            value={form1.preferredLanguage}
            onChange={(e) => setForm1((p) => ({ ...p, preferredLanguage: e.target.value }))}
            className="w-full p-3 rounded-xl border border-gray-200 focus:border-teal-500 outline-none text-sm bg-white transition"
          >
            <option value="">{tl("selectLang", lang)}</option>
            {PREFERRED_LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>

        {/* 암종 */}
        <div>
          <label id="funnel-cancerType-label" className="block text-sm font-bold text-gray-700 mb-1.5">
            {tl("cancerTypeLabel", lang)} <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-4 gap-2" role="group" aria-labelledby="funnel-cancerType-label">
            {CANCER_TYPES.map((ct) => {
              const selected = form1.cancerType === ct.value;
              const colorClass = CANCER_TYPE_COLORS[ct.value] || "text-gray-600 bg-gray-50 border-gray-200";
              return (
                <button
                  key={ct.value}
                  type="button"
                  onClick={() => setForm1((p) => ({ ...p, cancerType: ct.value }))}
                  className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition text-center ${
                    selected
                      ? "border-teal-500 bg-teal-50 shadow-sm"
                      : "border-gray-100 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${colorClass}`}>
                    {ct.organ ? <OrganIcon name={ct.organ} className="w-[22px] h-[22px]" /> : <HelpCircle size={18} />}
                  </div>
                  <span className={`text-[11px] font-medium leading-tight ${selected ? "text-teal-800" : "text-gray-700"}`}>
                    {optLabel(ct, lang)}
                  </span>
                  {selected && (
                    <div className="absolute top-1 right-1 w-4 h-4 bg-teal-700 rounded-full flex items-center justify-center">
                      <Check size={10} className="text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 메모 */}
        <div>
          <label htmlFor="funnel-memo" className="block text-sm font-bold text-gray-700 mb-1.5">
            {tl("memoLabel", lang)}
          </label>
          <textarea
            id="funnel-memo"
            value={form1.shortMemo}
            onChange={(e) => setForm1((p) => ({ ...p, shortMemo: e.target.value.slice(0, 200) }))}
            placeholder={tl("memoPlaceholder", lang)}
            rows={3}
            className="w-full p-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-100 outline-none text-sm bg-gray-50/50 resize-y transition"
          />
          <p className="text-right text-[11px] text-gray-400 mt-1">{form1.shortMemo.length}/200</p>
        </div>
      </div>

      {/* 개인정보 동의 (PIPA — 출시 법적 필수: 개인정보·민감정보·국외이전·제3자 제공) */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50/60 p-4">
        <div className="flex items-center gap-1.5 mb-2.5">
          <Shield size={14} className="text-teal-600" />
          <span className="text-[13px] font-semibold text-gray-700">{tl("consentHeading", lang)}</span>
        </div>
        {/* 모두 동의 — 5칸을 하나로. 필수 4 + 선택(마케팅)까지 한 번에 켜고 끈다(2026-07-31 PO 요청). */}
        <label className="flex items-center gap-2 py-2 mb-1 border-b border-gray-200 cursor-pointer text-[13px] font-bold text-gray-800">
          <input
            type="checkbox"
            checked={allConsented}
            onChange={(e) => {
              const v = e.target.checked;
              setConsents({ pipa: v, sensitive: v, thirdParty: v, crossBorder: v, marketing: v });
            }}
            className="h-4 w-4 shrink-0 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
          />
          <span>{tl("consentAll", lang)}</span>
        </label>
        <div className="space-y-2">
          {[
            { key: "pipa", labelKey: "consentPipa" },
            { key: "sensitive", labelKey: "consentSensitive" },
            { key: "thirdParty", labelKey: "consentThirdParty" },
            { key: "crossBorder", labelKey: "consentCrossBorder" },
            { key: "marketing", labelKey: "consentMarketing" },
          ].map((row) => (
            // py-2: 누를 수 있는 높이를 18px → 34px 로. 글자가 12.5px 이라 label 이 그대로면
            // 손가락으로 누르기엔 너무 얇다(접근성 하한 24px 미달, 2026-07-29 폰 실측).
            // 필수 동의 항목이라 «잘 안 눌리는» 것 자체가 문의 이탈로 이어진다.
            <label key={row.key} className="flex items-start gap-2 py-2 cursor-pointer text-[12.5px] leading-snug text-gray-600">
              <input
                type="checkbox"
                checked={consents[row.key]}
                onChange={(e) => setConsents((p) => ({ ...p, [row.key]: e.target.checked }))}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <span>{tl(row.labelKey, lang)}</span>
            </label>
          ))}
        </div>
        <a href={localeHref("/privacy", lang)} target="_blank" rel="noopener noreferrer" className="touch-link mt-2 inline-block text-[11.5px] text-teal-700 underline">
          {tl("consentDetails", lang)} · /privacy
        </a>
        <p className="mt-2.5 text-[11px] leading-snug text-gray-400">{tl("consentDisclaimer", lang)}</p>
      </div>

      {/* 신뢰 배지 */}
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 mt-5 text-[11px] text-gray-500">
        <span className="flex items-center gap-1"><Check size={12} className="text-teal-600" /> {tl("trustFree", lang)}</span>
        <span className="flex items-center gap-1"><Check size={12} className="text-teal-600" /> {tl("trustDirectPay", lang)}</span>
        <span className="flex items-center gap-1"><Shield size={12} /> {tl("trustEncryption", lang)}</span>
        <span className="flex items-center gap-1"><Clock size={12} /> {tl("trustResponse", lang)}</span>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3 border border-red-100">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      <button
        onClick={handleStep1Submit}
        disabled={!step1Valid || submitting}
        className="w-full mt-6 py-4 bg-teal-700 text-white rounded-xl font-bold hover:bg-teal-800 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-lg shadow-teal-100 flex items-center justify-center gap-2"
      >
        {submitting
          ? <><Loader2 size={18} className="animate-spin" /> {tl("submitting", lang)}</>
          : <>{tl("submitStep1", lang)} <ChevronRight size={18} /></>
        }
      </button>
    </div>
  );
}

// ─── 진행상황 주소 안내 ───────────────────────────────────────────
// 규칙 하나: 「접수되면 들어온 그 채널로 주소를 돌려준다」(PO 결정 2026-08-03).
// 웹 폼으로 온 사람의 «그 채널» = 이 완료 화면 + 접수 확인 메일.
// 전엔 step1 응답으로 받은 주소를 화면 메모리에만 들고 있다가 버려서,
// 새로고침하면 본인도 자기 문의를 다시 못 찾았다.
function TrackBox({ token, lang, emailed }) {
  const [copied, setCopied] = useState(false);
  if (!token) return null;

  // 서버 렌더 때는 origin 을 모른다 → 클라이언트에서만 그린다(빈 주소 노출 방지).
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  if (!origin) return null;
  // ?lang= : 환자가 이 주소를 메신저에 붙여 가족에게 보내도 미리보기 카드가 제 언어로 뜬다(2026-09-05).
  const url = withLang(`${origin}/claim/${token}`, lang);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* 클립보드 거부 브라우저 — 주소는 아래에 그대로 보이니 직접 복사 가능 */
    }
  }

  return (
    <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200 mb-5">
      <p className="text-sm font-bold text-gray-900 mb-1">{tl("trackTitle", lang)}</p>
      <p className="text-xs text-gray-500 leading-relaxed">{tl("trackBody", lang)}</p>
      {emailed && <p className="text-xs text-gray-400 mt-1">{tl("trackEmailed", lang)}</p>}
      <p className="mt-3 text-xs text-gray-600 break-all bg-white rounded-lg px-3 py-2 border border-gray-200">
        {url}
      </p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={copy}
          className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-gray-200 bg-white hover:border-teal-400 hover:bg-teal-50 transition flex items-center justify-center gap-1.5"
        >
          {copied
            ? <><Check size={14} className="text-teal-700" /> {tl("trackCopied", lang)}</>
            : <><Copy size={14} /> {tl("trackCopy", lang)}</>}
        </button>
        <a
          href={url}
          className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-teal-700 text-white hover:bg-teal-800 transition flex items-center justify-center gap-1.5"
        >
          <ExternalLink size={14} /> {tl("trackOpen", lang)}
        </a>
      </div>
    </div>
  );
}
