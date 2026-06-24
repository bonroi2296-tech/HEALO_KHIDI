# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

---

## 🔖 세션 핸드오프 (2026-06-24 늦은오후 — 국내 의료기관(병원) 백오피스 강화 2건)

> 병원 포털(`/hospital`) 테스트 중 PO 피드백 반영. ①콘텐츠 메뉴 비활성 + 대시보드 '경영 현황판'화 [#335] ②리드 상세에 임상 판단 패킷 + 원격협진 가능시간 코디 전달 [#338]. **둘 다 머지·프로덕션 배포됨.** 단 실데이터가 데모 리드 1건뿐 + 로컬 SSR 쿠키 로그인 자동화가 막혀 **시각 런타임 검증은 못 함**(빌드·CI는 초록).

**1. 이번 세션 한 일:**
- **[#335](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/335) 머지·배포 — 비활성 + 대시보드 경영현황판화**: 「병원 정보」·「시술 카탈로그」 메뉴 비활성(`app/hospital/_components/featureFlags.js`의 `HOSPITAL_CONTENT_ENABLED=false` 한 값 토글, 직접 URL 접근도 대시보드로 redirect, 코드는 보존). 대시보드를 **응답대기·전환율·평균 첫 응답시간·확정 견적합계(예상매출) KPI + '응답 필요' 할 일 큐**로 재편(리드 목록과 차별화). 리드 화면에 **검색·정렬·CSV 내보내기** 추가.
- **[#338](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/338) 머지·배포 — 리드 임상 상세 + 원격협진 가능시간**: 리드 상세를 원본 의뢰에서 끌어온 **임상 패킷**으로(신설 `GET /api/partner/leads/[id]`) — 환자명·국적·언어·**암종·병기·진단일·현재치료상태·방한시기·보험·환자가 쓴 메시지(복호화)·첨부 의료기록(signed URL)**. 이메일·전화·연락처는 미노출. + **원격협진 가능 시간 슬롯**(datetime-local) 입력 → `hospital_leads.metadata.consult_slots` 저장 + `case_status_history` 타임라인에 "📹 원격협진 가능시간: …(KST)"로 코디에게 전달.

**2. 왜 그렇게 했는지:**
- **비활성**: 공개 프론트(`/hospitals`·`/treatments`)가 병원 자가입력 콘텐츠를 노출할 준비가 안 됨 → 메뉴만 끄고 코드 보존(나중에 플래그 1값만 `true`).
- **임상 패킷**: PO 지적 "병원이 시술·국가만 보고 견적·치료가능 여부를 못 판단한다" → 원본 `inquiries`에서 복호화(`decryptInquiryForAdmin`)해 노출. 신원 PII는 가리되 **이름은 PO 결정으로 노출**("병원이 식별 필요").
- **코디 전달 채널 재사용**: 새 알림을 만들지 않고 코디가 이미 보는 `case_status_history`에 남김(에이전시 '화상상담 요청' #330과 동일 패턴 — 일관성).

**3. 안 끝났거나 보류:**
- 둘 다 머지·배포 완료라 보류 코드는 없음. **후속 = 데이터가 쌓인 뒤 KPI·임상 패킷이 실제로 채워져 보이는지 확인**(현재 데모 1건).

**4. 주의·함정:**
- ⚠️ `partner/leads/[id]` GET의 inquiries 조회는 **`(supabase as any)` 캐스팅** — 생성된 DB 타입이 일부 컬럼(`cancer_type`·`preferred_language` 등)에 stale이라 typed 클라이언트가 막음(에이전시 라우트와 동일 우회). 타입 재생성 전까지 유지.
- ⚠️ **환자 메시지는 자유텍스트** — 환자가 본문에 이름·연락처를 적었으면 병원에 노출될 수 있음(구조적 PII 컬럼은 가림). PO는 이름 노출 OK 결정함.
- ⚠️ **로컬 SSR 쿠키 로그인 자동화 불가** → 병원/코디 포털 시각검증은 Vercel 프리뷰/프로덕션에서 PO가 직접(자격증명은 정상 확인). [[verify-authgated-portal]]

**5. 다음 세션이 먼저 할 일 (우선순위):**
1. **⚠️ 직전 미검증분 먼저**: 프로덕션에서 병원 계정(`hospital@test.com`)으로 그 **stomach/KZ 리드**를 열어 — 이름·암종·병기·환자메시지·(있으면)첨부가 뜨는지 + **원격협진 가능시간 입력·저장 → 코디 케이스 타임라인에 KST로 전달**되는지 실클릭 확인.
2. (선택) **#335 반성문 1줄**: 리드 상세를 처음 얇게 만든 누락을 `docs/POSTMORTEMS.md`에 기록(PO가 "이걸로 판단되겠냐"고 직접 지적했음).

**6. 검증 상태:**
- ✅ 두 PR 다 `next build --webpack` exit 0 · CI(`ci`·`Smoke Tests`·`Vercel`) 초록 · squash 머지 · 프로덕션 배포.
- ❌ **시각 런타임 미검증**: 실데이터 데모 1건 + 로컬 로그인 자동화 막힘 → 다중주체(병원↔코디) 실클릭 못 함. 데이터 경로·복호화·타임라인 relay 로직은 코드로 확인. → 5번 1.

**7. 다음 세션 첫 프롬프트:**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프 읽어. 2026-06-24 늦은오후에 병원 백오피스 2건(#335 콘텐츠메뉴 비활성+대시보드 경영현황판, #338 리드 임상상세+원격협진 가능시간)을 머지·배포했는데 실데이터가 데모 1건뿐이라 시각검증을 못 했어. 프로덕션에서 hospital@test.com 로 stomach/KZ 리드 열어서 ①이름·암종·병기·환자메시지·첨부 뜨는지 ②원격협진 가능시간 입력·저장 → 코디 케이스 타임라인에 KST로 전달되는지 확인해줘.

## 🔖 세션 핸드오프 (2026-06-24 오후 — 코디 '추가 정보 요청' 기능 + 암환자용 폼 전면 교체 + E2E 9건 초록)

> 긴 세션. 흐름: ①E2E 로봇 9개 실패 전부 수리(머지 [#325](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/325)) → ②코디→환자 '추가 정보 요청' 기능 신설 → ③검증 중 발견한 암 인테이크 폼이 옛 정형외과 잔재라 전면 재작성 + 버그 3개 수리. **[#326](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/326) 열림(프리뷰 톤 검토 대기 — 머지 안 함).** ⚠️ **같은 폴더 동시작업 오염 다시 발생**(4번).

**1. 이번 세션 한 일:**
- **E2E 로봇 9개 실패 → 전부 초록 [#325](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/325) (머지·CI 75통과/0실패)**: E2E가 처음 제대로 돌자 9개 실패. 로컬(`.env.local`+node_modules)에서 전수 디버깅 — 로그인 버튼 셀렉터(i18n→`button[type=submit]`)·`networkidle` 안 settle(애널리틱스)→`domcontentloaded`(24파일)·로그인 대기 30s·web-first assertion·home 로고(`getByRole("img")`)·treatments 상세링크 테스트 현실화·어드민 계정 생성(수작업 auth행 깨져 토큰컬럼 보정).
- **코디 → 환자 '추가 정보 요청' 기능 [#326](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/326)(열림)**: 환자가 이메일만 남기면 코디가 상세를 못 받던 구멍. 코디 문의상세에 '추가 정보 요청' 카드 → Step2 폼 링크를 **환자 이메일로 발송(6언어)** + 복사링크 + **왓츠앱 보내기**. 신규 `POST /api/coordinator/inquiries/[id]/request-info`(staff, public_token 생성·발송·`info_requested_at` 기록) + 이메일 템플릿 `infoRequest.ts`(6언어) + 폼 제출 뒤 **소프트 계정 유도**(강요 아님). E2E 스모크 1개. 마이그레이션 `add_info_requested_at_to_inquiries`(가역, prod 적용).
- **암환자용 인테이크 폼 전면 재작성**: 기존 `/inquiry/intake` 폼이 피벗 전 **정형외과/통증클리닉 잔재**(무릎·어깨·발목·심각도1-10)라 암환자에 부적합 → **진단시기·병기(Stage)·현재치료상태·받은치료(복수)·보유서류(복수)·입국희망시기·메모 + 의료서류 첨부**로 교체(6언어 인라인). 코디 화면은 그 코드값을 **한글 라벨**로 표시(병기→"3기"). 옛 데이터 호환.
- **버그 3개 + 잡것**: ①전화번호가 코디 화면에 **암호문 raw** 노출 → `decryptForAdmin`에 phone 복호화 추가 + 화면 `safe()` 가드 ②'추가정보 요청' 결과가 발송실패를 "이메일 없음"으로 **오표시** → 발송됨/미발송/없음 3구분 ③브라우저 확장(HWP `rhwp`)이 `<html>` 속성 주입 → 하이드레이션 경고 → `suppressHydrationWarning` ④문의 폼 언어 드롭다운을 핵심시장 순(러·카·영·일·중·한)으로 ⑤요청 링크가 환자 언어(`/ru/...`)로 열리게.
- **에이전시 worktree 분리**: PO가 에이전시 계정을 **다른 세션**에서 작업하려 함 → 충돌 방지로 `bash scripts/new-session.sh agency` → `C:\Users\user\Desktop\HEALO_worktrees\agency`(브랜치 `work/agency`) + node_modules 정션·`.env.local` 복사 완료(바로 작업 가능).

**2. 왜 그렇게 했는지:**
- **'얇은 현관, 두꺼운 집' 전략(PO와 합의)**: ICT 6대기능 ↔ 저마찰(회원가입·앱 강요 시 이탈) 갈등을 **순서**로 푼다 — 토큰 링크가 신원을 들고 있어 **가입 없이** ICT 구조화 인테이크가 동작(= 정문), 계정·앱은 가치 받은 **뒤** 소프트 유도. KHIDI 평가에도 "마찰0 디지털 환자여정"이 더 강한 ICT 스토리.
- **암 폼 i18n 인라인**: 중앙 i18n 키 추가는 `check:content` 6언어 패리티 가드를 건드려 번거로움 → 컴포넌트 인라인 6언어 객체(SOFT/LABELS 패턴)로. ru 100% 렌더 확인.
- **E2E `networkidle`→`domcontentloaded`**: 2026-06-24 추가된 GA/애널리틱스가 네트워크를 계속 두드려 idle에 안 닿음(Playwright도 비권장). 내용 의존 테스트는 web-first assertion으로 재시도.

**3. 안 끝났거나 보류:**
- **[#326] 프리뷰 톤 검토 대기 → 머지 안 함**: 큰 UI/카피 변경이라 PO가 프리뷰에서 **이메일 6언어 카피·암 폼 문구(특히 러/카)·소프트 계정 문구** 톤 확인 후 머지 결정.
- **로컬 이메일 발송 = `.env.local`에 RESEND 키 추가해야 됨(gitignore라 로컬 한정)**: dev Resend 키(`re_WKQ…`)+`noreply@healwith.co.kr`(도메인 인증됨) 넣어 로컬서도 실발송 확인. **이 키는 커밋 안 됨**(다음 세션 새 worktree면 다시 넣어야).
- **`sendEmail.ts` 미설정시 ok:false 변경 + `docs/government-project/…`·`docs/DB_DEAD_TABLES…`·`migrations/20260624_drop_dead_tables.sql`** = **다른 세션 작업이 자동저장에 섞임** → 내 커밋에서 제외(unstage). 그 세션이 따로 커밋·정리할 것. **`drop_dead_tables.sql`은 삭제 마이그레이션이라 함부로 적용 금지(PO 확인).**

**4. 주의·함정:**
- ⚠️ **같은 폴더 동시작업 오염 재발**: 다른 세션이 이 폴더에서 작업 중 → `sendEmail.ts`·`government-project` 문서가 내 staging에 섞임. 내 것만 골라 커밋함. **교훈(또): 병렬 세션은 worktree로**(이번에 에이전시용은 분리함). 다음 세션도 새 주제면 `scripts/new-session.sh`로.
- ⚠️ **dev 서버가 포트 3000에 떠 있음**(이 세션이 띄움). 다른 세션은 **3001** 쓰라고 PO에 안내함. 에이전시 worktree도 3001 권장.
- ⚠️ **Resend dev 키는 샌드박스**: `onboarding@resend.dev` 발신은 PO 지메일로만 감. 임의 주소(환자)로 보내려면 발신을 **`noreply@healwith.co.kr`**(인증 도메인)로. prod는 이미 그렇게 설정됨.
- ⚠️ **암 폼 새 intake 구조 = `{cancer:{…}, notes}`**. 코디 표시·옛 데이터 호환은 `CoordinatorInboxDetailClient`의 `CI`/`CI_MULTI` 맵에 의존. 값(코드) 바꾸면 양쪽 동기화.

**5. 다음 세션이 먼저 할 일 (우선순위):**
1. **⚠️ 직전 미검증분 먼저**: [#326] 프리뷰에서 **①암 폼 제출 → 코디 화면에 한글 라벨로 뜨는지(다중주체 클릭은 이번에 못 함, 데이터경로만 검증) ②이메일 6언어·암 폼 카피 톤(특히 러/카)** 확인. OK면 머지. (코디 버튼→메일발송→폼열림→토큰검증은 **실호출로 검증됨**, 폼제출→코디표시 런타임만 미검증.)
2. **에이전시 계정** — `C:\Users\user\Desktop\HEALO_worktrees\agency`에서 **별도 세션**으로(포트 3001). 충돌 0.
3. (보류) `drop_dead_tables` 마이그레이션·LAUNCH_CHECKLIST = 다른 세션 것, 건들지 말 것.

**6. 검증 상태:**
- ✅ **[#326] CI 초록**: `ci`·`Smoke Tests (PR)` pass(force-push 후 재실행분 확인). **[#325] 머지됨**(main Full E2E 75통과/0실패).
- ✅ `next build --webpack` exit 0 · `check:content` 통과.
- ✅ 로컬 dev 실호출: 추가정보 요청 API 200·**실메일 발송 도달**(noreply→admin@healwith.co.kr, 러시아어)·전화 복호화(`+82…`)·암 폼 **ru 100% 렌더(원문키 0)**·마이그레이션 prod 적용.
- ❌ **폼 제출 → 코디 한글표시 런타임 클릭 미검증**(데이터경로·표시로직은 확인, 다중주체 실클릭 못 함) → 5번 1.
- ❌ **prod 미반영**(#326 머지 전).

**7. 다음 세션 첫 프롬프트:**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프 읽어. 2026-06-24 오후에 코디 '추가 정보 요청' 기능 + 암환자용 인테이크 폼 전면교체를 #326으로 올렸는데 **프리뷰 톤 검토 대기라 아직 머지 안 했어**. ①프리뷰에서 암 폼 제출→코디 화면 한글표시 + 이메일/폼 6언어 카피 톤(러·카) 봐주고 OK면 머지. ②에이전시 계정은 C:\Users\user\Desktop\HEALO_worktrees\agency 에서 **별도 세션**(포트 3001)으로 — 같은 폴더 충돌 방지. ③docs/DB_DEAD_TABLES·drop_dead_tables 마이그레이션은 다른 세션 것이니 건들지 마.

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
