"use client";

import { useTranslations } from "next-intl";

export function ContactInfoSection() {
  const t = useTranslations("contact.info");

  return (
    <section className="bizzen-contact-info-sec pt-105">
      <div className="container">
        <div className="row">
          <div className="col-lg-12">
            {/* Section Title */}
            <div className="section-title text-center mb-50">
              <h2>{t("title")}</h2>
            </div>
          </div>
        </div>
        <div className="row justify-content-center">
          <div className="col-xl-4 col-md-6 col-sm-12">
            {/* Bizzen Info Box - Address */}
            <div className="bizzen-info-left-box mb-40">
              <div className="icon">
                <i className="far fa-map-marker-alt" />
              </div>
              <div className="content">
                <h5>{t("address.title")}</h5>
                <p>{t("address.value")}</p>
              </div>
            </div>
          </div>
          <div className="col-xl-4 col-md-6 col-sm-12">
            {/* Bizzen Info Box - Phone & Email */}
            <div className="bizzen-info-left-box mb-40">
              <div className="icon">
                <i className="far fa-phone-alt" />
              </div>
              <div className="content">
                <h5>{t("phone.title")}</h5>
                <p>
                  <a href="tel:+573006455082">{t("phone.value")}</a>
                </p>
                <p>
                  <a href="mailto:contacto@kultiva.com.co">{t("email.value")}</a>
                </p>
              </div>
            </div>
          </div>
          <div className="col-xl-4 col-md-6 col-sm-12">
            {/* Bizzen Info Box - Hours */}
            <div className="bizzen-info-left-box mb-40">
              <div className="icon">
                <i className="far fa-clock" />
              </div>
              <div className="content">
                <h5>{t("hours.title")}</h5>
                <p>{t("hours.value")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
