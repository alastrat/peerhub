import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/kultiva/layout";
import { SectionTitle, Button } from "@/components/kultiva/ui";
import { AnimatedElement } from "@/components/kultiva/ui/AnimatedElement";
import { Check, ArrowRight } from "lucide-react";
import { Users, Search, Shuffle, MessageSquare } from "lucide-react";

const serviceData: Record<
  string,
  {
    key: string;
    icon: typeof Users;
    image: string;
  }
> = {
  cultura: {
    key: "cultura",
    icon: Users,
    image: "/kultiva/images/services/cultura.jpg",
  },
  "seleccion-especializada": {
    key: "seleccion",
    icon: Search,
    image: "/kultiva/images/services/seleccion.jpg",
  },
  cambio: {
    key: "cambio",
    icon: Shuffle,
    image: "/kultiva/images/services/cambio.jpg",
  },
  "comunicacion-interna": {
    key: "comunicacion",
    icon: MessageSquare,
    image: "/kultiva/images/services/comunicacion.jpg",
  },
};

export async function generateStaticParams() {
  return Object.keys(serviceData).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const service = serviceData[slug];
  if (!service) return { title: "Service Not Found" };

  const t = await getTranslations({ locale, namespace: "services" });
  return {
    title: t(`${service.key}.title`),
  };
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  const service = serviceData[slug];

  if (!service) {
    notFound();
  }

  const t = await getTranslations("services");
  const Icon = service.icon;

  const benefits = [1, 2, 3, 4, 5].map((n) =>
    t(`${service.key}.benefits.${n}`)
  );

  return (
    <>
      <PageHero
        title={t(`${service.key}.title`)}
        breadcrumb={t(`${service.key}.short`)}
      />

      {/* Service Overview */}
      <section className="kultiva-section">
        <div className="kultiva-container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <AnimatedElement animation="fade-right">
              <div className="relative">
                <img
                  src={service.image}
                  alt={t(`${service.key}.title`)}
                  className="rounded-3xl shadow-xl w-full"
                />
                <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-kultiva-primary rounded-2xl flex items-center justify-center text-white shadow-xl">
                  <Icon className="w-12 h-12" />
                </div>
              </div>
            </AnimatedElement>

            <AnimatedElement animation="fade-left" delay={200}>
              <span className="kultiva-subtitle">{t("subtitle")}</span>
              <h2 className="kultiva-title">{t(`${service.key}.title`)}</h2>
              <p className="kultiva-lead mb-8">
                {t(`${service.key}.description`)}
              </p>

              <h3 className="text-xl font-semibold mb-4">
                Que incluye este servicio:
              </h3>
              <ul className="space-y-3 mb-8">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-kultiva-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-4 h-4 text-kultiva-primary" />
                    </span>
                    <span className="text-kultiva-charcoal">{benefit}</span>
                  </li>
                ))}
              </ul>

              <Button href="/contacto" size="lg" className="group">
                Solicitar Informacion
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </AnimatedElement>
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="kultiva-section kultiva-section-gray">
        <div className="kultiva-container">
          <AnimatedElement animation="fade-up">
            <SectionTitle
              subtitle="Metodologia"
              title="Como trabajamos"
              centered
            />
          </AnimatedElement>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: "01", title: "Diagnostico", desc: "Evaluamos la situacion actual" },
              { step: "02", title: "Diseno", desc: "Creamos un plan personalizado" },
              { step: "03", title: "Implementacion", desc: "Ejecutamos con acompanamiento" },
              { step: "04", title: "Seguimiento", desc: "Medimos y ajustamos" },
            ].map((item, index) => (
              <AnimatedElement
                key={item.step}
                animation="fade-up"
                delay={100 + index * 100}
              >
                <div className="text-center">
                  <span className="text-5xl font-bold text-kultiva-primary/20">
                    {item.step}
                  </span>
                  <h4 className="text-xl font-semibold mt-2 mb-2">
                    {item.title}
                  </h4>
                  <p className="text-kultiva-charcoal/70 text-sm">
                    {item.desc}
                  </p>
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
              Listo para transformar tu organizacion?
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
              Contactanos para una consulta gratuita y descubre como podemos
              ayudarte a alcanzar tus objetivos.
            </p>
            <Button href="/contacto" variant="secondary" size="lg" className="group">
              Agenda una Consulta
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </AnimatedElement>
        </div>
      </section>
    </>
  );
}
