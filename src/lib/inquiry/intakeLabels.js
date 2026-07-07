/**
 * healwith: 인테이크(문의 Step2) 선택지 라벨 — 단일 SoR(Source of Record).
 *
 * 폼(app/inquiry/_components/UnifiedInquiryFunnel.jsx)과
 * 코디 문의상세(app/coordinator/inbox/[id]/CoordinatorInboxDetailClient.jsx)가 함께 쓴다.
 * value/구조는 폼과 1:1 (DB에 저장되는 코드값과 동일) — 바꾸면 저장값이 깨지니 주의.
 * 라벨은 활성 6개국어(ko·en·ru·kz·zh·ja).
 *
 * 왜 분리했나: 코디 화면이 raw 코드(pre_surgery·2weeks)를 그대로 노출하던 문제 →
 * 폼이 이미 가진 6개국어 라벨을 재사용해 한글로 보여주기 위함.
 */
import { Activity, Heart, Stethoscope, Wind, Zap, Microscope, HelpCircle } from "lucide-react";

export const CANCER_TYPES = [
  { value: "stomach", label: { ko: "위암", en: "Stomach", ru: "Желудок", kz: "Асқазан", zh: "胃癌", ja: "胃がん" }, icon: Activity },
  { value: "liver", label: { ko: "간암", en: "Liver", ru: "Печень", kz: "Бауыр", zh: "肝癌", ja: "肝がん" }, icon: Zap },
  { value: "lung", label: { ko: "폐암", en: "Lung", ru: "Лёгкое", kz: "Өкпе", zh: "肺癌", ja: "肺がん" }, icon: Wind },
  { value: "breast", label: { ko: "유방암", en: "Breast", ru: "Грудь", kz: "Сүт без", zh: "乳腺癌", ja: "乳がん" }, icon: Heart },
  { value: "thyroid", label: { ko: "갑상선암", en: "Thyroid", ru: "Щитовидка", kz: "Қалқанша", zh: "甲状腺癌", ja: "甲状腺がん" }, icon: Stethoscope },
  { value: "colorectal", label: { ko: "대장암", en: "Colorectal", ru: "Толстая кишка", kz: "Тоқ ішек", zh: "结肠癌", ja: "大腸がん" }, icon: Activity },
  { value: "pancreatic", label: { ko: "췌장암", en: "Pancreatic", ru: "Поджелудочная", kz: "Ұйқы без", zh: "胰腺癌", ja: "膵がん" }, icon: Microscope },
  { value: "other", label: { ko: "기타", en: "Other", ru: "Другое", kz: "Басқа", zh: "其他", ja: "その他" }, icon: HelpCircle },
];

export const STAGES = ["I", "II", "III", "IV"];

export const TREATMENT_STATES = [
  { value: "pre_surgery", label: { ko: "수술 전", en: "Pre-surgery", ru: "До операции", kz: "Операцияға дейін", zh: "术前", ja: "術前" } },
  { value: "post_surgery", label: { ko: "수술 후", en: "Post-surgery", ru: "После операции", kz: "Операциядан кейін", zh: "术后", ja: "術後" } },
  { value: "chemotherapy", label: { ko: "항암 중", en: "Chemotherapy", ru: "Химиотерапия", kz: "Химиотерапия", zh: "化疗中", ja: "化学療法中" } },
  { value: "follow_up", label: { ko: "추적 관찰", en: "Follow-up", ru: "Наблюдение", kz: "Бақылау", zh: "随访", ja: "経過観察" } },
  { value: "other", label: { ko: "기타", en: "Other", ru: "Другое", kz: "Басқа", zh: "其他", ja: "その他" } },
];

export const TRAVEL_TIMING = [
  { value: "2weeks", label: { ko: "2주 내", en: "Within 2 weeks", ru: "В течение 2 нед.", kz: "2 апта ішінде", zh: "2周内", ja: "2週間以内" } },
  { value: "1month", label: { ko: "1개월", en: "~1 month", ru: "~1 месяц", kz: "~1 ай", zh: "约1个月", ja: "約1ヶ月" } },
  { value: "3months", label: { ko: "3개월", en: "~3 months", ru: "~3 месяца", kz: "~3 ай", zh: "约3个月", ja: "約3ヶ月" } },
  { value: "undecided", label: { ko: "미정", en: "Undecided", ru: "Не решено", kz: "Белгісіз", zh: "未定", ja: "未定" } },
];

export const PRIORITIES = [
  { value: "price", label: { ko: "가격", en: "Price", ru: "Цена", kz: "Баға", zh: "价格", ja: "価格" } },
  { value: "duration", label: { ko: "기간", en: "Duration", ru: "Сроки", kz: "Мерзім", zh: "疗程", ja: "期間" } },
  { value: "doctor", label: { ko: "의료진", en: "Doctor", ru: "Врачи", kz: "Дәрігерлер", zh: "医生", ja: "医師" } },
  { value: "accessibility", label: { ko: "접근성", en: "Accessibility", ru: "Доступность", kz: "Қолжетімділік", zh: "便利性", ja: "アクセス" } },
];

// 동의 항목 — intake.consents 의 boolean 키 → 라벨(6개국어). key 는 폼 Step2 동의키와 1:1.
// sensitive_health·third_party_hospital·pipa_collection·cross_border_kr 은 필수, marketing 은 선택.
export const CONSENT_ITEMS = [
  { key: "pipa_collection", label: { ko: "개인정보 수집·이용", en: "Personal data collection", ru: "Сбор персональных данных", kz: "Дербес деректерді жинау", zh: "个人信息收集", ja: "個人情報の収集" } },
  { key: "sensitive_health", label: { ko: "민감정보(건강) 처리", en: "Sensitive health data", ru: "Медицинские данные", kz: "Денсаулық деректері", zh: "敏感健康信息", ja: "健康(要配慮)情報" } },
  { key: "cross_border_kr", label: { ko: "국경 간 이전(한국)", en: "Cross-border transfer (Korea)", ru: "Трансграничная передача (Корея)", kz: "Шекарааралық беру (Корея)", zh: "跨境传输(韩国)", ja: "越境移転(韓国)" } },
  { key: "third_party_hospital", label: { ko: "제3자(병원) 제공", en: "Sharing with hospitals", ru: "Передача больницам", kz: "Ауруханаларға беру", zh: "向医院提供", ja: "第三者(病院)提供" } },
  { key: "marketing", label: { ko: "마케팅 수신(선택)", en: "Marketing (optional)", ru: "Маркетинг (по желанию)", kz: "Маркетинг (қалау бойынша)", zh: "营销信息(可选)", ja: "マーケティング(任意)" } },
];

// 코디 상세화면 전용 UI 라벨(필드명·동의·요약·배지) — 6개국어. 대형 공용사전(coordinator.js)을
// 건드리지 않고 인테이크 표시 라벨을 여기 co-locate 한다(격리·저위험). 현재 언어로 pick() 해서 쓴다.
export const INTAKE_UI = {
  stage: { ko: "병기", en: "Stage", ru: "Стадия", kz: "Кезең", zh: "分期", ja: "病期" },
  diagnosisDate: { ko: "진단일", en: "Diagnosis date", ru: "Дата диагноза", kz: "Диагноз күні", zh: "诊断日期", ja: "診断日" },
  priorities: { ko: "우선순위", en: "Priorities", ru: "Приоритеты", kz: "Басымдықтар", zh: "优先事项", ja: "優先事項" },
  consentsTitle: { ko: "동의 항목", en: "Consents", ru: "Согласия", kz: "Келісімдер", zh: "同意项", ja: "同意項目" },
  consentAt: { ko: "동의 시각(KST)", en: "Consented at (KST)", ru: "Время согласия (KST)", kz: "Келісім уақыты (KST)", zh: "同意时间(KST)", ja: "同意日時(KST)" },
  consentVersion: { ko: "동의서 버전", en: "Consent version", ru: "Версия согласия", kz: "Келісім нұсқасы", zh: "同意书版本", ja: "同意書バージョン" },
  agreed: { ko: "동의", en: "Agreed", ru: "Согласен", kz: "Келісті", zh: "已同意", ja: "同意" },
  declined: { ko: "미동의", en: "Declined", ru: "Не согласен", kz: "Келіспеді", zh: "未同意", ja: "未同意" },
  summaryTitle: { ko: "한눈 요약", en: "At a glance", ru: "Кратко", kz: "Қысқаша", zh: "一览", ja: "概要" },
  submitterMember: { ko: "회원 접수", en: "Member submission", ru: "Заявка от аккаунта", kz: "Тіркелген есептен", zh: "会员提交", ja: "会員受付" },
  submitterGuest: { ko: "비회원(게스트)", en: "Guest (no account)", ru: "Гость (без аккаунта)", kz: "Қонақ (тіркелмеген)", zh: "访客(无账号)", ja: "ゲスト(非会員)" },
  submitterTest: { ko: "테스트 계정", en: "Test account", ru: "Тестовый аккаунт", kz: "Тест есебі", zh: "测试账号", ja: "テスト用アカウント" },
  attachments: { ko: "첨부", en: "Attachments", ru: "Вложения", kz: "Тіркемелер", zh: "附件", ja: "添付" },
  attachmentsYes: { ko: "있음", en: "Yes", ru: "Есть", kz: "Бар", zh: "有", ja: "あり" },
  attachmentsNo: { ko: "없음", en: "None", ru: "Нет", kz: "Жоқ", zh: "无", ja: "なし" },
  // 미입력 선택값 — 숨기지 말고 '입력하지 않음'으로 표기(관리 가시성).
  notEntered: { ko: "입력하지 않음", en: "Not entered", ru: "Не указано", kz: "Көрсетілмеген", zh: "未填写", ja: "未入力" },
  // 케이스 브리프(AI 초안) 카드
  briefTitle: { ko: "케이스 브리프", en: "Case brief", ru: "Бриф по случаю", kz: "Кейс брифі", zh: "病例简报", ja: "ケース概要" },
  briefAiDraft: { ko: "AI 초안", en: "AI draft", ru: "Черновик ИИ", kz: "AI жобасы", zh: "AI草稿", ja: "AI下書き" },
  briefHint: { ko: "접수 내용·문서를 AI가 정리해 빠른 판단을 돕습니다.", en: "AI organizes the intake and documents to speed up your judgment.", ru: "ИИ обобщает заявку и документы для быстрой оценки.", kz: "AI өтінім мен құжаттарды жылдам бағалауға жинақтайды.", zh: "AI 整理接诊内容与文档，助您快速判断。", ja: "AIが受付内容と書類を整理し判断を助けます。" },
  briefGenerate: { ko: "브리프 생성", en: "Generate brief", ru: "Создать бриф", kz: "Бриф жасау", zh: "生成简报", ja: "概要を生成" },
  briefRegenerate: { ko: "다시 생성", en: "Regenerate", ru: "Пересоздать", kz: "Қайта жасау", zh: "重新生成", ja: "再生成" },
  briefGenerating: { ko: "생성 중…", en: "Generating…", ru: "Создание…", kz: "Жасалуда…", zh: "生成中…", ja: "生成中…" },
  briefRequest: { ko: "원하는 것", en: "Wants", ru: "Запрос", kz: "Сұраныс", zh: "需求", ja: "希望" },
  briefPoints: { ko: "코디가 볼 포인트", en: "Points for coordinator", ru: "На что обратить внимание", kz: "Назар аударатын тұстар", zh: "协调员关注点", ja: "確認ポイント" },
  briefFlags: { ko: "주의", en: "Flags", ru: "Внимание", kz: "Ескерту", zh: "注意", ja: "注意" },
  briefDisclaimer: { ko: "AI가 정리한 초안입니다. 진단이 아니며 코디·의료진 검수가 필요합니다.", en: "AI-generated draft — not a diagnosis; coordinator/doctor review required.", ru: "Черновик ИИ — не диагноз; требуется проверка координатора/врача.", kz: "AI жобасы — диагноз емес; тексеру қажет.", zh: "AI草稿——非诊断，需协调员/医生审核。", ja: "AIによる下書きです。診断ではなく確認が必要です。" },
  briefFailed: { ko: "브리프 생성에 실패했어요. 잠시 후 다시 시도해 주세요.", en: "Failed to generate the brief. Please try again.", ru: "Не удалось создать бриф. Повторите попытку.", kz: "Бриф жасалмады. Қайталап көріңіз.", zh: "简报生成失败，请稍后重试。", ja: "概要の生成に失敗しました。再度お試しください。" },
};

/** 다국어 라벨 객체({ko,en,...})에서 현재 언어 값을 뽑는다. 없으면 en → ko 폴백. */
export function pick(obj, lang = "ko") {
  if (!obj) return "";
  return obj[lang] || obj.en || obj.ko || "";
}

/** value → 지정 언어 라벨. 목록에 없으면 원래 값을 그대로 돌려준다(안전 폴백). */
export function labelOf(list, value, lang = "ko") {
  if (value == null || value === "") return null;
  const item = (list || []).find((x) => x.value === value);
  if (!item || !item.label) return String(value);
  return item.label[lang] || item.label.ko || String(value);
}
