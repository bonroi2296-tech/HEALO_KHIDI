# 계획서: RAG 자료 검수 도장 (의료 안전 마지막 조각)

> 상태: **계획만 — 구현은 PO 승인 후** (사용자 대면 큰 변경이라 멋대로 안 함). 2026-06-13 작성.
> 목적: 챗봇이 인용하는 자료를 "검수된 것만"으로 제한 → 의료 검수를 '자료 등재 1회'로 압축 (AI_MEDICAL_REDLINES.md 의 다음 단계).

## 왜 한 번에 못 켜나 (핵심 리스크)
지금 `rag_documents` 자료엔 검수 표시가 전혀 없음. "미검수 자료는 챗봇이 인용 금지"를 그냥 켜면
→ **모든 자료가 미검수로 분류 → 챗봇이 아무것도 인용 못 함 → "정보 없음"만 답하는 먹통.**
그래서 반드시 단계적으로.

## 설계
`rag_documents` 활용 (이미 있는 컬럼: trust_tier 1/2/3, metadata jsonb, source_label, is_active)
- 추가: `review_status` text ('unreviewed'|'reviewed'|'grandfathered'), `reviewed_by` text, `reviewed_at` timestamptz
  (또는 metadata jsonb 에 review 객체로 — 마이그레이션 최소화하려면 jsonb 권장)

## 단계 (안전 순서)
1. **컬럼/필드 추가** — 기본값 'unreviewed'. 동작 변화 0 (그냥 칸만 생김)
2. **기존 자료 일괄 'grandfathered'** — 지금 쓰던 자료는 당장 안 막음 (먹통 방지). 단 "검수 대기" 목록엔 표시
3. **신규/수정 자료는 'unreviewed'로 시작** — 등재 시 검수 워크플로 태움
4. **어드민 검수 UI** — 자료 보고 'reviewed' 도장 (검수자·날짜 기록). /admin 제휴자원·RAG 메뉴에 추가
5. **검색 단계 적용 (점진)**:
   - 1차: 미검수/grandfathered 자료엔 답변에 "검수 대기 정보" 약한 라벨
   - 2차: 의료 핵심 카테고리(treatment/policy)부터 'reviewed'만 인용
   - 3차: 검수율 충분하면 전체 'reviewed'만 인용 강제
6. **회귀테스트로 안전 확인** — 각 단계 후 "정보 없음" 폭증 안 하는지 점검

## 검수 주체
- 의료 사실: 병원장/의료진 (AI_MEDICAL_REDLINES.md 의 '자료 등재 1회' 검수)
- 비의료(절차·비용범위·비자): 코디/PO

## 작업량 추정
- 1~4단계(칸 추가 + 어드민 UI): 1~2일
- 5단계(검색 적용): 0.5일 + 검수 콘텐츠 채우는 시간(운영)
- ⚠️ 5단계 강제 전환은 "검수된 자료가 실제로 쌓인 뒤"에만 — 콘텐츠 작업이 선행돼야 함

## 결정 필요 (PO)
- review_status 를 컬럼 vs metadata jsonb 중 어디에
- 강제 전환 시점 기준 (검수율 X%? 카테고리별?)
