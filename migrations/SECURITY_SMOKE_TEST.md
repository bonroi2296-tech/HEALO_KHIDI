# HEALO 보안 스모크 테스트

## 개요

HEALO 보안 강화 기능이 정상 작동하는지 검증하는 실용적인 체크리스트입니다.
각 테스트는 **10분 내에 재현 가능**하며, 실제 환경에서 실행하여 확인할 수 있습니다.

---

## 사전 준비

1. **Supabase Dashboard 접근**
2. **로컬 개발 서버 실행** (`npm run dev`)
3. **환경변수 설정 확인**:
   ```bash
   # .env.local
   SUPABASE_ENCRYPTION_KEY=your-32-character-minimum-key-here
   ```

---

## 테스트 1: RLS 정책 - 클라이언트 INSERT 허용

### 목적
비로그인(anon) 사용자가 `inquiries` 테이블에 INSERT할 수 있는지 확인

### 실행 방법

**방법 A: 프론트엔드에서 Inquiry Form 제출**
1. 브라우저에서 `/inquiry` 페이지 접속
2. Inquiry Form 작성 및 제출
3. Success 페이지로 이동 확인

**방법 B: Supabase SQL Editor에서 직접 확인**
```sql
-- 클라이언트 역할로 INSERT 시도 (anon)
-- 주의: 실제로는 프론트엔드에서 실행됨
-- 이 쿼리는 참고용 (서버에서 실행하면 service_role이므로 항상 성공)
```

### 기대 결과
- ✅ Inquiry Form 제출 성공
- ✅ `inquiries` 테이블에 레코드 생성
- ✅ Success 페이지 표시

### 확인용 SQL
```sql
-- 최신 inquiries 레코드 확인
SELECT id, first_name, last_name, email, created_at, status
FROM public.inquiries
ORDER BY created_at DESC
LIMIT 1;
```

---

## 테스트 2: RLS 정책 - 클라이언트 SELECT 차단

### 목적
클라이언트에서 `inquiries` 테이블을 SELECT할 수 없는지 확인

### 실행 방법

**브라우저 콘솔에서 실행** (프론트엔드):
```javascript
// Supabase 클라이언트 사용 (anon key)
const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SUPABASE_ANON_KEY'
);

// SELECT 시도
const { data, error } = await supabase
  .from('inquiries')
  .select('*')
  .limit(1);

console.log('Error:', error);
```

### 기대 결과
- ❌ SELECT 실패
- ❌ 에러 메시지: "new row violates row-level security policy" 또는 유사한 RLS 에러

### 확인용 SQL
```sql
-- RLS 정책 확인
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'inquiries';
```

---

## 테스트 3: normalize API - normalized_inquiries 적재

### 목적
Inquiry Form 제출 후 `/api/inquiry/normalize`가 정상 호출되어 `normalized_inquiries`에 레코드가 생성되는지 확인

### 실행 방법

1. Inquiry Form 제출 (테스트 1 참고)
2. 서버 로그 확인:
   ```
   [api/inquiry/normalize] normalized_inquiries insert success
   ```
3. 또는 브라우저 Network 탭에서 `/api/inquiry/normalize` 호출 확인

### 기대 결과
- ✅ `/api/inquiry/normalize` POST 요청 성공 (200 OK)
- ✅ `normalized_inquiries` 테이블에 레코드 생성
- ✅ `source_type = 'inquiry_form'` 확인

### 확인용 SQL
```sql
-- 최신 normalized_inquiries 레코드 확인
SELECT 
  id,
  created_at,
  source_type,
  source_inquiry_id,
  extraction_confidence,
  missing_fields
FROM public.normalized_inquiries
WHERE source_type = 'inquiry_form'
ORDER BY created_at DESC
LIMIT 1;
```

---

## 테스트 4: 암호화 - raw_message 암호문 확인

### 목적
`normalized_inquiries.raw_message`가 암호화되어 저장되는지 확인 (평문이 아님)

### 실행 방법

1. Inquiry Form 제출 (테스트 1 참고)
2. Supabase SQL Editor에서 확인

### 기대 결과
- ✅ `raw_message`가 base64 인코딩된 암호문 (예: `"c29tZSBsb25nIGVuY3J5cHRlZCBzdHJpbmc..."`)
- ❌ 평문이 아님 (예: `"I have back pain"`)

### 확인용 SQL
```sql
-- raw_message 확인 (암호문이어야 함)
SELECT 
  id,
  source_type,
  raw_message,
  -- 평문이면 실패, base64 암호문이면 성공
  CASE 
    WHEN raw_message ~ '^[A-Za-z0-9+/=]+$' AND length(raw_message) > 50 
    THEN '암호화됨 (base64)'
    ELSE '평문 또는 암호화 실패'
  END AS encryption_status
FROM public.normalized_inquiries
ORDER BY created_at DESC
LIMIT 5;
```

---

## 테스트 5: 암호화 - contact.email 암호문 확인

### 목적
`normalized_inquiries.contact.email`이 암호화되어 저장되는지 확인

### 실행 방법

1. Inquiry Form 제출 (테스트 1 참고)
2. Supabase SQL Editor에서 확인

### 기대 결과
- ✅ `contact->>'email'`이 base64 인코딩된 암호문
- ✅ `contact->>'email_hash'`가 sha256 해시 (hex, 64자)
- ❌ 평문 이메일이 아님

### 확인용 SQL
```sql
-- contact.email 및 email_hash 확인
SELECT 
  id,
  source_type,
  contact->>'email' AS email_enc,
  contact->>'email_hash' AS email_hash,
  -- email_hash는 sha256 해시 (64자 hex)
  CASE 
    WHEN contact->>'email_hash' ~ '^[a-f0-9]{64}$' 
    THEN 'email_hash 정상'
    ELSE 'email_hash 형식 오류'
  END AS hash_status
FROM public.normalized_inquiries
WHERE contact->>'email' IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
```

---

## 테스트 6: Storage - attachment/attachments path만 저장 확인

### 목적
`inquiries.attachment` 또는 `inquiries.attachments[*].path`에 public URL이 아닌 path만 저장되는지 확인  
(단일 `attachment` 하위호환 + 다중 `attachments` 지원)

### 실행 방법

1. Inquiry Form에서 파일 업로드 후 제출
2. Supabase SQL Editor에서 확인

### 기대 결과
- ✅ `attachment`가 `"inquiry/..."` 형식 (path만) **또는** `attachments` 배열 요소의 `path`가 `inquiry/`로 시작
- ❌ `"https://..."` 형식의 public URL이 아님

### 확인용 SQL
```sql
-- attachment / attachments path 확인
SELECT 
  id,
  attachment,
  attachments,
  CASE 
    WHEN attachment LIKE 'inquiry/%' 
      OR EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(attachments, '[]'::jsonb)) e WHERE (e->>'path') LIKE 'inquiry/%')
    THEN 'path만 저장됨 (정상)'
    WHEN attachment LIKE 'http%://%' 
    THEN 'public URL 저장됨 (보안 위험)'
    ELSE '기타 형식'
  END AS attachment_status
FROM public.inquiries
WHERE attachment IS NOT NULL OR (attachments IS NOT NULL AND attachments != '[]'::jsonb)
ORDER BY created_at DESC
LIMIT 5;
```

---

## 테스트 7: Signed URL API - 정상 케이스

### 목적
올바른 `inquiryId`, `path`, `publicToken`으로 signed URL이 정상 발급되는지 확인  
`path`는 `attachment` 또는 `attachments[0].path` 중 존재하는 값 사용

### 실행 방법

**1단계: inquiries 레코드 조회**
```sql
-- public_token, attachment, attachments 확인
SELECT id, attachment, attachments, public_token
FROM public.inquiries
WHERE attachment IS NOT NULL OR (attachments IS NOT NULL AND attachments != '[]'::jsonb)
ORDER BY created_at DESC
LIMIT 1;
```

**2단계: API 호출**
- `path`에 `attachment` 값 사용 (단일) **또는** `attachments[0].path` 사용 (다중)

```bash
# 터미널 또는 Postman
curl -X POST http://localhost:3000/api/attachments/sign \
  -H "Content-Type: application/json" \
  -d '{
    "inquiryId": "<위에서 조회한 id>",
    "path": "<attachment 또는 attachments[0].path 값>",
    "publicToken": "<위에서 조회한 public_token>"
  }'
```

### 기대 결과
- ✅ HTTP 200 OK
- ✅ `{ "ok": true, "signedUrl": "https://..." }` 응답
- ✅ `signedUrl`이 5분 유효한 signed URL

### 확인용 SQL
```sql
-- 테스트용 inquiries 레코드 확인
SELECT 
  id,
  attachment,
  attachments,
  COALESCE(attachment, (attachments->0->>'path')) AS path_to_use,
  public_token
FROM public.inquiries
WHERE attachment IS NOT NULL OR (attachments IS NOT NULL AND attachments != '[]'::jsonb)
ORDER BY created_at DESC
LIMIT 1;
```

---

## 테스트 8: Signed URL API - 비정상 케이스

### 목적
잘못된 토큰, 임의 path 등으로 signed URL 발급이 차단되는지 확인

### 실행 방법

**케이스 A: publicToken 불일치**
```bash
curl -X POST http://localhost:3000/api/attachments/sign \
  -H "Content-Type: application/json" \
  -d '{
    "inquiryId": "123",
    "path": "inquiry/1234567890_test.jpg",
    "publicToken": "wrong-token-here"
  }'
```

**케이스 B: inquiryId 없음**
```bash
curl -X POST http://localhost:3000/api/attachments/sign \
  -H "Content-Type: application/json" \
  -d '{
    "path": "inquiry/1234567890_test.jpg",
    "publicToken": "some-token"
  }'
```

**케이스 C: path가 inquiry/로 시작하지 않음**
```bash
curl -X POST http://localhost:3000/api/attachments/sign \
  -H "Content-Type: application/json" \
  -d '{
    "inquiryId": "123",
    "path": "hack/../../secret.jpg",
    "publicToken": "some-token"
  }'
```

**케이스 D: 존재하지 않는 inquiryId**
```bash
curl -X POST http://localhost:3000/api/attachments/sign \
  -H "Content-Type: application/json" \
  -d '{
    "inquiryId": "999999",
    "path": "inquiry/1234567890_test.jpg",
    "publicToken": "some-token"
  }'
```

### 기대 결과

- **케이스 A**: ❌ HTTP 403, `{ "ok": false, "error": "invalid_public_token" }`
- **케이스 B**: ❌ HTTP 400, `{ "ok": false, "error": "inquiryId_path_publicToken_required" }`
- **케이스 C**: ❌ HTTP 400, `{ "ok": false, "error": "path_must_start_with_inquiry" }`
- **케이스 D**: ❌ HTTP 404, `{ "ok": false, "error": "inquiry_not_found" }`

### 확인용 로그
서버 로그에서 다음 메시지 확인:
```
[api/attachments/sign] public_token mismatch: ...
[api/attachments/sign] missing required params: ...
[api/attachments/sign] invalid path prefix: ...
[api/attachments/sign] inquiry not found: ...
```

---

## 테스트 9: 환경변수 검증 - 키 누락 시 에러

### 목적
`SUPABASE_ENCRYPTION_KEY`가 없거나 32자 미만일 때 서버가 즉시 에러를 발생시키는지 확인

### 실행 방법

**1단계: 환경변수 제거/수정**
```bash
# .env.local에서 SUPABASE_ENCRYPTION_KEY 제거 또는 짧은 값으로 변경
# SUPABASE_ENCRYPTION_KEY=short
```

**2단계: 서버 재시작**
```bash
npm run dev
```

### 기대 결과

**프로덕션 환경 (`NODE_ENV=production`)**:
- ❌ 서버 시작 실패
- ❌ 에러 메시지: `[security/encryption] SUPABASE_ENCRYPTION_KEY is missing...`
- ❌ 프로세스 종료 (`process.exit(1)`)

**개발 환경 (`NODE_ENV=development`)**:
- ⚠️ 서버 시작은 성공하지만 경고 메시지 출력
- ⚠️ 암호화 호출 시 에러 발생

### 확인용 로그
```
[security/encryption] WARNING: SUPABASE_ENCRYPTION_KEY is missing or too short...
```

---

## 테스트 10: 통합 테스트 - 전체 플로우

### 목적
Inquiry Form 제출부터 signed URL 발급까지 전체 플로우가 정상 작동하는지 확인

### 실행 방법

1. **Inquiry Form 제출** (파일 업로드 포함)
2. **Success 페이지 확인**
3. **inquiries 레코드 확인** (테스트 1 SQL 사용)
4. **normalized_inquiries 레코드 확인** (테스트 3 SQL 사용)
5. **암호화 확인** (테스트 4, 5 SQL 사용)
6. **attachment path 확인** (테스트 6 SQL 사용)
7. **signed URL 발급** (테스트 7 사용)

### 기대 결과
- ✅ 모든 단계 성공
- ✅ 데이터가 암호화되어 저장됨
- ✅ signed URL 정상 발급

---

## 테스트 11: 2-step Inquiry + optional Intake

### 목적
- Step1만 제출 시 `inquiries.intake`가 `{}`인지 확인
- Step2 제출 시 `inquiries.intake`가 채워지는지 확인
- normalize 결과 `constraints.intake`가 step2 입력을 반영하는지 확인
- `missing_fields`가 Step2 입력으로 감소하는지 확인

### 실행 방법

**Step1 제출**
1. `/inquiry`에서 Step1 필수 5개만 입력 (treatment_type, nationality, spoken_language, contact, preferred_date or flex)
2. Message는 비워도 됨 (선택)
3. 제출 → Success 페이지 이동

**Step2 제출 (선택)**
1. Success 페이지에서 "추가 정보 제공(선택)" 버튼 클릭 → `/inquiry/intake?inquiryId=...&token=...`
2. body_part, duration, severity, diagnosis/medication 등 입력 후 Save

### 기대 결과

**Step1 직후**
- ✅ `inquiries.intake` = `{}` (또는 `{}`에 가까움)
- ✅ `normalized_inquiries.constraints.meta.source` = `'step1'`
- ✅ `missing_fields`에 `contact_reachable`, `nationality`, `spoken_language`, `treatment_type`, `preferred_date_or_flex` 중 미충족 항목 포함

**Step2 직후**
- ✅ `inquiries.intake`에 `complaint`, `history` 등 채워짐 (예: `complaint.body_part`, `complaint.duration`, `history.diagnosis` 등)
- ✅ 동일 inquiry에 대해 normalize 재호출 시 `constraints.intake`가 step2 입력 반영 (direct mapping)
- ✅ `constraints.meta.source` = `'step2'`
- ✅ `missing_fields` 개수 감소 (필수 충족 시 감소)

### 확인용 SQL
```sql
-- Step1 직후: intake 빈 객체
SELECT id, intake, preferred_date_flex
FROM public.inquiries
ORDER BY created_at DESC
LIMIT 1;

-- Step2 직후: intake 채워짐
SELECT id, intake
FROM public.inquiries
WHERE intake != '{}'::jsonb
ORDER BY created_at DESC
LIMIT 5;

-- normalize 결과: constraints.intake, meta.source, missing_fields
SELECT
  id,
  constraints->'intake' AS intake,
  constraints->'meta'->>'source' AS meta_source,
  missing_fields,
  extraction_confidence
FROM public.normalized_inquiries
WHERE source_type = 'inquiry_form'
ORDER BY created_at DESC
LIMIT 5;
```

---

## 테스트 12: Funnel 이벤트 수집

### 목적
Step1/Step2 이벤트가 `inquiry_events` 테이블에 정상 기록되는지 확인  
이탈률 추정이 아닌 실제 이벤트 데이터로 전환율 계산 가능

### 실행 방법

**1단계: Step1 이벤트 확인**
1. `/inquiry` 페이지 접속 (step1_viewed)
2. Step1 제출 (step1_submitted)

**2단계: Step2 이벤트 확인**
1. Success 페이지에서 "추가 정보 제공" 버튼 클릭 (step2_viewed)
2. Step2 저장 (step2_submitted)

### 기대 결과
- ✅ `inquiry_events` 테이블에 4개 이벤트 모두 기록
- ✅ `step1_viewed`: `inquiry_id` NULL (아직 제출 전)
- ✅ `step1_submitted`: `inquiry_id` 존재
- ✅ `step2_viewed`: `inquiry_id` 존재
- ✅ `step2_submitted`: `inquiry_id` 존재

### 확인용 SQL
```sql
-- 최근 이벤트 확인
SELECT 
  id,
  created_at,
  inquiry_id,
  event_type,
  meta
FROM public.inquiry_events
ORDER BY created_at DESC
LIMIT 10;

-- 이벤트별 카운트
SELECT 
  event_type,
  COUNT(*) AS count,
  COUNT(DISTINCT inquiry_id) AS unique_inquiries
FROM public.inquiry_events
GROUP BY event_type
ORDER BY event_type;

-- 전환율 계산 (예시)
SELECT 
  COUNT(DISTINCT inquiry_id) FILTER (WHERE event_type = 'step1_submitted') AS step1_completed,
  COUNT(DISTINCT inquiry_id) FILTER (WHERE event_type = 'step2_submitted') AS step2_completed,
  ROUND(
    COUNT(DISTINCT inquiry_id) FILTER (WHERE event_type = 'step2_submitted')::numeric /
    NULLIF(COUNT(DISTINCT inquiry_id) FILTER (WHERE event_type = 'step1_submitted'), 0) * 100,
    2
  ) AS step2_conversion_rate_percent
FROM public.inquiry_events;
```

---

## 테스트 13: Referral Summary

### 목적
`/api/referral/summary` 호출 시 JSON/Markdown 정상 반환 확인  
첨부파일은 signed URL로만 노출되는지 확인 (public URL 아님)

### 실행 방법

**1단계: normalized_inquiries ID 확인**
```sql
SELECT id, source_inquiry_id
FROM public.normalized_inquiries
WHERE source_type = 'inquiry_form'
ORDER BY created_at DESC
LIMIT 1;
```

**2단계: API 호출**
```bash
curl -X POST http://localhost:3000/api/referral/summary \
  -H "Content-Type: application/json" \
  -d '{"normalizedInquiryId": "<위에서 조회한 id>"}'
```

### 기대 결과
- ✅ HTTP 200 OK
- ✅ `{ ok: true, summaryJson: {...}, summaryMarkdown: "..." }` 응답
- ✅ `summaryJson.attachments[*].signedUrl`이 `https://...?token=...` 형식 (signed URL)
- ✅ `summaryJson.attachments[*].signedUrl`이 public URL이 아님 (`https://.../storage/v1/object/public/...` 형식 아님)
- ✅ `summaryMarkdown`이 읽기 가능한 Markdown 형식

### 확인용 SQL
```sql
-- normalized_inquiries + inquiries 조인 확인
SELECT 
  n.id AS normalized_id,
  n.source_inquiry_id,
  i.attachment,
  i.attachments,
  n.constraints->'intake' AS intake
FROM public.normalized_inquiries n
LEFT JOIN public.inquiries i ON i.id = n.source_inquiry_id
WHERE n.source_type = 'inquiry_form'
ORDER BY n.created_at DESC
LIMIT 1;
```

### 확인용 API 응답 예시
```json
{
  "ok": true,
  "summaryJson": {
    "patient": { "country": "USA", "language": "en" },
    "complaint": { "body_part": ["knee"], "duration": "1-6m", "severity": 7 },
    "history": { "diagnosis": { "has": true, "text": "MRI: meniscus tear" } },
    "logistics": { "preferred_date": "2026-02-15", "flex": false },
    "attachments": [
      {
        "path": "inquiry/1234567890_test.jpg",
        "name": "test.jpg",
        "signedUrl": "https://...?token=...",
        "expiresAt": "2026-01-25T12:05:00.000Z"
      }
    ],
    "quality": { "extraction_confidence": 0.8, "missing_fields": [] }
  },
  "summaryMarkdown": "# Patient Referral Summary\n\n..."
}
```

---

## 문제 해결

### RLS 정책이 작동하지 않음

```sql
-- RLS 활성화 확인
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'inquiries';

-- 정책 확인
SELECT * FROM pg_policies WHERE tablename = 'inquiries';
```

### 암호화가 작동하지 않음

```sql
-- pgcrypto extension 확인
SELECT * FROM pg_extension WHERE extname = 'pgcrypto';

-- 암호화 함수 확인
SELECT proname FROM pg_proc 
WHERE proname IN ('encrypt_text', 'decrypt_text', 'email_hash');
```

### Signed URL API 실패

- 서버 로그 확인: `[api/attachments/sign]` 메시지
- `inquiries.public_token` 컬럼 존재 확인
- Storage 버킷이 Private로 설정되었는지 확인

---

## 체크리스트 요약

- [ ] 테스트 1: 클라이언트 INSERT 성공
- [ ] 테스트 2: 클라이언트 SELECT 차단
- [ ] 테스트 3: normalize API 정상 작동
- [ ] 테스트 4: raw_message 암호화 확인
- [ ] 테스트 5: contact.email 암호화 확인
- [ ] 테스트 6: attachment path만 저장 확인
- [ ] 테스트 7: signed URL 정상 발급
- [ ] 테스트 8: signed URL 비정상 케이스 차단
- [ ] 테스트 9: 환경변수 검증 작동
- [ ] 테스트 10: 전체 플로우 통합 테스트
- [ ] 테스트 11: Step1 intake `{}` 확인, Step2 intake 채워짐, normalize 반영, missing_fields 감소
- [ ] 테스트 12: Funnel 이벤트 (step1_viewed/submitted, step2_viewed/submitted)
- [ ] 테스트 13: Referral Summary (JSON/Markdown, signed URL만 노출)

---

## 예상 소요 시간

- **개별 테스트**: 각 1-2분
- **전체 테스트**: 약 10-15분

---

## 참고

- 자세한 설정 방법: `migrations/SECURITY_SETUP_GUIDE.md`
- 구현 요약: `migrations/SECURITY_IMPLEMENTATION_SUMMARY.md`
