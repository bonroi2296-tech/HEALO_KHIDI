-- chat_threads.metadata 부분 병합 RPC — 2026-07-24
--
-- 왜: 코드 곳곳의 metadata 갱신이 "읽어둔 스냅샷 전체를 덮어쓰기"(read-modify-write)라
--     그 사이 끼어든 다른 키(hand_off_requested·coordinator_active 등)를 되돌리는 사고
--     부류(독립 리뷰 C2)가 반복된다. 이 RPC 는 주어진 키만 jsonb 병합해 나머지를 보존한다.
-- p_only_if_absent: 해당 키가 아직 없을 때만 병합(원자적 클레임 — staff_topic_id 등).
--     반환값 = 영향 행 수(0 = 조건 불충족/경쟁 패배).
-- 권한: 서버 전용(service_role) — PUBLIC 상속 구멍(POSTMORTEMS #54) 재발 방지로 명시 REVOKE.

CREATE OR REPLACE FUNCTION chat_thread_merge_meta(
  p_thread_id uuid,
  p_patch jsonb,
  p_only_if_absent text DEFAULT NULL
)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH updated AS (
    UPDATE chat_threads
       SET metadata = coalesce(metadata, '{}'::jsonb) || p_patch,
           updated_at = now()
     WHERE id = p_thread_id
       AND (p_only_if_absent IS NULL OR NOT (coalesce(metadata, '{}'::jsonb) ? p_only_if_absent))
     RETURNING id
  )
  SELECT count(*)::int FROM updated;
$$;

REVOKE EXECUTE ON FUNCTION chat_thread_merge_meta(uuid, jsonb, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION chat_thread_merge_meta(uuid, jsonb, text) FROM anon;
REVOKE EXECUTE ON FUNCTION chat_thread_merge_meta(uuid, jsonb, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION chat_thread_merge_meta(uuid, jsonb, text) TO service_role;
