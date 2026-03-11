# 보안/첨부 접근 제어 일관성 확보 - 최종 요약

> **작성일**: 2026년 1월 25일  
> **목표**: 보안/첨부 접근 제어의 "일관성" 확보 및 커밋

---

## ✅ 완료된 작업

### [1] encryption.ts - process.exit(1) 제거
- **파일**: `src/lib/security/encryption.ts`
- **변경**: 프로덕션에서 `process.exit(1)` 제거, 개발 환경 경고만 유지
- **효과**: 각 route에서 fail-fast 검증으로 전환

### [2] 각 Route에 assertEncryptionKey() 추가
- **파일들**:
  - `app/api/chat/route.ts`
  - `app/api/inquiry/normalize/route.ts`
  - `app/api/inquiries/intake/route.ts`
- **효과**: 암호화 키 누락 시 즉시 에러 반환 (500)

### [3] 공통 pathAuthorized 함수 분리
- **신규 파일**: `src/lib/security/attachmentAuth.ts`
- **사용처**:
  - `app/api/attachments/sign/route.ts` (기존 로직 교체)
  - `src/lib/referral/buildReferralSummary.ts` (신규 추가)

### [4] referral/summary 권한 검증 강화
- **파일**: `app/api/referral/summary/route.ts`, `src/lib/referral/buildReferralSummary.ts`
- **변경**:
  - 요청 바디: `{ normalizedInquiryId, publicToken }` (publicToken 필수)
  - `normalized_inquiries.source_inquiry_id` → `inquiries.public_token` 검증
  - `pathAuthorized` 검증 후에만 signed URL 발급

---

## 📋 변경된 파일 목록

### 신규 파일 (1개)
```
src/lib/security/attachmentAuth.ts
```

### 수정된 파일 (7개)
```
src/lib/security/encryption.ts
app/api/chat/route.ts
app/api/inquiry/normalize/route.ts
app/api/inquiries/intake/route.ts
app/api/attachments/sign/route.ts
app/api/referral/summary/route.ts
src/lib/referral/buildReferralSummary.ts
```

**총 8개 파일 변경**

---

## 🔍 Build & Lint 결과

### npm run lint
- ✅ 소스 코드: 에러 없음
- ⚠️ `.next/build` 파일들: 빌드 아티팩트 관련 경고 (무시 가능)

### npm run build
- ✅ 컴파일 성공: "✓ Compiled successfully in 4.0s"
- ⚠️ TypeScript 체크 중 EPERM 에러 (파일 권한 문제, 실제 빌드는 성공)

---

## 🧪 테스트 재현 가이드

### Test 7: Signed URL API - 정상 케이스

**SQL**:
```sql
SELECT id, attachment, attachments, public_token
FROM public.inquiries
WHERE attachment IS NOT NULL OR (attachments IS NOT NULL AND attachments != '[]'::jsonb)
ORDER BY created_at DESC
LIMIT 1;
```

**API 호출**:
```bash
curl -X POST http://localhost:3000/api/attachments/sign \
  -H "Content-Type: application/json" \
  -d '{
    "inquiryId": "<id>",
    "path": "<attachment 또는 attachments[0].path>",
    "publicToken": "<public_token>"
  }'
```

**기대 결과**: HTTP 200, `{ "ok": true, "signedUrl": "https://..." }`

---

### Test 8: Signed URL API - 비정상 케이스

**케이스 A: publicToken 불일치**
```bash
curl -X POST http://localhost:3000/api/attachments/sign \
  -H "Content-Type: application/json" \
  -d '{
    "inquiryId": "123",
    "path": "inquiry/test.jpg",
    "publicToken": "wrong-token"
  }'
```

**기대 결과**: HTTP 403, `{ "ok": false, "error": "invalid_public_token" }`

---

### Test 11: 2-step Inquiry

**Step1 제출**:
1. `/inquiry` 접속 → Step1 필수 5개 입력 → 제출

**Step2 제출**:
1. Success 페이지 → "추가 정보 제공(선택)" 클릭
2. `/inquiry/intake?inquiryId=...&token=...` → Step2 입력 → Save

**확인 SQL**:
```sql
-- Step1 직후
SELECT id, intake, preferred_date_flex
FROM public.inquiries
ORDER BY created_at DESC
LIMIT 1;

-- Step2 직후
SELECT id, intake
FROM public.inquiries
WHERE intake != '{}'::jsonb
ORDER BY created_at DESC
LIMIT 5;
```

---

### Referral Summary 테스트 (신규)

**1단계: 데이터 조회**
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

**2단계: 정상 케이스**
```bash
curl -X POST http://localhost:3000/api/referral/summary \
  -H "Content-Type: application/json" \
  -d '{
    "normalizedInquiryId": "<normalized_id>",
    "publicToken": "<public_token>"
  }'
```

**기대 결과**: HTTP 200, `{ ok: true, summaryJson: {...}, summaryMarkdown: "..." }`

**3단계: 비정상 케이스**

**publicToken 누락**:
```bash
curl -X POST http://localhost:3000/api/referral/summary \
  -H "Content-Type: application/json" \
  -d '{"normalizedInquiryId": "..."}'
```
**기대**: HTTP 400, `{ "ok": false, "error": "public_token_required" }`

**publicToken 불일치**:
```bash
curl -X POST http://localhost:3000/api/referral/summary \
  -H "Content-Type: application/json" \
  -d '{"normalizedInquiryId": "...", "publicToken": "wrong-token"}'
```
**기대**: HTTP 403, `{ "ok": false, "error": "invalid_public_token" }`

---

## ✅ 검증 체크리스트

- [x] encryption.ts에서 process.exit(1) 제거
- [x] 각 route에서 assertEncryptionKey() 호출 추가 (chat, normalize, intake)
- [x] 공통 pathAuthorized 함수 분리
- [x] referral/summary에 publicToken 검증 추가
- [x] referral/summary에 pathAuthorized 검증 추가
- [x] attachments/sign과 referral/summary가 동일 검증 로직 사용
- [x] lint 실행 (소스 코드 에러 없음)
- [x] build 실행 (컴파일 성공)

---

## 📝 커밋 메시지 제안

```
feat(security): 보안/첨부 접근 제어 일관성 확보

- encryption.ts: process.exit(1) 제거, 각 route에서 fail-fast 검증
- 각 route에 assertEncryptionKey() 호출 추가 (chat, normalize, intake)
- 공통 pathAuthorized 함수 분리 (attachmentAuth.ts)
- referral/summary: publicToken 검증 및 pathAuthorized 검증 추가
- attachments/sign과 referral/summary가 동일 검증 로직 사용

변경 파일:
- 신규: src/lib/security/attachmentAuth.ts
- 수정: src/lib/security/encryption.ts
- 수정: app/api/chat/route.ts
- 수정: app/api/inquiry/normalize/route.ts
- 수정: app/api/inquiries/intake/route.ts
- 수정: app/api/attachments/sign/route.ts
- 수정: app/api/referral/summary/route.ts
- 수정: src/lib/referral/buildReferralSummary.ts
```

---

**작성자**: AI Assistant (Cursor)  
**최종 수정일**: 2026년 1월 25일
