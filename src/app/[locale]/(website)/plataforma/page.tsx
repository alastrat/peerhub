import { getTranslations } from "next-intl/server";
import {
  PageHero,
  PlatformOverviewSection,
  TransversalCapabilitiesSection,
  CTABannerSection,
} from "@/components/bizzen";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "plataforma.metadata" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function PlataformaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "plataforma.hero" });

  return (
    <>
      <PageHero title={t("title")} breadcrumb={t("breadcrumb")} />
      <PlatformOverviewSection />
      <TransversalCapabilitiesSection />
      <CTABannerSection />
    </>
  );
}
