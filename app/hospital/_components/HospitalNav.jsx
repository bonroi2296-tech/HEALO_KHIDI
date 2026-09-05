"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  MessageSquare,
  Building2,
  Stethoscope,
  LogOut,
  KeyRound,
  Menu,
  X,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { usePortalContext } from "../../_components/PortalGate";
import { HOSPITAL_CONTENT_ENABLED } from "./featureFlags";

// KHIDI 방향성 기준 메뉴
// - 병원 정보·시술 카탈로그는 공개 프론트 미연동 → HOSPITAL_CONTENT_ENABLED 로 가림 (featureFlags.js)
const navItems = [
  { id: "dashboard", label: "대시보드", icon: LayoutDashboard, href: "/hospital" },
  { id: "leads", label: "진료 의뢰(리드)", icon: MessageSquare, href: "/hospital/leads" },
  { id: "profile", label: "병원 정보", icon: Building2, href: "/hospital/profile", contentFeature: true },
  { id: "treatments", label: "시술 카탈로그", icon: Stethoscope, href: "/hospital/treatments", contentFeature: true },
].filter((item) => HOSPITAL_CONTENT_ENABLED || !item.contentFeature);

export function HospitalNav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const hospitalInfo = usePortalContext();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isMobileOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const navContent = (
    <>
      <div className="p-4 lg:p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 lg:w-10 lg:h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-sm">
              <Building2 size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm lg:text-base font-bold text-gray-900 truncate max-w-[160px]">
                {hospitalInfo?.hospitalName || "병원 포털"}
              </h1>
              <p className="text-[10px] lg:text-xs text-gray-500">Hospital Portal</p>
            </div>
          </div>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-2 text-gray-500 hover:text-gray-600 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <nav className="flex-1 p-3 lg:p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/hospital" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`w-full flex items-center gap-3 px-3 lg:px-4 py-2.5 rounded-lg text-sm font-medium transition-all min-h-[44px] lg:min-h-0 items-center ${
                isActive
                  ? "bg-teal-50 text-teal-700 shadow-sm"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Icon size={18} className={isActive ? "text-teal-700" : "text-gray-500"} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 lg:p-4 border-t border-gray-200 pb-safe-area space-y-1">
        <Link
          href="/account/password"
          className="w-full flex items-center gap-3 px-3 lg:px-4 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-all min-h-[44px] md:min-h-0"
        >
          <KeyRound size={18} />
          <span>비밀번호 변경</span>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 lg:px-4 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-700 transition-all min-h-[44px] md:min-h-0"
        >
          <LogOut size={18} />
          <span>로그아웃</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar (below PortalTopBar h-12) */}
      <div className="lg:hidden fixed top-[calc(3.5rem+var(--healo-safe-top))] md:top-[calc(4rem+var(--healo-safe-top))] left-0 right-0 z-40 h-[4.5rem] bg-white border-b border-gray-200 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg flex items-center justify-center">
            <Building2 size={16} className="text-white" />
          </div>
          <span className="font-bold text-gray-900 text-sm truncate max-w-[200px]">
            {hospitalInfo?.hospitalName || "병원 포털"}
          </span>
        </div>
        <button
          onClick={() => setIsMobileOpen(true)}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsMobileOpen(false)} />
          {/* 여는 버튼(☰)이 오른쪽 위라 서랍도 오른쪽에서 나온다 (2026-08-04 PO 지적) */}
          <aside className="absolute right-0 top-0 bottom-0 w-72 bg-white flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            {navContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar (below PortalTopBar h-12) */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-gray-200 min-h-screen flex-col sticky top-16 h-[calc(100vh-4rem)]">
        {navContent}
      </aside>
    </>
  );
}
