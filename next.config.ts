import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Legacy service slugs → new slugs (keeps old bookmarks + SEO alive)
      { source: "/servicios/cultura", destination: "/servicios/transformacion-cultural", permanent: true },
      { source: "/:locale/servicios/cultura", destination: "/:locale/servicios/transformacion-cultural", permanent: true },
      { source: "/servicios/cambio", destination: "/diagnostico-clima", permanent: true },
      { source: "/:locale/servicios/cambio", destination: "/:locale/diagnostico-clima", permanent: true },
      { source: "/servicios/diagnostico-clima", destination: "/diagnostico-clima", permanent: true },
      { source: "/:locale/servicios/diagnostico-clima", destination: "/:locale/diagnostico-clima", permanent: true },
      { source: "/servicios/comunicacion-interna", destination: "/servicios/liderazgo", permanent: true },
      { source: "/:locale/servicios/comunicacion-interna", destination: "/:locale/servicios/liderazgo", permanent: true },
    ];
  },
};

export default withNextIntl(nextConfig);
