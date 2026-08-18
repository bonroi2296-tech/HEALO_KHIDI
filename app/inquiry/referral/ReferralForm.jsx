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
import { describeUpload, MAX_DOC_BYTES as MAX_UPLOAD_BYTES } from "@/lib/uploadPolicy";
import { canPickFolder, pickImagingFiles, sumBytes, bundleToZip, formatMB, splitDrop } from "@/lib/inquiry/cdBundle";
import { uploadAttachment } from "@/lib/uploadAttachment";
import { SITE_INFO } from "@/lib/siteSettings";
import {
  SECTIONS, CONSENTS, LATE_STAGE_NOTICE, LATE_STAGES,
  lab, fieldsByReq, missingIntake, missingForReferral, referralReadiness, nextReferralSection,
} from "@/lib/inquiry/referralSchema";

const DRAFT_KEY = "healo_referral_draft_v1";

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
  const loaded = useRef(false);

  // 쓰던 내용 복구 — 긴 폼의 유일한 진짜 위험은 「쓰다 날림」이다.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        setValues(d.values || {});
        setConsents(d.consents || {});
        // 돌아온 사람에게 갈림길을 다시 묻지 않는다 — 쓰던 자리로 바로 보낸다.
        if (d.mode) setMode(d.mode);
      }
    } catch { /* 저장본이 깨졌으면 그냥 빈 폼으로 시작한다 */ }
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ values, consents, mode }));
      setSavedAt(new Date());
    } catch { /* 저장 공간이 없어도 폼은 계속 쓸 수 있어야 한다 */ }
  }, [values, consents, mode]);

  // v 에 함수를 줄 수 있다 — 서류 판독처럼 «먼저 목록에 올리고 나중에 결과를 끼워 넣는»
  // 경우엔 그때의 최신 목록을 받아야 한다(안 그러면 여러 개 올릴 때 앞의 결과가 지워진다).
  const set = (name, v) => {
    setValues((p) => ({ ...p, [name]: typeof v === "function" ? v(p[name]) : v }));
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
    setValues((p) => ({ ...p, ...patch }));
    setAutoFilled((p) => ({ ...p, ...marked }));
  };

  // 문턱 ① 접수 — 보내기 버튼을 막는 유일한 것. 5칸 + 동의.
  const missIntake = useMemo(() => missingIntake(values), [values]);
  const consentOk = CONSENTS.filter((c) => c.required).every((c) => consents[c.name]);
  const intakeTotal = fieldsByReq("intake").length + 1; // 동의 묶음을 한 칸으로 센다
  const intakeLeft = missIntake.length + (consentOk ? 0 : 1);
  const canSend = intakeLeft === 0;

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
  const jumpToNext = () => jumpTo(missIntake[0] || (consentOk ? null : "consent"), "essentials");

  const nextRef = useMemo(() => {
    const s = nextReferralSection(values);
    return s && { ...s, label: lab(s.title, lang) };
  }, [values, lang]);

  async function send() {
    if (!canSend || sending) return;
    setSending(true);
    setSendError("");
    try {
      const res = await fetch("/api/inquiries/referral", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...values,
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
        setSendError(tr(j?.error === "rate_limit_exceeded" ? "errTooMany" : "errSend", lang));
        return;
      }
      setSent(j);
      // 보냈으면 임시저장은 지운다 — 남겨두면 다음에 열었을 때 이미 보낸 내용이 다시 뜬다.
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
    } catch {
      setSendError(tr("errSend", lang));
    } finally {
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
              {tr("doneNo", lang)} <span className="font-bold text-gray-900 tabular-nums">#{sent.inquiryId}</span>
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
    return <ModePicker lang={lang} onPick={setMode}
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
                <button type="button" onClick={() => setOpen((p) => ({ ...p, [sec.id]: !p[sec.id] }))}
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
                  <div className="border-t border-gray-200 px-4 pb-6 md:px-6">
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
                                   bare={sec.id !== "essentials"} />
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
          <button type="button" disabled={!canSend || sending} onClick={send}
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
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur">
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
                <button type="button" disabled={sending} onClick={send}
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
function Field({ f, lang, value, onChange, lit, fromDoc, bare }) {
  if (f.type === "note") {
    return <p className="mt-2 w-full text-xs leading-relaxed text-gray-600">{lab(f.label, lang)}</p>;
  }

  const label = lab(f.label, lang);
  const ph = f.placeholder ? lab(f.placeholder, lang) : "";
  const box = "w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 " +
              "placeholder:text-gray-500 focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700";

  let control = null;
  switch (f.type) {
    case "text": case "email": case "url": case "phone":
      control = <input type={f.type === "email" ? "email" : f.type === "url" ? "url" : "text"}
                       className={box} placeholder={ph} value={value || ""}
                       onChange={(e) => onChange(f.name, e.target.value)} />;
      break;
    case "date":
      control = <input type="date" className={box} value={value || ""} onChange={(e) => onChange(f.name, e.target.value)} />;
      break;
    case "month":
      control = <input type="month" className={box} value={value || ""} onChange={(e) => onChange(f.name, e.target.value)} />;
      break;
    case "textarea":
      control = <textarea rows={3} className={box} placeholder={ph} value={value || ""}
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
        <div className="flex flex-wrap gap-2">
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
        <select className={box} value={value || ""} onChange={(e) => onChange(f.name, e.target.value)}>
          <option value="">{tr("pick", lang)}</option>
          {opts.map((o) => <option key={o.value} value={o.value}>{o.text}</option>)}
        </select>
      );
      break;
    }
    case "icdSuggest":
      // 코드를 못 고르는 게 정상이다 — 「모르겠습니다」가 기본이고 관문이 아니다.
      control = (
        <>
          <input className={box} placeholder="C18.2" value={value || ""} onChange={(e) => onChange(f.name, e.target.value)} />
          <Toggle checked={value === "__unknown__"} onClick={() => onChange(f.name, value === "__unknown__" ? "" : "__unknown__")}
                  label={tr("icdUnknown", lang)} className="mt-2" />
        </>
      );
      break;
    case "cdFolder":
      return <CdFolder f={f} lang={lang} value={value} onChange={onChange} />;
    default:
      control = <input className={box} value={value || ""} onChange={(e) => onChange(f.name, e.target.value)} />;
  }

  return (
    <div id={`f-${f.name}`}
         className={`mt-4 min-w-0 transition-all duration-200 ${
           f.half ? "flex-1 basis-full md:basis-[calc(50%-0.5rem)]" : "w-full"
         } ${lit ? "-mx-2 rounded-xl bg-teal-50 px-2 py-2 ring-2 ring-teal-700" : ""}`}>
      {/* 라벨 없는 칸(바로 위 칸에 딸린 서술 칸)은 「(선택)」만 덩그러니 뜨지 않게 통째로 뺀다. */}
      {label && (
        <label className="mb-1.5 block text-sm font-semibold text-gray-700">
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
function ModePicker({ lang, onPick, quickN, fullN }) {
  const Card = ({ onClick, title, body, meta, primary }) => (
    <button type="button" onClick={onClick}
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
        <div className="mt-6 space-y-3">
          <Card primary onClick={() => onPick("quick")}
                title={tr("quickTitle", lang)} body={tr("quickBody", lang)}
                meta={tr("quickMeta", lang, { n: quickN })} />
          <Card onClick={() => onPick("full")}
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

function Toggle({ checked, onClick, label, className = "" }) {
  return (
    <button type="button" onClick={onClick} className={`flex items-start gap-2.5 text-left ${className}`}>
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
  // 자료 상자가 하나로 합쳐져서, 「CD 폴더 고르기」 버튼과 «폴더를 놓았을 때»의 처리를
  // 저쪽(Envelope)에서 부른다. 여기 상태(묶기·올리기 진행률)는 그대로 이 컴포넌트가 들고 있다.
  // 🛑 의존성 칸([register])을 지우지 마라 — 매번 등록·해제를 반복하면 저쪽이 다시 그려지고
  //    그게 또 여기를 다시 그려서 «무한 반복»으로 화면이 죽는다(2026-08-18 실측:
  //    Maximum update depth exceeded). 게다가 «해제된 찰나»에는 「폴더째 올리기」 버튼이
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

function FileBox({ f, lang, value, onChange }) {
  const files = value || [];
  const ref = useRef(null);
  return (
    <div>
      <button type="button" onClick={() => ref.current?.click()}
              className="w-full rounded-xl border-2 border-dashed border-gray-300 px-4 py-6 text-center text-sm font-semibold text-gray-700">
        {tr("addFile", lang)}
      </button>
      {/* 실제 올리기는 서버 붙일 때. 지금은 고른 파일만 보여준다. */}
      <input ref={ref} type="file" multiple className="hidden"
             onChange={(e) => onChange(f.name, [...files, ...Array.from(e.target.files || [])
               .map((x) => ({ name: x.name, size: x.size }))])} />
      {files.map((x, i) => (
        <div key={i} className="mt-2 flex items-center gap-2.5 rounded-xl border border-gray-200 px-3 py-2.5 text-sm">
          <Paperclip size={14} className="flex-none text-gray-500" />
          <span className="min-w-0 flex-1 truncate text-gray-900">{x.name}</span>
          <span className="flex-none text-xs text-gray-600 tabular-nums">{formatMB(x.size)}</span>
          <button type="button" onClick={() => onChange(f.name, files.filter((_, j) => j !== i))}
                  className="flex-none text-gray-500 hover:text-gray-700"><X size={14} /></button>
        </div>
      ))}
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
    const base = docs.length;
    // 🛑 크기는 «고른 즉시» 잰다. 다 올린 뒤에 「너무 큽니다」라고 하면 그건 시간을 뺏고
    //    나서 거절하는 것이다(PO 2026-08-14). 100MB 를 10분 올린 뒤 안 된다고 하면 떠난다.
    onChange(f.name, [...docs, ...picked.map((x) => ({
      name: x.name, size: x.size, kind: null,
      ...(x.size > MAX_UPLOAD_BYTES
        ? { uploading: false, error: "file_too_large" }
        : { uploading: true, pct: 0 }),
    }))]);
    const toUpload = picked.filter((x) => x.size <= MAX_UPLOAD_BYTES).length;
    setBusy((n) => n + toUpload);

    for (let i = 0; i < picked.length; i++) {
      if (picked[i].size > MAX_UPLOAD_BYTES) continue; // 이미 안내했다
      const idx = base + i;
      const patch = (p) => onChange(f.name, (prev) => {
        const next = [...(prev || [])];
        next[idx] = { ...next[idx], ...p };
        return next;
      });

      const up = await uploadAttachment(picked[i], {
        onProgress: (r) => patch({ pct: Math.round(r * 100) }),
      });
      if (up?.ok === false) {
        patch({ uploading: false, reading: false, error: up.error || "upload_failed" });
        setBusy((n) => n - 1);
        continue;
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
          브라우저가 「파일 고르기」와 「폴더 고르기」를 한 창으로 못 줘서 «버튼»은 둘이지만,
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
      <Toggle checked={all} label={tr("consentAll", lang)}
              onClick={() => setConsents(all ? {} : Object.fromEntries(CONSENTS.map((c) => [c.name, true])))} />
      <div className="h-px bg-gray-200" />
      {CONSENTS.map((c) => (
        <Toggle key={c.name} checked={!!consents[c.name]} label={lab(c.label, lang)}
                onClick={() => setConsents((p) => ({ ...p, [c.name]: !p[c.name] }))} />
      ))}
    </div>
  );
}
