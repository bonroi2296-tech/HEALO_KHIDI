"use client";

/**
 * 환자 계정·개인정보 화면 — 데이터 삭제 요청(GDPR 제17조 / PIPA 파기요청권).
 * 즉시 삭제가 아니라 "요청" 접수 → 관리자가 확인 후 파기·익명화. 6개 언어.
 */

import { useState, useEffect } from "react";
import { ShieldCheck, Trash2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useLang } from "@/lib/i18n/LangContext";

const supabase = createSupabaseBrowserClient();

const T = {
  title: { ko: "계정 · 개인정보", en: "Account & Privacy", ru: "Аккаунт и конфиденциальность", kz: "Аккаунт және құпиялылық", zh: "账户与隐私", ja: "アカウント・プライバシー" },
  delTitle: { ko: "내 데이터 삭제", en: "Delete my data", ru: "Удалить мои данные", kz: "Менің деректерімді жою", zh: "删除我的数据", ja: "私のデータを削除" },
  delDesc: {
    ko: "삭제를 요청하면 담당자가 확인 후 회원님의 개인·의료정보를 파기하거나 익명화합니다. 법령상 보존의무가 있는 기록(예: 진료기록)은 의무 기간이 지난 뒤 파기됩니다.",
    en: "When you request deletion, our team will erase or anonymize your personal and medical data after review. Records we are legally required to keep (e.g. medical records) are deleted after the mandatory period.",
    ru: "После запроса наша команда удалит или анонимизирует ваши персональные и медицинские данные. Записи, которые мы обязаны хранить по закону (например, медицинские), удаляются по истечении обязательного срока.",
    kz: "Сұраныс жасағанда команда сіздің жеке және медициналық деректеріңізді тексеріп, жояды немесе анонимдейді. Заң бойынша сақталуы тиіс жазбалар (мыс. медициналық) міндетті мерзімнен кейін жойылады.",
    zh: "提交请求后，我们将在审核后删除或匿名化您的个人及医疗数据。法律要求保留的记录（如病历）将在法定期限后删除。",
    ja: "削除を申請すると、担当者が確認のうえお客様の個人・医療情報を破棄または匿名化します。法令上保存義務のある記録（例：診療記録）は義務期間の経過後に破棄します。",
  },
  reasonPh: { ko: "사유 (선택)", en: "Reason (optional)", ru: "Причина (необязательно)", kz: "Себебі (міндетті емес)", zh: "原因（选填）", ja: "理由（任意）" },
  btn: { ko: "데이터 삭제 요청", en: "Request data deletion", ru: "Запросить удаление данных", kz: "Деректерді жоюды сұрау", zh: "申请删除数据", ja: "データ削除を申請" },
  btnBusy: { ko: "요청 중…", en: "Submitting…", ru: "Отправка…", kz: "Жіберілуде…", zh: "提交中…", ja: "送信中…" },
  confirm: { ko: "정말 데이터 삭제를 요청할까요?", en: "Request deletion of your data?", ru: "Запросить удаление ваших данных?", kz: "Деректеріңізді жоюды сұрайсыз ба?", zh: "确定要申请删除数据吗？", ja: "データ削除を申請しますか？" },
  pending: { ko: "삭제 요청이 접수되었습니다. 처리될 때까지 기다려 주세요.", en: "Your deletion request has been received. Please wait for processing.", ru: "Запрос на удаление принят. Пожалуйста, ожидайте обработки.", kz: "Жою сұранысы қабылданды. Өңделуін күтіңіз.", zh: "删除请求已受理，请等待处理。", ja: "削除リクエストを受け付けました。処理をお待ちください。" },
  done: { ko: "삭제가 완료되었습니다.", en: "Your data has been deleted.", ru: "Ваши данные удалены.", kz: "Деректеріңіз жойылды.", zh: "您的数据已删除。", ja: "データの削除が完了しました。" },
  err: { ko: "요청에 실패했습니다. 잠시 후 다시 시도해 주세요.", en: "Request failed. Please try again later.", ru: "Не удалось отправить. Повторите позже.", kz: "Сұраныс сәтсіз. Кейінірек қайталаңыз.", zh: "请求失败，请稍后重试。", ja: "送信に失敗しました。後ほど再度お試しください。" },
  loginReq: { ko: "로그인이 필요합니다.", en: "Please sign in.", ru: "Войдите в систему.", kz: "Жүйеге кіріңіз.", zh: "请先登录。", ja: "ログインしてください。" },
  loginLink: { ko: "로그인", en: "Sign in", ru: "Войти", kz: "Кіру", zh: "登录", ja: "ログイン" },
  loading: { ko: "불러오는 중…", en: "Loading…", ru: "Загрузка…", kz: "Жүктелуде…", zh: "加载中…", ja: "読み込み中…" },
};

export default function AccountClient() {
  const lang = useLang();
  const l = (o) => o?.[lang] || o?.en || "";

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
      const t = await getToken();
      if (!t) { setAuth(false); setLoading(false); return; }
      const res = await fetch("/api/patient/account/deletion-request", {
        headers: { Authorization: `Bearer ${t}` }, cache: "no-store",
      });
      const j = await res.json();
      if (j.ok) setStatus(j.request?.status || null);
    } catch { /* noop */ } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const request = async () => {
    if (!window.confirm(l(T.confirm))) return;
    setBusy(true); setFlash(null);
    try {
      const t = await getToken();
      if (!t) { setAuth(false); return; }
      const res = await fetch("/api/patient/account/deletion-request", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      const j = await res.json();
      if (j.ok) { setStatus(j.status || "pending"); setFlash({ type: "ok", text: l(T.pending) }); }
      else setFlash({ type: "err", text: l(T.err) });
    } catch {
      setFlash({ type: "err", text: l(T.err) });
    } finally { setBusy(false); }
  };

  const active = status === "pending" || status === "processing";

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <ShieldCheck size={22} className="text-teal-700" />
        <h1 className="text-xl font-bold text-gray-900">{l(T.title)}</h1>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">{l(T.loading)}</p>
      ) : !auth ? (
        <p className="text-sm text-gray-600">
          {l(T.loginReq)} <a className="text-teal-700 underline ml-1" href="/login">{l(T.loginLink)}</a>
        </p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 md:p-6">
          <div className="flex items-center gap-2 mb-2">
            <Trash2 size={18} className="text-gray-500" />
            <h2 className="text-base font-bold text-gray-900">{l(T.delTitle)}</h2>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed">{l(T.delDesc)}</p>

          {flash && (
            <div className={`mt-4 rounded-xl px-4 py-3 text-sm ${flash.type === "ok" ? "bg-teal-50 text-teal-800 border border-teal-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              {flash.text}
            </div>
          )}

          {status === "completed" ? (
            <div className="mt-4 rounded-xl px-4 py-3 text-sm bg-emerald-50 text-emerald-800 border border-emerald-200">{l(T.done)}</div>
          ) : active ? (
            <div className="mt-4 rounded-xl px-4 py-3 text-sm bg-amber-50 text-amber-800 border border-amber-200">{l(T.pending)}</div>
          ) : (
            <>
              <textarea
                value={reason} onChange={(e) => setReason(e.target.value)}
                rows={2} maxLength={1000} placeholder={l(T.reasonPh)}
                className="mt-4 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
              <button
                onClick={request} disabled={busy}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition disabled:opacity-40"
              >
                <Trash2 size={16} />
                {busy ? l(T.btnBusy) : l(T.btn)}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
