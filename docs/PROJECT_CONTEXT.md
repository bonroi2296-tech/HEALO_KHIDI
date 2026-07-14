# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

---

## 🔖 세션 핸드오프 (2026-07-14 — 상세페이지 대청소: 지도 CSP·화살표·스와이프·무한루프·러카 날짜·잔재 정리, PR 7건 배포)

**1. 이번 세션 한 일** — 전부 머지·프로덕션 반영·기계 실측 완료(7 PR + DB 토글 2건):
- **[#742](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/742) 지도 복구 + 화살표 통일**: 병원·암종 상세 지도가 회색 박스였던 원인 = **CSP script-src에 maps.googleapis.com 누락**(키·결제 정상 — 소거 진단). CSP 추가 + 대학병원 4곳 정적 좌표 + 캐러셀·라이트박스 화살표 Chevron 통일·원형 버튼 중앙정렬. 반성문 #86(🔁 #43 부류) + `check:content` **§17**(외부 스크립트↔CSP 자동 대조).
- **[#744](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/744) 다듬기 2차**: '제공 항목'에 언어코드(ko/en) 원시 노출 → 원어 표기(`languageLabel`, LANG_OPTIONS 재사용) / 후기 날짜 `formatDate("en")` 고정 → langCode / 모바일 스와이프 1차.
- **[#745](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/745) 러·카 현지화**: `localeFromLang`에 ru-RU·kk-KZ 추가 — 러/카 화면 날짜 14.07.2026·숫자 1 234 567. 암종 상세 후기 날짜 고정 "en"도 제거.
- **[#746](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/746) /search 잔재 비활성**(PO 지시): 고아 페이지를 /hospitals 리다이렉트(코드 보존), sitemap·robots·홈 JSON-LD SearchAction 제거. **비암종 치료 상세는 잔재 아님 판정**(한방 특화 페이지가 실링크) — 이후 **PO가 "더미데이터" 확정** → DB 토글 2건: 한방 프로그램 6건 `is_published=false` + **RAG 문서 `expires_at=now()`**(⚠️ 검색 RPC는 is_active 안 보고 expires_at만 필터). 낡은 장부(면력 3지점 설명 — 실은 이미 동기화됨) 실측 마감.
- **[#750](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/750)+[#755](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/755) 캐러셀 대개편**(PO "샤라락"·"마지막→1페이지" 요청): 페이드 → **손가락 추적 트랙**(드래그 추종, 300ms 스냅, touch-pan-y+축잠금으로 세로 스크롤 공존, touchcancel 원위치) → **무한 루프**(클론 기법: 트랙=[마지막클론,...실제,첫클론], 도착 시 무전환 점프 정규화, 교착 방지 2겹=재터치 정규화+400ms 워치독). 자동넘김 되감기 스윕도 해소.
- 문서: 반성문 #86, KHIDI §4 7월 로그, PO 취향 2건, midsave 2건([#748](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/748) 포함).

**2. 왜 그렇게 했는지**
- 지도: "키/결제 문제" 통념 대신 프로덕션 번들·Static Maps 실측으로 소거 → CSP가 범인. #43과 같은 부류인데 습관(교훈)만 있고 기계 가드가 없어 재발 → §17로 기계화.
- 이미지 호버 확대(scale)는 DESIGN.md 금지 문구에도 불구 **유지** — 홈·검색 등 사이트 전체 관행이라 정합성(1원칙) 우선(한 번 바꿨다 스스로 되돌림).
- 무한 루프에서 고무줄 저항 제거(끝이 없어졌으므로), 스와이프 임계 40px·스냅 300ms cubic-bezier(0.22,1,0.36,1) — PO 감각 피드백 오면 이 숫자들만 조정.
- 한방 프로그램 6건은 처음엔 "살아있는 콘텐츠" 판정(실링크 확인)했으나 PO가 더미 확정 — 삭제 아닌 비공개 토글(소프트 원칙, 재활용 대비).

**3. 안 끝났거나 보류**
- **유사부류 스캔 발견분 중 미진행**(PO 보류): ①환자 페이지 날짜가 브라우저 설정 의존 3곳(PatientDashboard 263·symptoms 349·inquiry/ThreadChat 18) + patient/chat 1곳(ko 아니면 en 고정) ②후기 국가(review.country) 원시 노출 방어(현재 데이터 0건이라 무증상) ③암종 상세 가격 3곳 `formatPriceRange("en")` 고정. PO가 "날짜 건 보류" 명시(버튼 dismiss) — 시키면 진행.
- KHIDI 점수판 데모 4건 삭제(스크립트 준비됨, 8/27 전 필수) / Madanes 서면허가 대기 / 비자 초청장용 성동·광명 등록증 정보(PO 제공 대기) — 기존 장부 그대로.

**4. 주의·함정**
- **RAG 숨김은 `expires_at`으로**: 검색 RPC(`rag_search_chunks_v1_1`)는 `is_active`를 안 봄 — is_active만 끄면 AI가 계속 인용(이번에 실측). 더미 치료 복원 = `is_published=true` + `expires_at=NULL`.
- **캐러셀 구조**: slidePos 1..len이 실제, 0/len+1은 클론(도착 즉시 정규화). 새 캐러셀 만들 땐 이 두 파일(병원·암종 상세) 복사가 표준. 사진 캐러셀은 서비스 전체에 이 2곳뿐임을 전수 스캔으로 확인(화상방 CarouselLayout은 LiveKit 부품 — 별개).
- 지도는 **로컬 dev에서 안 뜨는 게 정상**(비용 절감 설계) — 실검증은 프리뷰/프로덕션에서만.
- /search 재도입 시: page.jsx 원복 + sitemap·robots + `structuredData.js` SearchAction 3곳 복원.

**5. 다음 세션이 먼저 할 일**
1. ⚠️ **직전 미검증분 먼저 확인**: 캐러셀 실기기 감각(무한 루프 스와이프·빠른 연타·세로 스크롤 공존)과 지도 실화면 — 기계 검증(번들·헤더·404·리다이렉트)은 전부 끝났으나 **실폰 터치 감각과 지도 렌더 육안은 PO 확인이 안 옴**. PO가 별말 없으면 통과로 간주, "이상하다" 하면 임계값(40px)·스냅(300ms)부터.
2. PO가 날짜 잔여 4곳(3번 참고) 진행 지시하면 이어서. KHIDI 데모 4건 삭제는 8/27 전 반드시.

**6. 검증 상태**
- ✅ 직접 검증: PR 7건(#742·744·745·746·748·750·755) 전부 **MERGED + CI(ci·Smoke·Vercel) 초록 + 코드 PR은 독립 리뷰 게이트 통과**(#746은 리뷰가 JSON-LD 잔재 적발→반영, #755는 PLAUSIBLE 교착 지적 선반영). 프로덕션 실측: CSP 헤더 maps 도메인 2곳, /search 307→/hospitals, 더미 치료 404, 배포마다 번들 반영 폴링 확인. 빌드·check:content 매 PR 통과(§17 가드는 누락 주입→적발 역검증까지).
- ✅ 열린 PR 실조회(2026-07-14): #760·#731·#729·#669·#514 — **전부 타 세션 것, 이 세션 열린 PR 없음**.
- ⚠️ **미검증**: 실기기 터치 감각·지도 육안(→5-1), ru/kz 날짜의 실브라우저 렌더(Node 실측만 — Intl 데이터는 브라우저도 동일해 리스크 낮음).

**7. 다음 세션 첫 프롬프트**
> docs/PROJECT_CONTEXT.md 최상단 읽어. 상세페이지 대청소(7 PR) 전부 프로덕션 반영됨. PO에게 폰 확인 2개(무한루프 스와이프 감각·지도 표시) 리마인드 한 줄만 하고, "이상하다" 피드백 오면 캐러셀 임계 40px·스냅 300ms부터 조정. 날짜 잔여 4곳(환자 페이지 브라우저 의존)은 PO가 시키면 진행. KHIDI 점수판 데모 4건 삭제는 8/27 전 필수 — 하루 요약에 리마인드 유지.

---

> 💾 **중간 저장 (2026-07-14 오후, 앱스토어 세션 속편 — Firebase 열쇠 2개 머지 완료)**
> - **📝 정정: 아래 「앱스토어 사전준비」 핸드오프의 "Firebase는 결제 후" 계획이 앞당겨짐** — Firebase는 결제 무관(무료) 확인 후 PO가 즉시 진행. 기존 Firebase 프로젝트 **healo(healo-e3e58)** 재사용(새로 안 만듦), Android·iOS 앱 추가 완료. `google-services.json` **[PR #757](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/757) 머지**(gradle 조건부 플러그인이 자동 인식 — 배선 완비), `GoogleService-Info.plist` **[PR #758](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/758) 머지**. 둘 다 번들/패키지·프로젝트 ID 검증 + audit:secret 0건.
> - ⚠️ **iOS는 파일만으론 푸시 안 됨(중요)**: 이 프로젝트는 CocoaPods 아닌 **SPM(CapApp-SPM)** 구조라 ①FirebaseMessaging SPM 추가 ②AppDelegate APNs→FCM 토큰 교환 ③pbxproj에 plist 리소스 등록(현재 참조 0건) ④codemagic.yaml `pod install` 단계 손질 — **첫 Codemagic 빌드 때** 컴파일 피드백 보며 진행(윈도우 검증 불가). 상세 = `APP_STORE_LISTING.md` §어시가 할 것.
> - Codemagic 무료 확인(요금 페이지 실측: 월 500분 맥 M2, 우리 라이브로드 구조는 연 0~2회 빌드라 충분) — PO 가입은 아직. 남은 PO 몫 = 결제 2건 + Codemagic 가입(아무 때나).

**1. 이번 세션 한 일**
- 시작은 PO 질문 "구글에서 힐위드 검색하면 나오게 어케함?" → GSC(구글 서치콘솔) 실사로 확장, **결함 4종 발견·수리·프로덕션 실측 검증까지 완료**. PR 3개 전부 머지: **[#743](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/743)**(수리 본체) · **[#747](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/747)**(중간저장 문서) · **[#749](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/749)**(사이트맵 유령+야간 가드).
- 결함 4종: ①**소프트 404**(없는 치료·병원 주소가 404 화면+HTTP 200 — 구글봇에게도) ②**/en·/ru 병원 상세 제목이 DB 한국어** ③**제목 브랜드 중복 30파일**(… | healwith | healwith) ④**사이트맵 유령 6종**(비공개 웰니스 치료가 몇 달째 사이트맵에 광고 → 404).
- 독립 리뷰 게이트 2회가 추가 12건 적발·전부 반영(핵심: DB 일시 오류→살아있는 페이지가 404로 색인 제거될 뻔 / 가드 우회 3종 / hreflang 변형 미검사 / DESIGN.md 로딩 규칙 위반).
- 재발 가드 3종: `check:content` **§18**(제목 브랜드 중복)·**§19**(notFound 공개 동적 라우트 위 loading 금지) + **`e2e/sitemap-health.spec.ts`**(사이트맵 전 URL 실요청 — Production Nightly E2E 자동 편입). 반성문 **#87·#88**.
- PO가 GSC에서 `/ko` 색인 생성 요청 완료(2026-07-14). GSC "유효성 검사 시작되지 않음"=오류 아님 설명.
- **네이버 서치어드바이저 진단 4건 판정(2026-07-14, PO 스크린샷)**: 전부 무해 — ①리다이렉트된 페이지(/about·/education·/→/ko) = 우리 언어 자동이동 구조(의도) ②접근 불가 1건 = 수집제한 분류(막아둔 페이지류) ③Alt 누락 1건 = **현재 홈(ko·en) 실측 0건**(네이버 90일 누적 진단의 옛 스냅샷 — 재수집 때 소멸 예상) ④백링크 0 = 신생 도메인 정상. 홈 색인은 성공 상태라 힐위드 노출 조건 충족.

**2. 왜 그렇게 했는지**
- 소프트 404의 유일한 진짜 수리 = **loading.jsx(루트·치료·병원) 제거** — notFound()를 generateMetadata로 올려도 스트리밍 경계가 상태코드를 200으로 굳힘(로컬 build+start로 두 방법 다 실측). 목록 스켈레톤은 페이지 안 Suspense fallback으로 복원(DESIGN.md 로딩 규칙 — 상태코드 무관).
- 사이트맵 유령은 **코드·DB 무죄**(published 필터 정상, 같은 코드 로컬 빌드는 깨끗 — 실측 입증). 범인 = Vercel이 옛 빌드 산출물을 배포 넘어 재사용 → `force-dynamic`(요청 시 실DB 생성)으로 캐시 계층 무관하게 해결. 부수 이득: 공개/비공개가 재배포 없이 즉시 반영.
- 데이터 계층(치료·병원 상세 4함수)이 "없음(null)"과 "조회 실패(throw→500)"를 구분 — 404는 색인 제거, 5xx는 재시도라 살아있는 페이지 보호. React cache()로 요청당 중복 DB조회 제거.
- 병원 이름 언어화 소스 = partnerHospitals 정적 6개 언어(DB엔 name 단일 컬럼) — `localizedHospitalText` 한 곳에서 title·OG·JSON-LD·breadcrumb 통일(드리프트 방지).

**3. 안 끝났거나 보류**
- **병원 상세 본문 H1은 여전히 DB 한국어**(클라이언트 렌더 경로) — KNOWN_ISSUES 2026-07-14 기록. 풀리려면 클라이언트 데이터 경로에 언어화 이름 배선(partner는 가능, DB-only 병원은 다국어 컬럼 필요 = 스키마 결정).
- partner 정적 데이터에 없는 DB-only 병원의 비ko 제목은 DB 이름 폴백(현재 해당 병원 없음 — 신규 등록 시 partnerHospitals에도 6개 언어 이름 추가 권장).

**4. 주의·함정**
- **notFound() 쓰는 공개 동적 라우트 위에 loading.jsx 올리면 소프트 404 재발** — §19가 CI에서 잡음. 목록 로딩이 필요하면 페이지 안 Suspense fallback(hospitals/treatments 목록 페이지가 표준 예).
- **이 저장소는 draft PR엔 GitHub Actions CI가 안 돎** — 자동머지 플로우는 ready 전환 필수(이번에 2시간 헤맴).
- 자동저장 커밋("chore: 작업 자동 저장")·빈 커밋·문서-only 커밋은 Vercel 배포 생략(vercel-ignore-build.sh) — 프리뷰 검증엔 정식 메시지+실변경 커밋.
- 사이트맵은 이제 요청마다 실DB 생성 — DB 조회 실패 시 **5xx가 정상 동작**(빈 사이트맵 200 금지, 크롤러 재시도 유도).
- 템플릿 적용 title에 "| healwith" 넣지 마라(§18이 잡음) — 브랜드 직접 표기는 `title: { absolute: "…" }`.

**5. 다음 세션이 먼저 할 일**
1. ⚠️ **직전 미검증분 먼저 확인**: ①야간 사이트맵 건강검진(`sitemap-health.spec.ts`)의 **cron 첫 실행 결과**(2026-07-15 새벽 4시 KST — 수동으론 프로덕션 230 URL 초록 확인했으나 cron 환경에선 미실행) ②전역 로딩 스피너 제거의 체감 영향(PO가 실사용 중 "클릭해도 반응 없는 느낌" 있는지).
2. 2026-07-17쯤 시크릿창 구글 `힐위드` 검색 or GSC 실적 탭 — 뜨면 힐위드 건 종결. GSC 「발견됨-색인 안 됨」 21건이 재크롤 후 줄어드는지도 확인.
3. (백로그) 병원 본문 H1 언어화(KNOWN_ISSUES 2026-07-14 항목).

**6. 검증 상태**
- ✅ 직접 검증: 로컬 `next build --webpack`·tsc·vitest 529/529·check:content(가드 §18·§19 위반 주입→적발→원복 자가검증 포함), **프리뷰+프로덕션 이중 실측**(없는 slug 3종 404 — 구글봇 UA 포함 / 병원 제목·JSON-LD en·ru·ko 언어별 정확 / 제목 중복 해소 / 사이트맵 유령 0 / 홈·목록·암종 200 회귀 없음), 사이트맵 가드 프로덕션 상대 230 URL 전부 초록. PR #743·#747·#749 CI(ci+Smoke+Vercel) 전부 초록, **3개 모두 MERGED — 이 세션 열린 PR 없음**.
- ⚠️ **미검증**: 야간 cron에서의 가드 첫 실행(2026-07-15 새벽에야 돎), 전역 스피너 제거의 실사용 체감(→ 5-1 승격).

**7. 다음 세션 첫 프롬프트**
> docs/PROJECT_CONTEXT.md 최상단 읽어. 구글 색인 대청소(#743·#749) 프로덕션 반영 끝났음. 먼저 ①어젯밤 Production Nightly E2E의 sitemap-health 결과 확인(실패면 원인 조사) ②GSC 「발견됨-색인 안 됨」 21건 추이 확인. 며칠 지났으면 시크릿창 구글에 힐위드 검색해서 뜨는지 PO에게 확인 요청. 병원 본문 H1 언어화는 KNOWN_ISSUES 참고.

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

> 💾 **중간 저장 (2026-07-14, /hospitals 의료진 카드 잘림 수리 — [PR #752](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/752) 자동머지 + 반성문 번호체계 사고 수습)**
> - **PO 제보(스크린샷): /en/hospitals 의료진 카드 오른쪽 절단("Full Profile"→"Fu…")** → 원인 = DoctorCard `flex-1`에 `min-w-0` 누락(truncate 자식이 카드 폭을 밀어냄 → overflow-hidden 절단). 한 단어 수정 + **E2E "카드 넘침 0px" 가드**(@smoke — 수정을 빼고 돌려 실패 확인 = 가드 유효성 검증) → 독립 리뷰 PASS·CI 초록 → **자동머지(7/14, 저위험 UI 명백한 버그 수정 근거)**. 반성문 #89.
> - **(자체 발견 #90) 반성문 번호 중복 발번 사고**: #89를 #66으로 잘못 발번(파일 아래쪽=옛 항목만 보고 발번 — 최신은 '상단' #88). 후속 스캔에서 **과거에도 같은 실수로 번호 충돌 12쌍(#31·32·39·42·55~62)** 누적 발견. 수습 = 내 것 #89 재발번 + `check:content` **§20 신설**(새 중복 CI 차단, 과거 12쌍은 허용목록 — 전면 재번호는 🔁 참조 깨는 대수술이라 KNOWN_ISSUES 등재, /doc-health 몫).
> - **함정**: 반성문 다음 번호는 반드시 **파일 상단**에서 확인(prepend 문서라 tail은 항상 낮은 옛 번호를 보여줌).
> - **(후속, PO "다른 페이지는?") 공개 페이지 전수 잘림 스캔 = 추가 0건**: 사이트맵 19템플릿 × PC/모바일 38회 실측 — 히어로 장식 번짐·지도 내부·폰트 프로브·캐러셀·sr-only는 의도 패턴으로 판독(오탐). 스캐너를 **`e2e/content-clip-sweep.spec.ts`로 상설화**(야간 프로덕션 + main push Full E2E — "읽을 텍스트가 클리핑에 잘리면 실패", min-w-0 재제거 시 70건 적발로 유효성 검증). 백오피스(로그인 뒤편)는 범위 밖(로컬 로그인 자동화 불가) — 같은 부류 나오면 동일 수법(min-w-0)으로.
> - 작업 폴더 = ~~`HEALO_worktrees/hospitals-card-fix`~~(정리 완료) → 후속 가드는 `HEALO_worktrees/overflow-sweep-guard`(브랜치 work/overflow-sweep-guard). 머지 후 정리 대상.

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
