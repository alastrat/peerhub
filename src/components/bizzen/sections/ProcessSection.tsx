"use client";

import { useTranslations } from "next-intl";

export function ProcessSection() {
  const t = useTranslations("home.process");

  return (
    <section className="bizzen-proces_one py-5 py-xl-0 my-xl-0">
      <div className="container">
        <div className="row align-items-center">
          <div className="col-xl-4 col-lg-12">
            {/* Section Title */}
            <div className="section-title mb-5 mb-xl-0">
              <span
                className="sub-title"
                data-aos="fade-down"
                data-aos-duration="1000"
              >
                {t("subtitle")}
              </span>
              <h2 className="text-anm">{t("title")}</h2>
            </div>
          </div>

          <div className="col-xl-4 col-md-6">
            {/* Bizzen Work List */}
            <div className="bizzen-work-list">
              <div
                className="bizzen-process-item style-one"
                data-aos="fade-up"
                data-aos-duration="1000"
              >
                <div className="number">01</div>
                <div className="content">
                  <h4>{t("step1.title")}</h4>
                </div>
              </div>

              <div
                className="bizzen-process-item style-one"
                data-aos="fade-up"
                data-aos-duration="1200"
              >
                <div className="number">02</div>
                <div className="content">
                  <h4>{t("step2.title")}</h4>
                </div>
              </div>

              <div
                className="bizzen-process-item style-one"
                data-aos="fade-up"
                data-aos-duration="1400"
              >
                <div className="number">03</div>
                <div className="content">
                  <h4>{t("step3.title")}</h4>
                </div>
              </div>

              <div
                className="bizzen-process-item style-one"
                data-aos="fade-up"
                data-aos-duration="1600"
              >
                <div className="number">04</div>
                <div className="content">
                  <h4>{t("step4.title")}</h4>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-4 col-md-6">
            {/* Text Box */}
            <div
              className="text-box mt-5 mt-md-0"
              data-aos="fade-up"
              data-aos-duration="1600"
            >
              <span>
                Maximiza los resultados de tu organización con nuestras
                metodologías
              </span>
              <h2>98%</h2>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
