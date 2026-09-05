-- AI 자가시험이 실서비스 경로(streamChatReply + 3-Tier RAG)를 타게 되면서 생긴 두 칸.
-- 왜: 기존 latency_ms 는 «완료 시각»만 재서 NFR-02(첫 토큰 ≤ 5초)와 다른 자였다.
--     (실측 2026-08-21: 자가시험 2,262건은 응답길이와 상관 0.200·고정비 4,983ms,
--      실서비스 스트리밍은 첫 토큰 중앙값 2.30초·완료 3.03초 — 두 값이 서로 다른 자.)
-- 되돌리기 가능한 «추가»만 한다(기존 칸·데이터 불변).
ALTER TABLE ai_regression_runs ADD COLUMN IF NOT EXISTS first_token_ms INT;
ALTER TABLE ai_regression_runs ADD COLUMN IF NOT EXISTS rag_chunk_count INT;

COMMENT ON COLUMN ai_regression_runs.first_token_ms IS
  '첫 토큰까지 걸린 시간(ms). NFR-02(첫 토큰 ≤ 5초)와 같은 자. latency_ms 는 완료까지.';
COMMENT ON COLUMN ai_regression_runs.rag_chunk_count IS
  'RAG 검색으로 프롬프트에 실제로 들어간 조각 수. 0 이 계속 나오면 검색이 안 도는 것.';
