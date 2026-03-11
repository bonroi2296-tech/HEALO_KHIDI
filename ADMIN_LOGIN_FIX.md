# 관리자 로그인 문제 해결 가이드

**작성일**: 2026-02-20  
**문제**: 관리자 페이지 접근 시 계속 로그인 페이지로 리다이렉트됨

---

## 🔍 문제 원인

관리자 권한 확인 시 다음 3가지 방법 중 하나를 만족해야 합니다:

1. `user_metadata.role === "admin"`
2. `app_metadata.role === "admin"`
3. **ADMIN_EMAIL_ALLOWLIST 환경변수에 이메일 포함** ← 가장 일반적

대부분의 경우 **3번 방법을 사용**하지만, 환경변수가 설정되지 않았거나 로그인한 이메일이 목록에 없으면 권한이 거부됩니다.

---

## ✅ 해결 방법

### 1. 환경변수 확인 (.env.local)

```bash
# .env.local 파일에 다음 줄이 있는지 확인
ADMIN_EMAIL_ALLOWLIST=admin@healo.com
```

**주의사항**:
- ⚠️ 변수명은 `ADMIN_EMAIL_ALLOWLIST`입니다 (~~ADMIN_EMAILS~~ 아님)
- 여러 이메일은 쉼표로 구분: `admin@healo.com,manager@healo.com`
- 로그인할 이메일이 이 목록에 반드시 포함되어야 합니다

### 2. 로그인할 계정의 이메일 확인

```bash
# 예시: 로그인할 이메일이 admin@healo.com이면
ADMIN_EMAIL_ALLOWLIST=admin@healo.com

# 여러 관리자가 있으면
ADMIN_EMAIL_ALLOWLIST=admin@healo.com,manager@healo.com,developer@healo.com
```

### 3. 개발 서버 재시작

환경변수 변경 후 **반드시 개발 서버를 재시작**해야 합니다:

```bash
# Ctrl+C로 서버 중지 후
npm run dev
```

### 4. 브라우저 콘솔 확인

로그인 시도 후 브라우저 개발자 도구(F12) > Console 탭에서 다음 로그 확인:

```javascript
[LoginPage] whoami result: {
  isAdmin: false,  // ← false면 권한 없음
  email: "user@example.com",
  error: "not_admin",
  reason: null,
  authMethod: "bearer_token",
  debug: {
    allowlist: ["admin@healo.com"],  // ← 허용된 이메일 목록
    emailInAllowlist: false  // ← 현재 이메일이 목록에 없음
  }
}
```

**해석**:
- `isAdmin: false` → 권한 거부
- `debug.allowlist` → 현재 설정된 관리자 이메일 목록
- `debug.emailInAllowlist: false` → 로그인한 이메일이 목록에 없음

---

## 🔧 적용된 수정 사항

### 1. LoginClient.jsx 개선

**변경 전**: 쿠키만 사용하여 권한 확인
```javascript
const whoamiResponse = await fetch('/api/admin/whoami', {
    credentials: 'include',
});
```

**변경 후**: Bearer token 우선 사용
```javascript
const { data: sessionData } = await supabase.auth.getSession();
const accessToken = sessionData?.session?.access_token;

const headers = {
    'Content-Type': 'application/json',
};

if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
}

const whoamiResponse = await fetch('/api/admin/whoami', {
    credentials: 'include',
    headers,
});
```

**이점**:
- ✅ 로그인 직후 세션이 완전히 저장되기 전에도 동작
- ✅ Bearer token으로 명시적 권한 확인
- ✅ 권한 없을 시 명확한 에러 메시지 표시

### 2. AdminGateClient.jsx 개선

Admin 페이지 접근 시에도 Bearer token 사용하도록 변경:

```javascript
const { data: sessionData } = await supabase.auth.getSession();
const accessToken = sessionData?.session?.access_token;

const headers = {
  'Content-Type': 'application/json',
};

if (accessToken) {
  headers['Authorization'] = `Bearer ${accessToken}`;
}

const response = await fetch('/api/admin/whoami', {
  credentials: 'include',
  headers,
});
```

**추가된 디버그 로그**:
- 세션 토큰 존재 여부
- whoami API 응답 상세 정보
- 권한 거부 시 이유 표시

### 3. .env.example 수정

환경변수명을 명확히 표시:

```bash
# ⚠️ 주의: 변수명은 ADMIN_EMAIL_ALLOWLIST 입니다 (ADMIN_EMAILS 아님)
ADMIN_EMAIL_ALLOWLIST=admin@healo.com,manager@healo.com
```

---

## 📋 체크리스트

로그인 문제 해결을 위한 단계별 체크리스트:

- [ ] **1. .env.local 파일에 `ADMIN_EMAIL_ALLOWLIST` 환경변수 설정**
  ```bash
  ADMIN_EMAIL_ALLOWLIST=admin@healo.com
  ```

- [ ] **2. 로그인할 이메일이 목록에 포함되어 있는지 확인**
  - 예: `admin@healo.com`로 로그인하면 목록에 `admin@healo.com` 있어야 함

- [ ] **3. 개발 서버 재시작**
  ```bash
  # Ctrl+C 후
  npm run dev
  ```

- [ ] **4. Supabase에 해당 이메일로 계정 생성**
  - Supabase Dashboard > Authentication > Users 에서 확인
  - 없으면 회원가입 (`/signup`) 또는 Dashboard에서 직접 생성

- [ ] **5. 로그인 시도 후 브라우저 콘솔 확인**
  - F12 > Console
  - `[LoginPage] whoami result` 로그 확인
  - `isAdmin: true`인지 확인

- [ ] **6. Admin 페이지 접근 테스트**
  - `/admin` 접속
  - 리다이렉트되지 않고 대시보드 표시되는지 확인

---

## 🐛 여전히 문제가 있다면

### 디버그 로그 확인

1. **브라우저 콘솔** (F12 > Console):
```javascript
// 로그인 시
[LoginPage] Access token: ✅ exists
[LoginPage] whoami result: {
  isAdmin: true,  // ← 이게 false면 권한 없음
  email: "admin@healo.com",
  reason: "email_allowlist",
  authMethod: "bearer_token"
}

// Admin 페이지 접근 시
[AdminGate] Checking admin access, token: ✅
[AdminGate] whoami result: {
  isAdmin: true,
  email: "admin@healo.com",
  reason: "email_allowlist"
}
```

2. **서버 콘솔** (터미널):
```bash
[checkAdminAuth] ✅ Admin granted via allowlist: admin@healo.com (bearer_token)
```

### 일반적인 문제

#### 문제 1: `isAdmin: false`

**증상**:
```javascript
{
  isAdmin: false,
  error: "not_admin",
  debug: {
    allowlist: ["admin@healo.com"],
    emailInAllowlist: false
  }
}
```

**원인**: 로그인한 이메일이 ADMIN_EMAIL_ALLOWLIST에 없음

**해결**:
```bash
# .env.local에 로그인한 이메일 추가
ADMIN_EMAIL_ALLOWLIST=admin@healo.com,실제로그인한이메일@example.com
```

#### 문제 2: `Access token: ❌ missing`

**증상**:
```javascript
[LoginPage] Access token: ❌ missing
```

**원인**: Supabase 세션이 제대로 저장되지 않음

**해결**:
1. 브라우저 쿠키 삭제 (F12 > Application > Cookies > 전체 삭제)
2. 로그아웃 후 재로그인
3. Supabase 환경변수 확인 (.env.local):
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
   ```

#### 문제 3: `authMethod: "cookie"` instead of `"bearer_token"`

**증상**:
```javascript
{
  authMethod: "cookie",  // bearer_token이어야 함
  isAdmin: false
}
```

**원인**: Bearer token이 전달되지 않음

**해결**: 코드가 최신인지 확인 (위의 수정 사항 적용됨)

---

## 📚 관련 파일

- `app/login/LoginClient.jsx` - 로그인 로직 (Bearer token 추가)
- `app/admin/_components/AdminGateClient.jsx` - Admin 페이지 권한 체크
- `src/lib/auth/checkAdminAuth.ts` - 권한 확인 로직
- `app/api/admin/whoami/route.ts` - 권한 확인 API
- `.env.local` - 환경변수 (ADMIN_EMAIL_ALLOWLIST)

---

## 🎯 요약

1. **`.env.local`에 `ADMIN_EMAIL_ALLOWLIST=로그인할이메일` 설정**
2. **개발 서버 재시작** (`npm run dev`)
3. **해당 이메일로 로그인**
4. **브라우저 콘솔에서 `isAdmin: true` 확인**

---

**문의**: 문제가 계속되면 브라우저 콘솔의 `[LoginPage] whoami result` 로그를 확인하세요.
