# HEALO 보안 설정 가이드

## 개요

HEALO의 inquiries/normalized_inquiries를 의료 민감 데이터로 취급하여 보안을 강화합니다.

## 적용 항목

1. **RLS (Row Level Security) 정책**
2. **Storage 보안 (private 버킷 + signed URL)**
3. **데이터 암호화 (pgcrypto)**
4. **데이터 분리 준비 (선택적)**

---

## 1. RLS 정책 적용

### 실행 순서

1. Supabase Dashboard > SQL Editor에서 다음 파일 실행:
   ```
   migrations/20260125_security_rls_policies.sql
   ```

2. 정책 확인:
   ```sql
   select schemaname, tablename, policyname, permissive, roles, cmd
   from pg_policies
   where tablename in ('inquiries', 'normalized_inquiries', 'human_touchpoints');
   ```

### 정책 내용

- **inquiries**: 클라이언트는 INSERT만 허용, SELECT 금지
- **normalized_inquiries**: 클라이언트 접근 금지 (서버만)
- **human_touchpoints**: 클라이언트 접근 금지 (서버만)
- **service_role**: 모든 테이블에 대해 모든 작업 허용

---

## 2. Storage 보안 설정

### 2.1 버킷을 Private로 전환

1. Supabase Dashboard > Storage > `attachments` 버킷
2. Settings > Public bucket: **OFF** (Private로 설정)

### 2.2 Signed URL API 사용

프론트엔드에서 attachment를 표시할 때:

```typescript
// 기존 (public URL 사용 - 제거)
// const url = supabase.storage.from('attachments').getPublicUrl(path);

// 변경 (signed URL 사용 - 권한 검증 포함)
// 주의: inquiryId, path, publicToken이 모두 필요
const res = await fetch('/api/attachments/sign', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    inquiryId: inquiryId,        // inquiries.id
    path: attachmentPath,        // inquiries.attachment (path만)
    publicToken: publicToken      // inquiries.public_token
  }),
});

if (!res.ok) {
  const error = await res.json();
  console.error('Signed URL failed:', error);
  // 400: 필수 파라미터 누락
  // 403: public_token 불일치 또는 path 권한 없음
  // 404: inquiryId 존재하지 않음
  return;
}

const { signedUrl } = await res.json();
// signedUrl은 5분 후 만료됨
```

**API 요구사항**:
- `inquiryId`: `inquiries.id` (bigint 또는 uuid)
- `path`: `inquiries.attachment` 값 (반드시 `inquiry/`로 시작)
- `publicToken`: `inquiries.public_token` (UUID)

**보안 검증**:
1. `path`가 `inquiry/`로 시작하는지 확인
2. `inquiryId`로 `inquiries` 레코드 존재 확인
3. `public_token`이 요청 `publicToken`과 일치하는지 확인
4. `inquiries.attachment`에 요청 `path`가 포함되는지 확인

**에러 코드**:
- `400`: 필수 파라미터 누락 또는 path 형식 오류
- `403`: public_token 불일치 또는 path 권한 없음
- `404`: inquiryId 존재하지 않음
- `500`: Storage signed URL 생성 실패

---

## 3. 데이터 암호화 설정

### 3.1 pgcrypto 함수 생성

1. Supabase Dashboard > SQL Editor에서 실행:
   ```
   migrations/20260125_security_encryption_functions.sql
   ```

2. 함수 확인:
   ```sql
   select proname, prosrc from pg_proc
   where proname in ('encrypt_text', 'decrypt_text', 'email_hash');
   ```

### 3.2 환경변수 설정

서버 환경변수에 추가:

```bash
# .env.local (로컬 개발)
SUPABASE_ENCRYPTION_KEY=your-32-character-minimum-random-string-here

# Supabase Dashboard > Settings > API > Environment Variables (프로덕션)
```

**주의**: 
- 키는 최소 32자 이상의 강력한 랜덤 문자열
- DB에 저장하지 않음
- 서버에서만 접근 가능
- **키 분실/변경 시 기존 데이터 복호화 불가** (백업 필수)

**키 생성 방법**:
```bash
# 방법 1: openssl
openssl rand -hex 32

# 방법 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**서버 부팅 시 검증**:
- 프로덕션 환경: 키가 없거나 32자 미만이면 서버 시작 실패 (`process.exit(1)`)
- 개발 환경: 경고 메시지 출력 (서버는 시작되지만 암호화 실패)

### 3.3 암호화 적용 범위

현재 적용:
- `normalized_inquiries.raw_message` → 암호화
- `normalized_inquiries.contact.email` → 암호화
- `normalized_inquiries.contact.messenger_handle` → 암호화
- `normalized_inquiries.contact.email_hash` → 검색용 해시 (복호화 불가)

**주의**: `inquiries` 테이블은 기존 구조 유지 (나중에 분리 테이블로 마이그레이션 권장)

---

## 4. 데이터 분리 (선택적)

### 4.1 분리 테이블 생성

필요시 다음 마이그레이션 실행:

```
migrations/20260125_security_table_separation.sql
```

이 마이그레이션은:
- `inquiry_contacts` 테이블 생성 (PII: email, contact_id)
- `inquiry_medical` 테이블 생성 (의료 데이터: message)
- `inquiries` 테이블에 `public_token` 추가

### 4.2 마이그레이션 전략

1. **새 레코드**: `inquiry_contacts` + `inquiry_medical`에 저장
2. **기존 레코드**: 점진적으로 마이그레이션 (헬퍼 함수 제공)
3. **inquiries 테이블**: id, created_at, status, public_token만 유지

---

## 5. 검증

### 5.1 RLS 정책 확인

```sql
-- 클라이언트에서 inquiries SELECT 시도 (실패해야 함)
-- 서버(service_role)에서만 가능

-- 정책 목록 확인
select * from pg_policies
where tablename = 'inquiries';
```

### 5.2 암호화 확인

```sql
-- 암호화된 데이터 확인 (base64 문자열)
select id, raw_message, contact->>'email' as email_enc
from normalized_inquiries
order by created_at desc
limit 5;

-- 복호화 테스트 (서버에서만, 환경변수 키 필요)
-- select decrypt_text(
--   (select raw_message from normalized_inquiries limit 1),
--   'your-encryption-key'
-- );
```

### 5.3 Storage 확인

```sql
-- attachment path 확인 (public URL 아님)
select id, attachment
from inquiries
where attachment is not null
limit 5;

-- path는 "inquiry/1234567890_filename.jpg" 형식
```

---

## 6. 주의사항

### 6.1 기존 데이터

- **RLS**: 기존 데이터는 서버에서만 접근 가능
- **암호화**: 새로 생성되는 `normalized_inquiries` 레코드만 암호화됨
- **기존 레코드**: 평문으로 저장되어 있음 (필요시 마이그레이션)

### 6.2 복호화

- 암호화된 데이터는 **서버에서만** 복호화 가능
- `src/lib/security/encryption.ts`의 `decryptText()` 함수 사용
- 클라이언트에서는 복호화 불가

### 6.3 키 관리

- `SUPABASE_ENCRYPTION_KEY`는 서버 환경변수에서만 관리
- 키 분실 시 복호화 불가 (백업 필수)
- 키 변경 시 기존 데이터는 복호화 불가 (새 키로 재암호화 필요)

---

## 7. 보안 스모크 테스트

실제 환경에서 보안 기능이 정상 작동하는지 검증:

**문서**: `migrations/SECURITY_SMOKE_TEST.md`

주요 테스트 항목:
1. RLS 정책 검증 (INSERT 허용, SELECT 차단)
2. 암호화 확인 (raw_message, contact.email)
3. Storage 보안 (path만 저장, signed URL)
4. 환경변수 검증 (키 누락 시 에러)

**예상 소요 시간**: 약 10-15분

---

## 8. 다음 단계 (로드맵)

1. **기존 데이터 마이그레이션**: 평문 → 암호화
2. **inquiries 테이블 분리**: inquiry_contacts + inquiry_medical 사용
3. **감사 로그**: 접근/수정 이력 기록
4. **키 로테이션**: 주기적 키 변경 및 재암호화
5. **백업 암호화**: DB 백업 파일도 암호화

---

## 8. 문제 해결

### RLS 정책이 작동하지 않음

```sql
-- RLS 활성화 확인
select tablename, rowsecurity from pg_tables
where tablename in ('inquiries', 'normalized_inquiries');

-- 정책 확인
select * from pg_policies where tablename = 'inquiries';
```

### 암호화 실패

- 환경변수 `SUPABASE_ENCRYPTION_KEY` 확인
- pgcrypto extension 활성화 확인: `create extension if not exists pgcrypto;`
- 서버 로그 확인: `[security/encryption]` 에러 메시지

### Signed URL 실패

- Storage 버킷이 Private로 설정되었는지 확인
- `attachments` 버킷 권한 확인
- API route 로그 확인: `[api/attachments/sign]`
- `inquiries.public_token` 컬럼 존재 확인
- 요청 파라미터 확인: `inquiryId`, `path`, `publicToken` 모두 필요
- `path`가 `inquiry/`로 시작하는지 확인
- `inquiries.attachment`에 요청 `path`가 포함되는지 확인

### 환경변수 검증 실패

- 프로덕션 환경에서 서버 시작 실패 시:
  - `SUPABASE_ENCRYPTION_KEY` 환경변수 확인
  - 키 길이가 32자 이상인지 확인
  - 서버 로그에서 `[security/encryption]` 에러 메시지 확인
