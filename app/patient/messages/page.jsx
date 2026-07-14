import MessagesClient from "./MessagesClient";

export const metadata = {
  title: "Messages",
  description: "Unified inbox for coordinator messages and AI assistant threads.",
  robots: { index: false, follow: false },
};

export default function MessagesPage() {
  return <MessagesClient />;
}
