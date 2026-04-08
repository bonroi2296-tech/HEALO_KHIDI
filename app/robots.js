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
          "/patient/rebooking",
          "/patient/documents",
          "/api",
          "/auth",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
