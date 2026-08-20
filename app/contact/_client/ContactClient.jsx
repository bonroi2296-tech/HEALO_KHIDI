"use client";

import Link from "next/link";
import { SITE_INFO } from "@/lib/siteSettings";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/i18n/LangContext";
import { localeHref } from "@/lib/i18n/config";

export default function ContactClient() {
  const langCode = useLang(); // 서버가 URL 언어로 렌더(SEO). 쿠키 직독 대신 LangContext.

  const { legal } = SITE_INFO;

  return (
    <div className="bg-white">
      <div className="max-w-3xl mx-auto px-4 py-12 text-gray-800">
        <h1 className="text-3xl font-bold text-gray-900">
          {t("contact.title", langCode)}
        </h1>
        <p className="text-sm text-gray-500 mt-2">
          {t("contact.subtitle", langCode)}
        </p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-gray-900">
              {t("contact.general", langCode)}
            </h2>
            <p className="mt-2 text-gray-600">
              {t("contact.generalDesc", langCode)}
            </p>
            <p className="mt-1">
              <a
                href={`mailto:${legal.contactEmail}`}
                className="text-teal-700 hover:text-teal-700 underline"
              >
                {legal.contactEmail}
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">
              {t("contact.address", langCode)}
            </h2>
            <p className="mt-2 text-gray-600">
              {legal.addressLine1}
              <br />
              {legal.addressLine2}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">
              {t("contact.privacyTerms", langCode)}
            </h2>
            <p className="mt-2 text-gray-600">
              {t("contact.privacyTermsDesc", langCode)}{" "}
              <Link
                href={localeHref("/privacy", langCode)}
                className="text-teal-700 hover:text-teal-700 underline"
              >
                {t("nav.privacy", langCode)}
              </Link>
              {" "}
              <Link
                href={localeHref("/terms", langCode)}
                className="text-teal-700 hover:text-teal-700 underline"
              >
                {t("nav.terms", langCode)}
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
