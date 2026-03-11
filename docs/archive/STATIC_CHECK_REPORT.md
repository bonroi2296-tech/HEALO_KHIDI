# 정적 점검 보고서 (코드 변경 없음)

## 1) Next build 요약 (최근 로그 기준)
- Next.js 16.1.4 기준 빌드 성공.
- 라우트 및 렌더링 유형:
  - Static(○): `/`, `/treatments`, `/hospitals`, `/inquiry`, `/login`, `/signup`, `/success`, `/admin`, `/_not-found`
  - Dynamic(ƒ): `/treatments/[id]`, `/hospitals/[id]`
- SSR/CSR 경계:
  - 서버 컴포넌트: `app/page.jsx`, `app/treatments/*`, `app/hospitals/*`
  - 클라이언트 래퍼: `app/inquiry/InquiryWrapper.jsx`, `app/admin/AdminWrapper.jsx`, `app/auth/AuthWrapper.jsx`, `app/providers.jsx`

## 2) /inquiry 흐름 경로 점검
- 라우트: `app/inquiry/page.jsx` → `app/inquiry/InquiryWrapper.jsx`(Client) → `src/legacy-pages/InquiryPage.jsx`(Client)
- 업로드: `src/legacy-pages/InquiryPage.jsx`에서 `supabase.storage.from('attachments').upload(...)`
- 제출: `supabase.from('inquiries').insert([...])`
- 토스트: `useToast()` 기반, `src/components/Toast.jsx`(Client)
- 결론: 문의 폼/파일 업로드/토스트 흐름은 기존 로직을 유지하는 경로로 연결됨.

## 3) 서버/클라이언트 경계 위반 가능성 점검
### 확인된 Hook 사용 파일 (useState/useEffect 등)
- `src/legacy-pages/AuthPages.jsx` → `"use client"` 있음
- `src/legacy-pages/InquiryPage.jsx` → `"use client"` 있음
- `src/legacy-pages/HospitalDetailPage.jsx` → `"use client"` 있음
- `src/legacy-pages/TreatmentDetailPage.jsx` → `"use client"` 있음
- `src/AdminPage.jsx` → `"use client"` 있음
- `src/components.jsx` → `"use client"` 있음
- `src/components/Toast.jsx` → `"use client"` 있음
- `src/components/GoogleMap.jsx` → `"use client"` 있음
- `src/components/AddressInput.jsx` → `"use client"` 있음
- `src/App.jsx` → `"use client"` 있음

### 잠재 리스크
- 현재까지 Hook 파일에는 `use client` 누락 후보가 발견되지 않음.
- 다만 **`src/components/ErrorBoundary.jsx`**는 Next App Router에서 직접 쓰면 Client 지정이 필요할 수 있어, 실제 사용 여부를 확인 권장.

## 4) 환경 변수 사용 위치 점검
- `src/supabase.js`: `VITE_SUPABASE_*` 또는 `NEXT_PUBLIC_SUPABASE_*` 모두 지원.
- `src/lib/data/supabaseClient.js`: `NEXT_PUBLIC_SUPABASE_*` 또는 `VITE_SUPABASE_*`.
- `src/lib/data/supabaseServer.js`: `process.env` 기반 (서버용).
- `src/components/GoogleMap.jsx`: **`import.meta.env.VITE_GOOGLE_MAPS_API_KEY`만 사용**.
  - Next.js 환경에서는 `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` 사용으로 전환 필요 가능성이 높음.

## 5) Vite/SPA 잔재 목록 (삭제 후보)
### 최우선 후보
- `vite.config.js`
- `index.html`
- `src/main.jsx`

### SPA 라우팅/구조 잔재(사용 여부 확인 후 삭제)
- `src/App.jsx` (react-router 기반)
- `src/pages.jsx`
- `src/legacy-pages/*` (현재 Next 래퍼에서 사용 중이므로 **삭제 금지**)

### 기타
- `public/vite.svg`
- `src/assets/react.svg`

## 6) 추가 리스크/주의사항
- Google Maps 키 환경 변수명이 Vite 기준(`VITE_GOOGLE_MAPS_API_KEY`)으로 고정되어 있어 Next 환경에서 동작이 불안정할 수 있음.
- `react-router-dom` 제거 상태에서 `src/App.jsx`가 남아 있어도 빌드 자체는 통과하지만, 오해/유지보수 리스크가 큼.

---
**다음 단계 제안**  
원하시면 위 "삭제 후보" 정리를 실행하고, 정리 후 `FINAL_MIGRATION_SUMMARY.md` 작성으로 마무리하겠습니다.
