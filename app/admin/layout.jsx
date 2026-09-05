"use client";

import PortalGate from "../_components/PortalGate";
import { useEnsureBackofficeLangCookie } from "@/lib/i18n/coordinator";
import { AdminNav } from "./_components/AdminNav";
import ManualDrawer from "../_components/ManualDrawer";
import PushOptInBanner from "../_components/PushOptInBanner";

// 2026-08-25: 전용 문지기(AdminGateClient) → 포털 공용 문지기로 교체.
// 어드민 문지기만 한국어 고정이라 길 잘못 든 외국인 스태프가 왜 못 들어가는지 못 읽었다.
// 「코디 화면으로 가기」 링크는 그대로 둔다 — 코디 계정이 /admin 을 눌렀을 때의 갈 곳이다.
export default function AdminLayout({ children }) {
  // 서버가 이 쿠키를 보고 한국어 사전을 같이 실어 준다 — 없으면 화면 일부가 영어로 떨어진다.
  useEnsureBackofficeLangCookie();
  return (
    <PortalGate
      endpoint="/api/admin/whoami"
      verify={(json) => (json?.isAdmin ? { ok: true } : { ok: false, who: json?.email || null })}
      redirect="/admin"
      deniedActions={[{
        href: "/coordinator",
        primary: true,
        label: { ko: "코디네이터 화면으로 가기", en: "Go to the coordinator portal", ru: "Перейти в портал координатора", kz: "Координатор порталына өту", zh: "前往协调员门户", ja: "コーディネーター画面へ" },
      }]}
    >
      <div className="flex min-h-screen min-h-screen-safe bg-gray-50 healo-portal-offset">
        <AdminNav />
        {/* Content: pt-14 on mobile for the nav bar, lg:pt-0 on desktop */}
        {/* 2026-07-28: `overflow-auto` 제거 — 코디 포털과 같은 부류(#1098).
            부모가 `flex min-h-screen` 이라 이 main 은 **자기가 스크롤한 적이 없는데**,
            overflow 가 visible 이 아니라는 이유로 CSS 상 «스크롤 상자»가 되어
            안쪽 `position: sticky` 가 움직이지 않는 상자를 기준 삼아 아예 안 붙었다.
            새로 하단/상단 고정 UI 를 넣을 때 이 값을 되살리지 말 것. */}
        {/* 위 여백 = 모바일 메뉴 줄(AdminNav 의 h-[4.5rem]) 높이. 한쪽만 고치면 본문 윗줄이 가린다. */}
        {/* min-w-0: 이게 없으면 폰에서 «오른쪽이 잘려 안 보이는» 화면이 무더기로 생긴다.
            가로로 나란히 놓인 칸(flex)은 기본값이 «내용보다 좁아지지 않기»라, 안쪽에 넓은 표나
            안 잘리는 긴 글자가 하나만 있어도 이 칸이 화면 밖까지 늘어난다. 그런데 옆으로 밀 수도
            없어서(부모가 잘라냄) 그 부분은 «영영 못 보는 영역»이 된다.
            2026-08-04 실측(412px 폰): /admin/khidi/cases 662px · /admin/audit 659px ·
            /admin/rag 1166px · /coordinator/inbox 892px → 전부 오른쪽이 잘려 있었다. 지우지 마라. */}
        <main className="flex-1 min-w-0 pt-[4.5rem] lg:pt-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
            {/* 폰 알림이 꺼져 있을 때만 뜨는 줄 — 브라우저에선 아무것도 안 그린다 */}
            <PushOptInBanner />
            {children}
          </div>
        </main>
      </div>
      <ManualDrawer role="admin" />
    </PortalGate>
  );
}
