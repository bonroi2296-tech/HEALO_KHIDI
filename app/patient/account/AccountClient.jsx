"use client";

/**
 * 환자 계정·개인정보 화면 — **계정 탈퇴**(GDPR 제17조 / PIPA 파기요청권 / 애플 5.1.1(v)).
 *
 * ⚠️ 2026-08-20 이전에는 여기가 「데이터 삭제 요청」이었다. 눌러도 표에 요청 한 줄이 쌓일 뿐,
 *    관리자가 「완료」를 눌러도 상태 글자만 바뀌고 **계정을 지우는 코드가 0줄**이었다.
 *    이름은 있는데 동작이 없었던 것이다(PO 지적). 지금은 누르면 그 자리에서 계정이 지워진다.
 *
 * 실수 클릭을 막는 관문: **본인 이메일을 직접 쳐야** 버튼이 살아난다.
 * (브라우저 기본 «확인» 대화상자는 안 쓴다 — 앱 웹뷰에서 안 뜨는 환경이 있고,
 *  이메일을 통째로 치는 쪽이 어차피 더 센 관문이다. 2026-08-20 실측으로 제거.)
 * 되돌릴 수 없으므로 이 관문을 느슨하게 만들지 마라.
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
  const [email, setEmail] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(null);
  const [done, setDone] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) { setAuth(false); return; }
      setEmail(data.user.email || "");
    } catch { setAuth(false); } finally { setLoading(false); }
  };

  // 처음 한 번만 부른다(로그인한 사람의 이메일을 읽어 확인칸에 쓴다).
  useEffect(() => { load(); }, []);

  // 친 글자가 본인 이메일과 같아야 버튼이 살아난다(대소문자·앞뒤 공백만 눈감아 준다).
  const canDelete = !!email && confirmText.trim().toLowerCase() === email.trim().toLowerCase();

  const removeAccount = async () => {
    if (!canDelete) return;
    setBusy(true); setFlash(null);
    try {
      // 세션은 쿠키로 간다(서버가 쿠키만 읽는다). 같은 출처라 fetch 가 알아서 실어 보낸다.
      const res = await fetch("/api/patient/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: confirmText.trim() }),
      });
      if (res.status === 401) { setAuth(false); return; }
      const j = await res.json();
      if (j.ok) {
        setDone(true);
        // 계정이 사라졌으니 이 기기의 로그인 흔적도 지운다. 안 지우면 「지워진 계정」으로
        // 화면을 돌아다니다 곳곳에서 권한 오류가 난다.
        try { await supabase.auth.signOut(); } catch { /* 이미 끊겼으면 무시 */ }
        setTimeout(() => { window.location.assign("/"); }, 4000);
      } else if (j.error === "privileged_account") {
        setFlash({ type: "err", text: t("patientAccount.errPrivileged", lang) });
      } else {
        setFlash({ type: "err", text: t("patientAccount.err", lang) });
      }
    } catch {
      setFlash({ type: "err", text: t("patientAccount.err", lang) });
    } finally { setBusy(false); }
  };

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
      ) : done ? (
        <div className="rounded-2xl px-5 py-6 text-sm bg-emerald-50 text-emerald-800 border border-emerald-200">
          {t("patientAccount.done", lang)}
        </div>
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

          <label className="mt-5 block text-sm font-medium text-gray-700">
            {t("patientAccount.confirmLabel", lang)}
          </label>
          <p className="mt-1 text-sm text-gray-500 break-all">{email}</p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            placeholder={email}
            aria-label={t("patientAccount.confirmLabel", lang)}
            className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />

          <button
            onClick={removeAccount}
            disabled={busy || !canDelete}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 size={16} />
            {busy ? t("patientAccount.btnBusy", lang) : t("patientAccount.btn", lang)}
          </button>
        </div>
      )}
    </div>
  );
}
