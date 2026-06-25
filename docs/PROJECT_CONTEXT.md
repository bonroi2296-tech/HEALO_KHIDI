# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

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
## 🔖 세션 핸드오프 (2026-06-25 오후 — 동의·면책 법무 클러스터 완성 + 재방문자 게이트 버그·main CI 빨강 잡음)

> "핸드오프 읽고 준비해봐" → 문의폼 동의(#351) 실측 매듭 + AI챗/회원가입/상세 동의·면책 3건 추가. 후반 PO가 "개판이야/엄살 부리지마"라고 직감 지적 → **실측으로 끝까지 파니 진짜 버그 2개 + 숨은 회귀 1개** 발견(쿠키 기반 게이트 우회, main CI 빨강, 매일 챗 스모크 조용히 깨짐). 전부 잡아 머지.

**1. 이번 세션 한 일 (전부 머지·프로덕션 배포됨)**
- **AI챗 게스트 PII 동의 게이트** [#356] — 환자가 민감 건강정보를 AI(국외·Google)에 넣기 전 1줄 필수 동의. AI챗은 신규 진입 시 **익명 자동시작**이라 그 진입점에 게이트를 둠(폼에만 붙였으면 죽은 코드 될 뻔). 서버 `/start`도 동의 재확인.
- **회원가입 동의 분리** [#358] — 묶여있던 개인정보+이용약관 → 2개 필수 분리. ⚠️ 핸드오프엔 "민감·국외이전 분리"였지만 **가입은 건강정보 안 받고 계정데이터도 서울 리전(국외이전 없음)** → 부정확이라 개인정보/이용약관 분리로 교정(PO 확인). i18n 6언어.
- **의료 면책고지 → 암종·치료 상세** [#364] — 기존 `sidebar.disclaimer`(6언어) 재사용. 암종(CancerDetailClient)·치료(TreatmentDetailPage) 하단.
- **🔴 동의 게이트를 "동의 기록 기준"으로 + 서버 enforcement** [#371] — PO가 프로덕션에서 게이트 안 보임 지적 → 원인은 **쿠키(재방문자)면 동의 기록과 무관하게 스킵**하던 것. → ①`/stream`이 `metadata.consent` 없으면 `consent_required` 403(클라 우회 불가) ②`/resume`가 `has_consent` 반환 ③신규 `/api/public/chat/consent`로 기존 thread 동의 백필 ④클라가 동의 기록 없는 thread면 게이트. **+ 회귀 동반수정**: #356이 `/start` 동의필수를 넣었는데 `smoke-chat.mjs`·`check-ai-behavior.mjs`가 consent 미전송 → 매일 cron 챗 스모크가 빨강 될 상태였음(둘 다 consent 추가). 반성문 [POSTMORTEMS #40].
- **문의폼 동의 게이트(#351, 직전 세션) 실측 매듭** — 로컬 dev 띄워 브라우저로 픽셀 확인(동의 4종·6언어·미동의 시 제출 차단·서버 consent_required).

**2. 왜 그렇게 했는지**
- 동의·면책 = 출시 법적 BLOCKER 클러스터. 추측 말고 **실제 데이터 흐름 확인 후** 핸드오프 항목을 곧이곧대로 안 만들고 교정(AI챗 자동시작 구조·가입 미수집 데이터).
- 게이트는 **쿠키가 아니라 "기록된 동의 사실"로 분기**해야 우회 안 됨(PO가 재방문자라 안 보였던 게 단서).
- 병렬 세션 다수 → **#358·#364·#371은 전용 worktree**에서 작업·머지 후 정리(PO가 격리 여부 두 번 확인).

**3. 안 끝났거나 보류**
- **AI챗 해피패스(동의→AI 실응답) 수동 픽셀 미검증** — 이 환경 헤드리스 브라우저가 외부 https(Supabase·Vercel 프리뷰)에 **MITM 프록시 인증서(크로뮴 141 거부)로 못 닿음** → 데이터 의존 화면은 픽셀 불가. 단 **PR Smoke가 동의 thread→stream→AI응답을 CI로 통과** = 해피패스 검증됨. **PO가 프로덕션에서 자기 쿠키로 게이트 뜨는지 + 채팅 응답 1회 확인** 권장.
- **치료 상세 면책 픽셀** — real DB 필요 + 위 인증서 제약 → 코드·빌드로만 확인(암종 상세는 정적이라 로컬 픽셀 확인됨). PO가 프로덕션에서 눈으로.
- 출시 남은 관문(인증 관문1·2는 #374 세션이 닫음): **구글 OAuth 게시·E2E Secrets 12개·iOS 영상마이크·K-01 데모데이터 정직성·약한비번 테스트계정 삭제**.

**4. 주의·함정**
- ⚠️ **`/api/public/chat/stream`이 이제 동의 기록 없으면 403** — 모든 `/start` 호출부(앱 ThreadChat 2곳 + 스모크 2개)가 consent 보내야 함(전수 수정 확인). 게이트 도입 이전 thread는 클라가 게이트로 백필 후 진행(정상).
- ⚠️ **cron 스모크는 PR을 안 막는다**(`chat-smoke.yml`은 매일 cron) → 그 스모크가 의존하는 API를 바꾸면 **같은 PR에서 스모크 호출부도 같이 고쳐라**(반성문 #40, #35 패턴).
- ⚠️ **main CI가 한때 빨강이었음**(타 세션 비번 정규식 `\[\]\/` lint 에러 → 모든 PR 차단) → #371·#372로 복구. 빌드는 되는데 lint 게이트가 막던 케이스.
- 여러 세션 PROJECT_CONTEXT 동시 수정 → 이 블록은 #374(가입·인증) 위에 추가·보존.

**5. 다음 세션이 먼저 할 일**
1. **⚠️ 직전 미검증분 먼저**: 프로덕션에서 ①AI챗 동의 게이트가 **재방문 쿠키로도** 뜨는지(+ 동의 후 채팅 응답 1회) ②치료 상세 면책고지 ③회원가입 동의 2개 — 눈으로 1회씩.
2. 출시 남은 관문(구글 OAuth 게시·E2E Secrets·iOS/K-01·약한비번 계정 삭제) — PO 액션 위주.
3. (선택) 후속: 면책고지 기타 페이지 확대 등.

**6. 검증 상태**
- ✅ 머지분 [#356·#358·#364·#371] 각 PR **ci·Smoke 초록** 확인 후 머지(GitHub MCP로 실확인). `next build --webpack` exit 0, `check:content`·`check:schema-refs`·tsc 0 통과.
- ✅ **PR Smoke가 동의 챗 해피패스 검증**(동의 thread 생성→stream→AI 실응답 통과).
- ✅ 로컬 픽셀 확인: 문의폼 동의 게이트·회원가입 동의 분리·암종 상세 면책·AI챗 동의 게이트(en/ko).
- ❌ **수동 픽셀 미검증(솔직히)**: 치료 상세 면책·AI챗 동의→실응답 — 이 환경 브라우저가 외부 https 못 닿음(인증서). CI/코드로 대체, PO가 프로덕션에서 최종.
- ✅ 프로덕션 실측(무쓰기): `/api/public/chat/start` 동의 없이 → `consent_required` 400 확인(서버 게이트 라이브).

**7. 다음 세션 첫 프롬프트**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프 읽어. 2026-06-25 오후에 동의·면책 클러스터(AI챗 #356·가입분리 #358·상세면책 #364·재방문자 게이트+서버enforcement #371)를 다 머지했고, main CI 빨강(타 세션 lint)·매일 챗 스모크 회귀도 잡았어(반성문 #40). 근데 **데이터 의존 화면은 이 환경 브라우저가 Supabase에 못 닿아 수동 픽셀을 못 봤으니**, 프로덕션에서 ①AI챗 동의 게이트가 재방문 쿠키로도 뜨는지+동의 후 응답 ②치료 상세 면책고지 ③회원가입 동의 2개를 눈으로 확인해줘. 그담 출시 남은 관문(구글 OAuth 게시·E2E Secrets·iOS/K-01·약한비번 계정 삭제)은 PO 액션이라 진행되면 최종 go/no-go.

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
