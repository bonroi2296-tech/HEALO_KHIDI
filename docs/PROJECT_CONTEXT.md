# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

---

## 🔖 세션 핸드오프 (2026-06-20 심야·피버모드) — 성능(이미지 −86%·히어로 LCP)+SEO+테스트 +20 (PR #135·#138·#140·#141 전부 ✅머지·배포)

**이번 세션 한 일:** (PO가 "자는 동안 토큰 100% 활용" 위임 → **자동검사로 닫히는 안전·비시각 작업만** 골라 끝까지. 전부 main 머지·배포)
- **🟢 #135 이미지 재압축 −86%**: 과대 public 이미지 51개를 폭 1920·JPEG q82·PNG 무손실로 재압축(전송량 43.5MB→6.1MB). 코드/레이아웃 0 변경. **프로덕션 실측 확인**: `ewha-seoul/5.jpg` 3,764,350B→206,379B(**−95% 라이브**). + `scripts/optimize-images.mjs`(`optimize:images`/`audit:images`) + **CI 게이트**(900KB↑ 재유입 차단). POSTMORTEMS 없음(개선성).
- **🟢 #138 히어로 next/image 전환**: 홈/care-journey 히어로·회복 섹션 3장을 `next/image`(fill+priority)로 → 첫화면 LCP 개선·기기별 자동 크기·AVIF/WebP. `next.config.js`에 `images.unsplash.com` 허용. PO가 프리뷰 "ㅇㅋ" 후 머지.
- **🟢 #140 SEO 구조화데이터(JSON-LD)**: `src/lib/seo/structuredData.js`(MedicalBusiness+BreadcrumbList+실제 제휴/협진 병원 네트워크) → care-journey. **화면 변화 0**(검색엔진 전용). 가짜 평점/후기 schema 금지(테스트 가드).
- **🟢 #141 단위테스트 +20**: `normalizeInquiryStatus`·`isFillerOnly`(추임새)·`evaluateLeadQuality`(리드)·`slug` 4종. 동작 기준 테스트(매직넘버 의존 X). 전 208개 통과.
- **앞선 동일세션분(아래 '2026-06-20 밤' 블록)**: #127(가짜 후기 제거·실제평가·제휴띠·타임라인·회복톤 사진)·#134(문서) 머지 완료.

**왜 그렇게 했는지:**
- PO 자리 비움(취침)+토큰 위임 → 취향 "PO 자리 비움=자동검증·저위험만, 위험·라이브·시각검증 필요한 건 보류" 적용. **레이아웃 바뀌는 건(갤러리 next/image 등) 일부러 안 함**(내가 픽셀 확인 불가·PO 못 봄).
- 이미지 압축을 첫 타깃으로: 측정가능·무위험·해외 모바일 환자 체감속도(LCP)=KHIDI 정성평가(ICT) 직결.
- 저위험·비시각·CI초록이라 PO 위임("저위험 CI초록=머지")대로 직접 머지.

**안 끝났거나 보류:**
- **갤러리 이미지 next/image**: 병원 상세 갤러리(캐러셀·onError 폴백)는 레이아웃 위험+내 픽셀검증 불가라 보류. PO 동석 시 프리뷰 확인하며 진행 권장(이미 #135로 86% 압축은 됨).
- **`any` 813개 축소**: 런타임 무위험(타입은 실행 때 사라짐)이나 광범위·call site 리플 → 가치 대비 churn이라 자는 동안 안 함. PO와 우선순위 정해 진행.
- **God 컴포넌트(2883줄) 분할 / 화상방 라이브 / KPI 클램프**: 변함없이 고위험·라이브검증 필요로 보류.

**주의·함정 (이번 세션 발견한 실제 이슈 2건 — 기록만, 동작 안 바꿈):**
- **slug 한글 미변환**: `generateSlug`의 JSDoc은 "강남→gangnam" 로마자 예시지만 **실제론 `\w`(ASCII)만 남겨 한글 전부 제거 → `item-<타임스탬프>` 폴백**(비서술적 URL). 현재 병원 slug는 하드코딩(immunehospital-magok 등)이라 실피해 적음. 로마자화는 기능추가/동작변경이라 보류 — 테스트로 현재 동작은 잠가둠(`slug.test.ts`).
- **일본어 추임새 `えーと` 누락**: `fillerFilter`가 `えっと`는 잡지만 `えー+と`(장음 표기)는 미커버 → 자막에 가끔 노출. 1줄 정규식 보강 후보(STT 동작변경이라 보류).

**다음 세션이 먼저 할 일 (우선순위):**
1. **⚠️ 직전 미검증분 먼저 확인(관리자 로그인 — 환경상 자동 불가):** (a) `/admin/khidi/kpi-dashboard` 숫자(유치 4/12·상담+사후관리 12/120) (b) 관리자로 `/api/sentry/test` JSON (c) prod 홈/care-journey 후기섹션·병원네트워크·**히어로/사진 잘 보이는지**(이미지 변경 반영됨) 눈으로 1회.
2. **PO와 다음 성능/품질 방향 정하기**: 갤러리 next/image(시각확인 필요) / `any` 축소(타입안정) / God 컴포넌트 분할 중 택. 위 '발견 이슈 2건'(slug·추임새) 고칠지도.
3. KHIDI 중간평가(2026-08-27) 상시 — 이번 성능·SEO·테스트는 정성(ICT 품질)·④(집계 정확성 회귀방지) 기여.

**검증 상태:** **PR #135·#138·#140·#141 전부 CI(`ci`·`Smoke`) 초록 + squash 머지·배포 완료**(GitHub check_runs로 확인). 로컬 tsc 0/eslint 0/**vitest 208개**/check:content/audit:images/next build 통과. **프로덕션 이미지 −95% 실측 확인**(curl). **❌ 미검증(관리자 로그인 필요, 자동 불가): KPI 대시보드 렌더 / Sentry 실전송 / prod 히어로·사진 시각 / 갤러리 화질 — PO 1클릭.** 동일세션 앞 블록(#127·#134)도 머지 완료.

**다음 세션 첫 프롬프트 (PO 복붙용):**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프(2026-06-20 심야·피버모드) 읽어. 어젯밤 자동안전작업으로 이미지 −86%(프로덕션 −95% 실측)·히어로 빠른로딩·SEO·테스트+20 전부 머지·배포됨. 그다음: 1) prod(healo-khidi.vercel.app) 홈·care-journey 열어서 히어로/병원사진 깨짐 없는지, 후기·병원네트워크 잘 보이는지 눈으로 확인. 2) 관리자로 /admin/khidi/kpi-dashboard 숫자 + /api/sentry/test JSON 확인. 3) 다음 성능방향(갤러리 next/image vs any축소 vs God컴포넌트 분할) 골라줘. 새 작업은 git fetch origin main 후 origin/main 기준 브랜치로 시작.

---

## 🔖 세션 핸드오프 (2026-06-20 밤) — 가짜 후기 제거 + 출처표시 실제 평가 + 제휴병원 네트워크 + 연결형 타임라인 + 회복톤 사진 1차 (PR #127 ✅머지·배포 완료)

**이번 세션 한 일:** (작업본 `claude/care-journey-reviews-hospitals-ajlwdg`, **PR [#127](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/127) = PO가 직접 머지(2026-06-20 11:42 UTC)·본판(main) 반영·프로덕션 배포**)
- **🔴 홈에 라이브였던 "지어낸 환자 후기 3건" 제거**: `app/home/HomeClient.jsx`의 `TESTIMONIALS_DATA`(A.K./카자흐스탄/위암, M.S./러시아/유방암, T.Y./일본/간암)가 별점과 함께 프로덕션에 노출 중이었음 → 삭제. PO "가짜 금지·실리뷰만" 지시가 이걸 가리킴.
- **신규 `src/components/SocialProofSection.jsx`(홈·care-journey 공용, 6개 언어)**: 가짜 후기 대신 **출처 확인된 실데이터만** — 모두닥 평점 9.3/10(강서·리뷰 7건)·누적 50,000건+(면력한방 공식 2024-11)·외국인환자 유치의료기관 등록 + 실제 후기 외부 링크(모두닥·똑닥·네이버·공식 치료후기).
- **care-journey 보강(`app/care-journey/CareJourneyClient.jsx`)**: ①**함께하는 병원 네트워크 띠** — 실제 제휴만(면력한방 4지점 + 협진 대학병원 4곳: 이대서울·이대목동·고려대구로·신촌세브란스). ②5단계 여정 → **세로 연결선 타임라인**.
- **회복톤 사진 1차 교체**(PO 취향: 산책·푸드테라피): care-journey 히어로→공원 산책 노부부(`photo-1671530725345`), 회복 섹션→채소볼 푸드테라피(`photo-1512621776951`), 홈 히어로 배경도 동일 차가운 스톡→공원 산책. **3개 URL 모두 200 OK 확인(깨짐 없음). 단 픽셀은 직접 못 봄 — Unsplash 설명 기반 테마 매칭.**
- **재발방지(CLAUDE.md 루틴)**: `scripts/check-content-consistency.mjs`에 **조작 후기 시그니처('이니셜/국가/암종') 차단** 가드 추가(CI 빌드 실패) + `docs/POSTMORTEMS.md #11` 기록 + 전수스캔(Premium홈·/stories 클린).
- **직전 미검증 #2(KPI cron) 확정**: `kpi_snapshots` DB 직접 조회 → 06-10~06-18 매일 15:0x UTC 기록 = **cron 정상 작동**(06-16·06-19는 Vercel 베스트에포트 누락, #109 백필 대상).
- **PO 취향 1건 누적**(`PO_PREFERENCES.md`): 콘텐츠(후기·수치)도 가짜/지어내기 금지·출처 확인된 실데이터만.

**왜 그렇게 했는지:**
- **본문 후기를 안 지어냄**: 모두닥·똑닥·네이버·공식 게시판 모두 개별 후기를 JS로 가려 **그대로 못 긁어옴** → 지어내면 "가짜"라 금지. 그래서 **출처 있는 집계/사실 + 외부 플랫폼 링크** 방식으로 감.
- **한국 의료광고법**: 의료기관 환자 후기·치료경험담 게재는 규제 대상 → 본문 후기 직접 게재보다 "외부 플랫폼에서 확인" 방식이 안전.
- **서울아산·삼성서울 제외**: PO가 띠에 넣자 했지만 데이터상 실제 제휴기관이 아님(가짜 금지) → 실제 제휴 4+4만. 세브란스는 실제 협진이라 포함.
- **PO가 머지로 결정 확정**: 보이는 UI 변경이라 초안으로 두고 PO 확인 대기 중이었는데, **PO가 프리뷰 보고 ready-for-review 전환 후 직접 머지** → 외부평점 띠 방식·9.3/50,000 숫자 게재·회복톤 사진 **3개 다 그대로 채택**으로 결론.

**안 끝났거나 보류:**
- **후기 카드 방식(옵션 B)**: PO가 외부평점 띠(옵션 A)로 머지 = 카드 방식은 안 감. 카드 데모 'SAMPLE 블록'은 머지 전 제거됨(`5cbdd95`). 추후 PO가 동의받은 실후기를 주면 그때 카드 추가 검토(의료광고법 확인 후).
- **9.3 / 50,000 숫자**: PO가 그대로 머지 = 게재 확정. 단 9.3은 후기 7건짜리(표본 작음)·50,000은 병원 자체 표기라 **PO가 나중에 "빼"라면 바로 제거 가능**(약한 근거임은 알고 있음).
- **회복톤 사진**: PO가 머지로 OK. 단 PO가 "내가 따로 줄게"라 했으니 최종본은 PO 제공 사진으로 교체 가능(현재 Unsplash 1차).
- (변함없음) `kpi/route.ts` 누적 종료일 클램프·God 컴포넌트 분할·any 축소·화상방 라이브 — 고위험/PO 동석 필요로 보류.

**주의·함정:**
- **✅ 프로덕션 가짜 후기 제거 완료**: PR #127 머지로 본판 반영 → main 푸시가 Vercel 프로덕션 자동 배포. (배포 직후 prod 화면 1회 눈으로 확인 권장.)
- **회복톤 사진 픽셀 미검증**: URL 200은 확인했지만 실제 그림은 못 봄 → prod에서 별로면 다른 후보로 교체.
- **다른 세션 동시 작업 중**: 이번에 main이 자동 머지됨(a1f6b2a, 충돌 0·빌드 통과 확인). 작업 전 `git fetch origin main` 최신화 습관.

**다음 세션이 먼저 할 일 (우선순위):**
1. **⚠️ 직전 미검증분 먼저 확인(관리자 로그인 — 환경상 자동 불가):** (a) `/admin/khidi/kpi-dashboard`에 유치 4/12·사전상담+사후관리 12/120·만족도 뜨는지. (b) 관리자로 `https://healo-khidi.vercel.app/api/sentry/test` 1회 → JSON "전송됐습니다" 확인. (c) prod(`https://healo-khidi.vercel.app/care-journey`·홈)에서 후기 섹션·병원 네트워크·회복톤 사진 실제로 잘 보이는지 1회 확인.
2. (선택) `kpi/route.ts` 누적 종료일 클램프 시간대 경계 PO와 함께 점검.
3. KHIDI 중간평가(2026-08-27) 상시 — 이번 후기·신뢰 섹션은 평가항목 ①(사업목적·BM 신뢰성)에 도움.

**검증 상태:** 로컬 **tsc 0 / eslint 0 / vitest 188개 / check:content(가짜후기 가드 포함) / next build --webpack** 전부 통과(머지로 main 합쳐진 뒤 재빌드도 통과). **PR #127 ✅머지 완료**(PO 직접, 11:42 UTC) — Vercel 상태 success·main 반영. KPI cron **DB로 실행 확인**. **❌ 미검증(관리자 로그인 필요, 자동 불가): KPI 대시보드 화면 렌더 / 서버 Sentry 실전송 / prod 후기·사진 실제 렌더 — PO 1클릭.** **❌ 회복톤 사진 픽셀 미확인(URL 200만 확인).** 다른 세션 열린 PR: #124·#119·#116·#83·#41(무관).

**다음 세션 첫 프롬프트 (PO 복붙용):**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프(2026-06-20 밤) 읽어. PR #127은 이미 머지·배포됨(가짜 후기 제거 완료). 그다음: 1) 관리자로 /admin/khidi/kpi-dashboard 숫자(유치 4/12·상담+사후관리 12/120) 뜨는지 + /api/sentry/test JSON 확인. 2) prod(healo-khidi.vercel.app/care-journey·홈)에서 후기 섹션·병원 네트워크·회복톤 사진 잘 보이는지 1회 확인(별로면 사진 교체·9.3/5만 숫자 빼달라 하면 바로 해줌). 새 작업은 git fetch origin main 후 origin/main 기준으로 브랜치 잡고 시작.

---

## 🔖 세션 핸드오프 (2026-06-20 저녁·B) — PO 싱크(작업계약) + 경쟁사 벤치마크 + /inquiry·/hospitals·care-journey 품질개선 fix 1~5 머지·배포 + 유치실적 2025(201만) 업데이트

> ⚠️ 같은 날 저녁 다른 세션(아래 "제3자 전체 감리" 블록)과 **병렬 진행**됨 — 둘은 독립 작업. 머지 충돌은 양쪽 보존으로 풀었음.

**이번 세션 한 일:**
- **PO 싱크(working contract) 확정 → `docs/PO_PREFERENCES.md` 영구 기록 (PR [#114](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/114)·[#115](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/115) 머지):** 세션 본론은 "코드"가 아니라 "PO와 어시스턴트 싱크". 작업계약 = ①내 역할: 기본 **기술 파트너**(먼저 제안), 상황 따라 실행자 ②돈 나가는 건 "알려만", **보이는 UI 변경은 프리뷰 URL로 먼저 보여주고 OK 받기**, 그 외는 내 판단 ③반대·지적은 톤 무관 사실만.
- **경쟁사 벤치마크 → `docs/COMPETITOR_BENCHMARK.md` (PR #115):** 1·2위 **Bookimed·Qunomedical** 기준 before = `/inquiry` **78** / `/care-journey` **79** / 신뢰표시 **61**. 격차 TOP6 도출.
- **fix 1·2·3 — /inquiry (PR #115 배포 `2666d6e`):** ①"상담 무료·**부담 없이**"(처음 "비구속"→PO 번역투 지적→교체)+신뢰줄, ②인증배지(KHIDI·외국인환자 유치등록 — **보유한 것만**), ③Human 채널 "준비 중" 막다른길→"상담 신청서(1분)" 폴백. `app/inquiry/_components/UnifiedInquiryFunnel.jsx`.
- **fix 4·5 + 통계 — (PR [#120](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/120) 배포 `84bb8d6`):** ④`/hospitals` 의사 카드 **"전문의" 검증 칩**(실제 전문의만, 가짜점수·도배 금지). ⑤`/care-journey` **회복톤 실사진 2장**(검수된 Unsplash 재사용 — **임시, PO 본인 사진 줄 예정**). ⑥**유치실적 2024(117만)→2025(201만)** 6곳 일관 업데이트(care-journey 6언어·홈·러시아·카자흐) — 보건복지부 2026-04-24 발표(첫 200만 돌파, 201만).

**왜 그렇게 했는지:**
- **fix 6(후기) 보류 = 법적 레드라인:** `src/lib/stories/storiesData.js`에 현재 후기가 **"샘플/데모"라 명시** → 켜면 **가짜 환자후기 = 의료법 §27 위반**. PO "싹다해"에도 안 켰고, PO가 수긍 → **"구글/네이버 실리뷰 활용"**으로 전환(다음 세션 과제).
- **사진 프리뷰 먼저:** UI라 머지 전 프리뷰로 PO 확인(작업계약). PO "이거 좋은데 사진은 따로 줄게" → 구조 OK, 임시사진으로 머지.

**안 끝났거나 보류:**
- **fix 6 후기(구글/네이버 실리뷰):** 다음 세션. 소스 = (a) PO/코디가 반응 좋은 리뷰 텍스트 3~5개 줌(추천·정확) / (b) 내가 웹서 후보 찾음. 리뷰 본문 정확히 긁기 어려움. reviews 테이블/API 없음.
- **care-journey 추가개선:** PO "단순함" 지적 → **제휴병원 띠 + 5단계 여정 타임라인**(신뢰↑·사진 없이 가능). 다음 세션.
- **care-journey 사진 교체:** PO가 본인 사진 주면 임시 Unsplash와 교체(`CareJourneyClient.jsx` 히어로·whyCare img src).

**주의·함정:**
- **이 브랜치는 squash 머지마다 main과 어긋남(`dirty` 반복).** 다음 세션은 **새 작업 전 `git fetch origin main` 후 main 기준 새로 시작**. 이번에도 PROJECT_CONTEXT·PO_PREFERENCES가 병렬 세션과 충돌 → 양쪽 보존으로 해소.
- **로컬 컨테이너 node_modules 없음** → `npm ci` 먼저.

**다음 세션이 먼저 할 일 (우선순위):**
1. **⚠️ 직전 미검증 확인(관리자 필요):** (a) `/admin/khidi/kpi-dashboard` 유치 4/12·상담+사후 12/120 / (b) `api/sentry/test` JSON / (c) `kpi-snapshot` cron 로그.
2. **fix 6 구글/네이버 실리뷰 후기 섹션**(가짜 금지·실리뷰만, 출처표시).
3. **care-journey 제휴병원 띠 + 5단계 타임라인**(프리뷰로 PO 확인).
4. **care-journey 사진 교체**(PO 사진 받으면).

**검증 상태:** PR **#114·#115(`2666d6e`)·#120(`84bb8d6`) = CI(`ci`·`Smoke`) 초록 + 머지·배포 완료**. 로컬 check:content·next build --webpack 매 단계 통과. **PO가 프리뷰로 시각 확인함**. 통계 6곳 잔재 0. **❌ 미검증(관리자 1클릭): KPI 대시보드 / Sentry 실전송 / KPI cron — 이월.**

**다음 세션 첫 프롬프트 (PO 복붙용):**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프(2026-06-20 저녁·B) 읽어. 새 작업 전 git fetch origin main 동기화부터. 그다음: 1) fix 6 후기 — 면력한방병원(강서·신촌점) 구글/네이버 반응 좋은 실리뷰 내가 줄게(없으면 니가 웹서 후보 제시) 출처표시해서 care-journey/홈에 후기 섹션(가짜 금지). 2) care-journey 더 채워 — 제휴병원 띠 + 5단계 타임라인, 프리뷰로. 3) 회복톤 사진 내가 따로 줌. 그리고 직전 미검증 3개(관리자): KPI 대시보드 / api/sentry/test / kpi-snapshot cron.

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
