# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

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

## 🔖 세션 핸드오프 (2026-06-25 밤 — KNOWN_ISSUES 버그 3건 머지 + 구글OAuth(관문③) 진단: ERP 프로젝트에 붙어있음 발견)

> "없는 작업방 가서 작업 준비해" → worktree `work/known-issues-bugfix`에서 KNOWN_ISSUES 코드 버그 3건 수정·머지. 이어서 PO와 함께 출시 관문(E2E·구글OAuth)을 콘솔에서 점검하다 **구글로그인이 엉뚱한(ERP) 구글 프로젝트에 붙어있는 것**을 발견 → PO가 "깨끗하게 새로 셋업" 결정, 1단계에서 중단(다음 세션 이어감).

**1. 이번 세션 한 일 (전부 머지·프로덕션 배포)**
- **KNOWN_ISSUES 코드버그 3건** (worktree에서, 각각 독립 PR·CI초록·squash머지):
  - **[#360](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/360)** 영상방 게스트 자막 상대언어 하드코딩(`ml==="ko"?"ru":"ko"`) → `guest-join` API가 세션 `patient_language`/`doctor_language` 반환 + 클라가 역할기반 결정. 계정로그인 경로는 원래 정상, 게스트만 빠져있었음. (`app/api/khidi/consultation/[id]/guest-join/route.ts`·`app/consultation/[id]/page.jsx`) ⚠️실자막은 LiveKit+2인 실상담 1회 육안확인 권장.
  - **[#361](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/361)** 레거시 러/카 랜딩 `<html lang="en">` → `proxy.ts` LEGACY_SKIP 경로에도 `x-locale` 주입(kk→내부코드 kz) → dev 실렌더로 `lang=ru`/`lang=kk` 확인.
  - **[#362](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/362)** 스키마 dead-path 2건: `dispatch-surveys`의 `.from("patients")` 죽은가지 제거(수신자=inquiries 단일화) / `alertService`의 `.from("users")`→`auth.admin.listUsers` 이메일매칭 교체. 가드 allowlist 비움. typecheck·check:schema-refs·테스트22 통과.
  - **[#363](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/363)** 위 3건 KNOWN_ISSUES에 해결 표시(문서).
- **E2E 시크릿 점검**: 환자·코디·어드민 6개+시스템키2개는 **2026-06-24 등록돼 작동 중**(Smoke 43 passed). 2026-06-25 에이전시·의료기관 4개(`E2E_AGENCY_*`·`E2E_CLINIC_*`) GitHub Secret 추가했으나 **여전히 skip**.

**🔴 구글 OAuth(관문③) — 핵심 발견 (다음 세션 이어갈 작업)**
- **운영 구글로그인은 Supabase 대행** — 코드는 `supabase.auth.signInWithOAuth({provider:'google'})`만, env에 구글 클라이언트키 없음. 실제 client_id/secret은 **Supabase 대시보드 Auth>Providers>Google**에 박혀있음.
- **실 운영 client_id = `935081849817-7ojif7o7vgi8tve50t51vb4qa1gi092m`** (healwith.co.kr 로그인 클릭 시 실제로 이 ID로 감, redirect→`hvwwlkawaxabhtumjhrg.supabase.co`). 이 client가 사는 프로젝트 = **"Medical consumables"(`medical-consumables-491407`, 프로젝트번호 935081849817)**. ⚠️**이름은 의료소모품 ERP인데 healwith 구글로그인이 여기 붙어있음**(초기개발 잔재).
- 그 프로젝트 동의화면 **게시 상태 = "테스트 중"** → 즉 **주인 계정만 되고 일반 환자 구글로그인은 막혀있음**(주인 계정으론 돼서 작동처럼 보임).
- 혼동주의 잔재(안 씀): bonroi계정 My First Project(`aerobic-gantry-477208-v5`,#519633655469)의 `HEALO` 클라이언트는 **옛 Supabase `xppnvkuahlrdyfvabzur`+옛도메인 `healo-nu.vercel.app`** 가리킴 / 문석민계정 `healo-480207`(#762921926380)도 별개.

**2. 왜 그렇게 했는지**
- **버그 3건 각각 독립 PR**: 파일 겹침 없는 무관한 수정이라 PO 요청대로 따로 머지(리뷰·롤백 쉽게). worktree로 격리(병렬 세션 규칙).
- **구글 OAuth: ERP 프로젝트에 그냥 게시 안 하고 재구축 결정(PO)** — 운영 로그인이 ERP용 구글 프로젝트에 얹혀있어 ①이름 혼동 ②ERP 사고 시 동반 위험 ③환자가 보는 동의화면 브랜딩 문제. PO가 깨끗이 분리 원함. 단 마이그레이션은 깨질 위험이라 "순서 지켜 무중단"으로.

**3. 안 끝났거나 보류**
- **구글 OAuth 재구축 1단계(새 프로젝트 생성)에서 중단** — 다음 세션 이어감(아래 6번 상세).
- **E2E 에이전시·의료기관 skip**: 시크릿 4개는 등록됐으나 `.github/workflows/e2e.yml`이 `E2E_AGENCY_*`·`E2E_CLINIC_*`를 job env에 **매핑 안 함**(coordinator만) → 여전히 skip. 워크플로 YAML 수정 필요.
- 나머지 오픈 관문: ①가입 실메일·②이메일 템플릿(다른 세션 영역) / ⑤iOS 마이크·K-01 / 🔴⑥약한비번 admin@test.com 삭제.

**4. 주의·함정**
- 세션 중 어시스턴트가 "LAUNCH_GATES_PO.md(medical-consumables)가 틀렸다"고 했으나 **사실 맞았음** — 프로젝트 이름만 ERP라 헷갈린 것. 문서 수정 안 함(정확함).
- **구글 프로젝트 선택창 검색은 이름/ID로만 됨, "번호"로는 안 찾아짐** — 프로젝트 번호(935081849817)로 못 찾으니 후보를 직접 열어 홈의 "프로젝트 번호" 확인.
- worktree `work/known-issues-bugfix`에 메인 node_modules junction 연결 + env/launch.json 복사(전부 gitignore). 정리 시 `git worktree remove`.

**5. 검증 상태**
- ✅ 버그 3건: typecheck·check:schema-refs·단위테스트22·check:content 통과 + #361은 dev 실렌더 확인. CI(ci·Smoke) 전부 초록 → 머지·배포.
- ✅ 구글로그인 작동: healwith.co.kr에서 실제 계정선택 화면 정상(최신 도메인·Supabase로 연결 확인).
- ❌ 구글 "일반 환자도 되는지(공개 게시)" 미확정 — 운영 프로젝트가 "테스트 중"이라 막혀있을 가능성 큼(주인 계정으론 됨). 재구축 후 비-테스트 계정으로 확인 필요.
- ⚠️ #360 실자막 동작은 LiveKit+2인 실상담 1회 육안확인 미실시.

**6. 다음 세션이 먼저 할 일**
1. **(이어가기) 구글 OAuth 깨끗한 재구축** — bonroi2296 계정 → 새 프로젝트 `healwith` → OAuth 동의화면(External·앱이름 healwith·privacy `https://healwith.co.kr/privacy`·terms `/terms`·승인도메인 healwith.co.kr+supabase.co·scope email/profile/openid·게시) → 웹 OAuth 클라이언트(JS원본 `https://healwith.co.kr`+`http://localhost:3000`, **리디렉션 URI `https://hvwwlkawaxabhtumjhrg.supabase.co/auth/v1/callback`**) → **Supabase Auth>Providers>Google에 새 Client ID/Secret 갈아끼움** → 비-테스트 계정으로 로그인 테스트. *순서 지키면 무중단(옛 거 그대로 두고 마지막에 한 번만 스왑).*
2. **E2E 에이전시·의료기관 skip 해결**: `.github/workflows/e2e.yml` env 블록 2곳(Smoke·Full)에 `E2E_AGENCY_EMAIL/PASSWORD`·`E2E_CLINIC_EMAIL/PASSWORD` 4줄씩 추가.
3. 나머지 오픈 관문 PO 안내(⑤iOS·🔴⑥약한비번 admin 삭제 등).

**7. 다음 세션 첫 프롬프트**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프를 읽어라. 2026-06-25 KNOWN_ISSUES 버그 3건(#360 게스트자막·#361 레거시 lang·#362 dead-path)은 머지·배포 끝. 핵심 미완 = **구글 OAuth 재구축**: PO와 함께 bonroi2296 계정에 새 `healwith` 구글 프로젝트 만들고(동의화면+웹 클라이언트, 값은 핸드오프 6번에 박혀있음) → Supabase Auth>Providers>Google에 새 Client ID/Secret 갈아끼우고 → 비-테스트 계정으로 구글로그인 테스트. 순서 지켜 무중단으로. 그담 E2E 에이전시·의료기관 workflow env 4줄 추가(핸드오프 6-2).
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
