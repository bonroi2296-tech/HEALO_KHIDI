'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { t } from '@/lib/i18n';
import { useLang } from '@/lib/i18n/LangContext';
import {
  Home, FileText, BookOpen, Activity, Calendar, Globe,
  MoreHorizontal, X, ShieldCheck, Phone,
} from 'lucide-react';
import PatientNotificationBell from '@/components/patient/PatientNotificationBell';

// 탭 라벨은 중앙 i18n 사전 patientLayout.tab.* 키(6개 활성언어 ko·en·ru·kz·zh·ja)
const PRIMARY_TABS = [
  { href: '/patient', icon: Home, labelKey: 'patientLayout.tab.home' },
  { href: '/patient/documents', icon: FileText, labelKey: 'patientLayout.tab.docs' },
];

const MORE_TABS = [
  { href: '/education', icon: BookOpen, labelKey: 'patientLayout.tab.cancerGuide' },
  { href: '/patient/symptoms', icon: Activity, labelKey: 'patientLayout.tab.symptoms' },
  { href: '/patient/rebooking', icon: Calendar, labelKey: 'patientLayout.tab.rebooking' },
  { href: '/visa', icon: Globe, labelKey: 'patientLayout.tab.visaGuide' },
  { href: '/patient/account', icon: ShieldCheck, labelKey: 'patientLayout.tab.account' },
  // 응급 동선. 상시 노출(플로팅 버튼·헤더 전화번호)은 DESIGN.md brand_misuse 금지라
  // 「더보기」 안에 둔다 — 착지점 상단에 걸 수 있는 번호가 있다.
  { href: '/medical-disclaimer', icon: Phone, labelKey: 'patientLayout.tab.emergency' },
];

export default function PatientLayout({ children }) {
  const pathname = usePathname();
  // ⚠️ 렌더 중에 getLangCodeFromCookie() 를 부르면 안 된다 — 서버엔 document 가 없어 'en',
  //    브라우저는 쿠키값('ko' 등) → 탭 라벨이 서버/클라 다르게 그려져 Hydration Error.
  //    useLang() 은 LangProvider 가 useSyncExternalStore 로 관리하는 값을 읽는다 — 하이드레이션
  //    시점엔 서버값, 그 뒤 쿠키값(안전). ⚠️ LangProvider 밖에서 부르면 경고 없이 'en' 으로 굳으니
  //    이 컴포넌트가 ClientShell(=LangProvider) 하위인지 확인하고 쓸 것.
  const lang = useLang();
  const l = (obj) => obj?.[lang] || obj?.['en'] || '';
  const [moreOpen, setMoreOpen] = useState(false);
  const sheetRef = useRef(null);

  // Close sheet on route change
  useEffect(() => { setMoreOpen(false); }, [pathname]);

  // Close on outside click
  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [moreOpen]);

  const isMoreActive = MORE_TABS.some(tab => pathname === tab.href || pathname.startsWith(tab.href + '/'));

  return (
    <div className="min-h-screen bg-gray-50 pt-14 md:pt-16 pb-20 lg:pb-0">
      <PatientNotificationBell />
      {children}

      {/* More menu overlay */}
      {moreOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/40 z-40 animate-in fade-in duration-200" />
      )}

      {/* More menu sheet */}
      {moreOpen && (
        <div
          ref={sheetRef}
          className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-300 pb-safe"
        >
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <span className="text-sm font-semibold text-gray-500">{t("patientLayout.more", lang)}</span>
            <button
              onClick={() => setMoreOpen(false)}
              className="p-1.5 rounded-full hover:bg-gray-100 transition"
            >
              <X size={18} className="text-gray-500" />
            </button>
          </div>
          <div className="px-3 pb-4 grid grid-cols-2 gap-2">
            {MORE_TABS.map(tab => {
              const Icon = tab.icon;
              const active = pathname === tab.href || pathname.startsWith(tab.href + '/');
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${
                    active
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={20} className={active ? 'text-teal-700' : 'text-gray-500'} />
                  <span className="text-sm font-medium">{l(tab.label)}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom tab bar (mobile) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 pb-safe">
        <div className="flex justify-around items-center h-16">
          {PRIMARY_TABS.map(tab => {
            const Icon = tab.icon;
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[44px] rounded-xl px-2 py-1.5 transition-all ${
                  active ? 'text-teal-700' : 'text-gray-500 hover:text-gray-600'
                }`}
              >
                <div className={`p-1 rounded-lg transition-all ${active ? 'bg-teal-50' : ''}`}>
                  <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                </div>
                <span className="text-[10px] font-medium leading-tight">{l(tab.label)}</span>
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[44px] rounded-xl px-2 py-1.5 transition-all ${
              isMoreActive || moreOpen ? 'text-teal-700' : 'text-gray-500 hover:text-gray-600'
            }`}
          >
            <div className={`p-1 rounded-lg transition-all ${isMoreActive || moreOpen ? 'bg-teal-50' : ''}`}>
              <MoreHorizontal size={22} strokeWidth={isMoreActive || moreOpen ? 2.5 : 2} />
            </div>
            <span className="text-[10px] font-medium leading-tight">{t("patientLayout.more", lang)}</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
