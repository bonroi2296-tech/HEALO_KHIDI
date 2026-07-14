# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

---

## 🔖 세션 핸드오프 (2026-07-13~14 — Supabase 디스크 I/O 진단 완결 + 앱스토어 사전준비·아이콘 최종 확정)

**1. 이번 세션 한 일**
- **Supabase "디스크 I/O 예산 부족" 경고(지메일 수신) 진단 완결 — DB/앱 무혐의 확정, 대응=관찰**: 실측(쿼리별 I/O 전부 디스크 대기 0ms·WAL 하루 5MB·체크포인트 하루 11MB·임시파일 22.6GB는 2~5월 과거분) 결과 앱이 고칠 대상 자체가 없음. 원인은 무료 Nano 인스턴스에서 Supabase 플랫폼 자체 운영(로그·백업·모니터링)이 작은 I/O 예산을 먹는 것. 점검 도구 `npm run check:supabase-io` 신설 **[PR #735](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/735) 머지**(독립 리뷰가 CONFIRMED 실결함 2건 — CRLF env 파싱·PG17 컬럼명 — 적발, 수정 후 머지), 진단 결론 문서 **[PR #736](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/736) 머지**.
- **앱스토어 사전준비(결제 전 가능분) 완료 — [PR #741](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/741) 머지**: ①`docs/APP_STORE_REVIEW_ANSWERS.md` 신규(Play 데이터안전·애플 개인정보 라벨 설문 문항별 답 + 심사노트) ②`scripts/appstore-screenshots.mjs` 신규(스토어 규격 자동 촬영 — ko·en·ru 36장 실촬영, 산출물 `appstore-assets/`는 git 미추적).
- **PO 결정(2026-07-14): 앱 아이콘 최종 확정** — 흰 바탕 + 청록→남색 그라데이션 말풍선 h(폰 PWA에 설치된 것과 동일 디자인). 3벌(PWA·안드로이드·iOS) 파일이 규격(1024px·투명배경 없음) 통과 확인 — 추가 작업 0. 다크 전용 변형은 선택사항으로 보류. PO 체크리스트를 `docs/APP_STORE_LISTING.md` §제출 전 선결에 갱신(**남은 PO 작업 = 결제 2건뿐**: 애플 $99/년·구글 $25).

**2. 왜 그렇게 했는지**
- I/O 경고를 "관찰"로 종결한 근거: 실측상 최적화 여지 0(쿼리·인덱스 전부 정상), 유일한 근본해결 = 유료 Pro($25/월) → 돈 결정이라 PO 몫으로 보고만 하고 소비 없이 종결.
- 아이콘 확정 과정에서 채팅 위젯의 이미지 데이터가 2회 깨짐(base64 수작업 전송 한계) → 실제 아이콘 파일로 PIL 합성 이미지를 만들어 클릭 링크로 보여주는 방식으로 전환해 확정 받음.
- 애플 계정은 **개인(Individual)으로 시작**: 본로이=개인사업자라 조직 등록 대상이 아님. 의료 분야 앱이라 애플이 법인 계정을 요구(5.1.1)해 반려할 리스크는 체크리스트에 명시(반려 시 그때 대응).

**3. 안 끝났거나 보류**
- **PO 결제 2건 대기**(애플 $99/년·구글 $25) — 이게 풀려야 Firebase 설정파일·Codemagic 연결·빌드·심사 제출 전 과정이 진행됨.
- 스크린샷 36장은 웹 캡처 **초안** — 최종 제출 전 실기기/시뮬레이터 캡처 교체 권장. Android 피처 그래픽(1024×500)은 제출 직전 제작.
- Supabase Management API 토큰은 미발급 상태로 종결(선택사항 — 세션에 Supabase MCP가 붙으면 불필요).

**4. 주의·함정**
- `check-supabase-io.mjs`: PG17은 pg_stat_statements 컬럼명이 `shared_blk_read_time`(구 `blk_read_time`) — 옛 이름으로 되돌리면 핵심 쿼리가 항상 실패.
- `.env.local`은 CRLF(윈도 줄끝) — env 파서를 새로 만들면 `split(/\r?\n/)` 필수(독립 리뷰가 잡은 실결함, 안 하면 토큰이 영영 안 읽힘).
- `appstore-assets/`는 gitignore 등재(2분 자동커밋 훅이 PNG를 삼키는 것 방지) — 스크린샷·아이콘 시안은 스크립트로 재생성 가능하니 커밋 금지 유지.
- 시안 이미지에 더미 요소(가짜 이웃 앱 등)를 넣으면 PO가 깨진 것으로 오인함 — 빼거나 라벨을 명확히.

**5. 다음 세션이 먼저 할 일**
1. ⚠️ **PO 결제 여부부터 확인**(애플·구글 개발자 등록) — 됐으면 `docs/APP_STORE_LISTING.md` §제출 전 선결 순서대로 Firebase 가입·설정파일 2개(화면 딸깍 안내), Codemagic 연결, 첫 빌드(TestFlight·Play 내부트랙)로 진행. 안 됐으면 하루 요약에 리마인드 한 줄만.
2. (조건부) Supabase 디스크 I/O 경고 메일이 또 오면 `npm run check:supabase-io` 재실행으로 즉시 재점검(토큰 없으면 MCP로).

**6. 검증 상태**
- ✅ PR #735·#736·#741 전부 **MERGED 확인**(gh로 상태 조회, 기억 아님). #735는 독립 리뷰(CONFIRMED 2건 수정)+CI 초록 후 자동머지, #736·#741은 문서·운영 스크립트 저위험(스크립트는 3회 실행·36장 산출 육안 검증).
- ✅ `check:supabase-io` 무토큰 경로 실행 검증(안내 출력+정상 종료). ⚠️ **토큰 경로(Management API 호출부)는 실행 못 함**(토큰 미발급) — 단 동일 쿼리를 Supabase MCP로 실행해 결과는 검증됨.
- ⚠️ **스크린샷 36장은 실기기 표시 미검증**(웹 캡처 초안) — 제출 시점에 교체 검토.
- 열린 PR(2026-07-14 확인): #749·#731·#729·#669·#514 — 전부 타 세션 것. **이 핸드오프 문서 PR 자체는 작성 직후라 CI 결과 미기재** — 초록이면 자동머지, 실패 시 다음 세션이 이어받을 것.

**7. 다음 세션 첫 프롬프트**
> docs/PROJECT_CONTEXT.md 최상단 읽어. 앱스토어 등록 건: PO가 애플($99)·구글($25) 결제했는지부터 확인해 — 했으면 APP_STORE_LISTING.md 체크리스트 순서대로 Firebase 설정파일 받고 Codemagic 연결해서 첫 빌드까지 가. 안 했으면 리마인드만 하고 다른 백로그(코디 배지 검증·GSC 색인 확인) 이어가. 아이콘은 7/14 확정 끝났으니 다시 묻지 마.

---

> 💾 **중간 저장 (2026-07-14, 구글 「힐위드」 질문 → GSC 실사 → 색인 품질 3종 수리 머지·프로덕션 배포 완료)**
> - PO 질문("구글에서 힐위드 검색하면 나오게 어케함?")에서 시작 → **PO가 7/14 GSC에서 `/ko` 색인 생성 요청 완료**(중복 요청 금지 — 반복해도 안 빨라짐). "유효성 검사 시작되지 않음"은 오류 아님(재검사 버튼 미클릭 상태).
> - PO가 GSC 「발견됨-색인 안 됨」 21건을 직접 파다 **실결함 3종 발견 → [PR #743](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/743) 머지·프로덕션 실측 검증 완료(7/14)**: ①소프트 404(없는 치료·병원 slug가 404 화면+HTTP 200 — `loading.jsx` 스트리밍 경계가 원인, **notFound()를 메타로 올려도 안 됨(실측)**, 루트·치료·병원 loading 제거가 진짜 수리. 목록 스켈레톤은 페이지 안 Suspense fallback으로 복원) ②/en·/ru 병원 상세 제목이 DB 한국어 — `localizedHospitalText`로 title·OG·JSON-LD·breadcrumb 통일 ③제목 브랜드 중복 30파일. 독립 리뷰 게이트가 추가 8건 적발·반영(핵심: **DB 일시 오류가 살아있는 페이지를 404로 만들어 색인 제거될 뻔** → 데이터 계층이 없음/조회실패 구분, throw→500). 반성문 **#87**(🔁 #20 부류) + `check:content` **§18(제목중복)·§19(소프트404 loading 금지)** — 병렬 세션(지도 CSP)이 #86·§17 선점해 재번호.
> - **함정 기록**: ①이 저장소에서 **draft PR엔 GitHub Actions CI가 안 돎**(2시간 헤맴 — draft 해제하니 즉시 돎. 자동머지 플로우는 ready 전환 필수) ②Stop훅 자동저장 커밋("chore: 작업 자동 저장")과 빈 커밋은 Vercel이 배포 생략(vercel-ignore-build.sh) — 프리뷰 검증하려면 정식 메시지+실변경 커밋.
> - **(추가 발견 #88) 사이트맵 유령 6종** — PO "뒤져서 더 나오면?" → 전수 스캔으로 비공개 치료 6종이 스테일 사이트맵에 몇 달째 광고되던 것 발견(코드·DB 무죄, Vercel 빌드 산출물 캐시가 범인 — 로컬 빌드 재현으로 입증). 수리 = sitemap `force-dynamic`(요청 시 실DB 생성) + 야간 프로덕션 E2E에 사이트맵 건강검진 스펙(모든 loc 실요청) 신설.
> - **다음 세션 확인거리**: 며칠 뒤 시크릿창 구글 `힐위드` 검색 or GSC 실적 탭(뜨면 종결, 네이버 7/6 조치분 동일 대기) + GSC 미색인 21건이 재크롤 후 404로 떨어져 나가는지. 병원 본문 H1 언어화는 KNOWN_ISSUES 기록(다음 SEO 라운드). 배경 가이드 = `docs/검색노출_PO가이드.md`.

> 💾 **중간 저장 (2026-07-14, 잔재 정리 — PO 결정 2건: /search 비활성 + 더미 치료 데이터 비공개)**
> - **PO 지시("예전 프로젝트 잔재 없애기로 했잖아") → 조사 결과 반반**: ①**/search = 잔재 확정** — 진입 링크 0인 고아 페이지인데 sitemap(0.8)·robots·홈 JSON-LD SearchAction이 색인을 광고 중이었음 → [PR #746](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/746) 머지: /hospitals 리다이렉트(**코드 보존** — `SearchResultsClient.jsx` 살아있음, 재도입 시 page.jsx 원복+SearchAction 복원) + sitemap/robots/JSON-LD 제거. 프로덕션 307 리다이렉트 실측 확인. ②**비암종 /treatments/[slug] = PO가 "더미데이터, 구조만 남기고 데이터 없애도 됨" 확정(7/14)** → 한방 프로그램 6건 `is_published=false`(행 보존 토글) + **RAG 문서 6건 `expires_at=now()`**(⚠️ 함정: 검색 RPC `rag_search_chunks_v1_1`은 `is_active`를 안 보고 `expires_at`만 필터 — is_active만 끄면 AI가 계속 인용함). 프로덕션 404 실측 확인. 되돌리기 = is_published true + expires_at NULL.
> - **왜 잔재가 살아남았었나**: 당시 "없앤다" 결정이 기록에 안 남아 이후 세션들이 살아있는 기능으로 취급(sitemap에까지 추가). → 결정은 그 자리에서 기록(이 블록이 그 실천).

> 💾 **중간 저장 (2026-07-14, 상세페이지 지도·화살표 세션 — 중요 발견)**
> - **병원·암종 상세 지도가 회색 박스였던 진짜 원인 = 우리 CSP(next.config.js)가 `maps.googleapis.com` 스크립트를 차단**(키·결제·코드 전부 정상 — 프로덕션 번들·Static Maps 실측으로 소거 진단). #43(Turnstile) 부류 재발이라 POSTMORTEMS #86 기록 + `check:content`에 [CSP누락] 룰 17 신설(외부 스크립트 도메인↔CSP 자동 대조 — 앞으로 CSP를 조이다 기존 기능 부러뜨리면 CI가 잡음). 협진 대학병원 4곳 실좌표 추가(없으면 지도가 서울시청을 찍음 — 성동점은 상세주소 미정이라 의도적 제외). 갤러리 좌우 화살표 Chevron 통일(병원+암종 상세). **로컬 dev는 설계상 지도를 안 불러오므로(비용 절감) 지도 실검증은 배포 후 프로덕션/프리뷰에서만 가능.**

## 🔖 세션 핸드오프 (2026-07-13 오후 — 지피터스 아티클 → 코디 지연배지·답장 추천 칩 출시 + #85 반쪽배선 수리)

**1. 이번 세션 한 일**
- 지피터스 아티클("AI 비서 47기능 메뉴판" — 기능보다 가시성) 분석 → PO가 "쓸모 있는 것만 설계·구현" 승인 → 2건 출시, **[PR #738](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/738) 머지·프로덕션 배포 완료(2026-07-13)**:
  - ①**코디 인박스 지연 배지**: 단계 기준일(접수 3·상담 7·준비 14일 — `src/lib/khidi/caseStatus.ts`의 `CASE_STATUS_DELAY_DAYS` 한 곳) 초과 케이스에 「N일째 정체」 빨간 배지. 완료·차단(스팸)·오류 문의와 치료 이후 단계는 제외, 단계 미설정 문의는 '접수 방치'로 간주. 배포 시점 실DB 기준 **실고객 8건이 접수 방치(최장 54일)** = 유치(K-01) 누수 가시화.
  - ②**코디 답장 추천 칩**: 새 API `/api/portal/reply-suggestions`(staff 전용)가 승인 playbook 패턴 top3(언어 일치 우선 → 단골 usage_count순)를 주고, 메시지 입력창 위 칩으로 표시. **클릭=입력창 채움만(자동 전송 금지)**, 입력 중엔 숨김. 마이그레이션(usage_count 컬럼+원자증가 RPC+source_thread UNIQUE, 전부 추가만=가역) 실DB 적용 완료.
- **실버그 발견·수리(POSTMORTEMS #85, 🔁 #18 반쪽 부류)**: 응대패턴 자동추출(runPostResolve)이 어드민 라우트에만 배선돼 코디 실사용 완료 경로(portal threads PATCH)에선 안 불려 **playbook_patterns가 2026-02부터 0건** — 배선 추가 + 두 경로 모두 `after()`로 감쌈(서버리스 freeze로 백그라운드 LLM 추출이 잘리는 것 방지, 저장소 표준 관례) + 워커의 중복체크를 LLM 호출 앞으로(재-resolve 토글 비용 낭비 방지) + `check:content`에 [반쪽배선] 가드 룰 신설.
- 독립 리뷰 게이트가 5건 지적(CONFIRMED 1건: 차단 문의에 배지 영구 오탐) → 전부 반영 후 자동머지. 코디 사용설명서 6개 언어 동반 갱신, caseDelayDays 단위테스트 8건. 문서 중간저장 [PR #739](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/739) 머지(KHIDI §4 7월 로그 포함).

**2. 왜 그렇게 했는지**
- 아티클 아이디어 4개 중 2개(현황판 스텝퍼·메뉴판/레시피노트)는 **이미 있어서 안 만듦**(에이전시 6단계 스텝퍼·환자 여정바·사용설명서 드로어·admin/playbook-patterns) — 중복 개발 방지가 선별 기준.
- 지연 배지는 **내부(코디)용만**: 에이전시·환자에게 "23일째 정체"를 보여주면 신뢰가 아니라 역효과라 의도적으로 외부 노출 제외.
- 칩 자동 전송 금지: 의료 서비스라 사람(코디) 최종 확인이 계약. 기준일 3/7/14는 **PO 미확정 초기값** — 운영하며 조정.

**3. 안 끝났거나 보류**
- **칩은 현재 빈 상태가 정상** — 재료(playbook_patterns)가 0건이고, 이번 배선으로 코디가 대화를 '완료' 처리할 때부터 쌓임(quality 80점 미만은 draft로 남아 어드민 승인 필요 — 자동 승인 게이트는 그대로).
- (선택 보류) 하루 요약 보고에 "지연 케이스 N건" 한 줄 포함 — 설계의 선택 항목, 배지 효용 보고 결정.

**4. 주의·함정**
- **새 resolve 경로(chat_threads를 resolved로 바꾸는 API)를 만들면 runPostResolve 배선 필수** — `check:content` [반쪽배선] 룰이 CI에서 잡아줌(#85).
- 백그라운드 작업(fire-and-forget)은 반드시 `after()`(next/server)로 감싸라 — 안 그러면 Vercel이 응답 후 함수를 얼려 실행이 잘린다(이 저장소 8곳+ 표준).
- 기준일 조정은 `caseStatus.ts`의 `CASE_STATUS_DELAY_DAYS`만 고치면 됨(라벨은 코디 공유사전 `inboxDelayedDays`).
- fire-and-forget 파이프라인은 "실패"만이 아니라 **"무발화"도 무증상** — 새로 만들면 실DB 행 수를 한 번은 확인(#85 교훈).

**5. 다음 세션이 먼저 할 일**
1. ⚠️ **직전 미검증분 먼저 확인**: 코디 계정으로 인박스(지연 배지)·메시지(칩 영역) 실화면 확인 — PO가 직접 보거나 E2E. 배지에 잡힌 **실고객 방치 8건**을 코디가 실제로 처리하게 안내(배지를 단 목적이 이것).
2. 코디가 대화 '완료' 처리한 뒤 playbook_patterns에 draft가 실제로 쌓이는지 실DB 확인 — 첫 발화 검증(#85가 재발 안 하는지).
3. (선택) 하루 요약에 지연 케이스 건수 한 줄 포함 검토.

**6. 검증 상태**
- ✅ 직접 검증: `npx next build --webpack`·`tsc --noEmit`·vitest 27/27·`check:content`·`check:migrations` 통과, PR #738 CI(Smoke+ci+Vercel) 전부 초록, 독립 리뷰 게이트 통과(지적 5건 반영), 마이그레이션 실DB 적용(`{"success":true}`), main 머지 커밋 417f8a8 프로덕션 배포 success, 새 API 비로그인 401 확인. PR #738·#739 모두 MERGED(이 세션 열린 PR 없음).
- ⚠️ **미검증**: 코디 화면 실클릭(로그인 게이트 — 배지·칩이 실제 브라우저에서 그려지는 모습은 못 봄). 칩 실표시는 패턴 0건이라 현재 검증 자체가 불가(빈 상태가 정상). → 5-1로 승격.

**7. 다음 세션 첫 프롬프트**
> docs/PROJECT_CONTEXT.md 최상단 읽어. 코디 인박스 지연 배지·답장 칩(#738)이 프로덕션에 나가 있음 — 코디 화면 실클릭 검증부터(인박스 「N일째 정체」 배지 8건, 메시지 칩은 빈 게 정상). 코디가 대화 완료 처리하면 playbook_patterns에 draft 쌓이는지 실DB로 확인해(#85 재발 감시). 기준일(3/7/14일)은 PO 피드백 오면 caseStatus.ts 한 곳만 조정.

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
