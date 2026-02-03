import { getTranslations } from "next-intl/server";
import {
  PageHero,
  ServicesPageSection,
  ServiceSection,
} from "@/components/bizzen";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "services" });

  return {
    title: t("hero.title"),
  };
}

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "services" });

  return (
    <>
      <PageHero title={t("hero.title")} breadcrumb={t("hero.breadcrumb")} />
      <ServicesPageSection />
      <ServiceSection />
    </>
  );
}
