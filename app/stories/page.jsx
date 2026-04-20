import StoriesClient from "./StoriesClient";

export const metadata = {
  title: "Patient Stories | HEALO",
  description:
    "Real stories from international cancer patients who received treatment in Korea through HEALO. Consented and published with patient approval.",
  alternates: { canonical: "/stories" },
  openGraph: {
    title: "Patient Stories | HEALO",
    description: "Real journeys from international patients.",
  },
};

export default function StoriesPage() {
  return <StoriesClient />;
}
