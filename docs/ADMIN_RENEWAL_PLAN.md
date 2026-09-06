# 백오피스 전 계층 리뉴얼 로드맵 — 어드민 = 통합 콘솔

> 📝 **용어(2026-07-24 PO 지시)**: 번역투 대신 IT 서비스 표준 용어 사용 — "관제탑/관제 허브" → **통합 대시보드**, "시공" → **구현**, 변경 피드 → **활동 피드**. 화면 시안(아티팩트)과 용어 통일.

> 📊 **설명·발표용 합본 자료(2026-07-25 신설)**: `docs/BACKOFFICE_HIERARCHY_REDESIGN.md` + 시각화 `docs/백오피스_계층재설계_시각화.html`.
> 이 문서(로드맵 SoR)의 결과를 "무엇을 왜 어떻게 바꿨나"로 풀어 쓴 파생 문서 — **단계 체크·날짜는 여기서만 관리하고**, 합본은 결과가 바뀔 때 따라 갱신.

> 작성 2026-07-24. PO 방향 확정(같은 날): **"기왕 하는 김에 모든 계층 백오피스 재설계부터"** → 방식 = **설계(청사진)는 전 계층 한 번에, 구현은 계층별·단계별**(한 번에 뚝딱 금지 — PO 본인 전제).
> **이 문서 = 리뉴얼 작업의 단일 SoR.** 단계 착수/완료 시 체크박스·날짜 갱신. §1 청사진은 2026-07-24 코드+실DB 실측.

---

## §1. 전 계층 청사진 — 현황 실측 (2026-07-24 완료 ✅)

### 1-1. 계층 구조와 인증 가드 (코드 실측)

| 계층 | 진입 | 화면 수 | 인증 가드 | role 저장소 |
|---|---|---|---|---|
| admin | `/admin` | 40+ | `requireAdminAuth` | `app_metadata.role=admin` |
| coordinator | `/coordinator` | 17 | `requirePortalAuth(staffOnly)` = admin+coordinator | `app_metadata.role=coordinator` |
| hospital(국내병원) | `/hospital` | 4 (2개 플래그 OFF) | `checkHospitalAuth` | `hospital_users` 테이블 |
| agency(해외 에이전시) | `/agency` | 1 (본체 = 공유 PartnerPortal 1,636줄) | `checkAgencyAuth` | `agency_users` + `agencies.partner_type='agency'` |
| clinic(해외 의료기관) | `/clinic` | 1 (동일 PartnerPortal) | `checkAgencyAuth` **동일** | `agencies.partner_type='medical_institution'` |

**중요 교정**: agency·clinic은 빈 껍데기가 아니라 **실기능**(케이스 추적·환자 의뢰 폼·코디 메신저·견적 열람·경과 업로드(clinic 전용)·자동번역). "정체"의 실체 = 개선이 코디·어드민에만 쏠렸을 뿐.

### 1-2. 코디 백오피스의 admin 재사용 3형태 (재설계 표준 후보)

| 형태 | 사례 | 평가 |
|---|---|---|
| ① admin 페이지 **직접 re-export** | cases·conversion·satisfaction | 유지보수 최소 — **표준으로 승격 권장** |
| ② 동일 컴포넌트 공유 | partners(`PartnerOutreachTracker`) | 양호 |
| ③ API만 공유, 화면 별도 | ~~consultations·chat~~ → **2026-09-07 둘 다 형태①로 전환(7단계)** | 화면 drift 발생 지점 — 실제로 드리프트했다(상담: 어드민에만 실통화·LiveKit·회의록·재진, 코디판 8/03 이후 방치 / 채팅: 어드민에만 검수 단추, 코디에만 6개 언어) |

코디에만 있고 admin에 대응 화면이 없는 것: **cost-estimates(견적)·visa(비자)·alerts(증상알림)·content(콘텐츠 편집)** 4종 → 어드민이 "코디가 뭘 하는지" 못 보는 구멍의 실체.

### 1-3. 실DB 생사표 (정확 COUNT, 2026-07-24)

| 판정 | 테이블(행 수) | 걸린 화면 |
|---|---|---|
| 🔴 데이터 0 = 죽은 후보 | `playbook_patterns`(0) `playbook_responses`(0) `crawl_jobs`(0) `crawl_raw_items`(0) `auto_job_events`(0) `visa_applications`(0) `followup_schedules`(0) `progress_records`(0) `reviews`(0) `treatment_sources`(0) `partner_branches`(0) `partner_doctors`(0) | `/admin/playbook`(+patterns·analytics·automation), `/admin/crawl/*`(review 포함), `/coordinator/visa`, `/admin/doctors`(partner_doctors) |
| ⚠️ 특이 | **`treatments`(0)** — 7/20 백업(`_backup_treatments_20260720`, 전부 is_published=false) 후 비워짐. 공개 `/treatments` 목록은 정적 암종(CANCERS 상수)이라 무영향, 앱 코드에서 getAllTreatments 호출처 없음 확인. 단 `/admin/treatments`·`/hospital/treatments`(플래그 OFF)는 빈 테이블 관리 화면 | `/admin/treatments` 처분 판단 필요 |
| 🟢 산 데이터 | `inquiries`(35) `chat_threads`(270)·`chat_messages`(932) `consultation_sessions`(39) `cotreatment_referrals`(4) `cost_estimates`(6) `agencies`(3)·`agency_users`(3) `hospital_users`(2) `hospitals`(9) `education_contents`(18) `content_overrides/​change_log`(1/1, 신규) | 핵심 여정 전부 |

레거시 도구 처분 안전성(코드 실측): import·enrichment·observability·playbook-analytics는 **화면만 제거해도 데이터·수집 무영향**(공유 테이블 read-only 또는 수동 트리거). playbook 3종·automation은 라이브 챗봇이 `playbook_patterns`를 소비하나 **행이 0** = 실사용 없음.

### 1-4. 계층×데이터 권한 매트릭스 (코드 실측, R읽기/W쓰기/own=본인 스코프)

| 도메인 | admin | coord | agency | clinic | hospital | patient |
|---|---|---|---|---|---|---|
| 문의 inquiries | RW | R+부분W | RW(own) | RW(own) | R(claim) | RW(own) |
| 케이스 cases | RW | RW | RW(own) | RW(own) | – | R |
| 원격협진 consultations | RW | RW | R(일정) | R(일정) | – | RW(own) |
| 협진의뢰 referrals | RW | **–** ⛳A | W(생성) | W(생성) | – | – |
| 콘텐츠 content_overrides | RW | RW ⛳B | – | – | – | – |
| 만족도 satisfaction | R | R | – | – | – | W(설문) |
| AI대화 chat | RW | 부분RW(혼재) | RW(own) | RW(own) | RW(own리드) | RW(own) |
| 리드 leads | RW | **–** ⛳A | – | – | RW(own) | – |

**구멍 4개(⛳ 실측, 파일 근거는 KNOWN_ISSUES 2026-07-24 항목):**
- **A. 코디 접근 불일치**: cases·conversion·satisfaction은 코디 허용으로 확대됐는데 같은 여정의 **referrals·leads는 여전히 admin 전용** — 도메인 경계 비일관(코디 운영 시작 시 즉시 걸림).
- **B. 콘텐츠 편집 API가 rate limit·감사로그 우회**: `coordinator/content`가 표준 가드 대신 커스텀 requireStaff — 허용 role은 맞으나 유일한 content_overrides 쓰기 경로가 리밋 없음.
- **C. 상담 초대토큰 발급 권한 확대**: 모든 스태프가 담당 아닌 상담방의 게스트 토큰 발급 가능(의도적 완화였으나 세션별 격리 없음 — 정책 재확인 필요).
- **D. agency↔clinic 가드 미분기**: partner_type 분기가 경과 업로드 1곳뿐 — 앞으로 "의료기관만" 데이터를 추가하면 조용히 둘 다 통과할 구조.
- 양호(실측): 공개 POST 전수 rate limit 있음, disabled 킬스위치 전 계층 정합.

---

## §2. 목표 구조 (재설계 원칙 — 전 계층 공통)

1. **어드민 = 통합 콘솔**: 모든 계층 화면의 상위집합. 코디 전용 4종(견적·비자·알림·콘텐츠)도 어드민 메뉴에서 접근 가능하게(재사용 형태①).
2. **코디 = 실무 화면**: admin 화면 재사용(형태①)을 표준으로 — 화면 drift(형태③) 신규 금지.
3. **파트너 3계층(에이전시·클리닉·병원) = own 스코프 외부 뷰**: 테이블 공용 + API 게이트로만 분리(계층별 사본 테이블 금지 — 동기화 문제를 애초에 안 만듦).
4. **화면과 설명서(`src/lib/manuals`)는 같은 PR에서** (기존 고정 규칙 재확인).

## §3. 구현 단계 (각 단계 독립 PR·독립 배포)

- **1단계 ✅ (2026-07-24)** — 전 계층 청사진(이 문서 §1). 실측: 코드 지도 3종 + 실DB COUNT.
- **2단계 ✅ (2026-07-24, PR #945 머지·배포 — PO 프리뷰 확인 후 지시)** — ①그룹 재편: 홈/상담·문의/파트너·회원/콘텐츠/AI 품질(접힘)/시스템 ②생사표 기반 비활성: 플레이북 4·크롤 3(고아 review 포함)·Import·보강·관측 = `AdminNav.jsx`에 `hidden:true`(🛑 삭제 아님 — PO 지시. 라우트·코드 보존, 플래그 한 줄 지우면 복구) ③옛 메뉴명 참조 정리(설명서·페이지 제목·E2E). ⏸ 애매 2화면은 **일단 메뉴 유지**: `/admin/treatments`(데이터 0행·7/20 비워짐)·`/admin/doctors`(partner_doctors 0행이나 화상 상담 의사 드롭다운이 참조) — 숨길지 PO 결정 대기.
- **3단계 ✅ (2026-07-24, PR #955 머지·배포 — PO 프리뷰 확인 후 지시)** — 어드민 홈(`/admin`) = 역할별 현황 카드 5개 + 최근 활동 피드. API = `/api/admin/dashboard/overview`(requireAdminAuth, PII 반환 금지 — 건수·상태·키만). 피드 소스 = content_change_log·inquiries·consultation_sessions·cotreatment_referrals·hospital_leads(감사로그 대신 도메인 테이블 직접 — 라벨이 사람 말이 됨). 새 테이블 없음.
- **4단계 ✅ (2026-07-24, PR #962 머지 — 독립 보안 리뷰 CONFIRMED 0)** — A(referrals·leads staffOnly 통일)·B(콘텐츠 API 표준 가드+rate limit)·D(requirePartnerType 게이트 헬퍼) 수리. **C는 "조이기" 미채택이 결론**: 담당자 검증은 과거에 걸었다가 실무(담당 미지정 상담)에서 코디가 자기 상담 링크도 못 뽑는 실버그로 의도적으로 푼 것(코드 주석) — 재조이면 재발. 대신 5단계에서 **발급 감사로그(CREATE_CONSULTATION_INVITE)로 추적성 보완**.
- **5단계 ✅ (2026-07-24, PR #966 머지·배포 — PO 지시 강제 머지)** — ①**어드민 = 통합 콘솔 완성**: 코디 전용 4화면(견적·비자·증상 알림·문구 편집기)을 어드민 메뉴에 연결(화면 신설 아님 — StaffPortalGate가 admin 통과, 링크만) ②C 추적성: 초대 토큰 발급 감사로그(CREATE_CONSULTATION_INVITE, 독립 리뷰 CONFIRMED 1건=whitelist 미등록 드롭 수리) ③파트너 설명서는 **실측 결과 현행과 일치**(클리닉 경과 업로드 포함)라 번역 5개어를 흔드는 재작성 회피 — 어드민 설명서만 갱신. ⚠️강제 머지 이유: 스모크 실패=공유 Supabase 포화 인프라(POSTMORTEMS #116)라 코드 무관·코드검증 통과. ⏸ 파트너 포털 신규 기능(에이전시·클리닉·병원에 뭘 더 줄지)·hospital 플래그 ON은 PO가 특정하면 그때.

---

## ✅ 로드맵 완료 (2026-07-24) — 1~5단계 전부 배포

전 계층 청사진 → 어드민 메뉴 정리 → 통합 대시보드 → 권한 정비 → 통합 콘솔 완성까지 한 사이클 종료.
**남은 후속**: ⓐ 4단계 C(초대토큰 담당자 검증 재조이기 — 미채택, 감사로그로 대체) ⓑ 5단계 파트너 포털 **신규 기능**(PO 판단 대기) ~~ⓒ 애매 2화면(/admin/treatments·/admin/doctors) 숨김 여부~~ → **6단계에서 둘 다 보관함으로 종결(2026-08-25)** ⓓ B 인증실패 audit(requirePortalAuth 공통 공백).

**순서 논리**: 청사진(완료) → 청소(지도가 이미 있음, 하루 안팎) → 통합 대시보드(PO 최대 페인 "팔로우 안 됨" 해결) → 권한 정합(허브 만들며 드러난 구멍 봉합) → 파트너 확장(PO 판단 필요라 마지막).

---

## §4. 6단계 — 재측정 청소 (2026-08-25, PO 지시 «어드민에서 모든 걸 컨트롤 + 피벗 전 잔재 정리»)

### 4-1. 한 달 만에 뒤집힌 판정 3건 — 이 단계가 생긴 이유

7/24 §1-3 생사표를 **정확 COUNT 로 다시 쟀다**(2026-08-25). 판정이 뒤집힌 것:

| 항목 | 7/24 | 8/25 | 뜻 |
|---|---|---|---|
| `auto_jobs` | (판정 안 함) | **184건 · 마지막 8/24** | `/admin/automation/playbook` 을 **잘못 숨겼다.** 2단계에서 이 화면을 `playbook_patterns`(0행) 기준으로 판정했는데, 실제로 이 화면이 읽는 표는 `auto_jobs` 다 |
| `visa_applications` | 0 | 1 | 비자 화면이 살아남 |
| `followup_schedules` | 0 | 3 | 후속일정 살아남 |
| `progress_records` | 0 | 2 | 경과기록 살아남 |

**교훈**: 「죽었다」 판정에는 유통기한이 있고, **화면을 어느 표로 판정하는지가 판정 자체보다 중요하다.**
→ `scripts/check-dead-screens.mjs` 신설(`npm run check:dead-screens`). 화면↔표 지도를 코드에 두고 매달 실DB 와 대조한다.
지도에 없는 어드민 화면이 생기면 **selftest 가 exit 1** 로 막는다(지도가 낡으면 검사가 조용히 헛돌기 때문).

### 4-2. 어드민이 «컨트롤 못 하던» 것 4건

| 못 하던 것 | 실태 | 조치 |
|---|---|---|
| 환자 1명 통으로 보기 | 어드민 「문의 관리」 상세 = **상태 변경 + 번역뿐**(19KB). 같은 문의를 코디 받은함은 의뢰서·소견·공유문서·후속일정까지 보여준다(84KB) | 메뉴 「문의 · 케이스 받은함」 → `/coordinator/inbox`. **화면 신설 아님** — StaffPortalGate 가 admin 을 통과시키므로 원래 들어갈 수 있었고 메뉴에만 없었다(재사용 형태①). 옛 화면은 하위 항목 「문의 원본(시험 포함)」으로 보존 — 거기에만 있는 기능이 `includeTest`(코디 받은함은 `is_test` 를 항상 숨긴다, 2026-08-14 PO 결정) |
| 환자↔코디 메신저 | 코디엔 있는데 어드민 메뉴에 없음. 5단계에서 4개만 연결하고 빠졌다 | 「환자 대화」 → `/coordinator/messages` |
| 매일 도는 AI 자동개선 | `auto_jobs` 184건·어제도 돌았는데 화면이 보관함에 있었다(위 4-1) | 「자동개선 현황」으로 AI 품질 그룹 복귀 |
| 환자 교육자료 18건 | `education_contents` 가 환자 화면·사후관리 발송에 나가는데 **편집 화면이 어드민·코디 어디에도 없었다**(마지막 수정 2026-04-17 = 피벗 전) | **신설** `/admin/education` + `app/api/admin/education/route.ts`(requireAdminAuth·감사로그). 선택지는 기존 SoR 재사용(`intakeLabels.CANCER_TYPES`·`educationEngine.CATEGORY_LABELS`/`PHASE_LABELS`) — 목록을 베끼면 환자 화면과 어긋난다. DELETE 는 일부러 안 만듦(되돌리기 어려운 동작 — 내리는 건 `is_published=false`) |

### 4-3. 보관함으로 내린 것 3건 + 이름 교정 1건

전부 **메뉴에서만 숨김**(코드·주소 보존, `hidden` 한 줄 지우면 복구). 근거는 정확 COUNT.

- `/admin/treatments` — `treatments` 0 · `treatment_sources` 0. 7/20 에 비워졌고 공개 `/treatments` 는 코드 상수를 쓴다(이 표를 안 본다). ⓒ 후속 항목 종결.
- `/admin/doctors` — `partner_doctors` 0 · `partner_branches` 0. 의사 계층은 #334 에서 폐지. **화상상담 만들기 화면에 의사 선택 칸은 이미 없다**(2026-08-25 확인) — 남은 참조는 목록의 읽기 join 뿐이라 null 이면 아무것도 안 그린다. ⓒ 후속 항목 종결.
- `/admin/khidi/ai-feedback` — `chat_feedback` 0. 환자 👍👎 가 한 번도 안 눌렸다. AI 품질 평가(`ai_response_evaluations` 481건)가 실질 대체.
- `/admin/leads` — **이름이 사실과 달랐다.** 「사전상담 리드」가 아니라 `hospital_leads` = 제휴 병원에 넘긴 진료 의뢰(병원 포털 `/hospital/leads` 가 보는 그 표). 「병원 진료의뢰」로 고치고 «파트너·회원» 그룹으로 이동.

**예외 기록**: `/admin/playbook-analytics` 는 `playbook_usage_events` 60건이 있지만 숨긴 채로 둔다 — 60건 전부 `used=false·retrieved_count=0`(응대 패턴 0건이라 맞출 게 없음)이고, 그중 사람 상담 요청은 `/admin/chat` 의 「검토요청」 딱지로 이미 보인다. 이 예외는 검사기의 `KEEP_HIDDEN` 에 이유와 함께 박아 뒀다(매달 같은 줄이 떠서 리포트를 안 보게 되는 걸 막는다).

### 4-4. 재발 방지 규칙 3줄

1. **어드민에만 있는 «따로 만든» 화면을 새로 만들지 않는다.** 코디·병원 화면을 연결한다(재사용 형태① — 「문의 관리」가 어긋났던 이유가 형태③).
2. **메뉴 노출은 «최근에 쓰였나»로 정한다.** 완성도는 기준이 아니다.
3. **그 판정은 `npm run check:dead-screens` 가 매달 다시 잰다.** 사람 기억에 두지 않는다.

**결과**: 보이는 화면 36 → **35**, 보관함 10 → **12**, 신설 1(`/admin/education`), 검사기 1.

## §5. 7단계 — 형태③ 잔여 청산 + 껍데기 통일 (2026-09-07, PO 「옛날 것과 리뉴얼한 것이 섞여 있고 코디 백오피스랑 다르다」)

### 5-1. 왜 생겼나 (실측)
- 최근 3주(8/15~) 화면 수정: 코디 21회 vs 어드민 15회. 기능다운 기능(종료 단추·환자 새 글 배지·음성 판독·사후관리 보드)은 코디 화면에 붙었고, 어드민은 메뉴의 «코디 화면으로 건너가는 문» 9개로 빌려 썼다 — 문을 지나면 사이드바가 코디용으로 바뀌고 「관리자로」 링크로 돌아왔다.
- 반대 방향도 있었다: 9/06 「실통화 N분」은 어드민 상담 화면에만(8/03 「실적 안내가 코디 화면에만」과 같은 유형의 재발).
- §1-2 형태③ 두 쌍이 그대로였다: 상담(어드민 1,069줄 / 코디 452줄) · 채팅(660 / 488).
- 다국어: 코디 화면 20개 중 6개만 공유 사전 사용, 14개 한국어 고정(어드민은 방침대로 0).

### 5-2. 한 것
| # | 무엇 | 어떻게 |
|---|---|---|
| A | **껍데기 통일** | `app/coordinator/layout.jsx`: 문지기 context 가 `isAdmin` 이면 코디 사이드바 대신 `AdminNav` 를 그린다. 화면은 그대로, 껍데기만. 어드민 문지기(`app/admin/layout.jsx`)도 context `{isAdmin:true}` 를 넘긴다 |
| B1 | **AI 채팅 한 벌** | 코디 화면에 검수·정정 단추를 넣되 `usePortalContext().isAdmin` 일 때만 보인다(API 는 원래 `requireAdminAuth`). 어드민 `/admin/chat` 은 재수출. 사전 키 9개 × 6개 언어 추가 |
| B2 | **화상 상담 한 벌** | 어드민 화면이 상위집합이고 이미 6개 언어(TR + coordinatorL)라 코디 `/coordinator/consultations` 를 어드민 재수출로. 덤으로 `?inquiry=` 딥링크를 읽어 그 문의가 미리 골라진 「새 상담」 모달을 연다(사후관리 보드 [상담 잡기]가 실제로 이어짐) |
| C | 어드민 메뉴 | 「음성 정리」(코디에만 있던 9/04 신설 화면) 연결 |
| D | 검사기 | `scripts/check-deeplinks.mjs` 가 재수출 화면을 따라가게(형태①이 표준인데 검사기가 «안 읽는다»고 오판) |

**검증:** admin·coordinator 시험 계정으로 9개 주소 실측(관리자가 코디 화면 5곳을 열어도 어드민 사이드바 유지, 코디는 검수 단추 안 보임, `/coordinator/consultations?inquiry=37` → #37 골라진 모달). typecheck·eslint·check:i18n·check:deeplinks 통과.

### 5-3. 남은 것 (이 단계에서 «안» 한 것)
- **코디 14개 화면 다국어** — 화면당 문자열 20~80개 × 6개 언어, 2~3일. 카자흐인 코디 채용(넬리) 확정 뒤에.
- **어드민 스타일 잔재** — inline style 9개 화면, 옛 카드(rounded-md shadow) 4개, 제목 크기 3종·너비 6종 혼재. 눈에 띄는 효과가 작아 뒤로.
- 메뉴 라벨의 「옛 고아 화면」「디렉토리 시절」「폐지된 계층」 3개는 6단계 결정(보관함, 삭제 금지) 그대로.

### 5-4. 재발 방지 규칙
- **새 기능은 코디 화면에만 붙여라. 어드민은 재수출(형태①)이나 메뉴 링크로 연다.** 어드민 전용 화면을 새로 만들지 마라 — 「PO 가 쓰는 쪽에 안 붙어 있었다」(8/03)·「코디가 못 본다」(9/06)가 같은 병의 두 증상이다.
- 관리자만 눌러야 하는 단추는 화면을 나누지 말고 `usePortalContext().isAdmin` 으로 가려라. 권한은 API 가 지킨다.

---

## KHIDI 연결 (8/27 중간평가)

3단계 통합 대시보드 = "ICT 기반 외국인환자 관리 체계 구축"(정성지표) 직접 증빙. 완성 시 `docs/KHIDI_중간보고_베이스.md` §4 월별 로그에 기록할 것.
