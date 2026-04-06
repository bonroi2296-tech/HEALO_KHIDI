export const metadata = {
  title: '내 진료 관리',
  description: 'Patient dashboard for managing consultations, documents, and follow-ups.',
  robots: { index: false, follow: false },
};

import PatientDashboardClient from './PatientDashboardClient';

export default function PatientPage() {
  return <PatientDashboardClient />;
}
