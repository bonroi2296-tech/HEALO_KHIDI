"use client";

import HospitalPage from "@/components/hospital-template/HospitalPage";

export default function HospitalPageClient({ site, page, slug, lang }) {
  return (
    <HospitalPage
      site={site}
      page={page}
      slug={slug}
      lang={lang}
      basePath="/demo/hospital"
      onInquiry={() => {
        const wa = site?.contact?.channels?.whatsapp;
        if (wa) window.open(wa, "_blank", "noopener");
      }}
    />
  );
}
