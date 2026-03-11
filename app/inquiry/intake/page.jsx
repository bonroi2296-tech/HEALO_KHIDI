"use client";

import { Suspense } from "react";
import { InquiryIntakePage } from "./IntakeClient";
import { useRouter } from "next/navigation";

function InquiryIntakeContent() {
  const router = useRouter();
  const setView = (viewName) => {
    if (viewName === "home") router.push("/");
    else router.push("/");
  };
  return <InquiryIntakePage setView={setView} />;
}

export default function InquiryIntake() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-4 py-8">Loading...</div>}>
      <InquiryIntakeContent />
    </Suspense>
  );
}
