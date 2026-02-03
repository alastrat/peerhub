import { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://peerhub-ashen.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const locales = ["es", "en"];
  const currentDate = new Date().toISOString();

  // Static pages
  const staticPages = [
    "",
    "/nosotros",
    "/servicios",
    "/servicios/cultura",
    "/servicios/seleccion-especializada",
    "/servicios/cambio",
    "/servicios/comunicacion-interna",
    "/diagnostico-clima",
    "/conferencias",
    "/herramientas",
    "/blog",
    "/contacto",
    "/faq",
  ];

  const sitemapEntries: MetadataRoute.Sitemap = [];

  // Generate entries for each locale
  locales.forEach((locale) => {
    staticPages.forEach((page) => {
      sitemapEntries.push({
        url: `${siteUrl}/${locale}${page}`,
        lastModified: currentDate,
        changeFrequency: page === "" ? "weekly" : "monthly",
        priority: page === "" ? 1.0 : page.includes("/servicios") ? 0.9 : 0.8,
        alternates: {
          languages: {
            es: `${siteUrl}/es${page}`,
            en: `${siteUrl}/en${page}`,
          },
        },
      });
    });
  });

  return sitemapEntries;
}
