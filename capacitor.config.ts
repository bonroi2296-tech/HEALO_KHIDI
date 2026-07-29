/**
 * healwith: Capacitor Configuration
 *
 * iOS/Android 스토어 앱 설정.
 *
 * 전략: 이 앱은 Next.js SSR(서버렌더·API·미들웨어)이라 정적추출(static export)이 불가능.
 * 따라서 네이티브 셸이 **라이브 사이트(https://healwith.co.kr)를 로드**한다(server.url).
 * → 웹을 고치면 앱도 자동 반영(네이티브 재제출 불필요).
 * → 단, 애플 가이드라인 4.2(웹뷰 래퍼 반려)를 피하려면 네이티브 가치(푸시 알림 등)가 필요.
 *
 * 빌드 플로우:
 * 1. npx cap add android        (Windows OK)
 * 2. npx cap add ios            (템플릿만 생성; 실제 빌드는 macOS/클라우드 맥 필요)
 * 3. npx cap sync               (플러그인·설정 동기화)
 * 4. Android: Android Studio / Gradle 로 빌드·서명 → Play Console 제출
 *    iOS: 클라우드 맥 빌드(Codemagic/Appflow) 또는 맥에서 Xcode → App Store 제출
 */

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'kr.co.healwith.app',
  appName: 'healwith',
  // SSR 앱이라 정적 번들이 없음 → server.url 로 라이브 사이트를 로드.
  // webDir 는 Capacitor 가 형식상 요구하므로 기존 public 을 가리킴(실제 미사용).
  webDir: 'public',
  server: {
    url: 'https://healwith.co.kr',
    androidScheme: 'https',
  },
  // 웹이 «지금 앱 안에서 열렸는지» 확실히 알 수 있게 표식을 붙인다(브라우저 주소창 문자열에 추가).
  // 라이브로드라 웹과 앱이 같은 화면을 쓰는데, 앱에선 빼야 하는 UI(예: 쿠키 동의 배너)가 있다.
  // ⚠️ 이 문자열을 바꾸면 src/lib/isNativeApp.ts 도 같이 바꿔라(둘이 짝).
  appendUserAgent: 'healwith-app',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0d9488',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#0d9488',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
  ios: {
    contentInset: 'always',
    allowsLinkPreview: true,
    scheme: 'healwith',
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
