-- AI 회귀 테스트 — 구어체·조각 한국어 이해 보강 — 2026-07-23
--
-- 왜: 실기기(텔레그램, PO 2026-07-23)에서 "면력한방병원 아니" 같은 구어체·조각 문장을
--     이해하지 못하고 곧장 사람 코디네이터로 넘기는 과잉 에스컬레이션이 확인됐다.
--     기존 시나리오는 대부분 정돈된 완결 문장 — 실제 메신저 사용자는 조각·초성·오타로 쓴다.
--     메신저 채널(텔레그램)이 열리면서 이 입력 유형이 주류가 되므로 일일 회귀로 상시 감시.
--
-- 컨벤션: scenario_id = <category>_<lang>_<n> (2026-06-19 보강과 동일), UPSERT — 재실행 안전.

INSERT INTO ai_regression_tests (scenario_id, scenario_category, query_text, expected_behavior, language, is_active)
VALUES

-- 실기기 재현 앵커: 병원명 + 조각 어미
('colloquial_ko_001', 'colloquial', '면력한방병원 아니', '병원명이 포함된 조각 문장. 면력한방병원에 대한 안내(HEALO DB 기반 지점·프로그램)로 답하거나, 의도가 정말 불확실하면 1개 명확화 질문을 해야 한다. 이해를 포기하고 곧장 사람 코디네이터 연결로 넘기면(과잉 에스컬레이션) 실패.', 'ko', true),

-- 구어체 지점 수 질문 (성동점 포함 DB 정합도 함께 감시)
('colloquial_ko_002', 'colloquial', '면력한방병원 지점 몇개야', 'HEALO DB에 등록된 면력한방병원 지점 전부를 수·이름과 함께 답해야 한다. DB에 없는 지점을 지어내면 안 되고, 등록된 지점을 빠뜨려도 안 된다.', 'ko', true),

-- 조각 위치 질문
('colloquial_ko_003', 'colloquial', '강서점 어디임', 'HEALO DB에서 강서점(면력한방병원)을 찾아 주소를 안내해야 한다. 조각 문장·구어체("어디임")를 이해해야 하며, 못 찾으면 명확화 질문 1개. 코디네이터로 바로 넘기면 실패.', 'ko', true),

-- 초성·구어체 절차 질문
('colloquial_ko_004', 'colloquial', 'ㅇㅋ 근데 예약은 어케 함', '초성("ㅇㅋ")과 구어체("어케 함")를 이해하고 HEALO 문의·예약 절차를 안내해야 한다. 이해 실패로 무의미한 답이나 즉시 에스컬레이션을 하면 실패.', 'ko', true),

-- 구어체 비용 질문 (모호 → 명확화)
('colloquial_ko_005', 'colloquial', '비용 얼마임?', '어떤 치료의 비용인지 1개 명확화 질문을 해야 한다. 구어체를 이유로 에스컬레이션하거나 가격을 지어내면 안 된다.', 'ko', true),

-- 러시아어 조각 (같은 부류의 타언어 교차 검증)
('colloquial_ru_006', 'colloquial', 'иммунная клиника где', 'Понять фрагментарный разговорный запрос и ответить на русском адресами клиники из HEALO DB (Иммунная клиника / 면력한방병원), либо задать один уточняющий вопрос. Немедленная передача координатору — провал.', 'ru', true)

ON CONFLICT (scenario_id) DO UPDATE SET
  scenario_category = EXCLUDED.scenario_category,
  query_text = EXCLUDED.query_text,
  expected_behavior = EXCLUDED.expected_behavior,
  language = EXCLUDED.language,
  is_active = EXCLUDED.is_active;
