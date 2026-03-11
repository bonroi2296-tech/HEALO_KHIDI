# 알림 시스템 에러 수정 보고서

**작성일**: 2026-02-04  
**이슈**: 테이블 미존재 에러 + GTM 500 에러

---

## 🐛 문제 요약

### 1. 테이블 미존재 에러
- **증상**: `/admin/settings/notifications` 접속 시 500 에러
- **에러 메시지**: "Could not find the table 'public.admin_notification_recipients' in the schema cache"
- **원인**: 마이그레이션 파일은 존재하지만 Supabase에서 미실행

### 2. GTM 500 에러
- **증상**: 브라우저 콘솔에 `googletagmanager.com` 요청 실패
- **원인**: 개발환경 + `/admin` 경로에서도 GTM 로드 시도

---

## ✅ 해결 방법

### A) 테이블 미존재 에러 해결

#### 1. 테이블 확인 스크립트 생성
**파일**: `scripts/check-notification-tables.sql`

**용도**: 
- `admin_notification_recipients` 테이블 존재 확인
- `admin_notification_logs` 테이블 존재 확인
- 컬럼 구조 확인

**실행 방법**:
```sql
-- Supabase SQL Editor에서 전체 실행
-- 결과: ✅ 테이블 존재함 / ❌ 테이블 없음
```

#### 2. 마이그레이션 실행 (테이블이 없을 경우)

**순서**:
1. Supabase SQL Editor 접속
2. `migrations/20260129_add_admin_notification_recipients.sql` 전체 실행
3. `migrations/20260204_add_admin_notification_logs.sql` 전체 실행
4. `scripts/check-notification-tables.sql` 재실행하여 확인

#### 3. API 에러 처리 개선

**수정된 파일**: `src/lib/notifications/recipients.ts`

**변경 사항**:
```typescript
// Before: 단순 에러 메시지
error: error.message

// After: 에러 코드 + 명확한 메시지
error: isTableNotFound 
  ? "admin_notification_recipients 테이블이 존재하지 않습니다. 마이그레이션을 실행하세요." 
  : error.message,
errorCode: isTableNotFound ? "TABLE_NOT_FOUND" : "QUERY_ERROR"
```

**효과**:
- 클라이언트에서 `errorCode`로 에러 유형 구분 가능
- 사용자에게 명확한 해결 방법 안내

#### 4. Admin UI Fail-safe 처리

**수정된 파일**: `app/admin/settings/notifications/page.tsx`

**추가된 기능**:
1. **노란색 안내 배너** (테이블 미존재 시)
   - 에러 원인 설명
   - 마이그레이션 실행 단계 안내 (numbered list)
   - 관련 파일 경로 표시

2. **버튼 비활성화**
   - "수신자 추가" 버튼: disabled + tooltip
   - "테스트 발송" 버튼: disabled + 안내 문구

3. **조건부 메시지**
   - 수신자 목록 빈 칸: "테이블 없음" vs "ENV fallback 작동"
   - 상황에 맞는 안내

**결과**: 
- 마이그레이션 미실행 시에도 화면이 깨지지 않음
- 사용자가 직접 문제를 해결할 수 있도록 안내

---

### B) GTM 500 에러 해결

#### 1. AnalyticsWrapper 컴포넌트 생성
**파일**: `app/AnalyticsWrapper.jsx` (신규)

**기능**:
- 클라이언트 사이드에서 GTM 로드 조건 체크
- `usePathname` 훅으로 현재 경로 확인
- 조건부로 GTM 스크립트 렌더링

**로드 조건** (AND):
1. `NEXT_PUBLIC_GA_ID` 환경변수 설정됨
2. `NODE_ENV === "production"` (프로덕션 환경)
3. `!pathname.startsWith("/admin")` (/admin 경로 아님)

**디버그 로그**:
```javascript
// 개발 환경에서만 콘솔 출력
console.log("[Analytics] GTM 로딩 조건:", {
  gaId: "설정됨" / "미설정",
  isProduction: true / false,
  isAdminPath: true / false,
  shouldLoad: true / false
});
```

#### 2. Layout.jsx 수정
**파일**: `app/layout.jsx`

**변경 사항**:
```jsx
// Before: 직접 GTM 로드
{gaId && (
  <>
    <Script src={`...gtag/js?id=${gaId}`} />
    <Script id="ga-init">...</Script>
  </>
)}

// After: AnalyticsWrapper로 위임
<AnalyticsWrapper />
```

**효과**:
- 개발환경: GTM 로드 안 함 → 500 에러 없음
- `/admin` 경로: GTM 로드 안 함 → 500 에러 없음
- 프로덕션 + 일반 경로: GTM 정상 로드

---

## 📂 수정/생성된 파일

### 신규 파일 (2개)
1. `scripts/check-notification-tables.sql` - 테이블 존재 확인 스크립트
2. `app/AnalyticsWrapper.jsx` - GTM 조건부 로딩 컴포넌트

### 수정된 파일 (4개)
1. `src/lib/notifications/recipients.ts`
   - `getAllRecipients()`: errorCode 추가, 테이블 미존재 감지
2. `app/api/admin/notification-recipients/route.ts`
   - GET: errorCode 클라이언트 전달, 503 상태 코드
3. `app/admin/settings/notifications/page.tsx`
   - errorCode 상태 추가
   - 노란색 안내 배너 (마이그레이션 실행 가이드)
   - 버튼 비활성화 + 조건부 메시지
4. `app/layout.jsx`
   - GTM 로딩 → AnalyticsWrapper로 이동
   - Script import 제거

### 업데이트된 문서 (1개)
1. `docs/ADMIN_NOTIFICATION_IMPLEMENTATION.md`
   - 마이그레이션 실행 섹션 상세화
   - 트러블슈팅: "테이블 미존재" 에러 추가
   - 트러블슈팅: "GTM 500" 에러 추가

---

## 🧪 테스트 체크리스트

### 테이블 미존재 시나리오
- [ ] `/admin/settings/notifications` 접속 시 노란색 배너 표시
- [ ] 배너에 마이그레이션 실행 단계 안내됨
- [ ] "수신자 추가" 버튼 비활성화 + 툴팁
- [ ] "테스트 발송" 버튼 비활성화 + 안내 문구
- [ ] 수신자 목록: "테이블이 존재하지 않습니다" 메시지

### 마이그레이션 실행 후
- [ ] `scripts/check-notification-tables.sql`: ✅ 테이블 존재함
- [ ] `/admin/settings/notifications` 접속 시 에러 없음
- [ ] 수신자 목록 정상 표시 (비어있음)
- [ ] "수신자 추가" 버튼 활성화
- [ ] "테스트 발송" 버튼 활성화 (수신자 있을 때)

### GTM 로딩
- [ ] **개발환경** (`npm run dev`)
  - `/` 접속: 콘솔에 `[Analytics] GTM 로딩 조건: ... shouldLoad: false`
  - `/admin` 접속: GTM 관련 네트워크 요청 없음
  - `googletagmanager.com` 500 에러 없음

- [ ] **프로덕션** (`NODE_ENV=production npm start`)
  - `/` 접속: GTM 정상 로드
  - `/admin` 접속: GTM 로드 안 함
  - `/admin` 콘솔: `googletagmanager.com` 요청 없음

---

## 🚀 사용자 액션 (필수)

### 1단계: 테이블 존재 확인
```sql
-- Supabase SQL Editor에서 실행
-- 파일: scripts/check-notification-tables.sql
```

### 2단계: 마이그레이션 실행 (테이블 없을 경우)
```sql
-- 1. migrations/20260129_add_admin_notification_recipients.sql 전체 실행
-- 2. migrations/20260204_add_admin_notification_logs.sql 전체 실행
```

### 3단계: 확인
```bash
# 서버 재시작
npm run dev

# 브라우저
# 1. /admin/settings/notifications 접속
# 2. 노란색 배너 없으면 성공
# 3. 콘솔에 googletagmanager 500 없으면 성공
```

---

## 📌 핵심 개선 사항

1. **Fail-safe UI**: 테이블 없어도 화면 안 깨짐
2. **명확한 안내**: 사용자가 직접 문제 해결 가능
3. **errorCode 시스템**: 에러 유형 구분으로 조건부 처리
4. **GTM 조건부 로딩**: 개발/관리자 경로에서 불필요한 요청 방지
5. **디버깅 도구**: `check-notification-tables.sql` 스크립트

---

**작성자**: AI Assistant  
**최종 업데이트**: 2026-02-04
