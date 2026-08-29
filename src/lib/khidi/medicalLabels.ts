/**
 * 백오피스 포털용 의료 도메인 enum → 다국어 라벨.
 * 활성 6개 언어(ko·en·ru·kz·zh·ja). 외국인 코디/에이전시가 각 언어로 본다.
 *
 * 왜 여기 모으나: 암종·연락방법 같은 짧은 enum 라벨이 코디 여러 페이지(인박스·케이스·견적 등)에
 * 흩어져 하드코딩(한국어)돼 있었다 → 파일마다 복붙 대신 이 공용 헬퍼 하나로.
 * (케이스 진행단계 라벨은 caseStatus.ts, 국적은 nationality.ts 에 각각 있음)
 */

/** 암종(inquiries.cancer_type) — 6개 언어 */
export const CANCER_TYPE_LABELS: Record<string, Record<string, string>> = {
  stomach:     { ko: "위암", en: "Stomach cancer", ru: "Рак желудка", kz: "Асқазан обыры", zh: "胃癌", ja: "胃がん" },
  liver:       { ko: "간암", en: "Liver cancer", ru: "Рак печени", kz: "Бауыр обыры", zh: "肝癌", ja: "肝がん" },
  lung:        { ko: "폐암", en: "Lung cancer", ru: "Рак лёгких", kz: "Өкпе обыры", zh: "肺癌", ja: "肺がん" },
  breast:      { ko: "유방암", en: "Breast cancer", ru: "Рак молочной железы", kz: "Сүт безі обыры", zh: "乳腺癌", ja: "乳がん" },
  thyroid:     { ko: "갑상선암", en: "Thyroid cancer", ru: "Рак щитовидной железы", kz: "Қалқанша без обыры", zh: "甲状腺癌", ja: "甲状腺がん" },
  colorectal:  { ko: "대장암", en: "Colorectal cancer", ru: "Колоректальный рак", kz: "Ішек обыры", zh: "结直肠癌", ja: "大腸がん" },
  pancreatic:  { ko: "췌장암", en: "Pancreatic cancer", ru: "Рак поджелудочной железы", kz: "Ұйқы безі обыры", zh: "胰腺癌", ja: "膵臓がん" },
  gynecologic: { ko: "부인암", en: "Gynecologic cancer", ru: "Гинекологический рак", kz: "Гинекологиялық обыр", zh: "妇科癌", ja: "婦人科がん" },
  cervical:    { ko: "자궁경부암", en: "Cervical cancer", ru: "Рак шейки матки", kz: "Жатыр мойны обыры", zh: "宫颈癌", ja: "子宮頸がん" },
  // 신장암은 실제 문의(#60 소견 요청 포함)가 들어와 있는데 목록에 없어서 화면에 "kidney" 가
  // 영어 날것으로 떴다(2026-08-26 발견).
  kidney:      { ko: "신장암", en: "Kidney cancer", ru: "Рак почки", kz: "Бүйрек обыры", zh: "肾癌", ja: "腎がん" },
  other:       { ko: "기타", en: "Other", ru: "Другое", kz: "Басқа", zh: "其他", ja: "その他" },
};

/** 암종 코드 → 언어별 라벨. 미등록 값(자유입력 등)은 원문 유지. */
export function cancerTypeLabelL(key: string | null | undefined, lang = "en"): string {
  if (!key) return "";
  const row = CANCER_TYPE_LABELS[key];
  if (row) return row[lang] || row.en || row.ko || key;
  return key;
}

/**
 * 암종 → ICD-10 상위 코드(3자리). 의뢰서 icdCode 칸의 «추천값»으로만 쓴다.
 *
 * ⚠️ 이건 «부위 분류»이지 환자의 «확정 진단코드»가 아니다. 세부 자리(C18.2 처럼 점 뒤)와
 * 조직형·병기는 진료한 의사만 정한다. 그래서 자동으로 채우지 않고 사람이 누를 때만 들어간다.
 *
 * 왜 ICD-11 이 아니라 ICD-10 인가: 한국 병원 실무(KCD)도, 카자흐·러시아 진단서(МКБ-10)도
 * ICD-10 이다. 양쪽이 같은 코드를 쓰므로 현지 진단서의 코드가 그대로 통한다.
 * ICD-11 은 아직 진료 현장에서 안 쓰인다.
 *
 * 출처: WHO ICD-10 2019 판을 API 로 직접 조회해 코드·명칭을 하나씩 대조함(2026-08-25).
 * 값을 고칠 일이 있으면 외우지 말고 https://id.who.int/icd/release/10/2019/<코드> 로 확인할 것.
 */
export const CANCER_TYPE_ICD10: Record<string, { code: string; en: string; note?: string }> = {
  stomach:     { code: "C16", en: "Malignant neoplasm of stomach" },
  liver:       { code: "C22", en: "Malignant neoplasm of liver and intrahepatic bile ducts" },
  lung:        { code: "C34", en: "Malignant neoplasm of bronchus and lung" },
  breast:      { code: "C50", en: "Malignant neoplasm of breast" },
  thyroid:     { code: "C73", en: "Malignant neoplasm of thyroid gland" },
  // 대장암은 결장(C18)과 직장(C20)이 갈린다. 결장을 대표로 두되 직장이면 사람이 C20 으로 고친다.
  colorectal:  { code: "C18", en: "Malignant neoplasm of colon", note: "rectum: C20" },
  pancreatic:  { code: "C25", en: "Malignant neoplasm of pancreas" },
  cervical:    { code: "C53", en: "Malignant neoplasm of cervix uteri" },
  // 부인암은 범위가 넓다(C51~C58). 난소를 대표로 두고 나머지는 사람이 고른다.
  gynecologic: { code: "C56", en: "Malignant neoplasm of ovary", note: "C51-C58" },
  kidney:      { code: "C64", en: "Malignant neoplasm of kidney, except renal pelvis", note: "renal pelvis: C65" },
  // other 는 일부러 비워 둔다 — 「기타」에 코드를 붙이면 틀린 코드를 권하게 된다.
};

/**
 * 자유 입력으로 들어온 암종을 우리 키로 되돌린다. 「위암」·「Рак желудка」 → `stomach`.
 *
 * 왜: 에이전시 의뢰 통로가 자유 입력값을 그대로 `cancer_type` 에 넣고 있었다(2026-08-26 발견).
 * 키가 아닌 값이 박히면 6개 언어 라벨이 안 붙고(러시아 코디 화면에 한국어가 샌다),
 * 진단코드 추천도 병원 매칭도 그 케이스만 조용히 건너뛴다.
 *
 * ⚠️ **정확히 일치하는 라벨만** 되돌린다. 「위암 의심」·「stomach ca」 같은 건 추측하지 않고 null 이다.
 * 짐작해서 채우면 틀린 암종이 케이스에 박히고, 그건 빈 칸보다 나쁘다.
 */
const LABEL_TO_KEY: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const [key, row] of Object.entries(CANCER_TYPE_LABELS)) {
    m[key.toLowerCase()] = key;
    for (const label of Object.values(row)) m[label.trim().toLowerCase()] = key;
  }
  return m;
})();

export function normalizeCancerType(value: string | null | undefined): string | null {
  if (!value) return null;
  return LABEL_TO_KEY[value.trim().toLowerCase()] || null;
}

/**
 * ICD-10 코드 형식: 알파벳 1(U 제외) + 숫자 2 + (선택) 점과 세부 자리. 예: C16 · C18.2 · C50.911
 * 저장 통로(coordinator/inquiries/[id]/icd-code)가 이걸로 거른다.
 */
export const ICD10_PATTERN = /^[A-TV-Z][0-9]{2}(\.[0-9A-Z]{1,4})?$/;

/** 암종 → 추천 ICD-10 코드. 추천할 게 없으면 null(「기타」·미등록 값). */
export function icd10SuggestionFor(
  cancerType: string | null | undefined
): { code: string; en: string; note?: string } | null {
  if (!cancerType) return null;
  return CANCER_TYPE_ICD10[cancerType] || null;
}

/** 연락 방법(contact_method) — 채널명은 고유명사(WhatsApp 등)라 email만 번역, 나머지는 그대로. */
const EMAIL_LABEL: Record<string, string> = { ko: "이메일", en: "Email", ru: "Эл. почта", kz: "Эл. пошта", zh: "电子邮件", ja: "メール" };
const PHONE_LABEL: Record<string, string> = { ko: "전화", en: "Phone", ru: "Телефон", kz: "Телефон", zh: "电话", ja: "電話" };

export function contactMethodLabelL(method: string | null | undefined, lang = "en"): string {
  if (!method) return "";
  const m = method.toLowerCase();
  if (m === "email") return EMAIL_LABEL[lang] || EMAIL_LABEL.en;
  if (m === "phone") return PHONE_LABEL[lang] || PHONE_LABEL.en;
  // whatsapp / telegram / wechat / line 등은 고유명사 — 그대로 노출
  return method;
}
