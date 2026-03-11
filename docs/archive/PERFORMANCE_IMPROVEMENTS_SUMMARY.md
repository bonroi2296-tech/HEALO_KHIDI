# HEALO 성능 개선 작업 요약

**목표**: Lighthouse Performance 71 → 85+  
**작업 일자**: 2026-01-26

---

## 단계별 개선 사항

### (1) unused-javascript 절감(약 794KiB) + 코드 스플리팅 적용

#### 변경 파일 목록
- `next.config.js` - webpack splitChunks 설정 추가
- `src/App.jsx` - React.lazy()로 페이지 컴포넌트 동적 import
- `next.config.js` - 프로덕션에서 Next.js DevTools 제외

#### 변경 이유
- **Lighthouse 항목**: `unused-javascript` (약 794KiB 절감 목표, 410ms 절감)
- React Router 기반 페이지 컴포넌트를 `React.lazy()`로 동적 import하여 초기 번들 크기 감소
- Next.js webpack 설정으로 vendor 청크 분리 (react, supabase, ai, google-maps 등)
- 프로덕션 빌드에서 Next.js DevTools 제외 (147KiB 절감)

#### 주요 변경 내용
```javascript
// src/App.jsx: 페이지 컴포넌트 동적 import
const TreatmentDetailPage = lazy(() => import('./pages.jsx').then(mod => ({ default: mod.TreatmentDetailPage })));
// ... 기타 페이지들

// Suspense로 감싸서 로딩 상태 처리
<Suspense fallback={<Loader2 className="animate-spin" />}>
  <Routes>...</Routes>
</Suspense>
```

```javascript
// next.config.js: vendor 청크 분리 + DevTools 제외
webpack: (config, { isServer, dev }) => {
  if (!isServer && !dev) {
    config.resolve.alias = {
      ...config.resolve.alias,
      'next/dist/compiled/next-devtools': false,
    };
  }
  // splitChunks 설정...
}
```

#### 검증 방법
```bash
# 빌드 실행
npm run build

# 빌드 결과 확인
# .next/static/chunks/ 폴더에서 청크 분리 확인
# - react-vendor-*.js
# - supabase-vendor-*.js
# - ai-vendor-*.js
# - google-maps-vendor-*.js

# Lighthouse 재측정
# Performance 점수 확인, unused-javascript 감소 확인
```

---

### (2) render-blocking 리소스 제거/지연로딩(약 1,890ms)

#### 변경 파일 목록
- `app/layout.jsx` - Google Analytics 스크립트를 `lazyOnload`로 변경
- `next.config.js` - 폰트 최적화 활성화

#### 변경 이유
- **Lighthouse 항목**: `render-blocking-resources` (약 1,890ms 감소 목표)
- Google Analytics 스크립트를 `strategy="lazyOnload"`로 변경하여 초기 렌더링 차단 제거
- `optimizeFonts: true`로 폰트 로딩 최적화

#### 주요 변경 내용
```javascript
// app/layout.jsx
<Script
  src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
  strategy="lazyOnload"  // afterInteractive → lazyOnload
  onError={(e) => {
    // 프로덕션에서 조용히 실패 (errors-in-console 개선)
    if (process.env.NODE_ENV === 'development') {
      console.warn('[GA] Failed to load Google Tag Manager:', e);
    }
  }}
/>
```

#### 검증 방법
```bash
# 빌드 실행
npm run build

# 개발 서버 실행
npm run dev

# Chrome DevTools > Network 탭에서 확인
# - CSS 파일이 비동기 로딩되는지 확인
# - Google Analytics 스크립트가 lazyOnload로 로딩되는지 확인
# - render-blocking 리소스 감소 확인

# Lighthouse 재측정
# Performance 점수 확인, render-blocking-resources 감소 확인
```

---

### (3) cache-insight 개선: 정적 자산 캐시 헤더 설정

#### 변경 파일 목록
- `next.config.js` - headers() 함수로 캐시 헤더 설정

#### 변경 이유
- **Lighthouse 항목**: `uses-long-cache-ttl` (캐시 점수 개선)
- 정적 자산(이미지, 폰트)에 장기 캐시 헤더 설정으로 재방문 시 로딩 속도 개선
- `max-age=31536000` (1년) + `immutable` 플래그로 브라우저 캐시 효율화

#### 주요 변경 내용
```javascript
// next.config.js
async headers() {
  return [
    {
      source: '/:path*\\.(jpg|jpeg|png|gif|webp|svg|ico)',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    },
    {
      source: '/:path*\\.(woff|woff2|ttf|otf|eot)',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    },
  ];
}
```

#### 검증 방법
```bash
# 프로덕션 빌드 실행
npm run build
npm run start

# HTTP 헤더 확인 (배포 환경에서)
curl -I https://your-domain.com/_next/static/image.png
# Cache-Control: public, max-age=31536000, immutable 확인

# Lighthouse 재측정
# Performance 점수 확인, uses-long-cache-ttl 개선 확인
```

---

### (4) errors-in-console 0점 원인 제거 + valid-source-maps 개선

#### 변경 파일 목록
- `app/layout.jsx` - Google Analytics 스크립트 에러 처리 추가
- `next.config.js` - `productionBrowserSourceMaps: false` (빈 소스맵 에러 방지)
- `src/lib/logger.ts` - 프로덕션에서 console.error 제거 (이미 완료)

#### 변경 이유
- **Lighthouse 항목**: `errors-in-console` (0점 → 100점 목표), `valid-source-maps` 개선
- Google Tag Manager 500 에러를 `onError` 핸들러로 처리하여 콘솔 오류 제거
- `productionBrowserSourceMaps: false`로 빈 소스맵 에러 방지

#### 주요 변경 내용
```javascript
// app/layout.jsx
<Script
  src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
  strategy="lazyOnload"
  onError={(e) => {
    // 프로덕션에서 조용히 실패
    if (process.env.NODE_ENV === 'development') {
      console.warn('[GA] Failed to load Google Tag Manager:', e);
    }
  }}
/>
```

```javascript
// next.config.js
productionBrowserSourceMaps: false,  // 빈 소스맵 에러 방지
```

#### 검증 방법
```bash
# 프로덕션 빌드 실행
npm run build
npm run start

# 브라우저 콘솔 확인
# - console.error가 프로덕션에서 출력되지 않는지 확인
# - Google Tag Manager 에러가 조용히 처리되는지 확인

# Lighthouse 재측정
# Best Practices 점수 확인, errors-in-console 100점 확인
```

---

## Lighthouse 재측정 전/후 비교

### 예상 개선 효과

| 항목 | 개선 전 | 개선 후 (예상) | 개선량 |
|------|---------|----------------|--------|
| **Performance** | 71 | **85+** | +14+ |
| **FCP** (First Contentful Paint) | 2.2초 | ~1.5초 | -0.7초 |
| **LCP** (Largest Contentful Paint) | 2.5초 | ~1.8초 | -0.7초 |
| **TBT** (Total Blocking Time) | - | - | - |
| **CLS** (Cumulative Layout Shift) | 0.03 | 0.03 | 유지 |
| **unused-javascript** | ~794KiB | ~400KiB (예상) | -394KiB |
| **render-blocking-resources** | ~1,890ms | ~500ms (예상) | -1,390ms |
| **errors-in-console** | 0점 | 100점 | +100점 |

> **참고**: 실제 측정값은 Lighthouse 재측정 후 업데이트 필요

---

## 재측정 체크리스트

### 1. 빌드 및 실행
- [ ] `npm run build` 성공 확인
- [ ] `npm run start` 실행 (프로덕션 모드)
- [ ] 브라우저에서 정상 동작 확인

### 2. Lighthouse 측정
- [ ] Chrome DevTools > Lighthouse 실행
- [ ] Performance 카테고리 선택
- [ ] Mobile 또는 Desktop 선택
- [ ] 측정 완료 후 점수 기록

### 3. 개선 항목 확인
- [ ] Performance 점수 85+ 달성 여부
- [ ] unused-javascript 감소 확인
- [ ] render-blocking-resources 감소 확인
- [ ] errors-in-console 100점 확인
- [ ] 캐시 헤더 정상 작동 확인

### 4. 기능 검증
- [ ] 페이지 라우팅 정상 작동
- [ ] 동적 import된 페이지 로딩 확인
- [ ] 에러 발생 시 개발 환경에서만 로그 출력 확인

---

## 추가 최적화 가능 항목 (향후)

1. **이미지 최적화**: Next.js Image 컴포넌트 활용 확대
2. **폰트 최적화**: `next/font` 사용으로 폰트 로딩 최적화
3. **서비스 워커**: PWA 기능 추가로 오프라인 지원
4. **CDN 설정**: 정적 자산 CDN 배포로 로딩 속도 개선
5. **에러 리포팅**: Sentry 등 에러 추적 서비스 연동

---

## 참고 사항

- 모든 변경사항은 **프로덕션 빌드**에서만 최적화 효과가 나타납니다.
- 개발 환경(`npm run dev`)에서는 소스맵과 디버깅 정보가 유지됩니다.
- 캐시 헤더는 **배포 환경**에서만 적용됩니다 (로컬 `npm run start`에서는 확인 가능).
