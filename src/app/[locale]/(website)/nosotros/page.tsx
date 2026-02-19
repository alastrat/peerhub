import { getTranslations } from "next-intl/server";
import {
  PageHero,
  AboutPageSection,
  CounterSection,
  FeaturesSection,
  TeamSection,
  TestimonialSection,
} from "@/components/bizzen";
import { getTeamMembers, getTestimonials, type Locale } from "@/lib/sanity";

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
  const sanityLocale = locale as Locale;
  const t = await getTranslations({ locale, namespace: "about" });

  // Fetch data from Sanity
  const [teamMembers, testimonials] = await Promise.all([
    getTeamMembers(sanityLocale),
    getTestimonials(sanityLocale),
  ]);

  return (
    <>
      <PageHero title={t("hero.title")} breadcrumb={t("hero.breadcrumb")} />
      <AboutPageSection />
      <CounterSection />
      <FeaturesSection />
      <TeamSection teamMembers={teamMembers} />
      <TestimonialSection testimonials={testimonials} />
    </>
  );
}
