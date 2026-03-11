"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export function HospitalGateClient({ children }) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [hospitalInfo, setHospitalInfo] = useState(null);
  const [gateError, setGateError] = useState(null);

  useEffect(() => {
    let attempt = 0;
    const maxRetries = 2;

    const verify = async () => {
      try {
        const { createSupabaseBrowserClient } = await import("../../../src/lib/supabase/browser");
        const supabase = createSupabaseBrowserClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;

        if (!accessToken) {
          router.push("/login?redirect=/partner");
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
          <p className="text-gray-500 text-sm">병원 포털 접속 확인 중...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-lg p-8 text-center border border-gray-100">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={28} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">접근 권한 없음</h2>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            {gateError === "not_hospital_user"
              ? "이 계정은 병원 포털에 연결되어 있지 않습니다. 관리자에게 병원 계정 연결을 요청해 주세요."
              : "병원 포털에 접속할 수 없습니다. 잠시 후 다시 시도해 주세요."}
          </p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              다시 시도
            </button>
            <Link
              href="/"
              className="block w-full py-3 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition"
            >
              홈으로 돌아가기
            </Link>
          </div>
          {gateError && (
            <p className="mt-4 text-xs text-gray-400">오류 코드: {gateError}</p>
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
