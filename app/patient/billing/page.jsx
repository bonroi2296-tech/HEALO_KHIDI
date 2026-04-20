import BillingClient from "./BillingClient";

export const metadata = {
  title: "Billing & Payment | HEALO",
  description: "View invoices and payment instructions for your treatment.",
  robots: { index: false, follow: false },
};

export default function BillingPage() {
  return <BillingClient />;
}
