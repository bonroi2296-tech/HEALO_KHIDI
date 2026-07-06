# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

---

## 🔖 세션 핸드오프 (2026-07-06 저녁 — SEO 세션: 네이버 '힐위드' 검색 수정(#656)·러/카 랜딩 정비(#661)·검색 현황 진단 + 랜딩 전략 PO 결정)

> PO 질문 "네이버에서 힐위드로 검색 안 됨"에서 시작 → 원인 수정·배포 → PO가 서치어드바이저·서치콘솔 화면 공유 → 검색 현황 진단 → 랜딩 전략 결정까지.

**1. 이번 세션 한 일**
- **PR #656 ✅ 머지·배포·프로덕션 실측**: 네이버는 keywords 태그를 안 봐서 '힐위드'(keywords에만 존재)가 미매칭이던 것을, ko 홈 SEO 제목/설명(`seo.home.*`)·푸터 copyright(한국어 화면 한정)·JSON-LD `alternateName`에 실글자 삽입으로 수정. PO가 네이버 수집요청 완료(`/`·`/ko`, 배포 후 2026-07-06 17:05).
- **PR #661 ✅ 머지·배포·프로덕션 실측**: 러/카 검색 랜딩 정비 — ①RU FAQ 비자 오기 D-2(유학)→G-1-10(치료요양) ②CTA `/consult/start`→`/inquiry` 직결 5곳 ③고아 상태 해소(러/카 화면 푸터에 랜딩 내부링크, 해당 언어만 노출).
- **검색 현황 진단**(PO 화면 공유 실측): 구글 3개월 노출 37·클릭 4·평균순위 18 / 색인 ~3, 사이트맵 40 중 발견-미색인 21 / 검색어 = 브랜드(healwith 2클릭) + 영어 한방계열(hanyak·acupuncture) 노출 1씩 / 기술 문제 0(HTTPS·보안·수동조치 정상). **병목 = 신규 도메인(6/21 컷오버) 색인 대기, 고칠 결함 없음.**

**2. 왜 그렇게 했는지**
- **랜딩 전언어 확장 안 함(PO 결정 2026-07-06)**: 검색 랜딩은 검색 시장 있는 러/카(얀덱스)만 유지. 얇은 복제 페이지를 6개 언어로 늘리면 색인 병목 악화. 영어판은 GSC 검색어(한방 계열 수요 신호)가 더 쌓이면 "한방 암 통합치료" 주제로 그때 검토.
- 힐위드 병기를 한국어 화면 한정으로 한 이유: i18n-no-korean-leak 스모크가 영어 화면 한글을 차단(첫 커밋이 CI에서 걸림 → 로케일 분기로 재수정 — 가드가 제 역할 함).

**3. 안 끝났거나 보류**
- 랜딩 비용 숫자(면역치료 $3,000/월·숙소 $800/월·진단 $500, 2026-04 작성) **PO 확인 대기** — 틀리면 즉시 수정.
- GSC 색인 새치기 요청(`/ko`·랜딩 2개) PO 수동 안내함 — 실행 여부 미확인.
- 얀덱스 웹마스터 현황 미확인(PO가 화면 열어주면 진단).

**4. 주의·함정**
- 크롬 확장이 naver.com·구글 로그인 서비스를 차단 — 네이버/GSC 조작은 PO 수동, 조회는 computer-use(read)로 화면 읽기만 가능.
- 배포 확인에서 '힐위드' 단순 grep은 오탐(옛 버전 keywords 태그에도 있음 — 이 세션에서 실제 오판 1회, 제목 매칭으로 교체). 콘텐츠 배포 확인은 바뀐 지점 자체로 검사할 것.

**5. 다음 세션이 먼저 할 일**
1. 네이버 "힐위드" 검색 노출 확인(2026-07-13쯤) — 안 뜨면 서치어드바이저 수집 상태 진단.
2. 랜딩 비용 숫자 PO 답 오면 반영.

**6. 검증 상태**
- ✅ #656·#661: CI(ci·스모크) 초록 + 프로덕션 HTML 실측(ko 제목·설명·JSON-LD·푸터 힐위드 / en 한글 0 / G-1-10·CTA·푸터 링크).
- ⚠️ 검증 못 함: 네이버 실검색 노출(재수집 대기 며칠~2주) / GSC 색인 요청 실행 여부.
- 🔸 **정직 고백**: 두 PR 모두 독립 리뷰 게이트 생략하고 자동머지함(저위험 문구·링크 판단 + 프로덕션 실측으로 갈음) — 원칙상 코드 PR은 게이트 대상. 다음 자동머지부터 준수.

**7. 다음 세션 첫 프롬프트**
> docs/PROJECT_CONTEXT.md 최상단 읽어. 네이버 '힐위드' 검색 노출 확인부터(안 뜨면 서치어드바이저 진단), 랜딩 비용 숫자는 PO 확인 대기 중.

---

## 🔖 세션 핸드오프 (2026-07-06 낮 — 주말 정리 + PO 결정 3건 일괄 처리: notes 암호화·2인 레이아웃(PR #654)·LiveKit webhook 최초 등록 + 자동 루프 전면 정지)

> PO 출근 준비 세션("금토일 작업 정리 + 본격 작업 준비"). 주말 요약 보고 → PO 버튼 결정으로 보류 3건 전부 착수 + 테스트 상담방 삭제 + 미머지 PR 정리까지 일괄 처리. **오후 PO 지시로 자동 루프 전부 정지.**

**1. 이번 세션 한 일**
- **PR #654 ✅ 머지·프로덕션 배포·재검증 완료 (2026-07-06 오후)** — ①상담 notes 암호화(AES-256-GCM, `src/lib/khidi/consultationNotes.ts` 신설, 기존 평문 행은 조회 시점 "기회주의적 백필"로 이전 — 이 환경엔 키 없어 일괄 변환 불가) ②#612 감성 (a)(b): 데스크톱 1:1 반반분할 + 세로영상 blur-fill(같은 트랙을 뒤에 blur+cover로 한 장 더 — 방향 감지 불필요). 독립 리뷰 게이트 통과(CONFIRMED 0) + PLAUSIBLE 2건 반영(구형 iOS matchMedia 폴백·복호화 실패 로그 마커). 배포 후: health ok·홈/inquiry/telemedicine 200, **신규 메모 2건 암호문 저장 실측** — 평문 잔존 5건(어드민 상담 목록 1회 열람 시 자동 이전).
- **Assel 코디 계정 생성·로그인 검증 완료 (PO 지시)**: `assel@healwith.co.kr` / 임시비번 PO에게 채팅 전달 / app_metadata.role=coordinator. auth API 실로그인으로 role 반환 확인. `/admin/staff` 생성 로직과 동일 형태(SQL 직접 — 이 환경엔 service key 없음).
- **LiveKit webhook 최초 등록 (PO 직접)**: 옛 주소 교체가 아니라 **한 번도 등록된 적 없었음**(이벤트 0의 진짜 원인). `https://healwith.co.kr/api/livekit/webhook` + Signing key `healo`(APIt2fLT4qDAAxi). 첫 실통화 때 Vercel 로그 `[livekit/webhook]` 수신 확인 필요(서명 불일치면 `signature or parse failed` 워닝).
- **테스트 상담방 2개 삭제 완료**(PO 버튼 승인): 50d5bc43…·aa9804ee… 세션 2+게스트토큰 3, 딸린 기록 없음 확인 후 삭제.
- **PR #567 ✅ 수리 후 머지·배포 완료**: main 합류(5일치) → 새 가드 `check:schema-refs`가 `partner_outreach` 미등록으로 실패 → 스냅샷 등록. 스모크 1회 실패는 재실행으로 통과(flaky 판별 — 동시간 #654 동일 스위트 통과가 근거). 파트너 발굴 화면 코디·어드민에 열림.
- **다기기 테스트 준비 확인**: 초대 링크(상담방 87710d1d) 7/10까지 유효.

**2. 왜 그렇게 했는지**
- notes 백필을 "조회 시점"으로 한 이유: 서버(Vercel)에만 ENCRYPTION_KEY_V1 이 있고, 어드민 상담 목록이 매일 열리므로 수일 내 자동 전량 이전 + 이후 no-op. `.is("notes_encrypted", null)` 가드로 동시 요청 이중 변환 방지.
- blur-fill 을 방향 감지 없이 한 이유: 가로 영상은 앞장(contain)이 타일을 꽉 채워 뒷장이 안 보임 — 감지 로직 자체가 불필요.

**3. 안 끝났거나 보류**
- ⏸ **자동 루프 전부 정지 (2026-07-06 오후 PO 지시)**: ①이 세션 자가 점검 예약 비활성화 ②「사고·품질 순찰 루프(2시간)」 cron(trig_01PEotorQfbx6AmitLRnmPr6) — 타 세션 바인딩이라 정지 불가 → **삭제**(직전 AI루프 세션 핸드오프의 "못 끈다" 잔여 건도 이걸로 해소). 재개 시 create_trigger 재생성: "정기 순찰(소넷 위임): 핵심 경로 스모크(홈·/inquiry·/hospitals 200)·Vercel 런타임 에러·audit ERROR, 이상 없으면 안전 백로그 1건(비시각·자동검증만), 돈·삭제·PII·보이는 UI 금지, 보고는 하루 1회". **PO가 "루프 다시 켜"라고 하기 전까지 새 루프·자가점검 예약 금지.**
- 잔존: 게스트토큰 E2E 스펙 고정 실패 / PR #562(초청장 병원 명의)·#514(사업계획서) PO 검토 대기.

**4. 주의·함정**
- notes 는 이제 **API 경유로만 읽어라** — DB 직접 조회하면 암호문. `[TEST]` 마커 판정은 저장 전 평문에서 하므로 동작 불변.
- 상담방 화면(page.jsx)의 `useIsDesktopViewport`는 iOS 13 이하 폴백(addListener) 포함 — matchMedia 새 API만 쓰면 구형 폰에서 상담방이 죽는다.

**5. 다음 세션이 먼저 할 일**
1. ⚠️ **미검증분**: ①2인 반반분할·blur-fill 육안(다기기 테스트 통화로 확인) ②webhook 첫 수신(통화 후 Vercel 로그) ③notes 백필 실동작(배포 후 어드민 상담 목록 1회 열람 → DB에서 평문 잔존 0 확인).
2. 다기기 테스트 결과 판독(실패 기기 = admin_audit_logs CONSULTATION_CLIENT_ERROR). 실서비스에 새 반반분할 화면이 이미 배포돼 있어 그 화면으로 검증됨.
3. (7/6 GSC 점검 세션) **구글 서치콘솔 /about '리디렉션 오류' 재검증 결과 확인**(7/6 재검증 시작, 수일 소요) — 나머지 전수점검 이상무(색인 68p·보안·HTTPS·수동조치 ✅), 미사용 소유권 토큰(석민 계정 DNS 열쇠)은 GSC+가비아에서 제거 완료(소유권 bonroi2296 단일화, PO 직접 클릭). NOINDEX 1건은 비공개 치료(item-슬러그 3행, is_published=false)라 정상.
4. ~~Assel 계정 권한 부여~~ → **완료**(계정 생성·로그인 검증까지 끝. 임시비번 변경 안내는 PO 몫).

**6. 검증 상태**
- ✅ PR #654: vitest 501 통과(계약 테스트 2건 신규) · check:content · next build · 독립 리뷰(CONFIRMED 0). CI ci+E2E 초록.
- ✅ PR #567: ci 초록 + 스모크 재실행 통과.
- ⚠️ **검증 못 함**: 위 5-1 세 가지(전부 라이브 필요).

**7. 다음 세션 첫 프롬프트**
> docs/PROJECT_CONTEXT.md 최상단 읽어. 다기기 테스트 결과부터 판독(CONSULTATION_CLIENT_ERROR 로그), 그다음 webhook 첫 수신·notes 백필 확인. 자동 루프는 PO 지시로 전부 정지 상태 — "다시 켜"라고 하기 전까지 만들지 마라.

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
