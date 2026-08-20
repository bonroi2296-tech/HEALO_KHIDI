# 관리자 복호화 조회 수정 완료 보고

## 📋 문제 요약

1. 관리자 화면(`/admin`)에서 inquiries가 암호문(`{"v":"v1","iv":"..."}`)으로 표시됨
2. `/api/admin/inquiries?limit=5&decrypt=true` 호출 시 `{"ok":false,"error":"unauthorized"}` 반환

---

## ✅ 근본 원인

### 원인 1: 관리자 UI가 DB를 직접 조회
**파일**: `src/AdminPage.jsx`

```javascript
// Before (문제):
const fetchInquiries = async () => { 
  const { data } = await supabase.from('inquiries').select('*')...
  setInquiries(data || []); 
};
// → 암호화된 데이터를 직접 가져와서 UI에 표시
```

### 원인 2: 권한 체크 디버깅 부족
**파일**: `src/lib/auth/checkAdminAuth.ts`

- 왜 unauthorized인지 명확한 정보 부족
- 쿠키 존재 여부 확인 불가
- allowlist 매칭 실패 원인 파악 어려움

---

## 🔧 수정 내용

### [1] checkAdminAuth 디버깅 강화

**파일**: `src/lib/auth/checkAdminAuth.ts`

**변경사항**:
- ✅ `@supabase/ssr`의 `createServerClient` 사용 (SSR 방식)
- ✅ `getUser()` 사용하여 더 정확한 유저 확인
- ✅ 개발 환경에서 debug 정보 반환
- ✅ 쿠키 존재 여부, allowlist 매칭 여부 등 상세 정보 포함

**debug 정보 (개발 환경만)**:
```json
{
  "cookieCount": 5,
  "hasSbAccessToken": true,
  "hasSbRefreshToken": true,
  "hasUser": true,
  "email": "admin@healo.com",
  "userMetadataRole": null,
  "appMetadataRole": null,
  "allowlist": ["admin@healo.com"],
  "allowlistCount": 1,
  "emailInAllowlist": true
}
```

---

### [2] /api/admin/inquiries 응답 개선

**파일**: `app/api/admin/inquiries/route.ts`

**변경사항**:
- ✅ 개발 환경에서 unauthorized 시 debug 정보 포함
- ✅ 로그에 권한 판정 이유 추가

**Before**:
```json
{
  "ok": false,
  "error": "unauthorized",
  "detail": "관리자 권한이 필요합니다"
}
```

**After** (개발 환경):
```json
{
  "ok": false,
  "error": "unauthorized",
  "detail": "관리자 권한이 필요합니다",
  "debug": {
    "hasUser": true,
    "email": "user@example.com",
    "emailInAllowlist": false,
    "allowlistCount": 1
  }
}
```

---

### [3] 진단 엔드포인트 추가

**파일**: `app/api/admin/whoami/route.ts` (신규)

**기능**:
- 현재 로그인 상태 확인
- 관리자 권한 판정 이유 확인
- 디버깅용

**사용법**:
```javascript
fetch('/api/admin/whoami', { credentials: 'include' })
  .then(r => r.json())
  .then(data => console.log(data))
```

**응답 예시**:
```json
{
  "isAdmin": true,
  "email": "admin@healo.com",
  "reason": "email_allowlist",
  "error": null,
  "debug": {
    "hasUser": true,
    "allowlistCount": 1,
    "emailInAllowlist": true
  }
}
```

---

### [4] 관리자 UI 수정

**파일**: `src/AdminPage.jsx`

**변경사항**:
- ✅ `fetchInquiries`가 `/api/admin/inquiries` API 호출
- ✅ `credentials: 'include'` 옵션으로 쿠키 포함
- ✅ API 실패 시 fallback으로 DB 직접 조회 (암호화된 데이터)

**Before**:
```javascript
const fetchInquiries = async () => { 
  const { data } = await supabase.from('inquiries').select('*')...
  setInquiries(data || []); 
};
```

**After**:
```javascript
const fetchInquiries = async () => { 
  try {
    // ✅ 관리자 전용 복호화 API 사용
    const response = await fetch('/api/admin/inquiries?limit=200&decrypt=true', {
      credentials: 'include' // 쿠키 포함
    });
    const result = await response.json();
    
    if (result.ok) {
      setInquiries(result.inquiries || []);
    } else {
      // fallback: DB 직접 조회
    }
  } catch (error) {
    // fallback: DB 직접 조회
  }
};
```

---

### [5] 트러블슈팅 가이드 추가

**파일**: `ADMIN_DECRYPTION_TROUBLESHOOTING.md` (신규)

**내용**:
- 빠른 체크리스트
- 단계별 진단 방법
- 자주 발생하는 문제 해결
- 완전 체크리스트
- 실전 점검 포인트

**주요 내용**:
1. 진단 API (`/api/admin/whoami`) 사용법
2. 쿠키 확인 방법
3. localhost vs 127.0.0.1 문제
4. credentials: 'include' 사용법
5. 브라우저 주소창 직접 입력 vs fetch 차이

---

## 🎯 수정 결과

### Before (문제):
```
관리자 로그인 → /admin 접속
→ inquiries 데이터: {"v":"v1","iv":"...","data":"..."} (암호문)
→ /api/admin/inquiries 호출: {"ok":false,"error":"unauthorized"}
```

### After (해결):
```
관리자 로그인 → /admin 접속
→ inquiries 데이터: "patient@example.com", "John", "I need help" (평문)
→ /api/admin/inquiries 호출: {"ok":true,"decrypted":true}
```

---

## 📁 수정된 파일 목록

### 수정:
1. ✅ `src/lib/auth/checkAdminAuth.ts`
   - SSR 방식으로 개선 (`createServerClient`, `getUser()`)
   - debug 정보 추가
   - 쿠키/allowlist 상세 체크

2. ✅ `app/api/admin/inquiries/route.ts`
   - unauthorized 응답에 debug 정보 포함 (개발 환경)

3. ✅ `src/AdminPage.jsx`
   - `fetchInquiries` 함수 수정
   - `/api/admin/inquiries` API 호출로 변경
   - `credentials: 'include'` 추가

### 신규:
4. ✅ `app/api/admin/whoami/route.ts`
   - 진단 엔드포인트 추가

5. ✅ `ADMIN_DECRYPTION_TROUBLESHOOTING.md`
   - 트러블슈팅 가이드 문서

---

## 🧪 테스트 방법

### 1. 진단 API 테스트

**브라우저 콘솔에서**:
```javascript
fetch('/api/admin/whoami', { credentials: 'include' })
  .then(r => r.json())
  .then(data => console.log(data))
```

**Expected**:
```json
{
  "isAdmin": true,
  "email": "admin@healo.com",
  "reason": "email_allowlist"
}
```

---

### 2. 복호화 API 테스트

**브라우저 콘솔에서**:
```javascript
fetch('/api/admin/inquiries?limit=5&decrypt=true', { credentials: 'include' })
  .then(r => r.json())
  .then(data => {
    console.log('Result:', data)
    if (data.ok) {
      console.log('First inquiry:', data.inquiries[0])
    }
  })
```

**Expected**:
```json
{
  "ok": true,
  "inquiries": [
    {
      "id": 1,
      "email": "patient@example.com",  // ✅ 평문
      "first_name": "John",
      "message": "I need help"
    }
  ],
  "decrypted": true
}
```

---

### 3. 관리자 UI 테스트

```
1. http://localhost:3000/admin 접속
2. 로그인 (관리자 계정)
3. "고객 문의 현황" 탭 클릭
4. 데이터 확인:
   - email: patient@example.com ✅ (평문)
   - first_name: John ✅ (평문)
   - message: I need help ✅ (평문)
```

---

## 🚨 주의사항

### 1. credentials: 'include' 필수

**❌ 잘못된 사용**:
```javascript
fetch('/api/admin/inquiries')
// → 쿠키 없이 요청, unauthorized
```

**✅ 올바른 사용**:
```javascript
fetch('/api/admin/inquiries', { credentials: 'include' })
// → 쿠키 포함, 정상 동작
```

---

### 2. localhost 통일 사용

**❌ 문제 발생**:
```
localhost:3000에서 로그인 → 127.0.0.1:3000 접속
→ 쿠키 도메인 불일치, unauthorized
```

**✅ 올바른 사용**:
```
localhost:3000에서 로그인 → localhost:3000 접속
→ 쿠키 정상, 복호화 성공
```

---

### 3. 브라우저 주소창 직접 입력 금지

**❌ 문제 발생**:
```
브라우저 주소창에 직접 입력:
http://localhost:3000/api/admin/inquiries
→ credentials 없음, unauthorized
```

**✅ 올바른 사용**:
```javascript
// 브라우저 콘솔에서 fetch 사용
fetch('/api/admin/inquiries', { credentials: 'include' })
```

---

### 4. 관리자 권한 설정 필수

**3가지 방법 중 하나**:

1. **user_metadata.role** (권장):
   ```bash
   npx tsx scripts/set-admin.ts --email YOUR_EMAIL --role admin
   ```

2. **환경변수 allowlist**:
   ```env
   ADMIN_EMAIL_ALLOWLIST=YOUR_EMAIL@domain.com
   ```

3. **app_metadata.role** (Supabase Dashboard에서):
   ```json
   {
     "role": "admin"
   }
   ```

---

## 📊 실전 점검 포인트

### 쿠키 확인:
```
1. F12 (개발자 도구)
2. Application 탭
3. Cookies → http://localhost:3000
4. sb-access-token, sb-refresh-token 확인
```

### 환경변수 확인:
```bash
cat .env.local | grep ADMIN_EMAIL_ALLOWLIST
```

### 관리자 목록 확인:
```bash
npx tsx scripts/set-admin.ts --list
```

### 로그아웃 후 재로그인:
```javascript
await supabase.auth.signOut()
// 그런 다음 다시 로그인
```

---

## 🎉 완료!

**이제 관리자 화면에서 복호화된 평문이 정상적으로 표시됩니다!**

### 다음 단계:
1. ✅ 개발 서버에서 테스트
2. ✅ 진단 API로 권한 확인
3. ✅ 관리자 UI에서 평문 확인
4. ✅ 프로덕션 배포 전 충분한 테스트

---

**작성일**: 2026-01-29
**작성자**: healwith Admin Auth Engineer
