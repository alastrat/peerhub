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
      title: "Entre Códigos y Emociones",
      subtitle: "La Nueva Cultura del Trabajo",
      description:
        "Esta charla invita a repensar la relación entre tecnología y humanidad, mostrando cómo la verdadera transformación ocurre en la cultura. La audiencia se lleva herramientas para diseñar una mentalidad de crecimiento, aprender del error y construir entornos donde la innovación florece sin miedo.",
      duration: 800,
    },
    {
      icon: "/bizzen/images/innerpage/icon/icon4.svg",
      title: "Cultura Beta",
      subtitle: "Organizaciones que nunca dejan de aprender",
      description:
        "Esta conferencia invita a líderes y organizaciones a repensar el cambio como una oportunidad constante de aprendizaje. A partir del concepto tecnológico de estar \"en versión beta\", la charla muestra cómo las culturas que se atreven a experimentar, aprender del error y mantener una mentalidad de crecimiento logran adaptarse más rápido que el entorno. La audiencia descubre herramientas prácticas para fortalecer la curiosidad, la resiliencia y el aprendizaje colectivo, construyendo organizaciones que no temen evolucionar una y otra vez.",
      duration: 1000,
    },
    {
      icon: "/bizzen/images/innerpage/icon/icon5.svg",
      title: "Reinventar-nos",
      subtitle: "La Nueva Era del Aprendizaje en las Organizaciones",
      description:
        "Esta charla invita a reflexionar sobre cómo las personas y las organizaciones pueden mantenerse vigentes en un entorno que cambia cada día. Explora el aprendizaje continuo como una actitud cultural, no solo una competencia técnica. La audiencia descubre cómo reinventarse sin perder su esencia, fortaleciendo la curiosidad, la adaptabilidad y la mentalidad de crecimiento. Porque reinventar-nos es aprender a evolucionar juntos.",
      duration: 1200,
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
