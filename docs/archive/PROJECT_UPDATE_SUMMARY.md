# 프로젝트 변경 요약 (코드 리뷰용)

아래는 현재까지의 변경 사항을 **코드 리뷰가 가능한 수준**으로 정리한 요약입니다.  
파일별로 “왜 바뀌었는지/무엇이 바뀌었는지”를 빠르게 훑을 수 있게 구성했습니다.

---

## 1) 라우팅/렌더링 구조

### Next App Router 경로
- `/` → `app/page.jsx` → `app/home/HomeClient.jsx` (클라이언트)
- `/treatments` → `app/treatments/page.jsx` → `app/list/PaginatedListClient.jsx`
- `/treatments/[id]` → `app/treatments/[id]/page.jsx` → `TreatmentDetailClient.jsx`
- `/hospitals` → `app/hospitals/page.jsx` → `PaginatedListClient.jsx`
- `/hospitals/[id]` → `app/hospitals/[id]/page.jsx` → `HospitalDetailClient.jsx`
- `/inquiry` → `app/inquiry/page.jsx` → `InquiryWrapper.jsx` (클라이언트)
- `/admin` → `app/admin/page.jsx` → `AdminWrapper.jsx` (클라이언트)

### 전역 UI 셸
- `app/layout.jsx` → `app/ClientShell.jsx`로 감싸서 기존 Header/BottomNav/CTA 유지

---

## 2) UI 복구(점진 재구현 방식)

### 신규 연결 파일
- `app/home/HomeClient.jsx`  
  - 기존 Home UI(Hero, 카드 섹션) 재사용
  - Supabase 클라이언트로 featured 데이터 로딩
  - DEV 배지/디버그 텍스트 포함

- `app/list/PaginatedListClient.jsx`  
  - 기존 카드 리스트 UI 재사용
  - Supabase 클라이언트 + mapper 적용
  - Load More 유지

- `app/treatments/[id]/TreatmentDetailClient.jsx`  
  - 기존 상세 UI(legacy) 그대로 사용
  - Next 라우터로 링크 대체

- `app/hospitals/[id]/HospitalDetailClient.jsx`  
  - 기존 상세 UI(legacy) 그대로 사용
  - Next 라우터로 링크 대체

### 기존 UI 코드 위치
현재도 유지됨 (삭제 아님):
- `src/components.jsx` (Header, Hero, CardListSection 등)
- `src/legacy-pages/*` (Inquiry, Treatment/Hospital detail 등)

---

## 3) Supabase/데이터 계층

### 데이터 파이프라인
- 원칙: **Supabase raw row → mapper → UI**
- mapper는 `src/lib/mapper.js` (데이터 파이프라인 경계)

### 서버/클라이언트 분리
- 서버용: `src/lib/data/supabaseServer.js`
- 클라이언트용: `src/lib/data/supabaseClient.js`
- 데이터 유틸: `src/lib/data/treatments.js`, `src/lib/data/hospitals.js`

---

## 4) 주요 수정 파일 목록 (리뷰 포인트)

### App Router
- `app/layout.jsx`  
  - 전역 UI 셸 유지 목적 (ClientShell 포함)

- `app/ClientShell.jsx`  
  - Header/BottomNav/Toast/CTA를 전역으로 복구

- `app/page.jsx`  
  - 기존 임시 UI 제거, `HomeClient` 연결

- `app/treatments/page.jsx` / `app/hospitals/page.jsx`  
  - PaginatedListClient로 교체 (기존 UI 재사용)

- `app/treatments/[id]/page.jsx` / `app/hospitals/[id]/page.jsx`  
  - `await params` 처리
  - legacy 상세 UI 클라이언트 래퍼로 교체

### Legacy UI
- `src/legacy-pages/TreatmentDetailPage.jsx`  
  - `useParams` 제거 → `selectedId` prop 사용
  - `import.meta.env.DEV` → `process.env.NODE_ENV`

- `src/legacy-pages/HospitalDetailPage.jsx`  
  - DEV 체크 방식 수정

---

## 5) 환경 변수 변경점

- `.env.local`만 사용  
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `VITE_*` 키는 제거 권장

---

## 6) 현재 이슈/리스크

- dev 서버가 중복 실행 중일 경우 `.next/dev/lock` 오류 발생  
  → 기존 `node.exe` 종료 후 재실행 필요

- 일부 legacy UI 내부는 React Router 제거 후 단계적 이관 필요  
  (현재는 Client 래퍼로 연결 유지)

---

## 7) 검증 방법(빠른 체크)

1. `npm run dev` 실행
2. 확인 URL:
   - `/`
   - `/treatments` → 카드/로드모어 표시
   - `/treatments/<uuid>`
   - `/hospitals`
   - `/hospitals/<uuid>`
   - `/inquiry` (폼 + 파일업로드)
