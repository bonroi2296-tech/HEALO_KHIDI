'use client';

import { Phone } from 'lucide-react';
import { getEmergencyNumbers } from '@/lib/legal/medicalDisclaimer';

/**
 * 응급 전화번호 tel: 링크 목록.
 *
 * urgent=true  — 증상 기록이 'emergency' 로 판정한 순간용(빨강 강조, DESIGN.md emergency_color red-500)
 * urgent=false — 의료 고지 페이지의 상시 목록(차분한 톤)
 *
 * 번호는 src/lib/legal/medicalDisclaimer.js 의 EMERGENCY_NUMBERS 한 곳에서만 온다.
 */
export default function EmergencyNumbers({ lang = 'en', urgent = false }) {
  return (
    <div className="flex flex-wrap gap-2">
      {getEmergencyNumbers(lang).map((n) => (
        <a
          key={`${n.code}-${n.tel}`}
          href={`tel:${n.tel}`}
          // min-h-44 = 모바일 최소 탭 타깃. 앱에서 가장 급한 동작이라 작게 두면 안 된다
          // (하단탭도 같은 44 기준). 러시아어가 제일 길어 줄바꿈 여지를 둔다.
          className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 ${
            urgent
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Phone size={14} className={urgent ? '' : 'text-red-600'} />
          <span>{n.label}</span>
          <span className="tabular-nums">{n.tel}</span>
        </a>
      ))}
    </div>
  );
}
