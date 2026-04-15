import { getTranslations } from "next-intl/server";
import {
  PageHero,
  PricingSection,
  PricingComparisonSection,
  CTABannerSection,
  FAQSection,
} from "@/components/bizzen";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "precios.metadata" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function PreciosPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "precios.hero" });

  return (
    <>
      <PageHero title={t("title")} breadcrumb={t("breadcrumb")} />
      <PricingSection />
      <PricingComparisonSection />
      <FAQSection />
      <CTABannerSection />
    </>
  );
}
