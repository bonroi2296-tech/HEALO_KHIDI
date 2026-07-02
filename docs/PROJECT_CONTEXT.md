# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

---

## 🔖 세션 핸드오프 (2026-07-02 오후 — 화상상담 "남들만 안 됨" 진범 확정·복구: LiveKit 토큰 폐기 오판 #600 + 네이티브 권한 #605 + 죽은링크·오류수집 #608)

> PO 질문 "화요일엔 됐는데 내 기기만 되고 남의 컴·폰은 계속 안 됨 — 롤백할까, 니가 고칠 수 있냐"로 시작. 롤백 대신 증거 기반 진단으로 진범을 잡아 같은 날 3개 PR로 수정·배포·실기기 복구 확인까지 완료한 세션.

**1. 이번 세션 한 일**
- **진단(진범 확정)**: DB 실기록으로 2026-06-30 17:03 5기기·4네트워크 성공 확인 → 6/30 저녁 #527 이후 게스트 전원 실패로 좁힘. PO 크롬 원격 조종으로 실오류 `invalid token: revoked` 포착 → LiveKit `/rtc/validate` A/B(직원 토큰 200 vs 게스트 토큰 401)로 확정. LiveKit 키·한도는 무죄(대시보드·메일 확인, 키 교체 불필요 판정).
- **PR #600 (머지·배포)**: guest-join의 선제 removeParticipant(유령 강제퇴장) 삭제 = 진범 수정. 배포 후 게스트 토큰 검증 5/5→200, 실브라우저 입장, **PO 실기기 PC+폰 👥=2 양방향 통화 복구 확인**.
- **PR #605 (머지·배포, PO 지시)**: 커스텀 "탭해서 마이크·카메라 켜기" 오버레이 삭제 → 입장 시 자동 켜기 + **브라우저 기본 권한창만**. 마이크 경고 배너는 **마이크 장치 있는 기기에서만** + X 닫기. 입장 폼 미리보기 "권한 차단" vs "장치 없음" 구분. 연결 실패 화면에 실제 오류 문자열 표시.
- **PR #608 (머지·배포)**: ①입장권(?invite=) 없는 맨주소 방문자에 "새 초대 링크 요청하세요" 안내(6개어 `linkMissingInvite`) ②어드민·코디 「상담 시작」이 링크 발급 실패 시 맨주소로 조용히 입장하던 폴백 제거(공유 함정 차단) ③`POST /consultation/[id]/client-event` 신설 — 연결오류·18초 타임아웃·미디어실패를 서버(Vercel 로그+admin_audit_logs)에 자동 기록.
- **DB 수정(마이그레이션 `consultation_admissions_allow_guest_role`)**: 입장기록 role CHECK에 'guest' 추가 — 통합링크 도입 후 2026-07-01 17:19부터 입장기록 전부 조용히 유실되던 것 복구.
- 반성문 **#61**(revoked 장애)·**#62**(guest 기록 유실) 기록. 메모리(consult-av-diagnosis) 갱신.

**2. 왜 그렇게 했는지**
- **롤백 안 한 이유**: 화요일 시점 롤백은 7/1의 진짜 버그 수정 6개+(마이크 갇힘·종료=링크 전폐기·코디 링크발급 실패 등)를 부활시키고, 증거상 원인이 방 코드 밖이라 롤백해도 안 나음 — PO 설명 후 전진수정 승인.
- **removeParticipant가 진범인 메커니즘**: LiveKit Cloud는 강제퇴장 시 "그 시각 이전 발급 토큰=폐기"로 기록하는데, SDK(livekit-server-sdk 2.15) 토큰은 `nbf=0`·`iat` 없음 → 갓 발급한 토큰도 '이전 발급'으로 오판·거부. 직원 경로만 강제퇴장이 없어 살아서 **"PO(로그인) 기기만 됨" 착시**가 만들어짐. 유령 정리는 같은 identity 재입장 자동교체+방 타임아웃이 원래 담당이라 선제퇴장은 애초 불필요.
- **자동 켜기 복귀(#587 뒤집음)**: #587의 "모바일 자동켜기 들쭉날쭉" 제보는 revoked 장애 기간의 오진 가능성 큼 + PO 명시 지시("시스템 권한창만, 별개 버튼 만들지 마").

**3. 안 끝났거나 보류**
- **PO 폰 실검증 대기**: 네이티브 권한창 뜸→허용→상대에게 목소리 들림→통번역 음성인식. PO 시간될 때 1회 (실패 시 이제 화면에 원인 문구 + 서버 기록이 남음).
- PO 사무실 PC의 WebRTC pc connection 실패(서울→오사카→도쿄 전 지역 재시도 실패)가 한때 관찰됐다가 이후 성공 — 간헐/로컬(백신·방화벽) 요인 추정, 미해결로 보류. 재발 시 client-event 기록으로 추적.
- LiveKit webhook URL이 옛 도메인(healo-khidi.com) — 통화 무관, 교체 권장(이전 핸드오프 항목 유효).

**4. 주의·함정**
- ⚠️ **guest-join에 removeParticipant(선제 강제퇴장)를 다시 넣으면 게스트 전원 입장 불가 재발** (POSTMORTEMS #61, 코드에 경고 주석 있음).
- 상담방 진단법(이번에 확립): admin@test.com으로 실서비스 전 플로우(로그인→생성→invite→guest-join) API 재현 + `https://healo-6wl7zo53.livekit.cloud/rtc/validate?access_token=<JWT>`로 토큰 판정. 클라이언트 오류는 admin_audit_logs `action='CONSULTATION_CLIENT_ERROR'` 조회.
- 👥 카운터는 **연결 전에도 자기 1명을 표시** → "진짜 입장" 판단은 헤더 ● 연결됨 기준(이번 오진의 한 원인).
- 진단용 테스트 상담(318a5342…, admin@test.com 명의)과 게스트 토큰이 2026-07-05까지 살아있음 — is_test 분리라 정리 불요.

**5. 다음 세션이 먼저 할 일**
1. ⚠️ **직전 미검증분 먼저 확인**: PO 폰 실검증(권한창·마이크·통번역 STT) 결과 확인 — 실패 시 화면 원인 문구 + client-event 기록으로 진단.
2. 어드민·코디 「상담 시작」 발급 실패 차단의 실동작 1회 확인(이번엔 코드·CI 검증만 함).
3. 이전 큐 이어서: PDF 세션 큐(react19 화면 확인·동의서/초청장 프로덕션 발급 — 아래 블록) / PO 콘솔 관문 5개 / #562·#567.

**6. 검증 상태**
- ✅ PR #600·#605·#608 모두 CI(자동검사) 초록 → 머지 → 프로덕션 배포 READY 확인 (2026-07-02).
- ✅ 실서비스 실검증: #600(게스트 토큰 /rtc/validate 200 ×2종 + 실브라우저 입장 + **PO 실기기 👥=2**), #605(마이크 없는 PC에서 커스텀 오버레이·잔소리 배너 부재 + 듣기·보기 입장 + ● 연결됨), #608(비콘 200+DB 기록 row 확인, 무인증 401 차단, 맨주소 안내 화면 스샷 확인).
- ⚠️ **미검증**: PO 폰의 네이티브 권한 플로우(마이크·통번역) / 「상담 시작」 발급실패 경로의 실동작(재현 어려워 코드·CI까지만) / 열린 PR #567·#562·#514는 이 세션 범위 밖(상태 미확인).

**7. 다음 세션 첫 프롬프트**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 읽어. 2026-07-02에 화상상담 "남들만 안 됨" 진범(LiveKit 토큰 폐기 오판 — guest-join 선제 강제퇴장)을 잡아 #600·#605·#608로 수정·배포했어. ①PO 폰 실검증(권한창·마이크·통번역) 결과부터 확인하고, 안 되면 admin_audit_logs의 CONSULTATION_CLIENT_ERROR 기록으로 진단해 ②어드민 「상담 시작」 발급실패 차단 실동작 확인 ③그다음 PDF 세션 큐·PO 콘솔 관문·#562·#567 이어가.

---

## 🔖 세션 핸드오프 (2026-07-02 낮 — 발급 PDF 완전 소생: 한글·키릴 폰트 #603 + 배포환경 500 근본수정 #606, 프로덕션 실발급 검증 완료)

> 전수 감사(아래 블록)가 인계한 "발급 PDF 한글·키릴 전부 깨짐" 칩을 수행한 세션. 폰트를 고치고 preview 에 **실제 발급을 쏴보니** 더 큰 게 나옴 — 발급 API 자체가 배포 환경(프로덕션 포함)에서 **폰트 이전부터 전부 500**. 둘 다 같은 날 수정·머지·프로덕션 검증까지 완료.

**1. 이번 세션 한 일**
- **PR #603 (머지·배포됨)** — 발급 PDF 4종(견적서·동의서 3종·비자초청장) 한글·키릴 깨짐 수정: Noto Sans KR(한글 서브셋 2.8MB×2)·Noto Sans(라틴+키릴 전체 0.5MB×2)를 `src/lib/pdf/fonts/`에 셀프호스팅(OFL 라이선스 동봉), `styles.js` `SANS=["NotoSans","NotoSansKR"]`(react-pdf v4 글자 단위 fallback → ko 문서+카자흐 이름 혼합도 안전), `next.config.js` `outputFileTracingIncludes`로 Vercel 함수에 폰트 동봉. 미등록 italic 제거.
- **PR #606 (머지·배포됨)** — 발급 API가 배포 환경에서 전부 500이던 근본원인(React error #31) 수정: `serverExternalPackages`에 `@react-pdf/renderer` 추가 + **react/react-dom 18.2.0→19.2.7**(Next 16 내장 React 19와 요소 규격 정합).
- **재발 방지**: 반성문 #62(폰트)·#64(React 정합) + `check:content` 가드 2종 — §10(발급 PDF에 내장 Helvetica류 재유입·폰트파일 삭제 차단)·§11(serverExternalPackages 누락·react<19 강등 차단). KHIDI 7월 월별로그 1줄.

**2. 왜 그렇게 했는지**
- 폰트: 내장 Helvetica는 WinAnsi 인코딩이라 한글·키릴이 물리적으로 안 나옴. "오프라인 안전(외부 다운로드 없음)"이라는 기존 의도는 **셀프호스팅으로 계승**. 카자흐 확장 키릴(ӘҒҚҢӨҰҮІҺ)은 Noto Sans KR에 없어서 Noto Sans(라틴+키릴)와 2폰트 스택이 필수.
- React 500: Next 16(App Router)은 앱 코드를 **내장(vendored) React 19.3**으로 컴파일하는데 설치 react가 18.2.0 → 웹팩 서버 번들에서만 렌더 트리에 두 React 요소가 섞여 즉사. dev(Turbopack)·로컬 renderToBuffer·빌드·lint 전부 통과하는 **배포 전용 사고**라 지금까지 아무도 몰랐음. react 19 업그레이드는 peer 충돌 전수확인 0건 + 앱 코드는 이미 내장 19로 컴파일되고 있어 실질 무영향.
- PO 부재 자율 진행(자동 운영 규칙): 명백한 버그 수정 = 저위험 → CI 초록 자동머지 경로.

**3. 안 끝났거나 보류**
- **react 19 업그레이드의 광범위 회귀는 CI(smoke E2E)+주요 페이지 SSR 200 확인 수준** — 전 화면 클릭 전수는 안 함(아래 6번). 이상 징후 시 이 커밋(#606) 의심.
- E2E를 프로덕션 번들(`next build`+`next start`) 기반으로 돌리는 스모크는 미구현(비용 큼) — §11 가드가 대신 구성 강등만 차단. 필요해지면 별도 트랙.

**4. 주의·함정**
- **react/react-dom을 18로 되돌리면 발급 PDF가 다시 전부 500** (check:content §11이 CI에서 막아줌). `serverExternalPackages`의 `@react-pdf/renderer`도 지우면 안 됨.
- `src/lib/pdf/fonts/*.ttf` 4개는 지우면 렌더 자체가 실패(§10 가드 있음). KR 폰트는 서브셋이라 **한자(Hanja) 미포함** — 진단명에 한자가 필요해지면 서브셋 범위 확장(styles.js 주석).
- PDF API 테스트 시 요청 본문은 **UTF-8 필수** — Windows curl -d 인라인 한글은 인코딩이 깨져 "폰트 버그처럼 보이는" 오탐을 만든다(이 세션에서 실제 헛다리).
- POSTMORTEMS #63은 전수감사 세션 것 — 이 세션 반성문은 #62·#64.

**5. 다음 세션이 먼저 할 일**
1. ⚠️ **직전 미검증분 먼저 확인**: react 19 영향 — 프로덕션 주요 화면(홈·/inquiry·환자·어드민 대시보드) 눈으로 한 바퀴 + main push E2E 초록 확인 (`gh run list --branch main`). 이상하면 #606 의심.
2. 동의서·초청장도 프로덕션 실발급 1회씩 확인(견적서만 프로덕션 실검증함).
3. 이전 핸드오프(아래 블록) 큐 이어서: PO 콘솔 관문 5개(LAUNCH_GATES) / K-02 테스트세션 정리 / #562 리베이스·#567 프리뷰 검토.

**6. 검증 상태**
- ✅ **견적서 프로덕션 실발급 200** (healwith.co.kr, admin 계정 Bearer, 39KB PDF) + 육안: 한글·러시아어·카자흐 확장 키릴 전부 정상. ko/ru/kz 샘플 4종(견적서 ko·ru, 초청장 kz, 동의서 ko)은 로컬 renderToBuffer→PNG 육안 확인.
- ✅ PR #603·#606 CI 초록 머지, main CI(#606 커밋) success. `next build --webpack`·전체 lint 0 errors·check:content(가드 2종 네거티브 테스트 포함) 통과. 주요 페이지 SSR 200(ko/en 홈·병원목록·어드민).
- ⚠️ **미검증**: 동의서·초청장의 "프로덕션" 실발급(로컬 프로덕션 번들에선 검증됨, 같은 코드 경로) / react 19 전 화면 클릭 회귀 / #606 머지 후 main push E2E 결과(이 핸드오프 작성 시점 in_progress).

**7. 다음 세션 첫 프롬프트**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 읽어. 2026-07-02에 발급 PDF 완전 소생(#603 폰트 + #606 배포 500 수정, react 18→19)했어. ①main push E2E 초록인지·프로덕션 주요 화면 정상인지 react 19 영향 먼저 확인하고 ②동의서·초청장도 프로덕션 실발급 1회씩 확인 ③그다음 이전 큐(PO 콘솔 관문 5개·K-02 정리·#562·#567) 이어가.

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
