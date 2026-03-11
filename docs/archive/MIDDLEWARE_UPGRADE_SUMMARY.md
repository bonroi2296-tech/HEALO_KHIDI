# Middleware 업그레이드 완료 (Supabase SSR)

## 📋 목적

**프로덕션 환경용 Supabase SSR 기반 인증 시스템 구축**

- 개발 편의용 임시 코드 제거
- `@supabase/ssr` 패키지를 사용한 안전한 세션 관리
- 쿠키 기반 서버 사이드 유저 확인

---

## ✅ 완료된 작업

### 1. 패키지 설치
**설치된 패키지**: `@supabase/ssr`

```bash
npm install @supabase/ssr
```

**설치 결과**:
- ✅ `@supabase/ssr` 패키지 추가됨
- ✅ `package.json` dependencies 업데이트됨

---

### 2. middleware.ts 전면 교체

**Before** (임시 코드):
```typescript
// 개발 환경에서 세션 가드 비활성화
const isDevelopment = process.env.NODE_ENV === "development";
if (isDevelopment) {
  return NextResponse.next();
}

// guardAdminPage (커스텀 세션 가드) 사용
const guardResult = guardAdminPage(request);
```

**After** (프로덕션 코드):
```typescript
// Supabase SSR createServerClient 사용
const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: { /* 쿠키 핸들러 */ }
  }
)

// 실제 Supabase 유저 확인
const { data: { user } } = await supabase.auth.getUser()

// 보호된 경로 처리
if (request.nextUrl.pathname.startsWith('/admin') && !user) {
  return NextResponse.redirect('/login')
}
```

---

## 🔐 주요 기능

### 1. `/admin` 경로 보호
**동작**:
- 로그인하지 않은 유저가 `/admin/*` 접근 시 → `/login`으로 리다이렉트
- 로그인한 유저만 `/admin/*` 접근 가능

**예시**:
```
비로그인 상태:
  /admin → /login (리다이렉트)
  /admin/inquiries → /login (리다이렉트)

로그인 상태:
  /admin → /admin (접근 허용)
  /admin/inquiries → /admin/inquiries (접근 허용)
```

---

### 2. 로그인 페이지 자동 리다이렉트
**동작**:
- 로그인한 유저가 `/login` 접근 시 → `/admin`으로 리다이렉트
- 중복 로그인 방지

**예시**:
```
로그인 상태에서:
  /login → /admin (리다이렉트)
```

---

### 3. 쿠키 기반 세션 관리
**특징**:
- Supabase SSR의 `createServerClient` 사용
- 쿠키 자동 관리 (set, get, remove)
- 서버 사이드에서 안전하게 유저 확인

**쿠키 핸들러**:
```typescript
cookies: {
  get(name: string) {
    return request.cookies.get(name)?.value
  },
  set(name: string, value: string, options: CookieOptions) {
    // request와 response 양쪽에 쿠키 설정
    request.cookies.set({ name, value, ...options })
    response.cookies.set({ name, value, ...options })
  },
  remove(name: string, options: CookieOptions) {
    // 쿠키 제거
    request.cookies.set({ name, value: '', ...options })
    response.cookies.set({ name, value: '', ...options })
  },
}
```

---

## 🚀 사용 방법

### 1. 개발 서버 실행
```bash
npm run dev
```

---

### 2. 로그인 테스트

#### 2-1. 비로그인 상태에서 `/admin` 접근
1. 브라우저에서 `http://localhost:3000/admin` 접속
2. **Expected**: 자동으로 `/login`으로 리다이렉트

---

#### 2-2. 로그인 후 `/admin` 접근
1. `http://localhost:3000/login`에서 로그인
2. `http://localhost:3000/admin` 접속
3. **Expected**: `/admin` 페이지 정상 접근

---

#### 2-3. 로그인 상태에서 `/login` 접근
1. 로그인한 상태에서 `http://localhost:3000/login` 접속
2. **Expected**: 자동으로 `/admin`으로 리다이렉트

---

### 3. API 권한 체크와의 통합

**기존 `checkAdminAuth`와 함께 사용**:

```typescript
// middleware.ts: 페이지 레벨 보호
export async function middleware(request: NextRequest) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect('/login')
  }
  return response
}

// API route: API 레벨 권한 체크
export async function GET(request: NextRequest) {
  const authResult = await checkAdminAuth(request)
  if (!authResult.isAdmin) {
    return Response.json({ error: "unauthorized" }, { status: 403 })
  }
  // ... API 로직
}
```

**역할 분담**:
- **middleware.ts**: `/admin` **페이지** 접근 제어
- **checkAdminAuth**: `/api/admin/*` **API** 권한 제어

---

## 🔄 변경된 플로우

### Before (임시 코드):
```
유저가 /admin 접근
  ↓
NODE_ENV === "development"? → YES → ✅ 통과 (체크 안 함)
  ↓ NO (프로덕션)
guardAdminPage (커스텀 세션) 체크
  ↓ valid? → NO → /login 리다이렉트
  ↓ YES → ✅ 통과
```

**문제점**:
- 개발 환경에서 인증 체크 안 함
- 프로덕션과 개발 환경 동작 차이
- 커스텀 세션 가드 유지보수 부담

---

### After (프로덕션 코드):
```
유저가 /admin 접근
  ↓
Supabase auth.getUser() 호출
  ↓ user? → NO → /login 리다이렉트
  ↓ YES → ✅ 통과
```

**개선점**:
- ✅ 개발/프로덕션 동일한 동작
- ✅ Supabase 공식 SSR 라이브러리 사용
- ✅ 쿠키 자동 관리
- ✅ 유지보수 간편

---

## 🧪 테스트 시나리오

### 시나리오 1: 비로그인 → /admin 접근
```bash
# 1. 브라우저 시크릿 모드 열기
# 2. http://localhost:3000/admin 접속
# Expected: /login으로 리다이렉트
```

---

### 시나리오 2: 로그인 → /admin 접근
```bash
# 1. http://localhost:3000/login에서 로그인
# 2. http://localhost:3000/admin 접속
# Expected: /admin 페이지 정상 표시
```

---

### 시나리오 3: 로그인 상태 → /login 접근
```bash
# 1. 로그인 상태 확인
# 2. http://localhost:3000/login 접속
# Expected: /admin으로 리다이렉트
```

---

### 시나리오 4: 로그아웃 → /admin 접근
```bash
# 1. 브라우저 콘솔에서 로그아웃
await supabase.auth.signOut()

# 2. http://localhost:3000/admin 접속
# Expected: /login으로 리다이렉트
```

---

## 📁 영향받는 파일

### 수정된 파일:
- ✅ `middleware.ts` - 전면 교체 (Supabase SSR 기반)
- ✅ `package.json` - `@supabase/ssr` 의존성 추가

### 유지되는 파일:
- ✅ `src/lib/auth/checkAdminAuth.ts` - API 권한 체크 (계속 사용)
- ✅ `src/lib/auth/sessionGuard.ts` - 보관 (필요시 참고용)

**Note**: `sessionGuard.ts`는 더 이상 `middleware.ts`에서 사용되지 않지만, 
기존 참고 자료로 보관할 수 있습니다.

---

## 🎯 핵심 차이점

### 1. 세션 관리 방식

**Before**:
- 커스텀 세션 쿠키 (`admin_last_activity`, `admin_login_time`)
- HttpOnly 쿠키 수동 관리
- idle timeout / absolute timeout 수동 체크

**After**:
- Supabase 공식 세션 관리
- `@supabase/ssr`이 쿠키 자동 관리
- `auth.getUser()`로 유저 확인

---

### 2. 개발 환경 처리

**Before**:
```typescript
const isDevelopment = process.env.NODE_ENV === "development";
if (isDevelopment) {
  return NextResponse.next(); // 체크 안 함
}
```

**After**:
```typescript
// 개발/프로덕션 구분 없음
const { data: { user } } = await supabase.auth.getUser()
// 항상 체크
```

---

### 3. 적용 범위

**Before**:
- `/admin`
- `/ops`

**After**:
- `/admin`
- `/login` (리다이렉트 처리)

---

## 🚨 주의사항

### 1. 환경변수 필수
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
```

**없으면**:
- middleware에서 에러 발생
- 애플리케이션 작동 안 됨

---

### 2. 로그인 페이지 필요
- `/login` 경로가 존재해야 함
- 로그인 페이지에서 Supabase auth 사용

**로그인 페이지 예시**:
```typescript
// pages/login.tsx 또는 app/login/page.tsx
const { error } = await supabase.auth.signInWithPassword({
  email: email,
  password: password,
})

if (!error) {
  router.push('/admin')
}
```

---

### 3. 기존 커스텀 세션과 병행 불가
- 새로운 middleware는 Supabase 세션만 체크
- 기존 `sessionGuard.ts`는 더 이상 사용 안 됨
- 프로덕션 배포 전 충분한 테스트 필요

---

## 🔧 문제 해결

### ❌ "/admin 접근 시 무한 리다이렉트"

**원인**:
- Supabase 환경변수 누락
- Supabase 프로젝트 설정 오류

**해결**:
1. `.env.local` 확인:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
   ```
2. 개발 서버 재시작
3. 브라우저 쿠키 삭제 후 재시도

---

### ❌ "로그인해도 /admin 접근 안 됨"

**원인**:
- 로그인 성공했지만 쿠키 설정 안 됨
- Supabase auth 세션 만료

**해결**:
1. 브라우저 콘솔에서 세션 확인:
   ```javascript
   const { data } = await supabase.auth.getSession()
   console.log(data.session)
   ```
2. 세션이 없으면 재로그인
3. 쿠키 확인 (개발자 도구 → Application → Cookies)

---

### ❌ "API 호출 시 403 Unauthorized"

**원인**:
- middleware는 페이지만 보호
- API는 별도로 `checkAdminAuth` 필요

**해결**:
- API route에서 `checkAdminAuth` 사용 확인:
  ```typescript
  export async function GET(request: NextRequest) {
    const authResult = await checkAdminAuth(request)
    if (!authResult.isAdmin) {
      return Response.json({ error: "unauthorized" }, { status: 403 })
    }
    // ...
  }
  ```

---

## 📚 관련 문서

- **`ADMIN_AUTH_GUIDE.md`**: 관리자 권한 설정 가이드
- **`ADMIN_DECRYPTION_SUMMARY.md`**: 관리자 PII 복호화 가이드
- **Supabase SSR 공식 문서**: https://supabase.com/docs/guides/auth/server-side/nextjs

---

## 🎉 완료!

**이제 프로덕션 환경에서 안전하게 작동하는 Supabase SSR 기반 인증 시스템이 구축되었습니다!**

### 다음 단계:
1. ✅ 개발 서버에서 로그인/로그아웃 테스트
2. ✅ `/admin` 페이지 접근 테스트
3. ✅ `/api/admin/*` API 호출 테스트
4. ✅ 프로덕션 배포 전 충분한 테스트

---

**업그레이드 완료 날짜**: 2026-01-29
