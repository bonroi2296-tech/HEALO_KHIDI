"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useToast } from "@/components/Toast";
import { useBackofficeLang } from "@/lib/i18n/coordinator";

const supabase = createSupabaseBrowserClient();

// 스태프 백오피스 6개 언어화(2026-07-09 PO 결정 — 예외 없이 전체 다국어 전환).
const TR = {
  ko: {
    roleCoordinator: "코디네이터",
    pageTitle: "직원 계정 관리",
    pageDesc: "코디네이터 계정을 만듭니다. 생성된 계정의 이메일·임시 비밀번호를 해당 직원에게 전달하면 본인이 비밀번호를 바꿉니다.",
    pageDescNote: "(의사는 별도 계정이 없습니다 — 상담방 초대링크로 참여합니다.)",
    lblName: "이름", lblEmail: "이메일 *", lblRole: "역할", lblTempPassword: "임시 비밀번호 (비우면 자동 생성)",
    phName: "예: 김의사", phEmail: "staff@example.com", phPassword: "비우면 자동 생성",
    passwordHint: "직원에게 이메일+이 비번을 전달하면 바로 로그인. 본인이 나중에 변경 가능.",
    btnSubmit: "계정 생성 / 역할 부여", btnSubmitting: "처리 중…",
    credsHeading: "아래 로그인 정보를 이 직원에게 전달하세요",
    lblEmailColon: "이메일:", lblPasswordColon: "비밀번호:", loginColon: "로그인:",
    btnCopyCreds: "로그인 정보 복사", copiedToast: "로그인 정보 복사됨",
    registeredHeading: "등록된 직원", loadingText: "불러오는 중…", emptyStaff: "아직 등록된 코디네이터 계정이 없습니다.",
    statusDisabled: "비활성", btnEdit: "수정", btnDisable: "비활성화", btnEnable: "재활성화",
    confirmDisableTpl: "{name} 을(를) 비활성화할까요?\n(목록엔 '비활성'으로 남고, 상담 배정 드롭다운에서만 제외됩니다. 언제든 재활성화 가능)",
    toastFailPrefix: "실패: ", toastDisabledOn: "비활성화됨", toastDisabledOff: "재활성화됨", toastRequestFail: "요청 실패",
    errEmailRequired: "이메일을 입력하세요", errPasswordShort: "임시 비밀번호는 최소 6자 (비우면 자동 생성)", errPasswordShortServer: "임시 비밀번호는 최소 6자",
    toastCreatedNewTpl: "{role} 계정 생성 완료", toastCreatedExistingTpl: "기존 계정에 {role} 역할 부여 + 비번 재설정",
  },
  en: {
    roleCoordinator: "Coordinator",
    pageTitle: "Staff Accounts",
    pageDesc: "Create coordinator accounts. Once created, share the email and temporary password with the staff member — they'll change the password themselves.",
    pageDescNote: "(Doctors don't have separate accounts — they join via a consultation-room invite link.)",
    lblName: "Name", lblEmail: "Email *", lblRole: "Role", lblTempPassword: "Temporary password (auto-generated if blank)",
    phName: "e.g. Dr. Kim", phEmail: "staff@example.com", phPassword: "Leave blank to auto-generate",
    passwordHint: "Share the email + this password with the staff member for immediate login. They can change it later.",
    btnSubmit: "Create account / assign role", btnSubmitting: "Processing…",
    credsHeading: "Share the login details below with this staff member",
    lblEmailColon: "Email:", lblPasswordColon: "Password:", loginColon: "Login:",
    btnCopyCreds: "Copy login details", copiedToast: "Login details copied",
    registeredHeading: "Registered staff", loadingText: "Loading…", emptyStaff: "No coordinator accounts registered yet.",
    statusDisabled: "Disabled", btnEdit: "Edit", btnDisable: "Disable", btnEnable: "Re-enable",
    confirmDisableTpl: "Disable {name}?\n(Stays in the list as 'Disabled' and is only excluded from the consultation-assignment dropdown. Can be re-enabled anytime.)",
    toastFailPrefix: "Failed: ", toastDisabledOn: "Disabled", toastDisabledOff: "Re-enabled", toastRequestFail: "Request failed",
    errEmailRequired: "Please enter an email", errPasswordShort: "Temporary password must be at least 6 characters (leave blank to auto-generate)", errPasswordShortServer: "Temporary password must be at least 6 characters",
    toastCreatedNewTpl: "{role} account created", toastCreatedExistingTpl: "{role} role assigned to existing account + password reset",
  },
  ru: {
    roleCoordinator: "Координатор",
    pageTitle: "Учётные записи сотрудников",
    pageDesc: "Создайте учётную запись координатора. После создания передайте email и временный пароль сотруднику — он сам сменит пароль.",
    pageDescNote: "(У врачей нет отдельных учётных записей — они присоединяются по ссылке-приглашению в комнату консультации.)",
    lblName: "Имя", lblEmail: "Email *", lblRole: "Роль", lblTempPassword: "Временный пароль (создаётся автоматически, если пусто)",
    phName: "напр. Д-р Ким", phEmail: "staff@example.com", phPassword: "Оставьте пустым для автогенерации",
    passwordHint: "Передайте email + этот пароль сотруднику для входа. Пароль можно сменить позже.",
    btnSubmit: "Создать аккаунт / назначить роль", btnSubmitting: "Обработка…",
    credsHeading: "Передайте эти данные для входа сотруднику",
    lblEmailColon: "Email:", lblPasswordColon: "Пароль:", loginColon: "Вход:",
    btnCopyCreds: "Скопировать данные для входа", copiedToast: "Данные для входа скопированы",
    registeredHeading: "Зарегистрированные сотрудники", loadingText: "Загрузка…", emptyStaff: "Пока нет зарегистрированных координаторов.",
    statusDisabled: "Отключён", btnEdit: "Изменить", btnDisable: "Отключить", btnEnable: "Включить",
    confirmDisableTpl: "Отключить {name}?\n(Останется в списке как «Отключён» и будет исключён только из выпадающего списка назначения консультаций. Можно включить снова в любой момент)",
    toastFailPrefix: "Ошибка: ", toastDisabledOn: "Отключён", toastDisabledOff: "Включён", toastRequestFail: "Запрос не выполнен",
    errEmailRequired: "Введите email", errPasswordShort: "Временный пароль — минимум 6 символов (оставьте пустым для автогенерации)", errPasswordShortServer: "Временный пароль — минимум 6 символов",
    toastCreatedNewTpl: "Аккаунт «{role}» создан", toastCreatedExistingTpl: "Роль «{role}» назначена существующему аккаунту + пароль сброшен",
  },
  kz: {
    roleCoordinator: "Үйлестіруші",
    pageTitle: "Қызметкер аккаунттары",
    pageDesc: "Үйлестіруші аккаунтын жасаңыз. Жасалғаннан кейін email және уақытша құпия сөзді қызметкерге беріңіз — ол өзі құпия сөзді ауыстырады.",
    pageDescNote: "(Дәрігерлерде бөлек аккаунт жоқ — олар кеңес бөлмесіне шақыру сілтемесі арқылы қосылады.)",
    lblName: "Аты", lblEmail: "Email *", lblRole: "Рөлі", lblTempPassword: "Уақытша құпия сөз (бос болса автоматты жасалады)",
    phName: "мыс. Ким дәрігер", phEmail: "staff@example.com", phPassword: "Автоматты жасау үшін бос қалдырыңыз",
    passwordHint: "Email + осы құпия сөзді қызметкерге беріңіз, бірден кіре алады. Кейін өзгерте алады.",
    btnSubmit: "Аккаунт жасау / рөл беру", btnSubmitting: "Өңделуде…",
    credsHeading: "Төмендегі кіру деректерін осы қызметкерге беріңіз",
    lblEmailColon: "Email:", lblPasswordColon: "Құпия сөз:", loginColon: "Кіру:",
    btnCopyCreds: "Кіру деректерін көшіру", copiedToast: "Кіру деректері көшірілді",
    registeredHeading: "Тіркелген қызметкерлер", loadingText: "Жүктелуде…", emptyStaff: "Әзірге тіркелген үйлестіруші аккаунты жоқ.",
    statusDisabled: "Өшірулі", btnEdit: "Өңдеу", btnDisable: "Өшіру", btnEnable: "Қайта қосу",
    confirmDisableTpl: "{name} өшірілсін бе?\n(Тізімде «Өшірулі» болып қалады, тек кеңес тағайындау ашылмалы тізімінен алынады. Кез келген уақытта қайта қосуға болады)",
    toastFailPrefix: "Қате: ", toastDisabledOn: "Өшірілді", toastDisabledOff: "Қайта қосылды", toastRequestFail: "Сұрау орындалмады",
    errEmailRequired: "Email енгізіңіз", errPasswordShort: "Уақытша құпия сөз кемінде 6 таңба (бос қалдырсаңыз автоматты жасалады)", errPasswordShortServer: "Уақытша құпия сөз кемінде 6 таңба",
    toastCreatedNewTpl: "«{role}» аккаунты жасалды", toastCreatedExistingTpl: "Бар аккаунтқа «{role}» рөлі берілді + құпия сөз қалпына келтірілді",
  },
  zh: {
    roleCoordinator: "协调员",
    pageTitle: "员工账户管理",
    pageDesc: "创建协调员账户。创建后请将邮箱和临时密码转交给该员工，由其本人修改密码。",
    pageDescNote: "（医生没有单独账户 — 通过会诊室邀请链接加入。）",
    lblName: "姓名", lblEmail: "邮箱 *", lblRole: "角色", lblTempPassword: "临时密码（留空则自动生成）",
    phName: "例：金医生", phEmail: "staff@example.com", phPassword: "留空自动生成",
    passwordHint: "将邮箱+此密码交给员工即可立即登录，之后可自行修改。",
    btnSubmit: "创建账户 / 分配角色", btnSubmitting: "处理中…",
    credsHeading: "请将以下登录信息转交给该员工",
    lblEmailColon: "邮箱：", lblPasswordColon: "密码：", loginColon: "登录：",
    btnCopyCreds: "复制登录信息", copiedToast: "登录信息已复制",
    registeredHeading: "已注册员工", loadingText: "加载中…", emptyStaff: "暂无已注册的协调员账户。",
    statusDisabled: "已停用", btnEdit: "编辑", btnDisable: "停用", btnEnable: "重新启用",
    confirmDisableTpl: "确定停用 {name} 吗？\n（将在列表中保留为“已停用”，仅从会诊分配下拉列表中排除，可随时重新启用）",
    toastFailPrefix: "失败：", toastDisabledOn: "已停用", toastDisabledOff: "已重新启用", toastRequestFail: "请求失败",
    errEmailRequired: "请输入邮箱", errPasswordShort: "临时密码至少6位（留空则自动生成）", errPasswordShortServer: "临时密码至少6位",
    toastCreatedNewTpl: "{role}账户创建完成", toastCreatedExistingTpl: "已为现有账户分配{role}角色 + 重置密码",
  },
  ja: {
    roleCoordinator: "コーディネーター",
    pageTitle: "スタッフアカウント管理",
    pageDesc: "コーディネーターアカウントを作成します。作成後、メールと仮パスワードをスタッフに伝えると、本人がパスワードを変更します。",
    pageDescNote: "（医師には個別アカウントがありません — 相談ルームの招待リンクから参加します。）",
    lblName: "氏名", lblEmail: "メール *", lblRole: "役割", lblTempPassword: "仮パスワード（空欄で自動生成）",
    phName: "例：キム医師", phEmail: "staff@example.com", phPassword: "空欄で自動生成",
    passwordHint: "メール+このパスワードをスタッフに伝えるとすぐログインできます。後で変更可能。",
    btnSubmit: "アカウント作成 / 役割付与", btnSubmitting: "処理中…",
    credsHeading: "以下のログイン情報をこのスタッフに伝えてください",
    lblEmailColon: "メール:", lblPasswordColon: "パスワード:", loginColon: "ログイン:",
    btnCopyCreds: "ログイン情報をコピー", copiedToast: "ログイン情報をコピーしました",
    registeredHeading: "登録済みスタッフ", loadingText: "読み込み中…", emptyStaff: "登録済みのコーディネーターアカウントはまだありません。",
    statusDisabled: "無効", btnEdit: "編集", btnDisable: "無効化", btnEnable: "再有効化",
    confirmDisableTpl: "{name} を無効化しますか？\n（一覧には「無効」として残り、相談割り当てのドロップダウンからのみ除外されます。いつでも再有効化できます）",
    toastFailPrefix: "失敗: ", toastDisabledOn: "無効化しました", toastDisabledOff: "再有効化しました", toastRequestFail: "リクエスト失敗",
    errEmailRequired: "メールを入力してください", errPasswordShort: "仮パスワードは最低6文字（空欄で自動生成）", errPasswordShortServer: "仮パスワードは最低6文字",
    toastCreatedNewTpl: "{role}アカウントを作成しました", toastCreatedExistingTpl: "既存アカウントに{role}権限を付与 + パスワードを再設定",
  },
};
const KNOWN_ROLES = new Set(["coordinator"]);

export default function AdminStaffPage() {
  const toast = useToast();
  const lang = useBackofficeLang();
  const tt = (k) => (TR[lang] || TR.en)[k] ?? TR.en[k];
  const fmt = (tpl, vals) => Object.entries(vals).reduce((s, [k, v]) => s.replace(`{${k}}`, v), tpl);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", role: "coordinator", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [lastCreated, setLastCreated] = useState(null);

  async function authHeaders() {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/staff", { headers: await authHeaders() });
      const result = await res.json();
      if (result.ok) setStaff(result.staff || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleToggleDisabled(s) {
    const disabled = !s.disabled;
    if (disabled && !confirm(fmt(tt("confirmDisableTpl"), { name: s.full_name || s.email }))) return;
    try {
      const res = await fetch("/api/admin/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ userId: s.id, disabled }),
      });
      const result = await res.json();
      if (!res.ok || !result.ok) {
        toast.error(`${tt("toastFailPrefix")}${result.error || "unknown"}`);
        return;
      }
      toast.success(disabled ? tt("toastDisabledOn") : tt("toastDisabledOff"));
      load();
    } catch {
      toast.error(tt("toastRequestFail"));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.email.trim()) {
      toast.error(tt("errEmailRequired"));
      return;
    }
    // 비우면 서버가 강한 임시 비번을 자동 생성. 직접 입력 시에만 최소 6자 검증.
    if (form.password.trim() && form.password.trim().length < 6) {
      toast.error(tt("errPasswordShort"));
      return;
    }
    setSubmitting(true);
    setLastCreated(null);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify(form),
      });
      const result = await res.json();
      if (!res.ok || !result.ok) {
        const msg = result.error === "password_too_short" ? tt("errPasswordShortServer") : result.error || "unknown";
        toast.error(`${tt("toastFailPrefix")}${msg}`);
        return;
      }
      toast.success(
        fmt(result.createdNew ? tt("toastCreatedNewTpl") : tt("toastCreatedExistingTpl"), { role: tt("roleCoordinator") })
      );
      setLastCreated({ email: result.loginEmail, password: result.tempPassword });
      setForm({ name: "", email: "", role: "coordinator", password: "" });
      load();
    } catch {
      toast.error(tt("toastRequestFail"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{tt("pageTitle")}</h1>
      <p className="text-sm text-gray-500 mb-8">
        {tt("pageDesc")}
        <br />
        {tt("pageDescNote")}
      </p>

      {/* 생성 폼 */}
      <form onSubmit={handleSubmit} className="border border-gray-200 rounded-xl p-5 md:p-6 mb-8 bg-white">
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">{tt("lblName")}</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={tt("phName")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">{tt("lblEmail")}</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder={tt("phEmail")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">{tt("lblRole")}</label>
            <div className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-700">
              {tt("roleCoordinator")}
            </div>
          </div>
        </div>
        <div className="mt-4 max-w-xs">
          <label className="block text-xs font-semibold text-gray-600 mb-1">{tt("lblTempPassword")}</label>
          <input
            type="text"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder={tt("phPassword")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <p className="text-[11px] text-gray-500 mt-1">{tt("passwordHint")}</p>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="mt-4 px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
        >
          {submitting ? tt("btnSubmitting") : tt("btnSubmit")}
        </button>
      </form>

      {/* 로그인 정보 (생성 직후 표시) — 직원에게 전달 */}
      {lastCreated && (
        <div className="border border-teal-200 bg-teal-50 rounded-xl p-4 mb-8">
          <p className="text-sm font-semibold text-teal-800 mb-3">
            {tt("credsHeading")}
          </p>
          <div className="bg-white border border-teal-200 rounded-lg p-3 font-mono text-sm space-y-1">
            <div>{tt("lblEmailColon")} <span className="font-bold">{lastCreated.email}</span></div>
            <div>{tt("lblPasswordColon")} <span className="font-bold">{lastCreated.password}</span></div>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(`${tt("lblEmailColon")} ${lastCreated.email}\n${tt("lblPasswordColon")} ${lastCreated.password}\n${tt("loginColon")} ${window.location.origin}/login`);
              toast.success(tt("copiedToast"));
            }}
            className="mt-3 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-sm font-bold"
          >
            {tt("btnCopyCreds")}
          </button>
        </div>
      )}

      {/* 직원 목록 */}
      <h2 className="text-lg font-bold text-gray-900 mb-3">{tt("registeredHeading")}</h2>
      {loading ? (
        <p className="text-sm text-gray-500">{tt("loadingText")}</p>
      ) : staff.length === 0 ? (
        <p className="text-sm text-gray-500">{tt("emptyStaff")}</p>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
          {staff.map((s) => (
            <div key={s.id} className={`flex items-center justify-between px-4 py-3 gap-3 ${s.disabled ? "bg-gray-50" : "bg-white"}`}>
              <div className="min-w-0">
                <span className={`font-semibold text-sm ${s.disabled ? "text-gray-500" : "text-gray-900"}`}>
                  {s.full_name || s.email}
                </span>
                {s.full_name && <span className="text-xs text-gray-500 ml-2">{s.email}</span>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-2.5 py-0.5">
                  {KNOWN_ROLES.has(s.role) ? tt("roleCoordinator") : s.role}
                </span>
                {s.disabled && (
                  <span className="text-xs font-bold text-gray-600 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5">{tt("statusDisabled")}</span>
                )}
                <button
                  onClick={() => {
                    setForm({ name: s.full_name || "", email: s.email, role: s.role, password: "" });
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="text-xs font-semibold text-gray-500 hover:text-teal-700 px-2 py-1"
                >
                  {tt("btnEdit")}
                </button>
                <button
                  onClick={() => handleToggleDisabled(s)}
                  className={`text-xs font-semibold px-2 py-1 ${s.disabled ? "text-teal-700 hover:text-teal-700" : "text-red-500 hover:text-red-700"}`}
                >
                  {s.disabled ? tt("btnEnable") : tt("btnDisable")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
