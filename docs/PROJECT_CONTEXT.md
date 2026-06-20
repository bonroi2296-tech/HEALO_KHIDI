# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

---

## 🔖 세션 핸드오프 (2026-06-20 저녁) — 제3자 전체 감리(ISO/IEC 25010) + 실측도구 도입 + 접근성 위반 0 + 보안 핫픽스 (PR 8건 머지·배포)

**이번 세션 한 일 (전부 main 머지·배포 완료):**
- **#109 KPI 스냅샷 cron 자가복구 백필(`upsertRecentSnapshots`)**: Vercel cron이 최선노력이라 가끔 하루를 거름(실측: `kpi_snapshots`에 06-16·06-19 누락). 매 실행마다 최근 7일을 idempotent 백필 → 빈 칸 자동복구 + canary(#107) 7일 커버리지. 부수로 **KPI cron이 실제 매일 도는 것 DB로 확정**(`computed_at` 매일 15:0x UTC). 순수함수 `recentSnapshotDates` 분리+단위테스트. POSTMORTEMS #8.
- **#111 AI 빈 응답(빈 말풍선) 핫픽스**: PO 스크린샷 — 모델(`gemini-flash-latest`)이 빈 텍스트 반환 시 그대로 저장돼 빈 풍선 노출. `generateReply.ts`에 **빈답 최종 안전망**(6언어 안내 + `error=empty_model_text`) + `maxOutputTokens 1024→2048` + finishReason 로깅.
- **#110 보안 권한우회(IDOR) + 접근성·다국어**: `symptoms/alerts` 스태프 게이트(환자가 남 증상알림 보던 IDOR 차단)·`khidi/followup` error.message 노출 제거·`public/chat/resume` rate limit·`consultation-reminders` `https://undefined` 버그. + 퍼널/전역 접근성 기본기(폼 라벨·skip링크·키보드)·상담초대 이메일 zh·ja. POSTMORTEMS #9.
- **#113 cron 비밀키 클라이언트 노출(HIGH) 제거**: 어드민 회귀화면이 `NEXT_PUBLIC_CRON_SECRET`로 cron 직접호출 → 비밀키가 번들에 노출됐음. 회귀로직을 `src/lib/chat/regressionRunner.ts`(server-only)로 추출 + **신규 관리자 인증 라우트** `app/api/admin/khidi/run-regression`로 감쌈. 죽은코드 `feedbackLoop.ts` 삭제. `check:content`에 `NEXT_PUBLIC_*SECRET` 금지 가드. POSTMORTEMS #10.
- **#117·#121 실측 감리 도구 + 접근성 위반 0**: `npm run audit:secret`(시크릿)·`audit:deps`(npm audit high+)·`audit:a11y`(axe-core)·`audit:lighthouse`. CI(`ci.yml`)에 secret·deps 게이트, 신규 `audit-live.yml`(매주+수동, 프로덕션 대상 axe+Lighthouse 실측→아티팩트). **접근성 실측 critical 7→0 / serious 168→0**(button-name·aria-prohibited-attr 수정 + 브랜드 teal/emerald/red 다크닝 600·500→700, PO 옵션1 승인). 증거: `docs/audit/AUDIT.md`.

**왜 그렇게 했는지:**
- 시작은 직전 미검증 확인(KPI 대시보드/Sentry/cron)이었는데, 파다가 **PO가 "전체 시스템 감리"를 요청** → ISO/IEC 25010(TTA GS인증 토대)+OWASP+KWCAG로 7축 자가진단(점수표). 그 뒤 PO가 **"제대로 기준 정해 감리한 거 맞냐"**고 추정점수의 신뢰성을 지적 → **표준 도구 실측으로 전환**(axe·Lighthouse·시크릿·npm audit)이 핵심 전환점.
- 색상대비 161건이 브랜드 `teal-600`(3.3:1)이라 DESIGN.md 헌법색과 충돌 → PO에게 옵션 제시 후 **옵션1(teal-700 다크닝) 승인** 받고 전수 치환.
- 보안 IDOR·cron키는 평가 전 꼭 막아야 할 실제 구멍이라 우선 처리. cron키는 PO가 #1로 지정.

**안 끝났거나 보류:**
- **⚡ 성능(Lighthouse)**: 이 작업 샌드박스는 프록시 망 제약으로 lighthouse 로컬 실행 실패 → **`audit-live.yml`이 CI(깨끗한 망)에서 매주 프로덕션 실측**하게 해둠. **첫 실행 결과(perf/LCP 숫자)를 다음 세션이 확인**하고 이미지(병원사진 3MB대 다수·`next/image` 미적용)·번들·LiveKit 즉시로딩 개선 착수.
- **#2 메신저 채널 "준비 중"**: Telegram·LINE·WeChat env URL 미설정 → 문의 퍼널에 회색 "Coming Soon". **PO가 Vercel env에 URL 넣어야 켜짐**(어시스턴트 불가).
- **followup inquiry 소유권 검증**(IDOR 잔여, 소유모델 모호)·**God 컴포넌트(2900줄)·any 807·내부 어드민 접근성**: 고위험/범위 밖으로 보류.
- 정식 정보시스템 감리 전범위(DB설계·문서·요구사항추적)는 안 봄 — 소프트웨어 품질+보안+접근성만.

**주의·함정:**
- **이 저장소에 다른 claude 세션들이 동시 작업 중**(원격 브랜치 다수: ai-chat-reply-fix·competitor-review·service-analysis 등 + #115·#116·#118 머지됨). 머지충돌 가능 → 작업 전 `git fetch origin main && git merge`로 최신화. 이번에도 #118(KPI 순수함수)과 `kpi-dashboard/page.jsx` 1줄 충돌나 양쪽 살려 해결함.
- **자동저장 훅이 작업 중 커밋·푸시**해 브랜치 HEAD SHA가 자꾸 바뀜 → CI가 중간커밋에 안 붙는 일 있었음. 머지 전 최신 HEAD CI 초록 확인할 것.
- **접근성 0은 "공개 7페이지(/en·treatments·hospitals·telemedicine·care-journey·faq·/ru)" 기준.** 다른 세션이 새로 추가한 페이지(ad-budget·cost-calculator 등)나 내부 어드민은 미측정 → 다음 `audit-live.yml` 실행이 잡아줄 것.

**다음 세션이 먼저 할 일 (우선순위):**
1. **⚠️ 직전 미검증분 먼저 확인 (관리자 로그인 필요 — 환경상 내가 못 함):** (a) **KPI 대시보드**: `/admin/khidi/kpi-dashboard`에 유치 4/12·사전상담+사후관리 12/120·만족도 뜨는지(숫자·로직 검증됨, 픽셀만). (b) **Sentry 실전송**: 관리자로 `https://healo-khidi.vercel.app/api/sentry/test` 1회→JSON. (c) **어드민 "지금 실행" 버튼**: `/admin/khidi/ai-regression`에서 회귀테스트 트리거 — #113로 인증경로가 cron비밀키→관리자세션으로 바뀜, 정상 동작하는지 클릭확인.
2. **`audit-live.yml` 첫 실측 확인**: GitHub Actions에서 수동 실행(workflow_dispatch) 또는 매주 월 16:00 UTC 자동 → 아티팩트의 **Lighthouse 성능 점수·LCP** 확인 후 이미지/번들 개선 착수.
3. (보류) #2 메신저 채널 env / God 컴포넌트 분할 / any 축소 / 내부 어드민 접근성 / 화상방 라이브검증 — PO 동석·env 가능할 때.
4. KHIDI 중간평가(2026-08-27) 상시 — 이번 실측 감리는 평가 정성(ICT 자가관측·품질관리 체계) 직결.

**검증 상태:** PR **#109·#111·#110·#113·#117·#121 전부 CI(`ci`·`Smoke`) 초록 + squash 머지·배포 완료**(GitHub MCP check_runs로 확인). 접근성 **axe-core 실측 critical 7→0·serious 168→0**(배포 프리뷰 7페이지 재측정). 시크릿 0·npm audit high/critical 0. 로컬 tsc 0/check:content/audit:secret/next build 통과. **❌ 미검증(관리자 로그인 필요, 내 환경 불가): KPI 대시보드 화면 / Sentry 실전송 / 어드민 회귀버튼 — 셋 다 PO 1클릭.** **❌ 미실측: Lighthouse 성능(샌드박스 망 제약 → audit-live.yml CI가 측정 예정).** 열린 PR: #83·#41(지난 세션, 무관) + 동시작업 세션 브랜치 다수.

**다음 세션 첫 프롬프트 (PO 복붙용):**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프(2026-06-20 저녁) 읽어. 그다음: 1) 관리자로 로그인해서 (a) /admin/khidi/kpi-dashboard 숫자 뜨는지 (b) /api/sentry/test JSON (c) /admin/khidi/ai-regression "지금 실행" 버튼 동작 — 셋 다 확인해줘. 2) GitHub Actions에서 "Audit (live)" 워크플로 수동 실행해서 Lighthouse 성능 점수·LCP 뽑고, 그거 보고 병원사진 3MB·이미지 최적화부터 성능 개선 착수해. 새 작업은 git fetch origin main && git merge 로 최신화부터(다른 세션들이 동시에 main 바꿈).

---

## 🔖 세션 핸드오프 (2026-06-20 오후·자율) — KPI 집계오류 자동 canary 신설·머지·배포(#107) + 직전 미검증 2건 추가검증

**이번 세션 한 일:**
- **🟢 KPI 집계오류 자동 canary(경보) 신설 — PR [#107](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/107) 머지·배포(`829bf27`):** #102 때 KPI가 없는 컬럼을 쿼리해 유치·사전상담이 "조용히 0"이던 평가 핵심 버그가, **대시보드를 직접 열어야만** errors 배너로 보이는 사각지대였음. 이제 **매일 KST 00:05 도는 KPI 스냅샷 cron(정기실행)**(`/api/cron/kpi-snapshot`→`upsertDailySnapshot`)이 집계 errors를 만나면 `operationalAlerts.alertKpiAggregationErrors()`로 **critical 알림(콘솔+Sentry+이메일)** 자동 발사. 파일: `src/lib/alerts/operationalAlerts.ts`(타입 `kpi_aggregation_error` + 함수 신설), `src/lib/khidi/kpi.ts`(`upsertDailySnapshot`에 try/catch 격리 훅), `src/lib/alerts/operationalAlerts.test.ts`(테스트 3개).
- **직전 미검증 2건 — 내가 할 수 있는 만큼 추가검증:**
  - **KPI 대시보드 숫자·로직**: 실DB 재조회로 유치 **4**/사전상담 **9**/사후관리 **3** 재확인(불변) → 대시보드 코드가 **유치 4/12·사전상담+사후관리 12/120**으로 렌더하는 경로까지 확인. **화면 픽셀 클릭만 PO 몫**(관리자 로그인 필요).
  - **서버 Sentry**: 인증 없이 `/api/sentry/test` 호출 → **403(관리자 보호 정상)**. 프로덕션 런타임 로그에도 이 403 probe가 기록됨(로그 정상 작동 확인). **실전송 JSON은 PO 1클릭**(관리자 세션 필요).
- **문서 정리**: `KNOWN_ISSUES.md`의 이미 해결된 stale 항목 3개(얕은 헬스체크·죽은 `/api/chat`·알림 인메모리)를 ✅표시 + canary 기록. `KHIDI_중간보고_베이스.md` §4 6월 로그 1줄(ICT 자가관측).

**왜 그렇게 했는지:**
- **canary 선정 이유**: PO가 "다 해, 일요일까지 확인 못 하니 니가 판단" 위임 → 백로그 중 **자동검증 가능+저위험+평가 직결**만 골라야 했음. 헬스체크는 이미 깊어져 있었고(stale 백로그), any축소·God컴포넌트는 라이브검증 필요(고위험). #102 재발을 사람 개입 없이 막는 canary가 명백한 "좋은 것"이라 판단.
- **거짓경보 안 나는 설계**: 집계 `errors[]`는 쿼리 오류(없는 컬럼·연결 실패)에만 채워지고 데이터 0건(한가한 날)엔 안 채워짐 → 오알림 없음.
- **저위험이라 직접 머지**: 추가형(알림+테스트+문서), CI 초록, 프리뷰 Ready 확인 후 합치기(squash 머지)(PO의 "저위험 CI초록=머지" 위임 적용).

**안 끝났거나 보류:**
- **KPI cron 실동작(프로덕션) 미확인**: Vercel 런타임 로그 보존이 짧아(~최근 1시간) 2026-06-19 15:05 UTC 실행분이 만료돼 못 봄. 정기실행(cron) 인프라 자체는 살아있음 확인(`dispatch-reminders`가 30분마다 200). → **kpi-snapshot이 실제 매일 도는지는 다음 세션이 15:05 UTC 이후 로그로 확정** 필요(안 돌면 canary도 안 도는 셈).
- **D. any(타입 느슨) 축소·E. God 컴포넌트(2883줄) 분할**: 변함없이 보류(고위험/LiveKit 라이브검증 필요). 자리 비운 PO가 검증 못 하므로 일부러 안 건드림.
- **열린 PR [#83](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/83)(AI 안전 0층, draft)·[#41](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/41)(비자)**: 지난 세션 것, 무관, 그대로 열림.

**주의·함정:**
- **로컬 `main` 작업본(브랜치)이 한때 옛 커밋(`7458a83`)이라** `git checkout main` 시 작업트리가 옛 파일로 보였던 사고 있었음 → `git reset --hard origin/main`(`829bf27`)으로 정상화. **원격·배포 코드엔 영향 0.** 다음 세션도 작업 전 `git fetch origin main && git reset --hard origin/main` 권장.
- **canary 알림이 PO에 실제로 닿으려면** 프로덕션 설정값(env)에 **Sentry DSN**(`NEXT_PUBLIC_SENTRY_DSN`)과 **알림 수신 이메일**(`OPERATIONAL_ALERT_EMAIL` 또는 `ADMIN_EMAIL_ALLOWLIST`)이 박혀 있어야 함. 안 박혀 있으면 콘솔에만 찍힘. → **PO의 `/api/sentry/test` 1클릭이 DSN 설정 여부도 같이 증명**(JSON "전송됐습니다"=DSN OK / "DSN 미설정"=설정 필요).

**다음 세션이 먼저 할 일 (우선순위):**
1. **⚠️ 직전 미검증분 먼저 확인 (관리자 로그인 필요 — 환경상 내가 못 함):** (a) **KPI 대시보드 화면**: `/admin/khidi/kpi-dashboard`에 **유치 4/12·사전상담+사후관리 12/120**·만족도 뜨는지(숫자·로직은 검증됨, 픽셀만). (b) **서버 Sentry 실전송**: 관리자로 `https://healo-khidi.vercel.app/api/sentry/test` 1회 → JSON "전송됐습니다"면 Sentry 도착 확인(이게 canary 알림 경로 + DSN 설정 여부도 같이 증명).
2. **KPI cron 실동작 확정**: 15:05 UTC 이후 Vercel 프로덕션 로그에서 `/api/cron/kpi-snapshot` 200 떴는지 확인(안 떴으면 Vercel 정기실행 스케줄 미적용 의심 → canary 숙주가 안 도는 것).
3. (보류) God 컴포넌트 분할 / any 축소 / 화상방 라이브 검증 — PO 동석·라이브검증 가능할 때만.
4. KHIDI 중간평가(2026-08-27) 상시 — 이번 canary는 평가항목 ④(성과지표 자동집계 정확성)·정성(ICT 자가관측 체계) 직결.

**검증 상태:** PR **[#107](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/107)(`829bf27`) = CI(`ci`·`Smoke`) 초록 + Vercel 프리뷰 Ready + 합치기(squash 머지)·배포 완료**(GitHub MCP check_runs로 확인). 로컬 **tsc 0 / vitest 132개(+3) / check:content / check:migrations(81) / next build --webpack** 전부 통과. canary 알림 함수는 단위테스트로 검증(no-op·발사·throw격리). **❌ 미검증(관리자 로그인 필요): KPI 대시보드 화면 렌더 / 서버 Sentry 실전송 — 둘 다 PO 1클릭.** **❌ 미검증: KPI cron 프로덕션 실행(로그 보존 짧아 못 봄).** 열린 PR: #83·#41(지난 세션, 무관).

**다음 세션 첫 프롬프트 (PO 복붙용):**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프(2026-06-20 오후) 읽어. 그다음 직전 미검증 확인: 1) 관리자로 /admin/khidi/kpi-dashboard 열어서 유치 4/12·사전상담+사후관리 12/120 뜨는지. 2) 관리자로 https://healo-khidi.vercel.app/api/sentry/test 한번 열어 JSON 알려줘(서버 에러감시 + 새 KPI 경보 알림 경로 둘 다 이걸로 증명). 3) 15:05 UTC 지났으면 Vercel 프로덕션 로그에서 /api/cron/kpi-snapshot 200 떴는지 봐줘(매일 KPI 점검 cron이 실제 도는지). 새 작업은 git fetch origin main && git reset --hard origin/main 부터.

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
