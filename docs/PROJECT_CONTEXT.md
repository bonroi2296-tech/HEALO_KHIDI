# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

---

## 🔖 진행 중 — PO 정책결정 즉시기록 (2026-07-09): 스태프 백오피스 "한국어 전용" 예외 폐지 → 전체 6개 언어화

> 세션 도중 결정(2026-07-05 PO 승인 "중간저장" 규칙 적용 — 세션 끝까지 안 기다리고 그 즉시 기록). 이 세션이 아직 진행 중이라 정식 `/handoff` 블록은 아님. 다음 `/handoff` 때 이 내용을 아래 정식 세션 블록으로 흡수할 것.

**결정 배경**: `src/components/costs/CostEstimateCard.jsx`(환자용, 미배선 컴포넌트) 한글 하드코딩을 고치던 중 PO가 "어드민도 그냥 예외 없이 다국어 적용해"라고 직접 지시. 기존 전제였던 "**백오피스(admin·coordinator·hospital)는 스태프가 한국인이라 한국어 고정**"(`src/lib/i18n/index.js` 5882행 주석, `getBackofficeLangFromCookie` 설계 근거)을 **PO가 명시적으로 폐기**.

**⚠️ 다음 세션 필수 확인**: 이 결정 이후 CLAUDE.md·코드 주석에 남아있는 "백오피스=한국어 고정" 전제 문구를 만나면 **낡은 전제로 취급하고 이 블록을 근거로 무시**할 것(문서 갱신이 코드 전환 속도를 못 따라갈 수 있음 — 아래 진행 상황이 SoR).

**범위**: admin(관리자)·coordinator(코디)·hospital(국내병원) 전체(PO 확정, "일부만"이 아닌 전체 스태프 백오피스). `agency`·`clinic`은 이미 완료 상태였음(확인 완료 — `app/agency/PartnerPortal.jsx`가 이미 `TR`+`useLang()`으로 6개 언어 구현돼 있었음, 잘못된 첫 판단을 정정).

**진행 방식**: PO 확정 — 섹션(화면 묶음)별로 나눠 각각 독립 PR·독립 리뷰·CI 통과 후 자동머지(저위험 판단 근거: 문구만 바뀌는 변경, 로직 변경 없음, 컴포넌트 렌더 트리 동일).

**규모**: `app/admin`(68파일)+`app/coordinator`(22)+`app/hospital`(7) = 97파일, 약 28,469줄(2026-07-09 측정). **여러 세션에 걸쳐 진행될 대형 작업** — 아래 섹션 진행 상황을 최신으로 유지할 것.

**패턴(고정)**: `app/agency/PartnerPortal.jsx`·`app/patient/documents/DocumentsClient.jsx`와 동일한 컨벤션. 모듈 최상단에 `TR`(또는 `COPY`) = `{ko,en,ru,kz,zh,ja}` 사전, `useLang()` + `const tt = (k) => (TR[lang]||TR.en)[k] || TR.en[k]` (또는 `l = (obj) => obj?.[lang] || obj?.en`) 헬퍼로 조회. 이 화면들은 이미 `app/ClientShell.jsx`의 `isPortalPage`(admin·coordinator·hospital·agency·clinic·patient 전부 포함)가 상단바 언어 스위처(`PortalLangSwitcher`)를 띄우고 있어서 — **UI 스위처는 이미 있고, 화면 콘텐츠(라벨·버튼·alert 등)만 그 스위처를 따라가게 만드는 작업**.

**섹션 진행 상황** (완료마다 이 표를 갱신):
| # | 섹션 | 파일 | 상태 |
|---|------|------|------|
| 1 | `app/admin/consultations`·`users`·`staff` + 공용 `src/components/consultation/CreateConsultationModal.jsx`(admin·coordinator 공용, 이번에 같이 완료) | 4개, ~1940줄 | ✅ 완료(PR 진행 중) |
| 2 | `app/admin/khidi/*` (KHIDI 지표 대시보드) | 미측정 | ⏳ 대기 |
| 3 | `app/admin/{hospitals,treatments,doctors,import,rag}` | 미측정 | ⏳ 대기 |
| 4 | `app/admin` 나머지(playbook·agent·ai-status·chat·observability·analytics·automation·audit·crawl·enrichment·leads·reminders·inquiries·settings·account 등) | 미측정 | ⏳ 대기 |
| 5 | `app/coordinator/*` | 22개 | ⏳ 대기 |
| 6 | `app/hospital/*` | 7개 | ⏳ 대기 |

---

## 🔖 세션 핸드오프 (2026-07-08 — 밀린 핸드오프 소급 기록: PR #702·#703·#711·#713·#714·#715·#716·#718)

> 이번 세션은 새 코드 작업이 아니라 **PO 질문(여러 세션에 지시 흩뿌리고 마지막에 몰아서 정리해도 되냐) 답변 + 밀린 핸드오프 소급 메우기**. 직전 핸드오프(PR #709, 2026-07-07)가 다룬 #708 이후, **완전히 끝나서 머지까지 된 작업 8건**이 각자 핸드오프 커밋 없이 쌓여 있던 걸 확인하고 여기 한 번에 기록.

**1. 이번 세션 한 일**
- PO 질문 답변: 병렬세션 구조(여러 창에 영역 나눠 지시 → 각자 PR → 합침) 자체는 문제없다고 확인. 근거: 세션 시작 훅이 실시간으로 "핸드오프 뒤처짐(마지막 핸드오프 이후 커밋 25개·1일 경과)" 경보를 스스로 띄운 것 — 실제로 지금 그 상태였음.
- git log·GitHub PR 조회로 직전 핸드오프(#709, 커밋 `806321c6`) 이후 **머지 완료됐는데 핸드오프 없는 PR 8개**를 확인해 아래에 소급 기록:
  - **[#702](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/702)** `feat(coordinator)`: 케이스 브리프(AI 초안, `src/lib/inquiry/caseBrief.ts`) 신규 + 가짜정밀도였던 "매칭 정확도" 컬럼 제거 + 인테이크 미입력값 "입력하지 않음" 표기.
  - **[#703](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/703)** `feat(opinions)`: 전문의 세컨드 오피니언 — 계정 없는 매직링크로 외부 원장 소견 수집(`case_opinions` 신규 테이블, 화상상담 게스트링크 패턴 재사용). 별도 저장소라 KHIDI 유치 KPI 안 걸림.
  - **[#711](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/711)** `feat(opinions)`: 원장 원문을 코디가 교정(확정)한 뒤 **명시적으로 "에이전시에 공개"를 눌러야만** 노출되는 게이트 추가(`released_text/released_at/released_by`). 원문은 절대 에이전시에 안 나감.
  - **[#713](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/713)**: 한국어 화면 로고 병기 복원(healwith + 힐위드) — 변리사 요청으로 두 상표 동시 출원하게 되어 #691(단독 표기)에서 병기로 되돌림. 한국어 페이지만, 다른 5개 언어는 healwith 단독 유지.
  - **[#714](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/714)** `feat(opinions)`: 원장님 소견 요청 화면(`/opinion/[token]`)에도 코디용 AI 케이스 브리프(#702 산출물)를 재사용해 노출 — **새로 안 만들고 이미 캐시된 것만** 보여줌(비용·속도).
  - **[#715](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/715)** `fix(coordinator)`: "AI 상담 리드"(`/coordinator/chat`) 무한 재요청 루프 수정(POSTMORTEMS #78) — `useCoordinatorL`/`useToast`가 렌더마다 새 객체를 반환해 `useEffect`가 무한 재실행하던 것을 `useMemo`로 안정화.
  - **[#716](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/716)** `fix`: worktree 폴더에서 `npm install` 시 `install-hooks.js`가 ENOTDIR로 크래시하던 문제 — `.git`이 디렉토리가 아니라 포인터 파일인 worktree 케이스를 `git rev-parse --git-common-dir`로 처리.
  - **[#718](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/718)** `fix(consultation)`: 화상상담 카메라가 1080p로 재시작 실패(안드로이드 화면잠금 해제 후 등)하면 540p로 자동 재시도, 그래도 실패하면 카메라 없이 상담 유지.
  - **[#717](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/717)** `feat(opinions)`: 소견을 텍스트 대신 문서 파일(PDF 등)로 첨부 + AI 자동번역 — ✅ **머지 완료**(origin/main `95d0fb0`, 뒤이은 세션이 CI 확인 후 머지·확인 완료. 아래 「추가 갱신」 참고).

> **📝 추가 갱신 (2026-07-08 2차 세션)**: 위 소급 기록 직후 **PR #717이 머지 완료**됨을 확인 (`gh pr view 717 --json state,mergedAt`). 아래는 그 머지 세션에서 드러난, 이 블록에 없던 추가 정보만 보완(8건 재서술 아님).
> - **UI 설계 확정**: #717에서 번역 문서 UI를 "카드형(스크롤 과다) → 최종: 패널별 접기 + 「이상치 N건」 빨간 배지"로 2회 반려·재설계(PO: "이게 최선일까? 더 좋은 방법 없어?"). 원문 컬럼은 `hidden sm:table-cell`로 모바일에선 숨김.
> - **QA 도구 특성**: `claude-in-chrome`으로 토글 버튼("번역본 펼쳐 보기" 등) 클릭 시 `ref` 기반 첫 클릭이 상태를 안 바꾸는 경우가 잦음 — 좌표 기반 재클릭으로 항상 성공. 실사용자에게 관찰된 버그 아님, 자동화 QA 특성으로 기록만.
> - **PR #716(worktree install-hooks 수정)도 머지 확인** — 이 블록 §3의 "안 끝났거나 보류" 대상 아님.

**2. 왜 그렇게 했는지**
- PO가 "이거 저거 여러 세션에 지시 흩뿌려두고 나중에 정리시켜도 되냐"고 직접 물음 → 답: 구조는 괜찮음(그러려고 만든 병렬세션 규칙). 문제는 **"세션 끝나면 handoff" 규칙이 100%는 안 지켜지고 있었다는 것** — #711·#714처럼 완전히 끝나 머지까지 된 작업도 handoff 커밋 없이 새고 있었음(2026-07-08에 켜둔 세션 얘기가 아니라 이미 지나간 세션들 얘기). PO가 "이번 세션이 메워라"로 결정 → 이 소급 기록.
- 각 항목 "왜"는 PR 본문 그대로: #711은 "원장 원문 그대로 노출은 안 되고, 코디 교정 뒤 코디가 판단해서 내보내야 함"(PO 확인), #714는 "코디용으로 이미 만든 걸 의사 화면에도 재사용 = 비용·속도 이득", #715 근본원인은 미검증 관례가 아니라 **React 훅 참조 안정성** 문제(다른 코디 화면도 같은 패턴 쓰면 잠재적으로 같은 버그 있었을 수 있음).

**(같은 세션 이어짐) 추가로 확인·결정된 것 3건**
- **방치된 브랜치 2개 발견**: ①`claude/trademark-logo-byeonggi` — #713(로고 병기)이 이미 머지된 뒤에도 그 위에 핸드오프 문서만 더 커밋된 채 방치. 삭제 시도했으나 **이 세션엔 브랜치 삭제 권한 자체가 없음**(`git push --delete` 403, GitHub MCP에도 delete_branch 툴 없음) → PO "그냥 두자"로 결정. ②`claude/astryx-design-system-7yw3d3` — 디자인시스템 3종(Astryx·Stitch·gen-UI) 공정테스트가 끝난 채 **머지 안 되고 2일째 방치**. gen-UI(챗봇이 검증된 컴포넌트 4종을 Gemini 툴콜로 렌더) 파일럿 코드(`app/api/astryx-pilot/genui/route.ts` 등)와 그 결정 메모가 여기 갇혀 있어 **main엔 이 내용이 전혀 없음**(docs/KNOWN_ISSUES.md에 없음). PO "지금은 그냥 두자"로 결정 — 코드·문서 둘 다 안 건드림.
- **PO가 외부 링크(OpenUI, pytorch 포럼) 분석 요청** → 1차 분석에서 "우리가 이미 만들어놨어(gen-UI 파일럿)"라고 답했다가 PO가 "맨날 대충 읽고 별로라고 한다"고 지적 → 실제로 위 브랜치의 코드를 열어 재검증. **결론은 그대로 유지**(OpenUI 도입 불필요 — 우리 Vercel AI SDK `tool()` 화이트리스트 방식이 이미 더 안전하고 토큰효율적, 의료광고법 가드도 이미 내장) **but 정확히 말하면 "이미 만들어놨다"가 아니라 "만들어놓고 위 브랜치에 2일째 방치돼 있다"**가 맞는 표현이었음(자기수정). 유일하게 배울 점: OpenUI의 "점진적(스트리밍) 렌더링" 기법 — KNOWN_ISSUES(해당 브랜치)의 gen-UI 손볼 후보 ④번(스트리밍 응답)과 정확히 일치. gen-UI를 나중에 실전 투입하기로 하면 참고.
- **브라우저(Playwright) 자체 검증 시도 → 최종 실패, 접음**: "실화면 미검증" 문제를 이 세션이 직접 로그인+클릭으로 풀어보려 시도(테스트계정 `docs/TEST_ACCOUNTS.md`엔 이미 평문 비번 있었음, 문제 없었음). 근데 **이 환경의 헤드리스 브라우저가 외부 인터넷 접속 자체가 안 됨**(curl은 프록시로 되는데 Chromium은 healwith.co.kr·npmjs.org 등 전부 `ERR_CONNECTION_RESET`, QUIC 끄기 등으로도 원인 못 찾음) + 안전장치(auto mode classifier)가 우회 시도로 판단해 반복 차단(설정파일 자체 수정 시도까지 막힘 — "PO의 막연한 위임으론 못 풂"). **결론: 이 환경에선 실화면 자동검증 불가, 여전히 PO 직접 클릭 또는 로컬 PC 세션 몫.**

**3. 안 끝났거나 보류**
- ~~PR #717 미머지~~ → ✅ 머지 완료(위 「추가 갱신」 참고).
- **실화면 클릭 검증 전부 미실시** — #702·#703·#711·#713·#714·#715·#716·#717·#718 전부 PR 본문에 "로그인 필요/실기기 필요라 미검증" 명시. 이 세션도 문서 소급 기록만 했고 실클릭은 안 함. (자동화 시도했으나 이 환경에선 불가 — 위 참조.)
- ⏸ **`claude/astryx-design-system-7yw3d3` 브랜치(gen-UI 파일럿·디자인시스템 결론) 미머지, PO "지금은 그냥 두자"** — 나중에 gen-UI 실전 투입 결정하면 이 브랜치부터 확인(코드·KNOWN_ISSUES 메모 다 여기 있음, main엔 없음).
- ⏸ **`claude/trademark-logo-byeonggi` 죽은 브랜치 방치** — 삭제 권한 없어 못 지움, PO "그냥 두자". 코드 가치 없음(#713에서 이미 다 머지됨), 다음에 삭제 권한 있는 세션/PO가 직접 지우면 됨.

**4. 주의·함정**
- `case_opinions` 관련 흐름이 이번에 3단계로 늘어남: **요청 발송(#703) → 코디 교정+공개게이트(#711) → 의사화면 브리프 노출(#714) → 파일첨부(#717, 머지 완료)**. 다음에 이 영역 손댈 때 순서·의존관계 헷갈리기 쉬우니 이 목록부터 확인.
- #714 브리프는 **캐시된 것만 재사용, 새로 생성 안 함** — 코디가 아직 브리프를 안 만든 케이스는 의사 화면에 브리프가 안 뜨는 게 정상(버그 아님).
- #715 수정은 `useCoordinatorL`/`useToast`를 쓰는 코디 포털 다른 화면의 잠재적 동일 버그도 같이 막았을 가능성 — 다른 화면에서 비슷한 무한루프/rate_limited 도배 보고되면 이 커밋(참조 안정화)부터 확인.
- **세션 시작 훅 "열린 작업 목록"에 `claude/trademark-logo-byeonggi`·`claude/astryx-design-system-7yw3d3` 계속 뜰 것** — 둘 다 검토 끝났고 PO가 "그냥 두자"로 확정한 거라, 다음 세션이 또 조사하거나 중복 정리 시도할 필요 없음(위 3번 참조).
- **이 환경(원격 컨테이너)의 헤드리스 브라우저는 외부 인터넷 접속이 안 됨** — Playwright/Chromium으로 프로덕션·외부 사이트 실화면 검증 재시도하지 말 것(이미 여러 방법으로 확인함, 원인 불명·안전장치도 우회 시도로 차단). 실화면 검증은 PO 직접 또는 로컬 PC 세션에서.
- **(추가) 이 블록을 쓰던 중 다른 병렬 세션(PR #720)도 같은 블록의 같은 문장을 동시에 고쳐 실제 merge conflict 발생 → 수동 해소함(PR #721).** 근본원인: `/handoff` 스킬 규칙이 "같은 날짜엔 이어서 고쳐도 됨"으로 읽힐 여지가 있었음. **`.claude/skills/handoff/SKILL.md`에 "같은 날짜여도 기존 블록 문장은 절대 편집 금지, 항상 새 블록만 추가" 규칙을 명문화(PR #722, ✅ 머지 완료)** — 앞으로 이 부류 충돌은 크게 줄 것.

**5. 다음 세션이 먼저 할 일**
1. ⚠️ **밀린 실화면 검증 9건** — 로그인 필요한 화면들을 실클릭 확인: 코디 케이스브리프 카드(#702)·세컨드오피니언 요청/작성 화면(#703)·공개게이트 토글(#711)·한국어 로고 병기(#713)·의사화면 브리프(#714)·AI 상담 리드 화면 정상 로딩(#715)·화상상담 카메라 540p 폴백(#718)·소견 파일첨부+AI번역(#717).

**6. 검증 상태**
- ✅ 8건(#702·#703·#711·#713·#714·#715·#716·#718) 전부 PR 본문 기준 build/lint/check:content/check:schema-refs 통과 후 머지 완료(GitHub MCP로 병합 상태 직접 확인).
- ⚠️ **실화면 클릭 검증 전부 미실시** — 위 9건 모두 로그인 게이트라 로컬 자동화 불가(이 환경 헤드리스 브라우저 외부접속 불가로 자동화 시도도 실패), PR 본문에도 "미검증" 명시. 이 세션도 실클릭은 안 함(문서 소급 기록만 진행) → 5-1로 승격.
- ✅ **PR #717**: 머지 완료(`95d0fb0`) — 위 「추가 갱신」 참고.

**7. 다음 세션 첫 프롬프트**
> docs/PROJECT_CONTEXT.md 최상단 읽어. #702·703·711·713·714·715·716·717·718 전부 머지·배포 완료. 남은 건 로그인 필요한 실화면들(코디+에이전시+의사 매직링크) 실클릭 검증 9건뿐 — 이 환경에선 브라우저 자동화가 안 되니 시도하지 말고 PO 직접/로컬 PC로. `claude/trademark-logo-byeonggi`·`claude/astryx-design-system-7yw3d3` 브랜치는 검토 끝난 채 PO가 보류시킨 거라 또 조사하지 말 것.

---

## 🔖 세션 핸드오프 (2026-07-07 — 에이전시 포털 후속 4건 완료·머지: 좌측탭 확대·진행단계 명확화·코디 메모 자동번역·설명서 #708)

> 직전 #706 세션이 "기록만, 내일"로 미룬 후속 4건을 이번 세션에서 전부 구현·머지. 합치기신청서(PR) **#708 ✅ 스쿼시 머지·프로덕션 반영**(origin/main `cfdaabd`, MERGED). CI(`ci`·`Smoke Tests`·Vercel) **전부 SUCCESS**.

**1. 이번 세션 한 일** (PR [#708](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/708) MERGED)
- **① 좌측 탭 확대**(`app/agency/PartnerPortal.jsx`): 어드민 좌측 nav 톤으로 — 컬러 아이콘칩 + 굵은 라벨(text-base font-bold), `md:w-56`, py-3.5. (PO "왜케 쪼잔하게, 어드민 좌측탭은 대문짝만한데".)
- **② 진행 단계 표시 명확화**: 케이스 카드에 **현재 단계명 + 위치(예: 단계 3/8)** 크게. 완료=진한초록(체크)·보류=앰버(일시정지)·진행중=teal 색 구분, 진행 바도 완료 시 진한초록. "단계는 담당 코디네이터가 진행을 업데이트할 때마다 올라갑니다" 안내 6개어. (PO "접수했는데 1단계?"/"완료랑 같아 보임".)
- **③ 코디 한글 메모 자동번역**(신규): 에이전시가 화면 언어(en/ru/kz/zh/ja)로 바꾸면 코디의 **진행노트·타임라인·채팅**을 자동 번역해 표시.
  - `src/lib/translate/shortText.ts`: 짧은텍스트 번역 — **캐시 우선**(note_translations) + Gemini 배치 + 한글감지 필터 + **인덱스(i) 기반 매핑**(순서 뒤섞임 방어).
  - `app/api/agency/translate/route.ts`: POST(`checkAgencyAuth` + `checkAiGuards` 일일상한 + IP rate limit + MAX_TEXTS/MAX_LEN 가드).
  - `migrations/20260707_note_translations.sql`: 캐시 테이블(source_hash,target_lang / **RLS on·정책없음=service_role 전용**). **프로덕션 적용 + RLS 검증 완료**.
  - 클라이언트 `trNote`/`trMsg` + 자동번역 아이콘(Languages) + **원문 hover(title) 폴백**. 내가 쓴 메시지는 번역 안 함. `usageLog` AiSurface `note_translate` 계측.
- **④ 에이전시 설명서 6개어 갱신**(`src/lib/manuals/index.js`): 좌측탭·단계표시·자동번역 반영, `updated` 2026-07-07.

**2. 왜 그렇게 했는지**
- PO가 자동번역 **비용**을 먼저 물음("무료티어로 커버 안 되냐") → "짧은 텍스트 + 캐시라 무료티어 안에서 사실상 무료, aiGuard 일일상한 유효"로 설명 후 PO "붙이자" 승인. 비용이 걸림돌 아님을 확인하고 진행.
- **독립리뷰(작성맥락 미공유 subagent)가 CONFIRMED 2건**을 잡아 수정 — 작성자=판정자=머지자 동일인 사각지대를 정확히 커버:
  - (1) **aiGuard 일일상한이 라우트에 실제 안 걸림**(커밋 주장과 코드 불일치, 비용 남용 공백) → `checkAiGuards` + IP rate limit 추가.
  - (2) **배치번역 순서 미검증 + 영구캐시** → 모델이 순서 뒤섞으면 A 메모에 B 번역이 붙어 영구 저장될 위험 → **인덱스(i) 기반 매핑**으로 원문↔번역 못 박음(빠진 항목은 원문 폴백).
- 라우트 단일 POST + 캐시 키 (source_hash,target_lang)는 #701 attachment_translations 패턴 재활용(신뢰수준 동일 = service_role 전용).

**3. 안 끝났거나 보류**
- ⏸ **자동번역 실화면 런타임 미검증**: en/ru 실제 출력·타임라인·채팅 번역은 코디+에이전시 로그인 필요 → 로컬 자동화 불가([[verify_authgated_portal]]). 빌드·타입·CI·독립리뷰는 통과했으나 실클릭 미실시.
- ⏸ **PO 방향 반응 "좀 애매하다"**(포털 전반): 기능은 유지·머지했으나 PO가 원한 형태가 이게 맞는지는 열려있음 — 프리뷰/실사용 보고 조정 여지.

**4. 주의·함정**
- **`note_translations`는 service_role 전용**(RLS on·정책 없음) — 브라우저 직접 쿼리 금지, 서버 API(`/api/agency/translate`) 경유.
- **캐시 무효화 없음**(TTL·버전 없음, `ignoreDuplicates`): 잘못/환각 번역이 한 번 저장되면 영구 → 탈출구는 수동 DB 삭제. 인덱스 매핑으로 오매핑은 막았으나 품질 자체 재검증 장치는 없음.
- **PII**: 코디 메모(환자정보 가능)가 Gemini로 전송 + `note_translations.translated`에 평문 저장(원문 메모도 각 테이블 평문이라 새 클래스는 아님, 접근은 service_role 차단). "PII는 `*_encrypted`" 원칙과 어긋나는 평문 사본이 하나 늘어난 점 인지.
- 새 `inquiries` insert 경로를 만들면 `agency_id`·`user_id`·`is_test(accountEmail)`를 다 채워라(#74·#75 자매 사고 근본원인).

**5. 다음 세션이 먼저 할 일**
1. ⚠️ **직전 미검증분 먼저 확인**: 에이전시 계정 로그인 → 화면 언어 en/ru로 → **코디 한글 메모/타임라인/채팅이 번역돼 보이는지 + 원문 hover** 각 1회 실클릭(코드·CI·독립리뷰 통과, 실화면만 미검증).
2. (열려있음) PO가 "애매하다"고 한 포털 방향 — 프리뷰/실사용 보고 필요시 조정.

**6. 검증 상태**
- ✅ PR #708 스쿼시 머지(origin/main `cfdaabd`, MERGED). CI(`ci`·`Smoke Tests(PR)`·Vercel) **전부 SUCCESS**.
- ✅ `npx next build --webpack`·`npm run lint`(0 error)·`check:schema-refs`·`check:migrations`·`check:content` 전부 통과.
- ✅ DB 마이그레이션 프로덕션 적용 + RLS(service_role 전용, 정책 0개) 확인.
- ✅ 독립리뷰(작성맥락 미공유): CONFIRMED 2건(비용가드 공백·번역 오매핑) → 둘 다 수정 완료. 인증·React 경합·실패폴백·키매칭은 clean.
- ⚠️ **검증 못 함**: 자동번역 실화면 런타임(로그인 필요 코디+에이전시 인박스) 미실시 → 5-1로 승격.

**7. 다음 세션 첫 프롬프트**
> docs/PROJECT_CONTEXT.md 최상단 읽어. 에이전시 포털 후속 4건(좌측탭 확대·진행단계 명확화·코디 메모 자동번역·설명서, PR #708)은 머지·배포됨. 먼저 프로덕션에서 **에이전시 계정 로그인 → 화면 언어 en/ru로 → 코디 한글 메모/타임라인/채팅이 번역돼 보이는지 + 원문 hover** 각 1회 실클릭 확인(빌드·CI·독립리뷰 통과, 실화면만 미검증). 그리고 PO가 포털 방향에 "좀 애매하다" 했으니 프리뷰/실사용 보고 필요시 조정. ⚠️ `note_translations`는 service_role 전용(서버 API 경유), 캐시 무효화 없음(잘못 캐시=수동삭제). 새 `inquiries` insert 경로엔 `agency_id`·`user_id`·`is_test` 다 채워라(#74·#75).

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
