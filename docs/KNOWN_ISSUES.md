# HEALO KHIDI — 알려진 이슈 / 전수 QA 발견사항

> 2026-05-21 전수 QA. 빌드·테스트는 정상. 아래는 발견된 개선점 — 심각도·범위 표기.

---

## 🧭 기초 감리 (2026-06-19) — 5축 제3자 점검

> "기능만 빨리, 기초 부실" 가설을 5축(보안/테스트·CI/타입·품질/관측/의존성·DB·문서)으로 코드 직접 검증.
> 종합 ≈56/100. 보안 뼈대(82)는 견고, 관측(42)이 최약점. 이번 PR에서 **위험3+근본원인 4건 수리**, 나머지는 아래 백로그.

### ✅ 이번에 수리 (PR)
- **서버 Sentry 부활**: `instrumentation.ts`의 `register()`/`onRequestError`가 `return;`으로 막혀 **서버·SSR·크론 에러가 하나도 수집 안 됐음**(KPI 데드맨스위치·AI 차단기 경보 포함 무음). next.config는 6/12에 이미 충돌 해소했는데 이 파일만 5/19 비활성 방치. → 재활성(DSN 있을 때만). **프로덕션(DSN 설정) 배포로 실수집 확인 필요.**
- **`supabaseAdmin` fail-closed**: 더미 fallback 조건이 `typeof window==='undefined'`(=모든 서버 실행)라 런타임 env 누락 시에도 더미 반환→데이터 조용히 유실. → 빌드 단계(`NEXT_PHASE`)만 더미, 런타임은 throw.
- **`pg` 오배치 교정**: devDependencies인데 런타임 30파일이 import → dependencies로 이동(`npm ci --production` 시 모듈 누락 위험 제거). `playwright`는 devDeps로.
- **취약점 31→9**: `npm audit fix`(semver 안전)로 axios 1.7.9→1.18.0, ws 8.21.0 등 prod·high 전부 패치. 남은 9는 major 강제 필요(아래).
- **CI 게이트 강화**: `tsc --noEmit`(타입검사) 머지 차단 게이트 추가(현재 통과). `eslint`는 정보용(비차단) — 기존 에러 69건 정리 후 blocking 승격.

### 🔴 남은 백로그 (우선순위순)
- **운영 알림이 가짜**: `adminNotifier.ts:107` SMS/알림톡이 실발송 없이 success=true+DB 'sent' 기록(실동작 채널=이메일뿐). `operationalAlerts.ts:148` Slack/메일 경보 console 스텁+인메모리 카운터(서버리스 리셋). `inquiries/step1:126` 알림실패 `.catch(()=>{})` 삼킴.
- **보안 진짜 구멍 2개**(나머진 견고): ① `public/chat/start/route.ts:59` 게스트 채팅 PII **평문 저장**(문의 흐름은 암호화하는데 채팅만 누락) ② 기본 임시비번 `healo1234`(`admin/staff`). 이 둘만 막으면 보안 90점대.
- **핵심 경로 무테스트**: PII 암호화·AI 정규화·결제견적·화상토큰 백엔드 테스트 0건. 커버리지 측정은 `@vitest/coverage-v8` 미설치로 불가.
- **중복/위생**: Supabase 클라이언트 6벌·이메일 발송 2벌(env 규약 상이), `withErrorHandler` 데드 추상화(155라우트 중 0 사용), `any` 813개(인증·복호화 66개), God컴포넌트 `consultation/[id]/page.jsx` 2,883줄.
- **의존성/문서**: 죽은 `@ai-sdk/openai`·`@ai-sdk/react`(0 import, 취약점 1건도 여기서), README 2026-02-20 피벗 전 모델 멈춤, 마이그레이션 수동 추적·정책 DROP 가드 누락, 남은 9취약점(vitest=dev, exceljs→uuid, sentry→postcss = major 강제 필요).
- **얕은 헬스체크**: `api/health`가 정적 `{ok}`만 → DB 죽어도 200.

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
