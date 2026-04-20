import { Suspense } from "react";
import { cookies } from "next/headers";
import IntakeLegacy from "./IntakeLegacy";
import IntakePremium from "./IntakePremium";
import { getServerDesignMode } from "../../src/lib/designMode";

export const metadata = {
  title: "Consultation Request | HEALO",
  description:
    "Share your diagnosis and care preferences. We respond within one business day.",
  alternates: { canonical: "/intake" },
};

export default async function IntakePage({ searchParams }) {
  const sp = (await searchParams) || {};
  const ck = await cookies();
  const mode = getServerDesignMode({ searchParams: sp, cookies: ck });
  const Client = mode === "legacy" ? IntakeLegacy : IntakePremium;
  return (
    <Suspense>
      <Client />
    </Suspense>
  );
}
