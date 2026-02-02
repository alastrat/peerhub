import { getTranslations } from "next-intl/server";
import { PageHero } from "@/components/kultiva/layout";
import { ServiceCards } from "@/components/kultiva/sections";
import { SectionTitle } from "@/components/kultiva/ui";
import { AnimatedElement } from "@/components/kultiva/ui/AnimatedElement";
import { Button } from "@/components/kultiva/ui/Button";
import { ArrowRight } from "lucide-react";

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

export default async function ServicesPage() {
  const t = await getTranslations("services");

  return (
    <>
      <PageHero title={t("hero.title")} breadcrumb={t("hero.breadcrumb")} />

      {/* Services Overview */}
      <section className="kultiva-section">
        <div className="kultiva-container">
          <AnimatedElement animation="fade-up">
            <SectionTitle
              subtitle={t("subtitle")}
              title={t("title")}
              description={t("description")}
              centered
            />
          </AnimatedElement>
        </div>
      </section>

      {/* Reuse ServiceCards from homepage */}
      <ServiceCards />

      {/* CTA */}
      <section className="kultiva-section kultiva-section-gray">
        <div className="kultiva-container text-center">
          <AnimatedElement animation="fade-up">
            <h2 className="text-3xl font-bold mb-4">
              No estas seguro de que servicio necesitas?
            </h2>
            <p className="kultiva-lead mb-8 max-w-2xl mx-auto">
              Agenda una consulta gratuita y te ayudaremos a identificar las
              necesidades de tu organizacion.
            </p>
            <Button href="/contacto" size="lg" className="group">
              Agenda una Consulta
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </AnimatedElement>
        </div>
      </section>
    </>
  );
}
