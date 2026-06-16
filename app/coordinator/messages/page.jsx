import CoordinatorMessagesClient from "./CoordinatorMessagesClient";

export const metadata = {
  title: "Patient Messages | healwith Coordinator",
  description: "Reply to patient inquiries and ongoing conversations.",
  robots: { index: false, follow: false },
};

export default function CoordinatorMessagesPage() {
  return <CoordinatorMessagesClient />;
}
