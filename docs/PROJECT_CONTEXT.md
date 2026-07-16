# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

---

## 🔖 세션 핸드오프 (2026-07-16 — "카자흐서 healwith 검색 안 됨" 원인 규명 + 브랜드 엔티티 강화 #796·798·799·801)

> PO 질문 하나("카자흐스탄에서 구글에 healwith 검색하면 안 나온다 원인 파악해봐")로 시작 → **버그 아님**을 실측으로 규명하고, 코드로 고칠 수 있는 유일한 축(브랜드 구별)만 손봄. **이 세션에서 어시가 오류 2건을 냈고 둘 다 어시가 아니라 독립 리뷰·PO가 잡음**(4번 함정 필독).

**1. 이번 세션 한 일** (PR 4건 전부 머지·실서비스 배포·라이브 실측 확인)
- **원인 규명(핵심 산출물)**: `healwith`가 카자흐 구글에 안 뜨는 건 **버그가 아니다.** 실측 = 구글 색인 정상(`site:healwith.co.kr` 수십 페이지), robots·sitemap(47 URL)·hreflang·canonical 정상, **noindex 없음**. 진짜 원인 3개 → ①**"healwith" 이름을 동명 선점자 다수 보유**(healwith.com 홍콩 병원예약 플랫폼·아제르바이잔 AI 스타트업·팟캐스트 등이 구글 1페이지 점유) ②**새 도메인**(컷오버 2026-06-22, 4주차라 권위 낮음) ③**`.co.kr` = 구글이 "한국 전용"으로 지역타겟** → 한국 구글은 가산점(그래서 **한국선 뜸**), google.kz는 감점(**카자흐선 안 뜸**). ③은 서치콘솔에서 **국가 변경 불가**(ccTLD는 잠김) = 설정으로 못 고침.
- **#796 브랜드 엔티티 강화(머지·배포)** — `app/layout.jsx` Organization JSON-LD에 **`sameAs`(공식 인스타 `@healwith.kz` + 페이스북 id=61590609467130)** + `description`·`areaServed`(한/카/러)·`@id`·로고 512px. 두 계정 실존 확인 후 심음.
- **#798 구조화데이터 그래프 통합(머지·배포)** — `ORG_ID`/`WEBSITE_ID`(`src/lib/seo/structuredData.js` export)로 홈 `MedicalBusiness`·`careJourneyLd`·`insuranceGuideLd` publisher·`websiteLd`를 layout 엔티티에 `@id` 병합. 가드 테스트 2건 추가(3→5).
- **#799 반성문 POSTMORTEMS #96** — 어시가 낸 사고 기록(4번 참고).
- **#801 「카자흐=얀덱스」오해 정정(머지)** — `검색노출_PO가이드.md` 3곳 + `YANDEX_SEO_SETUP.md` 범위 한정. **PO 지적으로 발견.**
- 문서 정정: `검색노출_PO가이드.md`의 **"healwith는 경쟁 없는 고유명 → 색인만 되면 1등"이 사실과 달라 정정**(선점자 존재).

**2. 왜 그렇게 했는지**
- 원인 3개 중 **②③은 시간·백링크의 영역이라 코드로 못 고친다.** ①(동명이인 구별)만 구조화데이터로 직접 개선 가능 → 거기만 손댔다. 과잉 대응(도메인 변경 등) 안 함.
- **#798이 필요했던 이유**: #796으로 `sameAs`를 심었지만 layout의 Organization에만 있고 홈의 `MedicalBusiness`(제휴병원망 보유)는 `@id`가 없어 **구글이 "SNS 있는 healwith"와 "병원망 가진 healwith"를 다른 회사로 읽었다** → 브랜드 신호가 안 합쳐짐. `@id`로 같은 실체 선언 = 신호 병합.
- **화면 변화 0** 원칙 유지 — 전부 검색엔진 전용 `<script type="application/ld+json">`.

**3. 안 끝났거나 보류**
- **구글 비즈니스 프로필 주소 미수령** → `sameAs` 3번째 항목 못 넣음. PO가 "구글 비즈니스도 있다"고 했으나 주소를 안 줌. **받으면 `app/layout.jsx` sameAs 배열에 한 줄 추가하면 끝**(구글 자기 서비스라 브랜드 구별 신호가 제일 셈 + 카자흐가 구글 주무대라 지금 가장 값나가는 한 방).
- **카자흐 노출 액션카드 (a)(b)는 PO·시간의 영역** — ⓐ광고·명함·WhatsApp·에이전시 소개에 `healwith` 대신 **`healwith.co.kr` 주소 통째로** 안내(PO가 문구만 바꾸면 끝) ⓑ**백링크**(카자흐 에이전시·디렉토리가 우리를 링크 = `.co.kr` 지역감점을 이기는 유일한 정공법, 파트너 확보하며 자연히).
- (이전 세션 후속 미해결) **백업 5파일 → main 정식 PR 반영**(`rescue/local-uncommitted-20260716`). 이번 세션은 안 건드림.

**4. 주의·함정** ⚠️ **여기가 이 핸드오프의 핵심**
- 🚫 **「카자흐=얀덱스」는 틀린 상식이다. 반복 금지.** **카자흐스탄 = Google 약 70% / Yandex 약 28%** → **카자흐 노출은 구글에서 푼다.** Yandex 주력은 **러시아**(66~73%). SoR = `docs/GROWTH_PLAN.md` §C · `docs/marketing/paid-ads-plan.md`(**둘 다 이미 이렇게 교정돼 있었는데 어시가 안 읽고 "러·카=얀덱스" 통념을 되풀이해 PO에게 잘못 추천함** → PO가 잡음). **러·카를 한 덩어리로 묶지 마라.**
- ✅ **검색엔진 3사 등록은 2026-06-22에 PO가 이미 완료**(구글·얀덱스·네이버 소유권 인증 + sitemap 제출). **"등록하세요"라고 다시 추천하지 마라** — 남은 건 새 페이지 색인요청(GSC Request Indexing / Yandex `Переобход страниц`)뿐.
- 🔥 **파일 통째 `cp` 금지 (POSTMORTEMS #96)** — 어시가 낡은 `rescue/` 브랜치의 `structuredData.js`를 main 위에 `cp`로 덮어써, **2026-07-14 #746(PO 직접 지시)이 지운 죽은 `/search` SearchAction이 부활**했다(없는 검색 기능을 구글에 광고하는 상태). **CI·빌드·테스트·Vercel 전부 초록**이었고 어시는 그걸 "기능 보존"이라며 성과로 보고까지 함. **독립 리뷰 게이트만이 적발.** → 브랜치 간 변경 이전엔 반드시 `git checkout <base> -- <file>` 후 의도한 편집만 재적용. cp를 썼다면 `git diff <base>`의 `-` 라인을 전부 읽어라. **⚠️ 이 핸드오프를 쓰면서 같은 실수를 또 할 뻔했다** — 이 문서를 cp로 덮었으면 그새 머지된 #802(Zoho) 핸드오프가 통째로 소실될 뻔(직전 `git log origin/main`으로 발견해 origin/main 원본 위에 새 블록만 얹는 방식으로 회피). **핸드오프 쓰기 직전 `git fetch && git log origin/main -3`은 형식이 아니라 실제 안전장치다.**
- ⚠️ **`@id` 병합 규칙(어기면 조용히 깨짐)**: `@id`를 쓰는 노드에 정체성(name·description·url·logo·areaServed)을 layout과 **다른 값**으로 재선언하지 마라 → 병합 후 회사 설명이 2개가 되거나 회사 url이 페이지주소로 오염. **정체성 단일 SoR = `app/layout.jsx`.** 가드 테스트 있음(`structuredData.test.ts`).
- ⚠️ **배포 확인 마커는 "변경 후에만 참인 것"으로 걸어라** — 어시가 `@id...#organization` 존재로 폴링했는데 그건 #796이 이미 넣어둔 것이라 **0회 폴링으로 즉시 통과 = 거짓 초록**(배포 안 됐는데 "반영 확인"이라 보고). 변경 전에도 참인 조건은 아무것도 증명하지 않는다.
- `gh pr merge --delete-branch` 후 로컬이 `rescue/` 브랜치로 되돌아가며 `main is already used by worktree` 에러가 뜬다 — **머지 자체는 성공**한 것이니 놀라지 마라(이 폴더는 main checkout 불가).

**5. 다음 세션이 먼저 할 일**
1. ⚠️ **직전 미검증분 먼저 확인**: 이번 변경의 **실제 효과(구글이 healwith를 동명이인과 구별하기 시작했는지)는 검증 못 했다** — 구글이 새 구조화데이터를 읽는 데 며칠~2주 걸려 원리적으로 지금은 확인 불가. → 며칠 뒤 **GSC 실적(Queries) + 시크릿창에서 google.kz `healwith` 검색**으로 순위 변화 확인. 기대치는 낮게(원인 3개 중 1개만 고침).
2. **구글 비즈니스 프로필 주소를 PO에게 받아 `sameAs`에 추가**(3번). 카자흐=구글 주무대라 지금 가장 값나가는 한 방.
3. (이전 세션 후속) 백업 5파일 중 살릴 것 정식 PR로 main 반영(PO 지정).

**6. 검증 상태**
- ✅ **PR 4건 전부 MERGED 확인(실측 `gh pr view`)**: #796(09:41)·#798(10:23)·#799(10:33)·#801(11:47). 이 세션 열린 PR 없음(이 핸드오프 제외). CI 전부 초록(`ci`·`Smoke Tests`·Vercel).
- ✅ **프로덕션 라이브 실측**(healwith.co.kr에서 전 JSON-LD 노드를 `@id`로 묶어 병합 시뮬레이션): `#organization` = Organization+MedicalBusiness **단일 엔티티**, 속성에 `sameAs`+`department`(병원 8곳)+`medicalSpecialty` 공존, `description` **1개**(충돌 없음), 고아 노드 **0개**, 죽은 SearchAction **없음**.
- ✅ **가드 테스트가 실제로 무는지 검증**: 결함 2건을 일부러 재주입 → 정확히 그 2개만 실패 → 복구. (독립 리뷰어도 별도로 재주입해 교차확인.)
- ✅ vitest 5/5, `check:content` 통과, `next build --webpack` exit 0(독립 리뷰어 실행).
- ✅ 독립 리뷰 게이트 2회 통과(#796 결함 0 / #798 결함 2건 지적 → 수정 후 재검증 "no collateral, no new defects"). 머지 전 예정 화상상담 0건 확인(회의 중 배포 금지 규칙).
- ❌ **검증 못 함(원리적으로 불가)**: 구글 검색 순위·브랜드 구별의 **실제 효과**. 시간 필요 → 5번 1항으로 승격.

**7. 다음 세션 첫 프롬프트**
> docs/PROJECT_CONTEXT.md 최상단 읽어. 2026-07-16 "카자흐서 healwith 검색 안 됨" = **버그 아님**으로 규명 끝(색인·robots·hreflang 전부 정상). 원인 3개 = ①동명 선점자(healwith.com 홍콩 등) ②새 도메인 4주차 ③**`.co.kr`이 구글에 "한국 전용"으로 잡혀 google.kz에선 감점**(설정 변경 불가). 코드로 되는 ①만 손봄 → 브랜드 엔티티 `sameAs`+그래프 통합 머지·배포·라이브 검증 완료(#796·798·801, 반성문 #96). 🚫 **「카자흐=얀덱스」는 틀렸다 — KZ=Google 70%, 얀덱스는 러시아용이고 3사 등록은 2026-06-22 PO가 이미 끝냄. 다시 등록 추천 금지.** 🔥 **파일 통째 `cp` 금지**(#96: PO가 지운 코드를 부활시켜 CI 전부 초록으로 통과, 독립 리뷰만 적발). 먼저 할 일 = ①며칠 지났으면 GSC Queries·시크릿창 google.kz로 효과 확인(기대치 낮게) ②PO에게 구글 비즈니스 프로필 주소 받아 `sameAs`에 추가(카자흐=구글 주무대라 제일 값나감) ③백업 5파일 PR(이전 세션 후속).

---

## 🔖 세션 핸드오프 (2026-07-16 밤 — Zoho 코디 메일계정 coordinator@ 신설: 코드 0, 순수 운영작업)

> **코드 변경 없음(docs-only).** 이 세션은 전부 **Zoho Mail 관리콘솔 브라우저 작업**(PO 크롬을 어시가 대신 조작). 저장소 기능과 무관하니 코드 쪽 기대하고 읽지 마라. 얻은 건 **역할 메일주소 1개 + Zoho 함정 2개 학습**.

**1. 이번 세션 한 일**
- **`coordinator@healwith.co.kr` 신설 완료** — Zoho 사용자 3번째. 표시이름 "Healwith Coordinator"(이름=Healwith/성=Coordinator), 역할=사용자, 5GB, 첫 로그인 시 비번변경 강제 ☑. **로그인ID·기준주소·표시이름이 전부 coordinator@로 깔끔**(관리콘솔 개인정보 헤더 실측).
- **`assel@healwith.co.kr` 원상복구** — 중간에 어시가 붙였던 coordinator@ 별칭·사서함주소 변경을 **전부 되돌림**(현재 assel@ 단독 = 손대기 전 상태). Assel Almukhanova 개인 계정으로 그대로 유지.
- **잘못 만든 `healwith.coordinator@` 삭제** — 아래 4번 함정으로 오생성된 계정. PO가 직접 삭제(어시는 재인증 못 해 실패).
- **기억파일 2개 갱신** — 신규 `zoho-admin-gotchas`(함정 2개), `zoho-bounce-diagnosis`(계정 2개→3개 현황 정정).
- 최종 Zoho 계정 3개: `admin@`(최고관리자) / `assel@`(코디 개인) / `coordinator@`(역할계정).

**2. 왜 그렇게 했는지**
- PO 원래 요구는 "assel@를 coordinator@로 **개명**". 개명 시도했으나 Zoho가 **기준 로그인주소(canonical)를 인플레이스로 못 바꾸게** 함(4번) → **"assel@ 남기고 coordinator@ 별도 신설"** 로 PO가 방향 전환.
- 이게 **더 나은 구조**라 그대로 감: 역할주소가 사람(Assel)과 분리 → **담당자 바뀌어도 주소가 안 죽음**. assel@는 실제 쓰는 사람(2일 전 로그인 이력)이라 지우지 않음.
- **어시가 비번을 안 침**(고정 규칙). PO가 채팅에 비번을 줬어도 거절하고 PO가 직접 입력 → 그래서 계정 생성·삭제의 마지막 클릭은 PO 몫이었음. **첫 로그인 시 비번변경 강제 ☑를 켜둔 이유**: 채팅에 남은 비번을 첫 로그인 때 자동 무효화시키려고.

**3. 안 끝났거나 보류**
- **coordinator@ 실제 송수신 테스트 안 함** — 메일 한 통 안 쏴봄(아래 6번). PO가 폰에서 보내보면 끝나는 2분짜리.
- **첫 로그인 안 함** — 로그인 이력 0. PO가 첫 로그인하면 비번변경 프롬프트 뜰 것.
- **HEALO 앱 쪽 코디 계정과는 무관** — 이번 건은 **메일함만**. 앱 `/admin/staff`의 role=coordinator 계정 발급은 별개이며 이 세션은 손 안 댔음(PO가 요청 안 함). 헷갈리지 마라.

**4. 주의·함정** (⭐ 다음 세션이 같은 데서 또 헤맴 방지 — 상세는 기억파일 `zoho-admin-gotchas`)
- ⭐ **Zoho 민감작업은 관리자 비번 재인증 요구 → 어시가 대신 못 함.** 계정 삭제·로그인 기준주소(별표) 변경을 누르면 **버튼이 무한 스피너로 멈추고** 에러 토스트만 뜸("Unable to complete re-authorization. Please try again."). **실패 이유가 화면에 안 떠서 "Zoho 제한"으로 오진하기 쉬움** — 실제론 재인증 문제. 이런 건 **PO가 직접**. (계정 *생성*은 PO가 비번 치니 통과.)
- ⭐ **사용자 추가 폼: 사용자이름이 `이름.성`으로 조용히 자동 덮어써짐.** 사용자이름(coordinator)을 먼저 넣고 이름/성을 나중에 넣었더니 → `healwith.coordinator`로 덮여 **엉뚱한 주소로 계정 생성됨**(실제 발생, 지우고 재작업). **이름/성 먼저 → 사용자이름 마지막**, 그리고 [추가] 직전 눈으로 재확인. 이름/성 칸을 다시 건드리면 또 덮어씀. 크롬이 새 암호 칸에 저장된 비번을 자동으로 채우기도 함(지우고 새로 칠 것).
- **주소 2종 구분**: `사서함 주소`(메일 송수신 기본, 별칭 페이지서 교체 가능) vs `로그인 기준 주소`(계정 canonical, 사용자목록·개인정보에 뜨는 것)는 **별개**. 사서함 주소만 바꾸면 목록엔 여전히 옛 주소가 떠서 "안 바뀌었네?"로 착각함.
- **assel@ 별칭 지우지 마라**: assel@는 그 계정의 로그인 ID다.
- ⚠️ **(저장소 쪽 실사고) 공용 폴더 `HEALO_KHIDI`에서 이 핸드오프 쓰다 다른 병렬 세션이 자기 브랜치를 checkout 해 편집분이 통째로 날아감** — reflog 증거: `checkout: moving from docs/handoff-zoho-coordinator-20260716 to docs/fix-kz-yandex-misconception`. `git add`를 해둔 덕에 **dangling blob(`git fsck --lost-found`)에서 3파일 전부 복구**하고 **worktree(`HEALO_worktrees/handoff-zoho`)로 격리해 커밋**함. 교훈 = CLAUDE.md 병렬세션 규칙("공용 폴더 작업 금지, worktree 먼저")은 장식이 아니다. **공용 폴더에서 여러 파일 편집 중이면 수시로 `git add`** — 그래야 날아가도 blob으로 살린다.

**5. 다음 세션이 먼저 할 일**
1. ⚠️ **직전 미검증분 먼저 확인**: `coordinator@healwith.co.kr` **실제 송수신 + 첫 로그인** 확인(이 세션이 설정만 하고 실물 테스트 못 함). PO가 이미 했으면 넘어가라.
2. (직전 세션에서 넘어온 것) 백업 5파일 중 살릴 것 정식 PR로 main 반영(PO 지정) — `rescue/local-uncommitted-20260716`.

**6. 검증 상태**
- ✅ **coordinator@ 계정 생성**: 관리콘솔 개인정보 헤더가 `Healwith Coordinator (coordinator@healwith.co.kr)` 로 뜨는 것 **실측**(예전 assel@가 고집부리던 그 칸이 깔끔히 바뀜 = 이번엔 진짜 clean). 상태 활성·메일/캘린더/연락처 활성화됨·0B/5GB·생성 2026-07-16 18:41.
- ✅ **assel@ 원상복구**: 별칭 페이지에 assel@ 단독 = 사서함 주소(실측). 어시가 붙인 흔적 0.
- ✅ **잘못된 계정 삭제**: "삭제 성공" 토스트 + 사용자 목록 3개(healwith.coordinator@ 사라짐) 확인.
- ❌ **실제 메일 송수신 미검증** — 테스트 메일 **안 보냄**. "설정상 될 것"이지 실물 확인 아님.
- ❌ **첫 로그인 미검증** — 로그인 이력 0.
- 코드·CI: **이 세션 코드 변경 0** → 빌드/`check:content` 해당 없음. 열린 PR: 이 핸드오프뿐(`docs/handoff-zoho-coordinator-20260716`).

**7. 다음 세션 첫 프롬프트**
> docs/PROJECT_CONTEXT.md 최상단 읽어. 2026-07-16 밤 세션은 **코드 0, Zoho 메일 운영작업**이었다: 역할계정 `coordinator@healwith.co.kr` 신설 완료(로그인ID·기준주소 전부 깔끔, 관리콘솔 실측)·`assel@` 원상복구·오생성 계정 삭제. ⚠️ **미검증 2개 먼저**: coordinator@ 실제 송수신 + 첫 로그인(설정만 했고 메일 안 쏴봄) — PO가 이미 했으면 스킵. **Zoho 재작업 시 함정 2개 반드시 먼저 읽어라**(기억파일 `zoho-admin-gotchas`): ①삭제·로그인주소변경은 비번 재인증 요구라 어시가 못 함(무한 스피너로 멈춤 → "Zoho 제한"으로 오진 금지) ②사용자추가 폼은 `이름.성`으로 사용자이름을 덮어써서 엉뚱한 주소로 생성됨(이름/성 먼저→사용자이름 마지막). 앱 `/admin/staff` 코디 계정은 이번 건과 **무관**(메일함만 함).

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
