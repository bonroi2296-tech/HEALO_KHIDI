# 공개 AI 챗 자동 평가 (chat-eval)

PO가 케이스를 한국어로 한 줄씩 늘려두면, **다국어·멀티턴 대화를 실제 배포 API에 자동으로 돌려** 합격/불합격 리포트를 뽑는 하니스. 응답을 사람이 하나씩 눈으로 볼 필요 없게 만드는 게 목적.

> 기존 `judge.ts`(라이브 채점)·회귀 105케이스(DB 시드, 단일턴, 안전/환각 위주)와 **별개**다. 이건 PO가 직접 키우는 리스트로, **멀티턴 행동**(서류 5개 일관성·앵무새 반복·카자흐어≠러시아어·물류 실질응답 등)을 **실제 배포 API E2E**로 검증한다.

## 실행

```bash
# 기본(케이스 전부, 케이스가 선언한 언어 전부, LLM 심판 켜짐)
node scripts/chat-eval.mjs --base https://<preview>.vercel.app

# 일부만: 특정 케이스·언어
node scripts/chat-eval.mjs --base https://healwith.co.kr --ids docs-consistency,no-parrot-logistics --langs ko,ru,kz

# 심판 끄고 기계검사만(Gemini 키 불필요·비용 0·빠름)
node scripts/chat-eval.mjs --base <URL> --no-judge
```

- 리포트: `eval/reports/chat-eval-<시각>.md` (+ `.json`). 표 + 케이스별 질문·답변·검사·심판 사유.
- **심판(LLM)** 은 `GOOGLE_GENERATIVE_AI_API_KEY`(`.env.local`) 필요. 없으면 자동으로 기계검사만.
- 콘솔에 ✅/❌/⚠️ 요약. 하나라도 실패면 종료코드 1(CI 연결 시 유용).

## 케이스 늘리기 — `eval/chat-cases.json`

`cases` 배열에 한 항목 추가하면 끝:

```jsonc
{
  "id": "고유-id",
  "desc_ko": "이 케이스가 뭘 보는지 한국어 한 줄(PO가 읽는 곳)",
  "langs": ["ko", "ru", "kz"],            // 돌릴 언어
  "turns": {                              // 언어별 환자 메시지(≤2턴!)
    "ko": ["첫 질문", "둘째 질문(선택)"],
    "ru": ["..."], "kz": ["..."]
  },
  "checks": ["reply_lang", "doc_list_ge5"],  // 기계검사 id(아래 표)
  "judge": "LLM이 합격/불합격을 가를 영어 기준 한 문단(없으면 기계검사만)"
}
```

### 기계검사 id (코드: `scripts/chat-eval.mjs` 상단 `CHECKS`)
| id | 통과 조건 |
|---|---|
| `reply_lang` | 답변 언어 = 기대 언어(카자흐어 ↔ 러시아어 구분 포함) |
| `doc_list_ge5` | 첫 응답에 목록 항목 ≥5(필수서류 5개 다 나옴) |
| `turn_last_no_doc_list` | 마지막 응답에 목록 항목 <4(서류 재나열=앵무새 아님) |
| `source_tag` | 출처 표기(출처/source/источник/…) 있음 |
| `price_range` | 통화 + 범위 표기(단일 확정금액 아님) |
| `no_bare_price` | 가격 숫자 미노출(안 물었는데 가격 들이밀면 실패) |

새 기계검사가 필요하면 `CHECKS` 에 함수 한 개 추가. 미묘한 판단은 `judge` 기준으로.

## ⚠️ KHIDI 오염 방지 (중요)

공개 챗은 **3턴째**부터 대화를 `source=ai_agent` 인콰이어리로 자동 승격한다 → 그게 곧 **유치 전환 대시보드(8/27 평가 점수)**. 그래서:

- **케이스는 반드시 ≤2턴.** 러너가 3턴 이상이면 거부한다. (≤2턴이면 인콰이어리 승격이 안 일어나 점수 무오염 — 실측 확인됨.)
- eval 스레드는 `guest_country="__EVAL__"` 로 태그된다.

### 잔여 데이터 청소
평가가 만든 chat_threads/메시지(태그 `__EVAL__`)는 KHIDI 무관이지만 정리하는 게 깔끔하다.

```bash
node scripts/chat-eval-cleanup.mjs --yes   # SUPABASE_SERVICE_ROLE_KEY 가 .env.local 에 유효할 때
```

로컬에 유효한 service_role 키가 없으면(흔함 — Vercel/GitHub Secret에만 있는 경우) Supabase SQL 에디터에서:

```sql
delete from chat_messages where thread_id in (select id from chat_threads where guest_country='__EVAL__');
delete from ai_response_evaluations where thread_id in (select id from chat_threads where guest_country='__EVAL__');
delete from chat_threads where guest_country='__EVAL__';
```

## 비용·한도·주의 (aiGuard)

`aiGuard`(src/lib/ai/aiGuard.ts): **IP당 50회/일**(`AI_DAILY_PER_IP_LIMIT`) + **글로벌 2000회/일**(`AI_DAILY_GLOBAL_LIMIT`), DB 카운터(배포 공유).

- **평가를 막는 건 IP당 50회/일**이다(429 `ai_daily_limit`). 한 머신에서 하루 ~50 챗콜이 한계 → **87개 전수는 하루에 안 된다.** 며칠로 쪼개거나(`--ids/--langs`로 범위 축소), 평가 머신의 `AI_DAILY_PER_IP_LIMIT` 를 임시 상향.
- **글로벌 환자 예산(2000/일)은 평가가 거의 안 갉아먹는다**(eval 한 IP ≈ 50 ≈ 2.5%). 그래서 프로덕션 검증이 필요하면 소량은 괜찮다. 다만 평가 트래픽이 실 분석/judge 평가행에 섞이니 **기본은 프리뷰**를 쓰고 eval 스레드는 청소한다.
- **비용**: 심판 켜면 케이스×언어마다 Gemini 호출 1회 + 챗 응답도 실제 모델 호출. 아끼려면 `--no-judge` 또는 `--ids/--langs` 로 좁혀라.

## 평가기 보정(리스트 갱신의 일부)
첫 실행은 종종 **AI가 아니라 검사/심판이 너무 빡빡해서** 나는 false 실패를 드러낸다(예: 가격 범위를 "에서/~$" 로 쓴 걸 정규식이 못 잡음, 심판이 "정확히 1문장"을 강요). 그럴 땐 AI를 고치는 게 아니라 **해당 케이스의 `judge` 기준을 현실적으로 풀거나 `scripts/chat-eval.mjs` 의 검사 정규식을 보정**한다. 이게 정상적인 평가 성숙 과정이다.
