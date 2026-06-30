# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

---

## 🔖 세션 핸드오프 (2026-06-30 (7) — 북극성 계기판 + 외부 서비스 사용량·비용 한눈에 [#531 머지·배포])

> PO "오늘 한 일 정리" → "우리 북극성이 뭐냐" → "북극성 계기판 만들고 + 외부 서비스 사용량 화면도(나중에 유료·제미나이 실시간 비용까지)" → 중간에 **"제미나이만 말고 LiveKit·Resend·Supabase·Vercel 등 모든 외부 서비스 사용량 한눈에"** 로 범위 확대 → "싹다해줘" → "CI 통과하면 머지해" → 머지·배포 → 핸드오프 요청.

**1. 이번 세션 한 일**
- 🎯 **북극성 계기판** `/admin/khidi/north-star` (+API `north-star`): 주간 '사전상담 완료' 추세선(8~26주)·전주대비·4주평균 + 선행지표 4종(채널별 신규문의·예약→완료 전환율·만족도 응답률·에이전시 회신율[측정예정]). lib `northStar.ts`(+순수 `weekBuckets.ts`). kpi-dashboard cockpit 최상단 북극성 진입 배너.
- 💳 **외부 서비스 사용량 통합 보드** `/admin/khidi/usage` (+API `usage`): 모든 연동 서비스 한 화면. **실측** = 제미나이(토큰·비용)·Supabase(DB/500MB·스토리지/1GB)·이메일/SMS(Resend·SES·Twilio·Telegram, admin_notification_logs.channel 집계)·LiveKit(상담방 수). **콘솔/토큰준비** = Vercel·Sentry. lib `externalServices.ts`·`serviceUsage.ts`·`vendorApis.ts`.
- 🧱 **기반(제미나이 실시간 비용 토대)**: 새 표 `ai_usage_events`(append-only·RLS 서비스롤전용·PII없음) + `usageLog.ts`/`usagePricing.ts`(로거·집계·단가, fire-and-forget) + `generateReply.ts` 단발·스트리밍 두 경로에 사용량 로깅 연결. DB 용량 RPC `get_external_db_usage()`(SECURITY DEFINER·서비스롤). 마이그레이션 2건 라이브 적용(가역적 추가).
- 단위테스트 13건(KST 주경계·비용/토큰 정규화) · check-schema-refs에 ai_usage_events 등록 · manuals(관리자) 북극성·사용량 항목 추가.
- **PR [#531](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/531) (3커밋) squash 머지·배포.**

**2. 왜 그렇게 했는지**
- 북극성=주간 사전상담완료(직전 진단 결론). 유치·상담120·만족도는 후행지표라 매주 못 끌어올림 → 사전상담은 매주 올릴 수 있는 단일 운전대(3 KPI 동시 전진).
- 사용량 화면: PO가 비용 통제·유료 전환 시점을 한 눈에 보길 원함. 못 재는 건 숨기지 말고 **실측/추정/콘솔 배지**로 정직하게 구분.
- 비용은 **기록 시점 단가로 동결**(numeric) — gemini-flash-latest 별칭 단가가 바뀌어도 과거 집계 불변.
- 순수함수 분리(`weekBuckets`·`usagePricing`): `server-only` 모듈은 vitest import 불가 → 테스트용으로 떼냄(repo 관례: kpi가 snapshotDates 떼낸 것과 동일).
- Vercel·Sentry는 토큰 없으면 `available:false`로 콘솔 폴백 → PO가 토큰 넣는 순간 코드수정 없이 자동 라이브.

**3. 안 끝났거나 보류**
- **Vercel·Sentry 라이브**: 토큰 미보유 → 콘솔 폴백 중. PO가 `VERCEL_API_TOKEN`(+TEAM/PROJECT)·`SENTRY_AUTH_TOKEN`+`SENTRY_ORG` 넣어야 라이브.
- **제미나이 단가**: 추정치(입력$0.30·출력$2.50/1M). `AI_PRICE_FLASH_IN`/`AI_PRICE_FLASH_OUT` env로 정확화 가능.
- **북극성 선행지표 ④ 에이전시 콜드메일 회신율**: 아웃리치 트래킹 미연동 → "측정 예정". PO가 발송/회신 흐름 알려주면 연동.
- **직전 큐 잔존**: C(채널별 source 전환 분해)·D(만족도 무응답0점+최소N)·E(점수전략 재설계 초안)·#522 funnel_events `form_complete` 라이브 실측(여전히 0행).

**4. 주의·함정**
- `ai_usage_events`·`funnel_events` 적재는 **배포 후 실제 호출/문의부터** 쌓임(지금 0). 화면 0 = 버그 아님(데이터 없음).
- 알림 채널 매핑: `admin_notification_logs.channel` 실데이터는 현재 **'sms'만** 존재 → Resend/Telegram 카드는 0으로 보임. 실제 이메일/텔레그램 발송 한 번 해봐야 매핑 검증됨.
- LiveKit·이메일 카드는 우리 DB **프록시**(상담방 수·발송 수)지 벤더 정확치 아님("추정" 배지). 정확한 영상 분·대역폭은 콘솔.
- types(`database.types.ts`) 미재생성 → `ai_usage_events`·`inquiries.source`는 `(supabaseAdmin as any)` 캐스트(kpi.ts 패턴). 후속 types regen 시 정리.

**5. 다음 세션이 먼저 할 일**
1. ⚠️ **직전 미검증분 먼저**: 배포 반영 확인 후 **(a)** 사용량 화면(`/admin/khidi/usage`) 실제 열림 + 공개 AI 1회 호출 → `ai_usage_events`에 행 쌓이고 비용 뜨는지, **(b)** #522 `funnel_events`에 `form_complete` 행 쌓이는지(현재 0행) **라이브 실측**.
2. **C. 채널별 전환 분해**: 유치 전환 대시보드(`/admin/khidi/conversion`)를 `inquiries.source`(ai_agent/web)로 GROUP BY(데이터 이미 적재).
3. **D. 만족도 무응답 0점 버그 + 최소 N**.
4. (선택) PO가 Vercel/Sentry 토큰 주면 env 꽂고 라이브 확인 / 콜드메일 흐름 연동 / 제미나이 실단가 입력.

**6. 검증 상태**
- ✅ `tsc --noEmit` 0 err · `next build --webpack` exit0 · eslint 0 err(경고만=any, 기존 패턴) · `check:content`·`check:schema-refs` 통과 · 단위테스트 13건 통과.
- ✅ 라이브 스모크: `ai_usage_events` 삽입→조회→삭제(컬럼 형태 일치) / `get_external_db_usage()` RPC 호출·반환 확인(DB 23.5MB·스토리지 1.8MB).
- ✅ PR/CI: **#531** CI(`ci`·`Smoke Tests(PR)`) 둘 다 success 후 squash 머지(E2E는 PR이라 skip). main 배포 트리거됨.
- ❌ **미검증(솔직히)**: 배포 후 런타임 실데이터 적재(사용량 로깅·funnel `form_complete`) 미확인. Vercel·Sentry 라이브 경로 미실행(토큰 없음). 사용량/북극성 화면 실제 브라우저 클릭 안 함(어드민 인증). 제미나이 단가=추정.

**7. 다음 세션 첫 프롬프트**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프 읽어. 2026-06-30에 북극성 계기판(`/admin/khidi/north-star`)·외부 서비스 사용량 보드(`/admin/khidi/usage`)를 #531로 머지·배포했어. **먼저 미검증분 실측해**: 배포 반영 확인하고 ① 사용량 화면 열어서 공개 AI 1번 호출한 뒤 `ai_usage_events`에 행·비용 쌓이는지 ② #522 `funnel_events`에 `form_complete` 행 쌓이는지(현재 0행) 라이브로 확인. 그다음 **C**(유치 전환 대시보드 `/admin/khidi/conversion`을 `inquiries.source`=ai_agent/web로 채널 분해)를 만들어줘.

---

## 🔖 세션 핸드오프 (2026-06-30 (6) — 사업 사각지대 진단(북극성·퍼널) + 죽은 퍼널 계측 살리기 #522·#528)

> PO "우리가 사업적으로 놓친 게 뭔지(북극성 지표·퍼널·내가 생각 못한 것) 도출해봐" → 멀티에이전트 사각지대 진단(6차원×3렌즈×적대검증) → PO "전체적으로 니가 먼저 제안해, 내가 그런거 잘 몰라" → 제안 + 죽은 퍼널 계측(funnel_events) 살리기 1건 실행. 끝에 PO가 변호사·에이전시는 본인이 처리(걱정마)·보험/진흥원 의미만 질문.

**1. 이번 세션 한 일**
- **사업 사각지대 진단(분석만, 코드 X)**: 멀티에이전트 워크플로(현황 6차원 스캔→3렌즈 사각지대 도출→종합·적대검증). 산출물은 메모리 [`biz-blindspot-audit-2026-06-30`]에 저장. 핵심:
  - **북극성 지표(NSM) 부재** 확인 → 추천 = **주간 '사전상담 완료' 건수**(유치·상담120·만족도 3 KPI를 동시에 전진시키는 단일 활동). 선행지표 4종(주간 신규문의 채널별/사전상담 예약→완료율/에이전시 콜드메일 발송→회신/만족도 응답률).
  - **점수전략 피벗**: D-58에 콜드메일 0발송 → real 유치 12건은 8/27까지 물리적으로 거의 불가 → 70점 길은 정량달성보다 **정성(ICT·양한방) + 파이프라인 증빙(계약 에이전시·예약 상담)** 재설계.
  - sharpest insight: 점수 만드는 행위(환자-의사 영상 사전상담=K-02 120건)가 의료법 회색지대 위 → "의견서 먼저 → 그 위에서 영업" 순서.
  - 적대검증이 1건 기각: "유치업 등록서류 옛피벗 법적불일치"는 과장('(예제)' 템플릿).
- **A. 죽은 퍼널 계측 살리기 — PR [#522](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/522) 머지·배포**: `funnelTracking.ts` 의 `// TODO` 로 막혀있던 `funnel_events` insert 실제 적재(서버 lazy import·fail-safe) + `inquiries/create` 성공 시 `form_complete` emit(after()·PII제외) + **라이브 DB에 누락돼있던 `funnel_events` 표 적용 + RLS(서비스롤 전용) + 뷰 security_invoker** + `migrations/20260630_funnel_events_apply_and_rls.sql` 기록.
- **B. 빌드사고 복구 — PR [#528](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/528) 머지**: #522 가 `--auto` 로 CI 끝나기 전 머지돼 main `ci` 가 빨강(=`check-schema-refs.mjs` 가드가 'funnel_events 가 PUBLIC_TABLES 스냅샷에 없음' 적발 — 가드가 제 역할). funnel_events 를 스냅샷에 등록해 해소.

**2. 왜 그렇게 했는지**
- 진단을 일반론 말고 **실코드 기반**으로 — PO가 "내가 생각 못한 것"을 원해서. 북극성=사전상담완료는 결과지표(유치12)와 달리 **매주 PO가 올릴 수 있는** 단일 운전대.
- funnel_events 부활을 1번으로: "추적이 있다"는 착시(호출코드는 박혀있는데 insert 주석+표 부재로 적재 0)였고, 채널별 전환·CAC의 데이터 토대. server-only admin 은 **lazy import**(클라 번들 안전), form_complete 는 **after()**(서버리스 응답후 freeze 방지, 기존 알림 패턴).
- funnel_events 표는 **추가형(가역적)**이라 자율범위 내 라이브 적용. RLS 는 kpi_snapshots·surveys 등 운영표와 동일(서비스롤 전용).

**3. 안 끝났거나 보류**
- **B(북극성+선행지표 대시보드)·C(채널별 source 전환 분해)·D(만족도 무응답0점 버그+최소N)·E(점수전략 재설계 초안)** — 제안만 하고 미착수(큐). C는 `inquiries.source` 데이터 이미 있어 대시보드 쿼리만.
- **UTM 클라 캡처**(URL→body→`inquiries` 컬럼) 미구현 → 현재 form_complete 의 utm 은 null. funnel_events 표엔 utm 컬럼 있음.
- `operational_alerts` 표도 라이브 누락(migrations/20260129 §3) — 범위 밖, 별도.
- types 재생성 안 함 → funnel_events 는 `(supabaseAdmin as any)` 캐스트(kpi.ts survey_responses 패턴). 후속 types regen 시 캐스트 제거 가능.

**4. 주의·함정**
- ⚠️ **`--auto` 머지 함정**: 이 레포는 브랜치보호가 CI를 필수로 안 막아 `gh pr merge --auto` 가 **mergeable 되자마자 즉시 머지**(CI 끝나기 전). #522 가 그래서 main 을 빨갛게 만듦 → **CI 초록 확인 후 머지**할 것(#528은 ci pass 확인 후 머지).
- ⚠️ **#522 form_complete 런타임 미검증**: 실제 폼 제출로 funnel_events 에 행이 쌓이는지 **배포 후 실문의 1건으로 확인 필요**.
- ⚠️ **"Full E2E (main push)" 실패** 관측(40739eb 등) — agency-portal 콜드컴파일 타임아웃 **플래크 이력** + 타세션(#527) 동시 → 내 스키마 변경과 무관 추정이나 **확인 필요**.
- PO 진행분: **변호사 의견서·에이전시 콜드메일은 PO가 직접 처리 중**("컨펌받은걸로 치고, 다 보내고 있어").
- ⚠️ **진단의 "배상책임보험 0"·"유치실적 보고의무 확인"은 틀림 — PO가 실서류로 정정(2026-06-30)**: ①PO는 **SGI서울보증 보증보험 1억원**(등록보증금 보증, 피보험자=한국보건산업진흥원, 증권 100-000-2026 0156 4560, 기간 2026-02-27~2027-02-26)을 **이미 보유** — 이게 유치사업자 등록(A-2026-01-02-06761, 유효 2026-03-11~2029-03-10)의 **필수조건**이라 보험 없이는 등록 자체가 안 됨. 진단이 "보험 0"이라 한 건 **레포 코드만 보고**(코드 insurance 필드는 전부 환자 보험) PO 서류함을 못 본 탓 = 허위. ②유치실적 보고는 **환자 발생 시 트리거**(상시 액션 아님). → **둘 다 PO 액션 아님.** 유일한 실액션 = 보증보험 **연 1회 갱신**(2027-02-26 만료 전). **교훈: 진단의 법무·보험·등록 류 결론은 레포가 아니라 PO 실서류로 검증해야 함.**

**5. 다음 세션이 먼저 할 일**
1. ⚠️ **직전 미검증분 먼저**: #522 배포 반영 확인 후 **실문의 1건 제출 → `funnel_events` 에 form_complete 행 쌓이는지 실측**(현재 0행). + "Full E2E main push" 실패가 플래크인지/내 변경인지 1회 확인.
2. **B. 북극성+선행지표 계기판**: 주간 사전상담 완료 + 선행 4종을 kpi-dashboard 에 추세선·목표대비%로(데이터는 consultation_sessions·inquiries 에 있음).
3. **C. 채널별 전환 분해**: conversion 대시보드를 `inquiries.source`(ai_agent/inquiry_form) 로 GROUP BY(데이터 이미 적재).
4. (이어서) D 만족도 버그, E 점수전략 초안.

**6. 검증 상태**
- ✅ #522: `tsc --noEmit`·`eslint`(0 err)·`next build --webpack`(exit 0) 로컬 통과 + 라이브 DB에 코드와 동일 컬럼으로 insert→조회→삭제 스모크 통과(현재 0행) + 보안 어드바이저(funnel_events RLS=INFO 운영표동일, 뷰 ERROR→security_invoker 해소).
- ✅ #528: PR `ci` 통과(3m24s)·Vercel 배포 pass 확인 후 머지. main green 복구.
- ❌ **미검증(솔직히)**: #522 form_complete **라이브 런타임 적재**(실문의 미발생). "Full E2E main push" 실패 **근본원인 미규명**(플래크/타세션 추정).
- PR/CI: #522·#528 둘 다 머지. 열린 PR은 타세션 것(병렬세션 8브랜치).

**7. 다음 세션 첫 프롬프트**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프 읽어. 직전 세션이 죽은 퍼널 계측(funnel_events)을 살렸는데(#522) **실문의 1건을 실제로 제출해서 funnel_events 에 form_complete 행이 쌓이는지부터 실측**(현재 0행)하고 "Full E2E main push" 실패가 플래크인지 확인해. 그다음 사업 사각지대 진단(메모리 biz-blindspot-audit-2026-06-30)의 **B(북극성+선행지표 계기판)·C(채널별 source 전환 분해)**를 만들어줘 — 북극성=주간 사전상담 완료, 데이터는 consultation_sessions·inquiries 에 이미 있음.

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
