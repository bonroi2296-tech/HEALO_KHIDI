# 백오피스 전 계층 리뉴얼 로드맵 — 어드민 = 관제탑

> 작성 2026-07-24. PO 방향 확정(같은 날): **"기왕 하는 김에 모든 계층 백오피스 재설계부터"** → 방식 = **설계(청사진)는 전 계층 한 번에, 시공은 계층별·단계별**(한 번에 뚝딱 금지 — PO 본인 전제).
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
| ③ API만 공유, 화면 별도 | consultations·chat | 화면 drift 발생 지점 |

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

1. **어드민 = 관제탑**: 모든 계층 화면의 상위집합. 코디 전용 4종(견적·비자·알림·콘텐츠)도 어드민 메뉴에서 접근 가능하게(재사용 형태①).
2. **코디 = 실무 콕핏**: admin 화면 re-export(형태①)를 표준으로 — 화면 drift(형태③) 신규 금지.
3. **파트너 3계층(에이전시·클리닉·병원) = own 스코프 외부 뷰**: 테이블 공용 + API 게이트로만 분리(계층별 사본 테이블 금지 — 동기화 문제를 애초에 안 만듦).
4. **화면과 설명서(`src/lib/manuals`)는 같은 PR에서** (기존 고정 규칙 재확인).

## §3. 시공 단계 (각 단계 독립 PR·독립 배포)

- **1단계 ✅ (2026-07-24)** — 전 계층 청사진(이 문서 §1). 실측: 코드 지도 3종 + 실DB COUNT.
- **2단계 ⬜ 어드민 메뉴 대청소** — §1-3 생사표 기반: 죽은 화면 소프트 정리(코드 보존·메뉴 제거), 고아 라우트(`/admin/crawl/review`) 정리, `/admin/treatments` 처분 확인, 메뉴를 §2 구조로 재편. 🛑 "애매" 화면 처분만 PO 버튼.
- **3단계 ⬜ 계층 관제 허브** — 어드민 홈에 5계층 활동 카드(코디 처리·에이전시 의뢰·병원 리드 응답·환자 문의 채널별) + 변경 피드(`content_change_log`+감사로그 타임라인). 새 테이블 불필요.
- **4단계 ⬜ 권한 구멍 수리** — B(rate limit+감사로그, 저위험 즉시 가능) → A(referrals·leads staffOnly 전환, 코디 운영 전제) → D(partner_type 분기 헬퍼) → C(정책 = PO 확인 후).
- **5단계 ⬜ 파트너 계층 확장** — 에이전시·클리닉은 이미 실기능이므로 "소생"이 아니라 **확장 여부**(어떤 기능을 더 줄지 = 사업 판단 = PO). hospital 플래그 OFF 2화면(profile·treatments)도 켤지 여기서.

**순서 논리**: 청사진(완료) → 청소(지도가 이미 있음, 하루 안팎) → 관제 허브(PO 최대 페인 "팔로우 안 됨" 해결) → 권한 정합(허브 만들며 드러난 구멍 봉합) → 파트너 확장(PO 판단 필요라 마지막).

## KHIDI 연결 (8/27 중간평가)

3단계 관제 허브 = "ICT 기반 외국인환자 관리 체계 구축"(정성지표) 직접 증빙. 완성 시 `docs/KHIDI_중간보고_베이스.md` §4 월별 로그에 기록할 것.
