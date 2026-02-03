import { getTranslations } from "next-intl/server";
import {
  HeroSection,
  ServiceSection,
  AboutSection,
  CounterSection,
  ProcessSection,
  TestimonialSection,
  ContactSection,
  BlogSection,
  ClientsSection,
} from "@/components/bizzen";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <ServiceSection />
      <AboutSection />
      <CounterSection />
      <ProcessSection />
      <TestimonialSection />
      <ContactSection />
      <BlogSection />
      <ClientsSection />
    </>
  );
}
