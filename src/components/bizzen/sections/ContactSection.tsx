"use client";

import { useTranslations } from "next-intl";

export function ContactSection() {
  const t = useTranslations("contact");
  const tServices = useTranslations("services");
  const tNav = useTranslations("navigation");

  return (
    <section className="bizzen-contact_one">
      {/* Contact Wrapper */}
      <div className="contact-wrapper">
        {/* Bizzen Bg */}
        <div className="contact-bg-wrap">
          <div
            className="contact-bg bg_cover"
            style={{
              backgroundImage: "url(/images/team/amcham-event.jpg)",
              backgroundSize: "cover",
              backgroundPosition: "center center",
            }}
          />
        </div>

        {/* Bizzen Contact Wrapper */}
        <div className="contact-form-wrapper mb-120">
          {/* Bizzen Content Box */}
          <div className="bizzen-content-box">
            <div className="section-title text-white">
              <span
                className="sub-title"
                data-aos="fade-down"
                data-aos-duration="1000"
              >
                {t("subtitle")}
              </span>
              <h2 className="text-anm">{t("title")}</h2>
            </div>
            <p
              className="mb-50"
              data-aos="fade-up"
              data-aos-duration="1200"
            >
              {t("description")}
            </p>

            <form
              autoComplete="off"
              className="contact-form"
              data-aos="fade-up"
              data-aos-duration="1400"
              style={{ color: "#fff" }}
            >
              <div className="row">
                <div className="col-lg-6">
                  <div className="form-group">
                    <label style={{ color: "#fff" }}>{t("form.name")} *</label>
                    <input
                      type="text"
                      className="form_control"
                      name="name"
                      required
                    />
                  </div>
                </div>
                <div className="col-lg-6">
                  <div className="form-group">
                    <label style={{ color: "#fff" }}>{t("form.phone")} *</label>
                    <input
                      type="text"
                      className="form_control"
                      name="phone"
                      required
                    />
                  </div>
                </div>
                <div className="col-lg-6">
                  <div className="form-group">
                    <label style={{ color: "#fff" }}>{t("form.email")} *</label>
                    <input
                      type="email"
                      className="form_control"
                      name="email"
                      required
                    />
                  </div>
                </div>
                <div className="col-lg-6">
                  <div className="form-group">
                    <label style={{ color: "#fff" }}>{t("form.company")}</label>
                    <input
                      type="text"
                      className="form_control"
                      name="company"
                    />
                  </div>
                </div>
                <div className="col-lg-12">
                  <div className="form-group">
                    <label style={{ color: "#fff" }}>{t("form.message")} *</label>
                    <textarea
                      name="message"
                      className="form_control"
                      rows={4}
                      placeholder={t("form.message_placeholder")}
                    />
                  </div>
                </div>
                <div className="col-lg-12">
                  <div className="form-group mt-10">
                    <button type="submit" className="theme-btn style-one">
                      {t("form.submit")}{" "}
                      <i className="far fa-arrow-right" />
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
