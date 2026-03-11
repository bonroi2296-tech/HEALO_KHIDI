"use client";

import { EFFECTIVE_DATE, getPrivacySections } from "../../src/lib/policies";
import { useLang } from "../../src/lib/i18n/LangContext";
import { t } from "../../src/lib/i18n";

export default function PrivacyPolicyClient() {
  const langCode = useLang();
  const sections = getPrivacySections(langCode);
  const pageTitle = t("privacy.pageTitle", langCode);
  const lastUpdated = t("policy.lastUpdated", langCode);

  return (
    <div className="bg-white">
      <div className="max-w-3xl mx-auto px-4 py-12 text-gray-800">
        <h1 className="text-3xl font-bold text-gray-900">{pageTitle}</h1>
        <p className="text-sm text-gray-500 mt-2">
          {lastUpdated}: {EFFECTIVE_DATE}
        </p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-semibold text-gray-900">
                {section.title}
              </h2>
              <div className="mt-2 space-y-3 text-gray-600">
                {section.content.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
