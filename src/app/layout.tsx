import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
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
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
