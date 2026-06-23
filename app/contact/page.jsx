import ContactClient from "./_client/ContactClient";

export const metadata = {
  title: "Contact Us | healwith",
  description:
    "Get in touch with healwith for medical concierge inquiries, partnership opportunities, or general questions about cancer treatment in Korea.",
  keywords: ["contact healwith", "Korea medical tourism inquiry", "cancer treatment inquiry Korea"],
  openGraph: {
    title: "Contact Us | healwith",
    description: "Get in touch with healwith for medical concierge inquiries, partnership opportunities, or questions about cancer treatment in Korea.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Contact Us | healwith",
    description: "Get in touch with healwith for medical concierge inquiries and questions about cancer treatment in Korea.",
  },
};

export default function ContactPage() {
  return <ContactClient />;
}
