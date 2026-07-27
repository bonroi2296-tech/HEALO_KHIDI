"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useToast } from "@/components/Toast";
import { useBackofficeLang } from "@/lib/i18n/coordinator";

const supabase = createSupabaseBrowserClient();

// 스태프 백오피스 6개 언어화(2026-07-09 PO 결정 — 예외 없이 전체 다국어 전환).
const TR = {
  ko: {
    pageTitle: "회원(환자) 관리",
    pageDesc: "가입 환자 목록과 상담 이력입니다. 삭제 대신 비활성화(소프트)만 가능 — 계정·기록은 보존됩니다.",
    searchPh: "이메일·이름 검색", loadingText: "불러오는 중…", emptyPatients: "표시할 환자가 없습니다.",
    countryUnknown: "국적 미상", joinedPrefix: "가입", consultationCountPrefix: "상담", statusDisabled: "비활성",
    lblCountry: "국적", lblPrefLang: "선호 언어", lblJoinedAt: "가입일", lblLastLogin: "최근 로그인",
    consultHistoryTpl: "상담 이력 ({n})", noConsultRecords: "상담 기록이 없습니다.",
    pastInquiriesTpl: "과거 문의 ({n})", noInquiries: "이 이메일로 접수된 문의가 없습니다.", inquiryFallback: "문의",
    btnActivate: "활성화", btnDeactivate: "비활성화", btnResetPw: "비밀번호 재설정", btnClose: "닫기",
    loadFail: "불러오기 실패", toastFailPrefix: "실패: ",
    confirmBanTpl: "{email} 계정을 비활성화할까요?\n(로그인 차단 — 계정·상담기록은 보존, 언제든 복구 가능)",
    toastDeactivated: "비활성화됨", toastActivated: "활성화됨",
    promptResetPwTpl: "{email} 새 임시 비밀번호 (최소 6자):", errMinChars: "최소 6자",
    toastResetDoneTpl: "비밀번호 재설정 완료 — 환자에게 전달: {pw}",
    sessionTypePre: "사전 상담", sessionTypeFollow: "사후 관리", sessionTypeSecond: "세컨드 오피니언", sessionTypePartner: "파트너 미팅(에이전시·병원)",
  },
  en: {
    pageTitle: "Members (Patients)",
    pageDesc: "List of registered patients and their consultation history. Only deactivation (soft) is available instead of deletion — accounts and records are preserved.",
    searchPh: "Search email / name", loadingText: "Loading…", emptyPatients: "No patients to show.",
    countryUnknown: "Country unknown", joinedPrefix: "Joined", consultationCountPrefix: "Consults", statusDisabled: "Disabled",
    lblCountry: "Country", lblPrefLang: "Preferred language", lblJoinedAt: "Joined", lblLastLogin: "Last login",
    consultHistoryTpl: "Consultation history ({n})", noConsultRecords: "No consultation records.",
    pastInquiriesTpl: "Past inquiries ({n})", noInquiries: "No inquiries filed under this email.", inquiryFallback: "Inquiry",
    btnActivate: "Activate", btnDeactivate: "Deactivate", btnResetPw: "Reset password", btnClose: "Close",
    loadFail: "Failed to load", toastFailPrefix: "Failed: ",
    confirmBanTpl: "Deactivate the account {email}?\n(Blocks login — account and consultation records are preserved, can be restored anytime)",
    toastDeactivated: "Deactivated", toastActivated: "Activated",
    promptResetPwTpl: "New temporary password for {email} (min 6 characters):", errMinChars: "Minimum 6 characters",
    toastResetDoneTpl: "Password reset complete — share with the patient: {pw}",
    sessionTypePre: "Pre-consultation", sessionTypeFollow: "Follow-up", sessionTypeSecond: "Second opinion", sessionTypePartner: "Partner meeting (agency/hospital)",
  },
  ru: {
    pageTitle: "Участники (пациенты)",
    pageDesc: "Список зарегистрированных пациентов и история консультаций. Вместо удаления доступна только деактивация (мягкая) — аккаунт и записи сохраняются.",
    searchPh: "Поиск по email / имени", loadingText: "Загрузка…", emptyPatients: "Нет пациентов для показа.",
    countryUnknown: "Страна неизвестна", joinedPrefix: "Регистрация", consultationCountPrefix: "Консультации", statusDisabled: "Отключён",
    lblCountry: "Страна", lblPrefLang: "Предпочитаемый язык", lblJoinedAt: "Дата регистрации", lblLastLogin: "Последний вход",
    consultHistoryTpl: "История консультаций ({n})", noConsultRecords: "Нет записей о консультациях.",
    pastInquiriesTpl: "Прошлые заявки ({n})", noInquiries: "Заявок с этим email не найдено.", inquiryFallback: "Заявка",
    btnActivate: "Активировать", btnDeactivate: "Деактивировать", btnResetPw: "Сбросить пароль", btnClose: "Закрыть",
    loadFail: "Не удалось загрузить", toastFailPrefix: "Ошибка: ",
    confirmBanTpl: "Деактивировать аккаунт {email}?\n(Блокирует вход — аккаунт и записи о консультациях сохраняются, можно восстановить в любой момент)",
    toastDeactivated: "Деактивирован", toastActivated: "Активирован",
    promptResetPwTpl: "Новый временный пароль для {email} (минимум 6 символов):", errMinChars: "Минимум 6 символов",
    toastResetDoneTpl: "Пароль сброшен — передайте пациенту: {pw}",
    sessionTypePre: "Предварительная консультация", sessionTypeFollow: "Последующее наблюдение", sessionTypeSecond: "Второе мнение", sessionTypePartner: "Встреча с партнёром (агентство/больница)",
  },
  kz: {
    pageTitle: "Мүшелер (науқастар)",
    pageDesc: "Тіркелген науқастар тізімі және кеңес тарихы. Жоюдың орнына тек өшіру (жұмсақ) қолжетімді — аккаунт пен жазбалар сақталады.",
    searchPh: "Email / атын іздеу", loadingText: "Жүктелуде…", emptyPatients: "Көрсетуге науқас жоқ.",
    countryUnknown: "Ел белгісіз", joinedPrefix: "Тіркелген", consultationCountPrefix: "Кеңестер", statusDisabled: "Өшірулі",
    lblCountry: "Ел", lblPrefLang: "Қалаған тіл", lblJoinedAt: "Тіркелген күні", lblLastLogin: "Соңғы кіру",
    consultHistoryTpl: "Кеңес тарихы ({n})", noConsultRecords: "Кеңес жазбалары жоқ.",
    pastInquiriesTpl: "Бұрынғы өтінімдер ({n})", noInquiries: "Бұл email бойынша өтінім жоқ.", inquiryFallback: "Өтінім",
    btnActivate: "Белсендіру", btnDeactivate: "Өшіру", btnResetPw: "Құпия сөзді қалпына келтіру", btnClose: "Жабу",
    loadFail: "Жүктеу сәтсіз", toastFailPrefix: "Қате: ",
    confirmBanTpl: "{email} аккаунты өшірілсін бе?\n(Кіруге тыйым салады — аккаунт пен кеңес жазбалары сақталады, кез келген уақытта қалпына келтіруге болады)",
    toastDeactivated: "Өшірілді", toastActivated: "Белсендірілді",
    promptResetPwTpl: "{email} үшін жаңа уақытша құпия сөз (кемінде 6 таңба):", errMinChars: "Кемінде 6 таңба",
    toastResetDoneTpl: "Құпия сөз қалпына келтірілді — науқасқа беріңіз: {pw}",
    sessionTypePre: "Алдын ала кеңес", sessionTypeFollow: "Емнен кейінгі бақылау", sessionTypeSecond: "Екінші пікір", sessionTypePartner: "Серіктеспен кездесу (агенттік/аурухана)",
  },
  zh: {
    pageTitle: "会员（患者）管理",
    pageDesc: "已注册患者列表及会诊记录。不支持删除，仅可停用（软删除）— 账户与记录将被保留。",
    searchPh: "搜索邮箱 / 姓名", loadingText: "加载中…", emptyPatients: "没有可显示的患者。",
    countryUnknown: "国籍未知", joinedPrefix: "注册", consultationCountPrefix: "会诊", statusDisabled: "已停用",
    lblCountry: "国籍", lblPrefLang: "首选语言", lblJoinedAt: "注册日期", lblLastLogin: "最近登录",
    consultHistoryTpl: "会诊记录（{n}）", noConsultRecords: "暂无会诊记录。",
    pastInquiriesTpl: "历史咨询（{n}）", noInquiries: "该邮箱下没有咨询记录。", inquiryFallback: "咨询",
    btnActivate: "启用", btnDeactivate: "停用", btnResetPw: "重置密码", btnClose: "关闭",
    loadFail: "加载失败", toastFailPrefix: "失败：",
    confirmBanTpl: "确定停用账户 {email} 吗？\n（将阻止登录 — 账户与会诊记录会保留，可随时恢复）",
    toastDeactivated: "已停用", toastActivated: "已启用",
    promptResetPwTpl: "{email} 的新临时密码（至少6位）：", errMinChars: "至少6位",
    toastResetDoneTpl: "密码重置完成 — 请转告患者：{pw}",
    sessionTypePre: "术前咨询", sessionTypeFollow: "术后随访", sessionTypeSecond: "第二诊疗意见", sessionTypePartner: "合作方会议（代理机构/医院）",
  },
  ja: {
    pageTitle: "会員（患者）管理",
    pageDesc: "登録患者の一覧と相談履歴です。削除の代わりに無効化（ソフト）のみ可能 — アカウント・記録は保持されます。",
    searchPh: "メール・氏名で検索", loadingText: "読み込み中…", emptyPatients: "表示する患者がいません。",
    countryUnknown: "国籍不明", joinedPrefix: "登録", consultationCountPrefix: "相談", statusDisabled: "無効",
    lblCountry: "国籍", lblPrefLang: "希望言語", lblJoinedAt: "登録日", lblLastLogin: "最終ログイン",
    consultHistoryTpl: "相談履歴（{n}）", noConsultRecords: "相談記録がありません。",
    pastInquiriesTpl: "過去の問い合わせ（{n}）", noInquiries: "このメールでの問い合わせはありません。", inquiryFallback: "問い合わせ",
    btnActivate: "有効化", btnDeactivate: "無効化", btnResetPw: "パスワード再設定", btnClose: "閉じる",
    loadFail: "読み込み失敗", toastFailPrefix: "失敗: ",
    confirmBanTpl: "{email} アカウントを無効化しますか？\n（ログインをブロック — アカウント・相談記録は保持され、いつでも復元可能）",
    toastDeactivated: "無効化しました", toastActivated: "有効化しました",
    promptResetPwTpl: "{email} の新しい仮パスワード（最低6文字）:", errMinChars: "最低6文字",
    toastResetDoneTpl: "パスワード再設定完了 — 患者に伝えてください: {pw}",
    sessionTypePre: "事前相談", sessionTypeFollow: "術後フォローアップ", sessionTypeSecond: "セカンドオピニオン", sessionTypePartner: "パートナー会議（代理店・病院）",
  },
};

const SESSION_TYPE_KEY = {
  pre_consultation: "sessionTypePre",
  follow_up: "sessionTypeFollow",
  second_opinion: "sessionTypeSecond",
  // 없으면 화면에 raw 코드("partner_meeting")가 그대로 새어 나온다(표시부가 코드로 폴백).
  partner_meeting: "sessionTypePartner",
};

const LOCALE_MAP = { ko: "ko-KR", en: "en-US", ru: "ru-RU", kz: "kk-KZ", zh: "zh-CN", ja: "ja-JP" };
function fmtDate(d, lang) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString(LOCALE_MAP[lang] || "en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "-";
  }
}

export default function AdminUsersPage() {
  const toast = useToast();
  const lang = useBackofficeLang();
  const tt = (k) => (TR[lang] || TR.en)[k] ?? TR.en[k];
  const fmt = (tpl, vals) => Object.entries(vals).reduce((s, [k, v]) => s.replace(`{${k}}`, v), tpl);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState(null); // { user, consultations }
  const [detailLoading, setDetailLoading] = useState(false);

  async function authHeaders() {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", { headers: await authHeaders() });
      const result = await res.json();
      if (result.ok) setPatients(result.patients || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function openDetail(id) {
    setDetailLoading(true);
    setDetail({ loading: true });
    try {
      const res = await fetch(`/api/admin/users?userId=${encodeURIComponent(id)}`, { headers: await authHeaders() });
      const result = await res.json();
      if (result.ok) setDetail({ user: result.user, consultations: result.consultations, inquiries: result.inquiries || [] });
      else { toast.error(tt("loadFail")); setDetail(null); }
    } catch {
      toast.error(tt("loadFail"));
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function patch(userId, action, extra = {}) {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ userId, action, ...extra }),
    });
    const result = await res.json();
    if (!res.ok || !result.ok) {
      toast.error(`${tt("toastFailPrefix")}${result.error || "unknown"}`);
      return false;
    }
    return true;
  }

  async function handleBan(user) {
    const ban = !user.banned;
    if (ban && !confirm(fmt(tt("confirmBanTpl"), { email: user.email }))) return;
    if (await patch(user.id, ban ? "ban" : "unban")) {
      toast.success(ban ? tt("toastDeactivated") : tt("toastActivated"));
      setDetail((d) => (d?.user ? { ...d, user: { ...d.user, banned: ban } } : d));
      load();
    }
  }

  async function handleResetPw(user) {
    // 기본값을 잘 알려진 약한 비번(healo1234) 대신 계정마다 무작위 강한 임시비번으로 — staff(PR #85)와 동일 원칙
    const suggested = `Hw${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}!`;
    const pw = prompt(fmt(tt("promptResetPwTpl"), { email: user.email }), suggested);
    if (!pw) return;
    if (pw.length < 6) { toast.error(tt("errMinChars")); return; }
    if (await patch(user.id, "reset_password", { password: pw })) {
      toast.success(fmt(tt("toastResetDoneTpl"), { pw }));
    }
  }

  const filtered = patients.filter(
    (p) => !search || (p.email || "").toLowerCase().includes(search.toLowerCase()) || (p.full_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{tt("pageTitle")}</h1>
      <p className="text-sm text-gray-500 mb-6">
        {tt("pageDesc")}
      </p>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={tt("searchPh")}
        className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-lg text-sm mb-5 focus:outline-none focus:ring-2 focus:ring-teal-500"
      />

      {loading ? (
        <p className="text-sm text-gray-500">{tt("loadingText")}</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-500">{tt("emptyPatients")}</p>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => openDetail(p.id)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 text-left gap-3"
            >
              <div className="min-w-0">
                <span className="font-semibold text-gray-900 text-sm">{p.full_name || p.email}</span>
                {p.full_name && <span className="text-xs text-gray-500 ml-2">{p.email}</span>}
                <div className="text-xs text-gray-500 mt-0.5">
                  {p.country || tt("countryUnknown")} · {tt("joinedPrefix")} {fmtDate(p.created_at, lang)}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-2.5 py-0.5">
                  {tt("consultationCountPrefix")} {p.consultation_count}
                </span>
                {p.banned && (
                  <span className="text-xs font-semibold text-red-700 bg-red-50 border border-red-100 rounded-full px-2.5 py-0.5">
                    {tt("statusDisabled")}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 상세 모달 */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-auto p-6" onClick={(e) => e.stopPropagation()}>
            {detail.loading || detailLoading ? (
              <p className="text-sm text-gray-500">{tt("loadingText")}</p>
            ) : detail.user ? (
              <>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{detail.user.full_name || detail.user.email}</h2>
                    <p className="text-xs text-gray-500">{detail.user.email}</p>
                  </div>
                  {detail.user.banned && (
                    <span className="text-xs font-bold text-red-700 bg-red-50 border border-red-100 rounded-full px-2.5 py-0.5">{tt("statusDisabled")}</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm mb-5">
                  <div><span className="text-gray-500">{tt("lblCountry")}</span><div className="font-medium text-gray-900">{detail.user.country || "-"}</div></div>
                  <div><span className="text-gray-500">{tt("lblPrefLang")}</span><div className="font-medium text-gray-900">{detail.user.language || "-"}</div></div>
                  <div><span className="text-gray-500">{tt("lblJoinedAt")}</span><div className="font-medium text-gray-900">{fmtDate(detail.user.created_at, lang)}</div></div>
                  <div><span className="text-gray-500">{tt("lblLastLogin")}</span><div className="font-medium text-gray-900">{fmtDate(detail.user.last_sign_in_at, lang)}</div></div>
                </div>

                <h3 className="text-sm font-bold text-gray-900 mb-2">{fmt(tt("consultHistoryTpl"), { n: detail.consultations.length })}</h3>
                {detail.consultations.length === 0 ? (
                  <p className="text-sm text-gray-500 mb-5">{tt("noConsultRecords")}</p>
                ) : (
                  <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 mb-5">
                    {detail.consultations.map((c) => (
                      <div key={c.id} className="px-3 py-2 flex items-center justify-between text-sm">
                        <div>
                          <span className="font-medium text-gray-900">{SESSION_TYPE_KEY[c.session_type] ? tt(SESSION_TYPE_KEY[c.session_type]) : c.session_type}</span>
                          <span className="text-xs text-gray-500 ml-2">{fmtDate(c.scheduled_at, lang)}</span>
                        </div>
                        <span className="text-xs text-gray-500">{c.status}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 가입 전 게스트 문의 — 이메일로 매칭 (동일인 통합) */}
                <h3 className="text-sm font-bold text-gray-900 mb-2">{fmt(tt("pastInquiriesTpl"), { n: (detail.inquiries || []).length })}</h3>
                {(detail.inquiries || []).length === 0 ? (
                  <p className="text-sm text-gray-500 mb-5">{tt("noInquiries")}</p>
                ) : (
                  <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 mb-5">
                    {detail.inquiries.map((q) => (
                      <div key={q.id} className="px-3 py-2 flex items-center justify-between text-sm">
                        <div className="min-w-0">
                          <span className="font-medium text-gray-900">{q.cancer_type || q.treatment_type || tt("inquiryFallback")}</span>
                          {q.nationality && <span className="text-xs text-gray-500 ml-2">{q.nationality}</span>}
                          <span className="text-xs text-gray-500 ml-2">{fmtDate(q.created_at, lang)}</span>
                        </div>
                        {q.status && <span className="text-xs text-gray-500 shrink-0">{q.status}</span>}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                  <button onClick={() => handleBan(detail.user)} className={`px-4 py-2 rounded-lg text-sm font-bold ${detail.user.banned ? "bg-teal-700 hover:bg-teal-800 text-white" : "bg-red-50 hover:bg-red-100 text-red-700 border border-red-200"}`}>
                    {detail.user.banned ? tt("btnActivate") : tt("btnDeactivate")}
                  </button>
                  <button onClick={() => handleResetPw(detail.user)} className="px-4 py-2 rounded-lg text-sm font-bold text-gray-600 border border-gray-300 hover:bg-gray-50">
                    {tt("btnResetPw")}
                  </button>
                  <button onClick={() => setDetail(null)} className="px-4 py-2 rounded-lg text-sm font-bold text-gray-500 ml-auto">{tt("btnClose")}</button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
