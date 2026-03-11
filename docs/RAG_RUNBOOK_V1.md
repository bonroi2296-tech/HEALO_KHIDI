# RAG 운영 런북 v1 (배포 후 5분 점검)

배포 직후 아래 순서로 확인하면 RAG·관측성·인증이 정상인지 빠르게 점검할 수 있습니다.

---

## 1. 배포 직후 확인할 URL 3개

| 순서 | URL | 목적 |
|------|-----|------|
| 1 | `/api/admin/observability/rag/health?window=24h` | RAG health 집계·zero_rate·rpc_failed 확인 |
| 2 | `/api/admin/whoami` | 어드민 인증(쿠키/Bearer) 정상 여부 |
| 3 | `/api/rag/search` (POST, body: `{"query":"테스트","lang":"ko"}`) | RAG 검색 정상 응답 여부 |

- **1번·2번**: 브라우저에서 어드민 로그인 후 접속하거나, 동일 도메인에서 쿠키 포함 요청.
- **3번**: `curl -X POST https://<도메인>/api/rag/search -H "Content-Type: application/json" -d '{"query":"테스트","lang":"ko"}'`

---

## 2. 정상 기준 / 이상 기준

### 정상

- **health**: `ok: true`, `total_requests` 숫자, `zero_rate`·`embedding_fail_rate`·`rpc_fail_rate` 존재.
- **whoami**: 200, `isAdmin: true` (또는 개발 시 debug 정보).
- **search**: 200, `ok: true`, `results` 배열 (길이 0이어도 정상).

### 이상 시 조치

| 현상 | 의미 | 조치 |
|------|------|------|
| **rpc_failed 급증** | RPC 오류 또는 RAG_DISABLED 사용 중 | health의 `by_status.rpc_failed` 확인. `detail.reason=disabled`면 의도된 비활성화. 그 외면 Supabase RPC·네트워크 점검. |
| **zero_rate > 20%** | 검색 품질 저하 | health `alert: true` 발생. 인덱스·임베딩·문서 적재 상태 점검. |
| **embedding_failed 발생** | 임베딩 API 실패 | GOOGLE_GENERATIVE_AI_API_KEY·할당량·네트워크 확인. |
| **whoami 403** | 어드민 인증 실패 | Vercel `ADMIN_EMAIL_ALLOWLIST`, Supabase URL 설정, 쿠키/Bearer 전달 확인. |
| **search 500** | RAG 검색 경로 오류 | 서버 로그·Supabase env·RPC 존재 여부 확인. |

---

## 3. RAG_DISABLED 켜는 방법 (장애 시 RAG 비활성화)

- **의미**: `RAG_DISABLED=true` 이면 RAG 검색을 하지 않고 항상 빈 결과 `[]`를 반환합니다. embedding·RPC 호출 0회.
- **설정**  
  - **Vercel**: 프로젝트 → Settings → Environment Variables → `RAG_DISABLED` = `true` (Production/Preview 원하는 환경에 적용).  
  - **로컬**: `.env.local`에 `RAG_DISABLED=true` 추가.
- **반영**: Vercel은 **환경 변수 변경 후 Redeploy** 해야 적용됩니다. (Deployments → 최신 배포 ⋯ → Redeploy)
- **관측성**: 비활성화된 요청은 `rag_query_events`에 `status=rpc_failed`, `detail.reason=disabled`로 1건씩 기록되며, health API의 `by_status.rpc_failed`에 포함됩니다.

---

## 4. 배포 후 검증 절차 (요약)

1. 배포 완료 후 위 **URL 3개** 순서대로 호출해 200·정상 본문 확인.
2. `/api/admin/observability/rag/health?window=24h` 에서 `zero_rate`·`rpc_fail_rate`·`alert` 확인.
3. 이상 시 위 **이상 기준** 표 참고해 원인 조치.
4. RAG를 일시 끄려면 `RAG_DISABLED=true` 설정 후 Redeploy.

---

## 5. 로컬에서 재현 가능한 curl 예시

```bash
# health (관리자 쿠키 필요 시 브라우저에서 먼저 로그인)
curl -s "http://localhost:3000/api/admin/observability/rag/health?window=24h" | jq .

# RAG search (공개 API)
curl -s -X POST "http://localhost:3000/api/rag/search" \
  -H "Content-Type: application/json" \
  -d '{"query":"테스트","lang":"ko"}' | jq .
```
