import RebookingClient from './RebookingClient';

export const metadata = {
  title: "Rebooking Management",
  description:
    "Manage auto-recommended follow-up appointments. View symptom-triggered, follow-up-based, and doctor-recommended rebooking suggestions.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/patient/rebooking" },
};

export default function PatientRebookingPage() {
  return <RebookingClient />;
}
