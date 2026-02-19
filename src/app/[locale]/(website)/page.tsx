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
import {
  getTestimonials,
  getClients,
  getServices,
  getRecentPosts,
  type Locale,
} from "@/lib/sanity";

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

  // Fetch data from Sanity in parallel
  const [testimonials, clients, services, recentPosts] = await Promise.all([
    getTestimonials(sanityLocale),
    getClients(sanityLocale),
    getServices(sanityLocale),
    getRecentPosts(sanityLocale, 3),
  ]);

  return (
    <>
      <HeroSection />
      <ServiceSection services={services} />
      <AboutSection />
      <CounterSection />
      <ProcessSection />
      <TestimonialSection testimonials={testimonials} />
      <ContactSection />
      <BlogSection posts={recentPosts} />
      <ClientsSection clients={clients} />
    </>
  );
}
