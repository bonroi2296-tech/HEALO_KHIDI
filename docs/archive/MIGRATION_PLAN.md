# MIGRATION_PLAN.md

## 현재 라우트/페이지 구조
- `/` (HomeView)
- `/admin` (AdminPage)
- `/treatments`
- `/treatments/:id`
- `/hospitals`
- `/hospitals/:id`
- `/inquiry`
- `/login`
- `/signup`
- `/success`

## Server vs Client 분류

### Server Component (SEO 우선)
- `/` (HomeView)
- `/treatments`
- `/treatments/[id]`
- `/hospitals`
- `/hospitals/[id]`

### Client Component (상호작용 필수)
- `/inquiry` (폼/파일 업로드/Toast)
- `/admin` (관리자 CRUD)
- `Header`, `ToastProvider`, `MobileBottomNav` (브라우저 API 사용)
- `GoogleMap.jsx`
- `AddressInput.jsx`
- `AuthPages.jsx` (login/signup)

## Supabase 접근 지점

### Tables
- `treatments` (SELECT/INSERT/UPDATE/DELETE)
- `hospitals` (SELECT/INSERT/UPDATE/DELETE)
- `inquiries` (SELECT/INSERT/UPDATE/DELETE)
- `reviews` (SELECT)
- `site_settings` (SELECT/UPDATE)

### Auth
- `auth.getSession()`
- `auth.onAuthStateChange()`
- `auth.signInWithPassword()`
- `auth.signUp()`
- `auth.signOut()`

### Storage
- `images` 업로드/URL 생성
- `attachments` 업로드/URL 생성

## mapper.js 의존 관계
- `mapHospitalRow()` → `App.jsx`, `HospitalDetailPage.jsx`
- `mapTreatmentRow()` → `App.jsx`, `HospitalDetailPage.jsx`
- `normalizeImages()` → `TreatmentDetailPage.jsx`, `HospitalDetailPage.jsx`, `mapper.js`

**데이터 흐름 패턴**
```
Supabase Row → mapper → UI Component
```

## 2.5 Strategic Data Pipeline Context (핵심 제약)
- `src/lib/mapper.js`는 유틸이 아니라 **데이터 파이프라인 경계**로 취급한다.
- Raw 운영 데이터(스네이크 케이스, 이질적 필드)를 **서비스 표준 모델**로 변환하는 핵심 계층이다.
- 이 계층은 **UI 안전성**, **분석/집계 준비**, **향후 AI/ML 학습 호환성**을 보장한다.
- 이 경계를 **우회, 중복, 변형**하는 모든 변경은 **중대한 아키텍처 실패**로 간주한다.

## 리스크 요약

### High
- Google Maps (브라우저 DOM, 키 노출 리스크)
- Inquiry 파일 업로드 (Client FormData 필요)
- 쿠키 기반 언어 감지 (서버에서 cookies() 대체 필요)

### Medium
- Pagination “Load More” (Client state 유지 필요)
- Admin 실시간 관리 (Client 유지 필요)

### Low
- mapper.js (순수 함수, 리스크 낮음)
