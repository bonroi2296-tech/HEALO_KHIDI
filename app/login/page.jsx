import { cookies } from "next/headers";
import LoginPremium from "./LoginPremium";
import LoginLegacyWrapper from "./LoginLegacyWrapper";
import { getServerDesignMode } from "@/lib/designMode";

export const metadata = {
  title: "Sign in | healwith",
  description: "Sign in to your healwith patient dashboard.",
  robots: { index: false, follow: false },
};

export default async function Login({ searchParams }) {
  const sp = (await searchParams) || {};
  const ck = await cookies();
  const mode = getServerDesignMode({ searchParams: sp, cookies: ck });
  return mode === "legacy" ? <LoginLegacyWrapper /> : <LoginPremium />;
}
