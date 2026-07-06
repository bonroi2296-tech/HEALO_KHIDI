"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * AdminGateClient: Admin 권한 확인 컴포넌트
 * - /api/admin/whoami 호출하여 admin 권한 체크
 * - 미로그인 → /login (원래 가려던 주소 유지)
 * - 로그인됐지만 admin 아님 → 설명 화면 (2026-07-06: 이전엔 조용히 /login 으로 되던져
 *   "로그인했는데 또 로그인하라는" 무한 루프처럼 보였음 — PO 실제 혼동 사고)
 * - Middleware와 함께 이중 방어선 역할
 */
export function AdminGateClient({ children }) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [deniedEmail, setDeniedEmail] = useState(null); // 로그인 O + admin 권한 X

  // 딥링크 보존: 미로그인으로 튕길 때 지금 주소를 들려 보낸다 (기존엔 유실)
  const loginUrl = () =>
    `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;

  useEffect(() => {
    const verifyAdmin = async () => {
      try {
        const { createSupabaseBrowserClient } = await import('@/lib/supabase/browser');
        const supabase = createSupabaseBrowserClient();

        // 로그인 직후 리다이렉트 시 세션이 아직 준비 안 됐을 수 있음 → 잠시 대기 후 재시도
        let sessionData = await supabase.auth.getSession();
        let accessToken = sessionData?.data?.session?.access_token;
        if (!accessToken) {
          await new Promise((r) => setTimeout(r, 800));
          sessionData = await supabase.auth.getSession();
          accessToken = sessionData?.data?.session?.access_token;
        }

        const headers = { 'Content-Type': 'application/json' };
        if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

        let response = await fetch('/api/admin/whoami', { credentials: 'include', headers });

        // 403이고 토큰 없이 호출했을 때만 한 번 재시도 (세션 지연 대비)
        if (!response.ok && response.status === 403 && !accessToken) {
          await new Promise((r) => setTimeout(r, 1000));
          const retrySession = await supabase.auth.getSession();
          const retryToken = retrySession?.data?.session?.access_token;
          const retryHeaders = { 'Content-Type': 'application/json' };
          if (retryToken) retryHeaders['Authorization'] = `Bearer ${retryToken}`;
          response = await fetch('/api/admin/whoami', { credentials: 'include', headers: retryHeaders });
        }

        if (response.ok) {
          const result = await response.json();
          if (result.isAdmin) {
            setIsAuthorized(true);
          } else if (result.email) {
            // 로그인은 됐는데 권한이 없는 계정 — /login 으로 되던지면 "또 로그인?" 혼란만 생김
            console.warn('[AdminGate] ❌ Not an admin:', result.email, result.error);
            setDeniedEmail(result.email);
          } else {
            console.warn('[AdminGate] ❌ Not an admin (no email):', result.error);
            router.push(loginUrl());
          }
        } else {
          const errBody = await response.json().catch(() => ({}));
          console.warn('[AdminGate] Auth failed', response.status, errBody?.hint || '');
          router.push(loginUrl());
        }
      } catch (error) {
        console.error('[AdminGate] Error:', error);
        router.push(loginUrl());
      } finally {
        setIsChecking(false);
      }
    };

    verifyAdmin();
  }, [router]);

  // 권한 확인 중이면 로딩 표시
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // 로그인은 됐지만 관리자 권한이 없는 계정: 설명 + 갈 곳 안내 (조용한 튕김 금지)
  if (deniedEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
          <p className="text-3xl mb-3">🔒</p>
          <h1 className="text-lg font-bold text-gray-900 mb-2">관리자 전용 화면입니다</h1>
          <p className="text-sm text-gray-500 mb-6 break-all">
            지금 로그인된 계정(<span className="font-medium text-gray-700">{deniedEmail}</span>)에는
            관리자 권한이 없습니다.
          </p>
          <div className="space-y-2">
            <a href="/coordinator" className="block w-full py-2.5 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition">
              코디네이터 화면으로 가기
            </a>
            <a href="/login" className="block w-full py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition">
              다른 계정으로 로그인
            </a>
            <a href="/" className="block w-full py-2.5 text-gray-400 text-xs hover:text-gray-600 transition">
              홈으로
            </a>
          </div>
        </div>
      </div>
    );
  }

  // 권한 없으면 아무것도 렌더링하지 않음 (redirect 진행 중)
  if (!isAuthorized) {
    return null;
  }

  // ✅ 권한 확인됨: children 렌더링
  return <>{children}</>;
}
