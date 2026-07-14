import SignupLegacyWrapper from "./SignupLegacyWrapper";

export const metadata = {
  title: "Sign up",
  description: "Create your healwith account to start your medical care journey.",
  robots: { index: false, follow: false },
};

export default function SignUp() {
  return <SignupLegacyWrapper />;
}
