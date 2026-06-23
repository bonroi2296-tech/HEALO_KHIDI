# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

---

## 🔖 세션 핸드오프 (2026-06-23 오후·저녁 — 계층 재편 + 백오피스 점검 + 프리미엄 전면 폐기)

> 이번 세션은 4개 PR을 머지·프로덕션 배포까지 완료(#280·#286·#288·#290). 모두 healwith.co.kr 라이브.
> ⚠️ 세션 내내 어시스턴트가 **legacy/premium을 헷갈려 PO가 여러 번 바로잡음** — 4번(주의) 꼭 읽을 것.

**1. 이번 세션 한 일:**
- **계층별 테스트 계정 정리** → `docs/TEST_ACCOUNTS.md` 신설(환자/코디/병원/에이전시/의료기관 @test.com, 비번 test1234 / clinic만 clinic1234, admin은 의도적 미생성).
- **계층 재편 마이그레이션 [#280](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/280)** (머지·배포·**prod curl 리다이렉트 검증 ✅**): 국내병원 `/partner`→`/hospital`(옛주소 307 리다이렉트, `/api/partner/*` API경로는 유지) · 해외의료기관 `/agency`→`/clinic` 분리(partner_type 게이팅+불일치 자동이동) · 의사 `/doctor` **비활성화**(proxy→홈, 코드·role=doctor 계정·상담 배정은 보존). 표준 `accountTiers.ts`·`resolveLanding.ts`·`proxy.ts` + 문서 갱신. 기획 `KHIDI_역할_프로세스_기획.md` §7 실행.
- **백오피스 전수 점검**(5포털): 바깥(병원 `/hospital`·해외 `/agency`·`/clinic`)=🟢건강, 안쪽(환자·코디)에 구멍 발견.
- **환자·코디 수리 [#286](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/286)** (머지·배포): 증상기록 `symptom_reports.patient_user_id` 컬럼 추가(가역·prod 적용)+저장+`?mine` 조회로 본인 기록 표시 / 재진예약은 정식 테이블 `followup_schedules`(`/api/portal/followup`)로 배선 / 코디 메뉴를 실제 라우트로 정합(404 링크 제거). 반성문 #29.
- **프리미엄 디자인 전면 폐기 [#288](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/288)** (머지·배포): 토글(legacy/premium) 제거·legacy 단일화, `*Premium` 16개+healo `Nav/Footer/PageShell/Notification류/Skeleton/DesignToggle`+`designMode.js` **총 28파일 삭제**(−10,212줄). 보존: Primitives·EmergencyButton(SOS)·Photos·healo-tokens·모든 `*Legacy`. `PREMIUM_TEARDOWN_PLAN.md` 참고.
- **헤더 '내 페이지' hop 수정 [#290](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/290)** (머지·배포): 코디·에이전시가 `/patient` 들렀다 튕기던 것 → `app_metadata.role` 기준 곧장 라우팅.

**2. 왜 그렇게 했는지:**
- **`/doctor`는 삭제 아니라 비활성화** — PO "냅두고 비활성화만 해봐". 의사 계정·상담 '담당 의사' 배정은 계속 쓰임.
- **프리미엄 폐기** — PO: premium은 A/B 실험용으로 만들었다 **안 쓰기로 함**. 근데 `PageShell`(=프리미엄 Nav 껍데기)이 legacy 페이지까지 감싸 **이중 헤더** + 프리미엄 누수 발생 → 단일 legacy로 통일. (premium은 **앞으로 추가 개발 안 함** — PO 명시.)
- **재진 정식 테이블 = `followup_schedules`** — 실DB 확인 결과 `consultation_sessions.rebooking_source` **컬럼이 아예 없음**(코드/엔진은 있다고 가정). 코드 아닌 실스키마가 진실.

**3. 안 끝났거나 보류:**
- **[#274](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/274)(초안) 닫아야 함** — #286/#288로 대체됨(코멘트 남김). 머지 금지, 닫기만.
- **재진예약 기능 휴면** — 엔진 `/api/khidi/rebooking/create`가 **없는 컬럼 `consultation_sessions.rebooking_source`에 씀** → `followup_schedules`(0행)는 안 채워짐. 화면은 정식 테이블로 배선했으나 **엔진을 followup_schedules로 고쳐야** 데이터가 생김(근본수정 별도).
- **`/patient/messages`·`/patient/calendar` 본문** 아직 프리미엄 톤(serif/gold) — PageShell만 떼고 본문·Primitives 유지. legacy 리스타일 필요.
- **`stories/StoriesClient.jsx`** 가 삭제된 PageShell을 import — stories는 비활성(홈 redirect)이라 빌드 영향 0. stories 재활성 시 손볼 것.

**4. 주의·함정:**
- ⚠️ **legacy/premium 헷갈리지 마라**: `components/healo/`가 프리미엄 디자인시스템, `PageShell`이 프리미엄 Nav 래퍼였음. 이번에 대부분 제거. **premium은 추가 개발 안 함**(PO). 활성 화면=legacy 단일. (자세히: `design_mode_premium_legacy` 메모리)
- ⚠️ **변경 적용할 때 불필요한 것(서비스 이름·브랜드 등) 건드리지 마라** — PO가 "서비스 이름도 바꿨냐"고 추궁(실제론 안 바꿈, HEALO→healwith는 2026-06-17 #43). 요청 범위만 정확히.
- ⚠️ **단정 전에 실제 코드·실DB로 확인** — `information_schema`로 컬럼 존재 확인(rebooking_source 유령 컬럼 사례). 코드가 X를 쓴다고 X가 있는 건 아님.
- **자동저장 훅 2분마다 `git add -A` 커밋** — 멀티파일 작업 시 무관 파일 섞임. 깨끗한 새 브랜치(origin/main 기준)에 내 파일만 모아 PR, `git diff origin/main...HEAD` net으로 확인.

**5. 다음 세션이 먼저 할 일 (우선순위):**
1. **⚠️ 직전 미검증분 먼저(로그인 실클릭)**: 배포는 됐으나 **로그인 화면은 직접 클릭 검증 못 함**. `/coordinator`·`/patient`로 로그인해서 ①헤더가 1개만 뜨는지(이중헤더 해소) ②'내 페이지' 눌러 곧장 가는지(hop 없음) ③환자 증상기록 입력→본인 기록 표시되는지 확인.
2. **#274 닫기**(대체됨).
3. (선택) **재진 엔진 근본수정** — `rebooking/create`를 `followup_schedules`에 쓰도록(현재 유령 컬럼).
4. (선택) `/patient/messages`·`/calendar` 본문 legacy 리스타일.

**6. 검증 상태:**
- ✅ 빌드(`next build --webpack`, 239p)·`check:content`·CI(ci+smoke) — **4개 PR 다 통과·머지·prod 배포 READY**(Vercel 확인).
- ✅ 계층 재편 리다이렉트: **prod curl로 검증**(`/partner`→`/hospital`, `/doctor`→`/`, `/clinic`·`/agency` 200).
- ❌ **로그인 화면 실클릭 미검증**: 환자·코디 대시보드/헤더/내페이지/증상기록은 로그인 필요라 curl로 못 봄(→ 5번 1).
- 열린 PR: **#274**(초안, 대체됨 → 닫을 것).

**7. 다음 세션 첫 프롬프트:**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프 읽어. 어제(2026-06-23) 계층 재편·환자코디 수리·프리미엄 전면 폐기·헤더 hop 수정을 prod에 다 올렸는데 **로그인 화면 실클릭 검증이 안 됐어**. ①코디/환자로 로그인해서 헤더 1개만 뜨는지·'내 페이지' 곧장 가는지·증상기록 본인 것 표시되는지 봐줘. ②안 닫힌 PR #274 닫고. 그담에 재진예약 엔진(없는 컬럼 rebooking_source 대신 followup_schedules에 쓰게) 근본수정 할지 정하자.

## 🔖 세션 핸드오프 (2026-06-23 오전 — 앱아이콘 교체 + PWA "앱 설치" 배너 복구 + iOS 사파리 안내 배너)

> 작업본(브랜치)은 세션 내내 다른 세션/자동저장 훅이 계속 바꿔 끼움(`feat/tier-restructure-hospital-clinic`→`-clean`). **내 작업은 전부 main에 직접 올림(별도 worktree로 cherry-pick)** — 진행 중이던 partner→hospital 작업과 안 섞이게. 3건 모두 프로덕션 배포 완료(Vercel READY 확인).

**1. 이번 세션 한 일:**
- **앱 아이콘 교체** — PO가 "말풍선(채팅 버블) 안에 굵은 h" 새 디자인 이미지 제공(`icons/icon.png`, 1254² 정사각). `node scripts/gen-app-icons.mjs`로 PWA 8종·파비콘 16/32·apple-touch·iOS 1024·Android 6밀도(런처·라운드·적응형) 일괄 재생성. 커밋 943481c (main).
- **🔴 버그 복구: 모바일 "앱 설치" 배너가 안 뜨던 것** — 직전 아이콘 교체(a9a6673)가 `public/favicon.svg`를 지웠는데 서비스워커(`public/sw.js`) `PRECACHE_URLS`에 `/favicon.svg`가 남아 있었음. SW 설치 시 `cache.addAll`(원자적)이 404로 전체 실패 → **서비스워커 설치 자체가 실패** → Chrome PWA 설치조건(installability) 깨짐 → "앱 설치(홈 화면에 추가)" 배너 사라짐. 죽은 항목 제거 + `addAll`→개별 `cache.add`+`Promise.allSettled`(파일 하나 빠져도 SW 안 죽음) + `CACHE_NAME` v3→v4. **POSTMORTEMS #27**. 커밋 0fd822b (main).
- **iOS 사파리 "홈 화면에 추가" 안내 배너 신설** — iOS 사파리는 애플 정책상 자동 설치 배너가 없음(공유→홈화면 수동만). iOS 사파리 + 비standalone + 미닫힘일 때만 하단에 안내 배너 노출(닫으면 localStorage 기억), 6개 언어(ko·en·ru·kz·zh·ja). 새 파일 `app/IosInstallHint.jsx` + `app/layout.jsx`에 연결. 커밋 9b4740c (main).

**2. 왜 그렇게 했는지:**
- **아이콘은 PO가 디자인 리드** — 내가 SVG 시안을 띄웠지만 PO가 직접 다듬은 이미지를 줘서 그걸 원본으로 채택(내가 단어/디자인 지어내지 말고 PO 결정본을 6개언어/전사이즈로 실행만 — 누적 취향과 일관).
- **main에 직접 푸시(PR 없이)** — 저위험 자산/버그수정 + PO 승인 끝 + 같은 폴더에 다른 세션의 미완성 작업(partner→hospital)이 떠 있어 그 브랜치에 얹으면 안 섞임. 깨끗한 임시 worktree로 main 꺼내 cherry-pick→push 반복.
- **SW를 allSettled로 구조 변경** = 단순 favicon 제거가 아니라 "프리캐시 파일 하나 사라지면 SW 통째로 죽는" 부류 자체를 영구 차단(재발방지가 곧 구조).

**3. 안 끝났거나 보류:**
- (보류 없음 — 3건 다 배포 완료) 다만 **실기기 클릭 검증은 못 함**(아래 6번).

**4. 주의·함정:**
- **같은 폴더에서 다른 세션이 동시 작업 중** — 작업본 브랜치가 수시로 바뀌고(`feat/tier-restructure-*`), 2분마다 자동저장 훅이 `git add -A` 커밋함. 멀티파일 작업 시 **내 파일만 콕 집어 add/commit**하고, main 반영은 **별도 worktree에서 cherry-pick**해라(이번에 그렇게 함). 진행 중 partner→hospital(/agency↔/clinic 분리, /doctor 비활성)은 **건드리지 말 것**.
- 이미 홈화면에 설치한 폰은 아이콘이 **재설치 전까지 옛것**으로 보일 수 있음(OS 캐시) — 버그 아님.

**5. 다음 세션이 먼저 할 일 (우선순위):**
1. **⚠️ 직전 미검증분 먼저(실기기 확인)**: ①안드로이드 크롬 시크릿으로 healwith.co.kr → "앱 설치" 배너 + 새 말풍선 아이콘 뜨는지. ②iOS 사파리 시크릿 → 하단 "공유→홈화면 추가" 안내 배너 뜨는지(닫으면 안 다시 뜨는지). 안 뜨면 `IosInstallHint.jsx`의 Safari 판정(`/crios|fxios|edgios|opios/` 제외) 점검.
2. (다른 세션 영역) partner→hospital 계층 재편은 그쪽 세션/PR에 맡김 — 중복 작업 금지.

**6. 검증 상태:**
- **3건 모두 Vercel 프로덕션 빌드 READY 확인**(get_deployment): 아이콘 943481c, SW수정 0fd822b, iOS배너 9b4740c → **빌드 통과 = 코드 정상**.
- 아이콘 전사이즈 생성 ✅(스크립트 로그 + 32px 파비콘 육안 확인). favicon.svg 잔재 전수스캔 ✅(sw.js 한 곳뿐, 제거).
- **실기기 런타임 미검증** — 안드로이드 "앱 설치" 배너 실제 노출/iOS 안내 배너 실제 표시는 **직접 클릭 확인 못 함**(데스크톱 프리뷰로는 installability·iOS UA 재현 불가). → 5번 1순위로 승격.
- PR 없음(main 직접 푸시). `check:content`/`tsc`/`vitest` 로컬 미실행(node_modules 환경 이슈) → Vercel 빌드가 게이트 역할.

**7. 다음 세션 첫 프롬프트:**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프 읽어. 어제(2026-06-23) 앱아이콘 교체·PWA 설치배너 복구·iOS 안내배너를 prod에 올렸는데 **실기기 확인이 안 됐어**. ①안드로이드 폰 크롬 시크릿으로 healwith.co.kr 들어가서 "앱 설치" 배너랑 새 말풍선 아이콘 뜨는지, ②아이폰 사파리 시크릿으로 하단 "공유→홈화면 추가" 안내 배너 뜨는지 확인해줘(안 뜨면 IosInstallHint.jsx 점검). partner→hospital 작업은 다른 세션 거니 건드리지 마.

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
