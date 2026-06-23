# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

---

## 🔖 세션 핸드오프 (2026-06-23 밤 — 세션 갈무리: 열린 PR 정리)

> 여러 세션이 작업을 끝낸 뒤 흩어진 상태를 정리한 "갈무리" 세션. 코드 변경 없음(열린 PR 처리 + 핸드오프 정리만). PO 지시: "세션들 작업 종료는 다 했으니 갈무리해라."

**1. 이번 세션 한 일:**
- **열린 합치기 신청서(PR) 전수 점검** — 열린 PR은 #274·#298 둘뿐임을 확인.
- **[#274](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/274)(초안) 닫음** — 포털 API화(증상·재진·여정 서버 API) 작업이 이후 머지된 #286(증상 `patient_user_id` 실스키마 배선)·#288(프리미엄 컴포넌트 전면 폐기 — RebookingPremium/SymptomsPremium 삭제)·#297(문의 양방향 조회 복구)로 **대체**되어, 대체 사유 코멘트를 달고 **머지 없이 닫음**. (직전 핸드오프 "다음 할 일 2번" 이행. 코드는 브랜치 `claude/extended-reasoning-tokens-dvmu0a`에 보존.)
- **[#298](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/298) 상태 확인 후 보류** — 암종 페이지 비용·비자 전환 콘텐츠. 자동검사(CI) `ci`·`Smoke Tests` **둘 다 통과(초록)**, Vercel만 "일일 배포한도 초과(24h 후 재시도)"로 프리뷰 대기. 카피 톤이 초안(특히 RU/KZ)이라 **머지하지 않고 PO 비동기 검토 대상으로 남겨둠**(큰 UI/카피 변경 = 멈춰 세우지 말고 프리뷰 남기기 규칙).

**2. 왜 그렇게 했는지:**
- **#298은 머지 안 함** — 카피 톤(특히 러시아어·카자흐어)은 PO가 검토해야 할 "큰 UI/카피 변경". 자율 규칙상 저위험 UI만 자동 머지, 톤 변경은 프리뷰만 남기고 PO 비동기 검토.
- **#274는 닫기만(머지 금지)** — 직전 핸드오프가 이미 "대체됨 → 닫기"로 결정. 코드 보존은 브랜치에 남으므로 닫아도 손실 없음.

**3. 안 끝났거나 보류:**
- **[#298] PO 카피 검토 대기** — Vercel 일일 배포한도(24h)로 프리뷰가 한동안 안 뜰 수 있음. 한도 풀리면 프리뷰 링크로 6개 언어 카피 톤 확인 → 머지 결정.
- **origin 원격 작업본(브랜치) 100개+ 누적** — 대부분 이미 머지됐거나 폐기됨. 정리(머지된 브랜치 가지치기)는 되돌리기 애매해 **PO 결정 대기**(머지된 것만 추려 삭제하면 안전, PR/reflog로 복구 가능).
- 직전 세션의 보류(재진 엔진 `rebooking_source` 유령컬럼 근본수정 / `/patient/messages`·`/calendar` legacy 리스타일 / stories PageShell import)는 **그대로 유지** — 이번 세션 범위 아님.

**4. 주의·함정:**
- ⚠️ **#298의 "Vercel failure"는 코드 실패 아님** — "Deployment rate limited — retry in 24 hours"(일일 배포한도). 실제 CI(ci·Smoke)는 초록. 자동저장 푸시 10분 쓰로틀(커밋 1594b97)이 이 한도 소진을 줄이려는 조치였음.
- **이번 세션은 `claude/session-cleanup-iof9wj` 브랜치이나 코드 커밋 없음** — 이 핸드오프 문서 변경만 푸시.

**5. 다음 세션이 먼저 할 일 (우선순위):**
1. **⚠️ 직전 미검증분 먼저(로그인 실클릭)** — 2026-06-23 오후·저녁 배포분: `/coordinator`·`/patient` 로그인해서 ①헤더 1개만 뜨는지(이중헤더 해소) ②'내 페이지' 곧장 가는지(hop 없음) ③환자 증상기록 입력→본인 기록 표시되는지.
2. **#298 처리** — Vercel 한도 풀린 뒤 프리뷰로 6개 언어 카피 톤(특히 RU/KZ) 확인 → 머지 or 수정.
3. (선택) origin 머지된 브랜치 가지치기 — PO가 정리 OK 하면.
4. (선택) 재진 엔진 근본수정(`rebooking/create`→`followup_schedules`) / `/patient/messages`·`/calendar` legacy 리스타일.

**6. 검증 상태:**
- ✅ **열린 PR 사실 확인(GitHub MCP)**: 닫기 전 열린 PR = #274·#298. #274 닫음 → **현재 열린 PR은 #298 하나**.
- ✅ #298 자동검사: `ci` success · `Smoke Tests (PR)` success(GitHub MCP `get_check_runs` 확인). Vercel만 rate-limit failure(코드 무관).
- ❌ **직전 세션 미검증(로그인 실클릭) 그대로** — 이번 세션에서도 확인 안 함(코드 변경 없어 범위 밖) → 5번 1순위 유지.
- 코드 변경 0 → 빌드·`check:content` 재실행 불필요(이 세션 푸시 = 문서만).

**7. 다음 세션 첫 프롬프트:**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프 읽어. 갈무리 세션에서 #274(대체됨) 닫았고, 지금 열린 PR은 #298(암종 비용·비자 콘텐츠) 하나 — CI는 초록인데 Vercel 일일배포한도로 프리뷰 대기였어. ①Vercel 한도 풀렸으면 #298 프리뷰로 6개 언어 카피(특히 러시아·카자흐) 톤 봐주고. ②그보다 먼저: 2026-06-23 배포분 로그인 실클릭 검증이 아직 안 됐어 — 코디/환자로 로그인해서 헤더 1개만 뜨는지·'내 페이지' 곧장 가는지·증상기록 본인 것 표시되는지 확인해줘. ③원격 브랜치 100개+ 쌓였는데 머지된 것 정리할지도 정하자.

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
