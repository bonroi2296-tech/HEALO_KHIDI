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
import { CheckCircle2, Loader2, ShieldAlert, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useLang } from "@/lib/i18n/LangContext";
import { t, dateLocale } from "@/lib/i18n";

const supabase = createSupabaseBrowserClient();

export default function ClaimClient({ token }) {
  const lang = useLang();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(""); // invalid_link | rate_limited | network
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);
  const [preview, setPreview] = useState(null);
  const [progress, setProgress] = useState(null);

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
      <h1 className="text-2xl font-extrabold text-gray-900">{t("claimPage.progressTitle", lang)}</h1>

      {preview && <SummaryCard preview={preview} lang={lang} />}
      {progress && <ProgressBar progress={progress} />}
      {progress && <CurrentStep progress={progress} lang={lang} />}
      {progress?.timeline?.length > 0 && <History timeline={progress.timeline} lang={lang} />}

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
    </Shell>
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
function ProgressBar({ progress }) {
  const steps = progress.steps || [];
  if (!steps.length) return null;
  return (
    <div className="mt-7 flex items-start">
      {steps.map((s, i) => {
        const done = progress.currentOrder >= s.order;
        return (
          <div key={s.key} className="flex-1 flex flex-col items-center relative">
            {i > 0 && (
              <span
                className={`absolute top-[9px] right-1/2 w-full h-[3px] ${done ? "bg-teal-500" : "bg-gray-200"}`}
                aria-hidden="true"
              />
            )}
            <span
              className={`relative z-10 w-[21px] h-[21px] rounded-full border-2 ${
                done ? "bg-teal-700 border-teal-700" : "bg-white border-gray-300"
              }`}
              aria-hidden="true"
            />
            <span
              className={`mt-2 text-[11px] leading-tight text-center px-0.5 ${
                done ? "text-teal-700 font-semibold" : "text-gray-400"
              }`}
            >
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function CurrentStep({ progress, lang }) {
  if (!progress.caseStatus) {
    return <p className="mt-8 text-sm text-gray-500 leading-relaxed">{t("claimPage.notStarted", lang)}</p>;
  }
  return (
    <div className="mt-8">
      <p className="text-xs font-bold text-gray-400">{t("claimPage.currentStepLabel", lang)}</p>
      <h2 className="text-lg font-extrabold text-gray-900 mt-1">{progress.caseStatusLabel}</h2>
      {progress.caseStatusNote && (
        <p className="text-sm text-gray-500 mt-2 leading-relaxed">{progress.caseStatusNote}</p>
      )}
      {progress.nextStep && (
        <div className="mt-4 bg-teal-50 border border-teal-200 rounded-xl px-4 py-3">
          <p className="text-xs font-bold text-teal-800">{t("claimPage.nextLabel", lang)}</p>
          <p className="text-sm text-teal-800 mt-1 leading-relaxed flex items-start gap-1.5">
            <ArrowRight size={13} className="mt-1 shrink-0" aria-hidden="true" />
            <span>{progress.nextStep}</span>
          </p>
        </div>
      )}
    </div>
  );
}

function History({ timeline, lang }) {
  const rows = [...timeline].reverse();
  return (
    <div className="mt-8">
      <p className="text-xs font-bold text-gray-400">{t("claimPage.historyTitle", lang)}</p>
      <ul className="mt-3 space-y-3">
        {rows.map((h, i) => (
          <li key={`${h.at}-${i}`} className="flex gap-3 text-sm">
            <span
              className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${i === 0 ? "bg-teal-700" : "bg-gray-300"}`}
              aria-hidden="true"
            />
            <span className="text-gray-400 shrink-0 w-24">
              {h.at ? new Date(h.at).toLocaleDateString(dateLocale(lang)) : ""}
            </span>
            <span className={i === 0 ? "text-gray-900 font-semibold" : "text-gray-500"}>
              {h.label}
              {h.note && <span className="block text-xs text-gray-400 mt-0.5">{h.note}</span>}
            </span>
          </li>
        ))}
      </ul>
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
