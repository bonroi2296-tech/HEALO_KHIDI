# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

---

## 🔖 세션 핸드오프 (2026-07-06 낮~저녁 — 주말 정리 + PO 결정 일괄 처리: notes 암호화 완결·2인 레이아웃·#562 초청장·#658 튕김수리 + webhook 최초 등록 + 루프 전면 정지)

> PO 출근 준비 세션("금토일 작업 정리 + 본격 작업 준비"). 주말 요약 → PO 버튼 결정으로 보류 3건 전부 착수·완결 + 테스트 상담방 삭제 + 미머지 PR 4건 머지(#654·#567·#562·#658) + 유실 전수조사(0건). **오후 PO 지시로 자동 루프 전부 정지.** ⚠️ **다기기 테스트는 직원 퇴근으로 2026-07-06 미실시 — 연기**(아래 5번).

**1. 이번 세션 한 일**
- **PR #654 ✅ 머지·프로덕션 배포·재검증 완료 (2026-07-06 오후)** — ①상담 notes 암호화(AES-256-GCM, `src/lib/khidi/consultationNotes.ts` 신설, 기존 평문 행은 조회 시점 "기회주의적 백필"로 이전 — 이 환경엔 키 없어 일괄 변환 불가) ②#612 감성 (a)(b): 데스크톱 1:1 반반분할 + 세로영상 blur-fill(같은 트랙을 뒤에 blur+cover로 한 장 더 — 방향 감지 불필요). 독립 리뷰 게이트 통과(CONFIRMED 0) + PLAUSIBLE 2건 반영(구형 iOS matchMedia 폴백·복호화 실패 로그 마커). 배포 후: health ok·홈/inquiry/telemedicine 200, **신규 메모 2건 암호문 저장 실측** — 평문 잔존 5건(어드민 상담 목록 1회 열람 시 자동 이전).
- **Assel 코디 계정 생성·로그인 검증 완료 (PO 지시)**: `assel@healwith.co.kr` / 임시비번 PO에게 채팅 전달 / app_metadata.role=coordinator. auth API 실로그인으로 role 반환 확인. `/admin/staff` 생성 로직과 동일 형태(SQL 직접 — 이 환경엔 service key 없음).
- **LiveKit webhook 최초 등록 (PO 직접)**: 옛 주소 교체가 아니라 **한 번도 등록된 적 없었음**(이벤트 0의 진짜 원인). `https://healwith.co.kr/api/livekit/webhook` + Signing key `healo`(APIt2fLT4qDAAxi). 첫 실통화 때 Vercel 로그 `[livekit/webhook]` 수신 확인 필요(서명 불일치면 `signature or parse failed` 워닝).
- **테스트 상담방 2개 삭제 완료**(PO 버튼 승인): 50d5bc43…·aa9804ee… 세션 2+게스트토큰 3, 딸린 기록 없음 확인 후 삭제.
- **PR #567 ✅ 수리 후 머지·배포 완료**: main 합류(5일치) → 새 가드 `check:schema-refs`가 `partner_outreach` 미등록으로 실패 → 스냅샷 등록. 스모크 1회 실패는 재실행으로 통과(flaky 판별 — 동시간 #654 동일 스위트 통과가 근거). 파트너 발굴 화면 코디·어드민에 열림.
- **다기기 테스트 준비 확인**: 초대 링크(상담방 87710d1d) 7/10까지 유효.
- **(저녁 추가) PR #562 ✅ 머지·배포**: 초청장 = 면력한방병원(등록 유치의료기관) 명의 + 본로이 공동. main 5일치 병합 시 문서 충돌은 본판 채택(코드 자동 병합).
- **(저녁 추가) PR #658 ✅ 머지·배포·PO 실화면 검증**: 권한 없는 계정이 /admin 딥링크 진입 시 "말없이 /login 튕김"(PO 실사고 — 코디 계정으로 '로그인이 안 되는 줄') → proxy.ts 에서 로그인O·권한X 는 신설 `/no-access` 안내 페이지로, 미로그인만 /login(딥링크 보존). 독립 리뷰가 1차 수정(클라이언트 게이트)이 프로덕션 죽은코드임을 CONFIRMED로 잡아 미들웨어로 이전 + open-redirect `/\` 우회 차단 보강. **PO가 코디 계정으로 실서비스에서 안내 화면 직접 확인.**
- **(저녁 추가) notes 암호화 100% 완결 실측**: PO가 관리자 계정으로 /admin/consultations + 「전체」 탭 열어 백필 완료 — **DB 실측 평문 0건 / 암호문 7건**.
- **(저녁 추가) 유실 전수조사 + 브랜치 정리**: PO "뒤지면 안 한 게 나온다" 제보 → 원격 브랜치 205개 merge-tree 시뮬레이션 전수조사 = **main 유실 작업 0건 확정**(의심 3건 전부 이미 반영 확인). 원인 = squash 머지 잔여 브랜치 182개의 착시. GitHub "Automatically delete head branches" 설정 PO가 켬(재발 방지). 182개 삭제는 PO 승인받았으나 **이 원격 환경이 삭제를 3중 차단**(git 중계 403 + 안전 분류기 2회) → 보류. 삭제 목록 파일은 PO 채팅에 전달됨.

**2. 왜 그렇게 했는지**
- notes 백필을 "조회 시점"으로 한 이유: 서버(Vercel)에만 ENCRYPTION_KEY_V1 이 있고, 어드민 상담 목록이 매일 열리므로 수일 내 자동 전량 이전 + 이후 no-op. `.is("notes_encrypted", null)` 가드로 동시 요청 이중 변환 방지.
- blur-fill 을 방향 감지 없이 한 이유: 가로 영상은 앞장(contain)이 타일을 꽉 채워 뒷장이 안 보임 — 감지 로직 자체가 불필요.

**3. 안 끝났거나 보류**
- ⏸ **자동 루프 전부 정지 (2026-07-06 오후 PO 지시)**: ①이 세션 자가 점검 예약 비활성화 ②「사고·품질 순찰 루프(2시간)」 cron(trig_01PEotorQfbx6AmitLRnmPr6) — 타 세션 바인딩이라 정지 불가 → **삭제**(직전 AI루프 세션 핸드오프의 "못 끈다" 잔여 건도 이걸로 해소). 재개 시 create_trigger 재생성: "정기 순찰(소넷 위임): 핵심 경로 스모크(홈·/inquiry·/hospitals 200)·Vercel 런타임 에러·audit ERROR, 이상 없으면 안전 백로그 1건(비시각·자동검증만), 돈·삭제·PII·보이는 UI 금지, 보고는 하루 1회". **PO가 "루프 다시 켜"라고 하기 전까지 새 루프·자가점검 예약 금지.**
- ⏸ **다기기 화상 테스트 연기 (2026-07-06 직원 퇴근)**: 초대 링크는 상담방 87710d1d, **2026-07-10 만료** → **7/7(화)~7/9(목) 중 진행 필요**. 실서비스에 새 반반분할 화면이 이미 배포돼 있어 그 화면으로 검증됨. 만료 임박 시 링크 재발급 가능.
- ⏸ **옛 브랜치 182개 삭제 보류**: PO 승인은 받았으나 원격 환경이 삭제 차단(403+분류기). 자동삭제 설정으로 더는 안 쌓임 — 서비스 영향 0, 급하지 않음. 로컬 Claude Code 쓸 일 있을 때 목록대로 삭제.
- 잔존: 게스트토큰 E2E 스펙 고정 실패 / PR #514(사업계획서) PO 검토 대기(마지막 남은 열린 PR).

**4. 주의·함정**
- notes 는 이제 **API 경유로만 읽어라** — DB 직접 조회하면 암호문. `[TEST]` 마커 판정은 저장 전 평문에서 하므로 동작 불변.
- 상담방 화면(page.jsx)의 `useIsDesktopViewport`는 iOS 13 이하 폴백(addListener) 포함 — matchMedia 새 API만 쓰면 구형 폰에서 상담방이 죽는다.

**5. 다음 세션이 먼저 할 일**
1. ⚠️ **직전 미검증분 먼저 (다기기 테스트가 연기돼 둘 다 대기 중)**: ①2인 반반분할·blur-fill 육안 ②LiveKit webhook 첫 수신(통화 후 Vercel 로그 `[livekit/webhook]` / 서명 실패 워닝 여부) — **둘 다 첫 실통화(다기기 테스트) 때 확인됨. 링크 7/10 만료라 7/7~7/9 중 테스트하도록 PO 보채기(보채기는 PO가 요청한 서비스).**
2. 다기기 테스트 결과 판독(실패 기기 = admin_audit_logs CONSULTATION_CLIENT_ERROR).
3. (7/6 GSC 점검 세션) **구글 서치콘솔 /about '리디렉션 오류' 재검증 결과 확인**(7/6 재검증 시작, 수일 소요) — 나머지 전수점검 이상무(색인 68p·보안·HTTPS·수동조치 ✅), 미사용 소유권 토큰(석민 계정 DNS 열쇠)은 GSC+가비아에서 제거 완료(소유권 bonroi2296 단일화, PO 직접 클릭). NOINDEX 1건은 비공개 치료(item-슬러그 3행, is_published=false)라 정상.
4. ~~notes 백필 확인~~ → **완료**(2026-07-06 저녁 평문 0 실측). ~~Assel 계정~~ → **완료**.

**6. 검증 상태**
- ✅ 2026-07-06 머지 4건 전부 CI(ci+스모크) 초록 확인 후 머지: #654(vitest 501·독립리뷰 CONFIRMED 0)·#567(스모크 flaky 재실행 통과)·#562·#658(독립리뷰 2라운드 — 1차 CONFIRMED를 미들웨어 이전으로 해소, 재리뷰 clean). 프로덕션 health ok·핵심 페이지 200 재검증.
- ✅ notes 암호화: DB 실측 **평문 0 / 암호문 7** (2026-07-06 저녁). `/no-access` 안내 화면 PO 실사용 검증.
- ✅ 열린 PR 실확인(기억 아님, API 조회): **#514 하나뿐** (PO 검토 대기).
- ⚠️ **검증 못 함**: ①2인 반반분할·blur-fill 육안 ②webhook 첫 수신 — 다기기 테스트 연기로 대기(5-1로 승격).

**7. 다음 세션 첫 프롬프트**
> docs/PROJECT_CONTEXT.md 최상단 읽어. 다기기 테스트가 아직이면 링크 만료(7/10) 전에 하자고 PO를 보채고, 테스트가 끝났으면 결과 판독(CONSULTATION_CLIENT_ERROR 로그) + webhook 첫 수신(Vercel 로그) + 2인 반반분할 육안 피드백까지 확인해. 자동 루프는 PO 지시로 전부 정지 상태 — "다시 켜"라고 하기 전까지 만들지 마라.

---

## 🔖 세션 핸드오프 (2026-07-06 — 기억 시스템 3종 보강: 중간 저장 규칙·주간 문서 건강검진(/doc-health)·반성문 재발 추적, PR #645 머지)

> PO가 "기억상실 없이 어시스턴트를 최적화하려면?"을 물어 시작된 **메타(운영 시스템) 세션**. 어시스턴트가 구멍 4개를 제시 → PO가 버튼으로 3건 승인(2026-07-05) → 구현·검증·머지까지 완료. 화상·AI루프 트랙(아래 블록들)과 별개.

**1. 이번 세션 한 일**
- **PR #645 (머지, main 반영)** — 기억 시스템 3종:
  - ①**중간 저장 규칙**(CLAUDE.md): 세션 도중 PO 결정·머지·중요 발견이 나오면 즉시 PROJECT_CONTEXT 해당 칸만 갱신·커밋(세션 중도 사망 시 "왜" 증발 방지).
  - ②**주간 문서 건강검진**: `/doc-health` 스킬 신설(`.claude/skills/doc-health/SKILL.md`) + `session-orient.sh`에 7일 경과 리마인드 + 기준선 로그 `docs/audit/DOC_HEALTH_LOG.md`.
  - ③**반성문 재발 추적**(POSTMORTEMS.md·CLAUDE.md): 새 반성문 전 같은 부류 검색 → 재발이면 「🔁 #NN 부류 재발」 표시 + 뚫린 가드 보강 의무. 재발률 = 기억 시스템 성적표(/doc-health가 주간 집계).
- 자동머지 절차 준수: 독립 리뷰 에이전트(작성 맥락 미공유) PASS + CI(ci·Smoke) 초록 확인 후 squash 머지.

**2. 왜 그렇게 했는지**
- PO 질문("몇년차 개발자냐")에 "폭은 시니어, 기억력 0년차 — 시스템이 갭을 메꾼다"고 답한 데서 출발: 남은 구멍은 ①세션 중도 사망 시 결정 기억 증발(당일 세션 시작 시 "핸드오프 이후 커밋 9개 미기록" 경보가 실증) ②문서 부패 무감지(#63-④ 문서-현실 드리프트 재발 위험) ③"재발 방지"가 실제 작동하는지 무측정.
- 제시한 4개 중 "PO 브리핑 덤프 습관"(미팅 결과를 어시에게 던지기)은 도구가 아니라 PO 습관이라 구현 대상에서 제외 — PO에게 안내만 함.

**3. 안 끝났거나 보류**
- **/doc-health 첫 정식 검진 미실시**: 기준선 로그만 만들었음(구축일이라 전수 검진 생략). 2026-07-12 이후 세션 시작 훅이 알림을 띄우면 그때 1회차 실행.
- 독립 리뷰가 발견한 기존 문제: **POSTMORTEMS.md에 반성문 번호 중복(#60·#61·#62가 각 2번)** — 「🔁 #NN 재발」 참조가 모호해짐. 첫 /doc-health 검진 때 번호 정리.

**4. 주의·함정**
- 리마인드는 `DOC_HEALTH_LOG.md` **최상단** `## YYYY-MM-DD` 날짜를 읽는다 — 새 검진 엔트리를 아래에 붙이면 알림이 안 꺼진다(반드시 안내문 바로 아래=최상단에 추가).
- 리마인드 로직의 침묵 실패 모드: 날짜 형식이 깨지면 알림이 조용히 꺼진 상태가 된다(세션 시작은 절대 안 깨뜨리는 안전 설계의 대가). 형식은 스킬 문서의 템플릿 그대로 쓸 것.
- 이 세션 작업본(브랜치 `claude/dev-experience-assessment-izqecc`)은 #645 squash 머지 후 origin/main 기준으로 리셋됨(이 핸드오프 커밋만 얹힘).

**5. 다음 세션이 먼저 할 일**
1. ⚠️ **직전 미검증분 먼저**: /doc-health 스킬 실전 1회 미실행(리마인드 발동/비발동만 검증됨) — 2026-07-12 이후 알림 뜨면 1회차 검진 실행하며 스킬 지시문이 실제로 굴러가는지 확인 + POSTMORTEMS 번호 중복(#60~#62) 정리.
2. 화상·AI루프 트랙 큐는 아래 두 블록 참조(다기기 테스트 확인 등 — 이 세션과 별개 트랙).

**6. 검증 상태**
- ✅ PR #645 CI 초록(ci·Smoke Tests) → squash 머지 → main 반영 확인. `check:content` 통과. 훅은 `bash -n` + 실행 + 독립 리뷰 에이전트가 8개 상황(빈 파일·날짜 없음·미래/불량 날짜·CRLF 등) 픽스처로 실행 검증(전부 exit 0, 세션 시작 못 깨뜨림 확인). 리마인드 발동(15일 경과 시뮬)·비발동(당일) 실측.
- ⚠️ **검증 못 함**: /doc-health 스킬 본문의 실전 검진 플로우(첫 실행이 곧 검증), 다음 실세션에서 훅 리마인드가 7일 후 실제로 뜨는지(로직상 확인만).

**7. 다음 세션 첫 프롬프트**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 읽어. 세션 시작 훅에 "문서 건강검진 기한 경과" 알림이 떠 있으면 /doc-health 1회차 검진을 실행하고(스킬 지시문 실전 검증 겸), 그때 POSTMORTEMS.md 번호 중복(#60~#62 각 2번)도 정리해. 알림이 없으면 화상·AI루프 트랙 큐(아래 핸드오프 블록들)를 이어가.

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
