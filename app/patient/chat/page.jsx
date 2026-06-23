import PatientChatClient from "./PatientChatClient";

export const metadata = {
  title: "AI Health Consultation",
  description: "Chat with healwith AI for medical tourism guidance.",
  robots: { index: false, follow: false },
};

export default function PatientChatPage() {
  return <PatientChatClient />;
}
