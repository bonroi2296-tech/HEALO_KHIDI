import ContactClient from "./_client/ContactClient";

export const metadata = {
  title: "Contact Us | HEALO",
  description:
    "Get in touch with HEALO for medical concierge inquiries, partnership opportunities, or general questions.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return <ContactClient />;
}
