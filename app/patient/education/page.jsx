import EducationClient from './EducationClient';

export const metadata = {
  title: "Patient Education",
  description:
    "Cancer-specific education content for post-treatment care. Medication guides, diet plans, exercise routines, warning signs, and mental health support in 6 languages.",
  keywords: ["cancer education", "post-treatment care", "patient guide", "cancer recovery"],
  openGraph: {
    title: "Patient Education | HEALO",
    description: "Cancer-specific education content for post-treatment care in 6 languages.",
  },
  twitter: {
    card: "summary",
    title: "Patient Education | HEALO",
    description: "Cancer-specific education content for post-treatment care.",
  },
  alternates: { canonical: "/patient/education" },
};

export default function PatientEducationPage() {
  return <EducationClient />;
}
