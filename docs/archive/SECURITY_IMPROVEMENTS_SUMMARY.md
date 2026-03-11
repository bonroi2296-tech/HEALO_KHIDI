# 보안/첨부 접근 제어 일관성 확보 - 변경 사항 요약

> **작성일**: 2026년 1월 25일  
> **목표**: 보안/첨부 접근 제어의 "일관성" 확보

---

## 변경된 파일 목록

### 1. 신규 파일
- `src/lib/security/attachmentAuth.ts` - 공통 pathAuthorized 함수

### 2. 수정된 파일
- `src/lib/security/encryption.ts` - process.exit(1) 제거, 개발 환경 경고만 유지
- `app/api/chat/route.ts` - assertEncryptionKey() 호출 추가
- `app/api/inquiry/normalize/route.ts` - assertEncryptionKey() 호출 추가
- `app/api/inquiries/intake/route.ts` - assertEncryptionKey() 호출 추가
- `app/api/attachments/sign/route.ts` - 공통 pathAuthorized 함수 사용
- `app/api/referral/summary/route.ts` - publicToken 검증 및 pathAuthorized 검증 추가
- `src/lib/referral/buildReferralSummary.ts` - pathAuthorized 검증 추가, inquiryId 파라미터 추가

---

## 주요 변경 사항

### [1] encryption.ts - process.exit(1) 제거

**변경 전**:
```typescript
if (process.env.NODE_ENV === "production") {
  try {
    assertEncryptionKey();
  } catch (error) {
    console.error("[security/encryption] FATAL: Encryption key validation failed on startup");
    process.exit(1); // ❌ 프로세스 종료
  }
}
```

**변경 후**:
```typescript
// 개발 환경에서만 경고 (프로덕션에서는 각 route에서 assertEncryptionKey() 호출)
if (process.env.NODE_ENV !== "production") {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < MIN_KEY_LENGTH) {
    console.warn("[security/encryption] WARNING: ...");
  }
}
```

**효과**:
- 프로덕션에서 프로세스 종료 없이 각 route에서 fail-fast 검증
- `encryptText`/`decryptText` 실행 시 `assertEncryptionKey()`가 throw하므로 안전성 유지

### [2] 각 Route에 assertEncryptionKey() 추가

**추가된 Route**:
- `app/api/chat/route.ts`
- `app/api/inquiry/normalize/route.ts`
- `app/api/inquiries/intake/route.ts`

**패턴**:
```typescript
export async function POST(request: Request) {
  // ✅ Security: 암호화 키 검증 (fail-fast)
  try {
    assertEncryptionKey();
  } catch (error: any) {
    console.error("[api/...] encryption key validation failed:", error);
    return Response.json(
      { ok: false, error: "encryption_key_missing", detail: error?.message },
      { status: 500 }
    );
  }
  // ... 나머지 로직
}
```

### [3] 공통 pathAuthorized 함수 분리

**신규 파일**: `src/lib/security/attachmentAuth.ts`
```typescript
export function pathAuthorized(
  path: string,
  attachment: string | null,
  attachments: unknown
): boolean {
  if (attachment && String(attachment) === path) return true;
  const arr = Array.isArray(attachments) ? attachments : [];
  return arr.some((a: { path?: string }) => a?.path === path);
}
```

**사용처**:
- `app/api/attachments/sign/route.ts` - 기존 로직을 공통 함수로 교체
- `src/lib/referral/buildReferralSummary.ts` - signed URL 발급 전 검증 추가

### [4] referral/summary 권한 검증 강화

**변경 전**:
- `normalizedInquiryId`만으로 signed URL 발급
- 권한 검증 없음

**변경 후**:
- 요청 바디: `{ normalizedInquiryId, publicToken }`
- `normalized_inquiries.source_inquiry_id` → `inquiries.public_token` 조회
- `publicToken` 일치 검증 (불일치 시 403)
- `pathAuthorized` 검증 후에만 signed URL 발급

**API 변경**:
```typescript
// 변경 전
POST /api/referral/summary
{ "normalizedInquiryId": "..." }

// 변경 후
POST /api/referral/summary
{ 
  "normalizedInquiryId": "...",
  "publicToken": "..."  // ✅ 필수 추가
}
```

---

## 테스트 재현 가이드

### Test 7: Signed URL API - 정상 케이스

**1단계: inquiries 레코드 조회**
```sql
SELECT id, attachment, attachments, public_token
FROM public.inquiries
WHERE attachment IS NOT NULL OR (attachments IS NOT NULL AND attachments != '[]'::jsonb)
ORDER BY created_at DESC
LIMIT 1;
```

**2단계: API 호출**
```bash
curl -X POST http://localhost:3000/api/attachments/sign \
  -H "Content-Type: application/json" \
  -d '{
    "inquiryId": "<위에서 조회한 id>",
    "path": "<attachment 또는 attachments[0].path 값>",
    "publicToken": "<위에서 조회한 public_token>"
  }'
```

**기대 결과**: HTTP 200 OK, `{ "ok": true, "signedUrl": "https://..." }`

### Test 8: Signed URL API - 비정상 케이스

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

**기대 결과**: HTTP 403, `{ "ok": false, "error": "invalid_public_token" }`

### Test 11: 2-step Inquiry

**Step1 제출**:
1. `/inquiry`에서 Step1 필수 5개 입력
2. 제출 → Success 페이지 이동

**Step2 제출**:
1. Success 페이지에서 "추가 정보 제공(선택)" 버튼 클릭
2. `/inquiry/intake?inquiryId=...&token=...`에서 Step2 입력 후 Save

**확인 SQL**:
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
```

### Referral Summary 테스트 (신규)

**1단계: normalized_inquiries + inquiries 조회**
```sql
SELECT 
  n.id AS normalized_id,
  n.source_inquiry_id,
  i.public_token
FROM public.normalized_inquiries n
LEFT JOIN public.inquiries i ON i.id = n.source_inquiry_id
WHERE n.source_type = 'inquiry_form'
ORDER BY n.created_at DESC
LIMIT 1;
```

**2단계: API 호출 (publicToken 필수)**
```bash
curl -X POST http://localhost:3000/api/referral/summary \
  -H "Content-Type: application/json" \
  -d '{
    "normalizedInquiryId": "<위에서 조회한 normalized_id>",
    "publicToken": "<위에서 조회한 public_token>"
  }'
```

**기대 결과**:
- ✅ HTTP 200 OK
- ✅ `{ ok: true, summaryJson: {...}, summaryMarkdown: "..." }`
- ✅ `summaryJson.attachments[*].signedUrl`이 signed URL 형식
- ✅ publicToken 불일치 시 HTTP 403

**비정상 케이스**:
```bash
# publicToken 누락
curl -X POST http://localhost:3000/api/referral/summary \
  -H "Content-Type: application/json" \
  -d '{"normalizedInquiryId": "..."}'
# 기대: HTTP 400, "public_token_required"

# publicToken 불일치
curl -X POST http://localhost:3000/api/referral/summary \
  -H "Content-Type: application/json" \
  -d '{"normalizedInquiryId": "...", "publicToken": "wrong-token"}'
# 기대: HTTP 403, "invalid_public_token"
```

---

## 검증 체크리스트

- [x] encryption.ts에서 process.exit(1) 제거
- [x] 각 route에서 assertEncryptionKey() 호출 추가 (chat, normalize, intake)
- [x] 공통 pathAuthorized 함수 분리
- [x] referral/summary에 publicToken 검증 추가
- [x] referral/summary에 pathAuthorized 검증 추가
- [x] attachments/sign과 referral/summary가 동일 검증 로직 사용

---

## 다음 단계

1. **로컬 테스트 실행**
   - Test 7, 8, 11 재현
   - Referral Summary 테스트 실행

2. **프로덕션 배포 전**
   - 환경변수 검증 (SUPABASE_ENCRYPTION_KEY)
   - 모든 route에서 assertEncryptionKey() 동작 확인

3. **SECURITY_SMOKE_TEST.md 업데이트**
   - Test 13에 publicToken 검증 내용 추가

---

**작성자**: AI Assistant (Cursor)  
**최종 수정일**: 2026년 1월 25일
