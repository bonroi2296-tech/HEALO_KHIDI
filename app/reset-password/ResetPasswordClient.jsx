"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useToast } from "@/components/Toast";
import { useLang } from "@/lib/i18n/LangContext";

const supabase = createSupabaseBrowserClient();

// 비밀번호 규칙 — 가입폼(SignupClient)과 동일 (8자 + 영문자 + 특수문자)
// SPECIAL_RE는 Supabase 서버 정책의 특수문자 그룹과 동일하게 유지.
const SPECIAL_RE = /[!@#$%^&*()_=+{};,.?~|<>[\]/-]/;
function validatePassword(pw) {
  if (pw.length < 8) return { valid: false, msg: "min8" };
  if (!/[a-zA-Z]/.test(pw)) return { valid: false, msg: "letter" };
  if (!SPECIAL_RE.test(pw)) return { valid: false, msg: "special" };
  return { valid: true, msg: "ok" };
}

// 활성 6개 언어(ko·en·ru·kz·zh·ja) 인라인 — 기능 문구만 (공용 i18n 미수정)
const L = {
  title: { ko: "비밀번호 재설정", en: "Reset password", ru: "Сброс пароля", kz: "Құпиясөзді қалпына келтіру", zh: "重置密码", ja: "パスワードの再設定" },
  subtitle: { ko: "새 비밀번호를 입력하세요", en: "Enter your new password", ru: "Введите новый пароль", kz: "Жаңа құпиясөзді енгізіңіз", zh: "请输入新密码", ja: "新しいパスワードを入力してください" },
  newPassword: { ko: "새 비밀번호", en: "New password", ru: "Новый пароль", kz: "Жаңа құпиясөз", zh: "新密码", ja: "新しいパスワード" },
  confirm: { ko: "비밀번호 확인", en: "Confirm password", ru: "Подтвердите пароль", kz: "Құпиясөзді растау", zh: "确认密码", ja: "パスワードの確認" },
  submit: { ko: "비밀번호 변경", en: "Update password", ru: "Сменить пароль", kz: "Құпиясөзді өзгерту", zh: "修改密码", ja: "パスワードを変更" },
  updating: { ko: "변경 중...", en: "Updating...", ru: "Изменение...", kz: "Өзгертілуде...", zh: "修改中...", ja: "変更中..." },
  success: { ko: "비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.", en: "Password updated. Please log in with your new password.", ru: "Пароль изменён. Войдите с новым паролем.", kz: "Құпиясөз өзгертілді. Жаңа құпиясөзбен кіріңіз.", zh: "密码已修改，请使用新密码登录。", ja: "パスワードを変更しました。新しいパスワードでログインしてください。" },
  updateFailed: { ko: "비밀번호 변경 실패", en: "Failed to update password", ru: "Не удалось изменить пароль", kz: "Құпиясөзді өзгерту сәтсіз", zh: "修改密码失败", ja: "パスワードの変更に失敗しました" },
  mismatch: { ko: "비밀번호가 일치하지 않습니다", en: "Passwords do not match", ru: "Пароли не совпадают", kz: "Құпиясөздер сәйкес келмейді", zh: "两次密码不一致", ja: "パスワードが一致しません" },
  checking: { ko: "링크 확인 중...", en: "Verifying link...", ru: "Проверка ссылки...", kz: "Сілтемені тексеру...", zh: "正在验证链接...", ja: "リンクを確認中..." },
  invalidLink: { ko: "이 링크가 만료되었거나 유효하지 않습니다. 로그인 화면에서 '비밀번호 찾기'를 다시 시도해주세요.", en: "This link is invalid or has expired. Please request a new password reset from the login page.", ru: "Ссылка недействительна или истекла. Запросите сброс пароля заново на странице входа.", kz: "Сілтеме жарамсыз немесе мерзімі өтті. Кіру бетінен қайта сұраңыз.", zh: "链接无效或已过期，请在登录页重新申请重置密码。", ja: "リンクが無効か期限切れです。ログイン画面から再度お試しください。" },
  goLogin: { ko: "로그인으로 이동", en: "Go to login", ru: "Перейти ко входу", kz: "Кіруге өту", zh: "前往登录", ja: "ログインへ" },
};
const PW_ERROR = {
  min8: { ko: "비밀번호는 최소 8자 이상이어야 합니다", en: "Password must be at least 8 characters", ru: "Пароль должен содержать не менее 8 символов", kz: "Құпиясөз кемінде 8 таңбадан тұруы керек", zh: "密码至少需要8个字符", ja: "パスワードは8文字以上である必要があります" },
  letter: { ko: "영문자를 포함해야 합니다", en: "Must include a letter", ru: "Должен содержать букву", kz: "Әріп болуы керек", zh: "必须包含一个字母", ja: "英字を含める必要があります" },
  special: { ko: "특수문자를 포함해야 합니다 (예: !@#$)", en: "Must include a special character (e.g. !@#$)", ru: "Должен содержать спецсимвол (напр. !@#$)", kz: "Арнайы таңба болуы керек (мыс. !@#$)", zh: "必须包含一个特殊字符（如 !@#$）", ja: "特殊文字を含める必要があります（例: !@#$）" },
};
const pick = (dict, lc) => dict[lc] || dict.en;

export default function ResetPasswordClient() {
  const toast = useToast();
  const router = useRouter();
  const langCode = useLang();

  // checking: 링크의 복구 세션 확인 중 | ready: 입력 가능 | invalid: 만료/무효
  const [status, setStatus] = useState("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  // 메일 링크로 들어오면 @supabase/ssr이 URL의 복구 토큰을 자동 처리한다.
  // 세션이 잡히면 입력 폼을 연다. 일정 시간 내 안 잡히면 만료/무효로 본다.
  useEffect(() => {
    let settled = false;
    const markReady = () => { if (!settled) { settled = true; setStatus("ready"); } };
    const markInvalid = () => { if (!settled) { settled = true; setStatus("invalid"); } };

    // 새 방식: 복구 메일의 token_hash를 클라이언트 JS로 검증(이메일 스캐너 안전).
    const params = new URLSearchParams(window.location.search);
    const token_hash = params.get("token_hash");
    const type = params.get("type");
    if (token_hash && type) {
      supabase.auth.verifyOtp({ type, token_hash }).then(({ error }) => {
        if (error) markInvalid(); else markReady();
      });
      return;
    }

    // 폴백: 이미 세션이 잡힌 경우(implicit/PKCE detectSessionInUrl)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) markReady();
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) markReady();
    });
    const timer = setTimeout(markInvalid, 3500);

    return () => { sub.subscription.unsubscribe(); clearTimeout(timer); };
  }, []);

  const pwCheck = validatePassword(password);

  const handleSubmit = async () => {
    if (!pwCheck.valid) {
      toast.error(pick(PW_ERROR[pwCheck.msg], langCode));
      return;
    }
    if (password !== confirmPassword) {
      toast.error(pick(L.mismatch, langCode));
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(pick(L.updateFailed, langCode) + ": " + error.message);
      setSaving(false);
      return;
    }
    toast.success(pick(L.success, langCode));
    // 복구 세션은 정리하고 새 비번으로 다시 로그인하도록 유도
    await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    router.push("/login");
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50 px-4 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 md:p-10 border border-gray-100">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900">{pick(L.title, langCode)}</h2>
          <p className="text-gray-500 mt-2">{pick(L.subtitle, langCode)}</p>
        </div>

        {status === "checking" && (
          <div className="flex flex-col items-center gap-4 py-10">
            <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500">{pick(L.checking, langCode)}</p>
          </div>
        )}

        {status === "invalid" && (
          <div className="text-center py-6">
            <p className="text-sm text-gray-600 leading-relaxed">{pick(L.invalidLink, langCode)}</p>
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
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 text-gray-400" size={20} />
              <input
                aria-label="New password"
                type={showPassword ? "text" : "password"}
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

            <div className="relative">
              <Lock className="absolute left-4 top-3.5 text-gray-400" size={20} />
              <input
                aria-label="Confirm password"
                type={showPassword ? "text" : "password"}
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
