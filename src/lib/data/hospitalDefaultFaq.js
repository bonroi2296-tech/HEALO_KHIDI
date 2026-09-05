// 병원 상세 화면의 «기본» 질문-답변 — DB(hospitals.faq)에 값이 없을 때 화면에 뜨는 것.
// 서버(구조화 표식)와 화면이 «같은 소스»를 쓰게 하려고 여기로 뺐다.
// 예전엔 화면 컴포넌트 안에만 있어서, 서버가 표식을 만들려면 같은 내용을 또 적어야 했고
// 한쪽만 고쳐지면 화면과 표식이 어긋난다(구글은 그러면 리치결과를 안 준다).

export const HOSPITAL_DEFAULT_FAQ = {
  ko: [
    { question: "견적은 어떻게 받나요?", answer: "문의를 남겨주시면 항목별 견적을 비교할 수 있도록 도와드립니다." },
    { question: "통역 서비스를 제공하나요?", answer: "병원과 일정에 따라 컨시어지 지원이 제공될 수 있습니다." },
    { question: "제 정보는 안전한가요?", answer: "매칭과 조율을 위해 동의하신 경우에만 정보를 공유합니다." },
  ],
  en: [
    { question: "How do I get an estimate?", answer: "Submit an inquiry and we will help you compare itemized quotes." },
    { question: "Do you provide interpretation?", answer: "Concierge support may be available depending on the clinic and schedule." },
    { question: "Is my information safe?", answer: "We only share information with your consent for matching and coordination." },
  ],
  ru: [
    { question: "Как получить смету?", answer: "Оставьте заявку, и мы поможем сравнить детализированные расчёты стоимости." },
    { question: "Предоставляете ли вы перевод?", answer: "Сопровождение консьержа может быть доступно в зависимости от клиники и расписания." },
    { question: "Безопасны ли мои данные?", answer: "Мы передаём данные только с вашего согласия для подбора и координации." },
  ],
  kz: [
    { question: "Бағаны қалай алуға болады?", answer: "Сұрау қалдырсаңыз, біз нақтыланған бағаларды салыстыруға көмектесеміз." },
    { question: "Аударма қызметін ұсынасыз ба?", answer: "Клиника мен кестеге байланысты консьерж қолдауы қолжетімді болуы мүмкін." },
    { question: "Менің ақпаратым қауіпсіз бе?", answer: "Біз ақпаратты тек сіздің келісіміңізбен сәйкестендіру мен үйлестіру үшін бөлісеміз." },
  ],
  zh: [
    { question: "如何获取报价？", answer: "提交咨询后，我们将帮助您比较分项报价。" },
    { question: "提供翻译服务吗？", answer: "视医院和日程安排，可能提供管家式陪同服务。" },
    { question: "我的信息安全吗？", answer: "我们仅在您同意的情况下，为匹配和协调共享信息。" },
  ],
  ja: [
    { question: "見積もりはどうやって取得できますか？", answer: "お問い合わせいただくと、項目別の見積もりを比較できるようサポートします。" },
    { question: "通訳は提供されますか？", answer: "病院やスケジュールに応じて、コンシェルジュのサポートをご利用いただける場合があります。" },
    { question: "私の情報は安全ですか？", answer: "マッチングと調整のため、ご同意いただいた場合に限り情報を共有します。" },
  ],
};

/** DB 값이 있으면 그걸, 없으면 기본값을 그 언어로 돌려준다. 화면·서버가 같이 쓴다. */
export function resolveHospitalFaq(dbFaq, langCode) {
  if (Array.isArray(dbFaq) && dbFaq.length > 0) return dbFaq;
  return HOSPITAL_DEFAULT_FAQ[langCode] || HOSPITAL_DEFAULT_FAQ.en;
}
