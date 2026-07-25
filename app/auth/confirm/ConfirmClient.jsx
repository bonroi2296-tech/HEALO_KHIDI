"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { createSupabaseBrowserClient, withAuthTimeout } from "@/lib/supabase/browser";
import { useLang } from "@/lib/i18n/LangContext";

const supabase = createSupabaseBrowserClient();

// 이메일 인증/계정변경 링크 착지점.
// token_hash를 클라이언트 JS로만 검증 → 이메일 보안 스캐너(봇)는 JS를 실행하지
// 않으므로 일회용 링크를 미리 소진하지 않는다. 검증 성공 시 쿠키 세션이 잡혀 로그인됨.
const L = {
  verifying: { ko: "인증 확인 중...", en: "Confirming...", ru: "Подтверждение...", kz: "Растауда...", zh: "确认中...", ja: "確認中..." },
  successTitle: { ko: "인증 완료!", en: "Confirmed!", ru: "Подтверждено!", kz: "Расталды!", zh: "确认成功！", ja: "確認完了！" },
  successBody: { ko: "잠시 후 자동으로 이동합니다...", en: "Redirecting you now...", ru: "Сейчас вы будете перенаправлены...", kz: "Қазір бағытталасыз...", zh: "正在跳转...", ja: "まもなく移動します..." },
  errorTitle: { ko: "링크가 만료되었거나 유효하지 않습니다", en: "This link is invalid or has expired", ru: "Ссылка недействительна или истекла", kz: "Сілтеме жарамсыз немесе мерзімі өтті", zh: "链接无效或已过期", ja: "リンクが無効か期限切れです" },
  errorBody: { ko: "이미 인증됐다면 그냥 로그인하면 됩니다. 아니면 다시 시도해주세요.", en: "If you're already confirmed, just log in. Otherwise please try again.", ru: "Если уже подтверждено — просто войдите. Иначе попробуйте снова.", kz: "Расталған болса, кіріңіз. Әйтпесе қайталаңыз.", zh: "若已确认请直接登录，否则请重试。", ja: "確認済みならログインしてください。そうでなければ再度お試しください。" },
  loginBtn: { ko: "로그인하러 가기", en: "Go to login", ru: "Перейти ко входу", kz: "Кіруге өту", zh: "前往登录", ja: "ログインへ" },
};
const pick = (d, lc) => d[lc] || d.en;

export default function ConfirmClient() {
  const router = useRouter();
  const langCode = useLang();
  const [status, setStatus] = useState("verifying"); // verifying | success | error

  useEffect(() => {
    // useSearchParams 대신 window.location 사용 — Suspense 경계 불필요 + 클라이언트 전용
    const params = new URLSearchParams(window.location.search);
    const token_hash = params.get("token_hash");
    const type = params.get("type");
    // 내부 경로만 허용 — '//evil.com' 형태의 open-redirect 차단(1줄 가드)
    const rawNext = params.get("next") || "/";
    const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
    if (!token_hash || !type) {
      setStatus("error");
      return;
    }
    let active = true;
    withAuthTimeout(supabase.auth.verifyOtp({ type, token_hash }))
      .then(({ error }) => {
        if (!active) return;
        if (error) {
          setStatus("error");
          return;
        }
        setStatus("success");
        setTimeout(() => router.push(next), 1200);
      })
      .catch(() => { if (active) setStatus("error"); }); // 인증 서버 무응답 → 스피너에 갇히지 않게
    return () => { active = false; };
  }, [router]);

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50 px-4 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 md:p-10 border border-gray-100 text-center">
        {status === "verifying" && (
          <div className="flex flex-col items-center gap-4 py-6">
            <Loader2 className="text-teal-600 animate-spin" size={40} />
            <p className="text-sm text-gray-500">{pick(L.verifying, langCode)}</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center">
              <CheckCircle2 className="text-teal-700" size={22} />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900">{pick(L.successTitle, langCode)}</h2>
            <p className="text-sm text-gray-500">{pick(L.successBody, langCode)}</p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
              <XCircle className="text-red-500" size={22} />
            </div>
            <h2 className="text-xl font-extrabold text-gray-900">{pick(L.errorTitle, langCode)}</h2>
            <p className="text-sm text-gray-500 leading-relaxed">{pick(L.errorBody, langCode)}</p>
            <button
              onClick={() => router.push("/login")}
              className="mt-4 w-full bg-teal-700 text-white font-bold py-3.5 rounded-xl hover:bg-teal-800 transition shadow-lg shadow-teal-100"
            >
              {pick(L.loginBtn, langCode)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
