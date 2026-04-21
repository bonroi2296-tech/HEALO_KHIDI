import StoriesClient from "./StoriesClient";

export const metadata = {
  title: "Patient Stories | HEALO",
  description:
    "Real stories from international cancer patients who received treatment in Korea through HEALO. Consented and published with patient approval.",
  keywords: ["cancer patient stories", "Korea cancer treatment testimonials", "medical tourism Korea reviews", "암환자 후기"],
  alternates: { canonical: "/stories" },
  openGraph: {
    title: "Patient Stories | HEALO",
    description: "Real journeys from international cancer patients treated in Korea — consented and published with patient approval.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Patient Stories | HEALO",
    description: "Real stories from international cancer patients who received treatment in Korea.",
  },
};

export default function StoriesPage() {
  return <StoriesClient />;
}
