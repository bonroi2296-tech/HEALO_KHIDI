## HEALO 암호화 가이드 (AES-256-GCM)

> 작성일: 2026-01-29  
> 알고리즘: AES-256-GCM  
> 구현: Node.js crypto

---

## ✅ 완료된 암호화

### 알고리즘
```
- AES-256-GCM (Galois/Counter Mode)
- 키 길이: 32 bytes (256 bits)
- IV 길이: 12 bytes (GCM 권장)
- Auth Tag: 16 bytes (변조 방지)
```

### 암호화된 PII

#### inquiries 테이블
```
- email ✅
- contact_id ✅
- message ✅
- first_name ✅
- last_name ✅
- intake.email ✅ (JSONB 내부)
- intake.phone ✅
- intake.passport_no ✅
- intake.kakao, line, whatsapp 등 ✅
```

#### normalized_inquiries 테이블
```
- raw_message ✅
- contact.email ✅
- contact.messenger_handle ✅
```

### 암호화하지 않는 필드 (검색/집계용)
```
- nationality
- spoken_language
- contact_method
- treatment_type
- preferred_date
- lead_quality, priority_score
```

---

## 🔑 환경변수 설정

### 필수 환경변수

```bash
# .env.local
ENCRYPTION_KEY_V1=abcdefghijklmnopqrstuvwxyz123456  # 정확히 32 bytes
```

**⚠️ 중요 주의사항**:
1. **키 분실 시 복구 불가**: 암호화된 데이터를 복호화할 수 없음
2. **키 변경 시 기존 데이터 복호화 불가**: 키는 한 번 설정하면 변경 금지
3. **32 bytes 정확히**: 길이가 다르면 암호화 실패

### 키 생성 방법

```bash
# ✅ 권장: base64 인코딩 (44자)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 또는 hex 인코딩 (64자)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 또는 (Linux/Mac)
openssl rand -base64 32

# 결과 예시 (base64):
# a7B9c4D5e6F7g8H9i0J1k2L3m4N5o6P7Q8R9S0T1U2==
```

**⚠️ 주의**: 키는 정확히 **32 bytes**여야 합니다.
- base64: 44자 (32 bytes 인코딩) ✅ 권장
- hex: 64자 (32 bytes 인코딩)
- raw: 32자 (비권장)

### 환경변수 등록

#### Vercel
```
1. 프로젝트 설정 → Environment Variables
2. ENCRYPTION_KEY_V1 추가
3. Value: (생성한 32 bytes 키)
4. Environment: Production, Preview, Development 모두 체크
5. Save
6. 재배포 (자동 트리거)
```

#### Local (.env.local)
```bash
# .env.local
ENCRYPTION_KEY_V1=a7B9c4D5e6F7g8H9i0J1k2L3m4N5o6P7
```

---

## 📦 암호화된 데이터 형식

### JSON 페이로드
```json
{
  "v": "v1",
  "iv": "ZG9jdW1lbnRhdGlvbg==",
  "tag": "YXV0aGVudGljYXRpb24=",
  "data": "Y2lwaGVydGV4dCBkYXRh"
}
```

**필드 설명**:
- `v`: 키 버전 (향후 키 회전 지원)
- `iv`: Initialization Vector (Base64)
- `tag`: Authentication Tag (Base64, 변조 검증)
- `data`: 암호화된 데이터 (Base64)

### DB 저장 예시

**Before (평문)**:
```sql
email: 'john@example.com'
```

**After (암호문)**:
```sql
email: '{"v":"v1","iv":"...","tag":"...","data":"..."}'
```

---

## 🔧 API 동작

### 암호화 적용 지점

#### 1. /api/inquiries/intake
```typescript
// intake JSONB 내 PII만 암호화
const encryptedIntake = encryptPiiInObject(intake, null, "intake");

// Fail-Closed: 암호화 실패 시 500 반환, DB 저장 중단
```

#### 2. /api/inquiry/normalize
```typescript
// raw_message, contact 암호화
const rawMessageEnc = encryptString(rawMessage);
const contactEnc = encryptPiiInObject(contact, null, "contact");

// Fail-Closed: 암호화 실패 시 500 반환
```

### 복호화 사용 지점

#### 병원 전달 요약 (P3)
```typescript
// leadSummary.ts
import { decryptAuto } from '../security/encryptionV2';

const decryptedMessage = await decryptAuto(inquiry.message);
```

#### 관리자 페이지 (향후)
```typescript
// 관리자만 복호화 가능
if (isAdmin) {
  const decryptedEmail = decryptString(inquiry.email);
}
```

---

## 🚀 백필 (기존 데이터 암호화)

### 1. Dry-run (테스트)
```bash
# 실제 변경 없이 확인
npx tsx scripts/backfill-encryption.ts --dry-run

# 출력:
# ✓ [DRY-RUN] ID 1: email, contact_id, message, intake
# ✓ [DRY-RUN] ID 2: email, intake
# ...
```

### 2. 실제 암호화
```bash
# ⚠️ 주의: DB가 실제로 변경됩니다!
npx tsx scripts/backfill-encryption.ts --execute

# 배치 크기 조정 (기본: 100)
npx tsx scripts/backfill-encryption.ts --execute --batch-size=50

# 특정 ID부터 시작
npx tsx scripts/backfill-encryption.ts --execute --start-id=100
```

### 3. 진행 상황 확인
```
📦 Batch: 100건 (ID 1 ~ 100)
  ✓ ID 1: email, contact_id, message
  ✓ ID 2: email, intake
  ...

📊 진행: 암호화 85, 건너뜀 10, 실패 5
```

### 4. 실패 처리
```bash
# 실패한 레코드는 건너뛰고 계속 진행
# 실패 원인 확인 (위 로그)
# 재시도:
npx tsx scripts/backfill-encryption.ts --execute --start-id=<실패한 ID>
```

---

## 🧪 테스트

### 암호화/복호화 roundtrip
```bash
npx tsx scripts/test-encryption.ts

# 출력:
# ✅ AES-256-GCM 암호화 테스트
# ✅ 평문: "Hello, World!"
# ✅ 암호문: {"v":"v1","iv":"..."}
# ✅ 복호화: "Hello, World!"
# ✅ 일치: true
```

### DB 저장 확인
```sql
-- inquiries 테이블 확인
SELECT 
  id,
  email,
  CASE 
    WHEN email LIKE '{%' THEN '암호화됨' 
    ELSE '평문' 
  END as encryption_status
FROM inquiries
LIMIT 10;

-- 결과:
-- id | email                        | encryption_status
-- ---|------------------------------|------------------
-- 1  | {"v":"v1","iv":"..."}        | 암호화됨
-- 2  | {"v":"v1","iv":"..."}        | 암호화됨
```

---

## 🔒 보안 원칙

### Fail-Closed
```
암호화 실패 → 500 반환 → DB 저장 중단
```

### PII 최소화
```
로그/이벤트:
- ❌ console.log(email)         // 평문 출력 금지
- ✅ console.log(maskEmail(email))  // 마스킹된 값만
```

### 키 관리
```
1. 환경변수로만 관리 (코드에 하드코딩 금지)
2. 키 분실 방지 (1Password/AWS Secrets Manager 등)
3. 키 회전 계획 (v1 → v2 마이그레이션)
```

---

## ⚠️ 문제 해결

### 암호화 키 누락
```
증상:
[encryptionV2] ENCRYPTION_KEY_V1 is missing.

해결:
1. .env.local에 ENCRYPTION_KEY_V1 추가
2. 32 bytes 정확히
3. 앱 재시작
```

### 복호화 실패
```
증상:
[encryptionV2] Decryption failed (auth tag mismatch?)

원인:
- 키가 변경됨
- 데이터가 손상됨
- 암호화 방식이 다름 (RPC vs V2)

해결:
1. 키 확인 (원래 키 사용)
2. decryptAuto() 사용 (자동 감지)
3. 데이터 재암호화 (백필)
```

### 암호화 실패 (API 500)
```
증상:
[api/inquiries/intake] PII encryption failed - aborting DB update

해결:
1. 키 검증 (길이 32 bytes)
2. inquiry_events 확인:
   SELECT * FROM inquiry_events 
   WHERE event_type = 'encryption_failed'
   ORDER BY created_at DESC LIMIT 10;
3. 오류 메시지 확인
```

---

## 📊 모니터링

### 암호화 실패율
```sql
-- 최근 1시간 암호화 실패
SELECT 
  COUNT(*) as failed_count,
  event_data->>'error' as error_type
FROM inquiry_events
WHERE event_type = 'encryption_failed'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY error_type;
```

### 평문 데이터 확인
```sql
-- 암호화되지 않은 inquiries
SELECT 
  id,
  email IS NOT NULL AND email NOT LIKE '{%' as email_plaintext,
  contact_id IS NOT NULL AND contact_id NOT LIKE '{%' as contact_plaintext,
  message IS NOT NULL AND message NOT LIKE '{%' as message_plaintext
FROM inquiries
WHERE 
  (email IS NOT NULL AND email NOT LIKE '{%')
  OR (contact_id IS NOT NULL AND contact_id NOT LIKE '{%')
  OR (message IS NOT NULL AND message NOT LIKE '{%')
LIMIT 10;
```

---

## 🔄 키 회전 계획 (향후)

### 1단계: v2 키 추가
```bash
ENCRYPTION_KEY_V1=...  # 기존 키 유지
ENCRYPTION_KEY_V2=...  # 새 키 추가
```

### 2단계: v2로 암호화
```typescript
// 새 데이터는 v2 사용
const encrypted = encryptStringV2(plaintext);
```

### 3단계: v1 데이터 마이그레이션
```bash
# v1 → v2 재암호화
npx tsx scripts/migrate-encryption-v1-to-v2.ts
```

### 4단계: v1 키 제거
```bash
# v2만 남김
ENCRYPTION_KEY_V2=...
```

---

## 📚 코드 위치

### 암호화 모듈
```
src/lib/security/
├── encryptionV2.ts      # AES-256-GCM 구현
├── piiJson.ts           # PII 선택적 암호화
└── encryption.ts        # 레거시 (RPC)
```

### API 적용
```
app/api/
├── inquiries/intake/    # intake JSONB 암호화
└── inquiry/normalize/   # raw_message, contact 암호화
```

### 스크립트
```
scripts/
├── backfill-encryption.ts    # 백필
└── test-encryption.ts        # 테스트
```

### 문서
```
ENCRYPTION_GUIDE.md           # 본 문서
```

---

## ✅ 체크리스트

### 초기 설정
- [ ] ENCRYPTION_KEY_V1 환경변수 설정 (32 bytes)
- [ ] 키 백업 (1Password/AWS Secrets Manager)
- [ ] Vercel에 환경변수 등록
- [ ] 앱 재배포

### 백필 (기존 데이터)
- [ ] Dry-run 실행 (테스트)
- [ ] 결과 확인 (몇 건 암호화 필요?)
- [ ] Execute 실행 (실제 암호화)
- [ ] DB 확인 (평문 데이터 0건)

### 모니터링
- [ ] 암호화 실패율 0% 유지
- [ ] inquiry_events에서 encryption_failed 확인
- [ ] 로그에 평문 노출 없는지 확인

---

**이제 외부에 "AES-256-GCM 적용"이라고 자신있게 말할 수 있습니다!** 🔐✅
