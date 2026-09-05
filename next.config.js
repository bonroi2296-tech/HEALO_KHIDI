import path from "node:path";
import { fileURLToPath } from "node:url";

// 이 저장소는 ESM 이라 __dirname 이 없다 (2026-07-27 #999 에서 한 번 터진 부류).
const HERE = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
// 이미지 최적화기(/_next/image)가 받아올 Supabase 호스트 — «우리 프로젝트 하나»만 (2026-09-05).
// 왜: 8/26 AVIF 결함(libheif RCE) 때 성립 조건 ⓒ가 «*.supabase.co 와일드카드라 공격자가 자기 Supabase
//     프로젝트에 올린 그림도 우리 최적화기가 받아온다»였다. 결함은 16.3.4 로 닫았지만 문은 그대로였다.
//     실측(2026-09-05): DB 의 그림 URL 칸 8개 전부 절대 URL 0건, 코드의 next/image 원격 src 도 우리 자산뿐.
// 어떻게: 빌드 시 env 에서 호스트를 읽는다(Vercel 엔 항상 있다). env 가 없는 빈 로컬에선 예전 와일드카드로
//     두어 깨지지 않게 한다 — 좁히기가 «못 그리는 화면»을 만들면 안 된다.
const supabaseImageHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '').hostname || '';
  } catch {
    return '';
  }
})();

const nextConfig = {
  // 지금 실서비스로 돌고 있는 커밋을 **빌드 시점에 박아둔다**.
  // 왜: 예비 배포 창구(.github/workflows/daily-deploy.yml)가 /api/health 의 commit 값으로
  //     «이미 나갔나»를 판정하는데, 그 값을 process.env.VERCEL_GIT_COMMIT_SHA 하나에만 기대면
  //     Vercel 프로젝트의 «시스템 변수 자동 노출»이 꺼져 있을 때 실행 중에 비어버린다.
  //     비면 창구가 «모르면 짓는다»로 **매일 같은 코드를 또 짓는다** — 방금 고친 그 버그가 그대로 재발.
  //     빌드 시점 값은 그 설정과 무관하게 항상 박힌다(공개 저장소라 커밋 번호는 비밀이 아니다).
  env: {
    BUILD_COMMIT: process.env.VERCEL_GIT_COMMIT_SHA || "",
  },
  // ✅ 성능 최적화: 코드 스플리팅 및 번들 최적화
  webpack: (config, { isServer, dev, webpack }) => {
    // @sentry/nextjs 가 @prisma/instrumentation + @opentelemetry/instrumentation (postgres.js)
    // 를 선택적으로 import — 이 프로젝트는 Prisma / postgres.js 미사용 (Supabase 사용) →
    // webpack "Critical dependency" 경고 제거.
    config.plugins = config.plugins || [];
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^(@prisma\/instrumentation|@opentelemetry\/instrumentation)$/,
      })
    );

    if (!isServer) {
      // ⭐ 21개 언어 통짜 사전을 브라우저 번들에서 제외 (2026-07-27).
      // 방문자는 자기 언어 1개만 필요한데 전부 받고 있었다(홈 첫 화면 JS 623KB 중 269KB).
      // 클라이언트 빌드에서만 진짜 사전을 빈 껍데기로 바꿔치기하고, 브라우저는
      // app/i18n/[lang]/route.js 가 주는 «자기 언어 완성본» 하나만 받는다.
      // ⚠️ 이 별칭을 지우면 269KB 가 조용히 전 페이지로 되돌아온다 — CI 가드 §32 가 감시한다.
      config.resolve.alias = {
        ...config.resolve.alias,
        [path.resolve(HERE, 'src/lib/i18n/dictionary.js')]:
          path.resolve(HERE, 'src/lib/i18n/dictionary.client.js'),
      };

      // 클라이언트 사이드 번들 최적화
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // React 관련 라이브러리 분리
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom|react-router-dom)[\\/]/,
              name: 'react-vendor',
              priority: 30,
              reuseExistingChunk: true,
            },
            // Supabase 분리
            supabase: {
              test: /[\\/]node_modules[\\/]@supabase[\\/]/,
              name: 'supabase-vendor',
              priority: 25,
              reuseExistingChunk: true,
            },
            // AI SDK 분리
            ai: {
              test: /[\\/]node_modules[\\/](@ai-sdk|ai)[\\/]/,
              name: 'ai-vendor',
              priority: 20,
              reuseExistingChunk: true,
            },
            // Google Maps 분리 (무거운 라이브러리)
            googleMaps: {
              test: /[\\/]node_modules[\\/]@react-google-maps[\\/]/,
              name: 'google-maps-vendor',
              priority: 20,
              reuseExistingChunk: true,
            },
            // 무거운 라우트 전용 라이브러리 분리 — 공개 홈이 통째로 받지 않도록
            // (exceljs=어드민 엑셀, recharts=환자 대시보드, livekit=영상방 전용)
            excel: {
              test: /[\\/]node_modules[\\/]exceljs[\\/]/,
              name: 'excel-vendor',
              priority: 24,
              reuseExistingChunk: true,
            },
            charts: {
              test: /[\\/]node_modules[\\/](recharts|victory-vendor|d3-[^\\/]+|internmap)[\\/]/,
              name: 'charts-vendor',
              priority: 24,
              reuseExistingChunk: true,
            },
            livekit: {
              test: /[\\/]node_modules[\\/](@livekit|livekit-client)[\\/]/,
              name: 'livekit-vendor',
              priority: 24,
              reuseExistingChunk: true,
            },
            // 기타 vendor — 이름을 주지 않는 게 핵심(2026-07-27 PageSpeed 실측).
            // name:'vendor' 를 박아두면 「위에서 안 걸린 node_modules 전부」가 사이트 단 하나의
            // 406KB 덩어리로 뭉쳐 모든 페이지가 통째로 받는다. 홈에선 그중 323KB(80%)가
            // 안 쓰이는 코드였다. 이름을 빼면 webpack 이 페이지별로 쪼개고 공통분만 공유한다.
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              priority: 10,
              reuseExistingChunk: true,
            },
          },
        },
      };

      // ✅ 프로덕션에서 Next.js DevTools 제외 (unused-javascript 개선)
      if (!dev) {
        config.resolve.alias = {
          ...config.resolve.alias,
          'next/dist/compiled/next-devtools': false,
        };
      }
    }
    return config;
  },

  // ✅ 정적 자산 캐시 헤더 설정 (배포 환경)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // 우리 화면 안에 «우리 화면»만 띄울 수 있다(코디 콘텐츠 편집기의 미리보기).
          // 남의 사이트가 우리를 씌워 클릭을 가로채는 공격(클릭재킹)은 그대로 막힌다 —
          // 막는 대상이 «모든 곳»에서 «우리 아닌 곳»으로 좁아졌을 뿐이다. 2026-08-03.
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // maps.googleapis.com·maps.gstatic.com: 병원/암종 상세 위치 지도(Google Maps JS) — script-src에 없으면 지도 스크립트가 차단돼 회색 fallback만 뜸
              // mc.yandex.ru: Yandex Metrica 태그(러시아/CIS). connect-src 와 짝 — 둘 중 하나만 열면 안 돈다.
              // connect.facebook.net: Meta 픽셀 태그(fbevents.js). **connect-src 의 www.facebook.com 과 짝이다.**
              //   2026-08-28 실측으로 잡은 것: 픽셀 코드를 다 붙이고 로컬 프로덕션 빌드로 재보니
              //   「Loading the script … violates … script-src」로 **통째로 차단**돼 있었다. 화면은 멀쩡했고
              //   콘솔을 안 봤으면 배포 뒤에도 «광고 성과 0» 을 성과가 없는 걸로 오독했을 것이다.
              //   ⚠️ 겹이 둘이다 — script-src(태그 싣기) + connect-src(이벤트 보내기). 하나만 열면 안 돈다.
              //   img-src 는 지금 `https:` 전체 허용이라 따로 안 적었다. **img-src 를 좁히게 되면
              //   www.facebook.com 을 반드시 같이 넣어라** — 픽셀은 비콘 이미지로도 발화한다.
              // blob:  화상상담 잡음 제거(Krisp)가 소리 처리기(AudioWorklet)를 blob: 로 만들어 싣는다.
              //   ⚠️ 워크릿 모듈은 worker-src 가 아니라 **script-src** 로 검사된다 — 아래 worker-src 에
              //      blob: 이 있어도 여기 없으면 막힌다. 그리고 이 차단은 «보안정책 위반» 사건을 안 내고
              //      `AbortError: Unable to load a worklet's module` 이라는 엉뚱한 이름으로만 나온다.
              //   2026-08-03 실측으로 가름(같은 브라우저·같은 코드):
              //      · 우리 사이트 + 같은 출처 워크릿 → 성공   (브라우저·CSP 다 정상)
              //      · 우리 사이트 + blob: 워크릿      → 실패
              //      · 규칙 없는 사이트 + blob: 워크릿 → 성공  ⇒ 범인은 우리 script-src
              //   같은 날 #1237 이 connect-src 에 integrations.livekit.io 를 열어 «파일 받기»는 됐지만
              //   (실측: 요청 2건 200), 그 다음 «실행» 칸이 안 열려 잡음 제거는 여전히 안 켜졌다.
              //   위험 평가: 이 줄엔 이미 'unsafe-inline' 이 있어 blob: 추가가 늘리는 공격면은 그보다 작다.
              // 'wasm-unsafe-eval'  잡음 제거(Krisp)의 소리 모델은 WebAssembly 다. 브라우저는 WebAssembly
              //   컴파일도 「스크립트 실행」으로 보고 script-src 로 검사한다 — 이 낱말이 없으면 막힌다.
              //   ⚠️ 'unsafe-eval'(문자열을 코드로 실행) 과 다르다. 'wasm-unsafe-eval' 은 **WebAssembly 만**
              //      허용하고 eval() 은 계속 막는다 — 좁은 쪽을 골랐다.
              //   2026-08-03 실측: blob: 을 연 «뒤에» 실서비스 상담방에서 나온 다음 벽이 이것이다.
              //     `WebAssembly.Module(): … violates … because 'unsafe-eval' is not an allowed source`
              //   같은 날 겪은 세 번째 겹이다: ①connect-src(파일 받기) ②script-src blob:(워크릿 싣기)
              //     ③여기(모델 돌리기). **「한 겹 열었다 = 기능이 켜졌다」로 넘기지 마라 — 매번 실제로 재라.**
              `script-src 'self' 'unsafe-inline' blob: 'wasm-unsafe-eval' ${process.env.NODE_ENV === 'development' ? "'unsafe-eval'" : ''} https://www.googletagmanager.com https://mc.yandex.ru https://cdn.jsdelivr.net https://maps.googleapis.com https://maps.gstatic.com https://connect.facebook.net`,
              "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
              "img-src 'self' data: blob: https: http:",
              "font-src 'self' https://cdn.jsdelivr.net",
              // Sentry 에러 수집 ingest 도메인 허용 — CSP 가 전송을 막으면 에러 보고가 조용히 버려짐
              //
              // ⚠️ GA4 도 똑같이 «조용히 버려지는» 부류다 (2026-07-28 발견).
              //   예전엔 www.google-analytics.com 하나만 열려 있었는데, GA4(gtag.js)는 방문자 지역·
              //   설정에 따라 **다른 호스트로 수집 요청을 보낸다**:
              //     - region1~N.google-analytics.com  (지역 라우팅. EEA 방문자에 주로 사용)
              //     - analytics.google.com            (일부 구성)
              //   CSP 에 없으면 브라우저가 그 전송만 막고 콘솔에만 조용히 남는다 — GA 화면에는
              //   "데이터 없음"이 아니라 «그 지역만 빠진 숫자»로 보여 알아채기가 특히 어렵다.
              //   → 와일드카드로 계열 호스트를 함께 연다.
              // mc.yandex.ru: 러시아/CIS 핵심시장용 Yandex Metrica. AnalyticsWrapper 에 코드는 이미
              //   있으나 CSP 에 없어 env 를 넣어도 동작하지 않는 상태였다(스크립트 로드부터 차단).
              // integrations.livekit.io: 화상상담 잡음 제거(Krisp)가 켜질 때 여기로 요청을 보낸다.
              //   ⚠️ 빠져 있으면 잡음 제거가 **조용히 안 켜진다** — 켜기 실패는 통화를 안 끊으려고
              //   일부러 삼키게 돼 있어(page.jsx NoiseFilter) 화면엔 아무 표시도 안 난다.
              //   실제로 2026-07-28 에 켠 이래 실서비스에서 한 번도 돈 적이 없었다(2026-08-03 발각:
              //   야간 로봇 통화 로그 + 실서비스 상담방에서 직접 찔러 «차단됨» 확인).
              //   배경 소음이 그대로 마이크로 나가면 자막(음성인식) 오인식으로 직결된다.
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.livekit.cloud wss://*.livekit.cloud https://integrations.livekit.io https://generativelanguage.googleapis.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://mc.yandex.ru https://mc.yandex.com https://cdn.jsdelivr.net https://*.ingest.sentry.io https://*.ingest.de.sentry.io https://maps.googleapis.com https://maps.gstatic.com https://www.facebook.com",
              "media-src 'self' blob:",
              // ⚠️ worker-src 를 안 적으면 script-src 로 폴백돼 **blob: 워커가 전부 차단된다**
              //    (2026-07-28 안드로이드 에뮬레이터 콘솔에서 발각 — 브라우저에서도 나던 것을 아무도 안 봤다).
              //    막히던 것: **센트리 세션 리플레이의 압축 워커**. 우리는 `replaysOnErrorSampleRate: 1.0`
              //    이라 실서비스에서 오류가 날 때마다 화면 녹화를 남기게 해뒀는데, 압축 워커가 막혀
              //    매 방문마다 콘솔에 CSP 위반이 찍히고 리플레이가 반쪽으로 돌았다.
              //    → 우리 출처와 blob: 만 연다(외부 도메인 워커는 계속 차단).
              "worker-src 'self' blob:",
              // 소견 화면의 «미리보기» — 첨부 PDF 를 내려받지 않고 그 자리에서 띄운다(PO 요청 2026-08-04).
              //   frame-src 를 안 적으면 default-src 'self' 로 폴백돼 **우리 저장소 PDF 도 막힌다**
              //   (실측: 미리보기 창은 열리는데 안이 하얗다). 여는 건 우리 저장소 하나뿐 — 외부는 계속 차단.
              // www.facebook.com: Meta 픽셀이 «숨은 iframe» 을 띄운다(쿠키 동기화). 2026-08-28 실측 3번째 겹.
              "frame-src 'self' https://*.supabase.co https://www.facebook.com blob:",
              // 같은 사유 — 편집기 미리보기용. 외부 사이트의 씌우기는 계속 차단.
              "frame-ancestors 'self'",
              "base-uri 'self'",
              // www.facebook.com: Meta 픽셀은 이벤트를 «form POST» 로도 보낸다 — 2026-08-28 실측 4번째 겹.
              //   콘솔 원문: Sending form data to 'https://www.facebook.com/tr/' violates … "form-action 'self'"
              //   ⚠️ img-src 가 `https:` 전체 허용이라 «비콘으로는 나가겠지» 싶었는데 실제로는 0건이었다.
              //      픽셀이 어느 방식을 고를지는 우리가 못 정한다 → 네 겹을 다 열어야 실제로 돈다.
              "form-action 'self' https://www.facebook.com",
            ].join('; '),
          },
        ],
      },
      {
        // 상담실: 카메라/마이크 허용 (WebRTC + STT)
        source: '/consultation/:path*',
        headers: [
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=()' },
        ],
      },
      {
        // ⭐ 「원본을 길게 캐시해야 최적화본도 길게 캐시된다」 (2026-07-27 실측으로 알아낸 것)
        //
        // Vercel 의 이미지 최적화기는 원본을 자기 배포에서 가져올 때 **원본의 Cache-Control 을
        // 그대로 물려준다**. 그래서 원본이 1시간이면 `/_next/image?...` 응답도 1시간이 되고,
        // next.config 의 `images.minimumCacheTTL`(1년)은 서버 캐시만 바꿔서 아무 소용이 없다.
        // → 재방문자가 최적화 이미지를 매번 다시 받았다 (PageSpeed 실측 122KiB).
        // ⚠️ 로컬 `next start` 에서는 이 물려받기가 안 일어난다(로컬은 1년으로 잘 나옴).
        //    **프로덕션/프리뷰에 올려서 curl 로 확인하지 않으면 못 잡는 부류다.**
        //
        // 그래서 «절대 늦게 추가되지 않는» 확정 자산 폴더만 30일로 올린다.
        // (아래 일반 이미지 규칙이 1시간인 이유 = 404가 길게 박제되는 사고 방지 —
        //  나중에 파일이 추가되는 /images/hospitals 같은 경로는 계속 1시간으로 둔다.)
        source: '/:dir(immune|brand)/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=2592000, stale-while-revalidate=86400' },
        ],
      },
      {
        // 이미지 「원본」 파일 캐시 — immutable 금지 (404가 1년 캐시되어 파일 추가 후에도
        // 깨진 채 고정되는 문제 방지). 짧게 캐시하고 백그라운드 재검증.
        // `(?!immune/|brand/)` = 위 규칙과 겹치지 않게 명시적으로 뺀 것(둘 다 걸릴 때 어느 쪽이
        // 이기는지에 기대지 않으려고 — 순서 규칙에 의존하면 나중에 조용히 뒤집힌다).
        source: '/:path((?!immune/|brand/).*)\\.(jpg|jpeg|png|gif|webp|svg|ico)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        // 폰트 파일 캐시
        source: '/:path*\\.(woff|woff2|ttf|otf|eot)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // ✅ 프로덕션 빌드 최적화
  productionBrowserSourceMaps: false, // 소스맵 비활성화 (valid-source-maps 개선: 빈 소스맵 에러 방지)

  // ✅ 개발 도구 제외 (unused-javascript 개선)
  reactStrictMode: true,

  // ✅ 이미지 최적화
  images: {
    formats: ['image/avif', 'image/webp'],
    // 최적화된 이미지는 1년 캐시 — 아래 headers() 의 「원본 이미지 1시간」 규칙과 달리 안전하다.
    // /_next/image 주소엔 배포ID(?dpl=)가 붙어 배포할 때마다 주소가 바뀜(자동 캐시버스팅) →
    // 404 가 1년 박제되는 그 문제가 안 생긴다. 안 걸면 재방문자도 매번 다시 받는다
    // (2026-07-27 PageSpeed 실측: 재다운로드 888KB).
    minimumCacheTTL: 31536000,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      // 우리 Supabase 프로젝트 호스트만(위 supabaseImageHost 주석). env 없으면 예전 와일드카드.
      ...(supabaseImageHost
        ? [{ protocol: 'https', hostname: supabaseImageHost }]
        : [
            { protocol: 'https', hostname: '*.supabase.co' },
            { protocol: 'https', hostname: '*.supabase.in' },
          ]),
      { protocol: 'https', hostname: 'maps.googleapis.com' },
      { protocol: 'https', hostname: 'maps.gstatic.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: '*.livekit.cloud' },
      { protocol: 'https', hostname: 'cdn.jsdelivr.net' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },

  // PDF 발급 함수에 셀프호스팅 폰트(TTF) 동봉 — 없으면 Vercel 서버리스에서
  // 폰트 파일을 못 읽어 한글·키릴이 다시 깨짐 (파일은 fs로 읽혀 자동 추적 안 됨).
  outputFileTracingIncludes: {
    "/api/pdf/**": ["./src/lib/pdf/fonts/*.ttf"],
    "/api/khidi/**": ["./src/lib/pdf/fonts/*.ttf"],
  },

  // ✅ 실험적 기능 (성능 최적화)
  experimental: {
    optimizePackageImports: ['lucide-react', '@supabase/supabase-js'],
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },

  /**
   * ✅ P0 수정: 타입 체크 설정 (현재 상태)
   * 
   * 현재 문제:
   * - Supabase 스키마 타입이 정의되지 않음 (database.types.ts 없음)
   * - 타입 생성 필요: `supabase gen types typescript --project-id [PROJECT_ID]`
   * 
   * 임시 조치:
   * - ignoreBuildErrors: true로 유지 (Supabase 타입 생성 전까지)
   * - 하지만 각 API route에서 런타임 검증을 강화함:
   *   1. assertEncryptionKey() - 암호화 키 검증
   *   2. assertSupabaseEnv() - DB 환경변수 검증
   *   3. 모든 중요한 처리에서 에러 시 500 반환 (fail-closed)
   * 
   * 다음 단계 (별도 작업):
   * 1. Supabase CLI로 타입 생성: npx supabase gen types typescript
   * 2. database.types.ts 파일 추가
   * 3. createClient<Database>() 타입 파라미터 추가
   * 4. ignoreBuildErrors: false로 변경
   * 
   * 중요:
   * - 타입 에러는 있지만, 런타임 안전성은 확보됨 (P0 수정 완료)
   * - 데이터 유실 방지, Fail-Closed 원칙 적용 완료
   */
  /**
   * ✅ 2026-04-20: ignoreBuildErrors: false 로 전환
   *
   * - database.types.ts 생성 및 모든 클라이언트 팩토리에 타입 바인딩 완료
   * - tsconfig.json strictNullChecks: true 활성화
   * - 앱 코드 type error 233 → 0 (scripts/ 는 exclude)
   * - 이후 `npm run build` 는 타입 에러 시 실패함 (의도된 동작)
   */
  typescript: {
    ignoreBuildErrors: false,
  },

  // Sentry(@sentry/nextjs)가 의존하는 OpenTelemetry 계열을 번들에서 제외 —
  // 빌드 chunks 에 require 주입되며 "Cannot find module" 나던 문제의 해법.
  serverExternalPackages: [
    // mupdf 는 WASM 이라 번들러가 건드리면 .wasm 을 잃는다 — 서버에서 그대로 불러오게 둔다.
    // (큰 스캔 PDF 를 AI 가 읽을 수 있게 줄이는 데 쓴다 — src/lib/documents/aiReadable.ts)
    "mupdf",
    // node-unrar-js 도 WASM. 번들러가 .wasm 을 «모듈»로 삼키려다 실패한다
    // (Turbopack: "Module not found: Can't resolve 'a'"). 서버에서 그대로 불러오게 둔다.
    "node-unrar-js",
    "@sentry/nextjs",
    "@opentelemetry/instrumentation",
    "import-in-the-middle",
    "require-in-the-middle",
    // 웹팩 서버 번들이 react-pdf 를 말아넣으면 Next 내장(vendored) React 와 인스턴스가
    // 갈려 renderToBuffer 가 React error #31 로 즉사(배포 환경 전용 — dev/Turbopack 은 정상).
    // 발급 PDF(견적서·동의서·초청장) 500 의 근본원인. node_modules 그대로 실행해야 함.
    "@react-pdf/renderer",
  ],
  // 면력 지점 상세 4개 → 통합 브랜드 페이지(/hospitals/immune) 영구 이동.
  // 지점 페이지는 서버 HTML 이 얇아 구글엔 빈 페이지였고, 가짜 의료진("Medical Team")·
  // 한국어 이름만 떴다. 브랜드 페이지가 "Immune Hospital" 이름·대표원장 4명·전 콘텐츠를
  // 담고 있어 그리로 모은다. permanent=true → 308(구글은 301 처럼 취급, 링크 신호 이관).
  // 피벗 전 한방 프로그램 상세 6개 → 한방 특화 페이지. treatments 테이블을 비우면서
  // 상세가 통째로 사라져 구글이 옛 URL 을 계속 훑다 404(2026-07 GSC «찾을 수 없음» 6건).
  // 사이트 안엔 이 링크가 없다 = 구글의 옛 기억 → 301 로 주제 상위 페이지에 흡수시킨다.
  async redirects() {
    const branches = ["magok", "sinchon", "gwangmyeong", "seongdong"];
    const oldPrograms = [
      "immune-boost-program",
      "pediatric-growth-immune-program",
      "wellness-detox-body-rebalance",
      "anti-aging-herbal-therapy",
      "fertility-support-program",
      "postpartum-recovery-program",
    ];
    return [
      ...branches.flatMap((b) => [
        { source: `/hospitals/immunehospital-${b}`, destination: "/hospitals/immune", permanent: true },
        { source: `/:locale/hospitals/immunehospital-${b}`, destination: "/:locale/hospitals/immune", permanent: true },
      ]),
      ...oldPrograms.flatMap((s) => [
        { source: `/treatments/${s}`, destination: "/specialties/korean-medicine", permanent: true },
        { source: `/:locale/treatments/${s}`, destination: "/:locale/specialties/korean-medicine", permanent: true },
      ]),
    ];
  },
};

// 2026-06-12: Sentry 재활성 (serverExternalPackages 로 OpenTelemetry 충돌 해소).
// NEXT_PUBLIC_SENTRY_DSN 이 설정된 경우에만 래핑 — env 없으면 기존과 동일하게 동작.
import { withSentryConfig } from "@sentry/nextjs";
const sentryConfig = { silent: true, org: process.env.SENTRY_ORG, project: process.env.SENTRY_PROJECT };
const sentryOptions = { widenClientFileUpload: true, tunnelRoute: "/monitoring", hideSourceMaps: true, disableLogger: true };
const finalConfig = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryConfig, sentryOptions)
  : nextConfig;

export default finalConfig;
