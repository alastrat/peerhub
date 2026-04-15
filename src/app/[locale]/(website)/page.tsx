import { getTranslations } from "next-intl/server";
import {
  PlatformHeroSection,
  FeaturesGridSection,
  HowItWorksSection,
  SocialProofSection,
  CTABannerSection,
  PricingSection,
  ClientsSection,
} from "@/components/bizzen";
import { getClients, type Locale } from "@/lib/sanity";

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

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const sanityLocale = locale as Locale;

  const clients = await getClients(sanityLocale);

  return (
    <>
      <PlatformHeroSection />
      {/* <ClientsSection clients={clients} /> */}
      <FeaturesGridSection />
      <HowItWorksSection />
      <SocialProofSection />
      <PricingSection />
      <CTABannerSection />
    </>
  );
}
