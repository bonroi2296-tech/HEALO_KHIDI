"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n/LangContext";
import { pickInstallTarget } from "@/lib/appInstall";
import { INSTALL_COPY } from "../InstallPrompt";

// 이 페이지 전용 문구. 전역 사전 대신 여기 두는 이유 = InstallPrompt.INSTALL_COPY 와 같은 방식으로
// «설치 안내»만 한 곳에 모아두기 위함(6개 언어 중복·누락 방지).
const COPY = {
  ko: {
    title: "healwith 앱 설치",
    lead: "한국 병원 정보·상담·화상 진료를 폰에서 바로.",
    android: "아래 버튼을 누르면 홈 화면에 추가됩니다.",
    androidManual: "버튼이 안 보이면 크롬 메뉴에서 ‘앱 설치’ 또는 ‘홈 화면에 추가’를 눌러주세요.",
    desktop: "휴대폰 브라우저에서 아래 주소를 열면 설치할 수 있습니다.",
    moving: "스토어로 이동 중입니다.",
    openStore: "스토어 열기",
  },
  en: {
    title: "Install the healwith app",
    lead: "Korean hospital information, consultations and video visits on your phone.",
    android: "Tap the button below to add it to your home screen.",
    androidManual: "If the button does not appear, open the Chrome menu and choose ‘Install app’ or ‘Add to Home screen’.",
    desktop: "Open the address below in your phone’s browser to install it.",
    moving: "Opening the store.",
    openStore: "Open the store",
  },
  ru: {
    title: "Установите приложение healwith",
    lead: "Информация о клиниках Кореи, консультации и видеоприёмы — на вашем телефоне.",
    android: "Нажмите кнопку ниже, чтобы добавить приложение на главный экран.",
    androidManual: "Если кнопки нет, откройте меню Chrome и выберите «Установить приложение» или «Добавить на главный экран».",
    desktop: "Откройте адрес ниже в браузере телефона, чтобы установить приложение.",
    moving: "Открываем магазин приложений.",
    openStore: "Открыть магазин",
  },
  kz: {
    title: "healwith қолданбасын орнатыңыз",
    lead: "Корея клиникалары туралы ақпарат, консультация және бейнеқабылдау — телефоныңызда.",
    android: "Негізгі экранға қосу үшін төмендегі түймені басыңыз.",
    androidManual: "Түйме көрінбесе, Chrome мәзірінен «Қолданбаны орнату» немесе «Негізгі экранға қосу» тармағын таңдаңыз.",
    desktop: "Орнату үшін төмендегі мекенжайды телефон браузерінде ашыңыз.",
    moving: "Дүкен ашылып жатыр.",
    openStore: "Дүкенді ашу",
  },
  zh: {
    title: "安装 healwith 应用",
    lead: "在手机上查看韩国医院信息、咨询与视频问诊。",
    android: "点击下方按钮即可添加到主屏幕。",
    androidManual: "如果没有出现按钮，请打开 Chrome 菜单并选择“安装应用”或“添加到主屏幕”。",
    desktop: "请在手机浏览器中打开下方网址进行安装。",
    moving: "正在打开应用商店。",
    openStore: "打开应用商店",
  },
  ja: {
    title: "healwith アプリをインストール",
    lead: "韓国の病院情報・相談・オンライン診療をスマホから。",
    android: "下のボタンを押すとホーム画面に追加されます。",
    androidManual: "ボタンが表示されない場合は、Chrome メニューから「アプリをインストール」または「ホーム画面に追加」を選んでください。",
    desktop: "インストールするには、スマホのブラウザで下のアドレスを開いてください。",
    moving: "ストアを開いています。",
    openStore: "ストアを開く",
  },
};

const SHORT_URL = "healwith.co.kr/app";

export default function AppInstallClient() {
  const lang = useLang();
  const c = COPY[lang] || COPY.en;
  const inst = INSTALL_COPY[lang] || INSTALL_COPY.en;

  const [target, setTarget] = useState(null); // null = 아직 기기 판별 전(서버·첫 페인트)
  const [deferred, setDeferred] = useState(null); // 안드로이드 설치 이벤트

  useEffect(() => {
    const picked = pickInstallTarget(
      navigator.userAgent || "",
      { play: process.env.NEXT_PUBLIC_PLAY_STORE_URL, appStore: process.env.NEXT_PUBLIC_APP_STORE_URL },
      navigator.maxTouchPoints || 0
    );
    setTarget(picked);

    // 스토어 주소가 채워진 뒤엔 이 페이지가 «지나가는 문»이 된다 — 바로 보낸다.
    if (picked.kind === "store") window.location.replace(picked.url);
  }, []);

  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setDeferred(e); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  // 기기 판별 전에는 문구를 확정할 수 없다 — 빈 화면 대신 제목만 먼저 보여준다(DESIGN.md: 빈 화면 금지).
  const body = !target ? null : target.kind === "store" ? (
    <div className="space-y-4">
      <p className="text-sm md:text-base text-gray-700">{c.moving}</p>
      <a
        href={target.url}
        className="inline-flex items-center rounded-xl bg-teal-700 px-6 py-3 text-white font-semibold shadow-sm transition-all duration-200 hover:bg-teal-800"
      >
        {c.openStore}
      </a>
    </div>
  ) : target.platform === "ios" ? (
    <div className="space-y-3">
      <p className="text-sm md:text-base text-gray-700">
        {inst.iosBody}{inst.iosBody2}
      </p>
    </div>
  ) : target.platform === "android" ? (
    <div className="space-y-4">
      <p className="text-sm md:text-base text-gray-700">{c.android}</p>
      {deferred ? (
        <button
          type="button"
          onClick={() => { deferred.prompt(); setDeferred(null); }}
          className="inline-flex items-center rounded-xl bg-teal-700 px-6 py-3 text-white font-semibold shadow-sm transition-all duration-200 hover:bg-teal-800"
        >
          {inst.cta}
        </button>
      ) : (
        <p className="text-sm text-gray-500">{c.androidManual}</p>
      )}
    </div>
  ) : (
    <div className="space-y-3">
      <p className="text-sm md:text-base text-gray-700">{c.desktop}</p>
      <p className="text-lg md:text-xl font-bold text-gray-900 tabular-nums">{SHORT_URL}</p>
    </div>
  );

  return (
    <div className="max-w-xl mx-auto px-4 py-10 md:py-16">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{c.title}</h1>
      <p className="mt-3 text-sm md:text-base text-gray-500">{c.lead}</p>
      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-5 md:p-8 shadow-sm">{body}</div>
    </div>
  );
}
