"use client";

/**
 * healwith: 백오피스 공용 문지기 — 어드민·코디·병원·파트너가 같은 한 벌을 쓴다.
 *
 * 왜 합쳤나(2026-08-25): 같은 일을 하는 문지기가 세 벌이었다(AdminGateClient 140줄 ·
 *   StaffPortalGate 135줄 · HospitalGateClient 147줄 = 422줄). 하는 일은 셋 다 같은데
 *   —«토큰 꺼내 → 확인 창구에 물어 → 통과/거절/재시도»— 고칠 일이 생기면 세 번 고쳐야 했고
 *   실제로 어긋나 있었다:
 *     · 어드민 문지기만 **한국어 고정** (코디·병원은 6개 언어) — 길 잘못 든 외국인 스태프가
 *       왜 못 들어가는지 못 읽었다.
 *     · 재시도 규칙이 셋 다 달랐다(어드민 5xx 1회 / 코디 1회 / 병원 2회 지수백오프).
 *     · 「일시 오류」와 「권한 없음」을 가르는 곳이 둘뿐이었다.
 *   → 여기 한 벌로 모으고, 계층별로 다른 건 **확인 창구 주소와 판정 함수**만 넘긴다.
 *
 * 지켜야 할 것(전부 사고에서 나온 규칙이라 지우지 말 것):
 *  · 로그인은 됐는데 권한만 없는 사람을 /login 으로 되던지지 않는다 — "로그인했는데 또 로그인?"
 *    무한 루프처럼 보인다(2026-07-06 PO 실사고).
 *  · 네트워크·5xx 오류를 「너는 자격이 없다」로 바꾸지 않는다 — 되돌릴 방법이 없어진다(2026-07-29).
 *  · 거절 화면 언어는 **공개 화면 언어**를 먼저 본다. 이 카드를 보는 사람은 스태프가 아니다
 *    (스태프면 통과했을 테니) — 스태프 전용 쿠키만 보면 기본 ko 로 떠서 못 읽는다(2026-08-05 PO 지적).
 *
 * 사용:
 *   <PortalGate
 *     endpoint="/api/admin/whoami"
 *     verify={(json) => (json.isAdmin ? { ok: true } : { ok: false, who: json.email })}
 *     redirect="/admin"
 *   >{children}</PortalGate>
 */

import { useEffect, useState, useRef, createContext, useContext } from "react";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useBackofficeLang } from "@/lib/i18n/coordinator";
import { useLang } from "@/lib/i18n/LangContext";

// 문지기 문구 — 활성 6개 언어. 결은 계층 구분 없이 하나로 통일한다.
const GATE_TR = {
  en: { checking: "Verifying access…", denied: "Access denied", noPermission: "This account doesn't have access to this portal. Please contact the administrator.", signedInAs: "Signed in as", goHome: "Back to home", retry: "Try again", otherAccount: "Sign in with another account", temporary: "We could not verify your access right now. Please try again in a moment.", errCode: "Error code" },
  ko: { checking: "접속 확인 중…", denied: "접근 권한 없음", noPermission: "이 계정은 이 포털 권한이 없습니다. 관리자에게 문의해 주세요.", signedInAs: "지금 로그인된 계정", goHome: "홈으로 돌아가기", retry: "다시 시도", otherAccount: "다른 계정으로 로그인", temporary: "지금은 접속 확인을 못 했습니다. 잠시 후 다시 시도해 주세요.", errCode: "오류 코드" },
  ru: { checking: "Проверка доступа…", denied: "Доступ запрещён", noPermission: "У этого аккаунта нет доступа к этому порталу. Обратитесь к администратору.", signedInAs: "Выполнен вход как", goHome: "На главную", retry: "Повторить", otherAccount: "Войти под другим аккаунтом", temporary: "Сейчас не удалось проверить доступ. Повторите попытку через минуту.", errCode: "Код ошибки" },
  kz: { checking: "Кіру тексерілуде…", denied: "Кіруге рұқсат жоқ", noPermission: "Бұл аккаунтта осы порталға кіру рұқсаты жоқ. Әкімшіге хабарласыңыз.", signedInAs: "Кірген аккаунт", goHome: "Басты бетке", retry: "Қайталау", otherAccount: "Басқа аккаунтпен кіру", temporary: "Қазір кіру тексерілмеді. Сәл кейін қайталап көріңіз.", errCode: "Қате коды" },
  zh: { checking: "正在验证访问权限…", denied: "无访问权限", noPermission: "此账户无权访问该门户。请联系管理员。", signedInAs: "当前登录账户", goHome: "返回首页", retry: "重试", otherAccount: "使用其他账户登录", temporary: "暂时无法验证访问权限，请稍后重试。", errCode: "错误代码" },
  ja: { checking: "アクセスを確認中…", denied: "アクセス権限がありません", noPermission: "このアカウントにはこのポータルへのアクセス権がありません。管理者にお問い合わせください。", signedInAs: "ログイン中のアカウント", goHome: "ホームに戻る", retry: "再試行", otherAccount: "別のアカウントでログイン", temporary: "現在アクセスを確認できませんでした。しばらくしてからもう一度お試しください。", errCode: "エラーコード" },
};

// 확인 창구가 돌려준 부가 정보(예: 병원 계정의 병원 id·이름)를 화면이 꺼내 쓰는 통로.
const PortalContext = createContext(null);
export function usePortalContext() {
  return useContext(PortalContext);
}

export default function PortalGate({
  endpoint,
  verify,
  redirect,
  /**
   * 권한 없음일 때 본문 문구를 갈아끼울 때만(예: 병원 「계정이 병원에 연결되지 않았습니다」).
   * 문자열이거나 {ko:…, en:…} 언어 묶음. 묶음이면 아래 lang 으로 고른다 — 호출부가
   * document.documentElement.lang 을 직접 읽으면 서버/브라우저가 달라져 화면이 어긋난다.
   */
  deniedMessage,
  /** 거절 카드에 추가로 놓을 링크 [{ href, label, primary }] */
  deniedActions,
  children,
}) {
  const [state, setState] = useState("checking"); // checking | ok | denied | unavailable
  const [who, setWho] = useState(null);           // 로그인은 됐는데 권한 없는 계정 표시용
  const [context, setContext] = useState(null);
  const [errCode, setErrCode] = useState(null);

  // 이 카드를 보는 사람은 스태프가 아니다 → 공개 화면 언어를 먼저, 없으면 스태프 언어.
  const boLang = useBackofficeLang();
  const publicLang = useLang();
  const lang = publicLang || boLang;
  const L = { ...GATE_TR.en, ...(GATE_TR[lang] || {}) };

  // ⚠️ verify 를 useEffect 의존성에 넣으면 안 된다 — 호출부가 인라인 화살표 함수를 넘기면
  //    매 렌더마다 «새 함수»라 확인 요청이 무한히 다시 나간다. 그래서 ref 에 담아 둔다.
  //    확인은 마운트 직후 «한 번»만 하므로 처음 값이면 충분하다(렌더 중 ref 를 덮어쓰지 않는다).
  const verifyRef = useRef(verify);

  useEffect(() => {
    let cancelled = false;

    // 딥링크 보존: 지금 보던 주소를 그대로 들려 보낸다(로그인 후 여기로 돌아온다).
    // redirect prop 은 창이 없을 때(서버)의 대비값일 뿐이다.
    const loginUrl = () => {
      const here =
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : redirect || "/";
      return `/login?redirect=${encodeURIComponent(here)}`;
    };

    (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        // 로그인 «직후» 리다이렉트면 세션이 아직 안 붙어 있을 수 있다 — 한 번 더 기다렸다 본다.
        let token = (await supabase.auth.getSession())?.data?.session?.access_token;
        if (!token) {
          await new Promise((r) => setTimeout(r, 800));
          token = (await supabase.auth.getSession())?.data?.session?.access_token;
        }
        if (!token) {
          if (!cancelled) window.location.href = loginUrl();
          return;
        }

        const ask = async () => {
          const res = await fetch(endpoint, {
            credentials: "include",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            cache: "no-store",
          });
          if (res.status === 401) return { next: "login" };
          if (!res.ok) throw new Error(`api_${res.status}`);
          const json = await res.json();
          const v = verifyRef.current(json) || {};
          return v.ok
            ? { next: "ok", context: v.context ?? null }
            : { next: "denied", who: v.who ?? null, errCode: v.errCode ?? null };
        };

        // 한 번 삐끗한 것을 「자격 없음」으로 바꾸지 않는다 — 1회 더 물어보고 그래도 안 되면 «일시 오류».
        // 401(진짜 미로그인)은 재시도하지 않는다.
        let r;
        try {
          r = await ask();
        } catch {
          await new Promise((res) => setTimeout(res, 1000));
          r = await ask().catch(() => ({ next: "unavailable" }));
        }
        if (cancelled) return;
        if (r.next === "login") { window.location.href = loginUrl(); return; }
        if (r.next === "ok") setContext(r.context);
        if (r.next === "denied") { setWho(r.who); setErrCode(r.errCode); }
        setState(r.next);
      } catch {
        if (!cancelled) setState("unavailable");
      }
    })();

    return () => { cancelled = true; };
  }, [endpoint, redirect]);

  if (state === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-700 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">{L.checking}</p>
        </div>
      </div>
    );
  }

  if (state === "denied" || state === "unavailable") {
    const temporary = state === "unavailable";
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={28} className="text-red-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">{L.denied}</h2>
          <p className="text-sm text-gray-500 mb-2 leading-relaxed">
            {temporary
              ? L.temporary
              : (typeof deniedMessage === "string" ? deniedMessage : (deniedMessage?.[lang] || deniedMessage?.en)) || L.noPermission}
          </p>
          {!temporary && who && (
            <p className="text-xs text-gray-500 mb-4 break-all">
              {L.signedInAs}: <span className="font-medium text-gray-700">{who}</span>
            </p>
          )}
          <div className="space-y-2 mt-6">
            {temporary && (
              <button
                onClick={() => window.location.reload()}
                className="block w-full py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                {L.retry}
              </button>
            )}
            {/* label 은 문자열이거나 {ko:…, en:…} 언어 묶음 — 묶음이면 지금 언어, 없으면 영어. */}
            {(deniedActions || []).map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className={
                  a.primary
                    ? "block w-full py-2.5 rounded-xl bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 transition"
                    : "block w-full py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition"
                }
              >
                {typeof a.label === "string" ? a.label : (a.label?.[lang] || a.label?.en)}
              </Link>
            ))}
            <a href="/login" className="block w-full py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition">
              {L.otherAccount}
            </a>
            <Link href="/" className="block w-full py-2.5 text-gray-500 text-xs hover:text-gray-600 transition">
              {L.goHome}
            </Link>
          </div>
          {errCode && <p className="mt-4 text-xs text-gray-500">{L.errCode}: {errCode}</p>}
        </div>
      </div>
    );
  }

  return <PortalContext.Provider value={context}>{children}</PortalContext.Provider>;
}
