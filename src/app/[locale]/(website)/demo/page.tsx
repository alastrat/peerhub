import { getTranslations } from "next-intl/server";
import {
  PageHero,
  DemoRequestSection,
  ClientsSection,
  FAQSection,
} from "@/components/bizzen";
import { getClients, type Locale } from "@/lib/sanity";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "demo.metadata" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function DemoPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const sanityLocale = locale as Locale;
  const t = await getTranslations({ locale, namespace: "demo.hero" });

  const clients = await getClients(sanityLocale);

  return (
    <>
      <PageHero title={t("title")} breadcrumb={t("breadcrumb")} />
      <DemoRequestSection />
      <ClientsSection clients={clients} />
      <FAQSection />
    </>
  );
}
