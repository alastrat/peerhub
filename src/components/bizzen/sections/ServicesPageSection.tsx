"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function ServicesPageSection() {
  const t = useTranslations("services");
  const tNav = useTranslations("navigation");

  return (
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
              <p
                className="mb-30"
                data-aos="fade-up"
                data-aos-duration="1000"
              >
                {t("description")}
              </p>
              <div
                className="bizzen-button"
                data-aos="fade-up"
                data-aos-duration="1200"
              >
                <Link href="/contacto" className="theme-btn style-one">
                  {tNav("cta").toUpperCase()}
                  <i className="far fa-arrow-right" />
                </Link>
              </div>
            </div>
          </div>
          <div className="col-lg-6">
            <div className="bizzen-features-list">
              <div className="row">
                <div className="col-md-6">
                  {/* Bizzen Iconic Box */}
                  <div
                    className="bizzen-iconic-box style-one mb-40"
                    data-aos="fade-up"
                    data-aos-duration="800"
                  >
                    <div className="icon">
                      <img
                        src="/bizzen/images/innerpage/icon/icon7.svg"
                        alt="icon"
                      />
                    </div>
                    <div className="content">
                      <h4>{t("features.expert.title")}</h4>
                      <p>{t("features.expert.description")}</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div
                    className="bizzen-iconic-box style-one mb-40"
                    data-aos="fade-up"
                    data-aos-duration="1000"
                  >
                    <div className="icon">
                      <img
                        src="/bizzen/images/innerpage/icon/icon8.svg"
                        alt="icon"
                      />
                    </div>
                    <div className="content">
                      <h4>{t("features.support.title")}</h4>
                      <p>{t("features.support.description")}</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div
                    className="bizzen-iconic-box style-one mb-40"
                    data-aos="fade-up"
                    data-aos-duration="1200"
                  >
                    <div className="icon">
                      <img
                        src="/bizzen/images/innerpage/icon/icon9.svg"
                        alt="icon"
                      />
                    </div>
                    <div className="content">
                      <h4>{t("features.results.title")}</h4>
                      <p>{t("features.results.description")}</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div
                    className="bizzen-iconic-box style-one mb-40"
                    data-aos="fade-up"
                    data-aos-duration="1600"
                  >
                    <div className="icon">
                      <img
                        src="/bizzen/images/innerpage/icon/icon10.svg"
                        alt="icon"
                      />
                    </div>
                    <div className="content">
                      <h4>{t("features.custom.title")}</h4>
                      <p>{t("features.custom.description")}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
