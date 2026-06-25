'use client';

/**
 * 환자용 인앱 알림 벨 — 공용 NotificationBell(variant="fixed") 래퍼.
 * (직원 상단바는 variant="inline" 로 같은 컴포넌트 재사용.)
 */

import NotificationBell from '@/components/NotificationBell';

export default function PatientNotificationBell() {
  return <NotificationBell variant="fixed" />;
}
