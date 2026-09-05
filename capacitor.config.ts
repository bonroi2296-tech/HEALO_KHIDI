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
  // 🔴 2026-08-31: 여기가 'public' 이라 **앱 파일이 79MB 였다.**
  //    캡시터는 webDir 을 통째로 복사하는데, public 에는 웹사이트 사진이 74.6MB 들어 있다
  //    (immune 43.9MB · images 15.1MB · doctors 15.0MB). 이 앱은 라이브로드라 화면도 사진도
  //    server.url 에서 받으므로 **그 74MB 는 앱 안에서 한 번도 안 열린다.**
  //    앱이 로컬에서 실제로 여는 것은 아래 errorPath(offline.html) 하나뿐이다.
  //    → 그 파일만 담은 폴더를 빌드 때 만든다(`npm run cap:sync`, scripts/prepare-native-webdir.mjs).
  //    ⚠️ 이 값을 'public' 으로 되돌리지 마라 — 설치 크기가 82.7MB 로 돌아간다.
  webDir: 'native-webdir',
  server: {
    url: 'https://healwith.co.kr',
    androidScheme: 'https',
    // ⚠️ 구글 주소를 여기 넣지 마라 — 넣으면 구글 로그인이 «앱 안»에서 열리는데,
    //    구글은 앱에 박힌 브라우저(웹뷰) 안에서의 로그인을 정책으로 막는다.
    //    2026-08-04 실측: 앱 안에서 로그인 화면까지는 뜨지만 다음 단계
    //    `accounts.google.com/signin/oauth/consent` 에서 «400 Bad Request» 로 끝난다
    //    (PO 실기기 + 흉내기 양쪽에서 같은 주소로 재현).
    //
    //    그래서 바깥 로그인은 **일부러 시스템 브라우저(크롬)로 내보낸다.** 캡시터는 여기 없는
    //    호스트로의 이동을 만나면 앱 밖 브라우저로 던진다.
    //    돌아오는 길: 구글 → Supabase(callback) → healwith.co.kr/auth/callback →
    //    안드로이드가 **앱 링크**로 이 주소를 앱에 돌려준다(AndroidManifest 의 autoVerify).
    //    🔒 그 돌려주기가 되려면 사이트가 앱을 인정해야 한다 →
    //       `/.well-known/assetlinks.json` 에 서명 지문이 들어 있어야 한다
    //       (환경변수 ANDROID_APP_FINGERPRINTS. 2026-08-04 채워 넣음).
    //       ⚠️ 안드로이드는 «설치할 때» 이 파일을 확인한다 → 파일이 살아난 «뒤에» 앱을 깔아야 한다.
    //
    //    2026-07-28 에 목록을 넣었던 이유(「세션이 크롬에 생겨 앱은 로그아웃」)는
    //    앱 링크가 검증되면 해소된다 — 그때는 지문 파일이 비어 있어서 안 됐던 것이다.
    //
    // 🍎 **애플은 구글과 다르다. 애플 주소는 반드시 여기 있어야 한다** (2026-08-20 실측으로 추가).
    //    증상: 앱에서 「Apple로 계속하기」를 누르면 「Apple 연결 중...」에서 **영영 멈춘다.**
    //         아이폰·갤럭시 앱 양쪽 다 그랬고, 같은 폰의 브라우저에서는 정상이었다.
    //    원인: 이 목록이 비어 있으니 캡시터가 애플 주소를 «앱 밖 브라우저»로 던진다. 로그인은
    //         거기서 끝나고 세션도 거기 생긴다 → 앱은 계속 「연결 중」인 채로 남는다.
    //         (PC 크롬으로 실측한 이동 주소:
    //          appleid.apple.com/auth/authorize?client_id=kr.co.healwith.app.web
    //            &redirect_uri=https://hvwwlkawaxabhtumjhrg.supabase.co/auth/v1/callback)
    //    왜 구글과 갈리나: 구글은 «웹뷰 안 로그인»을 정책으로 막지만(위 400 사고),
    //         **애플은 막지 않는다.** 그러니 애플만 앱 안에서 끝내는 것이 옳고, 그러면
    //         「나갔다 앱 링크로 돌아오는」 길을 아예 안 타므로 실패할 자리가 하나 줄어든다.
    //    🔒 보안 경계이므로 **딱 두 호스트만** 넣는다(와일드카드 금지):
    //       ① 애플 로그인 화면 ② 그 결과를 받아 우리 도메인으로 돌려보내는 Supabase 중간 단계.
    //       supabase 를 넣어도 구글 흐름은 안 바뀐다 — accounts.google.com 이 여전히 목록에 없어서
    //       구글은 그대로 바깥 브라우저로 나간다.
    //    ⚠️ 이건 앱 껍데기 설정이라 **앱 파일을 새로 구워야 폰에 간다.** 웹 배포로는 안 간다.
    //
    // 🔴 **2026-08-28 정정: 위 8/20 고침은 문제를 «반만» 고친 것이었다.**
    //    「연결 중」에서 영영 멈추는 것은 없앴지만, 아이폰은 그 다음에 애플 로그인을
    //    「웹 화면 이동」이 아니라 **「시스템 창」으로 가로챈다.** 그래서 얼굴 인식까지 성공한 뒤
    //    그 결과가 우리 서버로 돌아오지 못한다.
    //      실측(실기기 촬영본 + Supabase 기록 대조): 3분 동안 `/auth/v1/authorize` **3건**,
    //      `/auth/v1/callback` **0건**. 화면에는 아래 errorPath(오프라인 안내)가 떴다.
    //    → **아이폰은 이제 웹뷰를 안 거치고 네이티브 창을 직접 쓴다**
    //      (`src/lib/auth/appleNativeSignIn.ts`).
    //
    // 🔴 **2026-08-30 정정: 안드로이드 구글도 네이티브로 옮겼다** (`src/lib/auth/googleNativeSignIn.ts`).
    //    ⚠️ 위 8/28 판에 적혀 있던 「안드로이드는 여전히 웹 흐름이다」는 **이제 틀린 말이다.**
    //    🛑 **`accounts.google.com` 을 이 목록에 «추가하지 마라» — 넣어도 안 고쳐진다.**
    //       막힌 곳이 「이동 허용」이 아니라 **PKCE 검증값이 갈리는 것**이기 때문이다: 구글은 앱 웹뷰
    //       로그인을 정책으로 막아 크롬으로 내보내는데, 돌아오는 `/auth/callback` 도 크롬에서 열린다.
    //       그런데 code_verifier 는 «앱 웹뷰 쿠키»에 있어 크롬엔 없다 → 교환이 그 자리에서 실패한다.
    //       실측(2026-08-29): Supabase 는 login 성공(provider=google), Vercel 은
    //       "PKCE code verifier not found in storage". 같은 24시간 안에 끝까지 간 건 0건.
    //    지우지도 마라: 네이티브 부품이 없는 **옛 앱 판**은 아직 애플 웹 흐름을 탄다.
    allowNavigation: [
      'appleid.apple.com',
      'hvwwlkawaxabhtumjhrg.supabase.co',
    ],
    // 인터넷이 끊겨 사이트를 못 불러오면 «하얀 화면» 대신 이 로컬 파일을 띄운다.
    // 파일은 webDir(=public) 안에 있어 앱에 같이 포장된다. 홈화면 추가(PWA)의
    // 오프라인 화면(public/sw.js)과 **같은 파일**을 쓴다 — 두 벌로 갈라지지 않게.
    errorPath: 'offline.html',
  },
  // 웹이 «지금 앱 안에서 열렸는지» 확실히 알 수 있게 표식을 붙인다(브라우저 주소창 문자열에 추가).
  // 라이브로드라 웹과 앱이 같은 화면을 쓰는데, 앱에선 빼야 하는 UI(예: 쿠키 동의 배너)가 있다.
  // ⚠️ 이 문자열을 바꾸면 src/lib/isNativeApp.ts 도 같이 바꿔라(둘이 짝).
  appendUserAgent: 'healwith-app',
  plugins: {
    SplashScreen: {
      // ⚠️ 2026-07-28 에뮬레이터에서 «시작화면이 영영 안 걷혀 앱을 못 쓰는» 사고를 실제로 냈다.
      //    범인은 `showSpinner: true` — 두 번의 실패/한 번의 성공으로 좁혀진 유일한 변수다.
      //      실패① launchAutoHide:false + showSpinner:true → 갇힘
      //      실패② launchAutoHide:true  + showSpinner:true → 갇힘
      //      성공③ (기본)             + showSpinner:false → 정상
      //    안드로이드 12+ 의 시스템 시작화면과 겹치면서 안 사라진다.
      //    **showSpinner 를 켜지 마라. launchAutoHide 를 false 로 두지도 마라.**
      //
      //    저속 회선의 흰 화면은 스피너가 아니라 «웹이 준비되면 우리가 걷는 방식»으로 푼다
      //    → src/lib/app/hideSplash.ts (ClientShell 에서 호출). 이 값은 안전망일 뿐이다.
      launchShowDuration: 3000,
      backgroundColor: '#0d9488',
      showSpinner: false,
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
    // 우리가 «실제로 쓰는» 소셜 로그인만 켠다 — 구글(안드로이드)·애플(아이폰·안드로이드).
    //
    // 🔴 왜 명시해야 하나 (2026-09-02 실측). 이 블록이 없으면 부품이 자기 기본값을 쓰는데,
    //    그 기본값은 **네 공급자를 전부 켠다**(`scripts/configure-dependencies.js` 의
    //    `defaultProviders`). 그래서 안 쓰는 페이스북 SDK 가 앱에 실렸고, 그 SDK 가 매니페스트에
    //    광고 ID 권한 4개를 끌고 들어왔다 —
    //      com.google.android.gms.permission.AD_ID · ACCESS_ADSERVICES_AD_ID
    //      · ACCESS_ADSERVICES_ATTRIBUTION · ACCESS_ADSERVICES_CUSTOM_AUDIENCE
    //    그 결과 Play 가 「광고 ID 선언이 불완전함」으로 **프로덕션 검토 제출을 막았다**(판 12·13).
    //    앱에 페이스북 앱 번호가 없어 그 SDK 는 초기화조차 못 했다 = 기능 0, 비용만 있었다.
    //
    // 🛑 **`android/gradle.properties` 에 `socialLogin.facebook.include=false` 를 적지 마라 —
    //    안 먹는다.** 부품은 «자기 폴더»의 gradle.properties 를 보고, 그 파일은 `npx cap sync`
    //    때 이 블록을 읽어 hook 스크립트가 «다시 쓴다». 앱 쪽 gradle.properties 는 쳐다보지 않는다.
    //    (판 13 을 그렇게 구웠다가 권한이 그대로인 것을 AAB 매니페스트 실측으로 잡았다.)
    //
    //    웹사이트 메타 픽셀(`app/AnalyticsWrapper.jsx`)과는 무관하다 — 그건 브라우저 자바스크립트다.
    //    나중에 «앱 설치 광고»를 돌리려면 facebook 을 true 로 되돌리고, 페이스북 앱 번호를 넣고,
    //    데이터 보안 양식·개인정보 방침에 광고 ID 항목을 반영해야 한다(셋을 같이 해야 한다).
    SocialLogin: {
      providers: {
        google: true,
        apple: true,
        facebook: false,
        twitter: false,
      },
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
    // 🔴 captureInput 은 «끈다»(기본값). 2026-08-14 PO 갤럭시 S25 Ultra 실기기 사고의 범인.
    //    이 옵션은 원래 «하드웨어 키보드(블루투스 자판)» 입력을 웹뷰가 가로채게 하는 것인데,
    //    켜두면 «화면 키보드»의 입력·포커스 처리와 부딪힌다. 실제로 난 증상:
    //      · 아이디 칸에 친 글자가 비밀번호 칸으로, 비밀번호 칸에 친 게 아이디 칸으로 «서로 바뀜»
    //      · 쳐도 화면에 안 나타나다가 다른 곳을 눌러야 그제서야 나타남
    //    ⚠️ 같은 폰의 «크롬»에서는 멀쩡했다 — 이 설정이 앱(웹뷰)에만 있기 때문이다.
    //    ⚠️ 가상 폰(흉내기)에서는 재현이 «안 된다» — 흉내기는 PC 자판을 하드웨어 키보드로
    //       인식해서 이 옵션이 원래 노리는 환경이 되기 때문. 재현 3회 실패의 이유가 이것이었다.
    //    되살리려면 실기기에서 화면 키보드로 한글 입력을 반드시 먼저 확인해라.
    webContentsDebuggingEnabled: false,
  },
};

export default config;
