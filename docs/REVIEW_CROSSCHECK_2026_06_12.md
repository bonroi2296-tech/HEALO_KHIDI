# 코워크 코드리뷰(2026-06-12) 교차검증 평가

> 코워크 리뷰의 모든 핵심 주장을 코드·운영DB로 직접 재검증한 결과. 판단 기준: 우리의 의도된 결정(PROJECT_CONTEXT)과 실측.

## 총평
**수준 높은 리뷰** — 자체 오검출 기각 섹션까지 있고, 내 자체감사(SELF_AUDIT_2026_06_11)가 놓친 진짜 P0 2건(Sentry 비활성, RAG 암호문 혼입)을 잡아냄. 단 4건은 오검출/이미 해결로 기각.

## ✅ 맞음 — 적용 (검증 완료)

| 항목 | 검증 결과 | 조치 |
|---|---|---|
| **P0-1 Sentry 꺼짐** | 사실. next.config.js 199행 — 2026-05-19부터 주석 처리 (OpenTelemetry 빌드 충돌). 에러 수집 0 | 재활성 시도 1회 → 실패 시 경량 대안(운영 알림 테이블+이메일). 반나절~1일 |
| **P0-2 에러 원문 노출** | 사실. chat:432(`jsonError`가 detail을 프로덕션에도 응답에 포함 — 직접 확인), analytics:82 확인. 내 감사 9곳 + 코워크 신규 3곳 = **총 ~12곳 일괄 수리** | 반나절 |
| **P0-3 RAG에 암호문 혼입** | 사실. `ingest.ts`가 복호화 없이 암호화된 raw_message를 RAG 문서에 삽입 (normalize는 암호화 저장 — 직접 확인). **추가 발견: contact 필드도 RAG에 들어감** | raw_message·contact를 RAG 문서에서 **제외** (PII는 RAG에 넣지 않는 원칙). 30분 |
| P1-4 조용한 실패 | 사실 (내 감사 P3와 동일 지적) | Sentry/알림 작업과 묶음 |
| P1-5 중복 구현 (supabase 클라 3벌, 이메일 2벌) | 사실 | 리팩터 스프린트에 (기능변경 없음) |
| P2 통합테스트 부재·strict 전환·회귀알림 연결 | 타당 | 백로그 |

## ❌ 기각 — 오검출/이미 해결 (직접 재검증)

| 코워크 주장 | 실측 |
|---|---|
| "RLS 실적용 미확인 (chat_threads·consultation_sessions 등)" | **이미 해결** — 어제+오늘 운영DB pg_policies 실측: 전 민감 테이블 RLS ON + service_role 전용. normalized_inquiries 정책 2개 중복은 사실이나 둘 다 service 전용 (효과 동일 — 정리만 하면 됨, P3) |
| "limit 없는 전체 조회 2곳" | **둘 다 틀림** — enrich/batch는 `.limit(maxLimit≤50)` (55행), playbook/analytics는 `.limit(5000)` (38행) |
| "playwright를 devDependencies로 이동" | **그대로 적용하면 기능 깨짐** — `crawlPipeline.ts:353`이 런타임 dynamic import (어드민 시술 자동생성). 레거시 크롤 정리할 때 같이 |

## 📋 의도된 것 (코워크가 맥락 모를 수 있는 부분)
- 레거시 크롤 모듈 경계 불명확 → 피벗 시 의도적 보존 (PROJECT_CONTEXT §2). deprecated 주석 추가는 수용 (가벼움).
- 사업계획서 조언("모니터링 주장 톤다운")은 타당 — Sentry 살리기 전까지.

## 제안 수리 패키지 (PO 승인 대기)
**1일 작업**: ① 에러 노출 ~12곳 일괄 수리 ② RAG에서 raw_message·contact 제외 + 기존 오염 문서 재인덱싱 ③ Sentry 재활성 1회 시도(실패 시 경량 대안 설계만)
