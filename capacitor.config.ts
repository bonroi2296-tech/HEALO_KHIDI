/**
 * HEALO: Capacitor Configuration
 *
 * iOS/Android 앱 빌드를 위한 Capacitor 설정.
 * Next.js 빌드 출력(out/)을 WebView로 감싸서 네이티브 앱 생성.
 *
 * 사전 준비:
 * 1. npm install @capacitor/core @capacitor/cli @capacitor/app @capacitor/haptics @capacitor/keyboard @capacitor/status-bar
 * 2. npm install @capacitor/push-notifications @capacitor/camera @capacitor/splash-screen
 * 3. npx cap add ios
 * 4. npx cap add android
 * 5. npx cap sync
 *
 * 빌드 플로우:
 * 1. npm run build:static  (Next.js static export)
 * 2. npx cap copy          (out/ → native projects)
 * 3. npx cap open ios      (Xcode 열기)
 * 4. npx cap open android  (Android Studio 열기)
 */

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'kr.healo.app',
  appName: 'HEALO',
  webDir: 'out',
  server: {
    // 개발 시 로컬 서버 사용 (프로덕션에서는 제거)
    // url: 'http://localhost:3000',
    // cleartext: true,
    androidScheme: 'https',
  },
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
    scheme: 'HEALO',
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
