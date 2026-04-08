'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getLangCodeFromCookie } from '../../src/lib/i18n';
import {
  Home, FileText, BookOpen, Activity, Calendar, Globe, MessageSquare,
} from 'lucide-react';

const TABS = [
  { href: '/patient', icon: Home, label: { ko: '홈', en: 'Home', ru: 'Главная', kz: 'Басты', zh: '首页', ja: 'ホーム' } },
  { href: '/patient/chat', icon: MessageSquare, label: { ko: 'AI상담', en: 'AI Chat', ru: 'AI Чат', kz: 'AI Чат', zh: 'AI咨询', ja: 'AI相談' } },
  { href: '/patient/documents', icon: FileText, label: { ko: '문서', en: 'Docs', ru: 'Документы', kz: 'Құжаттар', zh: '文档', ja: '文書' } },
  { href: '/patient/education', icon: BookOpen, label: { ko: '교육', en: 'Education', ru: 'Обучение', kz: 'Білім', zh: '教育', ja: '教育' } },
  { href: '/patient/symptoms', icon: Activity, label: { ko: '증상', en: 'Symptoms', ru: 'Симптомы', kz: 'Белгілер', zh: '症状', ja: '症状' } },
  { href: '/patient/rebooking', icon: Calendar, label: { ko: '재진', en: 'Rebooking', ru: 'Запись', kz: 'Қайта жазу', zh: '复诊', ja: '再診' } },
  { href: '/patient/visa', icon: Globe, label: { ko: '비자', en: 'Visa', ru: 'Виза', kz: 'Виза', zh: '签证', ja: 'ビザ' } },
];

export default function PatientLayout({ children }) {
  const pathname = usePathname();
  const lang = getLangCodeFromCookie?.() || 'en';
  const l = (obj) => obj?.[lang] || obj?.['en'] || '';

  return (
    <div className="min-h-screen bg-gray-50 pb-20 lg:pb-0">
      {children}

      {/* Bottom tab bar (mobile) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 pb-safe-area">
        <div className="flex justify-around items-center h-14">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 min-w-[48px] ${
                  active ? 'text-teal-600' : 'text-gray-400'
                }`}
              >
                <Icon size={20} />
                <span className="text-[10px] font-medium">{l(tab.label)}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
