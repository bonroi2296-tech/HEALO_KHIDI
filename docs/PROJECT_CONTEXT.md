# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

---

## 🔖 세션 핸드오프 (2026-06-24 — 재진 엔진 followup_schedules 배선 + 파비콘(얀덱스) + 프로덕션 정리)

> 직전 핸드오프(#318)의 "#311·#313·#315 프로덕션 미반영" 우려를 실배포 이력으로 검증 → **이미 #313 promote 로 user-facing 수정은 라이브였음(핸드오프가 낡았던 것)**. 이어서 재진 엔진 근본수정(휴면 해제)·얀덱스 파비콘을 한 PR로 머지·배포. **[#320](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/320) main 머지 완료(`0c7dd8e`).**

**1. 이번 세션 한 일 ([#320](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/320), CI 초록·squash 머지):**
- **재진 엔진 근본수정 — 환자 재진화면 휴면 해제**: 재예약 엔진(`/api/khidi/rebooking/create`)이 `consultation_sessions`(실제 화상세션)에 써서, 환자 "재예약 관리" 화면이 읽는 `followup_schedules`는 **항상 0행**이라 화면이 영구히 비어 있었음(POSTMORTEMS #29 후속). → 엔진이 **`followup_schedules`에 `status='proposed'`로 "제안"을 쓰게** 고침. `inquiryId`만 오는 경로(SymptomAlerts)는 inquiry에서 `cancer_type`(NOT NULL 충족)·`user_id`(→`patient_user_id`, 환자 노출키 #297)를 끌어와 연결. source·reason은 `schedule`(Json)에 보존.
- **실DB 추가 단절 발견·수정**: `followup_schedules_status_check`가 `active/paused/completed/cancelled`만 허용해 화면·포털API의 제안 어휘(`pending/proposed/confirmed/dismissed`)를 **막고 있었음** → CHECK를 합집합으로 넓힘(가역 마이그레이션 `widen_followup_schedules_status_check`, **prod 적용 + 실insert 검증**).
- **환자 화면**(`RebookingClient.jsx`): 뱃지가 트리거 종류(증상/팔로업/의사) 표시(이미 있던 `LABELS`/`SOURCE_COLORS` 활용) + history 상태 라벨 `confirmed`/`dismissed` 추가(6언어). 계약테스트도 새 테이블로 갱신.
- **파비콘 `/favicon.ico` 추가 (얀덱스)**: PO가 얀덱스 웹마스터 "파비콘 파일을 찾을 수 없습니다" 제보. 원인 = head엔 PNG 파비콘만 있고 크롤러가 루트에서 찾는 클래식 `/favicon.ico`가 부재. → `public/favicon.ico` 신설(새 브랜드 h 마크 16·32 PNG를 ICO 컨테이너로 래핑, `file` 검증 통과) + layout metadata에 명시.
- **프로덕션 정리(자동)**: #320 main 머지로 프로덕션이 **옛 branch-promote(#313)에서 main 최신본으로 자동 재배포** → "프로덕션 = 본판 최신" 정상화. 배포 일일한도도 풀림(6/24 배포 성공 중).

**2. 왜 그렇게 했는지:**
- **followup_schedules가 정식 테이블**: 환자 화면·포털API가 이미 거기 붙어 있음(SoR). 재예약은 환자가 확정/무시하는 "제안"이라 추천 큐(followup_schedules)가 맞고, 실제 화상세션(consultation_sessions)은 확정 후 생성될 것. 그래서 엔진을 화면 쪽으로 맞춤(POSTMORTEM #28 교훈: 데이터원 단일화).
- **CHECK를 합집합으로 넓힘(좁히지 않음)**: 0행이라 무손실·가역. 다른 경로가 active/paused를 쓸 수 있어 기존 어휘도 보존.
- **파비콘 ICO 직접 생성**: `sharp`는 .ico 출력 미지원 → ICO는 PNG 임베드를 허용하므로 기존 16/32 PNG를 ICO 컨테이너로 래핑(의존성 추가 없이).

**3. 안 끝났거나 보류:**
- **재진 런타임 클릭 미검증** — 데이터 경로(엔진 insert→환자 API 조회)는 실DB·계약테스트로 확정했으나, "어드민이 SymptomAlerts에서 재예약 제안 → 환자 로그인 → 재진화면에 뜸"의 **다중주체 실클릭은 못 함**(로그인·다계정 필요). prod 반영 후 PO/세션이 확인.
- **기존 문의 소급 연결 안 됨** — `inquiries.user_id`가 전부 NULL(기존 17건). 환자계정 연결은 **앞으로 로그인 접수분부터**. 그래서 당장 재진 제안의 `patient_user_id`는 신규 접수에서만 채워짐.
- **E2E 자동 클릭검사 2개 잠자는 중** — 테스트 계정(`patient@test.com`·`coordinator@test.com`)은 **실재 확인**했으나 GitHub Secrets 4개(`E2E_TEST_USER_EMAIL/PASSWORD`·`E2E_COORDINATOR_EMAIL/PASSWORD`) 미설정이라 CI에서 skip. PO가 넣어야 활성(비번이 secret 값과 일치해야 함).

**4. 주의·함정:**
- ⚠️ **자동저장 훅이 작업 중 2회 끼어듦**(09:41·09:45 "chore: 작업 자동 저장" 커밋 + 원격 푸시). 내 깔끔한 커밋으로 `reset --soft`(hard 아님) 후 재커밋, 피처 브랜치는 `--force-with-lease`로 정리. **커밋 전 `reset --hard` 금지**(기존 교훈) — soft만.
- ⚠️ **재진 엔진 IDOR 체크는 payload.patientId 기준**: 환자가 inquiryId만 보내 self-trigger하면 forbidden(현재 SymptomAlerts=어드민만이라 무해). 환자 self-rebooking을 켤 거면 그 체크를 inquiry 소유 기반으로 손봐야.
- ⚠️ **followup_schedules.current_phase 기본값='week_1'** — 엔진은 `null` 명시로 회피(화면 뱃지가 'week_1' 안 뜨게). 직접 insert 시 주의.

**5. 다음 세션이 먼저 할 일 (우선순위):**
1. **⚠️ 직전 미검증분 먼저(배포 후 실클릭)**: #320 prod 반영되면 **①`https://healwith.co.kr/favicon.ico`가 200으로 뜨는지**(얀덱스 재검토 트리거) **②재진: 어드민 SymptomAlerts에서 '재예약 제안' → 그 환자로 로그인 → `/patient/rebooking`에 제안이 뜨고 확정/무시 되는지**. (데이터·빌드·CI·실DB는 통과, 다중주체 클릭은 못 함.)
2. **(PO 액션) E2E Secrets 4개 등록** — 넣으면 자동 클릭검사 활성. 비번은 test 계정 실제 비번과 일치해야(모르면 Supabase에서 리셋).
3. (선택) 환자 self-rebooking 켤 때 IDOR 체크 보완 / 기존 문의 소급 연결(백필).

**6. 검증 상태:**
- ✅ **[#320](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/320) CI 전부 초록**: `ci`(2m20s)·`Smoke Tests (PR)`(3m20s)·Vercel preview pass → squash 머지(`0c7dd8e`). 열린 PR 없음.
- ✅ vitest 계약 6 + 엔진 14 통과 · `next build --webpack` exit 0(2회) · `check:content` 통과.
- ✅ 실DB: `followup_schedules`에 `status='proposed'` insert 성공(테스트행 삭제), CHECK 마이그레이션 prod 적용. 파비콘 `file`=MS Windows icon resource(16+32).
- ⏳ **prod 배포는 머지 직후 BUILDING** — 이 핸드오프 시점엔 favicon 200·재진 화면 **런타임 미검증**(→ 5번 1).

**7. 다음 세션 첫 프롬프트:**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프 읽어. 2026-06-24에 재진 엔진을 정식 테이블(followup_schedules)로 고쳐 환자 재진화면 휴면을 풀고, 얀덱스가 찾던 /favicon.ico를 추가해 #320으로 main 머지했어(prod 자동 재배포). ①healwith.co.kr/favicon.ico가 200으로 뜨는지 ②어드민 SymptomAlerts에서 '재예약 제안'→그 환자로 로그인→/patient/rebooking에 제안 뜨고 확정/무시 되는지 직접 확인해줘. 그담에 E2E Secrets 4개 넣는 거 PO한테 안내(test 계정 실재 확인됨).

## 🔖 세션 핸드오프 (2026-06-23 늦은밤 — 코디·환자 버그 수정 + 배포최적화 + 검증 자동화)

> 갈무리 세션이 길게 이어져 PO가 실서비스를 직접 클릭하며 버그를 연달아 발견 → 그때마다 원인+재발방지(가드/E2E)까지 한 세트로 수리. **PR 9개 머지**(#274 닫음 포함). ⚠️ **단, 한도 때문에 #311·#313·#315는 아직 프로덕션 미반영**(5번·6번 필독).

**1. 이번 세션 한 일 (머지·배포):**
- **갈무리**: [#274](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/274) 닫음(대체됨) / **[#298](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/298)** 암종 비용·비자 콘텐츠 머지 / **[#301](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/301)** 갈무리 핸드오프.
- **[#303](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/303) 배포 폭증 차단**: 자동저장(`chore: 작업 자동 저장`) 커밋은 Vercel 배포 스킵(`scripts/vercel-ignore-build.sh`). 백업(커밋·푸시)은 그대로. **prod 반영됨**.
- **[#305](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/305) 코디 인박스 404 수리**: 목록이 `/coordinator/inbox/[id]`로 보내는데 상세 라우트가 없어 404 → 상세 페이지 + `GET /api/portal/inbox/[id]`(staff 복호화) 신설. **prod 반영됨**.
- **[#306](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/306) 404 자동가드**: `check:content`에 "목록→없는 상세 링크" 검사 추가(POSTMORTEMS #31). **prod 반영됨**.
- **[#309](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/309) 코디 '새 상담 생성'이 환자 문의창으로 가던 것 수리**: `/intake`(→`/inquiry` 리다이렉트) → 실제 상담 생성 모달. admin 인라인 모달을 **공용 `src/components/consultation/CreateConsultationModal.jsx`로 추출**해 admin·coordinator 공유 + 드롭다운 API(`/api/admin/inquiries/picker`·`/api/admin/users/search`)를 `requirePortalAuth(staffOnly)`로 확대. **prod 반영됨**.
- **[#311](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/311) 상담 모달 3종 개선**: ①역할 5개 링크 → **통합 '참여 링크' 1개**(`role=guest`, DB CHECK 마이그레이션 `migrations/20260623_guest_token_role_add_guest.sql` 적용 + `_roomCopy.js` 6언어 `roleGuest`) ②문의 선택 시 환자 이메일·이름 **자동 채움**(`/api/portal/inbox/[id]` 재사용) ③picker·inbox 목록 **실명 표시**(마스킹 제거, staff 전용). **⚠️ prod 미반영**.
- **[#313](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/313) 환자 모바일 레이아웃 깨짐 수리**: `ClientShell.isPortalPage`에 `/patient` 누락 → 공개 헤더+하단바+푸터가 환자 자체 하단탭과 **이중**으로 겹침. `/patient` 추가 + `patient/layout` `pt-14 md:pt-16` + 환자는 idle 자동로그아웃 제외(POSTMORTEMS #32). **⚠️ prod 미반영**.
- **[#315](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/315) 검증 자동화**: E2E `@smoke` 2개(`patient-mobile-chrome`·`consultation-create-modal`) + 정적가드 "직원→환자퍼널(/inquiry·/intake) 링크 금지" + **POSTMORTEMS #33(메타 반성)**. **⚠️ prod 미반영**(테스트·문서라 무관하지만 코드상 미반영).

**2. 왜 그렇게 했는지:**
- **통합 링크(role=guest)**: PO "관련자 다 여기로 들어오셈 한 링크가 편하다". 화상방은 role 무관 전원 송출(`canPublish=true` 고정)이라 권한 영향 0 — role은 채팅 이름표·대기실 자동승인(의사만)·이메일 언어에만 쓰임. 그래서 통합 링크 안전.
- **모달 공용 추출**: 두 벌로 복제하면 데이터원 갈림(POSTMORTEM #28 교훈) → 단일 컴포넌트.
- **실명 표시**: PO "코디·관리자는 담당자라 실명 봐야 식별됨". 공개 화면 노출 없음(staff API만).
- **E2E가 정답이지만 정적가드부터**: 빌드는 문법만 봐서 404·이중레이아웃·엉뚱한 링크를 못 잡음 → 기계가 클릭하게(E2E) + 소스에서 차단(정적가드).

**3. 안 끝났거나 보류:**
- **🚧 #311·#313·#315 프로덕션 미반영** — 2026-06-23 Vercel 무료 일일한도(100/일) 소진으로 프로덕션 빌드가 막힘. **현 프로덕션 = #309(`ab220aa`)**. 그래서 PO가 실서비스에서 "안 바뀌었다"고 함(맞음). → 5번 1번.
- **🚧 E2E 2개 잠자는 상태** — 로그인 필요라 GitHub Secrets 없으면 자동 skip(현재 미설정). 정적가드 2개(404·직원퍼널)는 secrets 없이 **즉시 활성**.
- **머지된 원격 브랜치 100개+** — 정리 스크립트를 PO에게 파일로 전달(로컬에서 `bash`로 실행). git 프록시가 원격 브랜치 삭제(403)를 막아 이 환경선 못 지움.
- 직전 보류분(재진 엔진 `rebooking_source` 유령컬럼 / `/patient/messages`·`/calendar` legacy 리스타일)은 그대로.

**4. 주의·함정:**
- ⚠️ **이 환경엔 `node_modules` 없음 → 로컬 풀빌드·E2E 실행 불가.** CI가 게이트. 검증은 `check:content`(돌아감)+CI+Vercel 프리뷰로.
- ⚠️ **`git reset --hard`로 추적파일 편집 날린 사고 2회** — 커밋 전 reset 금지. 최신 main 위로는 `git rebase --onto origin/main <BASE>`로(이번에 그렇게 함).
- ⚠️ **프리뷰를 프로덕션으로 승격**하면 프리뷰 env로 도는 점 유의(이 프로젝트는 env 공유라 대체로 무해).
- **role=guest 라벨**: 방 화면 `roleLabel`/채팅 폴백/`_roomCopy` 6언어에 `roleGuest`("참여자") 추가됨 — 새 역할 만질 때 6언어 패리티 가드(`check:content`) 주의.

**5. 다음 세션이 먼저 할 일 (우선순위):**
1. **⚠️ 직전 미검증분 먼저(프로덕션 반영 확인)**: Vercel 한도 풀렸으면 **#311·#313·#315가 프로덕션에 올라갔는지** 확인(`healwith.co.kr` 최신 커밋 = `1a3ca8f` 이상인지). 안 올라갔으면 최신 프리뷰를 **Promote to Production**. 그 뒤 PO에게 실클릭 검증 요청: ①환자 폰/375px → 하단바 1개 ②코디 '새 상담' → 참여 링크 1개·실명·이메일 자동.
2. **(PO 액션) GitHub Secrets 4개 등록** 안내·확인: `E2E_TEST_USER_EMAIL/PASSWORD`(patient@test.com/test1234)·`E2E_COORDINATOR_EMAIL/PASSWORD`(coordinator@test.com/test1234) → 그래야 E2E 클릭검사 활성.
3. (선택) 머지된 브랜치 100개 정리(PO가 로컬 스크립트 실행).
4. (선택) 재진 엔진 근본수정 / `/patient/messages`·`/calendar` legacy 리스타일.

**6. 검증 상태:**
- ✅ 머지된 9개 PR **전부 CI(빌드·스모크·`check:content`·마이그레이션 멱등성) 통과**(GitHub MCP 확인). 열린 PR 없음.
- ✅ `check:content`(가드 3종 포함)·`check:migrations` 이 환경서 직접 돌려 통과.
- ❌ **로컬 풀빌드·E2E 직접 실행 못 함**(node_modules 미설치) — CI가 검증.
- ❌ **#311·#313 prod 실클릭 미검증** — 프로덕션 미반영이라(한도) PO가 못 봄 → 5번 1번.
- ⚠️ E2E 2개는 CI에서 **skip**(secrets 미설정) — 아직 실제 클릭 안 함.

**7. 다음 세션 첫 프롬프트:**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프 읽어. 2026-06-23 코디 인박스 404·새상담 모달·환자 모바일 레이아웃·통합 초대링크를 다 고쳐 머지했는데 **#311·#313·#315가 Vercel 일일한도로 프로덕션에 아직 안 올라갔어**(현 prod=#309). ①한도 풀렸으면 프로덕션 반영됐는지 보고(healwith.co.kr 최신커밋 1a3ca8f 이상), 안 됐으면 최신 프리뷰 Promote to Production 안내해. 그담에 PO한테 환자 모바일 하단바 1개·코디 새상담 참여링크1개/실명/이메일자동 실클릭 확인 받자. ②E2E 자동검사 켜려면 GitHub Secrets 4개(patient·coordinator 계정/test1234) 넣어야 한다고 PO한테 알려.

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
