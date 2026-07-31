'use client';

/**
 * healwith: 「폰 알림이 꺼져 있다」 알려주는 줄 (스태프 화면 상단)
 *
 * 왜 있나 (2026-07-31): 앱은 처음 열릴 때 딱 한 번 «알림 보낼까요?»를 묻고, 놓치면 다시 안 묻는다.
 * 설정 화면(/coordinator/settings)이 켜고 끄는 «자리»이고, 이 줄은 **거기로 가는 안내**다.
 * 켜는 동작을 여기서도 하면 같은 일이 두 군데로 갈라진다 → 여긴 링크만.
 *
 * - 앱(Capacitor) 안에서만, 알림이 꺼져 있을 때만 보인다. 브라우저면 아무것도 안 그린다.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useBackofficeLang } from '@/lib/i18n/coordinator';

const TR = {
  ko: { msg: '이 폰은 상담 30분 전 알림을 못 받습니다.', btn: '설정에서 켜기' },
  en: { msg: "This phone won't get the 30-minute reminder.", btn: 'Turn on in Settings' },
  ru: { msg: 'На этот телефон не придёт напоминание за 30 минут.', btn: 'Включить в настройках' },
  kz: { msg: 'Бұл телефонға 30 минут бұрынғы еске салғыш келмейді.', btn: 'Параметрлерден қосу' },
  zh: { msg: '这台手机收不到会诊前 30 分钟提醒。', btn: '在设置中开启' },
  ja: { msg: 'この端末は30分前のリマインダーを受け取れません。', btn: '設定でオンにする' },
};

export default function PushOptInBanner() {
  const lang = useBackofficeLang();
  const t = (k) => (TR[lang] || TR.en)[k] ?? TR.en[k];
  const [show, setShow] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return; // 브라우저면 끝
        const { PushNotifications } = await import('@capacitor/push-notifications');
        const perm = await PushNotifications.checkPermissions();
        if (alive && perm.receive !== 'granted') setShow(true);
      } catch {
        /* 앱 아님·플러그인 없음 → 안 그림 */
      }
    })();
    return () => { alive = false; };
  }, []);

  if (!show) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
      <span className="text-sm text-amber-900">{t('msg')}</span>
      <Link
        href="/coordinator/settings"
        className="ml-auto rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-700"
      >
        {t('btn')}
      </Link>
    </div>
  );
}
