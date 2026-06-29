# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

---

## 🔖 세션 핸드오프 (2026-06-29 — 출시 관문 닫기 + 메일알림 3겹 버그 + 전수조사 + GDPR-alignment 시작 + UMIT MOU 컴플라이언스)

> "작업 준비 해봐" → 멈춘 체리픽 정리로 시작해 출시 관문을 하나씩 닫다가, PO가 "대충 테스트했는데 오픈해도 되냐?"고 물어 **관문 실측 → 약한비번·구글로그인 닫음**. 이어 메일 알림이 안 와서 디버그하다 **버그가 3겹**(도메인 인증·Production env·서버리스 freeze)인 걸 발견, PO가 "왜 하나 테스트할 때마다 문제냐, 전수조사해" → **같은 부류 버그 박멸**. 그담 UMIT(카자흐 토모테라피센터) MOU에 "HIPAA·GDPR 준수" 문구가 들어가야 한다며 **실제 컴플라이언스 상태 파악 → GDPR-alignment 작업 + 처리자 DPA 수집** 진행. 세션 매우 길었음.

**1. 이번 세션 한 일**
- **출시 관문 닫기**: ①약한비번 어드민 — `admin@test.com`(role=admin, `test1234`)이 프로덕션에 살아있던 보안구멍 → **전 테스트계정(`*@test.com` 7개) 비번 `dream1075!`로 일괄 변경**(DB crypt + GitHub Secret 5개 동기화), 실인증으로 검증. ②**구글 로그인 재구축** — ERP 프로젝트("Medical consumables")에 "테스트중"으로 얹혀 일반환자 차단되던 것 → 새 `healwith`(`healwith-500902`) 구글 프로젝트 생성·동의화면 게시·웹클라이언트 발급·Supabase에 새 키 스왑 → **다른 구글계정(seokmin.moon88)으로 실로그인 성공 확인**. ③유치업 등록 = **이미 완료돼 있었음**(처리방침에 등록번호 `A-2026-01-02-06761` 발견).
- **로그인 착지 변경** [#415 머지·배포]: 일반 회원 로그인 후 `/patient`(마이페이지)→`/`(메인). `resolveLanding.ts` + `PatientDashboardClient` 가드에 `/` 예외(환자가 메뉴로 /patient 들어가도 안 튕기게). 헤더 "내 페이지"는 /patient 유지.
- **메일 알림 3겹 버그**: 문의 알림이 `admin@healwith.co.kr`로 안 오던 것 → ①Resend 도메인 인증(이미 됨) ②**Production `RESEND_FROM_EMAIL`이 옛 `onboarding@resend.dev`라 "본인 메일만 발송 가능"으로 거부**(Development만 noreply@로 고쳐져 있었음) ③**서버리스 freeze로 이메일 발송이 잘림**(fire-and-forget). ③은 수정 완료, ②는 **PO가 값 고치다 중단**(아래 3번).
- **전수조사 + 서버리스 freeze 버그 박멸** [#417·#419 머지]: fire-and-forget 후 즉시 응답하면 Vercel이 함수를 freeze해 느린 작업(이메일·잡 트리거 fetch)이 잘림. `next/server`의 `after()`로 감쌈 — 문의 알림 4곳(create·intake·step1·agency/refer, #417) + 견적 잡 트리거 3곳(offers/preview·enrich, #419). 이메일 발송처는 대부분 `await`라 안전(에이전트 전수조사 확인). PII는 전부 AES-256 암호화 저장 확인.
- **main CI 빨강 수리** [#412에 포함]: `find-id/route.ts`의 prefer-const error 1줄이 모든 PR ci를 막고 있던 것 수정(POSTMORTEMS #44). 멈춰있던 체리픽 충돌도 정리.
- **GDPR-alignment** [#422 — **머지 대기**]: 환자정보가 실제로 Resend·LiveKit·Gemini로 가는데 처리방침 위탁/국외이전 목록에 누락 → **6개 언어 전부 보강** + 보관기간을 "서비스 완료 후 즉시삭제"(사후관리와 모순)→저장제한 원칙(사후관리 포함 관계 종료)으로 교체. 버전 2.0.0→2.1.0. 신규 `docs/RECORDS_OF_PROCESSING.md`(RoPA)·`docs/SECURITY_BREACH_RUNBOOK.md`(72h 침해통지).
- **처리자 DPA 수집 시작**(PO 콘솔): Resend ✅(가입 시 자동발효, PDF 받음 + SOC2·펜테스트)·LiveKit ✅(Trust Center에서 DPA 다운)·GA4 ✅(데이터처리약관 동의·저장). Supabase 🔄(PandaDoc 서명메일 대기 + HIPAA 비용문의 제출)·Vercel ⬜·Gemini 결제 ⬜.

**2. 왜 그렇게 했는지**
- **비번 dream1075! 일괄**: 약한 test1234가 admin 권한 계정에 붙어 PII 플랫폼 보안구멍. E2E가 이 계정들 쓰므로 삭제 대신 강한 비번 교체 + Secret 동기화(검사 안 깨지게). PO 지시.
- **구글 B(재구축) 선택**: A(기존 동의화면 게시, 5분)도 가능했지만 PO가 ERP 프로젝트와 깨끗한 분리를 원해 새 프로젝트. 앱이름=`healwith`(브랜드, PO 교정 — 내가 코드명 HEALO 썼다가 지적받음).
- **HIPAA vs GDPR**: HIPAA는 미국법이라 우리(한국, 카자흐/러 환자)에 **법적 적용 안 됨** + BAA/Team플랜=유료(월 $599+). GDPR은 인증기관 없이 문서·DPA·절차로 증명 = **무료·달성가능**. → PO와 "PIPA 준수 + GDPR/HIPAA 원칙 부합(aligned)" 문구로 합의. MOU에 "compliant" 단정 금지.
- **after()**: `await`로 막으면 응답 느려짐 → 응답 후에도 함수 살려두는 `after()`가 정답(기존 chat 라우트도 사용).

**3. 안 끝났거나 보류**
- **🔴 메일 from주소 — 고치다 중단(제일 중요)**: Production `RESEND_FROM_EMAIL`을 `noreply@healwith.co.kr`로 바꾸고 재배포해야 하는데 MOU 얘기로 넘어가며 중단. **지금도 admin@로 가는 문의 알림은 "Invalid from field"로 실패**(PO gmail로는 옴). 값 고치고 재배포 → 내가 curl로 #26류 테스트문의 쏴서 DB(`admin_notification_logs`)에 `sent` 뜨는지 검증하면 끝.
- **#422 PR 머지 대기**: 라이브 처리방침(법무문서) 변경이라 PO "머지해" 기다리는 중. CI 확인 후 머지하면 본판 반영.
- **DPA 남음**: Supabase(서명메일 24h 내 → 서명)·Vercel(vercel.com/legal/dpa)·**Gemini 유료 결제**(아래 4번 위험).
- **GDPR 잔여 로드맵**: 데이터 자동파기(탈퇴/3년무활동) 코드·감사로그 개별 PII 열람 커버리지·유출비번차단 토글(Supabase, 현재 OFF)·테스트계정 제거·DPIA·정보주체권리 절차.

**4. 주의·함정**
- ⚠️ **Gemini API가 무료 등급이면 환자 건강정보가 구글 학습/검토에 쓰일 수 있음**(`generativelanguage.googleapis.com`+`GOOGLE_GENERATIVE_AI_API_KEY` = AI Studio API). CLAUDE.md "spend cap" 언급상 유료일 가능성 크나 **반드시 확인**. 무료면 출시 전(환자가 AI챗 쓰기 전) 유료 결제 연결 필수 = 데이터보호 핵심 리스크.
- 테스트계정 비번 = **`dream1075!`**(test1234 아님). DB+GitHub Secret 같이 움직여야 E2E 안 깨짐(메모리 갱신됨).
- `git checkout main`이 안 됨 — main이 worktree `HEALO_worktrees/known-issues-bugfix`에 잡혀있음. PR 머지 후 "failed to run git" 경고는 무해(원격 머지는 성공).
- find-id는 생년월일 있는 계정이 0개 → 기존 계정엔 사실상 안 됨(신규 가입부터).

**5. 다음 세션이 먼저 할 일**
1. **⚠️ 직전 미검증/미완 먼저**: ①**메일 from주소** — Vercel Production `RESEND_FROM_EMAIL`=`noreply@healwith.co.kr` 확인·재배포 → curl 테스트문의 → `admin_notification_logs`에 `sent` 검증(3번 핵심). ②**#422 PR** CI 초록이면 PO에게 머지 확인받기.
2. **Gemini 유료 결제 확인**(4번 위험) — 무료면 출시 전 결제 연결.
3. DPA 마무리: Supabase 서명메일 서명·Vercel DPA·증거 한 폴더 수집.
4. GDPR 잔여(자동파기·감사로그·유출비번토글·테스트계정 제거) — 내가 코드/PO 콘솔 분담.
5. 출시 관문 잔여: 응대 인력·언어·속도(운영, PO).

**6. 검증 상태**
- ✅ 머지·배포 확인: #412(체리픽정리+CI수리)·#415(로그인착지)·#417(문의알림 after)·#419(견적 after) 전부 머지, 각 CI(ci·Smoke) 초록 확인. `check:content` 통과.
- ✅ 실검증: 구글 로그인(seokmin.moon88 비-주인 계정 실로그인)·약한비번(실 auth 엔드포인트로 dream1075! 성공/test1234 차단)·PII 암호화(DB 실조회)·서버리스 freeze 수정(문의 #26 curl로 이메일 로그 2건 생성 확인).
- ❌ **미검증(솔직히)**: ①**메일 admin@ 실제 도착** — from주소 미수정이라 아직 `failed`(Invalid from field). 값 고치고 재테스트 필요. ②로그인 착지(/메인) 실클릭 — 배포는 됨, PO 로그아웃·재로그인으로 확인 권장. ③Gemini 유료 등급 — 미확인.
- 열린 PR: **#422**(처리방침 6개어, 머지 대기). check:content 통과·node require OK·6개어 반영 검증함. CI 상태는 머지 직전 재확인 필요.

**7. 다음 세션 첫 프롬프트**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프 읽어. 2026-06-29에 출시 관문(약한비번·구글로그인) 닫고 메일알림 3겹 버그·서버리스 freeze 전수조사 박멸하고 GDPR-alignment(처리방침 6개어·RoPA·런북·DPA 수집) 시작했는데 **2개가 안 끝났어**: ①**메일 from주소** — Vercel Production `RESEND_FROM_EMAIL`을 `noreply@healwith.co.kr`로 고치고 재배포한 뒤, 네가 curl로 테스트문의 쏴서 admin_notification_logs에 `sent` 뜨는지 검증해줘(지금은 Invalid from field로 실패 중). ②**#422 처리방침 PR** CI 초록이면 머지 알려줘. 그담 **Gemini가 유료 결제인지 꼭 확인**(무료면 환자 건강정보가 구글 학습에 쓰여 — 출시 전 필수). 그리고 남은 DPA(Supabase 서명메일·Vercel)랑 GDPR 잔여(자동파기·감사로그·유출비번토글·테스트계정 제거) 이어가자.

---

## 🔖 세션 핸드오프 (2026-06-26 — 로그인/계정 클러스터: 비번 재설정 버그 수리·비번찾기 별도페이지·이메일 폭탄차단·캡차 철회·아이디(이메일)찾기 신설)

> PO가 비번찾기 화면을 직접 클릭하며 버그·UX 문제를 연달아 지적 → 로그인/계정 흐름을 통째로 손봄. 캡차에 시간 많이 쓰다 결국 철회(우리 Next 환경과 충돌). PO 많이 화남("정신 차려") — 핵심 교훈은 **검증 안 된 걸 반복 배포하지 말 것**. 전부 머지·배포 완료.

**1. 이번 세션 한 일 (전부 squash 머지·프로덕션 배포)**
- **[#392](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/392) 비번 재설정 링크가 *항상* 무효이던 버그 수리** — 기본 SSR 클라(PKCE flow)로 `resetPasswordForEmail` 호출 → 메일 링크 `token_hash`에 `pkce_` 접두가 붙는데 `/reset-password`의 `verifyOtp`는 verifier 교환을 안 해 `/verify`가 세션을 안 줌 → **매번** "유효하지 않음". **implicit-flow 전용 클라(`createOtpEmailClient`, `src/lib/supabase/browser.ts`)로 발송**해 평범한 `token_hash` 발급 → 서버검증으로 작동. (POSTMORTEMS #42)
- **[#396](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/396) 비밀번호 찾기 = 별도 페이지(`/forgot-password`)로 분리** — 처음엔 로그인 화면에 캡차를 인라인으로 넣었다가 레이아웃이 깨짐 → 전용 페이지로 분리(로그인의 「비밀번호 찾기」는 Next `<Link>`, 이메일 프리필). 로그인 헤딩에 `break-keep`(한글 '환영합니/다' 끊김 수정). (`app/forgot-password/*`, `app/login/LoginClient.jsx`)
- **캡차 우여곡절 [#393](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/393)→[#398](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/398)→[#402](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/402)** — Turnstile 캡차 추가(#393) → 실서비스에서 **CSP가 challenges.cloudflare.com 차단** → 빈 회색 박스 + 버튼 영구 비활성 = 재설정 자체 불가 → 제거(#398) → PO "봇 차단 있어야지" → **같은 이메일 1분 1통(폭탄 차단) + 같은 IP 1분 5회 + Supabase recover 자체제한**으로 대체(#402). 보이는 캡차는 최종 철회. (`app/api/auth/forgot-password/route.ts`, POSTMORTEMS #43)
- **[#405](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/405) 아이디(이메일) 찾기 신설** — 로그인 ID=이메일이라 '아이디 찾기'=잊은 가입 이메일 찾기. **가입폼에 생년월일(native date) 추가** → `user_metadata.birthdate` 저장(6개어 라벨). **`/find-id`**(이름+성+생년월일) → **`/api/auth/find-id`**(service_role로 메타데이터 조회, 이름+생년월일 **정확히 1명일 때만** 가린 이메일 `k***@gmail.com` 반환, 0명·2명+면 '못 찾음', IP 10/분, 구글계정이면 구글 로그인 안내). 로그인 화면에 '아이디 찾기' 링크. (`app/find-id/*`, `app/signup/SignupClient.jsx`, `app/login/LoginClient.jsx`)

**2. 왜 그렇게 했는지**
- **캡차 철회**: 4가지 통합방식(수동 appendChild·next/script·암시적 cf-turnstile·부모 페이지 내장) 다 시도했으나 위젯이 안 뜸. **로컬 프로덕션 빌드(`next start`)에선 해당 페이지가 하이드레이션을 안 해 모든 effect가 미실행**(로컬에 실 supabase env 부재가 원인 추정)이라 **검증 자체가 불가** → '검증 못 한 건 안 올린다' 원칙상 철회. 봇/스팸은 서버 횟수제한이 더 확실하고 안 깨짐.
- **아이디찾기에서 '이름만 조회' 배제**: 우리는 **암환자 의료 플랫폼** → 이름만 넣어 가린 이메일을 주면 "그 이름의 사람 = 여기 암 환자다"가 노출되는 **의료정보 유출**. 그래서 생년월일을 두 번째 자물쇠로 요구. 전화·생년월일을 가입 때 안 받았어서 **생년월일을 가입폼에 신규 추가**(전화는 본인인증 인프라 필요해 제외).
- **배포 잦았음**: 버그 잡느라 PO 머지버튼 안 기다리고 자동머지로 여러 번 배포 → PO가 Vercel 한도 걱정. 이후 "로컬 우선·모아서 배포"로 합의.

**3. 안 끝났거나 보류**
- **보이는 '로봇 아님' 캡차 보류** — 우리 Next/React/CSP 환경과 충돌해 안정적으로 안 뜸. 나중에 정말 필요하면 **하이드레이션·CSP 원인을 제대로 규명**해 별도 작업으로. Vercel env `NEXT_PUBLIC_TURNSTILE_SITE_KEY`·`TURNSTILE_SECRET_KEY` + Cloudflare Turnstile 위젯(account `822c3b2e...`)은 **방치해도 무해**(코드가 더 이상 안 읽음, 지워도 됨).
- **이전 세션 인계 잔존**: 구글 OAuth 재구축(아래 2026-06-25 블록) — 이번 세션과 별개로 미완.

**4. 주의·함정**
- **로컬 `next start`(프로덕션 빌드)는 실 supabase env 없으면 하이드레이션이 깨져 클라이언트 검증이 불안정**(폼 제출·effect가 안 돎). → 화면/상호작용 검증은 **dev 서버**로, 실 env 의존 로직(find-id 매칭 등)은 **배포 후** 확인.
- **비번찾기 옛 메일(링크에 `pkce_` 있는 것)은 영영 안 열림** — 반드시 **새로 받은 메일**로 테스트.
- **find-id는 기존 계정(생년월일 없음)엔 안 됨** — 앞으로 가입하는 사람부터 적용(현 계정은 거의 내부/시드라 영향 적음).
- 비번찾기/find-id 페이지의 새 문구는 **공용 i18n 미수정·파일 인라인 6개어**(check:content 통과). 공용 i18n 건드리지 말 것.

**5. 다음 세션이 먼저 할 일 (우선순위)**
1. **⚠️ 직전 미검증분 먼저 실서비스 확인 (둘 다 실 env 필요라 로컬서 못 함):**
   (a) 생년월일까지 넣고 **새로 가입** → 로그인 화면 **'아이디 찾기'** → 그 이름+생년월일 → 가린 이메일 뜨는지 1회.
   (b) **'비밀번호 찾기'** → **새 메일**(링크에 `pkce_` 없어야 함) → 재설정 → 새 비번 로그인까지 end-to-end 1회.
2. (선택) 보이는 캡차가 정말 필요하면, 하이드레이션/CSP 원인 규명 후 별도로 제대로.
3. (별개·이전 인계) 구글 OAuth 재구축(관문③) — 아래 블록.

**6. 검증 상태**
- **PR/CI**: #392·#393·#396·#398·#402·#405 **전부 MERGED**, 각 PR Smoke·ci 초록(머지 시점 확인). `next build --webpack`·`check:content` 통과.
- **화면(dev 서버 실측)**: `/forgot-password`·`/find-id`·`/signup` 폼 렌더+필드 확인, 로그인에 '아이디 찾기'·'비밀번호 찾기' 링크 2개 확인. find-id API 입력검증(400/필수) 확인.
- **❗미검증(솔직히)**: ①**비번 재설정 실메일→링크클릭→재설정 end-to-end**(인증·메일 플로우라 로컬 자동검증 불가) ②**find-id 실제 매칭**(service_role+실계정 필요, 로컬 500은 service_role 키 부재라 예상된 것). → 5번 1항으로 승격.

**7. 다음 세션 첫 프롬프트**
> 먼저 `docs/PROJECT_CONTEXT.md` 최상단 핸드오프부터 읽어. 어제(2026-06-26) 로그인/계정 대거 수리해서 다 배포됐는데 **실서비스에서 직접 확인 안 한 게 2개** 있어. healwith.co.kr에서 ①생년월일 넣고 새로 가입 → 로그인 화면 '아이디 찾기'로 이름+생년월일 넣어 가린 이메일 뜨는지 ②'비밀번호 찾기' → 새로 온 메일(링크에 pkce_ 없어야 함) 클릭 → 재설정 → 로그인까지 — 이 둘이 진짜 되는지 봐줘. 안 되면 화면 그대로 알려줘.
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
