# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

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

## 🔖 세션 핸드오프 (2026-07-16 — PC↔GitHub 동기화 로컬 실행: 미커밋 5건 백업 + 자동동기화 수리 완료)

> 클라우드 상담 세션이 넘긴 4단계 이관 프롬프트를 **PC 로컬 세션이 실제 실행·검증한 결과.** (그 클라우드 세션 핸드오프는 `claude/source-sync-deployment-ygfb0c` 브랜치에 미머지 초안으로 있고 "로컬 결과 미확인" 구멍을 남김 — 이 블록이 그 구멍을 검증된 결과로 채움. 그 브랜치는 이제 중복이라 닫아도 됨.)

**1. 이번 세션 한 일** (전부 PC 로컬 실행·검증)
- **미커밋 5파일 백업 push 완료** → `rescue/local-uncommitted-20260716`(origin 확인). = 소견 수동재번역 라우트·통번역 공유함수·소견 `auto_translated_text`·다중첨부 `files jsonb`·설문 followup 트리거. `.env`·키는 gitignore로 스테이징 제외 확인, 카톡사진/잡파일은 개인정보·용량 이유로 제외(로컬 보존).
- **main 워크트리(hospital-info) 최신화** — origin/main으로 15커밋 fast-forward(충돌 0).
- **자동동기화 수리** — 기존 `HEALO_AutoSync` 예약작업이 **매일 실패만 하고 있었음**(이 폴더서 `git checkout main` 시도 → 워크트리 충돌 `already used by worktree`, 로그 실측). 원인=이 폴더는 main을 못 잡음. 고침: main이 실제 있는 **hospital-info 워크트리에서 `pull --ff-only`** 하는 `healoautosync.ps1`로 교체(미커밋 있으면 skip). 예약작업 재등록 → **실제 실행 테스트 성공(Last Result 0)**. `sync-now.bat`=수동 "차이확인+당기기"(실행 순간 #787 드리프트를 실시간 잡아 당김=실증). `StartWhenAvailable`+배터리무시 설정(9시에 PC 꺼져있으면 다음 부팅때 따라잡기).
- 로컬 운영파일(ps1/bat/log/test-image)은 `.git/info/exclude`에 로컬무시 등록(저장소 안 더럽힘).

**2. 왜 그렇게 했는지**
- 원본(SoR)=GitHub. 로컬은 `pull`해야 갱신, 매 세션 자동 push라 GitHub는 항상 최신·로컬만 뒤처짐(잃은 건 없음).
- **백업이 동기화보다 먼저**: 미커밋 5파일 위에 pull로 덮으면 소실 → rescue push 완료 후에만 동기화. `--ff-only`가 실제 안전망(divergence면 `aborting`=정상, 롤백·유실 구조적으로 없음).
- **자동동기화 target은 반드시 hospital-info**(main 보유 폴더). HEALO_KHIDI는 워크트리 규칙상 main checkout 불가 → 여기서 pull 시도가 옛 자동동기화 실패의 진짜 원인.
- cmd `.bat`에 한글 넣으면 CP949로 깨져 파싱 폭탄(이번에도 재발) → 배치는 ASCII, 로직은 PowerShell(.ps1).

**3. 안 끝났거나 보류**
- ⛔ **폴더 통합 = PO가 최종적으로 "안 하기로" 결정(2026-07-16). 다음 세션은 다시 시도하지 마라.** 경위: PO가 처음엔 승인해 작업칩 `task_8e160626`을 띄웠으나 완료되지 않음(폴더에 커밋 안 된 파일이 있어 안전장치가 중단 — 설계대로 그 파일들을 지킨 것). 이후 PO에게 "이건 순수 정리정돈이라 기능 영향 0"임을 설명하니 **"그냥 놔두기" 선택**. 근거: 동기화·자동동기화는 **현재 2폴더 구조(main=hospital-info)로 정상 작동** → 통합은 불필요. PO가 새로 요청할 때만 하고, 그때 `healoautosync.ps1`의 `$SyncDir`을 HEALO_KHIDI로 교체하는 것 잊지 마라. 절차는 기억파일 `local-git-autosync-setup`에.
- **백업 5파일 → main 반영**: 판정=대부분 살릴 신규/개선(설문트리거·다중첨부=신규, 소견 번역 라우트=#717과 다른 개선안). main 직접 머지 안 함 — 각각 정식 PR 필요(PO 지정).
- (곁가지) PO가 "폰으로 밖에서 PC 깨우기(WoL)" 궁금 → 꺼진 PC 원격기상은 하드웨어/공유기설정 필수(순수 SW 불가). 사무실 KT GiGA 공유기·공인IP 확인함. **동기화엔 불필요라 안 함**(PO "그냥 궁금").

**4. 주의·함정**
- **PO PC 구조**: `HEALO_KHIDI`=작업폴더(현재 rescue 브랜치) / `main`=`HEALO_worktrees/hospital-info` 워크트리 점유. HEALO_KHIDI서 `checkout main`=`already used by worktree` 에러(정상).
- 자동동기화=`pull --ff-only`+미커밋시 skip → 앞으로만 감. **유일 위험지점=통합의 `checkout main` 순간 미커밋 있으면 밀림** → 그래서 "폴더 조용할 때"로 미룸.
- 예약작업은 **로컬 PC 전용(클라우드 아님)** — 9시에 PC 꺼져있으면 스킵, `StartWhenAvailable`로 다음 부팅때 따라잡음.

**5. 다음 세션이 먼저 할 일**
1. 백업 5파일 중 살릴 것 정식 PR로 main 반영(PO 지정) — **이 세션이 남긴 유일한 후속.**
2. ⛔ 폴더 통합은 **PO가 안 하기로 결정했으니 하지 마라**(3번 참고). 동기화는 현 구조로 정상 작동 중.

**6. 검증 상태**
- ✅ **백업**: `rescue/local-uncommitted-20260716` origin에 존재(실측). 5파일이 origin/main·전 원격에 없음도 `git ls-tree`로 확인.
- ✅ **자동동기화**: 예약작업 Last Result 0(실행 테스트), 로그 `[OK]`, `sync-now.bat`이 실드리프트(#787) 잡아 당김 실증.
- ⚠️ **대기**: 5파일 살릴지 최종 PR(PO 지정)뿐. 폴더 통합은 "미완"이 아니라 **PO 스킵 결정**(3번) — 되살리지 마라. 이 핸드오프는 docs-only.
- 열린 PR: 이 핸드오프(`docs/handoff-sync-local-20260716`). 이 세션 코드 PR 없음.

**7. 다음 세션 첫 프롬프트**
> docs/PROJECT_CONTEXT.md 최상단 읽어. 2026-07-16 PC↔GitHub 동기화: 미커밋 5파일 백업(`rescue/local-uncommitted-20260716`)·자동동기화 수리(매일 hospital-info에서 ff-pull, 실행 테스트됨) 완료 — **PO PC는 이제 손 안 대도 최신 유지됨.** ⛔ **폴더 통합은 PO가 안 하기로 최종 결정했으니 건드리지 마라**(정리정돈일 뿐 기능 영향 0, 현 2폴더 구조로 정상 작동). 남은 후속은 백업 5파일 중 살릴 것 PR로 main 반영뿐(PO 지정). 상세=기억파일 `local-git-autosync-setup`.

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
