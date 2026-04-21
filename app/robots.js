const getBaseUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default function robots() {
  const baseUrl = getBaseUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/treatments",
          "/hospitals",
          "/specialties",
          "/patient/education",
          "/patient/visa",
          "/about",
          "/contact",
          "/search",
        ],
        disallow: [
          "/admin",
          "/login",
          "/signup",
          "/inquiry",
          "/consultation",
          "/partner",
          "/coordinator",
          "/doctor",
          "/patient/rebooking",
          "/patient/documents",
          "/patient/consultations",
          "/patient/cost-estimates",
          "/patient/messages",
          "/patient/calendar",
          "/patient/symptoms",
          "/patient/chat",
          "/patient/visa/applications",
          "/api",
          "/auth",
          "/dev",
          "/design-preview",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
