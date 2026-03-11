-- ============================================================
-- RAG V1.2: 샘플 Trust Tier 시드 데이터 (6건)
-- ※ 실존 기관명/수치 단정 없음. 라벨만 예시.
-- ※ 이미 같은 source_type+source_id+lang+version이 있으면 무시.
-- ============================================================

-- Tier 1 — 공공/공식 (2건)
INSERT INTO public.rag_documents (source_type, source_id, lang, version, title, content, trust_tier, source_label, source_url)
VALUES
  ('policy', '00000000-0000-0000-0000-000000000001', 'ko', 1,
   '의료관광 안내 가이드 (공공)',
   '한국 의료관광에 관한 일반 안내 사항입니다. 공공기관 발행 자료를 기반으로 작성되었습니다.',
   1, '공공기관 안내자료', 'https://example.gov.kr/medical-tourism-guide'),
  ('policy', '00000000-0000-0000-0000-000000000002', 'en', 1,
   'Medical Tourism General Policy (Official)',
   'Official guidelines for medical tourism in Korea. Published by public health authorities.',
   1, 'Public Health Authority', 'https://example.gov.kr/en/policy')
ON CONFLICT ON CONSTRAINT rag_documents_source_unique DO NOTHING;

-- Tier 2 — 제휴 (2건)
INSERT INTO public.rag_documents (source_type, source_id, lang, version, title, content, trust_tier, source_label, source_url)
VALUES
  ('hospital', '00000000-0000-0000-0000-000000000003', 'ko', 1,
   '제휴 병원 A — 피부과 진료 안내',
   '제휴 병원 A의 피부과 진료 항목 및 상담 안내입니다. 병원 제공 자료 기반.',
   2, '제휴 병원 A (예시)', NULL),
  ('treatment', '00000000-0000-0000-0000-000000000004', 'en', 1,
   'Partner Clinic B — Rhinoplasty Info',
   'Rhinoplasty procedure overview from Partner Clinic B. Verified by partner.',
   2, 'Partner Clinic B (sample)', NULL)
ON CONFLICT ON CONSTRAINT rag_documents_source_unique DO NOTHING;

-- Tier 3 — 공개수집 (2건)
INSERT INTO public.rag_documents (source_type, source_id, lang, version, title, content, trust_tier, source_label, source_url)
VALUES
  ('review', '00000000-0000-0000-0000-000000000005', 'ko', 1,
   '커뮤니티 후기 모음 (공개)',
   '온라인 커뮤니티에서 수집된 시술 후기입니다. 검증되지 않은 공개 자료.',
   3, '공개 커뮤니티', 'https://example-forum.kr/reviews'),
  ('faq', '00000000-0000-0000-0000-000000000006', 'en', 1,
   'Publicly Collected FAQ',
   'Frequently asked questions collected from various public sources. Unverified.',
   3, 'Public Web (unverified)', 'https://example-blog.com/faq')
ON CONFLICT ON CONSTRAINT rag_documents_source_unique DO NOTHING;
