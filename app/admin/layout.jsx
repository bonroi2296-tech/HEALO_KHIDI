"use client";

import { AdminGateClient } from "./_components/AdminGateClient";
import { AdminNav } from "./_components/AdminNav";
import ManualDrawer from "../_components/ManualDrawer";
import PushOptInBanner from "../_components/PushOptInBanner";

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
        {/* min-w-0: 이게 없으면 폰에서 «오른쪽이 잘려 안 보이는» 화면이 무더기로 생긴다.
            가로로 나란히 놓인 칸(flex)은 기본값이 «내용보다 좁아지지 않기»라, 안쪽에 넓은 표나
            안 잘리는 긴 글자가 하나만 있어도 main 이 화면 밖까지 늘어난다.
            그런데 옆으로 밀 수도 없어서(부모가 안 넘치게 잘라냄) 그 부분은 «영영 못 보는 영역»이 된다.
            2026-08-04 실측(412px 폰): /admin/khidi/cases 662px · /admin/audit 659px · /admin/rag 1166px
            → 전부 오른쪽이 잘려 있었다. 이 한 줄이 관리자 화면 전부를 한 번에 고친다. 지우지 마라. */}
        <main className="flex-1 min-w-0 pt-14 lg:pt-0">
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
