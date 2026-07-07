# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

---

## 🔖 세션 핸드오프 (2026-07-07 — Sentry 연결 검증 + Sentry가 잡은 실버그 2건 수정·머지·배포 #693·#697·#698)

> PO가 Sentry(에러 감시 도구)에 로그인해 "뭘 확인해야 하냐" 물음 → 4개 이슈 트리아지 → 실버그 2건 고쳐 배포. **Sentry 켜둔 게 실제로 값을 함**(실브라우저에서만 보이던 크래시·hydration을 대신 잡아줌). 세션 앞부분의 알림 종(bell) 404 수정(#686)·그 핸드오프(#689)는 이미 별도로 머지·핸드오프됨 — 이 블록은 Sentry 파트만.

**1. 이번 세션 한 일** (전부 main 머지·프로덕션 배포)
- **Sentry 연결 상태 라이브 검증 + 문서 현행화** ([PR #693](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/693)): 문서가 엇갈려("미설정" vs "가동") 기억으로 답 안 하고 실측 — `healwith.co.kr` 프로덕션 HTML에 `sentry-trace`/`sentry-environment` 메타 + 응답 CSP에 `*.ingest.de.sentry.io` 허용 확인 → **프로덕션 실가동 확정**(DSN 리전=독일/EU). `EXTERNAL_SETUP_GUIDE §8`을 "가동 중"으로 교정.
- **어드민 병원·시술 관리 폼 크래시 수정** ([PR #697](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/697), POSTMORTEMS **#76**): Sentry `ReferenceError: AddressInput is not defined`(`/admin/hospitals`). `FormContent`가 컴포넌트를 `_AddressInput` 등 언더스코어(미사용 표시)로 받는데 JSX는 원래 이름 사용 → 스코프에 없어 폼 열면 크래시. 인자명 교정 + **`eslint.config.js`에 `react/jsx-no-undef: 'error'` 가드 신설**. 가드 켜자 **잠복해 있던 2번째 파일(`/admin/treatments` 시술 폼) 7건이 드러나** 같이 수리.
- **`/ru` 러시아 홈 Hydration 에러 수정** ([PR #698](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/698), POSTMORTEMS **#77**): `proxy.ts` 레거시 랜딩 분기(`LEGACY_SKIP`)가 `x-locale` 헤더만 박고 `healo_lang` 쿠키를 안 심어, 쿠키 없는 첫 방문자 서버=ru·클라=en 갈림. 일반 분기와 동일하게 쿠키 심도록 1줄 통일.
- **노이즈 2건**은 PO에게 mute 방법 안내만(AbortError=Archive 권장, `/consultation` promise rejection=영상방이라 지켜보기 권장).

**2. 왜 그렇게 했는지**
- Sentry 연결 여부를 **엇갈리는 문서로 답하지 않고 라이브 프로덕션으로 실측**(PO "검증 정직" 취향). 낡은 문서(드리프트)까지 그 결과로 교정.
- AddressInput: 없는 상세 페이지 신설(YAGNI) 대신 **근본 수정(인자명) + 가드로 재발 영구 차단**. `jsx-no-undef`를 `error`로 켜자 같은 부류 잠복 버그(treatments)가 자동 노출 → "가드가 값을 한다"의 실증.
- hydration: **작동 중인 일반 분기와 동일화(쿠키 set만 추가)** = 라우팅 불변·저위험. 미들웨어(전 요청 영향)라 독립 리뷰로 부작용 전수 확인.
- 두 수정 다 CLAUDE.md 독립 리뷰 게이트(작성맥락 미공유 subagent) 통과 후 자동머지.

**3. 안 끝났거나 보류 (PO "추가 작업은 메모만" — 착수 안 함)**
- ⏸ **Sentry 노이즈 코드 필터(미착수)**: `sentry.client.config.js` `beforeSend`에서 AbortError를 아예 안 보내게 필터 → UI에서 클릭 mute 안 해도 되고 무료 할당량 절약. **PO가 "노이즈 코드로 막아줘" 하면 착수.** 지금은 UI Archive 안내만 함.
- ⏸ **`<unknown>` promise rejection (`/consultation/:id` 영상방)**: 저신호(2건)라 하드 뮤트 대신 **지켜보기**. 늘면 LiveKit(화상) 실문제일 수 있어 조사. Sentry Events 추이 관찰.
- ⏸ **hydration E2E 가드(미구현)**: "쿠키 없는 레거시 로케일 라우트 로드 → hydration 경고 감시" E2E가 이 부류(프록시 분기 비대칭)의 진짜 그물인데 이번 범위 밖. #77에 후속 후보로 기록. 지금은 Sentry가 사후 그물.
- ⏸ **부차 잠복 #30**: `src/components.jsx:137` 렌더 중 `getLangCodeFromCookie()` 직접 호출(현재 `ClientShell`이 `langCode` prop 넘겨 무해하나, prop 안 넘기는 호출부 생기면 같은 hydration 갈림). `useLang()`로 이관 권장. #77 기록.

**4. 주의·함정**
- **`react/jsx-no-undef`가 이제 `error`**: 새 JSX 컴포넌트를 import/스코프 없이 `<Foo/>`로 쓰면 **lint 실패로 머지 차단**(정상 — 이 크래시 부류 방지). 새 컴포넌트는 반드시 import/props로 스코프에 두기.
- **불변식**: `proxy.ts`에서 `x-locale`를 주입하는 **모든** 분기는 `healo_lang` 쿠키도 같이 심어야 함(안 그러면 서버 렌더 언어 ≠ 클라 쿠키 언어 → hydration). 레거시 분기 주석에 박아둠.
- **로컬 typecheck 스테일 에러**: `next build` 직후 `.next/types` 재생성 전엔 `TS6053: file not found`(딴 페이지)가 뜰 수 있음 — 빌드 완료 후 재실행하면 0(기존 알려진 #675). 실코드 에러 아님.
- **auto-save 훅(2분마다 `git add -A` 커밋+푸시)**: 멀티파일 작업 중 커밋 메시지를 "작업 자동 저장"으로 가로챔 → 이번엔 `git commit --amend`로 제대로 된 메시지로 교정 후 push 함. 다음에도 커밋 확인 시 이 훅 유의.

**5. 다음 세션이 먼저 할 일**
1. ⚠️ **직전 미검증분 먼저 확인**: 두 수정의 **실효를 Sentry 대시보드에서 확인** — `AddressInput`·`Hydration(/ru)` 이슈의 Events 수가 배포(2026-07-07) 이후 **더 안 늘면 해결 확정**. (실브라우저 클릭 재현은 안 함 — 원인은 코드상 확정.)
2. ⚠️ **이전 미검증분 유지**: 다기기 화상 테스트(초대링크 **2026-07-10 만료** → 그 전에 진행) + LiveKit webhook 첫 수신(Vercel 로그 `[livekit/webhook]`).
3. (PO가 원하면) 위 3번 보류: Sentry 노이즈 코드 필터 / components.jsx #30 이관 / hydration E2E 가드.

**6. 검증 상태**
- ✅ **#693·#697·#698 전부 MERGED**(gh pr view 실측: state=MERGED, `ci`·`Smoke Tests(PR)`·`Vercel` 전부 SUCCESS, E2E는 PR skip). origin/main에 proxy 쿠키·HospitalManager 인자·jsx-no-undef 가드·POSTMORTEMS #76/#77 반영 실확인.
- ✅ #697: `npm run lint` jsx-no-undef **0**·전체 error **0**, `next build --webpack` 통과, 독립 리뷰 결함 0.
- ✅ #698: `next build --webpack`·`typecheck` **0**·`check:content` 통과, 독립 리뷰(미들웨어 부작용 전수 — Set-Cookie 타이밍·staff 별도 `healo_bo_lang` 격리·캐시/리다이렉트 무영향) 결함 0.
- ✅ Sentry 연결: 라이브 프로덕션 HTML 메타태그 + CSP `connect-src`로 "가동 중" 실측(2026-07-07).
- ⚠️ **검증 못 함**: 두 수정의 **실브라우저 재현**(어드민 폼 열기·`/ru` 첫 방문 hydration) 직접 안 함 — 원인은 코드상 확정 + 독립 리뷰로 방어, **Sentry Events 감소로 사후 확인 예정**(5-1로 승격).

**7. 다음 세션 첫 프롬프트**
> docs/PROJECT_CONTEXT.md 최상단 읽어. Sentry가 잡은 실버그 2건(어드민 병원·시술 폼 크래시 #697 / `/ru` 러시아 홈 hydration #698) 고쳐 머지·배포 끝났어. 먼저 ①Sentry 대시보드에서 그 두 이슈(AddressInput·Hydration) Events가 2026-07-07 배포 이후 안 느는지 확인(=실효 검증) ②다기기 화상 테스트(초대링크 2026-07-10 만료 전) + LiveKit webhook 첫 수신 Vercel 로그. Sentry 노이즈 코드필터·components.jsx #30 이관·hydration E2E 가드는 보류 상태니 내가 시키면 착수해.

---

## 🔖 세션 핸드오프 (2026-07-07 — 에이전시 공개폼 접수 가시성 버그: 로그인 에이전시 소속 자동 각인·머지·배포 #696)

> PO 지시: "로그인한 에이전시 유저가 **공개 웹폼**으로 문의를 넣으면 `inquiries.agency_id`가 NULL로 저장돼, 에이전시 포털에서 자기 문의·진행상황이 안 보인다. 접수 시 소속을 자동 각인해라. #37 백필은 하지 말고 forward-looking 로직만." → 합치기신청서(PR) #696으로 본판(main) 머지·실서비스 반영(배포) 완료.

**1. 이번 세션 한 일** (전부 main 머지·프로덕션 자동배포)
- **PR [#696](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/696) ✅ 스쿼시 머지·프로덕션 자동배포** (origin/main `7dcf881`, state MERGED).
  - **신규 `src/lib/auth/resolveAgencyIdForUser.ts`**: 로그인 `userId` → 활성 `agency_users` 멤버십에서 `agency_id` 조회(service_role, RLS 우회). 미소속·게스트·조회실패는 `null` → **접수 자체는 진행(fail-safe)**.
  - **`app/api/inquiries/step1/route.ts`**: 이미 Bearer 토큰으로 받던 `userId`로 각인, `inquiries` insert에 `agency_id` 추가(`user_id` 옆, 추가 조회 0).
  - **유닛테스트 `resolveAgencyIdForUser.test.ts`**(회귀 가드 4케이스): userId 없으면 조회 안 함 / 활성멤버면 id / 미소속 null / 조회 던져도 null.
  - **POSTMORTEMS #75** 기록 — #63 "경로별 규칙 드리프트" **🔁 재발**(#74 is_test와 같은 날 같은 `inquiries` insert 테이블 자매 사고).

**2. 왜 그렇게 했는지**
- **근본원인 = 접수 경로마다 `agency_id` 각인 규칙이 갈림**: 정식 의뢰 `/api/agency/refer`는 찍는데 **공개폼 `step1`만 누락**. 첫 실고객 #37(agency@test.com, "TEST 에이전시" 소속)이 정확히 이 표본 — 임시 stamp 시 포털에 #37+코디노트+타임라인 정상 노출(기능 멀쩡, 연결만 끊김).
- **살아있는 공개 insert 경로는 step1 하나뿐**이라 각인 지점 1곳이면 충분: `create`=410 Gone(사문), `intake`=기존 row UPDATE(step1 각인이면 커버), `normalize`=`normalized_inquiries`(다른 테이블). → 유사 스캔 전수 완료.
- **로직을 헬퍼로 뽑은 이유**: 라우트 본체는 rate-limit·암호화·auth 때문에 격리 유닛테스트 불가 → 조회만 순수 헬퍼로 분리해 테스트 가능하게.
- **독립 리뷰 지적 처리(멀티-에이전시 소속 edge)**: 리뷰가 "헬퍼에만 ORDER BY 추가"를 제안했으나 **채택 안 함** — 조회측 `checkAgencyAuth`도 동일한 무순서 `limit(1)`이라, 헬퍼가 그걸 **의도적으로 미러해야 각인==조회로 일치**한다(한쪽만 정렬하면 각인≠조회 divergence로 오히려 악화). 스키마상 `agency_id` nullable·FK `ON DELETE SET NULL`이라 insert 신규 실패 없음. `ponytail:` 주석으로 상한·업그레이드 경로 명시.

**3. 안 끝났거나 보류**
- ⏸ **라이브 E2E 미실시**: 실제 에이전시 계정 로그인→공개폼 접수→포털 노출은 로컬 자동화 불가(로그인 포털 SSR 쿠키 [[verify_authgated_portal]]). 배포 후 PO/다음 세션 스팟 확인 필요.
- ⏸ **(권장·범위 밖) 데이터 감시망**: "agency 소속 user_id로 접수됐는데 agency_id NULL"인 문의를, #690에서 붙인 일일 KPI 오염 감사 cron에 얹으면 미래 재발도 데이터에서 잡힘. 이번 PR엔 미포함.
- ⏸ **#37 백필 안 함**: 정식계정 이관 계획으로 별도 처리([[first-real-inquiry-37-migration]]). 이 PR은 forward-looking 로직만.

**4. 주의·함정**
- **새 `inquiries` insert 경로를 만들면 `agency_id`(로그인 에이전시면)·`user_id`·`is_test(accountEmail)`를 다 채워라.** step1이 참고 패턴. 이 셋은 "접수 경로가 각자 채우는 귀속/판정 필드"라 경로마다 빠지기 쉬움(#74·#75 자매 사고의 공통 근본원인 = 단일 SoR 부재).
- 접수 주체 배지는 `agency_id` 기준(있으면 "에이전시 의뢰", 없으면 "환자 직접 접수") → 각인되면 자동 정정(부수효과 정상). 배지 코드는 안 건드림.
- 세션 도중 worktree(`friendly-swanson-f6b6c0`)가 머지 후 삭제돼 origin repo로 전환됨. 이 핸드오프는 `claude/handoff-testdata-0707`(4 behind·stale)이 아니라 **origin/main 기준 새 브랜치**에서 작성(stale 브랜치에 쓰면 main 최신분 되돌릴 위험).

**5. 다음 세션이 먼저 할 일**
1. ⚠️ **직전 미검증분 먼저 확인**: 프로덕션 배포 완료 후 **에이전시 계정으로 로그인 → 공개 문의폼 접수 → `/agency`에서 그 문의가 바로 보이는지** 1회 확인(코드·유닛·CI·독립리뷰는 통과, 라이브 E2E만 미실시).
2. (선택) 위 3번의 "agency_id NULL 감시"를 일일 KPI 감사 cron에 추가.

**6. 검증 상태**
- ✅ **PR #696 스쿼시 머지 확인**(origin/main `7dcf881`, state MERGED). CI **Smoke Tests(PR)·ci·Vercel 배포 pass**. E2E 잡은 PR에선 skip(main push/cron 전용).
- ✅ 유닛테스트 4/4 · `npm run check:content` · `npx next build --webpack` 통과.
- ✅ 독립 리뷰 게이트(작성맥락 미공유 subagent): insert 신규 실패 없음·RLS 안전·게스트 경로 보존 확인, CONFIRMED 블로킹 결함 0(멀티-에이전시 edge는 상한 문서화로 처리).
- ⚠️ **검증 못 함**: 라이브 E2E(에이전시 로그인→공개폼→포털 노출) 미실시 → 5-1로 승격.

**7. 다음 세션 첫 프롬프트**
> docs/PROJECT_CONTEXT.md 최상단 읽어. 에이전시 공개폼 접수 가시성 버그(로그인 에이전시 소속 `agency_id` 자동 각인, PR #696)는 머지·배포됨. 먼저 프로덕션에서 **에이전시 계정 로그인→공개 문의폼 접수→`/agency`에 바로 보이는지** 1회 확인(코드·유닛·CI·독립리뷰 통과, 라이브 E2E만 미실시). ⚠️ 새 `inquiries` insert 경로를 만들면 `agency_id`·`user_id`·`is_test(accountEmail)`를 다 채워라(step1이 참고 패턴 — 경로별 각인 누락이 #74·#75 반복 근본원인). #37 백필은 하지 마(이관 계획 별도 [[first-real-inquiry-37-migration]]).

---

## 🧭 오전 다중세션 통합 정리 (2026-07-01) — 무엇이 배포됐고 / 무엇이 미머지로 남았나

> **왜 이 블록:** 오늘 오전 여러 창(병렬 세션)에서 각자 작업 후 각자 핸드오프 → 배포된 건 main·SoR에 잘 쌓였지만, **끝냈는데 아직 본판에 안 합친(미머지) 작업 3건**이 각 세션 브랜치에만 있고 이 SoR엔 기록이 없었음(=다음 세션이 놓칠 위험). 그 3건을 여기 한 곳에 모아 다음 세션 큐로 승격. (세부 이야기는 아래 오후·오전(2) 핸드오프 + `archive/`에 이미 있음 — 여기선 안 겹치게 '무엇이 남았나'만.)

**✅ 오늘 오전 실서비스(main·프로덕션) 반영 완료** — 다 머지·CI초록:
- **어드민 대청소** #555 (가짜숫자·가짜성공률 제거 / 병원 6곳 활성화 / 매칭 실작동 / 상담취소 실API / AccuracyPanel 실측)
- **병원 페이지** #554 의사사진 자체호스팅(핫링크 제거) + 토글 애니 · #559 신촌 의료진 현행화(27→28명)·실사진 · #565 토글 "밀림" pin 수정
- **콘텐츠 자체호스팅** #551 암종 카드/합병증 이미지(immunehospital 핫링크 제거)
- **비자** #549 체크리스트 계정동기화·러카 누적일수 · #552 PDF 톤 Premium→기본톤 교정
- **환자앱** #544 견적 상세페이지 6개어화(ko/en/ru/kz/zh/ja)
- **KHIDI 지표** #557 만족도 표본부족 env 스위치 · 유치 전환 대시보드 **채널별(유입경로) 분해** (migration 반영)
- **SEO** #547 BreadcrumbList·WebSite SearchAction 구조화데이터
- **디자인/정리** #560·#561 활성 디자인 명칭 'legacy'→'기본 톤' 개명 · #539 죽은 premium 이메일 시스템 삭제

**⚠️ 끝냈지만 미머지 — 다음 세션이 먼저 처리 (브랜치에만 있음, 안 잃게):**
1. **파트너 발굴 아웃리치 추적기** [PR #567 · 브랜치 `work/partner-outreach`] — 코디·어드민 백오피스 신규 기능(카자흐 직원 Assel이 파일 대신 백오피스에서 파트너 영업 추적). **완성 + 프로덕션 DB에 표 `partner_outreach`+시드 6곳 이미 적용.** 남은 것: ①프리뷰에서 화면 클릭 검증(후보추가·상태변경·탭필터·CRUD, 코디+어드민 둘 다) → 이상 없으면 **머지** ②Assel 계정에 코디네이터 권한 부여(`/admin/staff`). (큰 UI라 PO 눈으로 보고 머지하기로 했던 건)
2. **초청장 발급주체 = 등록 유치의료기관(병원) 명의** [PR #562 · 브랜치 `claude/kazakhstan-keta-config-ko4g7b`] — `VisaInvitationLetter.jsx`+`inviterHospitals.ts` 완성, 미머지. (같은 세션의 비자 정정 #535·541·549·552는 이미 머지됨 — #562만 남음.)
3. **이메일 수신률 문서** [PR #545 · 브랜치 `work/email-deliverability`] — `docs/EMAIL_DELIVERABILITY.md`(DMARC·콜드 아웃리치 플레이북). DMARC 감시 켜기·Google Postmaster 등록은 이미 실행(외부 완료). 문서라 CI 초록시 자동머지 대상.
- (추가 열린 검증) #565 토글 "밀림"은 코드·배포 반영됐으나 **실브라우저 스크롤 동작만 미검증**(검증환경 헤드리스라 눈으로 못 봄) — 오전(2) 핸드오프 6번 참조.

**🧹 정리해도 되는 브랜치(작업 이미 main에 반영 = squash 머지됨, 지워도 안전):** `claude/handoff-2026-07-01-am`·`handoff/admin-cleanup-0701`·`work/admin-backoffice`·`work/hospitals-roster-refresh`·`work/hospitals-toggle-ui`·`work/hospital-toggle-scroll-fix`·`claude/rescue-548-doctor-selfhost`·`claude/seo-audit-improvements`·`claude/inspiring-williamson-56fbfc`·`claude/patient-detail-i18n`·`claude/satisfaction-min-n-env`·`claude/fix-all-errors-sweep`·`claude/khidi-conversion-source-breakdown`·`claude/handoff-cancer-img-selfhost`. **남겨둘 것(미머지 작업 있음):** `work/partner-outreach`·`claude/kazakhstan-keta-config-ko4g7b`·`work/email-deliverability`.

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
- **"기본 톤"만 표준** (Airbnb 스타일: 흰 배경·teal-600·시스템폰트·rounded-xl). ※ 예전 "legacy 모드"를 **2026-07-01에 "기본 톤"으로 개명** — "legacy(옛날꺼)"라는 이름이 "premium으로 올려야지"라는 정반대 오해를 반복 유발해서. 이제 디자인은 하나뿐, 모드 토글 없음.
- **Premium 톤 폐기**: 검은배경·금색·serif·필름그레인 = "럭셔리 호텔" 느낌이라 PO·대표가 거부. 정부과제 성격과 안 맞음. **되살리기·재활용 금지 — 폐기된 옛 실험이지 업그레이드 아님.**
- PO가 가장 싫어하는 것: **"AI가 만든 느낌"** (큰 컬러원+큰아이콘, 똑같은 카드 반복, 이모지 도배, 의미없는 영문카피).
- 공개 페이지(/treatments·상세·/telemedicine·/faq·/hospitals/immune·404·500) 전부 기본 톤으로 재구성 완료. 옛 premium은 `*Premium.jsx` 잔재로만 존재(비활성, import 금지).

## 4. 주요 기능 현황 (라우트는 CLAUDE.md 참조)
- **통합 문의 퍼널 `/inquiry`**: 진입 시 AI Agent / Human Agent / Inquiry Form 선택. `/intake`·`/consult/start`는 여기로 통합(redirect). Human Agent = WhatsApp·Telegram·WeChat·LINE 4채널 — **실제 동작(2026-07-02 실측 정정): WhatsApp만 라이브(코드 폴백 wa.me, #73), 나머지 3채널은 env(`NEXT_PUBLIC_MESSENGER_*_URL`) 미설정이라 카드 자체가 숨김 처리**("준비 중" 표시 아님 — 미완성 인상 안 줌, 1채널뿐이면 picker 생략 직행).
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

## 6-1-b. 심층 리서치 결과 (2026-06-11) — `docs/archive/DEEP_RESEARCH_2026_06_11.md` 필독
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
