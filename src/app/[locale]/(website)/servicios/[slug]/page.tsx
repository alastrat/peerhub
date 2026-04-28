import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/bizzen/PageHero";
import { Link } from "@/i18n/navigation";
import { ServiceFAQ } from "@/components/bizzen/sections/ServiceFAQ";
import { ServiceHelpCards } from "@/components/bizzen/sections/ServiceHelpCards";
import { ServiceTopics } from "@/components/bizzen/sections/ServiceTopics";
import { getServiceBySlug, getImageUrl, type Locale } from "@/lib/sanity";

// Maps slug → i18n namespace key + fallback image paths used when the
// matching Sanity service document has no image set yet.
const serviceData: Record<
  string,
  {
    key: string;
    fallbackImage: string;
    fallbackSecondaryImage: string;
  }
> = {
  "transformacion-cultural": {
    key: "cultura",
    fallbackImage: "/images/team/team-workshop.jpg",
    fallbackSecondaryImage: "/images/team/conference-1.jpg",
  },
  "seleccion-especializada": {
    key: "seleccion",
    fallbackImage: "/images/others/personas-seleccion.webp",
    fallbackSecondaryImage: "/images/others/seleccion2.jpg",
  },
  // NOTE: "diagnostico-clima" is NOT listed here on purpose.
  // /servicios/diagnostico-clima redirects to /diagnostico-clima (the platform landing)
  // via next.config.ts so there's a single source of truth for that content.
  liderazgo: {
    key: "liderazgo",
    fallbackImage: "/images/others/iskya-liderazgo.jpeg",
    fallbackSecondaryImage: "/images/team/conference-1.jpg",
  },
};

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
  const { locale, slug } = await params;
  const service = serviceData[slug];

  if (!service) {
    notFound();
  }

  const sanityService = await getServiceBySlug(slug, locale as Locale);

  const heroImage =
    (sanityService?.image
      ? getImageUrl(sanityService.image, {
          width: 1200,
          height: 600,
          fit: "crop",
        })
      : null) || service.fallbackImage;

  const secondaryImage =
    (sanityService?.secondaryImage
      ? getImageUrl(sanityService.secondaryImage, {
          width: 600,
          height: 600,
          fit: "crop",
        })
      : null) || service.fallbackSecondaryImage;

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
                <img src={heroImage} alt={t(`${service.key}.title`)} />
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
                      <img src={secondaryImage} alt={t(`${service.key}.title`)} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* How Can We Help You — card grid */}
            <ServiceHelpCards serviceKey={service.key} />

            {/* Training topics (liderazgo only — component no-ops for other services) */}
            {service.key === "liderazgo" && <ServiceTopics serviceKey={service.key} />}

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
