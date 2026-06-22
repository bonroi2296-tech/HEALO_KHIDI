# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

---

## 🔖 세션 핸드오프 (2026-06-22 오전 — 도메인 컷오버 + 검색등록 3사) — healwith.co.kr 정식 가동

**이번 세션 한 일:**
- **도메인 컷오버 완료**: PO가 가비아(Gabia)에서 `healwith.co.kr` 정식 구매(만기 2027-06-18) → 실서비스 가동.
  - 가비아 DNS: A `@`→`216.198.79.1`, CNAME `www`→`cname.vercel-dns.com`, TXT 2개(구글·얀덱스 인증). 네임서버는 가비아 유지(`ns.gabia.co.kr`).
  - Vercel 프로젝트 `healo-khidi`에 도메인 추가 + SSL 발급 + Production 연결. `healwith.co.kr/sitemap.xml`이 새 주소로 출력 확인.
  - 코드 `khidi.healo.kr`→`healwith.co.kr` 일괄 치환 **PR [#226](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/226) 머지·배포**(canonical·sitemap·OG·JSON-LD·env 폴백 15파일). 번역 API 호스트 허용목록의 옛 도메인은 의도적 유지(healwith 이미 추가).
- **검색등록 3사 완료**:
  - **구글 서치콘솔**: 도메인 속성 소유권 인증(DNS TXT) + sitemap.xml(43페이지) "성공".
  - **얀덱스 웹마스터**: 소유권 인증(DNS TXT) + sitemap 제출.
  - **네이버 서치어드바이저**: 소유확인(메타태그) + sitemap 제출. 메타태그는 **PR [#229](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/229) 머지·배포**(`app/layout.jsx` baseMetadata.verification — naver-site-verification 추가 + 기존 yandex 플레이스홀더 실값 정리).

**왜 그렇게 했는지:**
- 검색등록은 **사이트가 라이브여야** 의미 있어 도메인 머지·배포를 먼저 끝낸 뒤 진행.
- 구글·얀덱스는 DNS TXT 인증(사이트 배포와 무관·즉시), 네이버는 DNS 방식이 없어 메타태그 방식 → 코드 머지+배포 후 소유확인.
- env `NEXT_PUBLIC_SITE_URL`은 Vercel에 **미설정** 확인 → 코드 폴백을 healwith로 바꿔 미설정이어도 정상.

**안 끝났거나 보류:**
- **Performance(라이트하우스) 39점(모바일)** — 이번 세션 미착수. SEO 100·접근성 100·Best Practices 92는 양호. 주범 후보: **히어로 배경 이미지(LCP)·폰트·JS 번들**. 타겟이 회선 느린 CIS(러·카자흐)라 체감·Core Web Vitals(SEO 랭킹요소) 영향.
- **검색 노출 자체는 대기**: 등록=색인 후보 진입일 뿐, 실제 노출은 각 엔진 색인에 며칠~2주. 브랜드명("healwith")은 곧, 일반 경쟁키워드("korea medical" 등)는 장기 SEO/마케팅 과제(등록만으론 안 됨 — PO에게 설명함).
- (선택) Vercel 비밀키 "Needs Attention" = 비밀키가 평문 저장이라 Sensitive 표시 권장(보안, 동작 무관).

**주의·함정:**
- **자동저장 훅(`.claude/hooks/auto-commit-push.sh`)이 작업 중 PO 미커밋 변경분을 feature 브랜치에 얹어 첫 배포가 ERROR**났음(turn 종료마다 `git add -u` 커밋·푸시). → 깨끗한 커밋만 분리해 재작업(PR #226). **PO의 옛 로컬 WIP(세션시작 시 56개 수정파일)는 `po-wip-backup-20260622` 브랜치에 백업**(복원 필요시 PO가 요청). 상당수는 CRLF 줄바꿈 노이즈로 보였음.
- **`npm run handoff:rotate` 스크립트 버그**: 오래된 블록을 archive로 옮길 때 **헤더만 이동하고 본문은 PROJECT_CONTEXT에 남겨 고아 블록**을 만듦(이번에 수동 제거함). 다음에 rotate 쓰기 전 스크립트 점검 필요.
- 미추적 파일 `docs/CODEX_CERTAIN_FIX_MEMO.md`·`logo/`는 커밋 안 함(잡파일·로고 후보).
- 첫 PR(#225)은 옛 stale main에서 갈라져 충돌 → 닫고 최신 main 기준 #226으로 재작성.

**다음 세션이 먼저 할 일 (우선순위):**
1. **⭐ Performance 최적화** (PO 지시): 라이트하우스 모바일 39 → **70~80+ 목표**. 진단부터: 히어로 이미지 크기·포맷(WebP/AVIF·next/image 우선순위)·폰트 로딩·JS 번들·Vercel 콜드스타트. 한 번 더 측정해 콜드스타트 변수 제거하고 시작.
2. (직전 세션 잔여, 별개) #160 화상방 폰 2대 카메라 라이브 확인·PR #216 등 KPI 작업 — 아래 「새벽」·「2026-06-21」 핸드오프 블록 참조.
3. KHIDI 중간평가(2026-08-27) 상시.

**검증 상태:**
- **도메인 컷오버 = 실검증 완료**: `healwith.co.kr/sitemap.xml` 새 주소 출력(HTTP 200·application/xml) curl 확인, robots.txt 크롤 허용 확인, 네이버 메타태그 실제 페이지 `<head>` 렌더 curl 확인.
- **PR #226·#229 = CI(ci·smoke·Vercel) 전부 초록 + main squash 머지 + production 배포 완료.** `check:content` 통과, structuredData 테스트 통과.
- 검색등록 3사 소유권 인증·sitemap 제출 = **콘솔 화면에서 "성공/Owner/등록" 직접 확인**(구글 sitemap 43페이지 "성공", 얀덱스 Owner, 네이버 등록). 단 **실제 검색 노출은 색인 대기(미확인·구조상 며칠~2주 걸림)**.
- 열린 PR: 직전 세션 #216·#217·#219 상태는 이 세션에서 미확인(도메인 작업만 함).

**다음 세션 첫 프롬프트:**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프 읽어. 그담 우리 사이트(healwith.co.kr) 라이트하우스 모바일 퍼포먼스가 39점으로 너무 낮아 — 70~80점 이상으로 끌어올려줘. 히어로 이미지·폰트·JS 번들 같은 거 진단하고 싹 최적화해서 배포까지. (SEO·접근성은 이미 만점이니 퍼포먼스만)

---

## 🔖 세션 핸드오프 (2026-06-22 새벽 — 야간 자율 감사 세션) — 5축 병렬 감사 + PR 5개(#215~219) + ⚠️평가 현실 발견(real KPI≈0)

**이번 세션 한 일:**
- **5축 병렬 심층 감사**(KPI / 보안 / 문의퍼널 / 역할연결 / 화상방) → 진짜 버그 다수 발견·수정. **draft PR 5개**(전부 PO 검토 전 배포 금지):
  - **PR #216 — KHIDI 평가지표(KPI) 정확성 4종**: ①만족도(K-03) 설문 발송 윈도우 누수(6시간 슬라이스 vs 하루 1회 cron → 대부분 미발송) → 14일 backfill ②월간보고 환자명단이 없는 테이블(`khidi_intakes`) 조인으로 항상 빈칸 → inquiries 기반 교체 ③KPI 집계오류가 대시보드·월간보고에서 0으로 조용히 → canary 발사 ④코디 case_status→treatment/완료 시 유치(K-01) 누락(POSTMORTEM #17 잔여위험) → 자동집계(EDGE-2). 테스트 9개 추가, POSTMORTEMS #19.
  - **PR #217 — PII·i18n·문서**: AI상담(게스트) 리드 이름·이메일·전화가 코디 인박스에 **암호문 그대로**(연락 불가=리드 유실, #13 부류) → `admin/chat/threads` GET 복호화 / 화상방 탭 'Chat·Translation' 6언어화 + `_roomCopy.js` 패리티 가드 / **고치지 않은 9건을 이유와 함께 `KNOWN_ISSUES.md`에 정밀 기록**.
  - **PR #218 — 평가준비 문서**: `KHIDI_중간보고_베이스.md`에 현재 자가진단·리스크 순위(아래 발견 반영)·시스템 규모 실측(135,325 LOC·157 API·108페이지)·6월 로그·**PT 20분 발표 스켈레톤** 추가.
  - **PR #219 — '반쪽' 패턴 3곳 실제 수정(EDGE-3/4/5)**: 공용 헬퍼 `src/lib/khidi/advanceCaseStatus.ts`로 ①상담 완료→case_status 전진+이력 ②점수판 유치 확정/이탈→case_status_history ③admin 배정→case_status 전진(coordinator와 대칭). PO가 세 번 지적한 #18 부류를 안전 3곳 닫음.
  - **PR #215 — 화상방 카메라 자동검증 스크립트**(#160). CI **초록 확인**.
- **⚠️ 평가 현실 발견(실DB)**: 대시보드의 유치 4·사전상담 9·사후관리 3이 **거의 전부 데모 시드(`khidi_demo_20260615`)**. 데모 제외 **진짜(real) = 유치 0 / 사전상담 1 / 사후관리 0 / 만족도 0**. 진짜 문의 5건뿐(최근 30일 2건), 챗 스레드 176개(실/테스트 섞임).
- **prod 스모크 체크 = 그린**: 공개 페이지 전부 200, 타깃 ru·kz 실번역 콘텐츠(폴백 아님), 암종 SEO 제목 정상, health·DB up.
- **보안 감사 = 고신뢰 취약점 0**(인증·암호화·게스트토큰 견고).

**왜 그렇게 했는지:**
- PO가 "밤새 토큰 다 써서 뭐든 해라(피버모드), 코드 아니어도" + "조기 종료 금지"를 반복 지시 → **안전·고가치 수정 위주로 5개 PR**, 구조적/런타임검증 필요 건은 무리한 야간 수정 대신 **정밀 문서화**(품질 우선).
- 코드 외 가치 = KHIDI 평가(잔금 30% 직결) 준비 문서를 실측·전략으로 진전(PR #218).
- 여러 브랜치로 쪼갠 이유: 평가지표/PII/문서/케이스연결이 **별개 concern**이라 PO가 골라 머지하게(한 PR에 grab-bag 방지).

**안 끝났거나 보류:**
- **PR 5개 전부 draft = 미배포.** 특히 **#216 배포 안 하면 만족도(K-03) 설문이 계속 0** → 평가일 빈칸.
- **KNOWN_ISSUES에 문서화만 한 미수정 건**: ①🔴화상방 iOS Safari 환자 마이크가 서버 STT 2차 getUserMedia에 가로채일 수 있음(실 아이폰 검증 필요) ②EDGE-1 환자 포털이 case_status를 못 봄(구조적, 설계 결정) ③step2의 `cancer_patient_intakes` upsert가 UNIQUE 제약 부재로 항상 무음 실패+평문(고치면 제품 동작 바뀜) ④인메모리 레이트리밋 ⑤게스트 targetLang 하드코딩.
- **PO 영역(내가 못 함)**: 실환자 운영·유입, 데모 시드 정리, 사업비 집행.

**주의·함정:**
- **데모 시드가 KPI를 부풀린다**: 보고 전 `scripts/cleanup_test_seed_20260615.sql` 실행하면 대시보드 유치 4→0. "유치 4 깨끗"(옛 핸드오프)은 **사실 전부 데모**였음.
- **Vercel 무료 빌드한도(100/day) 소진**(내 야간 푸시) → **한도 리셋 전엔 prod 배포가 막힐 수 있음**. GitHub CI(`ci`·`Smoke`)는 별개로 정상.
- **POSTMORTEMS.md·KNOWN_ISSUES.md가 브랜치마다 분산**(#216에 #19, #217에 KNOWN_ISSUES 9건, #219는 PR본문만) → 여러 PR 머지 시 **이 문서들 append 충돌 가능**. 머지 순서 주의(충돌 나면 양쪽 다 살리기).
- #218 평가 doc의 자가진단은 **real≈0으로 정정 완료**(데모 분리 반영). #216 본문의 "유치 4/12 🟢"는 데모 포함 옛 표기라 무시.

**다음 세션이 먼저 할 일 (우선순위):**
1. **⚠️ 직전 미검증분 먼저:** (a) **#160 화상방 폰 2대 카메라 라이브 확인**(PO 동석, 초대링크 만료 2026-06-24 — 만료면 재발급). 대기실 함정: 의사 먼저 입장→환자 입장→의사화면 [승인]. (b) **PR 5개 CI 초록 확인**(#215만 확인됨, #216·#217·#219 미확인).
2. **🔴 PR #216 리뷰→머지→배포** = 만족도(K-03) 설문 살리기(평가 최우선). 그 후 **데모 시드 정리 → 진짜 KPI 숫자로 대시보드 확인**.
3. PR #217·#219 리뷰·머지(PII 연락가능·타임라인 가시성). #218 평가 doc 확인.
4. (PO 본질 과제) 8월까지 실환자 운영으로 정량지표 real 0 → 끌어올리기. KHIDI 중간평가(2026-08-27) 상시.

**검증 상태:**
- 로컬(각 브랜치): **tsc 0 / vitest 통과(#216은 291, 그 외 282) / check:content 통과 / next build --webpack 통과** — 전부 확인함.
- CI(자동검사): **#215 `ci`·`Smoke` 초록 확인**. **#216·#217·#218·#219 CI는 미확인**(푸시 후 진행 중이었고 실패 웹훅 안 옴 — 로컬 통과라 초록 예상하나 직접 확인 안 함). Vercel 프리뷰는 빌드한도로 일부 실패(코드 무관).
- prod 스모크: 공개 페이지·ru·kz·health 그린(실호출 확인). **데모 분리 실DB 확인**(real KPI≈0).
- **런타임 미검증**: EDGE-3/4/5 케이스단계 전파는 코드·빌드만 통과, **실제 상담완료·배정·확정 클릭으로 타임라인 반영은 미확인**(코디/에이전시 계정 실동작 필요). 화상방 카메라 라이브·iOS 마이크도 미검증.

**다음 세션 첫 프롬프트:**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프(2026-06-22 새벽) 읽어. 어젯밤 자율로 5축 감사해서 PR 5개(#215~219) 만들었고 전부 draft(미배포)야. ⚠️핵심: 대시보드 유치 4건은 전부 데모였고 진짜 KPI는 0이야. 1) PR 5개 CI 초록인지 확인하고(특히 #216·#217·#219), 2) #216(만족도 설문 살리기)부터 리뷰해서 머지·배포하자 — 그래야 평가 만족도가 0을 벗어나. 3) 그담 화상방 카메라 폰 2대 라이브 테스트 같이 하고(대기실에서 의사가 승인해야 영상 뜸), 4) 데모 시드 정리하고 진짜 숫자로 대시보드 보자. EDGE-3/4/5(케이스단계 타임라인)는 코드만 됐고 실클릭 검증은 안 했어.

---


**이번 세션 한 일:**
- **#209 (✅머지·prod배포·실검증): 병원 '치료 확정' → 유치 자동집계 '되돌리기 가능'.** 옆 세션이 만든 **PR #208**(같은 자동집계지만 **되돌리기 UI가 빠진 옛 버전** + 생애주기 지도 문서)을 닫고, 그 안의 **생애주기 지도 문서는 살려서** 되돌리기 버전(`8a24df1`)과 **합쳐** 지정 작업본에 정리. 방식: 지정 브랜치를 #208 clean base(`j1d0se`)에 ff-merge → `8a24df1`의 되돌리기 3파일(`conversion/page.jsx`·`conversion-funnel/route.ts`·`partner/leads/[id]/route.ts`)만 overlay → 1커밋. 자동검사(CI) `ci`·`Smoke` 초록 → squash 머지(`fa8a6c7`).
  - **점수판(`/admin/khidi/conversion`)에 '유치 확정됨(되돌리기)' 섹션 신설** — 자동집계분엔 **'자동' 배지**, '유치 취소'(→null)/'이탈' 버튼. 화면은 **실제 JSX 로컬 렌더 스크린샷으로 PO 확인**받고 진행("이대로 진행").
  - 핵심 로직: 병원 `converted` 시 `inquiries.outcome='admitted'` 자동 기록하되 **`outcome IS NULL`일 때만**(`.is`) — 코디가 이미 정한 결정(admitted/lost/취소)은 안 덮음. 자동분 `outcome_updated_by=null`로 '자동' 배지 구분.
- **실서비스(prod) 배포:** 머지 후 Vercel이 prod 자동배포를 **또 안 띄워서**(#202 때와 동일) **PO 승인("지금 띄워줘") 받고 main에 빈 커밋(`5695146`) 푸시** → prod alias가 `010c398`(#209 포함)로 promote. `healo-khidi.vercel.app` 새 점수판 라이브.
- **prod 실검증 (병원 계정 `hospital@test.com` 실 API + DB 추적):** ① 병원 `converted` → 데모 #13 `outcome='admitted'`(`updated_by=null`=자동) **유치 +1** ✅ ② **유치 취소** → `outcome=null` ✅(취소 PATCH는 admin 전용 API라 admin 테스트계정 없음 → **DB로 동일효과 재현 확인**) ③ **가드**: 코디가 `lost`(이탈) 정한 뒤 병원이 다시 `converted` 해도 **자동집계가 안 덮어씀**(`lost` 유지) ✅. **데모 #13은 원상복구**(outcome null / lead `replied`) — 평가 점수판 오집계 방지.
- **#160 카메라 테스트 준비:** 전용 데모방 `consultation_sessions` id=`5b71a48d-c8a7-44ab-a407-689b5ee360e8`(`livekit_room_name` 세팅) + **카메라 송출 초대링크 2개**(patient/doctor, 72h, 10회 재입장) 발급. **prod guest-join으로 LiveKit 입장토큰 발급 실확인**. PO 폰 2대 라이브 테스트만 남음.
- **작업 #3 (생애주기 지도 문서) 완료:** `docs/CASE_LIFECYCLE_MAP.md`가 #209에 함께 main 반영.

**왜 그렇게 했는지:**
- PO가 원한 건 '되돌리기 가능' 버전(`8a24df1`) — 무조건 자동인 #207/#208은 PO가 닫음. 자동집계는 KPI 누락(에이전시→병원 경로) 차단, 되돌리기는 데모/오집계 방어.
- prod 자동배포 누락은 무료플랜 특성 → 빈 커밋 트리거(지난 #202와 동일 수법, PO 승인).
- admin 점수판 API는 admin 전용인데 **admin 테스트계정을 의도적으로 안 만듦**(test1234 admin=PII 복호화 위험) → '유치 취소'는 DB로 동일효과 검증(정직 표기).

**안 끝났거나 보류:**
- **#160 라이브 2명+ 카메라 동시 송출** — 코드·초대링크·LiveKit 토큰 다 준비됐고 **PO 폰 2대 실테스트만** 남음(자동/원격 불가). 초대링크 만료 2026-06-24.
- (참고) main 빈 커밋 `5695146`이 prod 빌드 하나 더 돌 수 있음 — `010c398`과 동일 코드라 무해.

**주의·함정:**
- **admin 점수판 API**(`/api/admin/khidi/conversion-funnel` GET/PATCH)는 `requireAdminAuth`=`app_metadata.role==='admin'` 또는 `ADMIN_EMAIL_ALLOWLIST`만 통과. **coordinator@test.com 안 통함, admin 테스트계정 없음** → prod에서 점수판 API 직접 검증하려면 PO 실 admin 계정 필요.
- 자동 outcome은 **`outcome IS NULL`일 때만** 기록(`.is`). 자동분 `outcome_updated_by=null`(='자동' 배지), 코디 수동분은 그의 user_id.
- 병원 lead PATCH 자동집계는 `hospital_leads.normalized_inquiry_id`→`normalized_inquiries.source_inquiry_id` 연결이 있어야 동작(없으면 무음 스킵).
- **데모 #13**(TEST 병원 lead `4f22e5b2…`, "유방암 (데모)")로 또 테스트하면 outcome이 다시 채워짐 → **끝나면 `outcome=null`·lead `replied`로 복구**(평가 점수판 오집계 방지).
- 화상 데모방 초대링크 토큰 평문은 **발급 시 1회만** 노출(분실 시 재발급). 세션은 `livekit_room_name` 없으면 guest-join이 `consultation_has_no_room`(409).

**다음 세션이 먼저 할 일 (우선순위):**
1. **⚠️ 직전 미검증분 먼저:** **#160 화상방에 폰 2대로 2명 입장 → 서로 카메라 보이는지 라이브 확인**(PO 동석). 아래 두 초대링크(만료 2026-06-24). 카메라 안 보이면 보고.
2. (선택) 점수판 '유치 확정됨(되돌리기)' 섹션을 **PO 실 admin 로그인으로 prod에서 눈으로** 한 번 확인('자동' 배지·버튼 동작).
3. KHIDI 중간평가(2026-08-27) 상시 — 유치전환 대시보드·만족도(K-03) 직결.

**검증 상태:**
- 로컬: tsc 0(tsconfig `baseUrl` deprecation 경고만, 내 코드 0) / vitest khidi **59 통과** / `check:content` 통과 / `next build --webpack` 통과.
- CI: **PR #209 `ci`·`Smoke` 초록 확인 후 squash 머지**(`fa8a6c7`). 열린 PR: **#197**(STT, DRAFT) — 무관. **#208 닫음**(이 PR로 대체).
- prod 실검증: 병원 `converted`→**유치 +1 ✅**(실 API+DB), **가드(lost 보존) ✅**(실 API+DB), **유치 취소→null ✅**(DB 동일효과 — admin API 직접호출은 admin 토큰 없어 **미실행**). **데모 #13 원상복구 확인 ✅.**
- prod alias=`010c398`(#209 포함) **READY**. **#160 초대링크: guest-join LiveKit 토큰 발급 ✅, 라이브 2명 카메라 렌더 ❌미검증(PO 폰 테스트 필요).**

**#160 카메라 테스트 초대링크 (만료 2026-06-24, 폰 2대로 각각 열기):**
- A(환자): `https://healo-khidi.vercel.app/consultation/5b71a48d-c8a7-44ab-a407-689b5ee360e8?invite=f8b9214eca7856dc443395266875612c6dc6671816c79e334713ce68bafe64ab`
- B(의사): `https://healo-khidi.vercel.app/consultation/5b71a48d-c8a7-44ab-a407-689b5ee360e8?invite=7f9868fa5678d35e7e0c8facb2aa59a1c8b6a8de7a347105470ce536d36179d0`

**다음 세션 첫 프롬프트:**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프(2026-06-21 밤) 읽어. #209(병원 '치료확정'→유치 자동집계 '되돌리기 가능')는 실서비스에 배포·실검증 다 끝났어(유치+1·되돌리기·가드 OK, 데모 #13 원상복구). 생애주기 지도 문서도 들어갔고. 남은 건 화상방 카메라(#160)야 — 핸드오프 맨 아래 초대링크 2개(만료 6/24)를 폰 2대로 각각 열어서 2명 입장 → 서로 카메라 보이는지 같이 확인하자(준비만 시켜줘, 안 보이면 재발급). 그담에 점수판 '유치 확정됨(되돌리기)' 화면을 내 admin 계정으로 prod에서 한번 눈으로 보고 싶어.

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
