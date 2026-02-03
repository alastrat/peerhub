import { getTranslations } from "next-intl/server";
import { PageHero } from "@/components/bizzen";
import { Link } from "@/i18n/navigation";

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

export default async function ConferencesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "conferences" });

  const topics = [
    {
      icon: "/bizzen/images/innerpage/icon/icon3.svg",
      title: "Liderazgo en la Era Digital",
      description:
        "Como liderar equipos en un mundo cada vez mas tecnologico sin perder el enfoque humano.",
      duration: 800,
    },
    {
      icon: "/bizzen/images/innerpage/icon/icon4.svg",
      title: "Cultura Organizacional",
      description:
        "Estrategias para construir y mantener culturas que impulsen el engagement y los resultados.",
      duration: 1000,
    },
    {
      icon: "/bizzen/images/innerpage/icon/icon5.svg",
      title: "Gestion del Cambio",
      description:
        "Como facilitar transiciones exitosas minimizando la resistencia y maximizando la adopcion.",
      duration: 1200,
    },
    {
      icon: "/bizzen/images/innerpage/icon/icon6.svg",
      title: "Comunicacion Efectiva",
      description:
        "Tecnicas para mejorar la comunicacion interna y fortalecer la conexion entre equipos.",
      duration: 1400,
    },
  ];

  return (
    <>
      <PageHero title={t("hero.title")} breadcrumb={t("hero.breadcrumb")} />

      {/* Overview Section */}
      <section className="bizzen-we_two pt-120 pb-120">
        <div className="container">
          <div className="row">
            <div className="col-xl-5">
              {/* Bizzen Image Box */}
              <div className="bizzen-image-box mb-5 mb-xl-0">
                <div
                  className="bizzen-image image-one"
                  data-aos="fade-up"
                  data-aos-duration="800"
                >
                  <img
                    src="/images/team/iskya-speaking.jpg"
                    alt="Conferencias"
                  />
                </div>
              </div>
            </div>
            <div className="col-xl-7">
              {/* Bizzen Content Box */}
              <div className="bizzen-content-box">
                <div className="section-title mb-30">
                  <span
                    className="sub-title"
                    data-aos="fade-down"
                    data-aos-duration="800"
                  >
                    {t("subtitle")}
                  </span>
                  <h2 className="text-anm">{t("title")}</h2>
                </div>
                <div className="content-wrap">
                  <p data-aos="fade-up" data-aos-duration="1000">
                    {t("description")}
                  </p>
                  <div
                    className="bizzen-button mt-30"
                    data-aos="fade-up"
                    data-aos-duration="1200"
                  >
                    <Link href="/contacto" className="theme-btn style-one">
                      SOLICITAR CONFERENCIA
                      <i className="far fa-arrow-right" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Topics Section */}
      <section className="bizzen-features_one gray-color pt-115 pb-120">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-xl-8 col-lg-10">
              {/* Section Title */}
              <div className="section-title text-center mb-50">
                <span
                  className="sub-title"
                  data-aos="fade-down"
                  data-aos-duration="1000"
                >
                  TEMATICAS
                </span>
                <h2 className="text-anm">Temas Disponibles para Conferencias</h2>
              </div>
            </div>
          </div>
          {/* Features Wrapper */}
          <div className="features-wrapper">
            <div className="row">
              {topics.map((topic, index) => (
                <div
                  key={index}
                  className="col-xl-3 col-md-6 col-sm-12 item-column"
                >
                  {/* Bizzen Features Item */}
                  <div
                    className="bizzen-features-item style-one text-center"
                    data-aos="fade-up"
                    data-aos-duration={topic.duration}
                  >
                    <div className="content">
                      <h4>{topic.title}</h4>
                      <div className="icon">
                        <img src={topic.icon} alt="icon" />
                      </div>
                      <p>{topic.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
