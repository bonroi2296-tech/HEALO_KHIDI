'use client';

/**
 * healwith: 스태프 설정 화면 (어드민·코디 공용 — 어드민도 이 경로로 들어온다)
 *
 * 지금은 「폰 알림」 하나뿐이다. 왜 화면을 따로 만들었나 (2026-07-31 PO 지시):
 *   앱은 처음 열릴 때 딱 한 번 «알림 보낼까요?»를 묻고, 놓치면 다시 안 묻는다.
 *   다른 앱들처럼 **언제든 켜고 끌 수 있는 자리**가 있어야 한다.
 *
 * 켜기 = 폰에 권한 요청 + 이 기기를 서버에 등록 / 끄기 = 이 계정의 기기 등록 삭제.
 * 상태의 근거는 화면 기억이 아니라 **서버에 등록된 기기 수**다(GET /api/push/register).
 */

import { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { useBackofficeLang } from '@/lib/i18n/coordinator';

const supabase = createSupabaseBrowserClient();

const TR = {
  ko: {
    title: '설정', pushTitle: '폰 알림',
    pushDesc: '상담 시작 30분 전에 폰으로 알려줍니다.',
    on: '켜짐', off: '꺼짐', btnOn: '켜기', btnOff: '끄기',
    devicesTpl: '등록된 기기 {n}대',
    blocked: '폰에서 알림이 막혀 있습니다. 폰 설정 → healwith → 알림에서 켜주세요.',
    webOnly: '이 스위치는 폰 앱에서만 바꿀 수 있습니다. 컴퓨터에서는 현재 상태만 보입니다.',
    failed: '변경에 실패했습니다. 잠시 뒤 다시 눌러주세요.',
  },
  en: {
    title: 'Settings', pushTitle: 'Phone notifications',
    pushDesc: 'Alerts your phone 30 minutes before a consultation starts.',
    on: 'On', off: 'Off', btnOn: 'Turn on', btnOff: 'Turn off',
    devicesTpl: '{n} device(s) registered',
    blocked: 'Notifications are blocked on this phone. Enable them in Settings → healwith → Notifications.',
    webOnly: 'This switch can only be changed in the phone app. On a computer you can only see the current state.',
    failed: 'Could not change it. Please try again in a moment.',
  },
  ru: {
    title: 'Настройки', pushTitle: 'Уведомления на телефон',
    pushDesc: 'Напомним на телефон за 30 минут до начала консультации.',
    on: 'Вкл', off: 'Выкл', btnOn: 'Включить', btnOff: 'Выключить',
    devicesTpl: 'Устройств зарегистрировано: {n}',
    blocked: 'Уведомления заблокированы на телефоне. Включите их: Настройки → healwith → Уведомления.',
    webOnly: 'Этот переключатель меняется только в приложении на телефоне. На компьютере видно лишь текущее состояние.',
    failed: 'Не удалось изменить. Повторите через минуту.',
  },
  kz: {
    title: 'Параметрлер', pushTitle: 'Телефон хабарламалары',
    pushDesc: 'Кеңес басталуына 30 минут қалғанда телефонға хабарлайды.',
    on: 'Қосулы', off: 'Өшірулі', btnOn: 'Қосу', btnOff: 'Өшіру',
    devicesTpl: 'Тіркелген құрылғы: {n}',
    blocked: 'Телефонда хабарламалар бұғатталған. Параметрлер → healwith → Хабарламалар бөлімінен қосыңыз.',
    webOnly: 'Бұл ауыстырғышты тек телефон қолданбасында өзгертуге болады. Компьютерде тек күйі көрінеді.',
    failed: 'Өзгерту сәтсіз болды. Сәлден соң қайталаңыз.',
  },
  zh: {
    title: '设置', pushTitle: '手机通知',
    pushDesc: '会诊开始前 30 分钟通知您的手机。',
    on: '已开启', off: '已关闭', btnOn: '开启', btnOff: '关闭',
    devicesTpl: '已登记设备 {n} 台',
    blocked: '该手机已屏蔽通知。请在 设置 → healwith → 通知 中开启。',
    webOnly: '此开关只能在手机应用中更改，电脑上仅显示当前状态。',
    failed: '更改失败，请稍后再试。',
  },
  ja: {
    title: '設定', pushTitle: 'スマホ通知',
    pushDesc: '相談開始の30分前にスマホでお知らせします。',
    on: 'オン', off: 'オフ', btnOn: 'オンにする', btnOff: 'オフにする',
    devicesTpl: '登録済み端末 {n} 台',
    blocked: 'この端末で通知がブロックされています。設定 → healwith → 通知 からオンにしてください。',
    webOnly: 'このスイッチはスマホアプリでのみ変更できます。パソコンでは現在の状態のみ表示されます。',
    failed: '変更できませんでした。少し待って再度お試しください。',
  },
};

export default function StaffSettingsPage() {
  const lang = useBackofficeLang();
  const t = (k) => (TR[lang] || TR.en)[k] ?? TR.en[k];

  const [devices, setDevices] = useState(null); // null = 아직 모름
  const [isApp, setIsApp] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const authHeaders = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/push/register', { headers: await authHeaders() });
      const json = await res.json();
      if (json?.ok) setDevices(json.devices ?? 0);
    } catch {
      /* 조회 실패는 «모름»으로 남긴다 — 틀린 상태를 그리는 것보다 낫다 */
    }
  }, [authHeaders]);

  useEffect(() => {
    refresh();
    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;
        setIsApp(true);
        const { PushNotifications } = await import('@capacitor/push-notifications');
        const perm = await PushNotifications.checkPermissions();
        setBlocked(perm.receive === 'denied');
      } catch {
        /* 앱 아님 → 스위치는 잠긴 채로 상태만 보여준다 */
      }
    })();
  }, [refresh]);

  const turnOn = async () => {
    setBusy(true); setError('');
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      const perm = await PushNotifications.requestPermissions();
      if (perm.receive !== 'granted') { setBlocked(true); return; }
      setBlocked(false);
      const m = await import('@/lib/push/registerPush');
      await m.registerPushNotifications();
      // 기기 등록은 폰이 주소를 받아오는 만큼 늦다 — 잠깐 뒤 한 번 더 확인한다.
      await refresh();
      setTimeout(refresh, 2500);
    } catch {
      setError(t('failed'));
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/push/register', { method: 'DELETE', headers: await authHeaders() });
      const json = await res.json();
      if (!json?.ok) { setError(t('failed')); return; }
      setDevices(0);
    } catch {
      setError(t('failed'));
    } finally {
      setBusy(false);
    }
  };

  const isOn = devices !== null && devices > 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-start gap-4">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isOn ? 'bg-teal-50 text-teal-700' : 'bg-gray-100 text-gray-400'}`}>
            {isOn ? <Bell size={20} /> : <BellOff size={20} />}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-gray-900">{t('pushTitle')}</h2>
              <span className={`rounded px-2 py-0.5 text-xs font-semibold ${isOn ? 'bg-teal-100 text-teal-800' : 'bg-gray-100 text-gray-600'}`}>
                {devices === null ? '…' : isOn ? t('on') : t('off')}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-600">{t('pushDesc')}</p>
            {devices !== null && (
              <p className="mt-1 text-xs text-gray-500">{t('devicesTpl').replace('{n}', devices)}</p>
            )}
            {isApp && blocked && (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">{t('blocked')}</p>
            )}
            {!isApp && (
              <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">{t('webOnly')}</p>
            )}
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          </div>

          <button
            type="button"
            onClick={isOn ? turnOff : turnOn}
            disabled={busy || (!isApp && !isOn) || (blocked && !isOn)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300 ${isOn ? 'bg-gray-700 hover:bg-gray-800' : 'bg-teal-700 hover:bg-teal-800'}`}
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            {isOn ? t('btnOff') : t('btnOn')}
          </button>
        </div>
      </div>
    </div>
  );
}
