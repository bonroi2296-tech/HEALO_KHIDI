# 관리자 복호화 조회 문제 해결 가이드

## 🚨 증상: 관리자 화면에서 암호문이 보임

### 빠른 체크리스트

관리자 화면에서 복호화된 평문 대신 암호문(`{"v":"v1","iv":"..."}`)이 보인다면:

- [ ] 1. 로그인 상태 확인
- [ ] 2. 관리자 권한 설정 확인
- [ ] 3. 쿠키 확인
- [ ] 4. localhost 접속 확인 (127.0.0.1 금지)
- [ ] 5. 환경변수 확인

---

## 🔍 단계별 진단

### 1단계: 진단 API 호출

**브라우저 콘솔에서 실행**:
```javascript
fetch('/api/admin/whoami', { credentials: 'include' })
  .then(r => r.json())
  .then(data => console.log(data))
```

**예상 출력**:

#### ✅ 정상 (관리자):
```json
{
  "isAdmin": true,
  "email": "admin@healo.com",
  "reason": "email_allowlist",
  "error": null,
  "debug": {
    "cookieCount": 5,
    "hasSbAccessToken": true,
    "hasSbRefreshToken": true,
    "hasUser": true,
    "email": "admin@healo.com",
    "allowlistCount": 1
  }
}
```

#### ❌ 비로그인:
```json
{
  "isAdmin": false,
  "email": null,
  "error": "no_auth_token",
  "debug": {
    "cookieCount": 0,
    "hasSbAccessToken": false,
    "hasSbRefreshToken": false
  }
}
```

#### ❌ 권한 없음:
```json
{
  "isAdmin": false,
  "email": "user@example.com",
  "error": "not_admin",
  "debug": {
    "hasUser": true,
    "email": "user@example.com",
    "userMetadataRole": null,
    "appMetadataRole": null,
    "allowlistCount": 1,
    "emailInAllowlist": false
  }
}
```

---

### 2단계: 문제 원인 파악

#### 문제 A: `"error": "no_auth_token"`

**원인**: 로그인하지 않았거나 쿠키가 없음

**해결**:
```javascript
// 1. 로그인 상태 확인
const { data } = await supabase.auth.getSession()
console.log('Session:', data.session)

// 2. 세션이 없으면 로그인
// /login 페이지에서 로그인

// 3. 로그인 후 재확인
fetch('/api/admin/whoami', { credentials: 'include' })
  .then(r => r.json())
  .then(data => console.log(data))
```

---

#### 문제 B: `"error": "not_admin"`

**원인**: 로그인했지만 관리자 권한이 없음

**해결**:

**방법 1: user_metadata.role 설정 (권장)**
```bash
npx tsx scripts/set-admin.ts --email YOUR_EMAIL@domain.com --role admin
```

**방법 2: 환경변수 allowlist 추가**
```bash
# .env.local 수정
ADMIN_EMAIL_ALLOWLIST=YOUR_EMAIL@domain.com
```

**방법 3: 이메일 확인**
```javascript
// 현재 로그인 이메일 확인
const { data } = await supabase.auth.getSession()
console.log('Email:', data.session?.user.email)

// allowlist에 이 이메일 추가
```

---

#### 문제 C: `"cookieCount": 0` (쿠키 없음)

**원인**: 쿠키가 전달되지 않음

**해결**:

1. **fetch에 credentials 옵션 확인**:
   ```javascript
   // ✅ 올바른 방법
   fetch('/api/admin/inquiries', { credentials: 'include' })
   
   // ❌ 잘못된 방법
   fetch('/api/admin/inquiries') // credentials 없음
   ```

2. **브라우저 직접 URL 입력은 쿠키 안 붙음**:
   ```
   ❌ http://localhost:3000/api/admin/inquiries (브라우저 주소창)
   → 쿠키 없이 요청됨
   
   ✅ fetch('/api/admin/inquiries', { credentials: 'include' })
   → 쿠키 포함
   ```

3. **도메인 불일치**:
   ```
   ❌ 127.0.0.1:3000에서 로그인 → localhost:3000에서 접속
   → 쿠키 도메인 불일치
   
   ✅ localhost:3000에서 로그인 → localhost:3000에서 접속
   → 쿠키 정상
   ```

---

### 3단계: 복호화 API 테스트

**브라우저 콘솔에서 실행**:
```javascript
fetch('/api/admin/inquiries?limit=5&decrypt=true', { credentials: 'include' })
  .then(r => r.json())
  .then(data => {
    console.log('Result:', data)
    if (data.ok) {
      console.log('✅ 복호화 성공!')
      console.log('First inquiry:', data.inquiries[0])
    } else {
      console.error('❌ 실패:', data.error)
      if (data.debug) console.log('Debug:', data.debug)
    }
  })
```

**예상 출력**:

#### ✅ 성공:
```json
{
  "ok": true,
  "inquiries": [
    {
      "id": 1,
      "email": "patient@example.com",  // ✅ 평문 (복호화됨)
      "first_name": "John",
      "message": "I need help"
    }
  ],
  "decrypted": true
}
```

#### ❌ 실패 (403):
```json
{
  "ok": false,
  "error": "unauthorized",
  "detail": "관리자 권한이 필요합니다",
  "debug": {
    "hasUser": true,
    "email": "user@example.com",
    "emailInAllowlist": false
  }
}
```

---

## 🔧 자주 발생하는 문제

### 문제 1: "로그인했는데 unauthorized"

**체크 포인트**:

1. **로그인한 이메일 확인**:
   ```javascript
   const { data } = await supabase.auth.getSession()
   console.log('Email:', data.session?.user.email)
   ```

2. **allowlist 확인**:
   ```bash
   # .env.local 확인
   cat .env.local | grep ADMIN_EMAIL_ALLOWLIST
   ```

3. **이메일 대소문자 확인**:
   ```
   ❌ ADMIN_EMAIL_ALLOWLIST=Admin@Healo.com
      로그인: admin@healo.com
      → 매칭 안 됨
   
   ✅ ADMIN_EMAIL_ALLOWLIST=admin@healo.com
      로그인: admin@healo.com (소문자 normalize됨)
      → 매칭 됨
   ```

4. **공백 확인**:
   ```
   ❌ ADMIN_EMAIL_ALLOWLIST= admin@healo.com , manager@healo.com
      → 공백 포함
   
   ✅ ADMIN_EMAIL_ALLOWLIST=admin@healo.com,manager@healo.com
      → 자동 trim됨
   ```

5. **서버 재시작 확인**:
   ```bash
   # .env.local 수정 후 반드시 서버 재시작
   # Ctrl+C
   npm run dev
   ```

---

### 문제 2: "localhost에서 되는데 127.0.0.1에서 안 됨"

**원인**: 쿠키 도메인 불일치

**해결**:
```
❌ localhost:3000에서 로그인 → 127.0.0.1:3000 접속
   → 쿠키가 localhost 도메인에만 설정됨

✅ localhost:3000에서 로그인 → localhost:3000 접속
   → 쿠키 정상
```

**권장**: 항상 `localhost:3000`으로 통일하여 사용

---

### 문제 3: "개발 환경에서는 되는데 브라우저 주소창에서 안 됨"

**원인**: 브라우저 주소창에 직접 URL 입력 시 credentials가 포함 안 됨

**해결**:

```javascript
// ✅ 브라우저 콘솔에서 테스트
fetch('/api/admin/inquiries?limit=5', { credentials: 'include' })
  .then(r => r.json())
  .then(data => console.log(data))

// ❌ 브라우저 주소창에 직접 입력
// http://localhost:3000/api/admin/inquiries?limit=5
// → 쿠키 없이 요청됨
```

---

### 문제 4: "관리자 role을 설정했는데 안 됨"

**체크 포인트**:

1. **스크립트 실행 확인**:
   ```bash
   npx tsx scripts/set-admin.ts --email YOUR_EMAIL --role admin
   
   # 출력:
   # ✅ 유저 발견: YOUR_EMAIL
   # ✅ Role 업데이트 완료
   ```

2. **role 설정 확인**:
   ```bash
   npx tsx scripts/set-admin.ts --list
   
   # 출력에서 해당 이메일이 admin으로 표시되는지 확인
   ```

3. **로그아웃 후 재로그인**:
   ```javascript
   // 브라우저 콘솔에서
   await supabase.auth.signOut()
   // 그런 다음 다시 로그인
   ```

4. **진단 API 재확인**:
   ```javascript
   fetch('/api/admin/whoami', { credentials: 'include' })
     .then(r => r.json())
     .then(data => {
       console.log('isAdmin:', data.isAdmin)
       console.log('reason:', data.reason)
     })
   ```

---

## 📋 완전 체크리스트

### 환경변수 확인:
```bash
# .env.local 확인
cat .env.local

# 필수 항목:
# NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
# ADMIN_EMAIL_ALLOWLIST=admin@healo.com
```

### 로그인 상태 확인:
```javascript
// 브라우저 콘솔에서
const { data } = await supabase.auth.getSession()
console.log('Session:', data.session)
console.log('Email:', data.session?.user.email)
```

### 쿠키 확인:
```
1. 개발자 도구 열기 (F12)
2. Application 탭
3. Cookies → http://localhost:3000
4. sb-access-token, sb-refresh-token 있는지 확인
```

### 관리자 권한 확인:
```bash
npx tsx scripts/set-admin.ts --list
```

### 진단 API 확인:
```javascript
fetch('/api/admin/whoami', { credentials: 'include' })
  .then(r => r.json())
  .then(data => console.log(data))
```

### 복호화 API 확인:
```javascript
fetch('/api/admin/inquiries?limit=1&decrypt=true', { credentials: 'include' })
  .then(r => r.json())
  .then(data => console.log(data))
```

---

## 🎯 최종 확인

**모든 것이 정상이면**:

1. ✅ `/api/admin/whoami` → `{ isAdmin: true }`
2. ✅ `/api/admin/inquiries` → `{ ok: true, decrypted: true }`
3. ✅ 관리자 UI에서 평문 표시 (`patient@example.com`, `John` 등)

**여전히 문제가 있다면**:

```javascript
// 디버그 정보 전체 수집
const debug = {
  session: await supabase.auth.getSession(),
  whoami: await fetch('/api/admin/whoami', { credentials: 'include' }).then(r => r.json()),
  inquiries: await fetch('/api/admin/inquiries?limit=1', { credentials: 'include' }).then(r => r.json()),
  cookies: document.cookie,
}
console.log('Debug Info:', debug)

// 이 정보를 복사해서 이슈 리포트
```

---

## 📚 관련 문서

- **`ADMIN_AUTH_GUIDE.md`**: 관리자 권한 설정 전체 가이드
- **`ADMIN_AUTH_QUICK_START.md`**: 5분 빠른 시작
- **`ADMIN_DECRYPTION_SUMMARY.md`**: 복호화 시스템 개요
- **`MIDDLEWARE_UPGRADE_SUMMARY.md`**: Middleware 업그레이드 내용

---

**작성일**: 2026-01-29
