import { getTranslations } from "next-intl/server";
import { PageHero } from "@/components/kultiva/layout";
import { SectionTitle, Button } from "@/components/kultiva/ui";
import { AnimatedElement } from "@/components/kultiva/ui/AnimatedElement";
import { Download, FileText, CheckSquare, BarChart3 } from "lucide-react";

const tools = [
  {
    title: "Guia de Diagnostico Cultural",
    description:
      "Una guia paso a paso para evaluar la cultura actual de tu organizacion.",
    icon: FileText,
    type: "PDF",
  },
  {
    title: "Checklist de Onboarding",
    description:
      "Lista de verificacion para asegurar una incorporacion exitosa de nuevos colaboradores.",
    icon: CheckSquare,
    type: "PDF",
  },
  {
    title: "Plantilla de Plan de Comunicacion",
    description:
      "Template editable para planificar tu estrategia de comunicacion interna.",
    icon: FileText,
    type: "DOCX",
  },
  {
    title: "Indicadores de Clima Laboral",
    description:
      "Listado de KPIs recomendados para medir el clima organizacional.",
    icon: BarChart3,
    type: "PDF",
  },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tools" });

  return {
    title: t("hero.title"),
  };
}

export default async function ToolsPage() {
  const t = await getTranslations("tools");

  return (
    <>
      <PageHero title={t("hero.title")} breadcrumb={t("hero.breadcrumb")} />

      {/* Tools Grid */}
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

          <div className="grid md:grid-cols-2 gap-6">
            {tools.map((tool, index) => (
              <AnimatedElement
                key={tool.title}
                animation="fade-up"
                delay={100 + index * 100}
              >
                <div className="kultiva-card kultiva-card-bordered p-8">
                  <div className="flex items-start gap-6">
                    <div className="kultiva-icon-box flex-shrink-0">
                      <tool.icon className="w-7 h-7" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-xl font-semibold">{tool.title}</h4>
                        <span className="px-2 py-0.5 text-xs font-medium bg-kultiva-sand text-kultiva-charcoal rounded">
                          {tool.type}
                        </span>
                      </div>
                      <p className="text-kultiva-charcoal/70 text-sm leading-relaxed mb-4">
                        {tool.description}
                      </p>
                      <Button variant="outline" size="sm" className="group">
                        <Download className="w-4 h-4" />
                        Descargar
                      </Button>
                    </div>
                  </div>
                </div>
              </AnimatedElement>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="kultiva-section kultiva-section-gray">
        <div className="kultiva-container">
          <div className="max-w-2xl mx-auto text-center">
            <AnimatedElement animation="fade-up">
              <h2 className="text-3xl font-bold mb-4">
                Recibe mas recursos gratuitos
              </h2>
              <p className="kultiva-lead mb-8">
                Suscribete a nuestro newsletter y recibe herramientas, articulos y
                consejos directamente en tu correo.
              </p>
              <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="Tu correo electronico"
                  className="flex-1 px-4 py-3 rounded-xl border border-kultiva-border focus:border-kultiva-primary focus:ring-2 focus:ring-kultiva-primary/20 outline-none transition-colors"
                />
                <Button type="submit">Suscribirse</Button>
              </form>
            </AnimatedElement>
          </div>
        </div>
      </section>
    </>
  );
}
