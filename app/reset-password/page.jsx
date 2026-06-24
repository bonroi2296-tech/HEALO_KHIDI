import ResetPasswordClient from "./ResetPasswordClient";

export const metadata = {
  title: "Reset password | healwith",
  description: "Set a new password for your healwith account.",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return <ResetPasswordClient />;
}
