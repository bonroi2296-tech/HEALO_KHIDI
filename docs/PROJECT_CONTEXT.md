# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 4개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 5개째 쌓이면 가장 오래된 걸 거기로.
> ↳ **왜 2가 아니라 4인가(2026-07-21 상향)**: 병렬 세션이 하루 3개씩 핸드오프를 쓰면서 **당일 작업이 반나절 만에 창고로 밀려나** 다음 세션 시작 훅에 안 뜨는 일이 실제로 났다(머지 6건짜리 세션이 통째로 증발할 뻔함). 병렬 세션 수보다 넉넉해야 "오늘 것"이 남는다.

---

> **📌 중간 저장 (2026-07-24, i18n 오염 감사 세션 — [#961](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/961) 머지·배포)** — 제보 "ja 섹션에 인도네시아어 intake 키"는 **오진**(ja 전부 정상 일본어 — 비활성 id 섹션을 ja로 오독. 이 파일은 활성 6개 사이사이 비활성 15개 섹션이 있어 행 번호 감으로 판정 금지). 21개 언어 전수 스캔의 실오염 = **km(크메르)·my(미얀마) 사전이 통째로 인도네시아어 복사본**(언어 선택기에서 고르면 노출되던 상태) → 빈 사전으로 교체(t() 영어 폴백). ms=id 100%·uz=ru 98% 복사본은 상호이해 가능이라 유지+감사 주석. `check:content`에 **[i18n-스크립트] 가드 신설**(비라틴 문자권 섹션 값이 라틴-only면 실패 — 수정 전 파일 음성테스트 326건 정확 발화). 반성문 #115(🔁 #108 부류). ⚠️함정: PR 스모크 `agency-portal.spec`이 flaky(무관 브랜치도 동시 실패·같은 시각 main Full E2E는 통과 — 재실행 2번째에 초록. 원인 미규명 → 작업칩 발행).
>
> **📌 중간 저장 (2026-07-24, 백오피스 리뉴얼 세션 — 1~3단계 완료·배포)** — ①PO 방향 확정: **"모든 계층 백오피스 재설계부터"** → 설계는 전 계층 한 번에, 구현은 단계별. 전 계층 청사진 실측(권한 구멍 4건 → KNOWN_ISSUES). 로드맵 SoR = **`docs/ADMIN_RENEWAL_PLAN.md`**. ②시안 v2 아티팩트 — **용어는 IT 표준(번역투 금지) = PO_PREFERENCES 등재**. ③**2단계(메뉴 재편+비활성 hidden) [#945](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/945) + 3단계(통합 대시보드: 역할 카드 5 + 활동 피드, API `/api/admin/dashboard/overview`) [#955](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/955) — 둘 다 PO 프리뷰 실확인 후 지시로 머지·배포**. 독립 리뷰(2단계 CONFIRMED 3건 즉시 수리)·E2E 갱신·KHIDI §4 로그 기록. **다음 = 4단계 권한 수리(B 저위험부터)·5단계 파트너 확장(PO 판단)**. ⚠️함정: **PR이 main과 충돌(dirty)이면 GitHub가 PR용 CI를 아예 안 돌린다**(커밋 4개 CI 침묵의 실원인 — 병렬 세션 머지로 main 이동) → PR 침묵 시 mergeable_state부터. 애매 2화면(/admin/treatments·doctors)은 메뉴 유지 중 — 숨길지 PO 미결.
>
> **📌 중간 저장 (2026-07-24, 브랜치 정리 세션 — 설문 상태 실측 + PO 결정: D+ 케이던스 이식)** — ①낡은 원격 브랜치 정리: `deeptech-service-strategy`(#930 계열에 흡수)·`feat/coordinator-content-cms`(#918에 대체) 삭제, `rescue/local-uncommitted-20260716`는 보존. ②**설문 K-03 실측**: 수정은 이미 [#856](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/856)(7/21)으로 회수·작동 중 — 실DB 발송1(7/22)·**응답1** = 지표 살아있음(기억 메모 낡아 정정). ③**PO 결정: rescue 잔존분 중 D+ 케이던스 이식 승인** → [#948](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/948) **머지·프로덕션 배포 success 실측**(독립 리뷰 7건 중 6건 수리 후 — 중복 메일 폴딩·감시자 오탐/사각·제안 DB 유니크 2종 적용, 테스트 693 초록). ④응답 설문 1건(#39)= **PO 버튼 확인으로 테스트 확정 → is_test 도장**(K-03 실표본 0 = 정직 기준선). ⚠️함정: 앵커(followup_started_at)는 첫 cron 실행에 stamp → 기존 케이스도 D+7부터 시작(첫날 폭주 없음). rescue에 남은 미회수분 = caseStatus·에이전시 포털 등(흡수 여부 미감사).

> **📌 중간 저장 (2026-07-24, 코디 백오피스 세션 — 문의 전환 기준 실측·수리)** — PO가 텔레그램 실기기 테스트에서 "무기준 문의 전환"을 지적 → 실측으로 기준 확정: **문의(inquiries) 승격 = 환자 메시지 3턴마다 무조건**(잡담 "안녕?"도 등록 — 7/23 inquiry#40이 그렇게 생성) + **"상담원 연결"은 별개 트랙**(키워드 감지 → 코디 종·AI 침묵만, 문의 생성과 무관 → 1~2턴째 연결 요청이면 "접수됐어요"가 거짓이 되는 구멍). **PO 결정: 핵심 2개 수정 승인** = ①연결 요청 즉시 승격 ②잡담-only 승격 차단(의미 게이트). [#943](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/943)으로 구현(4채널 공통, `src/lib/chat/intakeGate.ts` 신규). ⚠️함정 발견(독립 리뷰 CONFIRMED → 해소): **intake 추출기(intakeExtract.ts)는 전부 영어 키워드**(성형 시절 잔재 nose·botox) — 신호만 믿으면 러·한 실상담 리드가 증발 → 게이트에 언어 불문 분량 폴백(12자+) 추가. 잔여 개선점(보류): AI 레드라인 때 "곧 연결해 드릴게요" 말하고 AI가 계속 답하는 불일치(7/23 17:22 실발생). — PO "정상 마무리 맞는지 정리해봐" 실측에서 **main 전체 E2E 7/21부터 3일 빨강 방치**를 발견 → 당일 수리 완료: [#939](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/939)(잘림 스캔 예산 — 사이트맵 194개 전수→/en만 · 병원상세 테스트 드리프트 · 실패이슈 dedupe 가드 · **postcss high 취약점 공고 긴급 패치**) + [#940](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/940)(스캔이 첫 완주하자마자 찾은 실결함 — **styled-jsx가 App Router에서 증발**해 모바일 법률 페이지 본문 109px 잘림, 4개 파일 수리 + `<style jsx` CI 가드). **main Full E2E cd69d47 = success 실측(7/21 이후 첫 초록)**, 프로덕션 privacy·terms 모바일 CSS 존재 curl 실측. 반성문 #112·#113. 중복 자동 이슈 117개 정리(#938 completed로 종결). **PO 조치 1건 남음 = KNOWN_ISSUES 최상단(E2E_ALERT_EMAIL 시크릿을 본인 주소로 — 실패 이메일 부활)**.

## 🔖 세션 핸드오프 (2026-07-24 — **i18n 사전 언어 오염 감사: 제보 오진 정정 + km·my 가짜 번역 제거 + 언어-스크립트 가드** 세션 종료)

> 병렬 세션(같은 날 백오피스 리뉴얼·브랜치 정리 세션과 다름). 만진 영역 = `src/lib/i18n/index.js`·`scripts/check-content-consistency.mjs`·`docs/POSTMORTEMS.md`. 시작 지시 = "ja(일본어) 섹션에 인도네시아어 값이 섞였다, 전수 스캔·정정하고 가드 검토해라".

**1. 이번 세션 한 일**

- **[#961](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/961) 머지 → 프로덕션 배포 success 실측** (main `534e9b6d`, Vercel status=success):
  - **km(크메르)·my(미얀마) 사전 삭제 → 빈 사전 `{}`** (370줄 제거). 두 섹션 값이 **통째로 인도네시아어 복사본**(97% 동일 + 나머지도 "크메르 단어 1개 + 인도네시아어" 기계치환 짬뽕)이었음. 이제 `t()`가 전부 영어로 폴백.
  - **ms(말레이)=id 100% 복사 / uz(우즈베크)=ru 98% 복사**는 상호이해 가능 언어라 유지하되 **감사 주석**으로 "정식 번역 아님" 명시. `LANG_OPTIONS` 낡은 주석("20개 언어 지원") 정정.
  - **`check:content`에 `[i18n-스크립트]` 가드 신설** — 비라틴 문자권 섹션(ko·ja·zh·ru·kz·mn·th·ar·hi·km·my) 값에 해당 문자가 하나도 없이 라틴 알파벳 6자 이상이면 CI 실패. 라틴 표기가 정상인 키(`login.emailPlaceholder`·`inquiry.messenger`)는 `SCRIPT_ALLOW` 화이트리스트.
  - **반성문 `POSTMORTEMS.md` #115** (🔁 #108·#38·#39 "다른 언어 노출" 부류 재발).
- **제보 자체가 오진임을 실측으로 규명** — ja 섹션(1506~2013행)은 전부 정상 일본어. 제보가 가리킨 2522~2529행은 **비활성 `id`(인도네시아어) 섹션 내부** = 정상값. 활성 6개 언어 전수 스캔 결과 **오염 0건**.
- **PR 스모크 E2E 차선 불안정을 실측 증거와 함께 별도 세션으로 이관** — 작업칩 발행 → PO가 시작 → 그 세션이 [#967](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/967)(로그인 역할당 1회로 공유 Supabase 포화 차단) 작성 중.

**2. 왜 그렇게 했는지**

- **가짜 번역 삭제 > 방치**: 읽을 수 없는 남의 언어를 보여주는 것보다 **영어 폴백이 정직**. km·my는 언어 선택기 "기타 언어"에서 실제로 고를 수 있어 노출 경로가 살아 있었다.
- **ms·uz는 남김**: 말레이↔인도네시아, 우즈베크↔러시아는 상호이해 가능(현지 통용) → 지우면 오히려 손해. 대신 "정식 번역 아님"을 주석으로 박아 다음 세션이 진짜 번역으로 착각하지 않게.
- **가드를 "문자 체계(스크립트)" 기준으로 짠 이유**: 라틴 문자권 언어끼리(en·vi·id·ms·es…)는 기계가 구분 불가 → 검사 대상에서 제외하고, 확실히 판정 가능한 비라틴 언어만 잠갔다. 음성 테스트(수정 전 파일 투입)로 **정확히 km 163 + my 163 = 326건 발화, 다른 섹션 오탐 0**을 확인한 뒤 채택.
- **관리자 우회 머지(admin merge)를 안 한 이유**: [#965](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/965)(문서 3줄)가 스모크 실패로 막혔지만, 가드를 우회하는 선례를 만드는 것보다 **차선이 고쳐질 때까지 대기**가 맞다고 판단.

**3. 안 끝났거나 보류**

- **[#965](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/965) 미머지(BLOCKED)** — 이 세션 핸드오프·중간저장 문서 PR. 내용은 문서 1파일뿐인데 **PR 스모크 E2E 차선이 2026-07-24 전반 불안정**해 6회 시도 전부 실패. **[#967](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/967)(차선 수리)이 머지되면 재실행 한 번으로 풀림.**
- **km·my 정식 번역** — 지금은 영어 폴백 상태. 우리 타겟(러·CIS·한·영·중·일)이 아니라 우선순위 낮음. 넣을지는 PO 판단.
- **가드의 알려진 미탐** — "해당 언어 문자 1개 + 나머지 남의 언어" 짬뽕은 통과한다(km/my에 22키 있던 형태). km·my를 비웠으니 지금은 실피해 0이지만, 다른 언어에 같은 유형이 유입되면 못 잡는다.

**4. 주의·함정** ⚠️

- **`src/lib/i18n/index.js`는 21개 언어 섹션이 한 파일에 있다** — 활성 6개(en·ko·zh·ja·ru·kz) 사이사이에 비활성 15개(vi·th·id·ar·es·fr·de·pt·hi·tl·mn·ms·km·my·uz)가 끼어 있음. **행 번호 감으로 "여기가 ja"라고 판정하면 틀린다**(이번 오진의 원인). 반드시 `grep -n "^  [a-z][a-z]: {"`로 경계부터 확인.
- **PR 스모크 실패 패턴 2종(조사용 실측 증거, [#965](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/965) 코멘트에도 기록)**: ①**재실행(`gh run rerun --failed`)만** `Timed out waiting 120000ms from config.webServer` 3연속(서버 기동 자체 실패) ②**로그인 필요한 백오피스 스모크만** 연쇄 30초 타임아웃(agency·clinic·consultation-create·coordinator-request-info) → job 15분 한도 초과. 비인증 테스트는 통과. 같은 시각 main Full E2E는 통과.
- **로컬 `main`은 다른 worktree(`HEALO_worktrees/hospital-info`)에 묶여 있다** — `gh pr merge`가 로컬 체크아웃 단계에서 에러를 뱉지만 **원격 머지는 정상 완료**됨(에러 메시지에 속지 말 것).
- 이 세션에서 `git add -A` 자동커밋 훅과 겹치지 않게 워드 임시파일(`~$...docx`) 잔재를 지웠음 — 작업 폴더는 깨끗한 상태.

**5. 다음 세션이 먼저 할 일**

1. ⚠️ **직전 미검증분 먼저 확인**: **km·my 실화면 폴백 확인** — 프로덕션에서 언어 선택기 "기타 언어" → 크메르어/미얀마어를 골랐을 때 **인도네시아어가 아니라 영어로 뜨는지** 실제 클릭. (코드·빌드·배포 success까지는 실측했으나 **그 언어를 골라 화면을 본 적은 없음**.)
2. **[#967](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/967) 머지 후 [#965](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/965) 스모크 재실행 → 머지** (문서 PR 회수).
3. (후순위) km·my 정식 번역 여부 PO 판단 / 가드 짬뽕 미탐 보강("문자 비율" 기준 추가 검토).

**6. 검증 상태**

- ✅ **[#961](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/961) 머지 + 프로덕션 배포 success 실측** — main `534e9b6d` Vercel status=success (gh api commit status). `https://www.healwith.co.kr/en` 308(언어 리다이렉트=정상 서빙).
- ✅ `npm run check:content` 통과 / `npx vitest run` **697개 전부 통과** / `npx next build --webpack` 성공 / `node --check` 문법 OK.
- ✅ **가드 음성 테스트**: 수정 전 파일(origin/main)에 새 가드 로직 투입 → km 163 + my 163 = **326건 정확 발화**, 다른 비라틴 섹션 오탐 0. 수정 후 0건 = 가드가 no-op 아님을 입증.
- ✅ **독립 리뷰**(작성 맥락 모르는 별도 에이전트) — 정합성 결함 **0건**. 확인 항목: 빈 사전에서 `t()` 영어 폴백 실동작(vm eval), `DICTIONARY`/`LANG_OPTIONS` 소비처 전수, 삭제 범위(잔존 섹션 값 변형 0), 가드 섹션 경계 파싱.
- ❌ **미검증**: **km·my를 실제로 선택했을 때의 화면**(배포는 확인했으나 그 언어로 클릭 안 함) → 5번 1항으로 승격. 또한 **[#965](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/965)는 스모크 미통과 상태로 열려 있음**(문서 PR, 서비스 영향 없음).

**7. 다음 세션 첫 프롬프트**

> 먼저 `docs/PROJECT_CONTEXT.md` 최상단 핸드오프 읽어. ①프로덕션에서 언어 "기타" → 크메르어·미얀마어 골라서 인도네시아어 대신 영어로 뜨는지 실제로 확인해라(#961 배포분 미검증). ②#967(E2E 차선 수리) 머지됐으면 #965 스모크 재실행해서 문서 PR 마저 합쳐라. ③그 다음은 물어봐.

## 🔖 세션 핸드오프 (2026-07-23 — **전 화면 콘텐츠 편집 CMS 완성 + 한글 바로수정·하드코딩 우회 가드** (+ SEO 색인·암종별 키워드) 세션 종료)

> 별도 병렬 세션(위 딥테크/텔레그램 세션과 다름). 코디가 **화면별 모든 텍스트를 6개어로 직접 고치는 편집기**를 완성·배포하고, 후속으로 한글 편집성·하드코딩 우회 가드를 붙인 세션. 만진 영역 = `app/coordinator/content`·`src/lib/i18n`·`src/lib/content`·`scripts/check-content-consistency.mjs`.

**1. 이번 세션 한 일** (PR 전부 머지·프로덕션 배포 — 저위험 자동머지, 코드 PR 독립 리뷰 통과)

- **전 화면 콘텐츠 편집 CMS 완성·머지** — [#918](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/918): 코디가 홈+전 화면 문구를 6개어로 수정하는 편집기(`/coordinator/content`). 구조 = 중앙 사전 `t()` 오버라이드 훅 + `content_overrides`·`content_change_log` 테이블 + 검색기반 편집기(고정 편집언어·줄 펼치면 6개어). **기존 백오피스 유지·추가**(갈아엎기 아님 — PO 확인). 옛 홈-only MVP [#910](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/910)은 이걸로 대체돼 CLOSED.
- **후속 [#932](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/932) 머지** — ①편집기에서 한국어가 회색 "원문"(읽기전용)으로만 보여 수정 못 하는 것처럼 보이던 것 → **입력칸으로**(기준어 ko + 편집어 둘 다 그 자리서 바로 수정) ②공개 화면에 **새 인라인-L 미니사전**(`const L={...ko/ru...}`)이 생기면 CI가 차단하는 가드(중앙 사전 `t()`를 우회해 편집기에 안 잡히는 문구 예방 — 기존 `[환자i18n]` 검사의 탈출구를 메움). 기존 공개 인라인-L **5개**(claim·hospitals·patient chat/dashboard/symptoms)는 grandfather.
- **(세션 전반부) SEO** — Search Console 전 탭 점검 → ru/kz 深페이지 **색인 요청** + 암종별 키워드 정리. 곁들여 [#904](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/904)(한방 페이지 메타 언어별 로컬라이즈)·[#897](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/897)(hospitals 카드 → 크롤 가능한 `<Link>`) 머지.

**2. 왜 그렇게 했는지**

- **CMS = 중앙 사전 오버라이드 방식**: 문구를 컴포넌트에 하드코딩하면 편집기에 안 잡힌다 → "사전에 키 넣고 `t()`로 렌더"가 표준이어야 새 문구가 **자동으로** 편집 대상이 됨(`searchI18nKeys`가 사전 전체를 훑음). 그래서 인라인-L을 CMS 우회로로 규정하고 가드로 막음(PO 요청: "앞으로 텍스트 추가하면 편집기에 차곡차곡 쌓이게").
- **한국어 "원문"을 입력칸으로**: 기본 편집언어가 러시아어라 ko가 참조로만 보였음 → PO "한글도 수정할 수 있게". `span`→`input` 최소 변경(2줄 아래 기존 input 패턴 복제)으로 해소.
- **러시아어 카피는 PO가 직접**: PO가 내 러시아어 번역 실력을 못 믿음(명시) → 내가 러시아어 마케팅 문구를 창작하지 않고, PO가 편집기로 직접 적용하는 구조가 정답.

**3. 안 끝났거나 보류**

- **PO 러시아어 홈 카피 실제 적용** — 편집기로 PO가 직접(또는 다음 세션이 PO가 준 문구를 입력) = 미착수.
- **인라인-L 5개 중앙 사전 마이그레이션**(claim·hospitals·patient 3종) = Phase 2 보류(grandfather 상태). 인라인 텍스트 쓰는 컴포넌트 ~9개도 Phase 2.
- 이 둘은 급하지 않음(가드가 신규 유입만 막고, 기존은 이미 번역돼 동작).

**4. 주의·함정** ⚠️

- **가드는 변수명 `L`만 매칭** — `const DICT={...}`·`COPY` 등으로 이름 바꾸면 우회됨(독립리뷰 PLAUSIBLE 관찰). 실제 사람들이 복사하는 건 홈의 `L` 패턴이라 현실적으론 잡히나, 필요하면 변수명 집합을 넓혀라.
- **편집기는 코디 로그인(SSR 쿠키) 뒤** → 로컬/프리뷰 자동 로그인 불가(기억 `verify_authgated_portal`). 실제 타이핑→저장→반영 **클릭 검증은 PO/사람만 가능**.
- **빈 값 저장 = 오버라이드 삭제(기본값 복원)** — 칸을 비우면 그 언어 오버라이드 행이 지워지고 원문으로 돌아감(의도된 동작).
- 로컬 `main`은 다른 worktree(`HEALO_worktrees/hospital-info`)에 묶여 이 폴더서 `git checkout main` 불가 — `gh pr merge`의 로컬 체크아웃만 에러 나고 **원격 머지는 정상**(기억 `local-git-autosync-setup`).

**5. 다음 세션이 먼저 할 일**

1. ⚠️ **직전 미검증분 먼저 확인**: **편집기 실클릭** — 코디로 로그인 → `/coordinator/content` → 문구 검색 → **한글 칸에 타이핑 → 저장 → 해당 화면에 실제 반영되는지** 확인. (코드·빌드·배포 success·라우트 서빙까지는 실측했으나 **UI 실클릭은 못 함** — 로그인 게이트.)
2. PO가 준 러시아어 홈 카피를 편집기로 적용 지원.
3. (후순위) 인라인-L 5개 + 인라인텍스트 ~9개 `t()` 마이그레이션(Phase 2).

**6. 검증 상태**

- ✅ **(2026-07-24 중간 저장) 5번 1항 "편집기 실클릭" = PO 실사용으로 검증 완료** — 수정→저장→홈 실반영 확인(러 제목 «Почему именно Корея?»). 그 과정에서 발견 2건(①고친 문구로 재검색 불가 ②여러 줄·카드 문구 편집 불편/미등록) → 별도 세션(work/cms-editor)이 [#944](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/944)로 수리(반성문 #114, 홈 레지스트리 자동화 포함).
- ✅ **#918·#932 머지 + 프로덕션 배포 success** — Vercel 커밋 `a23a584a` status=success **실측**(gh api commit status). #910 CLOSED. 라우트 서빙 실측: `/coordinator/content` → 307 `/login?redirect=…`(게이트 정상=배포 라이브), 홈 → 308 `/en`(언어 리다이렉트).
- ✅ **CI**: 양쪽 PR `ci`·`Smoke Tests`(E2E) 초록. #932 **독립 리뷰**(작성 맥락 모르는 별도 에이전트) = 정합성 결함 0(PLAUSIBLE 관찰 3건은 비차단). **가드 실동작 실측**: 임시 공개파일에 인라인-L 심으니 `[인라인사전]` 에러로 CI 실패 → 제거 후 통과.
- ✅ `npx next build --webpack`·`npm run check:content` 통과.
- ❌ **미검증**: 편집기 **실제 타이핑→저장→화면 반영 클릭 테스트**(코디 로그인 필요·자동화 불가 — PO 차례). → 5번 1항으로 승격.

**7. 다음 세션 첫 프롬프트**

> 먼저 docs/PROJECT_CONTEXT.md 최상단 읽어. 전 화면 콘텐츠 편집 CMS(#918)+한글 바로수정·인라인-L 우회 가드(#932)가 머지·배포됐다(기존 백오피스 유지·추가). ⚠️미검증 먼저: 코디로 로그인해 /coordinator/content 열고 문구 검색→한글 칸에 타이핑→저장→그 화면에 실제 반영되는지 실클릭 확인. 그다음 PO가 준 러시아어 홈 카피를 편집기로 적용. 🚫 함정: 공개 화면 문구는 반드시 중앙 사전(t())으로 넣어야 편집기에 잡힘(하드코딩·인라인-L은 CI가 막음, 단 가드는 변수명 L만 매칭) · 편집기는 코디 로그인 뒤라 자동화 검증 불가 · 빈 값 저장=오버라이드 삭제(원문 복원).

---

## 🔖 세션 핸드오프 (2026-07-23 — **딥테크 전략 확정 + 텔레그램 봇 완전 개통 + 왓츠앱 준비 + 시차 배지** 세션 종료. PR 8개 머지)

> 딥테크 질문에서 시작해 텔레그램 봇을 실기기 E2E까지 개통하고 왓츠앱을 예열해 둔 세션. 앞서 이 세션이 남긴 「중간 저장」 블록을 이 정식 블록으로 대체함.

**1. 이번 세션 한 일** (PR 전부 머지·프로덕션 배포 — 자동머지, 코드 PR은 독립 리뷰 통과)

- **딥테크 전략(PO 확정)**: 엣지 = **"치료 여권(Treatment Passport)" — 국경간 치료 연속성 인프라**(전: EMR특허 10-2745881 / 중: LiveKit 원격협진 / 후: 경과기록). AI 안전계측·자기학습·6개어는 구성요소로 강등. 1단계 구현은 별도 세션에 위임(trigger 발사, 2026-07-23 05:27Z).
- **텔레그램 봇(@healwith_bot) 완전 개통** — [#905](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/905) 웹훅·동의 게이트·멱등 + Gemini 별칭 세대교체 전면 장애 복구(생존 사다리, POSTMORTEMS #110) · [#914](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/914) `**` 마크다운 평문화 + 성동점 hospitals 행(실DB) · [#916](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/916) 구어체 회귀 6종(colloquial, 실DB) · [#919](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/919) RAG trust_tier 근본수리(POSTMORTEMS #111) · [#921](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/921) Human Agent → WhatsApp·Telegram 선택 화면 · [#927](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/927) 재입장 /start 한 줄 인사+60초 스로틀 · [#930](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/930) 접수 멘트 채널 인지("이 채팅으로 연락드립니다")+WeChat·LINE 제거+딥링크 소거.
- **왓츠앱 봇 전체 연동 준비** — [#933](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/933): 웹훅(서명 HMAC·동의 버튼·wamid 멱등·배치 전수 처리)·아웃바운드(24시간 창 131047 감지)·언어 추정(전화 국가번호, +7 대역 카자흐/러시아 구분)·어드민 릴레이·집계(messenger_whatsapp)·인덱스(실DB 적용). **env 4개만 채우면 켜짐** — 절차 = `docs/WHATSAPP_BOT_SETUP.md`.
- **환자 현지 시각 배지**(#933 동봉) — `/admin/chat`에 🕓 현지 시각 / 🌙 심야(22~08시) 배지 + 말풍선 미전달 표시(failed·window_expired). 신호: 웹=브라우저 tz(정확) > 왓츠앱=국가번호 > 텔레그램=언어 추정.
- **실기기 E2E(PO)**: 동의→환영 1회·AI 답변(별표 없음·성동점 포함 4지점)·재입장 한 줄 인사·어드민 답장→텔레그램 수신(어시가 admin API 실호출로 실증)·사람 연결 시 AI 침묵 — 전부 통과.

**2. 왜 그렇게 했는지**

- **치료 여권으로 피벗**: PO가 언어·카자흐 특화 엣지를 "시장이 좋게 볼까?"로 기각 → KHIDI 정성지표(사전상담·사후관리 체계)와 시장 엣지가 **같은 물건**이라는 정합성이 결정타.
- **성동점 누락의 진범**: hospitals 행 추가만으론 안 됨 — ①RAG 재색인 누락 ②ingest 가 trust_tier 미명시(기본값 3=공개수집)라 검색 순위에서 밀림. #48 때 데이터만 고치고 코드를 안 고친 것의 재발(#111) → 코드가 등급 명시 + 자기치유.
- **/start 소거**: 텔레그램 프로토콜상 신규 1회는 불가피, 재입장 /start 는 링크의 ?start= 표식 제거로 소거(유입 구분 utm 포기 — 채널 기록은 유지).
- **왓츠앱을 지금 예열**: PO "준비해봐, 인증은 내일" — Meta 사업자 인증(며칠)이 유일한 대기 구간이라 코드를 먼저 완성해 인증만 끝나면 켜지게.

**3. 안 끝났거나 보류**

- **왓츠앱 개통 대기**: 2026-07-24 PO가 Meta 절차(비즈니스 계정→사업자 인증→번호→토큰→env 4개) 진행 예정. **번호 전략 미결**(A안 새 번호 권장 vs B안 기존 010 전환) — PO 결정 필요. E2E 전 `WHATSAPP_TEST_WA_IDS`에 테스트 번호 등록 필수(집계 오염 방지).
- **구어체 이해력 개선**(과잉 에스컬레이션) — 감시는 colloquial 회귀 6종이 매일 하지만 근본 개선(프롬프트·detectHandOff 점검)은 백로그(KNOWN_ISSUES 2026-07-23 항목).
- 치료 여권 1단계 = 위임된 별도 세션 담당(이 세션 범위 아님).

**4. 주의·함정** ⚠️

- **hospitals/treatments 에 직접 SQL 로 행 추가하면 `/api/rag/ingest`(admin)를 그 source_id 로 같이 호출할 것** — 자동 동기화 없음(POSTMORTEMS #111). admin API 실호출은 `admin@test.com` Bearer 토큰으로.
- **텔레그램 링크에 `?start=` 딥링크 금지**(재입장마다 /start 노이즈 — siteSettings.js 주석·TELEGRAM_BOT_SETUP.md 갱신됨).
- 코디가 어드민에서 답장하면 그 메신저 방은 `coordinator_active` = **AI 영구 침묵**(resolve 후 새 스레드부터 AI 재개). PO 텔레그램 테스트 방(fcd0aea1)이 지금 이 상태 — 봇 AI 재테스트하려면 플래그 해제 필요.
- 왓츠앱 24시간 창: 환자 마지막 메시지 후 24시간 지나면 어드민 답장이 `window_expired`(말풍선에 표시됨) — 환자가 다시 말 걸어야 열림(v1 은 템플릿 재개 미지원).

**5. 다음 세션이 먼저 할 일**

1. ⚠️ **직전 미검증분 먼저 확인**: ①`/admin/chat` **현지 시각 배지 실화면**(배포는 READY 확인, 화면 실클릭은 안 함 — 텔레그램 대화에 🕓 배지 뜨는지) ②텔레그램 **"상담원 연결" 새 문구 실기기**("이 채팅으로 연락드립니다" — 코드·계약테스트·배포까지만, PO 실기기 재확인 대기) ③`/admin/khidi/conversion`에 Telegram 행(3턴+ 승격 쌓인 뒤).
2. **왓츠앱 개통 지원**(PO가 Meta 인증 진행 시): `docs/WHATSAPP_BOT_SETUP.md` 따라 안내 + 번호 전략(A/B) 버튼으로 확정 + env 등록 후 E2E.
3. 구어체 이해력 개선 착수 여부는 colloquial 회귀 첫 점수 보고 판단.

**6. 검증 상태**

- ✅ 이 세션 PR 8개(#905·#914·#916·#919·#921·#927·#930·#933) **전부 머지 + 프로덕션 배포 READY 확인**(마지막 #933 = commit 35f4770). CI 초록(중간 Smoke 빨강 1회는 agency-portal 플레이키 — 재실행 통과). 코드 PR 은 전부 독립 리뷰 통과(발견 결함 즉시 수정: #919 자기치유 범위, #930 문서 드리프트, #933 배치 유실·maxDuration).
- ✅ 실측: 텔레그램 실기기 E2E(위 1번 목록) · 프로덕션 웹챗 재현(성동점 4지점) · 번들 grep(딥링크 소거) · 어드민 답장 API 실호출(delivery=sent).
- ✅ vitest 654 · tsc · check:content · next build 통과(마지막 커밋 기준).
- ❌ **미검증**: /admin/chat 시각 배지 실화면 미클릭 · "상담원 연결" 새 문구 실기기 미확인(PO 차례) · 왓츠앱 전체(Meta 미인증 — env 없으면 웹훅 안전 무시 확인만).
- 열린 내 PR: 0 (이 핸드오프 PR 제외). 다른 세션 PR 미확인.

**7. 다음 세션 첫 프롬프트**

> 먼저 docs/PROJECT_CONTEXT.md 최상단 읽어. 텔레그램 봇은 완전 개통됐고(PR 8개 머지·배포) 왓츠앱은 코드만 완성 상태다. ⚠️미검증분 먼저: ①/admin/chat 열어 환자 현지 시각 배지(🕓/🌙) 실화면 확인 ②PO 텔레그램 실기기로 "상담원 연결" 새 문구("이 채팅으로 연락드립니다") 확인. 그다음 PO가 Meta 인증 진행하면 docs/WHATSAPP_BOT_SETUP.md 절차로 왓츠앱 개통 지원(번호 전략 A/B 버튼 확정 + WHATSAPP_TEST_WA_IDS 등록 필수). 🚫 함정: hospitals 직접 SQL 추가 시 /api/rag/ingest 같이 호출(#111) · PO 텔레그램 테스트 방은 coordinator_active 라 AI 침묵 상태.

---

## 🔖 세션 핸드오프 (2026-07-23 오후~저녁 — 화상상담 **통역/자막 대개편**: 봇 OFF·환자언어·2토글·AI안내 + 로봇 시뮬 검증)

> 별도 병렬 세션(하울링 세션과 다름). 화상상담 **통역·자막·언어** 담당 — `page.jsx`·`_roomCopy.js` 대폭 수정. 회의 후 PO가 "문제 많다"며 종합진단 → 봇 끄고 자막경로 정비.

**1. 이번 세션 한 일**

- **🔴 종합진단(읽기전용 감사 3개 병렬)**: 회의에서 문제 쏟아진 뿌리 = **Gemini 음성통역 에이전트(`LIVE_TRANSLATE`)가 2026-07-20에 프로덕션에 켜졌는데 "라이브 미검증"**이고 기존 자막경로와 **공존설계가 없어 충돌**. (봇이 참가자로 잡혀 타일·1:1레이아웃깨짐·"상대기다림"안뜸 + 봇 통역음성을 클라가 또 STT→삼중자막 + 상대음량↓.)
- **✅ 봇 OFF(프로덕션 env)**: `LIVE_TRANSLATE_ENABLED=false` Vercel PATCH + 프로덕션 재배포(`dpl_CXyE…` READY). 위 충돌 다 해소. 클라 플래그(`NEXT_PUBLIC_LIVE_TRANSLATE_ENABLED`)는 true 유지(PartnerLangBridge lang발행 보존, 봇 없으니 무해).
- **✅ [#903](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/903) 머지**: translate-realtime 출력 위생 가드 — gemini-flash가 ~10% 확률로 번역 대신 규칙누출/후보나열 뱉던 것 감지→재시도→폐기. 반성문 #109(#15 부류 재발).
- **✅ [#909](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/909) 머지**: 게스트 방 UI top-level을 자기 언어(guestLang)로(초대링크 영어 기본 버그).
- **✅ [#915](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/915) 머지·배포(origin/main `efcea89d`)**: 환자 기본언어 **DB seed**(langPickedByUser 플래그) + 자막 유지시간 12~30초↑ + **상대자막 「기록」 저장** + 방 안 **7개 컴포넌트 게스트언어화**(copy prop) + **통역(음성)/자막(텍스트) 2토글**(음성=봇꺼서 "준비중" 회색) + **컨트롤바 언어버튼**(2026-07-15 뺐던 것 복구) + **"AI 참고용" 안내배너**(자막 켤때 상주). 용어확정: **음성=통역 / 텍스트=자막**.
- **🤖 로봇 시뮬 검증**: 실회의 로그 22건 복호화→파이프라인(**echo 10/10 차단·쓰레기 0**) + TTS→STT(**러/한 감지·번역 정확**) + 카자흐 텍스트(감지·번역 OK).

**2. 왜 그렇게 했는지**

- **봇 끈 이유**: preview 모델(`gemini-3.5-live-translate-preview`)·라이브 미검증·자체평가문서(`LIVE_TRANSLATE_EVAL.md`)도 "🟡 관망" 결론이었는데 2026-07-20에 켜졌고 2026-07-23 첫 실검증서 터짐. **되돌리기 쉬운 env 플래그**로 즉시 충돌 제거가 최선.
- **봇을 누가 켰나(PO "너 알아서 넣어버렸니")**: 기록 실측 결과 — 2026-06-29 PO가 *"실서비스에 완전 셋팅해줘"*(만들기)는 지시했으나 **"켜기(유료전환·되돌리기어려운 배포)는 오픈 직전 내가 직접 하겠다"**고 했는데, **2026-07-20 밤 세션(#827)이 "죽은기능 복구"의 하나로 자율로 프로덕션에 켬(승인 기록 없음)**. → PO 의심이 맞아, 정직히 인정.
- **러시아어 우선**: 실로그가 전부 러/한(**카자흐 0건**), 카자흐인도 실제론 러시아어로 대화 → PO *"카자흐는 우선순위 아냐"*. 러시아어 파이프라인이 실데이터로 검증됨 = 실사용 커버.
- **AI 안내배너를 토스트 대신 상주로**: 토스트는 3초라 의료 안내엔 짧음 → 닫을때까지 상주 배너(`aiSubtitleDisclaimer` 6개어 재사용).

**3. 안 끝났거나 보류**

- **번역→자막 잔여 라벨 6개어 일관 정리** — 토글만 "자막"으로 바꿈, 패널·기록 등엔 "번역" 잔존(15+키×6개어라 급히 안 함).
- **발화 실제언어 감지 기반 통역**(단정 말고 감지 — PO 지시) — 러시아 우선이라 **후순위**. 기억 `consult-interpret-detect-lang`.
- **음성 통역(통역 토글) 실기능** = 에이전트 GA + 공존설계(봇을 참가자·자막경로에서 배제) 갖춘 뒤 재검토.
- **LiveKit Cloud에 봇 워커 자체는 아직 배포됨**(대기, 방엔 안 들어감) — 완전 제거는 PO가 LiveKit 대시보드에서.

**4. 주의·함정** ⚠️

- **봇 다시 켜려면**(`LIVE_TRANSLATE_ENABLED=true`+재배포) **전에 공존설계 먼저** — 안 하면 위 충돌(봇타일·삼중자막) 재발. Vercel env는 배포 시점 고정 → 변경 후 **재배포 필수**(런타임 반영 아님).
- **GitHub 웹훅/Vercel 배포가 2026-07-23 심하게 밀림**(병렬 세션 다수) — 커밋 후 PR head·CI 반영이 5~10분 지연됨. 급하면 **Vercel API로 수동 배포**(`POST /v13/deployments` gitSource ref).
- **로컬 `SUPABASE_SERVICE_ROLE_KEY` 만료(401)** — DB 접근은 **Supabase MCP**로(supabase-js 직결 안 됨). 암호화 대화 복호화는 `ENCRYPTION_KEY_V1`(AES-256-GCM)로 스크립트에서.
- **Gemini TTS는 카자흐어 음성 합성 거부**(finishReason OTHER), **Cloud TTS는 API 미활성(403)** → 카자흐 "음성" STT 시뮬 불가. 실제 카자흐 화자 or Cloud TTS 활성화 필요(우선순위 아님).
- **자막 모델 헷갈림**(어시가 반복해 틀림): 사용자가 보는 자막은 언제나 **"상대→내 언어" 하나**. 기억 `consult-subtitle-model`.
- **공용 폴더(`HEALO_KHIDI`)에서 작업 금지** 재확인 — 이 세션 초반 급하게 공용폴더서 편집하다 **자동저장 훅이 다른 세션 WIP를 내 커밋에 쓸어담음**(복원함). 반드시 worktree.

**5. 다음 세션이 먼저 할 일**

1. ⚠️ **직전 미검증분 먼저**: **#909·#915 실브라우저 검증** — 프리뷰/실방에 **게스트로 입장**해 ①방이 환자 언어로 뜨나 ②통역/자막 2토글 ③AI 안내배너 ④자막 유지시간을 **실클릭 확인**(CI·빌드는 초록이나 화면 실측 안 함). **봇 OFF도 다음 실회의서 봇 안 뜨는지** 최종 확인.
2. 번역→자막 잔여 라벨 6개어 일관 정리(작으면).
3. (후순위) 감지기반 통역 — 러시아 우선이라 급하지 않음.

**6. 검증 상태**

- ✅ **#903·#909·#915 전부 CI(ci·Smoke·Vercel) 초록 + 머지·프로덕션 배포**(origin/main `efcea89d`). #909·#903은 독립리뷰 통과. #915는 PO 직접 지시 머지(프리뷰 검토중)라 독립리뷰 생략.
- ✅ **봇 OFF**: env PATCH 확인 + 프로덕션 재배포 READY. 머지 시 ±90분 예정상담 확인(진행중 방 1개는 PO 본인 테스트 방 확인 후 오버라이드).
- ✅ **로봇 시뮬**: 번역(실로그22·echo10/10·쓰레기0)·러/한 STT·카자흐 텍스트 검증.
- ❌ **#909·#915 화면 실클릭 미검증** — 빌드·CI까지만, 게스트 실입장 브라우저 확인 안 함(→ 5-1). **봇 OFF "실방에 봇 안 뜸"도 다음 실회의서 최종 확인 필요.**
- ❌ **카자흐 음성 STT 미검증**(TTS 부재, 우선순위 아님).
- PR: 내 것(#903·#909·#915) 다 머지. 이 핸드오프 PR 외 열린 내 PR 없음. 다른 세션 PR은 미확인.

**7. 다음 세션 첫 프롬프트**

> 먼저 `docs/PROJECT_CONTEXT.md` 최상단 읽어. 화상상담 통역/자막 개편(#903·#909·#915)·봇 OFF 다 머지·배포됐다. **먼저 할 일: 프리뷰나 실방에 게스트로 입장해 ①방이 환자 언어로 뜨나 ②통역/자막 2토글 ③"AI 참고용" 안내배너 ④자막 유지시간을 실클릭 검증**(CI는 초록이나 화면 실측 안 함). **봇 OFF도 다음 실회의서 봇(agent-*) 안 뜨는지 확인.** 그다음 번역→자막 잔여 라벨 6개어 정리. 감지기반 통역은 러시아어가 우선순위라 후순위. ⚠️ 공용 폴더 말고 worktree에서 작업.

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

**✅ (완성도 감사 2026-07-15 종결) 아래 3건은 전부 main 머지 완료** — #562=`45e58f7c`·#567=`e83f9b50`·#545=`9a8dcb9c`. 문서만 "미머지"로 남아 있던 드리프트(#63 부류). 아래는 이력 보존용:
1. **파트너 발굴 아웃리치 추적기** [PR #567 · 브랜치 `work/partner-outreach`] — 코디·어드민 백오피스 신규 기능(카자흐 직원 Assel이 파일 대신 백오피스에서 파트너 영업 추적). **완성 + 프로덕션 DB에 표 `partner_outreach`+시드 6곳 이미 적용.** 남은 것: ①프리뷰에서 화면 클릭 검증(후보추가·상태변경·탭필터·CRUD, 코디+어드민 둘 다) → 이상 없으면 **머지** ②Assel 계정에 코디네이터 권한 부여(`/admin/staff`). (큰 UI라 PO 눈으로 보고 머지하기로 했던 건)
2. **초청장 발급주체 = 등록 유치의료기관(병원) 명의** [PR #562 · 브랜치 `claude/kazakhstan-keta-config-ko4g7b`] — `VisaInvitationLetter.jsx`+`inviterHospitals.ts` 완성, 미머지. (같은 세션의 비자 정정 #535·541·549·552는 이미 머지됨 — #562만 남음.)
3. **이메일 수신률 문서** [PR #545 · 브랜치 `work/email-deliverability`] — `docs/EMAIL_DELIVERABILITY.md`(DMARC·콜드 아웃리치 플레이북). DMARC 감시 켜기·Google Postmaster 등록은 이미 실행(외부 완료). 문서라 CI 초록시 자동머지 대상.
- (추가 열린 검증) #565 토글 "밀림"은 코드·배포 반영됐으나 **실브라우저 스크롤 동작만 미검증**(검증환경 헤드리스라 눈으로 못 봄) — 오전(2) 핸드오프 6번 참조.

**🧹 정리해도 되는 브랜치(작업 이미 main에 반영 = squash 머지됨, 지워도 안전):** `claude/handoff-2026-07-01-am`·`handoff/admin-cleanup-0701`·`work/admin-backoffice`·`work/hospitals-roster-refresh`·`work/hospitals-toggle-ui`·`work/hospital-toggle-scroll-fix`·`claude/rescue-548-doctor-selfhost`·`claude/seo-audit-improvements`·`claude/inspiring-williamson-56fbfc`·`claude/patient-detail-i18n`·`claude/satisfaction-min-n-env`·`claude/fix-all-errors-sweep`·`claude/khidi-conversion-source-breakdown`·`claude/handoff-cancer-img-selfhost`. ~~**남겨둘 것(미머지 작업 있음):** `work/partner-outreach`·`claude/kazakhstan-keta-config-ko4g7b`·`work/email-deliverability`.~~ → 세 브랜치 모두 머지 완료(위 참조), 이제 정리해도 안전 (완성도 감사 2026-07-15).

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
  - ~~PNG 앱아이콘 재생성~~ ✅ **완료**(2026-06-23 `943481c`, KNOWN_ISSUES:358 종결과 일치 — 완성도 감사 2026-07-15가 문서 간 모순 교정).
  - ~~도메인 `healwith.co.kr` 등록~~ ✅ **완료**(2026-06-29 라이브 HTTP 200, LAUNCH_GATES 관문12 일치 — 완성도 감사 2026-07-15 교정).
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
