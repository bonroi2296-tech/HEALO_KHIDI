# 원격 브랜치 전수 대조 장부 — 2026-08-30

> 본판 밖 브랜치 44개 중 3일+ 묵은 **41개를 내용 수준으로 전수 대조**한 결과.
> 판정 기준: 브랜치 diff 의 «알맹이»가 (다른 커밋으로라도) 본판에 있는가. 자동저장 잡음(next-env.d.ts 등)은 알맹이로 안 셈.
> 각 브랜치의 마지막 커밋 SHA 를 적어 뒀다 — **삭제해도 SHA 로 복구 가능**(GitHub 는 삭제 브랜치 커밋을 당분간 보존, 로컬 클론에도 남음).
>
> ⚠️ **삭제 집행은 아직 안 됐다 (2026-08-30).** 이 대조를 한 클라우드 세션은 푸시 권한이 자기 작업
> 브랜치로 한정돼 태그 박제·브랜치 삭제가 403/승인장치로 막혔다(능력이 아니라 권한 장치).
> **다음 «로컬» 세션 몫**: 7/28 관례대로 ①`branch-archive-20260830/<이름>` 태그로 박제 후
> ②아래 «삭제» 표의 23개를 원격에서 삭제. 이 문서의 SHA 를 그대로 쓰면 된다.

## ✅ 삭제(잔재 — 알맹이 전부 본판에 있음, 23개)

| 브랜치 | 마지막 SHA | 판정 | 처분 | 비고 |
|---|---|---|---|---|
| `claude/column-analysis-service-improvement-rqbue2` | `85aef4c3c0` | partially_applied | delete_branch | 문서만 남음: ①「2026-08-11 [AI 챗 속도·비용]」 핸드오프 블록(실측 $6.25/30일, 철회 2건 기록) ②PO_PREFERENCES 취향 3건(그림은 완성본 한 장만 / 「완벽?」에 항목 지어내지 마라 / 사람 손 대기 중 주기적 확인 금지). 둘 다 8/11 시점 텍스트로, 8/29 머지 세션이 이미 「낡았다 + CI 대기실 상한 초과」로 판정해 일부러 뺐다. 코드 알맹이는 |
| `claude/elated-meninsky-f3fc9b` | `48746ab822` | fully_applied | delete_branch | 없음 (곁가지 하나만 기록: 브랜치의 «var(--gold-2) 같은 CSS 변수 참조»를 잡는 정규식 1줄은 본판에 문자 그대로는 없다 — 본판 #1487 가드는 색값 리터럴(#c8a96a 등)·Primitives import 를 잡는 방식이라 검출면이 다르다. 다만 취지가 같고 본판 쪽이 실측 검증까지 마친 채택본이며, 원하면 이 브랜치 없이 본판 8-b 에 정규식 1줄 추가로 끝나는 일 |
| `claude/handoff-0827` | `0be1f0e48f` | fully_applied | delete_branch | 없음 |
| `claude/korean-subtitle-removal-uboibp` | `7fcf048827` | fully_applied | delete_branch | 없음 |
| `docs/handoff-0729-auth` | `c2f4607037` | partially_applied | delete_branch | ①세브란스 중입자치료센터 정정 — 단 PO 가 명시적으로 취소했고 본판 CI 가 금지토큰으로 차단 중(합치면 안 됨) ②handoff SKILL.md J절 「나중에 하자」는 반제품으로 남겨라(광고 캠페인 사례) ③PO_PREFERENCES 2026-07-29 취향 2건(「추릴 땐 전체 N/조사 M/실패 K 밝혀라」·「기획도 실측 숫자가 기본값」) + 「docx·PDF 로 내라」 훅 12번.  |
| `docs/handoff-premium-doc-sweep` | `824e66016b` | fully_applied | delete_branch | 없음 |
| `docs/handoff-zerorow` | `0cfa526c0e` | partially_applied | delete_branch | 핸드오프 텍스트 블록 자체(24줄)만 본판에 없다. 그러나 내용물은 낡았다: 수리 5건은 머지·기록됨(POSTMORTEMS #172), user_roles 함정은 8/28 세션이 «이미 해소»로 판정, 대장암 기준가는 본판 가격표에 이미 있음, 「다음 할 일」 3건은 기한 경과(8/20 배포 확인)이거나 후속 세션이 처리, 링크된 지도 문서는 어느 ref 에도 없는 죽은 링크. |
| `docs/nfr03-kz-latency` | `6d6723ddf3` | fully_applied | delete_branch | 없음 |
| `docs/po-pref-0728` | `8b5789fe15` | fully_applied | delete_branch | 없음 |
| `feat/editor-inline-preview` | `ad3e938e07` | fully_applied | delete_branch | 없음 |
| `fix/apple-signup-label` | `d42c9436c2` | fully_applied | delete_branch | 없음 |
| `fix/gate-lang-public` | `81f842669b` | fully_applied | delete_branch | 없음 |
| `fix/idle-logout-device-split` | `6478e8df6a` | fully_applied | delete_branch | 없음 |
| `fix/mobile-notif-and-drawer` | `ecbddad0ff` | fully_applied | delete_branch | 없음 |
| `fix/prod-build-lock` | `6dba759950` | fully_applied | delete_branch | 없음 — 브랜치 내용은 본판에 반영됐고, 반영 안 된 세부(빈 커밋 [deploy] 창구 방식)는 본판에서 실측 후 폐기된 낡은 경로다. |
| `fix/test-domain-robot-inquiries` | `54d5fa2e00` | fully_applied | delete_branch | 없음 |
| `ops/encrypt-legacy-pii` | `4d7159d9c1` | fully_applied | delete_branch | 없음 |
| `work/app-v9-sweep` | `16335f29c8` | fully_applied | delete_branch | 없음 |
| `work/cost-estimate-honest` | `acb2f47791` | fully_applied | delete_branch | 없음 |
| `work/e2e-selfcleanup` | `38a0a4ef54` | fully_applied | delete_branch | 없음 |
| `work/khidi-capture` | `1e7196a369` | fully_applied | delete_branch | 없음 |
| `work/upload-size-limit` | `12aaac99b0` | fully_applied | delete_branch | 없음 — 유일한 차이는 상한 50MB 숫자인데, 본판이 PO 결정으로 200MB로 올린 상태라 브랜치 쪽이 오히려 낡은 값이다. |
| `work/verify-main` | `859cf01c01` | fully_applied | delete_branch | 없음 |

## 📤 알맹이 회수 대상 (13개) — 브랜치 통째 머지 불가(충돌·금지토큰), «내용만» 회수

> 이 세션(#1541)이 회수한 것: ict6 의 cron 배선(cherry-pick) · 통계 4종 · 면역병원 정정 · .gitignore 병원자료 · 태블릿 스크린샷 규격 · GA4 자가진단 · 인수인계 블록 7개 · 옛 톤 변수참조 가드. 회수가 끝나 잔재가 된 브랜치는 다음 정리 때 삭제.

| 브랜치 | 마지막 SHA | 판정 | 처분 | 본판에 없던 알맹이 |
|---|---|---|---|---|
| `docs/handoff-0807-store-gates` | `b058710a17` | partially_applied | create_pr | ①2026-08-07 [스토어 등록 관문 점검] 세션 종료 핸드오프 블록 전체(애플 자가 전환 창구 발견·「던스 또는 사업자등록 서류」 문구·케이스 20000130848057 접수 경위·ASC 로그인 별개 함정·apple-review-info 기억 정정) — 본판 두 파일 모두 부재. ②CLAUDE.md 반복 확정 규칙 2의 보강 한 줄: 「남에게 부탁해야 한다」고 단정하기 전에 그 서비스  |
| `claude/header-whitespace-issue-cwju0h` | `ad298267eb` | partially_applied | create_pr_after_conflict_note | ①PO 취향 2건(PO_PREFERENCES): 결정·사정은 여러 세션에 말로 퍼뜨리지 말고 문서 한 곳에 적어라 / 배포 얘기는 「마지막 배포 시각+그 뒤 쌓인 건수+다음 창구 반영 여부」 3칸 한 묶음으로. ②[#1287] 기록 + 「안전장치를 만들 땐 자동 실행과 사람 손누름을 갈라라」 교훈, [#1284] 문서 교정 기록. ③vi.mock 으로 휴무 모듈 고정·Vitest4 vi.fn |
| `claude/multi-session-work-issues-s9evvw` | `25b4a652d3` | partially_applied | create_pr_after_conflict_note | 텍스트 3블록: ①[병렬 세션 진단] 세션 핸드오프 블록(한 일·왜·함정 — mergeable_state dirty 함정, gh 없는 환경 등 실전 교훈 포함) — 본판 archive에 넣을 것 ②docs/rules/SELF_QA.md 「PO가 진짜야?라고 물으면 — 약속하지 말고 그 자리에서 만들어 실증하라」 규칙 3줄 절 ③docs/PO_PREFERENCES.md 2026-07-29 분류 |
| `docs/ga4-console-verify` | `8341117118` | partially_applied | create_pr_after_conflict_note | ①자가진단 «초록불 거짓말» 구멍 차단 코드: src/lib/ga.ts probeGaEndpoint()(no-cors 로 수집 주소 도달 확인) + app/GaDebugBadge.jsx 「수집 주소」 판정 줄·「대기줄에 실림」 문구 정직화 ②docs/GA4_SETUP.md 콘솔 실제 화면 교정 5곳(+AdGuard §2-1, 크롬 DNS 캐시 비우기) ③docs/PROBELLE_MEASURE |
| `docs/handoff-0814-apps` | `e42dc3a995` | partially_applied | create_pr_after_conflict_note | ①2026-08-14 [앱 등록 점검] 세션 핸드오프 블록 전체(73줄) — 스토어 상태 전수 실측, 실기기 사고 4건 수리 경위, 🔴 함정 2건(captureInput 되살리지 마라 / 「앱에서만 난다」면 웹뷰 설정부터), 테스트 상담방 정보. ②PO_PREFERENCES 교훈 2건: 「그래도 되게 해야지 — 환경 탓 진단 금지」·「PO 의 질문을 지시로 읽어 배포 창구를 당긴 사고」. ③ |
| `docs/handoff-0815-b` | `8d592818c0` | partially_applied | create_pr_after_conflict_note | docs/PROJECT_CONTEXT.md의 「📌 2026-08-15 ② — 세션 마무리: 『자꾸 빼먹는』 원인을 기계로 막음 + 최종 실측」 인수인계 블록 37줄. 고유 알맹이: #1398(세션 종료 인수인계)·#1399(작업본 안 인수인계 자동표시) 신청서 기록, check-branch-handoffs.mjs 탄생 경위(같은 실수 3회 → 문서로는 안 막혀서 기계로 박음, 첫 실측 9개  |
| `docs/ict6-handoff` | `7dd8e4b40a` | partially_applied | create_pr_after_conflict_note | app/api/cron/purge-recordings/route.ts 커밋 7dd8e4b4 (+51줄) 하나: 매일 도는 녹화 파기 cron 에 「is_test=true + 기계 흔적(시험 도메인·AI 자가시험 승격분) + 30일 초과 + KEEP 목록(#17·#39·#86·#216) 제외」 문의를 purgeInquiriesDeep 로 치우는 단계를 결합. 청소 실패가 녹화 파기 결과를 죽이 |
| `feat/advanced-treatments` | `6cc8c08942` | partially_applied | create_pr_after_conflict_note | 유효한 알맹이 = 통계 숫자 최신판 교체: 암 5년 생존율 72.9%(2018–2022)→73.7%(2019–2023) — insurance copy 6개 언어·ru 랜딩·dictionary careJourney / 위암 78.4→78.6% / 미국 대비 절감 60~80%→40~60%(과대 주장 교정) / 의료품질 "Top 10"→"CEOWORLD 지수 2025 세계 2위" — 전부 본판이  |
| `fix/nightly-lang-skip` | `f1100efa2a` | partially_applied | create_pr_after_conflict_note | ① .gitignore 에 `_병원자료/` 차단(환자 얼굴 든 병원 원본자료가 공개 저장소에 실수로 올라가는 것 방지, `git add -f` 금지 주석 포함) ② docs/PO_PREFERENCES.md 분류 대기실 2026-07-29 취향 2건: [말투] 외부 콘솔(스토어·빌드·결제) 작업 보고엔 PO가 직접 열어볼 주소+대조 고정값을 같이 낼 것 / [문서] 담당 범위 밖 발견은 한 줄 |
| `fix/push-notification-icon` | `f2c0397a6d` | partially_applied | create_pr_after_conflict_note | ①야간 로봇 통화 시험을 「신고한 언어=실제 소리」로 맞춘 개조(러시아어 말소리 파일, 로봇별 브라우저 분리, 자막 판정기 captionScript+시험 7건) — 지금 시험은 러시아어라 신고한 로봇이 한국어를 말해 「자막 지어냄」을 못 잡는 상태 그대로다. 단 이 개조 자체는 끝까지 돌려본 적 없음(브랜치 기록). ②KHIDI 성과 숫자를 그 자리에서 다시 세는 도구(npm run khid |
| `work/app-install-link` | `089e78ef6d` | partially_applied | create_pr_after_conflict_note | ①DEPLOY.md 규칙 절 「밖으로 뿌리는 것은 회수 안 해도 되게 — 주소 고정 + 뒤에서 갈아끼움(/app, NEXT_PUBLIC_PLAY/APP_STORE_URL)」 — 지금도 유효(그 env·/app 구조가 본판에 그대로 살아 있음). ②PO_PREFERENCES 대기실 [규칙] 「돈 나가는 결정은 선행조건 실측 + 실행 시점까지 같이」 — 지금도 유효. ③2026-07-29 핸드오 |
| `work/appstore-tablet-shots` | `b3495b68f5` | partially_applied | create_pr_after_conflict_note | scripts/appstore-screenshots.mjs 한 파일, +19줄: ①iOS 아이패드 13형 규격(2064×2752 — 애플이 「심사에 추가」를 막는 필수 규격) ②구글 플레이 태블릿 7"/10" 규격(1080×1920·1440×2560, 별표 필수) ③태블릿은 isMobile 끄고 iPad UA 사용(안 끄면 「늘린 폰」으로 찍힘). iPad 그림 4장은 이 브랜치 스크립트로  |
| `work/handoff-0729-cmd` | `559305c7b1` | not_applied | create_pr_after_conflict_note | ①2026-07-29 [커맨더 2부] 세션 핸드오프 기록 전체(KHIDI 집계가 kpi.ts 와 conversion-funnel 두 군데서 조건이 다르다는 함정, 실적 구멍 3개 수리 경위, countState.ts 신설 배경, 미검증 3건) — 본판 아카이브가 «본판에 없는 인수인계»라고 지목해온 바로 그 블록. ②말투 훅 규칙 「내 실수를 무용담처럼 실시간 중계하지 말고 조용히 고쳐 한  |

## ⏸ 그대로 둠 (5개) — PO 결정·검토 대기 영역

| 브랜치 | 마지막 SHA | 판정 | 처분 | 이유 |
|---|---|---|---|---|
| `claude/cloud-hospital-business-model-ft66ln` | `9254dac825` | not_applied | leave_alone | ①B2B 병원 판 시험판 전체(콘텐츠 +112KB·사진 22장·영상 9개·demoGate·테스트 5벌·비급여 16개 전수대조) — PO가 "나중에 꺼내 쓸 재료"로 보존 지시한 것이라 미합류가 정상. ②핸드오프 원문·반성문 #162~#164 — 본판엔 요약+포인터만 있고 원문은 이 브랜치에만 있다(브랜치 지우면 포인터가 끊긴다). ③유일하게 지금도 유효한 실서비스 알맹이: /hospitals |
| `docs/fix-43-preconsult` | `2573ee0a0d` | not_applied | leave_alone | 2026-08-18 정정 블록 전체: 「사전상담 43건」의 정체 = 야간 자동 검사 방 + 7/28 시험 일괄(전부 is_test=true), 실상담은 문의 #60 1건뿐 → PO 정리 작업 불필요 판정 + 근거 SQL + 「K-02 실적 증대 경로는 플랫폼 밖 상담 소급 등록」 안내. 본판 KNOWN_ISSUES.md·PROJECT_CONTEXT.md 둘 다 옛 「PO 가 정리하기로」 상태 |
| `docs/handoff-0803-deploy` | `6c144ea80b` | partially_applied | leave_alone | 클라이언트측 PDF 사전 압축(8MB 이상 PDF 를 올리기 «전» 브라우저에서 축소 + 「파일 줄이는 중/올리는 중」 2단계 진행 표시): src/lib/uploadAttachment.js 의 onStage·maybeCompressPdf 호출, app/patient/documents/DocumentsClient.jsx·app/coordinator/inbox/[id]/CoordinatorIn |
| `docs/handoff-seo-kz` | `29eb5038cc` | partially_applied | leave_alone | ①2026-08-20 [카자흐 검색 노출] 세션 종료 핸드오프 블록 전문 — 특히 「왜 두 달간 안 고쳐졌나」 5단계 원인 분석, 얀덱스 「사이트 지역=카자흐스탄」 신청 기록, 색인 요청 12건·재크롤 150건 실측, 백링크 후보 상세(visitseoul·ktpa). ②PO_PREFERENCES 신규 항목 2건: 「원인 규명 완료」엔 어떤 질문에 대한 완료인지 범위를 적어라(2026-08-2 |
| `work/patient-bo` | `32f89fa0d1` | partially_applied | leave_alone | ①마이페이지 전면 재구성 1차 시안 — 회원 홈 = 케이스 진행상황(비회원 ClaimClient 부품 재사용) + 단계별 도구(타일 6개 상시 노출 폐지) ②환자 화면 「번역해서 보기」 단추 제거(눌러도 바뀔 게 없던 단추) ③「제2 의료소견서」를 화면에 글로 그리던 것 제거 — 공식 문서로만 전달(claim/route.ts 의 opinions 응답 제거 포함). 모두 PO 검토·다듬기 대기 |

### ⏸ 항목별 한 줄 이유
- `claude/cloud-hospital-business-model-ft66ln` — PO 가 «나중에 꺼내 쓸 재료»로 보존 지시(B2B 병원 판). 유효 알맹이 1건(면역병원 통계 정정)은 이 세션이 회수 완료.
- `docs/fix-43-preconsult` — 사전상담 43건은 PO 가 «내가 정리한다» 한 영역. 단 이 브랜치의 8/18 실측은 «43건 = 시험 방, 정리할 것 없음»이라고 말한다 — PO 확인 필요(보고에 올림).
- `docs/handoff-0803-deploy` — PDF 사전 압축 코드가 미완성(의존 모듈 compressPdf 가 미커밋이라 브랜치에도 없음). 살리려면 새로 만들어야 한다.
- `docs/handoff-seo-kz` — 기록 가치 있는 원인 분석이 있으나 작업 지시부가 낡음. 필요 시 두 불릿만 따서 회수.
- `work/patient-bo` — 마이페이지 재구성 «시안»이라 PO 검토가 먼저다.

