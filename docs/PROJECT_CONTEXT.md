# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

---

## 🔖 세션 핸드오프 (2026-07-06 밤 — 구글 서치콘솔 위생·색인 요청: 미사용 소유권 토큰 제거·/about 재검증·핵심 5p 색인 요청)

> PO "서치콘솔에서 미사용 확인 토큰 발견됐다는데 분석해줘"에서 시작 → 크롬(computer-use)으로 GSC 전수 점검 → 토큰 정체 규명·PO가 직접 삭제 → 색인 새치기 요청까지. 같은 날 SEO 세션(#656/#661)·병원정보 세션과 **별개 트랙(콘솔 운영, 코드 무변경)**.

**1. 이번 세션 한 일**
- **미사용 소유권 토큰 제거 완료 (PO 직접 클릭)** — GSC "미사용 소유권 토큰 1개" = 구계정 seokmin.moon88 명의 도메인 인증 열쇠(DNS TXT). PO가 ①가비아 DNS에서 해당 TXT(`google-site-verification=IdBTWA92…9TP-No`) 삭제 → ②GSC에서 삭제 확인. 최종 "토큰 0개" + nslookup(8.8.8.8) 반영 실확인. 소유권을 운영계정 bonroi2296 단일화.
- **GSC 전수 점검(고칠 결함 0)** — 색인 68p / 미색인 26p(전부 정상 사유: 리디렉션 설계 3·크롤대기 21·비공개 치료 noindex 1·/about 리디렉션오류 1) / 실적 3개월 클릭4·노출37·평균순위18(브랜드 healwith + 영어 한방키워드 노출 시작) / HTTPS·보안·수동조치 전부 정상 / 사용자 1명(bonroi2296 소유자).
- **/about '리디렉션 오류' 재검증 요청** — 실서버 확인 결과 정상(308 /about→/en/about→200 실측)이라 GSC "수정 결과 확인" 클릭(2026-07-06 재검증 시작, 수일 소요).
- **핵심 5개 페이지 색인 새치기 요청** — `/kk/for-kazakh-patients`·`/en/telemedicine`·`/en/visa`·`/en/hospitals/severance-sinchon`·`/en/treatments/immune-boost-program` 전부 "색인 생성 요청" 제출(우선순위 크롤링 대기열 등록). SEO 세션 핸드오프의 미해결 "색인 요청 실행 여부 미확인"을 이걸로 해소(단 대상 URL은 다름).
- **기록: PR #662 ✅ 머지** — KHIDI 월별 로그(7월) 1줄 + 후속 확인 항목. 문서-only.

**2. 왜 그렇게 했는지**
- 토큰 삭제 위험 0 근거: 열쇠 주인이 PO 본인 다른 구글계정이고, 현역 인증(bonroi 열쇠 `O7qQ…`)·메일(Zoho)·얀덱스는 별개 DNS 레코드라 무관. GSC 팝업의 "판매자센터/Workspace 영향" 경고는 우리가 그 서비스 미사용이라 해당 없음.
- 색인 요청 URL 선정: 장사 되는 페이지 우선(카자흐 랜딩·원격협진·비자·병원/치료 대표 각 1). GSC 하루 요청 할당량 있어 5개로 제한.

**3. 안 끝났거나 보류**
- /about 재검증 결과(구글이 수일 내 메일 통보) — 확인만 하면 됨, 안 와도 무해.
- 색인 요청 5건 실제 색인 반영(구글 크롤 대기, 며칠~2주) — 나머지 대기 16p도 같이 빨라질 수 있음.
- 얀덱스 웹마스터 현황 미점검(러/카 타깃은 얀덱스 비중 큼 — 다음에 같은 방식으로 훑기 제안).

**4. 주의·함정**
- GSC 개요 화면에 "미사용 토큰" 권장사항 카드가 며칠 더 보일 수 있음 = 캐시 잔상, 실제론 0개(무시).
- 가비아 TXT에 google-site-verification이 2개였음 — 지운 건 석민(`…9TP-No`) 딱 하나. 나머지 `O7qQ…`(bonroi 현역)·yandex·zoho·MX·spf·dkim·_dmarc는 **절대 손대지 말 것**(지우면 소유권/메일 붕괴).
- GSC URL 검사 입력창은 computer-use로 첫 글자 씹히는 일 잦음 — `find`로 textbox ref 잡고 클릭 후 입력이 안정적.

**5. 다음 세션이 먼저 할 일**
1. ⚠️ **직전 미검증분 먼저**: 색인 요청 5건·/about 재검증이 실제 반영됐는지 GSC 확인(색인 생성 페이지 수 68→증가 여부, /about 오류 해소 여부). 반영은 수일~2주 걸리니 조급 금지.
2. (선택) 얀덱스 웹마스터 현황 진단 — PO가 화면 열어주면.
3. SEO 세션 핸드오프 잔여(네이버 힐위드 노출 확인·랜딩 비용 숫자 PO 답)도 같이 챙기기.

**6. 검증 상태**
- ✅ 토큰 제거: GSC "토큰 0개" 화면 + nslookup(가비아·8.8.8.8) 실확인.
- ✅ GSC 점검: 화면 실측 + 실서버 curl(리디렉션 체인)·실DB(item- 슬러그 is_published=false) 교차확인.
- ✅ 색인 요청 5건·/about 재검증: GSC "색인 생성 요청됨"/"유효성 검사 시작됨" 화면 확인(요청 제출까지가 검증 범위 — 실제 색인 반영은 구글 몫, **미검증**).
- ✅ PR #662: CI(ci·스모크) 초록 후 squash 머지(문서-only). 다른 열린 PR 상태는 이 세션 미확인.

**7. 다음 세션 첫 프롬프트**
> docs/PROJECT_CONTEXT.md 최상단 읽어. GSC에서 색인 요청 5건·/about 재검증 반영됐는지부터 확인(색인 페이지 수·/about 오류 해소, 수일~2주 걸리니 급하지 않음). 얀덱스 웹마스터 미점검 상태고, 네이버 힐위드 노출 확인도 대기 중.

---

## 🔖 세션 핸드오프 (2026-07-06 밤 — 병원 정보 수정 세션: 홈 대표원장 4인 교체·성동/광명 유치기관 등록 표기·병원 3곳 설명 암환자화·광명 주소 오류 교정·사진없는 원장 폴백)

> PO "성동·광명도 유치기관 등록됐고 원장 많이 바뀌었다. 홈 4명 프로필을 각 지점 대표원장으로 바꾸자"에서 시작. 진행 중 PO가 실화면 스샷으로 누락·오류를 3차례 제보 → 그때마다 같은 부류(하드코딩 사본 드리프트) 전수 스캔·수정. 별도 worktree(`HEALO_worktrees/hospital-info`)에서 작업.

**1. 이번 세션 한 일** (전부 머지·프로덕션 배포·실측 완료)
- **PR #657 ✅**: 홈 의료진 카드 4명을 각 지점 대표원장으로 교체(강서 황이준·신촌 유형진·광명 배길준·성동 강주안). **기존 카드에 신촌 퇴사 원장 정유진이 계속 노출 중이던 것 제거**(공식 사이트 4개 지점 doctor.php 전수 대조). 광명·성동 대표원장 최신 공식 사진 self-host 갱신(640px). 병원 상세 하이라이트에 유치기관 등록 6개 언어 추가. 반성문 **#66** 기록 + 검사기 **§13 신설**(홈 하드코딩 명단 ↔ 라이브 소스 immuneHospitalInfo.js 드리프트 CI 차단).
- **PR #659 ✅**: 광명점 주소 오류 교정 — 정적 데이터가 "광명역 M클러스터 오리로 876"이었으나 공식 사이트 대조 결과 실주소는 **철산로 16 트라이앵글빌딩**. 설명 6개 언어·주소·좌표·홈 카드·시드 스크립트 전부 교정, 사실 아닌 "광명역 직결 KTX" 하이라이트 삭제.
- **PR #660 ✅**: `/hospitals` **목록** 페이지 지점 카드(또 다른 하드코딩 사본 BRANCH_CONFIG)가 성동·광명 "등록 준비 중" 배지 + 광명 옛 주소로 낡아 있던 것 교정 → 등록됨·철산동·"4개 지점 등록"(6개 언어). §13 검사를 이 페이지 DOCTORS 명단에도 확장.
- **PR #663 ✅**: 얼굴 사진 없는 원장(조현실 신촌 양방대표) 목록 카드 썸네일이 **병원 로고 이미지**였던 것 → 공식 사이트와 동일한 **팔짱 낀 흰 가운 이미지**로 교체. 로고 파일 삭제 + check:content 금지토큰 추가(의료진 사진에 로고 재사용 시 CI 실패). **PO 반복 지시였는데 취향 원장에 기록 누락돼 재발한 건** → PO_PREFERENCES + 메모리에 기록.
- **DB 직접 수정(PO 버튼 승인)**: 병원 상세는 DB 우선·정적 fallback인데 강서·신촌·광명 3곳이 DB에 있어 DB의 **피벗 전 옛 설명("여성건강·난임·산후조리")이 실서비스 노출 중**이었음. 정적 파일의 암환자 중심 6개 언어 콘텐츠로 `hospitals` 3행 UPDATE(description·specialties·tags·i18n·certifications, 이름/위치 번역은 보존). SELECT 재조회로 확인. 4곳 전부 `certifications=['외국인환자 유치의료기관 등록']`.
- 등록증 대기 항목을 KNOWN_ISSUES + LAUNCH_GATES_PO(「지금 남은 관문」)에 기록.

**2. 왜 그렇게 했는지**
- **같은 의료진 데이터가 4곳에 사본**으로 존재(라이브 immuneHospitalInfo.js / dev immuneDoctors.js / 홈 DOCTORS_DATA / 목록 BRANCH_CONFIG+DOCTORS). 명단 갱신 때 형제 사본 전수 스캔이 습관화 안 돼 있어 PO가 스샷으로 3번 나눠 제보(퇴사원장→옛설명→목록카드→로고). **사본 발견할 때마다 §13 계열 가드에 즉시 편입**하는 것으로 대응.
- 유치기관 등록 표기를 `certifications` 칩으로 한 이유: 정적 파일의 `highlights` 필드는 **어느 화면에서도 렌더 안 되는 죽은 데이터**였음(상세는 certifications 칩만 렌더). +렌더 시 text[](DB 실컬럼) vs {type,issuer}(옛 코드 가정) 불일치 잠복버그도 같이 수정.
- DB 3곳 설명 교체는 카피 영역이라 PO 버튼 승인받고 진행(DB라 프리뷰 분리 불가, 반영 즉시 실서비스).

**3. 안 끝났거나 보류**
- ⏳ **비자 초청장 발급 병원에 성동·광명 추가 — 등록증 원본 정보(등록번호·대표자·유효기간) PO 제공 대기**(`src/lib/visa/inviterHospitals.ts` 현재 강서·신촌 2곳만). PO "나중에 줄게"(2026-07-06). 사진 1장이면 어시가 입력. KNOWN_ISSUES + LAUNCH_GATES 기록됨.
- 낡은 사본 `src/lib/data/immuneDoctors.js`(dev `/dev/cancer-preview` 전용, 신촌 구명단·광명 사진 null) — 위험 낮아 미정리, 통합 대상으로 기록.

**4. 주의·함정**
- **면력 의료진 데이터는 최소 4곳 사본** — 병원 인사변동 소식 오면 4곳(라이브·dev·홈·목록) 전부 + DB `hospitals`까지 확인. §13이 사본 간 드리프트는 잡지만 **외부 사이트와의 대조는 CI가 못 함** → 공식 4개 지점 doctor.php WebFetch 전수 대조가 표준 절차.
- 병원 상세는 **DB 우선** — 정적 파일(partnerHospitals.js)만 고치면 DB에 있는 3곳(강서·신촌·광명)은 안 바뀜(성동만 DB에 없어 정적 반영). 상세 카피 바꿀 땐 DB부터 확인.
- 콘텐츠 배포 확인 시 캐시 주의 — `?_=$(date +%s)` + no-cache 헤더로 우회(이 세션 로고 grep 1회 오판, 캐시 우회 후 정상 확인).

**5. 다음 세션이 먼저 할 일**
1. ⚠️ **직전 미검증분 먼저 확인**: 강서·신촌·광명 [상세 페이지](https://healwith.co.kr/ko/hospitals/immunehospital-magok) 암환자 중심 설명(DB 교체분)을 **육안으로** 훑어 어색한 데(번역투·톤) 없는지 확인 — 기계 검증(SELECT·grep)만 했고 화면 육안은 PO도 어시도 아직 안 봄.
2. 등록증 정보 PO가 주면 `inviterHospitals.ts`에 성동·광명 추가.

**6. 검증 상태**
- ✅ PR #657·#659·#660·#663 전부 CI(ci·Smoke) 초록 + main 머지 + 프로덕션 배포 실측: 홈 대표원장 4인(정유진 0)·철산동·성동/광명 등록 배지·"4개 지점 등록"·조현실 팔짱 이미지(로고 0/팔짱 1, 캐시 우회 확인).
- ✅ DB 3곳 UPDATE 후 SELECT 재조회로 설명·전문분야·번역·certifications 확인. check:content·`next build --webpack` 통과.
- ⚠️ **검증 못 함(솔직히)**: 강서·신촌·광명 상세 페이지 암환자 설명의 **화면 육안 확인**(6개 언어 번역 품질 포함) — 기계 검증만.
- 🔸 자동머지 판단: 저위험 콘텐츠(문구·이미지·주소) PR이라 독립 리뷰 게이트 생략하고 프로덕션 실측으로 갈음.

**7. 다음 세션 첫 프롬프트**
> docs/PROJECT_CONTEXT.md 최상단 읽어. 면력 병원 강서·신촌·광명 상세 페이지 설명을 DB에서 암환자 중심으로 바꿨는데 화면 육안 확인을 못 했으니 그것부터 훑어(6개 언어 번역 어색한 데). 성동·광명 등록증 정보는 PO 제공 대기 중(오면 비자 초청장 병원에 추가).

---

## 🧭 오전 다중세션 통합 정리 (2026-07-01) — 무엇이 배포됐고 / 무엇이 미머지로 남았나

> **왜 이 블록:** 오늘 오전 여러 창(병렬 세션)에서 각자 작업 후 각자 핸드오프 → 배포된 건 main·SoR에 잘 쌓였지만, **끝냈는데 아직 본판에 안 합친(미머지) 작업 3건**이 각 세션 브랜치에만 있고 이 SoR엔 기록이 없었음(=다음 세션이 놓칠 위험). 그 3건을 여기 한 곳에 모아 다음 세션 큐로 승격. (세부 이야기는 아래 오후·오전(2) 핸드오프 + `archive/`에 이미 있음 — 여기선 안 겹치게 '무엇이 남았나'만.)

**✅ 오늘 오전 실서비스(main·프로덕션) 반영 완료** — 다 머지·CI초록:
- **어드민 대청소** #555 (가짜숫자·가짜성공률 제거 / 병원 6곳 활성화 / 매칭 실작동 / 상담취소 실API / AccuracyPanel 실측)
- **병원 페이지** #554 의사사진 자체호스팅(핫링크 제거) + 토글 애니 · #559 신촌 의료진 현행화(27→28명)·실사진 · #565 토글 "밀림" pin 수정
- **콘텐츠 자체호스팅** #551 암종 카드/합병증 이미지(immunehospital 핫링크 제거)
- **비자** #549 체크리스트 계정동기화·러카 누적일수 · #552 PDF 톤 Premium→기본톤 교정
- **환자앱** #544 견적 상세페이지 6개어화(ko/en/ru/kz/zh/ja)
- **KHIDI 지표** #557 만족도 표본부족 env 스위치 · 유치 전환 대시보드 **채널별(유입경로) 분해** (migration 반영)
- **SEO** #547 BreadcrumbList·WebSite SearchAction 구조화데이터
- **디자인/정리** #560·#561 활성 디자인 명칭 'legacy'→'기본 톤' 개명 · #539 죽은 premium 이메일 시스템 삭제

**⚠️ 끝냈지만 미머지 — 다음 세션이 먼저 처리 (브랜치에만 있음, 안 잃게):**
1. **파트너 발굴 아웃리치 추적기** [PR #567 · 브랜치 `work/partner-outreach`] — 코디·어드민 백오피스 신규 기능(카자흐 직원 Assel이 파일 대신 백오피스에서 파트너 영업 추적). **완성 + 프로덕션 DB에 표 `partner_outreach`+시드 6곳 이미 적용.** 남은 것: ①프리뷰에서 화면 클릭 검증(후보추가·상태변경·탭필터·CRUD, 코디+어드민 둘 다) → 이상 없으면 **머지** ②Assel 계정에 코디네이터 권한 부여(`/admin/staff`). (큰 UI라 PO 눈으로 보고 머지하기로 했던 건)
2. **초청장 발급주체 = 등록 유치의료기관(병원) 명의** [PR #562 · 브랜치 `claude/kazakhstan-keta-config-ko4g7b`] — `VisaInvitationLetter.jsx`+`inviterHospitals.ts` 완성, 미머지. (같은 세션의 비자 정정 #535·541·549·552는 이미 머지됨 — #562만 남음.)
3. **이메일 수신률 문서** [PR #545 · 브랜치 `work/email-deliverability`] — `docs/EMAIL_DELIVERABILITY.md`(DMARC·콜드 아웃리치 플레이북). DMARC 감시 켜기·Google Postmaster 등록은 이미 실행(외부 완료). 문서라 CI 초록시 자동머지 대상.
- (추가 열린 검증) #565 토글 "밀림"은 코드·배포 반영됐으나 **실브라우저 스크롤 동작만 미검증**(검증환경 헤드리스라 눈으로 못 봄) — 오전(2) 핸드오프 6번 참조.

**🧹 정리해도 되는 브랜치(작업 이미 main에 반영 = squash 머지됨, 지워도 안전):** `claude/handoff-2026-07-01-am`·`handoff/admin-cleanup-0701`·`work/admin-backoffice`·`work/hospitals-roster-refresh`·`work/hospitals-toggle-ui`·`work/hospital-toggle-scroll-fix`·`claude/rescue-548-doctor-selfhost`·`claude/seo-audit-improvements`·`claude/inspiring-williamson-56fbfc`·`claude/patient-detail-i18n`·`claude/satisfaction-min-n-env`·`claude/fix-all-errors-sweep`·`claude/khidi-conversion-source-breakdown`·`claude/handoff-cancer-img-selfhost`. **남겨둘 것(미머지 작업 있음):** `work/partner-outreach`·`claude/kazakhstan-keta-config-ko4g7b`·`work/email-deliverability`.

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
- **"기본 톤"만 표준** (Airbnb 스타일: 흰 배경·teal-600·시스템폰트·rounded-xl). ※ 예전 "legacy 모드"를 **2026-07-01에 "기본 톤"으로 개명** — "legacy(옛날꺼)"라는 이름이 "premium으로 올려야지"라는 정반대 오해를 반복 유발해서. 이제 디자인은 하나뿐, 모드 토글 없음.
- **Premium 톤 폐기**: 검은배경·금색·serif·필름그레인 = "럭셔리 호텔" 느낌이라 PO·대표가 거부. 정부과제 성격과 안 맞음. **되살리기·재활용 금지 — 폐기된 옛 실험이지 업그레이드 아님.**
- PO가 가장 싫어하는 것: **"AI가 만든 느낌"** (큰 컬러원+큰아이콘, 똑같은 카드 반복, 이모지 도배, 의미없는 영문카피).
- 공개 페이지(/treatments·상세·/telemedicine·/faq·/hospitals/immune·404·500) 전부 기본 톤으로 재구성 완료. 옛 premium은 `*Premium.jsx` 잔재로만 존재(비활성, import 금지).

## 4. 주요 기능 현황 (라우트는 CLAUDE.md 참조)
- **통합 문의 퍼널 `/inquiry`**: 진입 시 AI Agent / Human Agent / Inquiry Form 선택. `/intake`·`/consult/start`는 여기로 통합(redirect). Human Agent = WhatsApp·Telegram·WeChat·LINE 4채널 — **실제 동작(2026-07-02 실측 정정): WhatsApp만 라이브(코드 폴백 wa.me, #73), 나머지 3채널은 env(`NEXT_PUBLIC_MESSENGER_*_URL`) 미설정이라 카드 자체가 숨김 처리**("준비 중" 표시 아님 — 미완성 인상 안 줌, 1채널뿐이면 picker 생략 직행).
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

## 6-1-b. 심층 리서치 결과 (2026-06-11) — `docs/archive/DEEP_RESEARCH_2026_06_11.md` 필독
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
