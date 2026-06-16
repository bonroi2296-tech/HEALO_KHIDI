// 법률 문서(약관·개인정보) 비공식 번역 안내 배너 문구.
// ⚠️ 이건 UI 안내 문구일 뿐 법적 본문이 아님 → 번역해도 안전.
// ko/en 은 정식 번역이라 배너 미표시. ru/kz/zh/ja 만 한국어 폴백 + 아래 안내.
const NOTICE = {
  en: "Translation for this language is pending professional legal review. The Korean version below is the legally binding text.",
  ja: "この言語の翻訳は専門家による法務レビュー待ちです。下記の韓国語版が法的効力を持つ正式版です。",
  ru: "Перевод на этот язык ожидает профессиональной юридической проверки. Юридически обязательной является корейская версия ниже.",
  kz: "Бұл тілдегі аударма кәсіби заңгерлік тексеруден өтуде. Заңды күші бар мәтін — төмендегі корей тіліндегі нұсқа.",
  zh: "该语言的翻译正在等待专业法律审核。下方的韩语版本为具有法律约束力的正式文本。",
};

export function getTranslationPendingNotice(lang) {
  return NOTICE[lang] || NOTICE.en;
}
