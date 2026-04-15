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
              {/* Bizzen Item List */}
              <div className="bizzen-item-list">
                <div
                  className="bizzen-iconic-item style-one"
                >
                  <div className="icon">
                    <img
                      src="/bizzen/images/innerpage/icon/icon1.svg"
                      alt="icon"
                    />
                  </div>
                  <div className="content">
                    <h4>{t("mission.title")}</h4>
                    <p>{t("mission.description")}</p>
                  </div>
                </div>
                <div
                  className="bizzen-iconic-item style-one"
                >
                  <div className="icon">
                    <img
                      src="/bizzen/images/innerpage/icon/icon2.svg"
                      alt="icon"
                    />
                  </div>
                  <div className="content">
                    <h4>{t("vision.title")}</h4>
                    <p>{t("vision.description")}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-7">
              {/* Bizzen Content Box */}
              <div className="bizzen-content-box">
                <div className="section-title">
                  <span
                    className="sub-title"
                  >
                    {t("subtitle")}
                  </span>
                  <h2 className="text-anm">{t("title")}</h2>
                </div>
                <p
                  className="mb-4"
                >
                  {t("description1")}
                </p>
                <p
                  className="mb-4"


                >
                  {t("description2")}
                </p>
                <div
                  className="bizzen-button"


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
