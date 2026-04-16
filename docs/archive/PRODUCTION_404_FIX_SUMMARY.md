# Vercel 404 문제 해결 완료

## 🚨 문제 증상

**Vercel 프로덕션 환경**:
```
fetch("https://healo-nu.vercel.app/api/admin/inquiries?limit=5")
→ 404 Not Found
→ Response: HTML (not JSON)
→ JSON.parse error: Unexpected token '<'
```

**관리자 UI**:
```
/admin > 고객 문의 현황
→ 암호문 표시: {"v":"v1","iv":"...","data":"..."}
→ 평문 표시 안 됨
```

---

## 🔍 근본 원인

### **`app/api/admin/` 폴더가 Git에 추가되지 않음**

```bash
git status
→ Untracked files: app/api/admin/
```

**결과**:
- GitHub에 푸시되지 않음
- Vercel 빌드에 포함되지 않음
- 404 Not Found

---

## ✅ 해결 방법

### 1. Git에 추가
```bash
git add app/api/admin/
git add src/lib/supabase/
git add src/lib/auth/checkAdminAuth.ts
git add src/lib/security/decryptForAdmin.ts
git add middleware.ts
```

### 2. 커밋
```bash
git commit -m "Add admin API routes with SSR auth and PII decryption"
```

**Commit**: `1b11b51`

**변경사항**:
- 14 files changed
- 1764 insertions(+), 15 deletions(-)
- 신규 API routes 5개 추가
- 신규 모듈 5개 추가

---

### 3. GitHub 푸시
```bash
git push origin main
```

**결과**: ✅ 푸시 완료!

---

## 📁 배포된 파일

### 신규 API Routes (5개):
1. ✅ `app/api/admin/inquiries/route.ts` - GET (리스트)
2. ✅ `app/api/admin/inquiries/[id]/route.ts` - GET (상세)
3. ✅ `app/api/admin/notification-recipients/route.ts` - GET, POST
4. ✅ `app/api/admin/notification-recipients/[id]/route.ts` - PATCH, DELETE
5. ✅ `app/api/admin/whoami/route.ts` - GET (진단)

**특징**:
- `export const runtime = "nodejs"` - Node.js 런타임 (Edge 아님)
- crypto AES-256-GCM 사용 가능
- checkAdminAuth() 권한 체크
- decryptInquiriesForAdmin() 복호화

---

### 신규 모듈 (5개):
1. ✅ `src/lib/supabase/browser.ts` - 브라우저 클라이언트
2. ✅ `src/lib/supabase/server.ts` - 서버 클라이언트
3. ✅ `src/lib/auth/checkAdminAuth.ts` - Bearer 토큰 + 쿠키 인증
4. ✅ `src/lib/security/decryptForAdmin.ts` - 관리자 전용 복호화
5. ✅ `src/lib/security/encryptionV2.ts` - AES-256-GCM

---

### 수정 (3개):
1. ✅ `middleware.ts` - SSR auth, /api/admin 보호
2. ✅ `src/AdminPage.jsx` - Bearer token으로 API 호출
3. ✅ `src/legacy-pages/AuthPages.jsx` - SSR browser client

---

## 🔧 Vercel 환경변수 설정 (필수!)

### ⚠️ 지금 바로 설정하세요:

1. https://vercel.com/dashboard 접속
2. HEALO 프로젝트
3. Settings → Environment Variables
4. 다음 5개 추가:

```
NEXT_PUBLIC_SUPABASE_URL=<SUPABASE_URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_SECRET>
ENCRYPTION_KEY_V1=<BASE64_32BYTES>
ADMIN_EMAIL_ALLOWLIST=admin@example.com
```

> ⚠️ 실제 값은 Supabase Dashboard / Vercel Environment Variables에서만 조회/설정.
> 문서/Git에 하드코딩 금지.

5. **Redeploy** 버튼 클릭 (환경변수 적용)

---

## ⏱️ 5분 후 테스트

### 배포 완료 후:

**1. API 엔드포인트**:
```
https://healo-nu.vercel.app/api/admin/inquiries?limit=5
```

**Expected**:
- ✅ 200 OK (404 아님!)
- ✅ JSON 응답 (HTML 아님!)
- ✅ decrypted: true
- ✅ email 평문

---

**2. 관리자 UI**:
```
https://healo-nu.vercel.app/admin
→ 로그인
→ 고객 문의 현황
```

**Expected**:
- ✅ patient@example.com (평문)
- ✅ John (평문)
- ❌ NOT: {"v":"v1"...} (암호문)

---

## 🎯 체크리스트

배포 성공 확인:

- [ ] Vercel Deployments: "Ready" 상태
- [ ] 환경변수 5개 모두 설정됨
- [ ] /api/admin/inquiries → 200 OK (404 아님)
- [ ] /api/admin/inquiries 응답 = JSON (HTML 아님)
- [ ] inquiries[0].email = 평문 (암호문 아님)
- [ ] 관리자 UI에서 평문 표시

---

## 📚 관련 문서

- **`VERCEL_DEPLOYMENT_CHECKLIST.md`** - 환경변수 설정 가이드
- **`ADMIN_DECRYPT_FINAL_FIX.md`** - 복호화 시스템 전체 설명
- **`SSR_AUTH_FIX_COMPLETE.md`** - SSR 인증 구조

---

**Commit**: 1b11b51  
**Pushed**: 2026-01-29  
**Status**: ✅ Ready for Vercel deployment
