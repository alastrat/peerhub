"use client";

import { useTranslations } from "next-intl";

export function CounterSection() {
  const t = useTranslations("home.stats");

  return (
    <section
      className="bizzen-counter_one bg_cover pt-115 pb-80"
      style={{
        backgroundImage: "url(/images/team/conference-1.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center center",
      }}
    >
      <div className="container">
        <div className="row">
          <div className="col-lg-7">
            {/* Bizzen Content Box */}
            <div className="bizzen-content-box">
              <div className="section-title text-white">
                <span
                  className="sub-title"
                  data-aos="fade-down"
                  data-aos-duration="1000"
                >
                  Logros
                </span>
                <h2 className="text-anm">
                  Impulsando el éxito de organizaciones en Colombia
                </h2>
              </div>
              <p data-aos="fade-up" data-aos-duration="1200">
                Nuestra misión es empoderar a las organizaciones de todos los
                tamaños para prosperar en un mercado en constante cambio. En el
                dinámico entorno empresarial actual, la clave del éxito radica
                en las personas.
              </p>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-lg-4 col-md-6">
            {/* Bizzen Counter Item */}
            <div
              className="bizzen-counter-item style-one mb-30"
              data-aos="fade-up"
              data-aos-duration="1000"
            >
              <div className="number">
                <h2>
                  <span className="counter">15</span>+
                </h2>
              </div>
              <div className="content">
                <h5>
                  {t("years")}
                </h5>
              </div>
            </div>
          </div>

          <div className="col-lg-4 col-md-6">
            {/* Bizzen Counter Item */}
            <div
              className="bizzen-counter-item style-one mb-30"
              data-aos="fade-up"
              data-aos-duration="1200"
            >
              <div className="number">
                <h2>
                  <span className="counter">200</span>+
                </h2>
              </div>
              <div className="content">
                <h5>
                  {t("clients")}
                </h5>
              </div>
            </div>
          </div>

          <div className="col-lg-4 col-md-6">
            {/* Bizzen Counter Item */}
            <div
              className="bizzen-counter-item style-one mb-30"
              data-aos="fade-up"
              data-aos-duration="1400"
            >
              <div className="number">
                <h2>
                  <span className="counter">500</span>+
                </h2>
              </div>
              <div className="content">
                <h5>
                  {t("projects")}
                </h5>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
