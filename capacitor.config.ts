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
    // ⚠️ 이 목록이 없으면 «구글 로그인이 앱에서 원천적으로 안 된다» (2026-07-28 확인).
    //    캡시터는 server.url 과 호스트가 다른 이동을 만나면 앱 안에서 열지 않고
    //    시스템 브라우저로 던진다(안드로이드 Bridge.java / iOS WebViewDelegationHandler.swift).
    //    → 사용자는 크롬·사파리에서 로그인하고, 세션 쿠키도 거기 생겨 앱은 로그아웃 그대로였다.
    //    OAuth 왕복 경로: 우리 도메인 → Supabase(authorize) → 구글 → Supabase(callback) → 우리 도메인.
    //    🔒 보안 경계이므로 **꼭 필요한 호스트만** 넣는다(와일드카드로 넓히지 말 것).
    allowNavigation: [
      'accounts.google.com',
      'hvwwlkawaxabhtumjhrg.supabase.co',
    ],
    // 인터넷이 끊겨 사이트를 못 불러오면 «하얀 화면» 대신 이 로컬 파일을 띄운다.
    // 파일은 webDir(=public) 안에 있어 앱에 같이 포장된다. 홈화면 추가(PWA)의
    // 오프라인 화면(public/sw.js)과 **같은 파일**을 쓴다 — 두 벌로 갈라지지 않게.
    errorPath: 'offline.html',
  },
  plugins: {
    SplashScreen: {
      // 라이브 로드라 첫 화면은 «네트워크가 끝나야» 뜬다. 카자흐·러시아 저속 회선에서
      // 2초 뒤 자동으로 걷히면 흰 화면을 보게 된다 → 자동 숨김을 끄고, 웹이 뜨는 순간
      // 캡시터가 걷도록 둔다(최대 대기는 launchShowDuration).
      launchShowDuration: 8000,
      launchAutoHide: false,
      backgroundColor: '#0d9488',
      showSpinner: true,
      androidSpinnerStyle: 'small',
      iosSpinnerStyle: 'small',
      spinnerColor: '#ffffff',
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      // style: 'LIGHT' = 「밝은 배경」이라는 뜻 → 글자·아이콘이 검게 나온다.
      // 우리 헤더가 teal-100(연한 민트)이라 이게 맞다.
      // (backgroundColor 는 안드로이드 15+ 에서 API 가 사라져 무효라 제거했다 — 2026-07-28)
      style: 'LIGHT',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    // ⚠️ Keyboard 블록을 통째로 뺐다 (2026-07-28, PO 실기기에서 로그인 불가로 발견).
    //    - `resizeOnFullScreen: true` 는 «웹뷰가 키보드에 맞춰 안 줄어들던» 옛 안드로이드 버그용
    //      우회책인데, 캡시터 8 의 SystemBars 가 이미 키보드 여백(IME inset)을 스스로 처리한다.
    //      둘이 겹쳐 두 번 줄이면서 화면이 거의 0 높이로 무너졌다.
    //    - `resize: 'body'` 는 **iOS 전용**이고 기본값은 'native'. 'body' 는 <body> 만 줄이고
    //      뷰포트는 그대로라 `position: fixed` 인 하단 바들이 키보드를 안 따라온다.
    //    → 양쪽 다 «캡시터 기본 동작»에 맡긴다. 되살릴 거면 실기기 확인부터.
  },
  ios: {
    // 기본값('automatic')으로 되돌림 (2026-07-28). 'always' 는 아이폰이 안전영역만큼
    // 내용을 «네이티브로» 밀어내는데, 우리 헤더는 CSS 로도 pt-safe-area 를 줘서
    // 노치·다이나믹 아일랜드 기기에서 여백이 두 번 들어갈 위험이 있었다.
    // (아이폰 실기기가 없어 확정은 못 했다 — 기본값이 안전한 쪽이라 기본값을 택한다.)
    contentInset: 'automatic',
    // 링크를 길게 누르면 사파리식 미리보기가 떠서 «웹을 감쌌다»는 티가 난다(애플 4.2 방어에 불리).
    allowsLinkPreview: false,
    scheme: 'healwith',
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
