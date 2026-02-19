import type { Metadata } from "next";
import { Inter, Kanit, Plus_Jakarta_Sans, Quicksand } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers";

// Bizzen Template Styles (in correct order - matching template)
import "@/styles/bizzen/plugins/bootstrap.min.css";
import "@/styles/bizzen/plugins/slick.css";
import "@/styles/bizzen/plugins/magnific-popup.css";
import "@/styles/bizzen/plugins/aos.css";
import "@/styles/bizzen/spacings.css";
import "@/styles/bizzen/style.css";

// Kultiva theme system
import "@/styles/kultiva/themes/theme-classic.css";
import "@/styles/kultiva/themes/theme-brand.css";
import "@/styles/kultiva/themes/theme-modern.css";
import "@/styles/kultiva/overrides.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

const kanit = Kanit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-kanit",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-quicksand",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://peerhub-ashen.vercel.app";

// Structured Data for SEO
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "Kultiva",
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/images/logo-new.png`,
        width: 200,
        height: 60,
      },
      description:
        "Agencia de consultoría organizacional. Transformamos organizaciones a través de estrategias innovadoras en cultura, cambio, selección y comunicación interna.",
      foundingDate: "2010",
      founder: {
        "@type": "Person",
        name: "Iskya Boom",
        jobTitle: "CEO & Fundadora",
      },
      sameAs: [
        "https://www.instagram.com/kultiva.co",
        "https://www.linkedin.com/company/kultiva-consultoria",
        "https://www.youtube.com/@kultiva",
        "https://www.facebook.com/kultiva.co",
      ],
      contactPoint: {
        "@type": "ContactPoint",
        telephone: "+57-300-645-5082",
        contactType: "customer service",
        email: "contacto@kultiva.com.co",
        areaServed: ["CO", "LATAM"],
        availableLanguage: ["Spanish", "English"],
      },
    },
    {
      "@type": "LocalBusiness",
      "@id": `${siteUrl}/#localbusiness`,
      name: "Kultiva - Consultoría Organizacional",
      image: `${siteUrl}/images/logo-new.png`,
      url: siteUrl,
      telephone: "+57-300-645-5082",
      email: "contacto@kultiva.com.co",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Barranquilla",
        addressRegion: "Atlántico",
        addressCountry: "CO",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: 10.9639,
        longitude: -74.7964,
      },
      openingHoursSpecification: {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "08:00",
        closes: "18:00",
      },
      priceRange: "$$",
      areaServed: {
        "@type": "Country",
        name: "Colombia",
      },
      serviceType: [
        "Consultoría Organizacional",
        "Cultura Organizacional",
        "Gestión del Cambio",
        "Selección de Personal",
        "Comunicación Interna",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "Kultiva",
      description: "Consultoría Organizacional en Colombia",
      publisher: {
        "@id": `${siteUrl}/#organization`,
      },
      inLanguage: ["es-CO", "en-US"],
    },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Kultiva | Consultoría Organizacional",
    template: "%s | Kultiva",
  },
  description:
    "Agencia de consultoría organizacional. Transformamos organizaciones a través de estrategias innovadoras en cultura, cambio, selección y comunicación interna.",
  keywords: [
    "consultoría organizacional",
    "cultura organizacional",
    "gestión del cambio",
    "selección de personal",
    "comunicación interna",
    "desarrollo organizacional",
    "recursos humanos",
    "Colombia",
    "Barranquilla",
    "LATAM",
    "HR consulting",
    "organizational development",
  ],
  authors: [{ name: "Kultiva", url: siteUrl }],
  creator: "Kultiva",
  publisher: "Kultiva",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: siteUrl,
    languages: {
      "es-CO": `${siteUrl}/es`,
      "en-US": `${siteUrl}/en`,
      "x-default": `${siteUrl}/es`,
    },
  },
  openGraph: {
    type: "website",
    locale: "es_CO",
    alternateLocale: "en_US",
    url: siteUrl,
    siteName: "Kultiva",
    title: "Kultiva | Consultoría Organizacional",
    description:
      "Transformamos organizaciones a través de estrategias innovadoras en cultura, cambio, selección y comunicación interna. +15 años de experiencia en Colombia.",
    images: [
      {
        url: "/images/logo-new.png",
        width: 1200,
        height: 630,
        alt: "Kultiva - Consultoría Organizacional",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kultiva | Consultoría Organizacional",
    description:
      "Transformamos organizaciones a través de estrategias innovadoras en cultura, cambio, selección y comunicación interna.",
    images: ["/images/logo-new.png"],
    creator: "@kultiva_co",
    site: "@kultiva_co",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "business",
  verification: {
    // Add your verification codes here when ready
    // google: "your-google-verification-code",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${kanit.variable} ${plusJakarta.variable} ${quicksand.variable}`} data-theme="brand" suppressHydrationWarning>
      <head>
        {/* FontAwesome - from template */}
        <link
          rel="stylesheet"
          href="/bizzen/fonts/fontawesome/css/all.min.css"
        />
        {/* Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
