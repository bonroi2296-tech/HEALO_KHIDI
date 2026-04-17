"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight, ChevronLeft, Shield, Upload, CheckCircle2,
  Stethoscope, Heart, Calendar, FileCheck,
  ArrowRight, Sparkles, Clock,
} from "lucide-react";
import { supabaseClient } from "../../src/lib/data/supabaseClient";
import { getLangCodeFromCookie } from "../../src/lib/i18n";

// ─── i18n ───
const LABELS = {
  en: {
    title: "Cancer Treatment Application",
    subtitle: "We'll match you with Korea's top oncologists",
    step1: "Diagnosis", step2: "Treatment", step3: "Schedule", step4: "Review",
    cancerType: "What type of cancer?", cancerStage: "Stage",
    diagnosisDate: "When were you diagnosed?",
    currentTreatment: "Are you currently receiving treatment?",
    preferredTreatment: "Which treatments are you interested in?",
    medicalRecords: "Medical Records",
    uploadHint: "Drop files here or click to upload (PDF, JPG, PNG)",
    budget: "Estimated Budget", budgetMin: "Min", budgetMax: "Max", currency: "Currency",
    travelEarliest: "Can travel from", travelLatest: "Must arrive by",
    flexibleDates: "My dates are flexible",
    language: "I'd like to communicate in",
    consent: "I agree to the processing of my personal and medical data",
    consentDetail: "Your data is encrypted with AES-256 and complies with international medical data standards.",
    next: "Continue", back: "Back", submit: "Submit Application",
    success: "Application submitted! Our coordinator will reach out within 24 hours.",
    required: "Required", none: "None currently",
    chemo: "Chemotherapy", radiation: "Radiation", surgery: "Surgery", immunotherapy: "Immunotherapy",
    stomach: "Stomach", liver: "Liver", lung: "Lung", breast: "Breast", thyroid: "Thyroid", other: "Other",
    unknown: "Unknown",
    additionalNotes: "Anything else we should know?",
    additionalNotesHint: "Symptoms, concerns, medications, allergies...",
    reviewTitle: "Review Your Application",
    reviewDisease: "Diagnosis Details", reviewSchedule: "Schedule & Budget",
    selectOne: "Select one", selectAll: "Select all that apply",
    stage: "Stage",
  },
  ru: {
    title: "Заявка на лечение рака",
    subtitle: "Мы подберём лучших онкологов Кореи",
    step1: "Диагноз", step2: "Лечение", step3: "Даты", step4: "Проверка",
    cancerType: "Какой тип рака?", cancerStage: "Стадия",
    diagnosisDate: "Когда был поставлен диагноз?",
    currentTreatment: "Получаете ли вы сейчас лечение?",
    preferredTreatment: "Какие методы лечения вас интересуют?",
    medicalRecords: "Медицинские документы",
    uploadHint: "Перетащите файлы сюда или нажмите для загрузки (PDF, JPG, PNG)",
    budget: "Примерный бюджет", budgetMin: "Мин", budgetMax: "Макс", currency: "Валюта",
    travelEarliest: "Могу приехать с", travelLatest: "Нужно приехать до",
    flexibleDates: "Даты гибкие",
    language: "Хочу общаться на",
    consent: "Согласен(на) на обработку персональных и медицинских данных",
    consentDetail: "Данные зашифрованы AES-256 и соответствуют международным стандартам.",
    next: "Продолжить", back: "Назад", submit: "Отправить заявку",
    success: "Заявка отправлена! Координатор свяжется с вами в течение 24 часов.",
    required: "Обязательно", none: "Нет",
    chemo: "Химиотерапия", radiation: "Лучевая терапия", surgery: "Хирургия", immunotherapy: "Иммунотерапия",
    stomach: "Желудок", liver: "Печень", lung: "Лёгкие", breast: "Молочная железа", thyroid: "Щитовидная железа", other: "Другой",
    unknown: "Не установлена",
    additionalNotes: "Что-нибудь ещё?",
    additionalNotesHint: "Симптомы, опасения, лекарства, аллергии...",
    reviewTitle: "Проверьте заявку",
    reviewDisease: "Диагноз", reviewSchedule: "Даты и бюджет",
    selectOne: "Выберите один", selectAll: "Выберите все подходящие",
    stage: "Стадия",
  },
  kz: {
    title: "Обыр емдеуге өтінім",
    subtitle: "Кореяның үздік онкологтарын таңдаймыз",
    step1: "Диагноз", step2: "Емдеу", step3: "Кесте", step4: "Тексеру",
    cancerType: "Обыр түрі қандай?", cancerStage: "Сатысы",
    diagnosisDate: "Диагноз қашан қойылды?",
    currentTreatment: "Қазір емдеу алуда сыз ба?",
    preferredTreatment: "Қандай емдеу әдістері қызықтырады?",
    medicalRecords: "Медициналық құжаттар",
    uploadHint: "Файлдарды осында сүйреңіз немесе жүктеу үшін басыңыз",
    budget: "Болжамды бюджет", budgetMin: "Мин", budgetMax: "Макс", currency: "Валюта",
    travelEarliest: "Келе алатын күн", travelLatest: "Соңғы күн",
    flexibleDates: "Күндер икемді",
    language: "Қатынас тілі",
    consent: "Жеке және медициналық деректерді өңдеуге келісемін",
    consentDetail: "Деректер AES-256 шифрлаумен қорғалған.",
    next: "Жалғастыру", back: "Артқа", submit: "Өтінімді жіберу",
    success: "Өтінім жіберілді! 24 сағат ішінде байланысамыз.",
    required: "Міндетті", none: "Жоқ",
    chemo: "Химиотерапия", radiation: "Сәулелік терапия", surgery: "Хирургия", immunotherapy: "Иммунотерапия",
    stomach: "Асқазан", liver: "Бауыр", lung: "Өкпе", breast: "Сүт безі", thyroid: "Қалқанша без", other: "Басқа",
    unknown: "Белгісіз",
    additionalNotes: "Тағы бірдеңе бар ма?",
    additionalNotesHint: "Белгілер, алаңдаушылықтар, дәрілер...",
    reviewTitle: "Өтінімді тексеріңіз",
    reviewDisease: "Диагноз", reviewSchedule: "Кесте және бюджет",
    selectOne: "Біреуін таңдаңыз", selectAll: "Барлығын таңдаңыз",
    stage: "Сатысы",
  },
  ko: {
    title: "암 치료 신청서",
    subtitle: "한국 최고의 종양 전문의와 매칭해 드립니다",
    step1: "진단", step2: "치료", step3: "일정", step4: "확인",
    cancerType: "어떤 종류의 암인가요?", cancerStage: "병기",
    diagnosisDate: "언제 진단받으셨나요?",
    currentTreatment: "현재 치료를 받고 계신가요?",
    preferredTreatment: "관심 있는 치료 방법은?",
    medicalRecords: "의료 기록",
    uploadHint: "파일을 드래그하거나 클릭하여 업로드 (PDF, JPG, PNG)",
    budget: "예상 예산", budgetMin: "최소", budgetMax: "최대", currency: "통화",
    travelEarliest: "출발 가능일", travelLatest: "도착 마감일",
    flexibleDates: "일정이 유동적입니다",
    language: "소통 언어",
    consent: "개인정보 및 의료정보 처리에 동의합니다",
    consentDetail: "데이터는 AES-256으로 암호화되어 국제 의료정보 보안 표준을 준수합니다.",
    next: "계속", back: "이전", submit: "신청서 제출",
    success: "신청이 완료되었습니다! 24시간 내에 코디네이터가 연락드립니다.",
    required: "필수", none: "없음",
    chemo: "항암화학요법", radiation: "방사선 치료", surgery: "수술", immunotherapy: "면역요법",
    stomach: "위암", liver: "간암", lung: "폐암", breast: "유방암", thyroid: "갑상선암", other: "기타",
    unknown: "미상",
    additionalNotes: "추가로 알려주실 내용이 있나요?",
    additionalNotesHint: "증상, 우려사항, 복용 약물, 알레르기...",
    reviewTitle: "신청 내용을 확인해 주세요",
    reviewDisease: "진단 정보", reviewSchedule: "일정 및 예산",
    selectOne: "하나를 선택하세요", selectAll: "해당하는 것을 모두 선택",
    stage: "기",
  },
  zh: {
    title: "癌症治疗申请表",
    subtitle: "为您匹配韩国顶级肿瘤专家",
    step1: "诊断", step2: "治疗", step3: "日程", step4: "确认",
    cancerType: "哪种癌症？", cancerStage: "分期",
    diagnosisDate: "何时确诊？",
    currentTreatment: "目前是否在接受治疗？",
    preferredTreatment: "您对哪些治疗方法感兴趣？",
    medicalRecords: "医疗记录",
    uploadHint: "将文件拖到此处或点击上传 (PDF, JPG, PNG)",
    budget: "预算估算", budgetMin: "最低", budgetMax: "最高", currency: "货币",
    travelEarliest: "最早可出发日", travelLatest: "最迟须抵达日",
    flexibleDates: "日期灵活",
    language: "交流语言",
    consent: "我同意处理我的个人和医疗数据",
    consentDetail: "数据使用AES-256加密，符合国际医疗数据标准。",
    next: "继续", back: "返回", submit: "提交申请",
    success: "申请已提交！协调员将在24小时内与您联系。",
    required: "必填", none: "目前没有",
    chemo: "化疗", radiation: "放疗", surgery: "手术", immunotherapy: "免疫治疗",
    stomach: "胃", liver: "肝", lung: "肺", breast: "乳腺", thyroid: "甲状腺", other: "其他",
    unknown: "未知",
    additionalNotes: "还有其他需要告知的吗？",
    additionalNotesHint: "症状、顾虑、药物、过敏...",
    reviewTitle: "请确认您的申请",
    reviewDisease: "诊断详情", reviewSchedule: "日程与预算",
    selectOne: "请选择一项", selectAll: "选择所有适用项",
    stage: "期",
  },
  ja: {
    title: "がん治療申込書",
    subtitle: "韓国トップのがん専門医とマッチングします",
    step1: "診断", step2: "治療", step3: "スケジュール", step4: "確認",
    cancerType: "どのようながんですか？", cancerStage: "ステージ",
    diagnosisDate: "いつ診断されましたか？",
    currentTreatment: "現在治療を受けていますか？",
    preferredTreatment: "ご興味のある治療法は？",
    medicalRecords: "医療記録",
    uploadHint: "ファイルをドラッグまたはクリックしてアップロード (PDF, JPG, PNG)",
    budget: "予算目安", budgetMin: "最小", budgetMax: "最大", currency: "通貨",
    travelEarliest: "出発可能日", travelLatest: "到着期限",
    flexibleDates: "日程は柔軟です",
    language: "コミュニケーション言語",
    consent: "個人情報および医療情報の処理に同意します",
    consentDetail: "データはAES-256で暗号化され、国際医療データ基準に準拠しています。",
    next: "続ける", back: "戻る", submit: "申込書を提出",
    success: "申込が完了しました！コーディネーターが24時間以内にご連絡します。",
    required: "必須", none: "現在なし",
    chemo: "化学療法", radiation: "放射線", surgery: "手術", immunotherapy: "免疫療法",
    stomach: "胃", liver: "肝臓", lung: "肺", breast: "乳房", thyroid: "甲状腺", other: "その他",
    unknown: "不明",
    additionalNotes: "他にお知らせいただくことはありますか？",
    additionalNotesHint: "症状、懸念、服用中の薬、アレルギー...",
    reviewTitle: "申込内容をご確認ください",
    reviewDisease: "診断情報", reviewSchedule: "スケジュールと予算",
    selectOne: "一つお選びください", selectAll: "該当するものをすべて選択",
    stage: "期",
  },
};

const CANCER_TYPES = [
  { key: "stomach", emoji: "🫁" },
  { key: "liver", emoji: "🫀" },
  { key: "lung", emoji: "🫁" },
  { key: "breast", emoji: "🎀" },
  { key: "thyroid", emoji: "🦋" },
  { key: "other", emoji: "🔬" },
];
const CANCER_STAGES = ["I", "II", "III", "IV", "unknown"];
const TREATMENT_OPTIONS = [
  { key: "surgery", icon: "🔪" },
  { key: "chemo", icon: "💊" },
  { key: "radiation", icon: "⚡" },
  { key: "immunotherapy", icon: "🛡️" },
];
const CURRENCIES = ["USD", "KZT", "KRW"];
const STEP_ICONS = [Stethoscope, Heart, Calendar, FileCheck];
const TOTAL_STEPS = 4;

export default function IntakePage() {
  const router = useRouter();
  const [lang, setLang] = useState("en");
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [form, setForm] = useState({
    cancerType: "", cancerStage: "", diagnosisDate: "", currentTreatment: "",
    additionalNotes: "", preferredTreatments: [],
    budgetMin: "", budgetMax: "", budgetCurrency: "USD",
    travelEarliest: "", travelLatest: "", flexibleDates: false,
    languagePreference: "ru", consent: false,
  });

  useEffect(() => {
    const code = getLangCodeFromCookie();
    if (LABELS[code]) setLang(code);
    else setLang("en");
  }, []);

  const L = LABELS[lang] || LABELS.en;
  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const toggleTreatment = (t) => setForm((prev) => ({
    ...prev,
    preferredTreatments: prev.preferredTreatments.includes(t)
      ? prev.preferredTreatments.filter((x) => x !== t)
      : [...prev.preferredTreatments, t],
  }));

  const canProceed = () => {
    if (step === 1) return form.cancerType !== "";
    if (step === 4) return form.consent;
    return true;
  };

  const handleSubmit = async () => {
    if (!form.consent) return;
    setIsSubmitting(true);
    try {
      const payload = {
        cancer_type: form.cancerType,
        cancer_stage: form.cancerStage || null,
        diagnosis_date: form.diagnosisDate || null,
        current_treatment: form.currentTreatment || null,
        additional_notes: form.additionalNotes || null,
        preferred_treatments: form.preferredTreatments,
        budget_range: {
          min: form.budgetMin ? parseFloat(form.budgetMin) : null,
          max: form.budgetMax ? parseFloat(form.budgetMax) : null,
          currency: form.budgetCurrency,
        },
        travel_dates: {
          earliest: form.travelEarliest || null,
          latest: form.travelLatest || null,
          flexible: form.flexibleDates,
        },
        language_preference: form.languagePreference,
      };
      const response = await fetch("/api/khidi/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (result.ok) setIsSubmitted(true);
      else { console.error("[IntakePage]", result.error); alert(result.error || "Submit failed"); }
    } catch (error) {
      console.error("[IntakePage]", error);
      alert("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Success ───
  if (isSubmitted) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 bg-teal-100 rounded-full animate-ping opacity-20" />
            <div className="relative bg-gradient-to-br from-teal-500 to-teal-600 w-full h-full rounded-full flex items-center justify-center shadow-lg shadow-teal-200">
              <CheckCircle2 size={36} className="text-white" strokeWidth={2.5} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">{L.success}</h2>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-8">
            <Clock size={14} /> 24h
          </div>
          <button
            onClick={() => router.push("/signup?redirect=/patient")}
            className="w-full py-3.5 bg-teal-600 text-white rounded-2xl font-semibold hover:bg-teal-700 transition mb-3"
          >
            {lang === 'ko' ? '계정 만들고 진행 확인' : lang === 'ru' ? 'Создать аккаунт и отслеживать' : 'Create Account & Track'}
          </button>
          <button
            onClick={() => router.push("/patient")}
            className="w-full py-3 text-teal-600 text-sm font-semibold hover:text-teal-700 transition border border-teal-200 rounded-2xl mb-2"
          >
            {lang === 'ko' ? '대시보드로 이동' : lang === 'ru' ? 'Перейти в кабинет' : lang === 'kz' ? 'Кабинетке өту' : lang === 'zh' ? '前往仪表板' : lang === 'ja' ? 'ダッシュボードへ' : 'Go to Dashboard'}
          </button>
          <button
            onClick={() => router.push("/")}
            className="w-full py-3 text-gray-400 text-sm font-medium hover:text-gray-600 transition"
          >
            {lang === 'ko' ? '홈으로' : lang === 'ru' ? 'На главную' : 'Back to Home'}
          </button>
        </div>
      </div>
    );
  }

  // ─── Main Form ───
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white py-8 md:py-12 px-4">
        <div className="max-w-xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 text-xs font-medium mb-4">
            <Sparkles size={12} /> HEALO Medical Concierge
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-teal-100 text-sm">{L.subtitle}</p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 -mt-6">
        {/* Stepper */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 mb-6">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((s, i) => {
              const Icon = STEP_ICONS[i];
              const labels = [L.step1, L.step2, L.step3, L.step4];
              const isActive = s === step;
              const isDone = s < step;
              return (
                <div key={s} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                      isActive ? 'bg-teal-600 text-white shadow-lg shadow-teal-200 scale-110' :
                      isDone ? 'bg-teal-100 text-teal-600' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {isDone ? <CheckCircle2 size={18} /> : <Icon size={18} />}
                    </div>
                    <span className={`text-[10px] mt-1.5 font-medium text-center leading-tight ${
                      isActive ? 'text-teal-600' : isDone ? 'text-teal-500' : 'text-gray-400'
                    }`}>
                      {labels[i]}
                    </span>
                  </div>
                  {s < 4 && (
                    <div className={`w-8 h-0.5 rounded-full mx-1 -mt-4 ${
                      isDone ? 'bg-teal-300' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-8">
          <div className="p-6 md:p-8">

            {/* ── Step 1: Diagnosis ── */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">
                    {L.cancerType} <span className="text-red-400">*</span>
                  </label>
                  <p className="text-xs text-gray-400 mb-3">{L.selectOne}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {CANCER_TYPES.map(({ key, emoji }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => updateField("cancerType", key)}
                        className={`flex flex-col items-center gap-1.5 px-3 py-4 rounded-xl border-2 text-sm font-medium transition-all ${
                          form.cancerType === key
                            ? "border-teal-500 bg-teal-50 text-teal-700 shadow-sm"
                            : "border-gray-100 text-gray-600 hover:border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <span className="text-xl">{emoji}</span>
                        {L[key]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-3">{L.cancerStage}</label>
                  <div className="flex gap-2">
                    {CANCER_STAGES.map((stage) => (
                      <button
                        key={stage}
                        type="button"
                        onClick={() => updateField("cancerStage", stage)}
                        className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                          form.cancerStage === stage
                            ? "border-teal-500 bg-teal-50 text-teal-700"
                            : "border-gray-100 text-gray-500 hover:border-gray-200"
                        }`}
                      >
                        {stage === "unknown" ? "?" : stage}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">{L.diagnosisDate}</label>
                  <input
                    type="date"
                    value={form.diagnosisDate}
                    onChange={(e) => updateField("diagnosisDate", e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-teal-500 transition text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">{L.currentTreatment}</label>
                  <select
                    value={form.currentTreatment}
                    onChange={(e) => updateField("currentTreatment", e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-teal-500 transition text-sm appearance-none bg-white"
                  >
                    <option value="">{L.none}</option>
                    <option value="chemo">{L.chemo}</option>
                    <option value="radiation">{L.radiation}</option>
                    <option value="surgery">{L.surgery}</option>
                    <option value="immunotherapy">{L.immunotherapy}</option>
                  </select>
                </div>
              </div>
            )}

            {/* ── Step 2: Treatment ── */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">{L.preferredTreatment}</label>
                  <p className="text-xs text-gray-400 mb-3">{L.selectAll}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {TREATMENT_OPTIONS.map(({ key, icon }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleTreatment(key)}
                        className={`flex items-center gap-3 px-4 py-4 rounded-xl border-2 text-sm font-medium transition-all ${
                          form.preferredTreatments.includes(key)
                            ? "border-teal-500 bg-teal-50 text-teal-700 shadow-sm"
                            : "border-gray-100 text-gray-600 hover:border-gray-200"
                        }`}
                      >
                        <span className="text-lg">{icon}</span>
                        {L[key]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">{L.medicalRecords}</label>
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-teal-400 hover:bg-teal-50/30 transition-all cursor-pointer group">
                    <div className="w-12 h-12 bg-gray-100 group-hover:bg-teal-100 rounded-xl flex items-center justify-center mx-auto mb-3 transition">
                      <Upload size={22} className="text-gray-400 group-hover:text-teal-600 transition" />
                    </div>
                    <p className="text-sm text-gray-500">{L.uploadHint}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">{L.additionalNotes}</label>
                  <textarea
                    value={form.additionalNotes}
                    onChange={(e) => updateField("additionalNotes", e.target.value)}
                    placeholder={L.additionalNotesHint}
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-teal-500 transition text-sm resize-none"
                  />
                </div>
              </div>
            )}

            {/* ── Step 3: Schedule ── */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-3">{L.budget}</label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        placeholder={L.budgetMin}
                        value={form.budgetMin}
                        onChange={(e) => updateField("budgetMin", e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-teal-500 transition text-sm"
                      />
                    </div>
                    <span className="flex items-center text-gray-300 font-light text-lg">~</span>
                    <div className="flex-1">
                      <input
                        type="number"
                        placeholder={L.budgetMax}
                        value={form.budgetMax}
                        onChange={(e) => updateField("budgetMax", e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-teal-500 transition text-sm"
                      />
                    </div>
                    <select
                      value={form.budgetCurrency}
                      onChange={(e) => updateField("budgetCurrency", e.target.value)}
                      className="w-24 px-3 py-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-teal-500 transition text-sm font-medium appearance-none bg-white text-center"
                    >
                      {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">{L.travelEarliest}</label>
                    <input
                      type="date"
                      value={form.travelEarliest}
                      onChange={(e) => updateField("travelEarliest", e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-teal-500 transition text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">{L.travelLatest}</label>
                    <input
                      type="date"
                      value={form.travelLatest}
                      onChange={(e) => updateField("travelLatest", e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-teal-500 transition text-sm"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-3 cursor-pointer bg-gray-50 rounded-xl p-4">
                  <input
                    type="checkbox"
                    checked={form.flexibleDates}
                    onChange={(e) => updateField("flexibleDates", e.target.checked)}
                    className="w-5 h-5 rounded-lg border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm font-medium text-gray-700">{L.flexibleDates}</span>
                </label>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">{L.language}</label>
                  <select
                    value={form.languagePreference}
                    onChange={(e) => updateField("languagePreference", e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-teal-500 transition text-sm appearance-none bg-white"
                  >
                    <option value="ru">🇷🇺 Русский</option>
                    <option value="kz">🇰🇿 Қазақша</option>
                    <option value="en">🇺🇸 English</option>
                    <option value="ko">🇰🇷 한국어</option>
                    <option value="zh">🇨🇳 中文</option>
                    <option value="ja">🇯🇵 日本語</option>
                    <option value="mn">🇲🇳 Монгол</option>
                  </select>
                </div>
              </div>
            )}

            {/* ── Step 4: Review ── */}
            {step === 4 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-lg font-bold text-gray-900">{L.reviewTitle}</h3>

                {/* Summary cards */}
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 border border-gray-100">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{L.reviewDisease}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">{L.cancerType.replace("?","")}</span>
                      <span className="font-semibold text-gray-800">{L[form.cancerType] || "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{L.stage || L.cancerStage}</span>
                      <span className="font-semibold text-gray-800">{form.cancerStage || "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{L.currentTreatment.replace("?","")}</span>
                      <span className="font-semibold text-gray-800">{L[form.currentTreatment] || L.none}</span>
                    </div>
                    {form.preferredTreatments.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">{L.preferredTreatment.replace("?","")}</span>
                        <span className="font-semibold text-gray-800">
                          {form.preferredTreatments.map(t => L[t]).join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 border border-gray-100">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{L.reviewSchedule}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">{L.budget}</span>
                      <span className="font-semibold text-gray-800">
                        {form.budgetMin || "–"} ~ {form.budgetMax || "–"} {form.budgetCurrency}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{L.language.replace("in","").trim()}</span>
                      <span className="font-semibold text-gray-800">{form.languagePreference.toUpperCase()}</span>
                    </div>
                    {form.flexibleDates && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">{L.flexibleDates}</span>
                        <span className="font-semibold text-teal-600">✓</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Consent */}
                <div className={`rounded-xl p-5 border-2 transition-all ${
                  form.consent ? 'bg-teal-50 border-teal-300' : 'bg-gray-50 border-gray-200'
                }`}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.consent}
                      onChange={(e) => updateField("consent", e.target.checked)}
                      className="w-5 h-5 rounded-lg border-gray-300 text-teal-600 focus:ring-teal-500 mt-0.5"
                    />
                    <div>
                      <span className="text-sm font-semibold text-gray-900">{L.consent}</span>
                      <div className="flex items-start gap-2 mt-2">
                        <Shield size={14} className="text-teal-600 mt-0.5 shrink-0" />
                        <p className="text-xs text-gray-500">{L.consentDetail}</p>
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="px-6 md:px-8 pb-6 md:pb-8 flex justify-between items-center">
            {step > 1 ? (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="flex items-center gap-1.5 px-4 py-2.5 text-gray-500 hover:text-gray-700 font-medium transition text-sm rounded-xl hover:bg-gray-50"
              >
                <ChevronLeft size={16} /> {L.back}
              </button>
            ) : (
              <div />
            )}

            {step < TOTAL_STEPS ? (
              <button
                onClick={() => canProceed() && setStep((s) => s + 1)}
                disabled={!canProceed()}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                  canProceed()
                    ? "bg-teal-600 text-white hover:bg-teal-700 shadow-lg shadow-teal-200 hover:shadow-xl"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              >
                {L.next} <ArrowRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!form.consent || isSubmitting}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                  form.consent && !isSubmitting
                    ? "bg-teal-600 text-white hover:bg-teal-700 shadow-lg shadow-teal-200"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              >
                {isSubmitting ? "..." : L.submit} <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
