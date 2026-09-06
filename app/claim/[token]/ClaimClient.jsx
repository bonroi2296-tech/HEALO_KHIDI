"use client";

/**
 * 공개 케이스 화면 — healwith.co.kr/claim/[token]
 *
 * 접수한 사람(환자 본인·가족·에이전시 누구든)이 **가입·로그인 없이** 진행상황을 따라보는 화면.
 * 왓츠앱·메일·에이전시 경유처럼 계정 없이 들어온 문의가 표준 동선이라, 「보려면 먼저 가입」을
 * 입구에 두지 않는다. 가입은 아래쪽 띠에서 «권유»만 한다.
 *
 * ⚠️ 구조 주의: 진행상황 카드는 **항상 맨 위에 그대로 있다.** 연결(claim) 결과가 무엇이든
 * 화면을 통째로 갈아치우지 않는다. 예전엔 갈아치웠고, 그래서 에이전시 계정으로 열면
 * "직원은 연결 못 함" 막힘 화면만 뜨고 진행상황을 하나도 못 봤다(2026-08-03 PO 지적).
 */

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, ShieldAlert, ArrowRight, FileText, Eye, Globe, FileDown, Send, Paperclip, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useLang } from "@/lib/i18n/LangContext";
import { t, dateLocale, isKnownLangCode, setLangCookie, LANG_OPTIONS_PRIMARY } from "@/lib/i18n";
import { DOC_LANG_LABEL } from "@/lib/documents/sharedDocMeta";
import { uploadDirect } from "@/lib/uploadAttachment";

const supabase = createSupabaseBrowserClient();

/**
 * 이 화면을 «무슨 언어로 그릴까» — 위에서부터 걸리는 첫 칸 (2026-08-05 PO 질문에 대한 답).
 *
 *   1. 그 사람이 화면에서 고른 언어(healo_lang 쿠키)  ← 사람이 고른 건 무조건 이긴다
 *   2. 문의서에 적힌 환자 언어(preferred_language)     ← 접수 때 «받은» 값이지 추측이 아니다
 *   3. 브라우저 언어 → 4. 영어                          ← 그건 기존 LangContext 가 이미 한다
 *
 * 국적으로 추측하지 않는다: 카자흐스탄이라고 다 러시아어를 읽지 않고, 반대도 있다.
 * 틀리면 「내가 못 읽는 언어」가 뜬다 — 그 대가가 영어로 한 번 뜨는 것보다 크다.
 *
 * 쿠키를 심고 새로 그린다(사이트 전체가 그 언어가 된다). 왓츠앱으로 링크를 받은 사람에게는
 * 그게 맞다 — 다른 화면으로 넘어가도 계속 자기 언어다. 바꾸고 싶으면 위 언어 단추로 바꾼다.
 */
function applyPatientLang(patientLang, current) {
  if (typeof document === "undefined" || !patientLang) return;
  if (!isKnownLangCode(patientLang)) return;
  if (patientLang === current) return;

  // ⚠️ healo_lang 쿠키가 «있다»는 걸 「사람이 골랐다」로 읽으면 안 된다 — proxy.ts 가 이 화면에
  //    들어올 때 브라우저 언어로 미리 심어 두기 때문이다. 사람이 고른 건 healo_lang_pick 로만 안다.
  if (document.cookie.includes("healo_lang_pick=")) return;

  // 한 번만 바꾼다. 혹시 다른 데서 쿠키를 되돌리더라도 새로고침이 무한히 돌지 않게.
  try {
    if (sessionStorage.getItem("claimLangApplied") === patientLang) return;
    sessionStorage.setItem("claimLangApplied", patientLang);
  } catch {
    /* 시크릿 모드 등에서 sessionStorage 가 막혀도 아래는 그대로 진행 */
  }

  document.cookie = `healo_lang=${patientLang}; path=/; max-age=31536000`;
  window.location.reload();
}

export default function ClaimClient({ token }) {
  const lang = useLang();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(""); // invalid_link | rate_limited | network
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);
  const [preview, setPreview] = useState(null);
  const [progress, setProgress] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [sent, setSent] = useState(null);

  const [session, setSession] = useState(undefined); // undefined=확인중, null=비로그인
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState(null); // claimed | staff_cannot_claim | already_claimed | error

  // 1) 케이스 조회(계정 없이). 언어를 같이 보내 단계·안내 문구를 그 언어로 받는다.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(
          `/api/inquiries/claim?token=${encodeURIComponent(token)}&lang=${encodeURIComponent(lang)}`
        );
        const data = await res.json();
        if (!alive) return;
        if (!res.ok || !data.ok) {
          setError(data.error === "rate_limited" ? "rate_limited" : "invalid_link");
        } else {
          setAlreadyClaimed(Boolean(data.alreadyClaimed));
          setPreview(data.preview || null);
          setProgress(data.progress || null);
          setDocuments(Array.isArray(data.documents) ? data.documents : []);
          setSent(data.sent || null);
          applyPatientLang(data.patientLang, lang);
        }
      } catch {
        if (alive) setError("network");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token, lang]);

  // 2) 로그인 상태 확인
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setSession(data?.session || null);
    });
    return () => { alive = false; };
  }, []);

  // 3) 이미 로그인 → 자동으로 연결 시도. POST 쪽이 claim 판정의 최종 권위자라
  // (본인 소유면 alreadyOwned:true 로 성공 처리) alreadyClaimed=true(GET 기준)여도 시도한다 —
  // "이미 연결됨" 안내가 실제로는 본인 소유인 재방문 케이스를 오탐하지 않게.
  useEffect(() => {
    if (!session || !progress || claiming || claimResult) return;
    (async () => {
      setClaiming(true);
      try {
        const res = await fetch("/api/inquiries/claim", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (data.ok) setClaimResult("claimed");
        else if (data.error === "staff_cannot_claim") setClaimResult("staff_cannot_claim");
        else if (data.error === "already_claimed") setClaimResult("already_claimed");
        else setClaimResult("error");
      } catch {
        setClaimResult("error");
      } finally {
        setClaiming(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, progress]);

  const redirectQS = `?redirect=${encodeURIComponent(`/claim/${token}`)}`;

  /**
   * 고른 단계에 «속한 것»만 추린다 — **날짜로 가른다.**
   *
   * 소견·서류·소식에 「몇 단계 것」이라는 표시를 따로 안 붙인다. 단계가 언제 시작됐는지는
   * 이력이 이미 알고 있으니(case_status_history), 그 구간 [이 단계 시작, 다음 단계 시작) 안에
   * 만들어진 것이 그 단계 것이다. 새 칸·새 컬럼이 필요 없고, 코디가 매번 「이건 몇 단계」를
   * 고를 일도 없다 — 사람 손이 덜 가는 쪽이 안 틀린다.
   *
   * 첫 단계는 시작 시각이 없을 수 있다(이력이 없는 옛 문의) → 그때는 «맨 처음부터»로 본다.
   */
  const steps = progress?.steps || [];
  const timeline = progress?.timeline || [];
  const currentOrder = progress?.currentOrder ?? 0;
  const [stage, setStage] = useState(null);
  const selected = stage ?? currentOrder;

  // 단계별 시작 시각 — 그 단계로 «처음» 옮겨간 순간.
  const stageStart = new Map();
  for (const h of timeline) {
    if (h.kind !== "stage" || !h.status) continue;
    const order = steps.find((s) => s.key === h.status)?.order;
    if (order != null && !stageStart.has(order)) stageStart.set(order, new Date(h.at).getTime());
  }
  const reached = steps.filter((s) => currentOrder >= s.order).map((s) => s.order).sort((a, b) => a - b);
  const idx = reached.indexOf(selected);
  const from = idx <= 0 ? 0 : stageStart.get(selected) ?? 0;             // 첫 단계면 맨 처음부터
  const nextOrder = idx >= 0 && idx < reached.length - 1 ? reached[idx + 1] : null;
  const to = nextOrder != null ? stageStart.get(nextOrder) ?? Infinity : Infinity;
  const inStage = (iso) => {
    const at = new Date(iso).getTime();
    return Number.isFinite(at) ? at >= from && at < to : true;
  };

  const stageLabel = steps.find((s) => s.order === selected)?.label || "";
  const stageDocuments = documents.filter((d) => inStage(d.at));
  const stageTimelineAll = timeline.filter((h) => inStage(h.at));

  /**
   * 「지나온 기록」 칸을 없애고 그 단계에서 있었던 일을 **맨 위 한 칸**으로 모았다 (2026-08-05 PO:
   * *"지나온 기록은 맨 하단에 필요한게 맞나? 너무 뭔가 복잡해지는 느낌인데"*).
   *
   * 실제로 그 칸에 뭐가 들어있었는지 세어보니(문의 #60) — 「8/3 문의·의뢰 접수」「8/4 상담·검토
   * 진행」. **단계 이름은 위 탭과 제목이 이미 말하고 있다.** 새 정보는 «날짜»와 «딸린 한 줄»
   * (🩺 사전상담 완료)뿐이었다. 칸 하나가 통째로 그걸 담으려고 서 있었던 셈이다.
   *
   *   · 단계 이름만 있고 딸린 줄이 없는 것 → 버린다(중복)
   *   · 딸린 줄이 있는 것 + 코디 소식      → 「이 단계에 있었던 일」로 새것부터
   *   · 그 단계가 «언제 시작됐나»            → 제목 옆 날짜 한 줄
   */
  const stageEvents = stageTimelineAll
    .filter((h) => h.note)
    .map((h) => ({ at: h.at, text: h.note }))
    .reverse();
  const stageStartedAt = stageTimelineAll.find((h) => h.kind === "stage")?.at || null;

  /**
   * 「번역해서 보기」 단추는 **없앴다** (2026-08-18 PO: *"빼자"*).
   *
   * 왜: 이 화면에 뜨는 글은 이미 환자 언어다. 소견은 코디가 내보낼 때 «환자 언어 초안»이
   * 기본값이라 그대로 나가고(실측: 내보낸 3건 전부 러시아어), 코디 소식도 환자 언어로 적힌다
   * (실측 1건, 한글 아님). 단계 이름·안내는 사전이 그 언어로 낸다. 할 일이 없는 단추가 서 있어
   * «뭘 번역한다는 거지»만 만들었다 — PO 가 두 번 되물은 것 자체가 근거다.
   *
   * ⚠️ 되살리기 전에 볼 것:
   *   · 「의료진용 번역」(원장님이 환자 서류를 한국어로 보는 것, /opinion/[token])은 **다른 기능**이고
   *     그대로 살아 있다. 없앤 건 환자 화면 단추 하나뿐이다.
   *   · 8/06 결정(«자동 번역 금지»)도 그대로다 — 없앤 건 «자동 번역»이 아니라 «누를 일 없는 단추».
   *   · 코디가 한국어 소견을 그대로 내보내는 일이 생기면 그건 코디 화면에서 막을 일이지 환자에게
   *     기계 번역 단추를 쥐여줄 일이 아니다. 서버 경로(/api/inquiries/claim/translate)도 같이 지웠다
   *     (2026-09-06 — 부르는 곳이 없는 공개 POST 를 남겨 두는 건 CLAUDE.md 6번 위반이고 비용 구멍이다).
   *     번역 함수 자체(translateNotes)는 코디 쪽 /api/coordinator/notes/translate 가 그대로 쓴다.
   */

  const isFirstStage = reached.length > 0 && selected === reached[0];
  // 「보내주신 것」도 같은 규칙으로 그 단계 것만 추린다.
  // 자료는 시각이 없어 첫 단계에 둔다 — 접수 때 낸 자료가 대부분이고, 없는 시각을 지어내는 것보다 낫다.
  const stageSent = [
    ...(sent?.notes || [])
      .filter((n) => inStage(n.at))
      .map((n) => ({ kind: "note", at: n.at, label: n.text, mine: n.mine, id: n.at })),
    ...(isFirstStage
      ? (sent?.files || []).map((f) => ({
          kind: "file", at: null, label: f.name, url: f.url, mine: f.mine, id: f.path,
        }))
      : []),
  ];

  if (loading) {
    return (
      <Shell>
        <div className="flex items-center justify-center py-24 text-gray-400">
          <Loader2 size={22} className="animate-spin" />
        </div>
      </Shell>
    );
  }

  // 링크 자체가 잘못됐을 때만 화면을 대체한다(보여줄 케이스가 없으므로).
  if (error) {
    return (
      <Shell>
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mx-auto mb-5">
            <ShieldAlert className="text-amber-600" size={22} />
          </div>
          <h2 className="text-xl font-extrabold text-gray-900">
            {error === "rate_limited" ? t("claimPage.rateLimited", lang) : t("claimPage.invalidTitle", lang)}
          </h2>
          {error !== "rate_limited" && (
            <p className="text-gray-500 mt-3 text-sm leading-relaxed">{t("claimPage.invalidHint", lang)}</p>
          )}
          {error === "network" && (
            <button
              onClick={() => window.location.reload()}
              className="mt-6 w-full bg-teal-700 text-white font-bold py-3.5 rounded-xl hover:bg-teal-800 transition"
            >
              {t("claimPage.retryBtn", lang)}
            </button>
          )}
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-gray-900">{t("claimPage.progressTitle", lang)}</h1>
        <LangPicker lang={lang} />
      </div>

      {preview && <SummaryCard preview={preview} lang={lang} />}
      {progress && (
        <ProgressBar progress={progress} selected={selected} onSelect={setStage} lang={lang} />
      )}
      {progress && (
        <CurrentStep
          progress={progress}
          lang={lang}
          selected={selected}
          selectedLabel={stageLabel}
          events={stageEvents}
          startedAt={stageStartedAt}
        />
      )}
      {/* 두 축으로만 읽힌다: «우리가 준 것»(서류) → «환자가 준 것»(보내주신 것).
          소견은 «우리가 화면에 그린 소견서»가 아니라 **코디가 올린 공식 문서**로만 나간다
          (2026-08-18 PO: *"제2 의료소견서라고 우리가 이렇게 보여주고 있는거 빼자"*). */}
      {stageDocuments.length > 0 && (
        <Documents documents={stageDocuments} lang={lang} token={token} />
      )}
      {stageSent.length > 0 && (
        <SentItems items={stageSent} lang={lang} token={token} />
      )}
      {/* 지나온 단계인데 그때 오간 게 없을 수도 있다 — 빈 화면을 그냥 두면 «고장났나»가 된다. */}
      {stageDocuments.length === 0 && stageEvents.length === 0 &&
        stageSent.length === 0 && (
        <p className="mt-8 text-sm text-gray-500">{t("claimPage.stageEmpty", lang)}</p>
      )}

      {/* 언제든 보인다 — 단계와 상관없이 «지금 더 알릴 게 생겼다»는 아무 때나 생긴다. */}
      <SendMore token={token} lang={lang} />

      <div className="border-t border-gray-100 mt-8 pt-6">
        <ConnectStrip
          lang={lang}
          session={session}
          claiming={claiming}
          claimResult={claimResult}
          alreadyClaimed={alreadyClaimed}
          onPortal={() => router.push("/patient")}
          onSignup={() => router.push(`/signup${redirectQS}`)}
          onLogin={() => router.push(`/login${redirectQS}`)}
        />
      </div>

      <p className="text-xs text-gray-400 mt-6">{t("claimPage.linkPrivacy", lang)}</p>
      <DocStyles />
    </Shell>
  );
}

/**
 * 화면 안 언어 고르기 — 이 화면에는 **여기에도** 있어야 한다.
 *
 * 왜 (2026-08-05 PO): 사이트 위쪽에도 언어 단추가 있지만 **폰에서는 ☰ 메뉴 안에 숨는다.**
 * 이 화면을 여는 사람 대부분이 왓츠앱 링크를 폰으로 누른 환자·가족이고, 자동 판정이 틀렸을 때
 * (가족이 러시아어로 접수했는데 정작 읽는 분은 카자흐어만 읽는 경우) 숨은 메뉴를 찾아
 * 들어가지 않는다. 화면 맨 위, 제목 옆에 둔다.
 *
 * 고르면 **「사람이 골랐다」 표식**을 같이 남긴다 — 그래야 다음에 열 때 자동 판정이
 * 그 선택을 덮지 않는다(applyPatientLang 참고).
 *
 * 고른 언어를 «그 언어로» 적는다(한국어·Русский·Қазақша…). 못 읽는 언어로 적힌 목록에서
 * 자기 언어를 찾는 게 이 단추의 유일한 쓸모라서.
 */
function LangPicker({ lang }) {
  const onPick = (e) => {
    const code = e.target.value;
    if (!code || code === lang) return;
    setLangCookie(code); // healo_lang + healo_lang_pick 을 같이 심는다
    window.location.reload();
  };
  return (
    <label className="no-print mt-1 flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-600 focus-within:border-teal-500">
      <Globe size={13} aria-hidden="true" />
      <span className="sr-only">{t("claimPage.langLabel", lang)}</span>
      <select
        value={lang}
        onChange={onPick}
        aria-label={t("claimPage.langLabel", lang)}
        className="cursor-pointer bg-transparent font-semibold text-gray-800 focus:outline-none"
      >
        {LANG_OPTIONS_PRIMARY.map((o) => (
          <option key={o.code} value={o.code}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

/**
 * 「더 보내기」 — 환자가 이 화면에서 바로 추가 내용·자료를 보낸다 (2026-08-05 PO).
 *
 * 그동안은 왓츠앱으로 코디에게 보내고 **코디가 손으로 옮겨 적었다.** 여기서 보내면
 * 코디가 늘 보던 자리(「추가 정보」·「첨부」)에 그대로 들어가고, 거기서 소견 화면·케이스
 * 브리프까지 흐른다 — 코디가 새로 볼 화면이 없다.
 *
 * 보낸 뒤 목록을 다시 그리지 않는다: 「전해드렸어요」 한 줄로 끝낸다. 환자가 보낸 글이
 * 곧바로 화면에 박히면 «이게 의료진에게 갔다»로 읽히는데, 실제로는 코디가 보고 판단한 뒤
 * 넘어간다. 그 사이를 사실대로 적는다.
 */
function SendMore({ token, lang }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState("");
  const [error, setError] = useState("");

  const post = (body) =>
    fetch("/api/inquiries/claim/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, ...body }),
    });

  const sendText = async () => {
    const v = text.trim();
    if (!v || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await post({ text: v });
      const data = await res.json();
      // 보낸 것은 위 「보내주신 것」 칸에 뜬다 — 잠깐 「전해드렸어요」를 보여준 뒤 다시 불러 갱신한다.
      if (data.ok) {
        setText("");
        setDone(t("claimPage.sendMoreDone", lang));
        setTimeout(() => window.location.reload(), 900);
      }
      else setError(t("claimPage.sendMoreFail", lang));
    } catch {
      setError(t("claimPage.sendMoreFail", lang));
    } finally {
      setSending(false);
    }
  };

  // 자료는 **고르는 즉시 간다** — 글을 안 써도 된다. 그래서 단추 이름도 「자료 보내기」다.
  // (「첨부」라고 하면 «글에 붙여서 같이 보낸다»로 읽혀 자료만 보낸 사람이 갔는지 몰랐다 — 2026-08-05 PO)
  const sendFiles = async (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = "";
    if (!files.length) return;
    setUploading(true);
    setError("");
    const ok = [];
    for (let i = 0; i < files.length; i++) {
      const res = await uploadDirect(
        "/api/inquiries/claim/submit",
        files[i],
        { token },
        { onProgress: (p) => setProgress((i + p) / files.length) }
      );
      if (res.ok) ok.push(files[i].name);
    }
    setUploading(false);
    setProgress(0);
    // 보낸 것의 «이름»을 남긴다. 「전해드렸어요」만 뜨면 뭐가 갔는지 몰라 또 보내게 된다.
    if (ok.length < files.length) setError(t("claimPage.sendMoreFail", lang));
    else {
      setDone(t("claimPage.sendMoreDone", lang));
      setTimeout(() => window.location.reload(), 900);
    }
  };

  return (
    <div className="no-print mt-8 rounded-xl border border-teal-200 bg-teal-50/50 px-4 py-4">
      <p className="text-sm font-bold text-gray-900">{t("claimPage.sendMoreTitle", lang)}</p>
      <p className="mt-1 text-xs leading-relaxed text-gray-600">{t("claimPage.sendMoreHint", lang)}</p>

      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setDone(""); }}
        rows={3}
        maxLength={4000}
        placeholder={t("claimPage.sendMorePlaceholder", lang)}
        className="mt-3 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
      />

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={sendText}
          disabled={sending || !text.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-50"
        >
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          {t("claimPage.sendMoreSend", lang)}
        </button>

        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-teal-300 bg-white px-3 py-2 text-sm font-bold text-teal-700 hover:bg-teal-50">
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
          {uploading ? `${Math.round(progress * 100)}%` : t("claimPage.sendMoreFiles", lang)}
          <input type="file" multiple className="hidden" disabled={uploading} onChange={sendFiles} />
        </label>
      </div>

      {done && <p className="mt-2 text-xs font-semibold text-teal-800">{done}</p>}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

/**
 * 「보내주신 것」 — **환자가 우리에게 준 것 하나로**. 처음 문의글·처음 낸 자료·그 뒤에 보낸
 * 글·자료가 전부 여기 시간순으로 모인다.
 *
 * 왜 하나로 (2026-08-05 PO: *"이것저것 추가하다보니 최적화가 안된거 같아"*): 「접수 내용」과
 * 「보내주신 것」 두 칸으로 나뉘어 있었는데, **환자에겐 둘 다 「내가 보낸 것」**이다.
 * 이제 화면은 두 축으로만 읽힌다 — «우리가 준 것»(소견·서류) / «환자가 준 것»(이 칸).
 */

function SentItems({ items, lang, token }) {
  const [busy, setBusy] = useState("");

  /**
   * 본인이 «이 화면에서» 보낸 것만 지울 수 있다 (2026-08-06 PO: *"사용자가 잘못 올릴 수도
   * 있으니깐 사용자가 지울 수도 있게"*). 화면에서 사라질 뿐 **기록은 남는다** — 코디 화면엔
   * 「환자가 지움」으로 뜬다. 지우기 전에 한 번 물어본다(누르면 끝인 단추는 실수를 부른다).
   */
  const remove = async (h) => {
    if (!window.confirm(t("claimPage.sentRemoveConfirm", lang))) return;
    setBusy(h.id);
    try {
      const res = await fetch("/api/inquiries/claim/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, remove: { kind: h.kind, id: h.id } }),
      });
      const data = await res.json();
      if (data.ok) window.location.reload();
      else setBusy("");
    } catch {
      setBusy("");
    }
  };

  return (
    <div className="mt-8">
      <p className="text-xs font-bold text-gray-400">{t("claimPage.sendMoreSentTitle", lang)}</p>
      <ul className="mt-3 space-y-2.5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5">
        {items.map((h, i) => (
          <li key={`${h.label}-${i}`} className="flex items-start gap-2">
            {h.kind === "file" ? (
              <FileText size={13} className="mt-[3px] shrink-0 text-gray-500" aria-hidden="true" />
            ) : (
              <CheckCircle2 size={13} className="mt-[3px] shrink-0 text-teal-700" aria-hidden="true" />
            )}
            <div className="min-w-0 flex-1">
              {h.kind === "file" && h.url ? (
                <a
                  href={h.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-sm text-teal-700 hover:underline"
                >
                  {h.label}
                </a>
              ) : (
                <p className="whitespace-pre-wrap break-words text-sm text-gray-800">{h.label}</p>
              )}
              {h.at && (
                <p className="mt-0.5 text-[11px] text-gray-500">{new Date(h.at).toLocaleDateString(dateLocale(lang))}</p>
              )}
            </div>
            {h.mine && (
              <button
                type="button"
                onClick={() => remove(h)}
                disabled={busy === h.id}
                aria-label={t("claimPage.sentRemove", lang)}
                title={t("claimPage.sentRemove", lang)}
                className="shrink-0 rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700 disabled:opacity-50"
              >
                {busy === h.id ? (
                  <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                ) : (
                  <X size={13} aria-hidden="true" />
                )}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}


/** 누구 건인지만 짧게. 연락처·생년월일·서류는 서버가 아예 안 내려준다. */
function SummaryCard({ preview, lang }) {
  const rows = [
    [t("claimPage.patientLabel", lang), preview.firstNameMasked],
    [t("claimPage.cancerLabel", lang), preview.cancerType],
    [t("claimPage.agencyLabel", lang), preview.agencyName],
    [
      t("claimPage.receivedAtLabel", lang),
      preview.createdAt ? new Date(preview.createdAt).toLocaleDateString(dateLocale(lang)) : null,
    ],
    // 희망 시기는 «내가 보낸 것»이 아니라 케이스의 성질이라 맨 위 요약에 둔다.
    [
      t("claimPage.intakeWhen", lang),
      preview.preferredDate
        ? new Date(preview.preferredDate).toLocaleDateString(dateLocale(lang))
        : preview.preferredDateFlex
          ? t("claimPage.intakeWhenFlex", lang)
          : null,
    ],
  ].filter(([, v]) => v);

  if (!rows.length) return null;
  return (
    <div className="mt-5 bg-gray-50 rounded-xl p-4 space-y-2">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between text-sm gap-4">
          <span className="text-gray-400 shrink-0">{label}</span>
          <span className="text-gray-900 font-semibold text-right">{value}</span>
        </div>
      ))}
    </div>
  );
}

/** 6단계 막대. currentOrder 까지 채운다(보류는 서버가 직전 단계로 세워서 보낸다). */
/**
 * 6단계 막대 — **누를 수 있는 탭 노릇도 한다**(2026-08-05 PO).
 *
 * 왜: 치료가 진행되면 비자 서류·치료 자료가 계속 붙어 한 화면 스크롤로는 못 본다. 그렇다고
 * 칸을 따로 6개 만들면 아직 안 온 단계는 **빈 칸**이 된다 — PO 답: *"빈칸 5개로 만들지 말고
 * 그 탭은 비활성화 시키면 되지"*. 그래서 **아직 안 온 단계는 흐리게 잠그고**(못 누른다),
 * 지나온·지금 단계만 눌러서 그때 받은 것만 본다.
 *
 * 새 칸을 만들지 않는다 — 이미 있는 막대가 곧 탭이다. 한 줄도 안 늘어난다.
 */
function ProgressBar({ progress, selected, onSelect, lang }) {
  const steps = progress.steps || [];
  if (!steps.length) return null;
  return (
    <div className="mt-7 flex items-start">
      {steps.map((s, i) => {
        const done = progress.currentOrder >= s.order;
        const active = selected === s.order;
        return (
          // min-w-0 이 없으면 칸이 «글자 길이»만큼 벌어져 화면 밖으로 밀린다. 한국어에선
          // 안 걸리고 러시아어에서 걸렸다 — 폰에서 「Завершено」가 30px 삐져나갔다(2026-08-06 실측).
          <div key={s.key} className="relative flex min-w-0 flex-1 flex-col items-center">
            {i > 0 && (
              <span
                className={`absolute top-[9px] right-1/2 w-full h-[3px] ${done ? "bg-teal-500" : "bg-gray-200"}`}
                aria-hidden="true"
              />
            )}
            <button
              type="button"
              onClick={() => done && onSelect(s.order)}
              disabled={!done}
              aria-current={active ? "step" : undefined}
              aria-label={done ? s.label : `${s.label} — ${t("claimPage.stageLocked", lang)}`}
              title={done ? s.label : t("claimPage.stageLocked", lang)}
              className={`z-10 flex w-full min-w-0 flex-col items-center ${
                done ? "cursor-pointer" : "cursor-not-allowed opacity-60"
              }`}
            >
              <span
                className={`relative z-10 block h-[21px] w-[21px] shrink-0 rounded-full border-2 ${
                  done ? "bg-teal-700 border-teal-700" : "bg-white border-gray-300"
                } ${active ? "ring-2 ring-teal-300 ring-offset-2" : ""}`}
                aria-hidden="true"
              />
              {/* 폰에서는 이름을 숨긴다. 좁은 칸에 러시아어를 넣으면 「Консульт/ация и/рассмот/
                  рение」처럼 **단어 중간이 잘려 읽히지 않는다**(2026-08-06 안드로이드 흉내기 실측).
                  숨겨도 잃는 게 없다 — 고른 단계 이름은 바로 아래에 크게 뜨고, 각 점에는
                  title·aria-label 이 그대로 붙어 있다. 넓은 화면에서는 그대로 보인다. */}
              <span
                className={`mt-2 hidden w-full px-0.5 text-center text-[11px] leading-tight break-words sm:block ${
                  active ? "text-teal-800 font-extrabold underline" : done ? "text-teal-700 font-semibold" : "text-gray-500"
                }`}
              >
                {s.label}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

/**
 * 고른 단계의 머리말. **지금 단계를 고르면** 「다음은요」 안내까지 같이 보이고,
 * 지나온 단계를 고르면 그 단계 이름만 — 지난 일에 「다음은요」를 붙이면 지금 할 일로 오해한다.
 */
function CurrentStep({ progress, lang, selected, selectedLabel, events, startedAt }) {
  if (!progress.caseStatus) {
    return <p className="mt-8 text-sm text-gray-500 leading-relaxed">{t("claimPage.notStarted", lang)}</p>;
  }
  const isNow = selected === progress.currentOrder;
  const showNext = isNow && progress.nextStep;
  return (
    <div className="mt-8">
      <p className="text-xs font-bold text-gray-400">
        {isNow ? t("claimPage.currentStepLabel", lang) : t("claimPage.pastStepLabel", lang)}
      </p>
      <div className="mt-1 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-extrabold text-gray-900">
          {isNow ? progress.caseStatusLabel : selectedLabel}
        </h2>
        {/* 단계가 «언제 시작됐나» — 예전엔 이 날짜 하나 때문에 아래에 칸이 하나 서 있었다. */}
        {startedAt && (
          <span className="shrink-0 text-xs text-gray-500">
            {new Date(startedAt).toLocaleDateString(dateLocale(lang))}
          </span>
        )}
      </div>
      {isNow && progress.caseStatusNote && (
        <p className="text-sm text-gray-500 mt-2 leading-relaxed">{progress.caseStatusNote}</p>
      )}
      {/* 한 칸 안에 «이 단계에 있었던 일»(새것부터) + «앞으로 어떻게 되나».
          칸을 나누면 또 늘어난다 — 붙여서 한 칸으로 둔다. */}
      {(events.length > 0 || showNext) && (
        <div className="mt-4 bg-teal-50 border border-teal-200 rounded-xl px-4 py-3">
          {events.length > 0 && (
            <>
              <p className="text-xs font-bold text-teal-800">{t("claimPage.latestUpdateLabel", lang)}</p>
              <ul className="mt-1.5 space-y-2">
                {events.map((e, i) => (
                  <li key={`${e.at}-${i}`}>
                    <span className="mr-2 text-xs text-teal-700">
                      {e.at ? new Date(e.at).toLocaleDateString(dateLocale(lang)) : ""}
                    </span>
                    <span
                      className={`whitespace-pre-wrap break-words text-sm leading-relaxed ${
                        i === 0 ? "font-semibold text-teal-900" : "text-teal-800"
                      }`}
                    >
                      {e.text}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {showNext && (
            <div className={events.length > 0 ? "mt-3 border-t border-teal-200 pt-3" : ""}>
              <p className="text-xs font-bold text-teal-800">{t("claimPage.nextLabel", lang)}</p>
              <p className="text-sm text-teal-800 mt-1 leading-relaxed flex items-start gap-1.5">
                <ArrowRight size={13} className="mt-1 shrink-0" aria-hidden="true" />
                <span>{progress.nextStep}</span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


/**
 * 「PDF 로 저장」 — 누른 그 블록 하나만 PDF 로 만든다.
 *
 * 속은 브라우저 인쇄 기능이지만 **「인쇄」라고 쓰지 않는다**(2026-08-05 PO): 종이로 뽑으라는
 * 뜻으로 읽히는데 실제로 필요한 건 파일이다. 창이 뜨면 「대상」을 «PDF 로 저장»으로 두고 저장한다.
 *
 * 워드 파일을 서버에서 PDF 로 «변환»하지 않는 대신 이 단추가 그 역할을 한다. 결과물은 같고,
 * 글꼴은 그 사람 기기 것을 쓰니 키릴·한글이 안 깨진다.
 */
function SavePdfButton({ targetId, lang }) {
  const onSave = () => {
    document.querySelectorAll('[data-print="on"]').forEach((el) => el.removeAttribute("data-print"));
    document.getElementById(targetId)?.setAttribute("data-print", "on");
    window.print();
  };
  return (
    <button
      type="button"
      onClick={onSave}
      className="no-print inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
    >
      <FileDown size={13} aria-hidden="true" />
      {t("claimPage.opinionsPrint", lang)}
    </button>
  );
}

/**
 * 인쇄하면 «누른 블록»만 나오게. 머리·바닥·쿠키띠·상담위젯이 같이 찍히면 그거야말로 짜친다.
 *
 * ⚠️ 아래는 «평범한» style 태그여야 한다. styled-jsx 방식(태그에 jsx 속성을 붙이는 것)은
 * App Router 에서 렌더가 안 돼 CSS 가 통째로 증발한다 — POSTMORTEMS #113 실사고이고
 * `check-content-consistency` 가 막는다(이번에도 실제로 막혔다).
 */
function DocStyles() {
  return (
    <style>{`
      /* 워드에서 뽑아낸 글은 class 가 없다(정제 때 속성을 전부 버린다) → 여기서 기본 모양을 준다.
         Tailwind preflight 가 h1·ul·table 의 브라우저 기본 서식을 지워놔서 안 주면 다 평평해진다. */
      .doc-html h1, .doc-html h2, .doc-html h3 { font-weight: 700; color: #111827; margin: 1.1em 0 .4em; }
      .doc-html h1 { font-size: 1.05rem; }
      .doc-html h2 { font-size: 1rem; }
      .doc-html h3 { font-size: .95rem; }
      .doc-html p { margin: .55em 0; }
      .doc-html ul, .doc-html ol { margin: .55em 0; padding-left: 1.25rem; list-style: disc; }
      .doc-html ol { list-style: decimal; }
      .doc-html li { margin: .25em 0; }
      .doc-html strong, .doc-html b { font-weight: 700; }
      /* 표는 폰에서 넘친다 → 가로로만 스크롤(본문이 옆으로 밀리면 안 된다) */
      .doc-html table { display: block; overflow-x: auto; border-collapse: collapse; margin: .8em 0; max-width: 100%; }
      .doc-html td, .doc-html th { border: 1px solid #e5e7eb; padding: .35rem .55rem; vertical-align: top; }
      .doc-html th { background: #f9fafb; font-weight: 700; }

      @media print {
        body * { visibility: hidden; }
        [data-print="on"], [data-print="on"] * { visibility: visible; }
        [data-print="on"] { position: absolute; left: 0; top: 0; width: 100%; }
        [data-print="on"] article { border: 0; padding: 0; }
        .no-print { display: none !important; }
      }
    `}</style>
  );
}

/**
 * 우리가 보낸 서류 — 소견서·사전상담 정리본 등. 코디가 「환자에게 보이기」를 켠 것만 내려온다.
 *
 * 「보기」와 「내려받기」를 **둘 다** 준다(2026-08-05 PO). 보기는 서버가 그려서 준다 —
 * PDF 는 한 쪽씩 사진으로(브라우저 내장 뷰어가 폰에서 하얗게 뜨는 사고가 있었다),
 * 워드는 글로 풀어서(폰에 워드 앱이 없으면 아예 못 연다). 내려받기 주소는 10분짜리라
 * 화면을 오래 열어두면 만료된다 → 안 열릴 때 새로고침하라고 미리 적어둔다.
 */
function Documents({ documents, lang, token }) {
  const [openId, setOpenId] = useState(null);

  const row = (d) => (
    <li key={d.id} className={`overflow-hidden ${openId === d.id ? "bg-teal-50/70" : ""}`}>
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <FileText size={16} className="shrink-0 text-teal-700" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <span className="block break-words text-sm font-semibold text-gray-900">{d.name}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
            {d.lang && <span className="font-medium text-teal-800">{DOC_LANG_LABEL[d.lang] || d.lang}</span>}
            {d.at && <span>{new Date(d.at).toLocaleDateString(dateLocale(lang))}</span>}
            {d.note && <span className="basis-full text-gray-500">{d.note}</span>}
          </span>
        </div>
        {/* 줄에는 「보기」만. 내려받기·PDF 저장은 열어 본 «다음»에 필요한 것이라 미리보기 아래에 둔다. */}
        <div className="no-print flex shrink-0 items-center">
          <button
            type="button"
            onClick={() => setOpenId(openId === d.id ? null : d.id)}
            className="inline-flex items-center gap-1 rounded-lg bg-teal-700 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-teal-800"
          >
            <Eye size={13} aria-hidden="true" />
            {openId === d.id ? t("claimPage.documentsClose", lang) : t("claimPage.documentsView", lang)}
          </button>
        </div>
      </div>
      {openId === d.id && <DocumentPreview doc={d} token={token} lang={lang} />}
    </li>
  );

  return (
    <div className="mt-8">
      <p className="text-xs font-bold text-gray-400">{t("claimPage.documentsTitle", lang)}</p>

      {/* 언어가 달라도 **한 목록에 다 보인다**(2026-08-05 PO): 예전엔 「내 언어 것」만 펴고
          나머지를 「다른 언어로 된 서류(n)」로 접었는데, 그러면 **어느 언어로 열었느냐에 따라
          화면이 달라 보인다**. 러시아어 화면엔 접힘 단추가 있고 한국어 화면엔 없는 식이라
          «왜 다르냐»가 된다. 어느 언어든 같은 화면 — 어느 언어 서류인지는 배지로 안다. */}
      <ul className="mt-3 divide-y divide-teal-100 overflow-hidden rounded-xl border border-teal-200">
        {documents.map(row)}
      </ul>

      <p className="text-xs text-gray-400 mt-2.5">{t("claimPage.documentsHint", lang)}</p>
    </div>
  );
}

/**
 * 서류 한 건의 미리보기. 서버가 종류를 판단해 준다(PDF=쪽 사진 / 워드=글 / 사진 / 없음).
 *
 * PDF 는 **한 쪽씩** 받는다 — 100쪽짜리를 한 번에 그리면 몇 십 초가 걸리고 그동안 화면이 멈춘다.
 * 넘길 때 「여는 중」을 표시한다(멈춘 건지 기다리는 건지 알게 — 2026-08-04 같은 이유로 넣은 것).
 */
function DocumentPreview({ doc, token, lang }) {
  const [state, setState] = useState({ status: "loading" });
  const [page, setPage] = useState(0);
  const printId = `doc-print-${doc.id}`;

  useEffect(() => {
    let alive = true;
    setState({ status: "loading" });
    (async () => {
      try {
        const res = await fetch(
          `/api/inquiries/claim/document?token=${encodeURIComponent(token)}&docId=${encodeURIComponent(doc.id)}`
        );
        const data = await res.json();
        if (!alive) return;
        setState(res.ok && data.ok ? { status: "ok", ...data } : { status: "error" });
      } catch {
        if (alive) setState({ status: "error" });
      }
    })();
    return () => { alive = false; };
  }, [doc.id, token]);

  if (state.status === "loading") {
    return (
      <div className="flex items-center gap-2 px-4 pb-4 text-sm text-gray-500">
        <Loader2 size={15} className="animate-spin" /> {t("claimPage.documentsLoading", lang)}
      </div>
    );
  }
  if (state.status === "error" || state.kind === "none") {
    return (
      <p className="px-4 pb-4 text-sm text-gray-500">{t("claimPage.documentsNoPreview", lang)}</p>
    );
  }

  return (
    <div className="border-t border-teal-200 px-4 py-3">
      <div id={printId} className="rounded-lg bg-white p-3">
        {state.kind === "pdf" && (
          <img
            key={page}
            src={`/api/inquiries/claim/document?token=${encodeURIComponent(token)}&docId=${encodeURIComponent(doc.id)}&p=${page}`}
            alt={`${doc.name} — ${page + 1}`}
            className="mx-auto block h-auto w-full max-w-full"
          />
        )}
        {state.kind === "image" && doc.url && (
          <img src={doc.url} alt={doc.name} className="mx-auto block h-auto w-full max-w-full" />
        )}
        {state.kind === "html" && (
          // 서버가 허용 목록으로 정제한 HTML (src/lib/documents/docxHtml.ts) — 원본 태그·속성은 안 넘어온다.
          <div
            className="doc-html text-sm leading-relaxed text-gray-800"
            dangerouslySetInnerHTML={{ __html: state.html }}
          />
        )}
      </div>

      {/* 단추는 문서 «아래»에 둔다(2026-08-05 PO). 위에 있으면 다 읽고 나서 다시 올라가야 한다 —
          쪽 넘기기도 마지막 줄을 읽은 자리에서 바로 눌리는 게 맞다. */}
      <div className="no-print mt-2.5 flex flex-wrap items-center justify-between gap-2">
        {state.kind === "pdf" && state.pages > 1 ? (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded border border-gray-200 bg-white px-2.5 py-1 font-semibold disabled:opacity-40"
              aria-label={t("claimPage.documentsPrevPage", lang)}
            >
              ‹
            </button>
            <span>{page + 1} / {state.pages}</span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(state.pages - 1, p + 1))}
              disabled={page >= state.pages - 1}
              className="rounded border border-gray-200 bg-white px-2.5 py-1 font-semibold disabled:opacity-40"
              aria-label={t("claimPage.documentsNextPage", lang)}
            >
              ›
            </button>
          </div>
        ) : (
          <span />
        )}
        {/* 저장 단추는 **하나뿐이다** — 「내려받기」와 「PDF 로 저장」이 나란히 있으면
            «둘이 뭐가 다른가»를 환자가 판단해야 한다(2026-08-05 PO 지적). 받는 건 언제나 PDF 다:
            · 원본이 PDF 면 그 파일을 그대로 준다(원본이 제일 정확하다)
            · 워드·그 밖이면 지금 보고 있는 화면을 PDF 로 뽑는다(워드 원본은 서버가 안 내준다) */}
        {doc.isPdf && doc.url ? (
          <a
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            <FileDown size={13} aria-hidden="true" />
            {t("claimPage.opinionsPrint", lang)}
          </a>
        ) : (
          <SavePdfButton targetId={printId} lang={lang} />
        )}
      </div>
    </div>
  );
}


/** 아래 띠 — 계정 연결/가입 권유. 여기가 무슨 상태가 되든 **위 진행상황은 그대로 남는다.** */
function ConnectStrip({ lang, session, claiming, claimResult, alreadyClaimed, onPortal, onSignup, onLogin }) {
  if (session === undefined || claiming) {
    return (
      <p className="flex items-center gap-2 text-sm text-gray-400">
        <Loader2 size={16} className="animate-spin" />
        {t("claimPage.claiming", lang)}
      </p>
    );
  }

  if (claimResult === "claimed") {
    return (
      <Note icon={<CheckCircle2 className="text-teal-700" size={20} />} tone="teal"
            title={t("claimPage.claimedTitle", lang)} body={t("claimPage.claimedHint", lang)}>
        <PrimaryBtn onClick={onPortal}>{t("claimPage.goPortal", lang)}</PrimaryBtn>
      </Note>
    );
  }

  // 직원·에이전시·병원 계정 — 개인 계정엔 못 붙지만 진행상황은 위에 그대로 보인다.
  if (claimResult === "staff_cannot_claim") {
    return (
      <Note icon={<ShieldAlert className="text-gray-400" size={20} />} tone="gray"
            title={t("claimPage.staffBlockedTitle", lang)} body={t("claimPage.staffViewOnly", lang)} />
    );
  }

  if (claimResult === "already_claimed") {
    return (
      <Note icon={<ShieldAlert className="text-amber-600" size={20} />} tone="amber"
            title={t("claimPage.conflictTitle", lang)} body={t("claimPage.conflictHint", lang)} />
    );
  }

  if (claimResult === "error") {
    return (
      <Note icon={<ShieldAlert className="text-amber-600" size={20} />} tone="amber"
            title={t("claimPage.network", lang)}>
        <PrimaryBtn onClick={() => window.location.reload()}>{t("claimPage.retryBtn", lang)}</PrimaryBtn>
      </Note>
    );
  }

  // 비로그인 + 이미 다른 계정에 연결된 케이스 → 로그인 유도
  if (alreadyClaimed) {
    return (
      <Note icon={<CheckCircle2 className="text-teal-700" size={20} />} tone="teal"
            title={t("claimPage.alreadyClaimedTitle", lang)} body={t("claimPage.alreadyClaimedHint", lang)}>
        <PrimaryBtn onClick={onLogin}>{t("claimPage.loginBtn", lang)}</PrimaryBtn>
      </Note>
    );
  }

  // 비로그인 + 미연결 → 가입 권유(강요 아님. 안 눌러도 위 진행상황은 계속 보인다)
  return (
    <div className="bg-gray-50 rounded-xl p-5">
      <p className="font-extrabold text-gray-900">{t("claimPage.signupPitchTitle", lang)}</p>
      <p className="text-sm text-gray-500 mt-2 leading-relaxed">{t("claimPage.signupPitchBody", lang)}</p>
      <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
        <button
          onClick={onSignup}
          className="flex-1 bg-teal-700 text-white font-bold py-3 rounded-xl hover:bg-teal-800 transition"
        >
          {t("claimPage.signupBtn", lang)}
        </button>
        <button
          onClick={onLogin}
          className="flex-1 bg-white text-teal-700 font-bold py-3 rounded-xl border border-teal-200 hover:bg-teal-50 transition"
        >
          {t("claimPage.loginBtn", lang)}
        </button>
      </div>
    </div>
  );
}

function Note({ icon, tone, title, body, children }) {
  const bg = tone === "teal" ? "bg-teal-50" : tone === "amber" ? "bg-amber-50" : "bg-gray-50";
  return (
    <div className={`${bg} rounded-xl p-5`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <div>
          <p className="font-extrabold text-gray-900">{title}</p>
          {body && <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{body}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function PrimaryBtn({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="mt-4 w-full bg-teal-700 text-white font-bold py-3 rounded-xl hover:bg-teal-800 transition"
    >
      {children}
    </button>
  );
}

function Shell({ children }) {
  return (
    <div className="min-h-[calc(100vh-64px)] flex items-start justify-center bg-gray-50 px-4 py-10">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-7 md:p-9 border border-gray-100">
        {children}
      </div>
    </div>
  );
}
