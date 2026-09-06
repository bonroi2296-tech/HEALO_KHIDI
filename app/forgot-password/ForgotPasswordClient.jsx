"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, ArrowLeft, MailCheck } from "lucide-react";
import { useToast } from "@/components/Toast";
import { useLang } from "@/lib/i18n/LangContext";

// 활성 6개 언어(ko·en·ru·kz·zh·ja) 인라인 — 기능 문구만 (공용 i18n 미수정)
const L = {
  title: { ko: "비밀번호 찾기", en: "Forgot password", ru: "Восстановление пароля", kz: "Құпиясөзді ұмыттыңыз ба", zh: "找回密码", ja: "パスワードをお忘れの方" },
  subtitle: { ko: "가입한 이메일로 재설정 링크를 보내드려요", en: "We'll email you a reset link", ru: "Мы отправим ссылку для сброса на вашу почту", kz: "Қалпына келтіру сілтемесін поштаңызға жібереміз", zh: "我们会向您的邮箱发送重置链接", ja: "登録メールに再設定リンクをお送りします" },
  email: { ko: "이메일", en: "Email", ru: "Эл. почта", kz: "Эл. пошта", zh: "邮箱", ja: "メールアドレス" },
  emailPlaceholder: { ko: "가입한 이메일 주소", en: "Your account email", ru: "Эл. почта аккаунта", kz: "Аккаунт эл. поштасы", zh: "您的账号邮箱", ja: "アカウントのメール" },
  submit: { ko: "재설정 메일 보내기", en: "Send reset link", ru: "Отправить ссылку", kz: "Сілтеме жіберу", zh: "发送重置链接", ja: "再設定リンクを送信" },
  sending: { ko: "보내는 중...", en: "Sending...", ru: "Отправка...", kz: "Жіберілуде...", zh: "发送中...", ja: "送信中..." },
  back: { ko: "로그인으로 돌아가기", en: "Back to login", ru: "Назад ко входу", kz: "Кіруге оралу", zh: "返回登录", ja: "ログインに戻る" },
  needEmail: { ko: "이메일을 입력해주세요", en: "Please enter your email", ru: "Введите эл. почту", kz: "Эл. поштаңызды енгізіңіз", zh: "请输入邮箱", ja: "メールアドレスを入力してください" },
  sentTitle: { ko: "메일을 보냈어요", en: "Check your email", ru: "Проверьте почту", kz: "Поштаңызды тексеріңіз", zh: "请查收邮件", ja: "メールをご確認ください" },
  sentBody: { ko: "재설정 링크를 메일로 보냈어요. 메일함(스팸함 포함)을 확인해주세요. 메일이 안 보이면 잠시 후 다시 시도해주세요.", en: "We've sent a reset link. Check your inbox (and spam). If you don't see it, try again in a moment.", ru: "Мы отправили ссылку для сброса. Проверьте почту (и спам). Если письма нет, повторите попытку чуть позже.", kz: "Қалпына келтіру сілтемесін жібердік. Поштаңызды (спамды да) тексеріңіз. Хат жоқ болса, сәл кейін қайталаңыз.", zh: "我们已发送重置链接，请查收（含垃圾邮件）。若未收到，请稍后重试。", ja: "再設定リンクを送信しました。受信箱（迷惑メールも）をご確認ください。届かない場合は少し待って再度お試しください。" },
};
const pick = (d, lc) => d[lc] || d.en;

export default function ForgotPasswordClient() {
  const router = useRouter();
  const toast = useToast();
  const langCode = useLang();

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // 로그인 화면에서 넘어올 때 이메일 프리필
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("email");
    if (q) setEmail(q);
  }, []);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!email) { toast.error(pick(L.needEmail, langCode)); return; }
    setSending(true);
    // 결과(가입 여부)와 무관하게 동일 처리 — 이메일 존재 노출 방지.
    // 스팸/폭탄 차단은 서버: 같은 이메일·같은 IP 횟수제한 + Supabase 자체 제한.
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => {});
    setSending(false);
    setSent(true);
  };

  return (
    <div className="min-h-[calc(100dvh-64px)] flex items-center justify-center bg-gray-50 px-4 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 md:p-10 border border-gray-100">
        {sent ? (
          <div className="text-center">
            <div className="w-12 h-12 mx-auto rounded-xl bg-teal-50 flex items-center justify-center mb-4">
              <MailCheck className="text-teal-700" size={22} />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900">{pick(L.sentTitle, langCode)}</h2>
            <p className="text-sm text-gray-500 mt-3 leading-relaxed">{pick(L.sentBody, langCode)}</p>
            <button
              onClick={() => router.push("/login")}
              className="mt-6 w-full bg-teal-700 text-white font-bold py-3.5 rounded-xl hover:bg-teal-800 transition shadow-lg shadow-teal-100"
            >
              {pick(L.back, langCode)}
            </button>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-extrabold text-gray-900">{pick(L.title, langCode)}</h2>
              <p className="text-gray-500 mt-2">{pick(L.subtitle, langCode)}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="forgot-email" className="block text-sm font-bold text-gray-700 mb-1">{pick(L.email, langCode)}</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3.5 text-gray-400" size={20} />
                  <input
                    id="forgot-email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    inputMode="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={pick(L.emailPlaceholder, langCode)}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition bg-gray-50 text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={sending}
                className="w-full bg-teal-700 text-white font-bold py-3.5 rounded-xl hover:bg-teal-800 transition shadow-lg shadow-teal-100 disabled:bg-gray-300 disabled:shadow-none"
              >
                {sending ? pick(L.sending, langCode) : pick(L.submit, langCode)}
              </button>
            </form>

            <button
              onClick={() => router.push("/login")}
              className="mt-6 w-full flex items-center justify-center gap-1.5 text-sm font-bold text-gray-500 hover:text-teal-700 transition"
            >
              <ArrowLeft size={16} /> {pick(L.back, langCode)}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
