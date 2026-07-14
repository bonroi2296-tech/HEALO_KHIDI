import ForgotPasswordClient from "./ForgotPasswordClient";

export const metadata = {
  title: "Forgot password",
  description: "Request a password reset link for your healwith account.",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordClient />;
}
