import { cookies } from "next/headers";
import { SuccessPage } from "./SuccessClient";
import SuccessPremium from "./SuccessPremium";
import { getServerDesignMode } from "../../src/lib/designMode";

// Legacy fallback wrapper
function SuccessLegacy() {
  // SuccessClient expects setView callback — in Next App Router we use Link, so pass a noop
  return <SuccessPage setView={() => {}} />;
}

export default async function Success({ searchParams }) {
  const sp = (await searchParams) || {};
  const ck = await cookies();
  const mode = getServerDesignMode({ searchParams: sp, cookies: ck });
  return mode === "legacy" ? <SuccessLegacy /> : <SuccessPremium />;
}
