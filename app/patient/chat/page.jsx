export const metadata = {
  title: 'AI Health Consultation',
  description: 'Chat with HEALO AI for medical tourism guidance.',
  robots: { index: false, follow: false },
};

import PatientChatClient from './PatientChatClient';

export default function PatientChatPage() {
  return <PatientChatClient />;
}
