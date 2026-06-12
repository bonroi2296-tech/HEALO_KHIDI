"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * AdminGateClient: Admin 권한 확인 컴포넌트
 * - /api/admin/whoami 호출하여 admin 권한 체크
 * - 권한 없으면 /login으로 리다이렉트
 * - Middleware와 함께 이중 방어선 역할
 */
export function AdminGateClient({ children }) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

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
          } else {
            console.warn('[AdminGate] ❌ Not an admin:', result.email, result.error);
            router.push('/login');
          }
        } else {
          const errBody = await response.json().catch(() => ({}));
          console.warn('[AdminGate] Auth failed', response.status, errBody?.hint || '');
          router.push('/login');
        }
      } catch (error) {
        console.error('[AdminGate] Error:', error);
        router.push('/login');
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

  // 권한 없으면 아무것도 렌더링하지 않음 (redirect 진행 중)
  if (!isAuthorized) {
    return null;
  }

  // ✅ 권한 확인됨: children 렌더링
  return <>{children}</>;
}
