# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

---

## 🔖 세션 핸드오프 (2026-06-24 — 반성문 #35 → 계획 전체 실행·머지 + 프로덕션 출시 점검)

> "반성문 써달라"로 시작 → "직접 순서대로 해볼래?"로 **4세션 계획을 실제로 다 구현·검증·머지**하고, "오픈해도 되나?"에 **프로덕션 실측**으로 답함. 아래 직후 핸드오프(메타반성 #35)가 진단, 이게 그 실행 결과다.

**1. 머지 완료 (main, CI초록·검증)**
- 🔴 **인증 #341** (`1e02aac`) — 충돌 해소 후 머지. 가입/비번찾기/token_hash 페이지 prod 배포·렌더 확인. **남음: 이메일 템플릿 href 교체(PO 콘솔) 안 하면 token_hash 자동로그인 미완성**(기본 비번찾기는 동작).
- 🟡 **S2 스키마 참조 가드** + **ai-feedback 실버그 수정** (#344 `f6fd6d2`) — `.from("없는테이블")` CI 차단. 가드가 잡은 실버그: ai-feedback이 없는 `inquiry_messages(content/role)` 조회 → 어드민 화면 메시지 누락 → `chat_messages(message_text)`로 교정.
- 🟢 **S1 데드맨 알림** (#344) — KPI 스냅샷 멈춤·설문0건을 조용한 0이 아니라 알림으로. 순수함수+13테스트+kpi cron best-effort.
- 🔵 **C 재진 이메일 자동연결** (#346 `8065acb`) — 게스트 문의를 이메일 인증 계정에 백필(§6). 인증된 이메일만·best-effort.

**2. 열린 PR**
- 🟣 **S3 #347** (`/agency`·/clinic e2e 스펙 + `docs/E2E_SECRETS_SETUP.md`) — **CI 통과 시 머지 필요**(이 핸드오프 시점 미머지). 테스트파일+문서라 저위험.

**3. 프로덕션 출시 점검 (API 실측 — 상세 KNOWN_ISSUES "🚦 출시 준비 점검")**
- ✅ 작동 확인: 공개페이지 6언어·DB헬스·인증페이지 배포·**코디 로그인→실문의 조회**·**환자 로그인→채팅/재진**·**AI챗(따뜻·완결·출처)**.
- 🔴 **오픈 전 PO 5관문**(닫히면 오픈 OK): ①가입/비번찾기 실메일 1회 ②이메일 템플릿 href ③구글 OAuth 게시 ④E2E Secrets ⑤iOS 영상마이크·K-01 데모데이터 정직성.
- ❌ 미검증: 화면 시각렌더(브라우저 미설치)·실메일 end-to-end·영상/iOS·문의제출.

**4. 다음 세션이 먼저 할 일**
1. **S3 #347 CI 확인 후 머지**(안 됐으면).
2. PO가 5관문 처리하면 → 그 결과로 최종 오픈 go/no-go.
3. (선택) 레거시 러/카 랜딩 html lang 속성 ko/ru→정확화(SEO 미세).

## 🔖 세션 핸드오프 (2026-06-25 직전 — 메타반성 #35 깊은 감사 + 내일 4세션 계획)

> PO 지적 "전부 다 안 되거나 의도와 다르고 체크도 못 했다"에 대해 **4갈래 병렬 감사**(오늘 머지분 실작동·인증 브랜치·꺼진 안전망·반성문 34건 패턴)로 근본원인 규명. 결론: 단일 메커니즘 = **"조용한 성공으로 위장한 실패"**. 반성문 [POSTMORTEMS #35]에 정량 증거+구조 게이트로 정리.

**1. 이번 세션 한 일**
- **메타반성 [POSTMORTEMS #35] 깊은 버전** — 반성문 34건 중 **≈68%가 한 뿌리**(잘못된 데이터 가정·조용한 폴백·렌더타이밍·확률적 AI가 에러 안 던지고 0/[]/영어/오답으로 정상종료 → build·tsc 초록 통과 → PO가 화면에서 발견). 행동게이트 G1~G5 + **구조게이트 S1~S3**.
- **추측 교정(검증의 가치)**: 처음 가설 "어제 화면 다 빈데이터"는 **틀림** — #336·#340/#342·#337·#334는 코드+실DB로 **정상 작동**(전부 서버 API 경유). 진짜 "안 됨"은 ①인증(이메일 템플릿 href 미연결로 도달경로 없음) ②#320 재진(데이터 0행+문의 user_id 3/23). 안전망(로그인 E2E)은 **확정적으로 꺼짐**(PR마다 로그인-후-클릭 검사 0개).

**2. 게이트 (오늘부터 — 어기면 #35 재발)**
- **행동 G1** 완료 정의: 모든 "됐다"는 ①자동검사통과 ②실클릭(계정·화면) ③"검증 못 함" 중 하나 명시 / **G2** 직전 미검증분 0순위 / **G3** 데이터가정 버그는 같은 가정 쓰는 *모든 소비자* 전수 grep / **G4** 보고 전 머지·배포 확인 / **G5** 큰 변경 전 의도 버튼승인.
- **구조 S1** 조용한 0→시끄러운 빨강(errors[]+배너+Sentry+데드맨) / **S2** 코드↔실DB 스키마 대조 CI / **S3** 로그인 E2E 켜기+런타임 다국어·발송물 검사.

**3. 다음 세션이 먼저 할 일 — 4세션 분할(영역 안 겹침, 동시 가능)**
> 각 세션 **첫 프롬프트 전문은 본 세션 채팅에 작성**(PO가 복붙).
1. **🔴 세션 A(인증 실제로 켜기 — PO 체감 "안 됨" 1순위)**: PR #341 문서충돌 3개 해소→최신 main 위 CI 초록→머지 + **Supabase 이메일 템플릿 href를 token_hash로 교체(PO 콘솔, 이거 없으면 새 인증페이지 무용)** + 가입→인증메일→로그인→비번찾기→재설정 end-to-end 실클릭. 영역: app/auth·app/login·app/signup·app/reset-password·docs.
2. **🟢 세션 B(구조 게이트 S1+S3 — 근본 메커니즘 직격)**: ①E2E Secrets 6개 등록 안내→잠든 로그인 스펙 6개 깨우기 + /agency·/clinic 신규 스펙 ②집계·cron·발송의 silent-0→errors[]+빨강배너+Sentry+데드맨(설문 발송률·KPI stale 알림). 영역: e2e/·.github/·scripts/·src/lib/khidi·app/api/cron.
3. **🟡 세션 C(S2 + 재진 데이터연결)**: 코드↔실DB 스키마 대조 CI(없는 컬럼/테이블 차단) + #320 재진이 게스트/에이전시 문의(user_id null 20/23)에 안 뜨는 구조를 이메일 매칭 연결 or 명확 안내. 영역: scripts/·src/lib/patient·app/api/portal·app/patient.
4. **🔵 세션 D(PO액션/정직성)**: 구글 OAuth 게시상태 / iOS 마이크 실기기 / K-01 시드 데모데이터(진짜 유치 0) 8/27 평가 정직성. 코드 최소·결정 위주.

**4. 검증 상태 (G1 등급)**
- ✅ 반성문 #35·핸드오프 = 문서. **4갈래 감사로 코드+실DB 확인**: 오늘 머지분 실작동(서버 API 경유)·인증 PR #341 dirty(문서충돌만)·E2E 0개 실행·반성문 패턴 68%.
- ❌ 내일 4세션 작업 자체는 미착수(계획만). 인증 실동작·재진 데이터·안전망은 여전히 미해결(=내일).

**5. 다음 세션 첫 프롬프트**
> 위 3번 세션 A(인증 켜기)부터 — PO 체감 "안 됨"을 먼저 없앤다. 그담 B(구조 게이트: E2E 켜기+silent-0 알림)·C(스키마대조+재진연결)·D(PO액션) 병렬. 각 세션 전문 프롬프트는 직전 채팅 참조.

## 🔖 세션 핸드오프 (2026-06-24 밤 — doctor 계층 제거 + 5세션 PR 검수·머지 + 자산폴더 유실 방지 + 구글 OAuth 브랜딩)

> 격리 worktree(`.claude/worktrees/session-work`)에서 진행. 이번 세션은 ①신규 개발 1건 ②다른 5개 병렬세션 PR 검수·머지 ③반복되던 로고/lighthouse 폴더 유실 근본수리 ④구글 로그인 브랜딩(콘솔 설정, PO가 직접) 네 갈래.

**1. 이번 세션 한 일**
- **doctor(의사) 계정 계층 완전 제거 (8→7계층)** — [#334](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/334) **머지·prod 배포 완료**. `accountTiers.ts`(SoR)·`roles.ts`·`requirePortalAuth`·`resolveLanding`에서 doctor 제거, `/admin/staff`는 코디만 생성, 상담모달 '담당 의사 계정' 칸 제거, 죽은 `/doctor` 라우트 삭제. 의사는 계정 없이 **상담방 게스트 초대링크로만 입장**(기존 흐름 유지). DB: 미사용 doctor 계정 1개(`doctor@test.com`)만 있어 일반회원으로 강등(상담 17건 중 doctor 배정 0건 → 무영향). "doctor"는 상담방 *참가자 역할* 문자열로만 잔존(churn 최소화).
- **다른 5개 병렬세션 PR 검수·머지** — 부하 에이전트로 병렬 검수 후: [#332](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/332)(모바일 알림 취향)·[#337](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/337)(코디 흐름)·[#340](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/340)(코디 메시지)·[#336](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/336)(에이전시 메신저) **전부 머지·배포 완료**. #336은 충돌(코드: #340이 같은 메시지파일 재작성 + 문서: PROJECT_CONTEXT/PO_PREFERENCES)이라 main을 merge-in해 해소 후 머지.
- **로고/lighthouse 폴더 반복 유실 근본수리** — [#343](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/343) **(이 세션 PR, 머지 상태는 6번 참조)**. `lighthouse/` → `.gitignore` 등록(재생성 가능 리포트), `logo/` → **git 추적으로 전환**(public/brand 워드마크를 PNG 2400px로 변환 + SVG + 정사각 아이콘). 반성문 [POSTMORTEMS #34].
- **구글 OAuth 브랜딩** (PO가 콘솔에서 직접) — 프로젝트 `medical-consumables-491407`(OAuth client_id 935081849817…)의 브랜딩에 앱이름 healwith·로고·홈/개인정보(/privacy)/약관(/terms)·승인도메인 healwith.co.kr 입력·저장 완료.

**2. 왜 그렇게 했는지**
- doctor 제거: PO "의사는 별도 계정 필요 없다, 게스트 링크로 들어오면 됨(줌처럼)". 처음엔 '병원 계정 입장' 배선까지 했다가 PO가 "복잡하게 말고 링크면 다 입장"이라 해서 그 배선은 도로 걷어냄(게스트 토큰이 이미 그 역할).
- 자산 유실: `logo`·`lighthouse`는 **git 미추적 + .gitignore에도 없는** 무방비 상태라 `git clean -fd` 한 번에 흔적없이 삭제(휴지통·git 어디에도 없음). 가치자산(로고)은 **커밋**, 재생성물(lighthouse)은 **ignore**가 정답.
- 구글 "supabase.co로 이동" 표기: 무료 브랜딩으로는 **안 바뀜**(로그인 목적지가 supabase.co라 구글이 그 호스트를 표시). 바꾸려면 Supabase 커스텀 도메인(월 $10) 필요 → **PO가 "그냥 supabase.co로 감수"(무료 유지) 결정**. 게시상태도 무료 브랜딩과 별개.

**3. 안 끝났거나 보류**
- **구글 OAuth 게시 상태 = "테스트"** → 실제 환자 구글가입이 막혀 있음(등록 테스트 사용자만 가능). '대상(Audience)' 페이지에서 프로덕션(게시)으로 바꿔야 열림. PO가 이번엔 안 함(보류).
- **Supabase 커스텀 도메인(월 $10)** — supabase.co 표기 없애려면 필요하나 PO가 무료 유지 택함(보류).
- 로고 원본: 사라진 root `logo` 폴더에 워드마크 외 다른 원본(ai/psd)이 있었는지 PO 미확인 — 있었으면 그것만 별도 유실(git에 없음).

**4. 주의·함정**
- **공유 메인 폴더(`HEALO_KHIDI`)의 폴더는 반드시 git 추적 or .gitignore 둘 중 하나여야 함** — "추적도 ignore도 안 된" 폴더는 청소명령에 증발(POSTMORTEM #34). 새 산출물은 즉시 ignore, 가치자산은 즉시 커밋.
- 여러 세션이 같은 SoR 문서(PROJECT_CONTEXT·PO_PREFERENCES) 동시 수정 → 머지 충돌. 양쪽 블록 보존으로 풀 것(이번에도 그렇게 함).
- doctor는 *계정 계층*에서만 빠진 것 — 상담방 *참가자 역할* "doctor" 문자열·`doctor_user_id` 컬럼은 보존(데이터·게스트입장 유지).

**5. 다음 세션이 먼저 할 일**
1. **⚠️ 직전 미검증분 먼저 확인**: #334(doctor 제거)·#336/#337/#340(코디·에이전시 UI)은 **빌드·로직·보안만 확인, 실제 클릭 검증 못 함**(SSR 로그인 제약). 프리뷰/프로덕션에서 코디·에이전시 계정으로 ①`/admin/staff` 코디만 생성되는지 ②상담 생성 모달에 의사계정칸 없는지 ③에이전시 메신저(드로어·코디 답장 왕복) 동작 확인.
2. **PR [#343](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/343)** 머지 여부 마무리(로고 영구보존 — 안 머지되면 logo 또 사라질 수 있음).
3. PO가 원하면: 구글 OAuth **게시 상태**를 프로덕션으로(실제 환자 구글가입 열기).

**6. 검증 상태**
- #334: tsc(영향범위)·vitest 28건·check:content·`next build --webpack`·CI 전부 통과 → 머지·prod 배포 success 확인. **단 실클릭 검증은 못 함.**
- #332·#337·#340·#336: 각 PR CI(ci·smoke·Vercel) 초록 확인 후 머지, main 배포 success 확인. **UI 실클릭은 못 함(코드·보안만).**
- #343: 로컬 check:content·`next build --webpack` 통과 + 로고 PNG 변환 결과 눈으로 확인(정상). **머지 상태는 이 핸드오프 작성 시점 기준 미머지(PR 열림) — 다음 세션이 CI 확인 후 마무리.**
- 구글 브랜딩: 콘솔 "저장됨" 확인. 단 동의화면에 healwith 이름/로고가 실제로 뜨는지는 구글 전파·검수(로고 며칠)라 미확인. "supabase.co" 표기는 무료론 안 바뀜이 확인됨.

**7. 다음 세션 첫 프롬프트**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프 읽어. 2026-06-24 밤에 doctor 계정계층 제거(#334)·다른 5세션 PR 검수머지(#332/#336/#337/#340)·로고와 lighthouse 폴더 유실 근본수리(#343, 머지됐는지 먼저 확인)·구글 OAuth 브랜딩을 했어. 직전 UI 변경들(#334·#336·#337·#340)은 실제 클릭 검증을 못 했으니, 코디·에이전시 계정으로 로그인해 ①/admin/staff가 코디만 생성 ②상담 모달에 의사계정칸 없음 ③에이전시 인앱 메신저 왕복을 실제로 확인해줘. PR #343 안 머지됐으면 CI 보고 마무리(로고 영구보존). 구글 게시상태(테스트→프로덕션)는 PO가 원할 때.

## 🔖 세션 핸드오프 (2026-06-24 저녁 — 환자↔코디 상호작용 전반 정리 + 메시지 화면 재작성)

> 긴 세션. 환자↔코디 통로를 검토하며 PO 피드백을 연속 반영. **머지·배포 완료: [#326](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/326)[#329](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/329)[#331](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/331)[#333](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/333)[#337](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/337)[#340](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/340)[#342](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/342).** 핵심 교훈: 같은 파일(메시지 화면)을 다른 세션(#336 에이전시 메신저)과 동시에 만져 머지 충돌 발생 — 병렬 worktree 안 쓴 대가.

**1. 이번 세션 한 일:**
- **#326** 코디→환자 '추가 정보 요청' 카피 검토 + **카자흐어 오타 수정**(`ауруханаmen`→`аурухана мен`, 라틴-키릴 혼입).
- **#329** 상담 초대·리마인더 이메일: **러·카 환자가 한국어 메일 받던 버그**(언어 게이트가 `role==="patient"`만 봤는데 모달은 `role:"guest"`로 발급) 교정 + 계정환자 이메일 폴백. POSTMORTEM #31.
- **#331** 환자 인앱 알림 벨 신설 — `notifications` 테이블 RLS로 브라우저 직접조회(새 API 0). 견적 발행·상담 생성 이벤트 배선(best-effort, try/catch 격리).
- **#333** 에이전시 의뢰 첨부 조회 + 환자/에이전시 문의 구분: 상세/리스트 API에 `attachments`·`agency_id`·`agencies(name)` 추가, `/api/attachments/sign`에 staff 허용, 코디 화면에 첨부 카드+배지. POSTMORTEM #32.
- **#337** 코디 문의 상세에 **진행 단계 인라인 편집**(접수→사전상담→병원검토→…→완료, `/api/admin/khidi/cases` 재사용) + 흐름순 버튼 정리 + 보험·다중병원배정 UI 숨김(`SHOW_INSURANCE`/`SHOW_HOSPITAL_ASSIGN`=false). **계정 없는 시드 병원 7곳 `is_active=false`(prod DB 적용, TEST 병원만 남김, 가역).**
- **#340 + #342** 코디 메시지 화면 **premium 잔재 제거 → legacy 한국어 재작성** + 자동 스크롤 버그(폴링이 5초마다 맨아래로) + **환자(파랑)/AI(보라) 구분** + 입력창 짤림 + 공개 헤더/푸터 제거 + 마지막 메시지 미리보기 + "열림"→"신규".

**2. 왜 그렇게 했는지:**
- **환자/AI 구분 버그 근본원인**: 실제 `chat_messages.actor_type`은 `patient`(환자)·`system`(AI)인데 코드가 `user`/`bot`로 분기 → 둘 다 "시스템"으로 떨어짐. **DB 집계(`patient 352·system 352·agency·coordinator`)로 확인 후 수정**(추측 금물 교훈).
- **메시지 입력창 짤림**: 코디 레이아웃 offset(`pt-12`=48px)이 실제 PortalTopBar(`h-14 md:h-16`=56/64px)와 안 맞고 풀블리드 main이 패딩을 한 번 더 더해 grid가 화면 밖. → offset을 바 높이에 정렬 + grid 높이 브레이크포인트별 정확화.
- **`/coordinator`가 `isPortalPage` 누락**(ClientShell) → 공개 사이트 헤더+푸터가 코디 화면에 붙어 빈 띠·푸터. 추가하니 PortalTopBar만 남음(POSTMORTEM #32 부류).
- **병원 1곳 운영**: PO가 "실제로 TEST 병원 1곳이 다 컨트롤, 나중에 추가" → 다중병원 배정 UI 숨기고 시드 병원 비활성.

**3. 안 끝났거나 보류:**
- **#342 prod 프리뷰 미확인** — Vercel **일일 배포 한도(24h)** 초과(2026-06-24 병렬 세션들이 배포 과다)라 새 프리뷰가 안 떴다. 한도 풀리면 자동 생성. (단 **로컬 dev에 코디 계정 로그인해 실측 검증함** — 아래 6번.)
- 보험·다중병원배정은 **숨김만**(코드 보존). 실제 병원 추가 시 `SHOW_INSURANCE`/`SHOW_HOSPITAL_ASSIGN` true + 시드 병원 `is_active` 되돌리기.

**4. 주의·함정:**
- ⚠️ **같은 파일 동시작업 충돌 재발**: 메시지 화면(`CoordinatorMessagesClient.jsx`)을 #336 에이전시 세션과 동시에 편집 → #340 머지 후 내 후속 수정이 닫힌 PR에 갇혀 main 미반영 → origin/main 머지로 충돌 해결 후 #342로 재상정. **다음엔 새 영역은 반드시 worktree 분리.**
- ⚠️ **GitHub Actions 큐 밀림**: 병렬 세션 CI 폭주로 일부 푸시에 ci/Smoke가 트리거 지연/누락됨(빈 커밋 재트리거 무용 — paths 필터). 열린 PR이면 결국 돈다.
- ⚠️ **프리뷰 자동화 로그인**: 로컬 dev는 코디 계정 로그인 후 SSR 쿠키가 붙어 검증 가능했음(이번에 성공). 단 타이밍 민감(로그인→충분히 대기 후 이동).

**5. 다음 세션이 먼저 할 일 (우선순위):**
1. **⚠️ 직전 미검증분 먼저**: Vercel 한도 풀리면 **prod/프리뷰에서 코디 메시지 화면**(환자 파랑/AI 보라 구분·입력창 안 짤림·푸터 없음) + **#337 코디 문의 상세 진행단계 인라인**·**#333 에이전시 첨부 열람**을 실제 클릭으로 최종 확인. (로컬 실측은 했으나 prod 미확인)
2. 보험·병원배정 재활성 시점이 오면 플래그 + 시드 병원 `is_active` 복구.
3. (선택) 메시지 API가 요청마다 인증조회+권한쿼리+메시지쿼리 3연속이라 느림 — 포털 공통 인증 캐싱은 별도 과제.

**6. 검증 상태:**
- ✅ **머지된 PR 전부 CI(ci·Smoke) 초록**: #326·#329·#331·#333·#337·#340·#342. `next build --webpack` exit 0 · `check:content` 통과.
- ✅ **실DB 검증**: actor_type 값 확인(patient/system), 에이전시 문의 #20 첨부 5건·조인, 시드 병원 7곳 비활성.
- ✅ **로컬 dev 실측(코디 로그인)**: 메시지 화면 환자(🙋 파랑)/AI(🤖 보라) 구분 렌더, 입력창 화면 안 완전노출(gridBottom=winH), 공개푸터·설치배너 없음, 콘솔 에러 0. (md 961px 창 기준 — lg는 동일 구조)
- ❌ **prod 런타임 미확인**: Vercel 일일 배포 한도로 #342 새 프리뷰 못 띄움 → 5번 1.
- 열린 PR: 이 세션 기준 없음(전부 머지). 다른 병렬 세션 PR은 별도.

**7. 다음 세션 첫 프롬프트:**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프 읽어. 2026-06-24 저녁에 환자↔코디 상호작용(추가정보요청·상담알림·인앱벨·에이전시첨부·문의 진행단계 인라인·메시지 화면 재작성)을 #326~#342로 다 머지·배포했어. Vercel 배포 한도 때문에 #342(코디 메시지) prod 프리뷰를 못 봤으니, 한도 풀렸으면 **코디 계정으로 로그인해 메시지 화면(환자 파랑/AI 보라 구분·입력창 안 짤림·푸터 없음)** + 문의 상세 진행단계 인라인 + 에이전시 첨부 열람을 실제로 확인해줘. 보험·다중병원배정은 일부러 숨긴 상태(SHOW_INSURANCE/SHOW_HOSPITAL_ASSIGN=false, 시드 병원 비활성)니 건들지 마.

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
