# 관리자 권한 빠른 시작 가이드

## 🚀 빠른 시작 (5분)

### 문제: "/api/admin/inquiries" 호출 시 403 Unauthorized 발생

### 해결: 관리자 권한 설정

---

## ✅ 단계별 가이드

### 1단계: 현재 로그인한 계정 확인

**브라우저 콘솔에서**:
```javascript
// Supabase 클라이언트가 있다면
const { data } = await supabase.auth.getSession();
console.log("현재 로그인:", data.session?.user.email);
```

또는 **로그인 페이지에서 로그인한 이메일을 확인**하세요.

---

### 2단계: 관리자 role 부여

**방법 A: 스크립트 사용 (권장)**

```bash
# 터미널에서 실행
npx tsx scripts/set-admin.ts --email YOUR_EMAIL@domain.com --role admin
```

**예시**:
```bash
npx tsx scripts/set-admin.ts --email admin@healo.com --role admin
```

**출력**:
```
✅ 유저 발견: admin@healo.com (ID: ...)
✅ Role 업데이트 완료: admin@healo.com → admin
   user_metadata.role: admin
```

---

**방법 B: 환경변수 사용 (빠른 테스트)**

1. `.env.local` 파일 열기
2. 다음 줄 추가:
   ```
   ADMIN_EMAIL_ALLOWLIST=YOUR_EMAIL@domain.com
   ```
3. 개발 서버 재시작 (Ctrl+C 후 `npm run dev`)

---

### 3단계: 브라우저에서 로그아웃 후 재로그인

```javascript
// 브라우저 콘솔에서
await supabase.auth.signOut();
// 그런 다음 다시 로그인
```

---

### 4단계: 관리자 API 테스트

**브라우저 콘솔에서**:
```javascript
fetch("/api/admin/inquiries?limit=5&decrypt=true")
  .then(r => r.json())
  .then(data => console.log(data));
```

**Expected 출력**:
```json
{
  "ok": true,
  "inquiries": [
    {
      "id": 1,
      "email": "patient@example.com",  // ✅ 평문 (복호화됨)
      "first_name": "John"
    }
  ],
  "decrypted": true
}
```

---

### 5단계: 관리자 목록 확인

```bash
npx tsx scripts/set-admin.ts --list
```

**출력**:
```
📋 관리자 목록

✅ metadata.role="admin"인 유저 (1명):
  1. admin@healo.com (ID: ..., source: user_metadata)

📧 환경변수 ADMIN_EMAIL_ALLOWLIST (1명):
  1. admin@healo.com
```

---

## 🔧 문제 해결

### ❌ "유저를 찾을 수 없습니다" 오류

**원인**: 해당 이메일로 회원가입을 하지 않음

**해결**:
1. 해당 이메일로 회원가입
2. 가입 후 스크립트 재실행

---

### ❌ 여전히 403 Unauthorized

**체크리스트**:
- [ ] 스크립트 실행 완료?
- [ ] 로그아웃 후 재로그인?
- [ ] 올바른 이메일 사용?
- [ ] 환경변수 사용 시 서버 재시작?

**디버깅**:
```bash
# 1. 관리자 목록 확인
npx tsx scripts/set-admin.ts --list

# 2. 현재 로그인 계정 확인
# (브라우저 콘솔에서)
const { data } = await supabase.auth.getSession();
console.log(data.session?.user.email);
console.log(data.session?.user.user_metadata);
```

---

### ❌ 스크립트 실행 시 환경변수 오류

**원인**: Supabase 환경변수 누락

**해결**: `.env.local` 확인
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
```

---

## 📚 상세 문서

전체 가이드는 다음 문서를 참조하세요:

- **`ADMIN_AUTH_GUIDE.md`**: 관리자 권한 관리 전체 가이드
- **`ADMIN_DECRYPTION_SUMMARY.md`**: 관리자 PII 복호화 가이드

---

## 🎯 요약

### 관리자 권한 부여 방법:

1. **user_metadata.role 설정** (권장):
   ```bash
   npx tsx scripts/set-admin.ts --email YOUR_EMAIL --role admin
   ```

2. **환경변수 설정** (빠른 테스트):
   ```.env.local
   ADMIN_EMAIL_ALLOWLIST=YOUR_EMAIL
   ```

3. **로그아웃 후 재로그인**

4. **테스트**:
   ```javascript
   fetch("/api/admin/inquiries?limit=5&decrypt=true")
   ```

---

**5분이면 완료됩니다!** 🚀
