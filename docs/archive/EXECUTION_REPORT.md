# 실행 변경 요약 리포트

## 1) 변경 파일 목록 (폴더별)

### /app
- 추가: `app/globals.css`
- 추가: `app/layout.jsx`
- 추가: `app/page.jsx`
- 추가: `app/providers.jsx`
- 추가: `app/treatments/page.jsx`
- 추가: `app/treatments/[id]/page.jsx`
- 추가: `app/hospitals/page.jsx`
- 추가: `app/hospitals/[id]/page.jsx`
- 추가: `app/inquiry/page.jsx`
- 추가: `app/inquiry/InquiryWrapper.jsx`
- 추가: `app/admin/page.jsx`
- 추가: `app/admin/AdminWrapper.jsx`
- 추가: `app/auth/AuthWrapper.jsx`
- 추가: `app/login/page.jsx`
- 추가: `app/signup/page.jsx`
- 추가: `app/success/page.jsx`

### /src/lib/data
- 추가: `src/lib/data/supabaseServer.js`
- 추가: `src/lib/data/supabaseClient.js`
- 추가: `src/lib/data/treatments.js`
- 추가: `src/lib/data/hospitals.js`

### /src
- 수정: `src/supabase.js`

## 2) 각 변경의 목적 (1줄 요약)
- `app/*`: Next.js App Router 기반으로 서버 렌더링 경로를 신설해 SEO/SSR 요구를 충족.
- `app/providers.jsx`: 기존 Toast 컨텍스트를 Next 레이아웃에서 재사용.
- `app/inquiry/*`, `app/admin/*`, `app/auth/*`: 기존 React 페이지를 Next 라우팅 환경에서 동작시키기 위한 클라이언트 래퍼.
- `src/lib/data/*`: Supabase 접근을 서버/클라이언트로 분리하고 mapper 계약에 맞춰 데이터 변환.
- `src/supabase.js`: Vite와 Next 환경 변수 이름을 모두 지원하도록 확장.

## 3) Server Component로 만든 페이지 목록과 근거
- `/` → `app/page.jsx`: 데이터 사전 로딩 및 SEO 메타 구성을 위해 서버 렌더링.
- `/treatments` → `app/treatments/page.jsx`: 전체 시술 목록을 서버에서 가져와 SSR.
- `/treatments/[id]` → `app/treatments/[id]/page.jsx`: 상세 페이지 SEO/메타 생성 필요.
- `/hospitals` → `app/hospitals/page.jsx`: 전체 병원 목록을 서버에서 가져와 SSR.
- `/hospitals/[id]` → `app/hospitals/[id]/page.jsx`: 상세 페이지 SEO/메타 생성 필요.

## 4) Client Component로 고정한 페이지/컴포넌트 목록과 근거
- `/inquiry` → `app/inquiry/InquiryWrapper.jsx`: 폼 상태, 파일 업로드, toast, Supabase client 사용 등 브라우저 의존.
- `/admin` → `app/admin/AdminWrapper.jsx`: 관리자 페이지 내 상호작용과 Supabase client 인증/쓰기.
- `/login`, `/signup`, `/success` → `app/auth/AuthWrapper.jsx`: 클라이언트 상태/라우팅 의존, 기존 UI 재사용.
- `app/providers.jsx`: ToastProvider가 client 전용 컨텍스트 사용.

## 5) Supabase 접근 지점 이동 (server/client 구분)
- Server: `src/lib/data/supabaseServer.js`
  - 사용처: `src/lib/data/treatments.js`, `src/lib/data/hospitals.js`
  - 목적: 서버 컴포넌트에서 안전한 조회 전용 접근.
- Client: `src/lib/data/supabaseClient.js` 및 기존 `src/supabase.js`
  - 사용처: `app/inquiry/InquiryWrapper.jsx` 및 기존 React 페이지들(예: `src/pages/InquiryPage.jsx`, `src/AdminPage.jsx`, `src/pages/AuthPages.jsx`)
  - 목적: 브라우저 상호작용(파일 업로드/인증/쓰기).

## 6) mapper.js 데이터 계약 준수 방식
- 원칙: DB raw row → `mapTreatmentRow` / `mapHospitalRow` 변환 후 UI에 전달.
- 적용 지점:
  - `src/lib/data/treatments.js`: 모든 조회 결과를 `mapTreatmentRow`로 변환.
  - `src/lib/data/hospitals.js`: 병원 조회는 `mapHospitalRow`, 병원별 시술 조회는 `mapTreatmentRow` 사용.
  - Server Component는 이미 매핑된 구조만 소비하여 UI 필드 계약을 유지.

## 7) 남은 TODO / 리스크 / 막힌 점
- **npm dependency conflict**: `react-helmet-async@2.0.5`가 React 19 peer dependency를 지원하지 않아 `npm install next`가 실패.
- 해결 옵션:
  - `react-helmet-async`를 React 19 지원 버전으로 업그레이드(권장).
  - 또는 `npm install --legacy-peer-deps`로 임시 우회.
- 추가 검증 필요:
  - Next 라우팅에서 기존 CSS/Toast/모달 동작 확인.
  - SSR 페이지 내 이미지/라인클램프 등의 스타일 적용 여부 확인.

## 8) 로컬에서 확인해야 할 실행 명령어
- 설치: `npm install` (필요시 `npm install next` 추가)
- 개발 서버: `npm run dev`
- 빌드: `npm run build`
