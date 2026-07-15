# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

---

## 🔖 세션 핸드오프 (2026-07-15 — 이대서울병원 국제의료사업팀 대면 미팅 → MOU·정식계약 진행 합의 기록 / 후속 인사메일 검토)

> **성격: 코드 세션 아님 = 사업(영업) 기록 세션.** PO가 2026-07-15 이대서울병원 미팅을 마치고, 그 사실과 후속 메일을 기록·핸드오프하라고 함. 소스코드 변경 0.

**1. 이번 세션 한 일**
- **이대서울병원(이화여대 서울병원) 국제의료사업팀 대면 미팅 완료 기록** — PO가 2026-07-15 국제의료사업팀장·총무팀장과 대면 미팅. **외국인환자 유치 협력을 위한 MOU 체결 + 정식 계약을 진행하기로 합의.** 이 사실을 `docs/KHIDI_중간보고_베이스.md` §4 7월 로그에 1줄 추가(유치 K-01 대학병원 직접 협력 파이프라인 실제 착수 = 중간평가 추진실적 재료).
- **후속 인사메일(PO 작성 초안) 검토** — PO가 병원 담당자에게 보낼 인사메일 초안을 보여줌. 방향(=병원이 자기네 MOU/계약서 양식을 보내줌)에 맞게 문구만 또렷하게 다듬은 추천본 제시. **메일 발송은 PO가 직접 함(어시는 검토만, 대리발송 안 함).**

**2. 왜 그렇게 했는지**
- 중간저장 규칙(결정·미팅은 세션 끝이 아니라 **발생 시점에** 기록 — 세션 죽으면 "왜"가 증발)에 따라 미팅 사실을 바로 SoR에 남김.
- 7/13 세션이 이 미팅을 대비해 제안서를 만들며 §4에 "7/15 미팅 예정"이라 이미 적어둠 → 오늘은 그 실제 결과를 이어붙이는 형태로 기록(중복 블록 대신 기존 로그 연장).

**3. 안 끝났거나 보류**
- **MOU·계약서 양식 수령 대기** — 병원이 자기네 표준 양식을 보내주기로 함. 아직 안 옴. 오면 검토 필요(아래 4·5 참고).
- (이전 세션 잔여) 2026-07-09 핸드오프의 열린 항목들(agency-claim PR 스코프 확인, 케이스 6단계 실화면 클릭검증)은 이 세션에서 **손대지 않음** — 그 뒤 자동저장 커밋이 11개 쌓였으니 다음 세션이 상태를 다시 확인할 것.

**4. 주의·함정**
- **⚠️ 계약서 검토 시 "삼각구조" 정직성** — 메모리/기존 문서 기준: 대학병원은 원래 **면역한방병원의 협진 관계**이지 본로이 직접 MOU 당사자가 아니었음. 이번 이대서울 MOU가 **본로이를 직접 협력 당사자로 놓는지, 여전히 면역한방 협진 경유인지**를 병원이 보내온 계약서에서 반드시 확인. 이대서울 대상 문서(7/13 제안서)는 삼각구조(힐위드↔면역한방 제휴 / 면역한방↔대학병원 협진 / 힐위드↔이대서울 직접협력)를 정직 표기해둠 — 계약서도 이와 어긋나지 않는지 대조.
- **후속 인사메일 미발송** — 발송은 PO 몫. 받는사람(`30363s@eumc.ac.kr` = 이화의료원 도메인)·참조(`xo1116@naver.com`) 주소가 실제 담당자 맞는지 PO가 눈으로 확인 후 발송(메일 회수 불가).
- 미팅 사실은 **PO 구두 보고 기반**(어시가 미팅에 없었으니 직접 검증 불가) — 기록은 PO가 전한 내용 그대로.

**5. 다음 세션이 먼저 할 일**
1. **MOU·계약서 양식이 왔으면 검토** — 특히 위 4번(본로이의 계약상 위치=직접 당사자 vs 면역한방 협진 경유) 정직성 확인. 안 왔으면 PO에게 도착 여부 확인.
2. (이전 잔여) 2026-07-09 핸드오프 열린 항목 상태 재확인: agency-claim worktree PR 스코프 결정 + 케이스 6단계 실화면 클릭검증(그 세션이 못 함) — 11개 자동커밋이 쌓였으니 먼저 git log/브랜치로 현황부터.

**6. 검증 상태**
- **코드 변경 없음** → 빌드·CI·`check:content` 해당 없음(돌릴 것 없음).
- 문서 2건만 수정: `docs/KHIDI_중간보고_베이스.md`(§4 7월 로그) + 본 핸드오프. `npm run check:handoff`로 형식만 검사 예정.
- PR/CI: 이 세션은 PR 없음(문서만).

**7. 다음 세션 첫 프롬프트**
> docs/PROJECT_CONTEXT.md 최상단 읽어. 2026-07-15에 이대서울병원 국제의료사업팀과 대면 미팅 끝났고 MOU·정식계약 진행하기로 합의함(§4 7월 로그에도 기록). 병원이 자기네 MOU/계약서 양식을 보내주기로 했으니, 왔으면 검토해줘 — 특히 본로이가 계약상 직접 협력 당사자인지 면역한방 협진 경유인지(삼각구조 정직성) 꼭 짚어. 안 왔으면 그렇다고 알려줘. 여유 있으면 2026-07-09 핸드오프의 열린 항목(agency-claim PR 스코프·케이스 6단계 실화면 검증)도 상태 확인.

---

## 🔖 세션 핸드오프 (2026-07-09 저녁 — Sentry/Vercel MCP 연결 + 에이전시 소견 첨부파일 노출 버그 수정 + 문의함 에이전시 이름·환자 계정연결(claim) 기능)

> 이 세션은 **메인 폴더(`docs/handoff-amend-717`)에서 시작해 도중에 별도 worktree(`work/agency-claim-inbox`)로 옮겨 작업**했다. 같은 시간대에 다른 세션이 이 메인 폴더에서 케이스 진행단계 9→6단계 재설계·소견 자동번역 작업을 동시에 진행 중이었음(바로 아래 블록이 그 세션의 핸드오프) — 두 세션의 산출물이 얽혀 있어 아래에 명확히 구분해 기록.

**1. 이번 세션 한 일**
- **Sentry MCP·Vercel MCP 연결(PO 인터랙티브 터미널 가이드)**: PO가 별도 터미널(`claude` 인터랙티브 세션)에서 `claude mcp add --transport http sentry https://mcp.sentry.dev/mcp` 실행 → OAuth 인증까지 단계별로 안내해 완료. Vercel MCP도 같은 방식으로 연결 완료. 둘 다 그 터미널 세션(로컬 CLI, `C:\Users\user`에 등록)에서만 유효 — 이 대화창(cowork 세션)엔 자동 반영 안 됨, 다음에 필요하면 다시 연결 안내 필요.
- **버그 수정 — 에이전시 포털에 소견 첨부 원본문서가 전혀 안 보이던 문제** (메인 폴더에서 직접 수정, 이미 커밋됨):
  - 원인: `app/api/agency/inquiries/route.ts`의 `case_opinions` 조회가 `file_path/file_name/files` 컬럼을 아예 select 안 해서, 코디가 소견과 함께 올린 원본 PDF가 DB엔 있어도 에이전시 화면 API 응답에 전혀 안 실림.
  - 수정: 위 파일에 파일 컬럼 select 추가 + signed URL 일괄 서명 로직 추가, `app/agency/PartnerPortal.jsx`의 소견 카드에 첨부파일 "보기" 링크 렌더링 추가.
  - 겸사겸사 무관한 기존 타입체크 오류 3건도 같이 고침: `app/api/coordinator/opinions/route.ts` 2곳(`(supabaseAdmin as any)` 캐스팅 누락), `src/lib/ai/usageLog.ts`(`AiSurface` 타입에 `"opinion_translate"` 누락) — 전부 빌드를 막고 있던 것들.
- **기능 2건(별도 worktree `work/agency-claim-inbox`, 브랜치는 `origin/main` 최신 기준):**
  1. **코디 문의함 에이전시 이름 표시**: `app/coordinator/inbox/page.jsx` 배지가 "🏢 에이전시" 고정 텍스트였던 걸 `item.agency_name`으로 교체(이미 API는 이름을 내려주고 있었음, 프론트 렌더링만 문제).
  2. **환자 계정 연결(claim) 기능**: 에이전시 경유로 접수돼 계정이 없던 환자가, 코디/에이전시가 공유하는 링크(`healwith.co.kr/claim/[public_token]`)로 회원가입/로그인하면 그 케이스가 본인 계정에 자동 연결돼 **이미 완성된 `/patient` 포털**(대시보드·진행상황·증상기록·비용견적)을 바로 쓸 수 있게 됨. 신규 파일: `app/api/inquiries/claim/route.ts`(연결 API, GET=미리보기·POST=연결), `app/claim/[token]/page.jsx`+`ClaimClient.jsx`(공개 랜딩). 기존 파일 수정: `app/signup/SignupClient.jsx`·`app/login/LoginClient.jsx`·`app/auth/callback/route.ts`(`?redirect=`/`?next=` 파라미터를 인증 완료 후까지 유지하도록), 코디 상세·에이전시 케이스 카드에 "링크 복사" 버튼, `src/lib/manuals/index.js` 갱신.
  3. **버그 발견·즉시 수정(구현 중 실클릭 검증으로 발견)**: 직원(admin/coordinator)이나 에이전시 계정으로 로그인한 채 저 claim 링크를 열면 그 계정이 환자 케이스를 "가져가 버리는" 구멍을 실제로 재현 → `app/api/inquiries/claim/route.ts`에 `auth.isStaff` + `agency_users` 멤버십 체크로 차단(`staff_cannot_claim`), 랜딩 화면에도 전용 안내 문구 추가.

**2. 왜 그렇게 했는지**
- claim 기능은 원래 "계정 없이 토큰 링크로 진행상황만 읽기 전용 조회"로 설계했으나, PO가 "그럼 사후관리·서류전달도 계속 에이전시 거쳐야 하냐, 비효율 아니냐"고 지적 → 조사해보니 `/patient` 포털에 이미 문서함·채팅·재진예약까지 다 있는데 에이전시 경유 케이스만 `inquiries.user_id`가 비어있어 접근 불가였던 게 진짜 문제. 그래서 읽기전용 미니 페이지를 새로 만드는 대신 "계정 연결" 한 기능만 추가해 기존 포털을 재사용하는 쪽으로 설계 전환(중복 개발 방지).
- claim은 `inquiries.user_id`만 채우는데, `/patient` 포털의 문서함·채팅·재진예약은 `consultation_sessions.patient_user_id`(별도 컬럼) 기반이라 claim만으로는 100% 안 열림 — 이건 알고 있는 제약이라 3번(안 끝났거나 보류)에 기록.
- PO가 "에이전시 백오피스랑 동기화하지 말고 환자 백오피스는 따로 두면서 데이터만 연동"이라고 명시적으로 요구 → `/patient`와 `/agency`는 원래도 완전히 분리된 인증·화면이고, claim은 `inquiries` 테이블 행 하나의 접근권만 주는 구조라 그 요구에 부합함을 확인. 향후 `inquiries`에 정산 등 민감 컬럼이 추가될 리스크에 대비해 "환자용 API는 항상 명시적 필드 화이트리스트만 쓴다" 원칙을 코드 주석으로 명문화.

**3. 안 끝났거나 보류**
- **PR 둘 다 미생성 — PO 확인 대기**: `work/agency-claim-inbox` 브랜치는 다른 세션의 미완성 작업(케이스 진행단계 9→6단계 재설계, 소견 자동번역)까지 머지해서 갖고 있어서, 지금 PR을 열면 그 세션이 아직 안 끝낸 작업까지 같이 main에 들어가려 함. PO에게 "하나로 합쳐서 PR / 그 세션 끝날 때까지 보류" 버튼으로 물었으나 **응답 없이 넘어감(미결정)** — 다음 세션에서 다시 물어볼 것.
- **claim 후 문서함·채팅·재진예약 완전 개방**: `app/api/khidi/consultation` 라우트에서 상담 세션 생성 시 `consultation_sessions.patient_user_id`를 자동으로 채워주는 로직이 없음(claim된 `inquiries.user_id`를 그대로 넣어주면 됨, 몇 줄 추가 수준) — 후속 작업으로 남겨둠, 지금은 claim 직후 대시보드·진행상황·증상기록·비용견적(단수 라우트)만 즉시 열림.
- **Sentry MCP로 실제 오류 조회는 아직 안 해봄** — 연결만 완료, 다음에 필요할 때 써보면서 검증.

**4. 주의·함정**
- **메인 폴더(`docs/handoff-amend-717`)에 다른 세션(케이스단계 재설계)의 작업이 계속 자동저장 중이었음** — 이 세션은 그 파일들(예: `src/lib/opinions/translateOpinion.ts`, `migrations/20260709_opinion_auto_translate.sql` 등)이 아직 커밋 안 된 상태(untracked)인 걸 발견하고, **PO 승인을 받은 뒤** `work/agency-claim-inbox` worktree에 복사해서 빌드를 살렸다(원본은 그대로 둠, 삭제·이동 안 함). 다음 세션이 메인 폴더에서 이어갈 때 이 파일들이 여전히 untracked로 남아있을 수 있음 — 그 세션이 커밋했는지 먼저 확인할 것.
- **`work/agency-claim-inbox` worktree는 `git merge docs/handoff-amend-717`로 병합된 상태** — 충돌 5건(케이스단계 후퇴방지 로직 vs 6단계 재설계 substep 로직)을 수동으로 풀어 합쳤음(`app/api/admin/khidi/cases/route.ts`·`app/api/coordinator/cases/assign/route.ts`·`CoordinatorInboxDetailClient.jsx`·문서 2건). 병합 로직은 빌드+실클릭 검증 통과했지만, **원본 세션이 이후 그 파일들을 또 고치면 이 worktree가 낡은 스냅샷이 됨** — PR 올리기 전에 최신 main(또는 그 세션 브랜치)과 다시 맞춰볼 것.
- **claim 기능 테스트 데이터**: 검증 중 `inquiries.id=11`(TEST 에이전시 케이스)의 `user_id`를 `patient@test.com`/`agency@test.com`으로 두 번 연결했다가 **매번 즉시 `null`로 원복**해둠 — DB엔 오염 안 남음. `docs/TEST_ACCOUNTS.md`의 `patient@test.com`/`Healwith2026!` 계정으로 재현 가능.
- **Sentry MCP 인증 요청 화면에서 권한 범위를 PO가 직접 조정**: Inspect Issues & Events만 남기고 Seer·Triage Issues·Manage Projects & Teams는 껐는지 여부는 PO의 최종 클릭에 달림(어시는 권장만 하고 최종 선택은 PO가 함) — 다음 세션에서 Sentry MCP로 뭔가 시도했다가 권한 부족 오류 나면 이게 원인일 수 있음.

**5. 다음 세션이 먼저 할 일**
1. ⚠️ **PR 스코프 재확인(미결정 상태)**: `work/agency-claim-inbox`를 그대로 PR 올릴지, 원본 세션(케이스단계 재설계) 머지 완료를 기다렸다가 그 위에 다시 맞춰서 올릴지 PO에게 버튼으로 확인.
2. claim 기능 실사용 최종 점검: 실제 회원가입(이메일 인증 클릭 포함) 전체 플로우는 기존 계정 재사용 우회 검증만 했음 — 여유 있으면 진짜 신규 이메일로 인증 링크까지 눌러서 1회 확인 권장.
3. `app/api/khidi/consultation`에 `consultation_sessions.patient_user_id` 자동 채움 추가(claim 후속, 문서함·채팅·재진예약 완전 개방).
4. 메인 폴더 다른 세션이 진행하던 케이스단계 재설계·소견 자동번역이 커밋/머지됐는지 확인.
5. **(2026-07-13 추가) 네이버 "힐위드" 오타 교정 제외 요청 — 반영 확인**: 네이버에서 "힐위드" 검색 시 "힐 우드로 검색하시겠습니까?" 오타 제안이 뜨는 문제(검색 노출 자체는 healwith.co.kr 1위로 정상, 코드·SEO 문제 아님 — 네이버 오타 교정 시스템이 신조어 브랜드명을 오타로 오인). PO가 2026-07-13 네이버 고객센터 1:1 문의(오타변환 제외 요청, 유치업 등록번호 포함) 접수 완료. **며칠~몇 주 뒤 네이버에서 "힐위드" 검색해 제안 문구가 사라졌는지 확인, 2~3주 지나도 그대로면 재문의.** 참고: 브랜드 검색량 쌓이면(블로그·뉴스·플레이스) 자동 소멸되기도 함.

**6. 검증 상태**
- ✅ `npx next build --webpack` 통과(메인 폴더·worktree 둘 다).
- ✅ 로컬 dev(포트 3211)에서 실클릭 검증: claim 랜딩(정상 토큰·존재하지 않는 토큰), 회원가입 폼 제출(이메일 인증 대기까지), 기존 계정으로 로그인 후 자동 claim→`/patient` 착지(DB `user_id` 반영까지 SQL로 확인), 직원/에이전시 계정 차단, 코디 문의함 에이전시 이름 배지 노출 — 전부 브라우저로 직접 확인.
- ⚠️ **미검증**: 진짜 신규 이메일 인증메일 링크 클릭 후 `?next=` 리다이렉트가 실제로 동작하는지(코드 리뷰로는 확인, 실클릭은 이메일 발송 제약으로 못 함). Google OAuth 경유 claim도 미검증.
- PR/CI: 이번 세션 산출물은 **PR 미생성**이라 CI 실행 자체가 없음(위 3번 참고).

**7. 다음 세션 첫 프롬프트**
> docs/PROJECT_CONTEXT.md 최상단 읽어. work/agency-claim-inbox worktree에 문의함 에이전시 이름 배지 + 환자 계정연결(claim) 기능이 빌드·실클릭 검증까지 끝난 채 커밋만 돼 있고 PR은 아직 안 올렸어(다른 세션 미완성 작업이 섞여 있어서 스코프 확인 필요). 그것부터 버튼으로 물어보고 진행해.

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
