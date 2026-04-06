'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, FileText, BookOpen, Activity, Calendar, Globe,
} from 'lucide-react';

const TABS = [
  { href: '/patient', icon: Home, label: '홈' },
  { href: '/patient/documents', icon: FileText, label: '문서' },
  { href: '/patient/education', icon: BookOpen, label: '교육' },
  { href: '/patient/symptoms', icon: Activity, label: '증상' },
  { href: '/patient/rebooking', icon: Calendar, label: '재진' },
  { href: '/patient/visa', icon: Globe, label: '비자' },
];

export default function PatientLayout({ children }) {
  const pathname = usePathname();

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
                <span className="text-[10px] font-medium">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
