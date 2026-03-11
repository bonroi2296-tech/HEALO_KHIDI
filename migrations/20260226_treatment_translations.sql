-- treatment_translations: KO canonical 외 다국어 (비동기 생성)
-- DB 저장은 treatments에 ko만; 번역은 별도 잡으로 EN/JA/ZH 등 비동기 생성
CREATE TABLE IF NOT EXISTS public.treatment_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_id uuid NOT NULL REFERENCES public.treatments(id) ON DELETE CASCADE,
  lang text NOT NULL,
  name text,
  short_desc text,
  related_info jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  model text,
  version int DEFAULT 1,
  UNIQUE(treatment_id, lang)
);

CREATE INDEX IF NOT EXISTS idx_treatment_translations_treatment_id ON public.treatment_translations(treatment_id);
CREATE INDEX IF NOT EXISTS idx_treatment_translations_lang ON public.treatment_translations(lang);

COMMENT ON TABLE public.treatment_translations IS '시술 다국어: KO는 treatments에 canonical, EN/JA/ZH 등은 비동기 번역 job으로 채움';
