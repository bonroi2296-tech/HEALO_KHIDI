import { redirect } from 'next/navigation';

export const metadata = {
  title: "Patient Education",
  alternates: { canonical: "/education" },
};

export default function PatientEducationPage() {
  redirect('/education');
}
