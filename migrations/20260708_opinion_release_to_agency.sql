-- 전문의 소견 — 에이전시 공개(release) 플래그.
-- 원본(opinion_text)은 원장님이 쓴 그대로(한국어) → 코디가 오탈자/외국어 교정을 거쳐
-- released_text 에 확정본을 남기고 "공개"해야만 에이전시에 노출(견적서 issued 패턴과 동일).
ALTER TABLE case_opinions ADD COLUMN IF NOT EXISTS released_text text;
ALTER TABLE case_opinions ADD COLUMN IF NOT EXISTS released_at timestamptz;
ALTER TABLE case_opinions ADD COLUMN IF NOT EXISTS released_by uuid;
