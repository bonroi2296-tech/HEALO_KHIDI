"use client";

import { getMedicalDisclaimer } from "@/lib/legal/medicalDisclaimer";
import { useLang } from "@/lib/i18n/LangContext";

export default function MedicalDisclaimerClientLegacy() {
  const langCode = useLang();
  const disclaimer = getMedicalDisclaimer(langCode);

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-12 md:py-16">
        <header className="mb-8">
          <p className="text-xs font-mono uppercase tracking-widest text-amber-700 mb-2">
            healwith · Medical Notice
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            {disclaimer.title}
          </h1>
        </header>

        {/* Short summary — bold, prominent */}
        <div className="bg-amber-50 border-l-4 border-amber-500 p-5 mb-10 rounded-r-lg">
          <p className="text-amber-900 font-semibold text-base md:text-lg leading-relaxed">
            {disclaimer.short}
          </p>
        </div>

        {/* Full disclaimer */}
        <div className="space-y-4 text-gray-700 leading-relaxed text-sm md:text-[15px]">
          {disclaimer.full.map((paragraph, i) => (
            <p key={i} className="whitespace-pre-line">
              {paragraph}
            </p>
          ))}
        </div>

        {/* AI-specific note */}
        <div className="mt-10 bg-gray-50 border border-gray-200 rounded-lg p-5">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">AI Notice</p>
          <p className="text-sm text-gray-700 leading-relaxed">
            {disclaimer.aiNote}
          </p>
        </div>

        <footer className="mt-12 pt-8 border-t border-gray-200 text-xs text-gray-500">
          <p>
            {(() => { const t = {
              ko: "관련 법적 근거: 의료법 §27 (무면허 의료행위 금지), 의료기기법. 응급상황에서는 본 페이지의 응급 연락처 또는 각국의 응급 서비스에 즉시 연락하시기 바랍니다.",
              en: "Relevant legal basis: Medical Service Act §27 (prohibition of unlicensed medical practice), Medical Devices Act. In an emergency, contact the emergency numbers on this page or your country's emergency services immediately.",
              ru: "Правовая основа: Закон о медицинском обслуживании §27 (запрет медицинской практики без лицензии), Закон о медицинских изделиях. В экстренной ситуации немедленно обратитесь по экстренным номерам на этой странице или в службы экстренной помощи вашей страны.",
              kz: "Құқықтық негіз: Медициналық қызмет туралы заң §27 (лицензиясыз медициналық практикаға тыйым), Медициналық бұйымдар туралы заң. Төтенше жағдайда осы беттегі төтенше нөмірлерге немесе еліңіздің жедел қызметіне дереу хабарласыңыз.",
              zh: "相关法律依据：《医疗法》§27（禁止无照行医）、《医疗器械法》。紧急情况下，请立即拨打本页紧急联系电话或所在国的急救服务。",
              ja: "関連法的根拠：医療法 §27（無免許医療行為の禁止）、医療機器法。緊急時は本ページの緊急連絡先または各国の救急サービスに直ちにご連絡ください。",
            }; return t[langCode] || t.en; })()}
          </p>
        </footer>
      </div>
    </div>
  );
}
