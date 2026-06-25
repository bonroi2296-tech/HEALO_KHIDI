# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

---

## 🔖 세션 핸드오프 (2026-06-25 — 다국어 누락 전수 수리 + 협력병원 FAQ + 지도 회색박스 진단)

> 워크트리 병렬 세션. PO가 "의식의 흐름대로" 화면을 짚어주면 고치는 식. PO가 "맨날 100% OK 해놓고 내가 뒤지면 자꾸 수정거리 나온다"고 지적 → 다국어 누락을 **전수 점검**해 14곳을 한 번에 수리.

**1. 이번 세션 한 일 (전부 머지됨)**
- **협력병원 상세 FAQ 영어 노출** [#365] — DB faq 비었을 때 폴백 `defaultFaq`가 영어 하드코딩이라 langCode 무시 → ko/ru/kz/zh/ja에서도 영어. 6언어 인라인 맵으로. 반성문 [POSTMORTEMS #38].
- **다국어 누락 전수점검 14곳** [#369] — ①쿠키 동의창(`CookieConsent.jsx`, 전 페이지) 5문구 영어→6언어 ②병원/치료 상세 "New" 배지·"Loading reviews…"→`t()` ③환자 chat 무제목폴백·documents/dashboard 상담유형 라벨·이름폴백 ④**환자 messages·calendar는 COPY가 en/ko뿐**이라 화면 통째 영어였음→ru/kz/zh/ja 풀 추가(+캘린더 날짜/시간 로케일). 반성문 #39.
- **main eslint 빨강 해소** [#372] — 타 세션 signup/reset-password의 `SPECIAL_RE` 정규식 불필요 이스케이프(`\[``\/`) → 제거(매칭셋 95개 ASCII 동일 실측). 내 #369를 막던 것이라 분리 PR로 먼저 머지.
- **협력병원 지도 회색박스 진단** — 미해결, 아래 3번.

**2. 왜 그렇게 했는지**
- FAQ·배지·폴백·로딩문구는 `t()`를 안 거쳐 langCode를 무시 → 비영어에서 영어로 샌다(같은 뿌리 반복, #38·#39).
- messages/calendar는 화면 전체가 en/ko뿐 → 깃발 몇 글자만 고치면 `COPY[lang]||COPY.en` 폴백이 깨지거나 나머지가 영어로 남음 → **화면 전체를 6언어로** 채워야 진짜 수정. 핵심 타겟이 러·카자흐 환자라 영향 큼.
- **지도 진단 결론**: 키는 프로덕션 번들에 박혀 있고(`AIzaSyA_DY…`, 빌드 OK), 그 키로 Geocoding API 직접 호출 시 정상 응답 = **키 살아있음+결제 ON+리퍼러 제한 없음**. 그런데 지도만 회색 → 범인은 **Maps JavaScript API가 그 키/프로젝트에서 비활성**(또는 키 API제한에서 제외). PO가 말한 "가오픈때 잠깐 비활성"의 실체 = 코드/Vercel이 아니라 **구글콘솔에서 지도 API off**.

**3. 안 끝났거나 보류**
- **⚠️ 협력병원 지도 — Maps JavaScript API 켜기 미완.** PO 구글콘솔에 프로젝트가 2개(Medical consumables, My First Project)뿐인데 둘 다 Maps 없음 → **키는 또 다른 프로젝트/계정 소속 추정**(URL `authuser=2` = 멀티계정). 켜는 법: 키 든 GCP 프로젝트 찾아 **API 라이브러리 → Maps JavaScript API → 사용설정** + 키 "API 제한"에 포함. **코드/재배포 불필요(즉시 반영).** PO가 다른 세션에서 이어받기로 함 — 중복확인.
- **⚠️ Vercel 무료플랜 하루 빌드상한** 걸림(2026-06-25 PR 다수) → **#369 production 배포가 상한 리셋(약 하루)까지 지연**될 수 있음. main엔 머지됨, 코드는 안전.
- 보안: 지도 키 **리퍼러 제한 없음**(노출 키) → 켤 때 `healwith.co.kr/*`·`*.vercel.app/*` 리퍼러 제한 걸 것.

**4. 주의·함정**
- 지도 코드엔 kill switch 없음(`isDev||!apiKey`만). 회색박스 원인이 "키 없음"과 "구글이 키 거부(API미활성/리퍼러)"가 **둘 다 똑같은 회색** — 결제 에러만 노란 경고. "노란경고 없음=키없음"으로 오판하기 쉬움(이번에 한 번 헛짚음).
- 인라인 다국어 자동검사 가드 시도→**철회**: `{ko,en}` 맵 검사가 의사 실명 등 **의도된 ko/en 이중언어 데이터**에 264건 오탐 → 자동화 비현실적, 코드리뷰 체크포인트로만(#38·#39).
- **워크트리엔 node_modules 없음** → 거기선 build/dev 불가. preview dev 서버는 메인폴더를 서빙해서 워크트리 변경의 로컬 시각검증 불가 → **Vercel 프리뷰로 확인**.

**5. 다음 세션이 먼저 할 일**
1. **⚠️ 직전 미검증분 먼저**: #369 다국어가 **실서비스에 반영됐는지**(Vercel 빌드상한 풀린 뒤) — 쿠키창·환자 messages/calendar가 비영어(러/카자흐)로 뜨는지 실화면 1회. ru/kz 번역품질도 눈으로(자동검사 밖).
2. **지도 Maps JavaScript API 켜기** — 키 든 GCP 프로젝트/계정 찾아(authuser 전환) API 사용설정 + 리퍼러 제한. 다른 세션 진행 중일 수 있으니 중복확인.
3. (직전 핸드오프) 가입 메일클릭→자동로그인 실클릭 확인 + 관문3·4·5.

**6. 검증 상태**
- ✅ #365·#369·#372 머지됨. ci·Smoke 초록, `check:content` 통과, eslint 0 errors.
- ✅ #369: ci·Smoke 초록 + 직전 실행에서 Vercel 빌드도 초록(반영확인). 충돌해소 후 재실행은 **Vercel만 rate-limit 빨강(코드 무관)** → PO 승인 하 `--admin` 머지.
- ⚠️ **다국어 실화면(특히 ru/kz 번역·환자화면)은 로컬 시각검증 못 함**(워크트리 node_modules 없음). 인라인 COPY는 i18n 패리티검사 밖이라 자동검증도 안 됨 → Vercel 프리뷰/실서비스에서 눈으로 확인 필요.
- ⚠️ **지도는 진단만, 미해결.**
- PR: #365·#369·#372 전부 머지·CI 초록 확인함.

**7. 다음 세션 첫 프롬프트**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프 읽어라. ①#369 다국어 14곳이 실서비스 반영됐는지(Vercel 빌드상한 풀린 뒤) — 쿠키창·환자 messages/calendar가 러시아어/카자흐어로 뜨는지 1회 확인 ②협력병원 지도: 키(`AIzaSyA_DY…`) 든 구글 프로젝트/계정 찾아 Maps JavaScript API 켜기(코드수정 불필요, 리퍼러 제한도 걸기) — 다른 세션 중복확인. 회색박스는 결제에러만 노란경고고 나머진 다 회색이라 헷갈리니 주의.

---

## 🔖 세션 핸드오프 (2026-06-25 — 가입·인증 흐름 전면 수리: 관문1·2 닫힘 + 비번정책 + token_hash 자동로그인)

> PO가 출시 관문1(실메일 인증)부터 막힘 → 가입/로그인 흐름의 여러 버그를 연쇄로 잡고, 마지막엔 "자율 피버모드"로 자동로그인·비번재설정 흐름을 API레벨까지 검증. **관문1(실메일)·관문2(템플릿/자동로그인) 둘 다 닫음.**

**1. 이번 세션 한 일 (전부 머지·프로덕션 배포됨)**
- **중복가입 거짓안내 버그** [#355] — 이미 가입된 이메일에도 "인증 메일 보냈어요"로 거짓 안내하던 것 → `_data.user.identities` 빈배열로 중복 감지해 "이미 가입된 이메일" 안내(6언어). + 회귀 E2E 가드 `e2e/signup-duplicate-email.spec.ts`(프리뷰 실행 통과). 반성문 [POSTMORTEMS #36].
- **인증메일 자동로그인 안 됨** [#357] — `signUp`에 `emailRedirectTo`가 없어 인증링크가 홈으로 떨어져 code 교환 안 됨 → `emailRedirectTo=/auth/callback` 추가. 반성문 #37.
- **비번 규칙** [#359→#367] — 대문자 강제 제거 요청 → 최종 **8자 + 영문자 + 특수문자**(PO 결정, 숫자→영문+특수로 변경). 가입·비번재설정 두 화면 `SPECIAL_RE` 동일 문자셋. #372(타 세션)가 정규식 불필요 이스케이프 제거(eslint 빨강 해소) — 매칭셋 동일함 실측 확인. 반성문 #39.
- **🔑 메일 인증 클릭→로그인 안 됨 (핵심)** — auth 로그 "One-time token not found": **회사메일(네이버웍스) 보안스캐너가 PKCE 일회용 링크를 프리페치로 미리 소진**. → 이미 있던 `/auth/confirm`(token_hash, 브라우저 JS로만 verifyOtp=스캐너 안전)로 보내도록 **이메일 템플릿 교체**. signup·recovery 둘 다. **API레벨 end-to-end 검증 완료**(verify(type=signup/recovery)→access_token+refresh_token 발급=자동로그인 작동). 반성문 #39.

**2. ⚠️⚠️ git에 안 남는 서버 설정 변경 (Supabase Management API로 적용 — 리포 복구로 안 돌아옴)**
- `password_required_characters` = `""`(요구문자 없음) — 서버는 **자유입력 불가, 프리셋 3종뿐**(없음/소+대+숫자/소+대+숫자+기호)이라 "영문+특수" 커스텀 불가 → 서버는 길이8만, **실제 규칙은 클라이언트 코드가 강제**.
- `password_min_length` = 8.
- 이메일 **confirmation 템플릿** → `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup`.
- 이메일 **recovery 템플릿** → `{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery`.
- (magic_link·email_change 템플릿은 아직 옛 ConfirmationURL — 미사용/저빈도라 보류.)

**3. 왜 그렇게 했는지**
- 서버를 `""`로 둔 건 직무유기 아님: Supabase가 "영문+특수" 프리셋을 안 줘서. 사용자가 실제 겪는 관문은 클라이언트(8+영문+특수)이고 서버는 길이 백스톱.
- token_hash 방식 채택: 회사메일 스캐너가 PKCE GET-verify 링크를 소진하는 고질병의 표준 해법. `/auth/confirm`·`/reset-password`가 이미 token_hash를 처리하게 만들어져 있었음(관문2 코드는 준비됐고 템플릿 연결만 빠졌던 것).

**4. 안 끝났거나 보류**
- **관문3(구글 OAuth 게시 테스트→프로덕션)·관문4(E2E Secrets 6개)·관문5(iOS 마이크·K-01 데모데이터)** = PO 콘솔/기기 작업, 미완.
- magic_link·email_change 메일 템플릿 token_hash 미적용(미사용 추정, 필요 시).
- **Management 토큰(sbp_…) PO가 Revoke 했는지 미확인** — 보안상 꼭 폐기돼야 함.

**5. 주의·함정**
- **비번 규칙 바꾸려면 코드(`SPECIAL_RE` 2곳)와 Supabase 서버 설정을 같이** 봐야 함. 코드만 풀면 서버가 막아 "weak_password"로 더 깨짐(이번에 겪음).
- 이메일 템플릿·비번정책은 **git에 없다**(위 2번). Supabase 설정 초기화되면 이 핸드오프 보고 다시 적용.
- 테스트로 `moon@immunelab.co.kr`·`*_zzq@example.com` 여러 번 생성·삭제함 — 현재 전부 삭제됨(잔존 0 확인).

**6. 검증 상태**
- ✅ 빌드(`next build --webpack`)·main CI 초록(#371/#372 이후)·eslint 0 errors.
- ✅ 서버 정책·템플릿 변경: Management API GET으로 적용 확인. 대문자없는 비번 서버 수락: 실가입으로 확인.
- ✅ **자동로그인 token_hash 흐름: API레벨 검증 완료**(generate_link→verify(type=signup/recovery)→세션 토큰 발급).
- ⚠️ **브라우저에서 실메일 클릭→자동로그인 화면 전환은 PO가 아직 직접 클릭 안 함**(로컬 SSR/메일함 자동화 불가). 흐름은 API로 입증됐고 코드(`/auth/confirm`)도 검증됨 — 남은 건 실클릭 1회.
- 열린 PR: 이 세션 PR(#355·#357·#359·#367)은 전부 머지·삭제됨. 타 세션 #371·#372 머지됨.

**7. 다음 세션이 먼저 할 일**
1. **⚠️ 직전 미검증분 먼저**: PO에게 `moon@immunelab.co.kr`(또는 새 메일)로 가입→메일 클릭→**자동 로그인 되는지** 실클릭 1회 확인 요청(관문1·2 최종 마침표). 안 되면 `/auth/confirm` `type` 값(`signup`↔`email`)만 점검 — API로는 signup이 맞았음.
2. 관문3(구글 OAuth 게시)·관문4(E2E Secrets)·관문5(iOS·데모데이터) — PO 콘솔/기기 작업 안내.
3. (선택) magic_link·email_change 템플릿도 token_hash로(쓰는 흐름이면).

**다음 세션 첫 프롬프트**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프를 읽어라. 그담 PO한테 "moon이나 새 이메일로 가입→인증메일 클릭→자동 로그인 되는지" 실클릭 1회만 확인 요청(관문1·2 마침표). 되면 관문3·4·5(구글OAuth 게시/E2E secrets/iOS·데모데이터) PO 콘솔작업 안내로 넘어가라. 비번/이메일 서버설정은 git에 없으니 핸드오프 2번 항목 참고.

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
