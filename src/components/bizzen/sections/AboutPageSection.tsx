"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function AboutPageSection() {
  const t = useTranslations("about");

  return (
    <section className="bizzen-about_three pt-120">
      <div className="container">
        {/* About Wrapper */}
        <div className="about-wrapper">
          <div className="row">
            <div className="col-lg-5">
              {/* Bizzen Item List — 4 values */}
              <div className="bizzen-item-list">
                {[
                  { key: "trust", icon: "icon1" },
                  { key: "honesty", icon: "icon2" },
                  { key: "freedom", icon: "icon3" },
                  { key: "transform", icon: "icon4" },
                ].map((value, i) => (
                  <div
                    key={value.key}
                    className="bizzen-iconic-item style-one"
                    data-aos="fade-up"
                    data-aos-duration={800 + i * 100}
                  >
                    <div className="icon">
                      <img
                        src={`/bizzen/images/innerpage/icon/${value.icon}.svg`}
                        alt="icon"
                      />
                    </div>
                    <div className="content">
                      <h4>{t(`values.${value.key}.title`)}</h4>
                      <p>{t(`values.${value.key}.description`)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="col-lg-7">
              {/* Bizzen Content Box */}
              <div className="bizzen-content-box">
                <div className="section-title">
                  <span
                    className="sub-title"
                    data-aos="fade-down"
                    data-aos-duration="800"
                  >
                    {t("subtitle")}
                  </span>
                  <h2 className="text-anm">{t("title")}</h2>
                </div>
                <ul
                  className="list-unstyled mb-4"
                  data-aos="fade-up"
                  data-aos-duration="1000"
                >
                  {["bullet1", "bullet2", "bullet3"].map((key, i) => (
                    <li key={key} className="d-flex mb-3" style={{ gap: "0.75rem" }}>
                      <i
                        className="far fa-check-circle mt-1"
                        style={{ color: "#613171", fontSize: "1.1rem", flexShrink: 0 }}
                      />
                      <span>{t(`bullets.${i + 1}`)}</span>
                    </li>
                  ))}
                </ul>
                <div
                  className="bizzen-button"
                  data-aos="fade-up"
                  data-aos-duration="1400"
                >
                  <Link href="/contacto" className="theme-btn style-one">
                    {t("cta").toUpperCase()}
                    <i className="far fa-arrow-right" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
