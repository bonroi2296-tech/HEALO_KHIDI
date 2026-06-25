# HEALO KHIDI — 알려진 이슈 / 전수 QA 발견사항

> 2026-05-21 전수 QA. 빌드·테스트는 정상. 아래는 발견된 개선점 — 심각도·범위 표기.

---

## 🟡 2026-06-25 코디네이터에게 AI 챗 뷰가 없음 (AI 핸드오프 종은 어드민에게만)

- **상태**: AI 챗 스레드 모니터(`/admin/chat`·`/api/admin/chat/threads`)가 `requireAdminAuth` **어드민 전용**. 코디네이터(`role=coordinator`)는 AI 챗 대화를 볼 화면이 없음.
- **영향**: 새로 추가한 "AI 챗 사람 연결 요청(handoff) → 종 알림"(POSTMORTEMS #41)이 **어드민에게만** 발송됨. 코디는 AI챗 리드를 직접 보려면 어드민 권한이 필요. 현재 운영(PO 단독=어드민)에선 문제 없으나, 코디를 별도로 운용하면 AI챗 리드가 코디에게 안 닿음.
- **후속(별도 과제)**: 코디용 AI 챗 읽기 뷰(`/coordinator/chat` 또는 인박스에 handoff 스레드 통합) + 그때 `notifyStaffChatHandoff` 수신자에 coordinators 추가. inquiries 기반 인박스에 `chat_threads`(hand_off_requested) 머지가 가장 단순한 통합안.

---

## 🚦 2026-06-24 출시 준비 점검 (프로덕션 실측 — "오픈해도 되나?" 근거)

> PO "이제 오픈해도 되나?" → 추측 금지(POSTMORTEMS #35). 브라우저 미설치(프록시 차단)라 **API 레벨 실측**으로 핵심 플로를 프로덕션(`healwith.co.kr`)에서 직접 두드림. **부작용(가입·문의 제출) 회피**, AI챗 1건만 테스트 후 삭제.

### ✅ 라이브 작동 확인 (근거)
- 공개 페이지(홈·문의·치료·병원·원격협진·치료여정·암종상세) 전부 **200 렌더**. 다국어 6개(en·ko·ru·**kz**·zh·ja) 각 lang 정상. `/api/health` db:up. sitemap·robots 정상. 404 정상.
- 인증 페이지(`/login`·`/signup`·`/reset-password`·`/auth/confirm`) **200·폼 렌더** = #341 인증 머지 prod 반영 확인.
- **코디 로그인**(`coordinator@test.com`) → `/api/portal/inbox` 실문의(#23)·`/api/portal/threads` 에이전시 스레드(#21) **반환**. **환자 로그인**(`patient@test.com`) → 채팅 스레드·재진 endpoint 정상(빈건=데이터0).
- **AI챗 공개 플로**: 위암 환자 질문에 따뜻·완결·출처표기·언어정확·코디연결 유도(반성문 #5·#23 정반대). 테스트 스레드 삭제 완료.

### 🔎 겉보기 의심 → 파보니 블로커 아님
- `/kk` 404는 내부 로케일코드가 `kz`라서(정상, `proxy.ts`가 브라우저 kk→kz 매핑). 카자흐는 `/kz`에서 작동.
- `/ru/for-russian-patients`·`/kk/for-kazakh-patients`는 의도된 레거시 랜딩(Yandex 색인, `proxy.ts` LEGACY_SKIP). ~~🔸 사소: html `lang="en"` 속성만 영어~~ ✅ **해결(#361)**: LEGACY_SKIP 경로에도 `x-locale` 주입 → `lang="ru"`/`lang="kk"` 렌더(dev 실렌더 확인).

### 🔴 오픈 전 남은 관문 (PO만 닫을 수 있음 — 이게 닫히면 오픈 OK)
1. **가입→인증메일→로그인 / 비번찾기→메일** 실제 1회 통과(실메일 — API로는 부작용이라 미검증).
2. **Supabase 이메일 템플릿 href를 token_hash로 교체**(인증 자동로그인·스캐너안전 완성. `docs/PROJECT_CONTEXT.md` 인증 핸드오프 참조).
3. **구글 OAuth 게시**(현재 "테스트"라 실환자 구글가입 막힘).
4. **E2E Secrets 등록**(`docs/E2E_SECRETS_SETUP.md`) → 로그인 화면 자동검사 가동.
   - 🟢 **2026-06-24 준비 완료**: 5역할 테스트계정(`patient·coordinator·admin·agency·clinic@test.com`) 비번을 `test1234`로 통일·실로그인 검증 + 프로덕션 인증 API 도달(코디 inbox 200·어드민 funnel 200·환자→어드민 403 권한분리) 실측. **남은 건 PO가 GitHub Secrets 12개 복붙뿐**(역할 10 + `SUPABASE_SERVICE_ROLE_KEY`·`ENCRYPTION_KEY_V1`).
5. **iOS 영상상담 마이크 실기기 검증** / **K-01 점수판 데모데이터 정직성**(진짜 유치 0).
6. 🔴 **약한비번 테스트계정 삭제/비활성** — E2E 위해 `admin@test.com` 등을 `test1234`로 둠. `admin@test.com`은 role=admin이라 비번만 맞으면 실서비스 어드민(PII 복호화) 진입 가능. **PO 약속: 오픈 전 삭제/비활성**(`app_metadata.disabled=true`). 안 하면 실서비스에 약한비번 admin 잔존. (`docs/TEST_ACCOUNTS.md` ⚠️ 참조)

### ❌ 아직 검증 못 함(정직)
화면 시각 렌더(브라우저 미설치 — API만), 가입/비번찾기 실메일 end-to-end, 영상상담·iOS, 문의 제출→DB. → 위 5번 관문에서 사람이 1회.

---

## 🟡 2026-06-24 스키마 참조 가드(S2)가 잡은 존재하지 않는 테이블 참조 (POSTMORTEMS #35-S2)

> 새 가드 `npm run check:schema-refs`로 코드의 `.from("테이블")`을 실재 public 테이블과 대조하다 발견. 1건은 즉시 수정, 2건은 dead-path라 allowlist로 추적 후 별도 수정.

- ✅ **수정됨**: `app/api/admin/khidi/ai-feedback/route.ts` — 부정 피드백 메시지 내용을 존재하지 않는 `inquiry_messages(content/role)`에서 조회 → 어드민 화면에 메시지 내용이 통째로 안 떴음(조용한 실패). 실재 `chat_messages(message_text)`로 교정 + 에러 표면화.
- ~~🔸 **추적(dead-path, 가드 allowlist)**~~ ✅ **해결(#362)**: ①`dispatch-surveys`의 `.from("patients")` 죽은 가지 제거(수신자=inquiries 단일화). ②`alertService`의 `.from("users")` → `auth.admin.listUsers` 이메일 매칭으로 교체(env 설정 시 실동작). 가드 allowlist 비움 → `check:schema-refs`가 이제 전부 실재 테이블만 통과.
- **가드 한계**: 현재 **테이블 레벨**만. 컬럼 레벨(예: chat_messages에 없는 `content`/`role`)은 생성타입(`database.types.ts`) 도입과 함께 후속.

---

## 🚀 2026-06-22 "정식 운영" 출시 점검 (3축 병렬 감사 + 실코드·실DB 검증)

> PO 지시 "내일 당장 운영해도 버그 0·만족도 100%(사용자=외부 협력기관 포함)". 환자/협력기관/인프라 3축을 병렬 감사 후 **추정 그대로 안 믿고 실코드·실DB로 재검증**. 핵심: 감사봇이 "런치블로커"로 올린 것 중 상당수가 검증 결과 등급이 내려감(=검증의 가치).

### ✅ 검증 결과 — 이미 해결됐거나 영향 낮음(과대평가 정정)
- **EDGE-3/4/5(케이스상태 전파)**: 현 코드에 **이미 구현됨**. 상담완료→`advanceCaseStatus`(`app/api/khidi/consultation/[id]/route.ts`), admin leads/assign 대칭화, conversion-funnel PATCH가 `case_status_history` 기록. → 블로커 아님.
- **`cancer_patient_intakes` step2 무음 upsert 실패(KNOWN_ISSUES #6)**: **실재하나 영향 낮음**으로 정정. 실DB 확인 = 총 3행·`inquiry_id` 있는 행 **0개**·평문치료 **0행**(퍼널이 여기 쓴 적 없음). 그러나 **진짜 데이터는 `inquiries.intake`에 AES 암호화로 안전**하고, 코디 화면(`/coordinator/intakes`)은 이 테이블이 아니라 `consultation_sessions`(`/api/khidi/consultation`)를 읽음 → 보조 리포팅 테이블만 비어있음. **실패 원인(검증 확정)**: ①`inquiry_id`에 UNIQUE 제약 없음 → `onConflict:"inquiry_id"` upsert는 Postgres가 무조건 거부 ②`cancer_type` NOT NULL인데 payload에 없음(이중 결함) ③코드가 평문 `current_treatment`에 쓰려 함(옆에 `current_treatment_encrypted` 존재). **수정=스키마 변경+EscalationQueue 동작 변경이라 RISKY → PO 결정**(긴급 아님).
- **AI 디플렉션 루프 / 거짓 접수**: 현 코드에 가드·세션상태 주입 반영됨(이전 세션). 블로커 아님.

### 🟡 진짜 남은 출시 리스크 (PO 결정/라이브 검증 필요 — 자율 보류)
1. **🔴 [영상상담, iOS] 서버 STT 2차 getUserMedia가 LiveKit 마이크 탈취** — `app/consultation/[id]/page.jsx:1325`(2차 `getUserMedia({audio:true})`). iOS Safari는 2차 오디오 캡처가 1차(LiveKit 송출 마이크)를 **조용히** 빼앗아 환자 마이크가 죽음(throw 없음 → 코드의 catch도 안 걸림). 카자흐/러 환자 아이폰 = 정확히 이 경로. **영상상담은 헤더 전면배치 = 고객대면 핵심 → 최우선 실리스크.** 수정안 (a)iOS Safari는 서버STT 진입 자체를 막고 텍스트입력 폴백(작음·저위험, 단 iOS 자막 기능 degrade) (b)2차 캡처 대신 LiveKit 기존 마이크 트랙 재사용(견고하나 God컴포넌트 수정+**실아이폰 2인 검증 필수**). **빌드·iOS 검증 불가 환경이라 blind 수정 보류** — PO가 (a)/(b) 택1 + 라이브 검증.
2. **[협력기관 가시성] EDGE-1: 환자 여정바가 `case_status`를 안 읽음** — `src/lib/patient/journeyState.js`(`computeCurrentStage`)가 `inquiry_events`만 봄 → 코디/병원이 case_status를 올려도 환자 대시보드 정체. **단 환자/코디 포털은 현재 미활성(메뉴 미연결·계정 없음)** → 내일 고객영향 0. 평가관이 환자로 로그인해 여정 볼 시나리오면 문제 → **포털 활성/평가 전 수정**. RISKY(환자 화면 단계 재정렬 가능, 라이브 검증).
3. ~~**[다국어 엣지] 영상방 게스트 `targetLang` 하드코딩 `ru`**~~ ✅ **해결(#360)**: `guest-join` API가 세션 `patient_language`/`doctor_language` 반환 → 게스트 클라가 역할 기반으로 상대 언어 결정(없으면 기존 기본값 폴백). ⚠️ 실자막 동작은 실상담 1회 육안확인 권장(LiveKit+2인 필요).
4. **soft-404(P2, 위 별도 섹션)** — PO 이미 "보류" 결정.

### ✅ 이번 세션 수정 적용 (PR #269)
- **iOS 마이크 탈취 → 안전 폴백(PO 택1: 옵션A)**: `app/consultation/[id]/page.jsx` 서버 STT effect 진입부에서 **iOS(WebKit) 감지 시 2차 getUserMedia 자체를 안 함** → `mediaRecOk=false`로 "음성자막 불가 → 텍스트 입력" 폴백. iOS는 브라우저STT 또는 텍스트로(자동자막만 포기, 마이크 사망 차단). **실아이폰 라이브 검증은 여전히 PO 권장**(코드 가드는 결정적). 견고판(LiveKit 트랙 재사용)은 추후.
- **intake 저장버그 정상화**: `app/api/inquiries/step2/route.ts` — ①마이그레이션 `cancer_patient_intakes.inquiry_id` **UNIQUE 인덱스 추가**(prod 적용+`migrations/20260622_...sql`) ②`cancer_type`을 inquiry에서 가져와 NOT NULL 충족 ③민감필드를 `*_encrypted` 컬럼에 AES 저장(평문 중단). **동작 변화 주의**: 이제 퍼널 step2 인테이크가 `cancer_patient_intakes`에도 쌓임 → `GET /api/khidi/intake` 어드민 인테이크 목록에 퍼널 문의도 표시됨(정상이나 inquiries 목록과 중복 표시 가능). 정본은 여전히 `inquiries.intake`.
- **EDGE-1 환자 여정바 case_status 반영**: `src/lib/khidi/caseStatus.ts`에 `caseStatusToJourneyStage` 추가 + `src/lib/patient/journeyState.js` `computeCurrentStage`가 이벤트단계와 case_status단계 중 **더 진행된 쪽** 반환(후퇴 방지). 회귀테스트 추가(caseStatus.test.ts·journeyState.test.ts). **⚠️ 단 화면 표시는 아직**: `fetchPatientJourney`가 브라우저에서 service_role 테이블 직접 조회 + 암호화 email 매칭이라 **데이터가 client로 안 옴**(포털 미활성과 동일). 로직·테스트는 정확하나, 환자 여정바가 실제 뜨려면 **포털 데이터 서버 API 이관(P1)**이 선행돼야 함 → 별도 과제로 남김.

### 🔵 이미 다른 세션이 처리 중 (중복 금지)
- **PR #267**(다른 세션): 🔴**카자흐어(`kz`) 문의가 step1 zod에서 400 거부되던 핵심시장 블로커** 수정(POSTMORTEMS #24) + 공개 퍼널 6라우트 레이트리밋 DB화(KNOWN_ISSUES #7). → 이 두 건은 **#267로 해결 예정**이라 본 세션은 손대지 않음. **PO 추천: #267 CI 초록 시 머지**(카자흐 차단은 실유치 직격).

---

## 🟡 P2 — soft-404: 없는 치료/병원 슬러그가 HTTP 200 반환 (2026-06-22 기록·진단)

- **증상(실측)**: 없는 슬러그 `https://www.healwith.co.kr/treatments/<없는값>`·`/hospitals/<없는값>`이 **HTTP 200** 반환. 대조군(없는 일반경로 `/totally-random-path`)은 정상 **404**. 즉 `[slug]` 동적 라우트만 soft-404.
- **근본원인(코드는 정상)**: 서버 코드는 맞다 — `getTreatmentBySlug`는 없는 슬러그에 `null` 반환(`mapTreatmentRow(null)→null`, `.eq("is_published",true)` 포함), `app/treatments/[slug]/page.jsx:164`가 `notFound()`를 **정상 호출**. 실제로 응답 바디도 글로벌 `app/not-found.jsx`(NotFoundClient, "Error 404" UI)가 **올바르게 렌더**됨. **문제는 상태코드만 200으로 샘** — Next 16 동적 렌더(이 라우트는 `cookies()` 호출로 dynamic) + `notFound()` 상호작용에서 스트리밍 응답의 status가 404로 전파 안 되는 프레임워크 동작. (`hospitals/[slug]`도 동일 구조 → 같은 증상.)
- **영향(낮음)**: ①사용자 UX는 정상(올바른 404 화면 보임). ②비공개/없는 published 슬러그는 **sitemap에 없음**(#235에서 `is_published` 필터 + item- 3건 비활성, sitemap 40 URL 확인) → 크롤러가 이 URL에 도달할 경로가 거의 없음. ③유일한 손해 = soft-404의 약한 SEO 품질 신호(구글이 "200인데 빈 페이지"로 오인 가능). 내부 링크·sitemap 노출이 없어 **실질 위험 작음**.
- **판단: 지금은 보류(고치지 않음) 권장.** 진짜 404 상태코드를 동적 라우트에서 강제하려면 라우트 구조 변경 또는 Next 버전별 워크어라운드가 필요하고 **preview 배포로 실검증해야** 함(한 줄 아님). 평가(8/27)·앱스토어 우선. 고친다면 후보: (a) 슬러그 존재 여부를 `generateStaticParams`로 미리 굳혀 정적 404 경로화, (b) Next 16 `notFound` status 회귀 업스트림 확인 후 업그레이드, (c) 정 급하면 얇은 라우트 핸들러/리라이트에서 미존재 슬러그를 사전 404. **PO가 "SEO 깐깐하게 가자" 하면 그때 (a) 우선 착수.**

---

## 🌙 2026-06-21 야간 자율 감사 — 병렬 5축 감사 발견사항 (일부 수정·일부 PO 판단 필요)

> 평가지표(KPI)·보안·문의 퍼널·역할 연결·화상방을 병렬 감사. **고친 것은 draft PR**(PO 검토 전 배포 안 됨), **나머지는 아래에 정밀 기록**(런타임 검증/제품 판단/스키마 변경이 필요해 야간 임의 수정 보류).

### ✅ 이번에 수정함 (draft PR)
- **만족도 설문 발송 윈도우 누수**(K-03 대부분 미발송) → 14일 backfill. **PR #216**. POSTMORTEMS #19.
- **월간보고 명단**이 없는 테이블(`khidi_intakes`) 조인으로 항상 빈칸 → inquiries 기반 교체. **PR #216**.
- **KPI 집계오류가 대시보드/월간보고에서 0으로 조용히** 보이던 것 → canary 발사. **PR #216**.
- **EDGE-2: 코디 case_status→treatment/완료 시 유치(K-01) 누락**(POSTMORTEM #17 잔여위험) → outcome 자동집계(가드). **PR #216**.
- **AI상담(게스트) 리드 PII가 코디 인박스에 암호문**으로 떠 연락 불가(#13 부류) → `admin/chat/threads` GET 복호화. **PR(이 브랜치)**.
- **화상방 탭 'Chat'/'Translation' 하드코딩 영어** → 6언어화 + `_roomCopy.js` 패리티 가드 신설. **PR(이 브랜치)**.

### 🟡 PO 판단/런타임 검증 필요 (야간 임의 수정 보류 — 이유 명시)

1. **🔴 [데모 직격, iOS] 서버 STT 2차 getUserMedia 가 LiveKit 마이크를 가로챌 수 있음** — `app/consultation/[id]/page.jsx:1306-1314`. 브라우저 STT 미지원(iOS Safari) 환자에서 서버 STT 경로가 `getUserMedia({audio:true})`를 **별도로** 한 번 더 잡는데, iOS Safari 는 두 번째 오디오 캡처가 첫 번째(LiveKit 송출 마이크)를 빼앗는 경우가 잦음 → **환자 마이크가 죽어 의사가 못 들음**(throw 없이 조용히). 카자흐/러시아 환자 아이폰 = 정확히 이 경로. **수정안**: 별도 getUserMedia 대신 LiveKit 이 이미 잡은 마이크 트랙(`localParticipant.getTrackPublication(Track.Source.Microphone).track.mediaStreamTrack`)을 MediaRecorder 에 물려 2차 점유 제거. **실 아이폰 검증 필요**해 보류.
2. **[K-01 구조적] 환자 포털이 `case_status` 를 못 봄 (EDGE-1)** — 환자 여정바(`src/lib/patient/journeyState.js:123`)는 `inquiry_events` 만 보는데 그 이벤트를 쓰는 코드가 funnel 4종뿐(`app/api/inquiries/event/route.ts:23`) → 코디/병원이 case_status 를 visa/treatment/completed 로 올려도 **환자 대시보드가 안 움직임**. 구조적(두 추적 그래프 분리) → 단일화 설계는 PO 판단.
3. **[가시성] 완료된 상담이 case_status 를 전진 안 시킴 (EDGE-3)** — `consultation/[id]` 완료 시 `case_status`/이력 미기록 → KPI(K-02/04)는 오르지만 **에이전시·코디 타임라인은 정체**. (lifecycle 지도와 코드 불일치.)
4. **[가시성] admin/leads/assign 가 case_status 안 올림 (EDGE-4)** — `coordinator/cases/assign` 과 비대칭(`app/api/admin/leads/assign/route.ts`엔 case_status 기록 없음).
5. **[가시성] 점수판 outcome 확정/이탈이 case_status_history 에 안 남음 (EDGE-5)** — `conversion-funnel` PATCH 가 outcome 만 써 **에이전시가 '확정/이탈'을 타임라인에서 못 봄**.
6. **[데이터 유실+PII] step2 의 `cancer_patient_intakes` upsert 가 항상 무음 실패** — `inquiry_id` UNIQUE 제약이 없어(`onConflict:"inquiry_id"`) 매번 throw→catch 로 버려짐 → 구조적 intake 저장 안 됨. 게다가 `current_treatment` 를 **평문**으로 쓰려 함(같은 값 inquiries.intake 엔 암호화). **수정이 엉킴**: 고치면 step2 인콰이어리가 `/api/khidi/intake` 큐(EscalationQueue)에 cancer_type 빈 채로 등장하는 등 **제품 동작이 바뀜** → select-then-write + `current_treatment_encrypted` 사용 + EscalationQueue 영향 검토를 PO 와 함께.
7. **[KPI 정확도] 공개 문의 POST 레이트리밋이 인메모리** — `inquiries/step1·step2·create`·`guest-join` 등은 `checkRateLimit`(인스턴스별 Map, 콜드스타트 리셋)라 분산 봇에 약함. `checkRateLimitPersistent`(DB, 이미 chat 에 적용)로 이관 권장 → 스팸 리드가 퍼널 KPI 오염 방지.
8. ~~**[K-01 잠재] 화상방 게스트 targetLang 하드코딩**~~ ✅ **해결(#360)**: 게스트 입장 시 세션 설정 언어(`patient_language`/`doctor_language`)로 상대 언어 결정하도록 교체(위 "진짜 남은 출시 리스크" #3과 동일 건).
9. **[저] 만족도 환산이 null 점수를 0 으로** — `satisfaction.ts:38-45`. 현재 submit 이 5문항 필수라 발현 안 함. 부분응답 유입 시 K-03 끌어내림. (의도된 정의라 변경은 K-03 공식 변경 = PO 판단.)

> **보안 감사 결과**: 고신뢰 취약점 0(인증·암호화·게스트토큰 견고). 위 #7 인메모리 레이트리밋만 하드닝 권장.

---

## ✅ 침묵 환자 감지 cron 이 항상 0건 (2026-06-21 발견 → **2026-06-21 수정 완료**)

- **증상**: `app/api/cron/detect-silent-patients/route.ts` 가 `consultation_sessions` 를 `.not("patient_id","is",null)` 로 거르는데 **patient_id 가 전 행 null**(미사용 컬럼) → 대상 0건 → 침묵(장기 미응답) 환자 알림이 한 번도 안 뜸.
- **뿌리원인**: POSTMORTEMS #7·#12 와 동일 — 실제 환자 연결고리는 `inquiry_id → inquiries` 인데 옛 `patient_id` 경로에 의존. 게다가 `consultation_sessions.patient_id` 는 사실 **uuid 가 아니라 bigint(→cancer_patient_intakes)** 라 `symptom_alerts.patient_id`(uuid→auth.users)와 타입도 안 맞아 `getCoordinatorIds` 도 깨져 있었음.
- **수정(PR 침묵환자 inquiry_id 리팩터)**: ① 마이그레이션 `symptom_alerts` 에 `inquiry_id bigint` 추가 + `patient_id` nullable(둘 중 하나 필수 CHECK) ② 순수 로직 `src/lib/symptoms/silence.ts`(`buildSilenceAlert`) 분리 + 단위테스트 ③ cron 을 inquiry_id 기준으로 재작성(활성 문의→최근 증상보고→3일↑ 무입력→알림) ④ `alertService.getCoordinatorIds` 를 inquiry_id/patient_user_id 기준으로 + 메신저 문의 환자는 안심알림 skip ⑤ 코디 알림 화면 patient_id 없으면 `문의 #N` 표시 ⑥ cron 계약 테스트로 잠금. POSTMORTEMS #14.
- **남은 한계**: 증상 보고를 한 번도 안 한 문의는 알림 대상 아님(전원 알림 폭주 방지 — 의도). 현재 증상보고 데이터가 적어 당장 알림은 거의 없음. 데이터 쌓이면 동작.

---

## 🌙 야간 자율 세션 진행 (2026-06-19) — 백로그 다수 PR화

> 아래 백로그 항목들이 PR로 진행됨(머지·배포는 PROJECT_CONTEXT 최상단 핸드오프 참조).

- **죽은 `/api/chat` 정리** → **[#99](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/99) 머지·배포 완료**.
- **DB 마이그레이션 위생(멱등 가드)** → **[#100](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/100)**(draft, PO 대기) + `check:migrations` CI 게이트 신설.
- **알림 카운터 인메모리→DB** → **[#101](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/101)**(draft, PO 대기 — 마이그레이션 적용도 결정 필요).
- **🔴 KHIDI KPI 깨진 컬럼**(유치·사전상담이 없는 컬럼 쿼리로 항상 0) → **[#102](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/102)**(draft, PO 대기 — 평가 직결, POSTMORTEMS #7).
- **상담방 역할 라벨 i18n** → **[#103](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/103)**(저위험, CI 초록 시 머지).

### 화상상담방(God 컴포넌트 2883줄) 조사 결과 — 분할 계획
- **표준 동작은 이미 구현됨**(PO 우려 해소): 발화자 자동 메인(스피커뷰, `useSpeakingParticipants`+FocusLayout), 화면공유 자동 확대(우선순위 pin>screenshare>speaker), 화질(720p 캡처+simulcast 180/360/720+화면공유 1080p+adaptiveStream/dynacast), 언어 선택 시 전체 UI 전환(COPY 6언어+`switchUiLang`).
- **분할 안전 seam(향후 PO 확인 후)**: `VideoGrid`(820~), `SubtitleOverlay`(904~), `RoomInfoOverlay`(733~), `MutedSpeakingWarning`(762~)는 의존성 적어 추출 후보. STT/번역 로직은 `useTranslation()` 커스텀훅으로 묶는 게 안전(prop-drilling 큼). **실제 분할은 LiveKit 라이브 검증(2+참가자) 필요 → 자동검증 불가**라 이번엔 미실행.

---

## ✅ 해결 (2026-06-19) — KPI 국가별 분포 집계 버그 (PR #98)

> 서버 클라 통합 중 `kpi.ts`를 타입 박힌 정본 `supabaseAdmin`에 위임하자 숨어있던 불일치가 드러남(옛 클라는 제네릭 없는 createClient라 무검사 통과했음).

- **증상(원인)**: `src/lib/khidi/kpi.ts` 의 "국가별 분포"가 **존재하지 않는 테이블 `khidi_intakes`** 를 쿼리 → 항상 빈 값. 더해 환자 식별에 쓰던 `consultation_sessions.patient_id` 가 **프로덕션에서 전부 NULL**(14건 중 0건)이라 고유환자수도 같은 뿌리원인으로 깨져 있었음.
- **실DB 확인**: `nationality` 컬럼은 `inquiries`·`visa_applications` 에 존재. `cancer_patient_intakes` 엔 nationality 컬럼 없음. **실제 연결고리 = `consultation_sessions.inquiry_id` → `inquiries.nationality`** (11/14 세션에 inquiry_id 있고 해당 inquiries 모두 nationality 보유).
- **수정(PR #98)**: 국가분포·고유환자수를 `inquiry_id → inquiries.nationality` 기준으로 재정의. 환자키 = `patient_id ?? inq:<inquiry_id>` 로 중복제거(patient_id 채워질 미래 자동 대응). ISO 코드(KZ/RU/UZ)→한국어 표기 매핑 추가.
- **검증**: 실DB 집계 = 카자흐스탄 6 · 러시아 1 · 우즈베키스탄 1(이전엔 0). tsc/vitest129/eslint0/check:content/next build 통과. 대시보드 `/admin/khidi/kpi-dashboard` 5·6월 조회 시 표시.

---

## 🧭 기초 감리 (2026-06-19) — 5축 제3자 점검

> "기능만 빨리, 기초 부실" 가설을 5축(보안/테스트·CI/타입·품질/관측/의존성·DB·문서)으로 코드 직접 검증.
> 종합 ≈56/100. 보안 뼈대(82)는 견고, 관측(42)이 최약점. 이번 PR에서 **위험3+근본원인 4건 수리**, 나머지는 아래 백로그.

### ✅ 이번에 수리 완료 (PR #85)
- **서버 Sentry 부활**: `instrumentation.ts`의 `return;` 제거 → 서버·SSR·크론 에러 수집 재활성(DSN 있을 때). **프로덕션(DSN 설정) 배포로 실수집 확인 필요.**
- **`supabaseAdmin` fail-closed**: 더미 fallback 을 빌드 단계(`NEXT_PHASE`)로만 한정, 런타임 env 누락 시 throw → 조용한 데이터 유실 차단.
- **`pg` 오배치 교정** + **취약점 31→7**(axios 1.18.0·ws 8.21.0 등 prod·high 패치, 죽은 `@ai-sdk/openai`·`@ai-sdk/react` 제거).
- **CI 게이트**: `tsc --noEmit` 머지 차단 추가. `eslint` 정보용(비차단).
- **기본 임시비번 healo1234 제거** → 계정마다 crypto 랜덤 14자(`admin/staff`).
- **게스트 채팅 PII 평문저장 차단**: `public/chat/start` 가 이름·이메일·전화를 AES-256-GCM 암호화 저장, 검색은 metadata SHA256 블라인드 인덱스. 읽기 경로 `decryptMaybe` 로 복호화(옛 평문 행 호환).
- **운영 알림 실제 연결**: `operationalAlerts.sendAlert` → Sentry+이메일(critical/warning). `adminNotifier.sendSMS` 가짜 'sent' 제거(미설정은 정직하게 skip).
- **핵심경로 테스트 + 커버리지 복구**: `encryptionV2.test.ts`(9), `@vitest/coverage-v8` 추가.
- **README** 피벗 반영 전면 재작성.

### ✅ 중복 정리 완료 (PR #86·#89)
- **브라우저 클라 3벌→1**(#86): `src/supabase.js` 삭제, `data/supabaseClient.js`를 정본 `supabase/browser.ts` 위임 프록시로. "Multiple GoTrueClient" 경고 해소.
- **이메일 발송 2벌→1**(#86): `notifications/emailSender.ts` 삭제, 통합 `email/sendEmail.ts`(레거시 env fallback 포함). `withErrorHandler` 데드 추상화 제거.
- **서버 클라 4벌→통합**(#89, 보안등급별 3단계): service_role 생성 지점 3벌(`supabaseAdmin`·`getSupabaseServerClient`·`createServiceRoleClient`)→**1벌**(`supabaseAdmin` 싱글톤, 나머지 위임). `getSupabaseServerClient`의 **위험한 anon 폴백 제거**(fail-closed). anon no-session `data/supabaseServer.js`→정본 `supabase/server.ts`(`supabaseAnonServer`)로 통합·삭제. anon 쿠키세션(`createSupabaseServerClient*`)은 역할 달라 유지. 호출부 전부 무변경. tsc·129테스트·content·`next build` 통과.

### 🔴 남은 백로그 (다음 세션 권장)
- **(선택) 브라우저 클라 `data/supabaseClient.js` 완전 흡수**: 현재 정본 `supabase/browser.ts` 위임 프록시(호출부 9곳). 호출부를 직접 repoint하면 프록시 파일도 제거 가능(저우선).
- ~~**(소) 죽은 라우트 `/api/chat` 프롬프트 일관성**~~ ✅ **해결**: 라우트 자체가 [#99](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/99)에서 제거됨(폼 자동채움용 `/api/chat/thread-summary`만 보존). 일관성 우려 소멸.
- **`any` 813개**(인증·복호화 66개) 점진 축소, God컴포넌트 `consultation/[id]/page.jsx` 2,883줄 분할.
- ~~**얕은 헬스체크**: `api/health`가 정적 `{ok}`만 → DB 죽어도 200.~~ ✅ **해결**: `app/api/health/route.ts`가 이제 anon 클라로 `hospitals` head count 실측(3초 타임아웃) → 실패 시 503(degraded). uptime 모니터가 장애를 잡는다.
- **남은 7취약점**: vitest(dev)·exceljs→uuid·sentry→postcss = major 강제 필요(깨질 수 있어 보류).
- ~~**DB 마이그레이션 위생**: 수동 추적·정책 `DROP ... IF EXISTS` 가드 누락(재실행 충돌 위험).~~ ✅ **해결(2026-06-19)**: 19개 파일에 멱등 가드 추가(정책 39·트리거 4·인덱스 10·제약 2) + `scripts/check-migration-idempotency.mjs` CI 게이트 신설로 재발 영구 차단. 상세 POSTMORTEMS #6. (수동 추적 자체는 유지 — supabase 히스토리 도입은 별도 과제.)
- ~~**알림 카운터 인메모리**: 서버리스 콜드스타트 리셋 → 누적 임계 정밀 집계는 DB 카운터 필요.~~ ✅ **해결([#101](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/101))**: `alert_counter_events` 테이블 + RPC sliding window 로 cross-isolate 정확 집계(실패 시 인메모리 fallback).

### ✅ 신규 (2026-06-20) — KHIDI KPI 집계 오류 자동 canary
- **무엇**: 매일 도는 KPI 스냅샷 cron(`/api/cron/kpi-snapshot` → `upsertDailySnapshot`)이 집계 쿼리 오류(없는 컬럼·연결 등 [#102](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/102) 부류)를 만나면 `operationalAlerts.alertKpiAggregationErrors()`로 **critical 알림**(콘솔+Sentry+이메일)을 자동 발사. 이전엔 대시보드를 직접 열어야만 errors 배너로 보였음 → 이제 평가 숫자가 깨지면 PO가 자동 통보받음. 단위테스트 3개(`operationalAlerts.test.ts`).

---

## ✅ P1 — AI 토큰 남용 방어 (2026-06-12 적용 완료)

> 2026-06-12 PO 승인("피버모드 — 안 했던 작업 다")으로 적용 완료. 남은 것: Gemini 콘솔 spend cap 은 PO 직접 설정(5분).

봇/악성 사용자가 공개 AI(챗봇 등)를 반복 호출하면 현재 구조로는 못 막음:
- 회수 제한이 메모리 기반 → Vercel 다중 인스턴스에서 분산 우회 가능 (DB 기반 `checkRateLimitPersistent`는 `inquiries/create`에만 적용)
- `generateReply.ts`에 maxOutputTokens 없음 → 호출당 비용 상한 없음
- 하루 총량 차단기 없음 → 밤새 봇 돌면 아침에야 인지

**적용 내역 (src/lib/ai/aiGuard.ts + 공개 AI 라우트 5곳):**
1. 공개 AI 엔드포인트 전부 DB 기반 레이트리밋으로 전환
2. AI 챗 maxOutputTokens 추가 (한 줄)
3. 하루 총량 차단기 — 초과 시 공개 챗봇만 "상담사 연결 안내" 모드 + PO 이메일 알림 (상담방 자막은 참가자 전용이라 유지)
4. IP당 일일 챗 상한 (예: 50회 — 실환자 영향 없는 수준)

현재는 Gemini 무료 플랜이라 금전 피해가 아닌 "한도 소진 → 실환자 서비스 중단"이 실제 리스크. **유료 전환 전 적용이 순서.**

---

## 건강 상태 (정상)
- ✅ `npx next build --webpack` 통과
- ✅ 단위 테스트 12파일 / 106개 전부 통과 (vitest exclude 글롭 수정 후)
- ✅ i18n 커버리지 ru/kz 100%
- ✅ 공개 페이지 Premium 잔재 0 (전수 확인)

---

## ✅ P1 — 클라이언트 service_role 테이블 직접 쿼리 → 서버 API 이관 (2026-06-10 완료)

`inquiries`·`chat_threads`·`chat_messages`·`consultation_sessions` 전부 service_role 전용 RLS (pg_policies 재확인됨).
`/api/portal/*` 서버 API 신설 (`requirePortalAuth` — staff = app_metadata.role ∈ admin/coordinator/doctor) 후 일괄 이관:

| 파일 | 상태 | 경유 API |
|---|---|---|
| `app/admin/consultations/page.jsx` (picker) | ✅ | `/api/admin/inquiries/picker` |
| `app/coordinator/inbox/page.jsx` | ✅ | `/api/portal/inbox` (이름 복호화+마스킹) |
| `app/patient/messages/MessagesClient.jsx` | ✅ | `/api/portal/threads`·`…/[id]/messages` (realtime→5초 폴링) |
| `app/coordinator/messages/CoordinatorMessagesClient.jsx` | ✅ | 동일 + `PATCH /api/portal/threads/[id]` (상태변경) |
| `components/healo/NotificationBadge.jsx` | ✅ | `/api/portal/badge` |
| `components/healo/EmergencyButton.jsx` | ✅ | `/api/portal/emergency` |

**미검증:** 코드·빌드·단위테스트(106개)는 통과했으나 **실제 코디/환자 계정으로 화면 동작은 미확인** (portal 메뉴 미연결 상태 동일). portal 활성화 때 실계정으로 1회 점검 필요.

---

## ✅ P2 — ESLint TS 파싱 (2026-06-12 해소 — typescript-eslint 도입. 잔여: 기존 코드 에러 64·경고 1천여 건 점진 정리)

`eslint .` 실행 시 .ts/.tsx 에서 "Parsing error: Unexpected token interface/:" 다수 → eslint flat config 에 TS 파서 미설정. **실제 코드 버그 아님**(빌드는 통과). 다만 lint가 TS 파일 품질검사를 못 함.
**권장:** eslint TS 파서 설정 보강 → CI lint 실효성 확보.

## 🟢 P3 — 빌드 산출물에 css 파일을 가리키는 script 태그 1개 (기형, 무해)
모든 페이지 HTML 에 `<script src=".../css/xxxx.css">` 가 1개 끼어 있음 — 브라우저가 MIME 검사로 거부(콘솔 에러 1줄)하고 동작엔 영향 없음. 2026-06-12 기준 어제 코드(8ad7eef)에도 동일 존재 확인 — 오래된 기형. webpack 청크 매니페스트 이슈로 추정, Next 업그레이드 시 재확인.

## 🟢 P3 — 자잘한 미사용 변수
일부 파일에 unused var (colorClass, w, today, catch(e) 등). 빌드 영향 없음. 정리 시 lint-clean.

---

## 🟡 P2 — PNG 앱아이콘 옛 H마크 (리브랜드 잔재, PO 보류 결정)

`public/icons/icon-*.png`·`apple-touch-icon.png`·`favicon-16/32.png` 가 옛 `HEALO` `H` 마크. SVG(`favicon.svg`)는 소문자 `h`로 교체됐으나 PNG는 래스터라이저(rsvg/sharp) 환경 필요해 미재생성. **2026-06-17 PO "일단 보류, 나중에" 결정.** 재생성 시 새 `favicon.svg` 기준. (리브랜드 계획: `docs/REBRAND_HEALWITH_PLAN.md`, 컷오버: `docs/DOMAIN_CUTOVER_healwith.md` §5)

---

## 예방 (적용됨)
- `CLAUDE.md` 출시 전 self-QA 체크리스트 → service_role 테이블 client 직접 쿼리 금지 명시 (신규 코드 재발 방지)

---

## 🟡 P1 — K-01 유치 점수판 admitted 4건 = 시드 데모데이터 (진짜 유치 0건) — 8/27 전 실데이터 대체 필요

`/admin/khidi/conversion` 점수판의 **K-01 외국인환자 유치 = 4건이 전부 시드/데모**(inquiries id 4·5·6·10, 위암·유방암·폐암·갑상선암, 2026-05 동일 타임스탬프 일괄삽입, lead·outcome_note 없음). **진짜 외국인환자 유치 = 0건**(이전 핸드오프 "KPI real 0"과 일치). 케이스 지도(`CASE_LIFECYCLE_MAP.md`) §2 경고대로 테스트 데이터도 점수판에 그대로 집계됨.

- **PO 결정(2026-06-22): 데모용으로 그대로 유지.** 8/27 PT에서 "깔때기가 채워진 화면"을 보여주기 위함.
- **⚠️ 리스크/숙제: KHIDI 중간평가(8/27) 점수판 숫자는 실적이 아니라 가짜다.** 평가 전까지 **실제 유치로 대체**하거나, 시연 시 데모데이터임을 명확히 구분할 것. 잔금(30%)이 걸린 공식 성과지표(목표 12건)라 정직성 중요.
- 참고: "병원 치료확정 → 유치 자동집계(#207)" 엣지 자체는 2026-06-22 라이브 prod DB로 **실증 완료**(병원 포털 실버튼 클릭 → outcome 자동 admitted → K-01 +1). 검증용 테스트분(id 13)은 원복함.
