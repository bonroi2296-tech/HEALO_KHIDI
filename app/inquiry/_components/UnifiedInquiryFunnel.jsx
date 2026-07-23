"use client";

/**
 * UnifiedInquiryFunnel — 4개 폼 통폐합 단일 funnel
 * Phase: step1 → step1-success → step2 → step2-success → done
 *
 * Step 1 (1분, 6필드): 성함·국적·연락수단·선호언어·암종·메모
 * Step 2 (3분, 6필드): 병기·진단일·치료상태·의료문서·입국시기·우선순위
 */

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check, ChevronRight, ChevronLeft, UploadCloud, X, File,
  AlertCircle, Loader2, Shield, Clock,
  Bot, MessageCircle, ClipboardList, Headset, BadgeCheck
} from "lucide-react";
// 인테이크 선택지 라벨(6개국어)·값은 코디 상세화면과 공용 — 단일 SoR.
import { CANCER_TYPES, STAGES, TREATMENT_STATES, TRAVEL_TIMING, PRIORITIES } from "@/lib/inquiry/intakeLabels";
import { useLang } from "@/lib/i18n/LangContext";
import { event } from "@/lib/ga";
import { SITE_INFO } from "@/lib/siteSettings";
import { ThreadChat } from "../ThreadChat";

// ─── 상수 ───────────────────────────────────────────────────────────
const NATIONALITIES = [
  { value: "KZ", label: "Kazakhstan / Казахстан" },
  { value: "RU", label: "Russia / Россия" },
  { value: "UZ", label: "Uzbekistan / Ўзбекистон" },
  { value: "KG", label: "Kyrgyzstan / Кыргызстан" },
  { value: "MN", label: "Mongolia / Монгол" },
  { value: "CN", label: "China / 中国" },
  { value: "JP", label: "Japan / 日本" },
  { value: "KR", label: "Korea / 한국" },
  { value: "OTHER", label: "Other / 기타" },
];

// 국가번호 — 국적≠거주국이라 자동 매핑 안 함. 본인이 선택. 목록에 없으면 'OTHER'로 직접 입력.
// 라벨은 국가명 먼저(브라우저 타이핑 자동완성용). 타겟·CIS 우선, 그 외 거주 많은 나라.
const DIAL_CODES = [
  // CIS · 중앙아시아 (타겟)
  { code: "+7", label: "Kazakhstan +7" },
  { code: "+7", label: "Russia +7" },
  { code: "+998", label: "Uzbekistan +998" },
  { code: "+996", label: "Kyrgyzstan +996" },
  { code: "+992", label: "Tajikistan +992" },
  { code: "+993", label: "Turkmenistan +993" },
  { code: "+994", label: "Azerbaijan +994" },
  { code: "+374", label: "Armenia +374" },
  { code: "+995", label: "Georgia +995" },
  { code: "+380", label: "Ukraine +380" },
  { code: "+375", label: "Belarus +375" },
  { code: "+976", label: "Mongolia +976" },
  // 동아시아
  { code: "+82", label: "Korea +82" },
  { code: "+86", label: "China +86" },
  { code: "+81", label: "Japan +81" },
  { code: "+84", label: "Vietnam +84" },
  { code: "+66", label: "Thailand +66" },
  // 중동·서아시아 (거주 많음)
  { code: "+90", label: "Turkey +90" },
  { code: "+971", label: "UAE +971" },
  { code: "+966", label: "Saudi Arabia +966" },
  { code: "+98", label: "Iran +98" },
  { code: "+91", label: "India +91" },
  // 유럽·북미 (거주 많음)
  { code: "+49", label: "Germany +49" },
  { code: "+44", label: "United Kingdom +44" },
  { code: "+33", label: "France +33" },
  { code: "+39", label: "Italy +39" },
  { code: "+34", label: "Spain +34" },
  { code: "+48", label: "Poland +48" },
  { code: "+1", label: "USA / Canada +1" },
  // 그 외 — 번호에 +국가코드 직접 입력. 이 목록의 label 은 전 언어 공통(영문 국가명 관례)이라
  // 한국어를 쓰면 ru/kz 사용자 화면에 한국어가 새어 나감 — 영문 통일.
  { code: "OTHER", label: "Other (type +code before number)" },
];

// 순서 = 핵심 타겟 시장 우선(러시아·카자흐 먼저, 한국어 마지막).
const PREFERRED_LANGUAGES = [
  { value: "ru", label: "Русский" },
  { value: "kz", label: "Қазақша" },
  { value: "en", label: "English" },
  { value: "ja", label: "日本語" },
  { value: "zh", label: "中文" },
  { value: "ko", label: "한국어" },
];

// CANCER_TYPES·STAGES·TREATMENT_STATES·TRAVEL_TIMING·PRIORITIES → @/lib/inquiry/intakeLabels 로 이동(코디 상세화면과 공용).

const CANCER_TYPE_COLORS = {
  stomach: "text-orange-600 bg-orange-50 border-orange-200",
  liver: "text-amber-600 bg-amber-50 border-amber-200",
  lung: "text-sky-600 bg-sky-50 border-sky-200",
  breast: "text-pink-600 bg-pink-50 border-pink-200",
  thyroid: "text-purple-600 bg-purple-50 border-purple-200",
  colorectal: "text-green-600 bg-green-50 border-green-200",
  pancreatic: "text-red-600 bg-red-50 border-red-200",
  other: "text-gray-600 bg-gray-50 border-gray-200",
};

const LANG_NAMES = {
  ko: "한국어", en: "English", ru: "Русский", kz: "Қазақша", zh: "中文", ja: "日本語",
};

// ─── i18n 문자열 (6개 언어) ────────────────────────────────────────
const T = {
  // ─ 채널 선택 진입 ─
  chooseTitle: {
    ko: "어떻게 도와드릴까요?",
    en: "How can we help?",
    ru: "Чем мы можем помочь?",
    kz: "Қалай көмектесе аламыз?",
    zh: "我们如何为您提供帮助？",
    ja: "どのようにお手伝いしましょうか？",
  },
  chooseSubtitle: {
    ko: "원하시는 방식을 선택해주세요.",
    en: "Choose your preferred way to start.",
    ru: "Выберите удобный способ.",
    kz: "Қолайлы тәсілді таңдаңыз.",
    zh: "请选择您喜欢的方式。",
    ja: "ご希望の方法をお選びください。",
  },
  aiAgent: {
    ko: "AI Agent", en: "AI Agent", ru: "AI Agent", kz: "AI Agent", zh: "AI Agent", ja: "AI Agent",
  },
  aiAgentDesc: {
    ko: "지금 바로 한국어·러시아어로 질문하세요. 24시간 즉시 응답.",
    en: "Ask anything now in your language. Instant 24/7 answers.",
    ru: "Задайте вопрос на русском прямо сейчас. Ответ 24/7.",
    kz: "Қазір сұрақ қойыңыз. 24/7 жауап.",
    zh: "立即用您的语言提问。24/7即时回答。",
    ja: "あなたの言語で今すぐ質問。24時間即時応答。",
  },
  humanAgent: {
    ko: "Human Agent", en: "Human Agent", ru: "Human Agent", kz: "Human Agent", zh: "Human Agent", ja: "Human Agent",
  },
  humanAgentDesc: {
    // 실제 켜진 메신저만 아래 버튼으로 노출 — 특정 채널명 하드코딩 금지(env 없는 채널을 광고하던 문제 수정).
    ko: "선호하는 메신저로 담당자와 직접 연결.",
    en: "Connect directly with our team via your preferred messenger.",
    ru: "Свяжитесь с нашей командой через удобный мессенджер.",
    kz: "Қалаған мессенджер арқылы маманмен тікелей байланысыңыз.",
    zh: "通过您常用的即时通讯工具直接联系我们的团队。",
    ja: "ご希望のメッセンジャーで担当者と直接つながれます。",
  },
  inquiryForm: {
    ko: "Inquiry Form", en: "Inquiry Form", ru: "Inquiry Form", kz: "Inquiry Form", zh: "Inquiry Form", ja: "Inquiry Form",
  },
  inquiryFormDesc: {
    ko: "1분 입력 → 코디네이터가 선호 언어로 회신.",
    en: "1-minute form. We reply in your language.",
    ru: "Заполните за 1 минуту. Ответим на вашем языке.",
    kz: "1 минут — біз сіздің тіліңізде жауап береміз.",
    zh: "1分钟表单。我们用您的语言回复。",
    ja: "1分で完了。ご希望の言語で返信します。",
  },
  humanChannelsTitle: {
    ko: "어느 채널이 편하세요?",
    en: "Which channel do you prefer?",
    ru: "Какой канал удобнее?",
    kz: "Қай арна ыңғайлы?",
    zh: "您更喜欢哪个渠道？",
    ja: "どのチャンネルがよろしいですか？",
  },
  humanChannelsSubtitle: {
    ko: "코디네이터가 24시간 이내에 응답합니다.",
    en: "A coordinator will respond within 24 hours.",
    ru: "Координатор ответит в течение 24 часов.",
    kz: "Координатор 24 сағат ішінде жауап береді.",
    zh: "协调员将在24小时内回复。",
    ja: "コーディネーターが24時間以内に対応します。",
  },
  channelComingSoon: {
    ko: "준비 중", en: "Coming Soon", ru: "Скоро", kz: "Жақында", zh: "即将开通", ja: "準備中",
  },
  back: {
    ko: "뒤로", en: "Back", ru: "Назад", kz: "Артқа", zh: "返回", ja: "戻る",
  },
  step1Title: {
    ko: "상담 신청",
    en: "Start Your Consultation",
    ru: "Начать консультацию",
    kz: "Кеңес алуды бастаңыз",
    zh: "开始咨询",
    ja: "相談を始める",
  },
  step1Subtitle: {
    ko: "1분이면 충분합니다. 코디네이터가 선호하신 언어로 연락드립니다.",
    en: "Takes 1 minute. Our coordinator will reach out in your preferred language.",
    ru: "Займёт 1 минуту. Координатор свяжется на вашем языке.",
    kz: "1 минут жетеді. Координатор сіздің тіліңізде хабарласады.",
    zh: "只需1分钟。协调员将以您偏好的语言联系您。",
    ja: "1分で完了。コーディネーターが希望の言語でご連絡します。",
  },
  nameLabel: {
    ko: "성함", en: "Full Name", ru: "Имя", kz: "Аты-жөні", zh: "姓名", ja: "お名前",
  },
  namePlaceholder: {
    ko: "홍길동", en: "John Doe", ru: "Иван Иванов", kz: "Аты-жөні", zh: "姓名", ja: "山田太郎",
  },
  nationalityLabel: {
    ko: "국적", en: "Nationality", ru: "Гражданство", kz: "Азаматтық", zh: "国籍", ja: "国籍",
  },
  dialPlaceholder: {
    ko: "국가번호 선택", en: "Country code", ru: "Код страны", kz: "Ел коды", zh: "国家区号", ja: "国番号",
  },
  dialRequired: {
    ko: "국가번호를 선택해주세요.", en: "Please select a country code.", ru: "Выберите код страны.", kz: "Ел кодын таңдаңыз.", zh: "请选择国家区号。", ja: "国番号を選択してください。",
  },
  selectNationality: {
    ko: "국적 선택", en: "Select nationality", ru: "Выберите гражданство", kz: "Азаматтықты таңдаңыз", zh: "选择国籍", ja: "国籍を選択",
  },
  contactLabel: {
    ko: "연락 수단", en: "Contact Method", ru: "Способ связи", kz: "Байланыс тәсілі", zh: "联系方式", ja: "連絡方法",
  },
  contactEmail: {
    ko: "이메일", en: "Email", ru: "Эл. почта", kz: "Электрондық пошта", zh: "邮箱", ja: "メール",
  },
  contactPhone: {
    ko: "전화번호", en: "Phone", ru: "Телефон", kz: "Телефон", zh: "电话", ja: "電話",
  },
  optionalTag: {
    ko: "(선택)", en: "(optional)", ru: "(необязательно)", kz: "(міндетті емес)", zh: "(选填)", ja: "(任意)",
  },
  trustEncryption: {
    ko: "AES-256 암호화", en: "AES-256 encrypted", ru: "Шифрование AES-256", kz: "AES-256 шифрлау", zh: "AES-256 加密", ja: "AES-256 暗号化",
  },
  trustResponse: {
    ko: "영업일 1일 이내 응답", en: "Reply within 1 business day", ru: "Ответ в течение 1 рабочего дня", kz: "1 жұмыс күні ішінде жауап", zh: "1个工作日内回复", ja: "1営業日以内に返信",
  },
  // ZIVO 벤치마크(2026-07-07): 외국인 의료관광 1순위 불신 = 바가지 공포 → 직접결제·병원가 그대로를 행동 지점에 명시.
  // 수수료 모델(2026-07-23 PO 확정): 환자는 healwith 에 비용 0 — 제휴 병원이 유치 수수료를 지급한다.
  //    FAQ(faqData.js)도 그렇게 고지하도록 정정됨. 따라서 "환자에게 수수료 없음"은 이제 사실이다.
  //    (트러스트 문구 톤을 "healwith 무료"로 강화할지는 PO 리드 — 여기선 근거만 갱신, 라벨은 유지.)
  trustDirectPay: {
    ko: "치료비는 병원에 직접 결제 · 병원 수가 그대로", en: "Treatment paid directly to the hospital · No markup", ru: "Оплата лечения напрямую клинике · Без наценки", kz: "Ем ақысы тікелей ауруханаға төленеді · Үстеме жоқ", zh: "治疗费直接支付给医院 · 不加价", ja: "治療費は病院へ直接支払い · 上乗せなし",
  },
  trustFree: {
    ko: "상담 무료 · 부담 없이", en: "Free consultation · No obligation", ru: "Бесплатная консультация · Без обязательств", kz: "Тегін кеңес · Еркін шешім", zh: "免费咨询 · 无需承诺", ja: "相談無料 · 強制なし",
  },

  // ─── 개인정보 동의 (PIPA — 출시 법적 필수) ───
  consentHeading: {
    ko: "개인정보 수집·이용 동의", en: "Consent to collection & use of personal data", ru: "Согласие на сбор и использование персональных данных", kz: "Жеке деректерді жинауға және пайдалануға келісім", zh: "个人信息收集与使用同意", ja: "個人情報の収集・利用への同意",
  },
  consentPipa: {
    ko: "[필수] 개인정보(이름·연락처·국적) 수집·이용", en: "[Required] Collection & use of personal data (name, contact, nationality)", ru: "[Обязательно] Сбор и использование персональных данных (имя, контакт, гражданство)", kz: "[Міндетті] Жеке деректерді (аты, байланыс, азаматтық) жинау және пайдалану", zh: "[必填] 收集和使用个人信息（姓名、联系方式、国籍）", ja: "[必須] 個人情報（氏名・連絡先・国籍）の収集・利用",
  },
  consentSensitive: {
    ko: "[필수] 민감정보(진단·치료 등 건강정보) 수집·이용", en: "[Required] Collection & use of sensitive health data (diagnosis, treatment)", ru: "[Обязательно] Сбор и использование данных о здоровье (диагноз, лечение)", kz: "[Міндетті] Денсаулық деректерін (диагноз, емдеу) жинау және пайдалану", zh: "[必填] 收集和使用敏感健康信息（诊断、治疗）", ja: "[必須] 健康に関する機微情報（診断・治療）の収集・利用",
  },
  consentThirdParty: {
    ko: "[필수] 한국 협력 의료기관에 정보 제공", en: "[Required] Provision of data to Korean partner hospitals", ru: "[Обязательно] Передача данных корейским больницам-партнёрам", kz: "[Міндетті] Деректерді Корея серіктес ауруханаларына беру", zh: "[必填] 向韩国合作医院提供信息", ja: "[必須] 韓国の提携医療機関への情報提供",
  },
  consentCrossBorder: {
    ko: "[필수] 개인정보 국외(대한민국) 이전", en: "[Required] Cross-border transfer of data to Korea", ru: "[Обязательно] Трансграничная передача данных в Корею", kz: "[Міндетті] Деректерді шетелге (Кореяға) беру", zh: "[必填] 个人信息跨境转移至韩国", ja: "[必須] 個人情報の国外（韓国）移転",
  },
  consentMarketing: {
    ko: "[선택] 마케팅·뉴스레터 수신", en: "[Optional] Receive marketing & newsletters", ru: "[Необязательно] Получать маркетинг и рассылки", kz: "[Қосымша] Маркетинг пен жаңалықтарды алу", zh: "[可选] 接收营销与新闻通讯", ja: "[任意] マーケティング・ニュースレターの受信",
  },
  consentDetails: {
    ko: "자세히", en: "Details", ru: "Подробнее", kz: "Толығырақ", zh: "详情", ja: "詳細",
  },
  consentRequired: {
    ko: "필수 동의 항목에 모두 동의해 주세요.", en: "Please agree to all required consent items.", ru: "Пожалуйста, согласитесь со всеми обязательными пунктами.", kz: "Барлық міндетті келісім тармақтарына келісіңіз.", zh: "请同意所有必填同意项。", ja: "必須の同意項目すべてに同意してください。",
  },
  consentDisclaimer: {
    ko: "healwith는 의료기관 매칭·코디네이션을 제공하며, 의료행위·진단·치료 결과를 보장하지 않습니다.", en: "healwith provides hospital matching and coordination only — it does not give medical advice or guarantee treatment outcomes.", ru: "healwith предоставляет только подбор больниц и координацию — не даёт медицинских советов и не гарантирует результаты лечения.", kz: "healwith тек ауруханаларды таңдау мен үйлестіруді ұсынады — медициналық кеңес бермейді және емдеу нәтижесіне кепілдік бермейді.", zh: "healwith 仅提供医院匹配与协调服务，不提供医疗建议，也不保证治疗结果。", ja: "healwith は医療機関のマッチングとコーディネートのみを提供し、医療行為や診断・治療結果を保証しません。",
  },
  certKhidi: {
    ko: "KHIDI 정부지원 선정", en: "KHIDI government-supported", ru: "При поддержке KHIDI (госпрограмма)", kz: "KHIDI мемлекеттік қолдауымен", zh: "KHIDI 政府支持项目", ja: "KHIDI 政府支援プロジェクト",
  },
  certForeignPatient: {
    ko: "외국인환자 유치기관 등록", en: "Registered foreign-patient provider", ru: "Зарег. оператор по приёму иностранных пациентов", kz: "Шетелдік науқастарды қабылдау бойынша тіркелген", zh: "外国患者诱致机构注册", ja: "外国人患者受入登録機関",
  },
  humanFallbackText: {
    ko: "원하시는 메신저가 아직 없으신가요? 1분 상담 신청서로 바로 시작하세요.",
    en: "Don't see your messenger yet? Start now with our 1-minute form.",
    ru: "Нет нужного мессенджера? Начните с анкеты — это займёт 1 минуту.",
    kz: "Қалаған мессенджер жоқ па? 1 минуттық сауалнамадан бастаңыз.",
    zh: "没有您想要的通讯软件？用1分钟表单立即开始。",
    ja: "ご希望のメッセンジャーがまだありませんか？1分のフォームで今すぐ開始。",
  },
  humanFallbackCta: {
    ko: "상담 신청서 (1분)", en: "Inquiry form (1 min)", ru: "Анкета (1 мин)", kz: "Сауалнама (1 мин)", zh: "咨询表单（1分钟）", ja: "相談フォーム（1分）",
  },
  dialAria: {
    ko: "국가번호", en: "Country calling code", ru: "Телефонный код страны", kz: "Ел телефон коды", zh: "国家区号", ja: "国番号",
  },
  genericError: {
    ko: "오류가 발생했습니다. 잠시 후 다시 시도해주세요.", en: "Something went wrong. Please try again.", ru: "Произошла ошибка. Попробуйте ещё раз.", kz: "Қате орын алды. Қайталап көріңіз.", zh: "发生错误，请重试。", ja: "エラーが発生しました。もう一度お試しください。",
  },
  emailPlaceholder: {
    ko: "example@email.com", en: "example@email.com", ru: "example@email.com", kz: "example@email.com", zh: "example@email.com", ja: "example@email.com",
  },
  phonePlaceholder: {
    ko: "+7 701 234 5678", en: "+7 701 234 5678", ru: "+7 701 234 5678", kz: "+7 701 234 5678", zh: "+86 ...", ja: "+81 ...",
  },
  langLabel: {
    ko: "선호 언어", en: "Preferred Language", ru: "Предпочтительный язык", kz: "Қалаулы тіл", zh: "偏好语言", ja: "希望言語",
  },
  selectLang: {
    ko: "언어 선택", en: "Select language", ru: "Выберите язык", kz: "Тілді таңдаңыз", zh: "选择语言", ja: "言語を選択",
  },
  cancerTypeLabel: {
    ko: "어떤 암인가요?", en: "Cancer Type", ru: "Тип рака", kz: "Қатерлі ісік түрі", zh: "癌症类型", ja: "がんの種類",
  },
  memoLabel: {
    ko: "한 줄 메모 (선택, 200자)", en: "Brief note (optional, 200 chars)", ru: "Краткая заметка (необязательно)", kz: "Қысқа ескертпе (міндетті емес)", zh: "简短备注（可选）", ja: "簡単なメモ（任意）",
  },
  memoPlaceholder: {
    ko: "자유롭게 적어주세요 (진단명, 병원명, 궁금한 점 등)", en: "Diagnosis, hospital, questions...", ru: "Диагноз, больница, вопросы...", kz: "Диагноз, аурухана, сұрақтар...", zh: "诊断、医院、问题...", ja: "診断名、病院、質問など...",
  },
  submitStep1: {
    ko: "상담 신청하기", en: "Request Consultation", ru: "Запросить консультацию", kz: "Кеңес сұрату", zh: "申请咨询", ja: "相談を申し込む",
  },
  submitting: {
    ko: "처리 중...", en: "Submitting...", ru: "Отправка...", kz: "Жіберілуде...", zh: "提交中...", ja: "送信中...",
  },
  successTitle: {
    ko: "상담 신청 완료", en: "Consultation Requested", ru: "Консультация запрошена", kz: "Кеңес сұратылды", zh: "咨询申请成功", ja: "相談申し込み完了",
  },
  successBody: {
    ko: "코디네이터가 영업일 1일 이내에 {lang}로 연락드립니다.",
    en: "Our coordinator will contact you in {lang} within 1 business day.",
    ru: "Координатор свяжется с вами на {lang} в течение 1 рабочего дня.",
    kz: "Координатор {lang} тілінде 1 жұмыс күні ішінде хабарласады.",
    zh: "协调员将在1个工作日内以{lang}与您联系。",
    ja: "コーディネーターが1営業日以内に{lang}でご連絡します。",
  },
  upgradeTitle: {
    ko: "더 빠르고 정확한 안내를 받고 싶으세요?",
    en: "Want faster, more precise guidance?",
    ru: "Хотите более быстрое и точное сопровождение?",
    kz: "Жылдамырақ әрі дәлірек көмек алғыңыз келе ме?",
    zh: "想要更快、更精准的协助吗？",
    ja: "より早く、より的確なご案内をご希望ですか？",
  },
  upgradeBody: {
    ko: "몇 가지만 더 알려주시면 코디네이터가 더 빠르고 정확하게 맞는 병원을 안내해드려요.",
    en: "A few more details help our coordinator guide you to the right hospital faster and more precisely.",
    ru: "Несколько дополнительных деталей помогут координатору быстрее и точнее подобрать подходящую клинику.",
    kz: "Бірнеше қосымша мәлімет координаторға сізге қолайлы ауруханаға жылдамырақ әрі дәлірек бағыттауға көмектеседі.",
    zh: "再补充几项信息，协调员就能更快、更精准地为您推荐合适的医院。",
    ja: "いくつか追加でお知らせいただくと、コーディネーターがより早く、より的確に合った病院をご案内できます。",
  },
  yesUpgrade: {
    ko: "네, 알려드릴게요", en: "Yes, tell you more", ru: "Да, расскажу", kz: "Иә, айтамын", zh: "是的，告诉你更多", ja: "はい、詳しく教えます",
  },
  noUpgrade: {
    ko: "나중에 할게요", en: "Maybe later", ru: "Потом", kz: "Кейінірек", zh: "以后再说", ja: "後で",
  },
  doneTitle: {
    ko: "감사합니다!", en: "Thank you!", ru: "Спасибо!", kz: "Рахмет!", zh: "谢谢！", ja: "ありがとうございます！",
  },
  backHome: {
    ko: "홈으로", en: "Back to Home", ru: "На главную", kz: "Басты бетке", zh: "返回首页", ja: "ホームへ戻る",
  },
  doneBody: {
    ko: "신청이 접수되었습니다. 코디네이터가 곧 연락드립니다.",
    en: "Your request has been received. A coordinator will be in touch soon.",
    ru: "Ваш запрос получен. Координатор скоро свяжется.",
    kz: "Сіздің сұрауыңыз қабылданды. Координатор жақында хабарласады.",
    zh: "您的申请已收到。协调员将很快与您联系。",
    ja: "お申し込みを受け付けました。コーディネーターよりご連絡いたします。",
  },
  step2Title: {
    ko: "더 자세한 정보",
    en: "More Details",
    ru: "Подробнее",
    kz: "Толық мәліметтер",
    zh: "更多详情",
    ja: "詳細情報",
  },
  stageLabel: {
    ko: "병기", en: "Stage", ru: "Стадия", kz: "Кезең", zh: "分期", ja: "ステージ",
  },
  stageUnknown: {
    ko: "모름", en: "Unknown", ru: "Не знаю", kz: "Білмеймін", zh: "不知道", ja: "不明",
  },
  diagnosisDateLabel: {
    ko: "진단 받은 날짜", en: "Diagnosis Date", ru: "Дата диагноза", kz: "Диагноз күні", zh: "诊断日期", ja: "診断日",
  },
  diagnosisUnknown: {
    ko: "모름", en: "I don't know", ru: "Не знаю", kz: "Білмеймін", zh: "不知道", ja: "不明",
  },
  treatmentStateLabel: {
    ko: "현재 치료 상태", en: "Current Treatment Status", ru: "Текущий статус лечения", kz: "Ағымдағы емдеу жағдайы", zh: "当前治疗状态", ja: "現在の治療状況",
  },
  uploadLabel: {
    ko: "의료문서 업로드 (선택, PDF/JPG/PNG, 최대 10MB·5개)",
    en: "Medical Documents (optional, PDF/JPG/PNG, max 10MB·5 files)",
    ru: "Медицинские документы (необязательно, PDF/JPG/PNG, макс. 10МБ·5 файлов)",
    kz: "Медициналық құжаттар (міндетті емес, PDF/JPG/PNG, макс. 10МБ·5 файл)",
    zh: "医疗文件（可选，PDF/JPG/PNG，最多10MB·5个）",
    ja: "医療文書（任意、PDF/JPG/PNG、最大10MB・5ファイル）",
  },
  uploadDrop: {
    ko: "파일을 여기에 드래그하거나 클릭하여 업로드",
    en: "Drag files here or click to upload",
    ru: "Перетащите файлы или нажмите для загрузки",
    kz: "Файлдарды сүйреп апарыңыз немесе жүктеу үшін басыңыз",
    zh: "拖动文件到此处或点击上传",
    ja: "ファイルをここにドラッグまたはクリックしてアップロード",
  },
  uploadHint: {
    ko: "PDF / JPG / PNG · 최대 10MB · 5개",
    en: "PDF / JPG / PNG · max 10MB · 5 files",
    ru: "PDF / JPG / PNG · макс. 10МБ · 5 файлов",
    kz: "PDF / JPG / PNG · макс. 10МБ · 5 файл",
    zh: "PDF / JPG / PNG · 最多10MB · 5个",
    ja: "PDF / JPG / PNG · 最大10MB・5ファイル",
  },
  travelTimingLabel: {
    ko: "입국 희망 기간", en: "Preferred Travel Window", ru: "Желаемые сроки поездки", kz: "Саяхат мерзімі", zh: "希望入境时间", ja: "希望渡航時期",
  },
  prioritiesLabel: {
    ko: "우선순위 (복수 선택 가능)", en: "Priorities (select all that apply)", ru: "Приоритеты (можно несколько)", kz: "Басымдықтар (бірнеше таңдауға болады)", zh: "优先考虑（可多选）", ja: "優先事項（複数可）",
  },
  submitStep2: {
    ko: "매칭 시작", en: "Start Matching", ru: "Начать подбор", kz: "Сәйкестіруді бастау", zh: "开始匹配", ja: "マッチング開始",
  },
  step2SuccessTitle: {
    ko: "맞춤 안내 준비 완료",
    en: "Ready for Personalized Guidance",
    ru: "Готово к индивидуальному сопровождению",
    kz: "Жеке көмекке дайын",
    zh: "已准备好为您提供专属协助",
    ja: "おひとりに合わせたご案内の準備が整いました",
  },
  step2SuccessBody: {
    ko: "의료진이 미리 자료를 검토한 후 화상 사전상담을 안내드립니다.",
    en: "Our medical team will review your information and guide you to a pre-consultation video call.",
    ru: "Медицинская команда изучит ваши данные и назначит предварительную видеоконсультацию.",
    kz: "Медициналық топ сіздің деректерді қарап, бейнекеңесті жоспарлайды.",
    zh: "我们的医疗团队将审阅您的资料并安排视频预咨询。",
    ja: "医療チームが情報を確認し、事前ビデオ相談をご案内します。",
  },
  signupTitle: {
    ko: "진행 상황을 직접 확인하시려면?",
    en: "Want to track your progress?",
    ru: "Хотите отслеживать ход процесса?",
    kz: "Үдерісті қадағалағыңыз келе ме?",
    zh: "想跟踪进展吗？",
    ja: "進捗を確認したいですか？",
  },
  signupBenefits: {
    ko: "10초 만에 가입하시면: 매칭 결과 알림 · 화상상담 예약 · 의료문서 안전 보관 · 사후 관리 알림",
    en: "Sign up in 10 seconds: Match result alerts · Video consultation booking · Secure document storage · Follow-up reminders",
    ru: "Зарегистрируйтесь за 10 сек: Уведомления о подборе · Запись на видео-консультацию · Безопасное хранение документов · Напоминания",
    kz: "10 секундта тіркеліңіз: Сәйкестік нәтижелері · Бейнекеңес жазылу · Қауіпсіз сақтау · Еске салулар",
    zh: "10秒注册：匹配结果通知 · 视频咨询预约 · 文件安全保存 · 后续提醒",
    ja: "10秒で登録：マッチング結果通知 · ビデオ相談予約 · 文書の安全な保管 · フォローアップ",
  },
  signupGoogle: {
    ko: "Google로 가입", en: "Sign up with Google", ru: "Войти через Google", kz: "Google арқылы тіркелу", zh: "通过Google注册", ja: "Googleで登録",
  },
  signupEmail: {
    ko: "이메일로 가입", en: "Sign up with Email", ru: "Зарегистрироваться по Email", kz: "Email арқылы тіркелу", zh: "用邮箱注册", ja: "メールで登録",
  },
  noSignup: {
    ko: "나중에 할게요", en: "Maybe later", ru: "Потом", kz: "Кейінірек", zh: "以后再说", ja: "後で",
  },
  required: {
    ko: "필수 항목을 모두 입력해주세요.", en: "Please fill in all required fields.", ru: "Пожалуйста, заполните все обязательные поля.", kz: "Барлық міндетті өрістерді толтырыңыз.", zh: "请填写所有必填项。", ja: "必須項目をすべて入力してください。",
  },
  invalidEmail: {
    ko: "이메일 형식이 올바르지 않습니다.", en: "Invalid email format.", ru: "Неверный формат email.", kz: "Жарамсыз email форматы.", zh: "邮箱格式不正确。", ja: "メールアドレスの形式が正しくありません。",
  },
  uploadError: {
    ko: "파일 업로드 실패. 다시 시도해주세요.", en: "File upload failed. Please try again.", ru: "Ошибка загрузки файла.", kz: "Файл жүктеу сәтсіз.", zh: "文件上传失败，请重试。", ja: "ファイルのアップロードに失敗しました。",
  },
  tooManyFiles: {
    ko: "파일은 최대 5개까지 업로드 가능합니다.", en: "Maximum 5 files allowed.", ru: "Максимум 5 файлов.", kz: "Максимум 5 файл.", zh: "最多上传5个文件。", ja: "最大5ファイルまでアップロードできます。",
  },
  fileTooLarge: {
    ko: "파일 크기는 10MB 이하여야 합니다.", en: "File must be under 10MB.", ru: "Файл должен быть меньше 10МБ.", kz: "Файл 10МБ-тан аз болуы керек.", zh: "文件大小必须小于10MB。", ja: "ファイルは10MB未満にしてください。",
  },
};

function tl(key, lang) {
  const entry = T[key];
  if (!entry) return key;
  return entry[lang] || entry["en"] || key;
}

// ─── 컴포넌트 ───────────────────────────────────────────────────────
export default function UnifiedInquiryFunnel() {
  const lang = useLang() || "en";
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromChat = searchParams?.get("from_chat") || null;

  // from_chat 이 있으면 채널 선택 건너뛰고 바로 step1 (AI 챗에서 폼 전환된 케이스)
  const initialPhase = searchParams?.get("from_chat") ? "step1" : "channel-select";
  const [phase, setPhase] = useState(initialPhase); // channel-select | human-channels | step1 | step1-success | step2 | step2-success | done
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [inquiryId, setInquiryId] = useState(null);
  const [publicToken, setPublicToken] = useState(null); // step1 응답값 — step2 소유권 증명
  const [uploadedFiles, setUploadedFiles] = useState([]); // [{path, name, type}]

  // 개인정보 동의 (PIPA — 출시 법적 필수: 개인정보·민감정보·국외이전·제3자 제공). marketing 만 선택.
  const [consents, setConsents] = useState({
    pipa: false, sensitive: false, thirdParty: false, crossBorder: false, marketing: false,
  });
  const REQUIRED_CONSENTS = ["pipa", "sensitive", "thirdParty", "crossBorder"];
  const allRequiredConsented = REQUIRED_CONSENTS.every((k) => consents[k]);
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  // Step 1 폼
  const [form1, setForm1] = useState({
    name: "",
    nationality: "",
    email: "", // 필수 — 동일인 통합 기준
    phoneDial: "", // 전화 국가번호 (선택)
    phone: "", // 전화번호 (선택)
    preferredLanguage: lang,
    cancerType: "",
    shortMemo: "",
  });

  // Step 2 폼
  const [form2, setForm2] = useState({
    stage: "",
    stageUnknown: false,
    diagnosisDate: "",
    diagnosisUnknown: false,
    treatmentState: "",
    travelTiming: "",
    priorities: [],
  });

  // from_chat 자동채움 (게스트 PII 라 chat 쿠키의 public_token 동봉 — 없으면 자동채움 생략)
  useEffect(() => {
    if (!fromChat) return;
    const chatToken = (typeof document !== "undefined" &&
      document.cookie.match(/(?:^|;\s*)healo_chat_token=([^;]+)/)?.[1]) || null;
    if (!chatToken) return;
    fetch(`/api/chat/thread-summary?thread_id=${fromChat}&public_token=${encodeURIComponent(chatToken)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) return;
        setForm1((prev) => ({
          ...prev,
          name: data.guest_name || prev.name,
          email: data.guest_email || prev.email,
          phone: data.guest_phone || prev.phone,
          nationality: data.guest_country || prev.nationality,
        }));
      })
      .catch(() => {});
  }, [fromChat]);

  // GA 이벤트 — 폼 단계 진입 시에만 트리거
  useEffect(() => {
    if (phase === "step1") safeEvent("inquiry_step1_started");
    if (phase === "channel-select") safeEvent("inquiry_channel_view");
    if (phase === "human-channels") safeEvent("inquiry_human_channels_view");
  }, [phase]);

  function safeEvent(name, params) {
    try { event(name, params); } catch {}
  }

  // ─── Step 1 검증 ─────────────────────────────────────────────────
  // 전화 선택 시 국가번호도 골라야 함 (OTHER면 번호에 +코드 직접 입력)
  // 전화는 선택 — 입력했을 때만 국가번호도 필요 (OTHER면 번호에 +코드 직접 입력)
  const phoneNeedsDial = form1.phone.trim().length > 0 && form1.phoneDial === "";
  const step1Valid =
    form1.name.trim().length > 0 &&
    form1.nationality !== "" &&
    form1.email.trim().length > 0 &&
    !phoneNeedsDial &&
    form1.preferredLanguage !== "" &&
    form1.cancerType !== "" &&
    allRequiredConsented;

  function validateStep1() {
    if (!allRequiredConsented) {
      setError(tl("consentRequired", lang));
      return false;
    }
    if (!step1Valid) {
      setError(phoneNeedsDial ? tl("dialRequired", lang) : tl("required", lang));
      return false;
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(form1.email)) {
      setError(tl("invalidEmail", lang));
      return false;
    }
    setError("");
    return true;
  }

  // ─── Step 1 제출 ─────────────────────────────────────────────────
  async function handleStep1Submit() {
    if (!validateStep1()) return;
    setSubmitting(true);
    safeEvent("inquiry_step1_submitted");

    try {
      const nameParts = form1.name.trim().split(/\s+/);
      const firstName = nameParts[0] || form1.name.trim();
      const lastName = nameParts.slice(1).join(" ") || null;

      // 전화는 선택 — 입력했을 때만 국가번호 + 번호 합쳐서 저장. OTHER면 사용자가 +코드 직접 입력.
      const hasPhone = form1.phone.trim().length > 0;
      const fullPhone = hasPhone
        ? (form1.phoneDial === "OTHER" || !form1.phoneDial
            ? form1.phone.trim()
            : `${form1.phoneDial} ${form1.phone.trim()}`.trim())
        : null;

      const body = {
        firstName,
        lastName,
        email: form1.email.trim(),
        phone: fullPhone,
        nationality: form1.nationality,
        preferredLanguage: form1.preferredLanguage,
        cancerType: form1.cancerType,
        shortMemo: form1.shortMemo.trim() || null,
        aiChatThreadId: fromChat || null,
        // 기존 create API 호환 필드
        spokenLanguage: form1.preferredLanguage,
        contactMethod: hasPhone ? "Phone" : null,
        contactId: fullPhone,
        treatmentType: form1.cancerType,
        // PIPA 동의 기록 (출시 법적 필수). 서버가 intake.consents 에 보존.
        consents: {
          pipa_collection: consents.pipa,
          sensitive_health: consents.sensitive,
          third_party_hospital: consents.thirdParty,
          cross_border_kr: consents.crossBorder,
          marketing: consents.marketing,
        },
        consentVersion: "2.0.0",
      };

      // 로그인 상태면 토큰 동봉 → 서버가 본인 계정에 문의 귀속(마이페이지 '내 문의' 노출).
      const headers = { "Content-Type": "application/json" };
      try {
        const { createSupabaseBrowserClient } = await import("@/lib/supabase/browser");
        const { data: { session } } = await createSupabaseBrowserClient().auth.getSession();
        if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
      } catch { /* 게스트 제출 */ }

      const res = await fetch("/api/inquiries/step1", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (!result.ok) throw new Error(result.error || "submit_failed");

      setInquiryId(result.inquiryId);
      setPublicToken(result.publicToken || null);
      setPhase("step1-success");
    } catch (_e) {
      // 원시 에러메시지(영문 네트워크 오류 등)를 그대로 노출하지 않고 6개 언어 일반 메시지로.
      setError(tl("genericError", lang));
    } finally {
      setSubmitting(false);
    }
  }

  // ─── 파일 업로드 ─────────────────────────────────────────────────
  async function handleFileAdd(files) {
    const remaining = 5 - uploadedFiles.length;
    if (remaining <= 0) { setError(tl("tooManyFiles", lang)); return; }
    const toUpload = Array.from(files).slice(0, remaining);

    for (const file of toUpload) {
      if (file.size > 10 * 1024 * 1024) { setError(tl("fileTooLarge", lang)); continue; }
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/attachments/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!data.ok) { setError(tl("uploadError", lang)); continue; }
      setUploadedFiles((prev) => [...prev, { path: data.path, name: data.name, type: data.type }]);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    handleFileAdd(e.dataTransfer.files);
  }

  function handleDragOver(e) { e.preventDefault(); }

  // ─── Step 2 제출 ─────────────────────────────────────────────────
  async function handleStep2Submit() {
    setSubmitting(true);
    safeEvent("inquiry_step2_submitted");

    try {
      const body = {
        inquiryId,
        publicToken,
        stage: form2.stageUnknown ? null : form2.stage || null,
        diagnosisDate: form2.diagnosisUnknown ? null : form2.diagnosisDate || null,
        treatmentState: form2.treatmentState || null,
        travelTiming: form2.travelTiming || null,
        priorities: form2.priorities,
        attachments: uploadedFiles,
        matchAccuracy: uploadedFiles.length > 0 ? 95 : 90,
      };

      const res = await fetch("/api/inquiries/step2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (!result.ok) throw new Error(result.error || "step2_failed");

      setPhase("step2-success");
    } catch (_e) {
      // 원시 에러메시지(영문 네트워크 오류 등)를 그대로 노출하지 않고 6개 언어 일반 메시지로.
      setError(tl("genericError", lang));
    } finally {
      setSubmitting(false);
    }
  }

  // ─── 가입 처리 ───────────────────────────────────────────────────
  function handleSignupGoogle() {
    safeEvent("inquiry_signup_clicked", { method: "google" });
    router.push("/signup?provider=google&from=inquiry");
  }

  function handleSignupEmail() {
    safeEvent("inquiry_signup_clicked", { method: "email" });
    const email = form1.email || "";
    router.push(`/signup?from=inquiry${email ? `&email=${encodeURIComponent(email)}` : ""}`);
  }

  function handleDropoff(fromPhase) {
    safeEvent("inquiry_dropoff", { phase: fromPhase });
    setPhase("done");
  }

  // ─── 렌더 ────────────────────────────────────────────────────────

  // Phase: done
  if (phase === "done") {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center animate-in fade-in duration-300">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-teal-100 flex items-center justify-center">
          <Check size={32} className="text-teal-700" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">{tl("doneTitle", lang)}</h2>
        <p className="text-gray-500 text-sm leading-relaxed">{tl("doneBody", lang)}</p>
        <button
          onClick={() => router.push("/")}
          className="mt-8 px-6 py-3 bg-teal-700 text-white rounded-xl font-semibold hover:bg-teal-800 transition"
        >
          {tl("backHome", lang)}
        </button>
      </div>
    );
  }

  // Phase: step2-success
  if (phase === "step2-success") {
    return (
      <div className="max-w-md mx-auto px-4 py-12 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-teal-700 flex items-center justify-center shadow-lg shadow-teal-200">
            <Check size={32} className="text-white" strokeWidth={3} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{tl("step2SuccessTitle", lang)}</h2>
          <p className="text-gray-500 text-sm leading-relaxed">{tl("step2SuccessBody", lang)}</p>
        </div>

        <div className="border-t border-gray-100 my-6" />

        <div className="bg-teal-50 rounded-2xl p-5 border border-teal-100 mb-5">
          <p className="text-sm font-bold text-teal-800 mb-2">💡 {tl("signupTitle", lang)}</p>
          <p className="text-xs text-teal-700 leading-relaxed">{tl("signupBenefits", lang)}</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleSignupGoogle}
            className="w-full flex items-center justify-center gap-3 py-3.5 border-2 border-gray-200 rounded-xl hover:border-teal-400 hover:bg-teal-50 transition font-semibold text-sm"
          >
            <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/><path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/><path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/><path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.31z"/></svg>
            {tl("signupGoogle", lang)}
          </button>
          <button
            onClick={handleSignupEmail}
            className="w-full py-3.5 bg-teal-700 text-white rounded-xl font-semibold hover:bg-teal-800 transition text-sm"
          >
            {tl("signupEmail", lang)}
          </button>
          <button
            onClick={() => handleDropoff("step2-success")}
            className="w-full py-2 text-gray-400 text-sm hover:text-gray-600 transition"
          >
            {tl("noSignup", lang)}
          </button>
        </div>
      </div>
    );
  }

  // Phase: step1-success
  if (phase === "step1-success") {
    const langName = LANG_NAMES[form1.preferredLanguage] || form1.preferredLanguage;
    const successMsg = tl("successBody", lang).replace("{lang}", langName);

    return (
      <div className="max-w-md mx-auto px-4 py-12 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-teal-700 flex items-center justify-center shadow-lg shadow-teal-200">
            <Check size={32} className="text-white" strokeWidth={3} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{tl("successTitle", lang)}</h2>
          <p className="text-gray-500 text-sm leading-relaxed">{successMsg}</p>
        </div>

        <div className="border-t border-gray-100 my-6" />

        <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100 mb-5">
          <p className="text-sm font-bold text-blue-800 mb-1">💡 {tl("upgradeTitle", lang)}</p>
          <p className="text-xs text-blue-700 leading-relaxed">{tl("upgradeBody", lang)}</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => {
              safeEvent("inquiry_step2_started");
              setPhase("step2");
            }}
            className="w-full py-3.5 bg-teal-700 text-white rounded-xl font-bold hover:bg-teal-800 transition flex items-center justify-center gap-2"
          >
            {tl("yesUpgrade", lang)} <ChevronRight size={18} />
          </button>
          <button
            onClick={() => handleDropoff("step1-success")}
            className="w-full py-2 text-gray-400 text-sm hover:text-gray-600 transition"
          >
            {tl("noUpgrade", lang)}
          </button>
        </div>
      </div>
    );
  }

  // Phase: step2
  if (phase === "step2") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="text-center mb-8">
          <span className="inline-block bg-teal-50 text-teal-700 text-xs font-bold px-3 py-1 rounded-full border border-teal-200 mb-3">Step 2 / 2</span>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{tl("step2Title", lang)}</h2>
        </div>

        <div className="space-y-6">
          {/* 병기 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">{tl("stageLabel", lang)}</label>
            <div className="flex flex-wrap gap-2">
              {STAGES.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={form2.stageUnknown}
                  onClick={() => setForm2((p) => ({ ...p, stage: p.stage === s ? "" : s }))}
                  className={`px-5 py-2 rounded-xl border-2 font-semibold text-sm transition ${
                    form2.stage === s && !form2.stageUnknown
                      ? "border-teal-500 bg-teal-50 text-teal-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300 disabled:opacity-40"
                  }`}
                >
                  Stage {s}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setForm2((p) => ({ ...p, stageUnknown: !p.stageUnknown, stage: "" }))}
                className={`px-5 py-2 rounded-xl border-2 font-semibold text-sm transition ${
                  form2.stageUnknown
                    ? "border-teal-500 bg-teal-50 text-teal-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {tl("stageUnknown", lang)}
              </button>
            </div>
          </div>

          {/* 진단일 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">{tl("diagnosisDateLabel", lang)}</label>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={form2.diagnosisDate}
                disabled={form2.diagnosisUnknown}
                onChange={(e) => setForm2((p) => ({ ...p, diagnosisDate: e.target.value }))}
                className="flex-1 p-3 rounded-xl border border-gray-200 focus:border-teal-500 outline-none text-sm bg-white disabled:bg-gray-50 disabled:text-gray-400"
              />
              <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={form2.diagnosisUnknown}
                  onChange={(e) => setForm2((p) => ({ ...p, diagnosisUnknown: e.target.checked, diagnosisDate: "" }))}
                  className="accent-teal-600"
                />
                {tl("diagnosisUnknown", lang)}
              </label>
            </div>
          </div>

          {/* 치료 상태 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">{tl("treatmentStateLabel", lang)}</label>
            <div className="flex flex-wrap gap-2">
              {TREATMENT_STATES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setForm2((p) => ({ ...p, treatmentState: p.treatmentState === s.value ? "" : s.value }))}
                  className={`px-4 py-2 rounded-xl border-2 text-sm font-medium transition ${
                    form2.treatmentState === s.value
                      ? "border-teal-500 bg-teal-50 text-teal-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {s.label[lang] || s.label.en}
                </button>
              ))}
            </div>
          </div>

          {/* 의료문서 업로드 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">{tl("uploadLabel", lang)}</label>
            <div
              ref={dropZoneRef}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-5 text-center hover:bg-gray-50 transition cursor-pointer"
            >
              <UploadCloud size={24} className="mx-auto text-gray-400 mb-2" />
              <p className="text-xs text-gray-500">{tl("uploadDrop", lang)}</p>
              <p className="text-[11px] text-gray-400 mt-1">{tl("uploadHint", lang)}</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => handleFileAdd(e.target.files)}
            />
            {uploadedFiles.length > 0 && (
              <ul className="mt-3 space-y-2">
                {uploadedFiles.map((f, i) => (
                  <li key={i} className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <File size={14} className="text-teal-700 shrink-0" />
                      <span className="text-xs font-medium text-teal-800 truncate">{f.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUploadedFiles((prev) => prev.filter((_, j) => j !== i))}
                      className="p-1 hover:bg-teal-100 rounded-full text-teal-700"
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 입국 기간 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">{tl("travelTimingLabel", lang)}</label>
            <div className="grid grid-cols-2 gap-2">
              {TRAVEL_TIMING.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm2((p) => ({ ...p, travelTiming: p.travelTiming === t.value ? "" : t.value }))}
                  className={`py-3 rounded-xl border-2 text-sm font-medium transition ${
                    form2.travelTiming === t.value
                      ? "border-teal-500 bg-teal-50 text-teal-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {t.label[lang] || t.label.en}
                </button>
              ))}
            </div>
          </div>

          {/* 우선순위 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">{tl("prioritiesLabel", lang)}</label>
            <div className="flex flex-wrap gap-2">
              {PRIORITIES.map((p) => {
                const selected = form2.priorities.includes(p.value);
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() =>
                      setForm2((prev) => ({
                        ...prev,
                        priorities: selected
                          ? prev.priorities.filter((v) => v !== p.value)
                          : [...prev.priorities, p.value],
                      }))
                    }
                    className={`px-4 py-2 rounded-xl border-2 text-sm font-medium transition flex items-center gap-1.5 ${
                      selected
                        ? "border-teal-500 bg-teal-50 text-teal-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {selected && <Check size={14} />}
                    {p.label[lang] || p.label.en}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3 border border-red-100">
            <AlertCircle size={16} className="shrink-0" />
            {error}
          </div>
        )}

        <button
          onClick={handleStep2Submit}
          disabled={submitting}
          className="w-full mt-8 py-4 bg-teal-700 text-white rounded-xl font-bold hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-teal-100 flex items-center justify-center gap-2"
        >
          {submitting ? <><Loader2 size={18} className="animate-spin" /> {tl("submitting", lang)}</> : tl("submitStep2", lang)}
        </button>
      </div>
    );
  }

  // Phase: channel-select (진입)
  if (phase === "channel-select") {
    const channels = [
      {
        key: "ai",
        title: tl("aiAgent", lang),
        desc: tl("aiAgentDesc", lang),
        Icon: Bot,
        iconColor: "text-teal-700",
        iconBg: "bg-teal-50",
        hoverBorder: "hover:border-teal-500",
        onClick: () => {
          safeEvent("inquiry_choose_channel", { channel: "ai" });
          setPhase("ai-chat");
        },
      },
      {
        key: "human",
        title: tl("humanAgent", lang),
        desc: tl("humanAgentDesc", lang),
        Icon: Headset,
        iconColor: "text-green-700",
        iconBg: "bg-green-50",
        hoverBorder: "hover:border-green-500",
        onClick: () => {
          safeEvent("inquiry_choose_channel", { channel: "human" });
          // 설정된 메신저만 노출. 1개뿐이면(현재 WhatsApp) picker 화면을 건너뛰고 바로 연결 —
          // 미설정 채널을 '준비 중' 빈 카드로 보여 미완성 인상 주지 않게. 2개 이상이면 picker.
          const m = SITE_INFO.messenger;
          const configured = [
            { key: "whatsapp", url: m.whatsapp },
            { key: "telegram", url: m.telegram },
            { key: "wechat", url: m.wechat },
            { key: "line", url: m.line },
          ].filter((c) => c.url);
          if (configured.length === 1) {
            safeEvent("inquiry_messenger_click", { channel: configured[0].key, direct: true });
            window.open(configured[0].url, "_blank", "noopener,noreferrer");
          } else {
            setPhase("human-channels");
          }
        },
      },
      {
        key: "form",
        title: tl("inquiryForm", lang),
        desc: tl("inquiryFormDesc", lang),
        Icon: ClipboardList,
        iconColor: "text-blue-700",
        iconBg: "bg-blue-50",
        hoverBorder: "hover:border-blue-500",
        onClick: () => {
          safeEvent("inquiry_choose_channel", { channel: "form" });
          setPhase("step1");
        },
      },
    ];

    return (
      <div className="max-w-3xl mx-auto px-4 py-6 md:py-16 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="text-center mb-6 md:mb-10">
          <h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-1 md:mb-2">{tl("chooseTitle", lang)}</h1>
          <p className="text-gray-500 text-sm md:text-base">{tl("chooseSubtitle", lang)}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-5">
          {channels.map((c) => {
            const Icon = c.Icon;
            return (
              <button
                key={c.key}
                type="button"
                onClick={c.onClick}
                className={`bg-white border border-gray-200 rounded-xl p-4 md:p-6 text-left flex md:block items-center gap-4 md:gap-0 ${c.hoverBorder} hover:shadow-md transition-all`}
              >
                <div className={`w-11 h-11 md:w-12 md:h-12 ${c.iconBg} rounded-xl flex items-center justify-center mb-0 md:mb-4 shrink-0`}>
                  <Icon size={22} className={c.iconColor} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base md:text-lg font-bold text-gray-900 mb-0.5 md:mb-1.5">{c.title}</h3>
                  <p className="text-gray-500 text-xs md:text-sm leading-snug md:leading-relaxed">{c.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* 신뢰 스트립 — 무료·비구속 + 보안·응답 + 인증 배지 (진입 첫 화면) */}
        <div className="mt-6 md:mt-8 flex flex-col items-center gap-2.5">
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[11px] md:text-xs text-gray-500">
            <span className="flex items-center gap-1"><Check size={12} className="text-teal-600" /> {tl("trustFree", lang)}</span>
            <span className="flex items-center gap-1"><Check size={12} className="text-teal-600" /> {tl("trustDirectPay", lang)}</span>
            <span className="flex items-center gap-1"><Shield size={12} className="text-teal-600" /> {tl("trustEncryption", lang)}</span>
            <span className="flex items-center gap-1"><Clock size={12} className="text-teal-600" /> {tl("trustResponse", lang)}</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1 text-[10px] md:text-[11px] font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-1">
              <BadgeCheck size={12} className="text-teal-600" /> {tl("certKhidi", lang)}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] md:text-[11px] font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-1">
              <BadgeCheck size={12} className="text-teal-600" /> {tl("certForeignPatient", lang)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Phase: ai-chat (AI 상담사 인라인 챗)
  // PC에서 화면을 충분히 쓰도록 폭(max-w-4xl)·높이(뷰포트 채움)를 키운다. 「뒤로」는 ThreadChat
  // 상단 툴바로 내려보내(onBack) 코디·접수 버튼과 같은 줄에 두어 세로 공간을 아낀다(2026-06-30 PO).
  if (phase === "ai-chat") {
    // 높이: 부모 래퍼(page.jsx)가 이미 min-h-[100vh-64px] + py(헤더·여백)를 잡으므로 여기서 또
    // 100dvh 를 통째로 빼면 이중차감으로 입력칸이 화면 밖으로 밀린다(데스크톱). 그래서
    //  - 모바일: -my-3 로 래퍼 py-3 을 상쇄하고 헤더(56px=3.5rem)만 뺀 풀하이트(기존 방식).
    //  - 데스크톱: md:h-auto 로 외곽의 dvh 차감을 끄고(이중차감 제거), 안쪽을 뷰포트 기준 큰 높이로
    //    채운다(헤더4rem+래퍼py-8 4rem+여백 ≈ 9rem 차감). 옛 600px 고정보다 훨씬 큼.
    return (
      <div className="max-w-4xl w-full mx-auto px-2 sm:px-4 flex flex-col h-[calc(100dvh-3.5rem)] -my-3 md:my-0 md:h-auto animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex-1 min-h-0 md:flex-none md:h-[calc(100dvh-9rem)]">
          <ThreadChat onBack={() => setPhase("channel-select")} backLabel={tl("back", lang)} />
        </div>
      </div>
    );
  }

  // Phase: human-channels (4개 메신저 카드)
  if (phase === "human-channels") {
    const channels = [
      { key: "whatsapp", name: "WhatsApp", url: SITE_INFO.messenger.whatsapp, color: "#25D366", iconUrl: "/icons/messengers/whatsapp.svg" },
      { key: "telegram", name: "Telegram", url: SITE_INFO.messenger.telegram, color: "#26A5E4", iconUrl: "/icons/messengers/telegram.svg" },
      { key: "wechat", name: "WeChat", url: SITE_INFO.messenger.wechat, color: "#07C160", iconUrl: "/icons/messengers/wechat.svg" },
      { key: "line", name: "LINE", url: SITE_INFO.messenger.line, color: "#06C755", iconUrl: "/icons/messengers/line.svg" },
    ].filter((c) => c.url); // 미설정 채널 숨김 — '준비 중' 빈 카드 제거(미완성 인상 방지)

    return (
      <div className="max-w-3xl mx-auto px-4 py-10 md:py-16 animate-in fade-in slide-in-from-right-4 duration-300">
        <button
          type="button"
          onClick={() => setPhase("channel-select")}
          className="flex items-center gap-1 text-sm font-medium text-gray-500 mb-6 hover:text-teal-700 transition"
        >
          <ChevronLeft size={16} /> {tl("back", lang)}
        </button>

        <div className="text-center mb-10">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{tl("humanChannelsTitle", lang)}</h1>
          <p className="text-gray-500 text-sm md:text-base">{tl("humanChannelsSubtitle", lang)}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {channels.map((c) => {
            const enabled = !!c.url;
            const inner = (
              <>
                <img
                  src={c.iconUrl}
                  alt={c.name}
                  className="w-10 h-10 mb-3"
                  style={enabled ? undefined : { filter: "grayscale(100%)", opacity: 0.4 }}
                />
                <span className="text-sm font-bold text-gray-900">{c.name}</span>
                {!enabled && (
                  <span className="mt-1.5 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    {tl("channelComingSoon", lang)}
                  </span>
                )}
              </>
            );

            const baseCls = "bg-white border border-gray-200 rounded-xl p-5 flex flex-col items-center justify-center text-center transition-all aspect-square";

            if (enabled) {
              return (
                <a
                  key={c.key}
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => safeEvent("inquiry_messenger_click", { channel: c.key })}
                  className={`${baseCls} hover:shadow-md hover:border-[var(--brand-hover)]`}
                  style={{ "--brand-hover": c.color }}
                >
                  {inner}
                </a>
              );
            }
            return (
              <div key={c.key} className={`${baseCls} opacity-60 cursor-not-allowed`}>
                {inner}
              </div>
            );
          })}
        </div>

        {/* 폴백 — 원하는 채널이 없어도 막다른 길이 아니게 (항상 동작하는 경로 제공) */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 mb-3">{tl("humanFallbackText", lang)}</p>
          <button
            type="button"
            onClick={() => { safeEvent("inquiry_human_fallback_to_form"); setPhase("step1"); }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold text-sm hover:bg-teal-700 transition"
          >
            <ClipboardList size={16} /> {tl("humanFallbackCta", lang)} <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  // Phase: step1 (폼)
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* 채널 선택으로 돌아가기 (from_chat 케이스 제외) */}
      {!fromChat && (
        <button
          type="button"
          onClick={() => setPhase("channel-select")}
          className="flex items-center gap-1 text-sm font-medium text-gray-500 mb-4 hover:text-teal-700 transition"
        >
          <ChevronLeft size={16} /> {tl("back", lang)}
        </button>
      )}

      <div className="text-center mb-8">
        <span className="inline-block bg-teal-50 text-teal-700 text-xs font-bold px-3 py-1 rounded-full border border-teal-200 mb-3">Step 1 / 2</span>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{tl("step1Title", lang)}</h1>
        <p className="text-gray-500 text-sm">{tl("step1Subtitle", lang)}</p>
      </div>

      <div className="space-y-5">
        {/* 성함 */}
        <div>
          <label htmlFor="funnel-name" className="block text-sm font-bold text-gray-700 mb-1.5">
            {tl("nameLabel", lang)} <span className="text-red-500">*</span>
          </label>
          <input
            id="funnel-name"
            type="text"
            value={form1.name}
            onChange={(e) => setForm1((p) => ({ ...p, name: e.target.value }))}
            placeholder={tl("namePlaceholder", lang)}
            className="w-full p-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-100 outline-none text-sm bg-gray-50/50 transition"
          />
        </div>

        {/* 국적 */}
        <div>
          <label htmlFor="funnel-nationality" className="block text-sm font-bold text-gray-700 mb-1.5">
            {tl("nationalityLabel", lang)} <span className="text-red-500">*</span>
          </label>
          <select
            id="funnel-nationality"
            value={form1.nationality}
            onChange={(e) => setForm1((p) => ({ ...p, nationality: e.target.value }))}
            className="w-full p-3 rounded-xl border border-gray-200 focus:border-teal-500 outline-none text-sm bg-white transition"
          >
            <option value="">{tl("selectNationality", lang)}</option>
            {NATIONALITIES.map((n) => (
              <option key={n.value} value={n.value}>{n.label}</option>
            ))}
          </select>
        </div>

        {/* 이메일 (필수) */}
        <div>
          <label htmlFor="funnel-email" className="block text-sm font-bold text-gray-700 mb-1.5">
            {tl("contactEmail", lang)} <span className="text-red-500">*</span>
          </label>
          <input
            id="funnel-email"
            type="email"
            value={form1.email}
            onChange={(e) => setForm1((p) => ({ ...p, email: e.target.value }))}
            placeholder={tl("emailPlaceholder", lang)}
            className="w-full p-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-100 outline-none text-sm bg-gray-50/50 transition"
          />
        </div>

        {/* 전화번호 (선택) */}
        <div>
          <label htmlFor="funnel-phone" className="block text-sm font-bold text-gray-700 mb-1.5">
            {tl("contactPhone", lang)} <span className="text-gray-500 font-normal">{tl("optionalTag", lang)}</span>
          </label>
          <div className="flex gap-2">
            <select
              value={form1.phoneDial}
              onChange={(e) => setForm1((p) => ({ ...p, phoneDial: e.target.value }))}
              className="shrink-0 w-44 p-3 rounded-xl border border-gray-200 focus:border-teal-500 outline-none text-sm bg-white transition"
              aria-label={tl("dialAria", lang)}
            >
              <option value="">{tl("dialPlaceholder", lang)}</option>
              {DIAL_CODES.map((d) => (
                <option key={d.code + d.label} value={d.code}>{d.label}</option>
              ))}
            </select>
            <input
              id="funnel-phone"
              type="tel"
              value={form1.phone}
              onChange={(e) => setForm1((p) => ({ ...p, phone: e.target.value }))}
              placeholder={form1.phoneDial === "OTHER" ? "+49 170 1234567" : "701 234 5678"}
              className="flex-1 p-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-100 outline-none text-sm bg-gray-50/50 transition"
            />
          </div>
        </div>

        {/* 선호 언어 */}
        <div>
          <label htmlFor="funnel-lang" className="block text-sm font-bold text-gray-700 mb-1.5">
            {tl("langLabel", lang)} <span className="text-red-500">*</span>
          </label>
          <select
            id="funnel-lang"
            value={form1.preferredLanguage}
            onChange={(e) => setForm1((p) => ({ ...p, preferredLanguage: e.target.value }))}
            className="w-full p-3 rounded-xl border border-gray-200 focus:border-teal-500 outline-none text-sm bg-white transition"
          >
            <option value="">{tl("selectLang", lang)}</option>
            {PREFERRED_LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>

        {/* 암종 */}
        <div>
          <label id="funnel-cancerType-label" className="block text-sm font-bold text-gray-700 mb-1.5">
            {tl("cancerTypeLabel", lang)} <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-4 gap-2" role="group" aria-labelledby="funnel-cancerType-label">
            {CANCER_TYPES.map((ct) => {
              const Icon = ct.icon;
              const selected = form1.cancerType === ct.value;
              const colorClass = CANCER_TYPE_COLORS[ct.value] || "text-gray-600 bg-gray-50 border-gray-200";
              return (
                <button
                  key={ct.value}
                  type="button"
                  onClick={() => setForm1((p) => ({ ...p, cancerType: ct.value }))}
                  className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition text-center ${
                    selected
                      ? "border-teal-500 bg-teal-50 shadow-sm"
                      : "border-gray-100 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${colorClass}`}>
                    <Icon size={18} />
                  </div>
                  <span className={`text-[11px] font-medium leading-tight ${selected ? "text-teal-800" : "text-gray-700"}`}>
                    {ct.label[lang] || ct.label.en}
                  </span>
                  {selected && (
                    <div className="absolute top-1 right-1 w-4 h-4 bg-teal-700 rounded-full flex items-center justify-center">
                      <Check size={10} className="text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 메모 */}
        <div>
          <label htmlFor="funnel-memo" className="block text-sm font-bold text-gray-700 mb-1.5">
            {tl("memoLabel", lang)}
          </label>
          <textarea
            id="funnel-memo"
            value={form1.shortMemo}
            onChange={(e) => setForm1((p) => ({ ...p, shortMemo: e.target.value.slice(0, 200) }))}
            placeholder={tl("memoPlaceholder", lang)}
            rows={3}
            className="w-full p-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-100 outline-none text-sm bg-gray-50/50 resize-y transition"
          />
          <p className="text-right text-[11px] text-gray-400 mt-1">{form1.shortMemo.length}/200</p>
        </div>
      </div>

      {/* 개인정보 동의 (PIPA — 출시 법적 필수: 개인정보·민감정보·국외이전·제3자 제공) */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50/60 p-4">
        <div className="flex items-center gap-1.5 mb-2.5">
          <Shield size={14} className="text-teal-600" />
          <span className="text-[13px] font-semibold text-gray-700">{tl("consentHeading", lang)}</span>
        </div>
        <div className="space-y-2">
          {[
            { key: "pipa", labelKey: "consentPipa" },
            { key: "sensitive", labelKey: "consentSensitive" },
            { key: "thirdParty", labelKey: "consentThirdParty" },
            { key: "crossBorder", labelKey: "consentCrossBorder" },
            { key: "marketing", labelKey: "consentMarketing" },
          ].map((row) => (
            <label key={row.key} className="flex items-start gap-2 cursor-pointer text-[12.5px] leading-snug text-gray-600">
              <input
                type="checkbox"
                checked={consents[row.key]}
                onChange={(e) => setConsents((p) => ({ ...p, [row.key]: e.target.checked }))}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <span>{tl(row.labelKey, lang)}</span>
            </label>
          ))}
        </div>
        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-[11.5px] text-teal-700 underline">
          {tl("consentDetails", lang)} · /privacy
        </a>
        <p className="mt-2.5 text-[11px] leading-snug text-gray-400">{tl("consentDisclaimer", lang)}</p>
      </div>

      {/* 신뢰 배지 */}
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 mt-5 text-[11px] text-gray-500">
        <span className="flex items-center gap-1"><Check size={12} className="text-teal-600" /> {tl("trustFree", lang)}</span>
        <span className="flex items-center gap-1"><Check size={12} className="text-teal-600" /> {tl("trustDirectPay", lang)}</span>
        <span className="flex items-center gap-1"><Shield size={12} /> {tl("trustEncryption", lang)}</span>
        <span className="flex items-center gap-1"><Clock size={12} /> {tl("trustResponse", lang)}</span>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3 border border-red-100">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      <button
        onClick={handleStep1Submit}
        disabled={!step1Valid || submitting}
        className="w-full mt-6 py-4 bg-teal-700 text-white rounded-xl font-bold hover:bg-teal-800 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-lg shadow-teal-100 flex items-center justify-center gap-2"
      >
        {submitting
          ? <><Loader2 size={18} className="animate-spin" /> {tl("submitting", lang)}</>
          : <>{tl("submitStep1", lang)} <ChevronRight size={18} /></>
        }
      </button>
    </div>
  );
}
