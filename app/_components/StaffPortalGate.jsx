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
import { useBackofficeLang } from "@/lib/i18n/coordinator";

// 포털 공통 문지기 문구 — 6개 언어. (코디·에이전시·의료기관 등 외국인 스태프가 보는 화면)
const GATE_TR = {
  en: { checking: "Verifying access…", denied: "Access denied", loginRequired: "Please sign in.", noPermission: "This account doesn't have access to this portal. Please contact the administrator.", login: "Sign in", goHome: "Back to home", retry: "Try again", temporary: "We could not verify your access right now. Please try again in a moment." },
  ko: { checking: "접속 확인 중…", denied: "접근 권한 없음", loginRequired: "로그인이 필요합니다.", noPermission: "이 계정은 이 포털 권한이 없습니다. 관리자에게 문의해 주세요.", login: "로그인", goHome: "홈으로 돌아가기", retry: "다시 시도", temporary: "지금은 접속 확인을 못 했습니다. 잠시 후 다시 시도해 주세요." },
  ru: { checking: "Проверка доступа…", denied: "Доступ запрещён", loginRequired: "Требуется вход.", noPermission: "У этого аккаунта нет доступа к этому порталу. Обратитесь к администратору.", login: "Войти", goHome: "На главную", retry: "Повторить", temporary: "Сейчас не удалось проверить доступ. Повторите попытку через минуту." },
  kz: { checking: "Кіру тексерілуде…", denied: "Кіруге рұқсат жоқ", loginRequired: "Кіру қажет.", noPermission: "Бұл аккаунтта осы порталға кіру рұқсаты жоқ. Әкімшіге хабарласыңыз.", login: "Кіру", goHome: "Басты бетке", retry: "Қайталау", temporary: "Қазір кіру тексерілмеді. Сәл кейін қайталап көріңіз." },
  zh: { checking: "正在验证访问权限…", denied: "无访问权限", loginRequired: "请先登录。", noPermission: "此账户无权访问该门户。请联系管理员。", login: "登录", goHome: "返回首页", retry: "重试", temporary: "暂时无法验证访问权限，请稍后重试。" },
  ja: { checking: "アクセスを確認中…", denied: "アクセス権限がありません", loginRequired: "ログインが必要です。", noPermission: "このアカウントにはこのポータルへのアクセス権がありません。管理者にお問い合わせください。", login: "ログイン", goHome: "ホームに戻る", retry: "再試行", temporary: "現在アクセスを確認できませんでした。しばらくしてからもう一度お試しください。" },
};

// portalName prop 은 더 이상 표시하지 않음(문구를 범용 "이 포털"로 통일) — 호출부 호환 위해 받되 무시.
export default function StaffPortalGate({ allow = [], redirect, children }) {
  const [state, setState] = useState("checking"); // checking | ok | denied | login
  const lang = useBackofficeLang();
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
        // 2026-07-29: 예전엔 여기서 «네트워크 오류·서버 5xx» 도 그대로 «권한 없음» 이 됐다.
        // 문 앞이 한 번 삐끗한 것을 「너는 자격이 없다」로 바꾸면 코디는 되돌릴 방법이 없다
        // (이 카드엔 다시 시도 버튼도 없었다). → 오류면 1회 더 물어보고, 그래도 안 되면
        // 「일시 오류」로 표시해 다시 시도 버튼을 준다. 401(진짜 미로그인)은 재시도 안 한다.
        const ask = async () => {
          const res = await fetch("/api/me", {
            credentials: "include",
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          });
          if (res.status === 401) return "login";
          if (!res.ok) throw new Error(`api_${res.status}`);
          const json = await res.json();
          return json?.ok && (json.isAdmin || allow.includes(json.appRole)) ? "ok" : "denied";
        };
        let next;
        try {
          next = await ask();
        } catch {
          next = await ask().catch(() => "unavailable");
        }
        if (!cancelled) setState(next);
      } catch {
        if (!cancelled) setState("unavailable");
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
            <ShieldAlert size={28} className="text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{L.denied}</h2>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            {state === "login" ? L.loginRequired : state === "unavailable" ? L.temporary : L.noPermission}
          </p>
          <div className="space-y-3">
            {/* 일시 오류로 못 물어본 경우 — 「권한 없음」이 아니므로 다시 시도할 길을 준다 */}
            {state === "unavailable" && (
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                {L.retry}
              </button>
            )}
            {state === "login" ? (
              <Link href={`/login?redirect=${encodeURIComponent(redirect || "/")}`} className="block w-full py-3 rounded-xl bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 transition">
                {L.login}
              </Link>
            ) : (
              <Link href="/" className="block w-full py-3 rounded-xl bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 transition">
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
