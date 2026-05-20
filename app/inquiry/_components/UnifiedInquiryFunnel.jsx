"use client";

/**
 * UnifiedInquiryFunnel — 4개 폼 통폐합 단일 funnel
 * Phase: step1 → step1-success → step2 → step2-success → done
 *
 * Step 1 (1분, 6필드): 성함·국적·연락수단·선호언어·암종·메모
 * Step 2 (3분, 6필드): 병기·진단일·치료상태·의료문서·입국시기·우선순위
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check, ChevronRight, ChevronLeft, UploadCloud, X, File,
  AlertCircle, Loader2, Shield, Clock,
  Activity, Heart, Brain, Stethoscope, Wind,
  Zap, Microscope, HelpCircle,
  Bot, MessageCircle, ClipboardList, Headset
} from "lucide-react";
import { useLang } from "../../../src/lib/i18n/LangContext";
import { event } from "../../../src/lib/ga";
import { SITE_INFO } from "../../../src/lib/siteSettings";
import ThreadChat from "../ThreadChat";

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

const PREFERRED_LANGUAGES = [
  { value: "ko", label: "한국어" },
  { value: "en", label: "English" },
  { value: "ru", label: "Русский" },
  { value: "kz", label: "Қазақша" },
  { value: "zh", label: "中文" },
  { value: "ja", label: "日本語" },
];

const CANCER_TYPES = [
  { value: "stomach", label: { ko: "위암", en: "Stomach", ru: "Желудок", kz: "Асқазан", zh: "胃癌", ja: "胃がん" }, icon: Activity },
  { value: "liver", label: { ko: "간암", en: "Liver", ru: "Печень", kz: "Бауыр", zh: "肝癌", ja: "肝がん" }, icon: Zap },
  { value: "lung", label: { ko: "폐암", en: "Lung", ru: "Лёгкое", kz: "Өкпе", zh: "肺癌", ja: "肺がん" }, icon: Wind },
  { value: "breast", label: { ko: "유방암", en: "Breast", ru: "Грудь", kz: "Сүт без", zh: "乳腺癌", ja: "乳がん" }, icon: Heart },
  { value: "thyroid", label: { ko: "갑상선암", en: "Thyroid", ru: "Щитовидка", kz: "Қалқанша", zh: "甲状腺癌", ja: "甲状腺がん" }, icon: Stethoscope },
  { value: "colorectal", label: { ko: "대장암", en: "Colorectal", ru: "Толстая кишка", kz: "Тоқ ішек", zh: "结肠癌", ja: "大腸がん" }, icon: Activity },
  { value: "pancreatic", label: { ko: "췌장암", en: "Pancreatic", ru: "Поджелудочная", kz: "Ұйқы без", zh: "胰腺癌", ja: "膵がん" }, icon: Microscope },
  { value: "other", label: { ko: "기타", en: "Other", ru: "Другое", kz: "Басқа", zh: "其他", ja: "その他" }, icon: HelpCircle },
];

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

const STAGES = ["I", "II", "III", "IV"];
const TREATMENT_STATES = [
  { value: "pre_surgery", label: { ko: "수술 전", en: "Pre-surgery", ru: "До операции", kz: "Операцияға дейін", zh: "术前", ja: "術前" } },
  { value: "post_surgery", label: { ko: "수술 후", en: "Post-surgery", ru: "После операции", kz: "Операциядан кейін", zh: "术后", ja: "術後" } },
  { value: "chemotherapy", label: { ko: "항암 중", en: "Chemotherapy", ru: "Химиотерапия", kz: "Химиотерапия", zh: "化疗中", ja: "化学療法中" } },
  { value: "follow_up", label: { ko: "추적 관찰", en: "Follow-up", ru: "Наблюдение", kz: "Бақылау", zh: "随访", ja: "経過観察" } },
  { value: "other", label: { ko: "기타", en: "Other", ru: "Другое", kz: "Басқа", zh: "其他", ja: "その他" } },
];

const TRAVEL_TIMING = [
  { value: "2weeks", label: { ko: "2주 내", en: "Within 2 weeks", ru: "В течение 2 нед.", kz: "2 апта ішінде", zh: "2周内", ja: "2週間以内" } },
  { value: "1month", label: { ko: "1개월", en: "~1 month", ru: "~1 месяц", kz: "~1 ай", zh: "约1个月", ja: "約1ヶ月" } },
  { value: "3months", label: { ko: "3개월", en: "~3 months", ru: "~3 месяца", kz: "~3 ай", zh: "约3个月", ja: "約3ヶ月" } },
  { value: "undecided", label: { ko: "미정", en: "Undecided", ru: "Не решено", kz: "Белгісіз", zh: "未定", ja: "未定" } },
];

const PRIORITIES = [
  { value: "price", label: { ko: "가격", en: "Price", ru: "Цена", kz: "Баға", zh: "价格", ja: "価格" } },
  { value: "duration", label: { ko: "기간", en: "Duration", ru: "Сроки", kz: "Мерзім", zh: "疗程", ja: "期間" } },
  { value: "doctor", label: { ko: "의료진", en: "Doctor", ru: "Врачи", kz: "Дәрігерлер", zh: "医生", ja: "医師" } },
  { value: "accessibility", label: { ko: "접근성", en: "Accessibility", ru: "Доступность", kz: "Қолжетімділік", zh: "便利性", ja: "アクセス" } },
];

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
    ko: "AI 상담사", en: "AI Assistant", ru: "ИИ-консультант", kz: "ИИ-консультант", zh: "AI 助手", ja: "AIアシスタント",
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
    ko: "코디네이터 채팅", en: "Talk to a Coordinator", ru: "Чат с координатором", kz: "Координатормен сөйлесу", zh: "联系协调员", ja: "コーディネーターと話す",
  },
  humanAgentDesc: {
    ko: "WhatsApp · Telegram · WeChat · LINE 으로 직접 연결.",
    en: "Connect via WhatsApp, Telegram, WeChat, or LINE.",
    ru: "Связаться через WhatsApp, Telegram, WeChat, LINE.",
    kz: "WhatsApp, Telegram, WeChat немесе LINE арқылы.",
    zh: "通过 WhatsApp、Telegram、WeChat 或 LINE 联系。",
    ja: "WhatsApp・Telegram・WeChat・LINEで直接連絡。",
  },
  inquiryForm: {
    ko: "상담 신청서", en: "Consultation Form", ru: "Анкета", kz: "Сұраныс формасы", zh: "咨询表单", ja: "相談フォーム",
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
    ko: "더 정확한 매칭을 받고 싶으세요?",
    en: "Want a more accurate match?",
    ru: "Хотите более точное совпадение?",
    kz: "Дәлірек сәйкестік алғыңыз келе ме?",
    zh: "想要更准确的匹配吗？",
    ja: "より正確なマッチングを希望しますか？",
  },
  upgradeBody: {
    ko: "추가 정보 6가지만 더 알려주시면 매칭 정확도가 90%까지 올라갑니다.",
    en: "6 more details will raise your match accuracy to 90%.",
    ru: "Ещё 6 сведений поднимут точность подбора до 90%.",
    kz: "6 қосымша ақпарат сәйкестік дәлдігін 90%-ға дейін арттырады.",
    zh: "再提供6项信息，匹配准确率将提升至90%。",
    ja: "あと6つの情報で、マッチング精度が90%に上がります。",
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
  doneBody: {
    ko: "신청이 접수되었습니다. 코디네이터가 곧 연락드립니다.",
    en: "Your request has been received. A coordinator will be in touch soon.",
    ru: "Ваш запрос получен. Координатор скоро свяжется.",
    kz: "Сіздің сұрауыңыз қабылданды. Координатор жақында хабарласады.",
    zh: "您的申请已收到。协调员将很快与您联系。",
    ja: "お申し込みを受け付けました。コーディネーターよりご連絡いたします。",
  },
  step2Title: {
    ko: "더 자세한 정보 (매칭 정확도 90%)",
    en: "More Details (90% Match Accuracy)",
    ru: "Подробнее (точность подбора 90%)",
    kz: "Толық мәліметтер (90% сәйкестік дәлдігі)",
    zh: "更多详情（匹配准确率90%）",
    ja: "詳細情報（マッチング精度90%）",
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
    ko: "매칭 정확도 90% 달성",
    en: "90% Match Accuracy Achieved",
    ru: "Достигнута точность подбора 90%",
    kz: "90% сәйкестік дәлдігіне жетті",
    zh: "达到90%匹配准确率",
    ja: "マッチング精度90%達成",
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
  const [uploadedFiles, setUploadedFiles] = useState([]); // [{path, name, type}]
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  // Step 1 폼
  const [form1, setForm1] = useState({
    name: "",
    nationality: "",
    contactType: "email", // "email" | "phone"
    contactValue: "",
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

  // from_chat 자동채움
  useEffect(() => {
    if (!fromChat) return;
    fetch(`/api/chat/thread-summary?thread_id=${fromChat}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) return;
        setForm1((prev) => ({
          ...prev,
          name: data.guest_name || prev.name,
          contactType: data.guest_email ? "email" : prev.contactType,
          contactValue: data.guest_email || data.guest_phone || prev.contactValue,
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
  const step1Valid =
    form1.name.trim().length > 0 &&
    form1.nationality !== "" &&
    form1.contactValue.trim().length > 0 &&
    form1.preferredLanguage !== "" &&
    form1.cancerType !== "";

  function validateStep1() {
    if (!step1Valid) {
      setError(tl("required", lang));
      return false;
    }
    if (form1.contactType === "email") {
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(form1.contactValue)) {
        setError(tl("invalidEmail", lang));
        return false;
      }
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

      const body = {
        firstName,
        lastName,
        email: form1.contactType === "email" ? form1.contactValue.trim() : null,
        phone: form1.contactType === "phone" ? form1.contactValue.trim() : null,
        nationality: form1.nationality,
        preferredLanguage: form1.preferredLanguage,
        cancerType: form1.cancerType,
        shortMemo: form1.shortMemo.trim() || null,
        aiChatThreadId: fromChat || null,
        // 기존 create API 호환 필드
        spokenLanguage: form1.preferredLanguage,
        contactMethod: form1.contactType === "phone" ? "Phone" : null,
        contactId: form1.contactType === "phone" ? form1.contactValue.trim() : null,
        treatmentType: form1.cancerType,
      };

      const res = await fetch("/api/inquiries/step1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (!result.ok) throw new Error(result.error || "submit_failed");

      setInquiryId(result.inquiryId);
      setPhase("step1-success");
    } catch (e) {
      setError(e.message || "오류가 발생했습니다.");
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
    } catch (e) {
      setError(e.message || "오류가 발생했습니다.");
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
    const email = form1.contactType === "email" ? form1.contactValue : "";
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
          <Check size={32} className="text-teal-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">{tl("doneTitle", lang)}</h2>
        <p className="text-gray-500 text-sm leading-relaxed">{tl("doneBody", lang)}</p>
        <button
          onClick={() => router.push("/")}
          className="mt-8 px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition"
        >
          {lang === "ko" ? "홈으로" : "Back to Home"}
        </button>
      </div>
    );
  }

  // Phase: step2-success
  if (phase === "step2-success") {
    return (
      <div className="max-w-md mx-auto px-4 py-12 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-teal-500 flex items-center justify-center shadow-lg shadow-teal-200">
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
            className="w-full py-3.5 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition text-sm"
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
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-teal-500 flex items-center justify-center shadow-lg shadow-teal-200">
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
            className="w-full py-3.5 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition flex items-center justify-center gap-2"
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
              <p className="text-[11px] text-gray-400 mt-1">PDF / JPG / PNG · 최대 10MB · 5개</p>
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
                      <File size={14} className="text-teal-600 shrink-0" />
                      <span className="text-xs font-medium text-teal-800 truncate">{f.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUploadedFiles((prev) => prev.filter((_, j) => j !== i))}
                      className="p-1 hover:bg-teal-100 rounded-full text-teal-500"
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
          className="w-full mt-8 py-4 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-teal-100 flex items-center justify-center gap-2"
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
          setPhase("human-channels");
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
      <div className="max-w-3xl mx-auto px-4 py-10 md:py-16 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="text-center mb-10">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{tl("chooseTitle", lang)}</h1>
          <p className="text-gray-500 text-sm md:text-base">{tl("chooseSubtitle", lang)}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          {channels.map((c) => {
            const Icon = c.Icon;
            return (
              <button
                key={c.key}
                type="button"
                onClick={c.onClick}
                className={`bg-white border border-gray-200 rounded-2xl p-6 text-left ${c.hoverBorder} hover:shadow-md transition-all`}
              >
                <div className={`w-12 h-12 ${c.iconBg} rounded-xl flex items-center justify-center mb-4`}>
                  <Icon size={22} className={c.iconColor} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1.5">{c.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{c.desc}</p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Phase: ai-chat (AI 상담사 인라인 챗)
  if (phase === "ai-chat") {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-right-4 duration-300">
        <button
          type="button"
          onClick={() => setPhase("channel-select")}
          className="flex items-center gap-1 text-sm font-medium text-gray-500 mb-4 hover:text-teal-600 transition"
        >
          <ChevronLeft size={16} /> {tl("back", lang)}
        </button>
        <ThreadChat />
      </div>
    );
  }

  // Phase: human-channels (4개 메신저 카드)
  if (phase === "human-channels") {
    const channels = [
      { key: "whatsapp", name: "WhatsApp", url: SITE_INFO.messenger.whatsapp, color: "#25D366", iconUrl: "https://cdn.simpleicons.org/whatsapp/25D366" },
      { key: "telegram", name: "Telegram", url: SITE_INFO.messenger.telegram, color: "#26A5E4", iconUrl: "https://cdn.simpleicons.org/telegram/26A5E4" },
      { key: "wechat", name: "WeChat", url: SITE_INFO.messenger.wechat, color: "#07C160", iconUrl: "https://cdn.simpleicons.org/wechat/07C160" },
      { key: "line", name: "LINE", url: SITE_INFO.messenger.line, color: "#06C755", iconUrl: "https://cdn.simpleicons.org/line/06C755" },
    ];

    return (
      <div className="max-w-3xl mx-auto px-4 py-10 md:py-16 animate-in fade-in slide-in-from-right-4 duration-300">
        <button
          type="button"
          onClick={() => setPhase("channel-select")}
          className="flex items-center gap-1 text-sm font-medium text-gray-500 mb-6 hover:text-teal-600 transition"
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
                <img src={c.iconUrl} alt={c.name} className="w-10 h-10 mb-3" style={{ opacity: enabled ? 1 : 0.4 }} />
                <span className="text-sm font-bold text-gray-900">{c.name}</span>
                {!enabled && (
                  <span className="mt-1.5 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    {tl("channelComingSoon", lang)}
                  </span>
                )}
              </>
            );

            const baseCls = "bg-white border border-gray-200 rounded-2xl p-5 flex flex-col items-center justify-center text-center transition-all aspect-square";

            if (enabled) {
              return (
                <a
                  key={c.key}
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => safeEvent("inquiry_messenger_click", { channel: c.key })}
                  className={`${baseCls} hover:shadow-md hover:-translate-y-0.5`}
                  style={{ borderColor: undefined }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = c.color)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "")}
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
          className="flex items-center gap-1 text-sm font-medium text-gray-500 mb-4 hover:text-teal-600 transition"
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
          <label className="block text-sm font-bold text-gray-700 mb-1.5">
            {tl("nameLabel", lang)} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form1.name}
            onChange={(e) => setForm1((p) => ({ ...p, name: e.target.value }))}
            placeholder={tl("namePlaceholder", lang)}
            className="w-full p-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-100 outline-none text-sm bg-gray-50/50 transition"
          />
        </div>

        {/* 국적 */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1.5">
            {tl("nationalityLabel", lang)} <span className="text-red-500">*</span>
          </label>
          <select
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

        {/* 연락 수단 */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1.5">
            {tl("contactLabel", lang)} <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2 mb-2">
            {["email", "phone"].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setForm1((p) => ({ ...p, contactType: type, contactValue: "" }))}
                className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition ${
                  form1.contactType === type
                    ? "border-teal-500 bg-teal-50 text-teal-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {type === "email" ? tl("contactEmail", lang) : tl("contactPhone", lang)}
              </button>
            ))}
          </div>
          <input
            type={form1.contactType === "email" ? "email" : "tel"}
            value={form1.contactValue}
            onChange={(e) => setForm1((p) => ({ ...p, contactValue: e.target.value }))}
            placeholder={tl(form1.contactType === "email" ? "emailPlaceholder" : "phonePlaceholder", lang)}
            className="w-full p-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-100 outline-none text-sm bg-gray-50/50 transition"
          />
        </div>

        {/* 선호 언어 */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1.5">
            {tl("langLabel", lang)} <span className="text-red-500">*</span>
          </label>
          <select
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
          <label className="block text-sm font-bold text-gray-700 mb-1.5">
            {tl("cancerTypeLabel", lang)} <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-4 gap-2">
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
                    <div className="absolute top-1 right-1 w-4 h-4 bg-teal-500 rounded-full flex items-center justify-center">
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
          <label className="block text-sm font-bold text-gray-700 mb-1.5">
            {tl("memoLabel", lang)}
          </label>
          <textarea
            value={form1.shortMemo}
            onChange={(e) => setForm1((p) => ({ ...p, shortMemo: e.target.value.slice(0, 200) }))}
            placeholder={tl("memoPlaceholder", lang)}
            rows={3}
            className="w-full p-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-100 outline-none text-sm bg-gray-50/50 resize-y transition"
          />
          <p className="text-right text-[11px] text-gray-400 mt-1">{form1.shortMemo.length}/200</p>
        </div>
      </div>

      {/* 신뢰 배지 */}
      <div className="flex items-center justify-center gap-6 mt-5 text-[11px] text-gray-400">
        <span className="flex items-center gap-1"><Shield size={12} /> AES-256 암호화</span>
        <span className="flex items-center gap-1"><Clock size={12} /> 영업일 1일 이내 응답</span>
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
        className="w-full mt-6 py-4 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-lg shadow-teal-100 flex items-center justify-center gap-2"
      >
        {submitting
          ? <><Loader2 size={18} className="animate-spin" /> {tl("submitting", lang)}</>
          : <>{tl("submitStep1", lang)} <ChevronRight size={18} /></>
        }
      </button>
    </div>
  );
}
