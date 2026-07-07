# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

---

## 🔖 세션 핸드오프 (2026-07-07 — 코디네이터 백오피스 전면 다국어(6개 언어) + 스태프 전용 언어쿠키 회귀수정·머지·배포 #678)

> PO 지시: "전반적인 백오피스 다국어가 제대로 안 됨. admin은 한글 유지, 에이전시·의료기관(해외)·코디네이터(외국인)는 다국어 꼼꼼히." 코디 포털은 다국어가 통째로 없었음(전 화면 한글 하드코딩). 별도 작업본(브랜치)에서 작업 → 합치기신청서(PR) #678로 본판(main)에 합침·실서비스 반영(배포). 중간에 자동검사(CI)의 E2E 테스트가 **진짜 회귀 버그 하나**를 잡아줌(아래 4·2번).

**1. 이번 세션 한 일** (전부 main 머지·프로덕션 배포)
- **PR [#678](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/678) ✅ 머지·프로덕션 자동배포** (origin/main 머지커밋 `c421f7a`). 코디네이터 백오피스 16개 화면을 **6개 언어(ko·en·ru·kz·zh·ja)**로:
  - 레이아웃·대시보드·인박스(목록+상세)·인테이크·상담일정·견적(목록+상세)·비자(목록+상세)·메시지·증상알림·AI상담리드 — 토스트·확인창·툴팁·표헤더까지 전부.
  - 공용 사전 `src/lib/i18n/coordinator.js`(key-first) + `useCoordinatorL`/`useDateLocale` 훅. 국적·암종·연락방법 라벨 헬퍼(`khidi/nationality.ts`·`medicalLabels.ts` 신규), 케이스단계는 기존 `caseStatusLabelL` 재사용.
- **어드민 공유 컴포넌트 언어인식화**: `admin/khidi/cases`(케이스보드)·`PartnerOutreachTracker`(파트너발굴) — 파일 안 로컬 TR + `useBackofficeLang`. **ko 원문 그대로라 어드민 화면은 글자 하나 안 바뀜**, 코디만 선택 언어로.
- **포털 공통 chrome**: `StaffPortalGate`(문지기 화면)·`ManualDrawer`(사용설명서 버튼·하단 문구) 6개어. **사용설명서 본문**은 `getManual(role, lang)`+`i18n` override(하위호환)로 코디·에이전시·의료기관만 5개어 번역(admin·hospital은 국내용이라 한국어 유지).
- **에이전시/의료기관 포털**(`PartnerPortal`)은 이미 6개어 완비 확인(렌더 한글누출 0). WhatsApp 발송 문구는 코디 언어→**환자 언어**(`preferred_language`)로 수정.
- **핵심 회귀수정(`5ef91a2`)**: 스태프 전용 언어쿠키 `healo_bo_lang`(기본 한국어) 신설.

**2. 왜 그렇게 했는지**
- **소비 패턴 3분리**(코디=공유사전 / 어드민공유=로컬TR·ko보존 / enum=공용헬퍼): 어드민 한글 유지하면서 코디만 다국어 달성하려고. 상세는 메모리 [[backoffice-i18n-pattern]].
- **스태프 전용 쿠키가 이번의 핵심**: `useLang()`은 언어쿠키 없으면 기본이 영어(en). 그런데 공개 사이트 미들웨어가 브라우저 언어(영어)로 `healo_lang=en` 쿠키를 심어서, 스태프 화면이 그걸 따라 **영어로 뜸** → ①한국인 어드민/코디가 영어로 보이는 회귀 ②한국어를 찾는 E2E 스모크 테스트 실패. → 스태프 화면은 `healo_lang`을 안 보고 **`healo_bo_lang`(기본 ko)만** 봄(`useBackofficeLang`, useSyncExternalStore로 하이드레이션 안전). 포털 상단 스위처가 두 쿠키를 다 세팅. 에이전시/의료기관(해외 대상)은 healo_lang(영어 기본)이 맞아 그대로 둠.
- 큰 파일은 병렬 서브에이전트로 변환하고 번역키는 내가 공용사전에 통합·빌드검증. 작업 중 main이 3번 전진 → 매번 재병합(예약시각 KST 헬퍼 `kstDate/kstTime`과 다국어 로케일 `dateLoc` 공존으로 충돌해소).

**3. 안 끝났거나 보류**
- ⏸ **언어 스위처 하이라이트 코스메틱(비차단)**: 스태프 화면에선 처음 언어를 한 번 고르기 전까지 상단 버튼의 "현재 언어" 표시가 공개 langCode를 보여줌(화면 본문은 정상적으로 한국어). 다음에 스위처를 스태프 lang 인지하게 다듬으면 됨.
- 내 작업 아님(별도 세션): [[coordinator-detail-display-gap]] — 코디 인박스 상세의 raw 키 노출·우선순위/동의 누락(유실 아님). 다른 세션 대기.

**4. 주의·함정**
- **스태프 백오피스(admin·coordinator) 화면은 `useLang()` 쓰지 마라 → `useBackofficeLang()`(`@/lib/i18n/coordinator`).** useLang은 공개 영어쿠키를 따라 스태프가 영어로 뜬다(이번 회귀 원인). enum용 lang 변수도 useBackofficeLang. 에이전시/의료기관(overseas)만 useLang/영어기본 유지.
- 코디 새 문자열 추가 = `coordinator.js`의 CT에 한 블록(6개어). 새 백오피스 화면 다국어 시 이 패턴 재사용.
- `intakes`의 DB저장 notes(`[코디네이터]…`)·`StaffPortalGate`의 미표시 `portalName` prop은 한글이지만 화면에 렌더 안 됨(의도).

**5. 다음 세션이 먼저 할 일**
1. ⚠️ **직전 미검증분 먼저 확인**: 코디/어드민 실브라우저 클릭검증은 미실시(로그인 필요, SSR쿠키 자동화 불가). E2E(스모크+Full)로 코디 화면 렌더 자체는 검증됨. 다음에 코디/에이전시 계정으로 Vercel에서 상단 언어 스위처를 눌러 **러시아어·카자흐어 번역·전환을 눈으로 1회** 확인 권장(핵심 타깃 언어 품질).
2. 스위처 하이라이트 코스메틱(위 3번)을 다듬을지 판단.

**6. 검증 상태**
- ✅ **PR #678 머지 확인**(origin/main `c421f7a`). CI **ci·Smoke Tests(PR)·Full E2E(main push)·Vercel 배포 전부 pass**(머지 직후 main HEAD `a92862f`의 Full E2E success 실측 확인). `npx next build --webpack`·`npm run check:content`·lint(0 error) 통과.
- ✅ 독립 자체검증: 훅 선언 누락 0·placeholder(`{n}` 등) 치환 정상·어드민 ko원문 바이트동일(cases/partners)·`L.<키>` 참조 누락 0.
- ⚠️ **검증 못 함**: 실브라우저에서 언어 스위처 눌러 각 언어 전환·번역 품질은 직접 안 봄(E2E가 한국어 렌더는 커버, 위 5-1로 승격).

**7. 다음 세션 첫 프롬프트**
> docs/PROJECT_CONTEXT.md 최상단 읽어. 코디네이터 백오피스 다국어(#678)는 머지·배포·전체E2E까지 끝났어. 스태프 화면은 이제 기본 한국어(healo_bo_lang 쿠키), 외국인 스태프는 상단 버튼으로 전환. 남은 건 미검증분: 코디/에이전시 계정으로 Vercel에서 언어 스위처 눌러 러시아어·카자흐어 번역·전환을 눈으로 1회 확인. ⚠️ 스태프 화면 다국어는 useBackofficeLang 써야 함(useLang 쓰면 영어로 뜸).

---

## 🔖 세션 핸드오프 (2026-07-07 — 어드민 새문의 종(bell) 알림 404 수리 + 알림링크 라우트 대조 가드 신설·머지·배포 #686)

> PO가 완전 진단해 넘긴 단일 버그: 새 문의 종 알림의 어드민 링크가 없는 상세 라우트(`/admin/inquiries/${id}`)를 가리켜 클릭 시 404. **2026-07-07 첫 실고객 #37에서 실제 발송됨.** 이메일 알림은 이미 목록으로 고쳐뒀는데 종 알림만 누락된 "한 곳만 적용된 표류" = #31 부류 재발. 알림 영역 전용 새 작업본에서 작업(로고 세션과 안 섞음).

**1. 이번 세션 한 일**
- **PR [#686](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/686) ✅ 스쿼시 머지·프로덕션 자동배포** (origin/main 머지커밋 `9454e28`). 3파일:
  - `src/lib/notifications/inApp.ts` — 어드민 종 알림 `link: /admin/inquiries/${id}` → **목록 `/admin/inquiries`** (문의번호는 알림 제목 `#N`에 이미 있음, 이메일 알림 `adminNotifier.ts`와 동일 정책). 함수 주석도 "상세→목록" 현실화.
  - `scripts/check-content-consistency.mjs` — **§14 알림링크404 가드 신설**: `src`·`app`의 `link:`/`link =` 내부경로를 실제 `app/` 라우트 트리와 정적 대조(없으면 CI 실패). `${…}`→동적세그먼트·쿼리제거·`[param]`/`[...]` 인식 + **Next 라우트 그룹 `(group)` 투명 통과**.
  - `docs/POSTMORTEMS.md` — **#73** 기록 (🔁 **#31 부류 재발**).
- **유사 스캔 전수**: 코드베이스 in-app 알림 링크 10곳 대조 → **끊긴 건 이 하나뿐**, 나머지 9곳(`/coordinator/inbox`·`/admin/chat`·`/patient/cost-estimates/[id]` 등) 전부 존재 확인.
- **독립 리뷰 게이트**: 작성 맥락 미공유 별도 subagent → 정합성 결함 0. 라우트 그룹 오탐 가능성 지적 → 하드닝 반영.

**2. 왜 그렇게 했는지**
- 상세 `[id]` 페이지를 새로 만드는 대신 **목록 링크(YAGNI)** — 이메일 알림과 정책 일치 + 문의번호는 제목에 있어 정보 손실 0.
- #31이 만든 404 가드(§4)는 `app/`의 `router.push`·`href`만 스캔 → 서버 알림 모듈의 `link:` 문자열은 사각지대였음. **뚫린 가드를 그대로 두지 않고** §14로 그 벡터를 메움(재발 추적 규칙: "새 가드만 얹지 말고 뚫린 가드를 보강").
- 라우트 그룹 투명 통과는 현재 트리엔 `(group)`이 0개라 동작 변화 없음 — 향후 App Router 리팩터 때 정상 링크를 헛-빨강 처리하는 것 예방(값싼 예방코드).

**3. 안 끝났거나 보류**
- 이 세션 자체 미완/보류 **없음**(단일 버그 완결).

**4. 주의·함정**
- **어드민 문의 상세 `[id]` 라우트는 여전히 없음** — `/admin/inquiries`는 목록 페이지만 존재. 새 코드에서 `/admin/inquiries/숫자`로 링크 걸지 마라(404). 상세가 필요하면 `app/admin/inquiries/[id]/page.jsx`를 먼저 만들 것.
- **§14 가드는 값이 `/`로 시작하는 `link` 리터럴만 검사** — `${baseUrl}…`로 조립되는 절대 URL 링크(예: `dispatch-reminders`의 `/consultation/${id}`)는 정적분석 밖 = 코드리뷰 몫(주석에 명시). 새 알림에 절대 URL 링크를 쓰면 가드가 못 잡으니 라우트 존재를 직접 확인.

**5. 다음 세션이 먼저 할 일**
1. ⚠️ **직전 미검증분 먼저 확인**: 종 알림 실브라우저 클릭검증은 미실시(로그인+실제 문의 필요, SSR 쿠키 자동화 불가). 다음에 어드민 계정으로 실제 새 문의 종 알림을 눌러 `/admin/inquiries` 목록이 열리는지 1회 확인(경위: 목록 페이지 자체는 매일 열려 정상 확인된 화면이라 위험 낮음).
2. ⚠️ **07-06 이전 미검증분 유지**: 다기기 화상 테스트(초대링크 **2026-07-10 만료** → 그 전에 진행) + LiveKit webhook 첫 수신(Vercel 로그 `[livekit/webhook]`).
3. 병원·에이전시 비활성 일원화 후속(#681 칩) 결과 확인.

**6. 검증 상태**
- ✅ **PR #686 머지 확인**(origin/main `9454e28` — `git show origin/main`으로 #73·inApp 수정 반영 실측). CI **ci·Smoke Tests(PR)·Vercel 배포 전부 pass**, E2E는 PR에서 정상 skip.
- ✅ `npx next build --webpack` 통과 / `npm run check:content` 통과(origin/main 리베이스 후 재확인) / 가드 자체 검증: 링크 재-破 시 `[알림링크404]` 검출·그룹중첩 라우트 오탐 0·없는 라우트 검출 유지 3종 확인.
- ⚠️ **검증 못 함**: 실브라우저에서 종 알림 클릭→목록 열림은 직접 확인 안 함(위 5-1로 승격). 링크 목적지 존재는 기계 대조로 확인됨.

**7. 다음 세션 첫 프롬프트**
> docs/PROJECT_CONTEXT.md 최상단 읽어. 어드민 종 알림 404(#686)는 머지·배포 끝났고 재발방지 가드(§14)까지 심었어. 남은 건 미검증분: ①어드민 계정으로 실제 새 문의 종 알림 눌러 /admin/inquiries 목록 열리는지 1회 확인 ②다기기 화상 테스트(초대링크 2026-07-10 만료 전) + LiveKit webhook 첫 수신 Vercel 로그. 이거부터 챙겨.

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
