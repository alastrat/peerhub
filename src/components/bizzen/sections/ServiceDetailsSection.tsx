"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

interface ServiceDetailsProps {
  serviceKey: string;
  image: string;
}

export function ServiceDetailsSection({ serviceKey, image }: ServiceDetailsProps) {
  const t = useTranslations(`services.${serviceKey}`);
  const tCommon = useTranslations("services");

  const benefits = [
    t("benefits.1"),
    t("benefits.2"),
    t("benefits.3"),
    t("benefits.4"),
    t("benefits.5"),
  ];

  const processSteps = [
    { number: "01", title: tCommon("process.step1.title"), description: tCommon("process.step1.description") },
    { number: "02", title: tCommon("process.step2.title"), description: tCommon("process.step2.description") },
    { number: "03", title: tCommon("process.step3.title"), description: tCommon("process.step3.description") },
    { number: "04", title: tCommon("process.step4.title"), description: tCommon("process.step4.description") },
  ];

  return (
    <section className="service-details-sec pt-120 pb-95">
      <div className="container">
        {/* Service Details Wrapper */}
        <div className="service-details-wrapper">
          {/* Service Main */}
          <div className="service-item-main mb-60">
            <div className="service-thumbnail mb-30" data-aos="fade-up" data-aos-duration="800">
              <img src={image} alt={t("title")} />
            </div>
            <div className="service-content" data-aos="fade-up" data-aos-duration="800">
              <h4 className="title">{t("headline")}</h4>
              <p>{t("description")}</p>
              <p>{t("description2")}</p>
              <div className="row">
                <div className="col-lg-6">
                  <h3 className="mb-15">{t("benefits_title")}</h3>
                  <ul className="check-list style-two mb-40">
                    {benefits.map((benefit, index) => (
                      <li key={index}>{benefit}</li>
                    ))}
                  </ul>
                </div>
                <div className="col-lg-6">
                  <div className="bizzen-image mb-40">
                    <img src="/images/team/team-workshop.jpg" alt={t("title")} />
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
            <h3 className="mb-20">{t("features_title")}</h3>
            <p className="mb-25">{t("features_description")}</p>
            <div className="bizzen-image-box">
              <img src="/images/team/conference-1.jpg" alt={t("title")} />
            </div>
          </div>

          {/* CTA Section */}
          <div className="cta-wrapper text-center" data-aos="fade-up" data-aos-duration="800">
            <h3 className="mb-20">{tCommon("cta_title")}</h3>
            <p className="mb-30">{tCommon("cta_description")}</p>
            <Link href="/contacto" className="theme-btn style-one">
              {tCommon("cta_button")} <i className="far fa-arrow-right"></i>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
