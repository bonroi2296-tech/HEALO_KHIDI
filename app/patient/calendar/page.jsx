import CalendarClient from "./CalendarClient";

export const metadata = {
  title: "Calendar | HEALO",
  description: "Unified calendar for consultations, follow-ups, and milestones.",
  robots: { index: false, follow: false },
};

export default function CalendarPage() {
  return <CalendarClient />;
}
