# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

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

## 🔖 세션 핸드오프 (2026-06-25 밤2 — 에이전시 속도(#378)·직원 문의 알림 종(#384) 머지·배포 + 자동저장 훅 파일 분실 사고 복구)

> "CI 초록 뜨면 둘 다 머지해" → 두 PR 정리·CI 초록 확인·머지·프로덕션 배포 완료. 도중 **2분 자동저장 훅이 새 파일(`NotificationBell.jsx`)을 멋대로 다른 브랜치로 떼어가** 첫 푸시에서 그 파일만 빠져 #384 CI가 한 번 빨강 → 회수(cherry-pick)·재구성·재검사 후 머지.

**1. 이번 세션 한 일 (둘 다 main 머지·프로덕션 배포됨)**
- **[#378](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/378) 에이전시 포털 느린 로딩 수리** — 목록 API(`/api/agency/inquiries`)가 첨부파일마다 서명 URL을 *하나씩* 생성(`createSignedUrl`)하던 걸 **한 번의 `createSignedUrls`(복수형) 일괄 서명**으로 묶음(네트워크 왕복 수십→1). 실운영 로그에 storage 504 타임아웃까지 있었음. 화면·응답 형태 동일. (1파일, +26/-14)
- **[#384](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/384) 새 문의 시 코디·어드민 웹/앱 종 알림** — ①직원 상단바에 알림 종 추가(환자 벨을 공용 `NotificationBell`로 일반화해 환자·직원 재사용) ②문의(AI 핸드오프/폼/에이전시) 오면 `sendAdminNotification` 안에서 코디+어드민에게 in-app 종 발송(이메일 설정 없어도 종은 울림) ③직원 역할 조회를 `profiles.role`(전부 'user'뿐이라 죽어있던 것)→`auth.users`(app_metadata.role)로 교정 → **같은 버그였던 'AI 부정피드백→코디' 알림도 같이 살림**. 링크: 코디→`/coordinator/inbox`, 어드민→`/admin/inquiries/{id}`. (8파일, +250/-156)
- 두 브랜치 모두 자동저장 훅이 얹은 무관 변경(docs·inApp 등)으로 오염돼 있던 걸 **main 기준 + 해당 기능 파일만** 깨끗이 재구성 후 머지.
- **출시 전 후속 ([PR #388](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/388), 미머지)**: PO "진짜 더 할 거 없어?" → #384 종 알림을 실DB·실코드로 재검증하다 **AI 챗 핸드오프 경로에 종이 안 울리던 갭** 발견·수정(POSTMORTEMS #41). `inApp.ts`에 `notifyStaffChatHandoff`(어드민 수신, 스레드당 1회) + `chat/stream·message` escalate에서 호출. 코디 AI챗 뷰 부재는 KNOWN_ISSUES에 별도 기록. **덤**: `e2e.yml`에 에이전시·의료기관 계정 매핑(skip 해제). 빌드·tsc·check:content 통과.

**2. 왜 그렇게 했는지**
- 에이전시 첨부 URL은 케이스를 펼쳐 '문서함'을 볼 때만 쓰는데 첫 로딩에 전부 서명하던 게 낭비 → 접힌 목록엔 개수만 표시하므로 일괄화가 안전.
- 직원 종 알림: 환자 앱에만 벨이 있었고 직원 상단바엔 종 자체가 없었음 → 벨 컴포넌트를 공용화(fixed/inline)해 양쪽 재사용(코드 중복 없이).
- 역할 조회를 `auth.users`로 바꾼 게 핵심 — `profiles.role`이 전부 'user'라 기존 코디 알림도 *조용히* 죽어 있었음(같은 뿌리 버그 동반 수리).

**3. 안 끝났거나 보류**
- **종 알림 실동작 미검증** — 인증(로그인) 화면이라 이 환경에서 자동 클릭 검증 불가. **프로덕션 배포 후 테스트 문의 1건 넣어 코디/어드민 우상단 종에 빨간 숫자 뜨는지** 눈으로 확인 필요. 실시간은 30초 폴링(환자 벨과 동일).
- (이월) 직전 밤 세션의 미완은 그대로: **구글 OAuth 재구축**·E2E 에이전시/의료기관 skip — 아래 5번.

**4. 주의·함정**
- ⚠️ **2분 자동저장 훅이 멀티파일 작업 때 새 파일을 다른 브랜치로 떼어가는 사고 재발** — 이번엔 `NotificationBell.jsx`가 `docs/handoff-...` 브랜치로 빠져 첫 푸시에서 누락(로컬 빌드는 통과해 안 보였음, 원격 CI만 빨강). 회수해 `bc96279` cherry-pick으로 복구. **멀티파일 새 컴포넌트 작업 시 푸시 전 `git status`/원격 파일 개수 대조 필수.** (PO 취향: 자동저장 훅=폰↔컴 생명줄이라 끄지 말 것 — 끄지 말고 대조로 방어.)
- 자동저장이 PROJECT_CONTEXT·inApp 등 SoR 파일을 동시에 흔들 수 있으니, 머지 전 항상 main 기준으로 기능 파일만 골라 재구성.

**5. 다음 세션이 먼저 할 일**
1. **⚠️ 직전 미검증분 먼저**: 프로덕션에서 ①**테스트 문의 1건** → 코디·어드민 우상단 종 빨간 숫자 + 클릭 시 문의 이동 ②**AI챗에서 '사람 연결' 1회** → 어드민 종(`/admin/chat` 링크) 뜨는지 확인(PR #388 머지·배포 후).
2. **(이어가기) 구글 OAuth 깨끗한 재구축** — bonroi2296 계정 → 새 `healwith` 구글 프로젝트(동의화면+웹 클라이언트, 값은 아래 밤1 핸드오프 6번에 박힘) → Supabase Auth>Providers>Google에 새 Client ID/Secret 스왑 → 비-테스트 계정 로그인 테스트(순서 지켜 무중단).
3. **E2E 에이전시·의료기관 skip 해결**: `.github/workflows/e2e.yml` env 블록 2곳(Smoke·Full)에 `E2E_AGENCY_EMAIL/PASSWORD`·`E2E_CLINIC_EMAIL/PASSWORD` 4줄씩 추가.
4. 나머지 오픈 관문 PO 안내(⑤iOS·🔴⑥약한비번 admin 삭제 등).

**6. 검증 상태**
- ✅ **#378·#384 둘 다 CI(ci·Smoke) 초록 확인 후 머지**(GitHub MCP로 재확인: 둘 다 `merged:true`, base=main). `next build --webpack` 통과 · #384 피드백 계약 테스트 2/2 · eslint 0.
- ❌ **종 알림 실표시는 검증 못 함(솔직히)** — 인증 화면이라 로컬 자동검증 불가. PO가 프로덕션에서 테스트 문의로 최종 확인.
- ❌ 에이전시 로딩 속도 개선치도 실측 못 함(SSR 인증 포털) — 배포 후 체감으로.
- ℹ️ 열린 PR: **#353**(2026-06-24 핸드오프 doc, stale) 1건 — 이번 작업과 무관, 정리 대상이면 다음 세션에.

**7. 다음 세션 첫 프롬프트**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프를 읽어라. 2026-06-25 밤2에 에이전시 느린 로딩(#378)·직원 문의 알림 종(#384) 둘 다 머지·배포 끝. **제일 먼저: 프로덕션에서 테스트 문의 1건 넣어 코디/어드민 우상단 종에 빨간 숫자 뜨고 클릭 시 해당 문의로 가는지 1회 확인**(인증 화면이라 자동검증 못 했음). 그담 이월 미완 = 구글 OAuth 재구축(값은 밤1 핸드오프 6번)·E2E 에이전시/의료기관 workflow env 4줄. 작업 중 2분 자동저장 훅이 새 파일을 다른 브랜치로 떼가는 사고가 또 있었으니 멀티파일 작업 시 푸시 전 파일 누락 대조할 것.

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
