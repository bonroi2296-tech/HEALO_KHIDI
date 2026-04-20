import ImmuneHospitalClient from "./ImmuneHospitalClient";

export const metadata = {
  title: "Immune Hospital — 면력한방병원 | HEALO",
  description:
    "Immune Hospital — HEALO's direct partner. Korean Medicine immune care for cancer patients. ITCR 5-principles, 50,000+ cases, chef-led therapeutic meals. 4 branches in Seoul & Gyeonggi.",
  alternates: { canonical: "/hospitals/immune" },
  openGraph: {
    title: "Immune Hospital — Integrated cancer immune care in Korea",
    description:
      "50,000+ cancer patient cases. 5-principle ITCR protocol. Chef-led therapeutic meals. HEALO's direct partner.",
  },
};

export default function ImmuneHospitalPage() {
  return <ImmuneHospitalClient />;
}
