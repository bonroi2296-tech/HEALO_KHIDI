"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, Eye, EyeOff, CheckCircle2, ArrowLeft } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useToast } from "@/components/Toast";
import { useLang } from "@/lib/i18n/LangContext";

const supabase = createSupabaseBrowserClient();

// 비밀번호 규칙 — 가입폼/재설정과 동일 (8자 + 영문자 + 특수문자).
// SPECIAL_RE는 Supabase 서버 정책의 특수문자 그룹과 동일하게 유지.
const SPECIAL_RE = /[!@#$%^&*()_=+{};,.?~|<>[\]/-]/;
function validatePassword(pw) {
  if (pw.length < 8) return { valid: false, msg: "min8" };
  if (!/[a-zA-Z]/.test(pw)) return { valid: false, msg: "letter" };
  if (!SPECIAL_RE.test(pw)) return { valid: false, msg: "special" };
  return { valid: true, msg: "ok" };
}

// 활성 6개 언어(ko·en·ru·kz·zh·ja) 인라인 — 기능 문구만 (공용 i18n 미수정, reset-password와 동일 방식)
const L = {
  title: { ko: "비밀번호 변경", en: "Change password", ru: "Смена пароля", kz: "Құпиясөзді өзгерту", zh: "修改密码", ja: "パスワードの変更" },
  subtitle: { ko: "현재 비밀번호를 확인한 뒤 새 비밀번호로 바꿉니다", en: "Confirm your current password, then set a new one", ru: "Подтвердите текущий пароль и задайте новый", kz: "Ағымдағы құпиясөзді растап, жаңасын енгізіңіз", zh: "确认当前密码后设置新密码", ja: "現在のパスワードを確認して新しいパスワードを設定します" },
  current: { ko: "현재 비밀번호", en: "Current password", ru: "Текущий пароль", kz: "Ағымдағы құпиясөз", zh: "当前密码", ja: "現在のパスワード" },
  newPassword: { ko: "새 비밀번호", en: "New password", ru: "Новый пароль", kz: "Жаңа құпиясөз", zh: "新密码", ja: "新しいパスワード" },
  confirm: { ko: "새 비밀번호 확인", en: "Confirm new password", ru: "Подтвердите новый пароль", kz: "Жаңа құпиясөзді растау", zh: "确认新密码", ja: "新しいパスワードの確認" },
  submit: { ko: "비밀번호 변경", en: "Change password", ru: "Сменить пароль", kz: "Құпиясөзді өзгерту", zh: "修改密码", ja: "パスワードを変更" },
  updating: { ko: "변경 중...", en: "Updating...", ru: "Изменение...", kz: "Өзгертілуде...", zh: "修改中...", ja: "変更中..." },
  success: { ko: "비밀번호가 변경되었습니다.", en: "Password changed.", ru: "Пароль изменён.", kz: "Құпиясөз өзгертілді.", zh: "密码已修改。", ja: "パスワードを変更しました。" },
  wrongCurrent: { ko: "현재 비밀번호가 올바르지 않습니다.", en: "Current password is incorrect.", ru: "Текущий пароль неверный.", kz: "Ағымдағы құпиясөз дұрыс емес.", zh: "当前密码不正确。", ja: "現在のパスワードが正しくありません。" },
  sameAsOld: { ko: "새 비밀번호가 현재 비밀번호와 같습니다.", en: "New password must differ from the current one.", ru: "Новый пароль должен отличаться от текущего.", kz: "Жаңа құпиясөз ағымдағыдан өзгеше болуы керек.", zh: "新密码不能与当前密码相同。", ja: "新しいパスワードは現在のものと異なる必要があります。" },
  updateFailed: { ko: "비밀번호 변경 실패", en: "Failed to change password", ru: "Не удалось изменить пароль", kz: "Құпиясөзді өзгерту сәтсіз", zh: "修改密码失败", ja: "パスワードの変更に失敗しました" },
  mismatch: { ko: "새 비밀번호가 일치하지 않습니다", en: "New passwords do not match", ru: "Новые пароли не совпадают", kz: "Жаңа құпиясөздер сәйкес келмейді", zh: "两次新密码不一致", ja: "新しいパスワードが一致しません" },
  loginRequired: { ko: "로그인이 필요합니다.", en: "Please log in.", ru: "Требуется вход.", kz: "Кіру қажет.", zh: "请先登录。", ja: "ログインが必要です。" },
  goLogin: { ko: "로그인으로 이동", en: "Go to login", ru: "Перейти ко входу", kz: "Кіруге өту", zh: "前往登录", ja: "ログインへ" },
  back: { ko: "돌아가기", en: "Back", ru: "Назад", kz: "Артқа", zh: "返回", ja: "戻る" },
  loading: { ko: "확인 중...", en: "Checking...", ru: "Проверка...", kz: "Тексерілуде...", zh: "确认中...", ja: "確認中..." },
};
const PW_ERROR = {
  min8: { ko: "비밀번호는 최소 8자 이상이어야 합니다", en: "Password must be at least 8 characters", ru: "Пароль должен содержать не менее 8 символов", kz: "Құпиясөз кемінде 8 таңбадан тұруы керек", zh: "密码至少需要8个字符", ja: "パスワードは8文字以上である必要があります" },
  letter: { ko: "영문자를 포함해야 합니다", en: "Must include a letter", ru: "Должен содержать букву", kz: "Әріп болуы керек", zh: "必须包含一个字母", ja: "英字を含める必要があります" },
  special: { ko: "특수문자를 포함해야 합니다 (예: !@#$)", en: "Must include a special character (e.g. !@#$)", ru: "Должен содержать спецсимвол (напр. !@#$)", kz: "Арнайы таңба болуы керек (мыс. !@#$)", zh: "必须包含一个特殊字符（如 !@#$）", ja: "特殊文字を含める必要があります（例: !@#$）" },
};
const pick = (dict, lc) => dict[lc] || dict.en;

export default function ChangePasswordClient() {
  const toast = useToast();
  const router = useRouter();
  const langCode = useLang();

  // checking: 로그인 여부 확인 중 | ready: 폼 | anon: 미로그인
  const [status, setStatus] = useState("checking");
  const [email, setEmail] = useState("");
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!alive) return;
      if (data?.user?.email) {
        setEmail(data.user.email);
        setStatus("ready");
      } else {
        setStatus("anon");
      }
    });
    return () => { alive = false; };
  }, []);

  const pwCheck = validatePassword(password);

  const handleSubmit = async () => {
    if (!current) {
      toast.error(pick(L.current, langCode));
      return;
    }
    if (!pwCheck.valid) {
      toast.error(pick(PW_ERROR[pwCheck.msg], langCode));
      return;
    }
    if (password !== confirmPassword) {
      toast.error(pick(L.mismatch, langCode));
      return;
    }
    if (current === password) {
      toast.error(pick(L.sameAsOld, langCode));
      return;
    }
    setSaving(true);

    // 1) 현재 비밀번호 재확인 — updateUser는 현재 비번을 검증하지 않으므로(세션만 봄),
    //    잠금 안 된 화면을 남이 만졌을 때 비번을 바꿔버리는 걸 막기 위해 재인증한다.
    //    같은 사용자로 재로그인 = 세션이 새 토큰으로 갱신될 뿐, 로그아웃되지 않음.
    const { error: reauthErr } = await supabase.auth.signInWithPassword({
      email,
      password: current,
    });
    if (reauthErr) {
      toast.error(pick(L.wrongCurrent, langCode));
      setSaving(false);
      return;
    }

    // 2) 새 비밀번호로 변경
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(pick(L.updateFailed, langCode) + ": " + error.message);
      setSaving(false);
      return;
    }

    toast.success(pick(L.success, langCode));
    setCurrent(""); setPassword(""); setConfirmPassword("");
    setSaving(false);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50 px-4 py-10 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 md:p-10 border border-gray-100">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ArrowLeft size={16} /> {pick(L.back, langCode)}
        </button>

        <div className="mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900">{pick(L.title, langCode)}</h2>
          <p className="text-gray-500 mt-2 text-sm leading-relaxed">{pick(L.subtitle, langCode)}</p>
        </div>

        {status === "checking" && (
          <div className="flex flex-col items-center gap-4 py-10">
            <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500">{pick(L.loading, langCode)}</p>
          </div>
        )}

        {status === "anon" && (
          <div className="text-center py-6">
            <p className="text-sm text-gray-600 leading-relaxed">{pick(L.loginRequired, langCode)}</p>
            <button
              onClick={() => router.push("/login")}
              className="mt-6 w-full bg-teal-700 text-white font-bold py-3.5 rounded-xl hover:bg-teal-800 transition shadow-lg shadow-teal-100"
            >
              {pick(L.goLogin, langCode)}
            </button>
          </div>
        )}

        {status === "ready" && (
          <div className="space-y-4">
            {email && (
              <p className="text-xs text-gray-400 -mt-2 mb-2 break-all">{email}</p>
            )}

            {/* 현재 비밀번호 */}
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 text-gray-400" size={20} />
              <input
                aria-label="Current password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                placeholder={pick(L.current, langCode)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition text-sm"
              />
            </div>

            <div className="h-px bg-gray-100 my-2" />

            {/* 새 비밀번호 */}
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 text-gray-400" size={20} />
              <input
                aria-label="New password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={pick(L.newPassword, langCode)}
                className="w-full pl-12 pr-12 py-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition text-sm"
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {password && (
              <div className="flex gap-1 px-1 -mt-2">
                {[
                  { ok: password.length >= 8, label: "8+" },
                  { ok: /[a-zA-Z]/.test(password), label: "A-z" },
                  { ok: SPECIAL_RE.test(password), label: "!@#" },
                ].map((r, i) => (
                  <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded ${r.ok ? "bg-teal-100 text-teal-700" : "bg-gray-100 text-gray-400"}`}>{r.label}</span>
                ))}
              </div>
            )}

            {/* 새 비밀번호 확인 */}
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 text-gray-400" size={20} />
              <input
                aria-label="Confirm new password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={pick(L.confirm, langCode)}
                className={`w-full pl-12 pr-4 py-3 rounded-xl border focus:ring-2 outline-none transition text-sm ${
                  confirmPassword && password !== confirmPassword
                    ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                    : "border-gray-200 focus:border-teal-500 focus:ring-teal-100"
                }`}
              />
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-[10px] text-red-500 px-1 -mt-2">{pick(L.mismatch, langCode)}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={saving}
              className={`w-full font-bold py-3.5 rounded-xl transition shadow-lg flex items-center justify-center gap-2 ${
                !saving ? "bg-teal-700 text-white hover:bg-teal-800 shadow-teal-100" : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              {!saving && <CheckCircle2 size={18} />}
              {saving ? pick(L.updating, langCode) : pick(L.submit, langCode)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
