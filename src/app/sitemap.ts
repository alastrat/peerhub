import { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://peerhub-ashen.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const currentDate = new Date().toISOString();

  const staticPages = [
    "",
    "/nosotros",
    "/servicios",
    "/servicios/transformacion-cultural",
    "/servicios/seleccion-especializada",
    "/servicios/liderazgo",
    "/diagnostico-clima",
    "/conferencias",
    "/herramientas",
    "/blog",
    "/contacto",
    "/faq",
  ];

  const sitemapEntries: MetadataRoute.Sitemap = [];

  // localePrefix: "as-needed" — Spanish URLs have no prefix, English uses /en.
  for (const page of staticPages) {
    const esUrl = `${siteUrl}${page || "/"}`;
    const enUrl = `${siteUrl}/en${page}`;

    sitemapEntries.push({
      url: esUrl,
      lastModified: currentDate,
      changeFrequency: page === "" ? "weekly" : "monthly",
      priority: page === "" ? 1.0 : page.includes("/servicios") ? 0.9 : 0.8,
      alternates: {
        languages: {
          "es-CO": esUrl,
          "en-US": enUrl,
          "x-default": esUrl,
        },
      },
    });

    sitemapEntries.push({
      url: enUrl,
      lastModified: currentDate,
      changeFrequency: page === "" ? "weekly" : "monthly",
      priority: page === "" ? 0.9 : page.includes("/servicios") ? 0.8 : 0.7,
      alternates: {
        languages: {
          "es-CO": esUrl,
          "en-US": enUrl,
          "x-default": esUrl,
        },
      },
    });
  }

  return sitemapEntries;
}
