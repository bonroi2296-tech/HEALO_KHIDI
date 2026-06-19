# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

---

## 🔖 세션 핸드오프 (2026-06-19 야간 자율) — 죽은라우트 정리·마이그레이션 멱등·알림DB·KHIDI KPI 깨진컬럼 수정·상담방 i18n (PR 5건, 1머지+4 PO대기)

**이번 세션 한 일 (야간 자율 — PR 5건):**
- **A. 죽은 `/api/chat` 라우트 제거 ([#99](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/99) — 머지·배포 완료):** UI 미사용(아카이브 dead-code만 참조)인 옛 AI SDK 스트리밍 라우트 삭제. 활성 챗은 `ThreadChat.jsx`→`/api/public/chat/message`→`generateReply.ts`. 폼 자동채움 쓰는 `/api/chat/thread-summary`는 보존. **저위험이라 CI 초록 확인 후 직접 머지.**
- **B. 마이그레이션 멱등 가드 ([#100](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/100) — draft, PO 대기):** 80개 중 19개 파일이 재실행 시 `duplicate_object(42710)` 하드실패 상태였음 → 정책39·트리거4·인덱스10·제약2에 `DROP IF EXISTS`/`IF NOT EXISTS` 가드 추가(스키마 결과 불변, 실DB 미적용). 재발방지로 `scripts/check-migration-idempotency.mjs` 신설 + CI 게이트(`npm run check:migrations`). POSTMORTEMS #6.
- **C. 알림 카운터 인메모리→DB ([#101](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/101) — draft, PO 대기):** 콜드스타트 리셋 문제. `migrations/20260619_alert_counters.sql`(append-only 테이블 + `alert_counter_increment` RPC, `check_rate_limit` 패턴) + `operationalAlerts.ts`가 RPC 호출(실패/미적용 시 인메모리 fallback). 개별 알림(`sendAlert`)은 무변경. **실DB BEGIN/ROLLBACK으로 로직 검증 후 롤백(미적용).**
- **F. 🔴 KHIDI KPI 깨진 컬럼 수정 ([#102](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/102) — draft, PO 대기):** **평가 핵심 버그 발견** — `kpi.ts`가 없는 컬럼(`visit_confirmed_at`·`actual_duration_minutes`)을 쿼리해 **유치·사전상담이 항상 0**(PostgREST 오류→`?? 0` 위장). 실DB 대조로 실제는 유치 4·사전상담 9·사후관리 3. 유치=`inquiries.outcome='admitted'`(전환 깔때기와 정의 통일), 사전상담=duration필터 제거. 공식 목표 SoR `targets.ts`(12/120/90) + 대시보드 "사업 누적 달성률" 섹션 + 집계오류 가시화 배너. POSTMORTEMS #7, KHIDI 베이스 §4 6월 로그.
- **E. 상담방 역할 라벨 i18n ([#103](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/103) — 저위험, CI 초록 시 머지 예정):** 화상상담방 조사 결과 **표준 동작(스피커뷰·화면공유 자동확대·720/1080p·언어 전체전환)은 이미 다 구현돼 있었음.** 유일한 갭 = 역할 라벨 3곳(자막·채팅·번역패널)이 영어 하드코딩 → 6언어 `roleX` 키 + `roleLabel()` 헬퍼로 렌더 시점 번역. 영상·STT 로직 무변경.

**왜 그렇게 했는지:**
- **작업 1건=브랜치1개=PR1개** 원칙으로 분리(섞으면 리뷰·롤백 어려움). 저위험(A·E)은 직접 머지 방침, 보안민감·DB변경·평가숫자 바뀌는 건(B·C·F)은 PO 확인 대기.
- **F가 최고가치**: "ICT가 자기 ICT로 성과 자동측정"이 평가 스토리인데 그 숫자가 0이면 치명적 → 실DB 대조로 근본원인(없는 컬럼) 찾아 수정. 전환 깔때기 RPC와 정의 통일해 두 대시보드 일치.
- **E는 통째 분할 안 함**: 2883줄 화상방 리팩터는 LiveKit 라이브 검증(2+참가자) 필요해 자동검증 불가 → "반쪽 구현" 위험. 검증 가능한 i18n 갭만 수정하고 분할은 계획만 기록.

**안 끝났거나 보류:**
- **D. 타입 강화(any 축소): 안 함** — 남은 any가 좁히면 타 파일 tsc 깨지는 것(decryptForAdmin·agency_users)이라 저가치·고위험으로 판단해 스킵. 안전한 슬라이스 나오면 별도 진행.
- **E. God 컴포넌트(2883줄) 분할**: 안전 추출 seam(VideoGrid·SubtitleOverlay·RoomInfoOverlay) 식별만 함. 실제 분할은 LiveKit 라이브 검증 환경 필요 → PO 확인 후 별도 세션.
- **PR #100·#101·#102 머지 대기**: DB/평가 영향이라 PO 결정 필요(특히 #101·#102는 머지 후 마이그레이션 적용 결정도).

**주의·함정:**
- **POSTMORTEMS.md·KHIDI 베이스 머지 충돌**: #100(#6)·#102(#7)·이 핸드오프가 같은 파일 끝부분을 건드림 → 머지 순서에 따라 trivial 충돌 가능(번호 재정렬만).
- **#101·#102는 마이그레이션 미적용**: 코드는 fallback/읽기전용이라 미적용 상태에서도 안전 동작. #101은 적용 전까지 인메모리, #102는 DB 읽기만(스키마 변경 없음 — #102는 마이그레이션 파일 없음, 코드만).
- **로컬 node_modules 없으면 `npx tsc`가 전역 TS6로 폴백**(baseUrl deprecation 에러) → `npm ci` 후 `./node_modules/.bin/tsc`로 검증(CI는 lock의 5.9.3).

**다음 세션이 먼저 할 일 (우선순위):**
1. **⚠️ 직전 미검증분 먼저 확인:** (a) **서버 Sentry 실수집**(이전 세션 미해결) — 관리자 로그인 → `https://healo-khidi.vercel.app/api/sentry/test` 1회 → JSON "전송됐습니다"면 Sentry 대시보드 도착 확인. (b) **#103 상담방 i18n** — 머지·배포됐으면 상담방에서 언어 바꿔 역할 라벨 전환 확인(못 하면 다음 세션이).
2. **PR 4건 결정·머지:** [#100](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/100)(마이그레이션 멱등)·[#101](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/101)(알림DB)·[#102](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/102)(KHIDI KPI 수정)·[#103](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/103)(상담 i18n) 검토. **#102는 평가 직결이라 우선** — 정의(유치=admitted, 상담=세션완료) 확인 후 머지 → 머지 후 #101 마이그레이션 적용 결정.
3. (보류) God 컴포넌트 분할 / 타입 any 축소 / 화상방 라이브 검증.
4. KHIDI 중간평가(2026-08-27) 상시 — 이번 KPI 수정은 평가항목 ④(성과지표) 직결.

**검증 상태:** 매 PR `tsc --noEmit`(에러0)·`vitest 129`·`eslint 에러0`·`check:content`·`next build --webpack` **로컬 통과**. PR별 CI: **[#99](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/99) ci·smoke·Vercel 전부 초록 + main 머지·배포 완료.** [#100](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/100)·[#101](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/101)·[#102](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/102) **CI 초록 확인(draft, PO 대기).** [#103](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/103) CI 진행 중(초록 시 자동 머지 예정). **F(#102) KPI 실측치는 실DB 조회로 검증(유치4·사전상담9·사후관리3)** — 단 **대시보드 화면 실제 클릭은 관리자 세션 없어 미확인**(다음 세션/PO가 `/admin/khidi/kpi-dashboard`에서 확인). **C(#101) RPC는 트랜잭션 롤백으로 로직만 검증, 프로덕션 미적용.** **서버 Sentry 런타임은 이전 세션부터 계속 미검증(PO 1클릭).**

**다음 세션 첫 프롬프트 (PO 복붙용):**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프(2026-06-19 야간 자율) 읽어. 그다음: 1) 야간에 연 PR 4개 봐줘 — #102(KHIDI KPI 깨진거 수정, 유치·사전상담이 0으로 나오던 버그)가 평가 직결이라 제일 중요, #100(마이그레이션 멱등)·#101(알림 DB)·#103(상담방 언어 전환). CI 다 초록이야. #102 정의(유치=admitted 확정, 상담=세션완료 수)만 확인되면 머지하고, 머지 후 #101은 마이그레이션 적용할지 정해줘. 2) 직전 미검증분: 관리자로 https://healo-khidi.vercel.app/api/sentry/test 한번 열어서 JSON 알려줘(서버 에러감시 마지막 확인). 3) #102 머지·배포되면 /admin/khidi/kpi-dashboard 열어서 유치 4/12·사전상담+사후관리 12/120 뜨는지 봐줘. 새 작업은 origin/main 최신 동기화부터.

---

## 🔖 세션 핸드오프 (2026-06-19 오후·저녁) — 직전 미검증분 확인 + 5축 점수 올리기(서버클라 통합·관측·CI게이트·타입) PR 6건 머지

**이번 세션 한 일 (PR 6건 전부 main 머지·실서비스 배포):**
- **직전 미검증분 확인:** (a) **AI 챗 ✅ 프로덕션 실검증** — 공개 위젯(`/api/public/chat/message`, PO 실경로)에 그 질문("친구 유방암…") 실제 호출 → 따뜻한 공감으로 시작·가격 안 들이밂·잘림 없음(테스트 데이터 정리함). (b) **Sentry ⚠️ 못 함** — 코드·배포·관리자보호 정상이나 대시보드 도착은 관리자 세션·Sentry 접근 없어 내가 검증 불가(=PO 1클릭). (참고: UI에서 안 쓰는 죽은 라우트 `/api/chat`은 아직 비가격 질문에도 가격표 토함 — 공개 위젯과 별개, 백로그.)
- **중복정리 3단계 ([#89](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/89)) — 서버 Supabase 클라 4벌 통합:** service_role 생성 3벌(`supabaseAdmin`·`getSupabaseServerClient`·`createServiceRoleClient`)→**1벌**(supabaseAdmin 싱글톤, 나머지 위임). **위험한 anon 폴백 제거**(fail-closed). anon no-session `data/supabaseServer.js`→정본 `supabase/server.ts`(`supabaseAnonServer`)로 통합·삭제. 쿠키세션 클라는 역할 달라 유지. 호출부 30곳 무변경.
- **관측 강화 ([#91](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/91)) — 헬스체크 실측화:** `/api/health`가 정적 `{ok}`(DB 죽어도 200)→공개 테이블 head count로 **실제 DB 프로브**(실패 시 503). **프로덕션 실검증 완료**(`db:"up", latency_ms:705`).
- **kpi 통합 + 버그발견 ([#92](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/92)):** `khidi/kpi.ts` 자체 service_role 클라도 정본 위임. **발견: KPI "국가별 분포"가 없는 테이블 `khidi_intakes`를 쿼리 → 항상 빈 값**(헤드라인 유치건수는 무사). KNOWN_ISSUES 기록.
- **eslint 0 + CI 차단게이트 ([#93](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/93)):** eslint 에러 67→0(미사용변수 62 안전정리 + react-hooks/constant 5건), `ci.yml`에서 `continue-on-error` 제거 → **에러 생기면 머지 차단**.
- **타입 박기 ([#94](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/94)):** auth·security `any` 66→11(catch unknown·NextRequest·User 등). **보너스: 잠복 tsc 에러 수정** — `app/api/admin/inquiries/route.ts:143`의 supabase 동적 select 결과 캐스팅(아래 함정 참조).
- **점수 before→after:** 보안 88→89 / 관측 60→64 / 테스트·CI 64→72 / 타입·품질 54→60 / 의존성·DB·문서 66 = **종합 66→약 70/100**.

**왜 그렇게 했는지:**
- 서버 클라는 보안등급(service_role=RLS우회 / anon=RLS적용)이 파일마다 달라 한 방에 합치면 사고 → 보안등급별 단계 PR로.
- C(any)에서 `khidi/kpi.ts`·`inquiries` 라우트의 supabase 타입 불일치가 드러남: **옛 코드는 제네릭 없는 `createClient`(무검사)라 숨어있던 것**. kpi는 동작보존(느슨 캐스팅)하고 버그는 기록, inquiries는 제대로 캐스팅해 고침.
- "좋은건 다 해, 토큰 걱정 말라"는 PO 지시로 점수 4축을 전부 구현·배포(부분 안 함).

**안 끝났거나 보류:**
- **서버 Sentry 런타임 실수집 미검증:** 코드·배포·403보호만 확인, DSN 실제 켜짐+대시보드 도착 못 봄 → **PO 1클릭 필요**.
- **🐛 KPI 국가분포 버그:** `khidi/kpi.ts`가 없는 테이블 `khidi_intakes` 쿼리. `nationality`는 `inquiries`·`visa_applications`에 있음(환자→국적 매핑 재설계 필요) → **PO 결정 대기**(KHIDI 리포트 국가분포 영향).
- **남은 any 11(auth/security):** 테스트 모킹·생성스키마에 없는 `agency_users`·범위밖 14라우트가 쓰는 `decryptForAdmin` 반환 → 좁히면 타 파일 tsc 깨짐(별도 과제, 0 강행 금지).
- **죽은 라우트 `/api/chat` 가격표:** 공개 위젯과 프롬프트 규칙 불일치(백로그) / (이전 트랙) 화상상담방 라이브 검증·발화자 역할 DB 저장·Gemini 유료 회의록(#68).

**주의·함정:**
- **PR 베이스 skew 주의:** #92·#93을 각각 다른 베이스에서 따서 각자 CI 통과 후 머지 → **합쳐진 main에 잠복 tsc 에러**가 생겼다(어느 PR CI도 그 조합을 안 봄). #94에서 노출돼 잡음. 교훈: 연속 PR은 **직전 머지 후 origin/main 재동기화**하고 따라(이번에 로컬 main이 자꾸 뒤처져 헷갈렸음).
- **로컬 tsc ≠ CI일 수 있음(supabase 타입):** supabase 동적 select(`GenericStringError`)는 의존성 트리·tsbuildinfo에 민감. 헷갈리면 `rm -f tsconfig.tsbuildinfo` 후 재실행. **최종 판정은 CI tsc.**
- 헬스체크는 `force-dynamic`+`no-store`(매번 실측). anon 최소권한이라 hospitals에 anon read 정책 있어야 작동(현재 작동 확인).

**다음 세션이 먼저 할 일 (우선순위):**
1. **⚠️ 직전 미검증분 먼저 확인:** **서버 Sentry 실수집** — 관리자 로그인 → `https://healo-khidi.vercel.app/api/sentry/test` 1회 열기 → JSON이 "전송됐습니다"면 Sentry 대시보드에서 "의도된 테스트 에러" 도착 확인(=서버 에러감시 실작동). "미설정"이면 Vercel에 `NEXT_PUBLIC_SENTRY_DSN` 추가 필요.
2. **🐛 KPI 국가분포 버그 결정:** 환자→국적 매핑을 `inquiries`/`visa_applications` 기준으로 재정의할지 PO 결정 → 구현(KHIDI 리포트용).
3. (대기) 화상상담방 라이브 검증 / 발화자 역할 DB 저장 / Gemini 유료 AI 회의록(#68) / 죽은 `/api/chat` 정리.
4. KHIDI 중간평가(2026-08-27) 상시 — `docs/KHIDI_중간보고_베이스.md`. 이번 관측·CI게이트·타입 강화는 "ICT 체계 구축" 정성평가 기여.

**검증 상태:** PR [#89](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/89)·[#91](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/91)·[#92](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/92)·[#93](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/93)·[#94](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/94) = **CI(ci·smoke·Vercel) 전부 초록 + main 머지 + 프로덕션 배포 완료.** (문서 PR #90도 머지.) 매 단계 `tsc --noEmit`(실에러0)·`vitest 129`·`eslint 에러0`·`check:content`·`next build` 통과. **AI 챗·헬스체크는 프로덕션 실검증 ✅.** **❌ 서버 Sentry 런타임은 미검증(PO 1클릭).** **열린 PR(이번 세션 것): 없음.** 기존 열린 PR [#83](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/83)(AI 안전 0층, draft)·[#41](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/41)(비자)은 **이전 세션 것 — 이번 작업과 무관, 그대로 열려있음**(PO가 따로 검토).

**다음 세션 첫 프롬프트 (PO 복붙용):**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프(2026-06-19 오후·저녁) 읽어. 그다음: 1) 직전 미검증분 — 관리자로 로그인한 채 https://healo-khidi.vercel.app/api/sentry/test 한 번 열어서 나온 JSON 알려줘("전송됐습니다" or "미설정"). 서버 에러감시(Sentry)가 실제로 도는지 마지막 확인. 2) KPI 국가별 분포가 없는 테이블을 쿼리해서 항상 비어있는 버그 있음(docs/KNOWN_ISSUES.md 최상단) — 환자→국적 매핑 어떻게 할지 정하고 고쳐줘. 3) 그 외 백로그는 KNOWN_ISSUES 참고. 새 작업은 origin/main 최신 동기화부터.

---

## 🏷️ 서비스명 변경 — HEALO → **healwith** (2026-06-16 확정·적용)

**상표 문제로 서비스명을 `HEALO` → `healwith`(항상 소문자 표기)로 최종 변경. 앞으로 모든 신규 작업은 `healwith`로 한다.**

- **표기 규칙**: 화면·문서 어디서나 **소문자 `healwith`** (문장 첫머리도 소문자). 로고는 투톤(heal=teal-600 / with=slate).
- **이번에 바꾼 것 (화면에 보이는 것)**: app/src/components 의 브랜드 텍스트·i18n 6개 언어 문자열·메타데이터·이메일 발신자명·PDF/견적/초청장 문서번호 접두사·헤더 워드마크·favicon(`h`)·manifest. (`HEALO`→`healwith` 약 1,144곳)
- **일부러 안 바꾼 것 (그대로 둠 — 건들면 깨지거나 기록보존)**:
  - `HEALO-KHIDI` (코드 내부 프로젝트 코드명, 20곳), `HEALO_EMAIL_FROM` (환경변수명)
  - `healo-khidi` (Vercel 프로젝트명·배포 URL·repo = 인프라), `components/healo/` (폴더 경로), 소문자 `healo`(예시 비번 `healo1234`·placeholder 이메일·기존 `healo.kr` URL)
  - **docs 내부 개발 히스토리 문서**: 과거 기록이라 본문 유지 (이 핸드오프 노트로 변경 사실만 명시).
- **아직 남음 (TODO)**:
  - **PNG 앱아이콘 재생성**: `public/icons/icon-*.png`·`apple-touch-icon.png`·`favicon-16/32.png` 가 옛 `H` 마크. 래스터라이저(rsvg/sharp) 환경에서 새 `favicon.svg`(소문자 h)로 재생성 필요.
  - **도메인**: `healwith.co.kr` 등록 예정(후이즈) → 등록 후 `healo.kr`/`khidi.healo.kr` 구조화데이터 URL·OG·canonical 교체 + Vercel 도메인 연결.
  - **상표 출원**(Madrid) 별도 트랙.
  - Vercel 프로젝트명/배포 URL 변경은 인프라 마이그레이션이라 보류(현 `healo-khidi.vercel.app` 유지).
- 계획·범위 상세: `docs/REBRAND_HEALWITH_PLAN.md`.

---

## 1. 이 서비스가 뭔가 (피벗 후)
- **KHIDI HEALO** = 카자흐스탄·러시아·CIS **암환자**를 한국 **종양 병원**으로 연결하는 의료관광 컨시어지.
- **중요한 피벗**: 예전엔 "한국 전체 병원 디렉토리(크롤링)"였으나 → **암환자 컨시어지**로 전환. 디렉토리 시절 잔재(대량 import·크롤링 등)는 "레거시"로 분리.
- 자금: KHIDI 정부지원과제 + Bonroi 개인사업자. PO 혼자 운영.

## 2. 핵심 전략 결정 (왜)
- **"병원 매칭 마켓플레이스" 아님 → "연속 케어 컨시어지"**: 제휴 병원이 면력한방병원 3곳(진단·면역·재활, 수술 X) + 협진 대학병원 4곳(수술·항암)뿐. 100개 중 1개 고르는 게 아니라 **진단→수술 연계→면역·재활을 쭉 잇는** 모델. 그래서 홈·AI챗·치료여정의 "매칭" 표현을 "케어 경로/상담 배정"으로 톤다운함. (`/care-journey` 페이지가 이 스토리)
- **매칭 엔진 코드는 보존**하되 환자 전면엔 안 붙임 (미래 확장용).

## 3. 디자인 (DESIGN.md 가 헌법)
- **Legacy 톤만 표준** (Airbnb 스타일: 흰 배경·teal-600·시스템폰트·rounded-xl).
- **Premium 톤 폐기**: 검은배경·금색·serif·필름그레인 = "럭셔리 호텔" 느낌이라 PO·대표가 거부. 정부과제 성격과 안 맞음.
- PO가 가장 싫어하는 것: **"AI가 만든 느낌"** (큰 컬러원+큰아이콘, 똑같은 카드 반복, 이모지 도배, 의미없는 영문카피).
- 공개 페이지(/treatments·상세·/telemedicine·/faq·/hospitals/immune·404·500) 전부 Legacy로 재구성 완료. Premium은 `*Premium.jsx` 폴백으로만 존재(기본 비활성).

## 4. 주요 기능 현황 (라우트는 CLAUDE.md 참조)
- **통합 문의 퍼널 `/inquiry`**: 진입 시 AI Agent / Human Agent / Inquiry Form 선택. `/intake`·`/consult/start`는 여기로 통합(redirect). Human Agent = WhatsApp·Telegram·WeChat·LINE 4채널 (env URL 미설정이라 현재 "준비 중" 표시).
- **원격협진(LiveKit 영상)**: 코디가 `/admin/consultations`에서 상담 생성(문의에서 환자 선택+의사/코디 드롭다운) → 게스트 초대 링크 → `/consultation/[id]` 영상. LiveKit 키는 Vercel에 설정됨(작동). 예약시각 KST 입력·KST+UTC 병기.
- **회원관리**: `/admin/staff`(의사·코디 — 역할부여·임시비번·소프트 비활성), `/admin/users`(환자 — 상담이력·소프트 ban). 계정은 어드민에서 생성(이메일 형식이면 가짜 `doc1@healo.local` 도 가능, 메일 수신 불필요).
- **어드민 메뉴**: 운영현황 / 환자여정 / 제휴자원·RAG / AI품질·시스템 / 레거시도구 (피벗 반영 재편).
- 보안: inquiries/chat_threads/consultation_sessions 는 **service_role 전용 RLS + PII 암호화** → 반드시 서버 API 경유.

## 5. 지금 막혀있거나 PO 결정 대기
- **서비스명 변경**: HEALO 상표권 문제 → 새 이름 정해야 함(미정). 정하면 도메인 등록 + Madrid 출원.
- **메신저 URL 4개**: Vercel env(`NEXT_PUBLIC_MESSENGER_*_URL`)에 넣어야 채널 활성. Telegram 봇·WhatsApp 비즈니스는 PO가 가입.
- **병원 사진 전체**: 주워온 이미지(immunehospital 배너·시술컷, unsplash, 세브란스 위키미디어) **전부 제거** → "이미지 준비 중" 플레이스홀더(`_coming-soon.svg`)로 대체. PO가 직접 제공하는 실사진만 적용 원칙. **성동만 PO 제공 항공샷 적용됨**(`immunehospital-seongdong/1.jpg`).
  - **폴더 규칙**: `public/images/hospitals/<slug>/1~5.jpg` (1=메인 썸네일, 2~5=서브 갤러리). 상세페이지 그리드가 메인1+서브4 자동 정렬. 폴더 8개 생성됨(README.md 참조).
  - **연결 위치**: 마곡·신촌·광명·이대서울·이대목동·고려대구로·세브란스 = **DB**(hospitals 테이블 thumbnail_image/gallery_images/images) / 성동 = **정적**(partnerHospitals.js). PO가 폴더에 사진 넣으면 → DB(SQL) 또는 정적 코드에서 해당 경로로 연결해야 반영됨.
  - 면력 의료진 헤드샷·`/hospitals/immune` 전용 페이지(Photos.js)는 immunehospital.com 공식 사용권 이미지라 미변경(PO가 원하면 교체).
- **고려대구로 "수술 성공률"** 문구: 출처 불명이라 톤다운 유지 중.

## 6. 다음 작업 (KNOWN_ISSUES.md 참조)
- **P1 — portal 데이터 서버 API 이관**: coordinator/inbox·patient/messages·coordinator/messages·알림뱃지가 service_role 테이블을 client로 직접 조회 → 빈 데이터. 단 portal 미활성(메뉴 미연결·코디계정 없음)이라 손님 영향 없음. portal 본격 활성화 직전 일괄 수정 권장.
- **환자 여정 통합 뷰**: ✅ 1단계 완료 — 문의 폼 이메일 필수화(전화 선택) → `/admin/users` 환자 상세에 "과거 문의"를 **이메일로 매칭**해 표시(가입 전 게스트 문의↔계정 통합). 동일인 식별 키 = **이메일**(PO 결정). inquiries.email은 AES암호화(IV랜덤)라 복호화 후 비교(파일럿 규모; 대량화 시 이메일 해시 컬럼 권장). 다음: 상담·견적·비자까지 한 타임라인으로 확장 가능.
- 의사/코디 portal, 비자·견적 admin 감독 뷰(읽기전용 미러) 등.

## 6-1. 공신력 데이터 인용 (콘텐츠 신뢰·SEO)
- **인용 중인 통계**: 한국 암 5년 생존율 **72.9%**(2018–2022, 국립암센터 국가암등록통계) / 2024 외국인환자 **117만명**(KHIDI) / 러시아 누적 16,622·카자흐 14,475명(KHIDI 2009–2024).
- **사용 위치**: `/care-journey`("숫자로 보는 한국 암치료" 섹션, 6개 언어), `/ru/for-russian-patients`·`/kk/for-kazakh-patients`(통계 밴드). 모두 출처 각주 표기.
- **주의**: 한방=암 "치료/완치" 근거로 쓰지 말 것. 통합종양학 문헌은 "보조·삶의질·부작용 관리" 프레임으로만. 통계는 매년 신규 발표 시 갱신.

## 6-1-b. 심층 리서치 결과 (2026-06-11) — `docs/DEEP_RESEARCH_2026_06_11.md` 필독
- **법**: 의료해외진출법 개정(2026.5.26 공포, ~2027.5 시행) — 외국인환자 비대면진료 합법화. 단 진료 주체=유치의료기관 소속 의사 (HEALO는 플랫폼/유치업자 역할로 구조 명확화). 유치업자 등록 확인 + 변호사 자문 + KHIDI 지원시스템 위탁 문의 필요.
- **즉시 5건**: Gemini spend cap 설정 / 모델 별칭 핀(5배 비용 폭탄 방지) / 유치업자 등록 확인 / AI챗 국외이전 고지 / Vercel Pro 전환.
- **카자흐어 통역 해결책 확정**: Gemini 3.5 Live Translate 카자흐 지원 확인 (백업: Gladia). PoC 대기.
- **결제 원칙**: 러시아 직접 결제 불가 → 병원 직접청구 + 카자흐 허브.
- **데드라인**: Supabase 구형 API 키 마이그레이션 (2026년 말 키 제거).
- Supabase 리전 = 서울 확정 (국외이전 부담 최소).

## 6-2. 트렌드 스캔 루틴 (`/trend`)
- PO가 아무 세션에서 **`/trend`** 입력 → 최근 신뢰도 높은 기술·시장 소식 중 HEALO 적용 가능한 "보석"만 선별 보고 (`.claude/commands/trend.md`에 기준 정의). 주 1회 권장. 적용은 PO 승인 후에만.
- 후보 메모: **Gemini 3.5 Live Translate** (2026-06-09 발표) — LiveKit 공식 연동, 분당 $0.023, 음성+자막 동시. 카자흐어 지원 확인 + PoC 1~2일 후 도입 판단 (Gemini 유료 전환·토큰 방어와 묶어서).

## 7. 일하는 방식 (반드시)
- 출시 전 **self-QA**(CLAUDE.md): "빌드 통과 ≠ 동작". DB 기능은 RLS·암호화·데이터흐름 직접 검증. 검증 못 한 건 솔직히 말함.
- 빌드: `npx next build --webpack` (Turbopack 금지). main 푸시 = Vercel 자동 배포.
- 큰 변경은 계획 먼저 보여주고 승인받기. "겸사겸사" 다른 거 건들지 말기.
