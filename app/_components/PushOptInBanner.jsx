'use client';

/**
 * healwith: 폰 알림 켜기 줄 (스태프 화면 상단)
 *
 * 왜 만들었나 (2026-07-31, PO: «알림 허용 기능이 있나?»):
 *   앱을 처음 열 때 안드로이드/아이폰이 «알림 보낼까요?»를 한 번 묻는데,
 *   **그때 못 보고 지나가면 앱이 다시는 안 묻는다.** 그래서 앱을 깔았는데도
 *   등록된 기기가 0대였고, 켜는 방법도 화면 어디에도 없었다.
 *
 * 동작:
 *   - 앱(Capacitor) 안에서만 보인다. 브라우저면 아무것도 안 그린다.
 *   - 이미 켜져 있으면 안 보인다(잔소리 금지).
 *   - 「폰 알림 켜기」를 누르면 다시 묻는다. 예전에 «거부»를 눌렀으면 운영체제가
 *     다시 안 물으므로, 그땐 «폰 설정에서 켜라»고 알려준다.
 */

import { useEffect, useState } from 'react';

export default function PushOptInBanner() {
  // 'hidden' = 안 그림 / 'ask' = 켜기 버튼 / 'blocked' = 폰 설정에서 켜야 함
  const [state, setState] = useState('hidden');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return; // 브라우저면 끝
        const { PushNotifications } = await import('@capacitor/push-notifications');
        const perm = await PushNotifications.checkPermissions();
        if (!alive) return;
        if (perm.receive === 'granted') return; // 이미 켜짐 → 조용
        setState(perm.receive === 'denied' ? 'blocked' : 'ask');
      } catch {
        /* 앱 아님·플러그인 없음 → 안 그림 */
      }
    })();
    return () => { alive = false; };
  }, []);

  if (state === 'hidden') return null;

  const turnOn = async () => {
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      const perm = await PushNotifications.requestPermissions();
      if (perm.receive !== 'granted') {
        setState('blocked');
        return;
      }
      // 권한을 받았으니 이제 이 폰을 서버에 등록한다(앱 시작 때 한 번 막혔던 그 단계).
      const m = await import('@/lib/push/registerPush');
      await m.registerPushNotifications();
      setState('hidden');
    } catch {
      setState('blocked');
    }
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
      <span className="text-sm text-amber-900">
        {state === 'ask'
          ? '이 폰은 상담 30분 전 알림을 못 받습니다.'
          : '폰 알림이 꺼져 있습니다. 폰 설정 → healwith → 알림을 켜주세요.'}
      </span>
      {state === 'ask' && (
        <button
          type="button"
          onClick={turnOn}
          className="ml-auto rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-700"
        >
          폰 알림 켜기
        </button>
      )}
    </div>
  );
}
