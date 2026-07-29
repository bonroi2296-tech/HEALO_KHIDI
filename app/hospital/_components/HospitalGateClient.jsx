"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { useBackofficeLang } from "@/lib/i18n/coordinator";

// 병원 포털 문지기 문구 — 6개 언어.
// 왜 국내 병원 화면인데 번역하나: **길을 잘못 든 사람이 보는 화면**이기 때문이다.
// 실측(2026-07-29) 해외 에이전시 계정으로 /hospital 에 들어가자 껍데기는 러시아어인데
// 이 안내만 한국어로 떠서, 정작 «왜 못 들어가는지»를 못 읽었다.
// 문구 결은 app/_components/StaffPortalGate.jsx 의 GATE_TR 과 같게.
const HG_TR = {
  ko: { checking: "병원 포털 접속 확인 중…", denied: "접근 권한 없음", notLinked: "이 계정은 병원 포털에 연결되어 있지 않습니다. 관리자에게 병원 계정 연결을 요청해 주세요.", temporary: "병원 포털에 접속할 수 없습니다. 잠시 후 다시 시도해 주세요.", retry: "다시 시도", goHome: "홈으로 돌아가기", errCode: "오류 코드" },
  en: { checking: "Verifying access to the hospital portal…", denied: "Access denied", notLinked: "This account is not linked to a hospital. Please ask the administrator to link your hospital account.", temporary: "We could not open the hospital portal. Please try again in a moment.", retry: "Try again", goHome: "Back to home", errCode: "Error code" },
  ru: { checking: "Проверка доступа к порталу больницы…", denied: "Доступ запрещён", notLinked: "Этот аккаунт не привязан к больнице. Попросите администратора привязать ваш больничный аккаунт.", temporary: "Не удалось открыть портал больницы. Повторите попытку через минуту.", retry: "Повторить", goHome: "На главную", errCode: "Код ошибки" },
  kz: { checking: "Аурухана порталына кіру тексерілуде…", denied: "Кіруге рұқсат жоқ", notLinked: "Бұл аккаунт ауруханаға байланыстырылмаған. Әкімшіден аурухана аккаунтын байланыстыруды сұраңыз.", temporary: "Аурухана порталын ашу мүмкін болмады. Сәл кейін қайталап көріңіз.", retry: "Қайталау", goHome: "Басты бетке", errCode: "Қате коды" },
  zh: { checking: "正在验证医院门户访问权限…", denied: "无访问权限", notLinked: "此账户尚未关联医院。请联系管理员关联您的医院账户。", temporary: "无法打开医院门户，请稍后重试。", retry: "重试", goHome: "返回首页", errCode: "错误代码" },
  ja: { checking: "病院ポータルへのアクセスを確認中…", denied: "アクセス権限がありません", notLinked: "このアカウントは病院に紐づいていません。管理者に病院アカウントの紐づけを依頼してください。", temporary: "病院ポータルを開けませんでした。しばらくしてからお試しください。", retry: "再試行", goHome: "ホームに戻る", errCode: "エラーコード" },
};

export function HospitalGateClient({ children }) {
  const router = useRouter();
  const lang = useBackofficeLang();
  // 빠진 낱말은 영어로 폴백(빈칸이 뜨는 것보다 낫다)
  const T = { ...HG_TR.en, ...(HG_TR[lang] || {}) };
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [hospitalInfo, setHospitalInfo] = useState(null);
  const [gateError, setGateError] = useState(null);

  useEffect(() => {
    let attempt = 0;
    const maxRetries = 2;

    const verify = async () => {
      try {
        const { createSupabaseBrowserClient } = await import("@/lib/supabase/browser");
        const supabase = createSupabaseBrowserClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;

        if (!accessToken) {
          router.push("/login?redirect=/hospital");
          return;
        }

        const response = await fetch("/api/partner/whoami", {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.isHospitalUser) {
            setHospitalInfo({
              hospitalId: result.hospitalId,
              hospitalName: result.hospitalName,
              role: result.role,
            });
            setIsAuthorized(true);
          } else {
            setGateError(result.error || "not_hospital_user");
          }
        } else if (attempt < maxRetries) {
          attempt++;
          await new Promise((r) => setTimeout(r, 1000 * attempt));
          return verify();
        } else {
          setGateError("api_error");
        }
      } catch (error) {
        console.error("[HospitalGate] Error:", error);
        if (attempt < maxRetries) {
          attempt++;
          await new Promise((r) => setTimeout(r, 1000 * attempt));
          return verify();
        }
        setGateError("network_error");
      } finally {
        setIsChecking(false);
      }
    };

    verify();
  }, [router]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">{T.checking}</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-lg p-8 text-center border border-gray-100">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={28} className="text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{T.denied}</h2>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            {gateError === "not_hospital_user"
              ? T.notLinked
              : T.temporary}
          </p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              {T.retry}
            </button>
            <Link
              href="/"
              className="block w-full py-3 rounded-xl bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 transition"
            >
              {T.goHome}
            </Link>
          </div>
          {gateError && (
            <p className="mt-4 text-xs text-gray-500">{T.errCode}: {gateError}</p>
          )}
        </div>
      </div>
    );
  }

  return <HospitalContext.Provider value={hospitalInfo}>{children}</HospitalContext.Provider>;
}

import { createContext, useContext } from "react";

const HospitalContext = createContext(null);

export function useHospitalContext() {
  return useContext(HospitalContext);
}
