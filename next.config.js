import path from "node:path";
import { fileURLToPath } from "node:url";

// 이 저장소는 ESM 이라 __dirname 이 없다 (2026-07-27 #999 에서 한 번 터진 부류).
const HERE = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
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
          { key: 'X-Frame-Options', value: 'DENY' },
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
              `script-src 'self' 'unsafe-inline' ${process.env.NODE_ENV === 'development' ? "'unsafe-eval'" : ''} https://www.googletagmanager.com https://cdn.jsdelivr.net https://maps.googleapis.com https://maps.gstatic.com`,
              "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
              "img-src 'self' data: blob: https: http:",
              "font-src 'self' https://cdn.jsdelivr.net",
              // Sentry 에러 수집 ingest 도메인 허용 — CSP 가 전송을 막으면 에러 보고가 조용히 버려짐
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.livekit.cloud wss://*.livekit.cloud https://generativelanguage.googleapis.com https://www.google-analytics.com https://cdn.jsdelivr.net https://*.ingest.sentry.io https://*.ingest.de.sentry.io https://maps.googleapis.com https://maps.gstatic.com",
              "media-src 'self' blob:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
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
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
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
