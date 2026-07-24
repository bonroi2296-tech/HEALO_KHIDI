"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  Building2,
  HeartPulse,
  Video,
  BarChart3,
  Brain,
  ArrowRight
} from "lucide-react";
import { AdminGuideModal } from "./_components/AdminGuideModal";

// 2026-07-24 메뉴 정리(리뉴얼 2단계)와 용어 통일 — 사이드바 라벨과 같은 이름을 쓴다.
const quickLinks = [
  { title: "Human Agent 채널", href: "/admin/agent", icon: HeartPulse, description: "에스컬레이션 응대" },
  { title: "화상 상담", href: "/admin/consultations", icon: Video, description: "상담 세션 모니터링" },
  { title: "문의 관리", href: "/admin/inquiries", icon: MessageSquare, description: "환자 문의 핸드오프" },
  { title: "제휴 병원", href: "/admin/hospitals", icon: Building2, description: "제휴 병원 정보" },
  { title: "문의 통계", href: "/admin/analytics", icon: BarChart3, description: "인사이트 보기" },
  { title: "AI 지식베이스", href: "/admin/rag", icon: Brain, description: "AI 관리" },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [showGuide, setShowGuide] = useState(false);

  return (
    <div className="space-y-6 lg:space-y-8">
      {showGuide && (
        <AdminGuideModal title="대시보드 가이드" onClose={() => setShowGuide(false)}>
          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">이 페이지는 무엇인가요?</h3>
            <p>healwith 관리자 포털의 <strong>홈</strong>입니다. 자주 쓰는 메뉴로 빠르게 이동할 수 있습니다.</p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">카드 사용법</h3>
            <p>각 카드를 클릭하면 해당 화면(문의 관리, 화상 상담, 제휴 병원, 문의 통계, AI 지식베이스 등)으로 이동합니다. 좌측 사이드바에서도 동일한 메뉴에 접근할 수 있습니다.</p>
          </section>
          <section className="bg-teal-50 rounded-lg p-4">
            <h3 className="text-base font-semibold text-teal-800 mb-1">추가 메뉴</h3>
            <p className="text-teal-700 text-sm">좌측 메뉴는 홈 / 상담·문의 / 파트너·회원 / 콘텐츠 / AI 품질 / 시스템 6묶음입니다. 안 쓰는 옛 도구(대량 Import·플레이북·크롤링 등)는 2026-07 메뉴 정리로 숨겨졌습니다 — 삭제가 아니라 비활성이라 필요하면 복구할 수 있어요.</p>
          </section>
        </AdminGuideModal>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">관리자 대시보드</h1>
          <p className="text-gray-500 mt-1 lg:mt-2 text-sm lg:text-base">healwith 플랫폼 관리</p>
        </div>
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 transition text-sm font-medium flex-shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          사용 가이드
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <button
              key={link.href}
              onClick={() => router.push(link.href)}
              className="bg-white p-4 lg:p-6 rounded-xl border border-gray-200 hover:border-teal-300 hover:shadow-lg transition text-left group min-h-[100px] sm:min-h-[120px] lg:min-h-0"
            >
              <Icon size={28} className="text-teal-700 mb-2 lg:mb-4 lg:w-9 lg:h-9" />
              <h3 className="text-sm lg:text-lg font-bold text-gray-900 mb-1 lg:mb-2 group-hover:text-teal-700 transition">
                {link.title}
              </h3>
              <p className="text-xs lg:text-sm text-gray-500 mb-2 lg:mb-4 hidden sm:block">{link.description}</p>
              <div className="flex items-center text-teal-700 text-xs lg:text-sm font-medium">
                바로가기 <ArrowRight size={14} className="ml-1 group-hover:translate-x-1 transition" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
