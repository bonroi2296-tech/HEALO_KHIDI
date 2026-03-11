const getBaseUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default function robots() {
  const baseUrl = getBaseUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/treatments", "/hospitals", "/treatments/", "/hospitals/"],
        disallow: ["/admin", "/login", "/signup", "/inquiry"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
