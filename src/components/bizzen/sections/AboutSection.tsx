"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function AboutSection() {
  const t = useTranslations("home.about");
  const tStats = useTranslations("home.stats");
  const tCommon = useTranslations("common");

  return (
    <section className="bizzen-about_one pt-120 pb-120">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-xl-4 col-lg-10">
            {/* Bizzen Image */}
            <div
              className="bizzen-image mb-5 mb-xl-0"
            >
              <img
                src="/images/about/cultura-organizacional.webp"
                alt="about image"
              />
            </div>
          </div>
          <div className="col-xl-8 col-lg-10">
            {/* Bizzen Content Box */}
            <div className="bizzen-content-box">
              <div className="section-title mb-50">
                <span
                  className="sub-title"
                >
                  {t("subtitle")}
                </span>
                <h2 className="text-anm">{t("title")}</h2>
              </div>
              <div className="experience-text-wrap">
                <div
                  className="experience-box"
                >
                  <h2>
                    15+ <span>{tStats("years")}</span>
                  </h2>
                </div>
                <div className="text-box">
                  <p>
                    {t("description")}
                  </p>
                  <ul
                    className="check-list style-one"
                  >
                    <li>
                      <i className="fas fa-check-circle" />
                      Metodologías probadas y personalizadas
                    </li>
                    <li>
                      <i className="fas fa-check-circle" />
                      Equipo de consultores experimentados
                    </li>
                    <li>
                      <i className="fas fa-check-circle" />
                      Resultados medibles y sostenibles
                    </li>
                  </ul>
                  <div
                    className="bizzen-button"
                  >
                    <Link href="/nosotros" className="theme-btn style-one">
                      {tCommon("learn_more").toUpperCase()}{" "}
                      <i className="far fa-arrow-right" />
                    </Link>
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
