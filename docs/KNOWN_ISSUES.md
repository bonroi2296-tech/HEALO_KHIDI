# HEALO KHIDI — 알려진 이슈 / 전수 QA 발견사항

## ✅ 2026-07-15 완성도 감사(컬럼레벨 schema-refs)가 잡은 없는-컬럼 select 2건 — 종결

> 축 C 잔여로 `check:schema-refs`를 컬럼레벨 확장하다 발견 + 생성타입(`src/types/database.types.ts`)이 **stale**(inquiries 35 vs 실DB 61 컬럼)임을 발견해 재생성함. 아래는 재생성 후에도 남은 = **실제 없는 컬럼 참조**(DB 실측 대조 완료). 쿼리가 에러→try/catch 삼킴→화면 0/[]로 떨어지는 부류. **둘 다 같은 PR(#784)에서 수리 완료.**

- ✅ **`src/lib/reminders/scheduleReminder.ts` — profiles 없는 컬럼 5개 select** → 등록사용자 상담 리마인더가 연락처를 조용히 못 얻던 무증상 실패. **수리**: 실컬럼(`id, full_name, role`)만 조회 + 이메일은 `auth.users`(서비스롤 `getUserById`) 조회 + 언어는 세션 값. 이메일 못 얻어도 `userId`로 **in_app 채널 리마인더는 발송**(총실패→최소 in_app 보장). 유형6 종결.
- ✅ **`app/api/admin/crawl/jobs/[id]/items/route.ts` — crawl_raw_items.select("…name…")** → 실컬럼은 `title`. **수리**: `name:title` alias(응답 키 `name` 유지) + 검색 필터 `ilike("title")`.
- 가드: 컬럼레벨 검사는 우선 **비차단(경고)** — 현재 경고 0. 안정 후 blocking 승격(DEFINITION_OF_DONE 로드맵). 새 없는-컬럼 select 는 이제 매 PR 경고로 뜸.

## 🟢 2026-07-14 POSTMORTEMS 반성문 번호 충돌 12쌍 (과거 발번 실수 누적 — 새 중복은 §20이 차단)

> 반성문 #90 기록 중 발견. **#31·32·39·42·55~62 — 서로 다른 사건이 같은 번호를 공유**(아래로 append하던 시절과 위로 prepend하는 지금 시절이 각자 발번). 🔁 재발 추적·재발률 집계(grep 기반)가 이 12개 번호에선 두 사건을 겹쳐 볼 수 있음 — 조회 시 날짜로 구분.

- 전면 재번호는 🔁 참조·가드 스크립트 주석(check:content §10의 #62, §12의 #65, §13의 #66 등)을 같이 고쳐야 하는 대수술이라 보류 — `/doc-health` 주간 검진에서 참조까지 일괄 정리 검토.
- 새 중복은 `check:content` §20이 CI에서 차단(허용목록 = 위 12개, 줄어들기만 해야 함).

## 🟢 2026-07-14 병원 상세 본문 H1은 여전히 DB 한국어 이름 (metadata·JSON-LD만 언어화됨)

> GSC 색인 실사 수리(#87, PR #743)의 독립 리뷰에서 발견. `<title>`·OG·JSON-LD·breadcrumb는 요청 언어로 나가지만, **화면 본문 H1은 HospitalDetailClient가 클라이언트에서 DB `name`(한국어)을 그대로 렌더** — /en 페이지에서 제목(영어)과 H1(한국어)이 어긋남. 구글은 렌더된 DOM도 보므로 언어 신호가 반쪽.

- 수리하려면 클라이언트 데이터 경로(API 응답 or initialData)에 언어화 이름을 태워야 함 — partner 병원은 `localizedHospitalText` 재사용으로 가능, DB-only 병원은 다국어 이름 컬럼(스키마 추가) 없이는 불가.
- 발견 시점엔 metadata 언어화가 우선이라 범위에서 뺌. 다음 SEO 라운드 후보.

## 🟡 2026-07-07 수익모델 문구 불일치 — 컨시어지 수수료를 "누가 내는가" PO 확정 필요

> 신뢰 칩(#679) 독립 리뷰에서 발견. 사이트 공식 FAQ(`src/lib/faq/faqData.js` "이용료")는 **환자에게 컨시어지 수수료 5-10%(견적서 명시)**를 고지하고 약관도 "이용자가 회사에 지급한 수수료"를 전제하는데, 내부 문서(BUSINESS_PLAYBOOK·벤치마크 §5 등)는 **병원측 유치 수수료** 모델로 기술 — 서로 다른 얘기.

- **PO 결정**: 실제 과금 주체가 ①환자(5-10% 견적 명시) ②병원(유치 수수료) ③혼합 중 무엇인지 확정 → FAQ·약관·/insurance FAQ·제안서 문구를 한 방향으로 통일.
- 임시 조치: 신뢰 칩 ko는 "병원 수가 그대로"(치료비 부풀림 없음의 좁은 의미)로 표현해 어느 모델과도 모순 없게 함.

> 2026-05-21 전수 QA. 빌드·테스트는 정상. 아래는 발견된 개선점 — 심각도·범위 표기.

---

## 🟡 2026-07-07 /insurance 보험 가이드 — Madanes/МСР 서면허가 전 선머지 (거부 시 즉시 롤백)

> PO 결정(2026-07-07): 미팅 진행 중인 Madanes 응답을 기다리지 않고 머지. 로고·브랜드 비주얼(МСР·Madanes Global 로고, 대리석 아트 2종)이 서면허가 없이 실서비스에 노출되는 상태 — **걔들이 거부하면 즉시 실행할 절차를 [marketing/madanes-insurance/ROLLBACK.md](marketing/madanes-insurance/ROLLBACK.md)에 준비해 둠**(A안=브랜드만 제거 / B안=탭 전체 원복).

- 관문: Madanes 서면 허가(로고·상품) 수령 → 이 항목 닫기. 거부 → ROLLBACK.md 실행(방치하면 revert 충돌 위험 — 응답 즉시).
- 관련: 헤더 "암 치료 가이드" 탭이 "보험 가이드"로 교체됨. /education 라우트는 환자앱용으로 계속 살아 있음.

## ~~🟡 2026-07-06 면력 3개 지점 DB 설명이 피벗 전 콘텐츠로 실서비스 노출 중~~ ✅ 이미 해결돼 있었음 (2026-07-14 실측 확인 — 장부만 낡음)

> **2026-07-14 잔재 정리 세션에서 실DB 대조 결과, 강서·신촌·광명 3곳 모두 DB `description`(+i18n 6개 언어)이 정적 파일(`partnerHospitals.js`)의 암환자 중심 콘텐츠와 자구까지 동일** — A안(정적→DB 이식)이 이미 완료된 상태였는데 이 장부가 안 닫혀 "피벗 전 콘텐츠 노출 중"으로 남아 있었음(#63 문서-현실 드리프트 부류). specialties의 한방부인과·양방 산부인과 등은 잔재가 아니라 병원의 실제 진료과목(정적 파일에도 동일 포함).
- (원 기록 보존) 선택지 A/B/C 중 A가 실행된 상태. 성동점은 DB 미등록이라 정적 콘텐츠로 나옴(정상).
- ⚠️ **여전히 살아있는 하위 항목**: 비자 초청장 발급 주체(`src/lib/visa/inviterHospitals.ts`)에 성동·광명 추가하려면 **등록증 원본 정보(등록번호·대표자·유효기간) 필요 — PO 제공 대기.**

## 🟡 2026-07-06 스모크 간헐 실패(flaky) 2건 — PR 게이트 신뢰도 갉아먹는 중 (감시, 재발 시 원인 수리)

> PR #651(문서만 변경)에서 관찰. 같은 코드로 직전 실행은 통과 → 코드 원인 아님 = 테스트 자체의 간헐성.

- **① `e2e/coordinator-request-info.spec.ts:22`** "Step1만 완료 문의 상세에 '추가 정보 요청' 카드가 뜬다" — 1회 실패(재시도 없이 fail 처리됨).
- **② `e2e/clinic-portal.spec.ts:21`** "/clinic 포털 로그인 안 튕김" — flaky 판정(재시도로 통과). `getByText(/포털|의료기관|의뢰/)` 15초 타임아웃.
- **조치 기준**: 또 무고한 PR을 막으면(2회째) 그때 원인 수리(대기 조건 보강·테스트 데이터 사전 시딩 등). 그 전까진 빈 커밋 재실행으로 통과 확인 후 진행.
- 참고: 스모크 실패 알림 이메일은 Resend 403(도메인 미검증)으로 여전히 미발송 — 기존 LAUNCH_GATES 관문(PO 콘솔 작업)과 동일 건.

## 🟢 2026-07-05 트렌드 스캔 발견 (감시 항목 — 지금 조치 불필요)

> `/trend` 스캔 중 확인. 조치가 필요한 Gemini 단가표 1건은 같은 브랜치에서 수정(아래 ①), 나머지는 감시용 기록.

- **① Gemini 별칭이 3.5 Flash 로 자동 이동 → 실단가 상승** ✅ **내부 추정 교정(2026-07-05)**: `gemini-flash-latest` 별칭은 최신 Flash 로 hot-swap 되는데 2026-05-19 출시된 Gemini 3.5 Flash($1.50/$9.00)가 최신 stable → 우리가 지금 호출 중. 우리 단가표(`src/lib/ai/usagePricing.ts`)는 옛 2.5 Flash($0.30/$2.50) 기준이라 내부 비용 추정이 in 5배·out 3.6배 **과소집계**였음(Google 실청구는 정상 — 우리 대시보드 추정치만 틀렸음). 기본값을 3.5 Flash 로 교정 + env(`AI_PRICE_FLASH_IN/OUT`) 오버라이드 유지. ⚠️ **실제 호출 단가가 out 기준 3.6배 오른 건 사실** — 현재 사용량이 적어(실전환 ~0) 절대비용은 작고 aiGuard 일일상한(공개 2000/일·상담 30000/일) + Google spend cap 으로 이중 방어되나, 유료 트래픽 늘면 재점검. **모델 고정은 안 함**(PO 결정 2026-06-12 "최신 유지, 구형 임의고정 금지" 준수).
- **② Supabase Data API 기본 비노출 — 2026-10-30 기존 프로젝트 강제** (🟢 우리 영향 작음): 공식 changelog(#45329) 확인 결과 **기존 테이블은 영향 없음**(현재 grant 유지·계속 anon/브라우저에서 읽힘) → `/api/health`→`hospitals` 등 현 경로 안전. **10/30 이후 새로 만드는 public 테이블만** 명시적 `GRANT` 없이는 Data API(anon/브라우저)에서 안 보임. 우리는 대부분 서버 API(service_role, 이 변경 무관)라 저위험. **주의점**: 앞으로 새 테이블을 anon/브라우저에서 직접 읽을 계획이면 마이그레이션에 `GRANT SELECT ... TO anon, authenticated` 를 함께 넣어라. 그 사이 Supabase Security Advisor 가 영향 테이블을 flag + 이메일 통지 예정.
- **③ Next.js 2026-05 보안 13종 CVE — 우리 이미 안전**: 패치 버전 15.5.18/16.2.6, 우리는 `next@^16.2.9` → 반영됨. 조치 없음(기록만).
- **관망**: Gemini 3.5 Live Translate(실시간 음성 통역, ru·kz·ko·zh·ja 지원) — 원격협진 자막·통역 직결이나 **프리뷰**(프로덕션 비권장)+God 컴포넌트 이식 리스크라 GA·가격 공개 시 재검토.
  - 📌 **재검토 조건 절반 충족(2026-07-20 /trend 스캔)**: **가격 공개됨** — 오디오 입력 $3.50 / 출력 $21 per 1M tokens, 실효 ≈ **$0.037/분**(30분 상담 1건 ≈ $1.1), 프리뷰 기간 무료 티어 있음. [가격표](https://ai.google.dev/gemini-api/docs/pricing) · [Live Translate 문서](https://ai.google.dev/gemini-api/docs/live-api/live-translate). **GA는 아직 아님**(`gemini-3.5-live-translate-preview`) → 관망 조건 완전 충족은 아직.
  - ✅ **코드는 이미 다 있음**(#455, 2026-06-30): `agents/live-translate/`(LiveKit Agents 워커, `kz`→`kk` BCP-47 매핑 포함) + `src/lib/consultation/LiveTranslateBridge.jsx`. ~~**스위치 뒤에서 꺼져 있음**~~ → ✅ **켜짐(2026-07-20 오후)**: 에이전트 LiveKit Cloud(ap-south) 배포 + 프로덕션 env `LIVE_TRANSLATE_ENABLED`·`NEXT_PUBLIC_LIVE_TRANSLATE_ENABLED` 설정 완료. `lang` 속성 전송 버그(#100)도 수정·검증(`session up` 로그 확인). 즉 남은 일은 "만들기"가 아니라 **켜기 + LiveKit Cloud 에이전트 배포 + 라이브 2인 통화 검증**(README가 "라이브 미검증"으로 명시).
  - ⚖️ **경쟁 벤더 비교(2026-07-20 조사)**: 카자흐어(kk) 지원이 사실상 유일한 필터 — OpenAI `gpt-realtime-translate`(출력 13개 언어)·AssemblyAI Universal-3.5 모두 **kk 미지원**. Gemini만 ko·ru·kk 전부 지원 → 벤더 대안이 없다.

---

## 🟡 2026-07-02 화상 1:1 레이아웃 — PO 감성 피드백 백로그 (미트식 #612 머지 후)

> PR #612(발화자 teal 테두리 + 1:1 PiP)를 PO가 실통화로 확인 후 "동작은 OK, 근데 2명일 때 내가 생각한 그림은 아님(조금 거시기)"이라며 **일단 머지 + 백로그 기록** 지시. 다음에 화상 UI 만질 때 함께 볼 것.

- **관찰된 어색함(스샷 근거)**: ①상대가 폰(세로 영상)이면 좌우 검은 여백이 큼(안 잘리게 contain 렌더 — 의도지만 허전해 보임) ②PiP(내 화면)가 카메라 꺼짐 시 검은 박스로만 보임(이름표뿐).
- **조정 후보**: (a) 2인 데스크톱을 미트 데스크톱처럼 **반반 분할 옵션**(현재는 상대 풀+PiP) (b) 세로 영상 좌우 여백에 흐림 배경(blur fill — 줌·유튜브 쇼츠 방식) (c) PiP 카메라 꺼짐 시 아바타/이니셜 표시. 전부 CSS/타일 수준 — God 컴포넌트 로직 무관.
- 발화자 teal 테두리는 유지(말할 때만 켜지는 게 정상 동작).

## 🤖 2026-07-05 루프 전수평가 발견 — 남은 것

- ~~🟡 **ru 한정: 안 물었는데 가격 선노출**~~ ✅ **해결(2026-07-05, #633 + 반성문 #65)** — 진범은 필터가 아니라 키워드 오탐(смет⊂косметологию)으로 게이트 미발동. lookbehind 수정 배포 후 **6/6 차단 + [price-gate] applied=1 로그 교차 확인 + 무회귀(가격 물으면 정상 제공)**. (경과 기록:: 필터 구멍이 아니라 키워드 오탐(`смет`⊂косметологию)으로 게이트 자체가 미발동이었음. lookbehind 수정 배포·재검증 중 — 6/6 합격 확인되면 이 항목 닫기. (원 기록: 간헐 ~50%) — `offtopic-cosmetic-no-diagnose/ru`: "점 제거하고 싶다"(가격 안 물음)에 등록 데이터의 항노화 프로그램 가격($1,500–3,700)을 먼저 던짐. 4회 실측 중 2회 재현, ru만(타 5개 언어 정상). 레드라인 아님(의료 안전선 무관, 출처 있는 실가격) — "가격은 물을 때만" 톤 규칙 위반. **수정 계획**: 가격을 안 물은 턴(asksDocsOrProcess=false)엔 주입 Context(careReference·RAG)에서 가격 숫자를 결정론적으로 제거(모델이 못 본 건 못 흘림 — #625 코드 게이트와 같은 패턴). 전수 회전(310조합) 완주 후 착수 — 중간에 동작 바꾸면 측정 오염. 회귀 필수 확인: price-on-ask·price-range-by-cancer(물으면 범위 정상 제공).

## 🔍 2026-07-02 오픈 전 전수 감사(워크플로 50에이전트·역사 750커밋 전수) — 이번에 안 고치고 남긴 것

> 검증된 발견 36건 중 저위험·고효과 수정은 같은 날 PR로 처리(안전가드·퍼널·어드민 소생·i18n·KPI·E2E 부활·가드 룰 — 커밋 메시지 참조). 아래는 **의도적으로 남긴 잔여**.

- ~~🔴 **발급 PDF 한글·키릴 전부 깨짐**~~ ✅ **해결(같은 날 #603)** — 감사에서 renderToBuffer 실증으로 발견 → 별도 세션이 Noto Sans/KR 셀프호스팅 등록 + ko/ru/kz 샘플 육안검증으로 수정·머지(반성문 #62, 검사기 룰10 추가). 이 감사 PR의 견적 발급 언어 교정(환자 언어 반영)과 합쳐져 완결.
- ~~🔴 **K-02 오염 벡터 — inquiry 미연결 상담세션은 테스트 제외 원천 불가**~~ ✅ **해결(2026-07-02 밤)** — `consultation_sessions.is_test` 컬럼 추가(가역 migration, 실DB 적용) + 생성 API 도장(inquiry 상속·notes [TEST]·명시 지정, `detectSessionIsTest`) + 집계 제외를 "세션 표식 ∪ inquiry 체인" 합집합으로(`fetchTestSessionIds`). 백필 17건(inquiry 미연결 4건 포함) 도장 → **실측: 실적 완료 상담 K-02=0·K-04=0**(그간 완료는 전부 테스트였음 — 정직한 0). 단위테스트 20건. 잔여: session_type NULL 1건(아래 🟡)은 별건.
- 🟡 **월간보고 xlsx 생성이 프로덕션에서 항상 실패** — 템플릿 후보가 ①PO 로컬 절대경로 ②`public/templates/khidi_monthly_report_template.xlsx`(repo에 없음, git 히스토리에도 xlsx 커밋 0회) → 항상 template_not_found 500. **PO가 빈 양식 xlsx 원본을 주면 커밋으로 해결**(1분).
- 🟡 **main 브랜치 보호 0** — required status check·PR 필수 없음(gh API 실측 404). CI 18게이트는 main 직push 를 기계적으로 못 막음(빨간 CI여도 push=즉시 prod 배포). GitHub ruleset 설정은 운영방식 변경이라 **PO 결정**(admin bypass 허용으로 긴급 대응 여지 유지 가능).
- 🟡 **TEST_OFFICE_IPS prod env 미설정** — 테스트/실적 분리(PR #501)의 사무실IP 자동태깅이 무장해제(Vercel env 32개 전수 실측). PO만 값(사무실 공인IP)을 앎 → LAUNCH_GATES 신규 항목.
- 🟡 **E2E 실패 알림 메일 403** — 발신이 미검증 `onboarding@resend.dev` 라 Resend가 거부(로그 실측). Resend 콘솔에서 healwith.co.kr 도메인 검증(PO) 후 발신 주소 교체, 또는 수신자를 계정 소유자 주소로.
- 🟡 **session_type NULL 완료세션 1건**(f0a36145…, inquiry 12 연결) — 실상담이면 K-02 1건 과소집계. inquiry 12 실상담 여부 PO/코디 확인 후 한 행 백필.
- 🟢 **코디는 유치 확정/이탈 클릭 불가** — conversion-funnel API 주석은 '코디 가능'이라나 실제 requireAdminAuth(admin 전용). 코디 운영을 시작하면 requirePortalAuth(staffOnly) 전환+코디 네비 연결, 지금(PO=어드민)은 무영향.
- 🟢 **성능 advisor 133건**(RLS auth 함수 행별 재평가 22·중복 permissive 정책 8·중복 인덱스 2쌍) — 전부 DDL이라 한가할 때 일괄, PO 확인 후.
- 🟢 **vector 익스텐션 public 스키마**(security advisor WARN) — 재설치 필요라 RAG 재적재와 묶어 처리 권장.
- 🟢 **레거시 /api/public/chat/message 라우트** — 동의 게이트·레드라인 기록은 이번에 이식했으나 프론트는 stream만 사용. 다음 정리 때 410 폐쇄 검토.
- (화상영역 — 타 세션 인계) ~~LiveKit webhook room_finished 가 세션을 무조건 completed 처리(K-02 인플레 벡터)~~ ✅ **해결(2026-07-05 밤, #637)** — room_finished 는 status 미변경(staff 완료가 K-02 정본 경로), 자동완료가 재입장까지 막던 부작용(token·guest-join `consultation_closed`)도 함께 예방. **#642 회귀 테스트로 잠금**(room_finished/participant_joined DB 무변경, recording_finished 만 recording_url 저장). / ~~webhook URL 옛 도메인 healo-khidi.com~~ ✅ **해결(#637)** — 주석·EXTERNAL_SETUP_GUIDE 를 healwith.co.kr 로 교정 + `check:content` 에 `healo-khidi.com` 가드 룰 추가(MKT-08). ⚠️ **단 LiveKit 대시보드의 실제 webhook URL 교체는 PO 손 필요**(외부 설정 — 코드/주석만으론 이벤트 안 옴). / 게스트토큰 E2E 스펙 고정 실패(잔존) / 테스트 상담방 2개(50d5bc43…·aa9804ee…) 삭제 대기(PO 확인) / ~~consultation notes 평문(notes_encrypted 미사용)~~ ✅ **해결(완성도 감사 2026-07-15 발견·종결)** — 이미 AES-256-GCM 암호화 배선 완료: `src/lib/khidi/consultationNotes.ts`(`encryptSessionNotes`/`readSessionNotes`) 경유, `app/api/khidi/consultation/[id]/route.ts`가 `notes_encrypted` 저장 + 평문 `notes=null`, contract test로 잠금. (문서-현실 드리프트 #63 부류 — 고쳤는데 장부가 안 닫혀 있던 것.)
- (화상 자막, 2026-07-05 밤 #637) ~~DataChannel 자막이 RELIABLE 의도인데 livekit-client v2 API 오용(`{kind:...}`)으로 LOSSY 전송 → 불안정 CIS 회선 자막 유실~~ ✅ **해결** — `{ reliable: true }` 로 수정(`useLiveKitDataChannel.js`).
- (화상 1:1 레이아웃, #612 감성 백로그) 카메라 꺼짐 검은 박스 → 브랜드 teal 아바타 CSS 적용(#637, 육안 미검증). **잔존(PO 결정/라이브 검증 필요)**: 2인 데스크톱 반반분할 / 세로영상 blur-fill 배경(레이아웃 로직 — 라이브 2인 검증 필요, 자동검증 불가).

---

## 🟢 2026-06-29 AI 에이전트 개선 — 백로그 (PO 방향 확정, 다음 트랙)

> C레벨 전방위 진단(브랜치 `claude/ai-agent-improvements-pgy6oj`)에서 **즉시 구현분**(공개 AI챗 예시질문 칩·코디연결/접수 빠른버튼 6개어·스트림 에러 6개어 현지화·`detectHandOff` ru/kz/zh 보강)은 처리. 아래는 PO가 **방향 확정 + 백로그로 남기라**고 한 더 큰 플로 변경.

- **공개 AI챗(`/inquiry`) 멀티 스레드 통일 — 1차 구현됨(2026-06-29, PR #475)**: 공개챗에 "새 상담"·"이전 대화 목록"·오래 쉰(>24h) 대화 자동 세션경계 배너 추가. 신규 API `GET /api/public/chat/threads`(로그인=user_id·게스트=browser_session_id, PII 미반환·30일 cutoff·rate limit). 스레드 제목 첫 메시지 자동 채움. 공개챗의 정상 모델(`actor_type/message_text`) 위에 환자챗 UI 패턴 차용. **함께 고친 버그**: `/patient/chat`이 없는 컬럼(role/content)으로 read/write해 메시지 전부 0건이던 것(POSTMORTEMS #51). ▶ **남은 후속**: ①두 챗 표면 완전 단일화(현재 공개=멀티스레드, 환자챗은 자체 API 유지 — 장기적으로 한 백엔드로 수렴) ②로그인 사용자 기기 간 동기화 실검증 ③`GET /api/public/chat/[threadId]` 정식 분리(현재 방 전환은 resume 재사용) ④공용 PC 게스트 세션 PII 분리.
- **AI→유치 전환 프로덕션 0건 검증** (🔴 KHIDI 점수 직결): `source='ai_agent'` 리드 승격 코드는 정상이나 실 3턴+ 대화 전환이 0(실DB). 8/27 중간평가 정량지표(유치 12·상담 120)가 이 집계 → 이번 빠른버튼(접수·코디연결)으로 전환 동선이 강해졌으니 **실대화 1건으로 대시보드(`/admin/khidi/conversion`) 집계 end-to-end 실검증** 필요.
- **playbook_pattern 0건 → "3-Tier RAG"가 실제론 1-Tier**: 적재 계획 필요(보고서 표기와 실제 일치). 기존 항목과 연계.
  - 🔎 **원인 규명됨(2026-07-20, POSTMORTEMS #97)**: 적재가 안 된 게 아니라 **저장 자체가 불가능**했다. `migrations/20260225_coordinator_responses.sql`이 만들려던 PLAYBOOK-V1 스키마가 **동명의 기존 테이블(병원 견적 응답용)과 충돌** → `CREATE TABLE IF NOT EXISTS`가 조용히 no-op → 코드가 없는 컬럼(`language`·`case_tags`·`response_text_sanitized`·`quality_score`·`approved_at`·`rag_document_id`)에 써서 INSERT 항상 실패. `coordinator_responses` 0건이 그 증거. 걸린 곳 19군데(`/api/admin/playbook/responses`·`.../[id]/approve`·`/api/admin/chat/threads/[threadId]/resolve`).
  - ⚠️ **8/27 중간평가 주의**: 이 상태로 보고서에 "3-Tier RAG"라고 쓰면 사실과 다르다. 수리하든 표기를 고치든 평가 전 정리 필요.
  - 🛠️ **PO 결정 대기**: 죽은 기능을 (a)컬럼 추가로 되살리기 vs (b)기능 삭제. 한 번도 쓰인 적 없는 화면이라 제품 판단.
- ✅ **해결(2026-07-20)** `/admin/crawl` 병원 크롤 검수도 같은 부류로 죽어 있던 것**: `crawl_raw_items`에 코드가 쓰는 `source_id`·`name`·`hospital_id`(insert)·`reviewed_at`(승인/거절/건너뛰기 update)가 실DB에 없음 → `crawl_raw_items` 0건·`crawl_jobs` 0건. 조회 쪽만 2026-07-15 감사에서 `name:title` alias로 우회돼 있고 쓰기 경로는 그대로(반쪽 수정). 위와 같이 되살리기/삭제 PO 결정 대기.
- **스키마 드리프트 전수 결과(2026-07-20)**: 마이그레이션 선언 61개 테이블 vs 실DB 대조 → 드리프트 12개, 마이그레이션에만 있고 실DB엔 없는 테이블 8개(`inquiry_contacts`·`inquiry_medical`·`hospital_lead_assignments`·`hospital_performance_stats`·`hospital_performance_global_avg`·`hospital_responses`·`operational_alerts`·`treatment_translations`). 코드가 실제로 유령 컬럼을 쓰는 진짜 버그는 위 2건뿐, 나머지는 후속 마이그레이션의 컬럼명 변경(양성). **상설 가드 = `@supabase/supabase-js` 2.110+ 업그레이드**(아래 항목).
- **`@supabase/supabase-js` 2.90→2.110 업그레이드 = 스키마 드리프트 상설 가드 (별건 PR 필요)**: 신버전 `RejectExcessProperties` 타입이 `.insert()/.update()/.eq()`를 생성 타입과 대조해 위 버그 부류를 **컴파일 타임에** 잡는다(이번 발견도 이 업그레이드 시도 중 나옴). 다만 `.update(Record<string, any>)` 패턴 **32곳**이 타입 에러가 되어 정리가 선행돼야 함(환자 인테이크·비자·문의 등 민감 라우트 포함) → 8/27 평가 전 리스크 감안해 이번엔 **되돌리고 별건 분리**. `@supabase/ssr` 0.8→0.12(인증 쿠키)도 같은 PR에서 단계적으로.
- ~~**스키마 드리프트**: `chat_threads.user_id`(+`guest_country`·`guest_phone`·`resolved_at`·`channel`) 마이그레이션 누락~~ ✅ **해결(2026-06-30)**: `migrations/20260630_chat_threads_columns.sql`(IF NOT EXISTS 멱등, prod no-op·재현성용).
- **앱 설치→푸시 안내 (옵션1 보류분, 2026-06-30 PO)**: 접수 확정 멘트(`HANDOFF_CONFIRM`)에 "앱 설치 시 푸시로 진행상황 안내"를 넣고 싶으나 **푸시는 네이티브 앱 전용**(`src/lib/push/registerPush.ts` 웹 no-op) + **앱 미출시**(스토어 계정·Firebase PO 대기) → 지금 넣으면 거짓 약속. **앱 출시되면** `contactGate.ts`의 TODO 위치에 한 줄 추가. 지금은 PWA 홈화면 추가 인라인 힌트(`ChatInstallHint`)만 노출(푸시 약속 없음).

---

## 🟡 2026-06-29 오픈 전 전수조사 — 후속 과제 (이번에 손대지 않고 남긴 것)

> 5축(보안·i18n·데이터/RLS·AI/RAG·위생) 병렬 감사 + 실DB 점검. **고친 것**(별도 PR): 옛도메인 잔재(POSTMORTEMS #49)·AI 송출 전 레드라인 차단+triage PII 마스킹(#50)·환자 목록 2페이지 6개어·보안 LOW(admin import 에러코드화·translate 토큰상한)·약한비번 교체. 아래는 **의도적으로 남긴 후속**.

- **환자 상세 페이지 광범위 한국어** (🟡 핵심시장): `/patient/cost-estimates/[id]`·`/patient/visa/applications`·`/patient/visa/applications/[id]` 는 페이지 전체가 한국어 하드코딩(상태라벨·본문). 이번엔 감사가 CRITICAL로 지목한 **목록 2페이지(consultations·cost-estimates)만 6개어 완료** + 상세페이지는 alert/에러표시의 `err.message` 누수만 닫음(보안). 상세 본문 6개어화는 후속(목록 페이지의 page-local COPY 패턴 재사용).
- **MEDIUM 하드코딩 문자열**: `consultation/[id]/page.jsx` aria-label "Toggle chat panel"(영어, 2883줄 God컴포넌트라 **보류 유지** — 스크린리더 라벨 하나 위해 God컴포넌트 수정은 위험>실익). ~~`DocumentsClient.jsx` placeholder "e.g. Blood test from March 2026"~~ ✅ **해결(2026-07-01)**: `descPlaceholder` 6개어 라벨 추가·연결(`l(LABELS.descPlaceholder)`).
- **RAG ingest taskType**: `getEmbedding`이 적재·질의 모두 `RETRIEVAL_QUERY` 사용. 적재는 `RETRIEVAL_DOCUMENT`가 정석(비대칭 검색 품질↑). **단 기존 18청크 전체 재적재가 동반돼야 코퍼스 일관** → 반쪽 적용은 오히려 불일치라 보류. 재적재 시 함께 적용.
- **`rag_chunks_used=0`/redline 적발률 경보 없음**: 지표는 metadata에 찍히는데 집계·경보가 없음(#48 교훈). cron 집계 + operationalAlerts 연결 권장.
- **admission-status 무인증 GET** (🟢 허용위험): `/api/khidi/consultation/[id]/admission-status` 는 두 무작위 UUID 일치 + 상태 enum 만 반환 = 계정없는 게스트 폴링 의도 설계. 인증 강제 시 게스트 플로 깨짐 → 그대로 둠.
- ~~**cron 비상수시간 비교** (🟢 저위험): `automation`·`kpi-snapshot`·`run-regression-tests`·`crawl` 라우트가 `!==`로 CRON_SECRET 비교~~ ✅ **해결(확인 2026-07-01)**: 전 cron 라우트가 공용 `verifyCronSecret`(`src/lib/security/cronAuth.ts`, `timingSafeEqual`)로 통일됨. `!==` 단순비교 잔재 없음(전수 grep 확인). 일부 라우트가 아직 로컬 `verifyCronSecret`(동일 timingSafeEqual) 복붙본 사용 — 버그 아닌 중복, 저우선 통합만 남음.
- **Supabase Auth 유출비번 보호 꺼짐** (🟢, PO 콘솔 1클릭): Authentication 설정에서 HaveIBeenPwned 체크 켜기 권장.
- **테스트 문의/국적값 오염**: `inquiries` #26~31(검증 더미) + 국적값 혼재(`KZ`·`Kazakhstan`·`kazah`·`test`·null). 데이터 삭제는 비가역이라 자율 보류 — PO 확인 후 정리(유치 대시보드 집계 정확도).

---

## ~~🟡 2026-06-25 코디네이터에게 AI 챗 뷰가 없음~~ ✅ 해결 (2026-06-29 `/coordinator/chat` 읽기전용 뷰)

- ~~**상태**: AI 챗 스레드 모니터가 `requireAdminAuth` 어드민 전용. 코디는 AI 챗 대화를 볼 화면이 없음.~~
- ✅ **해결(2026-06-29)**: `/coordinator/chat` **읽기전용** 뷰 추가(어드민 검토큐 화면 재사용). 데이터 API는 `/api/admin/chat/threads`·`.../messages`의 **GET만 `requirePortalAuth(staffOnly)`로 넓혀** 코디 접근 허용(생성 POST·검수 PATCH는 admin 유지 = 코디는 읽기만). 코디 네비에 「AI 상담 리드」 추가.
- **남은 후속(선택)**: `notifyStaffChatHandoff` 수신자에 coordinators 추가(현재 어드민에게만 종 알림). 코디를 별도 운용 시작할 때 켜면 됨 — 지금은 PO=어드민이라 무영향.
- ⚠️ **검증**: `next build` 통과. **코디 계정 실로그인 런타임은 미검증**(프리뷰에서 PO 확인 권장).

---

## 🚦 2026-06-24 출시 준비 점검 (프로덕션 실측 — "오픈해도 되나?" 근거)

> PO "이제 오픈해도 되나?" → 추측 금지(POSTMORTEMS #35). 브라우저 미설치(프록시 차단)라 **API 레벨 실측**으로 핵심 플로를 프로덕션(`healwith.co.kr`)에서 직접 두드림. **부작용(가입·문의 제출) 회피**, AI챗 1건만 테스트 후 삭제.

### ✅ 라이브 작동 확인 (근거)
- 공개 페이지(홈·문의·치료·병원·원격협진·치료여정·암종상세) 전부 **200 렌더**. 다국어 6개(en·ko·ru·**kz**·zh·ja) 각 lang 정상. `/api/health` db:up. sitemap·robots 정상. 404 정상.
- 인증 페이지(`/login`·`/signup`·`/reset-password`·`/auth/confirm`) **200·폼 렌더** = #341 인증 머지 prod 반영 확인.
- **코디 로그인**(`coordinator@test.com`) → `/api/portal/inbox` 실문의(#23)·`/api/portal/threads` 에이전시 스레드(#21) **반환**. **환자 로그인**(`patient@test.com`) → 채팅 스레드·재진 endpoint 정상(빈건=데이터0).
- **AI챗 공개 플로**: 위암 환자 질문에 따뜻·완결·출처표기·언어정확·코디연결 유도(반성문 #5·#23 정반대). 테스트 스레드 삭제 완료.

### 🔎 겉보기 의심 → 파보니 블로커 아님
- `/kk` 404는 내부 로케일코드가 `kz`라서(정상, `proxy.ts`가 브라우저 kk→kz 매핑). 카자흐는 `/kz`에서 작동.
- `/ru/for-russian-patients`·`/kk/for-kazakh-patients`는 의도된 레거시 랜딩(Yandex 색인, `proxy.ts` LEGACY_SKIP). ~~🔸 사소: html `lang="en"` 속성만 영어~~ ✅ **해결(#361)**: LEGACY_SKIP 경로에도 `x-locale` 주입 → `lang="ru"`/`lang="kk"` 렌더(dev 실렌더 확인). **2026-07-06 정비**: 고아 상태 해소(러/카 푸터 내부링크) + 비자 오기 수정(D-2→G-1-10) + CTA `/consult/start`→`/inquiry` 직결. 🔸 비용 숫자($3,000/월 등 2026-04 작성)는 PO 확인 대기.

### 🔴 오픈 전 남은 관문 (PO만 닫을 수 있음 — 이게 닫히면 오픈 OK)
1. **가입→인증메일→로그인 / 비번찾기→메일** 실제 1회 통과(실메일 — API로는 부작용이라 미검증).
2. **Supabase 이메일 템플릿 href를 token_hash로 교체**(인증 자동로그인·스캐너안전 완성. `docs/PROJECT_CONTEXT.md` 인증 핸드오프 참조).
3. **구글 OAuth 게시**(현재 "테스트"라 실환자 구글가입 막힘).
4. ~~**E2E Secrets 등록**~~ ✅ **닫힘(2026-07-02 실측)**: GitHub Secrets에 E2E_* 10종+`SUPABASE_SERVICE_ROLE_KEY`·`ENCRYPTION_KEY_V1` 등록됨, 비번 시크릿 2026-06-29 갱신.
5. **iOS 영상상담 마이크 실기기 검증**(화상상담 세션 진행 중) / K-01 데모데이터는 is_test 태깅(#501)으로 기본뷰 자동 제외 — 정직성 구조 확보.
6. ~~🔴 **약한비번 테스트계정**~~ ✅ **실질 해소(2026-07-02 실측)**: 2026-06-29 전 계정 강비번 `Healwith2026!` 교체(GitHub Secret 보관), `test1234` 로그인 실측 400. 남은 건 `admin@test.com` 활성 유지 여부 PO 결정 1건(`docs/LAUNCH_GATES_PO.md` 관문 6).

### ❌ 아직 검증 못 함(정직)
화면 시각 렌더(브라우저 미설치 — API만), 가입/비번찾기 실메일 end-to-end, 영상상담·iOS, 문의 제출→DB. → 위 5번 관문에서 사람이 1회.

---

## 🟡 2026-06-24 스키마 참조 가드(S2)가 잡은 존재하지 않는 테이블 참조 (POSTMORTEMS #35-S2)

> 새 가드 `npm run check:schema-refs`로 코드의 `.from("테이블")`을 실재 public 테이블과 대조하다 발견. 1건은 즉시 수정, 2건은 dead-path라 allowlist로 추적 후 별도 수정.

- ✅ **수정됨**: `app/api/admin/khidi/ai-feedback/route.ts` — 부정 피드백 메시지 내용을 존재하지 않는 `inquiry_messages(content/role)`에서 조회 → 어드민 화면에 메시지 내용이 통째로 안 떴음(조용한 실패). 실재 `chat_messages(message_text)`로 교정 + 에러 표면화.
- ~~🔸 **추적(dead-path, 가드 allowlist)**~~ ✅ **해결(#362)**: ①`dispatch-surveys`의 `.from("patients")` 죽은 가지 제거(수신자=inquiries 단일화). ②`alertService`의 `.from("users")` → `auth.admin.listUsers` 이메일 매칭으로 교체(env 설정 시 실동작). 가드 allowlist 비움 → `check:schema-refs`가 이제 전부 실재 테이블만 통과.
- **가드 한계**: 현재 **테이블 레벨**만. 컬럼 레벨(예: chat_messages에 없는 `content`/`role`)은 생성타입(`database.types.ts`) 도입과 함께 후속.

---

## 🚀 2026-06-22 "정식 운영" 출시 점검 (3축 병렬 감사 + 실코드·실DB 검증)

> PO 지시 "내일 당장 운영해도 버그 0·만족도 100%(사용자=외부 협력기관 포함)". 환자/협력기관/인프라 3축을 병렬 감사 후 **추정 그대로 안 믿고 실코드·실DB로 재검증**. 핵심: 감사봇이 "런치블로커"로 올린 것 중 상당수가 검증 결과 등급이 내려감(=검증의 가치).

### ✅ 검증 결과 — 이미 해결됐거나 영향 낮음(과대평가 정정)
- **EDGE-3/4/5(케이스상태 전파)**: 현 코드에 **이미 구현됨**. 상담완료→`advanceCaseStatus`(`app/api/khidi/consultation/[id]/route.ts`), admin leads/assign 대칭화, conversion-funnel PATCH가 `case_status_history` 기록. → 블로커 아님.
- **`cancer_patient_intakes` step2 무음 upsert 실패(KNOWN_ISSUES #6)**: **실재하나 영향 낮음**으로 정정. 실DB 확인 = 총 3행·`inquiry_id` 있는 행 **0개**·평문치료 **0행**(퍼널이 여기 쓴 적 없음). 그러나 **진짜 데이터는 `inquiries.intake`에 AES 암호화로 안전**하고, 코디 화면(`/coordinator/intakes`)은 이 테이블이 아니라 `consultation_sessions`(`/api/khidi/consultation`)를 읽음 → 보조 리포팅 테이블만 비어있음. **실패 원인(검증 확정)**: ①`inquiry_id`에 UNIQUE 제약 없음 → `onConflict:"inquiry_id"` upsert는 Postgres가 무조건 거부 ②`cancer_type` NOT NULL인데 payload에 없음(이중 결함) ③코드가 평문 `current_treatment`에 쓰려 함(옆에 `current_treatment_encrypted` 존재). **수정=스키마 변경+EscalationQueue 동작 변경이라 RISKY → PO 결정**(긴급 아님).
- **AI 디플렉션 루프 / 거짓 접수**: 현 코드에 가드·세션상태 주입 반영됨(이전 세션). 블로커 아님.

### 🟡 진짜 남은 출시 리스크 (PO 결정/라이브 검증 필요 — 자율 보류)
1. **🔴 [영상상담, iOS] 서버 STT 2차 getUserMedia가 LiveKit 마이크 탈취** — `app/consultation/[id]/page.jsx:1325`(2차 `getUserMedia({audio:true})`). iOS Safari는 2차 오디오 캡처가 1차(LiveKit 송출 마이크)를 **조용히** 빼앗아 환자 마이크가 죽음(throw 없음 → 코드의 catch도 안 걸림). 카자흐/러 환자 아이폰 = 정확히 이 경로. **영상상담은 헤더 전면배치 = 고객대면 핵심 → 최우선 실리스크.** 수정안 (a)iOS Safari는 서버STT 진입 자체를 막고 텍스트입력 폴백(작음·저위험, 단 iOS 자막 기능 degrade) (b)2차 캡처 대신 LiveKit 기존 마이크 트랙 재사용(견고하나 God컴포넌트 수정+**실아이폰 2인 검증 필수**). **빌드·iOS 검증 불가 환경이라 blind 수정 보류** — PO가 (a)/(b) 택1 + 라이브 검증.
2. **[협력기관 가시성] EDGE-1: 환자 여정바가 `case_status`를 안 읽음** — `src/lib/patient/journeyState.js`(`computeCurrentStage`)가 `inquiry_events`만 봄 → 코디/병원이 case_status를 올려도 환자 대시보드 정체. **단 환자/코디 포털은 현재 미활성(메뉴 미연결·계정 없음)** → 내일 고객영향 0. 평가관이 환자로 로그인해 여정 볼 시나리오면 문제 → **포털 활성/평가 전 수정**. RISKY(환자 화면 단계 재정렬 가능, 라이브 검증).
3. ~~**[다국어 엣지] 영상방 게스트 `targetLang` 하드코딩 `ru`**~~ ✅ **해결(#360)**: `guest-join` API가 세션 `patient_language`/`doctor_language` 반환 → 게스트 클라가 역할 기반으로 상대 언어 결정(없으면 기존 기본값 폴백). ⚠️ 실자막 동작은 실상담 1회 육안확인 권장(LiveKit+2인 필요).
4. **soft-404(P2, 위 별도 섹션)** — PO 이미 "보류" 결정.

### ✅ 이번 세션 수정 적용 (PR #269)
- **iOS 마이크 탈취 → 안전 폴백(PO 택1: 옵션A)**: `app/consultation/[id]/page.jsx` 서버 STT effect 진입부에서 **iOS(WebKit) 감지 시 2차 getUserMedia 자체를 안 함** → `mediaRecOk=false`로 "음성자막 불가 → 텍스트 입력" 폴백. iOS는 브라우저STT 또는 텍스트로(자동자막만 포기, 마이크 사망 차단). **실아이폰 라이브 검증은 여전히 PO 권장**(코드 가드는 결정적). 견고판(LiveKit 트랙 재사용)은 추후.
- **intake 저장버그 정상화**: `app/api/inquiries/step2/route.ts` — ①마이그레이션 `cancer_patient_intakes.inquiry_id` **UNIQUE 인덱스 추가**(prod 적용+`migrations/20260622_...sql`) ②`cancer_type`을 inquiry에서 가져와 NOT NULL 충족 ③민감필드를 `*_encrypted` 컬럼에 AES 저장(평문 중단). **동작 변화 주의**: 이제 퍼널 step2 인테이크가 `cancer_patient_intakes`에도 쌓임 → `GET /api/khidi/intake` 어드민 인테이크 목록에 퍼널 문의도 표시됨(정상이나 inquiries 목록과 중복 표시 가능). 정본은 여전히 `inquiries.intake`.
- **EDGE-1 환자 여정바 case_status 반영**: `src/lib/khidi/caseStatus.ts`에 `caseStatusToJourneyStage` 추가 + `src/lib/patient/journeyState.js` `computeCurrentStage`가 이벤트단계와 case_status단계 중 **더 진행된 쪽** 반환(후퇴 방지). 회귀테스트 추가(caseStatus.test.ts·journeyState.test.ts). **⚠️ 단 화면 표시는 아직**: `fetchPatientJourney`가 브라우저에서 service_role 테이블 직접 조회 + 암호화 email 매칭이라 **데이터가 client로 안 옴**(포털 미활성과 동일). 로직·테스트는 정확하나, 환자 여정바가 실제 뜨려면 **포털 데이터 서버 API 이관(P1)**이 선행돼야 함 → 별도 과제로 남김.

### 🔵 이미 다른 세션이 처리 중 (중복 금지)
- **PR #267**(다른 세션): 🔴**카자흐어(`kz`) 문의가 step1 zod에서 400 거부되던 핵심시장 블로커** 수정(POSTMORTEMS #24) + 공개 퍼널 6라우트 레이트리밋 DB화(KNOWN_ISSUES #7). → 이 두 건은 **#267로 해결 예정**이라 본 세션은 손대지 않음. **PO 추천: #267 CI 초록 시 머지**(카자흐 차단은 실유치 직격).

---

## 🟡 P2 — soft-404: 없는 치료/병원 슬러그가 HTTP 200 반환 (2026-06-22 기록·진단)

- **증상(실측)**: 없는 슬러그 `https://www.healwith.co.kr/treatments/<없는값>`·`/hospitals/<없는값>`이 **HTTP 200** 반환. 대조군(없는 일반경로 `/totally-random-path`)은 정상 **404**. 즉 `[slug]` 동적 라우트만 soft-404.
- **근본원인(코드는 정상)**: 서버 코드는 맞다 — `getTreatmentBySlug`는 없는 슬러그에 `null` 반환(`mapTreatmentRow(null)→null`, `.eq("is_published",true)` 포함), `app/treatments/[slug]/page.jsx:164`가 `notFound()`를 **정상 호출**. 실제로 응답 바디도 글로벌 `app/not-found.jsx`(NotFoundClient, "Error 404" UI)가 **올바르게 렌더**됨. **문제는 상태코드만 200으로 샘** — Next 16 동적 렌더(이 라우트는 `cookies()` 호출로 dynamic) + `notFound()` 상호작용에서 스트리밍 응답의 status가 404로 전파 안 되는 프레임워크 동작. (`hospitals/[slug]`도 동일 구조 → 같은 증상.)
- **영향(낮음)**: ①사용자 UX는 정상(올바른 404 화면 보임). ②비공개/없는 published 슬러그는 **sitemap에 없음**(#235에서 `is_published` 필터 + item- 3건 비활성, sitemap 40 URL 확인) → 크롤러가 이 URL에 도달할 경로가 거의 없음. ③유일한 손해 = soft-404의 약한 SEO 품질 신호(구글이 "200인데 빈 페이지"로 오인 가능). 내부 링크·sitemap 노출이 없어 **실질 위험 작음**.
- **판단: 지금은 보류(고치지 않음) 권장.** 진짜 404 상태코드를 동적 라우트에서 강제하려면 라우트 구조 변경 또는 Next 버전별 워크어라운드가 필요하고 **preview 배포로 실검증해야** 함(한 줄 아님). 평가(8/27)·앱스토어 우선. 고친다면 후보: (a) 슬러그 존재 여부를 `generateStaticParams`로 미리 굳혀 정적 404 경로화, (b) Next 16 `notFound` status 회귀 업스트림 확인 후 업그레이드, (c) 정 급하면 얇은 라우트 핸들러/리라이트에서 미존재 슬러그를 사전 404. **PO가 "SEO 깐깐하게 가자" 하면 그때 (a) 우선 착수.**

---

## 🌙 2026-06-21 야간 자율 감사 — 병렬 5축 감사 발견사항 (일부 수정·일부 PO 판단 필요)

> 평가지표(KPI)·보안·문의 퍼널·역할 연결·화상방을 병렬 감사. **고친 것은 draft PR**(PO 검토 전 배포 안 됨), **나머지는 아래에 정밀 기록**(런타임 검증/제품 판단/스키마 변경이 필요해 야간 임의 수정 보류).

### ✅ 이번에 수정함 (draft PR)
- **만족도 설문 발송 윈도우 누수**(K-03 대부분 미발송) → 14일 backfill. **PR #216**. POSTMORTEMS #19.
- **월간보고 명단**이 없는 테이블(`khidi_intakes`) 조인으로 항상 빈칸 → inquiries 기반 교체. **PR #216**.
- **KPI 집계오류가 대시보드/월간보고에서 0으로 조용히** 보이던 것 → canary 발사. **PR #216**.
- **EDGE-2: 코디 case_status→treatment/완료 시 유치(K-01) 누락**(POSTMORTEM #17 잔여위험) → outcome 자동집계(가드). **PR #216**.
- **AI상담(게스트) 리드 PII가 코디 인박스에 암호문**으로 떠 연락 불가(#13 부류) → `admin/chat/threads` GET 복호화. **PR(이 브랜치)**.
- **화상방 탭 'Chat'/'Translation' 하드코딩 영어** → 6언어화 + `_roomCopy.js` 패리티 가드 신설. **PR(이 브랜치)**.

### 🟡 PO 판단/런타임 검증 필요 (야간 임의 수정 보류 — 이유 명시)

1. ~~**🔴 [데모 직격, iOS] 서버 STT 2차 getUserMedia 가 LiveKit 마이크를 가로챌 수 있음**~~ ✅ **해결(PR #269 / 2026-06-29 전수조사 재확인)**: 2026-06-22 세션이 옵션A(iOS(WebKit) 감지 시 2차 getUserMedia 자체를 안 함 → 텍스트 입력 폴백)를 적용함. 현재 코드 `app/consultation/[id]/page.jsx`에 iOS 안전폴백 가드 존재 확인. (2026-06-22 섹션 「✅ PR #269」와 동일 건의 중복 기록이었음.) ⚠️ 실아이폰 라이브 검증은 여전히 PO 권장(LAUNCH_GATES 관문5).
2. **[K-01 구조적] 환자 포털이 `case_status` 를 못 봄 (EDGE-1)** — 환자 여정바(`src/lib/patient/journeyState.js:123`)는 `inquiry_events` 만 보는데 그 이벤트를 쓰는 코드가 funnel 4종뿐(`app/api/inquiries/event/route.ts:23`) → 코디/병원이 case_status 를 visa/treatment/completed 로 올려도 **환자 대시보드가 안 움직임**. 구조적(두 추적 그래프 분리) → 단일화 설계는 PO 판단.
3. **[가시성] 완료된 상담이 case_status 를 전진 안 시킴 (EDGE-3)** — `consultation/[id]` 완료 시 `case_status`/이력 미기록 → KPI(K-02/04)는 오르지만 **에이전시·코디 타임라인은 정체**. (lifecycle 지도와 코드 불일치.)
4. **[가시성] admin/leads/assign 가 case_status 안 올림 (EDGE-4)** — `coordinator/cases/assign` 과 비대칭(`app/api/admin/leads/assign/route.ts`엔 case_status 기록 없음).
5. **[가시성] 점수판 outcome 확정/이탈이 case_status_history 에 안 남음 (EDGE-5)** — `conversion-funnel` PATCH 가 outcome 만 써 **에이전시가 '확정/이탈'을 타임라인에서 못 봄**.
6. **[데이터 유실+PII] step2 의 `cancer_patient_intakes` upsert 가 항상 무음 실패** — `inquiry_id` UNIQUE 제약이 없어(`onConflict:"inquiry_id"`) 매번 throw→catch 로 버려짐 → 구조적 intake 저장 안 됨. 게다가 `current_treatment` 를 **평문**으로 쓰려 함(같은 값 inquiries.intake 엔 암호화). **수정이 엉킴**: 고치면 step2 인콰이어리가 `/api/khidi/intake` 큐(EscalationQueue)에 cancer_type 빈 채로 등장하는 등 **제품 동작이 바뀜** → select-then-write + `current_treatment_encrypted` 사용 + EscalationQueue 영향 검토를 PO 와 함께.
7. **[KPI 정확도] 공개 문의 POST 레이트리밋이 인메모리** — `inquiries/step1·step2·create`·`guest-join` 등은 `checkRateLimit`(인스턴스별 Map, 콜드스타트 리셋)라 분산 봇에 약함. `checkRateLimitPersistent`(DB, 이미 chat 에 적용)로 이관 권장 → 스팸 리드가 퍼널 KPI 오염 방지.
8. ~~**[K-01 잠재] 화상방 게스트 targetLang 하드코딩**~~ ✅ **해결(#360)**: 게스트 입장 시 세션 설정 언어(`patient_language`/`doctor_language`)로 상대 언어 결정하도록 교체(위 "진짜 남은 출시 리스크" #3과 동일 건).
9. ~~**[저] 만족도 환산이 null 점수를 0 으로** — `satisfaction.ts`~~ ✅ **해결(2026-07-01, 태스크 D)**: `avgSatisfaction100` 이 미응답(null) 문항을 0점이 아니라 **평균 분모에서 제외**하도록 교정(부분응답을 0점으로 깎던 버그) + `minResponses` 표본부족 가드 추가(옵션, 기본 off). **현 평가점수 영향 0**(실측: `survey_responses` 0행 — 실 응답 자체가 아직 없음). 단위테스트 3건 추가(총 10건 통과). ⚠️ **min-N 을 K-03 실집계에 켤지(임계 N)는 PO 결정** — 켜면 응답 N건 미만일 때 K-03 을 '표본부족'으로 처리(기본은 안 켬).

> **보안 감사 결과**: 고신뢰 취약점 0(인증·암호화·게스트토큰 견고). 위 #7 인메모리 레이트리밋만 하드닝 권장.

---

## ✅ 침묵 환자 감지 cron 이 항상 0건 (2026-06-21 발견 → **2026-06-21 수정 완료**)

- **증상**: `app/api/cron/detect-silent-patients/route.ts` 가 `consultation_sessions` 를 `.not("patient_id","is",null)` 로 거르는데 **patient_id 가 전 행 null**(미사용 컬럼) → 대상 0건 → 침묵(장기 미응답) 환자 알림이 한 번도 안 뜸.
- **뿌리원인**: POSTMORTEMS #7·#12 와 동일 — 실제 환자 연결고리는 `inquiry_id → inquiries` 인데 옛 `patient_id` 경로에 의존. 게다가 `consultation_sessions.patient_id` 는 사실 **uuid 가 아니라 bigint(→cancer_patient_intakes)** 라 `symptom_alerts.patient_id`(uuid→auth.users)와 타입도 안 맞아 `getCoordinatorIds` 도 깨져 있었음.
- **수정(PR 침묵환자 inquiry_id 리팩터)**: ① 마이그레이션 `symptom_alerts` 에 `inquiry_id bigint` 추가 + `patient_id` nullable(둘 중 하나 필수 CHECK) ② 순수 로직 `src/lib/symptoms/silence.ts`(`buildSilenceAlert`) 분리 + 단위테스트 ③ cron 을 inquiry_id 기준으로 재작성(활성 문의→최근 증상보고→3일↑ 무입력→알림) ④ `alertService.getCoordinatorIds` 를 inquiry_id/patient_user_id 기준으로 + 메신저 문의 환자는 안심알림 skip ⑤ 코디 알림 화면 patient_id 없으면 `문의 #N` 표시 ⑥ cron 계약 테스트로 잠금. POSTMORTEMS #14.
- **남은 한계**: 증상 보고를 한 번도 안 한 문의는 알림 대상 아님(전원 알림 폭주 방지 — 의도). 현재 증상보고 데이터가 적어 당장 알림은 거의 없음. 데이터 쌓이면 동작.

---

## 🌙 야간 자율 세션 진행 (2026-06-19) — 백로그 다수 PR화

> 아래 백로그 항목들이 PR로 진행됨(머지·배포는 PROJECT_CONTEXT 최상단 핸드오프 참조).

- **죽은 `/api/chat` 정리** → **[#99](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/99) 머지·배포 완료**.
- **DB 마이그레이션 위생(멱등 가드)** → **[#100](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/100)**(draft, PO 대기) + `check:migrations` CI 게이트 신설.
- **알림 카운터 인메모리→DB** → **[#101](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/101)**(draft, PO 대기 — 마이그레이션 적용도 결정 필요).
- **🔴 KHIDI KPI 깨진 컬럼**(유치·사전상담이 없는 컬럼 쿼리로 항상 0) → **[#102](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/102)**(draft, PO 대기 — 평가 직결, POSTMORTEMS #7).
- **상담방 역할 라벨 i18n** → **[#103](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/103)**(저위험, CI 초록 시 머지).

### 화상상담방(God 컴포넌트 2883줄) 조사 결과 — 분할 계획
- **표준 동작은 이미 구현됨**(PO 우려 해소): 발화자 자동 메인(스피커뷰, `useSpeakingParticipants`+FocusLayout), 화면공유 자동 확대(우선순위 pin>screenshare>speaker), 화질(720p 캡처+simulcast 180/360/720+화면공유 1080p+adaptiveStream/dynacast), 언어 선택 시 전체 UI 전환(COPY 6언어+`switchUiLang`).
- **분할 안전 seam(향후 PO 확인 후)**: `VideoGrid`(820~), `SubtitleOverlay`(904~), `RoomInfoOverlay`(733~), `MutedSpeakingWarning`(762~)는 의존성 적어 추출 후보. STT/번역 로직은 `useTranslation()` 커스텀훅으로 묶는 게 안전(prop-drilling 큼). **실제 분할은 LiveKit 라이브 검증(2+참가자) 필요 → 자동검증 불가**라 이번엔 미실행.

---

## ✅ 해결 (2026-06-19) — KPI 국가별 분포 집계 버그 (PR #98)

> 서버 클라 통합 중 `kpi.ts`를 타입 박힌 정본 `supabaseAdmin`에 위임하자 숨어있던 불일치가 드러남(옛 클라는 제네릭 없는 createClient라 무검사 통과했음).

- **증상(원인)**: `src/lib/khidi/kpi.ts` 의 "국가별 분포"가 **존재하지 않는 테이블 `khidi_intakes`** 를 쿼리 → 항상 빈 값. 더해 환자 식별에 쓰던 `consultation_sessions.patient_id` 가 **프로덕션에서 전부 NULL**(14건 중 0건)이라 고유환자수도 같은 뿌리원인으로 깨져 있었음.
- **실DB 확인**: `nationality` 컬럼은 `inquiries`·`visa_applications` 에 존재. `cancer_patient_intakes` 엔 nationality 컬럼 없음. **실제 연결고리 = `consultation_sessions.inquiry_id` → `inquiries.nationality`** (11/14 세션에 inquiry_id 있고 해당 inquiries 모두 nationality 보유).
- **수정(PR #98)**: 국가분포·고유환자수를 `inquiry_id → inquiries.nationality` 기준으로 재정의. 환자키 = `patient_id ?? inq:<inquiry_id>` 로 중복제거(patient_id 채워질 미래 자동 대응). ISO 코드(KZ/RU/UZ)→한국어 표기 매핑 추가.
- **검증**: 실DB 집계 = 카자흐스탄 6 · 러시아 1 · 우즈베키스탄 1(이전엔 0). tsc/vitest129/eslint0/check:content/next build 통과. 대시보드 `/admin/khidi/kpi-dashboard` 5·6월 조회 시 표시.

---

## 🧭 기초 감리 (2026-06-19) — 5축 제3자 점검

> "기능만 빨리, 기초 부실" 가설을 5축(보안/테스트·CI/타입·품질/관측/의존성·DB·문서)으로 코드 직접 검증.
> 종합 ≈56/100. 보안 뼈대(82)는 견고, 관측(42)이 최약점. 이번 PR에서 **위험3+근본원인 4건 수리**, 나머지는 아래 백로그.

### ✅ 이번에 수리 완료 (PR #85)
- **서버 Sentry 부활**: `instrumentation.ts`의 `return;` 제거 → 서버·SSR·크론 에러 수집 재활성(DSN 있을 때). **프로덕션(DSN 설정) 배포로 실수집 확인 필요.**
- **`supabaseAdmin` fail-closed**: 더미 fallback 을 빌드 단계(`NEXT_PHASE`)로만 한정, 런타임 env 누락 시 throw → 조용한 데이터 유실 차단.
- **`pg` 오배치 교정** + **취약점 31→7**(axios 1.18.0·ws 8.21.0 등 prod·high 패치, 죽은 `@ai-sdk/openai`·`@ai-sdk/react` 제거).
- **CI 게이트**: `tsc --noEmit` 머지 차단 추가. `eslint` 정보용(비차단).
- **기본 임시비번 healo1234 제거** → 계정마다 crypto 랜덤 14자(`admin/staff`).
- **게스트 채팅 PII 평문저장 차단**: `public/chat/start` 가 이름·이메일·전화를 AES-256-GCM 암호화 저장, 검색은 metadata SHA256 블라인드 인덱스. 읽기 경로 `decryptMaybe` 로 복호화(옛 평문 행 호환).
- **운영 알림 실제 연결**: `operationalAlerts.sendAlert` → Sentry+이메일(critical/warning). `adminNotifier.sendSMS` 가짜 'sent' 제거(미설정은 정직하게 skip).
- **핵심경로 테스트 + 커버리지 복구**: `encryptionV2.test.ts`(9), `@vitest/coverage-v8` 추가.
- **README** 피벗 반영 전면 재작성.

### ✅ 중복 정리 완료 (PR #86·#89)
- **브라우저 클라 3벌→1**(#86): `src/supabase.js` 삭제, `data/supabaseClient.js`를 정본 `supabase/browser.ts` 위임 프록시로. "Multiple GoTrueClient" 경고 해소.
- **이메일 발송 2벌→1**(#86): `notifications/emailSender.ts` 삭제, 통합 `email/sendEmail.ts`(레거시 env fallback 포함). `withErrorHandler` 데드 추상화 제거.
- **서버 클라 4벌→통합**(#89, 보안등급별 3단계): service_role 생성 지점 3벌(`supabaseAdmin`·`getSupabaseServerClient`·`createServiceRoleClient`)→**1벌**(`supabaseAdmin` 싱글톤, 나머지 위임). `getSupabaseServerClient`의 **위험한 anon 폴백 제거**(fail-closed). anon no-session `data/supabaseServer.js`→정본 `supabase/server.ts`(`supabaseAnonServer`)로 통합·삭제. anon 쿠키세션(`createSupabaseServerClient*`)은 역할 달라 유지. 호출부 전부 무변경. tsc·129테스트·content·`next build` 통과.

### 🔴 남은 백로그 (다음 세션 권장)
- **(선택) 브라우저 클라 `data/supabaseClient.js` 완전 흡수**: 현재 정본 `supabase/browser.ts` 위임 프록시(호출부 9곳). 호출부를 직접 repoint하면 프록시 파일도 제거 가능(저우선).
- ~~**(소) 죽은 라우트 `/api/chat` 프롬프트 일관성**~~ ✅ **해결**: 라우트 자체가 [#99](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/99)에서 제거됨(폼 자동채움용 `/api/chat/thread-summary`만 보존). 일관성 우려 소멸.
- **`any` 813개**(인증·복호화 66개) 점진 축소, God컴포넌트 `consultation/[id]/page.jsx` 2,883줄 분할.
- ~~**얕은 헬스체크**: `api/health`가 정적 `{ok}`만 → DB 죽어도 200.~~ ✅ **해결**: `app/api/health/route.ts`가 이제 anon 클라로 `hospitals` head count 실측(3초 타임아웃) → 실패 시 503(degraded). uptime 모니터가 장애를 잡는다.
- **남은 7취약점**: vitest(dev)·exceljs→uuid·sentry→postcss = major 강제 필요(깨질 수 있어 보류).
- ~~**DB 마이그레이션 위생**: 수동 추적·정책 `DROP ... IF EXISTS` 가드 누락(재실행 충돌 위험).~~ ✅ **해결(2026-06-19)**: 19개 파일에 멱등 가드 추가(정책 39·트리거 4·인덱스 10·제약 2) + `scripts/check-migration-idempotency.mjs` CI 게이트 신설로 재발 영구 차단. 상세 POSTMORTEMS #6. (수동 추적 자체는 유지 — supabase 히스토리 도입은 별도 과제.)
- ~~**알림 카운터 인메모리**: 서버리스 콜드스타트 리셋 → 누적 임계 정밀 집계는 DB 카운터 필요.~~ ✅ **해결([#101](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/101))**: `alert_counter_events` 테이블 + RPC sliding window 로 cross-isolate 정확 집계(실패 시 인메모리 fallback).

### ✅ 신규 (2026-06-20) — KHIDI KPI 집계 오류 자동 canary
- **무엇**: 매일 도는 KPI 스냅샷 cron(`/api/cron/kpi-snapshot` → `upsertDailySnapshot`)이 집계 쿼리 오류(없는 컬럼·연결 등 [#102](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/102) 부류)를 만나면 `operationalAlerts.alertKpiAggregationErrors()`로 **critical 알림**(콘솔+Sentry+이메일)을 자동 발사. 이전엔 대시보드를 직접 열어야만 errors 배너로 보였음 → 이제 평가 숫자가 깨지면 PO가 자동 통보받음. 단위테스트 3개(`operationalAlerts.test.ts`).

---

## ✅ P1 — AI 토큰 남용 방어 (2026-06-12 적용 완료)

> 2026-06-12 PO 승인("피버모드 — 안 했던 작업 다")으로 적용 완료. 남은 것: Gemini 콘솔 spend cap 은 PO 직접 설정(5분).

봇/악성 사용자가 공개 AI(챗봇 등)를 반복 호출하면 현재 구조로는 못 막음:
- 회수 제한이 메모리 기반 → Vercel 다중 인스턴스에서 분산 우회 가능 (DB 기반 `checkRateLimitPersistent`는 `inquiries/create`에만 적용)
- `generateReply.ts`에 maxOutputTokens 없음 → 호출당 비용 상한 없음
- 하루 총량 차단기 없음 → 밤새 봇 돌면 아침에야 인지

**적용 내역 (src/lib/ai/aiGuard.ts + 공개 AI 라우트 5곳):**
1. 공개 AI 엔드포인트 전부 DB 기반 레이트리밋으로 전환
2. AI 챗 maxOutputTokens 추가 (한 줄)
3. 하루 총량 차단기 — 초과 시 공개 챗봇만 "상담사 연결 안내" 모드 + PO 이메일 알림 (상담방 자막은 참가자 전용이라 유지)
4. IP당 일일 챗 상한 (예: 50회 — 실환자 영향 없는 수준)

~~현재는 Gemini 무료 플랜이라 금전 피해가 아닌 "한도 소진 → 실환자 서비스 중단"이 실제 리스크. **유료 전환 전 적용이 순서.**~~

⚠️ **정정(2026-07-20) — 이미 유료다. 위 서술은 낡았고 위험했다.** PO가 AI Studio 화면을 확인한 결과 `HEALO`(gen-lang-client-0011286315) 프로젝트의 Gemini 키가 **`Tier 1 · 후불`(결제 계정 연결됨)** 상태다. 즉 **한도 소진이 아니라 실제 청구가 리스크**다. 언제 전환됐는지는 그 화면으로 알 수 없다(표시된 `2026-02-23`은 *키 생성일*) — 필요하면 [Cloud Console 결제 거래내역](https://console.cloud.google.com/billing)에서 첫 청구일로 확인.
- ✅ **코드 방어는 실제로 살아있다(2026-07-20 실측)**: `src/lib/ai/aiGuard.ts` 가 공개 AI 라우트 8곳에 배선됨. 전역 2000회/일, IP당 400회/일 자동차단(`observe` 기본 모드에서도 hard 지점은 차단), `maxOutputTokens` 적용. 프로덕션 env 는 `AI_DAILY_PER_IP_LIMIT` 만 설정돼 있으나 **나머지는 코드 기본값이 안전값**이라 무제한이 아니다.
- 🔴 **남은 구멍 = Google 콘솔 spend cap(PO 5분 작업).** 2026-06-12에 "PO 직접 설정"으로 남겨둔 그 항목인데 아직 미확인. **유료가 이미 켜진 상태라 이제 이게 마지막 금전 백스톱**이다. 게다가 `gemini-flash-latest` 별칭이 조용히 3.5 Flash 로 옮겨가며 **입력 단가가 5배** 올랐다(2026-07-20 실측) → 상한 없이 두면 사고 시 피해가 예전 추정보다 크다.
- 💡 **부수 효과**: 유료(Tier 1)면 구글이 프롬프트·응답을 제품 개선(학습)에 쓰지 않는다는 게 유료 약관의 전제다 — 이게 바로 `GEMINI_PII_BILLING_CONFIRMED` 가드가 기다리던 조건. 확인되면 **AI 상담 회의록(한 달째 휴면) + 실시간 통역** 두 개가 동시에 풀린다.

---

## 건강 상태 (정상)
- ✅ `npx next build --webpack` 통과
- ✅ 단위 테스트 12파일 / 106개 전부 통과 (vitest exclude 글롭 수정 후)
- ✅ i18n 커버리지 ru/kz 100%
- ✅ 공개 페이지 Premium 잔재 0 (전수 확인)

---

## ✅ P1 — 클라이언트 service_role 테이블 직접 쿼리 → 서버 API 이관 (2026-06-10 완료)

`inquiries`·`chat_threads`·`chat_messages`·`consultation_sessions` 전부 service_role 전용 RLS (pg_policies 재확인됨).
`/api/portal/*` 서버 API 신설 (`requirePortalAuth` — staff = app_metadata.role ∈ admin/coordinator/doctor) 후 일괄 이관:

| 파일 | 상태 | 경유 API |
|---|---|---|
| `app/admin/consultations/page.jsx` (picker) | ✅ | `/api/admin/inquiries/picker` |
| `app/coordinator/inbox/page.jsx` | ✅ | `/api/portal/inbox` (이름 복호화+마스킹) |
| `app/patient/messages/MessagesClient.jsx` | ✅ | `/api/portal/threads`·`…/[id]/messages` (realtime→5초 폴링) |
| `app/coordinator/messages/CoordinatorMessagesClient.jsx` | ✅ | 동일 + `PATCH /api/portal/threads/[id]` (상태변경) |
| `components/healo/NotificationBadge.jsx` | ✅ | `/api/portal/badge` |
| `components/healo/EmergencyButton.jsx` | ✅ | `/api/portal/emergency` |

**미검증:** 코드·빌드·단위테스트(106개)는 통과했으나 **실제 코디/환자 계정으로 화면 동작은 미확인** (portal 메뉴 미연결 상태 동일). portal 활성화 때 실계정으로 1회 점검 필요.

---

## ✅ P2 — ESLint TS 파싱 (2026-06-12 해소 — typescript-eslint 도입. 잔여: 기존 코드 에러 64·경고 1천여 건 점진 정리)

`eslint .` 실행 시 .ts/.tsx 에서 "Parsing error: Unexpected token interface/:" 다수 → eslint flat config 에 TS 파서 미설정. **실제 코드 버그 아님**(빌드는 통과). 다만 lint가 TS 파일 품질검사를 못 함.
**권장:** eslint TS 파서 설정 보강 → CI lint 실효성 확보.

## 🟢 P3 — 빌드 산출물에 css 파일을 가리키는 script 태그 1개 (기형, 무해)
모든 페이지 HTML 에 `<script src=".../css/xxxx.css">` 가 1개 끼어 있음 — 브라우저가 MIME 검사로 거부(콘솔 에러 1줄)하고 동작엔 영향 없음. 2026-06-12 기준 어제 코드(8ad7eef)에도 동일 존재 확인 — 오래된 기형. webpack 청크 매니페스트 이슈로 추정, Next 업그레이드 시 재확인.

## 🟢 P3 — 자잘한 미사용 변수
일부 파일에 unused var (colorClass, w, today, catch(e) 등). 빌드 영향 없음. 정리 시 lint-clean.

---

## ~~🟡 P2 — PNG 앱아이콘 옛 H마크~~ ✅ 해결 확인 (2026-07-02 전수 감사 — 문서만 낡았었음)

~~PNG는 래스터라이저 환경 필요해 미재생성, PO 보류~~ → **실제로는 2026-06-23 커밋 943481c(+a9a6673)로 icon-72~512·apple-touch-icon·favicon-16/32 전부 새 소문자 h 마크로 교체 완료**(main 포함, icon-192x192.png 육안 확인). 이 항목이 갱신 안 돼 후속 세션·감사가 재발견 헛수고를 반복했음 — 종결.

---

## 예방 (적용됨)
- `CLAUDE.md` 출시 전 self-QA 체크리스트 → service_role 테이블 client 직접 쿼리 금지 명시 (신규 코드 재발 방지)

---

## 🟡 P1 — K-01 유치 점수판 admitted 4건 = 시드 데모데이터 (진짜 유치 0건) — 8/27 전 실데이터 대체 필요

`/admin/khidi/conversion` 점수판의 **K-01 외국인환자 유치 = 4건이 전부 시드/데모**(inquiries id 4·5·6·10, 위암·유방암·폐암·갑상선암, 2026-05 동일 타임스탬프 일괄삽입, lead·outcome_note 없음). **진짜 외국인환자 유치 = 0건**(이전 핸드오프 "KPI real 0"과 일치). 케이스 지도(`CASE_LIFECYCLE_MAP.md`) §2 경고대로 테스트 데이터도 점수판에 그대로 집계됨.

- **PO 결정(2026-06-22): 데모용으로 그대로 유지.** 8/27 PT에서 "깔때기가 채워진 화면"을 보여주기 위함.
- **⚠️ 리스크/숙제: KHIDI 중간평가(8/27) 점수판 숫자는 실적이 아니라 가짜다.** 평가 전까지 **실제 유치로 대체**하거나, 시연 시 데모데이터임을 명확히 구분할 것. 잔금(30%)이 걸린 공식 성과지표(목표 12건)라 정직성 중요.
- 참고: "병원 치료확정 → 유치 자동집계(#207)" 엣지 자체는 2026-06-22 라이브 prod DB로 **실증 완료**(병원 포털 실버튼 클릭 → outcome 자동 admitted → K-01 +1). 검증용 테스트분(id 13)은 원복함.
