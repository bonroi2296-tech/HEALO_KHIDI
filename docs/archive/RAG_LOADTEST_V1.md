# RAG 검색 RPC 부하 테스트 (V1)

`rag_search_chunks_v1_1` RPC의 기본 성능을 측정하고 운영 가이드를 정리한 문서입니다.

---

## 1. 실행 커맨드

```bash
# 기본값 (concurrency=20, requests=200, lang=en, query="test inquiry")
npm run loadtest:rag

# 옵션 지정
npm run loadtest:rag -- --concurrency=10 --requests=100 --lang=ko --query="병원 추천"
```

| 옵션 | 기본값 | 설명 |
|------|--------|------|
| `--concurrency` | 20 | 동시 요청 수 (1~100) |
| `--requests` | 200 | 총 요청 수 (1~2000) |
| `--lang` | en | RPC p_lang 파라미터 |
| `--query` | test inquiry | 임베딩 생성용 쿼리 (동일 쿼리로 RPC만 반복 측정) |

**요구 환경변수:** `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY` (쿼리 임베딩 1회용)

---

## 2. 실행 환경

- **로컬:** `.env` / `.env.local` 로드. 프로덕션 DB 사용 시 concurrency/requests를 낮게 유지할 것.
- **스테이징:** 동일 스크립트로 스테이징 Supabase URL/키로 실행 가능. 부하 전 스테이징 용도 확인 권장.

---

## 3. 테스트 조건 (기본)

| 항목 | 값 |
|------|-----|
| concurrency | 20 |
| requests | 200 |
| lang | en |
| RPC | rag_search_chunks_v1_1 (match_count=6, p_source_type=null) |

---

## 4. 결과 표 (예시)

*아래는 로컬에서 `--concurrency=2 --requests=5` 로 실행한 예시입니다. 실제 수치는 DB/네트워크에 따라 다릅니다.*

| 지표 | 값 | 비고 |
|------|-----|------|
| total_requests | 5 | 총 RPC 호출 수 |
| success_count | 5 | 성공 건수 |
| error_count | 0 | 실패 건수 |
| avg_latency (ms) | 84 | 평균 지연 |
| p50_latency (ms) | 75 | 50% 백분위 |
| p95_latency (ms) | 133 | 95% 백분위 |
| max_latency (ms) | 133 | 최대 지연 |

*옵션을 넘기려면: `npm run loadtest:rag -- --concurrency=10 --requests=100`*

---

## 5. 권장 운영 가이드

- **권장 concurrency:** 기본 20 이하 유지. DB CPU/연결 수에 따라 10 이하로 낮추는 것을 권장.
- **p95 기준 권장 한도:** p95가 500ms를 넘지 않도록 유지. 지속적으로 높으면 인덱스/리소스 점검.
- **에러율 기준 경고:** error_count / total_requests > 1% 이면 경고. 5% 이상이면 부하 감소 또는 장애 조사 필요.

---

## 6. 주의사항

- **프로덕션 DB:** 절대 무리한 concurrency/requests로 실행하지 말 것. 기본값(20, 200)으로 먼저 확인 후 필요 시만 소규모로 상향.
- 스크립트는 **동일 쿼리 임베딩**으로 RPC만 반복 호출하여, 임베딩 API 부하는 1회만 발생합니다.
