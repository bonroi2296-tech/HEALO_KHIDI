"use client";

import { AdminGateClient } from "./_components/AdminGateClient";
import { AdminNav } from "./_components/AdminNav";
import ManualDrawer from "../_components/ManualDrawer";

export default function AdminLayout({ children }) {
  return (
    <AdminGateClient>
      <div className="flex min-h-screen min-h-screen-safe bg-gray-50 pt-12">
        <AdminNav />
        {/* Content: pt-14 on mobile for the nav bar, lg:pt-0 on desktop */}
        {/* 2026-07-28: `overflow-auto` 제거 — 코디 포털과 같은 부류(#1098).
            부모가 `flex min-h-screen` 이라 이 main 은 **자기가 스크롤한 적이 없는데**,
            overflow 가 visible 이 아니라는 이유로 CSS 상 «스크롤 상자»가 되어
            안쪽 `position: sticky` 가 움직이지 않는 상자를 기준 삼아 아예 안 붙었다.
            새로 하단/상단 고정 UI 를 넣을 때 이 값을 되살리지 말 것. */}
        <main className="flex-1 pt-14 lg:pt-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
            {children}
          </div>
        </main>
      </div>
      <ManualDrawer role="admin" />
    </AdminGateClient>
  );
}
