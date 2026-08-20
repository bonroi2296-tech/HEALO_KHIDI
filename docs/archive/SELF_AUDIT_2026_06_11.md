# healwith 코드 전수 자체감사 (2026-06-11)

> 목적: 외부 리뷰(코워크) 보고서 수령 전 자체 기준선. 보안·구조·데이터 3개 영역 병렬 전수 분석 + **의심 항목은 실제 DB(pg_policies)·코드로 재검증**.
> 전체 규모: API 라우트 148개 / 페이지 99개 / 소스 1,882파일 (TS 32%) / 단위테스트 106개 + E2E 28개.

---

## 1. 진짜 문제 (검증 완료, 고쳐야 함)

### 🔴 P1 — 바로 고칠 가치 있음

| # | 문제 | 위치 | 비고 |
|---|---|---|---|
| 1 | **에러 원문(error.message)이 API 응답에 노출** — 자체 보안 룰 위반. DB 스키마/내부구조 힌트 유출 | 9개 라우트: `api/inquiries/create`(공개!), `api/admin/reminders/[id]/retry`, `api/patient/documents`, `api/attachments/sign`, `api/rag/search`, `api/inquiry/normalize`, `api/cron/dispatch-reminders`, `api/admin/hospitals/enrich`, `api/admin/hospitals/[id]/offers/preview` | 코드로 직접 확인함. 반나절 수리감 |
| 2 | **레이트리밋이 메모리 기반** — Vercel 서버리스는 인스턴스가 여러 개라 IP가 분산되면 우회됨. DB 기반(`checkRateLimitPersistent`)은 `inquiries/create`에만 적용 | `src/lib/rateLimit.ts` | 봇/남용 방어 실효성 문제. 공개 POST부터 persistent로 전환 |
| 3 | **다국어 카피 27개 페이지에 인라인 중복** — 중앙 i18n(5,590줄) 있는데 안 씀. 언어별 누락/표기 드리프트 위험 | `app/consultation/[id]/page.jsx`(678개 키) 외 26개 | 점진 이관 권장 (한 번에 X) |
| 4 | **경로 별칭(@/) 미사용** — app/ 257개 파일이 `../../../src/...` 상대경로 (최대 7단계). 파일 이동 시 깨짐 | app/ 전반 | 일괄 치환 가능 (스크립트 1회) |

### 🟡 P2 — 계획 잡고 고치기

| # | 문제 | 위치 | 비고 |
|---|---|---|---|
| 5 | **chat_threads의 게스트 이름·이메일 평문 저장** — inquiries는 암호화하는데 여기만 평문 (일관성 깨짐). RLS로 외부접근은 차단되나 DB 유출 시 노출 | `migrations/20260518_chat_threads_guest_identification.sql` | 코드로 확인함. `*_encrypted` 이관 권장 |
| 6 | **AI 챗 응답에 토큰 상한 없음** — `generateReply.ts`에 maxOutputTokens 미설정 → 비용 폭주 가드 없음 (STT/번역엔 있음) | `src/lib/chat/generateReply.ts` | 코드로 확인함. 한 줄 수리 |
| 7 | **상담방 god-file** — 2,512줄에 입장/대기실/자막/채팅/파일/통역 전부 한 파일. 수정할 때마다 사고 위험 | `app/consultation/[id]/page.jsx` | 컴포넌트 분리 (기능 변경 없이) |
| 8 | console.log 835개 / `: any` 462개 / Supabase 클라이언트 중복 생성 65곳 | 전반 | 운영 노이즈·타입 빈틈. lint 정비와 묶어서 |
| 9 | ESLint가 TS 파일 검사 못 함 (파서 미설정) | `eslint.config.js` | **이미 KNOWN_ISSUES P2로 등록된 알려진 이슈** |

### 🟢 P3 — 여유 있을 때

- 암호화 **키 교체(rotation) 절차 없음** — V1 키 단일, 유출 시 대응 런북 부재
- AI 품질평가(judge) 저장 실패 시 재시도·알림 없음 (fire-and-forget 자체는 의도)
- 이메일 발송(Resend→SES) 실패 추적 테이블 없음 — 조용히 유실 가능
- 대기실 폴링 정리 코드가 깨지기 쉬운 패턴 (동작은 함)
- cron 시크릿 비교의 `padEnd()` 불필요 (길이 체크 이미 있음 — 사실상 무해)
- LiveKit 토큰 2시간 TTL·회수 불가 (초대장이 1회용+24h라 실위험 낮음)
- `DocumentsPremium.jsx`(비활성 폴백)에 직접 DB 쿼리 잔존 — RLS가 막아서 보안영향 0, Premium 켜면 빈 화면. 정리 대상

---

## 2. 문제처럼 보이지만 의도된 것 (외부 리뷰 반박용) ⭐

코워크 보고서에 아래가 "문제"로 올라오면 이렇게 답하면 됨:

| 예상 지적 | 실제 사실 |
|---|---|
| "**미들웨어(페이지 보호) 없음** — admin이 뚫려있다" | **틀림.** Next.js 16부터 파일명이 `middleware.ts`→`proxy.ts`로 변경됨. `proxy.ts`가 /admin·/patient·/coordinator·/partner를 서버 레벨에서 보호 중 (이번 감사 에이전트도 똑같이 오판했다가 정정됨) |
| "**상담 테이블 RLS 없음 / 환자 문서 유출 가능**" | **틀림.** 운영 DB 실측(pg_policies): inquiries·chat_*·consultation_* 전 테이블 RLS ON + service_role 전용 정책. 브라우저에서 쿼리해도 0건 반환 |
| "**타입 오류 무시하고 빌드**(ignoreBuildErrors)" | **옛날 얘기.** 2026-04-20에 `false`로 전환 완료 (`next.config` 195줄) |
| "Turbopack 안 쓰고 webpack 고정 — 구식" | Sentry 플러그인이 Turbopack 빌드와 충돌(런타임 모듈 누락). next.config에 사유 문서화됨. dev는 Turbopack 사용 중 |
| "TypeScript strict 꺼져 있음" | 점진 전환 중 (의도, CLAUDE.md 명시). strictNullChecks는 켜져 있고 `@ts-ignore` 0개 |
| "죽은 코드 많음 — Premium 17개 파일, _archive, 매칭엔진, 크롤러, /stories" | **피벗(디렉토리→암환자 컨시어지)의 의도적 보존.** 라우트는 redirect로 차단돼 손님 노출 0. PROJECT_CONTEXT.md에 사유 기록 |
| "어드민 계정 이메일이 가짜(@healo.local)" | 의도 — 의사·코디는 메일 수신 불필요, 어드민이 임시비번 직접 발급하는 운영 방식 |
| "계정 삭제가 진짜 삭제가 아님" | 의도 — 소프트 삭제 원칙 (의료 기록·FK 보존) |
| "병원 사진이 죄다 placeholder" | 의도 — 저작권 불명 이미지 전량 제거, PO 제공 실사진만 쓰는 정책 |
| "포털(코디/환자 메시지) 화면이 빈 데이터" | 알려진 상태 — portal 미활성(메뉴 미연결), 서버 API 이관은 완료됐고 실계정 검증만 남음 (KNOWN_ISSUES P1) |

## 3. 잘 돼 있는 것 (감사 결과 합격 항목)

- 인증: 148개 라우트 중 보호 필요한 곳 전부 인증 헬퍼 사용, 권한은 app_metadata 기준(user_metadata 미사용), cron은 타이밍세이프 비교
- 암호화: AES-256-GCM 구현 건전(랜덤 IV·auth tag·fail-closed), PII 암호화 일관 적용(chat_threads 게스트 필드 제외)
- 게스트 토큰: 해시만 저장·24h 만료·1회용 — 설계 양호
- 공개 POST 24개 전부 레이트리밋 호출 (단, 메모리 기반 한계는 P1-2)
- service_role 키 server-only 격리, 클라이언트 번들 유입 없음
- 마이그레이션 82개 SQL 버전관리 — 스키마 재현 가능
- 의존성 최신·경량 (Next 16.1.4, 중복 라이브러리 없음)

## 4. 추천 수리 순서 (효율순)

1. **에러 노출 9개 라우트 수리** (반나절) — 보안 룰 위반이라 최우선, 기계적 작업
2. **generateReply 토큰 상한 + 레이트리밋 persistent 전환** (반나절) — 비용·남용 방어
3. **chat_threads 게스트 PII 암호화** (반나절~1일) — 컴플라이언스 일관성
4. 경로 별칭 일괄 치환 + ESLint TS 파서 (1일) — 이후 모든 작업이 편해짐
5. i18n 인라인→중앙 이관, 상담방 파일 분리 — 큰 덩어리, 기능 멈춘 시기에

---
*검증 방법: 에이전트 3개 병렬 전수 분석 → 핵심 지적은 운영 DB(pg_policies)·코드 라인 단위로 직접 재확인. 에이전트 오탐 2건(미들웨어 부재, RLS 부재)은 본 문서에서 정정함.*
