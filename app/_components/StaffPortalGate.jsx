"use client";

/**
 * healwith: 스태프 포털 문지기 (코디네이터·의사 등).
 *
 * 기존엔 "로그인만" 하면 /coordinator·/doctor 가 열렸다(역할 확인 없음).
 * 이 게이트는 /api/me 로 app_metadata.role 을 확인해, 해당 역할 또는 admin 만 통과시킨다.
 * 권한 판정은 서버(app_metadata.role)에서 — 클라이언트는 표시만 제어.
 *
 * 사용: <StaffPortalGate allow={["coordinator"]} portalName="코디네이터">{children}</StaffPortalGate>
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useLang } from "@/lib/i18n/LangContext";

// 포털 공통 문지기 문구 — 6개 언어. (코디·에이전시·의료기관 등 외국인 스태프가 보는 화면)
const GATE_TR = {
  en: { checking: "Verifying access…", denied: "Access denied", loginRequired: "Please sign in.", noPermission: "This account doesn't have access to this portal. Please contact the administrator.", login: "Sign in", goHome: "Back to home" },
  ko: { checking: "접속 확인 중…", denied: "접근 권한 없음", loginRequired: "로그인이 필요합니다.", noPermission: "이 계정은 이 포털 권한이 없습니다. 관리자에게 문의해 주세요.", login: "로그인", goHome: "홈으로 돌아가기" },
  ru: { checking: "Проверка доступа…", denied: "Доступ запрещён", loginRequired: "Требуется вход.", noPermission: "У этого аккаунта нет доступа к этому порталу. Обратитесь к администратору.", login: "Войти", goHome: "На главную" },
  kz: { checking: "Кіру тексерілуде…", denied: "Кіруге рұқсат жоқ", loginRequired: "Кіру қажет.", noPermission: "Бұл аккаунтта осы порталға кіру рұқсаты жоқ. Әкімшіге хабарласыңыз.", login: "Кіру", goHome: "Басты бетке" },
  zh: { checking: "正在验证访问权限…", denied: "无访问权限", loginRequired: "请先登录。", noPermission: "此账户无权访问该门户。请联系管理员。", login: "登录", goHome: "返回首页" },
  ja: { checking: "アクセスを確認中…", denied: "アクセス権限がありません", loginRequired: "ログインが必要です。", noPermission: "このアカウントにはこのポータルへのアクセス権がありません。管理者にお問い合わせください。", login: "ログイン", goHome: "ホームに戻る" },
};

export default function StaffPortalGate({ allow = [], portalName = "포털", redirect, children }) {
  const [state, setState] = useState("checking"); // checking | ok | denied | login
  const lang = useLang();
  const L = { ...GATE_TR.en, ...(GATE_TR[lang] || {}) };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: sess } = await supabase.auth.getSession();
        const token = sess?.session?.access_token;
        if (!token) {
          if (!cancelled) {
            window.location.href = `/login?redirect=${encodeURIComponent(redirect || "/")}`;
          }
          return;
        }
        const res = await fetch("/api/me", {
          credentials: "include",
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (res.status === 401) {
          if (!cancelled) setState("login");
          return;
        }
        const json = await res.json();
        const ok = json?.ok && (json.isAdmin || allow.includes(json.appRole));
        if (!cancelled) setState(ok ? "ok" : "denied");
      } catch {
        if (!cancelled) setState("denied");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">{L.checking}</p>
        </div>
      </div>
    );
  }

  if (state !== "ok") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-lg p-8 text-center border border-gray-100">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={28} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{L.denied}</h2>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            {state === "login" ? L.loginRequired : L.noPermission}
          </p>
          <div className="space-y-3">
            {state === "login" ? (
              <Link href={`/login?redirect=${encodeURIComponent(redirect || "/")}`} className="block w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition">
                {L.login}
              </Link>
            ) : (
              <Link href="/" className="block w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition">
                {L.goHome}
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return children;
}
