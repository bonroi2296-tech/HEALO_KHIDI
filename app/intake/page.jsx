import { Suspense } from "react";
import IntakeLegacy from "./IntakeLegacy";
import IntakePremium from "./IntakePremium";
import { getServerDesignMode } from "../../src/lib/designMode";

export const metadata = {
  title: "Consultation Request | HEALO",
  description:
    "Share your diagnosis and care preferences. We respond within one business day.",
  alternates: { canonical: "/intake" },
};

export default function IntakePage() {
  const mode = getServerDesignMode();
  const Client = mode === "legacy" ? IntakeLegacy : IntakePremium;
  return (
    <Suspense>
      <Client />
    </Suspense>
  );
}
