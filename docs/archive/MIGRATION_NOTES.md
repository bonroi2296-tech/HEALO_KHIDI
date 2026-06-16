# Phase 1: Inquiry Flow Migration

## 개요
`src/legacy-pages`에서 `/inquiry`, `/inquiry/intake`, `/success` 라우트를 `app/**` 디렉토리로 완전히 마이그레이션했습니다.

## 변경 사항

### 1. 파일 이동 및 이름 변경

**이전:**
```
app/inquiry/_legacy/InquiryPage.jsx
app/inquiry/_legacy/InquiryIntakePage.jsx
src/legacy-pages/AuthPages.jsx (SuccessPage)
```

**이후:**
```
app/inquiry/InquiryClient.jsx
app/inquiry/intake/IntakeClient.jsx
app/success/SuccessClient.jsx
```

### 2. Import 경로 업데이트

- `app/inquiry/InquiryWrapper.jsx`: `_legacy/InquiryPage` → `./InquiryClient`
- `app/inquiry/intake/page.jsx`: `../_legacy/InquiryIntakePage` → `./IntakeClient`
- `app/success/page.jsx`: `src/legacy-pages/AuthPages` → `./SuccessClient`

### 3. 제거된 디렉토리

- `app/inquiry/_legacy/` 폴더 전체 삭제

### 4. 코드 변경

**app/success/page.jsx:**
- `AuthWrapper` 제거 (불필요한 래퍼)
- `"use client"` 디렉티브 추가
- 직접 `SuccessClient` 컴포넌트 렌더링

**app/success/SuccessClient.jsx:**
- `useEffect` 중복 제거 및 통합
- Lint 에러 수정 (빈 catch 블록)

## 보존된 기능

### Inquiry Flow (/inquiry)
- ✅ AI Agent, Human Agent, Inquiry Form 선택 모드
- ✅ 파일 업로드 (Supabase Storage `attachments` 버킷)
- ✅ `inquiries` 테이블 삽입 (`/api/inquiries/create`)
- ✅ `/api/inquiry/normalize` 호출 (RAG 시스템)
- ✅ `inquiry_events` 추적 (`step1_viewed`, `step1_submitted`)
- ✅ GA 이벤트 추적
- ✅ `/success` 페이지로 리다이렉트

### Inquiry Intake (/inquiry/intake)
- ✅ URL 파라미터 (`inquiryId`, `token`) 검증
- ✅ 추가 정보 수집 (body_part, duration, severity, diagnosis, medication)
- ✅ 추가 파일 업로드
- ✅ `inquiries` 테이블 업데이트 (`/api/inquiries/intake`)
- ✅ `inquiry_events` 추적 (`step2_submitted`)

### Success Page (/success)
- ✅ 랜덤 Reference ID 생성
- ✅ sessionStorage에서 inquiry 정보 복원
- ✅ Step 2 (intake) CTA 버튼 (inquiryId + token 전달)
- ✅ Funnel 이벤트 추적 (`step2_viewed`)

## 검증 방법

### 1. 빌드 테스트
```bash
npm run build
```
✅ 빌드 성공 (2026-02-03)

### 2. 라우트 확인
- `/inquiry` - Inquiry 선택 모드 페이지
- `/inquiry/intake` - 추가 정보 수집 페이지
- `/success` - 접수 완료 페이지

### 3. 수동 테스트 (권장)
1. `GET /inquiry` → 200 응답 확인
2. Inquiry Form 선택 → 필수 필드 입력 → 제출
3. `/success` 페이지 표시 확인
4. "추가 정보 제공" 버튼 → `/inquiry/intake?inquiryId=XXX&token=YYY` 이동 확인
5. Intake 폼 제출 → "Additional info saved" 메시지 확인

### 4. Supabase 검증
- `inquiries` 테이블에 새 레코드 생성 확인
- `attachments` 버킷에 파일 업로드 확인 (선택사항)
- `inquiry_events` 테이블에 이벤트 기록 확인

### 5. 스모크 테스트 (Phase 1.5 대기)
Playwright 또는 Node 스크립트로 자동화된 테스트 추가 예정

---

# Phase 2: Login & Signup Migration (2026-02-03)

## 개요
`src/legacy-pages/AuthPages.jsx`에서 `/login`과 `/signup` 라우트를 `app/**` 디렉토리로 마이그레이션했습니다.

## 변경 사항

### 1. 파일 생성

**새로 생성:**
```
app/login/LoginClient.jsx
app/signup/SignupClient.jsx
```

### 2. Import 경로 업데이트

- `app/login/page.jsx`: `src/legacy-pages/AuthPages` → `./LoginClient`
- `app/signup/page.jsx`: `src/legacy-pages/AuthPages` → `./SignupClient`
- `AuthWrapper` 제거 (불필요한 래퍼)

### 3. 추가된 테스트

- `scripts/smoke-test-auth.js` (GET /login, /signup → 200)
- `package.json`: `test:smoke:auth` 스크립트 추가

## 보존된 기능

### Login Page (/login)
- ✅ 이메일/비밀번호 로그인 (`supabase.auth.signInWithPassword`)
- ✅ Google OAuth 로그인
- ✅ Admin 권한 체크 (`/api/admin/whoami`)
- ✅ 로그인 성공 시 Admin → `/admin`, 일반 사용자 → `/`
- ✅ "Forgot Password" 버튼 (Coming soon 메시지)
- ✅ Signup 페이지로 이동 링크

### Signup Page (/signup)
- ✅ 이름, 이메일, 비밀번호 회원가입
- ✅ Google OAuth 회원가입
- ✅ 비밀번호 확인 검증
- ✅ 약관 동의 체크박스 (Privacy Policy, Terms)
- ✅ 마케팅 이메일 수신 동의
- ✅ 회원가입 성공 시 Login 페이지로 리다이렉트
- ✅ Login 페이지로 이동 링크

## 검증 결과

### 빌드 테스트
```bash
npm run build
```
✅ 빌드 성공 (6.3초 소요, 2026-02-03)

### Legacy Import 확인
```bash
grep -r "from.*legacy-pages/AuthPages" app/
```
✅ 검색 결과: 0개 (모든 레거시 import 제거 완료)

### 스모크 테스트
```bash
npm run test:smoke:auth
```
✅ `/login` → 200
✅ `/signup` → 200

---

# Phase 3: Hospital & Treatment Details Migration (2026-02-03)

## 개요
`src/legacy-pages/HospitalDetailPage.jsx`와 `TreatmentDetailPage.jsx`를 `app/**` 디렉토리로 마이그레이션했습니다.

## 변경 사항

### 1. 파일 이동

**Hospital Details:**
- 원본: `src/legacy-pages/HospitalDetailPage.jsx`
- 새 위치: `app/hospitals/[slug]/HospitalDetailLegacyClient.jsx`
- Import 업데이트: `app/hospitals/[slug]/HospitalDetailClient.jsx`

**Treatment Details:**
- 원본: `src/legacy-pages/TreatmentDetailPage.jsx`
- 새 위치: `app/treatments/[slug]/TreatmentDetailLegacyClient.jsx`
- Import 업데이트: `app/treatments/[slug]/TreatmentDetailClient.jsx`

### 2. Import 경로 업데이트

**HospitalDetailClient.jsx:**
```javascript
// Before: from "../../../src/legacy-pages/HospitalDetailPage"
// After:  from "./HospitalDetailLegacyClient"
```

**TreatmentDetailClient.jsx:**
```javascript
// Before: from "../../../src/legacy-pages/TreatmentDetailPage"
// After:  from "./TreatmentDetailLegacyClient"
```

**TreatmentDetailLegacyClient.jsx 내부:**
- 모든 상대 경로를 `../../../src/` 형태로 수정

## 보존된 기능

### Hospital Detail Page
- ✅ DB 조회 (hospitals, treatments)
- ✅ UUID/slug 기반 조회
- ✅ 이미지 갤러리
- ✅ Medical Director 프로필
- ✅ Reviews, FAQ
- ✅ GA 이벤트 (`view_hospital`)

### Treatment Detail Page
- ✅ DB 조회 (treatments, hospitals, reviews)
- ✅ UUID/slug 기반 조회
- ✅ Treatment overview, benefits
- ✅ Verified reviews
- ✅ Google Maps
- ✅ Related treatments
- ✅ GA 이벤트 (`view_treatment`)

## 검증 결과

### 빌드 테스트
```bash
npm run build
```
✅ 빌드 성공 (3.6초 소요, 2026-02-03)

### Legacy Import 확인
✅ `app/**`에 legacy-pages import 없음

## 다음 단계 (Phase 4+)

**마이그레이션 대기 중인 레거시 페이지:**
- `/admin` 관련 컴포넌트들 (`src/legacy-pages/admin/*`)

**완료된 마이그레이션:**
- ✅ Phase 1: Inquiry flow
- ✅ Phase 2: Auth flow  
- ✅ Phase 3: Hospital & Treatment details
- ✅ Phase 4: Admin unification (partial)

## 롤백 방법

만약 문제가 발생하면:
```bash
git revert <commit-hash>
```

또는 수동 롤백:
1. `app/inquiry/_legacy/` 폴더 복원
2. Import 경로를 이전 상태로 되돌림
3. `app/success/page.jsx`에서 `AuthWrapper` 재사용

## 주의사항

- 모든 Supabase 호출, 검증, 스토리지 로직은 변경되지 않았습니다
- UI/UX는 동일하게 유지되었습니다
- 이 마이그레이션은 **구조적 변경**이며, 기능적 변경이 아닙니다

## 작성자
- Date: 2026-02-03
- Phase: 1 (Inquiry Flow Only)
