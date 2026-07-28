"use client";

import HospitalSite from "@/components/hospital-template/HospitalSite";

/** 시연용 껍데기 — 판은 순수 표시 컴포넌트라 «상담 누름» 동작만 여기서 붙인다. */
export default function HospitalSiteClient({ site, lang }) {
  return (
    <HospitalSite
      site={site}
      lang={lang}
      onInquiry={() => {
        const wa = site?.contact?.channels?.whatsapp;
        if (wa) window.open(wa, "_blank", "noopener");
      }}
    />
  );
}
