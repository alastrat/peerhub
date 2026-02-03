"use client";

import { useTranslations } from "next-intl";

export function ContactFormSection() {
  const t = useTranslations("contact.form");

  return (
    <section className="bizzen-contact_two pt-80 pb-120">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-xl-6 col-lg-10">
            {/* Map Box */}
            <div
              className="map-box mb-5 mb-xl-0"
              data-aos="fade-up"
              data-aos-duration="1300"
            >
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d125221.51098779548!2d-74.87478169999999!3d10.96389565!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8ef42d4ec6d0a8ef%3A0x1fbb1b0ccbb57d31!2sBarranquilla%2C%20Atlantico%2C%20Colombia!5e0!3m2!1sen!2sus!4v1640000000000!5m2!1sen!2sus"
                loading="lazy"
                title="Ubicacion de Kultiva"
              />
            </div>
          </div>
          <div className="col-xl-6 col-lg-10">
            {/* Contact Wrapper */}
            <div
              className="contact-wrapper"
              data-aos="fade-left"
              data-aos-duration="1400"
            >
              <h2>{t("title")}</h2>
              <form id="contact-form" className="contact-form">
                <div className="row">
                  <div className="col-lg-12">
                    <div className="form-group">
                      <input
                        type="text"
                        className="form_control"
                        placeholder={t("name_placeholder")}
                        name="name"
                        required
                      />
                    </div>
                  </div>
                  <div className="col-lg-12">
                    <div className="form-group">
                      <input
                        type="email"
                        className="form_control"
                        placeholder={t("email_placeholder")}
                        name="email"
                        required
                      />
                    </div>
                  </div>
                  <div className="col-lg-12">
                    <div className="form-group">
                      <input
                        type="text"
                        className="form_control"
                        placeholder={t("phone_placeholder")}
                        name="phone"
                        required
                      />
                    </div>
                  </div>
                  <div className="col-lg-12">
                    <div className="form-group">
                      <textarea
                        className="form_control"
                        placeholder={t("message_placeholder")}
                        name="message"
                        rows={5}
                      />
                    </div>
                  </div>
                  <div className="col-lg-12">
                    <div className="form-group">
                      <button className="theme-btn style-one">
                        {t("submit")} <i className="far fa-arrow-right" />
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
