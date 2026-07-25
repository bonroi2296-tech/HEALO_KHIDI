"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n/LangContext";
import { t } from "@/lib/i18n";

export default function VisaHubClient() {
  const lang = useLang();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{t("visaHub.title", lang)}</h1>
      <p className="text-gray-500 mt-2 text-sm">{t("visaHub.subtitle", lang)}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-10">
        <Link
          href="/patient/visa/applications"
          className="block border border-gray-200 rounded-lg p-6 bg-white hover:shadow-md transition"
        >
          <div className="text-xs text-gray-500 uppercase tracking-wide">{t("visaHub.myAppsKicker", lang)}</div>
          <h2 className="text-xl font-medium mt-2">{t("visaHub.myAppsTitle", lang)}</h2>
          <p className="text-sm text-gray-600 mt-2">{t("visaHub.myAppsDesc", lang)}</p>
          <span className="text-sm text-black mt-4 inline-block">{t("visaHub.myAppsCta", lang)}</span>
        </Link>

        <Link
          href="/visa"
          className="block border border-gray-200 rounded-lg p-6 bg-white hover:shadow-md transition"
        >
          <div className="text-xs text-gray-500 uppercase tracking-wide">{t("visaHub.guideKicker", lang)}</div>
          <h2 className="text-xl font-medium mt-2">{t("visaHub.guideTitle", lang)}</h2>
          <p className="text-sm text-gray-600 mt-2">{t("visaHub.guideDesc", lang)}</p>
          <span className="text-sm text-black mt-4 inline-block">{t("visaHub.guideCta", lang)}</span>
        </Link>
      </div>
    </div>
  );
}
