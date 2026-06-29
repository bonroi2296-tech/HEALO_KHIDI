# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

---

## 🔖 세션 핸드오프 (2026-06-29 저녁 — 메일·알림 버그 클러스터 + 텔레그램 알림 + 거짓수치 카피 제거)

> "핸드오프 읽어봐"로 시작 → GDPR 잔여 이어가다, PO가 메일/시각/카피 문제를 화면에서 연달아 지적 → **문의 알림 메일·알림 시각·유도 카피를 통째로 손봄**. 전부 작은 PR로 쪼개 머지·배포. (같은 2026-06-29의 컴플라이언스 세션[#433·#436]·AI PII 마스킹 세션[#425]과 별개 — 영역만 다름. 중복 없음.)

**1. 이번 세션 한 일** (별도 표기 없으면 전부 main 머지·프로덕션 배포)
- **메일 발신주소(from) 버그 닫음** [PO 콘솔]: Vercel **Production** `RESEND_FROM_EMAIL`이 형식 깨진 값으로 남아 문의 알림이 `admin@healwith.co.kr`로 "Invalid from field" 실패 중이던 것 → PO가 `noreply@healwith.co.kr`로 고치고 재배포 → 내가 테스트문의(#27·#30)로 `admin_notification_logs`에 `sent` + Resend message_id 확인. **3겹 메일버그의 마지막 조각 닫힘.**
- **[#426](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/426) 문의 알림 메일 '확인' 링크 404 수정** — 링크가 ①옛 도메인(`healo-khidi.vercel.app`) 폴백 ②없는 상세경로(`/admin/inquiries/[id]`)를 가리켜 항상 404. 상세 페이지는 없고 목록만 존재 → `healwith.co.kr/admin/inquiries`(목록)로 교정. PO가 #30 메일 버튼 눌러 목록·상세 뜨는 것 확인.
- **[#428](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/428) 알림 시각 UTC→KST (전수 4곳)** — 서버(Vercel)가 UTC라 `toLocaleString("ko-KR")`이 timeZone 미지정 시 UTC로 렌더(한국시간보다 9h 느림). 관리자 알림(adminNotifier 3곳) + **환자 상담 알림 2곳(kakao 30분전 알림톡·consultationReminder 메일 — 환자에게 상담시각을 UTC로 잘못 안내하던 동류버그)**. consultationInvite는 이미 KST+UTC 병기라 미수정. POSTMORTEMS #45.
- **[#430](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/430) 새 문의 텔레그램 알림** — 이메일 외 채널. `src/lib/notifications/telegram.ts`(fetch 1회, 외부 의존성 0, fail-safe) + adminNotifier에서 1회 호출. env(`TELEGRAM_BOT_TOKEN`·`TELEGRAM_CHAT_ID`) 둘 다 있을 때만 발송, 미설정이면 무동작(기존 동작 무변경). **봇 토큰 미설정 = 아직 안 켜짐**(아래 5번).
- **[#435](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/435) '매칭 정확도 90%' 거짓수치 제거** — 문의 완료 화면의 근거 없는 90% 주장(과장광고 소지)을 전수 3곳(유도문구·step2 제목·성공 제목)·6개 언어 전부 "더 빠르고 정확한 안내" 톤으로 교체. POSTMORTEMS #46.
- **GDPR 정보주체 권리 런북** `docs/DATA_SUBJECT_RIGHTS_RUNBOOK.md` — 처리방침이 약속한 열람·정정·삭제 요청의 실제 처리 절차(자동 대량파기는 사후관리 위해 두지 않고 본인 요청 시에만). RoPA 갭 닫음. **⚠️ 이 커밋은 #422 브랜치에 있음(아래 3번) — 아직 main 미머지.**

**2. 왜 그렇게 했는지**
- **메일 from = PO 콘솔 작업**: Vercel env는 내가 못 건드림(CLI 미설치·MCP에 env 설정 도구 없음) → PO에게 화면 단계별 안내. PO가 Vercel 화면 낯설어해 직접 링크+클릭 순서로 풀어줌(PO 취향: 콘솔 단계별).
- **메일 링크 = 목록으로**: 상세 페이지(`/admin/inquiries/[id]`)가 아예 없음. 새로 만들기보다(YAGNI) 존재하는 목록으로 보내고 문의번호를 본문·버튼에 표기. 요청 잦아지면 그때 상세 페이지.
- **텔레그램 선택**: 솔로 운영자에 가장 싸고 빠른 "삥" 알림. SMS/카카오 알림톡은 발송업체 가입+건당 과금(돈)+템플릿 승인, 앱푸시(FCM)는 스토어 배포 전이라 지금 불가. 텔레그램=무료·5분·앱 하나면 끝. (PWA 웹푸시도 스토어 없이 가능하나 구독·권한·iOS 변덕 → 나중에.)
- **작은 PR로 쪼갬**: #422(법무문서 검토 대기)에 코드 버그수정을 섞었다가 다시 분리 — 법무 검토에 버그수정이 묶이면 안 되니까. 이후 메일링크·KST·텔레그램·카피를 각각 독립 PR로.

**3. 안 끝났거나 보류**
- **🟢 텔레그램 봇 토큰 — PO 액션 대기(제일 먼저 검증할 것)**: #430 코드는 배포됐고 env 2개만 넣으면 켜짐. PO가 @BotFather로 봇 생성 → 토큰 + chat_id → Vercel env(Production) 2개 추가·재배포 → 내가 테스트문의로 PO 텔레그램에 알림 뜨는지 검증해야 함(현재 미검증).
- **[#422](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/422) 머지 대기** — 처리방침 6개어(하청업체 추가·보관기간 저장제한) + **DSR 런북**이 이 브랜치에 있음. 라이브 법무문서라 PO "머지해" 대기 중. ⚠️ 이 브랜치에만 있던 "2026-06-29 낮" 메일3겹버그 핸드오프 블록도 여기 있음(main엔 컴플라이언스/이 블록만).
- **Gemini 유료 결제 확인** — 무료 등급이면 환자 건강정보가 구글 학습에 쓰일 수 있음(출시 전 핵심). 미확인.
- **테스트 문의 #26~31** — 내가 검증용으로 실DB에 만든 가짜 문의 6건. PO "정식 오픈 전에 지울게 일단 둬". 오픈 전 정리 필요(유치 전환 대시보드 집계 오염 방지).

**4. 주의·함정**
- **메일 from 옛 메일은 그대로 실패 기록**: #28·#29 메일은 배포 전 옛 코드라 링크 404·시각 UTC. **수정은 #30(배포 후)부터** 반영. 이미 받은 메일로 테스트 금지.
- **테스트문의를 curl로 만들면 한글이 깨짐**: Windows Git Bash curl이 한글을 UTF-8로 안 보내 DB에 깨진 바이트 저장(#27·#30). **제품 버그 아님** — 브라우저 폼은 UTF-8이라 정상(PO가 #31 폼제출로 한글 멀쩡 확인). curl 테스트 시 `--data-binary @파일`(UTF-8 파일)로.
- **`git checkout main`/머지 시 "failed to run git: main is already used by worktree" 경고는 무해** — main이 worktree `HEALO_worktrees/known-issues-bugfix`에 잡혀있어서. PR 원격 머지는 성공함(MERGED 확인).
- **2분 자동저장 훅**이 멀티파일 작업 중 변경을 generic 메시지로 가로채 커밋함(이번에도 카피 수정이 `chore: 작업 자동 저장`으로 먼저 커밋됨) → squash 머지면 PR 제목으로 정리돼 무해하나, 커밋 단위 작업 시 유의.
- **죽은 라우트 `/api/email/send`**(HEALO_EMAIL_FROM 폴백=옛 onboarding@resend.dev) — 아무도 안 부름. 지금 버그와 무관, 나중에 지워도 됨.

**5. 다음 세션이 먼저 할 일** (우선순위)
1. **⚠️ 직전 미검증분 먼저**: ①**텔레그램** — PO가 봇 토큰·chat_id를 Vercel env에 넣고 재배포했으면, 테스트문의 쏴서 PO 텔레그램에 새 문의 알림 뜨는지 검증. ②(선택) KST 시각·새 카피가 실제 새 메일/화면에 맞게 나오는지 PO가 다음 문의 때 눈으로 확인(배포는 됨, 정적 교체라 거의 확실).
2. **#422 처리방침 PR** — PO가 법무 검토 끝내고 "머지해" 하면 CI 확인 후 머지(DSR 런북도 같이 들어감).
3. **Gemini 유료 결제 확인** — 무료면 출시 전 결제 연결.
4. 테스트 문의 #26~31 정리(오픈 전).
5. 남은 컴플라이언스 갭(자동파기 크론·role 변경 감사·현지화)은 컴플라이언스 세션 블록 참고.

**6. 검증 상태**
- **PR/CI**: #426·#428·#430·#435 **전부 MERGED**, 각 ci·Smoke Tests 초록 확인(머지 시점). `tsc --noEmit` 0 에러·`check:content` 통과.
- **✅ 실검증(PO+나)**: 메일 발송(admin@ `sent`, #27·#30 DB 로그)·메일 링크 404 수정(PO가 #30 메일 버튼→목록·상세 도달)·한글 인코딩(PO가 #31 폼제출 멀쩡 확인).
- **❌ 미검증(솔직히)**: ①**텔레그램 알림 실제 수신** — 봇 토큰 미설정이라 아직 안 켜짐(5번 1항). ②KST 시각·새 카피의 **라이브 화면 실측** — 배포는 됐고 정적 문자열 교체라 거의 확실하나 다음 새 메일/완료화면으로 눈 확인 권장.

**7. 다음 세션 첫 프롬프트**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프 읽어. 2026-06-29 저녁에 메일 알림 버그(발신주소·링크404·시각UTC)랑 거짓수치 카피를 다 잡아 배포했고 **텔레그램 알림(#430)**도 코드 깔았는데 **봇 토큰을 안 넣어서 아직 안 켜졌어**. 내가 @BotFather로 봇 만들어서 TELEGRAM_BOT_TOKEN·TELEGRAM_CHAT_ID를 Vercel env에 넣고 재배포했으면, 네가 테스트문의 쏴서 내 텔레그램에 알림 뜨는지 검증해줘. 그담 **#422 처리방침 PR**(법무 검토 끝나면)이랑 **Gemini가 유료 결제인지 꼭 확인**(무료면 환자 건강정보가 구글 학습에 — 출시 전 필수), 테스트 문의 #26~31 정리도 챙기자.

---

## 🔖 세션 핸드오프 (2026-06-29 — 컴플라이언스: 해외파트너 계약서 보강 + 환자 삭제권(GDPR Art.17)·파트너 PII 열람 감사)

> PO 요청: "우리 서비스가 HIPAA/GDPR 국제표준 준수하나" 점검 + 해외 에이전시·의료기관 계약서 완성. 점검 결과를 바탕으로 코드 갭 2개(파트너 PII 열람 감사·환자 삭제권)를 닫고 [#433](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/433) 머지·배포까지. 계약서는 PO 기존 초안 틀을 살려 데이터보호 조항만 보강. (같은 2026-06-29의 AI PII 마스킹 세션은 아래 별도 블록.)

**1. 이번 세션 한 일**
- **컴플라이언스 점검 문서** `docs/audit/COMPLIANCE_ASSESSMENT_HIPAA_GDPR.md` — 표준별 적용성(HIPAA=법적 미적용/GDPR=조건부/PIPA·의료법·유치법·카자흐 94-V·러 152-FZ=실구속) + 현재 자산 + 갭 7건. Supabase 리전 **서울(ap-northeast-2)** MCP 실측 확인.
- **해외파트너 계약서**: 처음엔 통합 초안(`docs/marketing/agency-partnership-agreement-draft.md`·`overseas-clinic-partnership-agreement-draft.md`) → PO가 **자기 로컬 기존 초안(MOU/본계약/부속서, 러·영 정본+한글, 부속서=수수료표)** 제공 → 그 틀 유지하고 데이터보호 5조항만 보강하는 방향으로 전환. `docs/marketing/agency-contract-compliance-supplement.md`(비교표+조항). **완성본 Word 8개(에이전시·의료기관 × MOU·본계약 × 러영·한글)는 채팅 첨부로 PO에 전달**(스크립트 생성, 레포엔 바이너리 미커밋). 의료기관판은 양방향 사후관리 조항 추가.
- **계약서 보완 프롬프트**: PO가 "계약서 만든 애한테 시킨다"며 보완 지시문 요청 → 한/영 조항 포함 프롬프트 채팅 제공. PO가 카자흐/러 법 나열 빼고 **"국제 표준(GDPR·HIPAA)에 따라 저장·처리"**(상대측 실제 요구) 문구로 정리 요청 → 반영.
- **[#433](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/433) MERGED → main 배포**: ①파트너 포털(`/api/agency/inquiries`)이 환자 PII·의료문서 열람 시 `admin_audit_logs`에 `PARTNER_VIEW_CASES` 기록(기존 무로깅 갭) ②환자 삭제권(GDPR Art.17) end-to-end — 환자 `/patient/account` 삭제버튼(6개어)→관리자 `/admin/account/deletion-requests` 처리. 테이블 `account_deletion_requests`(PII 미저장, user_id만) **실 DB 서울 리전 적용 완료**.
- **DPA 서명 가이드** `docs/audit/DPA_SIGNING_GUIDE.md` — Supabase·Google·Resend·LiveKit·Vercel 무료 체결 순서(PO 액션).

**2. 왜 그렇게 했는지**
- **"HIPAA 준수/인증" 금지, "HIPAA/GDPR 수준 안전조치"로 표현** — HIPAA는 미국 covered entity 법이라 우리(한국·CIS 환자)엔 법적 미적용. 과장표시 리스크 회피. PO도 동의, MOU엔 "국제 표준(GDPR·HIPAA)에 따라 저장·처리"로.
- **계약서: PO 기존 틀 유지** — PO 초안이 상업조항(우회금지·KCAB중재·수수료정산) 더 탄탄. 내 강점은 데이터보호 깊이뿐 → 그것만 보강. 부속서(수수료표) 미변경(PO 요청).
- **삭제권 = 요청→관리자 소프트삭제**(즉시 하드삭제 X) — 소프트삭제 원칙 + "되돌리기 어려운 것" 안전. 테이블엔 user_id만(PII 최소).
- **AI 전송 전 PII 마스킹은 안 건드림** — 같은 날 `claude/self-hosting-external-services`(#425)가 진행(중복 회피 규칙). 아래 블록 참고.

**3. 안 끝났거나 보류**
- **[#424](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/424) 열림(draft, 미머지)** — 컴플라이언스 점검·계약서 초안·보완안·DPA가이드 문서 묶음. PO 머지 보류("다음 지시 기다려") → PO 검토 후 결정 필요.
- **DPA 서명** — PO 수동 액션(벤더 대시보드 클릭). 미진행. 가이드만 있음.
- **남은 컴플라이언스 갭**(점검 문서): 카자흐/러 현지화(법률검토)·자동파기 크론·role 변경 감사 — 미착수.
- **Word 계약서 레포 미보관** — 채팅 첨부로만 전달(세션 만료 시 사라짐). PO가 받아둠. 필요시 레포 커밋 가능.

**4. 주의·함정**
- **`account_deletion_requests` 마이그레이션 이미 실 DB(서울) 적용됨** — 멱등(create if not exists)이라 재적용 안전. `check:schema-refs` 스냅샷에도 등록함.
- **삭제권은 "요청 접수"까지만 자동** — 실제 데이터 파기·익명화는 관리자가 수동 수행 후 「완료」 처리해야 함(시스템이 자동 삭제 안 함).
- **`Smoke Tests (PR)`의 `patient-mobile-chrome` 로그인 E2E는 콜드서버 30초 타임아웃 플래키** — 무관 PR에서도 빨감. 실게이트는 `ci`. 이걸로 머지 막지 말 것.
- 의료기관 계약서 러시아어: Агент→Учреждение 격변화·한국병원명 충돌(파트너 의료기관 vs 제휴병원) 처리했으나 **러시아어 법률 검수는 변호사 몫**.

**5. 다음 세션이 먼저 할 일 (우선순위)**
1. **⚠️ 직전 미검증분 먼저 확인 (배포 후 실클릭):** 환자 앱 「더보기→계정·개인정보」 **삭제버튼**으로 요청 생성 → 관리자 `/admin/account/deletion-requests`에서 보이고 「처리 시작/완료」 동작하는지 end-to-end 1회. (배포 완료 여부부터 확인)
2. **[#424](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/424) 계약서 문서 PR** — PO 검토 후 머지 여부 결정.
3. **DPA 서명** — `docs/audit/DPA_SIGNING_GUIDE.md`대로 Supabase부터 PO와 함께 진행 또는 안내.
4. (선택) 남은 갭: 자동파기 크론·role 변경 감사·카자흐/러 현지화 법률검토.

**6. 검증 상태**
- **PR/CI**: [#433] **MERGED**(squash), `ci` **초록 확인**. `npx tsc --noEmit` 0 에러, `check:content`·`check:schema-refs`·`check:migrations` 통과. [#424] 열림(draft) — 문서 PR.
- **DB**: `account_deletion_requests` 서울 리전 적용 확인(MCP apply_migration success).
- **❗미검증(솔직히)**: ①**환자 삭제버튼·관리자 처리 화면 런타임 클릭 안 함**(배포 후 확인 필요 — 5번 1항) ②파트너 감사로그 실적재 실데이터 확인 안 함 ③**Word 계약서를 PO가 Word로 열어 서식 확인** 안 됨(텍스트 추출·치환 검수만).

**7. 다음 세션 첫 프롬프트**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프 읽어. 그다음 ①배포됐는지 확인하고 환자 삭제버튼(/patient/account)→관리자 처리(/admin/account/deletion-requests) end-to-end 실제 클릭 검증(직전 미검증분), ②계약서 문서 PR #424 검토해서 머지할지 정하고, ③DPA 서명 가이드대로 Supabase부터 안내해줘.

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
