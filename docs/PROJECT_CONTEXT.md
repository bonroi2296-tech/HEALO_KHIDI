# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

---

## 🔖 세션 핸드오프 (2026-07-14 밤 — /hospitals 카드 잘림 수리 + 사이트 전역 '글자 잘림' 야간 가드 상설화 + 반성문 번호체계 수습)

**1. 이번 세션 한 일** — PR 3건 전부 머지·자동머지 규칙 준수(독립 리뷰 게이트 4라운드):
- **[PR #752](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/752) 카드 잘림 수정**: PO 스크린샷 제보(/en/hospitals 의료진 카드 "Full Profile"→"Fu…" 절단) → 원인 = DoctorCard `flex-1`에 `min-w-0` 누락(truncate 자식이 카드 폭을 밀어냄 → overflow-hidden 절단, 영어가 최장이라 /en 최심). 한 단어 수정 + `e2e/hospitals-list.spec.ts`에 @smoke 넘침 0px 가드. **프로덕션 실측 완료**(카드 28개 넘침 0px, 데스크톱+모바일). 반성문 #89.
- **[PR #753](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/753) 반성문 번호 사고 수습**: #89를 #66으로 중복 발번한 실수(최신 번호는 파일 '상단' — tail로 보면 옛 번호) → 재발번 + 사고 자체를 #90 기록 + `check:content` **§20**(번호 새 중복 CI 차단 — 자가검증: 과거 충돌 13쌍 적발 확인 후 12쌍 허용목록). **과거 충돌 12쌍(#31·32·39·42·55~62)은 KNOWN_ISSUES 등재**(전면 재번호는 🔁 참조 깨는 대수술 — /doc-health 몫).
- **[PR #756](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/756) 사이트 전역 잘림 가드**: PO "다른 페이지는?" → 공개 페이지 전수(사이트맵 19템플릿 × PC/모바일 = 38회) 실측 스캔 = **추가 잘림 0건**(히어로 장식·지도 내부·폰트 프로브·캐러셀·sr-only 전부 의도 패턴 판독). 스캐너를 `e2e/content-clip-sweep.spec.ts`로 상설화 — 야간 프로덕션 cron + main push Full E2E에서 "읽을 텍스트가 클리핑/뷰포트 경계에 잘리면 실패"(PR 게이트 제외).

**2. 왜 그렇게 했는지**
- /hospitals는 PO 제보 수정만 4번째(#565·#660·#663·이번) — 공통 원인이 "시각 회귀 무검사"라 페이지 가드로 안 끝내고 **사이트 전역 가드**까지 올림(오류는 기계가 잡는다 원칙).
- 가드는 만들 때마다 **"버그를 일부러 심어 적발되는지"로 유효성 검증**(카드 min-w-0 재제거 → 17~70건 적발, 상자/ink 카나리 적발, 스크롤 표 래퍼 음성 0건). "가드 있음"과 "가드 작동함"은 다르다.
- 독립 리뷰 게이트가 실결함 3건을 연속 적발(§20 허용목록 3회째 통과 구멍 / 뷰포트 경계 사각 / 스크롤 설계 영역 오인) — 전부 수정·재검증 후 머지. 게이트 가치 실증 사례.

**3. 안 끝났거나 보류**
- **백오피스(로그인 뒤편) 잘림 미스캔** — 로컬 로그인 자동화 불가(기존 확인). 확장하려면 nightly의 E2E 계정(secrets)으로 로그인 후 스캔하는 별도 스펙 필요 — 공개 페이지보다 저위험이라 보류.
- ru/kz 언어 변형은 스캔 제외(시간 3배, 영어 = 최장 텍스트 = 최악 케이스). 러시아어 긴 단어의 word-break 부류는 이 가드 표적 밖.
- 반성문 과거 충돌 12쌍 정리 — `/doc-health` 주간 검진에서 참조까지 일괄 교정 검토.

**4. 주의·함정**
- **(2026-07-15 중간저장 2, 화상상담 세션)** 7/14 실회의 후속 전부 진행: **머지·배포 = [#765](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/765)**(권한차단 상주배너·퇴장시각 left_at·네트워크 팁·비콘 위생) + **[#769](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/769)**(오류 폭증 시 직원 종 경보 — 실서버 9발 발사로 "8발째 경보 1회·쿨다운" 검증 완료, 안전망 ③). **PO 프리뷰 확인 대기 = [#767](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/767)**(모바일 입장폼·갤러리 폭·뒤로가기·이중접속 정지 — 두 탭 뺏기는 프리뷰 실험으로 재현·검증). 7/14 두탭 사건 재해석: 공유 기기 = **태블릿**(PO 확인, Moon 이름 탭 + Assel 탭). 남은 안전망: ①입장 전 자동점검 ②야간 로봇 통화(PO 승인, 착수 예정). #731 통역 대수술 실기기 테스트 여전히 대기.
- **(2026-07-15 중간저장, 메일 한글깨짐 세션)** ①**Windows 콘솔에서 한글 포함 API 테스트 금지** — 콘솔(CP949) 리터럴 한글 본문은 UTF-8 디코딩에서 U+FFFD로 파괴돼 DB·알림메일에 "���"로 박힘(테스트 문의 4건 실사고, 반성문 #92 — 이제 입력 라우트가 400 거부 + 검사기 §21). 본문은 UTF-8 파일 저장 후 `curl --data-binary @file` 또는 node 스크립트로. 가드 = [#768](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/768)(문의 4라우트) + 후속 [#770](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/770)(증상·소견·AI챗 5라우트 + 증상제출 무증상실패 수리 + 업로드 파일명 세척, PO 승인) — 둘 다 머지·프로덕션 실측 완료(깨진 본문→400 broken_encoding). ②**아래 "서비스 키 죽어있음" 메모는 오진** — 키는 살아있음(오늘 조회·PATCH 정상). 그때 401의 진짜 원인은 `.env.local` 값 끝에 붙은 **리터럴 `\n` 두 글자**: env 파일을 직접 파싱하는 스크립트는 이걸 벗겨야 함(Next.js dotenv는 자동 처리라 앱은 무관).
- **(2026-07-14 중간저장, 화상상담 세션)** 실회의(카자흐 파트너, 한→러 통역 112건 실작동) 로그 분석으로 결함 3종 수리: 인앱 「브라우저에서 열기」 무반응 함정(#760 머지·배포), 권한차단 안내 상주 배너화 + 퇴장시각(left_at) webhook 기록(후속 PR). ~~로컬 `.env.local`의 SUPABASE_SERVICE_ROLE_KEY 는 **회전돼 죽어있음**(REST 401) — 로컬 DB 스크립트 짜기 전에 키부터 갱신할 것.~~ (2026-07-15 정정: 키 정상 — 위 ② 참고)
- **반성문 다음 번호는 반드시 파일 '상단'에서 확인**(최신이 위에 쌓임 — tail/아래쪽은 항상 낮은 옛 번호). 새 중복은 §20이 CI에서 잡아줌. 현재 최신 = #91(타 세션).
- `content-clip-sweep`는 **retries 0 + 스캔률 80% 게이트** — 야간 빨간불이면 ①진짜 잘림 ②프로덕션 접근 장애 둘 중 하나(형해화 방지 설계). goto 타임아웃은 프로덕션 15초/로컬 dev 30초 분기.
- **E2E·문서만 바꾼 머지는 Vercel이 빌드 생략**("Canceled by Ignored Build Step" = 정상, 배포 실패 아님).
- 임시 워크트리용 launch.json 항목은 로컬 전용(git 미추적) — 이번 세션 것들은 정리 완료.

**5. 다음 세션이 먼저 할 일**
1. ⚠️ **직전 미검증분 먼저 확인: `content-clip-sweep` 야간 cron 첫 실행 결과**(2026-07-15 새벽 4시 KST, Production Nightly E2E) — 수동 프로덕션 실행 3회는 통과했지만 cron 환경 실행은 미검증. 빨간불이면 리포트 아티팩트에서 잘림 목록/스캔률부터 판독.
2. (앞선 블록 승계) 앱스토어 결제 여부 확인 → APNs 키·서명 3종·첫 빌드 (2026-07-14 저녁 블록 참고).

**6. 검증 상태**
- ✅ PR #752·#753·#756 전부 **MERGED + CI 초록**(gh 실조회). check:content(§20 포함)·eslint 통과.
- ✅ 프로덕션 실측: 카드 수정 반영(healwith.co.kr/en/hospitals 28카드 넘침 0px) + 전수 스캔 38회 잘림 0건 + 가드 유효성(양성 3경로 적발·음성 1경로 무반응) + 프로덕션 캘리브레이션 3회 통과(2.0~3.5분).
- ⚠️ **미검증**: content-clip-sweep의 **야간 cron 환경 첫 실행**(위 5-1) / 로그인 뒤편 백오피스 잘림(위 3).
- 열린 PR(2026-07-14 밤 실조회): #731·#729·#669·#514 — 전부 타 세션 것, 이 세션 몫 열린 PR 없음.

**7. 다음 세션 첫 프롬프트**
> docs/PROJECT_CONTEXT.md 최상단 읽어. 어젯밤(2026-07-15 새벽 4시) 야간 프로덕션 E2E에서 새 잘림 스캔(content-clip-sweep)이 처음 돌았을 거야 — 그 결과부터 확인해(초록이면 종결, 빨간불이면 아티팩트 판독). 그다음 앱스토어 결제 여부 물어보고 저녁 블록 체크리스트대로 진행해.

---

## 🔖 세션 핸드오프 (2026-07-14 저녁 — 앱스토어 실행 편: Firebase 열쇠 2개 머지 + Codemagic 연결 완료, 남은 건 결제뿐)

**1. 이번 세션 한 일**
- 결제 없이 가능한 계정 작업을 PO와 실시간(스크린샷 왕복)으로 전부 완료:
  - **Firebase**: PO가 기존 프로젝트 `healo`(healo-e3e58)에 Android·iOS 앱 추가(새 프로젝트 안 만듦) → 열쇠 2개를 어시가 검증(번들/패키지·프로젝트 ID 파싱 대조)·배치·머지: `google-services.json` **[PR #757](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/757)** / `GoogleService-Info.plist` **[PR #758](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/758)**.
  - **Codemagic**: PO가 Individual(Personal) 가입 + GitHub 연동 + `HEALO_KHIDI` 연결 — codemagic.yaml 자동 인식까지 실화면 확인. 무료 한도 실측(요금 페이지: 월 500분 맥 M2 — 라이브로드 구조라 연 0~2회 빌드면 충분).
  - 기록: 중간저장 **[PR #759](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/759)** + 체크리스트 3·4번 완료 처리 **[PR #762](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/762)**.
- PO 개념 질문 3건 답변: 우리 앱은 왜 스토어 업데이트가 거의 불필요한가(라이브로드=TV 비유), 남들은 왜 네이티브로 하나(감촉·오프라인·인력 규모 — 대형사도 웹뷰 혼용), Codemagic 무료 여부.
- (문서 사고 수리) 「구글 색인 대청소」 핸드오프 블록의 제목줄이 유실돼 본문이 고아로 남아 있던 것 발견 → 제목줄 복원(보관소 대조로 유일본 확인 후).

**2. 왜 그렇게 했는지**
- Firebase 새 프로젝트를 안 만든 이유: 프로젝트명(healo)은 내부 식별자라 브랜드(healwith) 불일치 무해 — 기존 웹 앱(healo-web)과 공존, 관리 지점 1개 유지.
- "결제 후 Firebase" 계획을 앞당긴 이유: Firebase는 개발자 등록(결제)과 무관한 무료 서비스임을 확인 — PO 여세가 있을 때 계정 문턱을 미리 넘어둠.
- Codemagic 첫 빌드를 일부러 안 돌림: 서명 열쇠(결제 후 발급) 없이는 실패 확정 — 무료 분량 낭비 방지, PO에게도 "버튼 누르지 마세요" 안내.

**3. 안 끝났거나 보류**
- **결제 2건만 남음**(애플 $99/년·구글 $25) — PO가 "나중에 알아서" 하기로. 이게 풀려야 서명 열쇠 3종(ASC API 키·Play 서비스계정·키스토어)·APNs .p8 발급 가능.
- **iOS 푸시 마무리 배선은 첫 Codemagic 빌드 때**: SPM(CapApp-SPM) 구조라 FirebaseMessaging SPM 추가·AppDelegate APNs→FCM 토큰 교환·pbxproj에 plist 리소스 등록(현재 참조 0건)·codemagic.yaml `pod install` 단계 손질 — 상세는 `APP_STORE_LISTING.md` §어시가 할 것.

**4. 주의·함정**
- **iOS는 plist 파일만으론 푸시 안 됨**(안드로이드처럼 자동 인식 없음) — `registerPush.ts`의 token.value가 iOS에선 APNs 원시 토큰이라 FCM 발송이 못 씀. 3번의 배선 전까지 iOS 푸시는 무음 실패가 정상.
- Codemagic **"Start your first build" 누르지 말 것**(서명 없음 = 실패 + 무료분 소모) — PO에게도 안내함.
- 핸드오프 문서 편집 후엔 `## 🔖` 개수와 `**1. 이번 세션 한 일**` 개수 일치를 확인하라 — 이번에 제목줄 유실 사고(원인 미상, 병렬 편집 추정)를 실제로 발견·복원함.

**5. 다음 세션이 먼저 할 일**
1. ⚠️ **PO 결제 여부 확인** → 됐으면: 애플 콘솔에서 APNs 키(.p8) 발급·Firebase 업로드(화면 안내) → Codemagic에 서명 열쇠 3종 등록 → 첫 빌드(iOS 푸시 배선 4종 포함, 컴파일 피드백 기반) → TestFlight·Play 내부트랙 → 심사 제출(`APP_STORE_REVIEW_ANSWERS.md` 복붙). 안 됐으면 하루 요약 리마인드 한 줄만.
2. (앞선 블록 승계) 상세페이지 캐러셀·지도 실기기 확인 리마인드, KHIDI 점수판 데모 4건 삭제(2026-08-27 전 필수).

**6. 검증 상태**
- ✅ PR #757·#758·#759·#762 전부 **MERGED + CI 초록**(gh 실조회, 기억 아님). 설정파일 2개는 내용 파싱 검증(패키지·번들 `kr.co.healwith.app`, 프로젝트 `healo-e3e58` 일치) + `audit:secret` 0건.
- ✅ Codemagic 연결·yaml 인식 = PO 실화면 스크린샷으로 확인.
- ⚠️ **미검증**: 푸시 실수신(계정·빌드 필요 — 결제 후에만 가능), iOS 컴파일(맥 필요). 열린 PR(2026-07-14 저녁 실조회): #731·#729·#669·#514 — 전부 타 세션 것, 이 세션 열린 PR 없음.

**7. 다음 세션 첫 프롬프트**
> docs/PROJECT_CONTEXT.md 최상단 읽어. 앱스토어 건: PO가 애플($99)·구글($25) 결제했는지 물어봐 — 했으면 APNs 키 발급부터 화면 안내로 시작해서 Codemagic 서명 3종 등록 → 첫 빌드(iOS 푸시 배선 포함) → TestFlight까지 가. 안 했으면 리마인드 한 줄만 하고 다른 백로그 진행. Firebase·Codemagic·아이콘·스크린샷·심사답변지는 전부 끝나 있음(APP_STORE_LISTING.md 체크리스트 참고). Codemagic 빌드 버튼은 서명 등록 전까지 누르지 마.

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
