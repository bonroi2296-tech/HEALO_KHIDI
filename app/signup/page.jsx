import { cookies } from "next/headers";
import SignupPremium from "./SignupPremium";
import SignupLegacyWrapper from "./SignupLegacyWrapper";
import { getServerDesignMode } from "../../src/lib/designMode";

export const metadata = {
  title: "Sign up | HEALO",
  description: "Create your HEALO account to start your medical care journey.",
  robots: { index: false, follow: false },
};

export default async function SignUp({ searchParams }) {
  const sp = (await searchParams) || {};
  const ck = await cookies();
  const mode = getServerDesignMode({ searchParams: sp, cookies: ck });
  return mode === "legacy" ? <SignupLegacyWrapper /> : <SignupPremium />;
}
