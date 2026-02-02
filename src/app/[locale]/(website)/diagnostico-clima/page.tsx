import { getTranslations } from "next-intl/server";
import { PageHero } from "@/components/kultiva/layout";
import { SectionTitle, Button } from "@/components/kultiva/ui";
import { AnimatedElement } from "@/components/kultiva/ui/AnimatedElement";
import { CounterSection } from "@/components/kultiva/sections";
import {
  ArrowRight,
  FileText,
  BarChart3,
  FileBarChart,
  Target,
  CheckCircle,
} from "lucide-react";

const features = [
  { key: "1", icon: FileText },
  { key: "2", icon: BarChart3 },
  { key: "3", icon: FileBarChart },
  { key: "4", icon: Target },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "climate" });

  return {
    title: t("hero.title"),
  };
}

export default async function ClimateDiagnosticPage() {
  const t = await getTranslations("climate");

  return (
    <>
      <PageHero title={t("hero.title")} breadcrumb={t("hero.breadcrumb")} />

      {/* Overview */}
      <section className="kultiva-section">
        <div className="kultiva-container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <AnimatedElement animation="fade-right">
              <span className="kultiva-subtitle">{t("subtitle")}</span>
              <h2 className="kultiva-title">{t("title")}</h2>
              <p className="kultiva-lead mb-8">{t("description")}</p>
              <Button href="/contacto" size="lg" className="group">
                {t("cta")}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </AnimatedElement>

            <AnimatedElement animation="fade-left" delay={200}>
              <div className="relative">
                <img
                  src="/kultiva/images/climate-platform.jpg"
                  alt="Plataforma de Diagnostico de Clima"
                  className="rounded-3xl shadow-xl w-full"
                />
                <div className="absolute -bottom-6 -right-6 bg-kultiva-accent text-kultiva-ink rounded-2xl p-6 shadow-xl">
                  <CheckCircle className="w-8 h-8 mb-2" />
                  <div className="text-sm font-semibold">100% Digital</div>
                </div>
              </div>
            </AnimatedElement>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="kultiva-section kultiva-section-gray">
        <div className="kultiva-container">
          <AnimatedElement animation="fade-up">
            <SectionTitle
              subtitle="Caracteristicas"
              title="Todo lo que necesitas para medir el clima"
              centered
            />
          </AnimatedElement>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <AnimatedElement
                key={feature.key}
                animation="fade-up"
                delay={100 + index * 100}
              >
                <div className="kultiva-card kultiva-card-bordered text-center p-8">
                  <div className="kultiva-icon-box mx-auto">
                    <feature.icon className="w-7 h-7" />
                  </div>
                  <h4 className="text-xl font-semibold mb-3">
                    {t(`features.${feature.key}.title`)}
                  </h4>
                  <p className="text-kultiva-charcoal/70 text-sm leading-relaxed">
                    {t(`features.${feature.key}.description`)}
                  </p>
                </div>
              </AnimatedElement>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <CounterSection />

      {/* CTA */}
      <section className="kultiva-section">
        <div className="kultiva-container text-center">
          <AnimatedElement animation="fade-up">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Comienza a medir el clima de tu organizacion
            </h2>
            <p className="kultiva-lead mb-8 max-w-2xl mx-auto">
              Solicita una demo gratuita y descubre como nuestra plataforma puede
              ayudarte a transformar el feedback en acciones concretas.
            </p>
            <Button href="/contacto" size="lg" className="group">
              {t("cta")}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </AnimatedElement>
        </div>
      </section>
    </>
  );
}
