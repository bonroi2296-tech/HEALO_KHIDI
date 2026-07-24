# 완성도 감사 로그 (`/completeness-audit`)

> "완성 판정(Manager)"을 사람 눈에서 기계로 옮긴 루프의 기록이다. (2026-07-15, OKKY "Codex 72시간 사이클" 칼럼에서 착안)
> 채점표 = `src/lib/completeness/rubric.js` (사람용 `docs/DEFINITION_OF_DONE.md`). 형식·루프 구조는 `.claude/skills/completeness-audit/SKILL.md` 참고.
> 새 엔트리는 이 안내문 바로 아래에 추가.

## 2026-07-24 완성도 감사 (범위: diff — PR #942 코디 메신저 릴레이·채널 배지)
- 스캔: i18n 6개어 완전성(신규 3키, {channel} 자리표시자 포함 실검증) · 같은 부류 전수(스태프→chat_messages 삽입 통로 10개 라우트 전수 — 릴레이 필요 통로는 admin·portal 2개뿐, 둘 다 이번에 공용 모듈로 배선. resolve=playbook_responses 학습 드래프트라 비대상, 병원·에이전시=스태프 간 채널) · 설명서 동기(코디 §메시지 updated 7-24)
- 수정: 발견 0건 (수정 없음)
- 검증 못 함(정직 표기): 백오피스 로그인 뒤 실화면(채널 배지·미전달 표시·버튼 겹침 해소)은 스윕·프리뷰 자동화 밖 — PO 실클릭 항목
- 라운드: 2 (무발견 도달)

---

## 2026-07-24 PR #944 편집기 재검색·홈 전체 개방·블록 편집 (범위: diff)

- 스캔: 유형 1·2·3·5(문서드리프트)·7 / **발견 1건** (설명서 드리프트)
- **발견·수정**: 코디 설명서(`src/lib/manuals/index.js`)에 「콘텐츠 편집」 메뉴 항목이 **어제 편집기 출시(#918) 때부터 통째로 누락** — 이번 PR에서 ko·en·ru 3개 언어 추가 + updated 2026-07-24 (같은 PR 갱신 규칙 소급 준수).
- **유형3(유령 배선) 무발견**: 레지스트리 자동 등록이 노출하는 홈 섹션 11종(hero~bottomCta·misc·faq·emergency) 전부 `HomeClient.jsx`가 실제 렌더함을 grep 실측 — "편집돼도 아무 데도 안 보이는 키" 0. 신규 `matched` 필드는 클라 배지가 소비 ✓.
- **유형1**: 설명서 en·ru 추가분에 한글 누출 0, check:content 통과.
- **유형7(시각)**: textarea 전환·섹션 머리글은 **실클릭 검증 못 함**(코디 로그인 게이트 — 자동화 불가, 기억 `verify_authgated_portal`). 배포 후 검색 API 실호출 + PO 실사용으로 확인 예정.
- 라운드: 3 (2연속 무발견 도달) / 회귀 테스트 7건 추가(`registry.test.ts`), 반성문 #114.

## 2026-07-22 PR #877 푸터 사업자 정보 6개어 (범위: diff)

- 스캔: 유형 1·2·3·7 / **발견 1건** (유형3 1건 · 나머지 미달 0)
- **유형3**: 이번 PR이 새 가드(`check:content §27`)와 새 부류(#108)를 만들었는데 **판정 기준 SoR(`rubric.js` DoD-1)에는 반영이 없었다** — 루브릭이 코드 현실보다 뒤처지는 드리프트. → DoD-1 에 ⓐ`done` 항목 추가("ko 화면에 영어 라벨 하드코딩 0") ⓑ`guards` 에 §27 ⓒ`postmortems` 에 108 ⓓ`gap` 에 **방향 사각**(기존 가드가 전부 "비-ko 화면의 한글"만 보고 그 반대는 무검사였음) 명시. `DEFINITION_OF_DONE.md` 도 같이 갱신(`check:completeness` 가 쌍을 강제).
- **유형1**: `check:content` i18n 키 패리티 통과 + 6개 언어 실렌더 10줄 전부 확인(빈 값·`undefined`·키 이름 노출 0).
- **유형2**: PR 본문 주장 ↔ 최종 코드 대조 — 일치. 옛 키(`guaranteeInsurance`) 참조 잔재 0건 실측.
- **유형7**: 모바일 375px 러시아어(라벨 최장) 실측 — 11줄, **넘침 0**, 가로 스크롤 0. 최장 줄은 2줄로 자연 줄바꿈(32px).
- 라운드: 2 (2라운드 무발견)
- 검증: `tsc` 0 · `vitest` 578 · `next build --webpack` 0 · `check:content`(§27 양방향 돌연변이) · `check:completeness`

---

## 2026-07-22 PR #872 러/카 랜딩 언어전환 404 (범위: diff)

- 스캔: 유형 2·3·7 / **발견 3건** (유형3 2건 · 유형2 1건 · 유형7 0건)
- **유형3-①**: `docs/KNOWN_ISSUES.md:306` 이 이 랜딩들의 살아있는 SoR 인데 ⓐ이번 수정(언어전환 404)이 안 적혔고 ⓑ **이제 존재하지 않는 심볼 `proxy.ts` `LEGACY_SKIP`** 을 가리키는 죽은 참조였다(같은 PR에서 삭제됨). → 항목을 `LEGACY_LANDINGS`/`isLegacyLanding()` SoR 로 갱신 + 2026-07-22 해결 종결.
- **유형3-②(고치지 않음, 의도)**: `docs/POSTMORTEMS.md:765`(#77)·`docs/archive/PROJECT_CONTEXT_handoffs.md` 도 `LEGACY_SKIP` 을 참조하지만 **반성문·아카이브는 그 시점의 사실 기록**이라 현재형으로 고치면 역사가 왜곡된다 → 그대로 둠. 살아있는 문서(KNOWN_ISSUES)만 갱신하는 것이 원칙.
- **유형2**: PR #872 본문이 *"proxy.ts 의 LEGACY_SKIP 이 이 상수를 import"* 라고 주장했는데, 독립 리뷰 반영 2번째 커밋에서 **판정식까지 함수로 통합**해 `LEGACY_SKIP` 자체가 사라졌다 → **보고 ↔ 코드 불일치**. PR 본문 전면 갱신. (첫 커밋 기준으로 쓴 설명이 두 번째 커밋 뒤 그대로 남는 부류 — 리뷰 반영 후 PR 본문 재확인이 필요하다는 교훈.)
- **유형7**: 푸터 라벨 2개 실렌더 실측 — 모바일 375px 에서 잘림 0(ru 149px·kz 173px, 각 1줄 20px), 가로 스크롤 0, hydration 에러 0.
- 라운드: 2 (2라운드 무발견. 2라운드에서 수정이 0건이었으므로 3라운드는 동일 입력 재실행이라 생략 — 정직하게 밝힘)
- 검증: `tsc` 0 · `vitest` 578 · `next build --webpack` 0 · `check:content` · 실브라우저 언어전환 재클릭

---

## 2026-07-20 PR #831 치료 유령 컬럼 (범위: diff)

- 스캔: 유형 1·2·7 / **발견 3건 (전부 「내가 방금 만든」 반쪽배선 — 독립 리뷰 2라운드가 못 본 각도)**
- **유형1-①**: 새로 표시하게 만든 `duration`·`recovery_time`·`preparation`·`risks` 가 **번역 대상에 없고** 공개 상세에서 `localize()` 도 안 거쳤다 → 어드민이 한국어로 입력하면 **러시아·카자흐 환자 화면에 그 칸만 한국어**로 뜬다. 지금은 값이 전부 null 이라 안 터졌을 뿐, PO가 쓰는 순간 새는 구조였다.
  → `TranslatableFields`·`extractTranslatableFields`·프롬프트에 4개 추가 + 읽기 경로 `localize()` 경유. `risks`·`preparation` 은 **환자 안전 문구**라 "축약·생략 금지, 항목 누락은 사고" 규칙을 프롬프트에 명시.
  → 같은 부류 **`full_description`** 도 읽기는 `localize()` 인데 번역 대상엔 없었다(기존 구멍) → 같이 메움.
- **유형1-②(2라운드에서 발견)**: 번역 트리거 조건이 `name || description || tags` 손나열이라 **「주의사항」만 고치면 번역이 안 돌아** 그 칸만 영원히 한국어로 남는다. 호출부 6곳이 제각각(병원은 `+ specialties`, 프로필은 `+ location_kr`) → 단일 SoR `hasTranslatableField()` 로 통일. 번역 대상이 늘어도 조건을 빠뜨릴 수 없다.
- **유형7**: 어드민 폼(`TreatmentManager.jsx`) ↔ 저장 payload(`page.jsx`) **필드 집합 15개 완전 일치** 확인(입력칸 있는데 저장 안 되는 칸 0, 반대도 0).
- 보류(고치지 않음): `address_detail`(병원 주소 상세)도 `localize()` 없이 원문 노출 — **기존 것이고 주소는 한국어 표기가 오히려 유용**할 수 있어 PO 판단 몫으로 남김.
- 라운드: 3 (3라운드 무발견 도달)
- 검증: `tsc` 0 · `lint` 에러 0 · `vitest` 64파일 566개 · `next build --webpack` · `check:content` · `check:schema-refs`(자기시험 19개)

---

## 2026-07-15 축 C #2 (유형 6 — 컬럼레벨 schema-refs + stale 생성타입 발견·재생성 + 실버그 2건)

- 작업: `check:schema-refs`를 테이블 레벨 → **평문 select 컬럼 레벨**로 확장(생성타입 `src/types/database.types.ts` 대조, 비차단·경고).
- **발견①(도구가 도구를 고침)**: 확장 직후 22건 경고 → 전부 실재 컬럼이라 이상 → 생성타입이 **stale**(inquiries 35 vs 실DB 61 컬럼, Supabase MCP 실측)임을 발견. **생성타입 재생성**(148KB, 26컬럼 복원) = #63 문서-현실 드리프트를 코드 타입에 적용.
- **발견②(실버그 2건 수확→수리 완료, DB 실측 대조)**: 재생성 후에도 남은 = 진짜 없는 컬럼 참조 →
  1. ✅ `reminders/scheduleReminder.ts` profiles 없는컬럼 5개 → 등록사용자 리마인더 무증상 실패. **수리**: 실컬럼(full_name·role)만 + 이메일 auth.users 조회 + userId로 in_app 보장.
  2. ✅ `crawl/jobs/[id]/items/route.ts` crawl_raw_items.name(실=title) → **수리**: name:title alias + ilike("title").
  + tsc 회귀 1건(재생성 타입에서 inquiries.intake=Json spread 불가, step2/route) 수리.
- 정책: 컬럼레벨 우선 비차단(경고) — 재생성 직후 파서 엣지 대비. 안정 후 blocking 승격.
- rubric DoD-6 + DEFINITION_OF_DONE + KNOWN_ISSUES 동기 갱신.
- 의미: 유형6 가드 확장 한 번에 (a)stale 타입 발견·수리 (b)조용한 0 실버그 2건을 PO 화면 없이 수확 = 완성도 루프가 "그물 밖 통로"를 실제로 메움.

## 2026-07-15 축 C #1 (범위 무한정화 — 유형 1·5 가드 확장 + 실누출 수확)

- 작업: check:content 한글누출 가드 2룰(§4 줄단위·§7 파일단위)의 폴더 화이트리스트(app/patient+3폴더)를 `isPublicFacingFile()`(공개 화이트리스트 ∧ ¬백오피스 ∧ ¬api) 판정으로 확장 + 동적링크 404 검사 app/→src/ 확장.
- 측정→수확: 확장 직후 findings 소수(§7 2·§4 2)라 홍수 없음. 진짜 누출 2건 6개어화(**미완성→완성**):
  1. `app/inquiry/_components/UnifiedInquiryFunnel.jsx:946` — 업로드 힌트 "최대 10MB · 5개" 통짜 한글 → `tl("uploadHint")` 6개어 추가.
  2. (§7) 공개 컴포넌트 스캔이 이제 마케팅/환자 퍼널 전체를 봄.
- 오탐 정밀 제외(의도적 한국어 보호): ① `app/opinion`(국내 의사용 소견 화면) → 백오피스 제외목록으로 ② `src/components/GoogleMap.jsx`(한글=지오코딩 매칭 리터럴, 표시 아님) → allow ③ `대한민국 / Korea`(국가선택 자국명, 中国/日本과 동일 패턴) → allow.
- #81(costs 사각)·#73(알림링크 사각)은 **이미 해소돼 있었음**을 매핑으로 확인 — 재수리 아님, 진짜 남은 사각(공개 퍼널)만 닫음.
- rubric DoD-1·DoD-5 gap/guards + DEFINITION_OF_DONE.md 동기 갱신(check:completeness 정합 통과).
- 남음(축 C 잔여): 컬럼레벨 schema-refs(유형6) + 공통가정 소비자 전수 스캐너.

## 2026-07-15 완성도 감사 #1 (유형 3 문서-현실 드리프트 · 첫 실가동)

- 스캔: 유형 3(문서-현실 드리프트) — 살아있는 문서(KNOWN_ISSUES·PROJECT_CONTEXT 핸드오프·CLAUDE·DESIGN·manuals) 근거 대조.
- 발견: **드리프트 3 · 죽은참조 0 · 역드리프트 0** (+ 판단필요/DB확인 1).
- 수정(사실 교정, 확신 높음 3건 전부 종결):
  1. KNOWN_ISSUES #88 — consultation notes 이미 AES-256-GCM 암호화 완료인데 "미암호화 잔존"으로 남아 있던 것 → 종결.
  2. PROJECT_CONTEXT — "끝냈지만 미머지" 3건(#562·#567·#545) 실제론 전부 main 머지됨 → 머지완료로 교정 + 브랜치정리 안내 갱신.
  3. PROJECT_CONTEXT 리브랜드 TODO — PNG 앱아이콘·`healwith.co.kr` 도메인 둘 다 완료인데 TODO로 남아 문서 간 모순(KNOWN_ISSUES:358·관문12와 배치) → 종결.
- 보류(PO/DB 확인): playbook_pattern 0건 → "3-Tier RAG" 실제 1-Tier 여부(DB row 실측 필요, KHIDI 점수 연관). 정적 확인 불가라 남김.
- 라운드: 1 (유형 3 확신 높음은 소진).
- 유형 7(시각 회귀): rubric DoD-7에 `content-clip-sweep` 배선 완료 + 나이틀리 CI(프로덕션)에서 상시 가동. 이번 세션 ad-hoc 프리뷰 실행은 node_modules 없음(fresh clone)이라 불가 — `npm ci` 필요. 나이틀리가 커버하므로 별도 실행은 필요 시.
- 의미: **루프 첫 실가동에서 #63 부류 드리프트 3건을 PO 스크린샷 없이 기계가 수확·종결** = "미완성→완성" 첫 성과 + 후속 세션의 허위 재발견 헛수고 3건 예방.

## 2026-07-15 완성도 감사 (시스템 구축 — 기준선)

- 스캔: 구축일이라 전수 감사는 생략. 7유형 등록 + `check:completeness` SoR 무결성 게이트 통과 확인.
- 수정: 없음 (골격 착수 — 문서+루프 뼈대) / 보류: 없음
- 라운드: 0 (다음 세션부터 유형 3·7 대상 정식 감사)
- 메모: 골격 첫 타깃 = 유형 3(문서-현실 드리프트)·유형 7(시각 회귀) = 지금도 PO 눈이 유일한 탐지기인 두 유형. 축 B(cron·자동머지 배선)·축 C(범위 무한정)는 후속.
