import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/bizzen/PageHero";
import { Link } from "@/i18n/navigation";
import { ServiceFAQ } from "@/components/bizzen/sections/ServiceFAQ";

const serviceData: Record<
  string,
  {
    key: string;
    image: string;
    secondaryImage: string;
  }
> = {
  cultura: {
    key: "cultura",
    image: "/images/team/team-workshop.jpg",
    secondaryImage: "/images/team/conference-1.jpg",
  },
  "seleccion-especializada": {
    key: "seleccion",
    image: "/images/team/planning-session.jpg",
    secondaryImage: "/images/team/gallery-1.jpg",
  },
  cambio: {
    key: "cambio",
    image: "/images/team/team-event.jpg",
    secondaryImage: "/images/team/iskya-speaking.jpg",
  },
  "comunicacion-interna": {
    key: "comunicacion",
    image: "/images/team/amcham-event.jpg",
    secondaryImage: "/images/team/gallery-3.jpg",
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
  const tNav = await getTranslations("navigation");

  const benefits = [1, 2, 3, 4, 5].map((n) =>
    t(`${service.key}.benefits.${n}`)
  );

  const processSteps = [
    { number: "01", title: t("process.step1.title"), description: t("process.step1.description") },
    { number: "02", title: t("process.step2.title"), description: t("process.step2.description") },
    { number: "03", title: t("process.step3.title"), description: t("process.step3.description") },
    { number: "04", title: t("process.step4.title"), description: t("process.step4.description") },
  ];

  return (
    <>
      <PageHero
        title={t(`${service.key}.title`)}
        breadcrumb={t(`${service.key}.short`)}
      />

      {/* Service Details Section */}
      <section className="service-details-sec pt-120 pb-95">
        <div className="container">
          {/* Service Details Wrapper */}
          <div className="service-details-wrapper">
            {/* Service Main */}
            <div className="service-item-main mb-60">
              <div className="service-thumbnail mb-30" data-aos="fade-up" data-aos-duration="800">
                <img src={service.image} alt={t(`${service.key}.title`)} />
              </div>
              <div className="service-content" data-aos="fade-up" data-aos-duration="800">
                <h4 className="title">{t(`${service.key}.headline`)}</h4>
                <p>{t(`${service.key}.description`)}</p>
                <p>{t(`${service.key}.description2`)}</p>
                <div className="row">
                  <div className="col-lg-6">
                    <h3 className="mb-15">{t(`${service.key}.benefits_title`)}</h3>
                    <ul className="check-list style-two mb-40">
                      {benefits.map((benefit, index) => (
                        <li key={index}>{benefit}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="col-lg-6">
                    <div className="bizzen-image mb-40">
                      <img src={service.secondaryImage} alt={t(`${service.key}.title`)} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Process Wrapper */}
            <div className="process-wrapper">
              <div className="row">
                {processSteps.map((step, index) => (
                  <div key={index} className="col-xl-3 col-md-6 col-sm-12">
                    <div
                      className="bizzen-process-item style-three mb-40"
                      data-aos="fade-up"
                      data-aos-duration={800 + index * 200}
                    >
                      <div className="line"></div>
                      <div className="number">{step.number}</div>
                      <div className="content">
                        <h4>{step.title}</h4>
                        <p>{step.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Features Section */}
            <div className="intro-wrapper mb-80" data-aos="fade-up" data-aos-duration="1600">
              <h3 className="mb-20">{t(`${service.key}.features_title`)}</h3>
              <p className="mb-25">{t(`${service.key}.features_description`)}</p>
              <div className="bizzen-image-box">
                <img src="/images/hero/hero-event-1.jpg" alt={t(`${service.key}.title`)} />
              </div>
            </div>

            {/* FAQ Section */}
            <ServiceFAQ serviceKey={service.key} />

            {/* CTA Section */}
            <div className="cta-wrapper text-center mt-80" data-aos="fade-up" data-aos-duration="800">
              <h3 className="mb-20">{t("cta.title")}</h3>
              <p className="mb-30">{t("cta.description")}</p>
              <Link href="/contacto" className="theme-btn style-one">
                {tNav("contact")} <i className="far fa-arrow-right"></i>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
