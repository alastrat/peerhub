import { getTranslations } from "next-intl/server";
import { PageHero } from "@/components/kultiva/layout";
import { SectionTitle, Button } from "@/components/kultiva/ui";
import { AnimatedElement } from "@/components/kultiva/ui/AnimatedElement";
import { ArrowRight, Mic, Users, Building, Globe } from "lucide-react";

const topics = [
  {
    title: "Liderazgo en la Era Digital",
    description:
      "Como liderar equipos en un mundo cada vez mas tecnologico sin perder el enfoque humano.",
    icon: Globe,
  },
  {
    title: "Cultura Organizacional",
    description:
      "Estrategias para construir y mantener culturas que impulsen el engagement y los resultados.",
    icon: Building,
  },
  {
    title: "Gestion del Cambio",
    description:
      "Como facilitar transiciones exitosas minimizando la resistencia y maximizando la adopcion.",
    icon: Users,
  },
  {
    title: "Comunicacion Efectiva",
    description:
      "Tecnicas para mejorar la comunicacion interna y fortalecer la conexion entre equipos.",
    icon: Mic,
  },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "conferences" });

  return {
    title: t("hero.title"),
  };
}

export default async function ConferencesPage() {
  const t = await getTranslations("conferences");

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
                Solicitar Conferencia
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </AnimatedElement>

            <AnimatedElement animation="fade-left" delay={200}>
              <div className="relative">
                <img
                  src="/kultiva/images/conferences.jpg"
                  alt="Conferencias Kultiva"
                  className="rounded-3xl shadow-xl w-full"
                />
              </div>
            </AnimatedElement>
          </div>
        </div>
      </section>

      {/* Topics */}
      <section className="kultiva-section kultiva-section-gray">
        <div className="kultiva-container">
          <AnimatedElement animation="fade-up">
            <SectionTitle
              subtitle="Temas"
              title="Tematicas disponibles"
              centered
            />
          </AnimatedElement>

          <div className="grid md:grid-cols-2 gap-6">
            {topics.map((topic, index) => (
              <AnimatedElement
                key={topic.title}
                animation="fade-up"
                delay={100 + index * 100}
              >
                <div className="kultiva-card kultiva-card-bordered p-8 flex gap-6">
                  <div className="kultiva-icon-box flex-shrink-0">
                    <topic.icon className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold mb-2">{topic.title}</h4>
                    <p className="text-kultiva-charcoal/70 text-sm leading-relaxed">
                      {topic.description}
                    </p>
                  </div>
                </div>
              </AnimatedElement>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="kultiva-section kultiva-section-dark">
        <div className="kultiva-container text-center">
          <AnimatedElement animation="fade-up">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Lleva una conferencia a tu evento
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
              Contactanos para conocer disponibilidad y personalizar el contenido
              segun las necesidades de tu audiencia.
            </p>
            <Button href="/contacto" variant="secondary" size="lg" className="group">
              Contactanos
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </AnimatedElement>
        </div>
      </section>
    </>
  );
}
