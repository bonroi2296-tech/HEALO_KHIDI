import EducationClient from "../patient/education/EducationClient";
import { localeAlternates } from "@/lib/i18n/metadata";

// 페이지가 openGraph 를 정의하면 layout 의 og 가 통째로 대체된다 → og:url 도 여기서 넣어야 한다.
export async function generateMetadata() {
  const alt = await localeAlternates();
  return {
    ...baseMeta,
    ...(alt ? { alternates: alt } : {}),
    openGraph: { ...baseMeta.openGraph, ...(alt ? { url: alt.canonical } : {}) },
  };
}

const baseMeta = {
  title: "Patient Education",
  description:
    "Cancer-specific education content for post-treatment care. Medication guides, diet plans, exercise routines, warning signs, and mental health support in 6 languages.",
  keywords: ["cancer education", "post-treatment care", "patient guide", "cancer recovery"],
  openGraph: {
    title: "Cancer Treatment Guide | healwith",
    description: "Cancer-specific education content for post-treatment care in 6 languages.",
  },
  twitter: {
    card: "summary",
    title: "Cancer Treatment Guide | healwith",
    description: "Cancer-specific education content for post-treatment care.",
  },
};

export default function PublicEducationPage() {
  return <EducationClient />;
}
