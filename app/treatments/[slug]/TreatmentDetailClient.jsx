"use client";

import { usePathname, useRouter } from "next/navigation";
import { localeHref, splitLocale } from "@/lib/i18n/config";
import { TreatmentDetailPage } from "./TreatmentDetailLegacyClient";

export default function TreatmentDetailClient({ id }) {
  const router = useRouter();
  // 지금 보고 있는 언어를 유지한다. 맨 주소로 보내면 쿠키 없는 검색 로봇이 영어로 튕긴다.
  const loc = splitLocale(usePathname() || "/")[0];
  const go = (p) => router.push(loc ? localeHref(p, loc) : p);

  return (
    <TreatmentDetailPage
      selectedId={id}
      setView={(view) => {
        if (view === "home") go("/");
        if (view === "list_treatment") go("/treatments");
        if (view === "list_hospital") go("/hospitals");
        if (view === "inquiry") go("/inquiry");
      }}
      setInquiryMode={() => {}}
      onHospitalClick={(hid) => go(`/hospitals/${hid}`)}
      onTreatmentClick={(tid) => go(`/treatments/${tid}`)}
    />
  );
}
