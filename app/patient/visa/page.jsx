import { redirect } from 'next/navigation';

export const metadata = {
  title: "Medical Visa Guide",
  alternates: { canonical: "/visa" },
};

export default function PatientVisaPage() {
  redirect('/visa');
}
