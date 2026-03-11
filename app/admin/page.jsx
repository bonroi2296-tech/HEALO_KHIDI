"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  MessageSquare, 
  Building2, 
  Stethoscope, 
  BarChart3, 
  FileText,
  Brain,
  ArrowRight 
} from "lucide-react";
import { AdminGuideModal } from "./_components/AdminGuideModal";

const quickLinks = [
  { title: "문의관리", href: "/admin/inquiries", icon: MessageSquare, description: "고객 문의 관리" },
  { title: "병원관리", href: "/admin/hospitals", icon: Building2, description: "병원 데이터베이스" },
  { title: "시술관리", href: "/admin/treatments", icon: Stethoscope, description: "시술 카탈로그" },
  { title: "통계", href: "/admin/analytics", icon: BarChart3, description: "인사이트 보기" },
  { title: "감사로그", href: "/admin/audit", icon: FileText, description: "활동 기록" },
  { title: "RAG", href: "/admin/rag", icon: Brain, description: "AI 관리" },
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
            <p>HEALO 관리자 포털의 <strong>홈</strong>입니다. 자주 쓰는 메뉴로 빠르게 이동할 수 있습니다.</p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">카드 사용법</h3>
            <p>각 카드를 클릭하면 해당 메뉴(문의관리, 병원관리, 시술관리, 통계, 감사로그, RAG)로 이동합니다. 좌측 사이드바에서도 동일한 메뉴에 접근할 수 있습니다.</p>
          </section>
          <section className="bg-teal-50 rounded-lg p-4">
            <h3 className="text-base font-semibold text-teal-800 mb-1">추가 메뉴</h3>
            <p className="text-teal-700 text-sm">좌측 메뉴에는 대시보드에 없는 항목(리드관리, 대량 Import, 데이터 보강, 크롤링, 플레이북, 응대 패턴, 알림/브랜딩 설정 등)도 있습니다. 필요한 기능은 사이드바에서 선택하세요.</p>
          </section>
        </AdminGuideModal>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">관리자 대시보드</h1>
          <p className="text-gray-500 mt-1 lg:mt-2 text-sm lg:text-base">HEALO 플랫폼 관리</p>
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
              <Icon size={28} className="text-teal-600 mb-2 lg:mb-4 lg:w-9 lg:h-9" />
              <h3 className="text-sm lg:text-lg font-bold text-gray-900 mb-1 lg:mb-2 group-hover:text-teal-600 transition">
                {link.title}
              </h3>
              <p className="text-xs lg:text-sm text-gray-500 mb-2 lg:mb-4 hidden sm:block">{link.description}</p>
              <div className="flex items-center text-teal-600 text-xs lg:text-sm font-medium">
                바로가기 <ArrowRight size={14} className="ml-1 group-hover:translate-x-1 transition" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
