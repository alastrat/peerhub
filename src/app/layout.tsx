import type { Metadata } from "next";
import { Inter, Kanit, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers";

// Bizzen Template Styles (in correct order - matching template)
import "@/styles/bizzen/plugins/bootstrap.min.css";
import "@/styles/bizzen/plugins/slick.css";
import "@/styles/bizzen/plugins/magnific-popup.css";
import "@/styles/bizzen/plugins/aos.css";
import "@/styles/bizzen/spacings.css";
import "@/styles/bizzen/style.css";

// Kultiva theme color overrides
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

export const metadata: Metadata = {
  title: {
    default: "Kultiva - 360° Performance Feedback Platform",
    template: "%s | Kultiva",
  },
  description:
    "Modern 360° performance evaluation platform for SMBs. Collect multi-rater feedback, generate insights, and drive employee growth.",
  keywords: [
    "360 feedback",
    "performance review",
    "employee feedback",
    "multi-rater feedback",
    "HR software",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${kanit.variable} ${plusJakarta.variable}`} suppressHydrationWarning>
      <head>
        {/* FontAwesome - from template */}
        <link
          rel="stylesheet"
          href="/bizzen/fonts/fontawesome/css/all.min.css"
        />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
