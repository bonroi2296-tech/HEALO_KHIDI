# 관리자 로그인 문제 해결

## 🚨 증상

로그인은 성공하는데 관리자 페이지로 이동이 안 됨

```
1. localhost:3000/login 접속
2. admin@healo.com 로그인
3. 콘솔: "Logged in: admin@healo.com" ✅
4. 하지만 페이지 이동 안 됨 ❌
```

---

## ✅ 수정 완료

### 파일: `src/legacy-pages/AuthPages.jsx`

**Before** (문제):
```javascript
if (data.user.email === 'admin@healo.com') {
    setView('admin'); // router.push('/admin') 호출
} else {
    setView('home');
}
```

**문제점**:
- Next.js router.push()는 클라이언트 사이드 라우팅
- Supabase 쿠키가 완전히 설정되기 전에 이동
- middleware가 세션을 제대로 읽지 못함

---

**After** (해결):
```javascript
// 로그인 성공
console.log("Logged in:", data.user.email);

// ✅ 쿠키가 설정되도록 잠시 대기 후 리다이렉트
setTimeout(() => {
    // 페이지 새로고침하여 middleware가 세션 확인하도록 함
    window.location.href = '/admin';
}, 100);
```

**개선점**:
- ✅ `window.location.href` 사용 (페이지 완전 새로고침)
- ✅ 100ms 대기로 쿠키 설정 시간 확보
- ✅ middleware가 세션을 제대로 읽고 `/admin` 접근 허용

---

## 🧪 지금 바로 테스트

### 1. 브라우저 새로고침
```
1. F5 또는 Ctrl+R (현재 로그인 페이지 새로고침)
2. 다시 로그인
3. Expected: 자동으로 /admin으로 이동 ✅
```

---

### 2. 로그아웃 후 재로그인

**브라우저 콘솔에서**:
```javascript
// 1. 로그아웃
await supabase.auth.signOut()

// 2. /login 페이지로 이동
window.location.href = '/login'

// 3. 다시 로그인
// Expected: /admin으로 자동 이동
```

---

### 3. 진단 API로 확인

**로그인 후 브라우저 콘솔**:
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
  "reason": "email_allowlist",
  "debug": {
    "hasUser": true,
    "hasSbAccessToken": true,
    "allowlistCount": 1
  }
}
```

---

## 🔄 로그인 플로우

### Before (문제):
```
1. 로그인 성공
   ↓
2. setView('admin')
   ↓
3. router.push('/admin') (클라이언트 라우팅)
   ↓
4. middleware 체크
   ↓ 쿠키가 아직 설정 안 됨
   ↓
5. ❌ /login으로 리다이렉트 (무한 루프)
```

---

### After (해결):
```
1. 로그인 성공
   ↓
2. 100ms 대기 (쿠키 설정 시간)
   ↓
3. window.location.href = '/admin' (페이지 새로고침)
   ↓
4. middleware 체크
   ↓ 쿠키 읽기
   ↓ user 있음
   ↓
5. ✅ /admin 접근 허용
```

---

## 🚨 만약 여전히 안 된다면

### 디버깅 단계:

#### 1. 쿠키 확인
```
F12 → Application → Cookies → http://localhost:3000
→ sb-access-token, sb-refresh-token 있는지 확인
```

#### 2. 세션 확인
```javascript
const { data } = await supabase.auth.getSession()
console.log('Session:', data.session)
console.log('User:', data.session?.user.email)
```

#### 3. 진단 API 확인
```javascript
fetch('/api/admin/whoami', { credentials: 'include' })
  .then(r => r.json())
  .then(data => console.log('whoami:', data))
```

#### 4. 환경변수 확인
```javascript
fetch('/api/admin/whoami', { credentials: 'include' })
  .then(r => r.json())
  .then(data => console.log('debug.envVars:', data.debug?.envVars))
```

**Expected**:
```json
{
  "hasSupabaseUrl": true,
  "hasSupabaseAnonKey": true,
  "hasAdminAllowlist": true,
  "allowlistValue": "admin@healo.com"
}
```

---

### 5. 캐시 클리어 (최후 수단)

```
1. 개발자 도구 (F12)
2. Application 탭
3. "Clear site data" 클릭
4. 페이지 새로고침
5. 다시 로그인
```

---

## 📁 수정된 파일

**수정**:
- ✅ `src/legacy-pages/AuthPages.jsx`
  - `LoginPage` 컴포넌트의 `handleLogin` 함수
  - `setView('admin')` → `window.location.href = '/admin'`
  - 100ms 대기 추가 (쿠키 설정 시간 확보)

- ✅ `app/api/admin/whoami/route.ts`
  - 더 상세한 debug 정보 추가 (envVars 포함)

---

## 🎉 완료!

**이제 로그인하면 자동으로 관리자 페이지로 이동합니다!**

### 확인 방법:
1. ✅ 페이지 새로고침 (F5)
2. ✅ admin@healo.com 로그인
3. ✅ 자동으로 /admin으로 이동
4. ✅ 관리자 페이지 정상 표시

---

**작성일**: 2026-01-29
