"use client";

import { useRouter } from "next/navigation";
import { HospitalDetailPage } from "./HospitalDetailLegacyClient";

export default function HospitalDetailClient({ id }) {
  const router = useRouter();

  return (
    <HospitalDetailPage
      selectedId={id}
      setView={(view) => {
        if (view === "home") router.push("/");
        if (view === "list_treatment") router.push("/treatments");
        if (view === "list_hospital") router.push("/hospitals");
        if (view === "inquiry") router.push("/inquiry");
      }}
      onTreatmentClick={(tid) => router.push(`/treatments/${tid}`)}
    />
  );
}
