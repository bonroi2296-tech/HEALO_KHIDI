"use client";

/**
 * 「애플로 계속하기」 버튼 — 애플 심사 4.8(Login Services) 대응.
 *
 * 왜 있나 (2026-08-05 애플 1차 반려):
 *   구글 로그인을 제공하면서 «동등한 대안»을 안 줬다는 지적을 받았다. 애플이 요구하는
 *   대안의 조건 3가지 — ①이름·이메일만 수집 ②이메일을 모든 당사자에게 비공개로 할 수 있음
 *   ③동의 없이 광고 목적 활동 수집 안 함 — 을 다 만족하는 건 「애플로 로그인」이다.
 *   우리 이메일 가입은 ②(이메일 숨기기)를 만족하지 못해 대안이 될 수 없다.
 *
 * ⚠️ 스위치가 꺼져 있으면 «아무것도 그리지 않는다».
 *   애플 개발자 콘솔(Service ID·Key)과 Supabase 인증 설정이 끝나기 «전»에 버튼만 내보내면
 *   눌렀을 때 오류가 나서 오히려 더 나쁘다. 설정이 끝나면 env 하나만 켜면 된다:
 *     NEXT_PUBLIC_APPLE_LOGIN_ENABLED=true
 *   설정 절차는 docs/APPLE_SIGNIN_SETUP.md.
 */

import { useState } from "react";
import { t } from "@/lib/i18n";
import { isNativeApp } from "@/lib/isNativeApp";

export const APPLE_LOGIN_ENABLED =
  process.env.NEXT_PUBLIC_APPLE_LOGIN_ENABLED === "true";

/** 지금 아이폰·아이패드인가. 캡시터 전역이 있으면 그것이 가장 정확하고, 없으면 브라우저 이름표로 본다. */
function isIOS() {
  if (typeof window === "undefined") return false;
  const platform = window.Capacitor?.getPlatform?.();
  if (platform) return platform === "ios";
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

export default function AppleSignInButton({
  supabase,
  langCode,
  redirectTarget,
  disabled,
  onError,
  // 가입 화면에서는 옆의 구글 버튼이 「가입하기」라 애플만 「계속하기」면 두 줄이 어긋나 보인다
  // (2026-08-05 PO 지적). 화면에 맞는 문구를 고르게 한다.
  variant = "signin",
}) {
  const [busy, setBusy] = useState(false);

  if (!APPLE_LOGIN_ENABLED) return null;

  const start = async () => {
    setBusy(true);
    try {
      // 🍎 아이폰 «앱 안»에서는 웹 방식이 끝까지 못 간다 — 아이폰이 애플 로그인을 시스템 창으로
      //    가로채서, 인증은 되는데 그 결과가 우리 서버로 안 돌아온다(2026-08-28 실기기 실측).
      //    그래서 앱에서는 아이폰이 주는 창을 직접 쓰고 토큰만 받아 온다.
      //    안드로이드는 웹 방식이 그대로 되므로 건드리지 않는다.
      if (isNativeApp() && isIOS()) {
        const { signInWithAppleNative, isAppleCancel } = await import(
          "@/lib/auth/appleNativeSignIn"
        );
        try {
          await signInWithAppleNative(supabase);
        } catch (nativeError) {
          // 사용자가 창을 그냥 닫은 것은 오류가 아니다 — 조용히 버튼만 되살린다.
          if (isAppleCancel(nativeError)) {
            setBusy(false);
            return;
          }
          throw nativeError;
        }
        // 세션이 이 화면에 바로 생기므로 서버 콜백을 타지 않는다 → 착지만 직접 정한다.
        window.location.href = redirectTarget || "/";
        return;
      }

      const redirectUrl = `${window.location.origin}/auth/callback${
        redirectTarget ? `?next=${encodeURIComponent(redirectTarget)}` : ""
      }`;
      // signInWithOAuth 는 throw 가 아니라 { error } 를 돌려준다 — 객체를 직접 본다.
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: { redirectTo: redirectUrl },
      });
      if (error) {
        onError?.(t("auth.appleError", langCode));
        setBusy(false);
      }
      // 성공하면 브라우저가 애플로 넘어간다 → 이 화면은 사라지므로 여기서 할 일이 없다.
    } catch {
      onError?.(t("auth.appleError", langCode));
      setBusy(false);
    }
  };

  return (
    <button
      onClick={start}
      disabled={disabled || busy}
      className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M16.365 1.43c0 1.14-.42 2.2-1.25 3.02-.99.99-2.13 1.56-3.32 1.47-.03-1.1.44-2.23 1.24-3.03.86-.87 2.16-1.5 3.33-1.46zM20.9 17.02c-.6 1.38-.89 1.99-1.66 3.2-1.08 1.7-2.6 3.81-4.48 3.83-1.67.02-2.1-1.09-4.37-1.08-2.27.01-2.74 1.1-4.41 1.08-1.88-.02-3.32-1.93-4.4-3.62C-1.5 16.44-1.8 10.7 1.05 7.7c1.24-1.32 3.03-2.15 4.75-2.15 1.79 0 2.91 1.1 4.39 1.1 1.43 0 2.3-1.1 4.37-1.1 1.53 0 3.15.83 4.31 2.27-3.79 2.08-3.18 7.5.09 9.2z" />
      </svg>
      <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900">
        {busy
          ? t("auth.appleConnecting", langCode)
          : t(variant === "signup" ? "auth.appleSignUp" : "auth.appleContinue", langCode)}
      </span>
    </button>
  );
}
