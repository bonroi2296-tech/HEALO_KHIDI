"use client";

/**
 * 환자 계정 연결(claim) — 에이전시 경유로 접수돼 계정이 없던 환자가 이 링크로
 * 회원가입/로그인하면 해당 케이스(inquiries)가 본인 계정에 연결돼 /patient 포털을
 * 바로 쓸 수 있다. 코디·에이전시가 공유하는 링크(healwith.co.kr/claim/[token]).
 */

import { useEffect, useState } from "react";
import { Link2, CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useLang } from "@/lib/i18n/LangContext";
import { t } from "@/lib/i18n";

const supabase = createSupabaseBrowserClient();

export default function ClaimClient({ token }) {
  const lang = useLang();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(""); // invalid_link | rate_limited | network
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);
  const [preview, setPreview] = useState(null);

  const [session, setSession] = useState(undefined); // undefined=확인중, null=비로그인
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState(null); // "claimed" | "staff_cannot_claim" | "already_claimed" | "error"

  // 1) 토큰 미리보기(계정 없이 열람 가능)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/inquiries/claim?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (!alive) return;
        if (!res.ok || !data.ok) {
          setError(data.error === "rate_limited" ? "rate_limited" : "invalid_link");
        } else if (data.alreadyClaimed) {
          setAlreadyClaimed(true);
        } else {
          setPreview(data.preview);
        }
      } catch {
        if (alive) setError("network");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token]);

  // 2) 로그인 상태 확인
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setSession(data?.session || null);
    });
    return () => { alive = false; };
  }, []);

  // 3) 이미 로그인 → 자동으로 연결 시도. POST 쪽이 claim 판정의 최종 권위자라
  // (본인 소유면 alreadyOwned:true로 성공 처리) alreadyClaimed=true(GET 기준)여도 시도한다 —
  // "이미 연결됨" 화면이 실제로는 본인 소유인 재방문 케이스를 오탐하지 않게.
  useEffect(() => {
    if (!session || (!preview && !alreadyClaimed) || claiming || claimResult) return;
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
        if (data.ok) {
          setClaimResult("claimed");
        } else if (data.error === "staff_cannot_claim") {
          setClaimResult("staff_cannot_claim");
        } else if (data.error === "already_claimed") {
          setClaimResult("already_claimed");
        } else {
          setClaimResult("error");
        }
      } catch {
        setClaimResult("error");
      } finally {
        setClaiming(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, preview]);

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

  if (error) {
    return (
      <Shell>
        <Message
          icon={<ShieldAlert className="text-amber-600" size={22} />}
          iconBg="bg-amber-50"
          title={error === "rate_limited" ? t("claimPage.rateLimited", lang) : t("claimPage.invalidTitle", lang)}
          hint={error === "rate_limited" ? "" : t("claimPage.invalidHint", lang)}
        />
      </Shell>
    );
  }

  // session===null(확인 끝, 비로그인)일 때만 정적 안내 — 로그인 상태면 위 3번 효과가 본인 소유 여부를
  // POST로 재확인하므로 여기서 먼저 "로그인하세요"라고 오탐 안내하지 않는다.
  if (alreadyClaimed && session === null) {
    return (
      <Shell>
        <Message
          icon={<CheckCircle2 className="text-teal-700" size={22} />}
          iconBg="bg-teal-50"
          title={t("claimPage.alreadyClaimedTitle", lang)}
          hint={t("claimPage.alreadyClaimedHint", lang)}
        >
          <button
            onClick={() => router.push(`/login${redirectQS}`)}
            className="mt-6 w-full bg-teal-700 text-white font-bold py-3.5 rounded-xl hover:bg-teal-800 transition"
          >
            {t("claimPage.loginBtn", lang)}
          </button>
        </Message>
      </Shell>
    );
  }

  if (claimResult === "claimed") {
    return (
      <Shell>
        <Message
          icon={<CheckCircle2 className="text-teal-700" size={22} />}
          iconBg="bg-teal-50"
          title={t("claimPage.claimedTitle", lang)}
          hint={t("claimPage.claimedHint", lang)}
        >
          <button
            onClick={() => router.push("/patient")}
            className="mt-6 w-full bg-teal-700 text-white font-bold py-3.5 rounded-xl hover:bg-teal-800 transition"
          >
            {t("claimPage.goPortal", lang)}
          </button>
        </Message>
      </Shell>
    );
  }

  if (claimResult === "staff_cannot_claim") {
    return (
      <Shell>
        <Message
          icon={<ShieldAlert className="text-amber-600" size={22} />}
          iconBg="bg-amber-50"
          title={t("claimPage.staffBlockedTitle", lang)}
          hint={t("claimPage.staffBlockedHint", lang)}
        />
      </Shell>
    );
  }

  if (claimResult === "already_claimed") {
    return (
      <Shell>
        <Message
          icon={<ShieldAlert className="text-amber-600" size={22} />}
          iconBg="bg-amber-50"
          title={t("claimPage.conflictTitle", lang)}
          hint={t("claimPage.conflictHint", lang)}
        />
      </Shell>
    );
  }

  if (claimResult === "error") {
    return (
      <Shell>
        <Message
          icon={<ShieldAlert className="text-amber-600" size={22} />}
          iconBg="bg-amber-50"
          title={t("claimPage.network", lang)}
        >
          <button
            onClick={() => window.location.reload()}
            className="mt-6 w-full bg-teal-700 text-white font-bold py-3.5 rounded-xl hover:bg-teal-800 transition"
          >
            {t("claimPage.retryBtn", lang)}
          </button>
        </Message>
      </Shell>
    );
  }

  // session===undefined(확인 중)일 때도 계속 스피너 — 여기서 false로 새면 이미 로그인한
  // 사용자에게 잠깐 회원가입/로그인 버튼이 깜빡였다 사라지는 오탐 화면이 뜬다.
  if (claiming || session === undefined || (session && (preview || alreadyClaimed))) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center py-16 text-gray-500 gap-3">
          <Loader2 size={22} className="animate-spin" />
          <p className="text-sm">{t("claimPage.claiming", lang)}</p>
        </div>
      </Shell>
    );
  }

  // 미로그인 + 유효한 미리보기 → 가입/로그인 유도
  return (
    <Shell>
      <div className="text-center">
        <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center mx-auto mb-5">
          <Link2 className="text-teal-700" size={22} />
        </div>
        <h2 className="text-xl font-extrabold text-gray-900">{t("claimPage.heading", lang)}</h2>
        <p className="text-gray-500 mt-3 text-sm leading-relaxed">{t("claimPage.previewIntro", lang)}</p>

        {preview && (preview.firstNameMasked || preview.cancerType || preview.agencyName) && (
          <div className="mt-5 bg-gray-50 rounded-xl p-4 text-left space-y-2">
            {preview.firstNameMasked && (
              <Row label={t("claimPage.patientLabel", lang)} value={preview.firstNameMasked} />
            )}
            {preview.cancerType && (
              <Row label={t("claimPage.cancerLabel", lang)} value={preview.cancerType} />
            )}
            {preview.agencyName && (
              <Row label={t("claimPage.agencyLabel", lang)} value={preview.agencyName} />
            )}
          </div>
        )}

        <div className="mt-7 flex flex-col gap-3">
          <button
            onClick={() => router.push(`/signup${redirectQS}`)}
            className="w-full bg-teal-700 text-white font-bold py-3.5 rounded-xl hover:bg-teal-800 transition"
          >
            {t("claimPage.signupBtn", lang)}
          </button>
          <button
            onClick={() => router.push(`/login${redirectQS}`)}
            className="w-full bg-white text-teal-700 font-bold py-3.5 rounded-xl border border-teal-200 hover:bg-teal-50 transition"
          >
            {t("claimPage.loginBtn", lang)}
          </button>
        </div>
      </div>
    </Shell>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="text-gray-900 font-semibold">{value}</span>
    </div>
  );
}

function Message({ icon, iconBg, title, hint, children }) {
  return (
    <div className="text-center py-4">
      <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center mx-auto mb-5`}>
        {icon}
      </div>
      <h2 className="text-xl font-extrabold text-gray-900">{title}</h2>
      {hint && <p className="text-gray-500 mt-3 text-sm leading-relaxed">{hint}</p>}
      {children}
    </div>
  );
}

function Shell({ children }) {
  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 md:p-10 border border-gray-100">
        {children}
      </div>
    </div>
  );
}
