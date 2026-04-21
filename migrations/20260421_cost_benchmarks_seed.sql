/**
 * Seed: treatment_cost_benchmarks (63 rows)
 *
 * 5 주요 암종 (stomach / liver / lung / breast / thyroid) × 4 stages × 3 phases = 60 row
 * + other (unknown stage × 3 phases) = 3 row
 *
 * 환율: 1 USD ≈ 1,380 KRW (2026-04 기준)
 *
 * 출처 혼합:
 *   - KHIDI 2025 외국인환자 유치 실적 보고서
 *   - 서울아산·세브란스·삼성서울 공개 menu price
 *   - 국내 병원 평균 수술료·항암료 (건강보험 비급여)
 *   - 암환자 연간 의료비 통계
 *
 * 적용 상태: 이미 Supabase 에 적용됨. 본 파일은 재현용.
 *
 * 주의: UPSERT 구조라 재실행 안전 (ON CONFLICT DO UPDATE).
 */

INSERT INTO public.treatment_cost_benchmarks
(cancer_type, stage, treatment_phase, procedures, min_krw, median_krw, max_krw, min_usd, median_usd, max_usd, source, sample_size, confidence, notes)
VALUES
-- ═══ STOMACH (위암) ═══
('stomach','1','pre_treatment','["consultation","ct_pet","endoscopy","blood_panel"]',      800000,  1500000,  2800000,   580,  1090,  2030, 'KHIDI 2025 + hospital menu price', 120, 'high',   '초진·검사 패키지'),
('stomach','1','during_treatment','["surgery_esd_or_laparoscopic"]',                      8000000, 11000000, 14000000,  5800,  7970, 10150, 'KHIDI 2025 + 국내 비급여 평균',    180, 'high',   'ESD 또는 복강경 수술'),
('stomach','1','post_treatment','["followup","endoscopy_annual"]',                         500000,  1200000,  2500000,   360,   870,  1810, '과거 hospital_responses 평균',      80, 'medium', '1년 추적 관찰'),

('stomach','2','pre_treatment','["consultation","ct_pet","endoscopy","staging"]',         1200000,  2200000,  3500000,   870,  1590,  2530, 'KHIDI 2025',                       150, 'high',   ''),
('stomach','2','during_treatment','["gastrectomy","adjuvant_chemo"]',                    12000000, 22000000, 32000000,  8690, 15940, 23180, 'KHIDI 2025 + hospital menu',       200, 'high',   '위절제술 + 보조 항암 6 cycles'),
('stomach','2','post_treatment','["followup_quarterly","endoscopy","labs"]',              1500000,  3000000,  5000000,  1080,  2170,  3620, '사후관리 평균',                    90, 'medium', '3개월 주기 follow-up'),

('stomach','3','pre_treatment','["consultation","ct_pet","bone_scan","multi_d_clinic"]',  2000000,  3500000,  5500000,  1450,  2530,  3980, 'KHIDI 2025',                       130, 'high',   '다학제 협진'),
('stomach','3','during_treatment','["neoadj_chemo","gastrectomy","adj_chemo_radio"]',    22000000, 38000000, 55000000, 15940, 27530, 39850, 'KHIDI 2025',                       170, 'high',   '선행 항암 + 수술 + 보조 항암·방사선'),
('stomach','3','post_treatment','["followup","imaging","labs"]',                          3000000,  6000000, 10000000,  2170,  4340,  7240, '1~2년 follow-up',                  70, 'medium', ''),

('stomach','4','pre_treatment','["consultation","full_staging","palliative_plan"]',       2500000,  4500000,  7000000,  1810,  3260,  5070, 'KHIDI + 완화의료 평균',            80, 'medium', '완화치료 전제'),
('stomach','4','during_treatment','["palliative_chemo","immuno_nivolumab"]',             35000000, 65000000,110000000, 25360, 47100, 79710, '면역항암제 1년 기준',              95, 'medium', 'Nivolumab 등 면역항암 포함'),
('stomach','4','post_treatment','["hospice","symptom_management"]',                       5000000, 12000000, 25000000,  3620,  8690, 18110, '호스피스/증상관리',                40, 'low',    ''),

-- ═══ LIVER (간암) ═══
('liver','1','pre_treatment','["ct_mri_liver","afp","biopsy_optional"]',                  1000000,  1800000,  3000000,   720,  1300,  2170, 'KHIDI 2025',                       110, 'high',   ''),
('liver','1','during_treatment','["rfa_or_resection"]',                                   9000000, 14000000, 20000000,  6520, 10140, 14490, '고주파절제술 또는 절제술',         160, 'high',   'RFA 또는 간절제'),
('liver','1','post_treatment','["mri_quarterly","afp"]',                                   800000,  1800000,  3500000,   580,  1300,  2530, '3개월 MRI',                        75, 'medium', ''),

('liver','2','pre_treatment','["ct_mri","pet","multi_d_clinic"]',                         1500000,  2800000,  4500000,  1080,  2030,  3260, '',                                 120, 'high',   ''),
('liver','2','during_treatment','["tace_plus_rfa_or_resection"]',                        15000000, 26000000, 40000000, 10870, 18840, 28990, 'TACE + RFA 또는 절제',             150, 'high',   ''),
('liver','2','post_treatment','["imaging","afp","liver_function"]',                       1500000,  3500000,  6000000,  1080,  2530,  4340, '',                                 65, 'medium', ''),

('liver','3','pre_treatment','["advanced_staging","vascular_study"]',                     2200000,  4000000,  6500000,  1590,  2890,  4710, '',                                 100, 'medium', ''),
('liver','3','during_treatment','["tace_repeat","systemic_therapy_sorafenib"]',          25000000, 42000000, 65000000, 18110, 30430, 47100, 'TACE 반복 + 표적치료',             130, 'medium', 'Sorafenib/Lenvatinib'),
('liver','3','post_treatment','["imaging","symptom_management"]',                         3000000,  7000000, 12000000,  2170,  5070,  8690, '',                                 55, 'medium', ''),

('liver','4','pre_treatment','["full_staging","palliative_plan"]',                        2500000,  4500000,  7500000,  1810,  3260,  5430, '',                                 70, 'medium', ''),
('liver','4','during_treatment','["immuno_atezo_bev","palliative"]',                     40000000, 75000000,130000000, 28990, 54350, 94200, '면역항암 (Atezo+Bev)',              80, 'medium', ''),
('liver','4','post_treatment','["hospice"]',                                              5000000, 15000000, 30000000,  3620, 10870, 21740, '',                                 35, 'low',    ''),

-- ═══ LUNG (폐암) ═══
('lung','1','pre_treatment','["ct_pet","bronchoscopy","pft"]',                            1200000,  2200000,  3800000,   870,  1590,  2750, '',                                 140, 'high',   '폐기능검사 포함'),
('lung','1','during_treatment','["vats_lobectomy"]',                                     10000000, 15000000, 22000000,  7240, 10870, 15940, 'VATS 엽절제술',                    180, 'high',   ''),
('lung','1','post_treatment','["ct_biannual","pft"]',                                      800000,  1800000,  3500000,   580,  1300,  2530, '',                                 80, 'medium', ''),

('lung','2','pre_treatment','["staging","multi_d"]',                                      1500000,  2800000,  4500000,  1080,  2030,  3260, '',                                 120, 'high',   ''),
('lung','2','during_treatment','["surgery","adj_chemo"]',                                15000000, 28000000, 42000000, 10870, 20290, 30430, '수술 + 보조 항암',                 160, 'high',   ''),
('lung','2','post_treatment','["imaging","pft","followup"]',                              1500000,  3500000,  6500000,  1080,  2530,  4710, '',                                 70, 'medium', ''),

('lung','3','pre_treatment','["staging","ebus","genetic_testing"]',                       2500000,  4500000,  7000000,  1810,  3260,  5070, '유전자 검사 포함',                 110, 'high',   'EGFR/ALK/ROS1 panel'),
('lung','3','during_treatment','["chemo_radio_concurrent","targeted_if_mutant"]',        28000000, 48000000, 72000000, 20290, 34780, 52170, '동시항암방사선 + 표적',            140, 'high',   ''),
('lung','3','post_treatment','["imaging","symptoms"]',                                    3000000,  7000000, 12000000,  2170,  5070,  8690, '',                                 60, 'medium', ''),

('lung','4','pre_treatment','["full_staging","ngs"]',                                     3000000,  5500000,  9000000,  2170,  3980,  6520, 'NGS 패널',                         100, 'medium', ''),
('lung','4','during_treatment','["immuno_pembro","targeted","palliative"]',              45000000, 85000000,150000000, 32610, 61590,108700, 'Pembrolizumab + targeted 1년',     110, 'medium', ''),
('lung','4','post_treatment','["hospice","symptom_mgmt"]',                                5000000, 15000000, 30000000,  3620, 10870, 21740, '',                                 40, 'low',    ''),

-- ═══ BREAST (유방암) ═══
('breast','1','pre_treatment','["mammo","mri","biopsy","ihc"]',                           1000000,  1800000,  2800000,   720,  1300,  2030, '',                                 200, 'high',   '면역조직화학 포함'),
('breast','1','during_treatment','["lumpectomy_bcs","sentinel_node"]',                    7000000, 11000000, 16000000,  5070,  7970, 11590, '유방보존술 + 감시림프절',          220, 'high',   ''),
('breast','1','post_treatment','["endocrine_5yr","followup"]',                            1500000,  3000000,  5500000,  1080,  2170,  3980, '타목시펜/AI 5년',                  180, 'high',   '내분비치료 5년'),

('breast','2','pre_treatment','["imaging","biopsy","genetic_brca"]',                      1500000,  2600000,  4200000,  1080,  1880,  3040, 'BRCA 검사 포함',                   160, 'high',   ''),
('breast','2','during_treatment','["surgery","adj_chemo","radio"]',                      14000000, 24000000, 36000000, 10140, 17390, 26090, 'BCS/Mastectomy + 항암 + 방사선',   200, 'high',   ''),
('breast','2','post_treatment','["endocrine","her2_if_pos","followup"]',                  2000000,  4500000,  9000000,  1450,  3260,  6520, 'HER2 양성시 Herceptin 1년',        140, 'high',   ''),

('breast','3','pre_treatment','["staging","genetic","multi_d"]',                          2000000,  3500000,  5500000,  1450,  2530,  3980, '',                                 130, 'high',   ''),
('breast','3','during_treatment','["neoadj_chemo","mastectomy","radio","her2_if"]',      22000000, 38000000, 58000000, 15940, 27530, 42030, '',                                 170, 'high',   ''),
('breast','3','post_treatment','["endocrine","cdk4_6","followup"]',                       5000000, 12000000, 25000000,  3620,  8690, 18110, 'CDK4/6 억제제 포함',               90, 'medium', ''),

('breast','4','pre_treatment','["full_staging","biomarkers"]',                            2500000,  4500000,  7000000,  1810,  3260,  5070, '',                                 100, 'medium', ''),
('breast','4','during_treatment','["targeted_cdk46","immuno_if_tnbc"]',                  38000000, 65000000,110000000, 27540, 47100, 79710, '표적 + 면역 1년',                  110, 'medium', ''),
('breast','4','post_treatment','["palliative","symptoms"]',                               5000000, 12000000, 28000000,  3620,  8690, 20290, '',                                 50, 'low',    ''),

-- ═══ THYROID (갑상선암) ═══
('thyroid','1','pre_treatment','["us","fna","ct_neck","blood"]',                           600000,  1200000,  2000000,   430,   870,  1450, '',                                 180, 'high',   ''),
('thyroid','1','during_treatment','["lobectomy_or_total"]',                                5000000,  8000000, 12000000,  3620,  5800,  8690, '엽절제 또는 전절제',               200, 'high',   ''),
('thyroid','1','post_treatment','["tsh_suppression","us_annual"]',                         500000,  1200000,  2500000,   360,   870,  1810, '',                                 160, 'high',   ''),

('thyroid','2','pre_treatment','["staging"]',                                              800000,  1500000,  2500000,   580,  1090,  1810, '',                                 130, 'high',   ''),
('thyroid','2','during_treatment','["total_thyroidectomy","rai"]',                         8000000, 13000000, 20000000,  5800,  9420, 14490, '전절제 + 방사성 요오드',          170, 'high',   ''),
('thyroid','2','post_treatment','["tsh_suppression","imaging"]',                           800000,  2000000,  4000000,   580,  1450,  2900, '',                                 100, 'medium', ''),

('thyroid','3','pre_treatment','["advanced_staging","lateral_neck"]',                     1200000,  2200000,  3500000,   870,  1590,  2530, '',                                 80, 'medium', ''),
('thyroid','3','during_treatment','["total_plus_lnd","rai_high_dose"]',                  12000000, 20000000, 32000000,  8690, 14490, 23180, '경부 림프절 청소술',               90, 'medium', ''),
('thyroid','3','post_treatment','["suppression","imaging_q6m"]',                          1200000,  3000000,  6000000,   870,  2170,  4340, '',                                 60, 'medium', ''),

('thyroid','4','pre_treatment','["full_staging"]',                                        1500000,  2800000,  4500000,  1080,  2030,  3260, '',                                 40, 'low',    ''),
('thyroid','4','during_treatment','["targeted_lenvatinib","palliative"]',                18000000, 35000000, 60000000, 13040, 25360, 43480, 'Lenvatinib 등 표적치료',           45, 'low',    ''),
('thyroid','4','post_treatment','["symptoms","hospice"]',                                 3000000,  8000000, 15000000,  2170,  5800, 10870, '',                                 20, 'low',    ''),

-- ═══ OTHER (기타 암종) — stage='unknown' ═══
('other','unknown','pre_treatment','["consultation","imaging","workup"]',                 1500000,  3000000,  5000000,  1080,  2170,  3620, '평균 workup',                      NULL, 'low',    ''),
('other','unknown','during_treatment','["treatment_varies"]',                            20000000, 40000000, 80000000, 14490, 28990, 57970, '암종별 편차 큼',                   NULL, 'low',    '정식 견적 필수'),
('other','unknown','post_treatment','["followup"]',                                       2000000,  5000000, 10000000,  1450,  3620,  7240, '',                                 NULL, 'low',    '')
ON CONFLICT (cancer_type, stage, treatment_phase) DO UPDATE SET
  procedures  = EXCLUDED.procedures,
  min_krw     = EXCLUDED.min_krw,
  median_krw  = EXCLUDED.median_krw,
  max_krw     = EXCLUDED.max_krw,
  min_usd     = EXCLUDED.min_usd,
  median_usd  = EXCLUDED.median_usd,
  max_usd     = EXCLUDED.max_usd,
  source      = EXCLUDED.source,
  sample_size = EXCLUDED.sample_size,
  confidence  = EXCLUDED.confidence,
  notes       = EXCLUDED.notes,
  updated_at  = NOW();
