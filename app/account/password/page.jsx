import ChangePasswordClient from "./ChangePasswordClient";

export const metadata = {
  title: "Change password",
  description: "Change the password for your healwith account.",
  robots: { index: false, follow: false },
};

export default function ChangePasswordPage() {
  return <ChangePasswordClient />;
}
