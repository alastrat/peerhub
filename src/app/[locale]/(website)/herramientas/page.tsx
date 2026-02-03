import { getTranslations } from "next-intl/server";
import { PageHero } from "@/components/bizzen";
import { Link } from "@/i18n/navigation";

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

const tools = [
  {
    title: "Guia de Diagnostico Cultural",
    description:
      "Una guia paso a paso para evaluar la cultura actual de tu organizacion.",
    icon: "/bizzen/images/innerpage/icon/icon1.svg",
    type: "PDF",
    duration: 800,
  },
  {
    title: "Checklist de Onboarding",
    description:
      "Lista de verificacion para asegurar una incorporacion exitosa de nuevos colaboradores.",
    icon: "/bizzen/images/innerpage/icon/icon2.svg",
    type: "PDF",
    duration: 1000,
  },
  {
    title: "Plantilla de Plan de Comunicacion",
    description:
      "Template editable para planificar tu estrategia de comunicacion interna.",
    icon: "/bizzen/images/innerpage/icon/icon3.svg",
    type: "DOCX",
    duration: 1200,
  },
  {
    title: "Indicadores de Clima Laboral",
    description:
      "Listado de KPIs recomendados para medir el clima organizacional.",
    icon: "/bizzen/images/innerpage/icon/icon4.svg",
    type: "PDF",
    duration: 1400,
  },
];

export default async function ToolsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tools" });

  return (
    <>
      <PageHero title={t("hero.title")} breadcrumb={t("hero.breadcrumb")} />

      {/* Tools Section */}
      <section className="bizzen-about-service pt-115 pb-70">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-xl-8 col-lg-10">
              {/* Section Title */}
              <div className="section-title text-center mb-50">
                <span
                  className="sub-title"
                  data-aos="fade-down"
                  data-aos-duration="800"
                >
                  {t("subtitle")}
                </span>
                <h2 className="text-anm">{t("title")}</h2>
                <p
                  className="mt-3"
                  data-aos="fade-up"
                  data-aos-duration="1000"
                >
                  {t("description")}
                </p>
              </div>
            </div>
          </div>

          <div className="row">
            {tools.map((tool, index) => (
              <div key={index} className="col-lg-6">
                <div
                  className="bizzen-iconic-item style-one mb-30"
                  data-aos="fade-up"
                  data-aos-duration={tool.duration}
                >
                  <div className="icon">
                    <img src={tool.icon} alt="icon" />
                  </div>
                  <div className="content">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <h4>{tool.title}</h4>
                      <span
                        className="badge"
                        style={{
                          background: "var(--gray-color)",
                          color: "var(--heading-color)",
                          fontSize: "12px",
                          padding: "4px 8px",
                          borderRadius: "4px",
                        }}
                      >
                        {tool.type}
                      </span>
                    </div>
                    <p>{tool.description}</p>
                    <a href="#" className="read-more style-one mt-3">
                      DESCARGAR <i className="far fa-arrow-right" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="bizzen-contact_one gray-color pt-115 pb-120">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-xl-6 col-lg-8">
              <div className="section-title text-center mb-40">
                <h2 className="text-anm">Recibe mas recursos gratuitos</h2>
                <p className="mt-3">
                  Suscribete a nuestro newsletter y recibe herramientas,
                  articulos y consejos directamente en tu correo.
                </p>
              </div>
              <form className="d-flex flex-column flex-sm-row gap-3 justify-content-center">
                <input
                  type="email"
                  className="form_control"
                  placeholder="Tu correo electronico"
                  style={{ maxWidth: "300px" }}
                />
                <button className="theme-btn style-one">
                  SUSCRIBIRSE <i className="far fa-arrow-right" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
