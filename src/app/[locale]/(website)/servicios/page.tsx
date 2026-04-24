import { getTranslations } from "next-intl/server";
import {
  PageHero,
  ServicesPageSection,
  ServiceSection,
} from "@/components/bizzen";
import { getServices, type Locale } from "@/lib/sanity";

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
  const services = await getServices(locale as Locale);

  return (
    <>
      <PageHero title={t("hero.title")} breadcrumb={t("hero.breadcrumb")} />
      <ServicesPageSection />
      <ServiceSection services={services} />
    </>
  );
}
