import ConfirmClient from "./ConfirmClient";

export const metadata = {
  title: "Confirm",
  description: "Confirm your healwith account.",
  robots: { index: false, follow: false },
};

export default function ConfirmPage() {
  return <ConfirmClient />;
}
