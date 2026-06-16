import { cookies } from "next/headers";
import CookiePolicyClient from "./CookiePolicyClient";
import CookiePolicyPremium from "./CookiePolicyPremium";
import { getServerDesignMode } from "@/lib/designMode";

export const metadata = {
  title: "Cookie Policy | healwith",
  description: "Learn about how healwith uses cookies.",
};

export default async function CookiePolicyPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const ck = await cookies();
  const mode = getServerDesignMode({ searchParams: sp, cookies: ck });
  return mode === "legacy" ? <CookiePolicyClient /> : <CookiePolicyPremium />;
}
