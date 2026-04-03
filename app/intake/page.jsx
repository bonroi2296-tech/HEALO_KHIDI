"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, ChevronLeft, Shield, Upload, CheckCircle2 } from "lucide-react";
import { supabaseClient } from "../../src/lib/data/supabaseClient";
import { getLangCodeFromCookie } from "../../src/lib/i18n";

// 다국어 라벨 (ru/kz/ko/en)
const LABELS = {
  en: {
    title: "Cancer Treatment Application",
    subtitle: "Fill out this form to find the best hospital for your treatment",
    step1: "Disease Information",
    step2: "Treatment Preferences",
    step3: "Logistics & Budget",
    step4: "Confirmation",
    cancerType: "Cancer Type",
    cancerStage: "Cancer Stage",
    diagnosisDate: "Diagnosis Date",
    currentTreatment: "Current Treatment",
    preferredTreatment: "Preferred Treatment Methods",
    medicalRecords: "Medical Records",
    uploadHint: "Upload test results, scans, and doctor reports (PDF, JPG, PNG)",
    budget: "Budget Range",
    budgetMin: "Minimum",
    budgetMax: "Maximum",
    currency: "Currency",
    travelEarliest: "Earliest Travel Date",
    travelLatest: "Latest Travel Date",
    flexibleDates: "Flexible dates",
    language: "Preferred Communication Language",
    consent: "I consent to the processing of my personal and medical data",
    consentDetail: "Your data is encrypted and protected following international medical data security standards.",
    next: "Next",
    back: "Back",
    submit: "Submit Application",
    success: "Your application has been submitted! Our coordinator will contact you within 24 hours.",
    required: "Required",
    none: "None",
    chemo: "Chemotherapy",
    radiation: "Radiation Therapy",
    surgery: "Surgery",
    immunotherapy: "Immunotherapy",
    stomach: "Stomach Cancer",
    liver: "Liver Cancer",
    lung: "Lung Cancer",
    breast: "Breast Cancer",
    thyroid: "Thyroid Cancer",
    other: "Other",
    unknown: "Unknown",
    additionalNotes: "Additional Notes",
    additionalNotesHint: "Describe your symptoms, concerns, or questions",
  },
  ru: {
    title: "Заявка на лечение рака",
    subtitle: "Заполните форму для подбора оптимальной клиники",
    step1: "Информация о заболевании",
    step2: "Предпочтения по лечению",
    step3: "Логистика и бюджет",
    step4: "Подтверждение",
    cancerType: "Тип рака",
    cancerStage: "Стадия рака",
    diagnosisDate: "Дата постановки диагноза",
    currentTreatment: "Текущее лечение",
    preferredTreatment: "Предпочитаемые методы лечения",
    medicalRecords: "Медицинская документация",
    uploadHint: "Загрузите результаты обследований, снимки и заключения врачей (PDF, JPG, PNG)",
    budget: "Бюджет",
    budgetMin: "Минимум",
    budgetMax: "Максимум",
    currency: "Валюта",
    travelEarliest: "Не ранее",
    travelLatest: "Не позднее",
    flexibleDates: "Гибкие даты",
    language: "Предпочитаемый язык общения",
    consent: "Я согласен(на) на обработку персональных и медицинских данных",
    consentDetail: "Ваши данные зашифрованы и защищены в соответствии с международными стандартами безопасности.",
    next: "Далее",
    back: "Назад",
    submit: "Отправить заявку",
    success: "Ваша заявка успешно отправлена! Наш координатор свяжется с вами в течение 24 часов.",
    required: "Обязательное поле",
    none: "Нет лечения",
    chemo: "Химиотерапия",
    radiation: "Лучевая терапия",
    surgery: "Хирургическое лечение",
    immunotherapy: "Иммунотерапия",
    stomach: "Рак желудка",
    liver: "Рак печени",
    lung: "Рак лёгких",
    breast: "Рак молочной железы",
    thyroid: "Рак щитовидной железы",
    other: "Другой тип",
    unknown: "Не установлена",
    additionalNotes: "Дополнительные примечания",
    additionalNotesHint: "Опишите ваши симптомы, опасения или вопросы",
  },
  kz: {
    title: "Обыр емдеуге өтінім",
    subtitle: "Ең қолайлы клиниканы таңдау үшін нысанды толтырыңыз",
    step1: "Ауру туралы ақпарат",
    step2: "Емдеу қалаулары",
    step3: "Логистика және бюджет",
    step4: "Растау",
    cancerType: "Обыр түрі",
    cancerStage: "Обыр сатысы",
    diagnosisDate: "Диагноз қойылған күні",
    currentTreatment: "Қазіргі емдеу",
    preferredTreatment: "Қалаулы емдеу әдістері",
    medicalRecords: "Медициналық құжаттар",
    uploadHint: "Тексеру нәтижелерін, суреттерді және дәрігер қорытындыларын жүктеңіз",
    budget: "Бюджет",
    budgetMin: "Ең аз",
    budgetMax: "Ең көп",
    currency: "Валюта",
    travelEarliest: "Ерте емес",
    travelLatest: "Кеш емес",
    flexibleDates: "Икемді күндер",
    language: "Қалаулы байланыс тілі",
    consent: "Мен жеке және медициналық деректерді өңдеуге келісемін",
    consentDetail: "Сіздің деректеріңіз халықаралық стандарттарға сәйкес шифрланған.",
    next: "Келесі",
    back: "Артқа",
    submit: "Өтінімді жіберу",
    success: "Сіздің өтініміңіз сәтті жіберілді! 24 сағат ішінде сізбен байланысады.",
    required: "Міндетті өріс",
    none: "Емдеу жоқ",
    chemo: "Химиотерапия",
    radiation: "Сәулелік терапия",
    surgery: "Хирургиялық емдеу",
    immunotherapy: "Иммунотерапия",
    stomach: "Асқазан обыры",
    liver: "Бауыр обыры",
    lung: "Өкпе обыры",
    breast: "Сүт безі обыры",
    thyroid: "Қалқанша без обыры",
    other: "Басқа түрі",
    unknown: "Анықталмаған",
    additionalNotes: "Қосымша ескертпелер",
    additionalNotesHint: "Белгілеріңізді, алаңдаушылықтарыңызды немесе сұрақтарыңызды сипаттаңыз",
  },
  ko: {
    title: "암 치료 신청서",
    subtitle: "최적의 치료 병원을 찾기 위한 양식을 작성해 주세요",
    step1: "질환 정보",
    step2: "치료 선호도",
    step3: "일정 및 예산",
    step4: "확인",
    cancerType: "암 종류",
    cancerStage: "암 병기",
    diagnosisDate: "진단일",
    currentTreatment: "현재 치료",
    preferredTreatment: "선호 치료 방법",
    medicalRecords: "의료 기록",
    uploadHint: "검사 결과, 영상, 의사 소견서를 업로드하세요 (PDF, JPG, PNG)",
    budget: "예산 범위",
    budgetMin: "최소",
    budgetMax: "최대",
    currency: "통화",
    travelEarliest: "가장 빠른 출발일",
    travelLatest: "가장 늦은 출발일",
    flexibleDates: "일정 유동적",
    language: "선호 소통 언어",
    consent: "개인정보 및 의료정보 처리에 동의합니다",
    consentDetail: "귀하의 데이터는 국제 의료정보 보안 표준에 따라 암호화되어 보호됩니다.",
    next: "다음",
    back: "이전",
    submit: "신청서 제출",
    success: "신청이 완료되었습니다! 코디네이터가 24시간 내에 연락드리겠습니다.",
    required: "필수 입력",
    none: "없음",
    chemo: "항암화학요법",
    radiation: "방사선 치료",
    surgery: "수술",
    immunotherapy: "면역요법",
    stomach: "위암",
    liver: "간암",
    lung: "폐암",
    breast: "유방암",
    thyroid: "갑상선암",
    other: "기타",
    unknown: "미상",
    additionalNotes: "추가 메모",
    additionalNotesHint: "증상, 우려사항 또는 질문을 기술해 주세요",
  },
};

const CANCER_TYPES = ["stomach", "liver", "lung", "breast", "thyroid", "other"];
const CANCER_STAGES = ["I", "II", "III", "IV", "unknown"];
const TREATMENT_TYPES = ["none", "chemo", "radiation", "surgery", "immunotherapy"];
const CURRENCIES = ["USD", "KZT", "KRW"];
const TOTAL_STEPS = 4;

export default function IntakePage() {
  const router = useRouter();
  const [lang, setLang] = useState("en");
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [form, setForm] = useState({
    cancerType: "",
    cancerStage: "",
    diagnosisDate: "",
    currentTreatment: "",
    additionalNotes: "",
    preferredTreatments: [],
    budgetMin: "",
    budgetMax: "",
    budgetCurrency: "USD",
    travelEarliest: "",
    travelLatest: "",
    flexibleDates: false,
    languagePreference: "ru",
    consent: false,
  });

  useEffect(() => {
    const code = getLangCodeFromCookie();
    if (LABELS[code]) setLang(code);
    else if (code === "ja" || code === "zh") setLang("en");
  }, []);

  const L = LABELS[lang] || LABELS.en;

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const togglePreferredTreatment = (t) => {
    setForm((prev) => ({
      ...prev,
      preferredTreatments: prev.preferredTreatments.includes(t)
        ? prev.preferredTreatments.filter((x) => x !== t)
        : [...prev.preferredTreatments, t],
    }));
  };

  const canProceed = () => {
    if (step === 1) return form.cancerType !== "";
    if (step === 3) return true;
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
      if (result.ok) {
        setIsSubmitted(true);
      } else {
        console.error("[IntakePage] Submit error:", result.error);
        alert(result.error || "Submit failed");
      }
    } catch (error) {
      console.error("[IntakePage] Exception:", error);
      alert("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 성공 화면
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md mx-auto text-center bg-white rounded-2xl shadow-lg p-8">
          <CheckCircle2 size={64} className="text-teal-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-3">{L.success}</h2>
          <button
            onClick={() => router.push("/")}
            className="mt-6 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition font-medium"
          >
            {L.back} → {L["nav.home"] || "Home"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{L.title}</h1>
          <p className="text-gray-500 mt-2">{L.subtitle}</p>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center justify-between mb-8 px-4">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition ${
                  s <= step
                    ? "bg-teal-600 text-white"
                    : "bg-gray-200 text-gray-400"
                }`}
              >
                {s}
              </div>
              {s < 4 && (
                <div
                  className={`flex-1 h-1 mx-2 rounded ${
                    s < step ? "bg-teal-500" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Labels */}
        <div className="flex justify-between mb-6 px-2">
          {[L.step1, L.step2, L.step3, L.step4].map((label, i) => (
            <span
              key={i}
              className={`text-xs text-center flex-1 ${
                i + 1 === step ? "text-teal-600 font-semibold" : "text-gray-400"
              }`}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
          {/* Step 1: Disease Info */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {L.cancerType} <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {CANCER_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => updateField("cancerType", type)}
                      className={`px-4 py-3 rounded-lg border text-sm font-medium transition ${
                        form.cancerType === type
                          ? "border-teal-500 bg-teal-50 text-teal-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {L[type]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {L.cancerStage}
                </label>
                <div className="flex gap-2 flex-wrap">
                  {CANCER_STAGES.map((stage) => (
                    <button
                      key={stage}
                      type="button"
                      onClick={() => updateField("cancerStage", stage)}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition ${
                        form.cancerStage === stage
                          ? "border-teal-500 bg-teal-50 text-teal-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {stage === "unknown" ? L.unknown : `Stage ${stage}`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {L.diagnosisDate}
                </label>
                <input
                  type="date"
                  value={form.diagnosisDate}
                  onChange={(e) => updateField("diagnosisDate", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {L.currentTreatment}
                </label>
                <select
                  value={form.currentTreatment}
                  onChange={(e) => updateField("currentTreatment", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">{L.none}</option>
                  {TREATMENT_TYPES.filter((t) => t !== "none").map((t) => (
                    <option key={t} value={t}>{L[t]}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Treatment Preferences */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {L.preferredTreatment}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {["surgery", "chemo", "radiation", "immunotherapy"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => togglePreferredTreatment(t)}
                      className={`px-4 py-3 rounded-lg border text-sm font-medium transition ${
                        form.preferredTreatments.includes(t)
                          ? "border-teal-500 bg-teal-50 text-teal-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {L[t]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {L.medicalRecords}
                </label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-teal-300 transition cursor-pointer">
                  <Upload size={32} className="text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">{L.uploadHint}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {L.additionalNotes}
                </label>
                <textarea
                  value={form.additionalNotes}
                  onChange={(e) => updateField("additionalNotes", e.target.value)}
                  placeholder={L.additionalNotesHint}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 3: Logistics & Budget */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {L.budget}
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="number"
                    placeholder={L.budgetMin}
                    value={form.budgetMin}
                    onChange={(e) => updateField("budgetMin", e.target.value)}
                    className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <input
                    type="number"
                    placeholder={L.budgetMax}
                    value={form.budgetMax}
                    onChange={(e) => updateField("budgetMax", e.target.value)}
                    className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <select
                    value={form.budgetCurrency}
                    onChange={(e) => updateField("budgetCurrency", e.target.value)}
                    className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {L.travelEarliest}
                  </label>
                  <input
                    type="date"
                    value={form.travelEarliest}
                    onChange={(e) => updateField("travelEarliest", e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {L.travelLatest}
                  </label>
                  <input
                    type="date"
                    value={form.travelLatest}
                    onChange={(e) => updateField("travelLatest", e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.flexibleDates}
                  onChange={(e) => updateField("flexibleDates", e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm text-gray-700">{L.flexibleDates}</span>
              </label>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {L.language}
                </label>
                <select
                  value={form.languagePreference}
                  onChange={(e) => updateField("languagePreference", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="ru">Русский</option>
                  <option value="kz">Қазақша</option>
                  <option value="en">English</option>
                  <option value="ko">한국어</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {step === 4 && (
            <div className="space-y-5">
              {/* Summary */}
              <div className="bg-gray-50 rounded-xl p-5 space-y-3">
                <h3 className="font-semibold text-gray-900">{L.step1}</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-gray-500">{L.cancerType}:</span>
                  <span className="font-medium">{L[form.cancerType] || form.cancerType}</span>
                  <span className="text-gray-500">{L.cancerStage}:</span>
                  <span className="font-medium">{form.cancerStage || "-"}</span>
                  <span className="text-gray-500">{L.currentTreatment}:</span>
                  <span className="font-medium">{L[form.currentTreatment] || L.none}</span>
                </div>

                <h3 className="font-semibold text-gray-900 pt-3">{L.step3}</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-gray-500">{L.budget}:</span>
                  <span className="font-medium">
                    {form.budgetMin || "–"} ~ {form.budgetMax || "–"} {form.budgetCurrency}
                  </span>
                  <span className="text-gray-500">{L.language}:</span>
                  <span className="font-medium">{form.languagePreference}</span>
                </div>
              </div>

              {/* Consent */}
              <div className="bg-teal-50 rounded-xl p-5 border border-teal-200">
                <div className="flex items-start gap-3">
                  <Shield size={20} className="text-teal-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.consent}
                        onChange={(e) => updateField("consent", e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span className="text-sm font-medium text-gray-900">{L.consent}</span>
                    </label>
                    <p className="text-xs text-teal-700 mt-2 ml-8">{L.consentDetail}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            {step > 1 ? (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="flex items-center gap-2 px-5 py-3 text-gray-600 hover:text-gray-900 font-medium transition"
              >
                <ChevronLeft size={18} /> {L.back}
              </button>
            ) : (
              <div />
            )}

            {step < TOTAL_STEPS ? (
              <button
                onClick={() => canProceed() && setStep((s) => s + 1)}
                disabled={!canProceed()}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition ${
                  canProceed()
                    ? "bg-teal-600 text-white hover:bg-teal-700"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                {L.next} <ChevronRight size={18} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!form.consent || isSubmitting}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition ${
                  form.consent && !isSubmitting
                    ? "bg-teal-600 text-white hover:bg-teal-700"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                {isSubmitting ? L["common.loading"] || "..." : L.submit}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
