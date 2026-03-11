"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getLangCodeFromCookie, t } from "../../../src/lib/i18n";

export default function AboutClient() {
  const [langCode, setLangCode] = useState("en");
  useEffect(() => {
    setLangCode(getLangCodeFromCookie());
  }, []);

  return (
    <div className="bg-white">
      <div className="max-w-3xl mx-auto px-4 py-12 text-gray-800">
        <h1 className="text-3xl font-bold text-gray-900">
          {t("about.title", langCode)}
        </h1>
        <p className="text-sm text-gray-500 mt-2">
          {t("about.subtitle", langCode)}
        </p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-gray-900">
              {t("about.mission", langCode)}
            </h2>
            <p className="mt-2 text-gray-600">
              {t("about.missionDesc", langCode)}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">
              {t("about.whatWeOffer", langCode)}
            </h2>
            <ul className="mt-2 space-y-2 text-gray-600 list-disc list-inside">
              <li>{t("about.offer1", langCode)}</li>
              <li>{t("about.offer2", langCode)}</li>
              <li>{t("about.offer3", langCode)}</li>
              <li>{t("about.offer4", langCode)}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">
              {t("about.contactSection", langCode)}
            </h2>
            <p className="mt-2 text-gray-600">
              {t("about.contactDesc", langCode)}{" "}
              <Link
                href="/contact"
                className="text-teal-600 hover:text-teal-700 underline"
              >
                {t("about.contactLink", langCode)}
              </Link>
              {t("about.contactSuffix", langCode)}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
