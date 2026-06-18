"use client";

import { t } from "@/lib/i18n";
import { useLang } from "@/lib/i18n/LangContext";

export default function CookiePolicyClient() {
  const langCode = useLang(); // 서버가 URL 언어로 렌더(SEO). 쿠키 직독 대신 LangContext.

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
