import { getTranslations } from "next-intl/server";
import { PageHero } from "@/components/kultiva/layout";
import { FAQAccordion, CTASection } from "@/components/kultiva/sections";
import { AnimatedElement } from "@/components/kultiva/ui/AnimatedElement";
import { Button } from "@/components/kultiva/ui/Button";
import { ArrowRight } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "faq" });

  return {
    title: t("hero.title"),
  };
}

export default async function FAQPage() {
  const t = await getTranslations("faq");

  return (
    <>
      <PageHero title={t("hero.title")} breadcrumb={t("hero.breadcrumb")} />
      <FAQAccordion />

      {/* CTA */}
      <section className="kultiva-section kultiva-section-gray">
        <div className="kultiva-container text-center">
          <AnimatedElement animation="fade-up">
            <h2 className="text-3xl font-bold mb-4">{t("cta.title")}</h2>
            <p className="kultiva-lead mb-8 max-w-2xl mx-auto">
              {t("cta.description")}
            </p>
            <Button href="/contacto" size="lg" className="group">
              {t("cta.button")}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </AnimatedElement>
        </div>
      </section>
    </>
  );
}
