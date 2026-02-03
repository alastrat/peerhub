"use client";

import { useTranslations } from "next-intl";

const features = [
  {
    key: "quick_solutions",
    icon: "/bizzen/images/innerpage/icon/icon3.svg",
    duration: 800,
  },
  {
    key: "strategic_planning",
    icon: "/bizzen/images/innerpage/icon/icon4.svg",
    duration: 1000,
  },
  {
    key: "expert_advice",
    icon: "/bizzen/images/innerpage/icon/icon5.svg",
    duration: 1200,
  },
  {
    key: "efficient_operations",
    icon: "/bizzen/images/innerpage/icon/icon6.svg",
    duration: 1400,
  },
];

export function FeaturesSection() {
  const t = useTranslations("about.features");

  return (
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
                {t("subtitle")}
              </span>
              <h2 className="text-anm">{t("title")}</h2>
            </div>
          </div>
        </div>
        {/* Features Wrapper */}
        <div className="features-wrapper">
          <div className="row">
            {features.map((feature) => (
              <div
                key={feature.key}
                className="col-xl-3 col-md-6 col-sm-12 item-column"
              >
                {/* Bizzen Features Item */}
                <div
                  className="bizzen-features-item style-one text-center"
                  data-aos="fade-up"
                  data-aos-duration={feature.duration}
                >
                  <div className="content">
                    <h4>{t(`${feature.key}.title`)}</h4>
                    <div className="icon">
                      <img src={feature.icon} alt="icon" />
                    </div>
                    <p>{t(`${feature.key}.description`)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
