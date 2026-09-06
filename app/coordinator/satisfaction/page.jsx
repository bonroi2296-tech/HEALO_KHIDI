"use client";

// 코디네이터 「사후관리·만족도」 — 2026-09-06 부터 이름값을 한다.
// 전에는 어드민 만족도 대시보드를 그대로 재사용해(2026-07-15) «사후관리» 항목이 없었다.
// 탭 ①사후관리 보드(재진 요청·증상 기록·케이던스) ②만족도(기존 화면). 관리자도 같은 화면을 연다.

import { useState } from "react";
import PostcareBoard from "@/components/postcare/PostcareBoard";
import SatisfactionPage from "../../admin/khidi/satisfaction/page";

export default function CoordinatorPostcarePage() {
  const [tab, setTab] = useState("postcare");
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900">사후관리 · 만족도</h1>
      <div className="mt-4 flex gap-1 border-b border-gray-200">
        {[["postcare", "사후관리 보드"], ["satisfaction", "만족도"]].map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${tab === k ? "border-teal-700 text-teal-800" : "border-transparent text-gray-500 hover:text-gray-800"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-6">{tab === "postcare" ? <PostcareBoard /> : <SatisfactionPage />}</div>
    </div>
  );
}
