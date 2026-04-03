# Vercel 배포 체크리스트 (긴급)

## 🚨 현재 상태

- ✅ GitHub에 푸시 완료 (commit: 1b11b51)
- ⏳ Vercel 자동 배포 진행 중 (예상 2-3분)
- ⚠️ 환경변수 설정 필요

---

## 🔧 필수 환경변수 설정

### Vercel Dashboard에서 설정:

1. https://vercel.com/dashboard 접속
2. HEALO 프로젝트 선택
3. **Settings** → **Environment Variables**

---

### **필수 환경변수 (5개)**:

```env
# 1. Supabase 연결
NEXT_PUBLIC_SUPABASE_URL=https://xppnvkuahlrdyfvabzur.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_ui0m9IIp-8VQUfHLCb4d1w_LcwHa0Zd
SUPABASE_SERVICE_ROLE_KEY=sb_secret_TTfjGIkpxnd5c6CZ6djguA_2KUut4Pm

# 2. 암호화 키 (32 bytes base64)
ENCRYPTION_KEY_V1=+HqAphm+2mFg6ZNokz0xvLqzFf7bdrh57UVi9E6KZ/o=

# 3. 관리자 이메일 (쉼표로 구분)
ADMIN_EMAIL_ALLOWLIST=admin@healo.com
```

---

### **환경변수 추가 방법**:

각 환경변수마다:
1. "Add" 버튼 클릭
2. **Key**: 환경변수 이름 입력
3. **Value**: 값 입력
4. **Environment**: Production, Preview, Development 모두 체크
5. "Save" 클릭

---

## ⏱️ 배포 확인 (5분 후)

### 1. 배포 완료 대기
```
Vercel Dashboard → Deployments
→ 최신 배포 상태 확인
→ "Ready" 표시 될 때까지 대기 (2-3분)
```

---

### 2. API 엔드포인트 테스트

**A. 진단 API**:
```
https://healo-nu.vercel.app/api/admin/whoami
```

**Expected** (로그인 후):
```json
{
  "isAdmin": true,
  "email": "admin@healo.com",
  "reason": "email_allowlist"
}
```

---

**B. 복호화 API**:
```
https://healo-nu.vercel.app/api/admin/inquiries?limit=5&decrypt=true
```

**Expected** (로그인 후):
```json
{
  "ok": true,
  "inquiries": [
    {
      "email": "patient@example.com",  // ✅ 평문
      "first_name": "John"
    }
  ],
  "decrypted": true
}
```

**Before**: 404 Not Found ❌  
**After**: 200 OK JSON ✅

---

### 3. 관리자 UI 테스트

```
https://healo-nu.vercel.app/admin
→ 로그인
→ 고객 문의 현황 탭
```

**Expected**:
- ✅ email: patient@example.com (평문)
- ✅ first_name: John (평문)
- ✅ message: I need help (평문)

**NOT**:
- ❌ {"v":"v1","iv":"...","data":"..."} (암호문)

---

## 🚨 환경변수 누락 시 증상

### ENCRYPTION_KEY_V1 없으면:
```
API 호출 → 500 Internal Server Error
서버 로그: "[encryptionV2] ENCRYPTION_KEY_V1 is missing"
```

### ADMIN_EMAIL_ALLOWLIST 없으면:
```
API 호출 → 403 Unauthorized
응답: { "error": "not_admin" }
```

### SUPABASE_SERVICE_ROLE_KEY 없으면:
```
API 호출 → 500 Internal Server Error
서버 로그: "Supabase admin 환경변수 누락"
```

---

## 📊 배포된 파일

### 신규 API Routes:
- ✅ `/api/admin/inquiries` (GET)
- ✅ `/api/admin/inquiries/[id]` (GET)
- ✅ `/api/admin/notification-recipients` (GET, POST)
- ✅ `/api/admin/notification-recipients/[id]` (PATCH, DELETE)
- ✅ `/api/admin/whoami` (GET)

### 신규 모듈:
- ✅ `src/lib/supabase/browser.ts`
- ✅ `src/lib/supabase/server.ts`
- ✅ `src/lib/auth/checkAdminAuth.ts`
- ✅ `src/lib/security/decryptForAdmin.ts`
- ✅ `src/lib/security/encryptionV2.ts`

### 수정:
- ✅ `middleware.ts` - SSR auth, /api/admin 보호
- ✅ `src/AdminPage.jsx` - Bearer token으로 API 호출
- ✅ `src/legacy-pages/AuthPages.jsx` - SSR browser client 사용

---

## ✅ 로컬 검증 (지금 바로)

배포 완료 전에 로컬에서 먼저 확인:

### 1. 서버 로그 확인
```
터미널에서 확인:
[encryptionV2] ENCRYPTION_KEY_V1 loaded: ✅ YES
```

### 2. API 테스트
```
localhost:3000/api/admin/inquiries?limit=5

Expected: 
{
  "ok": true,
  "inquiries": [{ "email": "patient@example.com", ... }],
  "decrypted": true
}
```

### 3. 관리자 UI 테스트
```
localhost:3000/admin
→ 고객 문의 현황
→ 평문 표시 확인
```

---

## 🎯 Vercel 배포 후 확인사항

### 1. 환경변수 5개 모두 설정했는가?
- [ ] NEXT_PUBLIC_SUPABASE_URL
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
- [ ] SUPABASE_SERVICE_ROLE_KEY
- [ ] ENCRYPTION_KEY_V1
- [ ] ADMIN_EMAIL_ALLOWLIST

### 2. 배포 완료되었는가?
- [ ] Vercel Dashboard에서 "Ready" 표시

### 3. API 엔드포인트 200 OK?
- [ ] /api/admin/whoami
- [ ] /api/admin/inquiries?limit=5

### 4. 관리자 UI 평문 표시?
- [ ] /admin > 고객 문의 현황
- [ ] email, name, message 평문

---

## 🔄 배포 플로우

```
1. 로컬 개발
   ↓ 코드 수정
   ↓ git add
   ↓ git commit
   ↓
2. GitHub 푸시
   ✅ git push origin main (완료!)
   ↓
3. Vercel 자동 감지
   ↓ GitHub webhook
   ↓ 빌드 시작
   ↓
4. 빌드 (2-3분)
   ↓ npm install
   ↓ next build
   ↓ API routes 포함
   ↓
5. 배포
   ✅ /api/admin/inquiries 활성화
   ↓
6. 테스트
   ↓ https://healo-nu.vercel.app/api/admin/inquiries
   ↓ 200 OK (404 아님!)
```

---

## 📝 빠른 체크

### 지금 바로 Vercel에서:

1. **Deployments 탭** 확인
   - 최신 배포 상태: Building → Ready
   
2. **Environment Variables 탭** 확인
   - 5개 환경변수 모두 있는지
   
3. **배포 완료 후 테스트**:
   ```
   https://healo-nu.vercel.app/api/admin/whoami
   https://healo-nu.vercel.app/api/admin/inquiries?limit=5
   ```

---

**작성일**: 2026-01-29  
**Commit**: 1b11b51
