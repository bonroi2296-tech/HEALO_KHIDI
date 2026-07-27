"use client";

/**
 * 환자 계정·개인정보 화면 — 데이터 삭제 요청(GDPR 제17조 / PIPA 파기요청권).
 * 즉시 삭제가 아니라 "요청" 접수 → 관리자가 확인 후 파기·익명화. 6개 언어.
 */

import { useState, useEffect } from "react";
import { ShieldCheck, Trash2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useLang } from "@/lib/i18n/LangContext";
import { t } from "@/lib/i18n";

const supabase = createSupabaseBrowserClient();

// 화면 문구는 중앙 i18n 사전 patientAccount.* 키(6개 활성언어 ko·en·ru·kz·zh·ja)

export default function AccountClient() {
  const lang = useLang();

  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState(true);
  const [status, setStatus] = useState(null); // null | pending | processing | completed | rejected
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(null);

  const getToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || null;
  };

  const load = async () => {
    setLoading(true);
    try {
      // ⚠️ 이 변수를 t 로 두지 마라 — 모듈 스코프의 i18n t() 를 가려 t("...") 가 TypeError 가 된다.
      const token = await getToken();
      if (!token) { setAuth(false); setLoading(false); return; }
      const res = await fetch("/api/patient/account/deletion-request", {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
      });
      const j = await res.json();
      if (j.ok) setStatus(j.request?.status || null);
    } catch { /* noop */ } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const request = async () => {
    if (!window.confirm(t("patientAccount.confirm", lang))) return;
    setBusy(true); setFlash(null);
    try {
      // ⚠️ 이 변수를 t 로 두지 마라 — i18n t() 가 가려져 아래 성공/실패 문구가 TypeError 가 된다
      // (그러면 삭제 요청이 접수됐는데도 화면엔 "실패"가 떠서 환자가 중복 신청한다).
      const token = await getToken();
      if (!token) { setAuth(false); return; }
      const res = await fetch("/api/patient/account/deletion-request", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      const j = await res.json();
      if (j.ok) { setStatus(j.status || "pending"); setFlash({ type: "ok", text: t("patientAccount.pending", lang) }); }
      else setFlash({ type: "err", text: t("patientAccount.err", lang) });
    } catch {
      setFlash({ type: "err", text: t("patientAccount.err", lang) });
    } finally { setBusy(false); }
  };

  const active = status === "pending" || status === "processing";

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <ShieldCheck size={22} className="text-teal-700" />
        <h1 className="text-xl font-bold text-gray-900">{t("patientAccount.title", lang)}</h1>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">{t("patientAccount.loading", lang)}</p>
      ) : !auth ? (
        <p className="text-sm text-gray-600">
          {t("patientAccount.loginReq", lang)} <a className="text-teal-700 underline ml-1" href="/login">{t("patientAccount.loginLink", lang)}</a>
        </p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 md:p-6">
          <div className="flex items-center gap-2 mb-2">
            <Trash2 size={18} className="text-gray-500" />
            <h2 className="text-base font-bold text-gray-900">{t("patientAccount.delTitle", lang)}</h2>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed">{t("patientAccount.delDesc", lang)}</p>

          {flash && (
            <div className={`mt-4 rounded-xl px-4 py-3 text-sm ${flash.type === "ok" ? "bg-teal-50 text-teal-800 border border-teal-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              {flash.text}
            </div>
          )}

          {status === "completed" ? (
            <div className="mt-4 rounded-xl px-4 py-3 text-sm bg-emerald-50 text-emerald-800 border border-emerald-200">{t("patientAccount.done", lang)}</div>
          ) : active ? (
            <div className="mt-4 rounded-xl px-4 py-3 text-sm bg-amber-50 text-amber-800 border border-amber-200">{t("patientAccount.pending", lang)}</div>
          ) : (
            <>
              <textarea
                value={reason} onChange={(e) => setReason(e.target.value)}
                rows={2} maxLength={1000} placeholder={t("patientAccount.reasonPh", lang)}
                className="mt-4 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
              <button
                onClick={request} disabled={busy}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition disabled:opacity-40"
              >
                <Trash2 size={16} />
                {busy ? t("patientAccount.btnBusy", lang) : t("patientAccount.btn", lang)}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
