import { getTranslations } from "next-intl/server";
import { PageHero, CounterSection } from "@/components/bizzen";
import { Link } from "@/i18n/navigation";

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

export default async function ClimateDiagnosticPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "climate" });

  const features = [
    {
      icon: "/bizzen/images/innerpage/icon/icon7.svg",
      key: "1",
      duration: 800,
    },
    {
      icon: "/bizzen/images/innerpage/icon/icon8.svg",
      key: "2",
      duration: 1000,
    },
    {
      icon: "/bizzen/images/innerpage/icon/icon9.svg",
      key: "3",
      duration: 1200,
    },
    {
      icon: "/bizzen/images/innerpage/icon/icon10.svg",
      key: "4",
      duration: 1400,
    },
  ];

  return (
    <>
      <PageHero title={t("hero.title")} breadcrumb={t("hero.breadcrumb")} />

      {/* Overview Section */}
      <section className="bizzen-about-service pt-115 pb-70">
        <div className="container">
          <div className="row">
            <div className="col-lg-6">
              {/* Bizzen Content Box */}
              <div className="bizzen-content-box mb-5 mb-xl-0">
                <div className="section-title mb-4">
                  <span
                    className="sub-title"
                    data-aos="fade-down"
                    data-aos-duration="800"
                  >
                    {t("subtitle")}
                  </span>
                  <h2 className="text-anm">{t("title")}</h2>
                </div>
                <p className="mb-30" data-aos="fade-up" data-aos-duration="1000">
                  {t("description")}
                </p>
                <div
                  className="bizzen-button"
                  data-aos="fade-up"
                  data-aos-duration="1200"
                >
                  <Link href="/contacto" className="theme-btn style-one">
                    {t("cta").toUpperCase()}
                    <i className="far fa-arrow-right" />
                  </Link>
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="bizzen-features-list">
                <div className="row">
                  {features.map((feature) => (
                    <div key={feature.key} className="col-md-6">
                      {/* Bizzen Iconic Box */}
                      <div
                        className="bizzen-iconic-box style-one mb-40"
                        data-aos="fade-up"
                        data-aos-duration={feature.duration}
                      >
                        <div className="icon">
                          <img src={feature.icon} alt="icon" />
                        </div>
                        <div className="content">
                          <h4>{t(`features.${feature.key}.title`)}</h4>
                          <p>{t(`features.${feature.key}.description`)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <CounterSection />

      {/* CTA Section */}
      <section className="bizzen-grow-sec pt-120 pb-70">
        <div className="container">
          <div className="row">
            <div className="col-xl-6">
              {/* Bizzen Content Box */}
              <div className="bizzen-content-box">
                <div className="section-title mb-4">
                  <span
                    className="sub-title"
                    data-aos="fade-down"
                    data-aos-duration="800"
                  >
                    COMIENZA HOY
                  </span>
                  <h2 className="text-anm">
                    Mide el clima de tu organizacion
                  </h2>
                </div>
                <p data-aos="fade-up" data-aos-duration="1000">
                  Solicita una demo gratuita y descubre como nuestra plataforma
                  puede ayudarte a transformar el feedback en acciones concretas.
                </p>
                <div
                  className="bizzen-button mb-40"
                  data-aos="fade-up"
                  data-aos-duration="1200"
                >
                  <Link href="/contacto" className="theme-btn style-one">
                    {t("cta").toUpperCase()} <i className="far fa-arrow-right" />
                  </Link>
                </div>
              </div>
            </div>
            <div className="col-xl-6">
              {/* Bizzen Image */}
              <div
                className="bizzen-image mb-50"
                data-aos="fade-up"
                data-aos-duration="1000"
              >
                <img
                  src="/bizzen/images/innerpage/gallery/biz-img1.jpg"
                  alt="Plataforma de Clima"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
