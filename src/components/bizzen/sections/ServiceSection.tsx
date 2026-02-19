"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ResolvedService } from "@/lib/sanity";

// Fallback icons
const fallbackIcons = [
  "/bizzen/images/home-one/icon/icon1.svg",
  "/bizzen/images/home-one/icon/icon2.svg",
  "/bizzen/images/home-one/icon/icon3.svg",
  "/bizzen/images/home-one/icon/icon4.svg",
];

interface ServiceSectionProps {
  services?: ResolvedService[];
}

export function ServiceSection({ services: sanityServices = [] }: ServiceSectionProps) {
  const t = useTranslations("home.services");
  const tCommon = useTranslations("common");

  // Map Sanity services to component format
  const services = sanityServices.length > 0
    ? sanityServices.map((s, index) => ({
        title: s.title,
        description: s.shortDescription,
        href: `/servicios/${s.slug}`,
        icon: fallbackIcons[index % fallbackIcons.length],
        duration: 1000 + index * 200,
      }))
    : [];

  return (
    <section
      className="bizzen-service_one pt-115 pb-115 bg_cover"
      style={{
        backgroundImage: "url(/bizzen/images/home-one/bg/service-bg.png)",
      }}
    >
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-xl-6 col-lg-8">
            {/* Section Title */}
            <div className="section-title text-center mb-60">
              <span
                className="sub-title"
                data-aos="fade-up"
                data-aos-duration="1000"
              >
                {t("subtitle")}
              </span>
              <h2 className="text-anm">{t("title")}</h2>
            </div>
          </div>
        </div>

        <div className="row">
          {services.map((service, index) => (
            <div key={service.href || index} className="col-xl-3 col-md-6">
              {/* Bizzen Service Item */}
              <div
                className="bizzen-service-item style-one mb-30"
                data-aos="fade-up"
                data-aos-duration={service.duration}
              >
                <div className="service-inner-content">
                  <div className="icon">
                    <img src={service.icon} alt="icon" />
                  </div>
                  <div className="content">
                    <h4 className="title">
                      <Link href={service.href}>
                        {service.title}
                      </Link>
                    </h4>
                    <p>{service.description}</p>
                    <Link href={service.href} className="read-more style-one">
                      {tCommon("learn_more").toUpperCase()}{" "}
                      <i className="far fa-arrow-right" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="row">
          <div className="col-lg-12">
            {/* Text Box */}
            <div
              className="text-box text-center mt-30"
              data-aos="fade-up"
              data-aos-duration="1800"
            >
              <p>
                {t("description")}{" "}
                <Link href="/servicios">
                  Ver todos los servicios <i className="far fa-arrow-right" />
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
