import { getTranslations } from "next-intl/server";
import {
  PageHero,
  AboutPageSection,
  CounterSection,
  FeaturesSection,
  TeamSection,
  TestimonialSection,
} from "@/components/bizzen";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });

  return {
    title: t("hero.title"),
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });

  return (
    <>
      <PageHero title={t("hero.title")} breadcrumb={t("hero.breadcrumb")} />
      <AboutPageSection />
      <CounterSection />
      <FeaturesSection />
      <TeamSection />
      <TestimonialSection />
    </>
  );
}
