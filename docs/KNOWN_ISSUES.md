# HEALO KHIDI — 알려진 이슈 / 전수 QA 발견사항

> 2026-05-21 전수 QA. 빌드·테스트는 정상. 아래는 발견된 개선점 — 심각도·범위 표기.

---

## 🧭 기초 감리 (2026-06-19) — 5축 제3자 점검

> "기능만 빨리, 기초 부실" 가설을 5축(보안/테스트·CI/타입·품질/관측/의존성·DB·문서)으로 코드 직접 검증.
> 종합 ≈56/100. 보안 뼈대(82)는 견고, 관측(42)이 최약점. 이번 PR에서 **위험3+근본원인 4건 수리**, 나머지는 아래 백로그.

### ✅ 이번에 수리 완료 (PR #85)
- **서버 Sentry 부활**: `instrumentation.ts`의 `return;` 제거 → 서버·SSR·크론 에러 수집 재활성(DSN 있을 때). **프로덕션(DSN 설정) 배포로 실수집 확인 필요.**
- **`supabaseAdmin` fail-closed**: 더미 fallback 을 빌드 단계(`NEXT_PHASE`)로만 한정, 런타임 env 누락 시 throw → 조용한 데이터 유실 차단.
- **`pg` 오배치 교정** + **취약점 31→7**(axios 1.18.0·ws 8.21.0 등 prod·high 패치, 죽은 `@ai-sdk/openai`·`@ai-sdk/react` 제거).
- **CI 게이트**: `tsc --noEmit` 머지 차단 추가. `eslint` 정보용(비차단).
- **기본 임시비번 healo1234 제거** → 계정마다 crypto 랜덤 14자(`admin/staff`).
- **게스트 채팅 PII 평문저장 차단**: `public/chat/start` 가 이름·이메일·전화를 AES-256-GCM 암호화 저장, 검색은 metadata SHA256 블라인드 인덱스. 읽기 경로 `decryptMaybe` 로 복호화(옛 평문 행 호환).
- **운영 알림 실제 연결**: `operationalAlerts.sendAlert` → Sentry+이메일(critical/warning). `adminNotifier.sendSMS` 가짜 'sent' 제거(미설정은 정직하게 skip).
- **핵심경로 테스트 + 커버리지 복구**: `encryptionV2.test.ts`(9), `@vitest/coverage-v8` 추가.
- **README** 피벗 반영 전면 재작성.

### 🔴 남은 백로그 (다음 세션 권장)
- **⭐ 중복 정리 (위생, 큰 리팩터)**: Supabase 클라이언트 6벌(server `supabaseAdmin.ts`108·`server.ts`16·`supabaseServerClient.ts`5 / browser `browser.ts`53·`supabaseClient.js`7·`supabase.js`2) → 정책 정하고 1~2벌로. 이메일 발송 2벌(`email/sendEmail.ts` vs `notifications/emailSender.ts`, env 규약 상이) → 1벌로. `withErrorHandler` 데드 추상화(155라우트 중 0 사용). **108+ import 사이트 영향 → 실서비스 리스크라 깨끗한 세션에서 단계적으로.**
- **`any` 813개**(인증·복호화 66개) 점진 축소, God컴포넌트 `consultation/[id]/page.jsx` 2,883줄 분할.
- **얕은 헬스체크**: `api/health`가 정적 `{ok}`만 → DB 죽어도 200.
- **남은 7취약점**: vitest(dev)·exceljs→uuid·sentry→postcss = major 강제 필요(깨질 수 있어 보류).
- **DB 마이그레이션 위생**: 수동 추적·정책 `DROP ... IF EXISTS` 가드 누락(재실행 충돌 위험).
- **알림 카운터 인메모리**: 서버리스 콜드스타트 리셋 → 누적 임계 정밀 집계는 DB 카운터 필요(개별 알림 전송은 정상).

---

## ✅ P1 — AI 토큰 남용 방어 (2026-06-12 적용 완료)

> 2026-06-12 PO 승인("피버모드 — 안 했던 작업 다")으로 적용 완료. 남은 것: Gemini 콘솔 spend cap 은 PO 직접 설정(5분).

봇/악성 사용자가 공개 AI(챗봇 등)를 반복 호출하면 현재 구조로는 못 막음:
- 회수 제한이 메모리 기반 → Vercel 다중 인스턴스에서 분산 우회 가능 (DB 기반 `checkRateLimitPersistent`는 `inquiries/create`에만 적용)
- `generateReply.ts`에 maxOutputTokens 없음 → 호출당 비용 상한 없음
- 하루 총량 차단기 없음 → 밤새 봇 돌면 아침에야 인지

**적용 내역 (src/lib/ai/aiGuard.ts + 공개 AI 라우트 5곳):**
1. 공개 AI 엔드포인트 전부 DB 기반 레이트리밋으로 전환
2. AI 챗 maxOutputTokens 추가 (한 줄)
3. 하루 총량 차단기 — 초과 시 공개 챗봇만 "상담사 연결 안내" 모드 + PO 이메일 알림 (상담방 자막은 참가자 전용이라 유지)
4. IP당 일일 챗 상한 (예: 50회 — 실환자 영향 없는 수준)

현재는 Gemini 무료 플랜이라 금전 피해가 아닌 "한도 소진 → 실환자 서비스 중단"이 실제 리스크. **유료 전환 전 적용이 순서.**

---

## 건강 상태 (정상)
- ✅ `npx next build --webpack` 통과
- ✅ 단위 테스트 12파일 / 106개 전부 통과 (vitest exclude 글롭 수정 후)
- ✅ i18n 커버리지 ru/kz 100%
- ✅ 공개 페이지 Premium 잔재 0 (전수 확인)

---

## ✅ P1 — 클라이언트 service_role 테이블 직접 쿼리 → 서버 API 이관 (2026-06-10 완료)

`inquiries`·`chat_threads`·`chat_messages`·`consultation_sessions` 전부 service_role 전용 RLS (pg_policies 재확인됨).
`/api/portal/*` 서버 API 신설 (`requirePortalAuth` — staff = app_metadata.role ∈ admin/coordinator/doctor) 후 일괄 이관:

| 파일 | 상태 | 경유 API |
|---|---|---|
| `app/admin/consultations/page.jsx` (picker) | ✅ | `/api/admin/inquiries/picker` |
| `app/coordinator/inbox/page.jsx` | ✅ | `/api/portal/inbox` (이름 복호화+마스킹) |
| `app/patient/messages/MessagesClient.jsx` | ✅ | `/api/portal/threads`·`…/[id]/messages` (realtime→5초 폴링) |
| `app/coordinator/messages/CoordinatorMessagesClient.jsx` | ✅ | 동일 + `PATCH /api/portal/threads/[id]` (상태변경) |
| `components/healo/NotificationBadge.jsx` | ✅ | `/api/portal/badge` |
| `components/healo/EmergencyButton.jsx` | ✅ | `/api/portal/emergency` |

**미검증:** 코드·빌드·단위테스트(106개)는 통과했으나 **실제 코디/환자 계정으로 화면 동작은 미확인** (portal 메뉴 미연결 상태 동일). portal 활성화 때 실계정으로 1회 점검 필요.

---

## ✅ P2 — ESLint TS 파싱 (2026-06-12 해소 — typescript-eslint 도입. 잔여: 기존 코드 에러 64·경고 1천여 건 점진 정리)

`eslint .` 실행 시 .ts/.tsx 에서 "Parsing error: Unexpected token interface/:" 다수 → eslint flat config 에 TS 파서 미설정. **실제 코드 버그 아님**(빌드는 통과). 다만 lint가 TS 파일 품질검사를 못 함.
**권장:** eslint TS 파서 설정 보강 → CI lint 실효성 확보.

## 🟢 P3 — 빌드 산출물에 css 파일을 가리키는 script 태그 1개 (기형, 무해)
모든 페이지 HTML 에 `<script src=".../css/xxxx.css">` 가 1개 끼어 있음 — 브라우저가 MIME 검사로 거부(콘솔 에러 1줄)하고 동작엔 영향 없음. 2026-06-12 기준 어제 코드(8ad7eef)에도 동일 존재 확인 — 오래된 기형. webpack 청크 매니페스트 이슈로 추정, Next 업그레이드 시 재확인.

## 🟢 P3 — 자잘한 미사용 변수
일부 파일에 unused var (colorClass, w, today, catch(e) 등). 빌드 영향 없음. 정리 시 lint-clean.

---

## 🟡 P2 — PNG 앱아이콘 옛 H마크 (리브랜드 잔재, PO 보류 결정)

`public/icons/icon-*.png`·`apple-touch-icon.png`·`favicon-16/32.png` 가 옛 `HEALO` `H` 마크. SVG(`favicon.svg`)는 소문자 `h`로 교체됐으나 PNG는 래스터라이저(rsvg/sharp) 환경 필요해 미재생성. **2026-06-17 PO "일단 보류, 나중에" 결정.** 재생성 시 새 `favicon.svg` 기준. (리브랜드 계획: `docs/REBRAND_HEALWITH_PLAN.md`, 컷오버: `docs/DOMAIN_CUTOVER_healwith.md` §5)

---

## 예방 (적용됨)
- `CLAUDE.md` 출시 전 self-QA 체크리스트 → service_role 테이블 client 직접 쿼리 금지 명시 (신규 코드 재발 방지)
