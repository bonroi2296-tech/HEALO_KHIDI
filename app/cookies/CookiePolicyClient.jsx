"use client";

import { useState, useEffect } from "react";
import { getLangCodeFromCookie, t } from "@/lib/i18n";

export default function CookiePolicyClient() {
  const [langCode, setLangCode] = useState("en");

  useEffect(() => {
    setLangCode(getLangCodeFromCookie());
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">{t("cookie.title", langCode)}</h1>
      <div className="prose prose-sm text-gray-700 space-y-6">
        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            {t("cookie.essentialTitle", langCode)}
          </h2>
          <p>{t("cookie.essentialDesc", langCode)}</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            {t("cookie.analyticsTitle", langCode)}
          </h2>
          <p>{t("cookie.analyticsDesc", langCode)}</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            {t("cookie.manageTitle", langCode)}
          </h2>
          <p>{t("cookie.manageDesc", langCode)}</p>
        </section>
        <p className="text-xs text-gray-500">{t("cookie.updated", langCode)}</p>
      </div>
    </div>
  );
}
