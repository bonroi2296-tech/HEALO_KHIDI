"use client";

import { useState, useMemo } from "react";
import {
  ChevronLeft, ChevronRight, Shield, Clock, ArrowRight,
  AlertCircle, UploadCloud, File, X, Check, MessageCircle,
  Heart, Brain, Bone, Eye, Smile, Pill, Activity, Stethoscope,
  Sun, Sparkles, Search, Zap, Scale
} from "lucide-react";
import { getPrivacyPolicyText, getTermsPolicyText } from "@/lib/policies";
import { PolicyModal } from "@/components/Modals";
import { useToast } from "@/components/Toast";
import { getLangCodeFromCookie, t } from "@/lib/i18n";
import { useLang } from "@/lib/i18n/LangContext";
import { event } from "@/lib/ga";

const CONCERNS = [
  { value: "chronic-fatigue-low-immunity", label: "Fatigue / Low Immunity", icon: Zap, color: "text-amber-600 bg-amber-50" },
  { value: "digestive-problems", label: "Digestive Issues", icon: Activity, color: "text-orange-600 bg-orange-50" },
  { value: "sleep-disorder-insomnia", label: "Sleep / Insomnia", icon: Moon, color: "text-indigo-600 bg-indigo-50" },
  { value: "stress-related-symptoms", label: "Stress Symptoms", icon: Brain, color: "text-purple-600 bg-purple-50" },
  { value: "hormonal-imbalance", label: "Hormonal Imbalance", icon: Heart, color: "text-pink-600 bg-pink-50" },
  { value: "post-illness-recovery", label: "Post-illness Recovery", icon: Pill, color: "text-teal-600 bg-teal-50" },
  { value: "pain-management", label: "Pain (Neck/Back/Joints)", icon: Bone, color: "text-red-600 bg-red-50" },
  { value: "digestive-weight-management", label: "Digestive & Weight Management", icon: Scale, color: "text-amber-600 bg-amber-50" },
  { value: "skin-problem", label: "Skin Problem", icon: Sun, color: "text-yellow-600 bg-yellow-50" },
  { value: "dental-problem", label: "Dental Problem", icon: Smile, color: "text-cyan-600 bg-cyan-50" },
  { value: "vision-eye-problem", label: "Vision / Eye Problem", icon: Eye, color: "text-blue-600 bg-blue-50" },
  { value: "cosmetic-aesthetic", label: "Cosmetic / Aesthetic", icon: Sparkles, color: "text-fuchsia-600 bg-fuchsia-50" },
  { value: "general-health-checkup", label: "Health Check-up", icon: Stethoscope, color: "text-emerald-600 bg-emerald-50" },
  { value: "abnormal-test-suspected-cancer", label: "Abnormal Test / Cancer", icon: Search, color: "text-rose-600 bg-rose-50" },
  { value: "unexplained-chronic-symptoms", label: "Unexplained Symptoms", icon: AlertCircle, color: "text-gray-600 bg-gray-50" },
  { value: "other-medical-concern", label: "Other Concern", icon: Stethoscope, color: "text-slate-600 bg-slate-50" },
];

function Moon(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
    </svg>
  );
}

const NATIONALITIES = [
  "United States", "Japan", "China", "South Korea", "United Kingdom",
  "Canada", "Australia", "Germany", "France", "Singapore",
  "Thailand", "Vietnam", "Indonesia", "Philippines", "India",
  "Russia", "Brazil", "Mexico", "UAE", "Saudi Arabia", "Other",
];

const LANGUAGES = [
  "English", "Japanese", "Chinese (Mandarin)", "Korean", "Vietnamese",
  "Thai", "Indonesian", "Russian", "Arabic", "Spanish", "French", "German", "Other",
];

const URGENCY_OPTIONS = [
  { value: "flexible", label: "Flexible — no rush", desc: "I can wait for the best option" },
  { value: "1-2months", label: "1-2 months", desc: "Planning ahead" },
  { value: "2-4weeks", label: "2-4 weeks", desc: "Fairly soon" },
  { value: "asap", label: "As soon as possible", desc: "Urgent need" },
];

const MESSAGE_GUIDES = {
  "pain-management": ["Where exactly is the pain?", "Does it worsen at a specific time?", "Any previous treatment tried?"],
  "skin-problem": ["When did it first appear?", "Which area is affected?", "Any known triggers?"],
  "dental-problem": ["Which tooth or area?", "Is there pain or sensitivity?", "When was your last dental visit?"],
  "cosmetic-aesthetic": ["Which area are you considering?", "Have you had any prior procedures?", "What result are you hoping for?"],
  "abnormal-test-suspected-cancer": ["What type of test showed abnormal results?", "When was the test done?", "Have you consulted a specialist?"],
  _default: ["What symptom or concern do you have?", "How long has it lasted?", "Any previous diagnosis or treatment?"],
};

export function InquiryFormB({ setView, treatments: _treatments }) {
  const toast = useToast();
  const langCode = useLang();
  const [step, setStep] = useState(1);
  const [activeModal, setActiveModal] = useState(null);

  const [form, setForm] = useState({
    concern: "",
    urgency: "flexible",
    message: "",
    file: null,
    firstName: "", lastName: "",
    email: "",
    contactMethod: "", contactId: "",
    nationality: "", spokenLanguage: "",
    privacyAgreed: false,
  });

  const [emailError, setEmailError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const sessionId = useMemo(() => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }, []);

  const guides = MESSAGE_GUIDES[form.concern] || MESSAGE_GUIDES._default;

  const canProceedStep1 = !!form.concern;
  const canProceedStep2 = !!form.message.trim();
  const hasContact = form.email?.trim() || (form.contactMethod && form.contactId?.trim());
  const canSubmit = hasContact && form.nationality && form.spokenLanguage && form.privacyAgreed;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setForm((p) => ({ ...p, file }));
  };

  const handleSubmit = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (form.email && !emailRegex.test(form.email)) {
      toast.error(t("inquiry.errorEmail", langCode));
      setEmailError(t("inquiry.errorEmailShort", langCode));
      return;
    }
    if (!canSubmit) {
      toast.error(t("inquiry.errorRequired", langCode));
      return;
    }

    setSubmitting(true);
    try {
      let attachmentPath = null;
      let attachmentsList = [];
      if (form.file) {
        const uploadForm = new FormData();
        uploadForm.append("file", form.file);
        const uploadRes = await fetch("/api/attachments/upload", { method: "POST", body: uploadForm });
        const uploadResult = await uploadRes.json();
        if (!uploadResult.ok) throw new Error(uploadResult.error || t("inquiry.uploadFailed", langCode));
        attachmentPath = uploadResult.path;
        attachmentsList = [{ path: uploadResult.path, name: uploadResult.name, type: uploadResult.type || null }];
      }

      const urgencyToDate = () => {
        if (form.urgency === "flexible") return null;
        const d = new Date();
        if (form.urgency === "asap") d.setDate(d.getDate() + 7);
        else if (form.urgency === "2-4weeks") d.setDate(d.getDate() + 21);
        else if (form.urgency === "1-2months") d.setDate(d.getDate() + 45);
        return d.toISOString().split("T")[0];
      };

      const res = await fetch("/api/inquiries/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName || null,
          lastName: form.lastName || null,
          email: form.email || null,
          nationality: form.nationality,
          spokenLanguage: form.spokenLanguage,
          contactMethod: form.contactMethod || null,
          contactId: form.contactId || null,
          treatmentType: form.concern,
          preferredDate: urgencyToDate(),
          preferredDateFlex: form.urgency === "flexible",
          message: form.message || null,
          attachment: attachmentPath,
          attachments: attachmentsList,
          metadata: { form_variant: "B", urgency: form.urgency, session_id: sessionId },
        }),
      });

      const result = await res.json();
      if (!result.ok) {
        throw new Error(result.detail || result.error || "Failed to submit");
      }

      const inquiryId = result.inquiryId;
      const publicToken = result.publicToken;

      if (inquiryId) {
        fetch("/api/inquiry/normalize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inquiry_id: inquiryId, source_type: "inquiry_form", source_inquiry_id: inquiryId }),
        }).catch(() => {});

        fetch("/api/inquiries/event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventType: "step1_submitted", inquiryId }),
        }).catch(() => {});
      }

      if (typeof window !== "undefined" && inquiryId != null && publicToken != null) {
        try { sessionStorage.setItem("inquiry_success", JSON.stringify({ inquiryId, publicToken: String(publicToken) })); } catch {}
      }

      const submitLang = getLangCodeFromCookie();
      if (submitLang) {
        event("submit_inquiry", { source_type: "inquiry_form_B", treatment_slug: form.concern, lang: submitLang });
      }

      setView("success");
    } catch (error) {
      toast.error(error.message || t("inquiry.failedSubmit", langCode));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : setView("select")}
            className="flex items-center text-sm font-bold text-gray-500 hover:text-teal-600 transition"
          >
            <ChevronLeft size={16} /> {t("inquiry.back", langCode)}
          </button>
          <span className="text-xs text-gray-400">{t("inquiry.step", langCode)} {step} / 3</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      {/* Step 1: Concern Selection */}
      {step === 1 && (
        <div className="animate-in fade-in slide-in-from-right-4">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t("inquiry.step1Heading", langCode)}</h2>
            <p className="text-gray-500 text-sm">{t("inquiry.step1Subline", langCode)}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-6">
            {CONCERNS.map((c) => {
              const Icon = c.icon;
              const selected = form.concern === c.value;
              return (
                <button
                  key={c.value}
                  onClick={() => setForm((p) => ({ ...p, concern: c.value }))}
                  className={`relative flex flex-col items-center gap-2 p-3.5 rounded-xl border-2 transition-all text-center ${
                    selected
                      ? "border-teal-500 bg-teal-50 shadow-md"
                      : "border-gray-100 bg-white hover:border-gray-300 hover:shadow-sm"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.color}`}>
                    <Icon size={20} />
                  </div>
                  <span className={`text-xs font-medium leading-tight ${selected ? "text-teal-800" : "text-gray-700"}`}>
                    {c.label}
                  </span>
                  {selected && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center">
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Urgency */}
          {form.concern && (
            <div className="mb-6">
              <label className="block text-xs font-bold text-gray-700 mb-2">{t("inquiry.howSoon", langCode)}</label>
              <div className="grid grid-cols-2 gap-2">
                {URGENCY_OPTIONS.map((u) => (
                  <button
                    key={u.value}
                    onClick={() => setForm((p) => ({ ...p, urgency: u.value }))}
                    className={`p-3 rounded-xl border-2 text-left transition ${
                      form.urgency === u.value
                        ? "border-teal-500 bg-teal-50"
                        : "border-gray-100 hover:border-gray-300"
                    }`}
                  >
                    <div className={`text-sm font-medium ${form.urgency === u.value ? "text-teal-800" : "text-gray-800"}`}>
                      {u.label}
                    </div>
                    <div className="text-[11px] text-gray-500">{u.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => canProceedStep1 && setStep(2)}
            disabled={!canProceedStep1}
            className="w-full py-3.5 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {t("inquiry.continue", langCode)} <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Step 2: Details */}
      {step === 2 && (
        <div className="animate-in fade-in slide-in-from-right-4">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t("inquiry.step2Heading", langCode)}</h2>
            <p className="text-gray-500 text-sm">{t("inquiry.step2Subline", langCode)}</p>
          </div>

          {/* Guide prompts */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4">
            <p className="text-xs font-bold text-blue-700 mb-2">{t("inquiry.considerMentioning", langCode)}</p>
            <ul className="space-y-1">
              {guides.map((g, i) => (
                <li key={i} className="text-xs text-blue-600 flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">•</span> {g}
                </li>
              ))}
            </ul>
          </div>

          <textarea
            value={form.message}
            onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
            className="w-full border border-gray-200 p-4 rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition text-sm bg-white resize-y min-h-[140px]"
            rows="6"
            placeholder={t("inquiry.messagePlaceholder", langCode)}
            autoFocus
          />

          {/* File upload */}
          <div className="mt-4">
            <input type="file" id="formBFile" className="hidden" onChange={handleFileChange} />
            {form.file ? (
              <div className="flex items-center justify-between border border-teal-200 bg-teal-50 rounded-xl p-3">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="bg-teal-100 p-1.5 rounded-lg text-teal-600 shrink-0"><File size={16} /></div>
                  <span className="text-xs font-bold text-teal-800 truncate">{form.file.name}</span>
                </div>
                <button onClick={() => setForm((p) => ({ ...p, file: null }))} className="p-1 hover:bg-teal-100 rounded-full text-teal-500"><X size={16} /></button>
              </div>
            ) : (
              <div
                onClick={() => document.getElementById("formBFile")?.click()}
                className="border border-dashed border-gray-300 rounded-xl p-3 text-center hover:bg-gray-50 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <UploadCloud className="text-gray-400" size={18} />
                <span className="text-xs text-gray-500">{t("inquiry.uploadOptional", langCode)}</span>
              </div>
            )}
          </div>

          <button
            onClick={() => setStep(3)}
            disabled={!canProceedStep2}
            className="w-full mt-6 py-3.5 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {t("inquiry.continue", langCode)} <ChevronRight size={18} />
          </button>

          <button
            onClick={() => setStep(3)}
            className="w-full mt-2 py-2 text-gray-400 text-sm hover:text-gray-600 transition"
          >
            {t("inquiry.skipForNow", langCode)}
          </button>
        </div>
      )}

      {/* Step 3: Contact */}
      {step === 3 && (
        <div className="animate-in fade-in slide-in-from-right-4">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t("inquiry.step3Heading", langCode)}</h2>
            <p className="text-gray-500 text-sm">{t("inquiry.step3Subline", langCode)}</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
            {/* Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">{t("inquiry.firstName", langCode)}</label>
                <input
                  type="text" value={form.firstName}
                  onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                  className="w-full p-3 rounded-xl border border-gray-200 focus:border-teal-500 outline-none text-sm bg-gray-50/50"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">{t("inquiry.lastName", langCode)}</label>
                <input
                  type="text" value={form.lastName}
                  onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                  className="w-full p-3 rounded-xl border border-gray-200 focus:border-teal-500 outline-none text-sm bg-gray-50/50"
                  placeholder="Doe"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                {t("inquiry.email", langCode)} <span className="text-red-500">*</span>
              </label>
              <input
                type="email" value={form.email}
                onChange={(e) => {
                  setForm((p) => ({ ...p, email: e.target.value }));
                  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                  setEmailError(e.target.value && !emailRegex.test(e.target.value) ? t("inquiry.errorEmailShort", langCode) : "");
                }}
                className={`w-full p-3 rounded-xl border ${emailError ? "border-red-400" : "border-gray-200"} focus:border-teal-500 outline-none text-sm bg-gray-50/50`}
                placeholder="your@email.com"
              />
              {emailError && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={12} />{emailError}</p>}
            </div>

            {/* Messenger */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                <MessageCircle size={12} /> {t("inquiry.messengerOptional", langCode)}
              </label>
              <div className="flex gap-2">
                <select
                  value={form.contactMethod}
                  onChange={(e) => setForm((p) => ({ ...p, contactMethod: e.target.value }))}
                  className="w-[40%] p-3 rounded-xl border border-gray-200 focus:border-teal-500 outline-none text-sm bg-gray-50"
                >
                  <option value="">{t("inquiry.select", langCode)}</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="LINE">LINE</option>
                  <option value="WeChat">WeChat</option>
                  <option value="KakaoTalk">KakaoTalk</option>
                </select>
                {form.contactMethod && (
                  <input
                    type="text" value={form.contactId}
                    onChange={(e) => setForm((p) => ({ ...p, contactId: e.target.value }))}
                    className="flex-1 p-3 rounded-xl border border-gray-200 focus:border-teal-500 outline-none text-sm"
                    placeholder={t("inquiry.idOrPhone", langCode)}
                  />
                )}
              </div>
            </div>

            {/* Nationality & Language */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">{t("inquiry.nationality", langCode)} <span className="text-red-500">*</span></label>
                <select
                  value={form.nationality}
                  onChange={(e) => setForm((p) => ({ ...p, nationality: e.target.value }))}
                  className="w-full p-3 rounded-xl border border-gray-200 focus:border-teal-500 outline-none text-sm bg-gray-50"
                >
                  <option value="">{t("inquiry.select", langCode)}</option>
                  {NATIONALITIES.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">{t("inquiry.spokenLanguage", langCode)} <span className="text-red-500">*</span></label>
                <select
                  value={form.spokenLanguage}
                  onChange={(e) => setForm((p) => ({ ...p, spokenLanguage: e.target.value }))}
                  className="w-full p-3 rounded-xl border border-gray-200 focus:border-teal-500 outline-none text-sm bg-gray-50"
                >
                  <option value="">{t("inquiry.select", langCode)}</option>
                  {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>

            {/* Privacy */}
            <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
              <input
                type="checkbox" id="privacyB" checked={form.privacyAgreed}
                onChange={(e) => setForm((p) => ({ ...p, privacyAgreed: e.target.checked }))}
                className="mt-0.5 h-4 w-4 cursor-pointer accent-teal-600"
              />
              <label htmlFor="privacyB" className="text-[11px] text-gray-500 cursor-pointer select-none leading-snug">
                {t("inquiry.agreePrivacyAndTerms", langCode)}{" "}
                <span onClick={(e) => { e.preventDefault(); setActiveModal("privacy"); }} className="text-teal-600 font-bold hover:underline">
                  {t("policy.privacyTitle", langCode)}
                </span> {t("inquiry.and", langCode)} <span onClick={(e) => { e.preventDefault(); setActiveModal("terms"); }} className="text-teal-600 font-bold hover:underline">{t("policy.termsTitle", langCode)}</span>. <span className="text-red-500">*</span>
              </label>
            </div>
          </div>

          {/* Trust signals */}
          <div className="flex items-center justify-center gap-6 mt-4 text-[11px] text-gray-400">
            <span className="flex items-center gap-1"><Shield size={12} /> {t("inquiry.encryptedSecure", langCode)}</span>
            <span className="flex items-center gap-1"><Clock size={12} /> {t("inquiry.reply24h", langCode)}</span>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full mt-5 py-4 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-lg shadow-teal-100 flex items-center justify-center gap-2"
          >
            {submitting ? t("inquiry.submitting", langCode) : (
              <>{t("inquiry.submitInquiry", langCode)} <ArrowRight size={18} /></>
            )}
          </button>
        </div>
      )}

      <PolicyModal isOpen={activeModal === "privacy"} onClose={() => setActiveModal(null)} title={t("policy.privacyTitle", langCode)} content={getPrivacyPolicyText(langCode)} closeLabel={t("policy.close", langCode)} />
      <PolicyModal isOpen={activeModal === "terms"} onClose={() => setActiveModal(null)} title={t("policy.termsTitle", langCode)} content={getTermsPolicyText(langCode)} closeLabel={t("policy.close", langCode)} />
    </div>
  );
}
