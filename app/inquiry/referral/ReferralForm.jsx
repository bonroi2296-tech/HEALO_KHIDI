"use client";

/**
 * 환자 의뢰서 — 한 장 · 접이식 6묶음 · 보내기 버튼 하나.
 *
 * 칸은 하나도 여기서 정의하지 않는다. 전부 src/lib/inquiry/referralSchema.js 를 그려낸다.
 * 칸을 더하거나 빼려면 그 파일만 고쳐라(화면·서버 검증·병원 양식 출력이 같은 파일을 본다).
 *
 * 지금 상태: 화면과 검증만. 보내기(서버 저장)는 아직 안 붙였다.
 */

import { useState, useEffect, useMemo, useRef, Fragment } from "react";
import { Check, ChevronDown, AlertTriangle, Paperclip, X, Loader2 } from "lucide-react";
import { DOC_KINDS, NEEDED_KINDS, kindLabel, missingKinds } from "@/lib/inquiry/docKinds";
import { useLang } from "@/lib/i18n/LangContext";
import { t } from "@/lib/i18n";
import { scrollBehavior } from "@/lib/a11y/prefersReducedMotion";
import { CANCER_TYPES, STAGES, optLabel } from "@/lib/inquiry/intakeLabels";
import { icd10SuggestionFor, cancerTypeLabelL } from "@/lib/khidi/medicalLabels";
import { describeUpload, MAX_DOC_BYTES as MAX_UPLOAD_BYTES } from "@/lib/uploadPolicy";
import { canPickFolder, pickImagingFiles, sumBytes, bundleToZip, formatMB, splitDrop } from "@/lib/inquiry/cdBundle";
import { uploadAttachment } from "@/lib/uploadAttachment";
import { SITE_INFO } from "@/lib/siteSettings";
import { isValidEmail } from "@/lib/utils/phoneFormat";
import { event as gaEvent, GA_EVENTS } from "@/lib/ga";

// GA 는 «부가»다 — 차단기(AdGuard 등)로 실패해도 접수를 막으면 안 된다.
const ga = (name, params) => { try { gaEvent(name, params); } catch {} };
import {
  SECTIONS, CONSENTS, LATE_STAGE_NOTICE, LATE_STAGES,
  lab, fieldsByReq, missingIntake, missingForReferral, referralReadiness, nextReferralSection, sanitizeDraftValues,
} from "@/lib/inquiry/referralSchema";

const DRAFT_KEY = "healo_referral_draft_v1";
// 임시저장엔 여권번호·진단명이 «평문»으로 남는다(브라우저 안). PC방·가족 공용 PC 를 생각해 7일 지나면 버린다.
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// 국적·언어 — 지금 폼과 같은 목록(저장값 불변).
const NATIONALITIES = [
  { value: "KZ", label: "Kazakhstan / Қазақстан" },
  { value: "RU", label: "Russia / Россия" },
  { value: "UZ", label: "Uzbekistan / Ўзбекистон" },
  { value: "KG", label: "Kyrgyzstan / Кыргызстан" },
  { value: "MN", label: "Mongolia / Монгол" },
  { value: "CN", label: "China / 中国" },
  { value: "JP", label: "Japan / 日本" },
  { value: "KR", label: "Korea / 한국" },
  // 🛑 여기만 「그 나라 말」이 없다 — 「기타」는 나라 이름이 아니라 한국어 낱말이라
  //    러시아어·영어 화면에서 한국어가 그대로 새어나왔다(2026-08-18 실측). 화면 말로 바꾼다.
  { value: "OTHER", label: { ko: "기타", en: "Other", ru: "Другое", kz: "Басқа", zh: "其他", ja: "その他" } },
];
const LANGS = [
  { value: "ru", label: "Русский" }, { value: "kz", label: "Қазақша" },
  { value: "en", label: "English" }, { value: "ja", label: "日本語" },
  { value: "zh", label: "中文" }, { value: "ko", label: "한국어" },
];

// 📐 「대학병원」을 부르는 말은 한 가지로 (2026-08-18 실측: 러시아어가 клиника·университетская
//    клиника·больница 세 가지로 갈려 있었다 — 환자에겐 «다른 곳»으로 읽힌다).
//      · 대학병원      → en "university hospital" · ru «университетская клиника»
//      · 다시 가리킬 때 → en "the hospital"        · ru «клиника»
//      · 환자분이 다니는 병원 → en "your hospital"  · ru «ваша больница»
/**
 * 이 화면 문구를 고칠 때 — 이미 결정된 것들.
 *
 * 문구 «값»은 여기 없다. 사전(src/lib/i18n/dictionary.js)의 `referral.tr.*` 에 있고,
 * 코디 백오피스 편집기(/coordinator/content)에서 배포 없이 고칠 수 있다.
 * 아래는 그 문구들에 대해 이미 내려진 결정이라, 편집기에서 고칠 때도 그대로 지켜야 한다.
 */
 // ── referral.tr.pickTitle
 //    ── 갈림길 화면 (맨 처음) ──────────────────────────────────────
 //    15칸을 처음부터 다 펼쳐 보이면 부담스럽다(PO 2026-08-13). 그렇다고 안 받을 수도
 //    없는 정보라, «받을 양을 사용자가 고르게» 한다. 제출은 여전히 한 번이다.
 // ── referral.tr.fullBody
 //    한 덩어리로 붙여놓으면 안 읽힌다 — «왜 필요한가»와 «어떻게 빨라지나»를 문단으로 나눈다.
 // ── referral.tr.sub
 //    말이 길면 안 읽는다(2026-08-18 PO: «말이 너무 장황하잖아»). 한 줄로.
 // ── referral.tr.restNote
 //    🛑 「여기까지 채우시면 보내실 수 있습니다」를 여기 되살리지 마라 — 그 말은 아래 띠가
 //    이미 하고 있다(2026-08-18 PO). 여기서 할 말은 «아래가 무엇이냐»다:
 //    우리 사정(보낼 수 있다·없다)이 아니라 «대학병원이 진단하는 데 필요한 것».
 // ── referral.tr.barRefMeta
 //    「0%」는 숫자가 아니라 «실패했다»로 읽힌다. 채운 개수로 보여주고, 다음 한 칸을 지목해 준다.
 // ── referral.tr.sizeRule
 //    🛑 규칙은 «미리» 말한다(2026-08-18 PO: 「고민하지 말고 그냥 200MB까지만 받는다고 하자」).
 //    막힌 뒤에 알려주면 그건 시간을 뺏고 나서 거절하는 것이다.
 // ── referral.tr.pickDocs
 //    🛑 버튼 이름은 «무엇을 고르나»가 아니라 «어떻게 올리나»로(2026-08-18 PO: 그게 더 직관적이다).
 //    「서류 고르기 / CD 폴더 고르기」는 둘 다 «고르기»여서 무엇이 다른지 안 보였다.
 // ── referral.tr.done
 //    2026-08-13 이대서울병원 확인: 보험은 병원이 관여하지 않는다.
 //    환자가 먼저 결제하고 보험사와 처리하거나, 에이전시가 대신 진행한다.
 //    → 나중에 알면 분쟁이 되므로 폼에서 미리 알린다.
 // ── referral.tr.readAs
 //    「이렇게 읽었습니다」는 «무엇을» 고치라는 건지 안 알려준다(2026-08-14 PO).
 //    바로 아래가 «서류 종류 고르는 칸»이니 그걸 가리켜야 한다.
 // ── referral.tr.pickKind
 //    우리가 못 알아본 경우. 「판별 못 함」만 띄우면 사람이 «내가 뭐하라는 거지» 를 모른다(PO 지적).
 // ── referral.tr.partialRead
 //    「못 읽었다」만 적으면 «우리 판독기가 고장난 것»으로 읽힌다 — 이유를 밝힌다(2026-08-14 PO: 「이건 pdf 자료가 많아서 못읽었다는거야?」).
 // ── referral.tr.cdPick
 //    🛑 버튼 밑에 한 줄 설명을 다시 달지 마라(2026-08-18 PO). 「파일」과 「폴더」면 충분하다.
 // ── referral.tr.cdDone
 //    「134MB → 134MB」는 아무것도 안 알려준다(2026-08-14 PO). 이미 압축된 영상은 더 안 줄어든다.
 //    사람이 알아야 할 건 «몇 개가 올라갔나» 하나다.
 // ── referral.tr.cdTooBig
 //    「너무 큽니다」만 하면 코디에게 연락할 때 뭐라고 말해야 할지 모른다. 숫자를 같이 준다.
 // ── referral.tr.upTooBig
 //    서버는 코드형 오류만 준다(보안 규칙). 사람 말로 바꾸는 건 화면 몫이다.
 // ── referral.tr.upBadType
 //    고르기 «전에» 보이는 안내. 다 올린 뒤에 안 된다고 하면 그건 시간을 뺏고 나서 거절하는 것이다.

/** 서버가 준 오류 코드를 사람 말로. 코드가 그대로 화면에 나가면 안 된다. */
function uploadErrorText(code, lang, bytes) {
  if (code === "file_too_large") return tr("upTooBig", lang, { mb: bytes ? formatMB(bytes) : "200MB+" });
  if (code === "invalid_file_type" || code === "invalid_file_content") return tr("upBadType", lang);
  return tr("upFailed", lang);
}
/** 화면 문구 한 줄. 값은 사전(referral.tr.*)에서 오고, {n}·{mb} 같은 자리는 여기서 갈아끼운다. */
const tr = (k, lang, vars) => {
  let s = t(`referral.tr.${k}`, lang);
  if (vars) for (const [n, v] of Object.entries(vars)) s = s.replaceAll(`{${n}}`, v);
  return s;
};

export default function ReferralForm() {
  // useLang() 은 문자열을 그대로 돌려준다({lang} 으로 꺼내면 undefined 라 전부 영어로 떨어진다).
  const lang = useLang();
  const [values, setValues] = useState({});
  const [consents, setConsents] = useState({});
  // 처음엔 «자료»와 «연락처» 둘만 펼친다. 나머지는 접힌 줄로만 보인다 —
  // 18칸을 한꺼번에 펼쳐 보여주니 PO 가 «아직도 뭔가 너무 많다»고 했다(2026-08-12).
  // 🛑 자료 묶음은 접지 마라(2026-08-14 PO). 접어두면 올릴 자리가 안 보여 그냥 지나치는데,
  //    자료가 바로 「우리가 아래 칸을 대신 채워드리는」 출발점이다.
  const [open, setOpen] = useState({ documents: true, essentials: true });
  const [savedAt, setSavedAt] = useState(null);
  const [highlight, setHighlight] = useState(null); // 「남은 칸으로」로 데려간 칸
  // null = 아직 안 고름(갈림길 화면) · "quick" = 연락처만 · "full" = 병원 제출까지
  const [mode, setMode] = useState(null);
  // 옛 퍼널의 「1단계 시작」과 같은 이벤트 — 깔때기(시작→접수)가 새 폼에서도 이어져 잡히게.
  useEffect(() => { if (mode) ga(GA_EVENTS.STEP1_STARTED, { form: "referral", mode }); }, [mode]);
  // 서류에서 읽어 «우리가 채운» 칸. 값이 아니라 «출처 표시»다 — 사용자가 고치면 목록에서 빠진다.
  const [autoFilled, setAutoFilled] = useState({});
  // applyAutoFill 안에서 «최신» 표시 상태를 봐야 한다 — state 는 그 시점 값이라 늦다.
  const autoFilledRef = useRef({});
  const valuesRef = useRef({});
  // 머리(진행 막대)도 바닥(보내기 버튼)도 «둘 다 화면 밖»일 때만 아래 고정 막대를 띄운다.
  // 실측 2026-08-14: 문서가 4,274px 인데 진행 막대는 346px 에서 끝난다 —
  // 8% 만 내려도 진행상황과 보내기 버튼이 «둘 다» 안 보였다(PO 지적).
  const headRef = useRef(null);
  const footRef = useRef(null);
  const [headOut, setHeadOut] = useState(false);
  const [footOut, setFootOut] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sent, setSent] = useState(null);
  const [copied, setCopied] = useState(false); // { inquiryId, publicToken }
  // 🛑 ref 로 «복원 끝» 표시를 하지 마라. ref 는 «그 자리에서» 켜지는데 값(setValues)은 «다음 그림»에 반영된다 —
  //    그 사이에 저장 효과가 돌아 «빈 값»으로 임시저장을 덮어쓴다(2026-08-19 실측: 새로고침 한 번에 사라짐,
  //    개발 모드의 효과 2회 실행에서 결정적으로 터진다). 상태(state)로 두면 값과 «같은 그림»에 켜진다.
  const [hydrated, setHydrated] = useState(false);

  // 쓰던 내용 복구 — 긴 폼의 유일한 진짜 위험은 「쓰다 날림」이다.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (typeof d?.at === "number" && Date.now() - d.at > DRAFT_TTL_MS) throw new Error("expired");
        // 🛑 그대로 setValues 하지 마라 — 옛 모양·깨진 값이 들어오면 폼 전체가 오류 화면이 된다
        //    (2026-08-19 실측: envelope 이 문자열이면 docs.map 에서 죽음). 모양 맞는 칸만 살린다.
        setValues(sanitizeDraftValues(d.values));
        if (d.autoFilled && typeof d.autoFilled === "object" && !Array.isArray(d.autoFilled)) setAutoFilled(d.autoFilled);
        const c = d.consents && typeof d.consents === "object" && !Array.isArray(d.consents) ? d.consents : {};
        setConsents(Object.fromEntries(Object.entries(c).filter(([, v]) => typeof v === "boolean")));
        // 🛑 모드(상담만/전체)는 «되살리지 않는다» — 갈림길은 매번 보여준다(2026-08-19 PO:
        //    「입력한 데이터나 임시 저장해주는게 좋을 거 같고… 막상 들어왔더니 너무 많아서 접수만 할래
        //    할 수도 있는 거 아냐?»). 칸을 하나 건드리고 나갔던 사람이 돌아와 바로 20칸을 맞닥뜨리는 건
        //    선택을 뺏는 것이다. 값은 그대로 남아 있으니 어느 쪽을 골라도 손해가 없다.
      }
    } catch { try { localStorage.removeItem(DRAFT_KEY); } catch {} /* 깨졌거나 오래됐으면 지우고 빈 폼으로 */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    // 🛑 보낸 뒤에는 저장하지 않는다 — 안 그러면 «보내기» 직후 지운 임시저장을, 아직 안 끝난
    //    0.4초 저장이 되살려 다음에 열었을 때 이미 보낸 내용이 다시 뜬다
    //    (2026-08-19 실서비스에서 자동 클릭 검사가 잡음. 로컬에선 빨라서 안 보였다).
    if (!hydrated || sent) return;
    // 🛑 글자 하나 칠 때마다 저장하지 않는다 — 긴 글칸(3000자)에서 매 타자마다 통째로 JSON 으로 만들어
    //    쓰는 일이 벌어져 느린 기기에서 입력이 밀린다. 0.4초 멈추면 그때 저장한다(독립 리뷰).
    const timer = setTimeout(() => {
      try {
        // autoFilled(«서류에서 읽은 값» 표시)도 같이 — 안 넣으면 돌아왔을 때 기계가 읽은 값이 «사람이 쓴 값»으로
        // 둔갑해, 더 선명한 서류를 올려도 고쳐 쓰지 않는다(독립 리뷰).
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ values, consents, mode, autoFilled, at: Date.now() }));
        setSavedAt(new Date());
      } catch { /* 저장 공간이 없어도 폼은 계속 쓸 수 있어야 한다 */ }
    }, 400);
    return () => clearTimeout(timer);
  }, [hydrated, sent, values, consents, mode, autoFilled]);

  // v 에 함수를 줄 수 있다 — 서류 판독처럼 «먼저 목록에 올리고 나중에 결과를 끼워 넣는»
  // 경우엔 그때의 최신 목록을 받아야 한다(안 그러면 여러 개 올릴 때 앞의 결과가 지워진다).
  const set = (name, v) => {
    setValues((p) => {
      const next = { ...p, [name]: typeof v === "function" ? v(p[name]) : v };
      valuesRef.current = next;   // 🛑 «지금 값»을 그리기 뒤로 미루지 마라 — 아래 applyAutoFill 이 이걸 보고
      return next;                //    판단한다. 늦게 갱신되면 방금 사람이 친 글자를 서류 판독이 덮어쓴다.
    });
    // 사람이 직접 고친 칸은 「저희가 읽은 값」 표시를 뗀다 — 안 그러면 표시가 거짓말이 된다.
    setAutoFilled((p) => {
      if (!p[name]) return p;
      const { [name]: _, ...rest } = p;
      return rest;
    });
  };

  /**
   * 서류에서 읽어낸 값으로 «빈 칸만» 채운다.
   * 🛑 사람이 이미 쓴 칸은 절대 덮어쓰지 않는다. 우리가 채운 칸끼리는 나중 서류가 이긴다.
   */
  const applyAutoFill = (fields) => {
    // ⚠️ setValues 의 updater 안에서 계산한 결과를 «밖에서» 읽으면 안 된다 — updater 는
    //    나중에 돌아서 바깥 변수가 비어 있다(2026-08-14 실측: 칸은 채워지는데 표시가 안 붙었다).
    //    그래서 «지금 값»을 ref 로 보고 여기서 동기적으로 판단한다.
    const cur = valuesRef.current;
    const patch = {};
    const marked = {};
    for (const [k, v] of Object.entries(fields)) {
      const now = cur[k];
      const empty = now === undefined || now === null || String(now).trim() === "";
      if (empty || autoFilledRef.current[k]) { patch[k] = v; marked[k] = true; }
    }
    if (!Object.keys(patch).length) return;
    // 표를 즉시 갱신한다 — 서류 여러 개를 «동시에» 읽으므로, 다음 서류가 이 결과를 보고 판단해야 한다.
    valuesRef.current = { ...cur, ...patch };
    autoFilledRef.current = { ...autoFilledRef.current, ...marked };
    setValues((p) => ({ ...p, ...patch }));
    setAutoFilled((p) => ({ ...p, ...marked }));
  };

  // 문턱 ① 접수 — 보내기 버튼을 막는 유일한 것. 5칸 + 동의.
  const missIntake = useMemo(() => missingIntake(values), [values]);
  const consentOk = CONSENTS.filter((c) => c.required).every((c) => consents[c.name]);
  const intakeTotal = fieldsByReq("intake").length + 1; // 동의 묶음을 한 칸으로 센다
  // 🛑 «비어 있지 않다»만 보지 마라 — 「11」을 넣어도 단추가 켜져서 서버가 거부하고, 화면은 엉뚱하게
  //    「잠시 뒤 다시 시도」라고 했다(2026-08-19 PO 실측). 서버(z.string().email())와 같은 눈으로 본다.
  //    틀린 이메일은 «남은 칸 1»로 센다 — 안 그러면 막대가 「0칸만 채우면」이라 하면서 단추는 막혀 있다.
  const emailBad = !!values.email && !isValidEmail(String(values.email).trim());
  const intakeLeft = missIntake.length + (consentOk ? 0 : 1) + (emailBad ? 1 : 0);
  // 🛑 자료를 «올리는 중»에 보내면 경로 없는 첨부가 저장돼 코디가 못 여는 서류가 생긴다(독립 리뷰).
  //    다 올라갈 때까지 단추를 막는다 — 자료 묶음이 첫 묶음이라 접수 6칸을 치는 동안 대개 끝난다.
  const uploadingN = (Array.isArray(values.envelope) ? values.envelope : []).filter((d) => d && (d.uploading || d.reading)).length;
  const canSend = intakeLeft === 0 && uploadingN === 0;

  // 문턱 ② 의뢰 준비 — 아무것도 막지 않는다. 얼마나 왔는지만 보여준다.
  const missRef = useMemo(() => missingForReferral(values), [values]);
  const refTotal = useMemo(() => fieldsByReq("referral").length, []);
  const readiness = useMemo(() => referralReadiness(values), [values]);

  // 묶음 머리의 「n칸 남음」은 «의뢰용으로 아직 빈 칸» 수. 접수 문턱과 헷갈리지 않게
  // 묶음 안에서 접수 칸이 비어 있으면 그것부터 센다.
  const secState = (sec) => {
    const n = sec.fields.filter((f) => (f.req === "intake" && missIntake.includes(f.name))
                                    || (f.req === "referral" && missRef.includes(f.name))).length;
    // 동의는 「먼저, 이것만」 묶음 안에 들어 있으므로 그 묶음이 같이 센다.
    return sec.id === "essentials" ? n + (consentOk ? 0 : 1) : n;
  };

  // 아직 안 채운 접수 칸으로 데려간다. 「6칸 남음」이라고 세어주면서 어디인지 안 알려주면
  // 사람이 화면을 뒤진다(2026-08-12 PO: «마지막 한 칸은 어디 있는지 찾기도 힘들다»).
  const jumpTo = (name, secId) => {
    if (!name) return;
    setOpen((p) => ({ ...p, [secId]: true }));
    setHighlight(name);
    requestAnimationFrame(() => {
      document.getElementById(name === "consent" ? "consent-block" : `f-${name}`)
        ?.scrollIntoView({ behavior: scrollBehavior(), block: "center" });
    });
  };
  const jumpToNext = () => jumpTo(missIntake[0] || (emailBad ? "email" : null) || (consentOk ? null : "consent"), "essentials");

  const nextRef = useMemo(() => {
    const s = nextReferralSection(values);
    return s && { ...s, label: lab(s.title, lang) };
  }, [values, lang]);

  // 🛑 «상태(sending)»만으로 막지 마라 — 같은 순간에 두 번 들어오면 둘 다 false 를 본다(고르기 칸에서 실제로
  //    같은 부류가 터졌다, 2026-08-19). ref 는 그 자리에서 바뀌므로 두 번째는 반드시 걸린다. 문의가 2건 생기면
  //    코디가 같은 환자를 두 번 상대하고 KHIDI 실적도 2건이 된다.
  const sendingRef = useRef(false);
  // 조건부 칸(showIf)이 숨겨졌으면 그 값도 보내지 않는다 — 「병력 없음」을 고르고도 앞서 적은 병력 설명이
  // 같이 나가 서로 모순되는 의뢰서가 됐다(독립 리뷰). 화면에 안 보이는 건 안 보낸다.
  function dropHiddenValues(v) {
    const out = { ...v };
    for (const sec of SECTIONS) for (const fld of sec.fields) if (fld.showIf && !fld.showIf(v)) delete out[fld.name];
    // 서류 목록의 화면용 진행 상태는 서버에 보낼 게 아니다
    if (Array.isArray(out.envelope)) out.envelope = out.envelope.map(({ _id: _i, uploading: _u, pct: _p, reading: _r, ...d }) => d);
    return out;
  }

  async function send() {
    if (!canSend || sending || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setSendError("");
    try {
      const res = await fetch("/api/inquiries/referral", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          // 🛑 「상담만」이면 «화면에 보인 칸»만 보낸다. 전체 모드에서 자료를 올렸다가 되돌아가 「상담만」으로
          //    보내면 자료가 같이 실려 나갔다(2026-08-19 PO 실측 #129: 「접수만 했는데 자료가 첨부돼 버렸다」).
          //    사람은 «지금 보이는 것»을 보낸다고 생각한다 — 안 보이는 건 안 보내야 맞다.
          //    (임시저장엔 그대로 남아 있으니, 나중에 전체로 돌아오면 다시 쓸 수 있다.)
          ...(mode === "quick"
            ? Object.fromEntries((SECTIONS.find((s) => s.id === "essentials")?.fields || []).map((f) => [f.name, values[f.name]]))
            : dropHiddenValues(values)),
          mode,
          consents,
          sourceLocale: lang,
          landingPath: typeof location !== "undefined" ? location.pathname : null,
          referrerHost: typeof document !== "undefined" && document.referrer
            ? new URL(document.referrer).host : null,
        }),
      });
      const j = await res.json();
      if (!j?.ok) {
        // 서버는 코드형 오류만 준다(보안 규칙). 사람 말로 바꾸는 건 여기서 한다.
        // 코드마다 «다음에 뭘 하면 되는지»가 다르다 — 형식 오류에 「다시 시도」라고 하면 틀린 조언이다.
        const code = j?.error;
        ga(GA_EVENTS.INQUIRY_SUBMIT_FAILED, { step: 1, form: "referral", code: code || "unknown" });
        setSendError(tr(
          code === "rate_limit_exceeded" ? "errTooMany"
          : code === "validation_error" || code === "invalid_json" || code === "broken_encoding" ? "errInvalid"
          : code === "consent_required" ? "errConsent"
          : "errSend", lang));
        return;
      }
      setSent(j);
      // ⭐ 핵심 전환 — 서버 저장이 확인된 이 지점에서만 발화(옛 퍼널과 같은 이벤트·같은 자리 — 깔때기 집계가 이어져야 한다).
      ga(GA_EVENTS.INQUIRY_SUBMITTED, {
        cancer_type: values.cancerType || null, nationality: values.nationality || null,
        preferred_language: values.patientLang || null, from_ai_chat: false, form: "referral", mode,
      });
      // 보냈으면 임시저장은 지운다 — 남겨두면 다음에 열었을 때 이미 보낸 내용이 다시 뜬다.
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
    } catch {
      ga(GA_EVENTS.INQUIRY_SUBMIT_FAILED, { step: 1, form: "referral", code: "network" });
      setSendError(tr("errSend", lang));
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  useEffect(() => { autoFilledRef.current = autoFilled; }, [autoFilled]);
  useEffect(() => { valuesRef.current = values; }, [values]);

  // ⚠️ IntersectionObserver 를 쓰지 마라. 화면을 안 그리는 환경(미리보기 칸 등)에서는
  //    «한 번도 안 울린다»(2026-08-14 실측: 새로 만든 감시기도 0회). 그러면 고정 막대가
  //    영영 안 뜨는데 코드만 봐선 멀쩡해 보인다. 위치를 직접 재는 쪽이 어디서나 돈다.
  useEffect(() => {
    const measure = () => {
      const h = headRef.current?.getBoundingClientRect();
      const f = footRef.current?.getBoundingClientRect();
      setHeadOut(!!h && h.bottom < 0);
      setFootOut(!!f && f.top > window.innerHeight);
    };
    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [mode, sent]);

  // 데려간 칸에 테두리를 잠깐 켜 둔다. 포커스만으론 어느 칸인지 눈에 안 들어온다
  // (실측: 스크롤은 됐는데 focus 가 다시 풀려 아무 표시도 안 남았다).
  useEffect(() => {
    if (!highlight) return;
    // 🛑 이 변수를 t 로 되돌리지 마라 — 사전 함수 t() 를 가려서 이 안의 t("키") 가
    //    「숫자를 호출」하게 된다. 빌드·타입·검사는 다 통과하고 «화면에서만» 터진다.
    const timer = setTimeout(() => setHighlight(null), 2500);
    return () => clearTimeout(timer);
  }, [highlight]);

  if (sent) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-2xl px-4 py-16">
          <div className="rounded-xl border border-emerald-200 bg-white p-6 shadow-sm md:p-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-700">
              <Check size={22} className="text-white" strokeWidth={3} />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-gray-900">{tr("doneTitle", lang)}</h1>
            <p className="mt-2 text-sm leading-relaxed text-gray-600 md:text-base">{tr("doneBody", lang)}</p>
            <p className="mt-5 text-sm text-gray-600">
              {tr("doneNo", lang)} <span data-testid="inquiry-no" className="font-bold text-gray-900 tabular-nums">#{sent.inquiryId}</span>
            </p>
            {/* 주소는 서버가 만든 걸 그대로 쓴다 — 화면에서 조립하면 실제 경로와 어긋난다
                (2026-08-14: 「/t/」로 지어냈는데 진짜는 「/claim/」이었다). */}
            {sent.trackUrl && (
              <>
                <a id="track-url" href={sent.trackUrl}
                   className="mt-2 block break-all rounded-xl bg-gray-50 px-4 py-3 text-xs text-teal-800 underline">
                  {sent.trackUrl}
                </a>
                {/* 폰에서 긴 주소를 손으로 긁어 복사하기 어렵다(2026-08-19 폰 실측). 한 번 누르면 끝. */}
                <button type="button"
                        onClick={async () => {
                          // ① 요즘 방식 → ② 옛 방식(임시 칸에 넣고 복사 명령) → ③ 둘 다 막히면 주소를 «선택»만이라도 해 준다
                          //    (2026-08-19 실측: 클립보드가 막힌 환경에서 조용히 실패해 아무 표시가 없었다).
                          let ok = false;
                          try { await navigator.clipboard.writeText(sent.trackUrl); ok = true; } catch { /* 아래로 */ }
                          if (!ok) {
                            try {
                              const ta = document.createElement("textarea");
                              ta.value = sent.trackUrl; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
                              document.body.appendChild(ta); ta.select(); ok = document.execCommand("copy"); document.body.removeChild(ta);
                            } catch { /* 아래로 */ }
                          }
                          if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
                          else { const a = document.getElementById("track-url"); if (a) { const r = document.createRange(); r.selectNodeContents(a); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r); } }
                        }}
                        className="mt-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-all duration-200 hover:border-gray-400">
                  {copied ? tr("copied", lang) : tr("copyLink", lang)}
                </button>
              </>
            )}
            <p className="mt-3 text-xs leading-relaxed text-gray-600">{tr("doneMail", lang)}</p>
          </div>
        </div>
      </div>
    );
  }

  // 아직 안 골랐으면 갈림길만 보여준다. 15칸을 먼저 들이대지 않는다.
  if (mode === null) {
    const savedN = Object.values(values).filter((v) => !(v == null || v === "" || (Array.isArray(v) && v.length === 0))).length;
    return <ModePicker lang={lang} onPick={setMode} savedN={savedN}
                       quickN={fieldsByReq("intake").length + 1}
                       fullN={fieldsByReq("intake").length + fieldsByReq("referral").length + 1} />;
  }
  const quick = mode === "quick";
  // 「연락처만」이면 첫 묶음만 그린다. 나머지는 아예 «안 보여준다» — 접어두기만 해도
  // 묶음 줄 5개가 보여서 「아직 이만큼 남았구나」로 읽힌다(PO 2026-08-13).
  // 「연락처만」은 접수 묶음 하나만 보여준다.
  // ⚠️ slice(0,1) 로 쓰지 마라 — 자료 묶음이 맨 앞으로 오면서 엉뚱한 묶음이 나온다(2026-08-14).
  const shownSections = quick ? SECTIONS.filter((s) => s.id === "essentials") : SECTIONS;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">

        {/* 머리 */}
        <div ref={headRef} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:p-8">
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
            {quick ? tr("titleQuick", lang) : tr("title", lang)}
          </h1>
          <p className="mt-2 text-sm text-gray-600 md:text-base">
            {quick ? tr("subQuick", lang) : tr("sub", lang)}
          </p>
          {/* 「연락처만」일 땐 막대도 하나다 — 안 채울 것의 진행률을 보여주면 그게 곧 부담이다. */}
          <div className="mt-6 space-y-4">
            {/* 「연락처만」일 땐 제목이 이미 «상담 신청»이라 막대 이름을 또 달면 같은 말이 두 번 뜬다. */}
            <Bar label={quick ? "" : tr("barIntake", lang)}
                 pct={((intakeTotal - intakeLeft) / intakeTotal) * 100}
                 tone={canSend ? "done" : "todo"}
                 meta={canSend ? tr("barIntakeOk", lang) : tr("barIntakeNo", lang, { n: intakeLeft })}
                 action={canSend ? null : { label: tr("jump", lang), onClick: jumpToNext }} />
            {!quick && (
              <Bar label={tr("barReferral", lang)}
                   pct={readiness} tone="soft"
                   meta={readiness === 100
                     ? tr("barRefDone", lang)
                     : tr("barRefMeta", lang, { done: refTotal - missRef.length, total: refTotal })}
                   action={nextRef ? { label: tr("barNext", lang, { f: nextRef.label, n: nextRef.n }),
                                       onClick: () => jumpTo(nextRef.name, nextRef.secId) } : null} />
            )}
          </div>
          {!quick && (
            <>
              {/* 🛑 「너무 많으신가요? 연락처만 남기고…」 되돌아가기 단추를 여기 다시 달지 마라(2026-08-19 PO: «오바다»).
                  전체 의뢰서는 6칸만 채우면 보내지고 나머지는 안 막으니, 되돌아갈 이유가 애초에 없다.
                  「접수만 할래」는 갈림길에서 고르는 것이다 — 갈림길은 이제 매번 뜬다. */}
              {/* 🛑 「이어서 채우실 수 있습니다」로 되돌리지 마라(2026-08-19 실측). 이어채우기 화면(/claim)엔
                  «자료 더 올리기·글 덧붙이기»만 있고 남은 칸을 채우는 길은 없다. 약속은 있는 만큼만.
                  칸 이어채우기를 붙일지는 PO 판단 항목(PROJECT_CONTEXT 참고). */}
              <p className="mt-4 rounded-xl bg-teal-50 px-4 py-3 text-xs leading-relaxed text-teal-800 md:text-sm">
                {tr("laterNote", lang)}
              </p>
            </>
          )}
        </div>

        {/* 묶음 */}
        <div className="mt-5 space-y-3">
          {shownSections.map((sec, i) => {
            const left = secState(sec);
            const isOpen = !!open[sec.id];
            const card = (
              <section key={sec.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                {/* 낭독기(스크린리더)가 「펼쳐졌나 접혔나」를 읽을 수 있어야 한다 — 없으면 눈으로만 알 수 있는 상태가 된다. */}
                <button type="button" onClick={() => setOpen((p) => ({ ...p, [sec.id]: !p[sec.id] }))}
                        aria-expanded={isOpen} aria-controls={`sec-${sec.id}`}
                        className="flex w-full items-center gap-3 px-4 py-4 text-left md:px-6">
                  <span className={`flex h-7 w-7 flex-none items-center justify-center rounded-lg text-xs font-bold ${
                    left === 0 ? "bg-emerald-700 text-white" : "bg-gray-200 text-gray-700"}`}>
                    {left === 0 ? <Check size={15} /> : i + 1}
                  </span>
                  <span className="flex-1 font-bold text-gray-900">{lab(sec.title, lang)}</span>
                  <span className="text-xs text-gray-600 tabular-nums md:text-sm">
                    {left === 0 ? tr("done", lang) : tr("left", lang, { n: left })}
                  </span>
                  <ChevronDown size={16} className={`text-gray-500 transition-all duration-200 ${isOpen ? "rotate-180" : ""}`} />
                </button>

                {isOpen && (
                  <div id={`sec-${sec.id}`} className="border-t border-gray-200 px-4 pb-6 md:px-6">
                    {sec.lead && (
                      <p className="mt-4 text-xs leading-relaxed text-gray-600 md:text-sm">{lab(sec.lead, lang)}</p>
                    )}
                    {sec.id === "documents" ? (
                      <DocSection lang={lang} sec={sec} values={values} set={set}
                                  onAutoFill={applyAutoFill} autoFilled={autoFilled} />
                    ) : (
                      <div className="flex flex-wrap gap-x-4">
                        {/* showIf 가 붙은 칸은 «조건이 맞을 때만» 나온다 — 고르기 칸 밑에
                            빈 글칸이 늘 떠 있으면 「둘 다 해야 하나」로 읽힌다(2026-08-18 PO). */}
                        {sec.fields.filter((f) => !f.showIf || f.showIf(values)).map((f) => (
                          <Fragment key={f.name}>
                            <Field f={f} lang={lang} value={values[f.name]} onChange={set}
                                   lit={highlight === f.name} fromDoc={!!autoFilled[f.name]}
                                   bare={sec.id !== "essentials"}
                                   all={values}
                                   error={f.name === "email" && emailBad ? tr("emailBad", lang) : null} />
                            {/* 안내는 «고른 칸 바로 밑»에 붙는다. 묶음 끝에 두면 758px 아래라
                                화면 밖이고, 골라도 아무 일 없는 것처럼 보인다(2026-08-13 PO 실사용). */}
                            {f.name === "stage" && LATE_STAGES.includes(values.stage) && (
                              <div className="w-full">
                                <LateStageNotice lang={lang} values={values} set={set} />
                              </div>
                            )}
                          </Fragment>
                        ))}
                      </div>
                    )}
                    {/* 동의는 접수 문턱이므로 「먼저, 이것만」 안에 둔다 — 문턱 칸을 흩어놓지 않는다. */}
                    {sec.id === "essentials" && (
                      <div id="consent-block"
                           className={`mt-6 border-t border-gray-200 pt-5 ${
                             highlight === "consent" ? "-mx-2 rounded-xl bg-teal-50 px-2 pb-3 ring-2 ring-teal-700" : ""}`}>
                        <p className="text-sm font-semibold text-gray-700">{tr("consentTitle", lang)}</p>
                        <ConsentBlock lang={lang} consents={consents} setConsents={setConsents} />
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
            // 🛑 «연락처» 묶음 뒤에 붙인다 — 자료 묶음 뒤에 붙이면 「자료만 올리면 끝」으로 읽힌다
            //    (2026-08-18 PO: «자료 업로드 하고 땡이야? 정작 기본 연락처는 그 다음인데?»).
            return sec.id === "essentials" && !quick ? (
              <div key={sec.id} className="space-y-3">
                {card}
                {/* 🛑 두 문장을 한 줄로 붙이지 마라(2026-08-18 PO). 「무엇이냐」와 「그래서 뭘 하면 좋냐」는
                    따로 읽혀야 한다. */}
                <div className="space-y-1.5 px-1 pt-2">
                  <p className="text-xs leading-relaxed text-gray-600 md:text-sm">{tr("restNote", lang)}</p>
                  <p className="text-xs leading-relaxed text-gray-600 md:text-sm">{tr("restNote2", lang)}</p>
                </div>
              </div>
            ) : card;
          })}
        </div>

        {/* 「연락처만」으로 시작해도 문은 열어둔다 — 마음이 바뀌면 이어서 채운다. */}
        {quick && (
          <button type="button" onClick={() => setMode("full")}
                  className="mt-4 w-full rounded-xl border border-teal-100 bg-teal-50 px-4 py-3.5 text-left text-sm font-semibold text-teal-800 transition-all duration-200 hover:bg-teal-100">
            {tr("switchToFull", lang)} →
          </button>
        )}

        {/* 바닥 */}
        <div ref={footRef} className="mt-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
          <button type="button" data-testid="send" disabled={!canSend || sending} onClick={send}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-base font-bold transition-all duration-200 ${
                    canSend && !sending ? "bg-teal-700 text-white hover:bg-teal-800" : "cursor-not-allowed bg-gray-200 text-gray-600"}`}>
            {sending && <Loader2 size={16} className="animate-spin" />}
            {sending ? tr("sending", lang)
                     : canSend ? tr(quick ? "submitQuick" : "submit", lang)
                               : tr("submitOff", lang, { n: intakeLeft })}
          </button>
          {sendError && (
            <p className="mt-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {sendError}
            </p>
          )}
          <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-gray-600">
            <span>{tr("autosave", lang)}</span>
            {savedAt && <span className="tabular-nums">{tr("saved", lang, {
              t: savedAt.toLocaleTimeString(lang === "ko" ? "ko-KR" : "en-GB", { hour: "2-digit", minute: "2-digit" }) })}</span>}
          </div>
        </div>

        {/* 고정 막대에 마지막 줄이 가려지지 않게 자리를 비워둔다. */}
        {headOut && footOut && <div className="h-24" aria-hidden />}
      </div>

      {/* 아래 고정 막대 — 진행상황과 보내기를 «항상» 손 닿는 곳에 둔다.
          실측 2026-08-14: 문서가 4,274px 인데 진행 막대는 346px 에서 끝난다.
          «8% 만 내려도» 진행상황도 보내기 버튼도 둘 다 안 보였다(PO 지적).
          머리와 바닥이 «둘 다» 화면 밖일 때만 뜬다 — 같은 걸 두 번 보여주지 않는다. */}
      {headOut && footOut && (
        // 🛑 bottom-0 로 두지 마라 — 첫 방문자에겐 쿠키 동의 띠(z-9999)가 이 막대를 통째로 덮어
        //    「보내기」가 안 눌린다(2026-08-19 자동 클릭 검사가 잡음: 「띠가 클릭을 가로챈다」).
        //    사이트 규칙: 바닥에 붙는 것은 배너 높이만큼 비켜 앉는다(src/components/CookieConsent.jsx).
        <div className="fixed inset-x-0 bottom-[var(--cookie-banner-h,0px)] z-40 border-t border-gray-200 bg-white/95 backdrop-blur">
          <div className="mx-auto max-w-3xl px-4 py-3">
            {/* 접수가 끝나면 막대가 100% 로 굳어 죽는다 — 그때부터는 «의뢰 준비도»를 계속 움직인다. */}
            <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
              <div className={`h-full rounded-full transition-all duration-200 ${canSend ? "bg-teal-700" : "bg-gray-400"}`}
                   style={{ width: `${canSend && !quick ? Math.max(readiness, 4)
                                                        : Math.max(0, ((intakeTotal - intakeLeft) / intakeTotal) * 100)}%` }} />
            </div>
            <div className="mt-2 flex items-center gap-3">
              <span className="min-w-0 flex-1 text-xs leading-snug text-gray-600 md:text-sm">
                <span className="block truncate">
                  {canSend ? tr("barIntakeOk", lang) : tr("barIntakeNo", lang, { n: intakeLeft })}
                </span>
                {/* 「진단에 필요한 내용 0%」는 «실패»로 읽힌다 — 다음 한 칸을 이름으로 지목하고 이유를 붙인다. */}
                {!quick && nextRef && (
                  <span className="mt-0.5 block truncate text-xs text-gray-500">
                    <button type="button" onClick={() => jumpTo(nextRef.name, nextRef.secId)}
                            className="font-semibold text-teal-700 underline underline-offset-2 hover:text-teal-800">
                      {tr("barNext", lang, { f: nextRef.label, n: nextRef.n })}
                    </button>
                    <span className="hidden sm:inline"> · {tr("barWhy", lang)}</span>
                  </span>
                )}
              </span>
              {canSend ? (
                <button type="button" data-testid="send-bar" disabled={sending} onClick={send}
                        className="flex flex-none items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:bg-teal-800">
                  {sending && <Loader2 size={14} className="animate-spin" />}
                  {sending ? tr("sending", lang) : tr(quick ? "submitQuick" : "submit", lang)}
                </button>
              ) : (
                <button type="button" onClick={jumpToNext}
                        className="flex-none rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:bg-teal-800">
                  {tr("jump", lang)}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 칸 하나 ─────────────────────────────────────────────── */
// bare = 「진단에 필요」·「(선택)」 꼬리표를 달지 않는 칸.
// 🛑 3번 묶음부터 꼬리표를 되살리지 마라(2026-08-18 PO: 「뭐는 진단에 필요고 뭐는 선택이고
//    이게 애매하다 — 어차피 주면 좋은 건데」). 거기부터는 «전부 채우면 좋은 것»이라
//    칸마다 등급을 매기면 사람은 「선택이면 안 해도 되겠네」로 읽는다.
//    묶음 위 한 줄이 «많이 알려주실수록 좋다»를 대신 말한다.
function Field({ f, lang, value, onChange, lit, fromDoc, bare, error, all }) {
  if (f.type === "note") {
    return <p className="mt-2 w-full text-xs leading-relaxed text-gray-600">{lab(f.label, lang)}</p>;
  }

  const label = lab(f.label, lang);
  const ph = f.placeholder ? lab(f.placeholder, lang) : "";
  const box = "w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 " +
              "placeholder:text-gray-500 focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700";

  // 화면낭독기용 — 라벨과 입력칸을 for/id 로 «연결»한다. 눈으로는 붙어 보여도 연결이 없으면
  // 낭독기가 「편집 칸, 빈칸」이라고만 읽는다(2026-08-19 감사: 20칸 전부 연결 없음).
  const inputId = `in-${f.name}`;
  let control = null;
  switch (f.type) {
    case "text": case "email": case "url": case "phone":
      control = <input id={inputId} type={f.type === "email" ? "email" : f.type === "url" ? "url" : "text"}
                       className={box} placeholder={ph} value={value || ""}
                       onChange={(e) => onChange(f.name, e.target.value)} />;
      break;
    case "date":
      control = <input id={inputId} type="date" className={box} value={value || ""} onChange={(e) => onChange(f.name, e.target.value)} />;
      break;
    case "month":
      control = <input id={inputId} type="month" className={box} value={value || ""} onChange={(e) => onChange(f.name, e.target.value)} />;
      break;
    case "textarea":
      // 라벨 없는 딸린 글칸(병력 설명 등)은 칸 안 안내가 곧 이름이다 — 낭독기에도 그걸 준다
      control = <textarea id={inputId} rows={3} className={box} placeholder={ph} aria-label={label ? undefined : ph} value={value || ""}
                          onChange={(e) => onChange(f.name, e.target.value)} />;
      break;
    case "check":
      return (
        <div className="mt-4 flex-1 basis-full md:basis-[calc(50%-0.5rem)]">
          <Toggle checked={!!value} onClick={() => onChange(f.name, !value)} label={label} />
        </div>
      );
    case "chips": case "chipsMulti": {
      const multi = f.type === "chipsMulti";
      const cur = multi ? (value || []) : value;
      control = (
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby={`lbl-${f.name}`}>
          {f.options.map((o) => {
            const on = multi ? cur.includes(o.value) : cur === o.value;
            // 🛑 «그 순간의 값(cur)»으로 계산해 넘기지 마라 — 화면이 바쁠 때(서류 판독 중) 두 개를
            //    빠르게 누르면 둘 다 옛 값을 보고 «마지막 것만» 남는다(2026-08-19 실측: 2개 눌렀는데 1개 저장).
            //    최신 값을 받아 계산하는 함수로 넘긴다(set() 이 함수형을 받는다).
            return (
              <button key={o.value} type="button"
                onClick={() => onChange(f.name, multi
                  ? (prev) => { const p = Array.isArray(prev) ? prev : []; return p.includes(o.value) ? p.filter((x) => x !== o.value) : [...p, o.value]; }
                  : (on ? "" : o.value))}
                className={`rounded-full border px-4 py-2 text-sm transition-all duration-200 ${
                  on ? "border-teal-700 bg-teal-50 font-semibold text-teal-800" : "border-gray-300 text-gray-700 hover:border-gray-400"}`}>
                {lab(o.label, lang)}
              </button>
            );
          })}
        </div>
      );
      break;
    }
    case "nationality": case "lang": case "cancerType": case "stage": {
      const opts =
        f.type === "nationality" ? NATIONALITIES.map((o) => ({
          value: o.value, text: typeof o.label === "string" ? o.label : lab(o.label, lang) })) :
        f.type === "lang" ? LANGS.map((o) => ({ value: o.value, text: o.label })) :
        f.type === "cancerType" ? CANCER_TYPES.map((o) => ({ value: o.value, text: optLabel(o, lang) })) :
        STAGES.map((o) => ({ value: o.value, text: optLabel(o, lang) }));
      control = (
        <select id={inputId} className={box} value={value || ""} onChange={(e) => onChange(f.name, e.target.value)}>
          <option value="">{tr("pick", lang)}</option>
          {opts.map((o) => <option key={o.value} value={o.value}>{o.text}</option>)}
        </select>
      );
      break;
    }
    case "icdSuggest": {
      // 코드를 못 고르는 게 정상이다 — 「모르겠습니다」가 기본이고 관문이 아니다.
      // 위에서 고른 암종이 있으면 그 부위의 ICD-10 상위 코드를 «권한다». 자동으로 채우지는 않는다:
      // 세부 자리와 병기는 의사가 정하는 것이라, 우리가 넣어 버리면 환자가 그대로 확정으로 읽는다.
      const sugg = icd10SuggestionFor(all?.cancerType);
      const unknown = value === "__unknown__";
      control = (
        <>
          <input id={inputId} className={box} placeholder={sugg ? sugg.code : "C18.2"} disabled={unknown}
                 value={unknown ? "" : (value || "")} onChange={(e) => onChange(f.name, e.target.value)} />
          {sugg && !unknown && value !== sugg.code && (
            <button type="button" onClick={() => onChange(f.name, sugg.code)}
                    className="mt-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 transition-all duration-200 hover:bg-teal-100">
              {tr("icdSuggest", lang)}: {sugg.code} · {cancerTypeLabelL(all.cancerType, lang)}
            </button>
          )}
          <Toggle checked={unknown} onClick={() => onChange(f.name, unknown ? "" : "__unknown__")}
                  label={tr("icdUnknown", lang)} className="mt-2" />
        </>
      );
      break;
    }
    case "cdFolder":
      return <CdFolder f={f} lang={lang} value={value} onChange={onChange} />;
    default:
      control = <input id={inputId} className={box} value={value || ""} onChange={(e) => onChange(f.name, e.target.value)} />;
  }

  return (
    <div id={`f-${f.name}`}
         className={`mt-4 min-w-0 transition-all duration-200 ${
           f.half ? "flex-1 basis-full md:basis-[calc(50%-0.5rem)]" : "w-full"
         } ${lit ? "-mx-2 rounded-xl bg-teal-50 px-2 py-2 ring-2 ring-teal-700" : ""}`}>
      {/* 라벨 없는 칸(바로 위 칸에 딸린 서술 칸)은 「(선택)」만 덩그러니 뜨지 않게 통째로 뺀다. */}
      {label && (
        <label id={`lbl-${f.name}`} htmlFor={inputId} className="mb-1.5 block text-sm font-semibold text-gray-700">
          {label}
          {/* 별표는 «접수 문턱»에만. 의뢰용 칸은 막지 않으므로 별표가 아니라 회색 꼬리표다 —
              별표를 14개 붙이면 사람은 그걸 «다 채워야 한다»로 읽고 창을 닫는다. */}
          {f.req === "intake" && <span className="ml-0.5 text-red-600">*</span>}
          {!bare && f.req === "referral" && (
            <span className="ml-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
              {tr("forReferral", lang)}
            </span>
          )}
          {!bare && f.req === "optional" && <span className="ml-1.5 text-xs font-normal text-gray-500">{tr("optional", lang)}</span>}
        </label>
      )}
      {control}
      {/* «틀린 것»은 안내 규칙(칸 밑 설명 금지)의 예외다 — 이건 설명이 아니라 «지금 막힌 이유»고,
          맞게 고치면 사라진다. */}
      {error && <p className="mt-1.5 text-xs font-semibold text-red-600">{error}</p>}
      {/* 우리가 서류에서 읽어 채운 칸이라는 «출처 표시». 사람이 고치면 사라진다. */}
      {fromDoc && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
          <Check size={12} strokeWidth={3} />{tr("fromDoc", lang)}
        </p>
      )}
      {/* 🛑 «칸 밑 안내 줄»을 되살리지 마라(2026-08-18 PO: 「뭐는 칸 안에 있고 뭐는 밑에 있고
          뒤죽박죽인데」). 안내는 한 자리에만 — 글로 쓰는 칸은 «칸 안»(placeholder),
          고르는 칸은 «칸 이름»으로 끝낸다. 규칙 본문은 referralSchema.js 머리에 있다. */}
    </div>
  );
}

/**
 * 갈림길 — 맨 처음 화면. 「받을 양」을 사용자가 고르게 한다.
 *
 * 왜: 15칸을 처음부터 다 보여주면 부담스러워 창을 닫는다. 그렇다고 안 받을 수도 없는
 *     정보다(병원이 요구한다). 그래서 «안 받는 것»이 아니라 «언제 받을지»를 나눈다.
 *     제출은 여전히 한 번이고, 「연락처만」으로 시작해도 언제든 이어서 채울 수 있다.
 */
// data-testid 는 «문구가 바뀌어도 자동 검사가 안 깨지게» 다는 이름표다(카피는 PO 가 자주 고친다).
function ModePicker({ lang, onPick, quickN, fullN, savedN = 0 }) {
  const Card = ({ onClick, title, body, meta, primary, testId }) => (
    <button type="button" onClick={onClick} data-testid={testId}
            className={`w-full rounded-xl border p-5 text-left transition-all duration-200 md:p-6 ${
              primary ? "border-teal-700 bg-white shadow-sm hover:bg-teal-50"
                      : "border-gray-200 bg-white shadow-sm hover:border-gray-300"}`}>
      <p className="text-base font-bold text-gray-900 md:text-lg">{title}</p>
      {(Array.isArray(body) ? body : [body]).map((line, i) => (
        <p key={i} className={`text-sm leading-relaxed text-gray-600 ${i === 0 ? "mt-1.5" : "mt-2"}`}>{line}</p>
      ))}
      <p className="mt-3 inline-block rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600 tabular-nums">
        {meta}
      </p>
    </button>
  );
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-10 md:py-16">
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">{tr("pickTitle", lang)}</h1>
        <p className="mt-2 text-sm text-gray-600 md:text-base">{tr("pickSub", lang)}</p>
        {/* 쓰다 나갔던 사람 — 「저장돼 있다」를 여기서 말해줘야 안심하고 다시 고른다 */}
        {savedN > 0 && (
          <p className="mt-3 rounded-xl bg-teal-50 px-4 py-2.5 text-xs text-teal-800 md:text-sm">{tr("pickSaved", lang, { n: savedN })}</p>
        )}
        <div className="mt-6 space-y-3">
          <Card primary testId="pick-quick" onClick={() => onPick("quick")}
                title={tr("quickTitle", lang)} body={tr("quickBody", lang)}
                meta={tr("quickMeta", lang, { n: quickN })} />
          <Card testId="pick-full" onClick={() => onPick("full")}
                title={tr("fullTitle", lang)} body={[tr("fullBody", lang), tr("fullBody2", lang)]}
                meta={tr("fullMeta", lang, { n: fullN })} />
        </div>
      </div>
    </div>
  );
}

/**
 * 진행된 병기 안내 — 막지 않는다. 알리고, 다른 길을 열어두고, 결정은 환자가 한다.
 * 숫자(비용·기간)는 넣지 않는다 — 케이스마다 다르다는 게 병원 확인 사항이다.
 */
function LateStageNotice({ lang }) {
  const N = LATE_STAGE_NOTICE;
  return (
    <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-2.5">
        <AlertTriangle size={16} className="mt-0.5 flex-none text-amber-700" />
        <div>
          <p className="text-sm font-bold text-amber-700">{lab(N.title, lang)}</p>
          <p className="mt-1 text-sm leading-relaxed text-amber-700">{lab(N.body, lang)}</p>
          <ul className="mt-2.5 space-y-1.5">
            {N.points.map((p, i) => (
              <li key={i} className="text-sm leading-relaxed text-amber-700">· {lab(p, lang)}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/** 진행 막대 하나. tone: done=다 참 · todo=아직 · soft=막지 않는 준비도 */
function Bar({ label, pct, meta, tone, action }) {
  const fill = tone === "done" ? "bg-emerald-700" : tone === "soft" ? "bg-teal-700" : "bg-gray-400";
  return (
    <div>
      {/* 🛑 단추를 안내 글 «안»에 넣지 마라(2026-08-18 실측). 폰 폭(375)에서 글이 두 줄로 접히면
          단추가 문장 한가운데 끼어 「0/14 채우셨습니다 — 채우실수록 병원 회신이 [다음:…] 빨라집니다」
          꼴이 된다. 한국어에서도 그랬다 — 번역 탓이 아니다.
          글과 단추를 «각각 한 덩어리»로 두면 좁을 때 단추가 통째로 아랫줄로 내려간다. */}
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span className={`text-xs tabular-nums md:text-sm ${tone === "done" ? "font-semibold text-emerald-700" : "text-gray-600"}`}>
            {meta}
          </span>
          {action && (
            <button type="button" onClick={action.onClick}
                    className="flex-none rounded-full bg-teal-700 px-3 py-1 text-xs font-semibold text-white transition-all duration-200 hover:bg-teal-800">
              {action.label}
            </button>
          )}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
        <div className={`h-full rounded-full transition-all duration-200 ${fill}`}
             style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
      </div>
    </div>
  );
}

function Toggle({ checked, onClick, label, className = "", testId }) {
  // 🛑 겉모습만 네모칸이면 낭독기(스크린리더)엔 «그냥 단추»로 들린다 — 켜졌는지 꺼졌는지 안 읽힌다.
  //    동의는 법적 기록이라 「내가 켰나」를 못 듣는 건 그 자체로 결함이다(2026-08-19 전수 훑기).
  return (
    <button type="button" role="checkbox" aria-checked={!!checked} data-testid={testId}
            onClick={onClick} className={`flex items-start gap-2.5 text-left ${className}`}>
      <span className={`mt-0.5 flex h-[18px] w-[18px] flex-none items-center justify-center rounded border-2 transition-all duration-200 ${
        checked ? "border-teal-700 bg-teal-700" : "border-gray-300"}`}>
        {checked && <Check size={12} className="text-white" strokeWidth={3} />}
      </span>
      <span className="text-sm text-gray-700">{label}</span>
    </button>
  );
}

/**
 * 병원 CD 받기 — 폴더째 고르기 → 브라우저에서 묶기 → 그 결과를 봉투에 넣는다.
 *
 * 지켜야 할 것:
 *   · 고른 «즉시» 총 용량을 보여준다 (10분 기다린 뒤 실패 금지)
 *   · 묶는 동안 진행 표시 (멈춘 줄 알고 창을 닫는다)
 *   · 상한을 넘으면 막다른 골목 대신 왓츠앱으로 사람에게 연결
 *   · 폰이면 아예 요구하지 않는다 (폴더 고르기가 안 된다)
 */
/**
 * 「너무 커서 못 올림」이 뜬 «그 자리»에만 나오는 링크 칸.
 *
 * 🛑 상시 칸으로 올리지 마라(2026-08-13 결정): 평소엔 자료가 우리 저장소에 있어야
 *    뷰어가 돌고, 링크는 만료되면 죽는다. 다만 200MB 를 넘어 «막힌 순간»에는
 *    사람이 그 자리에서 끝낼 길이 있어야 한다 — 세브란스 의뢰서도 「대용량은 링크로
 *    보내도 무관」이라고 안내한다. 그래서 막혔을 때만 띄운다.
 */
function BigFileLink({ lang, value, onChange }) {
  return (
    <div className="mt-3 rounded-xl bg-white/70 p-3">
      <p className="text-xs font-semibold text-gray-700">{tr("bigLinkTitle", lang)}</p>
      <input type="url" inputMode="url" value={value || ""} placeholder={tr("bigLinkPh", lang)}
             onChange={(e) => onChange(e.target.value)}
             className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition-all duration-200 focus:border-teal-700" />
      <p className="mt-2 text-xs text-gray-600">{tr("bigLinkOr", lang)}</p>
    </div>
  );
}

function CdFolder({ f, lang, value, onChange, register }) {
  const ref = useRef(null);
  const [state, setState] = useState({ phase: "idle" }); // idle | picked | zipping | done | toobig
  const [canPick, setCanPick] = useState(true);

  useEffect(() => { setCanPick(canPickFolder()); }, []);
  // 자료 상자가 하나로 합쳐져서, 「폴더 올리기」 버튼과 «폴더를 놓았을 때»의 처리를
  // 저쪽(Envelope)에서 부른다. 여기 상태(묶기·올리기 진행률)는 그대로 이 컴포넌트가 들고 있다.
  // 🛑 의존성 칸([register])을 지우지 마라 — 매번 등록·해제를 반복하면 저쪽이 다시 그려지고
  //    그게 또 여기를 다시 그려서 «무한 반복»으로 화면이 죽는다(2026-08-18 실측:
  //    Maximum update depth exceeded). 게다가 «해제된 찰나»에는 「폴더 올리기」 버튼이
  //    사라져서 자료 상자가 줄었다 늘었다 했다. 최신 onPick 은 ref 로 따라간다.
  async function onPick(fileList) {
    const files = pickImagingFiles(fileList);
    if (!files.length) return;
    const raw = sumBytes(files);
    // 🛑 묶기 «전»에 판단한다. 40초 묶고 나서 「너무 큽니다」는 시간을 뺏고 거절하는 것이다.
    //    압축이 크기를 약 3분의 1로 줄이므로(실측 301MB → 100MB) 그 여유를 감안해서 잰다.
    //    넉넉히 잡아 «원본이 상한의 4배를 넘으면» 묶어봐도 안 된다고 본다.
    if (raw > MAX_UPLOAD_BYTES * 4) {
      setState({ phase: "toobig", count: files.length, raw, beforeZip: true });
      return;
    }
    setState({ phase: "zipping", count: files.length, raw, percent: 0 });
    try {
      const zip = await bundleToZip(files, {
        onProgress: ({ percent }) => setState((s) => ({ ...s, percent })),
      });
      if (zip.size > MAX_UPLOAD_BYTES) {
        setState({ phase: "toobig", count: files.length, raw, zipped: zip.size });
        return;
      }
      // 묶기만 하고 안 올리면 코디는 「영상 있다는데 없는」 상태를 보게 된다.
      setState({ phase: "uploading", count: files.length, raw, zipped: zip.size, pct: 0 });
      const up = await uploadAttachment(zip, {
        onProgress: (r) => setState((s) => ({ ...s, pct: Math.round(r * 100) })),
      });
      if (up?.ok === false) {
        setState({ phase: "toobig", count: files.length, raw, zipped: zip.size, error: up.error });
        return;
      }
      setState({ phase: "done", count: files.length, raw, zipped: zip.size });
      onChange(f.name, {
        name: zip.name, size: zip.size, count: files.length, rawSize: raw, path: up.path,
      });
    } catch {
      // 묶다 실패해도 막다른 골목으로 두지 않는다 — 사람에게 연결한다.
      setState({ phase: "toobig", count: files.length, raw });
    }
  }

  // 자료 상자가 하나로 합쳐져서, 「폴더 올리기」 버튼과 «폴더를 놓았을 때»의 처리를
  // 저쪽(Envelope)에서 부른다. 여기 상태(묶기·올리기 진행률)는 그대로 이 컴포넌트가 들고 있다.
  // 🛑 의존성 칸([register])을 지우지 마라 — 매번 등록·해제를 반복하면 저쪽이 다시 그려지고
  //    그게 또 여기를 다시 그려서 «무한 반복»으로 화면이 죽는다(2026-08-18 실측:
  //    Maximum update depth exceeded). 게다가 «해제된 찰나»에는 「폴더 올리기」 버튼이
  //    사라져서 자료 상자가 줄었다 늘었다 했다.
  // ⚠️ 최신 onPick 은 ref 로 따라가되 «그리는 도중»에 쓰면 안 된다(리액트 규칙 위반) →
  //    그림이 끝난 뒤 효과에서 갱신한다. 그래서 이 두 효과는 onPick «아래»에 있어야 한다.
  const pickRef = useRef(null);
  useEffect(() => { pickRef.current = onPick; });
  // 🛑 폰(폴더 고르기 불가)에서는 등록하지 않는다 — 등록하면 자료 상자에 「폴더 올리기」 단추가 뜨는데
  //    같은 화면에 「휴대폰에서는 CD 폴더를 고를 수 없습니다」 안내도 떠서 모순(2026-08-19 폰 실측).
  useEffect(() => {
    if (!canPick) { register?.(null); return; }
    register?.({ open: () => ref.current?.click(), pick: (fl) => pickRef.current?.(fl) });
    return () => register?.(null);
  }, [register, canPick]);

  if (!canPick) {
    // 폰에서는 폴더를 못 고른다. 요구하지 말고 나중에 올릴 길만 알려준다.
    return (
      <div id={`f-${f.name}`} className="mt-4 w-full">
        <label className="mb-1.5 block text-sm font-semibold text-gray-700">{lab(f.label, lang)}</label>
        <p className="rounded-xl bg-gray-50 px-4 py-3 text-xs leading-relaxed text-gray-600">{tr("cdPhone", lang)}</p>
      </div>
    );
  }

  return (
    <div id={`f-${f.name}`} className="w-full">
      {/* webkitdirectory: 폴더 안 파일 전부를 한 번에 넘겨준다 */}
      <input ref={ref} type="file" className="hidden" webkitdirectory="" directory=""
             onChange={(e) => { onPick(e.target.files); e.target.value = ""; }} />

      {state.phase === "zipping" && (
        <div className="mt-3 rounded-xl border border-gray-200 p-3">
          <p className="flex items-center gap-2 text-sm text-gray-700">
            <Loader2 size={14} className="animate-spin" />
            {tr("cdZipping", lang, { n: state.count, mb: formatMB(state.raw) })}
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200">
            <div className="h-full rounded-full bg-teal-700 transition-all duration-200"
                 style={{ width: `${state.percent || 0}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-gray-600">{tr("cdZipWait", lang)}</p>
        </div>
      )}

      {state.phase === "uploading" && (
        <div className="mt-3 rounded-xl border border-gray-200 p-3">
          <p className="flex items-center gap-2 text-sm text-gray-700">
            <Loader2 size={14} className="animate-spin" />
            {tr("uploading", lang, { pct: state.pct || 0 })} · {formatMB(state.zipped)}
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200">
            <div className="h-full rounded-full bg-teal-700 transition-all duration-200"
                 style={{ width: `${state.pct || 0}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-gray-600">{tr("upWait", lang)}</p>
        </div>
      )}

      {state.phase === "done" && (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-sm font-semibold text-emerald-700">
            {tr("cdDone", lang, { n: state.count, to: formatMB(state.zipped) })}
          </p>
          <button type="button" onClick={() => { setState({ phase: "idle" }); onChange(f.name, null); }}
                  className="mt-1.5 text-xs text-gray-600 underline">{tr("cdRedo", lang)}</button>
        </div>
      )}

      {state.phase === "toobig" && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm leading-relaxed text-amber-700">
            {state.error
              ? uploadErrorText(state.error, lang)
              : tr("cdTooBig", lang, { mb: formatMB(state.zipped ?? state.raw) })}
          </p>
          <BigFileLink lang={lang} value={value?.link} onChange={(v) => onChange(f.name, { ...(value || {}), link: v })} />
          <a href={SITE_INFO?.messenger?.whatsapp || "#"} target="_blank" rel="noopener noreferrer"
             className="mt-3 inline-block rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white">
            {tr("cdHelp", lang)}
          </a>
        </div>
      )}
    </div>
  );
}

/**
 * 자료 묶음 — 봉투째 받고, 올리는 즉시 «우리가» 열어본다.
 *
 * 종류별 칸으로 나누지 않는 이유는 referralSchema.js 의 envelope 칸 주석에 있다.
 * 여기서는 그 결과를 세 덩어리로 보여준다:
 *   ① 올린 서류 — 무엇으로 읽혔는지 + «틀렸으면 직접 고치기»
 *   ② 아직 없는 것 — 대학병원이 요구하는 종류 중 안 온 것
 *   ③ 내원 확정 후 · 병원별 추가 요청 안내
 */
function DocSection({ lang, sec, values, set, onAutoFill, autoFilled }) {
  const docs = values.envelope || [];
  const missing = missingKinds(docs);
  const envelopeField = sec.fields.find((f) => f.name === "envelope");
  const rest = sec.fields.filter((f) => f.name !== "envelope");
  const filledCount = Object.keys(autoFilled || {}).length;
  // CD 쪽 「고르기 창 열기」와 「폴더 넘기기」 손잡이 — 합쳐진 자료 상자가 이걸 쓴다.
  const [cd, setCd] = useState(null);

  return (
    <>
      <Envelope f={envelopeField} lang={lang} docs={docs} onChange={set} onAutoFill={onAutoFill} cd={cd} />

      {/* 읽어서 «채운» 칸이 있으면 그 자리에서 알려준다 — 아래 묶음에 가서야 알면 늦다. */}
      {filledCount > 0 && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-bold text-emerald-700">
            {tr("autoFilledTitle", lang, { n: filledCount })}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-emerald-700">{tr("autoFilledBody", lang)}</p>
        </div>
      )}

      {docs.length > 0 && (
        missing.length === 0 ? (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-relaxed text-emerald-700">
            {tr("docsAllSet", lang)}
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={16} className="mt-0.5 flex-none text-amber-700" />
              <div>
                <p className="text-sm font-bold text-amber-700">{tr("stillNeed", lang)}</p>
                <ul className="mt-2 space-y-1">
                  {missing.map((k) => (
                    <li key={k} className="text-sm text-amber-700">· {kindLabel(k, lang)}</li>
                  ))}
                </ul>
                <p className="mt-2.5 text-xs leading-relaxed text-amber-700">{tr("stillNeedWhy", lang)}</p>
              </div>
            </div>
          </div>
        )
      )}

      <div className="flex flex-wrap gap-x-4">
        {/* CD 는 «합쳐진 자료 상자»가 버튼과 폴더 놓기를 대신 부른다 — 그래서 손잡이를 넘긴다. */}
        {rest.map((f) => f.name === "cdFolder"
          ? <CdFolder key={f.name} f={f} lang={lang} value={values[f.name]} onChange={set} register={setCd} />
          : <Field key={f.name} f={f} lang={lang} value={values[f.name]} onChange={set} />)}
      </div>

    </>
  );
}

/** 봉투 — 고르는 즉시 서버로 보내 「무슨 서류인지」를 물어보고 그 자리에서 보여준다. */
function Envelope({ f, lang, docs, onChange, onAutoFill, cd }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(0);
  const [over, setOver] = useState(false);

  // 상자 «밖»에 떨어뜨리면 브라우저가 그 파일을 열어버려 폼이 통째로 날아간 것처럼 보인다.
  // 창 전체에서 기본 동작만 막는다 — 상자 안에 떨어뜨리는 건 아래 onDrop 이 받는다.
  useEffect(() => {
    const stop = (e) => e.preventDefault();
    window.addEventListener("dragover", stop);
    window.addEventListener("drop", stop);
    return () => {
      window.removeEventListener("dragover", stop);
      window.removeEventListener("drop", stop);
    };
  }, []);

  // 순서: ①저장소로 올린다(느릴 수 있다 → 진행률) ②올라간 뒤에 판별한다.
  // 판별만 되고 파일이 안 올라가면 코디는 「있다고 하는데 없는 서류」를 보게 된다.
  async function add(files) {
    const picked = Array.from(files || []);
    if (!picked.length) return;
    // 🛑 «자리 번호(idx)»로 갱신하지 마라 — 올리는 도중 앞의 것을 지우면 자리가 밀려 다른 파일에
    //    경로·판독 결과가 붙는다(2026-08-19 독립 리뷰 3명이 같은 것을 짚음). 항목마다 고유 표(_id)를 달고
    //    그 표로 찾아 갱신한다. 목록에 넣을 때도 «그 순간의 docs»가 아니라 최신 목록에 덧붙인다.
    const mk = () => (crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`);
    const rows = picked.map((x) => ({
      _id: mk(), name: x.name, size: x.size, kind: null,
      ...(x.size > MAX_UPLOAD_BYTES
        ? { uploading: false, error: "file_too_large" }
        : { uploading: true, pct: 0 }),
    }));
    // 🛑 크기는 «고른 즉시» 잰다. 다 올린 뒤에 「너무 큽니다」라고 하면 그건 시간을 뺏고
    //    나서 거절하는 것이다(PO 2026-08-14). 100MB 를 10분 올린 뒤 안 된다고 하면 떠난다.
    onChange(f.name, (prev) => [...(prev || []), ...rows]);
    const toUpload = picked.filter((x) => x.size <= MAX_UPLOAD_BYTES).length;
    setBusy((n) => n + toUpload);

    // 🛑 한 개씩 차례로 하지 마라 — 서류 5장이면 (올리기 + 판독 8초)가 5번 «줄줄이» 이어져 1분을 넘긴다.
    //    사람은 그 앞에서 기다리다 떠난다. 동시에 3개까지 돌린다(판독 창구 상한 20회/분 안쪽).
    //    3개로 묶는 이유: 카자흐스탄 쪽 회선에서 큰 서류를 한꺼번에 올리면 서로 대역폭을 뺏는다.
    const CONCURRENCY = 3;
    let cursor = 0;
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, picked.length) }, async () => {
        for (let i = cursor++; i < picked.length; i = cursor++) await one(i);
      })
    );

    async function one(i) {
      if (picked[i].size > MAX_UPLOAD_BYTES) return; // 이미 안내했다
      const id = rows[i]._id;
      const patch = (p) => onChange(f.name, (prev) =>
        (prev || []).map((d) => (d._id === id ? { ...d, ...p } : d)));   // 지워졌으면 조용히 건너뛴다

      const up = await uploadAttachment(picked[i], {
        onProgress: (r) => patch({ pct: Math.round(r * 100) }),
      });
      if (up?.ok === false) {
        patch({ uploading: false, reading: false, error: up.error || "upload_failed" });
        setBusy((n) => n - 1);
        return;
      }
      patch({ uploading: false, reading: true, path: up.path, type: up.type, error: null });

      // 🛑 파일을 다시 «보내지» 마라. 그러면 서버 요청 4.5MB 벽에 걸려 4MB 넘는 서류가
      //    전부 「못 읽음」이 된다(2026-08-14 실측: 130.9MB 서류가 그렇게 버려졌다).
      //    이미 저장소에 올라가 있으니 «주소만» 준다 — 서버가 거기서 직접 집어온다.
      let r = { kind: "unknown" };
      try {
        const res = await fetch("/api/inquiry/classify-doc", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ path: up.path, type: up.type }),
        });
        const j = await res.json();
        if (j?.ok) r = j;
      } catch { /* 판별 실패해도 파일은 이미 올라가 있다 — 코디가 확인한다 */ }
      patch({
        reading: false,
        kind: r.kind || "unknown",
        confidence: r.confidence ?? null,
        docDate: r.docDate ?? null,
        diagnosisText: r.diagnosisText ?? null,
        skipped: r.skipped ?? null,
        readPages: r.readPages ?? null,
        totalPages: r.totalPages ?? null,
      });
      // 읽어낸 값으로 «빈 칸만» 채운다. 사용자가 이미 쓴 건 절대 안 건드린다.
      if (r.fields && Object.keys(r.fields).length) onAutoFill?.(r.fields);
      setBusy((n) => n - 1);
    }
  }

  const setKind = (i, kind) =>
    onChange(f.name, docs.map((d, j) => (j === i ? { ...d, kind, corrected: true } : d)));

  return (
    <div id={`f-${f.name}`} className="mt-4">
      <label className="mb-1.5 block text-sm font-semibold text-gray-700">
        {lab(f.label, lang)}
        <span className="ml-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
          {tr("forReferral", lang)}
        </span>
      </label>
      {/* 🛑 상자를 다시 둘로 쪼개지 마라(2026-08-18 PO: 「꼭 나눠야 하니?」).
          브라우저가 「파일 올리기」와 「폴더 올리기」를 한 창으로 못 줘서 «버튼»은 둘이지만,
          끌어다 놓기는 둘 다 받으므로 «상자»는 하나다. 놓인 게 폴더면 CD 길(묶어서 올리기)로,
          파일이면 서류 길(한 장씩 읽기)로 갈라 보낸다. */}
      <div onDragEnter={(e) => { e.preventDefault(); setOver(true); }}
           onDragOver={(e) => { e.preventDefault(); setOver(true); }}
           onDragLeave={() => setOver(false)}
           onDrop={async (e) => {
             e.preventDefault(); setOver(false);
             // 🛑 폴더가 하나라도 있다고 «전부»를 CD 길로 보내지 마라 — 같이 놓은 서류가
             //    조용히 사라진다(2026-08-18 PO: 「둘 다 가능하게 하면 되는 거 아냐?」).
             //    갈라서 각자 길로 보낸다: 폴더는 통째로 묶고, 낱개 서류는 한 장씩 읽는다.
             const { folderFiles, looseFiles } = await splitDrop(e.dataTransfer);
             if (folderFiles.length && cd?.pick) cd.pick(folderFiles);
             if (looseFiles.length) add(looseFiles);
           }}
           className={`w-full rounded-xl border-2 border-dashed px-4 py-6 text-center transition-all duration-200 ${
             over ? "border-teal-700 bg-teal-50" : "border-gray-300"}`}>
        {/* 🛑 끌고 오는 동안 «안을 비우지» 마라(2026-08-18 PO: 「파일 올리면 요렇게 되잖아」).
            버튼을 감추면 상자가 157px → 60px 로 쪼그라들어서, 놓으려던 자리가 커서 밑에서
            사라진다. 색만 바뀌고 «크기는 그대로»여야 한다.
            끌고 오는 동안 안쪽은 pointer-events-none — 안 그러면 버튼 위를 지날 때마다
            「나갔다」로 잘못 읽혀 상자가 깜빡인다. */}
        <div className={over ? "pointer-events-none" : ""}>
        <p className="text-sm font-semibold text-gray-700">
          {over ? tr("dropNow", lang) : tr("dropHere", lang)}
        </p>
        <p className="mt-1 text-xs text-gray-600">{describeUpload("medicalDoc", lang)}</p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {/* 🛑 버튼 이름을 «파일/폴더»로 되돌리지 마라(2026-08-18 PO: 「눌러봐도 똑같은데」).
                고르는 창이 비슷해 보여서, 이름과 한 줄 설명으로 «무엇을 고르는 것인지»를 갈라야 한다.
                처리도 다르다 — 서류는 한 장씩 읽어 칸을 채우고, CD 는 통째로 묶어 하나로 올린다. */}
            <button type="button" onClick={() => ref.current?.click()}
                    className="rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 transition-all duration-200 hover:border-gray-400">
              {tr("pickDocs", lang)}
            </button>
            {cd?.open && (
              <button type="button" onClick={() => cd.open()}
                      className="rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 transition-all duration-200 hover:border-gray-400">
                {tr("cdPick", lang)}
              </button>
            )}
        </div>
        </div>
      </div>
      <input ref={ref} type="file" multiple className="hidden"
             onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
      <p className="mt-1.5 text-xs leading-relaxed text-gray-600">{tr("sizeRule", lang)}</p>
      {/* 🛑 「무슨 서류인지 고르실 필요 없습니다」 같은 «우리 사정»을 여기 다시 늘어놓지 마라
          (2026-08-18 PO). 올리는 자리에서 사람이 알고 싶은 건 «무엇을 올려야 하나» 하나다.
          그래서 필요한 서류를 이름으로 세워두고, 없어도 된다는 것을 같이 말한다. */}
      <div className="mt-2 rounded-xl bg-gray-50 px-4 py-3">
        <p className="text-xs font-semibold text-gray-700 md:text-sm">{tr("needTitle", lang)}</p>
        <ul className="mt-1.5 space-y-0.5">
          {NEEDED_KINDS.map((k) => (
            <li key={k} className="text-xs leading-relaxed text-gray-600">· {kindLabel(k, lang)}</li>
          ))}
          <li className="text-xs leading-relaxed text-gray-600">· {tr("needPassport", lang)}</li>
        </ul>
        <p className="mt-2 text-xs leading-relaxed text-gray-600">{tr("needNote", lang)}</p>
      </div>

      {docs.map((d, i) => (
        <div key={i} className="mt-2 rounded-xl border border-gray-200 p-3">
          <div className="flex items-center gap-2.5 text-sm">
            <Paperclip size={14} className="flex-none text-gray-500" />
            <span className="min-w-0 flex-1 truncate text-gray-900">{d.name}</span>
            <span className="flex-none text-xs text-gray-600 tabular-nums">
              {formatMB(d.size)}
            </span>
            <button type="button" onClick={() => onChange(f.name, docs.filter((_, j) => j !== i))}
                    className="flex-none text-gray-500 hover:text-gray-700"><X size={14} /></button>
          </div>

          {d.uploading ? (
            <div className="mt-2">
              <p className="flex items-center gap-2 text-xs text-gray-600">
                <Loader2 size={13} className="animate-spin" />
                {tr("uploading", lang, { pct: d.pct || 0 })} · {tr("upWait", lang)}
              </p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-200">
                <div className="h-full rounded-full bg-teal-700 transition-all duration-200"
                     style={{ width: `${d.pct || 0}%` }} />
              </div>
            </div>
          ) : d.error ? (
            <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs leading-relaxed text-amber-700">{uploadErrorText(d.error, lang, d.size)}</p>
              {d.error === "file_too_large" && (
                <>
                <BigFileLink lang={lang} value={d.link}
                             onChange={(v) => onChange(f.name, docs.map((x, j) => (j === i ? { ...x, link: v } : x)))} />
                <a href={SITE_INFO?.messenger?.whatsapp || "#"} target="_blank" rel="noopener noreferrer"
                   className="mt-2 inline-block rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white">
                  {tr("cdHelp", lang)}
                </a>
                </>
              )}
            </div>
          ) : d.reading ? (
            <p className="mt-2 flex items-center gap-2 text-xs text-gray-600">
              <Loader2 size={13} className="animate-spin" />{tr("reading", lang)}
            </p>
          ) : (
            <div className="mt-2">
              <p className="text-xs text-gray-600">
                {!d.skipped && d.readPages && d.totalPages > d.readPages
                    ? tr("partialRead", lang, { n: d.readPages, t: d.totalPages })
                  : !d.skipped && d.kind === "unknown" ? tr("pickKind", lang)
                  : !d.skipped ? tr("readAs", lang)
                  : d.skipped === "too_large" ? tr("cantReadBig", lang)
                  : d.skipped === "unsupported_type" ? tr("cantReadType", lang)
                  : tr("cantRead", lang)}
              </p>
              {/* ⚠️ AI 판독은 «추정»이다. 고르는 칸으로 두어 사용자가 언제든 고칠 수 있게 한다
                  (PO 결정 2026-08-12). 의료 서류라 우리 추정을 사실로 박으면 안 된다. */}
              <select value={d.kind || "unknown"} onChange={(e) => setKind(i, e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
                {DOC_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>{kindLabel(k.value, lang)}</option>
                ))}
              </select>
              {(d.docDate || d.diagnosisText) && (
                <p className="mt-1.5 text-xs leading-relaxed text-gray-600">
                  {d.docDate && <span className="tabular-nums">{d.docDate}</span>}
                  {d.docDate && d.diagnosisText && " · "}
                  {d.diagnosisText}
                </p>
              )}
            </div>
          )}
        </div>
      ))}
      {busy > 0 && <p className="mt-2 text-xs text-gray-600">{tr("readingN", lang, { n: busy })}</p>}
    </div>
  );
}

function ConsentBlock({ lang, consents, setConsents }) {
  const all = CONSENTS.every((c) => consents[c.name]);
  return (
    <div className="space-y-2.5 pt-4">
      <Toggle checked={all} label={tr("consentAll", lang)} testId="consent-all"
              onClick={() => setConsents(all ? {} : Object.fromEntries(CONSENTS.map((c) => [c.name, true])))} />
      <div className="h-px bg-gray-200" />
      {CONSENTS.map((c) => (
        <Toggle key={c.name} checked={!!consents[c.name]} label={lab(c.label, lang)} testId={`consent-${c.name}`}
                onClick={() => setConsents((p) => ({ ...p, [c.name]: !p[c.name] }))} />
      ))}
    </div>
  );
}
