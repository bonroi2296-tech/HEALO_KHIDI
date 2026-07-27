/**
 * healwith: 인테이크(문의 Step2) 선택지 라벨 — 단일 SoR(Source of Record).
 *
 * 폼(app/inquiry/_components/UnifiedInquiryFunnel.jsx)과
 * 코디 문의상세(app/coordinator/inbox/[id]/CoordinatorInboxDetailClient.jsx)가 함께 쓴다.
 * value/구조는 폼과 1:1 (DB에 저장되는 코드값과 동일) — 바꾸면 저장값이 깨지니 주의.
 *
 * 2026-07-27: 선택지 라벨을 중앙 사전(intakeLabels.*)으로 이관 — 코디 콘텐츠 편집기에서
 * 검색·수정 가능하게(PO 요청, PO가 「Грудь」 등 폼 버튼이 편집기에 안 잡힘을 지적).
 * value·organ 코드는 그대로(저장값 불변), 표시 라벨만 labelKey → t()로 해석.
 * 읽을 때는 optLabel(item, lang) 또는 labelOf(list, value, lang) 사용(둘 다 t()로 해석).
 * INTAKE_UI·CONSENT_ITEMS 는 코디 화면 전용 UI라 아직 객체(pick) 유지 — 후속 이관 대상.
 */
import { t } from "@/lib/i18n";

// organ = app/_components/OrganIcon.jsx 의 장기 아이콘 키(없으면 소비처가 물음표 등 대체 표시).
export const CANCER_TYPES = [
  { value: "stomach", labelKey: "intakeLabels.cancer.stomach", organ: "stomach" },
  { value: "liver", labelKey: "intakeLabels.cancer.liver", organ: "liver" },
  { value: "lung", labelKey: "intakeLabels.cancer.lung", organ: "lung" },
  { value: "breast", labelKey: "intakeLabels.cancer.breast", organ: "breast" },
  { value: "thyroid", labelKey: "intakeLabels.cancer.thyroid", organ: "thyroid" },
  { value: "colorectal", labelKey: "intakeLabels.cancer.colorectal", organ: "colon" },
  { value: "pancreatic", labelKey: "intakeLabels.cancer.pancreatic", organ: "pancreas" },
  { value: "other", labelKey: "intakeLabels.cancer.other", organ: null },
];

export const STAGES = ["I", "II", "III", "IV"];

export const TREATMENT_STATES = [
  { value: "pre_surgery", labelKey: "intakeLabels.treatState.pre_surgery" },
  { value: "post_surgery", labelKey: "intakeLabels.treatState.post_surgery" },
  { value: "chemotherapy", labelKey: "intakeLabels.treatState.chemotherapy" },
  { value: "follow_up", labelKey: "intakeLabels.treatState.follow_up" },
  { value: "other", labelKey: "intakeLabels.treatState.other" },
];

export const TRAVEL_TIMING = [
  { value: "2weeks", labelKey: "intakeLabels.travel.2weeks" },
  { value: "1month", labelKey: "intakeLabels.travel.1month" },
  { value: "3months", labelKey: "intakeLabels.travel.3months" },
  { value: "undecided", labelKey: "intakeLabels.travel.undecided" },
];

// 우선순위(복수 선택) — 2026-07-07 명확화: 옛 '기간(duration)'이 모호(빨리 오고 싶다/짧게 끝내고 싶다)
// → '빠른 치료 시작(fast_start)'과 '짧은 체류 기간(short_stay)'으로 분리. 모호한 '접근성'→'소통·통역'.
export const PRIORITIES = [
  { value: "cost", labelKey: "intakeLabels.priority.cost" },
  { value: "fast_start", labelKey: "intakeLabels.priority.fast_start" },
  { value: "short_stay", labelKey: "intakeLabels.priority.short_stay" },
  { value: "expertise", labelKey: "intakeLabels.priority.expertise" },
  { value: "communication", labelKey: "intakeLabels.priority.communication" },
];

// 구 우선순위 값(2026-07-07 이전 접수) — 표시 하위호환용. 새 폼은 위 PRIORITIES 사용.
export const PRIORITIES_LEGACY = [
  { value: "price", labelKey: "intakeLabels.priorityLegacy.price" },
  { value: "duration", labelKey: "intakeLabels.priorityLegacy.duration" },
  { value: "doctor", labelKey: "intakeLabels.priorityLegacy.doctor" },
  { value: "accessibility", labelKey: "intakeLabels.priorityLegacy.accessibility" },
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

/** 다국어 라벨 객체({ko,en,...})에서 현재 언어 값을 뽑는다. 없으면 en → ko 폴백.
 *  (INTAKE_UI·CONSENT_ITEMS 처럼 아직 객체인 것 전용 — 옵션 배열은 optLabel 사용) */
export function pick(obj, lang = "ko") {
  if (!obj) return "";
  return obj[lang] || obj.en || obj.ko || "";
}

/** 옵션 항목({ value, labelKey }) → 지정 언어 라벨. 사전(t)에서 해석. */
export function optLabel(item, lang = "ko") {
  if (!item || !item.labelKey) return "";
  return t(item.labelKey, lang);
}

/** value → 지정 언어 라벨. 목록에 없으면 원래 값을 그대로 돌려준다(안전 폴백). */
export function labelOf(list, value, lang = "ko") {
  if (value == null || value === "") return null;
  const item = (list || []).find((x) => x.value === value);
  if (!item || !item.labelKey) return String(value);
  return t(item.labelKey, lang) || String(value);
}
