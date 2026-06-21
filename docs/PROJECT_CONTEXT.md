# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

---

## 🔖 세션 핸드오프 (2026-06-21 추가 — prod 배포확인 세션) — #202 역방향 프리뷰 실검증 + cron 3종 전수 점검(전부 정상) + #160 다자카메라 코드·prod 확인

**이번 세션 한 일 (코드 변경 0 — 전부 검증·진단):**
- **#202(병원응답 역방향) end-to-end 실검증 (프리뷰):** prod에 아직 안 떠서(아래) #204 프리뷰(=#202와 동일 코드)에서 검증. `hospital@test.com`(TEST 병원 owner)으로 데모 #13 리드를 `replied → converted(치료 확정)`로 실제 `PATCH /api/partner/leads/[id]` 호출 → ① DB `case_status_history`에 "🏥 TEST 병원 치료 확정 (견적 8000~12000)" 새 이력 추가 ② **코디 보드**(`/api/admin/khidi/cases`, coordinator@test.com) 배정병원 배지 = `converted`+견적 ③ **에이전시 포털**(`/api/agency/inquiries`, agency@test.com) 타임라인에 치료확정 단계 노출. **닫힌 고리(병원→코디·에이전시 자동 반영) 실데이터로 작동 확인.**
- **만족도/침묵/KPI cron 3종 전수 점검 → 전부 정상 (직전 "cron 미발송"은 오해였음):**
  - **dispatch-surveys ✅**: 2026-06-21 **09:32 UTC에 설문 1건 발송**됨(`surveys`·`reminders_scheduled` 각 1행, 09:32:04). 무료플랜이 cron을 정시(09:00)가 아니라 **그 시간대 ±59분 내**에 돌려서 09:32에 발사 → 심야 세션이 09:32 전에 봐서 "0건"으로 오판한 것. KPI K-03 측정 파이프라인 살아있음.
  - **kpi-snapshot ✅**: `kpi_snapshots` 34행, 마지막 2026-06-20(오늘치는 15:05 UTC 예정).
  - **detect-silent-patients ✅(버그 아님)**: `symptom_alerts` 0행이지만, `buildSilenceAlert`가 **증상기록을 한 번이라도 한 환자만** 침묵 판정(전원 알림 폭주 방지 설계 — `lastEntryAt==null`이면 null 반환). 현재 DB에 `symptom_reports` 1건뿐이라 0건이 정상 결과. 순수함수+단위테스트로 잠겨 있음.
- **#160(화상방 전원 카메라·마이크 = 다자회의) 코드·배포 확인:** 영상 그리드는 원래부터 다자 대응(`GridLayout`+핀/포커스+발화자 강조, `app/consultation/[id]/page.jsx`). #160이 바꾼 건 **서버 토큰 권한**뿐 — `token/route.ts`·`guest-join/route.ts` 둘 다 전 역할 `canPublish/canSubscribe/canPublishData=true` 확인. **prod 커밋(19ab034 #200)에 이미 포함 = 실서비스 라이브.**

**왜 그렇게 했는지:**
- #202 prod 미배포라 prod 검증 불가 → PO가 "프리뷰에서 지금 검증" 선택(무료 한도 대기 선호와 일관). 브라우저 없어서 클릭 대신 **각 역할 토큰으로 실제 API 호출 + DB 추적**(CLAUDE.md 데이터흐름 추적 self-QA 방식)으로 검증.
- cron은 KHIDI 만족도(K-03) 직결이라 "안 돈다"는 직전 메모를 의심하고 DB 실데이터로 재확인 → 실은 무료플랜 cron 지연(±59분) 특성이었음.

**안 끝났거나 보류:**
- **#202가 실서비스(prod) 미배포** — prod=`19ab034`(#200)까지만. #202(`eb73623`)는 main에 머지됐으나 2026-06-21 11:53 머지 직후 **Vercel 무료 일일 빌드한도** 때문에 자동배포가 안 떴음(#204 PR 본문에도 명시). **2026-06-22 한도 리셋되면 다음 main 변경 시 자동 배포.**
- **#160 라이브 2명+ 카메라 동시 송출 렌더 테스트** — 코드·prod 라이브는 끝났으나 실제 여러 명이 카메라 켜고 보이는지는 **PO 동석 실테스트만 가능**(자동/원격 불가).

**주의·함정:**
- **데모 #13은 `converted`/`scheduling`까지 진행된 상태로 그대로 둠**(자연스러운 진행이라 안 되돌림). 다음에 #13으로 또 테스트하면 이미 끝단계임을 감안.
- **cron은 무료플랜에서 정시±59분**에 돈다 — "정시에 로그 없다"고 안 돈 걸로 오판 금지. **무료플랜 런타임 로그 보존이 짧음(≈최근 1시간)** → 과거 cron 실행 여부는 로그 말고 **side-effect(DB 행)**로 확인.
- #160 토큰은 **전원 송신 허용**이지만 입장은 여전히 `requireConsultationAccess`/유효 초대토큰만 — 난입 차단 유지.

**다음 세션이 먼저 할 일 (우선순위):**
1. **⚠️ 직전 미검증분 먼저 확인:** (a) **2026-06-22 한도 풀렸으면 #202가 prod에 떴는지 확인** → 떴으면 prod healo-khidi.vercel.app에서 병원 계정으로 #13(또는 새 케이스) 상태 변경 1회 클릭해 코디·에이전시 반영 재확인. (안 떴으면 main 빈 커밋/다음 머지로 배포 트리거.) (b) **#160 화상방에 2명+ 들어가 카메라 동시 송출 라이브 확인**(PO 동석).
2. (선택) 침묵 알림이 실제로 의미 있으려면 **환자가 증상기록을 쓰기 시작해야** 데이터가 쌓임 — 필요시 테스트 증상기록 심어 detect-silent 1회 검증.
3. KHIDI 중간평가(2026-08-27) 상시 — 만족도(K-03)·유치전환 대시보드 직결.

**검증 상태:** 이번 세션 **코드 변경 없음**(검증·진단만). **#202 역방향: #204 프리뷰에서 실API+DB로 end-to-end 검증 ✅(단 prod 아님).** **cron 3종(survey/kpi/silent): DB 실데이터로 정상 확인 ✅.** **#160: 코드(토큰 canPublish=true 2파일)·prod 포함 확인 ✅, 라이브 다자 렌더는 ❌미검증(PO 동석 필요).** prod 현재=`19ab034`(#200), **#202 prod ❌미반영(Vercel 한도, 2026-06-22 대기).** 열린 PR: #204(핸드오프 문서·DRAFT아님)·#197(STT, DRAFT) — 둘 다 이번 세션 무관. CI 상태는 이번 세션 미확인(코드 변경 없어 불필요).

**다음 세션 첫 프롬프트:**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프(2026-06-21 추가) 읽어. 2026-06-21에 #202(병원응답 역방향)는 프리뷰에서 검증 끝났는데 Vercel 무료 빌드한도 때문에 실서비스엔 아직 #200까지만 올라가 있어(prod=19ab034). 1) 한도 풀렸으면 #202가 prod에 떴는지 확인하고, 떴으면 healo-khidi.vercel.app에서 병원 계정(hospital@test.com / test1234)으로 데모 #13 상태 바꿔서 코디·에이전시 반영 prod에서 1회 확인. 안 떴으면 배포 트리거해줘. 2) 화상방 다자 카메라(#160)는 코드·배포 다 됐으니, 나랑 2명 들어가서 카메라 켜고 보이는지 라이브로 확인하자(준비만 시켜줘). 3) cron(만족도·KPI·침묵)은 다 정상 확인됨 — 추가로 볼 거 있으면 추천해줘.

---

## 🔖 세션 핸드오프 (2026-06-21 밤) — 계정 계층 8종 정리 + 해외 의료기관 신규 + 역할별 로그인 착지 + 에이전시 '환자 의뢰하기' + ⚠️Vercel 배포한도 대기

**이번 세션 한 일:**
- **#178 (✅머지·배포): 계정 계층 8종 단일 표준 확정 + 해외 의료기관 신규.** 실제 인증코드(`app_metadata.role`+`hospital_users`+`agency_users`)와 어긋난 유령 역할묶음(`roles.ts`/`user_roles`: korean_hospital/local_clinic/agent) 통일. `src/lib/auth/accountTiers.ts`가 단일 SoR(게스트·환자·코디·의사·관리자·국내병원·해외에이전시·해외의료기관). **해외 의료기관(8번째)** = 에이전시와 기능 동일 → 별도 테이블/포털 안 만들고 `agencies.partner_type`('agency'|'medical_institution') 한 컬럼으로 구분(마이그레이션 `20260621` **prod 적용 완료**, additive). 코디·의사 포털에 역할 문지기(`StaffPortalGate`+`/api/me`) 추가(전엔 로그인만 하면 뚫림). `docs/ACCOUNT_TIERS.md`+가드 테스트 14개.
- **#184 (✅머지·배포): 로그인 후 역할별 포털 착지 + /agency 크롬 정리.** 전엔 로그인 시 무조건 `/patient`로 보내 에이전시가 환자 대시보드를 봄. `src/lib/auth/resolveLanding.ts`(역할→착지경로), `/api/me`가 `landing` 반환, `LoginPremium`이 그걸 보고 분기, `auth/callback`도 역할별. `ClientShell` `isPortalPage`에 `/agency` 포함 → 환자용 헤더·하단탭바(SOS·병원) 숨기고 깔끔한 포털 상단바.
- **#187 (머지됨·⚠️prod 미배포): 프리미엄 환자 대시보드 비환자 가드.** 이미 로그인된 채 `/patient`에 머물면 #184가 안 먹혀서 가드 추가.
- **#191 (머지됨·⚠️prod 미배포): 레거시 환자 대시보드에도 같은 가드.** 환자 대시보드가 **두 버전**인데 디자인 **기본값이 LEGACY**라 실제로 뜨는 건 `PatientDashboardClient`였음 — #187(프리미엄만)으론 안 고쳐져 PO가 "아직 그대로"라 재신고 → 레거시에도 추가. `/api/me` 에이전시 landing=`/agency` **실측 확인**(프리뷰 토큰 호출).
- **#194 (📝DRAFT·배포한도로 프리뷰 못 만듦): 에이전시 '환자 의뢰하기'.** 에이전시 포털이 조회전용이라 직접 환자 의뢰 불가(관리자가 `/admin/khidi/cases`에서 수동 배정해야만 노출)였음. `POST /api/agency/refer`(checkAgencyAuth, 본인 agency_id 강제, PII AES-256-GCM 암호화, case_status='received'+이력+관리자 알림) + `/agency`에 '+환자 의뢰하기' 폼.
- **테스트 계정 6종 생성**(Supabase auth 직접 insert): `patient/coordinator/doctor/hospital/agency/clinic @test.com` / **`test1234`**. agency·clinic·hospital은 **TEST 전용 기관**에 연결(실데이터 격리). **admin은 의도적으로 안 만듦**(test1234 관리자=환자PII 복호화 위험).

**왜 그렇게 했는지:**
- 해외 의료기관은 PO가 8번째 계층으로 "만든다" 결정 → 에이전시 인프라 재활용이 가장 안전·DRY(별도 포털 중복 X).
- #191은 "환자 대시보드가 2개(레거시/프리미엄), 기본이 레거시"란 함정 때문 — 프리미엄만 고치면 안 보임. 둘 다 고쳐야.
- #194는 머지 안 함: **보이는 새 기능 → 프리뷰로 PO 확인 먼저**(PO 취향). 그런데 Vercel 한도로 프리뷰조차 못 만들어 대기.

**안 끝났거나 보류:**
- **⚠️ Vercel 무료 배포 한도(하루 100회) 초과** — 한 세션에서 PR을 많이 만들어 초과. 약 24시간 뒤(2026-06-22) 풀림. **PO 결정: 유료(Pro $20/월) 안 쓰고 2026-06-22까지 무료 대기.** 그래서 #187·#191(머지됨)이 **prod 미반영**(현재 prod=`6bc613b` #187빌드라 #191 없음), #194 프리뷰도 못 만듦.
- **TEST 에이전시에 환자 진행 예시 1건 넣기** — PO가 "넣을까요?"에 답 안 함(데모용, 미실행).

**주의·함정:**
- **Vercel 배포 한도**: 한 세션에서 PR/푸시 남발하면 하루 100 배포 초과 → 프리뷰·prod 다 막힘. PR 묶어서.
- **환자 대시보드 2종**: `PatientDashboardClient`(레거시·**기본값**) + `PatientDashboardPremium`. 환자 화면 손대면 **둘 다** 고쳐라(레거시가 실제로 뜸).
- **`@/*`=`src/*` alias** — `app/` 컴포넌트는 상대경로 import(`StaffPortalGate` 빌드 실패 경험). `case_status_history`는 생성타입에 없어 `(supabaseAdmin as any)`.
- **squash 머지 후 같은 브랜치 이어쓰면 충돌**(#184 dirty 경험) → `git fetch origin main` 후 origin/main 기준 새 브랜치, 옛 커밋 cherry-pick.
- **테스트 계정**: coordinator/doctor는 실환자 PII 봄 → 외부 에이전시엔 `agency@test.com`만. admin 미생성.

**다음 세션이 먼저 할 일 (우선순위):**
1. **⚠️ 배포 대기분 먼저 처리(자동 불가):** Vercel 한도 풀렸는지 확인 → (a) **#194 프리뷰 빌드되면 PO에게 '환자 의뢰하기' 화면 보여주고 OK받고 머지** (b) **#187·#191이 prod 반영되게 main 배포 트리거**(#194 머지가 곧 트리거, 아니면 빈 커밋). (c) prod에서 **에이전시 로그인→/agency·자동튕김·의뢰 폼 end-to-end 1회 실클릭 확인**(`agency@test.com`/`test1234`).
2. (선택) PO가 원하면 TEST 에이전시에 환자 진행 예시 1건 넣어 데모.
3. 직전(2026-06-21 저녁) 미검증분 그대로: 화상방 다자 카메라(#160)·만족도/침묵 알림 수신(데이터 쌓여야).
4. KHIDI 중간평가(2026-08-27) 상시.

**검증 상태:** 각 변경 **로컬 tsc 0 / eslint 0 error / next build --webpack 통과**. vitest accountTiers 14개 추가(#178 때 총 259). **#178·#184: CI(`ci`·`Smoke`) 초록 + squash 머지 + prod 배포 확인.** **#187·#191: CI 초록 + 머지됐으나 ⚠️prod 배포 실패(Vercel 한도) → prod 미반영.** **#194: DRAFT, 로컬 빌드만 통과, 프리뷰/CI 미생성(한도).** 마이그레이션 `20260621`(agencies.partner_type) prod 적용·확인. `/api/me` 에이전시 landing=`/agency` 실측 확인. **❌ 미검증: #194 화면(프리뷰 못 만듦) / #191 prod 동작 / 에이전시 의뢰 end-to-end(폼→DB→목록) — 전부 2026-06-22 배포 후.**

**다음 세션 첫 프롬프트:**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프 읽어. 2026-06-21에 Vercel 배포 한도(하루 100회)에 걸려서 #187·#191(머지됨)이 실서비스에 아직 안 올라갔고 #194(에이전시 '환자 의뢰하기')는 초안 상태야. 한도 풀렸는지 확인하고: ①#194 프리뷰 만들어서 나한테 '환자 의뢰하기' 화면 보여주고 OK받으면 머지 ②#187·#191도 실서비스 반영되게 배포 트리거 ③에이전시 계정(agency@test.com / test1234)으로 로그인→에이전시 화면·환자 의뢰 폼 실제 작동 1회 확인해줘.
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
