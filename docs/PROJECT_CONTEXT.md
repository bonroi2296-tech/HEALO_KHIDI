# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

---

## 🔖 세션 핸드오프 (2026-06-19 밤늦게) — AI 챗 응답 깨짐 긴급수정 + #85 배포 + 게스트채팅 실검증 + 중복정리 1·2단계

**이번 세션 한 일 (PR 3건 전부 main 머지·실서비스 배포):**
- **🔥 AI 챗 응답 깨짐 긴급수정 ([#87](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/87) 머지·배포):** PO 스크린샷 제보 — 답변이 "1,800만 원) 선이며…(출처: healwith" 처럼 앞뒤 잘림 + 인사·공감 없이 가격부터 들이미는 이론식. 원인 2개: ①`gemini-flash-latest`(Gemini 2.5 Flash)의 thinking(추론) 토큰이 `maxOutputTokens`에 포함 → 같은 날 가독성 커밋(`6470e5d`)이 상한 768로 낮추자 추론이 예산 다 먹고 답변이 문장 중간에 잘림. ②견적자료 커밋(`f1d8d87`)의 INTAKE&ESTIMATE 규칙이 일반·감정 질문에도 가격 토해냄. 수정: `generateReply.ts`+`app/api/chat/route.ts`에 `thinkingConfig.thinkingBudget=0`(추론 끔·지연/비용↓), 공개챗 상한 768→1024, 프롬프트를 "가격은 명시적으로 물을 때만, 일반질문엔 따뜻하게+되묻기"로 교정. `docs/POSTMORTEMS.md #5` 기록.
- **PR [#85](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/85) 머지·배포:** 직전 세션의 초안(미배포)이었음 → PO 승인으로 머지(서버 Sentry 부활 + 게스트채팅 PII 암호화 + 기초수리 24파일). 이게 안 합쳐져 있어서 1번 검증이 막혀 있던 것.
- **중복정리 1단계 ([#86](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/86) 머지·배포):** ①죽은 `withErrorHandler`(0 사용) 제거. ②이메일 발송기 2벌→1벌(`notifications/emailSender.ts` 삭제, `adminNotifier`를 통합 `email/sendEmail.ts`로; **프로덕션 무중단 위해 통합 sendEmail이 레거시 env 이름 `AWS_REGION`/`AWS_ACCESS_KEY_ID`/`SES_FROM_EMAIL`도 인식하도록 fallback 추가**).
- **중복정리 2단계 ([#86](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/86) 동일 PR):** 브라우저 Supabase 접속코드 3벌→1 구현. `src/supabase.js` 삭제(import 2곳 repoint), `data/supabaseClient.js`를 정본 `supabase/browser.ts` 싱글톤 위임 프록시로 축소(호출부 9곳 무변경). 효과: 실제 브라우저 클라 1개 통일 → "Multiple GoTrueClient instances" 경고 해소.

**왜 그렇게 했는지:**
- **AI 수정을 dedup PR과 분리해 먼저 머지(PO 결정):** 긴급 수정이 큰 리팩터에 묶여 배포 지연되면 안 됨 → 새 브랜치 `claude/ai-chat-reply-fix`로 빼서 #87 단독 머지(PO가 새 브랜치 권한 부여).
- **#85를 먼저 머지(PO 결정):** 1번 검증(Sentry·채팅암호화)이 #85에만 있고, dedup도 #85가 건드린 supabaseAdmin·deps 위에서 해야 충돌 없음 → "#85 먼저 머지·배포" 선택.
- **서버 클라 통합은 일부러 안 함:** service_role(RLS 우회) vs anon(RLS 적용)으로 **보안등급이 달라** 잘못 합치면 보안사고. 15+곳 사이트별 "어느 권한 기대하나" 검토가 필요 → 깨끗한 별도 세션으로.
- **이메일 레거시 env fallback:** 두 발송기의 env 규약이 달라서, 프로덕션이 옛 이름만 설정돼 있으면 통합 시 관리자 메일이 조용히 끊길 위험 → 신규·레거시 둘 다 인식하게 해 무중단.

**안 끝났거나 보류:**
- **⭐ 서버 Supabase 클라 4벌 통합(다음 세션 메인):** `supabaseAdmin`(116)·`supabase/server.ts`(16)·`data/supabaseServerClient.ts`(15)·`data/supabaseServer.js`(2). 보안등급(service_role/anon) 사이트별 검토 필수. 안전 패스로 단계적.
- **서버 Sentry 실수집(런타임) 미확인:** 코드·배포·라우트(403 보호)는 확인했으나 **DSN 실제 켜짐 + 에러가 Sentry 대시보드 도착**은 못 봄(관리자 세션·Sentry 접근 없음). PO 1클릭 필요.
- (이전 트랙 그대로 대기) 화상상담방 라이브 UI 검증 / 발화자 역할 DB 저장 / Gemini 유료 AI 회의록(#68).

**주의·함정:**
- **배포돼도 PO가 옛 화면 보면 캐시** — AI 챗 테스트는 반드시 **새 시크릿 창**(Ctrl+Shift+N).
- **JSDoc 주석에 `AWS_*` 뒤에 슬래시를 붙이면 주석이 조기 종료**돼 빌드 깨짐(이번에 한 번 밟음, 즉시 수정). 주석 안 와일드카드 경로 표기 주의.
- **이메일 통합 검증은 코드·타입까지만** — 실제 관리자 메일 발송(SES/Resend)은 프로덕션 env 의존이라 실전송 미확인. 레거시 fallback으로 안전하게 했으나 실발송 1건은 다음에 문의 들어오면 확인.
- 중복정리 브라우저 변경은 공개 SSR 페이지(홈·병원·검색) 영향 → CI smoke E2E가 검증(초록 확인 후 머지). 과거 이 검사가 SSR 크래시 잡았음.

**다음 세션이 먼저 할 일 (우선순위):**
1. **⚠️ 직전 미검증분 먼저 확인:** (a) **서버 Sentry 실수집** — 관리자 로그인 → `/api/sentry/test` 1회 열기 → Sentry 대시보드에 "의도된 테스트 에러" 도착 확인(DSN 켜짐 전제). (b) **AI 챗 품질** — 새 시크릿 창에서 PO 스크린샷의 그 질문("친구 유방암…") 재현 → 잘림 없이 따뜻하게 답하는지. 안 되면 받아서 잇기.
2. **중복정리 3단계 — 서버 Supabase 클라 4벌 통합:** 보안등급(service_role/anon) 사이트별 검토하며 단계적, 매 단계 `tsc`·`vitest`·CI 통과. (브라우저 클라 `data/supabaseClient.js`도 추후 `supabase/browser.ts`로 완전 흡수 가능하나 호출부 변경 필요 — 선택.)
3. (대기) 화상상담방 라이브 검증 / 발화자 역할 DB 저장 / Gemini 유료 AI 회의록(#68).
4. KHIDI 중간평가(2026-08-27) 상시 — `docs/KHIDI_중간보고_베이스.md`.

**검증 상태:** PR [#85](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/85)·[#86](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/86)·[#87](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/87) = **CI(ci·smoke·Vercel) 전부 초록 + main 머지 + 프로덕션 배포 완료.** 매 단계 `tsc --noEmit`·`vitest 129개`·`check:content` 통과. **게스트 채팅은 프로덕션에서 실검증 완료 ✅** — 실제 채팅 1건 생성→DB 확인(이름·이메일·전화 AES-256-GCM 암호문 저장, 국가코드 평문, 블라인드 해시 존재)→resume 복호화 정상→이름+이메일 lookup 찾음→테스트행 삭제. **❌ 서버 Sentry 런타임 실수집은 미검증**(코드·배포·403보호만 확인, 대시보드 못 봄 → 위 1-(a)). 열린 PR: 없음(#85·#86·#87 전부 머지). 남은 브랜치 `claude/validation-dedup-refactor-vc9lr4`는 머지 완료분이라 정리 가능.

**다음 세션 첫 프롬프트 (PO 복붙용):**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프(2026-06-19 밤늦게) 읽어. 그다음 순서로: 1) 직전 미검증분 확인 — (a) 관리자로 /api/sentry/test 열어서 Sentry 대시보드에 테스트 에러 도착하는지(서버 에러감시 실작동) 봐주고, (b) AI 챗 새 시크릿창에서 "친구가 유방암인데 한국 오고싶대 뭐라고 설명해줘" 물어서 답 안 잘리고 가격부터 안 들이미는지 확인. 안 되는 거 있으면 고쳐. 2) 메인 작업 = 중복정리 3단계: 서버 Supabase 접속코드 4벌(supabaseAdmin·supabase/server·data/supabaseServerClient·data/supabaseServer)을 통합하는데, service_role(보안우회)/anon(보안적용) 등급이 사이트마다 달라서 한 방에 하지 말고 사이트별 검토하며 단계적으로 + 매 단계 tsc·test·CI 통과. 끝나면 before→after 보고. 상세는 docs/KNOWN_ISSUES.md 남은 백로그.

---

## 🔖 세션 핸드오프 (2026-06-19 밤) — 5축 기초 감리 + 토대 수리 (PR #85, 중복정리만 다음 세션)

> **트리거**: PO가 "다른 클로드 세션이 전체 리뷰해서 '기능만 하다 기초가 부실하다'는 문서를 만들었다"며 제3자 시선의 객관 분석을 요청 → 그 문서는 PO 로컬에만 있어 못 봄(본판 미푸시). 대신 코드로 직접 5축 감리 후, PO가 "싹 다 수리"·"핸드오프+중복정리는 새 세션" 선택.

**이번 세션 한 일 (PR [#85](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/85) — 초안, 커밋 7개):**
- **5축 제3자 기초 감리**(병렬 에이전트 5): 보안 82 / 의존성·DB·문서 58 / 테스트·CI 52 / 타입·품질 48 / **관측 42(최약점)**, 종합 ≈56/100. 결론="보안 뼈대는 튼튼한데 고장 감지 배선·부채 차단 가드레일이 빔".
- **수리(위험3+근본원인+백로그, ≈56→71 추정):**
  1. **서버 Sentry 부활** (`instrumentation.ts`): `register()`/`onRequestError`의 `return;` 제거 → 서버·SSR·크론 에러 수집 재활성(DSN 시). 그간 한 개도 안 잡혔음(KPI 데드맨스위치·AI 차단기 경보 무음).
  2. **`supabaseAdmin` fail-closed** (`src/lib/rag/supabaseAdmin.ts`): 더미 fallback 을 빌드단계(`NEXT_PHASE`)로만 한정, 런타임 env 누락 시 throw → 조용한 데이터 유실 차단.
  3. **`pg` 오배치 교정 + 취약점 31→7** (`package.json`): pg devDeps→deps(런타임 30파일 import), axios 1.18.0·ws 8.21.0 patch, 죽은 `@ai-sdk/openai`·`@ai-sdk/react` 제거. `playwright`→devDeps.
  4. **CI 타입검사 게이트** (`.github/workflows/ci.yml`): `tsc --noEmit` 머지 차단 추가(현재 통과). `eslint`는 기존 에러 69건 정리 전까지 정보용(비차단).
  5. **기본 임시비번 healo1234 제거** (`admin/staff` route+page): 계정마다 crypto 랜덤 14자.
  6. **게스트 채팅 PII 평문저장 차단** (`public/chat/start` 외 6파일): 이름·이메일·전화 AES-256-GCM 암호화 + metadata SHA256 블라인드 인덱스(검색용), 읽기 경로 `decryptMaybe` 복호화. 마이그레이션 불요·옛 평문 행 호환.
  7. **운영 알림 실제 연결**: `operationalAlerts.sendAlert` 콘솔스텁→Sentry+이메일(critical/warning). `adminNotifier.sendSMS` 가짜 'sent' 제거(미설정 채널 정직하게 skip).
  8. **핵심경로 테스트 + 커버리지 복구**: `encryptionV2.test.ts`(9개), `@vitest/coverage-v8` 추가(불가→58% 측정). 총 129 테스트.
  9. **README** 피벗 반영 전면 재작성, **KNOWN_ISSUES** 감리 결과·백로그 기록.

**왜 그렇게 했는지:**
- 게스트 PII는 `lookup`이 `ilike`로 이메일·이름 검색해서 단순 암호화하면 검색이 깨짐 → 기존 `safeHash`/`isEncryptedPayload` 패턴으로 **블라인드 인덱스(metadata 해시)** 채택 → DB 마이그레이션 없이 코드만으로 해결, 옛 평문 행은 `decryptMaybe`로 자동 호환.
- 알림은 PO가 실제로 쓰는 채널(SES/Resend 이메일)이 살아있어 거기로 연결. SMS/알림톡은 provider 미연동이라 "가짜 성공" 대신 정직하게 skip(설정 시에만 시도).
- lint를 CI 차단 게이트로 바로 못 건 이유: 기존 에러 69건 → 막으면 PO 합치기가 다 막힘. typecheck는 통과하므로 그것만 차단 게이트로.

**안 끝났거나 보류:**
- **⭐ 중복 정리(다음 세션 — PO가 새 세션으로 결정)**: Supabase 클라이언트 6벌(server 3·browser 3)·이메일 발송 2벌(env 규약 상이)·`withErrorHandler` 데드 추상화. **108+ import 사이트 영향이라 실서비스 리스크 → 깨끗한 세션에서 단계적으로.**
- `any` 813개(인증·복호화 66) 점진 축소, God컴포넌트 `consultation/[id]/page.jsx` 2,883줄 분할, 얕은 헬스체크, 남은 7취약점(major 강제 필요라 보류), 마이그레이션 DROP 가드.
- (이전 트랙) 화상상담방 라이브 UI 검증·발화자 역할 DB 저장·Gemini 유료 AI 회의록(#68)은 그대로 대기.

**주의·함정:**
- **서버 Sentry·게스트 PII 암호화는 코드·typecheck·테스트만 통과 — 프로덕션(DSN·암호화키 설정) 배포로 실동작 미검증.** Sentry는 CI 빌드(DSN 없음)로는 증명 안 됨, 프로덕션에서만 활성.
- `lookup` 해시 매칭은 **새 행만** 찾음(옛 평문 행은 해시 없음) → 재방문 이력 복구가 옛 행엔 안 됨(토큰/세션 복구는 정상). 의도된 비파괴 전환.
- 알림 카운터는 인메모리 → 서버리스 콜드스타트마다 리셋(누적 임계 부정확, 개별 전송은 정상).
- `package-lock.json`이 npm install로 크게 재생성됨(1223→1110 패키지) — `npm ci` 통과 확인했으나 diff 큼(무해).

**다음 세션이 먼저 할 일 (우선순위):**
1. **⚠️ 직전 미검증분 먼저 확인**: PR #85 머지·배포 후 **프로덕션에서 (a) 서버 Sentry 에러 실수집되는지** (`NEXT_PUBLIC_SENTRY_DSN` 설정 전제, 테스트 에러 1건 발생시켜 Sentry 도착 확인) **(b) 게스트 채팅 시작→PII 암호문 저장·resume 복호화·lookup 재방문 검색** 실제 동작. 안 되는 항목 받아서 잇기.
2. **중복 정리 트랙**(이번 세션 보류분): Supabase 6벌→1~2벌, 이메일 2벌→1벌. 단계적·테스트 동반.
3. (대기) 화상상담방 라이브 검증 / 발화자 역할 DB 저장 / Gemini 유료 AI 회의록(#68).
4. KHIDI 중간평가(2026-08-27) 상시 — 이번 기초 감리·관측 복구는 "ICT 체계 구축" 정성평가 기여.

**검증 상태:** PR [#85](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/85) **초안**. 로컬 `npm ci`·`tsc --noEmit`·`test:run`(129)·`test:coverage`·`verify:rag` **전부 통과**. GitHub CI(`ci`·`Smoke Tests`)는 핸드오프 시점 **실행 중**(로컬 동일 단계 통과 확인). 직전 커밋들 **Vercel 프리뷰 배포 Ready**(빌드 안 깨짐 = Sentry 재활성으로도 빌드 정상). **❌ 서버 Sentry 실수집·게스트 PII 암호화 실저장은 프로덕션 배포로만 최종 확인 — 미검증(위 1번).** check:content 류는 미실행(콘텐츠 미변경).

**다음 세션 첫 프롬프트 (PO 복붙용):**
> 먼저 `docs/PROJECT_CONTEXT.md` 최상단 핸드오프(2026-06-19 밤) 읽어. 그다음 순서대로:
> **1) 직전 미검증분 먼저 확인** (PR #85 머지·프로덕션 배포된 뒤) — 서버 에러감시(Sentry)가 실제로 에러를 수집하는지(`NEXT_PUBLIC_SENTRY_DSN` 설정 확인 + 테스트 에러 1건 내서 도착 확인), 게스트 채팅이 이름·이메일·전화를 **암호문으로** 저장하고 새로고침(resume) 시 복호화돼 보이며 이름+이메일 **재방문 검색(lookup)** 되는지. 안 되는 거 있으면 고쳐.
> **2) 중복 정리 (이번 메인)** — Supabase 접속 클라이언트 6벌→1~2벌, 이메일 발송 2벌→1벌, `withErrorHandler` 죽은 추상화 처리. **108개+ 파일이 물려 실서비스가 깨질 수 있으니 한 방에 말고 단계적으로 + 매 단계 `tsc --noEmit`·`test:run` 통과 확인.** 끝나면 점수표 before→after로 보고.
> 상세 백로그는 `docs/KNOWN_ISSUES.md` 「남은 백로그」 참고.

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
