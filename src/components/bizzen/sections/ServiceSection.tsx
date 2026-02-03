"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const services = [
  {
    key: "cultura",
    href: "/servicios/cultura",
    icon: "/bizzen/images/home-one/icon/icon1.svg",
    duration: 1000,
  },
  {
    key: "seleccion",
    href: "/servicios/seleccion-especializada",
    icon: "/bizzen/images/home-one/icon/icon2.svg",
    duration: 1200,
  },
  {
    key: "cambio",
    href: "/servicios/cambio",
    icon: "/bizzen/images/home-one/icon/icon3.svg",
    duration: 1400,
  },
  {
    key: "comunicacion",
    href: "/servicios/comunicacion-interna",
    icon: "/bizzen/images/home-one/icon/icon4.svg",
    duration: 1600,
  },
];

export function ServiceSection() {
  const t = useTranslations("home.services");
  const tServices = useTranslations("services");
  const tCommon = useTranslations("common");

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
          {services.map((service) => (
            <div key={service.key} className="col-xl-3 col-md-6">
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
                        {tServices(`${service.key}.title`)}
                      </Link>
                    </h4>
                    <p>{tServices(`${service.key}.description`)}</p>
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
