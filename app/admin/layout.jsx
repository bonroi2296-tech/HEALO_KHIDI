"use client";

import { AdminGateClient } from "./_components/AdminGateClient";
import { AdminNav } from "./_components/AdminNav";
import ManualDrawer from "../_components/ManualDrawer";
import PushOptInBanner from "../_components/PushOptInBanner";

export default function AdminLayout({ children }) {
  return (
    <AdminGateClient>
      <div className="flex min-h-screen min-h-screen-safe bg-gray-50 healo-portal-offset">
        <AdminNav />
        {/* Content: pt-14 on mobile for the nav bar, lg:pt-0 on desktop */}
        {/* 2026-07-28: `overflow-auto` 제거 — 코디 포털과 같은 부류(#1098).
            부모가 `flex min-h-screen` 이라 이 main 은 **자기가 스크롤한 적이 없는데**,
            overflow 가 visible 이 아니라는 이유로 CSS 상 «스크롤 상자»가 되어
            안쪽 `position: sticky` 가 움직이지 않는 상자를 기준 삼아 아예 안 붙었다.
            새로 하단/상단 고정 UI 를 넣을 때 이 값을 되살리지 말 것. */}
        {/* 위 여백 = 모바일 메뉴 줄(AdminNav 의 h-[4.5rem]) 높이. 한쪽만 고치면 본문 윗줄이 가린다. */}
        <main className="flex-1 pt-[4.5rem] lg:pt-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
            {/* 폰 알림이 꺼져 있을 때만 뜨는 줄 — 브라우저에선 아무것도 안 그린다 */}
            <PushOptInBanner />
            {children}
          </div>
        </main>
      </div>
      <ManualDrawer role="admin" />
    </AdminGateClient>
  );
}
