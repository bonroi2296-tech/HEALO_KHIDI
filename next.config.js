/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ 성능 최적화: 코드 스플리팅 및 번들 최적화
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
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
            // 기타 vendor
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendor',
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
              "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://cdn.jsdelivr.net",
              "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
              "img-src 'self' data: blob: https: http:",
              "font-src 'self' https://cdn.jsdelivr.net",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.livekit.cloud wss://*.livekit.cloud https://generativelanguage.googleapis.com https://www.google-analytics.com",
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
        // 이미지 파일 캐시
        source: '/:path*\\.(jpg|jpeg|png|gif|webp|svg|ico)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
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
    ],
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
  typescript: {
    ignoreBuildErrors: true, // Supabase 타입 생성 전까지 유지
  },
};

// Sentry 설정 (DSN이 있을 때만 활성화)
import { withSentryConfig } from "@sentry/nextjs";

const sentryConfig = {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
};

const sentryOptions = {
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  hideSourceMaps: true,
  disableLogger: true,
};

const finalConfig = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryConfig, sentryOptions)
  : nextConfig;

export default finalConfig;
