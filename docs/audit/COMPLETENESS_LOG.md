# 완성도 감사 로그 (`/completeness-audit`)

> "완성 판정(Manager)"을 사람 눈에서 기계로 옮긴 루프의 기록이다. (2026-07-15, OKKY "Codex 72시간 사이클" 칼럼에서 착안)
> 채점표 = `src/lib/completeness/rubric.js` (사람용 `docs/DEFINITION_OF_DONE.md`). 형식·루프 구조는 `.claude/skills/completeness-audit/SKILL.md` 참고.
> 새 엔트리는 이 안내문 바로 아래에 추가.

---

## 2026-07-20 완성도 감사 (범위: diff — 후임 운영자 인수인계서)
- 스캔: 유형 3(문서-현실 드리프트) 중심 / 발견: **0건**
- 대조: 문서가 가리키는 참조 전수 실측 — docs 13개 파일 전부 존재, `DESIGN.md`(루트)·`/admin/khidi/conversion` 라우트(`app/admin/khidi/conversion/page.jsx`) 실재, 슬래시 명령 5종 전부 유효(`/handoff`·`/doc-health`·`/completeness-audit`=skills, `/trend`=commands, `/code-review`=빌트인), 계정·지표(Supabase ID·Vercel `healo-khidi`/`bonrois-projects`·Zoho 3계정·KHIDI 12/120/90·8/27)가 CLAUDE.md·핸드오프와 일치, `QUICK_START.md 무시` 안내도 실제 Vite/Cursor 잔재로 정확.
- 유형 7(시각 회귀)·1·2·6: 앱 UI/코드 변경 없음(docs-only + 별도 아티팩트) → 해당 없음.
- 수정: 없음(발견 0) / 보류: 없음 / (제안) 향후 세션 발견성 위해 CLAUDE.md·PROJECT_CONTEXT에서 이 문서 1줄 링크 가능 — 저위험이나 이번 범위 밖이라 미실행.
- 라운드: 2 (연속 무발견 도달)

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
