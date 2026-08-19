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
  // 문의 폼 선택지에는 없지만 코디·에이전시가 직접 넣는 값. 사전에 없으면 코드가 화면에 그대로 노출된다
  // (2026-08-19 실측: 문의 #60 의 암종이 목록·환자 화면에 "kidney" 로 보였다).
  kidney:      { ko: "신장암", en: "Kidney cancer", ru: "Рак почки", kz: "Бүйрек обыры", zh: "肾癌", ja: "腎がん" },
  prostate:    { ko: "전립선암", en: "Prostate cancer", ru: "Рак простаты", kz: "Простата обыры", zh: "前列腺癌", ja: "前立腺がん" },
  bladder:     { ko: "방광암", en: "Bladder cancer", ru: "Рак мочевого пузыря", kz: "Қуық обыры", zh: "膀胱癌", ja: "膀胱がん" },
  esophageal:  { ko: "식도암", en: "Esophageal cancer", ru: "Рак пищевода", kz: "Өңеш обыры", zh: "食道癌", ja: "食道がん" },
  other:       { ko: "기타", en: "Other", ru: "Другое", kz: "Басқа", zh: "其他", ja: "その他" },
};

/** 암종 코드 → 언어별 라벨. 미등록 값(자유입력 등)은 원문 유지. */
export function cancerTypeLabelL(key: string | null | undefined, lang = "en"): string {
  if (!key) return "";
  const row = CANCER_TYPE_LABELS[key];
  if (row) return row[lang] || row.en || row.ko || key;
  return key;
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
