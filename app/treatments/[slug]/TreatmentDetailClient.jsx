"use client";

import { useRouter } from "next/navigation";
import { TreatmentDetailPage } from "./TreatmentDetailLegacyClient";

export default function TreatmentDetailClient({ id }) {
  const router = useRouter();

  return (
    <TreatmentDetailPage
      selectedId={id}
      setView={(view) => {
        if (view === "home") router.push("/");
        if (view === "list_treatment") router.push("/treatments");
        if (view === "list_hospital") router.push("/hospitals");
        if (view === "inquiry") router.push("/inquiry");
      }}
      setInquiryMode={() => {}}
      onHospitalClick={(hid) => router.push(`/hospitals/${hid}`)}
      onTreatmentClick={(tid) => router.push(`/treatments/${tid}`)}
    />
  );
}
