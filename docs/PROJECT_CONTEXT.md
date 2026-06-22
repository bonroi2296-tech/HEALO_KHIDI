# HEALO KHIDI — 프로젝트 맥락 / 세션 인수인계

> **새 세션은 이 문서를 먼저 읽어라.** 코드만 봐선 안 보이는 "왜 이렇게 결정했는지"와 현재 상태·다음 할 일을 담음. PO(강주영)는 비개발자 → 짧고 직설적 한국어, 용어는 쉽게 풀되 원어 병기(CLAUDE.md), 결과물 우선.
>
> 📌 **핸드오프 단일 SoR(single source of truth) = 이 파일.** 인수인계는 여기 최상단에만 쌓는다(`/handoff` 스킬). 과거 독립 핸드오프 문서들은 `docs/archive/`로 이동(흩어지면 다음 세션 혼란 — 실제 사고 있었음).
> 🗂️ **군살 방지: 최상단엔 최신 2개 세션만 유지.** 그 이전 세션 핸드오프는 [`docs/archive/PROJECT_CONTEXT_handoffs.md`](archive/PROJECT_CONTEXT_handoffs.md)로 옮긴다(기록 보존). 새 핸드오프가 3개째 쌓이면 가장 오래된 걸 거기로.

---

## 🔖 세션 핸드오프 (2026-06-22 늦은오후 — 협력기관 런타임 검증 + 라벨통일(#250) + 역할·프로세스 기획안)

**이번 세션 한 일:**
- **시작 상황 정리**: PO가 컴에서 토큰 끊겨 핸드오프 못 하고 옴. git log 보니 직전 핸드오프(오후) 이후 **PR 4개(#242 vendor청크분리·#244 a11y 91→100·#246 푸시 실발송 stub→FCM·#247 GA지연)가 이미 main에 머지됨** — 문서엔 누락(이번 핸드오프로 기록).
- **협력기관 업무프로세스 완성도 진단**: 병원(`/partner`)·에이전시·해외의료기관(`/agency`)·코디(`/coordinator`) 포털 전수 조사. 핵심 루프(에이전시→코디→병원→유치 KPI)·역방향 반영(#202)·자동집계(#207)·계정 발급 다 구현됨 확인. 코디 계정 생성=`/admin/staff`, 상담·비용추정도 inquiry_id 연결됨(에이전트가 "반쪽"이라던 것 다수는 실제론 구현돼 있었음).
- **⭐ 런타임 검증(라이브 prod DB 직접)**: 케이스 지도 §4 반쪽탐지 쿼리 0행. 실제 리드 1건 추적해 병원 replied→case_status='scheduling' 역방향(#202) **실증**. 이어 **PO가 라이브 병원포털(`hospital@test.com`)에서 "치료확정" 버튼 실클릭 → `inquiries.outcome` 자동 `admitted` + `outcome_note` 자동생성 + K-01 4→5** = 자동집계 엣지(#207) **실데이터 실증 완료**. 검증 후 **테스트분(lead·outcome) 원복**(KPI 오염 0).
- **라벨 불일치 버그 수정 → PR [#250](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/250)(초안)**: 같은 상태 `converted`를 화면마다 "진료 전환/전환됨/치료 확정"으로 제각각 부름(PO 지적). **"치료 확정"으로 통일**(partner/leads·partner·admin/leads 6곳) + `check-content-consistency.mjs`에 잔재 차단 가드룰 + POSTMORTEMS #21.
- **K-01 점수판 정리**: admitted **4건 전부 시드/데모데이터**(진짜 유치 0) 확인. PO 결정=**데모용 유지**. `KNOWN_ISSUES.md`에 "8/27 전 실데이터 대체 필요" 리스크 기록.
- **⭐ 역할·프로세스 기획안 신설 → `docs/KHIDI_역할_프로세스_기획.md`**: PO가 8계층 모델 재설계 요청. 2025·2026 KHIDI 공고문(PO 제공 PDF 2개) 정독→**6대 ICT 공식 정의**를 앵커로. 결정: ①의사 계층 제거(상담방 참여자) ②해외 에이전시(`/agency`, 사전까지)↔해외 의료기관(`/clinic`, 사후 경과 업로드) **분리** ③경과 업로드=전 채널(앱·웹·메신저) ④URL `/partner`→`/hospital`, 언어는 계정 기준(URL 로케일 X) ⑤권한 세부는 프로세스 돌려보고(보류).

**왜 그렇게 했는지:**
- **에이전시↔해외의료기관 분리 근거**: 공고 공식 사후관리 3대(경과f/u·모니터링·재이용)가 **전부 임상**(검사·영상 전송, 모니터링, 교육)이라 비의료 에이전시는 구조적으로 사후관리 불가. 분리하면 `/agency` 이름도 정확해짐.
- **의사 계층 제거**: 의사는 상시 케이스 관리자가 아니라 예약된 화상상담 때만 참여 → 별도 계정 불필요(초대링크 게스트 입장 이미 구현). 원격협진 기능은 유지, 구조만 단순.
- **숫자는 수행계획서 기준**: 공고 최소(유치10/상담80/만족도80) < 우리 도전목표(12/120/90). 2025↔2026 공고 6대 ICT 정의·평가틀 동일(연도 무관). 우리=2026 코호트(중간평가 8월·지원~11.20·국고 8천만 상한).
- **테스트 데이터 원복**: 케이스 지도 §2 경고(테스트도 KPI 집계됨). 단 lead가 converted인데 outcome=null이면 그게 §4 반쪽이라 **둘 다** 원복.

**안 끝났거나 보류:**
- **역할 기획 = 합의안(문서)만.** 실제 코드 마이그레이션(`/doctor` 제거·`/partner`→`/hospital`·`/agency`+`/clinic` 분리·경과 업로드 기능·해외 포털 러·영 번역)은 **별도 작업, 미착수**. KHIDI 8/27 우선순위와 조율해 착수.
- **권한 세부 = 보류**(프로세스 1바퀴 실제로 돌려본 뒤 — PO 방침).
- **PR #250 = 초안**. 머지 안 함(PO 검토·머지 대기). 라벨수정+KNOWN_ISSUES+기획안 3개가 한 PR에 섞여 있음(같은 브랜치 `claude/token-handoff-status-eo2vzd`).
- **직전 4개 PR(#242·244·246·247) prod 실동작 미검증**. 특히 #246 푸시 실발송(FCM)은 Firebase·실기기 없어 여전히 발송 자체 미검증(직전 핸드오프 이월).
- **오래된 열린 PR 7개**(#41·83·116·126·128·197·204) — 대부분 직전 세션 잔여·draft. PO triage(머지/닫기) 필요.

**주의·함정:**
- **자동저장 훅(`.claude/hooks/auto-commit-push.sh`) 주의** — 과거 멀티파일 작업 시 타 변경 혼입 사고(이전 핸드오프). 이번 세션은 문제 없었음.
- **K-01 점수판 숫자(유치4)는 전부 가짜(시드)** — 8/27 PT에서 실적으로 발표 금지(데모임을 구분). `KNOWN_ISSUES.md` 참조.
- 기획안의 `/clinic`·계정모델은 **미구현 합의안** — 코드는 아직 옛 구조(`/partner`·`/agency` 통합·`/doctor` 존재).

**다음 세션이 먼저 할 일 (우선순위):**
1. **⚠️ 직전 미검증분 먼저:** (a) **PR #250 라벨이 실화면에 "치료 확정"으로 뜨는지** 프리뷰/배포 클릭 확인(난 DB·코드만 검증, 화면 클릭 안 함). (b) **#246 푸시 실발송**은 PO Firebase 계정 후 실기기 검증.
2. **PR #250 머지 판단** — PO 검토 후 초안 해제·머지(또는 기획안만 분리 요청 가능).
3. **역할·프로세스 기획 실행 착수 여부 결정** — `docs/KHIDI_역할_프로세스_기획.md` 보고, 8/27 우선순위 대비 언제 코드 마이그레이션 시작할지(착수 시 권한은 프로세스 돌려보며 확정).
4. **오래된 열린 PR 7개 triage**(#41·83·116·126·128·197·204) — 머지/닫기.
5. KHIDI 중간평가(2026-08-27) 상시 — 정량 real 0 끌어올리기(실환자 유입).

**검증 상태:**
- **#207 자동집계 엣지**: 라이브 prod DB로 **실증 완료**(PO 실버튼 클릭→outcome admitted→K-01 +1, 반쪽탐지 0행). 검증 후 원복.
- **#202 역방향**: 실리드 1건으로 case_status='scheduling' 확인.
- **PR #250**: CI(Vercel) **Ready(초록)** 확인. `node scripts/check-content-consistency.mjs` **통과**(잔재 0). 단 **라벨 실화면 클릭 검증은 안 함**(코드·DB만).
- **기획안**: 문서만 — 빌드·동작 무관.
- **열린 PR**: #250(초안·CI초록) + 오래된 7개(#41·83·116·126·128·197·204, 대부분 draft·CI 미확인).
- 로컬 `next build`는 이 클라우드 환경에 env키·node_modules 없어 못 돌림 → CI에 위임.

**다음 세션 첫 프롬프트:**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프 읽어. ①PR #250 라벨("치료 확정")이 실제 화면에 제대로 뜨는지 확인하고 머지할지 판단해줘. ②docs/KHIDI_역할_프로세스_기획.md 보고 — 협력기관 역할 재설계(의사 제거·에이전시/clinic 분리·경과 업로드) 코드로 언제 착수할지, 8/27 평가 우선순위랑 같이 정하자. ③오래된 열린 PR 7개(#41·83·116·126·128·197·204) 머지할지 닫을지 정리해줘.

---

## 🔖 세션 핸드오프 (2026-06-22 오후 — 이메일 셋업 + SEO 누수수정 배포 + 앱스토어 1단계)

**이번 세션 한 일:**
- **이메일 `admin@healwith.co.kr` 가동(Zoho 무료)**: 가비아 DNS에 소유확인 TXT + MX 3개(mx/mx2/mx3.zoho.com, 끝에 점 필수) + SPF(`v=spf1 include:zoho.com ~all`) 추가 → 전파·수신 확인. **운영원칙 합의**: 협력기관(병원·에이전시)·코디 계정은 **본인 업무메일을 로그인ID로** admin이 생성(코드 이미 admin-provisioning), healwith 메일은 안 파줌. 자율가입+등급승격은 안 함(보안·과설계). 메모리 `email-hosting` 저장.
- **SEO 점검 + 버그수정 배포**: Gemini 감사 7항목을 live로 실측 → 대부분 이미 정상(라우팅·http→https/www 308·hreflang `kk`·robots). **진짜 버그 1개**: 비공개(`is_published=false`) 치료·병원이 **sitemap·상세페이지에 계속 노출**(get\*List·get\*BySlug 4곳이 필터 누락) → `.eq("is_published",true)` 추가 **PR [#235](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/235) 머지·배포**. 슬러그가 자동생성 쓰레기값(`item-<ts>`)인 실치료 3건(신경회복 도수치료·주사요법·면역플러스) **소프트 비활성**(DB `is_published=false`, 보존). POSTMORTEMS #20.
- **앱스토어 1단계(Capacitor) — PR [#240](https://github.com/bonroi2296-tech/HEALO_KHIDI/pull/240) 머지**: ①셸 — `capacitor.config.ts` healwith 브랜드(`kr.co.healwith.app`), SSR이라 정적추출 불가 → `server.url=https://healwith.co.kr` **라이브 로드**. android/ios 네이티브 프로젝트. ②**푸시 등록 파이프라인** — `device_tokens` 테이블(prod 적용)·`/api/push/register`·`src/lib/push/*`(클라이언트 등록·buildPushMessage 단위테스트3). ③앱 아이콘(브랜드 심볼 1024²→android87·iOS10). 메모리 `app-store-capacitor` 저장.

**왜 그렇게 했는지:**
- **이메일 Zoho 무료**: Google Workspace는 유료, 나중에 **MX만 교체로 이전**(락인 없음). 파트너 메일 안 파주는 건 Zoho 5계정 한도 + 외부기관 관리·보안 부담. (네이버웍스·가비아메일도 검토했으나 PO가 Zoho 선택)
- **앱 라이브로드**: SSR(API·미들웨어 투성이)이라 `next export` 불가 → 정적번들 대신 라이브 URL. 애플 가이드라인 4.2(웹뷰 래퍼 반려) 회피용으로 **푸시 알림이 네이티브 가치(사실상 필수)**.
- **`@capacitor/assets` 제거**: 아이콘 생성 도구일 뿐인데 취약 `uuid`(GHSA-w5hq-g745-h8pq)를 끌어와 CI 의존성 게이트(high/critical 차단) 실패 → 제거(아이콘은 이미 생성·커밋됨, 재생성은 일회성 npx).

**안 끝났거나 보류:**
- **앱 푸시 발송(`fcm.ts sendPush`) = stub**. Firebase(FCM)·실기기 없어 미구현·미검증. PO 계정 후 구현.
- **앱 빌드·스토어 제출 = PO 외부작업 선결**(내가 못 함, 결제·신원): ①애플 개발자 $99/년 ②구글 플레이 $25 ③Firebase 무료. **iOS 빌드는 macOS 필수(PO 윈도우) → 클라우드 맥(Codemagic 등).**
- **soft-404 버그(기존)**: 치료/병원 `[slug]` 상세가 **없는 슬러그에도 HTTP 200**(notFound 화면은 뜨나 상태코드 404 아님). 로케일 rewrite가 404를 삼킴. 비공개 3건은 sitemap서 빠져 급하진 않으나 **KNOWN_ISSUES 기록 못 했음**(다음 세션 숙제).
- **앱 아이콘 = 플레이스홀더**(브랜드 심볼). PO가 4종(logo/options/A~D) 봤으나 "다 별로, 힘들다"로 **최종안 보류**.

**주의·함정:**
- **자동저장 훅(`.claude/hooks/auto-commit-push.sh`)이 이번 세션 4회+ 가로챔**: 내 스테이징을 먼저 커밋(`nothing to commit`)하거나, `git add -A`로 **타 태스크 미커밋 변경(의사사진 셀프호스팅, 이미 #238 머지)을 내 브랜치에 혼입**시킴 → 오염된 #237 닫고 최신 main 기준 **클린 #240**으로 대체. **멀티파일 작업 전 이 훅 끄는 게 안전.** 메모리 `autosave-hook-hazard` 저장.
- soft-404는 미들웨어 수정 필요(한 줄 아님 — 별도 작업).
- 이메일/검색등록/스토어계정은 **PO가 직접**(결제·신원). 내가 대신 못 함.

**다음 세션이 먼저 할 일 (우선순위):**
1. **⚠️ 직전 미검증분 먼저:** (a) **#235·#240 prod 배포 정상 확인**(#235는 sitemap서 item- 3건 빠짐 curl 확인됨; #240은 web 영향0이나 배포 후 홈·치료 페이지 실동작 미확인). (b) **soft-404를 `KNOWN_ISSUES.md`에 기록** + 고칠지 판단. (c) **외부→`admin@healwith.co.kr` 수신 테스트**(내부 Welcome만 확인함).
2. **앱스토어 2단계** — PO 계정(애플·구글·Firebase) 생기면 → **푸시 발송 구현(stub→실동작)** → iOS 클라우드 맥 빌드 세팅 → 스토어 등록정보(스샷·설명 6언어)·제출. 아이콘 최종안 PO 확정 시 `npx @capacitor/assets` 재생성.
3. (이전 세션 잔여) 라이트하우스 Performance 39→70+, #160 화상방 카메라, KPI real 0 끌어올리기.
4. KHIDI 중간평가(2026-08-27) 상시.

**검증 상태:**
- **이메일**: MX·SPF·zoho-verification TXT 구글DNS(8.8.8.8) 전파 `nslookup` 확인, `admin@`로 Zoho Welcome 메일 수신 확인. **외부 발신→수신은 미테스트**(PO 몫).
- **SEO #235**: CI(ci·Smoke) 초록 + main squash 머지 + 배포. 배포 후 **sitemap item- 3건 제거(43→40) curl 확인**. 단 상세페이지는 **soft-404(200) 잔존(검증함)**.
- **앱 #240**: CI(ci·Smoke·**의존성 게이트**) 초록 + squash 머지·브랜치 삭제. `buildPushMessage` 단위테스트 통과. **푸시 발송·네이티브 빌드는 미검증**(계정·기기 없음). 로컬 `next build`는 프리뷰서버 `.next` 락으로 못 돌려 CI에 위임함.
- 열린 PR: 이전 세션 **#216·#217·#219 상태 이번에도 미확인**.

**다음 세션 첫 프롬프트:**
> 먼저 docs/PROJECT_CONTEXT.md 최상단 핸드오프 읽어. ①#235·#240 실서비스 배포 정상인지 확인하고 ②soft-404(없는 치료/병원 주소가 404 안 뜨고 200 뜨는 버그) KNOWN_ISSUES에 적고 고칠지 판단해줘. 그리고 나 애플·구글·Firebase 계정 만들었으면(아직이면 말할게) 앱스토어 다음 단계 — 푸시 알림 실제 발송되게(지금 stub) + iOS 클라우드 맥 빌드 + 스토어 등록정보까지 진행해줘.

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
