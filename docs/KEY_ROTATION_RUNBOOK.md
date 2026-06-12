# 암호화 키 교체(rotation) 런북

> 환자 PII는 AES-256-GCM(`src/lib/security/encryptionV2.ts`)으로 암호화되며 키는 env `ENCRYPTION_KEY_V1` 하나다.
> 키가 유출됐거나 정기 교체가 필요할 때 이 순서를 따른다. (감사 2026-06-11 P3 — 절차 부재 해소)

## 평시 점검
- 키는 Vercel env 에만 존재해야 함 (코드·로그·문서에 절대 노출 금지)
- 암호문 payload 에는 키 버전(v1)이 기록됨 — encryptionV2 는 버전 필드를 이미 지원

## 유출 의심 시 (긴급)
1. **새 키 생성**: `openssl rand -base64 32`
2. Vercel env 에 `ENCRYPTION_KEY_V2` 추가 (V1 은 아직 유지 — 기존 데이터 복호화용)
3. `encryptionV2.ts` 에 V2 키 로딩 추가: 암호화는 V2 로, 복호화는 payload 버전에 따라 V1/V2 분기
   (현재 코드는 V1 단일 — 이 단계에서 코드 수정 필요, 반나절)
4. 재암호화 배치: 모든 `*_encrypted` 컬럼을 "V1 복호화 → V2 암호화" 로 갱신하는 스크립트 실행
   - 대상 테이블: inquiries, normalized_inquiries, chat_threads(예정), consultation 계열
   - 파일럿 규모(수백 행)면 수 분
5. 전 행이 V2 가 된 것 확인 후 `ENCRYPTION_KEY_V1` 제거
6. 유출 경위에 따라 개인정보보호위 신고 의무 검토 (72시간 규정)

## 정기 교체 (연 1회 권장)
- 위와 동일하되 긴급성 없음. 트래픽 적은 시간대에.

## 하지 말 것
- V1 키 먼저 삭제 (기존 데이터 영구 복호화 불가)
- 키를 DB·로그·커밋에 백업
