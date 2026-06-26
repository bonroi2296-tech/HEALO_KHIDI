# 사후분석 (Post-mortems) — 반복 방지 로그

> 버그·누락·사고가 나오면 **여기에 한 건씩 기록**한다. 형식: 무슨 일 / 왜 못 잡았나(근본원인) / 어떻게 고쳤나 / 재발 방지(시스템 적용).
> 목적: 같은 실수를 두 번 안 하게 + PO가 화면에서 직접 찾아야 하는 일을 없앤다.
>
> **루틴(상시):** 콘텐츠/브랜드 변경 또는 버그 발견 시 → ①`npm run check:content` 통과 확인(CI 자동)
> ②발견된 버그는 아래에 반성문 1건 추가 ③유사 이슈 추가 스캔 ④가능하면 **검사기(`scripts/check-content-consistency.mjs`)에 새 룰 추가**해 재발 차단.

---

## #43 — 비번찾기 캡차(Turnstile)가 CSP에 막혀 조용히 죽음 → 재설정 자체를 막음 (2026-06-26)

- **무슨 일**: 비번찾기에 Turnstile 캡차를 넣었더니 실서비스에서 **빈 회색 박스 + '보내기' 버튼 영구 비활성** → 사용자가 재설정을 아예 못 함. PO가 "화면이 이따구"라고 지적.
- **근본원인(2겹)**: ①`next.config.js`의 **CSP가 challenges.cloudflare.com을 차단**(script-src/frame-src에 없음) → 캡차 위젯이 조용히 로드 실패(빈 박스). 버튼이 캡차 토큰을 기다리니 영구 비활성. **캡차 넣을 때 CSP를 안 봄.** ②CSP를 풀어도 위젯이 안정적으로 안 떠(컴포넌트 스크립트 주입 타이밍). = #35 "조용히 실패" 패턴 + 외부 위젯을 핵심 경로에 둔 설계 실수.
- **고침**: **보이는 캡차(Turnstile) 제거.** 봇 차단은 이미 있는 **서버 라우트 IP 레이트리밋(1분 5회)**으로 충분(구글·네이버가 메일 발송 단계에서 하는 것과 동일). `/forgot-password`는 이메일→(활성)보내기→"메일 보냈어요"로 깔끔·확실 동작. CSP 원복, `src/components/Turnstile.jsx` 삭제, 라우트 캡차검증 제거.
- **교훈/재발방지**: ①**외부 위젯(iframe/3rd-party 스크립트)을 핵심 플로우의 차단 게이트로 두지 마라** — 떠야만 진행되는 구조면 안 뜨는 순간 기능이 죽는다(폴백 필수, 또는 안 쓰기). ②**브라우저에서 외부 도메인 스크립트/iframe을 띄우는 기능은 추가 즉시 `next.config.js` CSP(script-src·frame-src·connect-src) 확인.** ③검증은 **로컬에서**(이 건도 로컬 dev에서 빈 박스 재현). 
- **부산물**: Vercel env `NEXT_PUBLIC_TURNSTILE_SITE_KEY`·`TURNSTILE_SECRET_KEY`는 더 이상 안 읽힘(있어도 무해). Cloudflare 위젯도 방치 가능. 나중에 캡차가 정말 필요하면 CSP 허용 + 폴백 처리해서 별도로 제대로 붙일 것.

## #42 — 비밀번호 재설정 링크가 **항상** 무효 — PKCE 토큰을 verifyOtp로 검증 (2026-06-26)

- **무슨 일**: 로그인 '비밀번호 찾기' → 메일은 정상 발송. 링크 클릭 시 `/reset-password`가 매번 "이 링크가 만료되었거나 유효하지 않습니다". 재설정 자체가 불가.
- **근본원인**: 기본 SSR 클라이언트 = PKCE flow → `resetPasswordForEmail`이 만든 메일 링크 token_hash에 `pkce_` 접두가 붙는다. 그런데 `verifyOtp`는 단순히 `{token_hash,type}`를 `/verify`로 POST하고 **세션을 돌려받길** 기대할 뿐, PKCE의 code_verifier 교환을 하지 않는다. `pkce_` 토큰은 verifier 교환(2단계)이 있어야 세션이 나오므로 `/verify`가 세션을 안 줌 → **항상 무효**. (빌드·타입검사는 통과 = #35의 "조용한 실패" 한 패턴.)
- **고침**: 메일 발송 전용 **implicit-flow 클라이언트**(`createOtpEmailClient`, `src/lib/supabase/browser.ts`)로 `resetPasswordForEmail` 호출 → `pkce_` 없는 평범한 token_hash 발급 → `verifyOtp`가 서버에서 바로 검증. 기기·재요청 무관하게 작동. ([PR #392](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/392))
- **유사 스캔**: `verifyOtp` 사용처 2곳 — `/reset-password`(이번 수정으로 해결), `/auth/confirm`(코드상 어디서도 링크 안 됨 = 死경로, 미사용). 가입 인증은 `/auth/callback`의 `exchangeCodeForSession`(PKCE 코드 교환)으로 별도 경로라 무관.
- **재발 방지**: 이메일 링크(recovery·OTP)를 verifyOtp로 검증하려면 **반드시 implicit-flow 클라(`createOtpEmailClient`)로 발송**해야 한다 — PKCE 싱글톤(`createSupabaseBrowserClient`)으로 `resetPasswordForEmail`/`signInWithOtp`를 호출하면 동일 버그 재발. 앞으로 이메일 발송은 이 헬퍼만 사용.

## #35 — (메타·중대) "구현했다는데 안 됨"의 단일 근본 메커니즘 = **조용한 성공으로 위장한 실패** (2026-06-24, 4갈래 병렬 감사로 검증)

> PO 직접 지적: **"전부 다. 그동안 니가 구현했다고 한 게 정상작동 안 하거나 내 의도와 벗어난 게 너무 많았잖아. 당연히 체크해야 할 것도 못 했고."**
> → 처음엔 "작업 방식(게으름·과장보고)" 문제로 진단했으나, **4갈래 병렬 감사(오늘 머지분 실작동·인증 브랜치·꺼진 안전망·반성문 34건 패턴)로 검증한 결과 더 깊고 구조적인 단일 원인**이 드러났다. #30·#33을 이미 썼는데 재발 = **반성문을 쓰고도 안 고친 이중 실패** → 이번엔 기록이 아니라 *구조적 게이트*로 닫는다.

### 🔬 검증으로 교정된 사실 (추측 → 코드·실DB 확인)
- **처음 가설 "어제 만든 화면이 다 빈데이터로 깨진다"는 틀렸다.** #336(에이전시 메신저)·#340/#342(코디 메시지)·#337(코디 진행단계)·#334(doctor 제거)는 **코드+실DB 레벨에서 정상 작동**(전부 `/api/portal/*`·`/api/agency/*`·`/api/admin/*` 서버 경유, client 직접조회 아님). #336 머지가 오히려 잠복하던 `chat_messages_actor_type_check` 제약(환자↔코디 메시지 조용히 거부)을 동시 해소.
- **진짜 "안 됨"은 둘**: ①**인증(가입/비번찾기)** — 코드 90% 완성·PR #341 *열려 있음*(거짓보고 아님)이나, **`mergeable_state:dirty`(문서충돌 3개, 코드충돌 0)** + 결정타 **Supabase 이메일 템플릿 href를 `token_hash` URL로 안 바꾸면 새 인증 페이지에 도달할 경로가 아예 없음** → 코드만 있고 화면은 영영 안 열림. ②**#320 재진 화면** — 끊김은 아니나 `followup_schedules` 0행 + 문의 23건 중 환자계정 연결 3건뿐 → 게스트/에이전시 문의 20건은 *구조적으로* 환자 재진화면에 영원히 안 뜸.
- **안전망은 확실히 꺼져 있다(확정).** PR마다 "로그인 후 화면 클릭"을 실제 검사하는 스펙 = **0개**. 6개(`consultation-create-modal`·`coordinator-request-info`·`patient-mobile-chrome`·`patient-symptoms-input`·`admin-feedback-list`·`admin-kpi-dashboard`)를 만들어놓고 GitHub Secrets 미등록이라 `beforeEach`에서 전부 `test.skip`. `/agency`·`/clinic`은 잠든 스펙조차 없는 완전 사각지대.

### 🎯 단일 근본 메커니즘 — "Silently-Successful Failure(조용히 성공한 척하는 실패)"
반성문 34건(#16 결번)을 유형 분류하니 **약 68%(≈23건)가 한 뿌리**다:

| 유형 | 건수 | 정체 |
|---|---|---|
| (B) 잘못된 컬럼/없는 테이블/항상 null 키 의존 | 8 | #7·#12·#13·#14·#17·#19·#29·#32 |
| (F) 조용한 실패/폴백으로 버그 위장(`?? 0`·`skipped`·`[]`) | 8 | #3·#7·#8·#12·#13·#14·#17·#19·#20 |
| (A) 빌드 통과 ≠ 런타임 동작(사람이 클릭/실행해야 보임) | 11 | #5·#15·#18·#22·#23·#27·#30·#31·#33·#35 |
| (D) i18n/콘텐츠 누락(en→ko 조용한 폴백·특정언어만) | 8 | #1·#2·#3·#4·#24·#28·#30·#31 |
| (C) client가 service_role 직접조회 | **0** | (CLAUDE.md 규칙이 이미 막음 — 실패가 B로 이동) |

**B·F·A·D는 표면만 다른 한 뿌리다:** 잘못된 데이터 가정·조용한 폴백·렌더 타이밍·확률적 AI가 **에러를 안 던지고** `0`/`[]`/`skipped`/영어/그럴듯한 오답으로 **정상 종료**한다. `next build`·`tsc`는 문법만 보므로(없는 컬럼명도 문자열이라 통과) **전부 초록**, 결과가 화면에 닿을 때까지 **시스템 어디에도 "이거 깨졌다"고 외치는 지점이 없다.** → 검증 주체가 늘 마지막 사람 = PO.

**정량 증거:** `fix` 커밋 108 > `feat` 커밋 97 (1.1:1, 최근창 1.58:1) = 한 번에 안 돼 되돌아온 신호. `patient_id가 늘 null`이란 단일 사실이 #7→#12→#13→#14 **네 번 연쇄 재발**(고친 곳만 고치고 같은 가정 쓰는 딴 소비자를 전수점검 안 함). KPI 도메인은 같은 부류로 7~8회 재방문, 설문 3회, `kz`/`kk` 3경계.

### 어떻게 막나 — 행동 게이트(G) + 구조 게이트(S)
**행동 게이트 (내가 매번 지킴):**
- **(G1) 완료 정의 재정의.** 모든 "됐다"는 ①자동검사 통과(어느 spec) ②실클릭(어느 계정·화면) ③"검증 못 함"(이유) 중 하나 *명시*. 맨숭한 완료 금지.
- **(G2) 검증 우선.** 직전 미검증분이 신규개발보다 항상 0순위. 안 닫으면 새 기능 금지.
- **(G3) 같은 부류 전수 스캔 의무.** 데이터 가정 버그(null 키·없는 컬럼)를 고치면 *같은 가정을 쓰는 모든 소비자*를 즉시 grep해 한 번에(#7→#14 4연쇄가 이걸 안 해서 생김).
- **(G4) 보고 전 머지/배포 상태 확인.** 브랜치 커밋 ≠ 반영. git·Vercel로 확인.
- **(G5) 큰 변경 전 의도 재진술 + 버튼 승인.**

**구조 게이트 (기계가 강제 — 사람을 QA에서 빼는 진짜 수리):**
- **(S1) 조용한 0 → 시끄러운 빨강** *[최고 레버리지, B+F 직격]*: 집계·cron·발송 쿼리의 PostgREST 에러·없는 테이블·null 키를 `?? 0`/`skipped`로 삼키지 말고 `errors[]`+대시보드 빨강 배너+Sentry로 표면화(#7 일부 도입 → 일반화). 더해 **데드맨 가드**: "설문 발송률 0%", "KPI 스냅샷 2일 stale"면 알림.
- **(S2) 코드↔실DB 스키마 대조 CI**: `.from("X")`/`.select("col")`이 참조하는 테이블·컬럼이 `information_schema`에 실재하는지 매 PR 검사(없는 컬럼은 tsc가 못 잡음 — #7·#29·#19). `kpi.ts` 류를 생성타입(`database.types.ts`)으로 타이핑.
- **(S3) 로그인 화면 E2E 켜기 + 런타임 다국어/발송물 검사** *[A·D 직격]*: GitHub Secrets 등록으로 잠든 6개 스펙 깨우기 + `/agency`·`/clinic` 신규 스펙 + 배포후 SSR 다국어 스모크(#30, `i18n-no-korean-leak` 확장)·발송물 언어 검사(#31).

### 재발 방지 (다음 작업으로 등록 — 내일 4세션 계획에 반영)
- S3(E2E 켜기)·S1(데드맨)·S2(스키마 대조)를 내일 세션으로 분할(아래 PROJECT_CONTEXT 핸드오프).
- 미검증 항목은 **닫힐 때까지** 매일 핸드오프 0순위로 캐리(우선순위 강등 금지).
- (검토) G1 보고 게이트를 Stop 훅으로 반자동화 — "완료/됐" 단어에 검증 등급 라벨 셀프체크.

---

## #34 — `logo`·`lighthouse` 폴더가 반복적으로 사라짐 (미추적+비ignore = git clean 에 무방비) (2026-06-24)

**무슨 일**
- PO가 메인 폴더(`HEALO_KHIDI`)에서 `logo`(브랜드 자산)·`lighthouse`(측정 리포트) 폴더가 **여러 번 사라진다**고 보고. git 어디에도 없어 **복구 불가**(휴지통만이 희망).

**왜 못 잡았나 (근본원인)**
1. 두 폴더가 **git 미추적 + .gitignore에도 없음** = "추적도 무시도 안 되는" 상태. 이 상태의 폴더는 누군가 `git clean -fd`(미추적 청소)를 한 번만 돌려도 **흔적 없이 삭제**된다. (어느 커밋도 지운 게 아니라 작업트리에서만 증발 → `git log --diff-filter=D` 로도 안 잡힘.)
2. 메인 폴더는 **여러 세션이 공유** → 청소/정리 명령 노출면이 큼. autosave 훅은 `git add -u`(추적분만)라 무관하지만, 수동/세션 청소가 변수.
3. 가치 있는 자산(로고)을 **커밋 안 하고 로컬에만** 둔 게 화근 — 추적됐으면 clean·브랜치전환·뭘 해도 안 사라진다.

**어떻게 고쳤나**
- **`lighthouse/` → `.gitignore` 등록**: 재생성 가능한 리포트. ignore되면 `git clean -fd`(비-x)가 건드리지 않고, 잡파일로 커밋에도 안 섞임.
- **`logo/` → git 추적(커밋)으로 전환 예정**: 재생성 불가 자산이라 ignore가 아니라 **커밋**해야 영구 안전. (PO가 휴지통/재발급으로 파일 복원 후 `public/logo/`에 넣어 커밋.)
- 유사 스캔: 루트의 다른 산출물 폴더(`output`·`test-results`·`playwright-report`·`design-system-export`·`HEALO_full_snapshot`·`dist`)는 **이미 ignore됨(안전)**, `coo`·`archive`는 **추적중(안전)**. 노출돼 있던 건 `logo`·`lighthouse` 둘뿐이었음.

**재발 방지 (시스템 적용)**
- **원칙**: 메인(공유) 폴더의 모든 폴더는 둘 중 하나여야 한다 — **git 추적(가치 자산)** 또는 **.gitignore(재생성 산출물)**. "추적도 ignore도 안 된" 상태 = 사고 예약. 새 산출물 폴더 만들면 즉시 .gitignore에, 가치 자산은 즉시 커밋.
- `.gitignore`에 경고 주석 + 이 반성문 번호(#34) 명시.

**무슨 일**
- 하루에 PO가 직접 클릭해 같은 부류 버그를 연달아 발견: 코디 인박스 클릭 시 404(#31), 코디 '새 상담 생성'이 환자 문의창(/inquiry)으로 이탈, 환자 모바일 레이아웃 이중 크롬(#32), 상담 모달 과복잡·이메일 미연동·이름 과마스킹. 공통점: **빌드/CI는 초록인데 실제 동작이 틀림.**

**왜 못 잡았나 (근본원인)**
1. **"빌드 통과 = 동작"으로 착각.** `next build`는 문법만 본다. 엉뚱한 링크·404·이중 레이아웃은 사람이 눌러야만 보인다 → 그 사람이 계속 PO였음. (CLAUDE.md "빌드≠동작, 직접 클릭 검증" 규칙을 알면서 CI 초록으로 넘어감.)
2. **화면 단위로만 만들고 여정(목록→클릭→상세→행동) 끝까지 안 걸어봄.** 링크 끝이 허공/엉뚱한 곳이어도 컴포넌트만 보면 안 보임.
3. **모바일 미확인.** 이중 크롬은 모바일에서만(`lg/md:hidden`) 드러남 — 타겟(카자흐·러시아 모바일)을 데스크톱 기준으로만 봄.
4. **기존 코드 의심 없이 이식.** 모달 5역할 UX를 "관리자 안 깨지게"만 신경 쓰고 "코디한테 말이 되나"를 안 물음.
5. **검증 부채를 다음 세션으로 계속 미룸** → 누적돼 PO가 떠안음.

**어떻게 고쳤나 (시스템)**
- **자동 클릭 검사(E2E @smoke) 추가**: `patient-mobile-chrome.spec.ts`(모바일 375px, 환자 포털 단일 크롬), `consultation-create-modal.spec.ts`(코디 새 상담→모달 열림·참여 링크 단일·/inquiry 이탈 없음). 매 PR 자동 클릭.
  - ⚠️ **활성화 조건(미완)**: 로그인 필요라 GitHub secrets(`E2E_TEST_USER_EMAIL/PASSWORD`·`E2E_COORDINATOR_EMAIL/PASSWORD` = patient@test.com·coordinator@test.com / test1234)이 **없으면 자동 skip**. 현재 미설정이라 **잠자는 상태** → PO가 GitHub repo Settings→Secrets에 등록해야 실제로 돈다. (admin 테스트계정은 의도적 미생성이라 모달은 코디 경로로 검증.)
- **정적 가드 추가(즉시 활성 — secrets 불필요)**: (a) 목록→없는 상세 링크 404 차단(#31), (b) 직원/포털 화면이 환자용 퍼널(/inquiry·/intake)로 보내면 빌드 실패(이번). `check:content`(CI). **이 둘은 지금 바로 보호 중.**
- **습관 규칙**: "완료"는 컴포넌트가 아니라 여정 끝까지 동작. 레이아웃은 375px부터.

**재발 방지 (시스템 적용)**
- 정적 가드는 즉시 CI 게이트(활성). E2E는 secrets 등록 시 활성. 새 포털/목록/직원 화면 추가 시 같은 자동 검사로 회귀 차단. 검증 못 한 건 "검증 못 함"으로 솔직히 표기하고 다음 세션 1순위로 승격(미루지 말 것).

## #32 — 환자 포털 모바일 레이아웃 깨짐 (공개 크롬 + 환자 크롬 이중 노출) (2026-06-23)

**무슨 일**
- 환자 대시보드(`/patient`)를 모바일(320px)에서 보면 레이아웃이 깨짐 — **하단 네비게이션 2개**(공개 마케팅 하단바 `진료과목/문의/병원` + 환자 레이아웃 자체 탭 `홈/문서/더보기`)가 겹치고, 공개 마케팅 헤더·푸터까지 환자 포털에 같이 노출.

**왜 못 잡았나 (근본원인)**
1. `app/ClientShell.jsx`의 `isPortalPage`(공개 헤더/하단바/푸터를 숨기고 포털 상단바만 쓰는 플래그) 목록에 `/admin`·`/hospital`·`/agency`·`/clinic`만 있고 **`/patient`가 빠짐**. → 환자 페이지가 "공개 페이지"로 취급돼 공개 크롬이 그대로 씌워짐.
2. 환자 레이아웃(`app/patient/layout.jsx`)은 자체 하단탭바를 그림 → 공개 하단바와 **이중**.
3. 데스크톱·desktop 프리뷰 위주로 보면 공개 하단바(모바일 전용 `lg:hidden`)가 안 보여 **모바일에서만** 드러남 → 사람이 모바일로 열어봐야 발견.

**어떻게 고쳤나**
- `isPortalPage`에 `pathname.startsWith("/patient")` 추가 → 공개 헤더·하단바·푸터 제거, 포털 상단바(PortalTopBar)만. 환자 레이아웃의 자체 탭이 유일한 하단 네비가 됨.
- 포털 상단바는 `fixed`라 본문이 가려지므로 `patient/layout.jsx`에 `pt-14 md:pt-16` 추가.
- 단, 환자는 10분 자동 로그아웃(포털 보안 타이머)에서 **제외**(콘텐츠 읽는 중 끊김 방지) — idle 타이머 가드에 `/patient` 예외.

**재발 방지 (시스템 적용)**
- `isPortalPage` 정의부에 누락 위험 경고 주석 추가(자체 레이아웃/하단탭을 가진 새 포털 경로는 반드시 여기 등록). 새 포털 섹션 추가 시 모바일(≤375px)에서 하단바 1개만 뜨는지 확인.

## #31 — 코디 인박스에서 문의 클릭 시 404 (목록이 없는 상세 라우트로 링크) (2026-06-23)

**무슨 일**
- 코디네이터 인박스 목록(`/coordinator/inbox`)에서 문의를 클릭하면 `/coordinator/inbox/17` 같은 상세 주소로 이동하는데, **그 상세 라우트(`app/coordinator/inbox/[id]/page`)가 아예 없어 404**. 목록 조회까진 되는데 "진행"하려고 누르면 에러 → PO가 직접 클릭하다 발견.

**왜 못 잡았나 (근본원인)**
1. 목록 페이지(`page.jsx`)는 `router.push(\`/coordinator/inbox/${item.id}\`)`로 상세로 보내는데, **상세 페이지를 만들지 않은 채 링크만** 배선됨(목록만 구현되고 상세는 누락).
2. `next build`는 **존재하지 않는 동적 링크 대상을 검증하지 않음**(런타임 404라 빌드 통과). → 사람이 클릭해봐야만 보임.
3. 동적 링크(목록→상세)는 흔한 패턴인데 **대상 라우트 존재를 확인하는 자동 가드가 없었음**.

**어떻게 고쳤나**
- **신설 `GET /api/portal/inbox/[id]`**: `requirePortalAuth({ staffOnly:true })` 인증 후 `inquiries` 단건 조회 + 서버 PII 복호화(`decryptInquiryForAdmin`). 에러는 코드형만.
- **신설 `/coordinator/inbox/[id]` 상세 화면(legacy 톤)**: 연락·의료/여정·메시지·인테이크·진행상태 + '상담 일정'·'케이스 배정' 연결.
- 전수 스캔: 다른 목록→상세 동적 링크 8곳(`/consultation`·`/coordinator/cost-estimates`·`/coordinator/visa`·`/patient/cost-estimates`·`/patient/visa/applications`·`/treatments`·`/hospitals`)은 **모두 대상 라우트 존재 확인 ✅** — 끊긴 건 인박스뿐이었음.

**재발 방지 (시스템 적용)**
- `scripts/check-content-consistency.mjs`에 **동적 링크 검사 룰 추가**(CI 매 PR): 코드에서 `router.push(\`/…/${…}\`)`·`href={\`/…/${…}\`}` 같은 내부 동적 네비게이션을 찾아 **대상 `app/…/[*]/page` 라우트가 없으면 빌드 실패**. 쿼리스트링(`?q=${}`)·정적 파일명 보간(`/templates/${}-x.csv`)·`/api`·외부 URL은 오탐 제외.

## #1 — 옛 모델 콘텐츠 잔재가 PO가 찾을 때까지 남음 (2026-06-16)

**무슨 일**
리브랜딩(HEALO→healwith) 후에도 옛 모델이 만든 콘텐츠 오류가 곳곳에 남아, PO가 스크린샷으로 하나씩 발견해 지시해야 했음:
- About/FAQ "지원 언어"가 4개(영·한·일·중)만 — 핵심 타겟 **러시아어·카자흐어 누락**
- 연락 이메일이 옛 도메인(immunelab / healo.com)으로 분산
- specialty `<title>`에 옛 브랜드 `HEALO-KHIDI`
- 번역 API 출처 허용목록이 **우리가 안 쓰는 도메인(healo.com·healo-khidi.com)** 을 허용하고 실도메인은 누락
- 약관 §5 법 조항(§15) 오류 의심

**왜 못 잡았나 (근본원인)**
1. 리브랜딩을 **"문자열 치환"으로만** 처리하고, 사실관계/의미 검토를 안 함.
2. 콘텐츠가 i18n(21개 로케일)·법률·PDF·FAQ·라우트 등 **사방에 분산** → 누락이 숨음.
3. **자동 가드 부재** → 사람(PO)이 화면에서 볼 때까지 남음.
4. 스크린샷마다 **반응형 수정** → 같은 부류(class)가 계속 재발.

**어떻게 고쳤나**
- 이메일 전면 통일(admin@healwith.co.kr), FAQ/About 6개 언어, specialty 제목·legal README 정리, 허용목록·URL 폴백 실도메인화, §15 변호사 플래그.

**재발 방지 (시스템 적용)**
- `scripts/check-content-consistency.mjs` 신설 → **CI 매 PR 자동 실행**:
  - 금지 토큰(immunelab·healo.com·@healo.·HEALO-KHIDI)이 제품 코드에 있으면 **빌드 실패**.
  - i18n 활성 6개 언어(ko·en·ru·kz·zh·ja) **키 패리티** 검사(누락 차단).
- 기존 `check:i18n`(ru/kz 커버리지)도 CI 편입.
- 본 루틴(반성문+유사스캔+가드룰 추가)을 `CLAUDE.md`에 상시 규칙으로 명시.
- **앞으로 새 부류 오류가 나오면** → 고치고 끝내지 말고 **검사기에 룰 1개 추가**해서 영구 차단.

---

## #2 — 개인정보처리방침 KO만 갱신되고 외국어 5개는 옛 버전에 멈춤 (2026-06-17)

**무슨 일**
약관·개인정보방침 검토 중, KO(한국어)는 나중에 확장됐는데 번역 5개(en·ru·kz·zh·ja)가 옛 버전에 멈춰 있었음:
- **자동화된 결정 고지(§37-2)** 섹션이 KO에만 있고 **5개 언어 통째 누락** — 법 의무 고지인데 정작 외국 환자(주 독자)가 못 봄.
- **카자흐 관할 조항**: KO 24줄(상세) vs 번역 6줄(옛 stub). 핵심타깃 러·카 환자의 KZ판조차 stub.
- **국외이전 안전조치**: KO에 EU 적정성·SCC·카자흐 참조 상세, 번역은 축약(20 vs 17줄).
- 이메일 불일치: 대부분 admin@healwith.co.kr인데 자동화결정 섹션만 privacy@(1곳).
- user_rights에서 KO 교차참조 오류(§15 책임자 → 실제 §14).
- (약관은 깨끗했음 — 6개 언어 정합.)

**왜 못 잡았나 (근본원인)**
1. 번역을 "그 시점 KO 스냅샷"으로 한 번 떠놓고, **이후 KO가 커져도 번역 동기화를 강제하는 장치가 없었음**.
2. 법률 문서가 1,780줄 단일 파일에 6개 언어 × 20여 섹션 → **눈으로는 섹션 누락이 안 보임**.
3. `check:content`(브랜드·i18n 키)는 **법률 문서의 섹션/줄수 패리티는 검사 안 함** → 사각지대.

**어떻게 고쳤나**
- KO를 단일 기준(SoR)으로 5개 언어의 4개 섹션 동기화(자동화결정 신규 삽입 + 카자흐/국외이전 확장 + user_rights 정합), 이메일 admin@ 통일, §14 교차참조 수정.
- ⚠️ 번역은 **기계 수준** — 파일 헤더의 "변호사 최종검토 필요" 캐비엇 유지(특히 RU·KZ).

**재발 방지 (시스템 적용)**
- `scripts/check-legal-parity.mjs` 신설 → **CI 매 PR 자동 실행**(`npm run check:legal`, ci.yml 편입):
  - 6개 언어 **섹션 id 집합·순서 일치** 검사.
  - 섹션별 **body 줄수 패리티**(번역 누락·잘림 차단).
  - 금지 토큰(옛 브랜드·TODO·stub) + 핵심사실(등록번호·이메일) 누락 검사.
- 이후 KO에 섹션/줄 추가 시 번역 5개를 안 맞추면 **빌드 실패** → PO가 화면에서 찾을 일 없음.

---

## #3 — 영어 화면에 한국어가 새는 부류, 전수조사로도 반복 누락 (2026-06-17)

**무슨 일**
PO가 /treatments에서 "제목은 영어인데 칩은 한국어" 섞임을 또 스크린샷으로 발견. 파보니 빙산의 일각 — **렌더된 영어 화면에 한국어가 새는 부류**가 8개 라우트에 ~150건:
- 6개 암종 상세페이지: 합병증(name/desc)·통계·FAQ·칩·수술후관리 제목이 한국어로만 박힘(데이터/클라이언트 양쪽).
- /telemedicine 데모 자막, /privacy·/terms·/medical-disclaimer 하단 고지(legacy 변형), /terms 목차 헤더.

**왜 못 잡았나 (근본원인)**
1. **자동검사가 i18n "키"와 브랜드 토큰만 봄** — i18n 시스템을 안 거치고 데이터/JSX에 박힌 한국어 raw 문자열은 전부 사각지대. 키가 없으니 키누락으로도 안 잡힘.
2. **"전수조사"가 실제 렌더 출력 레벨에서 이뤄진 적 없음** — 사람(PO) 눈이 유일한 검증이었음.
3. `[slug]` 동적 라우트(암종 6개)는 한 번 안 열어보면 누락이 안 보임.
4. 폴백 체인 lang→en→ko라, en 번역이 없으면 **조용히 한국어로 폴백** → 빌드·기존 검사 다 통과하는데 화면엔 한국어.

**어떻게 고쳤나**
- 칩·합병증·통계·FAQ·수술후관리를 전부 `{ko,en,ru,kz,zh,ja}` 6개 언어 객체로(렌더 `l()` 통과). FAQ는 클라이언트→데이터 파일로 이동(검사 가능하게). 페이지 4곳 고지/자막 6개 언어화(legacy 변형 포함).
- 약 330개 셀 번역(에이전트). **기계 수준 — 의료/법률 최종검토는 별개.**

**재발 방지 (시스템 — 이 부류를 통째로 차단)**
- **`e2e/i18n-no-korean-leak.spec.ts`** (`@smoke`): 공개 25개 라우트를 영어로 렌더해 화면(body)에 한글(가-힣) 남으면 실패. **출처가 데이터든 JSX든 i18n키든 불문하고** 잡음 → 키 검사의 사각지대를 메움. **PR마다 자동 실행.** (적법한 용어 병기는 ALLOW 등록.)
- **`scripts/check-cancer-i18n.mjs`** (`npm run check:cancer-i18n`, CI 편입): 암종 콘텐츠 6개 언어 완성 강제(en 폴백이 가리는 "미완성"까지 잡음 — 누출검사가 못 보는 빈칸).
- 두 검사가 짝: 누출검사=화면에 한글 없나, 완성검사=번역이 실제 다 찼나.

---

## #4 — 홈 화면에 옛 도메인 이메일 `contact@healo.kr` 잔존 (2026-06-18)

**무슨 일**
홈 "긴급 연락" 버튼이 `contact@healo.kr`(옛 도메인)을 표시·링크. 사이트 나머지(법률·개인정보·FAQ·로그인·siteSettings)는 전부 `admin@healwith.co.kr`로 통일됐는데 홈만 누락. 사용자가 보고 누르는 버튼.

**왜 못 잡았나 (근본원인)**
- `check:content`의 금지토큰에 `@healo.com`·`healo.com`만 있고 **`@healo.kr`이 없었음.** `.com`만 막고 `.kr` 변형은 안 막은 구멍 → 검사 통과.
- 리브랜드 일괄치환(HEALO→healwith)이 "이메일 도메인" 변형(`healo.kr`)까지는 안 훑음.

**어떻게 고쳤나**
- `app/home/HomeClient.jsx` 2곳 `contact@healo.kr` → `admin@healwith.co.kr`(siteSettings.contactEmail과 일치).

**재발 방지 (가드 룰)**
- `scripts/check-content-consistency.mjs` FORBIDDEN에 `{ re: /@healo\.kr/i }` 추가 → 옛 도메인 이메일 영구 차단. **현 사이트 도메인 `khidi.healo.kr`(@ 없음)·api 호스트 allowlist(`.healo.kr`)는 안 걸리게 `@healo.kr`만 정밀 매칭**(회귀 1줄 검증 완료).

---

## #5 — AI 챗 답변이 문장 중간에 잘리고 가격부터 들이미는 "이론식" 응답으로 망가짐 (2026-06-19)

**무슨 일**
PO가 스크린샷 제보: 친구 유방암 상담을 자연스럽게 물었는데 AI가 ① "1,800만 원) 선이며…(출처: healwith" 처럼 **앞뒤가 잘린 문장 조각**을 내놓고 ② 인사·공감 없이 **가격 숫자부터** 들이미는 textbook 응답. ("뭐가 1800만원 선인데 짧게 얘기하랫더고 이론식으로 대답하면 어떻햐")

**왜 못 잡았나 (근본원인)**
1. **모델 thinking 토큰이 `maxOutputTokens`에 포함되는 걸 몰랐다.** 같은 날 가독성 개선 커밋(`6470e5d`)에서 `maxOutputTokens` 2048→768로 낮췄는데, `gemini-flash-latest`(2.5 Flash)는 기본 thinking(추론)이 켜져 있고 그 토큰이 출력 상한에 같이 잡힌다 → 추론이 예산을 거의 다 먹고 **실제 답변이 문장 중간에 잘림**. 빌드·테스트는 통과(런타임 모델 동작은 검사 안 함).
2. **프롬프트가 "가격 한 줄로 답하라"를 무조건 적용.** 같은 날 견적자료 주입 커밋(`f1d8d87`)의 INTAKE&ESTIMATE 규칙이 "○○암 얼마"가 아닌 **일반/감정 질문에도** 가격을 토해내게 만듦. 짧게(70단어) 규칙과 겹쳐 **공감 한 줄 없는 숫자 나열**이 됨.
3. AI 응답 품질은 **자동검사 사각지대** — 사람(PO)이 화면에서 볼 때까지 안 잡힘.

**어떻게 고쳤나**
- `src/lib/chat/generateReply.ts`(비스트리밍 공개 챗) + `app/api/chat/route.ts`(스트리밍): `providerOptions.google.thinkingConfig.thinkingBudget = 0`으로 **추론 끔** → 출력 예산 전부 답변에 할당(컨시어지 짧은 답변엔 추론 불필요·지연·비용도 감소). 공개 챗 상한 768→1024.
- 프롬프트: "실제 질문에 따뜻하게 답하라 / **가격은 명시적으로 물을 때만**, 그것도 문장에 녹여서 / 일반·감정 질문엔 숫자 금지하고 어떻게 돕는지+무엇이 궁금한지 되묻기"로 교정. INTAKE&ESTIMATE 가격 규칙을 "EXPLICIT 가격 질문일 때만"으로 한정.

**재발 방지 (시스템 적용)**
- **유사 스캔**: 같은 thinking-토큰 함정이 있는 LLM 호출 전수 확인 → 스트리밍 `/api/chat`도 동일 패치. (그 외 `translate`·`stt`·배치 요약 등은 상한이 충분히 크거나 thinking 불필요한 입출력이라 영향 적음.)
- **가드 룰**: `scripts/check-content-consistency.mjs`에 "`gemini-flash`/2.5 계열 호출에서 `maxOutputTokens`가 작으면(<1024) `thinkingConfig.thinkingBudget:0`이 같은 호출에 없으면 경고/실패" 룰 추가 검토(다음 가드 작업으로). 우선은 본 반성문으로 함정 기록.

---

## #6 — 마이그레이션 다수가 재실행 시 하드 실패(멱등성 가드 누락) (2026-06-19)

**무슨 일**
서버 클라 통합(#89) 중 `kpi.ts`를 타입 박힌 정본으로 위임하자 숨은 버그가 드러난 것처럼, DB 마이그레이션 80개를 전수 점검하니 **19개 파일**이 재실행(re-apply) 시 `duplicate_object(42710)` 로 하드 실패하는 상태였음: `CREATE POLICY` 39건·`CREATE TRIGGER` 4건이 앞에 `DROP ... IF EXISTS` 가드가 없고, 일부 `CREATE INDEX` 10건이 `IF NOT EXISTS` 누락, `ADD CONSTRAINT` 2건이 가드 없음. 새 Supabase 브랜치·로컬 개발·재해복구처럼 마이그레이션을 처음부터 다시 적용하는 상황에서 중간에 깨짐.

**왜 못 잡았나 (근본원인)**
1. 마이그레이션을 **수동 추적**(supabase 마이그레이션 히스토리/체크섬 아님)으로 운영 → "한 번 적용되면 끝"이라 재실행 안전성을 아무도 안 봄.
2. 일부 파일은 처음부터 멱등 패턴(`DROP POLICY IF EXISTS` 후 `CREATE`)을 잘 지켰지만(예: `20260225_chat_threads.sql`), **표준이 강제되지 않아** 파일마다 들쭉날쭉.
3. **자동 가드 부재** → 새 마이그레이션이 비멱등이어도 CI가 안 막음.

**어떻게 고쳤나**
- 19개 파일에 가드 추가: 각 `CREATE POLICY/TRIGGER` 앞에 같은 이름·테이블의 `DROP ... IF EXISTS`, bare `CREATE INDEX`에 `IF NOT EXISTS`, `ADD CONSTRAINT` 앞에 `DROP CONSTRAINT IF EXISTS`. **스키마 결과는 불변**(이미 적용된 DB엔 영향 없음) — 재실행 안전성만 추가. 실제 DB 재적용은 하지 않음(파일만).

**재발 방지 (시스템 적용)**
- **가드 룰 신설**: `scripts/check-migration-idempotency.mjs` → CI 매 PR 자동(`npm run check:migrations`). `migrations/*.sql`에서 ①가드 없는 `CREATE POLICY/TRIGGER` ②`IF NOT EXISTS` 없는 `CREATE INDEX/TABLE` ③가드 없는 `ADD CONSTRAINT`(DO/pg_constraint 블록은 허용)를 **빌드 실패**로 차단. 오탐 0 룰만 채택, 음성 테스트로 회귀 탐지 확인.
- 앞으로 **새 마이그레이션은 멱등이 기본** — 비멱등이면 CI가 머지 차단.

---

## #7 — KHIDI 핵심 KPI(유치·사전상담)가 존재하지 않는 컬럼을 쿼리해 항상 0 (2026-06-19)

**무슨 일**
8/27 중간평가의 핵심 정량지표를 자동집계하는 `src/lib/khidi/kpi.ts`가 **존재하지 않는 컬럼 3개**를 쿼리하고 있었음 → PostgREST 42703 오류 → 카운트 null → **유치·사전상담이 항상 0**으로 표시.
- K-01 유치: `consultation_sessions.visit_confirmed_at` (해당 컬럼 없음). 실제 유치확정 신호는 `inquiries.outcome='admitted'`(전환 깔때기 RPC가 쓰는 정의)인데 엉뚱한 테이블·컬럼을 봄. → 실제 4건인데 **0** 표시.
- K-02 사전상담: `consultation_sessions.actual_duration_minutes` (실제 컬럼은 `duration_seconds`). 게다가 `duration_seconds`는 전 세션 NULL(미추적)이라 `>=5분` 필터를 살려도 0. → 실제 9건인데 **0** 표시.
- 더해 대시보드·API·만족도가 옛 목표(유치 10 / 상담 80 / 만족도 80)를 박아둬, 공식 목표(12 / 120 / 90)와 불일치.

**왜 못 잡았나 (근본원인)**
1. `kpi.ts`의 supabase 클라가 **제네릭 없는 느슨한 타입**(`as unknown as SupabaseClient`)이라, 잘못된 컬럼명을 tsc가 못 잡음(런타임 오류로만 드러남).
2. 쿼리 오류 시 **조용히 `?? 0`으로 폴백** → "데이터 없음"처럼 보여 버그가 위장됨(PO가 "아직 0건"으로 오해).
3. 실DB 스키마 대조 없이 컬럼명을 가정해 작성. 단위테스트는 DB를 안 침.
4. PR #98이 "헤드라인 유치건수는 무사"라고 적었으나 실제로는 그때도 깨져 있었음(컬럼 미존재 미확인).

**어떻게 고쳤나**
- K-01: `inquiries.outcome='admitted'`(created_at 기준)로 재작성 — 전환 깔때기 RPC와 **정의 통일**(두 대시보드 수치 일치). 실DB 검증 = 4건.
- K-02: duration 필터 제거(컬럼 오류 + 미추적). 완료 세션 수로 집계 = 9건.
- 공식 목표 SoR `src/lib/khidi/targets.ts`(유치 12 / 상담+사후 120 / 만족도 90) 신설 → API·대시보드·만족도가 전부 참조. 대시보드에 **사업 누적 달성률**(8/27 평가표의 "현재(B)") 섹션 추가.

**재발 방지 (시스템 적용)**
- **조용한 0 제거(가시화 가드)**: `KpiResult.errors[]`에 집계 쿼리 오류를 모아 **대시보드 상단 빨간 경고 배너**로 노출 → 앞으로 컬럼 오류가 나면 0이 아니라 "집계 오류"로 보임(PO가 화면에서 바로 인지).
- 실DB 스키마 대조를 KPI 수정 시 필수로(본 세션은 Supabase MCP로 `information_schema.columns` 확인 후 작성).
- (백로그) `kpi.ts` 쿼리를 생성 타입(`database.types.ts`)으로 타이핑하면 tsc가 컬럼 오류를 잡음 — 느슨한 캐스팅 제거 과제와 연계.

---

## #8 — KPI 일별 스냅샷 cron 이 가끔 하루를 걸러 빈 칸이 영구 남음 (2026-06-20)

**무슨 일**
매일 도는 KPI 스냅샷 cron(`/api/cron/kpi-snapshot`, 매일 15:05 UTC) 결과를 담는 `kpi_snapshots` 테이블을 조회하니 **06-16·06-19 두 날짜가 통째로 빠져 있었음**(06-03~06-18 중 2일 누락, 최신은 06-18). cron 이 그날 안 돌거나 실패해 스냅샷이 안 만들어졌고, 다음 실행은 "어제"만 만들어 빈 칸을 **영구히 안 메움**.
- 다행히 #107(KPI 집계오류 canary)의 "숙주"가 바로 이 cron 이라, cron 이 그날 거르면 그날 canary 도 안 돈다 → **평가 자동집계 안정성에 직결**.
- 누락일 실제 일별 값은 0/0이라 데이터 손실은 없었음(빈 차트 칸 + canary 미실행이 문제).

**왜 못 잡았나 (근본원인)**
1. Vercel cron 은 **최선노력(best-effort)** 이라 가끔 한 실행을 거를 수 있는데, cron 을 "정확히 매일 1회"로 가정함.
2. cron 이 **"어제 하루치"만** 계산 → 한 번 거르면 그 날짜는 누구도 다시 안 채움(자가복구 부재).
3. Vercel 런타임 로그 보존이 짧아(~1시간) 과거 실행 성공/실패를 사후 확인 불가 → 누락이 **테이블을 직접 조회하기 전엔 안 보임**.

**어떻게 고쳤나**
- cron 을 **자가복구 백필**로 변경: 매 실행마다 최근 N일(기본 7일)을 idempotent upsert(`upsertRecentSnapshots`). 하루 걸러도 다음 실행이 자동으로 빈 칸을 메우고, 그 날짜들의 집계 쿼리를 다시 돌려 **canary 커버리지도 7일치로 넓힘**. (06-16·06-19 누락도 다음 cron 1회로 자동 복구.)
- canary 중복 알림 방지: 같은 컬럼 오류가 N일 반복돼도 critical 알림은 **윈도우당 1통**(중복 압축).
- 날짜 윈도우 계산을 순수 함수 `recentSnapshotDates`(server-only 없는 별도 모듈)로 분리 → 단위테스트 7개(월·연 경계 포함).

**재발 방지 (시스템 적용)**
- 단일일 cron → **N일 백필**이 곧 가드: 일시적 cron 누락이 자동 치유돼 사람이 테이블을 들여다볼 필요가 없어짐.
- `recentSnapshotDates` 단위테스트로 날짜 경계 회귀 차단.
- (관찰) cron 정기실행 자체가 죽는 경우는 별개 — `kpi_snapshots` 최신 행이 2일 이상 오래되면 알리는 가드는 추후 백로그(현재는 인프라 생존을 `dispatch-reminders` 30분 주기로 간접 확인).

---

## #9 — 의료데이터 API 권한우회(IDOR)·PII 엔드포인트 무제한 — 제3자 감리에서 발견 (2026-06-20)

**무슨 일**
ISO/IEC 25010(TTA GS) 기준 제3자 보안 감리 중, 환자 의료데이터를 다루는 API 몇 곳이 "로그인만 했으면 통과"(userId 존재만 확인)로 되어 있어 수평적 권한우회가 가능했음:
- `app/api/symptoms/alerts`: 헤더엔 "코디네이터 전용"이라 적혀 있으나 실제론 `auth.userId` 만 확인 → **로그인한 환자 누구나 다른 모든 환자의 증상알림을 조회·해제** 가능.
- `app/api/khidi/followup` POST: 인서트 실패 시 `saveError: error.message` 로 **DB 내부 오류 메시지를 클라이언트에 노출**(코드형 원칙 위반).
- `app/api/public/chat/resume`: 복호화된 게스트 PII(이름·이메일·전화)를 반환하는데 **속도제한 없음** → token 추측형 PII 오라클.
- (부수) `app/api/cron/consultation-reminders`: `(SITE_URL || VERCEL_URL) ? https://${VERCEL_URL} : fallback` 연산자 우선순위 버그로 특정 env 조합에서 리마인더 링크가 `https://undefined/...`.

**왜 못 잡았나 (근본원인)**
1. 인증 헬퍼가 `userId`(로그인 여부)와 `isAdmin/appRole`(권한)을 **둘 다 주는데, 권한이 필요한 곳에서 `userId` 만 확인**하는 패턴이 복붙으로 번짐.
2. 신규 API 추가 시 "민감 테이블을 만지면 역할(role) 게이트 필수"를 **자동 검사하는 가드가 없음** → 사람이 리뷰할 때만 걸림.
3. `error.message` 비노출 규칙이 대부분 지켜졌으나 한 곳(저장 실패 경로)에서 빠짐.

**어떻게 고쳤나 (묶음 A)**
- `symptoms/alerts`: `isStaff(auth)` 게이트(admin·coordinator·doctor) 추가 — 코디 정상 접근은 유지, 환자 차단.
- `khidi/followup`: 응답에서 `saveError` 제거(내부 상세는 console.error 로만).
- `public/chat/resume`: `thread-summary` 와 동일한 IP 속도제한(`checkRateLimit`) 추가.
- `consultation-reminders`: `??`/괄호로 우선순위 교정.

**재발 방지 (시스템 적용)**
- (백로그·권장) `scripts/check-content-consistency.mjs` 류에 **API 라우트 정적 검사 룰 추가**: `app/api/**` 가 민감 테이블(`inquiries`·`symptom_*`·`chat_threads`·`consultation_sessions`)을 만지면서 `isAdmin`/`appRole`/`requireConsultationAccess`/`checkRateLimit` 중 어느 것도 호출하지 않으면 경고. 이 부류(인증≠인가 혼동)를 사람 리뷰 없이 차단.
- **보류(묶음 C)**: `khidi/followup` POST 의 inquiry 소유권 검증은 inquiry↔환자 연결이 코드상 모호해 잘못 막으면 정상 환자 제출이 깨짐 → PO 동석/라이브 검증 필요. (cron 비밀키 클라이언트 노출 HIGH 는 #10 에서 해결.)

---

## #10 — cron 비밀키가 클라이언트 번들에 노출(HIGH) + 죽은 학습코드 "미완성 기능" 오인 (2026-06-20)

**무슨 일**
- **HIGH 보안**: 어드민 화면(`app/admin/khidi/ai-regression/page.jsx`)이 회귀테스트 cron 을 `Bearer ${NEXT_PUBLIC_CRON_SECRET}` 로 직접 호출 → **공개 접두사 때문에 cron 비밀키가 클라이언트 번들에 그대로 박혀** 소스만 보면 8개 cron 트리거 키 획득 가능.
- **죽은 코드**: `src/lib/learning/feedbackLoop.ts`(인메모리 학습 스토어)가 **어디서도 호출되지 않는 dead code** — 감리에서 "데이터 유실 미완성 기능"으로 오인될 소지(실제론 아무것도 안 먹여 유실도 없음). 진짜 피드백은 `chat_feedback`(👍/👎) DB 저장으로 정상.

**왜 못 잡았나 (근본원인)**
1. 클라이언트에서 보호된 엔드포인트 호출 시 비밀키가 필요해지자 **공개 접두사로 노출하는 안티패턴**(서버 프록시로 감쌌어야 함).
2. 공개 접두사 + SECRET 류를 막는 **자동 검사 부재**.
3. 미완성 PoC 코드를 안 지우고 방치.

**어떻게 고쳤나**
- 회귀 로직을 `src/lib/chat/regressionRunner.ts`(server-only `runRegressionBatch`)로 추출 → cron(CRON_SECRET)·신규 관리자 라우트 `app/api/admin/khidi/run-regression`(requireAdminAuth) 공용. 화면은 비밀키 없이 관리자 라우트만 호출. 공개 비밀키 사용 0.
- `feedbackLoop.ts` 삭제.

**재발 방지 (시스템 적용)**
- `scripts/check-content-consistency.mjs` 에 **`NEXT_PUBLIC_[A-Z0-9_]*SECRET` 금지 룰 추가** → 비밀키를 공개 접두사로 두면 **CI 빌드 실패**(영구 차단).
- (관찰) PO 가 어드민 "지금 실행" 버튼 1회 클릭검증 필요(인증 경로 cron→관리자 세션으로 변경).

---

## #11 — 홈에 "지어낸 환자 후기"가 라이브로 게시돼 있었음 (2026-06-20)

**무슨 일**
- 홈(`app/home/HomeClient.jsx`)의 `TESTIMONIALS_DATA` 에 **실제로는 존재하지 않는 환자 후기 3건**(A.K./카자흐스탄/위암, M.S./러시아/유방암, T.Y./일본/간암)이 별점 5개와 함께 **프로덕션에 노출**되고 있었음.
- 의료 컨시어지 사이트에 **가공된 환자 후기 게시 = 정직성 위반** + 한국 **의료광고법**(의료기관 환자 후기·치료경험담 게재 규제) 리스크.

**왜 못 잡았나 (근본원인)**
1. 초기 템플릿이 "📸 교체 대상: 실제 환자 리뷰로 교체"라는 주석과 함께 **플레이스홀더 후기**를 넣어뒀는데, 교체되지 않은 채 방치됨.
2. 가짜/플레이스홀더 후기를 **자동 검사로 막는 가드가 없었음** → 사람이 눈으로 발견할 때까지 남음.

**어떻게 고쳤나**
- 가짜 후기 3건 삭제. 대신 **출처가 확인되는 실데이터만** 보여주는 `src/components/SocialProofSection.jsx` 신설(모두닥 평점·공식 누적 치료사례·유치의료기관 등록 + 실제 후기 외부 플랫폼 링크, 6개 언어).
- 전수 스캔: Premium 홈(`HomeClientPremium`)·`/stories`(비활성·동의기반 모델) 에는 동일 부류 없음 확인.

**재발 방지 (시스템 적용)**
- `scripts/check-content-consistency.mjs` 에 **조작된 환자 후기 시그니처 가드 추가**: `이니셜 / 국가 / 암종`(예 `A.K. / Kazakhstan / Stomach Cancer`, `A.K. / 카자흐스탄 / 위암`) 형식이 제품 코드에 있으면 CI 빌드 실패. 실제 후기는 동의받은 것만, 출처표시 또는 외부 플랫폼 링크로.

---

## #12 — 만족도 설문 발송 cron 이 "항상 null 인 컬럼"에만 의존해 설문 영구 0건 (KPI K-03 측정 불능) (2026-06-21)

**무슨 일**
- 8/27 중간평가 공식 성과지표 3개 중 하나인 **환자 만족도(K-03, 목표 90점)** 가 **측정 자체가 안 되고 있었음**: 설문 발송 0건 / 응답 0건(실DB 확인 `surveys`·`survey_responses` 모두 0행).
- 원인: `app/api/cron/dispatch-surveys/route.ts` 가 환자 이메일을 `consultation_sessions.patient_id → patients` 로만 찾는데, **`consultation_sessions.patient_id` 가 전 행 null**(미사용 컬럼). → 모든 완료 세션이 `toEmail` 못 찾아 `skipped` → 설문이 단 한 건도 안 나감.
- 실제 환자 연결고리는 `inquiry_id → inquiries`(email/preferred_language/이름). 이는 **#7과 정확히 같은 부류**(kpi.ts 도 같은 이유로 patient_id→inquiry_id 전환했었는데, 설문 cron 만 옛 경로에 남아 있었음).

**왜 못 잡았나 (근본원인)**
1. `patient_id` 가 항상 null 이라는 사실이 #7 에서 KPI 쪽만 고쳐졌고, **같은 가정을 쓰는 다른 소비자(설문·침묵환자 cron)는 전수 점검이 안 됨**.
2. cron 이 "대상 없음(skipped)"으로 **조용히 정상 종료** → 0건이 "아직 상담이 적어서"처럼 위장됨(만족도 미측정이 버그로 안 보임).
3. 설문 발송은 라이브 cron + 실제 이메일이라 **자동 테스트로 안 닫혀 있었음**(수신자 결정 로직이 cron 안에 인라인).

**어떻게 고쳤나**
- 수신자 결정을 순수 함수 `src/lib/surveys/resolveRecipient.ts`(`resolveSurveyRecipient`)로 추출: 이메일 `patients.email → inquiries.email` 폴백, 언어 `session.patient_language → inquiry.preferred_language → spoken_language → ko`(카자흐 `kz→kk` 매핑), 이름 `inquiries.first_name+last_name`. → cron 이 이 함수를 사용.
- 단위테스트 `resolveRecipient.test.ts` 12개로 **고정**(patient_id null→inquiry 폴백·우선순위·잘못된 이메일 skip·언어매핑).
- ⚠️ **운영 주의**: 머지·배포되면 앞으로 완료된 상담 24~30시간 뒤 **이메일이 있는** 환자에게 실제 설문 메일이 나간다(현재 inquiries 11건 중 이메일 보유 3건). 기존 완료 세션은 발송 윈도(24~30h)를 지나 **소급 발송 안 됨**(블라스트 반경 작음).

**유사 이슈 (같은 부류 — 별도 추적)**
- `app/api/cron/detect-silent-patients/route.ts` 도 `consultation_sessions` 를 `.not("patient_id","is",null)` 로 거름 → 전 행 null 이라 **항상 0건 감지**(침묵 환자 알림이 한 번도 안 뜸). `symptom_reports` 도 patient_id 로 묶여 있어 폴백이 단순치 않음 → 더 큰 리팩터라 이번 PR 범위에서 분리, `docs/KNOWN_ISSUES.md` 에 기록.

**재발 방지 (시스템 적용)**
- `consultation_sessions.patient_id` 에 의존하는 코드는 **inquiry_id 폴백을 기본값으로** 간주(이 컬럼은 현재 미사용 = null). 새 cron/집계 작성 시 점검.
- 수신자 결정 같은 "조용히 skip 되는" 분기는 **순수 함수로 빼서 단위테스트로 잠금**(라이브 cron 자체는 못 돌려도 로직은 CI 로 닫힘).

---

## #13 — 설문 cron 이 암호화된 이메일을 복호화 없이 읽어 #12 수정 후에도 설문 영구 0건 (2026-06-21)

**무슨 일**
- #12 에서 설문 cron 을 `inquiry_id → inquiries.email` 폴백으로 고쳤는데도, **배포 후 실DB 확인 결과 여전히 설문 0건 / 응답 0건**.
- 진짜 원인: `inquiries.email`(과 `first_name`/`last_name`)은 가입 시 **AES-256-GCM 으로 암호화**돼 저장된다(`app/api/inquiries/create` 가 `encryptString(body.email)`). DB 의 `email` 컬럼 실제 값은 `{"v":"v1","iv":...,"tag":...,"data":...}` 형태 암호문(샘플 3행 길이 105자, `@` 없음).
- 설문 cron 은 이 **암호문을 그대로** `resolveSurveyRecipient` 에 넘겼고, `cleanEmail` 은 `@` 가 없으면 버린다 → 항상 null → **여전히 영구 0건**. (#12 는 "어떤 행을 보느냐"를 고쳤고, 이건 "그 값을 복호화하느냐"를 빠뜨린 것.)

**왜 못 잡았나 (근본원인)**
1. #12 단위테스트가 **평문 이메일**(`patient@example.com`)만 가정 → CI 초록인데 실데이터(암호문)에서는 깨짐. 테스트 픽스처가 실제 저장 형태(암호문)를 반영 안 함.
2. PII 암호화 컬럼(`email`/`first_name`/`last_name`)을 **읽는 쪽이 복호화 책임을 빠뜨림** — 관리자 화면 경로는 `decryptInquiryForAdmin` 으로 복호화하지만, 새로 추가된 cron 경로는 그 규약을 안 따랐다.
3. cron 이 또 "대상 없음(skipped)"으로 **조용히 정상 종료** → 0건이 버그로 안 보임(#12 와 동일한 위장).

**어떻게 고쳤나**
- cron 에서 `inquiries` 조회 직후 `decryptMaybe(email/first_name/last_name)` 로 복호화한 뒤 `resolveSurveyRecipient` 에 전달. `decryptMaybe` 는 암호문이면 복호화, 평문이면 그대로 통과 → **옛 평문 행도 안전**(마이그레이션 호환).
- 계약 고정 테스트 추가: `resolveRecipient.test.ts` 에 **"암호문 blob(`@` 없음) → null"** 케이스 → "반드시 cron 에서 복호화해야 한다"는 규약을 CI 로 잠금.

**재발 방지 (시스템 적용)**
- **규칙: 암호화 컬럼(`*_encrypted`, 그리고 `inquiries.email`/`first_name`/`last_name`/`contact_id`/`message` 처럼 암호문이 들어가는 텍스트 컬럼)을 읽어 사용·발송하는 모든 새 경로(cron·API·집계)는 `decryptMaybe`/`decrypt*ForAdmin` 으로 복호화 후 사용.** 화면 표시뿐 아니라 "메일 보낼 주소"로 쓸 때도 동일.
- 순수 로직 테스트의 픽스처는 **실제 저장 형태(암호문)** 케이스를 최소 1개 포함해 "읽는 쪽 복호화 누락"을 잡는다.

---

## #14 — 침묵환자 감지 cron 도 같은 `patient_id` null 의존 + uuid/bigint 타입 혼선으로 항상 0건 (2026-06-21)

**무슨 일**
- 사후관리 기능 중 "증상 입력이 3일 이상 끊긴 환자를 코디에게 자동 알림"(silence_long)이 **한 번도 안 떴음**(symptom_alerts 0행).
- 원인 ①: cron 이 `consultation_sessions` 를 `.not("patient_id","is",null)` 로 걸렀는데 `patient_id` 가 전 행 null → 대상 0건(#12·#13 와 같은 부류).
- 원인 ②(더 깊음): `consultation_sessions.patient_id` 는 사실 **bigint(→cancer_patient_intakes)** 인데 `symptom_alerts.patient_id` 는 **uuid(→auth.users)** 다. 두 컬럼을 같은 "환자키"로 본 설계 자체가 어긋나, `alertService.getCoordinatorIds` 가 uuid 로 bigint 컬럼을 조회하는 등 알림 흐름도 깨져 있었음. 실제 환자 연결고리는 메신저 문의(계정 없음)의 `inquiry_id`.

**왜 못 잡았나 (근본원인)**
1. 증상 모니터링 서브시스템 전체가 "로그인 환자(uuid)" 전제로 설계됐는데, 실제 퍼널은 메신저 문의(bigint, 계정 없음)라 전제가 틀림.
2. cron 이 또 "대상 없음"으로 조용히 0건 종료(#12·#13 와 동일한 위장).
3. 라이브 cron + 서버전용 모듈이라 자동 테스트로 안 닫혀 있었음.

**어떻게 고쳤나**
- 마이그레이션: `symptom_alerts` 에 `inquiry_id bigint` 추가 + `patient_id` nullable + `CHECK(patient_id IS NOT NULL OR inquiry_id IS NOT NULL)` + inquiry 활성 인덱스. (0행 테이블이라 안전, 멱등 작성.)
- 순수 로직을 서버전용 아닌 `src/lib/symptoms/silence.ts`(`buildSilenceAlert`·`uniqueInquiryIds`)로 분리 → 단위테스트 9개. cron 은 inquiry_id 기준으로 재작성(활성 문의 → 최근 증상보고 → 3일↑ 무입력 → inquiry 기준 알림, 중복방지).
- `alertService`: insert 에 inquiry_id 포함, `getCoordinatorIds` 를 inquiry_id/patient_user_id 기준으로, 메신저 문의 환자(계정 없음)는 안심 in-app 알림 skip. 코디 화면은 patient_id 없으면 `문의 #N` 표시.
- cron 계약 테스트(`route.contract.test.ts`)로 "inquiry_id 기준 조회·알림" 잠금.

**재발 방지 (시스템 적용)**
- `consultation_sessions.patient_id`(bigint·전 행 null)를 "로그인 환자키(uuid)"로 쓰지 말 것 — 실제 키는 `inquiry_id`(문의) 또는 `patient_user_id`(auth uuid). (#12·#13·#14 동일 뿌리.)
- "조용히 0건" cron 의 순수 분기는 비서버전용 모듈로 빼서 단위·계약 테스트로 닫는다(#12·#13 와 동일 처방).

## #15 — AI 챗이 환자가 안 밝힌 암종(대장암)을 단정하고, "아니라고" 정정해도 계속 고집 + 내부 사고 노출 (2026-06-21)

**무슨 일**
- PO 가 "한국에 가서 치료 받고 싶은데 절차 알려줘"(암종 안 밝힘)라고 물었는데 AI 가 **"대장암 치료의 핵심은…"** 으로 단정해 안내. 이어 "대장암이라고 안했는데 왜 대장암을 안내해줘?" / "아니 대장암 치료가 궁금한게 아니라고" 라고 두 번 정정해도 **계속 대장암을 설명**(비용까지).
- 같은 스레드에서 모델 **내부 사고/메타텍스트가 답변에 그대로 노출**: `*Wait, let's keep it extremely concise*`, `Let's make it even shorter and cleaner`, `(32 words)`, `(3 words)`.

**왜 그랬나 (근본원인)**
1. 그 스레드 앞부분에서 PO 가 "대장암 치료법 알려줘"를 6번 넘게 반복 → 모델 대화기록(최근 12개)에 "대장암"이 가득. 현재 질문이 generic 인데 **기록의 옛 화제를 단정으로 끌고 옴(over-anchoring)**. 데이터 편중이 아님(treatments·hospitals·rag 모두 대장암 0건 확인) → **항상 주입되는 `CARE_REFERENCE` 의 암종 7개 예시 중 하나를 모델이 임의 선택**.
2. **정정 무시**: "X 아니라고"라고 명확히 정정해도 화제를 버리는 규칙이 시스템 프롬프트에 없었음 → 정정 문장 자체에 "대장암"이 또 들어가 자기강화.
3. **내부 사고 노출**: 최종 메시지만 출력하라는 명시 규칙이 없어 모델의 자기지시(길이 줄이기 등)가 평문에 샘.
4. 새 스레드 단발 질문에선 재현 안 됨(확률적·맥락의존) → 자동 빌드/기존 테스트로 안 걸림.

**어떻게 고쳤나**
- `buildSystemPrompt`(`src/lib/chat/generateReply.ts`)에 행동 가드 3종 추가 — 두 공개 챗 라우트(스트림·메시지)가 공유하는 단일 함수라 한 곳 수정으로 둘 다 적용:
  1. 환자가 **현재 메시지에서 명시한 암종이 아니면 단정/명명 금지**(참고자료의 암종 목록은 예시일 뿐).
  2. **이전 대화 언급을 단정 근거로 쓰지 말 것** — 현재 질문이 generic 이면 암종 명명 없이 일반적으로 답.
  3. **정정 즉시 수용**: "아니/말고/아니라고/안했는데/not X/that's not what I asked" → 한 줄 사과 후 그 화제 완전히 버리고 무엇을 원하는지 되묻기. 정정 뒤 같은 암종 반복 = 최악.
  4. **최종 메시지만 출력** — 단어수·"Wait"·"let's keep it short" 류 자기지시/메타 노출 금지.
- 회귀 잠금: `src/lib/chat/systemPromptGuards.test.ts` — 무거운 server-only 모듈을 import 하지 않고 소스 텍스트로 가드 문구 생존을 검사(4개).

**2차(같은 날, 프롬프트만으론 부족 판명 → 코드 강제):**
- 1차(프롬프트 규칙)만으로는 **"대장암 6회+" 누적된 실제 PO 스레드에서 안 꺾임** — 정정("난 대장암 안 물어봤는데")에도 모델이 영어로 또 대장암 안내(DB 실측). 모델 확률성을 프롬프트로 못 이김 → **코드로 강제**:
  1. 순수 모듈 `src/lib/chat/topicGuards.ts` 분리(테스트 가능): `mentionsCancerType`(현재 메시지에 특정 암종어가 있나) · `isTopicCorrection`(부정·정정 신호) · `correctionReply`(6언어 결정적 사과+재질문).
  2. 두 응답 경로(`generateChatReply`·`streamChatReply`)에서 **정정 감지 시 모델을 아예 거치지 않고** 결정적 사과+재질문으로 화제 100% 리셋. (정정 문장 속 암종어는 "거부 대상"이라 게이트 안 함. "A 말고 B"는 패턴에서 제외.)
  3. `buildSystemPrompt` 최상단에 **현재 메시지에 암종 없으면** "어떤 특정 암도 언급/단정 금지" 강제 지시(`currentMentionsCancer` 게이트) — 누적 스레드에서 generic 질문이 옛 암종으로 새는 것 차단.
- 단위테스트 `topicGuards.test.ts`(15개): PO 실패 문장들(`대장암이라고 안했는데…`·`난대장암안물어봤는데?`·`아니 대장암…아니라고`) 전부 정정으로 잡히는지, `위암`(1자+암)·러시아어 암종어 검출, `A 말고 B` 오탐 방지까지 고정.

**재발 방지 (시스템 적용)**
- AI 행동 규칙은 사람 신고로만 잡지 말고, 핵심 규칙은 **소스 텍스트 회귀 테스트로 잠근다**(server-only 모듈이라 직접 import 불가 → 파일 grep 방식). **확률적 LLM 행동을 "반드시" 보장해야 하면 프롬프트가 아니라 코드 게이트(결정적 분기)로 강제**한다(프롬프트는 best-effort).
- "환자가 안 밝힌 진단을 AI 가 지어내는 것"은 단순 UX 가 아니라 **의료 레드라인(진단명 임의 명명)** 으로 취급. 새 암종/진단 관련 프롬프트 작업 시 "현재 메시지 근거"와 "정정 수용"을 항상 점검.
- **"행동" 버그는 PO 스크린샷이 아니라 자동 점검으로 먼저 잡는다**: 빌드·단위테스트는 문법·순수로직만 본다. 실제 대화 행동(암종 단정·정정 무시·언어 불일치)을 재생해 검사하는 `npm run check:ai-behavior [URL]`(`scripts/check-ai-behavior.mjs`) 추가 — 배포 후/의심 시 실서비스나 프리뷰 URL 에 대고 1회 돌린다(실 AI 호출이라 CI 매PR 게이트가 아닌 배포후 점검). 새 "행동" 버그 부류가 나오면 이 스크립트에 시나리오를 한 줄 추가해 영구 차단한다.

## #17 — 에이전시→병원 의뢰로 '치료 확정'된 케이스가 유치 전환 점수판(KHIDI 평가)에서 누락 (2026-06-21)

**무슨 일**
- 유치 전환 대시보드(`/admin/khidi/conversion`)의 "유치 확정(admitted)" 카운트는 KHIDI 중간평가 정량지표(외국인환자 유치 12건)에 직결되는데, **자동집계가 `inquiries.outcome='admitted'` 한 곳에만 의존**.
- 그런데 새 의뢰 흐름(에이전시 포털 의뢰 #194 → 코디 검토·병원 배정 #200 → 병원 응답 역방향 #202)은 전혀 다른 데이터(`inquiries.case_status` + `hospital_leads.status`)로만 진행. **병원이 '치료 확정(converted)'을 눌러도 `outcome` 은 그대로 null** → 유치 카운트 0.
- 게다가 점수판의 "유치확정 대기" 목록은 **사전상담(pre_consultation) 완료 의뢰만** 보여줘서, 상담세션 없이 에이전시→병원으로만 진행된 케이스는 코디가 확정 누를 기회조차 없음(완전 사각지대). 실데이터 #13이 그 상태였음(병원 converted인데 outcome null, 대기목록에도 없음).

**왜 그랬나 (근본원인)**
- 두 워크플로가 **각자 다른 시기에 추가**되며 데이터 트랙이 분리됨: (구) 상담세션 기반 유치 집계(outcome) vs (신) 에이전시·병원 백오피스(case_status/hospital_leads). 둘을 잇는 다리가 없었음.
- 자동집계 KPI가 **단일 컬럼(outcome)**에만 의존하는데, 그 컬럼을 갱신하는 경로가 코디 수동 1곳뿐이라 새 경로가 생기면 조용히 누락.

**어떻게 고쳤나** (PO 결정 2026-06-21: 병원 확정 → 자동 유치 집계)
- 순수 매핑 함수 `outcomeForHospitalLeadStatus(status)` 를 `src/lib/khidi/caseStatus.ts` 에 추가('converted'→'admitted', 그 외 null).
- `/api/partner/leads/[id]` PATCH 의 역방향 반영(`syncLeadStatusToCase`)에서 병원이 'converted' 로 바꾸면 `inquiries.outcome='admitted'`(+outcome_note/updated_at/updated_by) 도 함께 기록 → 점수판 유치 카운트에 즉시 반영.
- 단위테스트 `caseStatus.test.ts` 에 3개 추가(converted→admitted, 그 외/빈값→null) 로 매핑 고정.

**재발 방지 (시스템 적용)**
- **자동집계 KPI 가 의존하는 컬럼(`outcome` 등)은, 그 상태를 만들어내는 *모든* 사용자 경로에서 갱신되는지 점검**한다. 새 워크플로(포털·역할)를 추가하면 "이게 평가지표 컬럼을 건드려야 하나?"를 체크리스트에 포함.
- 상태→KPI 매핑은 라우트 안에 묻지 말고 **순수 함수로 빼서 단위테스트로 잠근다**(이번 `outcomeForHospitalLeadStatus`).
- 잔여 위험(미해결): 코디가 `case_status` 를 'treatment'/'completed' 로 수동 전진시키면서 `outcome` 을 안 박는 경우는 여전히 누락 가능 → 후속으로 "치료/완료 단계인데 outcome null" 케이스를 점수판 대기목록에 노출하는 안 검토 필요(이번엔 병원 confirmed 경로만 닫음).

## #18 — 계층별 백오피스를 "노드만 만들고 엣지(연결)는 PO가 짚을 때마다" 만든 반쪽 패턴 (2026-06-21)

**무슨 일 (PO 직접 지적)**
- PO: "계층별 백오피스는 내가 얘기 안 해도 당연히 있었어야 하는 거잖아. 내가 얘기하기 전에 니가 안 만든 이유가 뭔지 보고하고 반성해."
- 실제로 같은 부류를 PO가 **세 번 연속** 짚어야 했다:
  1. #200 — 에이전시/환자가 의뢰를 접수해도 **코디·국내병원이 검토할 연결이 없었음**("반쪽"). 배정 UNIQUE 인덱스가 없어 배정이 런타임 실패(0건)인 것도 그때 드러남.
  2. #202 — 병원이 응답해도 **코디·에이전시 쪽으로 되돌아오는 반영(닫힌 고리)이 없었음**.
  3. (오늘) 병원이 '치료 확정'해도 **유치 전환 점수판(평가 KPI)에 안 잡혔음** — 백오피스 흐름과 평가 집계가 따로 놀았음.

**왜 그랬나 (근본원인 — 변명 아닌 사실)**
1. **기능을 "PO가 지금 묻는 화면" 단위로만 완성**했다. 역할 포털(환자·에이전시·코디·의사·병원)을 각각 독립적으로 만들면서, 그 사이를 잇는 **상태 전이(state transition)·역방향 반영·다운스트림 소비자(KPI)** 를 같은 작업 단위로 묶지 않았다. = 그래프의 노드만 만들고 엣지를 빼먹음.
2. **케이스 생애주기 전체를 관장하는 단일 지도가 없었다.** "어느 단계에서 / 누가 행동하고 / 누가 보고 / 어떤 KPI가 갱신되는가"를 한 장으로 정의한 계약이 없으니, 새 역할/기능을 추가할 때 "이 변경이 위·아래 단계와 평가지표까지 연결됐나"를 강제로 점검할 기준이 없었다.
3. **"빌드/테스트 통과 = 완성"으로 착시.** 각 포털은 단위로는 동작·통과했지만 *교차역할 워크플로*는 자동검사가 없어 "반쪽"이 통과로 보였다. PO만이 끝에서 끝까지 클릭해 빈 엣지를 발견.
4. 일부는 역할 자체가 최근 추가(해외 에이전시=8번째 계층, #178)라 연결도 그 직후 작업이긴 했으나, **"역할을 추가하면 그 역할을 기존 흐름+KPI에 잇는 것까지가 한 묶음"** 이라는 당연한 기본기를 내가 선제적으로 한 덩어리로 처리하지 못한 게 핵심.

**어떻게 고쳤나 / 재발 방지 (시스템 적용)**
- (오늘) 병원 확정 → 유치 자동 집계로 백오피스↔평가 KPI 엣지를 메움(#17).
- **재발 방지 원칙 신설**: 새 역할 포털·케이스 단계·상태 필드를 추가/변경하면, **그 변경의 "전체 워크플로 연결"을 같은 작업 단위로 완성**한다 — 점검 3종:
  1. **업스트림**: 이 상태에 누가/어떻게 도달시키나(진입 액터·API).
  2. **다운스트림 가시성**: 이 상태를 누가 봐야 하나(관련 *모든* 역할 포털에 반영·역방향 포함).
  3. **지표 소비자**: 이 상태가 평가 KPI(유치/상담/사후관리/만족도) 컬럼을 갱신해야 하나(자동집계 누락 차단).
- **케이스 생애주기 지도를 단일 문서로 만들 것**(다음 세션 권장): 단계 × (행동 역할 / 조회 역할 / 갱신 KPI) 표. `caseStatus.ts` 단계 정의 옆에 이 매핑을 SoR로 두고, 새 기능 PR 체크리스트에 "세 점검 통과" 포함.
- PO_PREFERENCES에 "반쪽 금지 — 새 기능은 전체 워크플로 끝까지" 활성 취향 누적(아래).

---

## #19 — 만족도 설문 cron 의 "발송 시간창(6h)"이 cron 주기(24h)보다 좁아 설문 대부분 미발송 + 월간보고 명단이 없는 테이블 조인으로 항상 빈칸 (2026-06-21 야간 자율감사)

**무슨 일**
야간 자율 세션에서 KHIDI 평가지표 파이프라인을 감사하다 평가 직결 버그 2건 발견(둘 다 "조용히 0/빈값"이라 사람이 화면으로는 못 잡는 부류):
1. **만족도(K-03) 설문 대부분 미발송.** `dispatch-surveys` cron 은 하루 1회(09:00 UTC) 도는데, 발송 대상을 "완료 후 24~30시간"인 **6시간 슬라이스**로만 조회했다. 두 실행 사이(24h)에 그 6시간 밖에서 완료된 세션(하루의 나머지 18시간)은 다음 실행 땐 이미 30h 를 넘겨 **영구 누락**. → 설문이 이론상 ~25%만 발송 → K-03 표본이 조용히 급감(실DB: 완료 13건 중 설문 1건·응답 0건).
2. **월간보고 환자명단이 항상 빈칸.** `monthly-report` 가 **존재하지 않는 테이블 `khidi_intakes` 를 `!inner` 조인** → 쿼리 에러 → `[]` → "사전사후관리 현황보고" 시트가 늘 비어 제출됨(헤드라인 건수 C9~C11 은 정상이라 불일치).

**왜 못 잡았나 (근본원인)**
1. **시간창과 cron 주기의 불일치를 아무도 대조 안 함.** "완료 24h 뒤 발송"이라는 의도는 맞지만, **창 폭(6h) < 실행 간격(24h)** 이면 사이가 새는 건 자명한데 창을 고정 슬라이스로 잡았다. 놓친 실행을 따라잡는 backfill 개념이 없었음(POSTMORTEMS #12·#13 이 "설문 0건"을 고쳤지만 *발송 커버리지* 누수는 별개로 남아 있었다).
2. **`khidi_intakes` 는 #7(kpi.ts)·KNOWN_ISSUES 에서 이미 "존재하지 않는 테이블"로 못박혔는데**, 같은 잔재가 `monthly-report` 에 **하나 더** 남아 있었다(전수 스캔을 그때 안 함). 존재하지 않는 테이블 쿼리는 PostgREST 에서 빈 결과/에러로 *조용히* 끝나 빌드·런타임 어디서도 안 터진다.
3. **둘 다 "조용한 0/빈값"이라 화면엔 정상처럼 보임.** 데드맨 스위치(`alertIfKpiStale`)는 *스냅샷 신선도*만 보지 *설문 발송 커버리지*나 *명단 채움*은 안 본다.

**어떻게 고쳤나**
1. 발송 시간창을 순수함수 `src/lib/surveys/dispatchWindow.ts`(`surveyDispatchWindow`)로 분리 — 하한을 **14일**로 넓혀, cron 이 놓치거나 며칠 안 돌아도 다음 실행에서 **소급(backfill) 발송**. 재발송은 기존 `surveys`(consultation_session_id 유일) 존재검사로 **멱등**. 단위테스트 6개로 "완료 24h~14일 사이는 하루 중 언제 완료됐든 전부 대상"·"옛 윈도우가 놓치던 31~45h 전 완료분 포함"을 회귀 고정.
2. `monthly-report` 의 `khidi_intakes!inner` 를 실제 연결고리 `consultation_sessions.inquiry_id → inquiries`(국적·암종) 2단계 조회로 교체. 명단이 더는 빈칸이 아님. (단 **성별·출생연도는 어느 테이블에도 수집 안 됨** → 빈칸으로 두고 PO 보고: 데이터 수집 갭.)

**재발 방지 (시스템 적용)**
- **가드 룰 신설**: `scripts/check-content-consistency.mjs` 에 `.from("khidi_intakes")`·`khidi_intakes!inner` 패턴 차단 룰 추가(설명 주석은 통과하도록 정밀 패턴). 없는 테이블을 다시 쿼리하면 CI 가 매 PR 막는다.
- **유사 이슈 전수 스캔 완료**: `khidi_intakes` 잔재는 이제 설명 주석 2곳만 남고 실제 쿼리 0.
- **남은 권장(미적용 — PO 결정 필요)**: ①대시보드/월간보고 경로(`getKpiForMonth`/`getKpiCumulative`)도 집계 에러를 0 으로 삼키지 말고 `errors[]` 를 표면화(현재 canary 는 cron 경로만 커버). ②설문 발송 커버리지(완료 대비 설문 발송률)용 데드맨 스위치 추가. ③성별·출생연도 수집 여부(문진/인테이크에 추가할지) 결정.

---

## #20 — 비공개(`is_published=false`) 치료·병원이 sitemap·상세페이지에 계속 노출 (검색에서 안 빠짐) (2026-06-22)

**무슨 일**
도메인 컷오버 후 검색노출 점검 중, `treatments` 테이블에 슬러그가 자동생성 쓰레기값(`item-<타임스탬프>`)인 실콘텐츠 3건(신경회복 도수치료·주사요법·면역플러스/개인맞춤한약)이 sitemap·검색에 그대로 노출됨. PO 요청으로 이 3건을 **소프트 비활성(`is_published=false`)** 하려 했으나, 코드를 보니 비활성해도 **목록에선 빠지지만 sitemap·상세페이지엔 계속 200으로 남는** 더 큰 버그가 있었다.

**왜 못 잡았나 (근본원인)**
1. `getTreatmentList`/`getHospitalList`(sitemap 공급) 와 `getTreatmentBySlug`/`getHospitalBySlug`(상세페이지 공급)가 **`is_published` 필터를 안 걸었다.** 같은 파일의 `getAllTreatments`·`getFeaturedTreatments` 는 `.eq("is_published", true)` 가 있는데, **list/bySlug 4개만 빠져 있어** 비공개 데이터가 검색·직링크로 샜다.
2. "비공개 처리" 가 **목록 노출만** 막고 *검색 인덱싱 경로(sitemap·상세 404)* 는 안 막는다는 걸 아무도 대조 안 함 → 소프트 비활성의 의미가 반쪽이었다.
3. 슬러그 자동생성(`item-<ts>`) 자체가 검색에 추한 URL을 만드는 부류인데 가드가 없었음.

**어떻게 고쳤나**
- `src/lib/data/treatments.js`·`hospitals.js` 의 `get*List`·`get*BySlug` 4개 함수에 `.eq("is_published", true)` 추가 → 비공개는 **sitemap에서 빠지고 상세페이지는 `notFound()` 로 404**(상세 page.jsx 가 null→notFound 확인). 폴백 `get*ById`(uuid 직링크)는 비공개를 안 거르는 엣지가 남으나 sitemap이 비공개를 더는 노출 안 하므로 표면화 안 됨(YAGNI, 다른 호출처 영향 회피).
- 문제 3건은 `is_published=false` 로 소프트 비활성(하드삭제 X — PO가 "포맷 나중에 쓸 수도" 라 보존).

**재발 방지 (시스템 적용)**
- **유사 이슈 전수 스캔 완료**: 공개 데이터 페처 중 list/bySlug 4개만 누락이었고 전부 수정. 그 외 공개 경로(`getFeatured*`·`getAll*`·`getRelated*`·`getHospitalTreatments`)는 이미 필터 있음.
- **남은 권장(미적용)**: ①슬러그 `item-<숫자>`·`etc` 같은 자동/플레이스홀더 슬러그를 `check-content-consistency.mjs` 또는 sitemap 생성 시 경고하는 가드 추가(검색에 추한 URL 차단). ②`get*ById` 도 공개 경로에서 쓰일 때 `is_published` 거를지 검토.

---

## #21 — 같은 리드 상태(`converted`)를 화면마다 다른 한국어로 표기 (라벨 불일치) (2026-06-22)

**무슨 일**
협력기관 업무프로세스 런타임 검증 중, 병원 포털에서 리드를 "치료확정" 시키는 액션 버튼이 **"진료 전환"** 으로 떠 PO가 "왜 만들어놓고 버튼 이름이 다르냐"고 지적. 확인해보니 단일 상태값 `converted` 를 화면마다 다르게 부르고 있었다: 액션버튼 **"진료 전환"**, 상태뱃지 **"전환됨"**(partner/leads·partner·admin/leads), 케이스 지도 문서·구두 설명은 **"치료 확정"**. 특히 "진료 전환"은 *"진료를 다른 데로 옮긴다"* 처럼 읽혀 의미까지 오해를 부름.

**왜 못 잡았나 (근본원인)**
1. 리드 상태 라벨이 **공유 SoR 없이 화면마다 따로 하드코딩**(`STATUS_CONFIG`/`STATUS_LABELS`/`statusActions` 4곳)돼 같은 값이 제각각 번역됐다.
2. 상태 *뱃지*(과거형 "전환됨")와 *액션 버튼*(동사형 "진료 전환")을 다른 사람이 다른 시점에 박아, 둘이 같은 상태라는 점을 아무도 대조 안 함.
3. 콘텐츠 일관성 검사(`check-content-consistency.mjs`)가 옛 브랜드/이메일/i18n 키만 보고 **UI 라벨 동의어 불일치**는 검사 항목이 아니었다.

**어떻게 고쳤나**
- `converted` 의 화면 라벨을 **"치료 확정" 하나로 통일** — `app/partner/leads/page.jsx`(뱃지·필터·액션버튼 3곳), `app/partner/page.jsx`(뱃지), `app/admin/leads/page.jsx`(라벨맵·안내문 2곳).
- 의미상 "치료 확정"이 맞음: 병원이 이 환자를 *자기 병원에서 치료하기로 확정* → 유치(K-01) 자동집계되는 단계.

**재발 방지 (시스템 적용)**
- **가드 룰 신설**: `check-content-consistency.mjs` FORBIDDEN 에 `/진료\s*전환|전환됨/` 차단 룰 추가 — 두 잔재 표기가 코드(app·src·components)에 다시 들어오면 CI 가 매 PR 막는다.
- **유사 이슈 전수 스캔 완료**: 전 코드에서 "전환됨"·"진료 전환" 잔재 0건 확인.
- **남은 권장(미적용)**: 리드 상태 라벨도 케이스 단계처럼 단일 모듈(예: `caseStatus.ts` 인근)로 SoR 통합하면 화면별 하드코딩 자체가 사라짐(YAGNI로 이번엔 문자열 통일까지만).

---

## #25 — PO가 "자동화하라"고 이미 지시한 '다음 세션 복붙 프롬프트'를 핸드오프 마무리에서 또 채팅에 들이밂 (지시 미반영·재발) (2026-06-22)

**무슨 일**
핸드오프(인수인계)를 마치며 "이거 다음 세션에 그대로 붙여" + 인용블록(복붙용 프롬프트)을 채팅에 또 띄웠다. PO가 **"다음 세션 프롬프트 나한테 주지 말고 자동화하라고 했는데 왜 또 그러냐? 반영 안됐어?"**라고 지적. 같은 요청을 PO가 다시 해야 했음.

**왜 못 잡았나 (근본원인)**
1. **지시가 코드/규칙에 인코딩 안 돼 증발**: PO가 과거에 "복붙 말고 자동화" 의사를 밝혔으나 그게 `PO_PREFERENCES.md`·`CLAUDE.md`·핸드오프 스킬 어디에도 박히지 않음 → 다음 세션(맥락 초기화)에서 사라짐. 구두 지시는 기록되지 않으면 1회용이다.
2. **충돌하는 옛 규칙을 기계적으로 따름**: 핸드오프 스킬 `SKILL.md` 규칙 H가 *"마무리 응답 맨 끝에 복붙 프롬프트를 인용블록으로 띄워라 — 필수·절대 생략 금지"*(2026-06-19 신설)로 PO의 새 의사와 **정면 충돌**한 채 남아 있었고, 나는 스킬 지시를 그대로 실행함.
3. **자동화가 이미 그 일을 한다는 걸 확인 안 함**: 세션 시작 훅(`session-orient.sh`)이 핸드오프의 "다음 세션이 먼저 할 일"을 다음 세션에 자동 표시 중이라 복붙이 애초에 불필요했는데, 그 사실을 점검하지 않고 중복 출력했다.

**어떻게 고쳤나 (커밋 cb8840f)**
- 핸드오프 스킬 규칙 H를 **"복붙 프롬프트를 PO에게 내밀지 마라(자동화로 대체)"**로 교체 + 7번 섹션은 *문서(PROJECT_CONTEXT)에 기록만* 하도록 변경.
- `PO_PREFERENCES.md` 활성취향에 누적("복붙 프롬프트 내밀지 말 것 — 자동화", CLAUDE.md 승격 후보) + 충돌하던 옛 항목(디바이스 전환 시 프롬프트 주기)이 자동화로 대체됨을 명시.

**재발 방지 (시스템 적용)**
- **"PO가 이미 시켰다" 류 = 즉시 영구 기록**: PO의 워크플로/취향 지시는 그 자리에서 `PO_PREFERENCES.md`(또는 규칙이면 스킬/CLAUDE.md)에 박아 다음 세션 훅이 띄우게 한다. 기억·구두에 의존 금지.
- **지시의 단일 출처 충돌 시 PO 최신 의사 우선 + 옛 규칙 즉시 수정**: 스킬·취향·CLAUDE.md가 어긋나면 그대로 실행하지 말고 PO 최신 지시에 맞춰 옛 규칙을 고친다.
- (수동 가드는 과함 — 행동 규칙이라 기록·승격으로 충분.)

## #24 — 카자흐어(`kz`) 문의가 step1 검증에서 400 거부 + 카자흐 환자에게 한국어 리마인더 — 핵심 타겟 시장(카자흐스탄) 퍼널 차단 (2026-06-22 야간 자율감사)

**무슨 일**
통합 문의 퍼널(`/inquiry`)의 언어 드롭다운은 활성코드 `kz`(카자흐어)를 보내는데, `/api/inquiries/step1` 의 zod 검증이 `z.enum(["ko","en","ru","kk","zh","ja"])` 로 **`kk` 만 받고 `kz` 를 거부** → 카자흐어를 고른(또는 UI 언어가 kz 인) 사용자의 step1 제출이 **400(검증 실패)** 으로 막힘. 카자흐스탄이 본 사업의 **핵심 타겟 시장**(KHIDI 평가 성과지표 = 카자흐 암환자 유치)인데 그 문의 퍼널이 조용히 차단돼 있었음 = 유치·상담 KPI 직격. 더해 `dispatch-reminders` cron 도 `kz` 를 `["...,"kk",...]` 필터에서 못 통과시켜 **카자흐 환자에게 한국어 리마인더**가 발송되고 있었음.

**왜 못 잡았나 (근본원인)**
1. **언어코드 정본 불일치**: 앱 전반(i18n·문의 퍼널·챗)은 활성코드 `kz` 를 쓰는데, 이메일/설문 서브시스템은 의도적으로 내부키 `kk`(ISO 639-1)를 쓰고 경계에서 `kz→kk` 정규화(`resolveRecipient.normalizeSurveyLang`)한다. 이 "경계 정규화" 규칙을 **입력 검증(step1)·리마인더 cron 이 안 따라서** `kk` 만 받게 됨.
2. **검증값이 화면(드롭다운)과 따로 관리됨**: 드롭다운 옵션(`kz`)과 서버 enum(`kk`)이 한 곳에서 안 나와 어긋남을 아무도 못 봄. 빌드·타입검사는 통과(런타임 문자열 검증이라).
3. 카자흐어 실제 제출 트래픽이 적어(운영 초기) 사람이 스크린샷으로 발견 못 함.

**어떻게 고쳤나**
- `step1` enum 에 `kz` 추가(하위호환 위해 `kk` 도 유지): `["ko","en","ru","kz","kk","zh","ja"]`. 입력은 정본 `kz` 로 받고 저장.
- `dispatch-reminders` 는 설문과 동일하게 **경계에서 `kz→kk` 매핑** 후 템플릿 키 조회 → 카자흐 환자가 카자흐어 리마인더를 받음(영어/한국어 폴백 제거).

**재발 방지 (시스템 적용)**
- **가드 룰 신설**: `scripts/check-content-consistency.mjs` 에 "`z.enum(...)` 언어검증에 `kk` 가 있는데 활성코드 `kz` 가 없으면 CI 실패" 규칙 추가(POSTMORTEMS #24). **검증 enum 만 정밀 타겟** — 이메일/설문 템플릿 내부키 `kk`(경계 정규화 있음)·hreflang 맵(`kz:"kk"`, kk 가 SEO 정답)은 오탐 제외. 매 PR 자동 차단.
- **남은 권장(미적용)**: 언어코드 정본(`kz`)과 경계 매핑(`kz↔kk`)을 단일 헬퍼로 모아 모든 입력/출력이 그걸 거치게 하면 부류 자체가 사라짐(저우선, 리팩터 필요).

## #23 — AI 에이전트가 비로그인·연락처 없는 사용자에게 "접수 완료/코디가 연락"이라는 거짓 약속 + 세션 유실 질문에 즉흥 오답 (2026-06-22)

**무슨 일**
PO가 `/inquiry` AI Agent를 직접 테스트(위암 친구 상담 시나리오). AI가 ①연락처가 하나도 없는 익명 사용자에게 "신속하게 접수해 드렸습니다, 코디네이터가 곧 연락드립니다"라고 한 뒤 곧바로 "연락처를 남겨달라"고 모순된 안내 → "접수했다면서 왜 연락처를 또 묻냐"는 지적을 받음. ②"로그인 안 해서 세션 유지 안 될 텐데?"라는 질문에 근거 없이 즉흥 답(브라우저 닫으면 사라진다 등)을 만들어내다 꼬임. ③질책받자 위암 비용표·필수서류를 맥락 없이 쏟아냄(data dumping). ④실제로는 사용자가 로그인 상태였는데 그걸 전혀 몰랐음.

**왜 못 잡았나 (근본원인)**
1. **상태 사실 미주입**: `/inquiry` AI 챗은 설계상 익명·공개(`/api/public/chat/*`)인데, 시스템 프롬프트가 로그인 여부·연락 가능 여부·세션 저장 메커니즘(쿠키 30일 복구·DB 저장)을 **하나도 모름**. 그래서 세션 질문에 즉흥 창작을 함.
2. **접수 멘트가 무조건 "접수완료"**: 시스템 프롬프트가 "이미 이름·연락처가 저장돼 있다"고 **무조건 가정**(generateReply.ts 구 335줄), 라우트도 `HANDOFF_CONFIRM`("🔔 접수됐어요")을 **연락처 유무와 무관하게 무조건** 덧붙임 → 연락 불가인데 거짓 약속.
3. **감정 신호 처리 규칙 부재**: 화난 사용자에게 정보 덤프로 도망치는 패턴을 막는 규칙이 없었음.
4. 로그인 사용자라도 공개 챗이 `user_id`를 안 붙여 계정과 분리돼 있었음.

**어떻게 고쳤나**
- **상태 사실 주입**: `ChatSession{isLoggedIn,hasReachableContact}`를 `buildSystemPrompt`까지 관통. 프롬프트에 **SESSION & IDENTITY FACTS** 블록 추가(로그인=계정연결·any device / 게스트=이 브라우저 30일 복구를 정직하게 안내, "나중에 와서 메시지 남겨라" 금지).
- **접수 멘트 연락처 게이트**: REGISTER 규칙을 `hasReachableContact`로 분기 — 연락 가능하면 "접수완료", 불가하면 **거짓 "접수완료" 금지 + 연락처 하나만 요청**(대화는 저장돼 있음 안심). 라우트의 하드코딩 멘트도 `pickHandoffConfirm(lang, reachable)`로 분기(`HANDOFF_NEED_CONTACT` 신설, 6개 언어).
- **감정 대응 규칙**: TONE에 DE-ESCALATION 추가(화난 사용자에게 문서·가격 덤프 금지, 공감 1줄+질문 1개).
- **로그인 계정 연결**: 공개 챗 3개 라우트(start/message/stream)가 same-origin 인증쿠키로 로그인 사용자 식별 → `chat_threads.user_id` 연결(+`metadata.is_logged_in`). 익명(인증쿠키 없음)은 auth 왕복 생략(매 턴 지연 방지). `hasReachableContact=guest_email∥guest_phone∥user_id`.

**재발 방지 (시스템 적용)**
- **가드 룰(회귀잠금) 신설**: `systemPromptGuards.test.ts`에 ①접수 멘트가 `hasReachableContact`로 분기 + "거짓 약속 금지" 문구 ②SESSION & IDENTITY FACTS 블록 ③DE-ESCALATION 규칙 ④`publicChatHelpers`의 `hasReachableContact`·`pickHandoffConfirm`·`HANDOFF_NEED_CONTACT`(6언어) 존재를 텍스트로 잠금 → 누가 지우면 CI가 막음.
- **`HANDOFF_CONFIRM` `kz` 키 누락 보강**(기존 `kk`만 있어 카자흐어가 영어로 폴백되던 잔버그).
- **남은 권장(미적용)**: ①이름으로 인사(displayName)는 PII 최소화 위해 보류 ②연락처 없이 여러 턴 지나면 코디 대시보드에서 "연락불가 리드"로 분류하는 운영 가드.
## #22 — 긴 채팅 스레드에서 AI가 같은 변명을 무한 반복(디플렉션 루프) — 앱은 바보 같고 새 대화(브라우저)는 멀쩡 (2026-06-22)

**무슨 일**
PO가 PWA(설치형 앱)로 AI Agent를 길게 테스트하던 중, 어느 순간부터 무엇을 물어도 똑같은 변명("보안 규칙 잘 지키고 있어요 😊, 치료 도와드릴게요")만 무한 반복. 환자(PO)가 "게 아니고", "왜 이래", "또 이러네", "너 고장났는데", "헛소리하지말고"로 반발해도 계속 헛다리. 같은 시각 브라우저의 **새 대화**는 정정에 "앗, 죄송합니다 제가 잘못 짚었어요"로 멀쩡히 사과 → PO가 "앱은 업데이트 반영 못 하나?"로 오해. 실데이터(`chat_threads`/`chat_messages`) 조회로 **기기 차이가 아니라 스레드 누적 차이**임을 확정(앱=50메시지 누적 스레드 `dc3d0719`, 브라우저=새 스레드).

**왜 못 잡았나 (근본원인)**
1. 모델에 직전 대화 최근 12개를 넘기는데, 그 12개가 전부 **자기(어시스턴트)의 변명성 답변**이면 모델이 그 톤을 정답으로 착각해 새 질문에도 복사함(self-anchoring). 기존 가드는 *암종* over-anchoring만 막고 *자기 답변 톤* 반복은 안 막았다.
2. `isTopicCorrection` 정정 패턴이 **암종 부정**("대장암 안 물어봤는데") 위주라, 메타 정정·반복 항의("게 아니고", "왜 이래", "또 이러네", "오해했어", "헛소리", "고장")가 **하나도 안 걸려** 결정적 리셋이 발동 못 함 → 루프가 안 끊김.
3. 프롬프트의 톤 규칙이 약해 모델이 jailbreak로 오인하면 "보안 규칙 지킴" 변명 + 이모지·필러("아이고", "😊", "날카롭게 짚으셨네요")로 도망.

**어떻게 고쳤나** (`src/lib/chat/generateReply.ts`, `topicGuards.ts`)
1. **자기 답변 복사 금지** 프롬프트 규칙 신설("DO NOT ECHO YOUR OWN PREVIOUS REPLIES") — 반복·되묻기 대신 현재 질문에 직접 답하고, 못 하면 한 줄로 솔직히 + 코디 연결.
2. **반복 회로차단기(코드)**: 최근 어시스턴트 답변 2~3개의 평균 Jaccard 유사도 ≥ 0.5면 시스템 프롬프트 최상단에 `REPETITION_GUARD`("너 반복하고 있다 — 멈추고 현재 질문에 직접 답하라") 강제 주입. 비스트리밍·스트리밍 두 경로 모두.
3. **메타 정정 인식 확장**: `TOPIC_CORRECTION_PATTERNS`에 "게 아니/오해/리마인드/또 이러/동문서답/헛소리/같은 말 반복/고장" + 영·러·카·중·일 대응 추가 → 반발 시 결정적 사과+재질문으로 루프 차단.
4. **이모지·필러 톤 가드** 강화(장식 이모지·"아이고/great question" 류 금지).

**재발 방지 (시스템 적용)**
- 회귀 잠금 테스트 추가: `systemPromptGuards.test.ts`(자기복사 금지 규칙·반복 회로차단기·톤 가드 텍스트 잠금 + 두 경로 주입 ≥2회 검사), `topicGuards.test.ts`(이번 루프 사고의 실제 반발 문장 8종이 모두 `isTopicCorrection`에 잡히는지).
- **부수 산출물**: 이 사고를 계기로 **마스터키 '힐로'/'healo' 자기분석 모드**를 도입(PR #255) — 앞으로 같은 류를 PO가 화면에서 찾지 않고 채팅창/어드민에서 6하원칙 자기점검으로 바로 진단.
- **남은 한계**: Jaccard 0.5 임계값은 휴리스틱 — 너무 짧은 답변이나 다국어 혼용에서 오탐/미탐 가능. 운영 로그 보며 임계값 조정 필요할 수 있음.

---

## #26 — 이미지 자동 재압축이 PO가 큐레이션한 병원 메인사진을 덮어씀 (2026-06-23)

**무슨 일**
PO가 면력한방병원 각 지점 메인사진(`/images/hospitals/<slug>/1.jpg`)을 직접 골라 설정해뒀는데, 어느 세션이 자동으로 바뀐 것처럼 보여 "니가 맘대로 바꿨다"고 지적. 추적해보니 `perf(images)` 재압축 패스(#135, `scripts/optimize-images.mjs`)가 350KB 초과 이미지를 q82로 재인코딩하면서 **PO가 화질 우선으로 둔 메인사진까지 덮어씀**.

**왜 못 잡았나 (근본원인)**
1. 최적화 스크립트가 **"큐레이션된 자산"과 "기계 압축해도 되는 자산"을 구분 안 함** — public/images 전체를 무차별 대상으로.
2. 메인사진은 **전송량보다 화질이 중요**한데(첫인상·LCP 요소), 정책이 일률적 q82라 PO 의도를 침범.
3. 파일명이 같아(`1.jpg`) 덮어써도 참조는 안 깨지니 **조용히** 바뀜 → PO가 화면에서 발견할 때까지 모름.

**어떻게 고쳤나**
- PO가 다시 넣은 1.jpg(광명·강서·신촌) + 서브사진 커밋, 캐시버스터 `?v=2→v3`(동일 파일명 CDN/브라우저 옛 캐시 방지).

**재발 방지 (시스템 적용)**
- `scripts/optimize-images.mjs`에 `SKIP` 룰 추가: `images/hospitals/<slug>/1.jpg`(지점 메인사진)는 재압축·CI 게이트 양쪽에서 **제외**. 서브사진(2~5)·갤러리는 계속 최적화 대상(전송량 이득 유지). dry-run으로 메인 제외 검증함.
- 교훈: **자동 최적화/정리 스크립트는 "사람이 고른 자산"을 건드리지 않게 화이트리스트/스킵 경계를 둔다.**

---

## #27 — 앱아이콘 교체가 favicon.svg를 지웠는데 서비스워커는 계속 프리캐시 → SW 설치 실패 → PWA "앱 설치" 배너 사라짐 (2026-06-23)

**무슨 일**
모바일 브라우저 첫 방문 시 뜨던 Chrome PWA "앱 설치(홈 화면에 추가)" 배너가 어느 순간 안 뜸. 추적해보니 앱아이콘 교체 커밋(#a9a6673)이 `public/favicon.svg`를 삭제했는데, `public/sw.js`의 `PRECACHE_URLS`에 `/favicon.svg`가 그대로 남아 있었음. 서비스워커 설치 시 `cache.addAll([...])`은 **원자적(all-or-nothing)** — `/favicon.svg`가 404나면 addAll 전체가 reject → `event.waitUntil` reject → **서비스워커 설치 자체가 실패**. 활성 SW가 없으면 Chrome의 installability 조건이 깨져 설치 배너가 안 뜸. (favicon.svg 삭제 전 SW를 이미 설치한 폰은 옛 워커가 돌아 멀쩡 → 새 방문자만 증상, 그래서 발견이 늦음.)

**왜 못 잡았나 (근본원인)**
1. 자산 삭제(favicon.svg) 시 그 파일을 **참조하는 다른 곳(SW 프리캐시 목록)을 안 따라감** — #26과 같은 "조용한 결합" 부류.
2. `cache.addAll`의 **원자성**을 간과 — 목록 중 단 하나만 404여도 SW 전체가 죽는데, 실패가 콘솔에만 남고 화면엔 "배너 안 뜸"으로만 드러남.
3. **자동 가드 부재** + 빌드는 정적파일 404를 검사 안 함 → 사람(PO)이 증상으로 발견할 때까지 남음.

**어떻게 고쳤나**
- `sw.js`: 죽은 `/favicon.svg` 항목 제거 + `addAll` → 개별 `cache.add` + `Promise.allSettled`로 전환(파일 하나 빠져도 SW 설치는 성공). `CACHE_NAME` v3→v4로 버전업(반쯤 깨진 캐시 상태 정리).
- favicon.svg 잔재 전수 스캔 — sw.js 한 곳뿐이었음(확인 완료).

**재발 방지 (시스템 적용)**
- **구조적 차단**: `addAll`(원자적) → `allSettled`(개별)로 바꿔, 앞으로 **어떤 프리캐시 파일이 사라져도 SW가 죽지 않음** — 이 부류(프리캐시 단일파일 404 → 설치배너 실종)를 영구 무력화.
- 교훈: **public 자산을 삭제할 때 sw.js `PRECACHE_URLS`·manifest·layout `<head>` 참조를 같이 확인한다.** 원자적 일괄작업(addAll 등)은 가능하면 부분실패 허용형으로.

---

## #28 — 카자흐 시스템 언어가 영어로 폴백 (내부코드 `kz` ≠ ISO코드 `kk`) (2026-06-23)

**무슨 일**
"첫 진입 언어를 시스템 언어에 맞춤"(#279) 직후 prod에서, 카자흐어 시스템 사용자가 `/kz`가 아니라 `/en`(영어)으로 갔음. `curl -H 'Accept-Language: kk-KZ' /` → `Location: /en` 재현. **카자흐스탄이 1순위 타겟인데 그 시장이 영어로 새던** 치명적 누락.

**왜 못 잡았나 (근본원인)**
1. 우리 내부 locale 코드가 **`kz`** (비표준)인데, 브라우저 `Accept-Language`가 보내는 카자흐어 코드는 ISO 639-1 **`kk`**. `LOCALES.includes("kk")` = false → 영어 폴백.
2. 나머지 5개(ru·en·ja·zh·ko)는 ISO와 일치해서 정상 → **카자흐만 어긋나** 테스트 한 케이스로는 안 보임.
3. #279 검증 때 ko/de/ru/쿠키는 확인했는데 **kk(카자흐) 케이스를 빠뜨림** — 하필 1순위 타겟.

**어떻게 고쳤나**
- `proxy.ts` `detectLocale`: `if (want === "kk") want = "kz"` 한 줄로 ISO→내부코드 정규화. (#281)
- 유사 스캔: LOCALES 6개 중 ISO와 어긋나는 건 `kz`(↔kk)뿐. 다른 매핑 불필요 확인.

**재발 방지 (시스템 적용)**
- 인라인 주석으로 위험(`kk≠kz, 안 맞추면 1순위 타겟이 영어로 샘`) 명시.
- 교훈: **언어/로케일 기능은 6개 언어 전부 + 특히 핵심 타겟(러·카) 케이스로 검증한다.** 내부 코드가 ISO 표준과 다른 `kz`는 외부 입력(Accept-Language·hreflang·OS locale) 경계에서 항상 매핑이 필요.

---

## #29 — 환자 포털 통합: 증상·재진을 한 메커니즘으로 + 재진 '유령 컬럼' 발견 (2026-06-23)

**무슨 일**
환자 포털 실작동화 작업이 **두 갈래로 갈려** 있었다(같은 버그, 다른 화면 버전·다른 테이블):
- 증상기록: legacy 화면은 `/api/khidi/followup`, premium 화면은 `/api/portal/symptoms` — 저장 연결도 한쪽은 `patient_user_id`, 한쪽은 `inquiry_id`.
- 재진예약: legacy는 `consultation_sessions.rebooking_source`, premium은 `followup_schedules`.
PO가 "둘을 하나로 합쳐줘" → 통합 중 **결정적 사실**을 실DB에서 발견: **`consultation_sessions`에 `rebooking_source` 컬럼이 아예 없다.** 즉 legacy 재진화면·재진 엔진(`/api/khidi/rebooking/create`)·그 계약테스트가 전부 **존재하지 않는 컬럼**을 참조 = 실DB에서 깨짐. 진짜 테이블은 `followup_schedules`(존재, 0행).

**왜 못 잡았나 (근본원인)**
- 코드(엔진·테스트)가 `rebooking_source`를 당연히 있다고 가정했는데 마이그레이션이 안 됨 → **빌드·타입검사는 통과**(컬럼명은 문자열). 실DB 조회로만 드러남.
- 같은 기능이 두 디자인모드(legacy 기본 / premium 숨김)로 갈려 각자 다른 데이터원을 봄.

**어떻게 고쳤나**
- **증상**: `/api/portal/symptoms` 하나로 통합. `patient_user_id`(소유) **+** 본인 inquiry 해석(KPI 연결) 둘 다 저장, 조회는 `patient_user_id OR inquiry`로 견고화. **활성 화면(legacy)**만 연결. 이상치 감지(코디 알림)도 이 경로에 포함.
- **재진**: 정식 테이블 = `followup_schedules`(`/api/portal/followup`)로 통일. 활성 화면(legacy) 연결. 깨진 `consultation_sessions.rebooking_source` 참조 제거.
- 코디 메뉴를 실제 라우트로 정합(별건이지만 같은 점검에서 발견).
- ⚠️ **PO 정정(중요)**: premium 화면은 "나중 쓸까봐 남겨두고 **비활성**"이 의도 → 활성 화면에 재활용 금지. 처음엔 premium도 같이 배선했다가 **되돌려 손 안 댄 원본 그대로** 둠. 활성 = legacy 단일. → `PO_PREFERENCES`에도 누적.

**재발 방지 (시스템 적용)**
- 교훈: **DB 기능은 코드가 아니라 실스키마(`information_schema`)로 확인**한다. "엔진이 X 컬럼에 쓴다"는 코드는 그 컬럼의 존재를 보장하지 않는다.
- 후속(**2026-06-24 적용 완료**): 재진 엔진(`rebooking/create`)이 `consultation_sessions`에 써서 `followup_schedules`가 0행이라 환자 재진화면이 항상 비었던 휴면 상태 → **엔진이 정식 테이블 `followup_schedules`에 `status='proposed'`로 쓰게** 고침. inquiry에서 `cancer_type`(NOT NULL 충족)·`user_id`(→`patient_user_id`, 환자 노출키)를 끌어와 연결. **실DB 추가 단절 발견**: `followup_schedules_status_check`가 active/paused/completed/cancelled만 허용해 화면·포털API의 제안 어휘(pending/proposed/confirmed/dismissed)를 막고 있었음 → CHECK를 합집합으로 넓힘(가역 마이그레이션). 계약테스트도 새 테이블로 갱신. **교훈 보강**: 코드뿐 아니라 **CHECK 제약 어휘까지 실DB로 확인**해야 — 화면/API가 쓰는 status 값이 DB에서 허용되는지는 별개다.
- 교훈: 한 기능을 두 디자인모드로 가르면 데이터원이 갈리기 쉽다 — 서버 엔드포인트를 단일화(SoR)하고 화면은 거기에만 붙인다.

## #30 — 비영어(카자흐·러시아 등) 공개 페이지가 서버 렌더(SSR)에서 영어로 나가 구글에 영어로 색인됨 (2026-06-23)

**무슨 일**
PO가 사이트맵 점검 중 "카자흐/러시아 페이지가 영어로 보인다"고 의심. 실서버 SSR HTML을 직접 조회하니 `/kz/treatments`·`/ru/treatments`의 **암종 카드("Stomach Cancer" 등)와 본문이 영어**로 나가고 있었다. 데이터엔 6개 언어 번역이 다 있었는데도. 18개 클라이언트 컴포넌트가 공통으로 `const [lang,setLang]=useState('en')` + `useEffect(()=>setLang(getLangCodeFromCookie()))` 패턴 → **서버 렌더 시점엔 항상 'en'**, 진짜 언어는 브라우저 JS 하이드레이션 후에야 적용. 구글봇은 SSR HTML(영어)을 본다 → 비영어 페이지가 영어로 색인 = 핵심 타겟(카자흐·러시아) SEO 손해 + JS 느린 환경 유저는 영어를 봄.

**왜 못 잡았나 (근본원인)**
- `next build`·타입검사는 통과 — 문법은 멀쩡, 렌더 타이밍 문제라 빌드로 안 드러남.
- **이미 올바른 인프라가 있었다**: `useLang()`(LangContext) + layout이 `x-locale` 헤더로 `initialLang`을 SSR에 주입하는 구조. 그런데 컴포넌트들이 이 인프라를 안 쓰고 옛 쿠키-직접읽기 패턴을 각자 들고 있었음(점진 전환 중 누락).
- 클릭 테스트로는 안 보임 — 브라우저에선 하이드레이션 후 올바른 언어로 바뀌므로 사람 눈엔 정상. SSR raw HTML을 봐야만 드러남.

**어떻게 고쳤나**
- 17개 페이지 컴포넌트 + `src/components.jsx`의 `useLangCode()` 커스텀 훅을 **이미 있던 `useLang()`으로 교체**(폴링 setInterval 삭제). 새 코드·추상화 0, 순삭제.
- 검증: `next build` 통과 + **로컬 dev 서버 SSR raw HTML 직접 조회** — `/kz`=카자흐어("Асқазан"), `/ru`=러시아어("Рак желудка"), `/en`=영어 유지(대조군 안 깨짐) 확인.
- 제외 1개: `Toast.jsx` — ToastProvider가 LangProvider 상위(providers.jsx)라 구조상 useLang() 불가. 토스트는 클릭 후에만 뜨는 클라이언트 UI라 SSR 무관 → 가드에서 명시 면제.

**재발 방지 (시스템 적용)**
- `scripts/check-content-consistency.mjs`에 가드룰 추가: `setLang(getLangCodeFromCookie())` 안티패턴 검출 시 CI 실패(Toast.jsx만 allow). 렌더 언어는 `useLang()`, 쿠키 직접 읽기는 이벤트 시점(폼 제출)만.
- 교훈: **다국어 SSR 검증은 클릭이 아니라 `curl`로 raw HTML을 봐야 한다.** 브라우저는 하이드레이션 후라 항상 정상으로 보인다.
- 교훈: 올바른 공통 인프라(`useLang`)가 있으면 새 컴포넌트는 반드시 그걸 써라 — 컴포넌트마다 언어 읽기를 재구현하면 이런 누락이 쌓인다.
- ⚠️ 작업 사고: 이 수정의 마지막 3개 파일이 2분 자동저장 훅(`git add -A`)에 한 번 되돌려져 첫 커밋에서 누락 → 재적용. 멀티파일 작업 시 커밋 직후 `git show HEAD:<파일>`로 실제 포함 여부 검증할 것.

## #31 — 상담 초대·리마인더 이메일이 환자에게 한국어로 발송 + 계정환자엔 아예 미발송 (2026-06-24)

**무슨 일**
"코디가 상담 만들어도 환자 알림이 0"이라는 의심을 검증하다 두 가지를 발견. ①알림 자체는 작동(생성 모달이 `/invite` 자동호출 + 30분전 리마인더 크론) — 단 `inviteeEmail`이 토큰에 박혀야 함. ②**언어 버그**: 초대/리마인더 이메일 언어 게이트가 `role === "patient"`일 때만 환자언어를 쓰는데, 공용 모달은 통합링크를 `role: "guest"`로 발급한다 → 실제 운영 경로의 모든 환자(러·카)가 **한국어 초대·리마인더**를 받고 있었음. ③**구멍**: 코디가 문의 대신 "환자 계정"만 선택해 상담을 만들면 모달이 `inviteeEmail`을 안 채움 → 계정에 auth 이메일이 있는데도 초대·리마인더가 안 감.

**왜 못 잡았나 (근본원인)**
- 탐색 에이전트가 생성 라우트(POST)만 읽고 "알림 없음"으로 요약 → 공용 `CreateConsultationModal`이 생성 직후 invite를 호출하는 두 번째 단계를 못 봄. **요약만 믿고 1차 보고가 틀렸다**(직접 흐름 추적으로 정정).
- 언어 버그: 빌드·타입 통과(런타임 분기). `role` 값 불일치(`patient` 기대 vs `guest` 실제)는 코드만 보면 안 드러나고 실제 발송 메일을 봐야 보임.
- 이메일 미발송 구멍: 모달이 inquiry 경로에서만 이메일을 자동충전 — 계정-only 경로는 누락. 정상 경로(문의 기반)가 흔해 가려져 있었음.

**어떻게 고쳤나**
- `invite/route.ts`: `inviteeEmail` 비고 role이 patient/guest면 상담 `patient_user_id`로 auth 이메일 폴백(토큰 생성 *전*에 해소 → 리마인더 크론도 자동 수혜). ⚠️ 모달이 환자계정 미선택 시 patient_user_id를 요청자(코디) 본인으로 placeholder 채우는 함정 → `pid !== access.userId` 가드로 코디 자기발송 차단.
- 언어 게이트를 `patient || guest` → 환자언어로 교정 (invite + reminder 크론 양쪽 = 유사 2곳 전수).

**재발 방지**
- 교훈: **다중주체 흐름은 단일 라우트만 보고 단정하지 말 것** — UI 래퍼(모달)가 추가 단계를 호출하는지 끝까지 추적. 에이전트 요약은 출발점일 뿐.
- 교훈: 이메일/알림 언어는 `role` 분기에 의존하므로 발송 경로가 실제 쓰는 role 값(여기선 `guest`)을 확인해야 한다. 발송물 자체(메일 본문 언어)로 검증.
- ⚠️ 미검증: 폴백·언어 교정은 빌드·계약테스트로 확인했으나 **실제 계정환자 상담 생성→메일 수신 런타임은 미검증**(다계정 필요). prod 반영 후 확인 필요.

## #32 — 에이전시 의뢰 첨부서류를 코디가 못 봄 + 에이전시/환자 문의 구분 안 됨 (2026-06-24)

**무슨 일**
PO가 에이전시 계정으로 환자를 의뢰(첨부 5개 포함)했는데 코디 인박스에서 ①첨부 조회가 전혀 안 되고 ②에이전시 의뢰인지 환자 직접 접수인지 구분이 안 됨. 실DB 확인 결과 데이터는 멀쩡(문의 #20: `agency_id`=TEST 에이전시, `attachments` 5건 `inquiry/...` 경로)했으나 코디 화면까지 못 닿았음.

**왜 못 잡았나 (근본원인)**
- **상세 API(`/api/portal/inbox/[id]`)의 `DETAIL_FIELDS`에 `attachments`·`agency_id`가 누락** → 데이터는 있는데 API가 안 내려줌. 코디 상세 컴포넌트엔 첨부 렌더 UI 자체가 없었음.
- **서명URL 엔드포인트(`/api/attachments/sign`)가 admin 전용** — staff(코디)는 public 토큰도 없어 항상 400. admin 미리보기만 고려하고 코디 경로는 빠져 있었음(과거 admin 400 버그 고칠 때 staff까지 안 넓힘).
- 리스트 API도 `agency_id`를 안 내려줘 배지 표시 불가. 에이전시 백오피스(#330)는 의뢰 *생성*만 만들고 코디 *수신* 화면 연결은 누락(다른 세션·범위 밖).

**어떻게 고쳤나**
- 상세/리스트 API에 `attachments`·`agency_id`·`agencies(name)` 관계조인 추가 → `agency_name` 평탄화.
- `/api/attachments/sign`에 staff 분기 추가(`requirePortalAuth(staffOnly)`) — 코디·의사도 모든 문의 첨부 서명URL 발급.
- 코디 상세: 첨부 카드(클릭→서명URL→새 탭) + 접수주체 배지(🏢 에이전시 의뢰·에이전시명 / 🙋 환자 직접). 리스트: 행에 에이전시 배지.
- refer 라우트: `source: "agency_referral"` 채움(기존엔 NULL/"web"이라 "접수 경로"가 모호했음). 배지는 `agency_id` 기준이라 기존 데이터도 즉시 구분됨.

**재발 방지**
- 교훈: **데이터가 DB에 있는데 화면에 안 보이면 거의 항상 API SELECT 화이트리스트 누락** — `DETAIL_FIELDS` 같은 명시 select는 새 컬럼 추가 시 동반 갱신 필요(컬럼은 있는데 안 내려주는 함정).
- 교훈: 권한 헬퍼를 좁게(admin) 잡으면 staff 경로가 조용히 막힌다 — 공통 자원(첨부)은 staff 범위로.
- ⚠️ 미검증: 빌드·실DB(문의 #20 첨부 5건·조인)로 확인했으나 **코디 로그인→상세→첨부 클릭 열람 런타임은 미검증**(staff 계정 필요). prod/프리뷰에서 확인.

## #36 — 가입 화면이 중복 가입(이미 가입된 이메일)에도 "인증 메일 보냈어요"라고 거짓 안내 (2026-06-25)

**무슨 일**
PO가 출시 관문 1번(실메일 인증) 테스트 중 "메일이 안 온다(어제는 왔는데)"고 신고. Supabase auth 로그 확인 결과 마지막 이벤트가 `user_repeated_signup`(moon@immunelab.co.kr) — 즉 **어제 이미 가입된(미인증) 이메일로 오늘 또 가입**해서 새 메일이 안 나간 것. 그런데 가입 화면은 신규와 똑같이 "아래 주소로 인증 메일을 보냈어요"를 띄움 → PO는 오지 않는 메일을 무한정 기다림.

**왜 못 잡았나 (근본원인)**
- **`supabase.auth.signUp()` 결과를 신규/중복으로 구분하지 않음** — `_data.session`이 없으면 무조건 `setPendingEmail()` → "메일 보냈어요" 화면. 중복 가입 시 Supabase는 `_data.user.identities`를 **빈 배열 `[]`**로 돌려주는데 그 신호를 안 봤음.
- POSTMORTEMS #35의 그 뿌리("조용한 실패를 성공으로 위장") 그대로 — 에러를 안 던지고 정상 성공처럼 보이는 화면을 띄워 build·tsc 초록 통과, PO가 화면(안 오는 메일)에서 발견.

**어떻게 고쳤나** (`app/signup/SignupClient.jsx`)
- `const isExisting = _data?.user && Array.isArray(_data.user.identities) && _data.user.identities.length === 0;` 로 중복 감지.
- 중복이면 별도 안내 화면(`ALREADY_REGISTERED`, 6개 언어): "이미 가입된 이메일이에요 → 로그인하거나 비밀번호 찾기" + login 화면으로 보내는 버튼(비번찾기가 거기 있음).
- 신규(`identities` 있음)는 기존대로 "메일 확인하세요".

**재발 방지**
- 교훈: **메일/외부발송이 끼는 성공 화면은 "정말 보냈는지"를 결과 객체로 확인하고 분기하라** — `session` 유무만 보면 "안 보낸 성공"을 못 거른다. signUp은 `identities`로 중복을 알려준다.
- 비교: login의 비밀번호 찾기는 "보냈어요" 고정이 **의도된 동작**(이메일 존재 여부 노출 방지). 가입은 반대로 사용자에게 다음 행동을 알려줘야 하므로 구분이 맞다 — 같은 "보냈어요" 문구라도 맥락에 따라 정답이 다름.
- ⚠️ 미검증: 빌드·로그(`user_repeated_signup` 확정)로 근본원인 확인. **실제 중복가입 시 새 안내 화면 렌더는 프리뷰에서 시각검증 필요**(로컬 SSR 로그인 자동화 불가).
- 가드: 이 부류(외부발송 성공화면)는 content-consistency 정적룰로 잡기 어려움 — 코드리뷰 체크포인트로 남김.

## #37 — 이메일 인증은 되는데 자동 로그인이 안 됨 (가입 인증메일이 /auth/callback을 안 거침) (2026-06-25)

**무슨 일**
PO가 가입→인증메일 수신(✅ 발송 정상)→"이메일 인증하기" 클릭했으나 로그인 안 된 채 홈으로 떨어짐. URL = `healwith.co.kr/ko?code=<authcode>` — PKCE 인증코드는 받았는데 세션 교환이 안 됨.

**왜 못 잡았나 (근본원인)**
- `supabase.auth.signUp()`에 **`emailRedirectTo`를 안 줌** → 인증메일 링크의 `redirect_to`가 Site URL(홈 `/`)로 기본설정됨. 그래서 인증 후 `code`를 들고 홈에 떨어지는데, **홈은 code를 교환하지 않음**.
- 코드 교환 핸들러(`/auth/callback`, `exchangeCodeForSession`)는 멀쩡히 존재하고 OAuth는 이미 그걸 거쳐 잘 동작했음 — 가입 인증메일만 그 콜백을 안 거치게 배선돼 있었음(누락).
- 빌드·404로는 안 잡힘: 인증 자체는 성공(이메일 confirmed)하고 홈도 정상 렌더 → "로그인만 안 된" 조용한 실패.

**어떻게 고쳤나** (`app/signup/SignupClient.jsx`)
- `signUp` options에 `emailRedirectTo: ${origin}/auth/callback` 추가 → 인증메일 링크가 콜백을 거쳐 code→세션 교환→역할별 랜딩으로 자동 로그인.
- 콘솔/템플릿 변경 불필요(기존 콜백·PKCE 쿠키 인프라 재사용. /auth/callback은 이미 OAuth 허용목록에 있음).

**재발 방지**
- 교훈: **메일에서 돌아오는 인증은 반드시 code/token을 교환하는 라우트로 보내라** — `emailRedirectTo`를 안 주면 Site URL로 가서 "인증은 됐는데 로그인은 안 되는" 상태가 된다. OAuth와 메일 가입이 같은 콜백을 쓰는지 확인.
- ⚠️ 미검증: 빌드 통과·콜백 코드 검증·OAuth 동일 경로 동작으로 확신하나 **실제 가입→메일클릭→자동로그인 end-to-end는 배포 후 PO 재테스트로 확인 필요**(실메일·동일브라우저 PKCE 쿠키).
- 가드: 메일 확인 자동로그인은 실메일함이 필요해 E2E 자동화가 어려움 — 배포 후 수동 1회 + 코드리뷰 체크포인트.

## #39 — 이메일 인증 클릭 → 로그인 안 됨 (PKCE 인증링크를 메일 보안스캐너가 미리 소진) + 비번정책 서버/코드 분리 (2026-06-25)

**무슨 일**
#37로 인증메일이 /auth/callback(PKCE code 교환)을 거치게 했으나, 실제 클릭 시 `/auth/callback?error=no_code#error=access_denied`로 로그인 페이지에 떨어짐. auth 로그: `/verify` → **"One-time token not found" 403 "Email link is invalid or has expired"**. 일회용 토큰이 클릭 전에 이미 소진됨 = 네이버웍스/웍스모바일 같은 **회사메일 보안스캐너가 링크를 프리페치(GET)** 하며 일회용 OTP를 먼저 써버림(PKCE GET-verify 방식의 고질적 약점).

**왜 못 잡았나 (근본원인)**
- 인증 흐름이 **PKCE code 방식**(`{{ .ConfirmationURL }}` → `/auth/v1/verify` GET)이라, 서버 GET 한 번이 토큰을 소진 → 스캐너 프리페치에 그대로 당함.
- 해법용 `/auth/confirm`(token_hash·client verifyOtp) 라우트는 **이미 만들어져 있었으나**, 이메일 템플릿이 여전히 기본 ConfirmationURL을 써서 **그 안전한 경로로 안 보내고 있었음**(관문2 미완).

**어떻게 고쳤나**
- **이메일 confirmation 템플릿**(Supabase Management API로 PATCH): `{{ .ConfirmationURL }}`(2곳) → `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup`. /auth/confirm은 token_hash를 **브라우저 JS로만** verifyOtp → 스캐너(JS 미실행)는 토큰을 못 소진. 성공 시 쿠키세션 → 자동 로그인.
- **비밀번호 정책**(PO 결정: 영문자+특수문자): Supabase 서버 `password_required_characters`는 **자유입력 불가**(프리셋 3종: 없음 / 소+대+숫자 / 소+대+숫자+기호)뿐 → "영문+특수" 커스텀은 400. 그래서 **서버=`""`(요구문자 없음, 길이 8만)**, **실제 규칙은 클라이언트 코드가 강제**(8자+영문자+특수문자). 가입/비번재설정 두 화면의 `SPECIAL_RE`를 동일 문자셋으로 맞춰 "화면 통과인데 서버 거부" 불일치 차단.

**재발 방지**
- 교훈: **메일 인증은 token_hash + client verifyOtp(/auth/confirm)** 가 회사메일 스캐너에 강함. PKCE GET-verify는 프리페치에 소진된다. 발송물(메일)의 실제 링크가 어디로 가는지 확인.
- ⚠️ **서버 설정은 git에 없음**: Supabase auth 템플릿·`password_required_characters`·`password_min_length`는 대시보드/Management API 설정값이라 리포 복구로 안 돌아온다. 변경 시 이 문서에 기록(이 항목이 그 기록).
- ⚠️ 미검증: 서버 정책·템플릿 변경은 API GET으로 확인, 대문자없는 비번 서버 수락은 실가입으로 확인. **메일 클릭→자동로그인 end-to-end는 PO 재테스트로 확인 필요**(실메일 스캐너 통과).

## #38 — 협력병원 상세 FAQ가 비영어 페이지(ko 등)에서 영어로 노출 (i18n 미적용 기본값) (2026-06-25)

**무슨 일**
PO가 협력병원 상세(`/hospitals/[slug]`) 하단 "자주 묻는 질문"이 한국어 페이지인데도 영어("How do I get an estimate?" 등)로 뜬다고 발견(healwith.co.kr 실서비스).

**왜 못 잡았나 (근본원인)**
- `HospitalDetailLegacyClient.jsx`의 `defaultFaq`(DB에 `faq` 없을 때 폴백)가 **영어 문자열로 하드코딩**돼 `langCode`를 무시했다. 헤더("자주 묻는 질문")는 `t("detail.faq", langCode)`로 다국어인데, 본문 FAQ만 폴백이 영어 고정.
- DB `faq` 있는 병원은 정상이라 가려짐 — faq 미입력 병원(이대서울 등)에서만 드러남.
- 빌드·tsc로는 안 잡힘(문법 정상). i18n 패리티 검사도 i18n 파일 키만 보지 **컴포넌트 인라인 폴백**은 못 봄.

**어떻게 고쳤나** (`app/hospitals/[slug]/HospitalDetailLegacyClient.jsx`)
- `defaultFaq`를 6개 활성언어(ko·en·ru·kz·zh·ja) 인라인 맵 `DEFAULT_FAQ`로 교체, `DEFAULT_FAQ[langCode] || DEFAULT_FAQ.en` 선택. useMemo deps에 `langCode` 추가.
- 같은 파일 `PartnerHospitalClient.jsx`가 이미 쓰는 인라인 6언어 객체 패턴과 일치(i18n 거대파일 미수정, 사용처에 둠).

**재발 방지**
- 유사 스캔: hospitals·treatments 클라이언트에서 하드코딩 영어 question/answer 폴백 추가 검색 → 이 한 건 외 없음(확인).
- 교훈: **`t()` 안 거치는 사용자 노출 폴백 텍스트는 langCode 무시 = 비영어에서 영어로 샘.** DB값 폴백도 6언어로.
- ⚠️ 가드 시도→철회: content-consistency에 "인라인 `{ ko:, en: }` 맵이 6언어 다 있나" 룰을 넣어봤으나 **app/ 안에서만 264건 오탐** — 의사 실명·약력 등 **의도된 ko/en 이중언어 데이터**가 코드 전반에 퍼져 있어 UI 문자열과 자동 구분이 비현실적. 시끄러운 가드는 CI를 영구 적색으로 만들어 무가치 → 철회. 이 부류는 정적룰 대신 **코드리뷰 체크포인트**(사용자 노출 폴백은 6언어인지)로 남김. 다음 세션은 같은 광범위 가드 재시도 말 것.

## #39 — 다국어 누락 전수 점검: 쿠키창·공개배지·환자화면 14곳이 한 언어로 굳어 있었음 (2026-06-25)

**무슨 일**
#38(협력병원 FAQ 영어 노출) 직후 PO가 "비슷한 게 더 없냐"고 해서 공개+환자 화면 전수 점검. langCode를 무시하고 한 언어로 고정된 사용자 노출 텍스트 **14곳** 발견·수정.

**발견·수정 (6개 활성언어 ko·en·ru·kz·zh·ja로)**
- 쿠키 동의창(`src/components/CookieConsent.jsx`, 전 페이지 노출): 5문구 전부 영어 하드코딩 → 인라인 6언어.
- 병원 상세 "New" 배지 ×3 + "Loading reviews…", 치료 상세 "New" 배지: → `t("detail.new"/"detail.checkingReviews")`. (checkingReviews 키는 이미 6언어 존재했는데 안 쓰고 영어 리터럴로 박아둠.)
- 환자앱: chat 무제목 폴백 'AI Chat', documents·dashboard 상담유형 라벨(한/영 섞여 하드코딩)·이름 폴백 'Patient' → 6언어 맵.
- **환자 messages·calendar 화면은 COPY 객체가 en·ko 2개뿐**이라 러·카자흐·중·일 사용자에겐 화면 통째로 영어였음 → 4개 언어 풀 추가(+캘린더는 날짜/시간 로케일도 en-US 고정이라 6언어 로케일로). 핵심 타겟이 러·카자흐 환자라 영향 큼.

**근본원인 / 교훈**
- 같은 뿌리(#38): `t()` 안 거치는 사용자 노출 텍스트·폴백은 langCode를 무시한다. "기본값/폴백/로딩문구/배지" 같은 자투리가 영어로 새기 쉽다.
- 화면 단위로 COPY가 2개 언어만 정의된 경우, 깃발 꽂은 몇 글자만 고치면 `COPY[lang]||COPY.en` 폴백이 깨지거나 나머지가 영어로 남는다 → 화면 전체를 6언어로 채워야 진짜 수정.
- 가드: #38에서 정적룰은 의도된 ko/en 이중언어 데이터에 오탐나 철회함(자동화 불가). 대신 **코드리뷰 체크포인트(사용자 노출 폴백·배지·로딩·빈상태 문구는 6언어인지)** 로 남김.
- 스킵: `/stories`는 비활성(홈 리다이렉트) 죽은 페이지라 그 안의 영어 잔재는 의도적으로 안 고침.

⚠️ 미검증: 워크트리에 node_modules 없어 로컬 빌드 불가 → 빌드·런타임 검증은 PR Vercel 프리뷰+CI로. 번역 품질(특히 ru/kz)은 자동검사 대상 아님(인라인 COPY는 패리티검사 밖).

## #41 — 새 문의 종 알림 PR(#384)이 "AI 핸드오프 커버"라 했지만 AI챗 핸드오프엔 종이 안 울렸음 (2026-06-25)

**무슨 일**
- PR #384 설명은 "모든 문의 경로(**AI 핸드오프**/폼/에이전시) 자동 커버"라고 했는데, 실제로 종(`notifyStaffNewInquiry`)을 부르는 곳은 `sendAdminNotification`뿐이고 그건 `inquiries/step1·create·intake`·`agency/refer` 4곳에서만 호출됨. **AI 챗에서 환자가 '사람 연결'을 요청(handoff)하거나 자료를 올려 에스컬레이션되는 경로(`chat/stream`·`chat/message`)는 `chat_threads` 메타데이터만 갱신하고 알림을 안 불렀음** → 코디/어드민 종이 안 울림. 코디 인박스도 `inquiries` 기반이라 안 떠서, 어드민이 `/admin/chat` 모니터를 직접 봐야만 보였음.

**왜 못 잡았나 (근본원인 = #35 패턴 "조용한 성공 위장")**
- 빌드·테스트·머지 CI는 *코드가 도는지*만 봄 → "주장한 경로 중 하나가 실제로 알림을 부르는가"는 검사 안 함. PR 설명(주장)과 코드(실제)의 불일치를 막을 가드가 없었음.
- 자동저장 훅 사고로 #384가 급히 재구성·머지되며 경로 전수 확인이 누락됨.

**어떻게 고쳤나**
- `chat/stream`·`chat/message`의 escalate 분기에서 `notifyStaffChatHandoff`(신규, `inApp.ts`) 호출 → 어드민 종 알림(`/admin/chat` 링크).
- 스레드 metadata `hand_off_notified`로 **스레드당 1회만** 울리게 디듀프(자료 여러 번 업로드 시 도배 방지).
- ⚠️ 수신자 = **어드민만**. AI챗 모니터(`/admin/chat`)가 `requireAdminAuth` 전용이고 **코디는 AI챗 뷰 자체가 없음**(KNOWN_ISSUES에 별도 갭으로 기록) → 코디에게 보내면 열 화면이 없어 오해만 부르므로 실제 처리 가능한 어드민에게만.

**재발 방지**
- 유사 스캔: 종 발신(`notifyStaffNewInquiry`/`notifyStaffChatHandoff`) 호출처 전수 확인 — inquiries 4 + chat 2 경로 모두 연결됨.
- 교훈: **"모든 경로 커버"를 PR에 쓰면, 각 경로가 실제로 그 함수를 부르는지 grep으로 1:1 확인하고 써라**(주장≠코드). 특히 자동저장 훅으로 재구성된 PR은 경로 누락을 의심.

## #40 — AI챗 동의 게이트(#356)가 매일 챗 스모크를 조용히 깸 + 재방문자(쿠키)는 게이트 우회 (2026-06-25)

**무슨 일**
1. #356이 `/api/public/chat/start`에 동의 필수(`consent!==true`→400)를 넣었는데, **`scripts/smoke-chat.mjs`·`check-ai-behavior.mjs`의 startThread가 consent를 안 보냄** → 다음 cron부터 매일 챗 스모크가 빨강이 될 상태였음.
2. 동의 게이트가 **쿠키 없는 신규 사용자한테만** 떠서, 재방문자(쿠키 보유) + 게이트 도입 이전 시작 thread는 **동의 없이 계속 채팅** 가능(PO가 자기 쿠키로 보고 "게이트 안 뜬다"고 지적 — 실제로는 재방문자라 스킵된 것).

**왜 못 잡았나 (근본원인 = #35 패턴)**
- `chat-smoke.yml`은 **PR push가 아니라 cron(매일 18:30 UTC)** 트리거 → #356 PR의 CI(ci·Smoke)에 안 돌아서 **조용히 통과**. "PR 초록 = 안전" 가정의 사각지대(스케줄 잡은 PR을 안 막음).
- 동의 게이트를 "쿠키 유무"로만 판단 → 동의를 *기록*했는지와 무관하게 재방문자를 통과시킴(데이터가 아니라 쿠키로 분기한 실수).

**어떻게 고쳤나**
- 스모크 2개 startThread에 `consent:true` 추가(매일 스모크 복구).
- **서버 enforcement**: `/api/public/chat/stream`이 `metadata.consent.health_crossborder!==true`면 `consent_required` 403 → 클라 게이트 우회해도 메시지 처리 안 됨.
- `/api/public/chat/resume`가 `has_consent` 반환 → 클라가 **동의 기록 없는 기존 thread면 게이트** 표시. 신규 `/api/public/chat/consent`로 기존 thread 동의 백필.

**재발 방지**
- 유사 스캔: `/api/public/chat/start` 모든 호출부 전수(앱 2 + 스모크 2) — 전부 consent 전송 확인.
- 교훈: **cron-only 스모크/체크는 PR을 안 막는다 → 그 스모크가 의존하는 API를 바꾸면 같은 PR에서 스모크 호출부도 같이 고쳐라.** (PR 초록이 cron 적색을 가린다.)
- 교훈: **게이트는 쿠키가 아니라 "기록된 사실(동의 여부)"로 분기.**
