/**
 * healwith 의료문서 번역 — 용어 사전(controlled vocabulary)
 *
 * 왜: LLM 의료번역은 도메인 용어에서 흔들린다(특히 CIS 특유 용어). 이 사전을 프롬프트에
 * 고정 주입해 "이 원문 용어는 반드시 이 번역"으로 못박아, 반복되는 오역·오독 부류를 차단한다.
 * 예) эндоцервикоз → 한국 임상의가 "자궁내막증(endometriosis)"으로 오독하면 병기 오해로 이어짐.
 *
 * 구조: seed(여기, 코드로 검토·고정) + learned(DB, 코디 수정에서 축적) 를 번역 시 병합한다.
 * learned 는 아직 없음 — E단계에서 doc_glossary_terms 테이블로 붙인다.
 */

export type DocLang = "ko" | "en" | "ru";

export type GlossaryEntry = {
  /** 원문 표기(키릴/라틴/카자흐 별칭). 모델이 알아보게 하는 힌트 — 소문자 매칭 아님, 프롬프트 노출용. */
  src: string[];
  ko: string;
  en: string;
  ru: string;
  /** 부가 지침(모호어 구분 등). 있으면 프롬프트에 대괄호로 덧붙인다. */
  note?: string;
};

/**
 * 씨앗 사전 — #37(키르기스 환자) 실문서 + CIS 종양·부인과 검사지에서 반복되는 용어.
 * 새 오역이 관찰되면 여기 추가(검토된 것) 또는 코디 수정으로 learned 축적.
 */
export const SEED_GLOSSARY: GlossaryEntry[] = [
  {
    src: ["эндоцервикоз", "endocervicosis"],
    ko: "자궁경부 원주상피 증식(엔도세르비코시스)",
    en: "endocervicosis (cervical columnar ectopy)",
    ru: "эндоцервикоз (эктопия цилиндрического эпителия)",
    note: "NOT endometriosis(자궁내막증). 자궁경부 원주상피 이소성/증식임 — 오독 주의",
  },
  { src: ["дисплазия тяжёлой степени", "дисплазия тяжелой степени", "тяжёлая дисплазия"], ko: "고도 이형성증", en: "severe dysplasia", ru: "дисплазия тяжёлой степени" },
  { src: ["дисплазия умеренной степени"], ko: "중등도 이형성증", en: "moderate dysplasia", ru: "дисплазия умеренной степени" },
  { src: ["эрозия шейки матки", "эрозия ш/м", "эрозия шм"], ko: "자궁경부 미란", en: "cervical erosion", ru: "эрозия шейки матки" },
  { src: ["железистая эрозия"], ko: "선성(샘) 미란", en: "glandular erosion", ru: "железистая эрозия" },
  { src: ["ASC-H"], ko: "비정형 편평상피세포, HSIL 배제 불가(ASC-H)", en: "ASC-H (atypical squamous cells, cannot exclude HSIL)", ru: "ASC-H (атипичные плоские клетки, не исключающие HSIL)" },
  { src: ["ASC-US"], ko: "의의불명 비정형 편평상피세포(ASC-US)", en: "ASC-US (atypical squamous cells of undetermined significance)", ru: "ASC-US" },
  { src: ["HSIL"], ko: "고등급 편평상피내병변(HSIL)", en: "HSIL (high-grade squamous intraepithelial lesion)", ru: "HSIL (плоскоклеточное интраэпителиальное поражение высокой степени)" },
  { src: ["LSIL"], ko: "저등급 편평상피내병변(LSIL)", en: "LSIL (low-grade squamous intraepithelial lesion)", ru: "LSIL" },
  { src: ["CIN I", "CIN II", "CIN III", "CIN 1", "CIN 2", "CIN 3"], ko: "자궁경부상피내종양(CIN, 등급 그대로 유지)", en: "CIN (cervical intraepithelial neoplasia, keep grade)", ru: "CIN (цервикальная интраэпителиальная неоплазия)", note: "등급(I/II/III)은 원문 그대로" },
  { src: ["ВПЧ", "HPV"], ko: "인유두종바이러스(HPV)", en: "HPV (human papillomavirus)", ru: "ВПЧ (вирус папилломы человека)" },
  { src: ["зона трансформации"], ko: "이행대(변환대)", en: "transformation zone", ru: "зона трансформации" },
  { src: ["ключевые клетки"], ko: "단서세포(clue cell)", en: "clue cells", ru: "ключевые клетки" },
  { src: ["соскоб"], ko: "긁어채취(스크랩·소파)", en: "scraping (scrape sample)", ru: "соскоб" },
  { src: ["мазок"], ko: "도말(smear)", en: "smear", ru: "мазок" },
  { src: ["СОЭ"], ko: "적혈구침강속도(ESR)", en: "ESR (erythrocyte sedimentation rate)", ru: "СОЭ (скорость оседания эритроцитов)" },
  { src: ["Дыхательный уреазный тест", "уреазный тест"], ko: "요소호기검사(UBT, 헬리코박터)", en: "urea breath test (UBT)", ru: "дыхательный уреазный тест" },
  { src: ["цилиндры"], ko: "원주(요원주, cast)", en: "casts (urinary casts)", ru: "цилиндры", note: "요침사의 cast — 'cylinders' 직역 금지" },
  { src: ["эпителий плоский"], ko: "편평상피세포", en: "squamous epithelium", ru: "эпителий плоский" },
  { src: ["эпителий переходный"], ko: "이행상피세포", en: "transitional epithelium", ru: "эпителий переходный" },
  { src: ["лейкоциты"], ko: "백혈구", en: "leukocytes (WBC)", ru: "лейкоциты" },
  { src: ["эритроциты"], ko: "적혈구", en: "erythrocytes (RBC)", ru: "эритроциты" },
  { src: ["не обнаружено", "не обнаружены"], ko: "검출 안 됨", en: "not detected", ru: "не обнаружено" },
  { src: ["отрицательно"], ko: "음성", en: "negative", ru: "отрицательно" },
  { src: ["положительно"], ko: "양성", en: "positive", ru: "положительно" },
  { src: ["в пределах нормы"], ko: "정상 범위 내", en: "within normal limits", ru: "в пределах нормы" },
  { src: ["заключение"], ko: "결론(판독소견)", en: "conclusion (impression)", ru: "заключение" },
  { src: ["гистологическое заключение", "патологогистологическое заключение"], ko: "병리조직학적 진단", en: "histopathological diagnosis", ru: "патологогистологическое заключение" },

  // ── 종양·비뇨기·영상 (2026-08-04~05 추가) ──────────────────────────────────
  // 왜: 씨앗 27개가 «전부 부인과»였다(자궁경부·도말·HPV…). 정작 우리 환자는 암환자인데
  //   종양·비뇨기·영상 용어가 0개라, 같은 단어가 문서마다·쪽마다 다르게 나왔다
  //   (PO 지적 «번역 품질이 왜케 들쑥날쑥해?»). 실측: 문의 #60 진료기록 20쪽에 옛 오역 13건.
  //   사전은 모든 쪽·모든 문서에 똑같이 주입되므로 «같은 말이 같게» 나오는 유일한 장치다.
  { src: ["анэхогенный", "анэхогенное", "анэхогеное"], ko: "무에코(초음파에서 검게 비침 — 대개 물이 찬 것)", en: "anechoic", ru: "анэхогенный", note: "🛑 「무음영」 금지 — 음영(그림자)과 에코(반사)는 다른 말이다" },
  { src: ["гипоэхогенный"], ko: "저에코", en: "hypoechoic", ru: "гипоэхогенный" },
  { src: ["гиперэхогенный"], ko: "고에코", en: "hyperechoic", ru: "гиперэхогенный" },
  { src: ["изоэхогенный"], ko: "등에코", en: "isoechoic", ru: "изоэхогенный" },
  { src: ["акустическая тень"], ko: "음향 음영", en: "acoustic shadow", ru: "акустическая тень" },
  { src: ["солевая инкрустация", "солевой инкрустацией"], ko: "염류 침착(소금기가 굳어 붙음)", en: "salt incrustation", ru: "солевая инкрустация", note: "🛑 「착색」 금지 — 색이 물드는 게 아니라 굳어 붙는 것" },
  { src: ["кальцинат", "кальцификация"], ko: "석회화", en: "calcification", ru: "кальцинат" },
  { src: ["конкремент", "камень"], ko: "결석(돌)", en: "calculus (stone)", ru: "конкремент" },
  { src: ["ЧЛС", "чашечно-лоханочная система"], ko: "신배-신우계(콩팥 안에서 소변이 모이는 공간)", en: "pelvicalyceal system", ru: "чашечно-лоханочная система" },
  { src: ["каликоэктазия"], ko: "신배 확장", en: "caliectasis", ru: "каликоэктазия" },
  { src: ["лоханка"], ko: "신우", en: "renal pelvis", ru: "лоханка" },
  { src: ["паренхима"], ko: "실질(장기 고유 조직)", en: "parenchyma", ru: "паренхима" },
  { src: ["гидронефроз", "гидронефротическая трансформация"], ko: "수신증(콩팥에 소변이 고여 부은 상태)", en: "hydronephrosis", ru: "гидронефроз" },
  { src: ["уретерогидронефроз"], ko: "요관수신증(요관까지 늘어난 수신증)", en: "ureterohydronephrosis", ru: "уретерогидронефроз", note: "🛑 「수뇨관신배확장증」 같은 지어낸 말 금지" },
  { src: ["стентирование мочеточника"], ko: "요관 스텐트 삽입술", en: "ureteral stenting", ru: "стентирование мочеточника" },
  { src: ["нефрэктомия"], ko: "신장 절제술", en: "nephrectomy", ru: "нефрэктомия" },
  { src: ["аорта", "брюшной отдел аорты"], ko: "대동맥(복부 대동맥)", en: "aorta (abdominal aorta)", ru: "аорта", note: "🛑 「아오르타」 금지 — 소리 옮기기" },
  { src: ["парааортальные лимфоузлы"], ko: "대동맥주위 림프절", en: "para-aortic lymph nodes", ru: "парааортальные лимфоузлы" },
  { src: ["средостение", "внутригрудные лимфоузлы"], ko: "종격동(양쪽 폐 사이 가운데 공간 — 심장·큰 혈관·기도가 있는 곳)", en: "mediastinum / intrathoracic lymph nodes", ru: "средостение", note: "🛑 「세종격동」은 없는 말이다" },
  { src: ["хорда", "ложная хорда", "дополнительная хорда"], ko: "덧줄(심장 안 가느다란 힘줄 — 대개 정상 변이)", en: "false chord (left ventricular band)", ru: "ложная хорда", note: "🛑 「삭대」·「가삭」 금지" },
  { src: ["Mts", "метастаз", "метастатическое поражение"], ko: "전이", en: "metastasis", ru: "метастаз" },
  { src: ["очаговое образование", "образование"], ko: "병변(덩이)", en: "lesion (mass)", ru: "образование", note: "맥락에 따라 종괴/병변 — 「형성물」 같은 직역 금지" },
  { src: ["инфильтрация"], ko: "침윤(주변으로 번짐)", en: "infiltration", ru: "инфильтрация" },
  { src: ["асцит"], ko: "복수(배 안에 물이 참)", en: "ascites", ru: "асцит" },
  { src: ["выпот", "плевральный выпот"], ko: "삼출액(물이 참) / 흉수(가슴막에 물이 참)", en: "effusion / pleural effusion", ru: "выпот", note: "부위를 원문대로 — 골반이면 골반, 가슴이면 가슴" },
  { src: ["низкодифференцированная карцинома"], ko: "저분화 암종", en: "poorly differentiated carcinoma", ru: "низкодифференцированная карцинома" },
  { src: ["клиническая группа"], ko: "임상군(CIS 종양등록 분류)", en: "clinical group (CIS oncology registry)", ru: "клиническая группа", note: "한국엔 없는 분류 — 병기(stage)와 혼동 금지" },
  { src: ["Противопоказаний нет", "противопоказаний к авиаперелетам нет"], ko: "금기 없음(항공 여행 금기 없음)", en: "no contraindications (fit to fly)", ru: "противопоказаний нет", note: "🛑 부정어 «нет»가 문장 «맨 뒤»에 온다 — 앞의 「금기」만 읽고 뒤집지 마라" },
];

/**
 * 프롬프트에 넣을 용어사전 블록을 대상 언어로 렌더.
 * @param lang 대상 언어
 * @param extra learned 용어(DB) — 병합. seed 뒤에 붙어 우선 노출.
 */
export function glossaryBlock(lang: DocLang, extra: GlossaryEntry[] = []): string {
  const all = [...SEED_GLOSSARY, ...extra];
  if (!all.length) return "";
  const lines = all.map((e) => {
    const target = e[lang];
    if (!target) return null;
    const from = e.src.join(" / ");
    return `- ${from} → ${target}${e.note ? `  [${e.note}]` : ""}`;
  }).filter(Boolean);
  return lines.join("\n");
}
