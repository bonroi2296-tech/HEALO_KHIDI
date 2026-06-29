'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getLangCodeFromCookie } from '@/lib/i18n';
import {
  Home, FileText, BookOpen, Activity, Calendar, Globe,
  MoreHorizontal, X, ShieldCheck,
} from 'lucide-react';
import PatientNotificationBell from '@/components/patient/PatientNotificationBell';

const PRIMARY_TABS = [
  { href: '/patient', icon: Home, label: { ko: '홈', en: 'Home', ru: 'Главная', kz: 'Басты', zh: '首页', ja: 'ホーム' } },
  { href: '/patient/documents', icon: FileText, label: { ko: '문서', en: 'Docs', ru: 'Документы', kz: 'Құжаттар', zh: '文档', ja: '文書' } },
];

const MORE_TABS = [
  { href: '/education', icon: BookOpen, label: { ko: '건강 교육', en: 'Education', ru: 'Обучение', kz: 'Білім', zh: '教育', ja: '教育' } },
  { href: '/patient/symptoms', icon: Activity, label: { ko: '증상 기록', en: 'Symptoms', ru: 'Симптомы', kz: 'Белгілер', zh: '症状', ja: '症状' } },
  { href: '/patient/rebooking', icon: Calendar, label: { ko: '재진 예약', en: 'Rebooking', ru: 'Запись', kz: 'Қайта жазу', zh: '复诊', ja: '再診' } },
  { href: '/visa', icon: Globe, label: { ko: '비자 가이드', en: 'Visa Guide', ru: 'Виза', kz: 'Виза', zh: '签证指南', ja: 'ビザ' } },
  { href: '/patient/account', icon: ShieldCheck, label: { ko: '계정·개인정보', en: 'Account & Privacy', ru: 'Аккаунт', kz: 'Аккаунт', zh: '账户与隐私', ja: 'アカウント' } },
];

const MORE_LABEL = { ko: '더보기', en: 'More', ru: 'Ещё', kz: 'Көбірек', zh: '更多', ja: 'もっと' };

export default function PatientLayout({ children }) {
  const pathname = usePathname();
  const lang = getLangCodeFromCookie?.() || 'en';
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
            <span className="text-sm font-semibold text-gray-500">{l(MORE_LABEL)}</span>
            <button
              onClick={() => setMoreOpen(false)}
              className="p-1.5 rounded-full hover:bg-gray-100 transition"
            >
              <X size={18} className="text-gray-400" />
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
                  <Icon size={20} className={active ? 'text-teal-700' : 'text-gray-400'} />
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
                  active ? 'text-teal-700' : 'text-gray-400 hover:text-gray-600'
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
              isMoreActive || moreOpen ? 'text-teal-700' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className={`p-1 rounded-lg transition-all ${isMoreActive || moreOpen ? 'bg-teal-50' : ''}`}>
              <MoreHorizontal size={22} strokeWidth={isMoreActive || moreOpen ? 2.5 : 2} />
            </div>
            <span className="text-[10px] font-medium leading-tight">{l(MORE_LABEL)}</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
