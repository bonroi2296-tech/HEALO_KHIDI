"use client";

import { HospitalGateClient } from "./_components/HospitalGateClient";
import { HospitalNav } from "./_components/HospitalNav";
import ManualDrawer from "../_components/ManualDrawer";

export default function HospitalLayout({ children }) {
  return (
    <HospitalGateClient>
      <div className="flex min-h-screen min-h-screen-safe bg-gray-50 healo-portal-offset">
        <HospitalNav />
        {/* 2026-07-28: `overflow-auto` 제거 — 코디 포털과 같은 부류(#1098).
            부모가 `flex min-h-screen` 이라 이 main 은 **자기가 스크롤한 적이 없는데**,
            overflow 가 visible 이 아니라는 이유로 CSS 상 «스크롤 상자»가 되어
            안쪽 `position: sticky` 가 움직이지 않는 상자를 기준 삼아 아예 안 붙었다.
            새로 하단/상단 고정 UI 를 넣을 때 이 값을 되살리지 말 것. */}
        {/* 위 여백 = 모바일 메뉴 줄(HospitalNav 의 h-[4.5rem]) 높이. 한쪽만 고치면 본문 윗줄이 가린다. */}
        {/* min-w-0: 이게 없으면 폰에서 «오른쪽이 잘려 안 보이는» 화면이 무더기로 생긴다.
            가로로 나란히 놓인 칸(flex)은 기본값이 «내용보다 좁아지지 않기»라, 안쪽에 넓은 표나
            안 잘리는 긴 글자가 하나만 있어도 이 칸이 화면 밖까지 늘어난다. 그런데 옆으로 밀 수도
            없어서(부모가 잘라냄) 그 부분은 «영영 못 보는 영역»이 된다.
            2026-08-04 실측(412px 폰): /admin/khidi/cases 662px · /admin/audit 659px ·
            /admin/rag 1166px · /coordinator/inbox 892px → 전부 오른쪽이 잘려 있었다. 지우지 마라. */}
        <main className="flex-1 min-w-0 pt-[4.5rem] lg:pt-0">
          <div className="px-4 sm:px-6 lg:px-8 py-4 lg:py-6 max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
      <ManualDrawer role="hospital" />
    </HospitalGateClient>
  );
}
